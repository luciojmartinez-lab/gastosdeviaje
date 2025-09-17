
// [349v1] remove floating "versión" badges that can overlap UI (e.g., Configuración)
(() => {
  const isVersionBadge = (el) => {
    if (!el || !(el instanceof HTMLElement)) return false;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    // Only consider elements that are visually on the right side
    const r = el.getBoundingClientRect();
    const onRight = (r.left + r.width / 2) > (innerWidth * 0.6);
    if (!onRight) return false;
    // Heuristic: text contains "versión" / "version" and not huge blocks
    const txt = (el.textContent || '').toLowerCase();
    return /versi\u00f3n|version/.test(txt) && txt.length < 40;
  };

  const purge = () => {
    document.querySelectorAll('body *').forEach(el => {
      if (isVersionBadge(el)) {
        el.remove();
      }
    });
  };

  // Run after frame; also observe for late inserts
  const run = () => {
    purge();
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes && m.addedNodes.forEach(n => {
          if (n && n.nodeType === 1) {
            if (isVersionBadge(n)) n.remove();
            n.querySelectorAll && n.querySelectorAll('*').forEach(k => { if (isVersionBadge(k)) k.remove(); });
          }
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(run, 0);
  } else {
    addEventListener('DOMContentLoaded', run, { once: true });
  }
})();
