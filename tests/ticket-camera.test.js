import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),source=fs.readFileSync(new URL('../ticket-camera.js',import.meta.url),'utf8');
async function setup(options={}){
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 w.isSecureContext=true;w.DataTransfer=class{};let requested=0,stopped=0,accepted=0,native=0,revoked=0;
 const $=id=>w.document.getElementById('ticket-camera-'+id);
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 Object.defineProperty($('video'),'videoWidth',{get:()=>options.width||2048});Object.defineProperty($('video'),'videoHeight',{get:()=>options.height||1536});w.HTMLMediaElement.prototype.play=options.play|| (async()=>{});
 if(options.fastTimeout){const timer=w.setTimeout.bind(w);w.setTimeout=(action,ms)=>timer(action,ms===10000?1:ms);}
 const canvases=[];w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});w.HTMLCanvasElement.prototype.toBlob=function(callback,type){canvases.push(this);assert.equal(type,'image/jpeg');if(options.encode)options.encode(callback,w);else callback(new w.Blob(['jpeg'],{type}));};
 w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>revoked++;
 const stream=()=>({getTracks:()=>[{stop(){stopped++;}}]});
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async constraints=>{requested++;assert.equal(constraints.audio,false);assert.equal(constraints.video.facingMode.ideal,'environment');assert.ok(constraints.video.width.max*constraints.video.height.max<12_000_000);return options.media?options.media(stream):stream();}}});
 if(options.geo)Object.defineProperty(w.navigator,'geolocation',{value:options.geo});
 if(options.noGps)$('gps').checked=false;
 w.eval(source);w.TicketCameraUI.mount({before:async()=>{},isOpen:()=>options.isOpen?.()??true,accept:async(prefix,file,current,metadata)=>{assert.ok(current());accepted++;assert.equal(file.type,'image/jpeg');if(options.accept)await options.accept(file,metadata);},native:()=>native++});
 const wait=async predicate=>{for(let i=0;i<100&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,3));assert.ok(predicate());};
 return{w,$,open:()=>w.TicketCameraUI.open('g'),click:id=>$(id).click(),wait,canvases,requested:()=>requested,stopped:()=>stopped,accepted:()=>accepted,native:()=>native,revoked:()=>revoked,close:()=>{w.dispatchEvent(new w.Event('pagehide'));w.close();}};
}

test('cámara integrada solo solicita vídeo al abrir, captura pequeña, detiene la cámara antes de usar y libera canvas/URL',async()=>{
 const ui=await setup();try{
  assert.equal(ui.requested(),0);await ui.open();assert.equal(ui.requested(),1);assert.equal(ui.$('take').disabled,false);
  ui.click('take');await ui.wait(()=>!ui.$('use').hidden);assert.equal(ui.stopped(),1);assert.ok(ui.canvases.every(canvas=>canvas.width===1&&canvas.height===1));assert.equal(ui.accepted(),0);
  ui.click('use');await ui.wait(()=>!ui.$('dialog').open);assert.equal(ui.accepted(),1);assert.equal(ui.revoked(),1);assert.equal(ui.native(),0);assert.equal(ui.$('video').srcObject,null);
 }finally{ui.close();}
});

test('cancelar con permiso pendiente detiene la respuesta tardía y no añade una foto',async()=>{
 let finish;const ui=await setup({media:stream=>new Promise(resolve=>finish=()=>resolve(stream()))});try{
  const opening=ui.open();await ui.wait(()=>!!finish);ui.click('cancel');finish();await opening;
  assert.equal(ui.stopped(),1);assert.equal(ui.accepted(),0);assert.equal(ui.$('dialog').open,false);assert.equal(ui.$('video').srcObject,null);
 }finally{ui.close();}
});

