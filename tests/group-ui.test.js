import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sources=['receipt-access.js','group-meals.js','group-ledger.js','group-store.js','group-ui.js'].map(file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
async function setup(options={}){
 const dom=new JSDOM(html,{url:'http://localhost.test/',runScripts:'outside-only'}),w=dom.window;
 if(options.rememberedCode)w.localStorage.setItem('cuaderno.receiptAccess.v1',options.rememberedCode);
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};w.confirm=()=>true;
 for(const source of sources)w.eval(source);
 const factory=new IDBFactory();const stores=['viajes','cuentas','gastos','transferencias','categorias'];
 const db=await new Promise((resolve,reject)=>{const req=factory.open('ui',1);req.onupgradeneeded=()=>stores.forEach(name=>req.result.createObjectStore(name,{keyPath:'id',autoIncrement:true}));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const people=Array.from({length:12},(_,i)=>({id:'p'+i,name:'Atleta '+i,active:true}));
 const seed=[['viajes',{id:1,nombre:'Tenerife',group:{enabled:true,revision:0,selfId:'p0',integrate:true,participants:people,meals:[],settlements:[]}}],['cuentas',{id:1,nombre:'Banco',viajeId:1,moneda:'EUR',saldoActual:500}],['categorias',{id:1,nombre:'Comida',parentId:null}]];
 await new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);seed.forEach(([name,value])=>tx.objectStore(name).put(value));});
 const state={selectedViajeIds:[1]},drafts=new Map();
 async function load(){await new Promise((resolve,reject)=>{const tx=db.transaction(stores);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);stores.forEach(name=>{const req=tx.objectStore(name).getAll();req.onsuccess=()=>state[name]=req.result;});});}
 await load();let ocrCalls=0;
 w.TravelGroupUI.mount({prepareReceipt:options.prepareReceipt,shareReceipt:options.shareReceipt,downloadReceipt:options.downloadReceipt,aiStatus:options.aiStatus||(async()=>({enabled:true,message:'Comprobación gratuita por foto'})),recognizeAI:options.recognizeAI,expenseScope:options.expenseScope,getState:()=>state,selectTrip:id=>{state.selectedViajeIds=[Number(id)];w.TravelGroupUI.render();},save:async(id,revision,group)=>{const saved=await w.TravelGroupStore.save(db,id,revision,group);await load();w.TravelGroupUI.render();return saved;},cacheDraft:async value=>drafts.set(value.tripId,JSON.parse(JSON.stringify(value))),readDraft:async id=>drafts.get(id),clearDraft:async id=>drafts.delete(id),refresh:load,readTicket:options.readTicket ? input=>options.readTicket(w,input) : async()=>({name:'ticket.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,dGVzdA=='}),recognize:options.recognize || (async meal=>{ocrCalls++;assert.equal(meal.ticketName,'ticket.jpg');return{text:'12 Menús 24,00 288,00\nPan y agua 12,00\nTOTAL 300,00',fields:{total:300,merchant:'Restaurante prueba'}};}),share:async text=>assert.match(text,/Pendiente|pendiente/)});
 const $=selector=>w.document.querySelector(selector);
 const input=(selector,value)=>{const element=$(selector);if(element.type==='checkbox')element.checked=value;else element.value=value;element.dispatchEvent(new w.Event('input',{bubbles:true}));element.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const click=selector=>$(selector).click();
 async function waitFor(predicate){const end=Date.now()+2500;while(!predicate()){if(Date.now()>end)throw new Error('La interfaz no alcanzó el estado esperado: '+$('#group-meal-message').textContent+' / '+$('#group-payment-message').textContent);await new Promise(resolve=>setTimeout(resolve,5));}}
 return {dom,w,db,state,drafts,$,input,click,waitFor,load,ocrCalls:()=>ocrCalls,close:()=>{db.close();w.close();}};
}
async function prepare(ui){ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').innerHTML.includes('ticket.jpg')||ui.$('#group-meal-ticket').innerHTML.includes('data:image'));ui.click('#group-ocr');await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===13);ui.input('#group-meal-payer','p0');ui.input('#group-meal-account','1');for(let i=0;i<12;i++)ui.input('#group-meal-items fieldset:nth-child('+(i+1)+') [data-item-diner="p'+i+'"]',true);}

test('Nueva comida sin viajeros avisa en un modal, no crea borrador y lleva a añadir gente',async()=>{
 const ui=await setup();try{
  ui.$('#view-grupo').style.display='';
  Object.assign(ui.state.viajes[0].group,{enabled:false,participants:[],selfId:'',integrate:false});ui.w.TravelGroupUI.render();
  const before=JSON.stringify(ui.state),draft={meal:{name:'Borrador anterior'}};ui.drafts.set(1,draft);
  assert.equal(ui.$('#group-new-meal').disabled,false);ui.click('#group-new-meal');
  assert.equal(ui.$('#group-people-needed-dialog').open,true);assert.match(ui.$('#group-people-needed-message').textContent,/no has creado ningún grupo.*Añade gente/);
  assert.equal(ui.$('#group-meal-dialog').open,false);assert.equal(JSON.stringify(ui.state),before);assert.equal(ui.drafts.get(1),draft);
  ui.click('#group-people-needed-close');assert.equal(ui.$('#group-people-needed-dialog').open,false);assert.equal(ui.$('#group-people').closest('details').open,true);assert.equal(ui.w.document.activeElement,ui.$('#group-people'));
  ui.input('#group-people','Ana');ui.click('#group-add-people');await ui.waitFor(()=>ui.state.viajes[0].group.participants.length===1);
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);assert.equal(ui.$('#group-people-needed-dialog').open,false);
 }finally{ui.close();}
});

