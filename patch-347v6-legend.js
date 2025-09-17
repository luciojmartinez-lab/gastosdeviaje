// patch-347v6-legend: normaliza leyenda del pastel a "Categoría · Subcategoría"
(function(){
  if (window.__patch_347v6_legend__) return; window.__patch_347v6_legend__ = true;
  function splitLabel(t){
    if (!t) return null;
    const m = String(t).match(/^(.+?)\s*[-·]\s*(.+)$/);
    return m ? [m[1].trim(), m[2].trim()] : null;
  }
  function beautify(){
    const root = document.getElementById('chart-cat');
    if (!root) return;
    root.querySelectorAll('li, .legend-item, span, div').forEach(n=>{
      const txt = (n.textContent||'').trim();
      const m = splitLabel(txt);
      if (m) n.textContent = m[0]+' · '+m[1];
    });
  }
  const rp = window.renderResumen;
  if (typeof rp==='function' && !rp.__v347v6_legend){
    window.renderResumen = function(){ const r = rp.apply(this, arguments); requestAnimationFrame(beautify); return r; };
    window.renderResumen.__v347v6_legend = true;
  }
  const dp = window.drawPieChart;
  if (typeof dp==='function' && !dp.__v347v6_legend){
    window.drawPieChart = function(){ const o = dp.apply(this, arguments); requestAnimationFrame(beautify); return o; };
    window.drawPieChart.__v347v6_legend = true;
  }
})();