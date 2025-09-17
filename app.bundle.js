
// IndexedDB helpers
const DB_NAME='gastos_viaje_db'; const DB_VERSION=1; let dbPromise=null;
function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('cuentas')){
        const s=db.createObjectStore('cuentas',{keyPath:'id',autoIncrement:true});
        s.createIndex('byMoneda','moneda');
      }
      if(!db.objectStoreNames.contains('categorias')){
        const s=db.createObjectStore('categorias',{keyPath:'id',autoIncrement:true});
        s.createIndex('byParent','parentId');
      }
      if(!db.objectStoreNames.contains('gastos')){
        const s=db.createObjectStore('gastos',{keyPath:'id',autoIncrement:true});
        s.createIndex('byFecha','fecha');
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror =()=>reject(req.error);
  }); return dbPromise;
}
async function tx(store,mode='readonly'){ const db=await openDB(); return db.transaction(store,mode).objectStore(store); }

async function addCuenta({nombre,moneda,saldoInicial=0,presupuesto=0,nota=''}){
  const s=await tx('cuentas','readwrite');
  return new Promise((res,rej)=>{ const now=new Date().toISOString();
    const req=s.add({nombre,moneda,saldoInicial:+saldoInicial,saldoActual:+saldoInicial,presupuesto:+presupuesto,nota,createdAt:now,updatedAt:now});
    req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error);
  });
}
async function getCuentas(){ const s=await tx('cuentas'); return new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function getCuenta(id){ const s=await tx('cuentas'); return new Promise((res,rej)=>{ const r=s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function updateCuenta(id,patch){ const s=await tx('cuentas','readwrite'); return new Promise((res,rej)=>{ const g=s.get(id);
  g.onsuccess=()=>{ if(!g.result) return rej('no existe'); const obj={...g.result,...patch,updatedAt:new Date().toISOString()}; const p=s.put(obj); p.onsuccess=()=>res(obj); p.onerror=()=>rej(p.error); };
  g.onerror=()=>rej(g.error);
});}
async function delCuenta(id){ const s=await tx('cuentas','readwrite'); return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); }); }

async function addCategoria({nombre,parentId=null}){
  const s=await tx('categorias','readwrite');
  return new Promise((res,rej)=>{ const req=s.add({nombre,parentId: parentId? +parentId:null}); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
}
async function getCategorias(){ const s=await tx('categorias'); return new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function updateCategoria(id,patch){ const s=await tx('categorias','readwrite'); return new Promise((res,rej)=>{ const g=s.get(id);
  g.onsuccess=()=>{ if(!g.result) return rej('no existe'); const obj={...g.result,...patch}; const p=s.put(obj); p.onsuccess=()=>res(obj); p.onerror=()=>rej(p.error); };
  g.onerror=()=>rej(g.error);
});}
async function delCategoria(id){ const s=await tx('categorias','readwrite'); return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); }); }

async function addGasto({fecha,cuentaId,moneda,catId,subcatId=null,importe,desc=''}){
  const s=await tx('gastos','readwrite');
  return new Promise(async (res,rej)=>{
    const data={fecha,cuentaId:+cuentaId,moneda,catId:+catId,subcatId: subcatId? +subcatId:null,importe:+importe,desc,createdAt:new Date().toISOString()};
    const req=s.add(data);
    req.onsuccess= async ()=>{ try{ const c=await getCuenta(+cuentaId); await updateCuenta(c.id,{saldoActual:+(c.saldoActual-+importe).toFixed(2)});}catch(e){} res(req.result); };
    req.onerror=()=>rej(req.error);
  });
}
async function getGastos(){ const s=await tx('gastos'); return new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function updateGasto(id,patch){ const s=await tx('gastos','readwrite'); return new Promise((res,rej)=>{ const g=s.get(id);
  g.onsuccess=()=>{ if(!g.result) return rej('no existe'); const obj={...g.result,...patch}; const p=s.put(obj); p.onsuccess=()=>res(obj); p.onerror=()=>rej(p.error); };
  g.onerror=()=>rej(g.error);
});}
async function delGasto(id){ const s=await tx('gastos','readwrite'); return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); }); }

async function exportAll(){ const [cuentas,categorias,gastos]=await Promise.all([getCuentas(),getCategorias(),getGastos()]); return {version:1,generatedAt:new Date().toISOString(),cuentas,categorias,gastos}; }
async function importAll(obj){
  if(!obj||!obj.version) throw new Error('Archivo no válido');
  const db=await openDB();
  await new Promise(res=>{ const t=db.transaction(['cuentas','categorias','gastos'],'readwrite');
    t.objectStore('cuentas').clear(); t.objectStore('categorias').clear(); t.objectStore('gastos').clear(); t.oncomplete=()=>res(true);
  });
  for(const c of obj.cuentas){ await addCuenta(c); }
  for(const c of obj.categorias){ await addCategoria(c); }
  for(const g of obj.gastos){ await addGasto(g); }
}