test('un grupo con todos archivados pide añadir o activar viajeros y permite revisar sus comidas anteriores',async()=>{
 const ui=await setup();try{
  const group=ui.state.viajes[0].group;group.participants.forEach(person=>person.active=false);
  group.meals=[{id:'anterior',name:'Comida anterior',date:'2026-10-17',status:'draft',currency:'EUR',attendees:['p0'],payerId:'p0',totalCents:null,items:[]}];
  ui.w.TravelGroupUI.render();ui.click('#group-new-meal');assert.equal(ui.$('#group-people-needed-dialog').open,true);assert.match(ui.$('#group-people-needed-message').textContent,/No hay viajeros activos.*vuelve a activar/);
  ui.click('#group-people-needed-close');ui.click('[data-group-edit="anterior"]');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);assert.equal(ui.$('#group-meal-name').value,'Comida anterior');
 }finally{ui.close();}
});

async function seedPayments(ui){
 const group=ui.w.TravelGroup.normalize(ui.state.viajes[0].group);
 group.integrate=false;group.participants=group.participants.slice(0,3);group.participants[2].active=false;
 const meal=(id,payerId,amounts)=>({id,name:id,date:'2026-10-17',status:'closed',currency:'EUR',payerId,attendees:['p0','p1','p2'],totalCents:amounts.reduce((a,b)=>a+b,0),items:amounts.map((amountCents,i)=>({id:id+i,name:'Plato '+i,quantity:1,amountCents,shares:{['p'+i]:1}}))});
 group.meals=[meal('comida1','p0',[2000,3001,1000]),meal('comida2','p1',[1001,2000,1002]),{...meal('borrador','p0',[9000,9000,9000]),status:'draft'}];
 group.settlements=[{id:'s1',mealId:'comida1',fromId:'p1',toId:'p0',amountCents:1000,date:'2026-10-17'}, {id:'s2',mealId:'comida2',fromId:'p0',toId:'p1',amountCents:500,date:'2026-10-17'}, {id:'s3',mealId:'comida1',fromId:'p2',toId:'p0',amountCents:500,date:'2026-10-17',voided:true,voidReason:'Registro erróneo'}];
 await ui.w.TravelGroupStore.save(ui.db,1,0,group);await ui.load();ui.w.TravelGroupUI.render();
}

