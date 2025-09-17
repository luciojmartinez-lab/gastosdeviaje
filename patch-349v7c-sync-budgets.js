// patch-349v7c-sync-budgets: actualiza la tabla de Resumen (Gastado/Presupuesto/%) sin reload al cambiar gastos/cuentas
(function(){
  if (window.__patch_349v7c_sync_budgets__) return; window.__patch_349v7c_sync_budgets__=true;
  const norm = s=> (s||'').toString().trim().toLowerCase();
  const parseMoney = (txt)=>{
    if (!txt) return 0;
    const t = (txt+'').replace(/\s/g,'').replace(/[€]/g,'').replace(/\./g,'').replace(',', '.');
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  };
  const fmt = (n, cur) => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:cur||'EUR'}).format(n); }
    catch(e){ return (n||0).toFixed(2)+' '+(cur||'EUR'); }
  };

  function getResumenFilters(){
    const q = (sel)=> document.querySelector(sel);
    const byId = id => (q('#'+id) && q('#'+id).value) || null;
    const cuenta = byId('r-cuenta') || '';
    const moneda = byId('r-moneda') || '';
    const desde = (q('#r-desde') && q('#r-desde').value) || '';
    const hasta = (q('#r-hasta') && q('#r-hasta').value) || '';
    return { cuenta, moneda, desde:desde? new Date(desde):null, hasta: hasta? new Date(hasta):null };
  }

  function dateInRange(d, desde, hasta){
    if (!(d instanceof Date) || isNaN(d)) return true;
    if (desde && d < desde) return false;
    if (hasta){
      const h = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 23,59,59,999);
      if (d > h) return false;
    }
    return true;
  }

  function recomputeGastadoPorCuenta(){
    if (!window.state) return {};
    const {cuenta, moneda, desde, hasta} = getResumenFilters();
    const acc = {};
    (window.state.gastos||[]).forEach(g=>{
      const d = new Date(g.fecha);
      if (!dateInRange(d, desde, hasta)) return;
      if (moneda && g.moneda!==moneda) return;
      const c = (window.state.cuentas||[]).find(x=> x.id===g.cuentaId);
      if (!c) return;
      if (cuenta && +cuenta!==c.id) return;
      const key = norm(c.nombre);
      acc[key] = (acc[key]||0) + (+g.importe||0);
    });
    return acc;
  }

  function findResumenAccountsTable(){
    const tbl = document.querySelector('#view-resumen table');
    if (!tbl) return null;
    const heads = Array.from(tbl.querySelectorAll('thead th')).map(th=> norm(th.textContent));
    const idxCuenta = heads.indexOf('cuenta');
    const idxMoneda = heads.indexOf('moneda');
    const idxGastado = heads.indexOf('gastado');
    let idxPresu = heads.findIndex(h=> h.includes('presupuesto'));
    let idxPct   = heads.findIndex(h=> /%/.test(h));
    if (idxCuenta<0 || idxGastado<0) return null;
    return {tbl, heads, idxCuenta, idxMoneda, idxGastado, idxPresu, idxPct};
  }

  function applySync(){
    const info = findResumenAccountsTable(); if(!info) return;
    const {tbl, idxCuenta, idxMoneda, idxGastado, idxPresu, idxPct} = info;
    const sumBy = recomputeGastadoPorCuenta();
    const cuentas = Array.isArray(window.state?.cuentas) ? window.state.cuentas : [];
    Array.from(tbl.querySelectorAll('tbody tr')).forEach(tr=>{
      const tds = tr.children;
      const name = norm(tds[idxCuenta]?.textContent);
      if (!name) return;
      const c = cuentas.find(x=> norm(x.nombre)===name);
      if (!c) return;
      const moneda = c.moneda || (idxMoneda>=0 ? (tds[idxMoneda]?.textContent||'').trim() : 'EUR');
      const gast = sumBy[name] || 0;
      tds[idxGastado].textContent = fmt(gast, moneda);
      const presu = +c.presupuesto || 0;
      if (idxPresu>=0) tds[idxPresu].textContent = presu ? fmt(presu, moneda) : '—';
      if (idxPct>=0)   tds[idxPct].textContent   = presu ? Math.min(100, Math.round((gast*100)/presu)) + ' %' : '—';
    });
  }

  function hook(fn){
    const orig = window[fn];
    if (typeof orig==='function' && !orig.__v349v7c){
      window[fn] = async function(){
        const r = await orig.apply(this, arguments);
        setTimeout(applySync, 0);
        return r;
      };
      window[fn].__v349v7c = true;
    }
  }
  ['addGasto','updateGasto','delGasto','addCuenta','updateCuenta','delCuenta','loadAll'].forEach(hook);
  ['#r-cuenta','#r-moneda','#r-desde','#r-hasta'].forEach(sel=>{
    const el = document.querySelector(sel);
    if (el && !el.__v349v7c) { el.addEventListener('change', ()=> setTimeout(applySync, 0)); el.__v349v7c = true; }
  });
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=> setTimeout(applySync,0), {once:true});
  else setTimeout(applySync,0);
})();