// Utilidades y estado
const $ = s=>document.querySelector(s);
const fmtCurrency = (n,cur='EUR')=> new Intl.NumberFormat('es-ES',{style:'currency',currency:cur}).format(+n||0);
const fmtDate = iso=> new Date(iso).toLocaleDateString('es-ES',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
const unique = a=> Array.from(new Set(a));
const MONEDAS = ['EUR','USD','GBP','SEK','NOK','DKK','CHF','JPY'];
let state={cuentas:[],categorias:[],gastos:[]};

function setTab(id){ ['gastos','resumen','config'].forEach(t=>{ $('#tab-'+t).classList.toggle('active', t===id); $('#view-'+t).style.display=(t===id)?'block':'none'; }); if(id==='resumen') renderResumen(); }
$('#tab-gastos').onclick=()=>setTab('gastos'); $('#tab-resumen').onclick=()=>setTab('resumen'); $('#tab-config').onclick=()=>setTab('config');

function renderMonedas(){ ['#g-moneda','#f-moneda','#r-moneda','#c-moneda'].forEach(sel=>{ const el=$(sel); el.innerHTML=''; MONEDAS.forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; el.appendChild(o); }); }); }

async function loadAll(){
  state.cuentas=await getCuentas();
  state.categorias=await getCategorias();
  state.gastos=await getGastos();
  renderAll();
  const tabResumen=document.querySelector('#tab-resumen');
  if(tabResumen && tabResumen.classList.contains('active')) renderResumen();
}

