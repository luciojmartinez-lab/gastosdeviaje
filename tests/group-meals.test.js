import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
for (const name of ['group-meals.js', 'group-ledger.js']) vm.runInContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'), context);
const api = context.TravelGroup;
const plain = value => JSON.parse(JSON.stringify(value));
test('desglosar unidades conserva nombres y céntimos y permite un plato individual y otro compartido',()=>{
  const original={id:'line',name:'Paella',quantity:2,amountCents:2400,shares:{}};
  const items=api.expandUnits([original]);
  assert.equal(items.length,2);assert.deepEqual(plain(items.map(i=>[i.name,i.quantity,i.amountCents])),[['Paella',1,1200],['Paella',1,1200]]);
  items[0].shares={a:1};items[1].shares={b:1,c:1};
  const result=api.allocation({attendees:['a','b','c'],totalCents:2400,items});
  assert.deepEqual(plain(result.totals),{a:1200,b:600,c:600});assert.equal(result.errors.length,0);
  assert.deepEqual(original.shares,{});
  const odd=api.expandUnits([{...original,quantity:3,amountCents:1000}]);
  assert.deepEqual(plain(odd.map(i=>i.amountCents)),[334,333,333]);
  assert.equal(odd.reduce((s,i)=>s+i.amountCents,0),1000);
  assert.equal(api.expandUnits([{...original,quantity:1.5}])[0].quantity,1.5);
  assert.throws(()=>api.expandUnits([{...original,quantity:501}]),/500/);
});
function fixture() {
  return api.normalize({ enabled: true, selfId: 'a', integrate: true,
    participants: [{id:'a',name:'Lucio'}, {id:'b',name:'Ana'}, {id:'c',name:'Luis'}],
    meals: [{id:'m1', name:'Cena',date:'2026-11-28',currency:'EUR',attendees:['a','b','c'],status:'closed',payerId:'a',accountId:1,totalCents:6000,
      items: [{id:'i1',name:'Platos',amountCents:5400,shares:{a:1,b:1,c:1}}, {id:'i2',name:'Pan y agua',amountCents:600,common:true}]}] });
}
const snapshot = () => ({ cuentas:[{id:1,nombre:'Revolut',moneda:'EUR',viajeId:5,saldoActual:500}], gastos:[], transferencias:[], categorias:[{id:1,nombre:'Comidas',parentId:null}] });
test('los céntimos de un importe indivisible entre doce cuadran exactamente', () => {
  const result = api.split(1000, Object.fromEntries(Array.from({length:12},(_,i)=>[`p${i}`,1])));
  assert.equal(Object.values(result).reduce((sum,value)=>sum+value,0),1000);
  assert.equal(Math.max(...Object.values(result))-Math.min(...Object.values(result)),1);
});
test('reparte por unidades y solo entre los consumidores indicados', () => {
  assert.deepEqual(plain(api.split(900,{a:2,b:1})),{a:600,b:300});
});
test('los compartidos incluyen solo asistentes y no los doce viajeros por defecto', () => {
  const group=fixture(); group.meals[0].attendees=['a','b']; group.meals[0].items=[{name:'Agua',amountCents:501,common:true}];group.meals[0].totalCents=501;
  const result=api.allocation(group.meals[0]);
  assert.deepEqual(plain(result.totals),{a:251,b:250}); assert.equal(result.errors.length,0);
});
test('no permite cerrar con conceptos sin asignar ni un total distinto del ticket', () => {
  const group=fixture(); group.meals[0].items[0].shares={};
  assert.throws(()=>api.validate(group),/asignar/);
  group.meals[0].items[0].shares={a:1};group.meals[0].totalCents++;
  assert.throws(()=>api.validate(group),/difieren/);
});
test('rechaza asignaciones a ausentes y cobros superiores a la deuda', () => {
  const group=fixture();group.meals[0].items[0].shares={ausente:1};
  assert.throws(()=>api.validate(group),/ausente/);
  const next=fixture();next.settlements=[{id:'r1',mealId:'m1',fromId:'b',toId:'a',amountCents:2001}];
  assert.throws(()=>api.validate(next),/supera/);
});
test('el pagador cubre su consumo y los cobros parciales reducen el pendiente', () => {
  const group=fixture();group.settlements=[{id:'r1',mealId:'m1',fromId:'b',toId:'a',amountCents:500,accountId:1,date:'2026-11-28'}];
  api.validate(group);
  assert.equal(api.mealPayments(group,group.meals[0]).find(p=>p.id==='a').remaining,0);
  assert.equal(api.mealPayments(group,group.meals[0]).find(p=>p.id==='b').remaining,1500);
  const rows=api.balances(group);assert.equal(rows.reduce((sum,row)=>sum+row.balance,0),0);
  assert.equal(rows.find(row=>row.id==='a').balance,3500);
});
test('lee conceptos con unidades sin sumar de nuevo total, IGIC ni pago', () => {
  const result=api.parseItems('2 Ensalada 9,00 18,00\n1 Entrecot 26,00\nAgua 4,00\nPan 3,00\nIGIC 7% 3,34\nTOTAL 51,00\nTarjeta 51,00');
  assert.equal(result.items.length,4);assert.equal(result.items[0].quantity,2);assert.equal(result.items[0].amountCents,1800);
  assert.equal(result.items[0].name,'Ensalada');assert.equal(result.items[2].common,true);
  assert.equal(result.items.reduce((sum,row)=>sum+row.amountCents,0),5100);
});

