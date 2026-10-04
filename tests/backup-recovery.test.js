import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app = fs.readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
const section = (from, to) => app.slice(app.indexOf(from), app.indexOf(to, app.indexOf(from)));
const empty = () => ({ cuentas: [], categorias: [], gastos: [], viajes: [], monedas: [], transferencias: [], lugares: [], photoTypes: [], viajeDocumentos: [], blogEntries: [], timelineDays: [] });
function harness(initial = empty()) {
  const state = structuredClone(initial);
  const context = vm.createContext({ state, Date, Number, Set, Map, Promise,
    numberValue: value => Number(value) || 0, optionalNumberValue: value => value == null ? null : Number(value),
    normalizeAccountType: value => value || '', normalizePhotoTypes: value => value || [],
    PHOTO_TYPES_SETTING_KEY: 'photoTypes', DEFAULT_PHOTO_TYPES: [], DEFAULT_MONEDAS: [{codigo:'EUR',eurPorUnidad:1,unidadesPorEuro:1}],
    tripCountryIds: v => v.paisIds || [], tripCityIds: v => v.ciudadIds || [], tripRouteStops: v => v.routeStops || [], tripLodgingLocations: v => v.lodgingLocations || [],
    todayIso: () => '2026-10-04', normalizeImportedBlogEntry: entry => entry,
    loadAll: async () => {}, getAll: async store => structuredClone(state[store] || []),
    commitBackupOperations: async operations => { context.operations = operations; }
  });
  vm.runInContext(section('function backupExpenseEur', 'function selectedBlogTrip'), context);
  return context;
}
const fixture = () => ({ ...empty(), viajes: [{id:3,nombre:'Corea-Japon'}],
  cuentas: [{id:25,nombre:'BBVA Won',moneda:'KRW',viajeId:3,saldoActual:-242360}, {id:26,nombre:'BBVA Yen',moneda:'JPY',viajeId:3,saldoActual:-247601}, {id:17,nombre:'Efectivo Corea',moneda:'KRW',viajeId:1}, {id:9,nombre:'BBVa',moneda:'EUR',viajeId:2}],
  gastos: [{id:1,viajeId:3,cuentaId:25,moneda:'KRW',importe:1000,importeEur:0.64}, {id:2,viajeId:1,cuentaId:17,moneda:'KRW',importe:300}],
  transferencias: [{id:4,fromId:21,toId:25,monedaFrom:'EUR',monedaTo:'KRW',importeFrom:1,importeTo:1560,tipoCambio:1560,importeToManual:true}],
  monedas: [{codigo:'KRW',eurPorUnidad:0.000641,unidadesPorEuro:1560.46}] });