function renderAll(){
  renderMonedas(); if($('#g-fecha').value==='') $('#g-fecha').valueAsDate=new Date();
  // cuentas
  ['#g-cuenta','#f-cuenta','#r-cuenta'].forEach(sel=>{ const el=$(sel); el.innerHTML=''; const o0=document.createElement('option'); o0.value=''; o0.textContent= sel==='#g-cuenta'?'(elige cuenta)':'(todas)'; el.appendChild(o0); state.cuentas.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; el.appendChild(o); }); });
  $('#g-cuenta').onchange=()=>{ const c=state.cuentas.find(x=>x.id===+$('#g-cuenta').value); $('#g-moneda').value = c? c.moneda : MONEDAS[0]; };
  // categorías
  const isSub=c=> c.parentId!==null && c.parentId!==undefined;
  const principals=state.categorias.filter(c=>!isSub(c)), subs=state.categorias.filter(isSub);
  ['#g-cat','#f-cat'].forEach(sel=>{ const el=$(sel); el.innerHTML=''; const o0=document.createElement('option'); o0.value=''; o0.textContent= sel==='#g-cat'?'(elige categoría)':'(todas)'; el.appendChild(o0); principals.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; el.appendChild(o); }); });
  $('#g-cat').onchange=()=>{ const catId=+$('#g-cat').value; const el=$('#g-subcat'); el.innerHTML='<option value="">(sin subcategoría)</option>'; subs.filter(s=> s.parentId===catId).forEach(s=>{ const o=document.createElement('option'); o.value=s.id; o.textContent=s.nombre; el.appendChild(o); }); };
  // tabla cuentas
  const tbC=$('#tabla-cuentas tbody'); tbC.innerHTML='';
  state.cuentas.forEach(c=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${c.nombre}</td><td><span class='badge'>${c.moneda}</span></td><td>${fmtCurrency(c.saldoActual,c.moneda)}</td><td>${c.presupuesto? fmtCurrency(c.presupuesto,c.moneda):'–'}</td><td><button class='ghost' data-edit-cuenta='${c.id}'>Editar</button> <button class='ghost' data-del-cuenta='${c.id}'>Eliminar</button></td>`; tbC.appendChild(tr); });
  tbC.querySelectorAll('button[data-del-cuenta]').forEach(b=> b.onclick= async ()=>{ await delCuenta(+b.dataset.delCuenta); await loadAll(); });
  tbC.querySelectorAll('button[data-edit-cuenta]').forEach(b=> b.onclick= async ()=>{ const id=+b.dataset.editCuenta; const c=state.cuentas.find(x=>x.id===id); if(!c) return; const nombre=prompt('Nuevo nombre',c.nombre); if(nombre===null) return; const moneda=prompt('Moneda (EUR, USD, ...)', c.moneda)||c.moneda; const presu=parseFloat(prompt('Presupuesto', c.presupuesto||'')||c.presupuesto||0); const aj=prompt('Ajuste de saldo actual (+50, -20, ...)', ''); let saldo=c.saldoActual; if(aj && !isNaN(parseFloat(aj))) saldo = +(saldo + parseFloat(aj)); await updateCuenta(id,{nombre:nombre.trim()||c.nombre,moneda:moneda.trim()||c.moneda,presupuesto:presu,saldoActual:+saldo}); await loadAll(); });
  // tabla categorias
  const tbCat=$('#tabla-cats tbody'); tbCat.innerHTML='';
  state.categorias.forEach(cat=>{ const padre=state.categorias.find(c=>c.id===cat.parentId); const tipo=cat.parentId?'Subcategoría':'Categoría'; const tr=document.createElement('tr'); tr.innerHTML=`<td>${cat.nombre}</td><td>${tipo}</td><td>${padre? padre.nombre:'–'}</td><td><button class='ghost' data-edit-cat='${cat.id}'>Editar</button> <button class='ghost' data-del-cat='${cat.id}'>Eliminar</button></td>`; tbCat.appendChild(tr); });
  tbCat.querySelectorAll('button[data-del-cat]').forEach(b=> b.onclick= async ()=>{ await delCategoria(+b.dataset.delCat); await loadAll(); });
  tbCat.querySelectorAll('button[data-edit-cat]').forEach(b=> b.onclick= async ()=>{ const id=+b.dataset.editCat; const c=state.categorias.find(x=>x.id===id); if(!c) return; const nombre=prompt('Nuevo nombre', c.nombre); if(nombre===null) return; const principals=state.categorias.filter(k=>!k.parentId); const lista=principals.map(k=>`${k.id}:${k.nombre}`).join(' | '); const entrada=prompt('ID de nuevo padre (vacío=principal). Opciones: '+lista, c.parentId||''); const parentId = entrada? parseInt(entrada):null; await updateCategoria(id,{nombre:nombre.trim()||c.nombre,parentId: parentId||null}); await loadAll(); });
  // selector parent
  const parentSel=$('#cat-parent'); parentSel.innerHTML='<option value="">(Ninguna, es principal)</option>'; principals.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; parentSel.appendChild(o); });
  renderGastosTabla();
}

$('#btn-add-cuenta').onclick = async ()=>{ const nombre=$('#c-nombre').value.trim(); const moneda=$('#c-moneda').value; const saldo=parseFloat($('#c-saldo').value||'0'); const presu=parseFloat($('#c-presu').value||'0'); if(!nombre){ $('#msg-cuenta').textContent='Pon un nombre'; return; } await addCuenta({nombre,moneda,saldoInicial:saldo,presupuesto:presu,nota:$('#c-nota').value.trim()}); $('#c-nombre').value=''; $('#c-saldo').value=''; $('#c-presu').value=''; $('#c-nota').value=''; $('#msg-cuenta').textContent='Añadida ✓'; await loadAll(); };
$('#btn-add-cat').onclick = async ()=>{ const nombre=$('#cat-nombre').value.trim(); const parentId=$('#cat-parent').value||null; if(!nombre){ $('#msg-cat').textContent='Escribe un nombre'; return; } await addCategoria({nombre,parentId}); $('#cat-nombre').value=''; $('#cat-parent').value=''; $('#msg-cat').textContent='Guardada ✓'; await loadAll(); };
$('#btn-add-gasto').onclick = async ()=>{ const fecha=$('#g-fecha').value || new Date().toISOString().slice(0,10); const cuentaId=$('#g-cuenta').value; const moneda=$('#g-moneda').value; const catId=$('#g-cat').value; const subcatId=$('#g-subcat').value||null; const importe=parseFloat($('#g-importe').value||'0'); if(!cuentaId || !catId || !importe){ $('#msg-gasto').textContent='Completa cuenta, categoría e importe'; return; } await addGasto({fecha,cuentaId,moneda,catId,subcatId,importe,desc:$('#g-desc').value.trim()}); $('#g-importe').value=''; $('#g-desc').value=''; $('#msg-gasto').textContent='Gasto añadido ✓'; await loadAll(); };
$('#f-clear').onclick = ()=>{ ['#f-moneda','#f-cuenta','#f-cat','#f-desde','#f-hasta'].forEach(s=>{ const el=$(s); if(el.tagName==='SELECT') el.value=''; else el.value=''; }); renderGastosTabla(); };

function renderGastosTabla(){
  const tbody=$('#tabla-gastos tbody'); tbody.innerHTML='';
  const fMon=$('#f-moneda').value; const fCta=$('#f-cuenta').value; const fCat=$('#f-cat').value; const fDesde=$('#f-desde').value; const fHasta=$('#f-hasta').value;
  if($('#f-moneda').options.length<=1){ const sel=$('#f-moneda'); sel.innerHTML='<option value="">(todas)</option>'; unique(state.gastos.map(g=>g.moneda)).forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; sel.appendChild(o); }); }
  let rows=state.gastos.filter(g=> !fMon || g.moneda===fMon).filter(g=> !fCta || g.cuentaId===+fCta).filter(g=> !fCat || g.catId===+fCat).filter(g=> !fDesde || g.fecha>=fDesde).filter(g=> !fHasta || g.fecha<=fHasta).sort((a,b)=> a.fecha.localeCompare(b.fecha));
  let totalFiltro=0; const grupos={}; rows.forEach(g=>{ (grupos[g.fecha] = grupos[g.fecha] || []).push(g); });
  Object.keys(grupos).sort().forEach(fecha=>{
    let subtotal=0; const trh=document.createElement('tr'); trh.innerHTML=`<td colspan='8'><b>${fmtDate(fecha)}</b></td>`; tbody.appendChild(trh);
    grupos[fecha].forEach(g=>{ const cat=state.categorias.find(c=>c.id===g.catId); const sub=state.categorias.find(c=>c.id===g.subcatId); const cta=state.cuentas.find(c=>c.id===g.cuentaId);
      const tr=document.createElement('tr'); tr.innerHTML=`<td></td><td>${cat?cat.nombre:'?'}</td><td>${sub?sub.nombre:'–'}</td><td>${cta?cta.nombre:'?'}</td><td>${g.moneda}</td><td>${fmtCurrency(g.importe,g.moneda)}</td><td>${g.desc||''}</td><td><button class='ghost' data-edit-gasto='${g.id}'>Editar</button> <button class='ghost' data-del-gasto='${g.id}'>Eliminar</button></td>`; tbody.appendChild(tr); subtotal+=g.importe; totalFiltro+=g.importe; });
    const trf=document.createElement('tr'); trf.innerHTML=`<td colspan='5' style='text-align:right'><i>Subtotal</i></td><td>${(fMon? fmtCurrency(subtotal, fMon) : subtotal.toFixed(2)+' (mixto)')}</td><td colspan='2'></td>`; tbody.appendChild(trf);
  });
  $('#tg-total').textContent = (fMon? fmtCurrency(totalFiltro, fMon) : totalFiltro.toFixed(2)+' (mixto)');
  tbody.querySelectorAll('button[data-del-gasto]').forEach(b=> b.onclick= async ()=>{ await delGasto(+b.dataset.delGasto); await loadAll(); });
  tbody.querySelectorAll('button[data-edit-gasto]').forEach(b=> b.onclick= async ()=>{ const id=+b.dataset.editGasto; const g=state.gastos.find(x=>x.id===id); if(!g) return; const importe=parseFloat(prompt('Nuevo importe', g.importe)||g.importe); const __descPrompt = prompt('Descripción', g.desc || '');
const desc = (__descPrompt !== null && __descPrompt !== undefined && __descPrompt !== '')
  ? __descPrompt : (g.desc || ''); const principals=state.categorias.filter(k=>!k.parentId); const lista=principals.map(k=>`${k.id}:${k.nombre}`).join(' | '); const catEntrada=prompt('ID de categoría (opciones: '+lista+')', g.catId); let catId=g.catId; if(catEntrada && !isNaN(parseInt(catEntrada))) catId=parseInt(catEntrada); const subs=state.categorias.filter(s=> s.parentId===catId); const listaSub=subs.map(s=>`${s.id}:${s.nombre}`).join(' | '); const subEntrada=prompt('ID de subcategoría (opcional). Opciones: '+(listaSub||'—'), g.subcatId||''); const subcatId=subEntrada? parseInt(subEntrada):null; await updateGasto(id,{importe,desc,catId,subcatId}); await loadAll(); });
}
['#f-moneda','#f-cuenta','#f-cat','#f-desde','#f-hasta'].forEach(sel=>{ document.querySelector(sel).onchange=renderGastosTabla; });

function drawPieChart(container,data){ const total=data.reduce((a,b)=>a+b.value,0); const W=320,H=260,R=90,cx=120,cy=130; let svg=`<svg class='chart' viewBox='0 0 ${W} ${H}' xmlns='http://www.w3.org/2000/svg'>`; let ang=-Math.PI/2; data.forEach((d,i)=>{ const slice=total? (d.value/total)*Math.PI*2:0; const x1=cx+R*Math.cos(ang), y1=cy+R*Math.sin(ang); const x2=cx+R*Math.cos(ang+slice), y2=cy+R*Math.sin(ang+slice); const large=slice>Math.PI?1:0; const color=`hsl(${i*57%360} 70% 50%)`; svg += `<path d='M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z' fill='${color}' opacity='0.9'><title>${d.label}: ${d.value.toFixed(2)} (${total? (d.value*100/total).toFixed(1):0}%)</title></path>`; ang+=slice; }); let lx=230,ly=40; data.forEach((d,i)=>{ const color=`hsl(${i*57%360} 70% 50%)`; svg += `<rect x='${lx}' y='${ly+i*22}' width='12' height='12' fill='${color}'></rect><text x='${lx+18}' y='${ly+10+i*22}' font-size='12' fill='#374151'>${d.label}</text>`; }); svg += `</svg>`; container.innerHTML=svg; }
function drawBarChart(container,data){ const W=360,H=260,pad=36; const max=Math.max(1,...data.map(d=>d.value)); const bw=(W-pad*2)/Math.max(1,data.length)*0.7; let svg=`<svg class='chart' viewBox='0 0 ${W} ${H}' xmlns='http://www.w3.org/2000/svg'><line x1='${pad}' y1='${H-pad}' x2='${W-pad}' y2='${H-pad}' stroke='#e5e7eb'/></svg>`; const parser=new DOMParser(); let doc=parser.parseFromString(svg,'image/svg+xml'); let root=doc.documentElement; data.forEach((d,i)=>{ const x=pad + i*((W-pad*2)/data.length) + ((W-pad*2)/data.length - bw)/2; const h=(d.value/max)*(H-pad*2); const y=(H-pad)-h; const color=`hsl(${i*57%360} 70% 50%)`; const rect=doc.createElementNS('http://www.w3.org/2000/svg','rect'); rect.setAttribute('x',x.toFixed(1)); rect.setAttribute('y',y.toFixed(1)); rect.setAttribute('width',bw.toFixed(1)); rect.setAttribute('height',h.toFixed(1)); rect.setAttribute('fill',color); const title=doc.createElementNS('http://www.w3.org/2000/svg','title'); title.textContent=`${d.label}: ${d.value.toFixed(2)}`; rect.appendChild(title); root.appendChild(rect); const tx=doc.createElementNS('http://www.w3.org/2000/svg','text'); tx.setAttribute('x',(x+bw/2)); tx.setAttribute('y',H-pad+14); tx.setAttribute('font-size','12'); tx.setAttribute('text-anchor','middle'); tx.setAttribute('fill','#374151'); tx.textContent=d.label; root.appendChild(tx); }); container.innerHTML=''; container.appendChild(root); }

function renderResumen(){
  if(state.gastos.length===0){ $('#kpi-total').textContent='0,00'; $('#kpi-media').textContent='0,00'; $('#kpi-presu').textContent='0%'; }
  else{
    const porMoneda={}; state.gastos.forEach(g=> porMoneda[g.moneda]=(porMoneda[g.moneda]||0)+g.importe);
    $('#kpi-total').textContent = Object.entries(porMoneda).map(([m,v])=> fmtCurrency(v,m)).join(' + ');
    const fechas=state.gastos.map(g=> new Date(g.fecha)); const minF=new Date(Math.min(...fechas)), maxF=new Date(Math.max(...fechas));
    const days=Math.max(1, Math.ceil((maxF-minF)/86400000)+1); const base=porMoneda['EUR']||0; $('#kpi-media').textContent=(base/days).toFixed(2)+' EUR/día (ref.)';
    const pcts = state.cuentas.map(c=>{ const gast=state.gastos.filter(g=> g.cuentaId===c.id && g.moneda===c.moneda).reduce((a,b)=>a+b.importe,0); return c.presupuesto? Math.min(100, (gast*100/c.presupuesto)) : 0; });
    const avg = pcts.length? (pcts.reduce((a,b)=>a+b,0)/pcts.length) : 0; $('#kpi-presu').textContent = avg.toFixed(0)+'%';
  }
  const selMon=$('#r-moneda'); const prevMon=selMon.value; selMon.innerHTML='<option value="">(todas)</option>'; unique(state.gastos.map(g=>g.moneda)).forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; selMon.appendChild(o); }); selMon.value=prevMon; if(selMon.value!==prevMon) selMon.value='';
  const selCta=$('#r-cuenta'); const prevCta=selCta.value; selCta.innerHTML='<option value="">(todas)</option>'; state.cuentas.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; selCta.appendChild(o); }); selCta.value=prevCta; if(selCta.value!==prevCta) selCta.value='';
  const mon=selMon.value; const cta=selCta.value;
  const gastos = state.gastos.filter(g=> !mon || g.moneda===mon).filter(g=> !cta || g.cuentaId===+cta);
  const gastosTodasCuentas = state.gastos.filter(g=> !mon || g.moneda===mon);
  const rows={}; gastos.forEach(g=>{ const cat=state.categorias.find(c=>c.id===g.catId); const sub=state.categorias.find(c=>c.id===g.subcatId); const key=(cat?cat.nombre:'?')+'||'+(sub?sub.nombre:'(sin subcat)'); rows[key]=(rows[key]||0)+g.importe; });
  const arr=Object.entries(rows).map(([k,v])=>({cat:k.split('||')[0], sub:k.split('||')[1], total:v})).sort((a,b)=>b.total-a.total);
  const tb=$('#tabla-cat tbody'); tb.innerHTML=''; arr.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.cat}</td><td>${r.sub}</td><td>${mon? fmtCurrency(r.total,mon): r.total.toFixed(2)}</td>`; tb.appendChild(tr); });
  drawPieChart($('#chart-cat'), arr.slice(0,6).map(r=>({label:r.cat+(r.sub!=='(sin subcat)'?' · '+r.sub:''), value:r.total})));
  const cuentasElegidas = !cta ? state.cuentas : state.cuentas.filter(c=> String(c.id)===String(cta));
  const resumenPorCuenta = state.cuentas.map(c=>{ const gx=gastosTodasCuentas.filter(x=> x.cuentaId===c.id && (!mon || x.moneda===c.moneda)); const total=gx.reduce((a,b)=>a+b.importe,0); const presupuesto=+c.presupuesto>0? +c.presupuesto:0; const pct=presupuesto? Math.min(100,(total*100/presupuesto)):0; return {id:c.id,label:c.nombre,moneda:c.moneda,total,presupuesto,pct:+pct.toFixed(1)}; });
  const resumenPorCuentaPorId = new Map(resumenPorCuenta.map(r=>[String(r.id), r]));
  const cuentasResumen = (cuentasElegidas.length? cuentasElegidas : state.cuentas);
  let porCuenta = cuentasResumen.map(c=> resumenPorCuentaPorId.get(String(c.id))).filter(Boolean);
  if(!porCuenta.length) porCuenta = resumenPorCuenta.slice();
  porCuenta = (cta? porCuenta.slice().sort((a,b)=> b.total-a.total) : porCuenta.slice().sort((a,b)=>{ if(b.pct!==a.pct) return b.pct-a.pct; return b.total-a.total; }));
  const porCuentaBarras = resumenPorCuenta.slice().sort((a,b)=> b.total-a.total);
  drawBarChart($('#chart-cuenta'), porCuentaBarras.map(x=>({label:x.label, value:x.total}))); const tbC=$('#tabla-cuenta tbody'); tbC.innerHTML=''; porCuenta.forEach(r=>{ const cur=r.moneda||mon||'EUR'; const tr=document.createElement('tr'); const presTxt=r.presupuesto? fmtCurrency(r.presupuesto,cur):'–'; tr.innerHTML=`<td>${r.label}</td><td>${r.moneda||'—'}</td><td>${fmtCurrency(r.total,cur)}</td><td>${presTxt}</td><td>${r.pct||0}%</td>`; tbC.appendChild(tr); });
}
$('#r-moneda').onchange=renderResumen; $('#r-cuenta').onchange=renderResumen;

