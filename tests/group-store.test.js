import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { IDBFactory } from 'fake-indexeddb';
const context=vm.createContext({});
for(const file of ['group-meals.js','group-ledger.js','group-store.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
const api=context.TravelGroup,store=context.TravelGroupStore;
const clone=value=>JSON.parse(JSON.stringify(value));
const names=['viajes','cuentas','gastos','transferencias','categorias','appSettings','blogEntries'];
function group(){
 const people=Array.from({length:12},(_,i)=>({id:'p'+i,name:'Atleta '+i,active:true}));
 return api.normalize({enabled:true,selfId:'p0',integrate:true,participants:people,meals:[{id:'m1',status:'closed',name:'Tenerife',date:'2026-11-28',currency:'EUR',attendees:people.map(p=>p.id),payerId:'p0',accountId:1,totalCents:30000,items:[{id:'i1',name:'Menús',quantity:12,amountCents:28800,mode:'units',shares:Object.fromEntries(people.map(p=>[p.id,1]))},{id:'i2',name:'Pan y agua',quantity:1,amountCents:1200,common:true}]}]});
}
async function database(unique=false){const factory=new IDBFactory();const db=await new Promise((resolve,reject)=>{const req=factory.open('group',1);req.onupgradeneeded=()=>{for(const name of names){const s=req.result.createObjectStore(name,name==='appSettings'?{keyPath:'key'}:{keyPath:'id',autoIncrement:true});if(unique&&name==='gastos')s.createIndex('source','groupSource',{unique:true});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});await write(db,[['viajes',{id:5,nombre:'Tenerife'}],['cuentas',{id:1,nombre:'Banco',viajeId:5,moneda:'EUR',saldoActual:500}],['categorias',{id:1,nombre:'Comida',parentId:null}]]);return db;}
async function write(db,records){await new Promise((resolve,reject)=>{const tx=db.transaction(names,'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);for(const [name,data]of records)tx.objectStore(name).put(data);});}
async function snapshot(db){const result={};await new Promise((resolve,reject)=>{const tx=db.transaction(names);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);for(const name of names){const req=tx.objectStore(name).getAll();req.onsuccess=()=>result[name]=req.result;}});return result;}
test('comida de doce: consumo 25, adelanto 300 y pendiente 275, sin duplicar al guardar',async()=>{const db=await database();try{const saved=await store.save(db,5,0,group());assert.equal(saved.group.revision,1);let data=await snapshot(db);assert.equal(data.gastos.length,1);assert.equal(data.gastos[0].importe,25);assert.equal(data.cuentas.find(c=>c.id===1).saldoActual,200);assert.equal(data.cuentas.find(c=>c.groupClearing).saldoActual,275);const expenseId=data.gastos[0].id;await store.save(db,5,1,saved.group);data=await snapshot(db);assert.equal(data.gastos[0].id,expenseId);assert.equal(data.cuentas.find(c=>c.id===1).saldoActual,200);}finally{db.close();}});
test('dos pestañas con la misma revisión: solo una puede guardar',async()=>{const db=await database();try{const results=await Promise.allSettled([store.save(db,5,0,group()),store.save(db,5,0,group())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/otra pestaña/);const data=await snapshot(db);assert.equal(data.gastos.length,1);assert.equal(data.viajes[0].group.revision,1);}finally{db.close();}});
test('fallo de escritura después de preparar movimientos revierte toda la transacción',async()=>{const db=await database(true);try{await write(db,[['gastos',{id:1,groupSource:'meal:m1',importe:1,cuentaId:1}]]);const before=await snapshot(db);await assert.rejects(store.save(db,5,0,group()));assert.deepEqual(await snapshot(db),before);}finally{db.close();}});
test('devolución parcial, rectificación y desactivación conservan las cuentas y el historial',async()=>{const db=await database();try{let saved=await store.save(db,5,0,group());saved.group.settlements.push({id:'s1',mealId:'m1',fromId:'p1',toId:'p0',amountCents:1000,accountId:1,date:'2026-11-28'});saved=await store.save(db,5,1,saved.group);let data=await snapshot(db);assert.equal(data.cuentas.find(c=>c.id===1).saldoActual,210);assert.equal(data.cuentas.find(c=>c.groupClearing).saldoActual,265);assert.equal(data.gastos.length,1);const invalid=clone(saved.group);invalid.meals[0].status='draft';await assert.rejects(store.save(db,5,2,invalid),/cobro/);assert.deepEqual(await snapshot(db),data);saved.group.settlements[0].voided=true;saved.group.settlements[0].voidReason='Ingreso anotado por error';saved=await store.save(db,5,2,saved.group);data=await snapshot(db);assert.equal(data.cuentas.find(c=>c.id===1).saldoActual,200);assert.equal(saved.group.settlements.length,1);saved.group.integrate=false;await store.save(db,5,3,saved.group);data=await snapshot(db);assert.equal(data.cuentas.find(c=>c.id===1).saldoActual,500);assert.equal(data.gastos.length,0);assert.equal(data.transferencias.length,0);}finally{db.close();}});
test('si otro paga y yo devuelvo parcialmente, no se duplica mi consumo',async()=>{const db=await database();try{const value=group();value.meals[0].payerId='p1';value.meals[0].accountId=null;value.settlements=[{id:'s1',mealId:'m1',fromId:'p0',toId:'p1',amountCents:1000,accountId:1,date:'2026-11-28'}];await store.save(db,5,0,value);const data=await snapshot(db);assert.equal(data.gastos[0].importe,25);assert.equal(data.cuentas.find(c=>c.id===1).saldoActual,490);assert.equal(data.cuentas.find(c=>c.groupClearing).saldoActual,-15);}finally{db.close();}});
test('unidades incompletas, pesos inválidos y asistentes duplicados se rechazan',()=>{const value=group();value.meals[0].items[0].shares.p0=2;assert.throws(()=>api.validate(value),/unidades/);assert.throws(()=>api.split(100,{a:-1,b:1}),/Reparto/);value.meals[0].attendees.push('p0');assert.throws(()=>api.validate(value),/duplicados/);});

test('el reparto sigue siendo exacto con importes máximos y pesos decimales',()=>{
 const total=Number.MAX_SAFE_INTEGER,result=api.split(total,{a:0.1,b:0.2,c:0.3});
 assert.equal(Object.values(result).reduce((sum,value)=>sum+value,0),total);
 assert.equal(api.cents('90071992547409,91'),total);
 assert.throws(()=>api.cents('90071992547409,92'),/grande/);
 assert.throws(()=>api.split(100,{a:0.0000001,b:1}),/decimales/);
});

test('borrar comida completa revierte banco/efectivo y quita cobros activos/anulados, foto, gasto, Blog y borrador sin alterar otra comida',async()=>{
 const db=await database();try{
  const value=group();value.meals[0].ticketData='foto-del-ticket';const other=clone(value.meals[0]);other.id='other';other.name='Otra comida';other.totalCents=1200;other.items=[{id:'other-item',name:'Pan',quantity:1,amountCents:1200,common:true}];delete other.ticketData;value.meals.push(other);
  value.settlements=[{id:'cash',mealId:'m1',fromId:'p1',toId:'p0',amountCents:1000,accountId:2,date:'2026-11-28'},{id:'bank',mealId:'m1',fromId:'p2',toId:'p0',amountCents:500,accountId:1,date:'2026-11-28'},{id:'void',mealId:'m1',fromId:'p3',toId:'p0',amountCents:100,date:'2026-11-28',voided:true,voidReason:'Error de anotación'}];
  await write(db,[['cuentas',{id:2,nombre:'Efectivo',viajeId:5,moneda:'EUR',saldoActual:0}],['viajes',{id:9,nombre:'Ajeno'}],['cuentas',{id:9,viajeId:9,saldoActual:123.45}]]);
  const saved=await store.save(db,5,0,value),before=await snapshot(db),expense=before.gastos.find(g=>g.groupSource==='meal:m1'),otherExpense=before.gastos.find(g=>g.groupSource==='meal:other');
  await write(db,[['appSettings',{key:'groupMealDraft:5',draft:{meal:clone(value.meals[0])}}],['blogEntries',{id:1,viajeId:5,sourceGastoId:expense.id,tipo:'gasto'}],['blogEntries',{id:2,viajeId:5,sourceGastoId:otherExpense.id,tipo:'gasto'}],['blogEntries',{id:3,viajeId:9,tipo:'texto',texto:'Ajeno'}]]);
  const result=await store.removeMeal(db,5,'m1',saved.group.revision),after=await snapshot(db);
  assert.deepEqual(clone(result.group.meals),[other]);assert.equal(result.group.settlements.length,0);assert.equal(after.gastos.length,1);assert.equal(after.gastos[0].id,otherExpense.id);assert.equal(after.gastos[0].importe,1);
  assert.equal(after.cuentas.find(c=>c.id===1).saldoActual,488);assert.equal(after.cuentas.find(c=>c.id===2).saldoActual,0);assert.equal(after.cuentas.find(c=>c.groupClearing).saldoActual,11);assert.deepEqual(after.cuentas.find(c=>c.id===9),before.cuentas.find(c=>c.id===9));
  assert.equal(after.transferencias.length,1);assert.equal(after.transferencias[0].groupSource,'advance:other');assert.deepEqual(after.blogEntries.map(e=>e.id),[2,3]);assert.equal(after.appSettings.length,0);
 }finally{db.close();}
});

test('borrar sin consumo propio y el último plato restaura todos los saldos y conserva un borrador de otra comida',async()=>{
 const db=await database();try{
  const value=group();value.meals[0].items=[{id:'all',name:'Invitados',quantity:1,amountCents:30000,shares:{p1:1}}];
  const saved=await store.save(db,5,0,value);assert.equal((await snapshot(db)).gastos.length,0);
  await write(db,[['appSettings',{key:'groupMealDraft:5',draft:{meal:{id:'another-draft',name:'Otro borrador'}}}]]);
  const result=await store.removeMeal(db,5,'m1',saved.group.revision),after=await snapshot(db);assert.equal(result.group.meals.length,0);assert.equal(after.gastos.length,0);assert.equal(after.transferencias.length,0);assert.equal(after.cuentas.find(c=>c.id===1).saldoActual,500);assert.equal(after.cuentas.find(c=>c.groupClearing).saldoActual,0);assert.equal(after.appSettings[0].draft.meal.id,'another-draft');
 }finally{db.close();}
});

test('borrar una comida pagada por otro revierte mi devolución parcial y mi consumo',async()=>{
 const db=await database();try{
  const value=group();value.meals[0].payerId='p1';value.meals[0].accountId=null;value.settlements=[{id:'mine',mealId:'m1',fromId:'p0',toId:'p1',amountCents:1000,accountId:1,date:'2026-11-28'}];
  const saved=await store.save(db,5,0,value);await store.removeMeal(db,5,'m1',saved.group.revision);const after=await snapshot(db);assert.equal(after.cuentas.find(c=>c.id===1).saldoActual,500);assert.equal(after.cuentas.find(c=>c.groupClearing).saldoActual,0);assert.equal(after.gastos.length,0);assert.equal(after.transferencias.length,0);
 }finally{db.close();}
});

test('borrado obsoleto, comida inexistente, referencia ajena o fallo de escritura no borra ni modifica nada',async()=>{
 const db=await database();try{
  const saved=await store.save(db,5,0,group());let before=await snapshot(db);
  await assert.rejects(store.removeMeal(db,5,'m1',0),/otra pestaña/);await assert.rejects(store.removeMeal(db,5,'unknown',saved.group.revision),/ya no existe/);assert.deepEqual(await snapshot(db),before);
  await write(db,[['blogEntries',{id:1,viajeId:9,sourceGastoId:before.gastos[0].id}]]);before=await snapshot(db);await assert.rejects(store.removeMeal(db,5,'m1',saved.group.revision),/otro viaje/);assert.deepEqual(await snapshot(db),before);
  await new Promise(resolve=>{const tx=db.transaction('blogEntries','readwrite');tx.objectStore('blogEntries').delete(1);tx.oncomplete=resolve;});before=await snapshot(db);
  const original=db.transaction.bind(db);db.transaction=(...args)=>{const tx=original(...args),get=tx.objectStore.bind(tx);tx.objectStore=name=>{const target=get(name);if(name==='viajes')target.put=()=>{throw new Error('Fallo al escribir');};return target;};return tx;};
  await assert.rejects(store.removeMeal(db,5,'m1',saved.group.revision),/Fallo al escribir/);db.transaction=original;assert.deepEqual(await snapshot(db),before);
 }finally{db.close();}
});
