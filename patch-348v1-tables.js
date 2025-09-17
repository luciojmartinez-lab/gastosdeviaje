// patch-348v1-tables: arregla filas de categorías (3 columnas) y rellena tabla de cuentas (con presupuesto)
(function(){
  if (window.__patch_348v1_tables__) return; window.__patch_348v1_tables__ = true;

  // Captura datasets reales de los gráficos
  let lastPie = null, lastBar = null;
  ['drawPieChart','drawBarChart'].forEach(fn=>{
    const orig = window[fn];
    if (typeof orig === 'function' && !orig.__v348v1_capture){
      window[fn] = function(container, data){
        if (fn==='drawPieChart') lastPie = Array.isArray(data) ? data.slice() : null;
        if (fn==='drawBarChart') lastBar = Array.isArray(data) ? data.slice() : null;
        return orig.apply(this, arguments);
      };
      window[fn].__v348v1_capture = true;
    }
  });

  function guessCurrency(){
    const s = Array.from(document.querySelectorAll('select')).find(el => /^[A-Z]{3}$/.test((el.value||'').trim()));
    return (s && s.value) || 'EUR';
  }
  function fmt(n,cur){
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:cur||'EUR',maximumFractionDigits:2}).format(+n||0); }
    catch(e){ return (+n||0).toFixed(2)+(cur?' '+cur:''); }
  }
  const split = t => { const m = String(t||'').match(/^(.+?)\s*[-·]\s*(.+)$/); return m ? [m[1].trim(), m[2].trim()] : [String(t||'').trim(), '(sin subcategoría)']; };

  function fixCategoriesTable(){
    const tb = document.querySelector('#tabla-cat tbody'); if (!tb) return;
    const cur = guessCurrency();
    const rows = Array.from(tb.querySelectorAll('tr'));
    let changed = false;
    // Repara filas de 2 celdas → 3 celdas
    rows.forEach(tr=>{
      const tds = tr.querySelectorAll('td');
      if (tds.length===2){
        const [cat, sub] = split((tds[0].textContent||'').trim());
        tds[0].textContent = cat || '(sin categoría)';
        const tdSub = document.createElement('td'); tdSub.textContent = sub || '(sin subcategoría)';
        tr.insertBefore(tdSub, tds[1]); changed=true;
      }
    });
    // Si está vacía pero hay datos del pastel → la rellenamos
    if (!rows.length && Array.isArray(lastPie)){
      const frag = document.createDocumentFragment();
      lastPie.forEach(d=>{
        const [cat, sub] = split(d.label);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${cat}</td><td>${sub}</td><td>${fmt(d.value, cur)}</td>`;
        frag.appendChild(tr);
      });
      tb.appendChild(frag); changed=true;
    }
    // Ordenar
    if (changed){
      const all = Array.from(tb.querySelectorAll('tr'));
      all.sort((a,b)=>{
        const ac=a.children[0].textContent.trim(), as=a.children[1].textContent.trim();
        const bc=b.children[0].textContent.trim(), bs=b.children[1].textContent.trim();
        const c=ac.localeCompare(bc,'es'); return c!==0?c:as.localeCompare(bs,'es');
      });
      const frag=document.createDocumentFragment(); all.forEach(tr=>frag.appendChild(tr));
      tb.innerHTML=''; tb.appendChild(frag);
    }
  }

  function fillAccountsTable(){
    const tb = document.querySelector('#tabla-cuenta tbody'); if (!tb) return;
    if (tb.children.length) return;
    if (!Array.isArray(lastBar)||!lastBar.length) return;

    const st = window.state||{}; const cuentas = Array.isArray(st.cuentas)?st.cuentas:[];
    const cur = guessCurrency();
    const norm = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    const idx = new Map(cuentas.map(c=>[norm(c.nombre), c]));

    const frag = document.createDocumentFragment();
    lastBar.forEach(d=>{
      const name = d.label || '—';
      const cta = idx.get(norm(name));
      const moneda = (cta && cta.moneda) || cur;
      const presuVal = cta && +cta.presupuesto > 0 ? +cta.presupuesto : 0;   // siempre mostramos si existe
      const gasto = +d.value || 0;
      const pct = presuVal>0 && cta && cta.moneda === moneda ? Math.round((gasto/presuVal)*1000)/10 : null;

      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${name}</td><td>${moneda}</td><td>${fmt(gasto,moneda)}</td>`+
                     `<td>${presuVal?fmt(presuVal,moneda):'–'}</td><td>${pct!==null?(pct+'%'):'—'}</td>`;
      frag.appendChild(tr);
    });
    tb.appendChild(frag);
  }

  function apply(){ fixCategoriesTable(); fillAccountsTable(); }

  const rr = window.renderResumen;
  if (typeof rr==='function' && !rr.__v348v1_tables){
    window.renderResumen = function(){ const r = rr.apply(this, arguments); setTimeout(apply,0); return r; };
    window.renderResumen.__v348v1_tables = true;
  }
  ;['drawPieChart','drawBarChart'].forEach(fn=>{
    const orig = window[fn];
    if (typeof orig==='function' && !orig.__v348v1_tables){
      window[fn] = function(){ const out = orig.apply(this, arguments); setTimeout(apply,0); return out; };
      window[fn].__v348v1_tables = true;
    }
  });
})();