async function seedIfEmpty(){
  const cuentas=await getCuentas();
  if(cuentas.length===0){
    await addCuenta({nombre:'Efectivo',moneda:'EUR',saldoInicial:300,presupuesto:500});
    await addCuenta({nombre:'Tarjeta ABC',moneda:'EUR',saldoInicial:1000,presupuesto:1200});
  }
  const cats=await getCategorias();
  if(cats.length===0){
    const comida=await addCategoria({nombre:'Comida'});
    await addCategoria({nombre:'Desayuno',parentId:comida});
    await addCategoria({nombre:'Almuerzo',parentId:comida});
    await addCategoria({nombre:'Cena',parentId:comida});
    const trans=await addCategoria({nombre:'Transporte'});
    await addCategoria({nombre:'Metro',parentId:trans});
    await addCategoria({nombre:'Bus',parentId:trans});
    await addCategoria({nombre:'Taxi',parentId:trans});
    await addCategoria({nombre:'Alojamiento'});
    await addCategoria({nombre:'Ocio'});
  }
}
window.addEventListener('DOMContentLoaded', async ()=>{ renderMonedas(); await seedIfEmpty(); await loadAll(); });


// v3.4: filtros robustos + export/import + resumen responsivo
document.addEventListener('DOMContentLoaded', function(){
  try{
    // A) filtros por defecto vacíos
    ['f-moneda','f-cuenta','f-cat','f-desde','f-hasta'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.value='';
    });
    if (typeof renderGastosTabla==='function') renderGastosTabla();

    // B) botón "Quitar filtros" (por id)
    function clearAndRender(){
      ['f-moneda','f-cuenta','f-cat','f-desde','f-hasta'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.value='';
      });
      if (typeof renderGastosTabla==='function') renderGastosTabla();
    }
    var b1=document.getElementById('f-clear');
    var b2=document.getElementById('btn-clear-filtros');
    if(b1){ b1.addEventListener('click', function(e){ e.preventDefault(); clearAndRender(); }); }
    if(b2){ b2.addEventListener('click', function(e){ e.preventDefault(); clearAndRender(); }); }

    // C) Exportar/Importar si existen
    var be=document.getElementById('btn-export');
    var bi=document.getElementById('btn-import');
    var fi=document.getElementById('file-import');
    if(be){
      be.addEventListener('click', async function(){
        try{
          var data = await exportAll();
          var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = 'gastos_backup.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
        }catch(err){ alert('No se pudo exportar: '+err); }
      });
    }
    if(bi && fi){
      bi.addEventListener('click', ()=> fi.click());
      fi.addEventListener('change', async function(ev){
        var f = ev.target.files && ev.target.files[0]; if(!f) return;
        try{
          var txt = await f.text(); var obj = JSON.parse(txt);
          await importAll(obj); alert('Datos importados ✓');
          await loadAll(); if (typeof renderGastosTabla==='function') renderGastosTabla();
        }catch(err){ alert('Archivo no válido: '+err); }
        finally{ ev.target.value=''; }
      });
    }
  }catch(e){ console.warn('init v3.4', e); }
});


