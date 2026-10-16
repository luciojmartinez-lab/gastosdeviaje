import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sources=['group-meals.js','group-ledger.js','group-store.js','group-ui.js'].map(file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
async function setup(options={}){
 const dom=new JSDOM(html,{url:'http://localhost.test/',runScripts:'outside-only'}),w=dom.window;
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
 w.TravelGroupUI.mount({getState:()=>state,selectTrip:id=>{state.selectedViajeIds=[Number(id)];w.TravelGroupUI.render();},save:async(id,revision,group)=>{const saved=await w.TravelGroupStore.save(db,id,revision,group);await load();w.TravelGroupUI.render();return saved;},cacheDraft:async value=>drafts.set(value.tripId,JSON.parse(JSON.stringify(value))),readDraft:async id=>drafts.get(id),clearDraft:async id=>drafts.delete(id),refresh:load,readTicket:options.readTicket ? input=>options.readTicket(w,input) : async()=>({name:'ticket.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,dGVzdA=='}),recognize:async meal=>{ocrCalls++;assert.equal(meal.ticketName,'ticket.jpg');return{text:'12 Menús 24,00 288,00\nPan y agua 12,00\nTOTAL 300,00',fields:{total:300,merchant:'Restaurante prueba'}};},share:async text=>assert.match(text,/Pendiente|pendiente/)});
 const $=selector=>w.document.querySelector(selector);
 const input=(selector,value)=>{const element=$(selector);if(element.type==='checkbox')element.checked=value;else element.value=value;element.dispatchEvent(new w.Event('input',{bubbles:true}));element.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const click=selector=>$(selector).click();
 async function waitFor(predicate){const end=Date.now()+2500;while(!predicate()){if(Date.now()>end)throw new Error('La interfaz no alcanzó el estado esperado: '+$('#group-meal-message').textContent+' / '+$('#group-payment-message').textContent);await new Promise(resolve=>setTimeout(resolve,5));}}
 return {dom,w,db,state,drafts,$,input,click,waitFor,load,ocrCalls:()=>ocrCalls,close:()=>{db.close();w.close();}};
}
async function prepare(ui){ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').innerHTML.includes('ticket.jpg')||ui.$('#group-meal-ticket').innerHTML.includes('data:image'));ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===2);ui.input('#group-meal-payer','p0');ui.input('#group-meal-account','1');ui.input('#group-meal-items fieldset:first-child [data-item-field="mode"]','units');for(let i=0;i<12;i++)ui.input('#group-meal-items fieldset:first-child [data-item-person="p'+i+'"]','1');}
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
