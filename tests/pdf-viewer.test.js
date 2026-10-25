import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createPdfViewer} from '../pdf-viewer.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<100&&!predicate();i++)await tick();assert.ok(predicate(),'No se alcanzó el estado esperado');}
function fakePdf(pages=3){
 const result={numPages:pages,rendered:[],destroyed:0,destroy:async()=>result.destroyed++};
 result.getPage=async page=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:args=>{result.rendered.push({page,args});return {promise:Promise.resolve(),cancel(){}};}});return result;
}
function setup(options={}){
 const dom=new JSDOM(html,{url:'http://local.test/',runScripts:'outside-only'}),root=dom.window.document,$=id=>root.getElementById(id),files=new Map(),revoked=[];
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({});Object.defineProperty($('pdf-viewer-stage'),'clientWidth',{value:320});
 const pdf=fakePdf(),library={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve(pdf),destroy:async()=>pdf.destroy()})};let counter=0;
 const viewer=createPdfViewer(root,{urls:{createObjectURL:blob=>{const url='blob:test/'+(++counter);files.set(url,blob);return url;},revokeObjectURL:url=>revoked.push(url)},loadPdf:async()=>library,...options});
 return {viewer,dom,root,$,pdf,files,revoked,close:()=>dom.window.close()};
}

test('PDF multipágina navega, amplía con límite de memoria y descarga exactamente el original',async()=>{
 const ui=setup();try{
  const original=new Blob(['%PDF-original-sin-transformar'],{type:'application/octet-stream'});await ui.viewer.open(original,'billete.pdf');
  assert.equal(ui.$('pdf-viewer-dialog').open,true);assert.equal(ui.$('pdf-viewer-prev').disabled,true);assert.equal(ui.$('pdf-viewer-next').disabled,false);assert.equal(ui.$('pdf-viewer-page').textContent,'1 / 3');assert.equal(ui.$('pdf-viewer-canvas').hidden,false);
  const saved=ui.files.get(ui.$('pdf-viewer-download').getAttribute('href'));assert.equal(saved.type,'application/pdf');assert.equal(await saved.text(),await original.text());assert.equal(ui.$('pdf-viewer-download').download,'billete.pdf');
  await ui.$('pdf-viewer-next').onclick();await ui.$('pdf-viewer-next').onclick();assert.equal(ui.$('pdf-viewer-page').textContent,'3 / 3');assert.equal(ui.$('pdf-viewer-next').disabled,true);
  ui.$('pdf-viewer-zoom').value='3';await ui.$('pdf-viewer-zoom').onchange();assert.ok(ui.$('pdf-viewer-canvas').width*ui.$('pdf-viewer-canvas').height<=4_000_000);assert.ok(parseFloat(ui.$('pdf-viewer-canvas').style.width)>320);
  await ui.viewer.close();assert.equal(ui.$('pdf-viewer-dialog').open,false);assert.equal(ui.$('pdf-viewer-canvas').width,1);assert.equal(ui.revoked.length,1);assert.ok(ui.pdf.destroyed);assert.equal(ui.$('pdf-viewer-download').hasAttribute('href'),false);
 }finally{ui.close();}
});

test('una página lenta no sustituye la página elegida después',async()=>{
 const pdf=fakePdf();let oldPage;
 const originalGet=pdf.getPage;pdf.getPage=page=>page===1?new Promise(resolve=>oldPage=resolve):originalGet(page);
 const ui=setup({loadPdf:async()=>({GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve(pdf),destroy:async()=>{}})})});try{
  const opening=ui.viewer.open(new Blob(['%PDF']),'reserva.pdf');await until(()=>oldPage);await ui.$('pdf-viewer-next').onclick();oldPage(await originalGet(1));await opening;
  assert.equal(ui.$('pdf-viewer-page').textContent,'2 / 3');assert.deepEqual(pdf.rendered.map(row=>row.page),[2]);assert.equal(ui.$('pdf-viewer-status').textContent,'Página 2 de 3');
 }finally{await ui.viewer.close();ui.close();}
});

test('cerrar y abrir otro PDF ignora la carga antigua y libera sus recursos',async()=>{
 const first=fakePdf(8),second=fakePdf(2);let resolveFirst,loads=0;
 const ui=setup({loadPdf:async()=>({GlobalWorkerOptions:{},getDocument:()=>++loads===1?{promise:new Promise(resolve=>resolveFirst=resolve),destroy:async()=>{}}:{promise:Promise.resolve(second),destroy:async()=>{}}})});try{
  const old=ui.viewer.open(new Blob(['%PDF-1']),'viejo.pdf');await until(()=>resolveFirst);await ui.viewer.close();await ui.viewer.open(new Blob(['%PDF-2']),'nuevo.pdf');resolveFirst(first);await old;
  assert.equal(ui.$('pdf-viewer-title').textContent,'nuevo.pdf');assert.equal(ui.$('pdf-viewer-page').textContent,'1 / 2');assert.ok(first.destroyed);assert.equal(ui.revoked.length,1);
 }finally{await ui.viewer.close();ui.close();}
});