// v3.4-beta init: filtros, export/import
document.addEventListener('DOMContentLoaded', function(){
  try{
    var ids = ['f-moneda','f-cuenta','f-cat','f-desde','f-hasta'];
    for(var i=0;i<ids.length;i++){ var el=document.getElementById(ids[i]); if(el) el.value=''; }
    if (typeof renderGastosTabla==='function') renderGastosTabla();

    function clearAndRender(){
      for(var i=0;i<ids.length;i++){ var el=document.getElementById(ids[i]); if(el) el.value=''; }
      if (typeof renderGastosTabla==='function') renderGastosTabla();
    }
    var b1=document.getElementById('f-clear');
    var b2=document.getElementById('btn-clear-filtros');
    if(b1){ b1.addEventListener('click', function(e){ e.preventDefault(); clearAndRender(); }); }
    if(b2){ b2.addEventListener('click', function(e){ e.preventDefault(); clearAndRender(); }); }

    var be=document.getElementById('btn-export');
    var bi=document.getElementById('btn-import');
    var fi=document.getElementById('file-import');
    if(be){
      be.addEventListener('click', function(){
        (async function(){
          try{
            var data = await exportAll();
            var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'gastos_backup.json'; a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1500);
          }catch(err){ alert('No se pudo exportar: '+err); }
        })();
      });
    }
    if(bi && fi){
      bi.addEventListener('click', function(){ fi.click(); });
      fi.addEventListener('change', function(ev){
        var f = ev.target.files && ev.target.files[0];
        if(!f) return;
        (async function(){
          try{
            var txt = await f.text();
            var obj = JSON.parse(txt);
            await importAll(obj);
            alert('Datos importados ✓');
            await loadAll();
            if (typeof renderGastosTabla==='function') renderGastosTabla();
          }catch(err){ alert('Archivo no válido: '+err); }
          finally{ ev.target.value=''; }
        })();
      });
    }
  }catch(e){ console.warn('init v3.4-beta', e); }
});


