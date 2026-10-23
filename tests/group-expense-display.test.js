import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
function setup(){
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window,$=selector=>w.document.querySelector(selector);
 w.eval(fs.readFileSync(new URL('../group-meals.js',import.meta.url),'utf8'));
 const meal={id:'m1',name:'Cena',date:'2026-10-23',time:'21:00',status:'closed',currency:'EUR',payerId:'me',accountId:1,attendees:['me','a','b'],totalCents:30000,items:[3000,10000,17000].map((amountCents,i)=>({id:'i'+i,name:'Plato',quantity:1,amountCents,shares:{[['me','a','b'][i]]:1}}))};
 const group={enabled:true,integrate:true,selfId:'me',participants:['me','a','b'].map(id=>({id,name:id,active:true})),meals:[meal],settlements:[{id:'r1',mealId:'m1',fromId:'a',toId:'me',amountCents:5000,date:'2026-10-23',accountId:2},{id:'r2',mealId:'m1',fromId:'b',toId:'me',amountCents:7000,date:'2026-10-23',accountId:1}]};
 w.state={viajes:[{id:1,nombre:'Viaje',group}],selectedViajeIds:[1],cuentas:[{id:1,nombre:'Banco',moneda:'EUR',viajeId:1,saldoActual:270},{id:2,nombre:'Efectivo',moneda:'EUR',viajeId:1,saldoActual:50},{id:3,nombre:'Grupo',moneda:'EUR',viajeId:1,saldoActual:150,groupClearing:true}],gastos:[{id:1,viajeId:1,fecha:'2026-10-23',cuentaId:1,moneda:'EUR',importe:70,catId:1,desc:'Otro gasto'},{id:2,viajeId:1,fecha:'2026-10-23',cuentaId:3,moneda:'EUR',importe:30,catId:1,desc:'Cena',groupTripId:1,groupSource:'meal:m1'}],categorias:[{id:1,nombre:'Comida',parentId:null}],blogEntries:[]};
 Object.assign(w,{$,collator:new Intl.Collator('es'),openExpenseGroups:new Set(),openExpenseGroupsScope:'',numberValue:v=>Number(v)||0,toEur:v=>Number(v)||0,fromEur:v=>Number(v)||0,fmtCurrency:(v,c)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:c}).format(v),escapeHtml:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),applyExpenseViewMode:()=>{},updateMobileClearFilters:()=>{},gastosDestinoCiudadName:()=>'',gastosPaisNames:()=>[],blogDayDateLabel:v=>v,expenseTimeValue:g=>g.hora||'',gastoCiudadLabel:()=>'-',expenseAttachmentCount:()=>0,gastoMatchesLugarFilters:()=>true,compareExpensesChronologically:(a,b)=>String(a.fecha).localeCompare(String(b.fecha)),normalizePlaceName:v=>String(v||'').toLowerCase(),accountLabel:c=>c.nombre,accountChartLabel:c=>c.nombre,accountTypeLabel:()=>'',drawBarChart:()=>{}});
 w.fmtCurrencyWithEur=w.fmtCurrency;w.gastoMatchesTripSelection=g=>!w.state.selectedViajeIds.length||w.state.selectedViajeIds.includes(Number(g.viajeId));
 for(const name of ['addCurrencyTotal','formatForeignCurrencyTotals','groupExpenseDetails','expenseDisplayRows','expensePendingMarkup','groupAccountBalanceMarkup','filteredGastos','expenseGroupKey','syncOpenExpenseGroups','renderGastosTabla','renderCuentas','accountMatrixFor','summaryAccountRows','selectedTripIds','selectedTripSet','percentageOfTotal'])w.eval(sourceOf(name));
 const start=app.indexOf('  const usedAccountIds = new Set(gastos.map',app.indexOf('function renderResumen()')),end=app.indexOf("  if (state.activeTab === 'mapa'",start);
 w.eval(`function renderAccountPart(){const gastos=state.gastos,totalEur=gastos.reduce((total,gasto)=>total+gasto.importe,0),cta=$('#r-cuenta').value,isOverTripBudget=false;${app.slice(start,end)}}`);
 const text=element=>element.textContent.replace(/\s/g,' ');
 return {w,$,meal,group,text,close:()=>w.close()};
}
test('los pendientes van bajo el importe y el total suma gastado más pendiente sin cambiar los datos',()=>{
 const ui=setup();try{
  const before=JSON.stringify(ui.w.state);ui.w.renderGastosTabla();
  const row=ui.$('[data-gasto-id="2"] [data-label="Importe"]');assert.equal(ui.text(row.querySelector('.expense-own-amount')),'30,00 €');assert.match(ui.text(row.querySelector('.expense-pending')),/^150,00 €pendiente/);
  assert.equal(ui.text(ui.$('#tg-total .expense-own-amount')),'100,00 €');assert.match(ui.text(ui.$('#tg-total .expense-pending')),/^150,00 €/);assert.match(ui.text(ui.$('#tg-total .expense-with-pending')),/^250,00 €/);
  assert.equal(ui.$('#tg-total').colSpan,3);assert.equal(ui.$('#tabla-gastos .subtotal-row .expense-totals-cell').colSpan,3);
  ui.w.eval(sourceOf('printableSectionHtml'));const print=ui.w.document.createElement('div');print.innerHTML=ui.w.printableSectionHtml('gastos');
  for(const selector of ['#tabla-gastos .subtotal-row','#tabla-gastos tfoot tr'])assert.equal(Array.from(print.querySelector(selector).cells).reduce((total,cell)=>total+cell.colSpan,0),9);
  assert.equal(ui.$('#expense-group-summary'),null);assert.equal(JSON.stringify(ui.w.state),before);
  ui.group.settlements[0].voided=true;ui.w.renderGastosTabla();assert.match(ui.text(ui.$('#tg-total .expense-pending')),/^200,00 €/);
 }finally{ui.close();}
});
test('los filtros solo suman los pendientes de los gastos visibles y al saldar desaparecen rojo y suma adicional',()=>{
 const ui=setup();try{
  ui.$('#f-desc').value='Otro';ui.w.renderGastosTabla();assert.equal(ui.$('#tg-total .expense-pending'),null);assert.equal(ui.$('#tg-total .expense-with-pending'),null);
  ui.$('#f-desc').value='';ui.group.settlements[0].amountCents=10000;ui.group.settlements[1].amountCents=17000;ui.w.renderGastosTabla();assert.equal(ui.$('[data-gasto-id="2"] .expense-pending'),null);assert.equal(ui.$('#tg-total .expense-with-pending'),null);
 }finally{ui.close();}
});
test('un adelanto sin consumo propio se muestra como fila informativa cero sin crear un gasto',async()=>{
 const ui=setup();try{
  ui.meal.attendees=['a','b'];ui.meal.items[0].shares={a:1};ui.w.state.gastos=ui.w.state.gastos.filter(g=>g.id!==2);const before=JSON.stringify(ui.w.state);
  ui.w.renderGastosTabla();const row=ui.$('.expense-row[data-gasto-id^="group-only:"]');assert.ok(row);assert.match(ui.text(row.querySelector('.expense-pending')),/^180,00 €/);assert.equal(row.querySelectorAll('select option').length,2);assert.equal(JSON.stringify(ui.w.state),before);
  let target;ui.w.TravelGroupUI={openMealForTrip:(trip,id)=>{target=[trip,id];}};ui.w.eval(sourceOf('openEditGasto'));ui.w.eval(sourceOf('handleGastoAction'));await ui.w.handleGastoAction(ui.w.expenseDisplayRows().find(g=>g.virtualGroupExpense).id,'edit');assert.deepEqual(target,[1,'m1']);
 }finally{ui.close();}
});
test('la apertura del gasto de grupo solicita su comida exacta sin alertas ni buscar por nombre',async()=>{
 const ui=setup();try{
  let target;ui.w.alert=()=>assert.fail('No debe bloquear con un aviso');ui.w.TravelGroupUI={openMealForTrip:(trip,id)=>{target=[trip,id];}};ui.w.eval(sourceOf('openEditGasto'));
  ui.w.state.gastos[1].groupSource='meal:ticket:con:dos:puntos';await ui.w.openEditGasto(ui.w.state.gastos[1]);assert.deepEqual(target,[1,'ticket:con:dos:puntos']);
 }finally{ui.close();}
});
test('Config y Resumen excluyen del disponible la compensación y muestran los pendientes aparte',()=>{
 const ui=setup();try{
  ui.$('#c-viaje').innerHTML='<option value="1" selected>Viaje</option>';ui.w.renderCuentas();assert.match(ui.text(ui.$('#tabla-cuentas tbody tr:last-child')),/Total disponible.*320,00/);assert.match(ui.text(ui.$('#tabla-cuentas .expense-pending')),/150,00.*por recuperar.*no disponible/);
  const before=JSON.stringify(ui.w.state);ui.w.renderAccountPart();const rows=Array.from(ui.$('#tabla-cuenta tbody').rows),total=rows.at(-1);assert.match(ui.text(total.querySelector('[data-label="Saldo"]')),/^320,00 €Disponible/);assert.equal(ui.$('#account-balance-note').hidden,false);
  const pending=ui.$('#tabla-cuenta .expense-pending');assert.match(ui.text(pending),/150,00.*no disponible/);assert.equal(ui.text(pending.closest('tr').querySelector('[data-label="% saldo"]')),'—');assert.equal(JSON.stringify(ui.w.state),before);
  ui.w.state.cuentas[2].saldoActual=-40;ui.w.renderAccountPart();assert.match(ui.text(ui.$('#tabla-cuenta .expense-pending')),/40,00.*por pagar/);assert.match(ui.text(ui.$('#tabla-cuenta tr:last-child [data-label="Saldo"]')),/^320,00/);
 }finally{ui.close();}
});