test('permiso denegado y tamaño no respetado muestran alternativa sin abrir la cámara nativa automáticamente',async()=>{
 for(const mode of ['denied','too-big']){
  const ui=await setup(mode==='denied'?{media:async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});}}:{width:8000,height:6000});try{
   await ui.open();assert.equal(ui.$('take').disabled,true);assert.equal(ui.native(),0);assert.equal(ui.accepted(),0);assert.match(ui.$('status').textContent,/Cámara del móvil/);
   if(mode==='too-big')assert.equal(ui.stopped(),1);
   ui.click('native');assert.equal(ui.native(),1);assert.equal(ui.$('dialog').open,false);
  }finally{ui.close();}
 }
});

test('un flujo que no entrega imágenes se detiene por tiempo sin dejar la cámara activa',async()=>{
 const ui=await setup({play:()=>new Promise(()=>{}),fastTimeout:true});try{
  await ui.open();assert.equal(ui.stopped(),1);assert.equal(ui.$('take').disabled,true);assert.equal(ui.$('repeat').hidden,false);assert.equal(ui.native(),0);assert.match(ui.$('status').textContent,/Cámara del móvil/);
 }finally{ui.close();}
});

test('repetir descarta la foto anterior, abre otro flujo y Cancelar conserva el gasto',async()=>{
 const ui=await setup();try{
  await ui.open();ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('repeat');await ui.wait(()=>ui.requested()===2&&!ui.$('take').disabled);assert.equal(ui.revoked(),1);
  ui.click('cancel');assert.equal(ui.stopped(),2);assert.equal(ui.accepted(),0);
 }finally{ui.close();}
});

test('ocultar la página detiene cámara y descarta una codificación que termina tarde',async()=>{
 let finish;const ui=await setup({encode:(callback,w)=>{finish=()=>callback(new w.Blob(['jpeg'],{type:'image/jpeg'}));}});try{
  await ui.open();ui.click('take');await ui.wait(()=>!!finish);ui.w.dispatchEvent(new ui.w.Event('pagehide'));finish();await Promise.resolve();await Promise.resolve();
  assert.equal(ui.stopped(),1);assert.equal(ui.accepted(),0);assert.equal(ui.$('dialog').open,false);
 }finally{ui.close();}
});

test('error al incorporar permite reintentar o cancelar y no vuelve a activar la cámara',async()=>{
 const ui=await setup({accept:async()=>{throw new Error('No se pudo guardar la foto de ejemplo');}});try{
  await ui.open();ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('use');await ui.wait(()=>ui.$('status').textContent.includes('No se pudo guardar'));
  assert.equal(ui.requested(),1);assert.equal(ui.$('use').disabled,false);ui.click('cancel');assert.equal(ui.$('dialog').open,false);
 }finally{ui.close();}
});

test('si falla la preparación al usar una foto, el formulario recupera el adjunto y la traducción anteriores',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8'),sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
  const input=w.document.getElementById('edit-gasto-ticket-camera'),other=w.document.getElementById('edit-gasto-ticket');
  const previous=new w.File(['old'],'old.jpg'),next=new w.File(['new'],'new.jpg');
  Object.defineProperty(input,'files',{value:[previous],writable:true});Object.defineProperty(other,'files',{value:[],writable:true});
  w.DataTransfer=class{files=[];items={add:value=>this.files.push(value)};};w.$=selector=>w.document.querySelector(selector);
  w.pendingExpenseTicketPreviews={'edit-gasto':{data:'old-photo'}};w.pendingExpenseTicketTranslations={'edit-gasto':{data:'old-translation'}};w.pendingExpenseTicketLocations={'edit-gasto':{latitude:40,longitude:2}};w.pendingExpenseTicketLocationChecks={};
  w.renderSelectedExpenseTicketPreview=()=>{};w.syncExpenseTicketMapOption=()=>{};w.syncExpenseTicketTypeAvailability=()=>{};w.syncTicketOcrAvailability=()=>{};
  w.syncExpenseTicketSelection=async()=>{w.pendingExpenseTicketPreviews['edit-gasto']=null;w.pendingExpenseTicketTranslations['edit-gasto']=null;throw new Error('Sin memoria de ejemplo');};
  w.eval(sourceOf('acceptTicketCameraPhoto'));await assert.rejects(w.acceptTicketCameraPhoto('edit-gasto',next,()=>true),/Sin memoria/);
  assert.equal(input.files[0],previous);assert.equal(w.pendingExpenseTicketPreviews['edit-gasto'].data,'old-photo');assert.equal(w.pendingExpenseTicketTranslations['edit-gasto'].data,'old-translation');await w.pendingExpenseTicketLocationChecks['edit-gasto'];
 }finally{w.close();}
});