// v3.4-beta: seed inicial si vacío
(function(){
  try{
    if (window.DB && DB.getCuentas && DB.getCategorias){
      Promise.all([DB.getCuentas(), DB.getCategorias()]).then(function(arr){
        var cs=arr[0]||[], ks=arr[1]||[];
        if(cs.length===0 && ks.length===0){
          var now=new Date().toISOString();
          (async function(){
            try{
              await DB.addCuenta({nombre:'Efectivo', moneda:'EUR', saldoInicial:300, saldoActual:300, presupuesto:500, nota:'', createdAt:now, updatedAt:now});
              await DB.addCuenta({nombre:'Tarjeta ABC', moneda:'EUR', saldoInicial:1000, saldoActual:1000, presupuesto:1200, nota:'', createdAt:now, updatedAt:now});
              var comida = await DB.addCategoria({nombre:'Comida', parentId:null});
              await DB.addCategoria({nombre:'Desayuno', parentId:comida});
              await DB.addCategoria({nombre:'Almuerzo', parentId:comida});
              await DB.addCategoria({nombre:'Cena', parentId:comida});
              var trans = await DB.addCategoria({nombre:'Transporte', parentId:null});
              await DB.addCategoria({nombre:'Metro', parentId:trans});
              await DB.addCategoria({nombre:'Bus', parentId:trans});
              await DB.addCategoria({nombre:'Taxi', parentId:trans});
              await DB.addCategoria({nombre:'Alojamiento', parentId:null});
              await DB.addCategoria({nombre:'Ocio', parentId:null});
              if (typeof loadAll==='function') await loadAll();
              if (typeof renderGastosTabla==='function') renderGastosTabla();
            }catch(e){ console.warn('seed v3.4-beta', e); }
          })();
        }
      });
    }
  }catch(e){ console.warn('seed block error', e); }
})();


