import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
function setup(){
 const state={gastos:[],cuentas:[{id:1,moneda:'EUR',saldoActual:1000},{id:2,moneda:'EUR',saldoActual:500}]};
 const ctx=vm.createContext({state,Number,Date,String,Array,Math,hasValidCurrency:()=>true,numberValue:v=>Number(v)||0,toEur:v=>Number(v),normalizeExpenseTime:v=>v,currentLocalTime:()=> '12:00',resolvedExpenseTicketLocation:()=>({}),normalizeTicketDataValue:v=>v,normalizeTicketCompanionKind:()=>'',expenseTimeValue:()=>'',addRecord:async(_,g)=>{g.id=state.gastos.length+1;state.gastos.push(g);return g.id;},getOne:async(store,id)=>state[store].find(g=>g.id===id),updateRecord:async(_,id,g)=>{state.gastos[state.gastos.findIndex(g=>g.id===id)]=g;return g;},updateCuenta:async(id,p)=>Object.assign(state.cuentas.find(c=>c.id===id),p)});
 vm.runInContext(source.slice(source.indexOf('async function addGasto('),source.indexOf('function queueExpenseClassificationSave(')),ctx);return {state,ctx};
}
test('reserva no descuenta saldo; pagar y volver a pendiente revierte exactamente el movimiento',async()=>{
 const {state,ctx}=setup();await ctx.addGasto({fecha:'2026-11-15',paymentPending:true,paymentDue:'2027-08-23',cuentaId:1,moneda:'EUR',importe:113,catId:1});
 assert.equal(state.cuentas[0].saldoActual,1000);assert.equal(state.gastos[0].importe,0);assert.equal(state.gastos[0].pendingAmount,113);
 await ctx.updateGasto(1,{paymentPending:true,importe:120});assert.equal(state.cuentas[0].saldoActual,1000);
 await ctx.updateGasto(1,{paymentPending:false,importe:120,cuentaId:2,fecha:'2027-08-23'});assert.equal(state.cuentas[0].saldoActual,1000);assert.equal(state.cuentas[1].saldoActual,380);assert.equal(state.gastos[0].reservationDate,'2026-11-15');
 await ctx.updateGasto(1,{paymentPending:true,importe:120});assert.equal(state.cuentas[1].saldoActual,500);assert.equal(state.gastos[0].importeEur,0);
});
test('un ingreso no puede registrarse como pago pendiente',async()=>{const {ctx}=setup();await assert.rejects(()=>ctx.addGasto({paymentPending:true,importe:-5,moneda:'EUR'}),/mayor que cero/);});
