import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
const context=vm.createContext({});
for(const file of ['group-meals.js','group-travelers.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
const api=context.TravelGroupTravelers,groupAPI=context.TravelGroup,clone=value=>JSON.parse(JSON.stringify(value));
const trip=(id,participants)=>({id,nombre:'Viaje '+id,group:groupAPI.normalize({participants})});
const person=(id,name,active=true)=>({id,name,active});

test('Yo se incluye por defecto en todos los viajes sin duplicar la identidad anterior ni cambiar comidas o pagos',()=>{
 const old=trip(1,[person('lucio','Lucio',false),person('ana','Ana')]);old.group.selfId='lucio';old.group.meals=[{id:'old',status:'draft',attendees:['lucio','ana'],payerId:'lucio',items:[{shares:{lucio:1}}]}];old.group.settlements=[{fromId:'ana',toId:'lucio',amountCents:400}];
 const before=clone(old.group),fresh={id:2,nombre:'Nuevo viaje'},unidentified=trip(3,[person('local-lucio','Lucio'),person('friend','Amigo')]);const migrated=api.reconcile([],[old,fresh,unidentified]);
 assert.equal(migrated.viajes[0].group.selfId,'lucio');const own=migrated.viajes[0].group.participants.find(p=>p.id==='lucio');assert.equal(own.name,'Yo');assert.equal(own.originalName,'Lucio');assert.equal(own.active,true);
 assert.deepEqual(clone(migrated.viajes[0].group.meals),before.meals);assert.deepEqual(clone(migrated.viajes[0].group.settlements),before.settlements);assert.equal(migrated.viajes[0].group.participants.length,2);
 assert.equal(migrated.viajes[1].group.participants.length,1);assert.equal(migrated.viajes[1].group.participants[0].id,migrated.viajes[1].group.selfId);assert.equal(migrated.viajes[1].group.participants[0].name,'Yo');assert.equal(api.reconcile(migrated.items,migrated.viajes).changed,false);
 assert.equal(migrated.viajes[2].group.selfId,'local-lucio');assert.equal(migrated.viajes[2].group.participants.length,2);assert.equal(migrated.viajes[2].group.participants[0].name,'Yo');
 assert.throws(()=>api.apply(migrated.items,migrated.viajes,[],{type:'select',tripId:1,id:own.catalogId,checked:false}),/Yo ya está incluido/);
});

test('migra nombres existentes sin cambiar identificadores locales, referencias ni importes; es idempotente',()=>{
 const first=trip(1,[person('p1','Ana García'),person('p2','Luis',false)]);
 first.group.meals=[{id:'m',status:'draft',attendees:['p1','p2'],payerId:'p1',items:[{id:'i',amountCents:1051,shares:{p2:1}}]}];first.group.settlements=[{id:'s',fromId:'p2',toId:'p1',amountCents:123,voided:true}];
 const second=trip(2,[person('p1','Pedro'),person('p3','Ana García')]),before=clone([first,second]);
 const result=api.reconcile([],before);assert.equal(result.items.length,3);assert.equal(result.viajes[0].group.participants.find(p=>p.id==='p1').catalogId,result.viajes[1].group.participants.find(p=>p.id==='p3').catalogId);
 assert.notEqual(result.viajes[0].group.participants.find(p=>p.id==='p1').catalogId,result.viajes[1].group.participants.find(p=>p.id==='p1').catalogId);
 assert.deepEqual(clone(result.viajes[0].group.meals),before[0].group.meals);assert.deepEqual(clone(result.viajes[0].group.settlements),before[0].group.settlements);assert.equal(result.viajes[0].group.participants.find(p=>p.id==='p2').active,false);
 assert.equal(api.reconcile(result.items,result.viajes).changed,false);assert.equal(before[0].group.participants[0].catalogId,undefined);
 const duplicate=api.reconcile([],[trip(3,[person('a','Ana'),person('b','Ana')])]);assert.equal(duplicate.items.length,2);assert.notEqual(duplicate.viajes[0].group.participants.find(p=>p.id==='a').catalogId,duplicate.viajes[0].group.participants.find(p=>p.id==='b').catalogId);
});

test('selección independiente por viaje y cambio de nombre conservan IDs e historial',()=>{
 let result=api.reconcile([],[trip(1,[person('old','Ana')]),trip(2,[person('other','Ana',false)])]);const id=result.items[0].id;
 result=api.apply(result.items,result.viajes,[],{type:'select',id,tripId:1,checked:false});assert.equal(result.viajes[0].group.participants.find(p=>p.id==='old').active,false);assert.equal(result.viajes[1].group.participants.find(p=>p.id==='other').active,false);
 result=api.apply(result.items,result.viajes,[],{type:'select',id,tripId:2,checked:true});assert.equal(result.viajes[0].group.participants.find(p=>p.id==='old').active,false);assert.equal(result.viajes[1].group.participants.find(p=>p.id==='other').id,'other');
 result=api.apply(result.items,result.viajes,[],{type:'rename',id,givenName:'Ana',surnames:'López'});assert.ok(result.viajes.every(t=>t.group.participants.find(p=>p.catalogId===id).name==='Ana López'));assert.equal(result.viajes[0].group.participants.find(p=>p.id==='old').id,'old');assert.equal(result.items[0].givenName,'Ana');
});

test('nombre y apellidos obligatorios, homónimos permitidos, duplicados normalizados rechazados',()=>{
 let result=api.apply([],[],[],{type:'add',givenName:'Ana',surnames:'García'});
 assert.throws(()=>api.apply(result.items,[],[],{type:'add',givenName:' ANA ',surnames:'garcia'}),/Ya existe/);
 assert.throws(()=>api.apply(result.items,[],[],{type:'add',givenName:'Ana',surnames:''}),/nombre y apellidos/);
 result=api.apply(result.items,[],[],{type:'add',givenName:'Ana',surnames:'López'});assert.equal(result.items.length,2);
 assert.throws(()=>api.apply(result.items,[],[],{type:'rename',id:result.items[1].id,givenName:'Ana',surnames:'García'}),/Ya existe/);
 const restored=api.normalizeCatalog(clone(result.items));assert.equal(restored[1].surnames,'López');
});

const stores=['viajes','appSettings','cuentas','gastos','transferencias'];
async function database(){const factory=new IDBFactory();return new Promise((resolve,reject)=>{const req=factory.open('travelers',1);req.onupgradeneeded=()=>stores.forEach(name=>req.result.createObjectStore(name,{keyPath:name==='appSettings'?'key':'id'}));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function write(db,rows){return new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');rows.forEach(([name,row])=>tx.objectStore(name).put(row));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}
async function snapshot(db){const data={};await new Promise((resolve,reject)=>{const tx=db.transaction(stores);for(const name of stores){const req=tx.objectStore(name).getAll();req.onsuccess=()=>data[name]=req.result;}tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});return data;}

test('seleccionar consulta solo su viaje y catálogo, devuelve revisión confirmada y conserva viajes ajenos',async()=>{
 const db=await database();try{
  await write(db,[['viajes',trip(1,[person('a','Ana')])],['viajes',trip(2,[person('b','Luis')])]]);await api.ensure(db);
  const before=await snapshot(db),setting=before.appSettings.find(s=>s.key===api.KEY),id=setting.items.find(p=>p.name==='Ana').id;
  const proto=Object.getPrototypeOf(db.transaction('viajes').objectStore('viajes')),getAll=proto.getAll;let scans=0;
  proto.getAll=function(...args){scans++;return getAll.apply(this,args);};let result;
  try{result=await api.save(db,setting.revision,{type:'select',tripId:1,id,checked:false});}finally{proto.getAll=getAll;}
  assert.equal(scans,0);assert.equal(result.trip.group.revision,before.viajes[0].group.revision+1);assert.equal(result.revision,setting.revision+1);assert.equal(result.trip.group.participants.find(p=>p.id==='a').active,false);
  const after=await snapshot(db);assert.deepEqual(after.viajes[1],before.viajes[1]);assert.deepEqual(after.viajes[0],clone(result.trip));
 }finally{db.close();}
});

test('la app aplica la selección confirmada sin recargar todas las tablas',async()=>{
 const code=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8'),body=code.slice(code.indexOf('    saveTravelers:async('),code.indexOf('    refresh:',code.indexOf('    saveTravelers:async(')));
 const old={id:1,group:{revision:1}},other={id:2},saved={id:1,group:{revision:2}},state={viajes:[old,other]};let tracked=0,reloads=0;
 const ctx=vm.createContext({state,TravelGroupTravelers:{save:async()=>({trip:saved,items:[],revision:3})},openDB:async()=>null,noteLocalDataChanged:()=>tracked++,loadAll:async()=>reloads++});vm.runInContext('globalThis.callback=({'+body+'}).saveTravelers',ctx);
 await ctx.callback(2,{type:'select'});assert.equal(reloads,0);assert.equal(tracked,1);assert.equal(state.viajes[0],saved);assert.equal(state.viajes[1],other);assert.equal(state.travelerCatalogRevision,3);
});

test('transacción: protege historial y borrador local, evita guardados obsoletos y no toca cuentas',async()=>{
 const db=await database();try{
  await write(db,[['viajes',trip(1,[person('p','Ana')])],['viajes',trip(2,[])],['cuentas',{id:1,saldoActual:123.45}],['gastos',{id:2,importe:8.99}]]);await api.ensure(db);
  let data=await snapshot(db),setting=data.appSettings.find(s=>s.key===api.KEY);const id=setting.items[0].id;
  await api.save(db,setting.revision,{type:'select',id,tripId:2,checked:true});data=await snapshot(db);setting=data.appSettings.find(s=>s.key===api.KEY);const before=clone(data);
  await assert.rejects(api.save(db,0,{type:'delete',id}),/otra pestaña/);assert.deepEqual(await snapshot(db),before);
  await write(db,[['appSettings',{key:'groupMealDraft:1',draft:{meal:{attendees:['p']}}}]]);const withDraft=await snapshot(db);
  await assert.rejects(api.save(db,setting.revision,{type:'delete',id}),/borrador local/);assert.deepEqual(await snapshot(db),withDraft);
  await write(db,[['appSettings',{key:'groupMealDraft:1',draft:null}]]);await api.save(db,setting.revision,{type:'delete',id});data=await snapshot(db);
  assert.ok(data.viajes.every(t=>t.group.participants.length===1&&t.group.participants[0].name==='Yo'));assert.deepEqual(data.cuentas,before.cuentas);assert.deepEqual(data.gastos,before.gastos);
 }finally{db.close();}
});

test('eliminar rechaza identidad, referencias en otros viajes y pagos anulados',()=>{
 for(const ref of ['self','attendee','share','voided']){
  const a=trip(1,[person('a','Ana')]),b=trip(2,[person('b','Ana')]);
  if(ref==='self')b.group.selfId='b';
  if(ref==='attendee')b.group.meals=[{attendees:['b']}];
  if(ref==='share')b.group.meals=[{items:[{shares:{b:0}}]}];
  if(ref==='voided')b.group.settlements=[{fromId:'b',voided:true}];
  const result=api.reconcile([],[a,b]),id=result.items[0].id;assert.equal(api.canDelete(result.items,result.viajes,id),false);assert.throws(()=>api.apply(result.items,result.viajes,[],{type:'delete',id}),/historial/);
 }
});