// v3.4.4 - orden jerárquico + deduplicación en importación
(function(){
  function norm(s){ return (s||'').toString().trim().toLowerCase(); }
  function sortState(){
    try{
      if(window.state){
        if(Array.isArray(state.categorias)){
          // Padres primero, luego hijos; dentro A-Z (ignora acentos)
          state.categorias.sort(function(a,b){
            var pa=a.parentId||0, pb=b.parentId||0;
            if(pa!==pb) return pa-pb;
            return norm(a.nombre).localeCompare(norm(b.nombre),'es',{sensitivity:'base'});
          });
        }
        if(Array.isArray(state.cuentas)){
          state.cuentas.sort(function(a,b){
            return norm(a.nombre).localeCompare(norm(b.nombre),'es',{sensitivity:'base'});
          });
        }
        if(Array.isArray(state.monedas)){
          state.monedas.sort(function(a,b){
            return norm(a).localeCompare(norm(b),'es',{sensitivity:'base'});
          });
        }
      }
    }catch(e){ console.warn('sortState', e); }
  }
  // Hook post-load para ordenar siempre que cargamos datos
  document.addEventListener('DOMContentLoaded', function(){
    try{
      var hooked=false;
      function hook(){
        if(hooked) return;
        if(typeof window.loadAll==='function' && typeof window.renderAll==='function'){
          hooked=true;
          var _loadAll = window.loadAll;
          window.loadAll = async function(){
            var r = await _loadAll.apply(this, arguments);
            sortState();
            try{ renderAll(); }catch(_){}
            return r;
          };
        }
      }
      hook(); setTimeout(hook,300); setTimeout(hook,1000);
    }catch(e){ console.warn('hook loadAll', e); }
  });
  // Envolver importAll para fusionar sin duplicar
  if(typeof window.importAll==='function' && !window.__importAllWrapped){
    var _imp = window.importAll;
    window.importAll = async function(data, opts){
      try{
        if(data){
          // categorías: por (nombre, parentId) y remap de ids en gastos
          if(Array.isArray(data.categorias)){
            var seen=new Map(), fixId=new Map();
            data.categorias.forEach(function(c){
              var key = norm(c.nombre)+'|'+(c.parentId||0);
              if(!seen.has(key)){ seen.set(key,c); fixId.set(c.id,c.id); }
              else{ fixId.set(c.id, seen.get(key).id); }
            });
            if(Array.isArray(data.gastos)){
              data.gastos.forEach(function(g){
                if(g.catId!=null && fixId.has(g.catId)) g.catId = fixId.get(g.catId);
                if(g.subcatId!=null && fixId.has(g.subcatId)) g.subcatId = fixId.get(g.subcatId);
              });
            }
            data.categorias = Array.from(seen.values());
          }
          // cuentas: por (nombre, moneda)
          if(Array.isArray(data.cuentas)){
            var seenC=new Map();
            data.cuentas = data.cuentas.filter(function(c){
              var key = norm(c.nombre)+'|'+norm(c.moneda||'');
              if(seenC.has(key)) return false;
              seenC.set(key,1); return true;
            });
          }
          // monedas: por nombre
          if(Array.isArray(data.monedas)){
            var seenM=new Set();
            data.monedas = data.monedas.filter(function(m){
              var v=norm(m); if(seenM.has(v)) return false; seenM.add(v); return true;
            });
          }
        }
      }catch(e){ console.warn('import dedupe', e); }
      var res = await _imp(data, opts);
      try{ sortState(); if(typeof renderAll==='function') renderAll(); }catch(_){}
      return res;
    };
    window.__importAllWrapped = true;
  }



// === [exports for patches stable] ===
try{
  if (typeof renderResumen === 'function') window.renderResumen = renderResumen;
  if (typeof renderAll === 'function') window.renderAll = renderAll;
  if (typeof drawPieChart === 'function') window.drawPieChart = drawPieChart;
  if (typeof drawBarChart === 'function') window.drawBarChart = drawBarChart;
  if (typeof loadAll === 'function') window.loadAll = loadAll;
  if (typeof updateCuenta === 'function') window.updateCuenta = updateCuenta;
  if (typeof addCuenta === 'function') window.addCuenta = addCuenta;
  if (typeof delCuenta === 'function') window.delCuenta = delCuenta;
  if (typeof addGasto === 'function') window.addGasto = addGasto;
  if (typeof updateGasto === 'function') window.updateGasto = updateGasto;
  if (typeof delGasto === 'function') window.delGasto = delGasto;
  if (typeof state === 'object') window.state = state;
} catch(e){}

})();