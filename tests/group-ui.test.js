import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sources=['group-meals.js','group-ledger.js','group-store.js','group-ui.js'].map(file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
async function setup(options={}){
 const dom=new JSDOM(html,{url:'http://localhost.test/',runScripts:'outside-only'}),w=dom.window;
 if(options.rememberedCode)w.localStorage.setItem('cuaderno.receiptAccess.v1',options.rememberedCode);
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};w.confirm=()=>true;
 for(const source of sources)w.eval(source);
 const factory=new IDBFactory();const stores=['viajes','cuentas','gastos','transferencias','categorias'];
 const db=await new Promise((resolve,reject)=>{const req=factory.open('ui',1);req.onupgradeneeded=()=>stores.forEach(name=>req.result.createObjectStore(name,{keyPath:'id',autoIncrement:true}));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const people=Array.from({length:12},(_,i)=>({id:'p'+i,name:'Atleta '+i,active:true}));
 const seed=[['viajes',{id:1,nombre:'Tenerife',group:{enabled:true,revision:0,selfId:'p0',integrate:true,participants:people,meals:[],settlements:[]}}],['cuentas',{id:1,nombre:'Banco',viajeId:1,moneda:'EUR',saldoActual:500}],['categorias',{id:1,nombre:'Comida',parentId:null}]];
 await new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);seed.forEach(([name,value])=>tx.objectStore(name).put(value));});
 const state={selectedViajeIds:[1]},drafts=new Map();
 async function load(){await new Promise((resolve,reject)=>{const tx=db.transaction(stores);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);stores.forEach(name=>{const req=tx.objectStore(name).getAll();req.onsuccess=()=>state[name]=req.result;});});}
 await load();let ocrCalls=0;
 w.TravelGroupUI.mount({aiStatus:options.aiStatus||(async()=>({enabled:true,message:'Comprobación gratuita por foto'})),recognizeAI:options.recognizeAI,getState:()=>state,selectTrip:id=>{state.selectedViajeIds=[Number(id)];w.TravelGroupUI.render();},save:async(id,revision,group)=>{const saved=await w.TravelGroupStore.save(db,id,revision,group);await load();w.TravelGroupUI.render();return saved;},cacheDraft:async value=>drafts.set(value.tripId,JSON.parse(JSON.stringify(value))),readDraft:async id=>drafts.get(id),clearDraft:async id=>drafts.delete(id),refresh:load,readTicket:options.readTicket ? input=>options.readTicket(w,input) : async()=>({name:'ticket.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,dGVzdA=='}),recognize:options.recognize || (async meal=>{ocrCalls++;assert.equal(meal.ticketName,'ticket.jpg');return{text:'12 Menús 24,00 288,00\nPan y agua 12,00\nTOTAL 300,00',fields:{total:300,merchant:'Restaurante prueba'}};}),share:async text=>assert.match(text,/Pendiente|pendiente/)});
 const $=selector=>w.document.querySelector(selector);
 const input=(selector,value)=>{const element=$(selector);if(element.type==='checkbox')element.checked=value;else element.value=value;element.dispatchEvent(new w.Event('input',{bubbles:true}));element.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const click=selector=>$(selector).click();
 async function waitFor(predicate){const end=Date.now()+2500;while(!predicate()){if(Date.now()>end)throw new Error('La interfaz no alcanzó el estado esperado: '+$('#group-meal-message').textContent+' / '+$('#group-payment-message').textContent);await new Promise(resolve=>setTimeout(resolve,5));}}
 return {dom,w,db,state,drafts,$,input,click,waitFor,load,ocrCalls:()=>ocrCalls,close:()=>{db.close();w.close();}};
}
async function prepare(ui){ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').innerHTML.includes('ticket.jpg')||ui.$('#group-meal-ticket').innerHTML.includes('data:image'));ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===13);ui.input('#group-meal-payer','p0');ui.input('#group-meal-account','1');for(let i=0;i<12;i++)ui.input('#group-meal-items fieldset:nth-child('+(i+1)+') [data-item-diner="p'+i+'"]',true);}
test('interfaz: foto/OCR propuesto, revisión obligatoria, cierre de doce y cobro parcial',async()=>{const ui=await setup();try{await prepare(ui);assert.equal(ui.ocrCalls(),1);assert.match(ui.$('#group-meal-check').textContent,/Todo cuadra/);ui.click('#group-close-meal');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('Confirma'));assert.equal(ui.state.gastos.length,0);ui.input('#group-meal-reviewed',true);ui.click('#group-close-meal');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);assert.equal(ui.state.gastos.length,1);assert.equal(ui.state.gastos[0].importe,25);assert.equal(ui.state.cuentas.find(c=>c.id===1).saldoActual,200);assert.equal(ui.state.viajes[0].group.meals[0].ticketData,'data:image/jpeg;base64,dGVzdA==');ui.click('[data-group-collect]');ui.input('#group-payment-from','p1');ui.input('#group-payment-amount','26');ui.input('#group-payment-account','1');ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));await ui.waitFor(()=>ui.$('#group-payment-message').textContent.includes('supera'));assert.equal(ui.state.transferencias.length,1);ui.input('#group-payment-amount','10');ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);assert.equal(ui.state.cuentas.find(c=>c.id===1).saldoActual,210);assert.equal(ui.state.cuentas.find(c=>c.groupClearing).saldoActual,265);assert.equal(ui.state.gastos.length,1);ui.click('[data-group-archive="p11"]');await ui.waitFor(()=>ui.state.viajes[0].group.participants.find(p=>p.id==='p11').active===false);assert.equal(ui.state.viajes[0].group.meals[0].attendees.length,12);}finally{ui.close();}});
test('interfaz: retirar un asistente no borra su consumo y deja visible el error',async()=>{const ui=await setup();try{await prepare(ui);ui.input('[data-group-attendee="p11"]',false);assert.match(ui.$('#group-meal-check').textContent,/ausente/);assert.ok(ui.$('[data-item-person="p11"]'));ui.click('#group-save-draft');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);assert.equal(ui.state.viajes[0].group.meals[0].status,'draft');assert.equal(ui.state.gastos.length,0);}finally{ui.close();}});