test('recupera viajes huérfanos y cuenta de transferencia sin inventar nombre ni saldo', () => {
  const ctx=harness(); const input=fixture(); const recovered=ctx.recoverBackupReferences(input);
  assert.deepEqual(Array.from(recovered.viajes, v=>v.id),[3,1,2]);
  const missing=recovered.cuentas.find(c=>c.id===21); assert.equal(missing.balanceUnknown,true); assert.equal(missing.moneda,'EUR');
  assert.equal(recovered.cuentas.find(c=>c.id===25).saldoActual,-242360);
  assert.equal(input.cuentas.length,4); assert.equal(input.viajes.length,1);
  assert.equal(ctx.recoverBackupReferences(recovered).cuentas.length,5);
});
test('restauración completa prepara todas las cuentas, gastos, cambios y transferencias en un único commit', async () => {
  const ctx=harness(); await ctx.importAll(fixture());
  const adds=store=>ctx.operations.filter(o=>o.store===store && o.type==='add').map(o=>o.data);
  assert.equal(adds('cuentas').length,5); assert.equal(adds('gastos').length,2); assert.equal(adds('viajes').length,3);
  assert.equal(adds('gastos')[0].importeEur,0.64); assert.equal(adds('gastos')[1].importeEur,300*0.000641);
  assert.equal(adds('transferencias')[0].tipoCambio,1560); assert.equal(adds('transferencias')[0].importeToManual,true);
  assert.ok(ctx.operations.some(o=>o.store==='appSettings'));
});
test('importar un viaje conserva cuentas globales, ajenas, sin gastos y ambos extremos de transferencias', async () => {
  const initial={...empty(),viajes:[{id:50,nombre:'Destino'}]}; const ctx=harness(initial); const data=fixture();
  data.cuentas.push({id:28,nombre:'Sin gastos',viajeId:3,moneda:'JPY'}, {id:2,nombre:'Global',viajeId:null,moneda:'EUR'});
  data.gastos.push({id:3,viajeId:3,cuentaId:17,moneda:'KRW',importe:100}, {id:4,viajeId:3,cuentaId:2,moneda:'EUR',importe:1});
  await ctx.importTripBackup(data,50);
  const adds=store=>ctx.operations.filter(o=>o.store===store && o.type==='add').map(o=>o.data);
  const accounts=adds('cuentas'); assert.equal(accounts.length,6); assert.ok(accounts.every(c=>c.viajeId===50));
  const expenses=adds('gastos'); assert.equal(expenses.length,3); assert.ok(expenses.every(g=>accounts.some(c=>c.id===g.cuentaId)));
  const transfers=adds('transferencias'); assert.equal(transfers.length,1); assert.ok(accounts.some(c=>c.id===transfers[0].fromId));
  assert.ok(ctx.operations.some(o=>o.store==='monedas' && o.data.codigo==='KRW'));
});
test('rechaza monedas incompatibles antes de reemplazar datos', async () => {
  const ctx=harness(); const data=fixture(); data.gastos.push({id:5,viajeId:3,cuentaId:21,moneda:'JPY'});
  await assert.rejects(ctx.importAll(data),/monedas incompatibles/); assert.equal(ctx.operations,undefined);
});
test('la tabla sin viaje seleccionado muestra también cuentas de viajes y huérfanas', () => {
  const rows=[]; const ctx=vm.createContext({ state:fixture(), Number,
    $: selector=>selector==='#tabla-cuentas tbody'?{set innerHTML(v){rows.length=0;},appendChild:row=>rows.push(row)}:{value:''},
    document:{createElement:()=>({dataset:{}})}, numberValue: v=>Number(v)||0,
    escapeHtml: String, accountTypeLabel:()=> 'Normal', fmtCurrencyWithEur:()=> '0',
  });
  vm.runInContext(section('function renderCuentas()', 'function renderTransferencias()'),ctx); ctx.renderCuentas();
  assert.equal(rows.length,4); assert.ok(rows.some(r=>r.innerHTML.includes('BBVA Won'))); assert.ok(rows.some(r=>r.innerHTML.includes('Viaje no disponible (1)')));
});
test('el commit espera confirmación de la transacción y propaga abortos sin marcar datos cambiados', async () => {
  let tx; const changed=[];
  const ctx=vm.createContext({ Set, Promise, Error, openDB:async()=>({transaction:()=>tx={objectStore:()=>({clear(){},add(){}}),abort(){this.onabort();}}}),noteLocalDataChanged: n=>changed.push(n) });
  vm.runInContext(section('async function commitBackupOperations', 'function backupExpenseEur'),ctx);
  let settled=false; const success=ctx.commitBackupOperations([{store:'cuentas',type:'add',data:{id:1}}]).then(()=>settled=true);
  await new Promise(resolve=>setImmediate(resolve)); assert.equal(settled,false); tx.oncomplete(); await success; assert.deepEqual(changed,['cuentas']);
  changed.length=0; const failed=ctx.commitBackupOperations([{store:'cuentas',type:'clear'}]);
  await new Promise(resolve=>setImmediate(resolve)); tx.onabort(); await assert.rejects(failed,/datos anteriores/); assert.deepEqual(changed,[]);
});

test('no permite borrar cuentas referenciadas por gastos o transferencias', async () => {
  let deleted=false;
  const ctx=vm.createContext({ Number, Promise, Error, getAll:async name=>name==='gastos'?[{cuentaId:25}]:[], deleteRecord:async()=>{deleted=true;} });
  vm.runInContext(section('async function delCuenta', 'async function addCategoria'),ctx);
  await assert.rejects(ctx.delCuenta(25),/tiene gastos o transferencias/); assert.equal(deleted,false);
  await ctx.delCuenta(26); assert.equal(deleted,true);
});
test('borrar un viaje conserva cuentas y gastos accesibles sin referencias al viaje eliminado', async () => {
  const state={...empty(),viajeDocumentos:[{id:1,viajeId:3}]};
  const ctx=vm.createContext({ Number, state, getAll:async name=>name==='gastos'?[{id:4,cuentaId:25,viajeId:3}]:[{id:25,viajeId:3,saldoActual:10}], commitBackupOperations:async operations=>{ctx.operations=operations;} });
  vm.runInContext(section('async function delViaje', 'async function addTripDocument'),ctx); await ctx.delViaje(3);
  const preserved=ctx.operations.filter(o=>o.type==='put'); assert.equal(preserved.length,2); assert.ok(preserved.every(o=>o.data.viajeId===null));
  assert.equal(preserved.find(o=>o.store==='cuentas').data.saldoActual,10);
  assert.ok(ctx.operations.some(o=>o.store==='viajes'&&o.type==='delete'));
});
test('backup de viaje incluye la cuenta contraparte de una transferencia', () => {
  const state=fixture(); state.cuentas.push({id:21,nombre:'Base',moneda:'EUR',viajeId:null});
  const ctx=vm.createContext({ state, Number, Set, Date, APP_VERSION:'700v325',ensureLocalDataUpdatedAt:()=>'',accountForBackup:c=>c });
  vm.runInContext(section('function buildTripBackupData', '// Prepare every write'),ctx);
  const backup=ctx.buildTripBackupData(3); assert.ok(backup.cuentas.some(c=>c.id===21)); assert.equal(backup.transferencias.length,1);
});