async function seedExpenseAdvance(ui){
 const group=ui.w.TravelGroup.normalize(ui.state.viajes[0].group);
 group.integrate=true;group.selfId='p0';group.participants=group.participants.slice(0,3);
 group.meals=[{id:'adelanto',name:'Comida Catalinos',date:'2026-10-23',time:'14:30',currency:'EUR',status:'closed',payerId:'p0',accountId:1,attendees:['p0','p1','p2'],totalCents:30000,items:[3000,10000,17000].map((amountCents,index)=>({id:'plato'+index,name:'Plato '+index,quantity:1,amountCents,shares:{['p'+index]:1}}))}];group.settlements=[];
 await new Promise((resolve,reject)=>{const tx=ui.db.transaction('cuentas','readwrite');tx.objectStore('cuentas').put({id:2,nombre:'Efectivo',viajeId:1,moneda:'EUR',saldoActual:0});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
 await ui.w.TravelGroupStore.save(ui.db,1,0,group);await ui.load();ui.w.TravelGroupUI.render();
}

test('los cobros en efectivo y banco conservan el pendiente y solo mi consumo como gasto',async()=>{
 const ui=await setup();try{
  await seedExpenseAdvance(ui);
  const pending=()=>ui.w.TravelGroup.advanceDetails(ui.state.viajes[0].group,ui.state.viajes[0].group.meals[0]).pending,account=id=>ui.state.cuentas.find(value=>value.id===id).saldoActual;
  assert.equal(pending(),27000);assert.equal(account(1),200);const expenseId=ui.state.gastos[0].id;
  async function collect(person,amount,id){
   ui.w.TravelGroupUI.openCollection(1,'adelanto');assert.equal(ui.$('#group-payment-account').required,true);assert.match(ui.$('#group-payment-account-label').textContent,/recibes el dinero/);
   ui.input('#group-payment-from',person);ui.input('#group-payment-amount',amount);ui.input('#group-payment-account',String(id));ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  }
  await collect('p1','50',2);assert.equal(pending(),22000);assert.equal(account(2),50);
  await collect('p2','70',1);assert.equal(pending(),15000);assert.equal(account(1),270);
  await collect('p1','30',1);assert.equal(pending(),12000);assert.equal(account(1),300);
  assert.equal(ui.state.gastos.length,1);assert.equal(ui.state.gastos[0].id,expenseId);assert.equal(ui.state.gastos[0].importe,30);
  const group=ui.w.TravelGroup.normalize(ui.state.viajes[0].group);group.settlements[0].voided=true;group.settlements[0].voidReason='Error';await ui.w.TravelGroupStore.save(ui.db,1,group.revision,group);await ui.load();ui.w.TravelGroupUI.render();assert.equal(pending(),17000);assert.equal(account(2),0);
 }finally{ui.close();}
});

test('las comidas empiezan plegadas y conservan su apertura al actualizar el grupo',async()=>{
 const ui=await setup();try{
  await seedExpenseAdvance(ui);const toggle=()=>ui.$('[data-group-toggle="adelanto"]'),body=()=>ui.$('#group-meals .group-meal-body');
  assert.equal(toggle().getAttribute('aria-expanded'),'false');assert.equal(body().hidden,true);
  ui.click('[data-group-toggle="adelanto"]');assert.equal(toggle().getAttribute('aria-expanded'),'true');assert.equal(body().hidden,false);
  ui.w.TravelGroupUI.render();assert.equal(body().hidden,false);ui.click('[data-group-toggle="adelanto"]');assert.equal(body().hidden,true);
 }finally{ui.close();}
});

test('desde un gasto se abre directamente la comida del viaje correcto aunque haya varios viajes seleccionados',async()=>{
 const ui=await setup();try{
  await seedExpenseAdvance(ui);const group=ui.w.TravelGroup.normalize(ui.state.viajes[0].group);group.revision=0;group.meals[0].accountId=10;group.meals[0].name='Otra comida';
  await new Promise((resolve,reject)=>{const tx=ui.db.transaction(['viajes','cuentas'],'readwrite');tx.objectStore('viajes').put({id:2,nombre:'Otro viaje'});tx.objectStore('cuentas').put({id:10,nombre:'Banco segundo viaje',viajeId:2,moneda:'EUR',saldoActual:500});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
  await ui.w.TravelGroupStore.save(ui.db,2,0,group);await ui.load();ui.state.selectedViajeIds=[1,2];ui.w.TravelGroupUI.render();
  ui.w.TravelGroupUI.openCollection(2,'adelanto');assert.equal(ui.$('#group-payment-dialog').dataset.tripId,'2');assert.deepEqual(Array.from(ui.$('#group-payment-account').options).map(option=>option.value),['','10']);ui.click('#group-payment-close');
  await ui.w.TravelGroupUI.openMealForTrip(2,'adelanto');assert.equal(ui.$('#group-meal-name').value,'Otra comida');assert.equal(ui.$('#group-trip').value,'2');assert.equal(ui.$('[data-group-toggle="adelanto"]').getAttribute('aria-expanded'),'true');
  await assert.rejects(ui.w.TravelGroupUI.openMealForTrip(2,'inexistente'),/no está disponible/);
 }finally{ui.close();}
});

test('justificante individual muestra solo esa persona, comparte archivo preparado y no cambia la contabilidad',async()=>{
 let prepared,shared=0,downloaded=0;
 const ui=await setup({prepareReceipt:async value=>{prepared=value;return[{name:value.participantName+'.png'}];},shareReceipt:async files=>{shared++;assert.equal(files[0].name,'Atleta 1.png');return 'Menú de compartir abierto';},downloadReceipt:files=>{downloaded++;assert.equal(files[0].name,'Atleta 1.png');}});
 try{
  await seedPayments(ui);const before=JSON.stringify(ui.state);
  ui.click('[data-group-receipt="comida1"]');assert.equal(ui.$('#group-receipt-share').disabled,true);
  ui.input('#group-receipt-person','p1');await ui.waitFor(()=>!ui.$('#group-receipt-share').disabled);
  assert.equal(prepared.participantName,'Atleta 1');assert.equal(prepared.totalCents,3001);assert.equal(prepared.paidCents,1000);assert.equal(prepared.remainingCents,2001);
  assert.equal(ui.$('#group-receipt-content tbody').rows.length,1);assert.match(ui.$('#group-receipt-content').textContent,/Plato 1/);assert.doesNotMatch(ui.$('#group-receipt-content').textContent,/Plato 0|Plato 2/);
  assert.equal(shared,0);ui.click('#group-receipt-share');await ui.waitFor(()=>shared===1);
  ui.click('#group-receipt-download');assert.equal(downloaded,1);assert.equal(JSON.stringify(ui.state),before);
  ui.input('#group-receipt-person','p0');await ui.waitFor(()=>!ui.$('#group-receipt-share').disabled);
  assert.match(ui.$('#group-receipt-content').textContent,/Cubierto por ti/);assert.equal(prepared.remainingCents,0);
  ui.click('#group-receipt-close');ui.click('[data-group-receipt="comida2"]');assert.equal(ui.$('#group-receipt-person').value,'');assert.equal(ui.$('#group-receipt-content').innerHTML,'');assert.equal(ui.$('#group-receipt-share').disabled,true);
 }finally{ui.close();}
});

test('cambiar de persona mientras se prepara una imagen no comparte el justificante anterior',async()=>{
 const pending=[],sent=[];const ui=await setup({prepareReceipt:receipt=>new Promise(resolve=>pending.push(()=>resolve([{name:receipt.participantName+'.png'}]))),shareReceipt:async files=>{sent.push(files[0].name);return 'Preparado';}});
 try{
  await seedPayments(ui);ui.click('[data-group-receipt="comida1"]');ui.input('#group-receipt-person','p1');ui.input('#group-receipt-person','p2');
  pending[0]();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(ui.$('#group-receipt-share').disabled,true);
  pending[1]();await ui.waitFor(()=>!ui.$('#group-receipt-share').disabled);ui.click('#group-receipt-share');await ui.waitFor(()=>sent.length===1);assert.deepEqual(sent,['Atleta 2.png']);
 }finally{ui.close();}
});

test('totales por comida y grupo: céntimos, varios pagadores, archivados, borradores y devoluciones anuladas',async()=>{
 const ui=await setup();try{
  await seedPayments(ui);
  const cells=selector=>Array.from(ui.$(selector).children).map(cell=>cell.textContent.replace(/\s/g,' '));
  assert.deepEqual(cells('#group-meals article:has([data-group-collect="comida1"]) tfoot tr'),['Total','60,01 €','30,00 €','30,01 €']);
  assert.deepEqual(cells('#group-meals article:has([data-group-collect="comida2"]) tfoot tr'),['Total','40,03 €','25,00 €','15,03 €']);
  assert.equal(ui.$('#group-meals article:has([data-group-edit="borrador"]) tfoot'),null);
  const totals=cells('#group-balances tfoot tr');
  assert.deepEqual(totals.slice(0,5),['Total','100,04 €','100,04 €','15,00 €','15,00 €']);
  assert.match(totals[5],/^0,00 €/);assert.match(totals[5],/25,00 € a recuperar/);assert.match(totals[5],/25,00 € a pagar/);
  ui.w.prompt=()=> 'Corrección de prueba';ui.click('[data-group-void="s1"]');
  await ui.waitFor(()=>ui.state.viajes[0].group.settlements.find(s=>s.id==='s1').voided);
  assert.deepEqual(cells('#group-meals article:has([data-group-collect="comida1"]) tfoot tr'),['Total','60,01 €','20,00 €','40,01 €']);
  assert.match(ui.$('#group-balances tfoot').textContent,/35,00\s€ a recuperar/);
 }finally{ui.close();}
});

test('devolución rellena el pendiente de la comida elegida y permite importes parciales editados',async()=>{
 const ui=await setup();try{
  await seedPayments(ui);
  ui.click('[data-group-collect="comida1"]');assert.equal(ui.$('#group-payment-amount').value,'');
  ui.input('#group-payment-from','p1');assert.equal(ui.$('#group-payment-amount').value,'20.01');
  ui.input('#group-payment-amount','2');assert.equal(ui.$('#group-payment-amount').value,'2');
  ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));
  await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  assert.equal(ui.state.viajes[0].group.settlements.at(-1).amountCents,200);
  ui.click('[data-group-collect="comida1"]');ui.input('#group-payment-from','p1');assert.equal(ui.$('#group-payment-amount').value,'18.01');
  ui.input('#group-payment-from','p2');assert.equal(ui.$('#group-payment-amount').value,'10.00');
  ui.input('#group-payment-from','');assert.equal(ui.$('#group-payment-amount').value,'');
  ui.input('#group-payment-from','p1');
  ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));
  await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  assert.equal(ui.state.viajes[0].group.settlements.at(-1).amountCents,1801);
  ui.click('[data-group-collect="comida1"]');assert.equal(ui.$('#group-payment-from option[value="p1"]'),null);ui.click('#group-payment-close');
  ui.click('[data-group-collect="comida2"]');assert.equal(ui.$('#group-payment-amount').value,'');
  ui.input('#group-payment-from','p0');assert.equal(ui.$('#group-payment-amount').value,'5.01');
  ui.input('#group-payment-from','p2');assert.equal(ui.$('#group-payment-amount').value,'10.02');
 }finally{ui.close();}
});
test('editar devolución conserva el registro, permite corregir persona/fecha y no reactiva anuladas',async()=>{
 const ui=await setup();try{
  await seedPayments(ui);
  assert.equal(ui.$('[data-group-payment-edit="s3"]'),null);
  const submit=()=>ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));
  ui.click('[data-group-payment-edit="s1"]');
  assert.equal(ui.$('#group-payment-title').textContent,'Editar devolución');
  assert.equal(ui.$('#group-payment-save').textContent,'Guardar cambios');
  assert.equal(ui.$('#group-payment-from').value,'p1');assert.equal(ui.$('#group-payment-amount').value,'10.00');
  assert.match(ui.$('#group-payment-from option[value="p1"]').textContent,/máximo 30,01/);
  ui.input('#group-payment-amount','30.02');submit();await ui.waitFor(()=>ui.$('#group-payment-message').textContent.includes('supera'));
  assert.equal(ui.state.viajes[0].group.settlements.find(s=>s.id==='s1').amountCents,1000);
  ui.input('#group-payment-amount','30.01');submit();await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  assert.equal(ui.state.viajes[0].group.settlements.length,3);
  assert.equal(ui.state.viajes[0].group.settlements.find(s=>s.id==='s1').amountCents,3001);
  ui.click('[data-group-payment-edit="s1"]'); // A full payment must remain selectable while editing.
  assert.equal(ui.$('#group-payment-from').value,'p1');assert.equal(ui.$('#group-payment-amount').value,'30.01');
  ui.input('#group-payment-from','p2');assert.equal(ui.$('#group-payment-amount').value,'10.00');
  ui.input('#group-payment-amount','8.55');ui.input('#group-payment-date','2026-10-16');submit();await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  const payment=ui.state.viajes[0].group.settlements.find(s=>s.id==='s1');
  assert.equal(payment.fromId,'p2');assert.equal(payment.amountCents,855);assert.equal(payment.date,'2026-10-16');assert.equal(payment.toId,'p0');
  assert.equal(ui.state.viajes[0].group.settlements.length,3);
  assert.match(ui.$('#group-meals article:has([data-group-collect="comida1"]) tfoot').textContent,/31,46/);
  ui.click('[data-group-payment-edit="s1"]');ui.input('#group-payment-amount','1');ui.click('#group-payment-close');
  assert.equal(ui.state.viajes[0].group.settlements.find(s=>s.id==='s1').amountCents,855);
  ui.click('[data-group-collect="comida1"]');assert.equal(ui.$('#group-payment-title').textContent,'Registrar devolución parcial o completa');
  assert.equal(ui.$('#group-payment-amount').value,'');ui.input('#group-payment-from','p2');assert.equal(ui.$('#group-payment-amount').value,'1.45');
 }finally{ui.close();}
});