test('seleccionar un archivo real muestra la foto y el nombre y conserva los datos del editor', async()=>{
 const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
 const readFunction=app.slice(app.indexOf('async function readFileData('),app.indexOf('function selectedFileInput('));
 const ui=await setup({readTicket:async(w,input)=>{w.eval(readFunction);return w.readFileData(input,{compressImages:false});}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-name','Cena con foto');ui.input('#group-meal-text','Texto pendiente');
  const file=new ui.w.File([new Uint8Array([137,80,78,71,13,10,26,10])],'ticket-elegido.png',{type:'image/png'});
  const input=ui.$('#group-meal-file');Object.defineProperty(input,'files',{configurable:true,value:[file]});
  input.dispatchEvent(new ui.w.Event('change',{bubbles:true}));
  assert.match(ui.$('#group-meal-message').textContent,/Cargando/);
  assert.equal(ui.$('#group-save-draft').disabled,true);
  await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  assert.match(ui.$('#group-meal-ticket').textContent,/ticket-elegido.png/);
  assert.equal(ui.$('#group-meal-ticket details'),null);
  assert.match(ui.$('#group-meal-ticket img').src,/^data:image\/png;base64,/);
  assert.equal(input.files[0],file);
  assert.equal(ui.$('#group-meal-name').value,'Cena con foto');
  assert.equal(ui.$('#group-meal-text').value,'Texto pendiente');
  assert.equal(ui.$('#group-save-draft').disabled,false);
  ui.click('#group-save-draft');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  assert.equal(ui.state.viajes[0].group.meals[0].ticketName,'ticket-elegido.png');
  ui.click('[data-group-edit]');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  assert.match(ui.$('#group-meal-ticket').textContent,/ticket-elegido.png/);
 }finally{ui.close();}
});

test('una lectura fallida informa del error y permite elegir otra foto sin perder la anterior',async()=>{
 let attempts=0;
 const ui=await setup({readTicket:async()=>{if(++attempts===2)throw new Error('No se pudo leer la imagen');return {name:'anterior.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,dGVzdA=='};}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('No se pudo leer'));
  assert.match(ui.$('#group-meal-ticket').textContent,/anterior.jpg/);
  assert.equal(ui.$('#group-meal-file').disabled,false);assert.equal(ui.$('#group-ocr').disabled,false);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  assert.equal(attempts,3);
 }finally{ui.close();}
});


test('OCR sin precios reconciliados conserva los conceptos existentes y pide revisión',async()=>{
 const ui=await setup({recognize:async()=>({text:'MEJILLONES\nTotal: 69,00',fields:{total:null},itemsStatus:'review'})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.click('#group-add-item');ui.input('[data-item-field="name"]','Concepto revisado');
  ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('no se han podido emparejar'));
  assert.equal(ui.$('[data-item-field="name"]').value,'Concepto revisado');
  assert.equal(ui.$('#group-meal-reviewed').checked,false);
  assert.equal(ui.state.gastos.length,0);
 }finally{ui.close();}
});


test('Grupo usa la propuesta reconciliada de columnas en lugar del texto completo desalineado',async()=>{
 const ui=await setup({recognize:async()=>({text:'MEJILLONES 12,70\nTotal 6,90',itemText:'2 FIDEUA 33,90\nTOTAL 33,90',itemsStatus:'reconciled',fields:{total:33.9}})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===2);
  assert.equal(ui.$('[data-item-field="name"]').value,'FIDEUA');
  assert.equal(ui.$('[data-item-field="quantity"]').value,'1');
  assert.equal(ui.$('[data-item-field="amountCents"]').value,'16.95');
  assert.equal(ui.$('#group-meal-total').value,'33.90');
  assert.equal(ui.$('#group-meal-reviewed').checked,false);
 }finally{ui.close();}
});


test('el botón de proponer no convierte una lectura rechazada en conceptos con precios desplazados',async()=>{
 const raw='Mila init oruiriaia 10,50\nMEJILLONES 12,70';
 const ui=await setup({recognize:async()=>({text:raw,fields:{total:23.2},itemsStatus:'review'})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('no se han podido emparejar'));
  ui.click('#group-parse-text');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('No se puede pasar directamente'));
  assert.equal(ui.$('#group-meal-items').querySelectorAll('fieldset').length,0);
  ui.click('#group-save-draft');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  ui.click('[data-group-edit]');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.click('#group-parse-text');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('No se puede pasar directamente'));
  ui.input('#group-meal-text','1 MEJILLONES 10,50\n1 SEPIA APERITIVO 12,70');
  ui.click('#group-parse-text');await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===2);
  assert.equal(ui.$('[data-item-field="name"]').value,'MEJILLONES');
  assert.equal(ui.$('[data-item-field="amountCents"]').value,'10.50');
 }finally{ui.close();}
});

