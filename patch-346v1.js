// patch-346v1: Fix export duplicated clicks (solo este cambio). Basado en 344v6.4 estable.
(function(){
  if (window.__patch_346v1__) return; window.__patch_346v1__=true;
  const $ = (s)=>document.querySelector(s);

  function ensureBadge(){
    try{
      const host = document.querySelector('header') || document.querySelector('main') || document.body;
      let b = document.getElementById('version-badge-346');
      if(!b){ b = document.createElement('div'); b.id='version-badge-346';
        b.style.cssText='position:sticky;top:12px;left:12px;background:#0f172a;color:#fff;padding:6px 10px;border-radius:16px;font-weight:600;z-index:9999;display:inline-block';
        host.prepend(b);
      }
      b.textContent = 'Versión: 346 v1';
    }catch(e){}
  }

  // Reemplaza #btn-export para garantizar UN solo handler de click y bloquear futuros añadidos
  function fixSingleExportButton(){
    const old = document.getElementById('btn-export');
    if (!old) return;
    // si ya está parcheado, nada
    if (old.__v346v1) return;

    // Clonar para eliminar listeners existentes (del bundle)
    const btn = old.cloneNode(true);
    old.parentNode.replaceChild(btn, old);
    btn.__v346v1 = true;

    // Bloquea futuros addEventListener('click', ...) sobre ESTE botón
    const origAdd = btn.addEventListener.bind(btn);
    btn.addEventListener = function(type, fn, opts){
      if (type === 'click') {
        // Ignorar suscripciones externas; ya tenemos nuestro handler
        return;
      }
      return origAdd(type, fn, opts);
    };

    // Nuestro único click handler (con guardado anti-doble)
    let exporting = false;
    btn.addEventListenerOriginal = origAdd; // por si queremos añadir otros eventos en el futuro
    origAdd('click', async function(ev){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (exporting) return;
      exporting = true;
      try{
        if (typeof window.exportAll === 'function'){
          const data = await window.exportAll();
          const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'gastos_backup.json';
          a.click();
          setTimeout(()=> URL.revokeObjectURL(a.href), 1500);
        } else {
          alert('Exportación: función exportAll no disponible');
        }
      }catch(e){
        console.error('[346v1] Error exportando:', e);
        alert('No se pudo exportar.');
      }finally{
        // pequeña pausa para evitar doble clic muy rápido; tras eso, permite exportar de nuevo
        setTimeout(()=>{ exporting = false; }, 800);
      }
    }, true); // captura para frenar cualquier otro handler en burbuja
  }

  // Ejecuta ahora y también después de cada renderAll (para reenganchar si re-crean el botón)
  function hook(){
    fixSingleExportButton();
    if (typeof window.renderAll === 'function' && !window.renderAll.__v346v1){
      const orig = window.renderAll;
      window.renderAll = function(){
        const r = orig.apply(this, arguments);
        const after = ()=> fixSingleExportButton();
        return (r && typeof r.then==='function') ? r.then(x=>{ after(); return x; }) : (after(), r);
      };
      window.renderAll.__v346v1 = true;
    }
  }

  ensureBadge();
  hook();
  console.log('[346v1] parche aplicado: export único garantizado');
})();