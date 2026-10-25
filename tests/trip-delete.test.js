import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
const source=section('function planTripDeletion','async function addTripDocument');
const names=['viajes','cuentas','gastos','transferencias','tripDocuments','blogEntries','timelineDays','appSettings','categorias','lugares','monedas','localBackups'];
const initial=()=>({
 viajes:[{id:3,nombre:'Test',group:{integrate:true,selfId:'lucio',participants:[{id:'lucio',name:'Yo'}],meals:[{id:'closed',status:'closed',accountId:10,ticketData:'foto-comida'}],settlements:[{id:'paid',accountId:10}]},preparationItems:[{id:'maleta',done:true}]},{id:9,nombre:'Real',group:{meals:[{accountId:90}],settlements:[]}}],
 cuentas:[{id:10,viajeId:3,saldoActual:12.5,moneda:'EUR'},{id:11,viajeId:3,groupClearing:true,saldoActual:87.5},{id:90,viajeId:9,saldoActual:50},{id:99,viajeId:null,saldoActual:100}],
 gastos:[{id:1,viajeId:3,cuentaId:10,importe:4,ticketData:'foto-gasto'},{id:2,viajeId:3,groupTripId:3,cuentaId:11,importe:8},{id:3,viajeId:9,cuentaId:90,importe:5},{id:4,viajeId:null,cuentaId:10,importe:2}],
 transferencias:[{id:1,fromId:10,toId:11,groupTripId:3,importeFrom:30,importeTo:30},{id:2,fromId:90,toId:99,importeFrom:5,importeTo:5}],
 tripDocuments:[{id:1,viajeId:3,fileData:'documento-test'},{id:2,viajeId:9,fileData:'documento-real'}],
 blogEntries:[{id:1,viajeId:3,galleryImages:[{data:'foto-blog'}]},{id:2,viajeId:9,texto:'Real'}],
 timelineDays:[{id:'3:2026-10-25',viajeId:3,points:[{lat:1,lng:2}]},{id:'9:2026-10-25',viajeId:9}],
 appSettings:[{key:'groupMealDraft:3',draft:{tripId:3,meal:{accountId:10,ticketData:'borrador'}}},{key:'groupMealDraft:9',draft:{tripId:9,meal:{accountId:90}}},{key:'groupTravelerCatalog',items:[{id:'ana',name:'Ana'}]},{key:'preparationCatalog',items:[{id:'maleta'}]}],
 categorias:[{id:1,nombre:'Comida'}],lugares:[{id:1,nombre:'España'}],monedas:[{codigo:'EUR'}],localBackups:[{id:1,data:'copia anterior'}]
});
async function database(data=initial()){
 const factory=new IDBFactory(),db=await new Promise((resolve,reject)=>{const r=factory.open('delete-trip',1);r.onupgradeneeded=()=>names.forEach(name=>r.result.createObjectStore(name,{keyPath:name==='appSettings'?'key':name==='monedas'?'codigo':'id'}));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise((resolve,reject)=>{const tx=db.transaction(names,'readwrite');names.forEach(name=>(data[name]||[]).forEach(record=>tx.objectStore(name).put(record)));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});return db;
}
async function snapshot(db){const result={};await new Promise((resolve,reject)=>{const tx=db.transaction(names);names.forEach(name=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>result[name]=r.result;});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});return result;}
function context(db){const changed=[];const ctx=vm.createContext({openDB:async()=>db,noteLocalDataChanged:store=>changed.push(store)});vm.runInContext(source,ctx);return {ctx,changed};}

test('borrado integral incluye Grupo cerrado, cuentas, movimientos, imágenes y borrador; otros viajes y catálogos quedan idénticos',async()=>{
 const data=initial(),db=await database(data);try{
  const {ctx}=context(db);await ctx.delViaje(3);const result=await snapshot(db);
  for(const store of ['viajes','cuentas','gastos','transferencias','tripDocuments','blogEntries','timelineDays']){
   const expected=store==='viajes'?data[store].filter(r=>r.id!==3):store==='cuentas'?data[store].filter(r=>r.viajeId!==3):store==='gastos'?data[store].filter(r=>r.viajeId!==3&&r.cuentaId!==10):store==='transferencias'?data[store].filter(r=>r.groupTripId!==3):data[store].filter(r=>r.viajeId!==3);
   assert.deepEqual(result[store],expected,store);
  }
  assert.deepEqual(result.appSettings,data.appSettings.filter(r=>r.key!=='groupMealDraft:3').sort((a,b)=>a.key.localeCompare(b.key)));
  for(const store of ['categorias','lugares','monedas','localBackups'])assert.deepEqual(result[store],data[store]);
  const beforeAgain=await snapshot(db);await assert.rejects(ctx.delViaje(3),/ya no existe/);assert.deepEqual(await snapshot(db),beforeAgain);
 }finally{db.close();}
});

test('referencias cruzadas impiden todo el borrado y no alteran ningún saldo',async()=>{
 const cases=[
  d=>d.gastos.push({id:20,viajeId:9,cuentaId:10}),
  d=>d.gastos.push({id:20,viajeId:3,cuentaId:90}),
  d=>d.gastos.push({id:20,viajeId:9,groupTripId:3,cuentaId:10}),
  d=>d.transferencias.push({id:20,fromId:10,toId:90}),
  d=>d.transferencias.push({id:20,viajeId:9,fromId:10,toId:11}),
  d=>d.viajes[1].group.meals.push({accountId:10}),
  d=>d.viajes[1].group.settlements.push({accountId:10,voided:true}),
  d=>d.appSettings.push({key:'groupMealDraft:other',draft:{meal:{accountId:10}}})
 ];
 for(const change of cases){const data=initial();change(data);const db=await database(data);try{const before=await snapshot(db),{ctx,changed}=context(db);await assert.rejects(ctx.delViaje(3),/No se ha borrado nada/);assert.deepEqual(await snapshot(db),before);assert.deepEqual(changed,[]);}finally{db.close();}}
});

test('error después de encolar gastos revierte toda la transacción, incluidas cuentas y documentos',async()=>{
 const db=await database();try{
  const before=await snapshot(db),{ctx,changed}=context(db),original=db.transaction.bind(db);
  db.transaction=(...args)=>{const tx=original(...args),getStore=tx.objectStore.bind(tx);tx.objectStore=name=>{const store=getStore(name);if(name==='viajes')store.delete=()=>{throw new Error('Fallo de escritura simulado');};return store;};return tx;};
  await assert.rejects(ctx.delViaje(3),/Fallo de escritura/);db.transaction=original;assert.deepEqual(await snapshot(db),before);assert.deepEqual(changed,[]);
 }finally{db.close();}
});

test('confirmación nombra el viaje, explica backup individual y no borra al abrir; bloquea doble envío',async()=>{
 let options,calls=0,release;const button={},fields={},state={viajes:[{id:3,nombre:'Test <especial>'}]};
 const ctx=vm.createContext({Number,state,openFormDialog:value=>options=value,$:selector=>selector==='#form-dialog-fields'?fields:button,escapeHtml:value=>value.replaceAll('<','&lt;').replaceAll('>','&gt;'),delViaje:async id=>{assert.equal(id,3);calls++;await new Promise(resolve=>release=resolve);}});
 vm.runInContext(section('function openDeleteViajeDialog','function planTripDeletion'),ctx);ctx.openDeleteViajeDialog(3);
 assert.equal(calls,0);assert.equal(options.fields.length,0);assert.match(options.title,/Test <especial>/);assert.match(fields.innerHTML,/Test &lt;especial&gt;/);assert.match(fields.innerHTML,/todos y solo/);assert.match(fields.innerHTML,/backup solo de este viaje/);assert.equal(button.textContent,'Sí, borrar el viaje');
 const first=options.onSubmit();assert.equal(button.disabled,true);await assert.rejects(options.onSubmit(),/Espera/);assert.equal(calls,1);release();await first;assert.equal(button.disabled,false);
});