test('editar un cobro integrado cambia el importe y la cuenta en la misma transferencia, con guardado atómico',async()=>{
 const ui=await setup();try{
  await prepare(ui);ui.input('#group-meal-reviewed',true);ui.click('#group-close-meal');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  await new Promise((resolve,reject)=>{const tx=ui.db.transaction('cuentas','readwrite');tx.objectStore('cuentas').put({id:20,nombre:'Otra cuenta',viajeId:1,moneda:'EUR',saldoActual:100});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});await ui.load();ui.w.TravelGroupUI.render();
  const submit=()=>ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));
  ui.click('[data-group-collect]');ui.input('#group-payment-from','p1');ui.input('#group-payment-amount','10');ui.input('#group-payment-account','1');submit();await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  const id=ui.state.viajes[0].group.settlements[0].id,transferId=ui.state.transferencias.find(t=>t.groupSource==='settlement:'+id).id;
  ui.click('[data-group-payment-edit]');assert.equal(ui.$('#group-payment-account').value,'1');
  ui.input('#group-payment-amount','16.55');ui.input('#group-payment-account','20');ui.input('#group-payment-date','2026-10-16');submit();await ui.waitFor(()=>!ui.$('#group-payment-dialog').open);
  assert.equal(ui.state.viajes[0].group.settlements.length,1);assert.equal(ui.state.transferencias.length,2);assert.equal(ui.state.gastos.length,1);
  assert.equal(ui.state.cuentas.find(c=>c.id===1).saldoActual,200);assert.equal(ui.state.cuentas.find(c=>c.id===20).saldoActual,116.55);assert.equal(ui.state.cuentas.find(c=>c.groupClearing).saldoActual,258.45);
  const transfer=ui.state.transferencias.find(t=>t.groupSource==='settlement:'+id);assert.equal(transfer.id,transferId);assert.equal(transfer.toId,20);assert.equal(transfer.importeTo,16.55);assert.equal(transfer.fecha,'2026-10-16');
  ui.click('[data-group-payment-edit]');const before=JSON.stringify(ui.state);
  ui.input('#group-payment-amount','26');submit();await ui.waitFor(()=>ui.$('#group-payment-message').textContent.includes('supera'));
  assert.equal(JSON.stringify(ui.state),before);await ui.load();assert.equal(JSON.stringify(ui.state),before);
 }finally{ui.close();}
});