test('proponer un texto incompleto conserva los conceptos anteriores si no suma el ticket',async()=>{
 const ui=await setup();
 try{
  await prepare(ui);
  const before=ui.$('[data-item-field="name"]').value;
  ui.input('#group-meal-text','1 MEJILLONES 12,70');ui.click('#group-parse-text');
  await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('no suman el total'));
  assert.equal(ui.$('[data-item-field="name"]').value,before);
  assert.equal(ui.$('#group-meal-items').querySelectorAll('fieldset').length,13);
 }finally{ui.close();}
});


test('proponer muestra errores junto al botón y reemplaza conceptos con confirmación visible',async()=>{
 const ui=await setup();
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.click('#group-parse-text');await ui.waitFor(()=>ui.$('#group-parse-message').classList.contains('error'));
  assert.equal(ui.$('#group-text-panel').open,true);
  assert.match(ui.$('#group-parse-message').textContent,/No se han reconocido/);
  ui.input('#group-meal-text','1 Cena 300,00');ui.click('#group-parse-text');
  await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===1);
  ui.w.confirm=()=>{throw new Error('No debe abrir una confirmación nativa');};
  ui.input('#group-meal-text','1 Tapas 300,00');ui.click('#group-parse-text');
  await ui.waitFor(()=>!ui.$('#group-parse-replace').hidden);
  assert.equal(ui.$('[data-item-field="name"]').value,'Cena');
  ui.click('#group-parse-keep');assert.equal(ui.$('[data-item-field="name"]').value,'Cena');
  ui.click('#group-parse-text');ui.click('#group-parse-confirm');
  await ui.waitFor(()=>ui.$('[data-item-field="name"]').value==='Tapas');
  assert.equal(ui.$('#group-parse-replace').hidden,true);
  assert.match(ui.$('#group-parse-message').textContent,/Propuesta de 1 conceptos/);
 }finally{ui.close();}
});

