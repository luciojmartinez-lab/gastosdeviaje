import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {rasterImageHeader,decodeImageFile} from '../image-decode.js';

function jpeg(width,height,orientation=1,little=true){
 const bytes=new Uint8Array(50),v=new DataView(bytes.buffer);
 v.setUint16(0,0xffd8);v.setUint16(2,0xffe1);v.setUint16(4,34);
 bytes.set([69,120,105,102,0,0],6);v.setUint16(12,little?0x4949:0x4d4d);v.setUint16(14,42,little);v.setUint32(16,8,little);v.setUint16(20,1,little);
 v.setUint16(22,0x112,little);v.setUint16(24,3,little);v.setUint32(26,1,little);v.setUint16(30,orientation,little);
 v.setUint16(38,0xffc0);v.setUint16(40,8);v.setUint8(42,8);v.setUint16(43,height);v.setUint16(45,width);v.setUint16(48,0xffd9);
 return bytes;
}

test('cabeceras limitadas: dimensiones JPEG con orientación EXIF, PNG, GIF y WebP sin cargar píxeles',()=>{
 assert.deepEqual(rasterImageHeader(jpeg(8000,6000).buffer),{width:8000,height:6000});
 for(const le of [false,true])for(const orientation of [5,6,7,8])assert.deepEqual(rasterImageHeader(jpeg(8000,6000,orientation,le).buffer),{width:6000,height:8000});
 const png=new Uint8Array(24),pv=new DataView(png.buffer);pv.setUint32(0,0x89504e47);png.set([73,72,68,82],12);pv.setUint32(16,5000);pv.setUint32(20,9000);assert.deepEqual(rasterImageHeader(png.buffer),{width:5000,height:9000});
 const gif=new Uint8Array([71,73,70,56,57,97,10,0,20,0]);assert.deepEqual(rasterImageHeader(gif.buffer),{width:10,height:20});
 const webp=new Uint8Array(30);webp.set(new TextEncoder().encode('RIFF'),0);webp.set(new TextEncoder().encode('WEBPVP8X'),8);webp[24]=99;webp[27]=199;assert.deepEqual(rasterImageHeader(webp.buffer),{width:100,height:200});
 assert.equal(rasterImageHeader(new ArrayBuffer(0)),null);assert.equal(rasterImageHeader(jpeg(8000,6000).slice(0,20).buffer),null);
});

test('foto de 48 MP se solicita reducida y orientada, no se decodifica primero en un elemento imagen',async()=>{
 const calls=[];let fallback=0;
 const file=new Blob([jpeg(8000,6000,6)]);
 const image=await decodeImageFile(file,{maxDimension:1600,bitmap:async(blob,options)=>{calls.push(options);return {width:options.resizeWidth,height:options.resizeHeight,close(){}};},loadFallback:()=>fallback++});
 assert.equal(fallback,0);assert.deepEqual(calls,[{imageOrientation:'from-image',resizeWidth:1200,resizeHeight:1600,resizeQuality:'high'}]);assert.equal(image.width,1200);assert.equal(image.height,1600);
});

test('un decodificador sin soporte o que ignora el límite no reintenta fotos enormes a tamaño completo',async()=>{
 let closed=0,fallback=0;const file=new Blob([jpeg(8000,6000)]),loadFallback=()=>fallback++;
 await assert.rejects(decodeImageFile(file,{maxDimension:1600,bitmap:async()=>({width:8000,height:6000,close(){closed++;}}),loadFallback}),/demasiado grande/);
 await assert.rejects(decodeImageFile(file,{maxDimension:1600,bitmap:null,loadFallback}),/demasiado grande/);assert.equal(closed,1);assert.equal(fallback,0);
 const small=new Blob([jpeg(1000,800)]);await decodeImageFile(small,{bitmap:null,loadFallback});assert.equal(fallback,1);
});

test('solo lee 512 KiB de cabecera y rechaza una foto grande desconocida sin abrirla entera',async()=>{
 let fallback=0;
 const file={size:30*1024*1024,slice(start,end){assert.equal(start,0);assert.equal(end,512*1024);return new Blob(['unknown']);}};
 await assert.rejects(decodeImageFile(file,{bitmap:null,loadFallback:()=>fallback++}),/demasiado grande/);assert.equal(fallback,0);
});

const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
test('compresores liberan bitmap y canvas incluso si el navegador falla al comprimir',async()=>{
 for(const name of ['compressBlogImage','compressGroupTicketPhoto']){
  let closed=0;const canvases=[];
  const context=vm.createContext({BLOG_IMAGE_MAX_DIMENSION:1600,BLOG_IMAGE_TARGET_BYTES:650*1024,BLOG_IMAGE_OUTPUT_LIMIT:1100000,
   loadImageFile:async(file,options)=>{assert.ok(options.maxDimension<=2200);return {width:1600,height:1200,close(){closed++;}};},
   document:{createElement(){const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}})};canvases.push(canvas);return canvas;}},
   canvasToJpeg:async()=>{throw new Error('Sin memoria para comprimir');}});
  vm.runInContext(sourceOf(name),context);await assert.rejects(context[name]({name:'foto.jpg',type:'image/jpeg'},{skipMetadata:true}),/Sin memoria/);
  assert.equal(closed,1);assert.ok(canvases.every(canvas=>canvas.width===1&&canvas.height===1));
 }
});

test('el decodificador reducido se precarga para que la cámara también funcione sin conexión',()=>{
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const [start,end]of [['const APP_SHELL_CORE','const APP_SHELL_REQUIRED'],['const APP_SHELL_REQUIRED','const APP_SHELL_OPTIONAL']])assert.ok(sw.slice(sw.indexOf(start),sw.indexOf(end)).includes('image-decode.js?'));
});

test('libera un OCR ya cargado antes de fotografiar, conserva una lectura activa y no carga el OCR si no se usó',async()=>{
 let resets=0;const controls={};
 const context=vm.createContext({$:selector=>controls[selector],rootExpenseAIBusy:()=>false,ticketOcrModulePromise:null});
 vm.runInContext(sourceOf('releaseIdleTicketOcr'),context);
 context.releaseIdleTicketOcr();assert.equal(resets,0);
 context.ticketOcrModulePromise=Promise.resolve({resetTicketOcrWorker(){resets++;}});context.releaseIdleTicketOcr();await Promise.resolve();assert.equal(resets,1);
 controls['#g-ticket-read']={dataset:{busy:'1'}};context.releaseIdleTicketOcr();await Promise.resolve();assert.equal(resets,1);
 controls['#g-ticket-read']={dataset:{}};controls['#group-meal-file']={disabled:true};context.releaseIdleTicketOcr();await Promise.resolve();assert.equal(resets,1);
});