test('editar una devolución detecta cambios de otra pestaña y conserva el formulario sin sobrescribirlos',async()=>{
 const ui=await setup();try{
  await seedPayments(ui);ui.click('[data-group-payment-edit="s1"]');
  const latest=JSON.parse(JSON.stringify(ui.state.viajes[0].group));latest.settlements[0].amountCents=1200;
  await ui.w.TravelGroupStore.save(ui.db,1,latest.revision,latest);
  ui.input('#group-payment-amount','15');ui.$('#group-payment-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));
  await ui.waitFor(()=>ui.$('#group-payment-message').textContent.includes('otra pestaña'));
  assert.equal(ui.$('#group-payment-dialog').open,true);assert.equal(ui.$('#group-payment-amount').value,'15');
  await ui.load();assert.equal(ui.state.viajes[0].group.settlements[0].amountCents,1200);assert.equal(ui.state.viajes[0].group.settlements.length,3);
 }finally{ui.close();}
});

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

test('Gemini en Grupo aplica fecha/hora impresas, las conserva al reabrir y las usa en el gasto integrado',async()=>{
 const ui=await setup({rememberedCode:'fixture-code',recognizeAI:async()=>({text:'1 Cena 12,00\nTOTAL 12,00',itemText:'1 Cena 12,00\nTOTAL 12,00',itemsStatus:'reconciled',fields:{merchant:'Cena del ticket',total:12,date:'2026-09-05',time:'23:44'}})});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));
  ui.input('#group-ai-consent',true);ui.click('#group-ai-read');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled&&ui.$('#group-meal-items fieldset'));
  assert.equal(ui.$('#group-meal-date').value,'2026-09-05');assert.equal(ui.$('#group-meal-time').value,'23:44');assert.match(ui.$('#group-ticket-datetime').textContent,/05\/09\/2026/);assert.match(ui.$('#group-ticket-datetime').textContent,/23:44/);
  assert.equal(ui.$('#group-meal-reviewed').checked,false);assert.equal(ui.state.gastos.length,0);
  ui.input('#group-meal-payer','p0');ui.input('#group-meal-account','1');ui.input('[data-item-diner="p0"]',true);ui.input('#group-meal-reviewed',true);ui.click('#group-close-meal');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  assert.equal(ui.state.gastos[0].fecha,'2026-09-05');assert.equal(ui.state.gastos[0].hora,'23:44');assert.equal(ui.state.gastos[0].importe,12);
  ui.click('[data-group-edit]');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);assert.equal(ui.$('#group-meal-date').value,'2026-09-05');assert.equal(ui.$('#group-meal-time').value,'23:44');
  const restored=ui.w.TravelGroup.normalize(JSON.parse(JSON.stringify(ui.state.viajes[0].group)));assert.equal(restored.meals[0].time,'23:44');
 }finally{ui.close();}
});