test('una sola tapa se comparte entre tres viajeros sin exigir tres unidades del ticket',async()=>{
 const ui=await setup();
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-name','Tapas compartidas');ui.input('#group-meal-total','10.50');
  ui.input('#group-meal-payer','p0');ui.input('#group-meal-account','1');ui.click('#group-add-item');
  ui.input('[data-item-field="name"]','Mejillones');ui.input('[data-item-field="amountCents"]','10.50');
  for(const id of ['p0','p1','p2'])ui.input('[data-item-diner="'+id+'"]',true);
  assert.equal(ui.$('[data-item-field="quantity"]').value,'1');
  assert.equal(ui.$('[data-item-person="p0"]').value,'1');
  ui.input('[data-item-diner="p2"]',false);assert.equal(ui.$('[data-item-person="p2"]').value,'0');
  ui.input('[data-item-diner="p2"]',true);
  assert.match(ui.$('#group-meal-check').textContent,/Todo cuadra/);
  ui.input('#group-meal-reviewed',true);ui.click('#group-close-meal');
  await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  const meal=ui.state.viajes[0].group.meals[0],result=ui.w.TravelGroup.allocation(meal);
  assert.equal(result.totals.p0,350);assert.equal(result.totals.p1,350);assert.equal(result.totals.p2,350);
  assert.equal(result.totals.p3,0);assert.equal(ui.state.gastos[0].importe,3.5);
  assert.equal(ui.state.cuentas.find(c=>c.groupClearing).saldoActual,7);
 }finally{ui.close();}
});