test('anular una devolución restaura el pendiente de la comida y del resumen', () => {
  const group = fixture();
  group.settlements = [
    {id:'r1',mealId:'m1',fromId:'b',toId:'a',amountCents:500,date:'2026-11-28',voided:true,voidReason:'Registro duplicado'},
    {id:'r2',mealId:'m1',fromId:'b',toId:'a',amountCents:300,date:'2026-11-28'}
  ];
  api.validate(group);
  const row = api.mealPayments(group, group.meals[0]).find(person => person.id === 'b');
  assert.equal(row.paid, 300);
  assert.equal(row.remaining, 1700);
  assert.equal(api.balances(group).find(person => person.id === 'b').balance, -1700);
  assert.match(api.summary(group, group.meals[0]), /pendiente 17,00/);
});
test('los importes españoles se convierten a céntimos y se rechazan fracciones de céntimo',()=>{
  assert.equal(api.cents('1.234,56 €'),123456);assert.equal(api.cents('12.34'),1234);
  assert.throws(()=>api.cents('1.2345'));assert.throws(()=>api.cents(''));
});
test('adelantar 60 euros registra 20 de consumo propio y 40 a recuperar',()=>{
  const operations=context.TravelGroupLedger.plan(fixture(),{id:5,nombre:'Tenerife'},snapshot());
  const expense=operations.find(o=>o.store==='gastos').data;
  const advance=operations.find(o=>o.store==='transferencias').data;
  assert.equal(expense.importe,20);assert.equal(advance.importeFrom,60);
  assert.equal(operations.find(o=>o.store==='cuentas'&&o.data.id===1).data.saldoActual,440);
  assert.equal(operations.find(o=>o.store==='cuentas'&&o.data.groupClearing).data.saldoActual,40);
});
test('si otro paga, mi consumo queda pendiente sin descontar todavía mi banco',()=>{
  const group=fixture();group.meals[0].payerId='b';group.meals[0].accountId=null;
  const operations=context.TravelGroupLedger.plan(group,{id:5},snapshot());
  assert.equal(operations.filter(o=>o.store==='transferencias').length,0);
  assert.equal(operations.find(o=>o.store==='cuentas'&&o.data.groupClearing).data.saldoActual,-20);
});
test('los reembolsos recibidos vuelven al banco sin generar otro gasto',()=>{
  const group=fixture();group.settlements=[{id:'r1',mealId:'m1',fromId:'b',toId:'a',amountCents:2000,accountId:1,date:'2026-11-28'}];
  const operations=context.TravelGroupLedger.plan(group,{id:5},snapshot());
  assert.equal(operations.filter(o=>o.store==='gastos').length,1);
  assert.equal(operations.find(o=>o.store==='cuentas'&&o.data.id===1).data.saldoActual,460);
  assert.equal(operations.find(o=>o.store==='cuentas'&&o.data.groupClearing).data.saldoActual,20);
});
test('guardar por segunda vez conserva IDs y no descuenta otra vez los adelantos',()=>{
  const group=fixture(), data=snapshot();
  const operations=context.TravelGroupLedger.plan(group,{id:5},data);
  for(const operation of operations){if(operation.store==='viajes')continue; const rows=data[operation.store];const index=rows.findIndex(row=>row.id===operation.data.id);if(index<0)rows.push(plain(operation.data));else rows[index]=plain(operation.data);}
  group.revision++;
  const next=context.TravelGroupLedger.plan(group,{id:5},data);
  assert.equal(next.find(o=>o.store==='cuentas'&&o.data.id===1).data.saldoActual,440);
  assert.equal(next.find(o=>o.store==='gastos').data.id,operations.find(o=>o.store==='gastos').data.id);
});
test('importar otro viaje remapea las cuentas de adelantos y cobros',()=>{
  const group=fixture();group.settlements=[{id:'r1',accountId:1}];
  const result=api.remapAccounts(group,{1:37});
  assert.equal(result.meals[0].accountId,37);assert.equal(result.settlements[0].accountId,37);assert.equal(group.meals[0].accountId,1);
});