test('Grupo conserva fecha/hora existentes si faltan en la lectura',async()=>{
 let finish;const ui=await setup({rememberedCode:'fixture-code',recognizeAI:()=>new Promise(resolve=>finish=resolve)});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);ui.input('#group-meal-date','2026-08-03');ui.input('#group-meal-time','13:20');ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));ui.input('#group-ai-consent',true);ui.click('#group-ai-read');await ui.waitFor(()=>!!finish);
  finish({text:'1 Cena 12,00',itemsStatus:'reconciled',fields:{total:12}});await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);assert.equal(ui.$('#group-meal-date').value,'2026-08-03');assert.equal(ui.$('#group-meal-time').value,'13:20');
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

test('Grupo recupera el código recordado si el campo se vacía antes de leer',async()=>{
 let received;
 const ui=await setup({rememberedCode:'saved-group-code',recognizeAI:async(meal,options)=>{received=options.accessCode;return {text:'1 Cena 12,00',fields:{total:12}};}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));
  ui.$('#group-ai-code').value='';ui.input('#group-ai-consent',true);ui.click('#group-ai-read');
  await ui.waitFor(()=>ui.$('#group-meal-items').querySelectorAll('fieldset').length===1);
  assert.equal(received,'saved-group-code');assert.equal(ui.$('#group-ai-code').value,'saved-group-code');
  assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'saved-group-code');
 }finally{ui.close();}
});