test('OCR muestra progreso y tiempo, abre el texto al terminar y no deja botones bloqueados',async()=>{
 let complete,notify;
 const ui=await setup({recognize:async(meal,progress)=>{notify=progress;return new Promise(resolve=>complete=resolve);}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.click('#group-ocr');await ui.waitFor(()=>!!complete);
  assert.equal(ui.$('#group-ocr-progress-wrap').hidden,false);
  assert.equal(ui.$('#group-parse-text').disabled,true);
  notify({status:'Leyendo los productos',progress:0.55});
  assert.equal(ui.$('#group-ocr-progress').value,55);assert.match(ui.$('#group-ocr-counter').textContent,/55% · \d+ s/);
  notify({status:'Nueva pasada',progress:0.2});assert.equal(ui.$('#group-ocr-progress').value,55);
  complete({itemText:'1 Cena 12,00',text:'1 Cena 12,00',itemsStatus:'reconciled',fields:{total:12}});
  await ui.waitFor(()=>ui.$('#group-ocr-progress').value===100 && !ui.$('#group-parse-text').disabled);
  assert.equal(ui.$('#group-text-panel').open,true);assert.equal(ui.$('#group-meal-text').value,'1 Cena 12,00');
 }finally{ui.close();}
});

test('un error del OCR informa junto al botón y permite volver a intentarlo',async()=>{
 const ui=await setup({recognize:async()=>{throw new Error('Lectura fallida');}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-parse-message').textContent==='Lectura fallida');
  assert.equal(ui.$('#group-text-panel').open,true);assert.equal(ui.$('#group-ocr').disabled,false);
  assert.equal(ui.$('#group-parse-text').disabled,false);assert.match(ui.$('#group-ocr-counter').textContent,/interrumpida/);
 }finally{ui.close();}
});


test('IA pendiente de activar muestra el estado y mantiene el OCR local disponible',async()=>{
 const ui=await setup({aiStatus:async()=>({enabled:false,message:'Pendiente de activación'})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-ai-status').textContent==='Pendiente de activación');
  assert.equal(ui.$('#group-ai-read').disabled,true);assert.equal(ui.$('#group-ocr').disabled,false);
 }finally{ui.close();}
});

test('IA pide consentimiento, muestra propuesta revisable y no guarda el código en el borrador',async()=>{
 let calls=0;
 const ui=await setup({recognizeAI:async(meal,options)=>{calls++;assert.equal(options.consent,true);assert.equal(options.accessCode,'private-test-code');assert.ok(meal.ticketData);return {text:'1 Mejillones 10,50',itemText:'1 Mejillones 10,50',itemsStatus:'reconciled',fields:{total:10.5}};}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  ui.click('#group-ai-read');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('autorizas'));
  assert.equal(calls,0);ui.input('#group-ai-consent',true);ui.input('#group-ai-code','private-test-code');ui.click('#group-ai-read');
  await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===1 && !ui.$('#group-ai-read').disabled);
  assert.equal(calls,1);assert.equal(ui.$('[data-item-field="amountCents"]').value,'10.50');
  assert.equal(ui.$('#group-meal-reviewed').checked,false);assert.equal(ui.state.gastos.length,0);
  assert.equal(ui.$('#group-text-panel').open,true);assert.equal(ui.$('#group-ocr-progress').value,100);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.startsWith('Foto cargada'));
  assert.equal(ui.$('#group-ai-consent').checked,false);
  ui.click('#group-close-editor');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  assert.ok(!JSON.stringify([...ui.drafts.values()]).includes('private-test-code'));
 }finally{ui.close();}
});

test('IA agotada no cambia los conceptos existentes ni dispara el OCR automáticamente',async()=>{
 let calls=0;
 const ui=await setup({recognizeAI:async()=>{calls++;throw new Error('Cuota gratuita agotada');}});
 try{
  await prepare(ui);await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  const before=ui.$('[data-item-field="name"]').value;
  ui.input('#group-ai-consent',true);ui.input('#group-ai-code','test-code');ui.click('#group-ai-read');
  await ui.waitFor(()=>ui.$('#group-parse-message').textContent==='Cuota gratuita agotada');
  assert.equal(calls,1);assert.equal(ui.ocrCalls(),1);assert.equal(ui.$('[data-item-field="name"]').value,before);
  assert.equal(ui.$('#group-ocr').disabled,false);assert.equal(ui.$('#group-save-draft').disabled,false);
 }finally{ui.close();}
});

test('dos platos iguales aparecen separados y se guardan uno individual y otro compartido',async()=>{
 const ui=await setup({recognize:async()=>({text:'2 Paella 24,00',fields:{total:24,merchant:'Restaurante prueba'}})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));
  ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===2);
  const rows=[...ui.$('#group-meal-items').querySelectorAll('fieldset')];
  for(const row of rows){assert.equal(row.querySelector('[data-item-field="name"]').value,'Paella');assert.equal(row.querySelector('[data-item-field="quantity"]').value,'1');assert.equal(row.querySelector('[data-item-field="amountCents"]').value,'12.00');}
  assert.notEqual(rows[0].dataset.groupItem,rows[1].dataset.groupItem);
  assert.equal(ui.$('[data-item-field="mode"]'),null);assert.equal(ui.$('[data-item-field="common"]'),null);
  ui.input('fieldset:nth-child(1) [data-item-diner="p0"]',true);
  ui.input('fieldset:nth-child(2) [data-item-diner="p1"]',true);ui.input('fieldset:nth-child(2) [data-item-diner="p2"]',true);
  ui.input('#group-meal-payer','p0');ui.input('#group-meal-account','1');ui.input('#group-meal-reviewed',true);
  ui.click('#group-close-meal');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  const meal=ui.state.viajes[0].group.meals[0],result=ui.w.TravelGroup.allocation(meal);
  assert.equal(result.totals.p0,1200);assert.equal(result.totals.p1,600);assert.equal(result.totals.p2,600);
  assert.equal(ui.state.cuentas.find(c=>c.id===1).saldoActual,476);
  assert.equal(ui.state.cuentas.find(c=>c.groupClearing).saldoActual,12);
  ui.click('[data-group-edit]');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  assert.equal(ui.$('#group-meal-items').querySelectorAll('fieldset').length,2);
  assert.equal(ui.$('fieldset:nth-child(2) [data-item-diner="p2"]').checked,true);
 }finally{ui.close();}
});

