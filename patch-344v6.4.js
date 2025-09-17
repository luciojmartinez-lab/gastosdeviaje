// patch-344v6.4: Import V2 (remapeo, sin duplicados) para 3.4.4 + override Resumen estable
(function(){
  if (window.__patch_344v64__) return; window.__patch_344v64__=true;
  const VER='Versión: 344v6.4'; const log=(...a)=>console.log('[344v6.4]',...a);
  const $=(s,sc)=> (sc||document).querySelector(s); const $$=(s,sc)=> Array.from((sc||document).querySelectorAll(s));

  function ensureBadge(){
    try{ let host = $('#view-gastos')||document.querySelector('main')||document.body;
      let b=document.getElementById('version-badge-344');
      if(!b){ b=document.createElement('div'); b.id='version-badge-344';
        b.style.cssText='position:sticky;top:0;left:0;z-index:9999;padding:6px 10px;margin:6px;background:#eef6ff;border:1px solid #cfe3ff;border-radius:8px;font-size:12px;font-weight:600;display:inline-block;';
        host.prepend(b);
      } b.textContent=VER;
    }catch(e){}
  }

  // ===== override Resumen (de 344v6) – mantiene selección y calcula con ella =====
  function uniq(a){ const m={}; const out=[]; for(const v of a){ if(v==null) continue; const k=String(v); if(!m[k]){ m[k]=1; out.push(v);} } return out; }
  function fmtCur(n,m){ try{ return (window.fmtCurrency? fmtCurrency(n,m): (Number(n||0).toFixed(2)+' '+(m||''))); }catch(e){ return Number(n||0).toFixed(2)+' '+(m||''); } }
  function renderResumenOverride(){
    let selMon = $('#r-moneda'), selCta = $('#r-cuenta'); const prevMon = selMon? selMon.value:''; const prevCta = selCta? selCta.value:'';
    window.state = window.state||{gastos:[],cuentas:[],categorias:[]};
    const gastos=state.gastos||[], cuentas=state.cuentas||[], cats=state.categorias||[];

    // KPIs
    try{
      if(!gastos.length){ $('#kpi-total')&&($('#kpi-total').textContent='0,00'); $('#kpi-media')&&($('#kpi-media').textContent='0,00'); $('#kpi-presu')&&($('#kpi-presu').textContent='0%'); }
      else{
        const porMon={}; gastos.forEach(g=>porMon[g.moneda]=(porMon[g.moneda]||0)+(+g.importe||0));
        const totalTxt = Object.keys(porMon).map(m=>fmtCur(porMon[m],m)).join(' + ');
        $('#kpi-total')&&($('#kpi-total').textContent=totalTxt);
        const fechas=gastos.map(g=> new Date(g.fecha)); const minF=new Date(Math.min(...fechas)), maxF=new Date(Math.max(...fechas));
        const days=Math.max(1, Math.ceil((maxF-minF)/86400000)+1); const base=(porMon['EUR']||0);
        $('#kpi-media')&&($('#kpi-media').textContent=(base/days).toFixed(2)+' EUR/día (ref.)');
        const pcts=cuentas.map(c=>{ const tot=gastos.filter(g=>g.cuentaId===c.id).reduce((a,b)=>a+(+b.importe||0),0); return c.presupuesto? Math.min(100,(tot*100/c.presupuesto)) : 0; });
        const avg=pcts.length? (pcts.reduce((a,b)=>a+b,0)/pcts.length):0;
        $('#kpi-presu')&&($('#kpi-presu').textContent=avg.toFixed(0)+'%');
      }
    }catch(e){}
    // repoblar selects + preservar selección
    try{
      selMon=$('#r-moneda'); if(selMon){ selMon.innerHTML=''; const o0=document.createElement('option'); o0.value=''; o0.textContent='(todas)'; selMon.appendChild(o0);
        uniq(gastos.map(g=>g.moneda)).forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; selMon.appendChild(o); });
        if(prevMon && Array.prototype.some.call(selMon.options,op=>op.value===prevMon)) selMon.value=prevMon;
      }
      selCta=$('#r-cuenta'); if(selCta){ selCta.innerHTML=''; const p0=document.createElement('option'); p0.value=''; p0.textContent='(todas)'; selCta.appendChild(p0);
        cuentas.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; selCta.appendChild(o); });
        if(prevCta && Array.prototype.some.call(selCta.options,op=>String(op.value)===String(prevCta))) selCta.value=prevCta;
      }
    }catch(e){}
    const mon=selMon? selMon.value:''; const cta=selCta? selCta.value:'';
    const gastosFil = gastos.filter(g=> (!mon || g.moneda===mon) && (!cta || g.cuentaId===(+cta)) );
    try{
      const rows={}; gastosFil.forEach(g=>{ const cat=cats.find(c=>c.id===g.catId)||{nombre:'(sin cat)'}; const sub=cats.find(c=>c.id===g.subcatId)||{nombre:'(sin subcat)'}; const key=(cat.nombre||'(sin cat)')+'||'+(sub.nombre||'(sin subcat)'); rows[key]=(rows[key]||0)+(+g.importe||0); });
      const arr=Object.keys(rows).map(k=>{ const p=k.split('||'); return {cat:p[0],sub:p[1],total:rows[k]}; }).sort((a,b)=>b.total-a.total);
      const tb=$('#tabla-cat tbody'); if(tb){ tb.innerHTML=''; arr.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML='<td>'+r.cat+'</td><td>'+r.sub+'</td><td>'+(mon? fmtCur(r.total,mon): r.total.toFixed(2))+'</td>'; tb.appendChild(tr); }); }
      if(window.drawPieChart){ const data=arr.slice(0,6).map(r=>({label:r.cat+(r.sub!=='(sin subcat)'?' · '+r.sub:''), value:r.total})); drawPieChart($('#chart-cat'), data); }
    }catch(e){}
    try{
//codex/analyze-budget-update-issue-in-bar-chart-l8rb2r
      const cuentasElegidas = !cta ? cuentas : cuentas.filter(c=> String(c.id)===String(cta));
      const cuentasResumen = cuentasElegidas.length ? cuentasElegidas : cuentas;
      const porC=cuentasResumen.map(c=>{ const tot=gastosFil.filter(g=>g.cuentaId===c.id && (!mon || g.moneda===c.moneda)).reduce((a,b)=>a+(+b.importe||0),0); const pres=+c.presupuesto>0? +c.presupuesto:0; const pct=pres? Math.min(100,(tot*100/pres)) : 0; return {label:c.nombre,moneda:c.moneda,total:tot,presupuesto:pres,pct:+pct.toFixed(1)}; }).sort((a,b)=>b.total-a.total);
// main
      const tb=$('#tabla-cuenta tbody'); if(tb){ tb.innerHTML=''; porC.forEach(r=>{ const cur=r.moneda||mon||'EUR'; const tr=document.createElement('tr'); const presTxt=r.presupuesto? fmtCur(r.presupuesto,cur):'–'; tr.innerHTML='<td>'+r.label+'</td><td>'+(r.moneda||'—')+'</td><td>'+fmtCur(r.total,cur)+'</td><td>'+presTxt+'</td><td>'+((r.pct||0))+'%</td>'; tb.appendChild(tr); }); }
      if(window.drawBarChart){ drawBarChart($('#chart-cuenta'), porC.map(x=>({label:x.label,value:x.total}))); }
    }catch(e){}
    try{ $('#r-moneda')&&($('#r-moneda').onchange=renderResumen); $('#r-cuenta')&&($('#r-cuenta').onchange=renderResumen); }catch(e){}
  }
  if (!window.__orig_renderResumen) window.__orig_renderResumen = window.renderResumen;
  window.renderResumen = renderResumenOverride;

  // ===== Import V2 para 3.4.4 (sin DB.* global) =====
  const norm = (s)=> (s==null?'':String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const byId = (arr)=> new Map((arr||[]).map(x=>[x.id,x]));
  function catKeyFor(c, inBy){
    let p=''; if(c.parentId){ const pa=inBy.get(c.parentId); p=pa?pa.nombre:(c.parentNombre||''); }
    return norm(p)+'|'+norm(c.nombre);
  }

  async function openDB_safe(){ try{ return await (window.openDB && window.openDB()); }catch(e){ return null; } }
  async function clearStores(){
    const db = await openDB_safe(); if(!db) return;
    await new Promise(res=>{ const t=db.transaction(['cuentas','categorias','gastos'],'readwrite');
      t.objectStore('cuentas').clear(); t.objectStore('categorias').clear(); t.objectStore('gastos').clear(); t.oncomplete=()=>res(true); t.onerror=()=>res(true); });
  }

  async function importV2Core_stable(data,{mode='replace'}={}){
    data = data||{};
    data.categorias = Array.isArray(data.categorias)? data.categorias: [];
    data.cuentas    = Array.isArray(data.cuentas)? data.cuentas: [];
    data.monedas    = Array.isArray(data.monedas)? data.monedas: [];
    data.gastos     = Array.isArray(data.gastos)? data.gastos: [];

    // 0) normaliza parentNombre ausente
    const inBy = byId(data.categorias);
    data.categorias.forEach(c=>{ if(c.parentId && !c.parentNombre){ const p=inBy.get(c.parentId); if(p) c.parentNombre=p.nombre; } });

    // 1) reemplazo duro si se pide
    if (mode==='replace'){
      await clearStores();
      if (window.state){ state.categorias=[]; state.cuentas=[]; state.gastos=[]; }
    }

    // 2) existentes para detectar duplicados (si no replace)
    const exCats = await (window.getCategorias? window.getCategorias(): Promise.resolve([]));
    const exCtas = await (window.getCuentas? window.getCuentas(): Promise.resolve([]));
    const exBy = byId(exCats);
    const exCatKeyToId = new Map(exCats.map(c=>[catKeyFor(c,exBy), c.id]));
    const exCtaKeyToId = new Map(exCtas.map(ct=>[norm(ct.nombre)+'|'+norm(ct.moneda||''), ct.id]));

    // 3) cuentas
    for(const ct of data.cuentas){
      const k=norm(ct.nombre)+'|'+norm(ct.moneda||'');
      if (mode==='merge' && exCtaKeyToId.has(k)) continue;
      const id = await window.addCuenta({nombre:ct.nombre,moneda:ct.moneda,saldoInicial:ct.saldoInicial||0,presupuesto:ct.presupuesto||0,nota:ct.nota||''});
      exCtaKeyToId.set(k, id);
    }

    // 4) categorías padres → hijos (orden jerárquico y alfabético)
    function depthOf(c){ let d=0,p=c; const seen=new Set(); while(p && p.parentId && !seen.has(p.id)){ seen.add(p.id); p=inBy.get(p.parentId); d++; if(d>50) break; } return d; }
    const inCats = data.categorias.slice().sort((a,b)=>{
      const pa=norm(a.parentNombre||''), pb=norm(b.parentNombre||'');
      if(pa!==pb) return pa.localeCompare(pb,'es',{sensitivity:'base'});
      const da=depthOf(a), db=depthOf(b); if(da!==db) return da-db;
      return norm(a.nombre).localeCompare(norm(b.nombre),'es',{sensitivity:'base'});
    });
    for(const c of inCats){
      const k=catKeyFor(c,inBy);
      if (mode==='merge' && exCatKeyToId.has(k)) continue;
      let parentIdNew=null;
      if (c.parentNombre){
        const kP = norm(c.parentNombre)+'|'+norm(c.parentNombre); // clave de padre usa su propio nombre
        // mejor: buscar por nombre exacto del padre ya añadido
        for(const [ck,id] of exCatKeyToId){ const parts=ck.split('|'); if(parts[0]==='' && parts[1]===norm(c.parentNombre)){ parentIdNew=id; break; } }
      }
      const id = await window.addCategoria({nombre:c.nombre, parentId: parentIdNew});
      exCatKeyToId.set(k, id);
    }

    // 5) gastos (remapeando cat/sub/cuenta por claves)
    let fallbackCuentaId=null; for(const [k,v] of exCtaKeyToId){ fallbackCuentaId=v; break; }
    let ok=0, fail=0;
    for (const g of data.gastos){
      const catIn=inBy.get(g.catId||-1), subIn=inBy.get(g.subcatId||-1);
      const kCat = catIn ? catKeyFor(catIn,inBy) : null;
      const kSub = subIn ? catKeyFor(subIn,inBy) : null;
      let catIdNew = kCat ? exCatKeyToId.get(kCat) : null;
      let subIdNew = kSub ? exCatKeyToId.get(kSub) : null;
      if(!catIdNew && subIdNew){
        const now = await window.getCategorias(); const s=now.find(x=>x.id===subIdNew); if(s && s.parentId) catIdNew=s.parentId;
      }
      let cuentaIdNew=null;
      if(typeof g.cuentaId==='number'){
        const cta = data.cuentas.find(x=>x.id===g.cuentaId);
        if(cta){ const k=norm(cta.nombre)+'|'+norm(cta.moneda||''); cuentaIdNew=exCtaKeyToId.get(k)||null; }
      }
      if(!cuentaIdNew) cuentaIdNew=fallbackCuentaId;
      try{
        await window.addGasto({fecha:g.fecha, cuentaId:cuentaIdNew, moneda:g.moneda, catId:catIdNew, subcatId:subIdNew, importe:g.importe, desc:g.desc||''});
        ok++;
      }catch(e){ fail++; }
    }
    if (typeof window.loadAll==='function') await window.loadAll();
    try{ window.renderResumen && window.renderResumen(); }catch(e){}
    log('import resumen =>',{cats:data.categorias.length,cuentas:data.cuentas.length,gastos:{ok,fail}});
  }

  function replaceNodeAndAttachSingleHandler(){
    const fi0 = document.getElementById('file-import');
    const bi0 = document.getElementById('btn-import');
    if (fi0 && !fi0.__v64){
      const fi = fi0.cloneNode(true); fi0.parentNode.replaceChild(fi, fi0);
      fi.__v64=true;
      fi.addEventListener('change', async (ev)=>{
        ev.stopImmediatePropagation(); ev.preventDefault();
        const f = fi.files && fi.files[0]; if(!f) return;
        try{
          const txt = await f.text(); const obj = JSON.parse(txt);
          const mode='replace'; // reemplazo duro, sin duplicados
          await importV2Core_stable(obj,{mode});
          alert('Importación completada (reemplazo, v6.4)');
        }catch(err){ alert('Error importando: '+err); }
        finally{ setTimeout(()=>{ fi.value=''; }, 200); }
      }, true); // captura
    }
    if (bi0 && !bi0.__v64){
      const bi = bi0.cloneNode(true); bi0.parentNode.replaceChild(bi, bi0);
      bi.__v64=true;
      bi.addEventListener('click', (e)=>{ e.preventDefault(); e.stopImmediatePropagation(); const fi=document.getElementById('file-import'); if(fi) fi.click(); }, true);
    }
    // Export: prevenir doble
    const be0 = document.getElementById('btn-export');
    if (be0 && !be0.__v64){
      const be = be0.cloneNode(true); be0.parentNode.replaceChild(be, be0);
      be.__v64=true;
      be.addEventListener('click', (e)=>{
        const now=Date.now();
        if (be.__lock && (now-be.__lock)<1500){ e.preventDefault(); e.stopImmediatePropagation(); return false; }
        be.__lock=now;
      }, true);
    }
  }

  ensureBadge();
  replaceNodeAndAttachSingleHandler();
  // reenganchar tras renderAll
  if (typeof window.renderAll==='function' && !window.renderAll.__v64){
    const orig = window.renderAll;
    window.renderAll = function(){
      const r = orig.apply(this, arguments);
      const after = ()=>{ replaceNodeAndAttachSingleHandler(); };
      return (r && typeof r.then==='function') ? r.then(x=>{ after(); return x; }) : (after(), r);
    };
    window.renderAll.__v64 = true;
  }

  console.log('[344v6.4] activo (Import V2 estable + override Resumen + anti-doble import/export)');
})();