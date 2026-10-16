import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../preparation.js',import.meta.url),'utf8');
const ctx=vm.createContext({}); vm.runInContext(code,ctx); const prep=ctx.TravelPreparation;
const plain=value=>JSON.parse(JSON.stringify(value));
test('catálogo incluye ambos bloques, ropa común/invierno/verano y los seis elementos deportivos',()=>{
  const catalog=prep.normalizeCatalog();
  assert.ok(catalog.some(item=>item.section==='before')); assert.ok(catalog.some(item=>item.section==='bring'));
  for(const category of ['Común','Invierno','Verano']) assert.ok(catalog.some(item=>item.subcategory===category));
  assert.deepEqual(plain(catalog.filter(item=>item.category==='Ropa y material deportivo').map(item=>item.nombre)),['Chándal','Cortavientos','Ropa de calentamiento / entreno','Ropa de competición','Calzado de entreno','Calzado de competición']);
  assert.equal(new Set(catalog.map(item=>item.id)).size,catalog.length);
});
test('incluir y hacer son independientes y no mezclan viajes',()=>{
  const item=prep.defaults[0]; const a=prep.includeItem([],item,true); const b=prep.includeItem([],item,true);
  a[0].done=true; a[0].note='Comprobado';
  assert.equal(b[0].done,false); assert.equal(b[0].note,'');
  assert.equal(prep.includeItem(a,item,true)[0].done,true);
  assert.equal(prep.includeItem(a,item,false).length,0);
});
test('copiar conserva selección, cantidades y notas y reinicia únicamente el progreso del destino',()=>{
  const source=[{...prep.defaults[0],done:true,quantity:'2',note:'Antes de salir'}];
  const copied=prep.copyItems(source); assert.equal(copied[0].done,false); assert.equal(source[0].done,true);
  assert.equal(copied[0].quantity,'2'); assert.equal(copied[0].note,'Antes de salir');
});
test('selecciones guardan el nombre y agrupación aunque cambie o se elimine el catálogo',()=>{
  const item=prep.defaults[0]; const selected=prep.includeItem([],item,true);
  const changed=prep.normalizeCatalog([{...item,nombre:'Otro nombre'}]);
  assert.notEqual(selected[0].nombre,changed[0].nombre);
  assert.equal(prep.normalizeItems(selected)[0].nombre,item.nombre);
});
test('normalización tolera datos antiguos, duplicados e inválidos sin crear seleccionados por defecto',()=>{
  assert.equal(prep.normalizeItems(undefined).length,0); assert.equal(prep.normalizeCatalog([]).length,0);
  assert.ok(prep.normalizeCatalog(undefined).length>0);
  const result=prep.normalizeItems([null,{},prep.defaults[0],{...prep.defaults[0],done:'false'}]);
  assert.equal(result.length,1); assert.equal(result[0].done,false);
});
test('configuración, navegación y caché incorporan la nueva sección 900v002',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'), sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(html,/id="tab-preparar"/); assert.match(html,/id="config-preparation"/);
  assert.ok(html.indexOf('preparation.js?v=900v002')<html.indexOf('app.bundle.js?v=900v002'));
  const core=sw.slice(sw.indexOf('const APP_SHELL_CORE'),sw.indexOf('const APP_SHELL_REQUIRED'));
  const required=sw.slice(sw.indexOf('const APP_SHELL_REQUIRED'),sw.indexOf('const APP_SHELL_OPTIONAL'));
  assert.match(core,/preparation.js\?v=900v002/); assert.match(required,/preparation.js\?v=900v002/);
});

test('guardado en cola conserva cambios rápidos y el viaje destinatario aunque cambie la pantalla',async()=>{
  const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
  const database=new Map([[1,{id:1,nombre:'A',preparationItems:[]}],[2,{id:2,nombre:'B',preparationItems:[]}]]);
  const state={viajes:[...database.values()],preparationCatalog:prep.normalizeCatalog()};
  const queueContext=vm.createContext({TravelPreparation:prep,state,Date,Number,Promise,
    getOne:async(store,id)=>structuredClone(database.get(id)),
    commitBackupOperations:async operations=>{await Promise.resolve();for(const operation of operations) database.set(operation.data.id,structuredClone(operation.data));},
    setMessage:()=>{}, PREPARATION_CATALOG_SETTING_KEY:'preparationCatalog',setLocalDataUpdatedAt:()=>{}
  });
  vm.runInContext(app.slice(app.indexOf('function preparationTrip('),app.indexOf('function renderCuentas()')),queueContext);
  queueContext.renderPreparation=()=>{};
  const first=prep.defaults[0],second=prep.defaults[1];
  const a=queueContext.queuePreparationChange(()=>queueContext.savePreparationTripItems(1,items=>prep.includeItem(items,first,true)));
  const b=queueContext.queuePreparationChange(()=>queueContext.savePreparationTripItems(1,items=>prep.includeItem(items,second,true)));
  const c=queueContext.queuePreparationChange(()=>queueContext.savePreparationTripItems(2,items=>prep.includeItem(items,second,true)));
  await Promise.all([a,b,c]);
  assert.equal(database.get(1).preparationItems.length,2);assert.equal(database.get(2).preparationItems.length,1);
  assert.equal(state.viajes.find(trip=>trip.id===1).preparationItems.length,2);
});

test('render inicial distingue Pendiente y Hecho y mantiene el catálogo gestionable sin viaje',()=>{
  const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
  const nodes=new Map(); const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',innerHTML:'',textContent:'',hidden:false});return nodes.get(selector);};
  const item=prep.defaults[0]; const state={viajes:[{id:1,nombre:'A',preparationItems:[{...item,done:true}]}],preparationCatalog:prep.normalizeCatalog()};
  node('#prep-viaje').value='1';node('#prep-config-viaje').value='1';node('#prep-item-section').value='bring';
  const renderContext=vm.createContext({TravelPreparation:prep,state,Date,Number,Promise,Map,Set,JSON,
    $:node,$$:()=>[],escapeHtml:value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    fillSelect:()=>{},
  });
  vm.runInContext(app.slice(app.indexOf('function preparationTrip('),app.indexOf('function renderCuentas()')),renderContext);
  renderContext.renderPreparation();
  assert.match(node('#prep-progress').textContent,/1 de 1 preparados/);
  assert.ok(node('#prep-done').innerHTML.includes(item.nombre));assert.ok(!node('#prep-pending').innerHTML.includes(item.nombre));
  assert.ok(node('#prep-done').innerHTML.includes('done'));assert.ok(node('#prep-catalog').innerHTML.includes('catalog'));
  node('#prep-config-viaje').value=''; renderContext.renderPreparation();
  assert.match(node('#prep-catalog').innerHTML,/disabled/);assert.match(node('#prep-catalog').innerHTML,/gestionar el catálogo común/);
});