test('el código correcto se recuerda tras reabrir la aplicación y puede olvidarse sin tocar viajes',async()=>{
 let saved;
 const ui=await setup({recognizeAI:async()=>({text:'1 Cena 12,00',fields:{total:12}})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));
  ui.input('#group-ai-consent',true);ui.input('#group-ai-code','remember-this-code');ui.click('#group-ai-read');
  await ui.waitFor(()=>!ui.$('#group-ai-access-saved').hidden);
  saved=ui.w.localStorage.getItem('cuaderno.receiptAccess.v1');assert.equal(saved,'remember-this-code');
  assert.equal(ui.$('#group-ai-access-entry').hidden,true);
  ui.click('#group-close-editor');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  assert.ok(!JSON.stringify([...ui.drafts.values()]).includes(saved));assert.ok(!JSON.stringify(ui.state).includes(saved));
 }finally{ui.close();}
 const reopened=await setup({rememberedCode:saved});
 try{
  reopened.click('#group-new-meal');await reopened.waitFor(()=>!reopened.$('#group-ai-read').disabled);
  assert.equal(reopened.$('#group-ai-code').value,saved);assert.equal(reopened.$('#group-ai-access-entry').hidden,true);
  assert.equal(reopened.$('#group-ai-consent').checked,false);
  reopened.click('#group-ai-change-code');assert.equal(reopened.$('#group-ai-access-entry').hidden,false);
  reopened.click('#group-ai-forget-code');assert.equal(reopened.w.localStorage.getItem('cuaderno.receiptAccess.v1'),null);
  assert.equal(reopened.$('#group-ai-code').value,'');assert.equal(reopened.state.viajes.length,1);
 }finally{reopened.close();}
});

test('un código recordado que ya no sirve vuelve a pedir corrección; bloquear almacenamiento no bloquea la lectura',async()=>{
 const ui=await setup({rememberedCode:'old-code',recognizeAI:async()=>{throw new Error('Código de acceso incorrecto.');}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));ui.input('#group-ai-consent',true);ui.click('#group-ai-read');
  await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('incorrecto'));
  assert.equal(ui.$('#group-ai-access-entry').hidden,false);assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),null);
 }finally{ui.close();}
 const blocked=await setup({recognizeAI:async()=>({text:'1 Cena 12,00',fields:{total:12}})});
 try{
  Object.defineProperty(blocked.w,'localStorage',{get(){throw new Error('Blocked');}});
  blocked.click('#group-new-meal');await blocked.waitFor(()=>!blocked.$('#group-ai-read').disabled);
  blocked.input('#group-meal-file','');await blocked.waitFor(()=>blocked.$('#group-meal-ticket img'));
  blocked.input('#group-ai-code','session-code');blocked.input('#group-ai-consent',true);blocked.click('#group-ai-read');
  await blocked.waitFor(()=>blocked.$('#group-meal-items').querySelectorAll('fieldset').length===1);
  assert.equal(blocked.$('#group-ai-access-entry').hidden,false);
 }finally{blocked.close();}
});