test('GPS de cámara se entrega como metadato separado, sin modificar los bytes JPEG, y detiene la búsqueda',async()=>{
 let success,requested=0;const cleared=[];
 const ui=await setup({geo:{watchPosition(ok,fail,options){requested++;success=ok;assert.equal(options.maximumAge,0);return 42;},clearWatch:id=>cleared.push(id)},accept:async(file,metadata)=>{
  assert.equal(metadata.point.latitude,41.38);assert.equal(metadata.point.longitude,2.17);assert.equal(metadata.point.source,'device');
  const bytes=await new Promise(resolve=>{const reader=new ui.w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(file);});assert.equal(bytes,'jpeg');
 }});try{
  assert.equal(requested,0);await ui.open();assert.equal(requested,1);
  success({coords:{latitude:41.38,longitude:2.17,accuracy:12},timestamp:Date.now()});assert.deepEqual(cleared,[42]);assert.match(ui.$('gps-status').textContent,/12 m/);
  ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('use');await ui.wait(()=>!ui.$('dialog').open);assert.equal(ui.accepted(),1);
 }finally{ui.close();}
});

test('ubicación denegada o no disponible nunca impide hacer y usar la foto',async()=>{
 for(const mode of ['denied','unsupported']){
  let reject;const ui=await setup({geo:mode==='denied'?{watchPosition(ok,fail){reject=fail;return 8;},clearWatch(){}}:undefined,accept:async(file,metadata)=>assert.equal(metadata.point,null)});try{
   await ui.open();if(reject)reject({code:1});assert.match(ui.$('gps-status').textContent,/Sin ubicación|no disponible/);
   ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('use');await ui.wait(()=>!ui.$('dialog').open);
  }finally{ui.close();}
 }
});

test('desmarcar GPS elimina la posición y cancelar descarta respuestas tardías, también tras repetir foto',async()=>{
 let success,requested=0;const cleared=[];
 const ui=await setup({geo:{watchPosition(ok){requested++;success=ok;return requested;},clearWatch:id=>cleared.push(id)},accept:async(file,metadata)=>assert.equal(metadata.point,null)});try{
  await ui.open();success({coords:{latitude:40,longitude:-3,accuracy:30},timestamp:Date.now()});
  ui.$('gps').click();assert.equal(requested,1);assert.match(ui.$('gps-status').textContent,/sin ubicación/);
  ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('repeat');await ui.wait(()=>!ui.$('take').disabled);assert.equal(requested,1);
  ui.$('gps').click();assert.equal(requested,2);const late=success;ui.click('cancel');assert.ok(cleared.includes(2));late({coords:{latitude:41,longitude:2,accuracy:5},timestamp:Date.now()});
  ui.$('gps').checked=false;await ui.open();ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('use');await ui.wait(()=>!ui.$('dialog').open);
 }finally{ui.close();}
});

test('GPS rechaza posiciones antiguas o inválidas, mejora precisión y no bloquea Usar foto mientras espera',async()=>{
 let success;const cleared=[];
 const ui=await setup({geo:{watchPosition(ok){success=ok;return 7;},clearWatch:id=>cleared.push(id)},accept:async(file,metadata)=>assert.equal(metadata.point.accuracy,150)});try{
  await ui.open();
  success({coords:{latitude:41,longitude:2,accuracy:5},timestamp:Date.now()-60000});success({coords:{latitude:141,longitude:2,accuracy:5},timestamp:Date.now()});assert.match(ui.$('gps-status').textContent,/Buscando/);
  success({coords:{latitude:41,longitude:2,accuracy:300},timestamp:Date.now()});success({coords:{latitude:41,longitude:2,accuracy:150},timestamp:Date.now()});success({coords:{latitude:42,longitude:3,accuracy:500},timestamp:Date.now()});
  ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('use');await ui.wait(()=>!ui.$('dialog').open);assert.deepEqual(cleared,[7]);
 }finally{ui.close();}
});