test('un código recordado que ya no sirve vuelve a pedir corrección; bloquear almacenamiento no bloquea la lectura',async()=>{
 const ui=await setup({rememberedCode:'old-code',recognizeAI:async()=>{throw new Error('Código de acceso incorrecto.');}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));ui.input('#group-ai-consent',true);ui.click('#group-ai-read');
  await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('incorrecto'));
  assert.equal(ui.$('#group-ai-access-entry').hidden,false);assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'old-code');
 }finally{ui.close();}
 const blocked=await setup({recognizeAI:async()=>({text:'1 Cena 12,00',fields:{total:12}})});
 try{
  Object.defineProperty(blocked.w,'localStorage',{get(){throw new Error('Blocked');}});
  blocked.click('#group-new-meal');await blocked.waitFor(()=>!blocked.$('#group-ai-read').disabled);
  blocked.input('#group-meal-file','');await blocked.waitFor(()=>blocked.$('#group-meal-ticket img'));
  blocked.input('#group-ai-code','session-code');blocked.input('#group-ai-consent',true);blocked.click('#group-ai-read');
  await blocked.waitFor(()=>blocked.$('#group-meal-items').querySelectorAll('fieldset').length===1);
  assert.equal(blocked.$('#group-ai-access-entry').hidden,false);
  assert.match(blocked.$('#group-ai-code-status').textContent,/solo mientras esta página/);assert.equal(blocked.w.ReceiptAccess.get(),'session-code');
 }finally{blocked.close();}
});

test('Gastos, edición y Grupo comparten cambios y Olvidar código vacía los tres campos',async()=>{
 const ui=await setup();try{
  ui.w.eval(fs.readFileSync(new URL('../expense-receipt-ai.js',import.meta.url),'utf8'));
  ui.w.ExpenseReceiptAIUI.mount({source:()=>null,context:()=>1,localBusy:()=>false});
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.input('#group-ai-code','from-group');for(const id of ['#g-ticket-ai-code','#edit-gasto-ticket-ai-code'])assert.equal(ui.$(id).value,'from-group');
  ui.input('#edit-gasto-ticket-ai-code','from-expense');assert.equal(ui.$('#group-ai-code').value,'from-expense');assert.equal(ui.$('#g-ticket-ai-code').value,'from-expense');assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'from-expense');
  ui.click('#group-close-editor');ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);assert.equal(ui.$('#group-ai-code').value,'from-expense');
  ui.click('#group-ai-forget-code');for(const id of ['#g-ticket-ai-code','#edit-gasto-ticket-ai-code','#group-ai-code'])assert.equal(ui.$(id).value,'');assert.equal(ui.w.ReceiptAccess.get(),'');
 }finally{ui.close();}
});

test('Grupo no sobrescribe ni borra un código nuevo cuando termina una lectura anterior',async()=>{
 for(const fails of [false,true]){
  let finish,received;const ui=await setup({rememberedCode:'old-code',recognizeAI:async(meal,options)=>{received=options.accessCode;return new Promise((resolve,reject)=>{finish=()=>fails?reject(new Error('Código de acceso incorrecto.')):resolve({text:'1 Cena 12,00',fields:{total:12}});});}});try{
   ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket img'));ui.input('#group-ai-consent',true);ui.click('#group-ai-read');await ui.waitFor(()=>!!finish);assert.equal(received,'old-code');
   ui.input('#group-ai-code','new-code');finish();await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'new-code');assert.equal(ui.$('#group-ai-code').value,'new-code');
  }finally{ui.close();}
 }
});

