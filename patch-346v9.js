// patch-346v9: Badge pequeño y un poco más arriba (sobre 'Nuevo gasto').
(function(){
  if (window.__patch_346v9__) return; window.__patch_346v9__=true;
  const FALLBACK = 'Versión: 346 v9';

  async function readLabel(){
    try{
      const r = await fetch('version.txt', {cache:'no-store'});
      if (r.ok){
        const t = (await r.text()).trim();
        if (t) return t;
      }
    }catch(e){}
    return FALLBACK;
  }

  function hideOld(){
    ['version-badge','version-badge-344','version-badge-346'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.style.visibility = 'hidden';
    });
  }

  function findNuevoGastoContainer(){
    const hs = Array.from(document.querySelectorAll('h1,h2,h3'));
    const h = hs.find(x => /nuevo\s+gasto/i.test(x.textContent||''));
    if (!h) return null;
    let box = h.closest('.card, .panel, .box');
    if (!box) {
      let p = h.parentElement;
      while (p && p !== document.body) {
        if (p.tagName === 'DIV') { box = p; break; }
        p = p.parentElement;
      }
    }
    return box || h.parentElement;
  }

  function styleBadge(el){
    el.style.position = 'absolute';
    el.style.top = '-28px';        // un poco más arriba que v8
    el.style.left = '4px';
    el.style.background = '#0f172a';
    el.style.color = '#fff';
    el.style.padding = '4px 8px';  // más pequeño
    el.style.borderRadius = '12px';
    el.style.fontWeight = '600';
    el.style.fontSize = '12px';    // más pequeño
    el.style.lineHeight = '1';
    el.style.zIndex = '100';
    el.style.pointerEvents = 'none';
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,.15)';
  }

  function styleFallback(el){
    el.style.position = 'fixed';
    el.style.top = '68px';   // un poco por debajo del header azul
    el.style.left = '24px';
    el.style.background = '#0f172a';
    el.style.color = '#fff';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '12px';
    el.style.fontWeight = '600';
    el.style.fontSize = '12px';
    el.style.lineHeight = '1';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,.15)';
  }

  async function apply(){
    hideOld();
    const label = await readLabel();
    const host = findNuevoGastoContainer();
    if (!host) {
      let b = document.getElementById('version-fallback');
      if (!b){ b = document.createElement('div'); b.id = 'version-fallback'; document.body.appendChild(b); }
      styleFallback(b);
      b.textContent = label;
      return;
    }
    host.style.position = host.style.position || 'relative';
    let badge = document.getElementById('version-badge-inline');
    if (!badge){ badge = document.createElement('div'); badge.id = 'version-badge-inline'; host.prepend(badge); }
    styleBadge(badge);
    badge.textContent = label;
  }

  // Ejecuta en DOMContentLoaded (o ahora si ya cargó)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, {once:true});
  } else { apply(); }

  // Reaplica después de renderAll (por si se re-renderiza el bloque)
  if (typeof window.renderAll === 'function' && !window.renderAll.__v346v9){
    const orig = window.renderAll;
    window.renderAll = function(){
      const r = orig.apply(this, arguments);
      const after = () => apply();
      return (r && typeof r.then==='function') ? r.then(x=>{ after(); return x; }) : (after(), r);
    };
    window.renderAll.__v346v9 = true;
  }

  console.log('[346v9] badge pequeño colocado');
})();