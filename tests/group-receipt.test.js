import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(navigator={}){
 const draws=[],downloads=[],canvases=[];
 const context=vm.createContext({Blob,File,setTimeout:()=>{},navigator,URL:{createObjectURL:()=> 'blob:local',revokeObjectURL:()=>{}},document:{body:{appendChild(){}},createElement:tag=>{
  if(tag==='a')return{click(){downloads.push(this.download);},remove(){}};
  const ctx={font:'',textAlign:'left',measureText:text=>({width:text.length*15}),fillText(text,x,y){draws.push({text,x,y,align:this.textAlign,canvas:canvases.length-1});},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  const canvas={getContext:()=>ctx,toBlob:fn=>fn(new Blob(['local-png'],{type:'image/png'}))};canvases.push(canvas);return canvas;
 }}});
 for(const file of ['group-meals.js','group-receipt.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
 return{api:context.TravelGroupReceipt,draws,downloads,canvases};
}
const receipt={participantName:'Eusebi',mealName:'Comida Catalinos',date:'2026-10-17',payerName:'Lucio',rows:[{label:'Cerveza',amountCents:300},{label:'Fideuá',amountCents:2500},{label:'Pan (común)',amountCents:100},{label:'Agua (común)',amountCents:200},{label:'Pastel de la casa',amountCents:400},{label:'Café',amountCents:200}],totalCents:3700,paidCents:0,remainingCents:3700};

test('imagen local con tabla, importes a la derecha y totales exactos',async()=>{
 const {api,draws}=setup();const files=await api.createFiles(receipt);
 assert.equal(files.length,1);assert.equal(files[0].type,'image/png');assert.match(files[0].name,/Eusebi-Comida-Catalinos.png$/);
 assert.equal(draws.filter(d=>d.text.startsWith('37,00')).length,2);
 for(const value of ['3,00','25,00','1,00','2,00','4,00','37,00']){const draw=draws.find(d=>d.text.startsWith(value));assert.equal(draw.align,'right');assert.equal(draw.x,910);}
 assert.ok(draws.some(d=>d.text==='Pan (común)'));assert.ok(draws.some(d=>d.text==='Pendiente'));
});
test('justificantes largos se dividen sin perder filas y conservan los totales solo al final',async()=>{
 const {api,draws,canvases}=setup();const long={...receipt,rows:Array.from({length:100},(_,i)=>({label:'Concepto '+i+' con nombre largo '.repeat(10),amountCents:100})),totalCents:10000,remainingCents:10000};
 const files=await api.createFiles(long);assert.ok(files.length>1);assert.equal(draws.filter(d=>d.text==='Total consumido').length,1);
 for(let i=0;i<100;i++)assert.ok(draws.some(d=>d.text.startsWith('Concepto '+i+' ')));
 for(const draw of draws)assert.ok(draw.y<canvases[draw.canvas].height);
 assert.ok(canvases.slice(1).every(canvas=>canvas.height<2400));
});
test('compartir entrega solo las imágenes al selector nativo; cancelar no descarga ni envía de nuevo',async()=>{
 let called=0;const files=[new File(['x'],'justificante.png',{type:'image/png'})];
 const {api,downloads}=setup({canShare:()=>true,share:async value=>{called++;assert.deepEqual(Object.keys(value),['files']);assert.equal(value.files,files);}});
 await api.share(files);assert.equal(called,1);assert.equal(downloads.length,0);
 const cancel=setup({canShare:()=>true,share:async()=>{throw Object.assign(new Error('Cancelado'),{name:'AbortError'});}});
 assert.match(await cancel.api.share(files),/No se ha compartido/);assert.equal(cancel.downloads.length,0);
});
test('sin compartir archivos descarga PNG; otros errores dejan la descarga como acción explícita',async()=>{
 const files=[new File(['x'],'justificante.png',{type:'image/png'})];
 const fallback=setup({canShare:()=>false,share:async()=>assert.fail('No debe compartir')});assert.match(await fallback.api.share(files),/descargada/);assert.deepEqual(fallback.downloads,['justificante.png']);
 const failed=setup({canShare:()=>true,share:async()=>{throw new Error('Sin permiso');}});await assert.rejects(failed.api.share(files),/Descargar imagen/);assert.equal(failed.downloads.length,0);
});