const ticketPhoto=name=>({name,type:'image/jpeg',data:'data:image/jpeg;base64,'+Buffer.from(name.repeat(8)).toString('base64')});
test('multifoto: añade tandas, evita copias idénticas, ordena, quita y recupera las imágenes al reabrir',async()=>{
 const photos=['inicio.jpg','centro.jpg','final.jpg'].map(ticketPhoto);let batch=0;
 const ui=await setup({readTicket:async()=>batch++===0?photos.slice(0,2):[photos[1],photos[2]]});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  assert.equal(ui.$('#group-meal-file').multiple,true);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').querySelectorAll('img').length===2);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').querySelectorAll('img').length===3);
  assert.match(ui.$('#group-meal-message').textContent,/omitido 1 fotos idénticas/);
  ui.input('#group-ai-consent',true);ui.input('#group-meal-reviewed',true);
  ui.click('[data-group-ticket-action="up"][data-ticket-index="2"]');
  assert.equal(ui.$('#group-ai-consent').checked,false);assert.equal(ui.$('#group-meal-reviewed').checked,false);
  const expected=[photos[0],photos[2],photos[1]];
  assert.deepEqual([...ui.$('#group-meal-ticket').querySelectorAll('img')].map(img=>img.src),expected.map(p=>p.data));
  ui.click('#group-save-draft');await ui.waitFor(()=>!ui.$('#group-meal-dialog').open);
  assert.deepEqual(ui.state.viajes[0].group.meals[0].ticketPhotos.map(p=>p.data),expected.map(p=>p.data));
  assert.equal(ui.state.viajes[0].group.meals[0].ticketData,undefined);
  ui.click('[data-group-edit]');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);
  assert.deepEqual([...ui.$('#group-meal-ticket').querySelectorAll('img')].map(img=>img.src),expected.map(p=>p.data));
  ui.click('[data-group-ticket-action="remove"][data-ticket-index="1"]');assert.equal(ui.$('#group-meal-ticket').querySelectorAll('img').length,2);
  ui.click('[data-group-ticket-action="remove"][data-ticket-index="0"]');assert.equal(ui.$('#group-meal-ticket').querySelectorAll('img').length,1);
  ui.click('[data-group-ticket-action="remove"][data-ticket-index="0"]');assert.equal(ui.$('#group-meal-ticket').querySelectorAll('img').length,0);
 }finally{ui.close();}
});

test('multifoto: una tanda inválida o que supera ocho fotos conserva íntegros los adjuntos y conceptos anteriores',async()=>{
 const photos=Array.from({length:8},(_,i)=>ticketPhoto('foto'+i));let batch=0;
 const ui=await setup({readTicket:async()=>{batch++;if(batch===1)return photos;if(batch===2)return[ticketPhoto('nueva'),{data:'data:application/pdf;base64,dGVzdA=='}];return[ticketPhoto('novena')];}});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>ui.$('#group-meal-dialog').open);ui.click('#group-add-item');ui.input('[data-item-field="name"]','Plato revisado');
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').querySelectorAll('img').length===8);
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('No se pudo cargar'));
  assert.equal(ui.$('#group-meal-ticket').querySelectorAll('img').length,8);assert.equal(ui.$('[data-item-field="name"]').value,'Plato revisado');
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('hasta 8 fotos'));
  assert.deepEqual([...ui.$('#group-meal-ticket').querySelectorAll('img')].map(img=>img.src),photos.map(p=>p.data));
  assert.equal(ui.$('#group-meal-file').disabled,false);assert.equal(ui.$('#group-save-draft').disabled,false);
 }finally{ui.close();}
});

test('multifoto: lee el conjunto ordenado y una unión dudosa conserva conceptos; cambiar las fotos invalida el texto anterior',async()=>{
 let calls=0;
 const ui=await setup({readTicket:async()=>[ticketPhoto('inicio'),ticketPhoto('final')],recognizeAI:async(meal)=>{
  calls++;assert.equal(meal.ticketPhotos.length,2);assert.equal(meal.ticketPhotos[0].name,'inicio');
  return{text:'1 Cena 24,00\nTOTAL 24,00',itemsStatus:'review',fields:{total:24},warnings:['Unión de fotos dudosa']};
 }});
 try{
  ui.click('#group-new-meal');await ui.waitFor(()=>!ui.$('#group-ai-read').disabled);
  ui.click('#group-add-item');ui.input('[data-item-field="name"]','Plato revisado');
  ui.input('#group-meal-file','');await ui.waitFor(()=>ui.$('#group-meal-ticket').querySelectorAll('img').length===2);
  ui.input('#group-ai-code','test');ui.input('#group-ai-consent',true);ui.click('#group-ai-read');
  await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('Unión de fotos dudosa'));
  assert.equal(ui.$('[data-item-field="name"]').value,'Plato revisado');assert.equal(calls,1);
  ui.click('[data-group-ticket-action="up"][data-ticket-index="1"]');ui.click('#group-parse-text');
  await ui.waitFor(()=>ui.$('#group-meal-message').textContent.includes('fotos o su orden han cambiado'));
  assert.equal(ui.$('[data-item-field="name"]').value,'Plato revisado');assert.equal(ui.$('#group-ai-consent').checked,false);
 }finally{ui.close();}
});