test('PDF ilegible o protegido informa y mantiene la descarga original disponible',async()=>{
 for(const name of ['InvalidPDFException','PasswordException']){
  const ui=setup({loadPdf:async()=>({GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.reject(Object.assign(new Error('No válido'),{name})),destroy:async()=>{}})})});try{
   await ui.viewer.open(new Blob(['%PDF']),'ticket.pdf');assert.match(ui.$('pdf-viewer-status').textContent,name==='PasswordException'?/contraseña/:/No se ha podido abrir/);assert.equal(ui.$('pdf-viewer-canvas').hidden,true);assert.ok(ui.$('pdf-viewer-download').getAttribute('href'));assert.equal(ui.$('pdf-viewer-next').disabled,true);
  }finally{await ui.viewer.close();ui.close();}
 }
});

test('tickets PDF por MIME, extensión o contenido se abren dentro de la app; las fotos mantienen su visor',async()=>{
 const calls=[],imageCalls=[];const ctx=vm.createContext({state:{gastos:[],viajeDocumentos:[]},normalizeTicketDataValue:value=>String(value||''),dataUrlToBlob:(data,type)=>new Blob([data],{type}),openPdfDocument:(blob,name)=>calls.push({blob,name}),expenseTicketImageRecord:()=>({data:'image'}),expenseExtraImages:record=>record.extraImages||[],openImageViewer:(...args)=>imageCalls.push(args),URL:{createObjectURL:()=>assert.fail('No debe abrir el PDF en una pestaña')},window:{open:()=>assert.fail('No debe depender del navegador')}});
 for(const name of ['isPdfDocument','openTicket','openTripDocument','openExpenseImage'])vm.runInContext(sourceOf(name),ctx);
 for(const ticket of [{ticketType:'application/pdf',ticketName:'billete'},{ticketType:'',ticketName:'Reserva.PDF'},{ticketType:'',ticketName:'archivo',ticketData:'data:application/pdf;base64,JVBERg=='}]){ctx.state.gastos=[{id:1,ticketData:'data:application/pdf;base64,JVBERg==',...ticket}];await ctx.openTicket(1);}
 ctx.state.viajeDocumentos=[{id:3,fileType:'application/pdf',fileName:'hotel.pdf',fileData:'%PDF'}];await ctx.openTripDocument(3);assert.equal(calls.length,4);
 ctx.state.gastos=[{id:1,extraImages:[{name:'reserva.pdf',type:'application/pdf',data:'%PDF'}]}];await ctx.openExpenseImage(1,0);assert.equal(calls.length,5);
 ctx.state.gastos=[{id:1,ticketName:'foto.jpg',ticketType:'image/jpeg',ticketData:'data:image/jpeg;base64,AA=='}];ctx.openTicket(1);assert.equal(imageCalls.length,1);
});

test('antes de guardar un gasto se ofrece abrir el PDF seleccionado sin enviarlo ni convertirlo a imagen',()=>{
 const dom=new JSDOM(html,{url:'http://local.test',runScripts:'outside-only'}),w=dom.window,input=w.document.getElementById('g-ticket');try{
  const file=new w.File(['%PDF'],'billete.pdf',{type:'application/pdf'});Object.defineProperty(input,'files',{value:[file]});let opened;
  Object.assign(w,{$:selector=>w.document.querySelector(selector),pendingExpenseTicketPreviews:{g:null},selectedFileInput:()=>input,normalizeTicketDataValue:value=>String(value||''),renderExpenseTicketTranslation:()=>{},openPdfDocument:(blob,name)=>opened=[blob,name]});
  for(const name of ['isPdfDocument','renderSelectedExpenseTicketPreview'])w.eval(sourceOf(name));w.renderSelectedExpenseTicketPreview('g');const preview=w.document.getElementById('g-ticket-new-preview');assert.equal(preview.hidden,false);assert.match(preview.textContent,/PDF.*Abrir/);preview.querySelector('button').click();assert.equal(opened[0],file);assert.equal(opened[1],'billete.pdf');assert.equal(w.document.getElementById('g-ticket-new-rotate').hidden,true);
 }finally{w.close();}
});