test('búsqueda GPS termina a los diez segundos sin bloquear ni añadir coordenadas inventadas',async()=>{
 let success;const cleared=[];
 const ui=await setup({fastTimeout:true,geo:{watchPosition(ok){success=ok;return 6;},clearWatch:id=>cleared.push(id)},accept:async(file,metadata)=>assert.equal(metadata.point,null)});try{
  await ui.open();await ui.wait(()=>cleared.length===1);success({coords:{latitude:41,longitude:2,accuracy:5},timestamp:Date.now()});assert.match(ui.$('gps-status').textContent,/Sin ubicación/);
  ui.click('take');await ui.wait(()=>!ui.$('use').hidden);ui.click('use');await ui.wait(()=>!ui.$('dialog').open);
 }finally{ui.close();}
});

test('los metadatos de cámara atraviesan la preparación y el guardado sin heredar GPS del ticket sustituido',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8'),sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
  w.$=selector=>w.document.querySelector(selector);w.imageMetadataPromiseCache=new WeakMap();w.imageGpsCache=new WeakMap();w.imageDateTimeCache=new WeakMap();
  w.pendingExpenseTicketPreviews={g:null};w.pendingExpenseTicketTranslations={g:null};w.pendingExpenseTicketLocations={g:null};w.pendingExpenseTicketLocationChecks={};w.pendingTicketOcr={};
  w.ticketOcrRunIds={g:0};
  w.DataTransfer=class{files=[];items={add:value=>this.files.push(value)};};for(const id of ['g-ticket-camera','g-ticket'])Object.defineProperty(w.document.getElementById(id),'files',{value:[],writable:true});
  for(const name of ['renderSelectedExpenseTicketPreview','syncExpenseTicketMapOption','syncExpenseTicketTypeAvailability','syncTicketOcrAvailability','setTicketOcrStatus'])w[name]=()=>{};
  w.fileLooksLikeImage=()=>true;w.queueExpenseMediaSave=task=>task();w.compressBlogImage=async()=>({data:'data:image/jpeg;base64,anBlZw=='});
  w.storedImageCoordinates=value=>value?.latitude!=null?value:null;w.expenseTicketImageRecord=value=>({latitude:value.ticketLatitude,longitude:value.ticketLongitude,locationSource:value.ticketLocationSource});
  for(const name of ['fileModifiedDateTime','selectedFileInput','readImageMetadataForFile','syncExpenseTicketSelection','acceptTicketCameraPhoto','expenseTicketLocationPatch'])w.eval(sourceOf(name));
  const file=new w.File(['jpeg'],'camera.jpg',{type:'image/jpeg'}),old={ticketLatitude:30,ticketLongitude:40,ticketLocationSource:'exif'};
  await w.acceptTicketCameraPhoto('g',file,()=>true,{point:{latitude:41.38,longitude:2.17,source:'device'}});
  w.document.getElementById('g-ticket-map').checked=true;let saved=w.expenseTicketLocationPatch('g',old);
  assert.equal(saved.ticketLatitude,41.38);assert.equal(saved.ticketLongitude,2.17);assert.equal(saved.ticketLocationSource,'device');assert.equal(saved.ticketMapEnabled,true);assert.match(saved.ticketCapturedDate,/^\d{4}-\d{2}-\d{2}$/);
  assert.match(w.document.getElementById('g-ticket-selected').textContent,/ubicación de la foto/);
  await w.acceptTicketCameraPhoto('g',new w.File(['next'],'next.jpg',{type:'image/jpeg'}),()=>true,{point:null});saved=w.expenseTicketLocationPatch('g',old);assert.equal(saved.ticketLatitude,null);assert.equal(saved.ticketLongitude,null);assert.equal(saved.ticketMapEnabled,false);
 }finally{w.close();}
});
