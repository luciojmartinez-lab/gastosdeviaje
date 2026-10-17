import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../group-meals.js',import.meta.url),'utf8'),context);
const api=context.TravelGroup;
const plain=value=>JSON.parse(JSON.stringify(value));
const photo=(name)=>({name,type:'image/jpeg',data:'data:image/jpeg;base64,'+Buffer.from(name.repeat(8)).toString('base64')});

test('fotos: conserva los tickets antiguos, migra a varias fotos y mantiene la copia JSON sin duplicarlas',()=>{
 const one=photo('uno'),two=photo('dos');
 const meal={ticketData:one.data,ticketName:one.name,ticketType:one.type,ticketRef:'old-cloud-ref'};
 assert.deepEqual(plain(api.ticketPhotos(meal)),[one]);
 api.setTicketPhotos(meal,[...api.ticketPhotos(meal),two]);
 assert.equal(meal.ticketData,undefined);assert.equal(meal.ticketRef,undefined);
 assert.deepEqual(plain(api.ticketPhotos(JSON.parse(JSON.stringify(meal)))),[one,two]);
 api.setTicketPhotos(meal,[two]);assert.equal(meal.ticketPhotos,undefined);assert.equal(meal.ticketData,two.data);
 api.setTicketPhotos(meal,[]);assert.equal(api.ticketPhotos(meal).length,0);
 assert.throws(()=>api.setTicketPhotos(meal,[{data:'https://private.example/file'}]),/no es válida/);
 assert.throws(()=>api.setTicketPhotos(meal,Array(9).fill(one)),/8 fotos/);
});

const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
vm.runInContext(sourceOf('recognizeGroupTicket'),context);

test('OCR local multifoto lee cada tramo y muestra revisión sin eliminar pedidos repetidos ni sumar subtotales',async()=>{
 const photos=[photo('uno'),photo('dos')],calls=[],progress=[];
 const result=await context.recognizeGroupTicket({ticketPhotos:photos},value=>progress.push(value),async(data,options)=>{
  calls.push({data,options});options.onProgress({progress:.5,status:'Leyendo'});
  return{text:'1 Café 2,00\nTOTAL 2,00',fields:{merchant:'Bar',total:2}};
 });
 assert.deepEqual(calls.map(call=>call.data),photos.map(p=>p.data));assert.ok(calls.every(call=>call.options.readItems===false));
 assert.equal(result.itemsStatus,'review');assert.equal(result.fields.total,null);
 assert.equal(result.text.split('1 Café').length-1,2);assert.match(result.text,/FOTO 1[\s\S]*FOTO 2/);
 assert.equal(progress.at(-1).progress,.75);
 const single=await context.recognizeGroupTicket({ticketData:photos[0].data},()=>{},async(data,options)=>{assert.equal(options.readItems,true);return{itemsStatus:'reconciled'};});
 assert.equal(single.itemsStatus,'reconciled');
});

vm.runInContext(sourceOf('compressGroupTicketPhoto'),context);
test('las fotos grandes se preparan por separado conservando resolución y un límite conjunto apto para ocho',async()=>{
 let cleared=false,dimensions;
 context.loadImageFile=async()=>({naturalWidth:3000,naturalHeight:4000,set src(value){cleared=value==='';}});
 context.document={createElement:()=>({width:0,height:0,getContext(){return{fillRect(){},drawImage(){dimensions=[this.width,this.height];}};}})};
 context.canvasToJpeg=async canvas=>{dimensions=[canvas.width,canvas.height];return{size:350*1024};};
 context.readBlobAsDataUrl=async()=>photo('prepared').data;
 const result=await context.compressGroupTicketPhoto({name:'foto.png'});
 assert.equal(result.type,'image/jpeg');assert.equal(result.name,'foto.jpg');assert.deepEqual(dimensions,[1650,2200]);assert.equal(cleared,true);
 context.canvasToJpeg=async()=>({size:800*1024});
 await assert.rejects(context.compressGroupTicketPhoto({name:'foto.png'}),/Recorta el fondo/);
});
