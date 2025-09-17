
// patch-349v7-budget.js
(function(){
  const PATCH_VER = "349v7";
  const LS_KEY = "presupuestos_por_cuenta_v2";
  const SS_KEY = "presupuestos_por_cuenta_v2";
  // tiny logger
  const log = (...a) => console.log("[budget v" + PATCH_VER + "]", ...a);

  // Format & parse helpers
  const fmtCurrency = (n, currency) => {
    try { return new Intl.NumberFormat('es-ES', {style:'currency', currency: currency || 'EUR'}).format(n); }
    catch(e){ return n.toFixed(2) + " " + (currency||"EUR"); }
  };
  const parseMoney = (txt) => {
    if (!txt) return null;
    // standardize Spanish money: remove dots as thousands; replace comma by dot
    let t = (""+txt).trim().replace(/\s/g,"");
    // strip currency symbols/letters
    t = t.replace(/[€A-Za-z]/g, "");
    // normalize thousands/decimal
    t = t.replace(/\./g,"").replace(",", ".");
    let v = parseFloat(t);
    return Number.isFinite(v) ? v : null;
  };

  const readStorage = () => {
    try {
      let raw = localStorage.getItem(LS_KEY) || sessionStorage.getItem(SS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : null;
    } catch(_) { return null; }
  };
  const writeStorage = (obj) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
      sessionStorage.setItem(SS_KEY, JSON.stringify(obj));
      log("Presupuestos guardados:", obj);
    } catch(e){ console.warn("No pude guardar presupuestos:", e); }
  };

  const findTablesWithHeaders = () => {
    return [...document.querySelectorAll("table")].map(t => {
      const heads = [...t.querySelectorAll("thead th")].map(th => th.textContent.trim().toLowerCase());
      return {table: t, heads};
    });
  };

  // Detect CONFIGURACIÓN → CUENTAS table and capture budgets
  const captureFromConfig = () => {
    const cands = findTablesWithHeaders();
    // Expect something like: ['cuenta','moneda','saldo','presupuesto','acciones']
    const target = cands.find(x => x.heads.includes("cuenta") && x.heads.includes("presupuesto") && x.heads.includes("saldo"));
    if (!target) return false;
    const t = target.table;
    const rows = [...t.querySelectorAll("tbody tr")];
    const idxCuenta = target.heads.indexOf("cuenta");
    const idxMoneda = target.heads.indexOf("moneda");
    const idxPresu = target.heads.indexOf("presupuesto");
    if (idxCuenta < 0 || idxPresu < 0) return false;

    const map = {};
    rows.forEach(tr => {
      const tds = tr.children;
      const nombre = (tds[idxCuenta]?.textContent || "").trim();
      const presuTxt = (tds[idxPresu]?.textContent || "").trim();
      const monedaTxt = idxMoneda >= 0 ? (tds[idxMoneda]?.textContent || "").trim() : "EUR";
      if (!nombre) return;
      const v = parseMoney(presuTxt);
      if (v != null) {
        map[nombre.toLowerCase()] = { presupuesto: v, moneda: monedaTxt || "EUR" };
      }
    });
    if (Object.keys(map).length) writeStorage(map);
    return Object.keys(map).length > 0;
  };

  // Apply budgets to RESUMEN table "Desglose por cuenta / forma de pago"
  const applyToResumen = () => {
    const cands = findTablesWithHeaders();
    // Expect something like: ['cuenta','moneda','gastado','presupuesto','%']
    const target = cands.find(x => x.heads.includes("cuenta") && x.heads.includes("gastado") && x.heads.some(h => h.includes("presupuesto")));
    if (!target) return false;
    const t = target.table;
    const rows = [...t.querySelectorAll("tbody tr")];
    const idxCuenta = target.heads.indexOf("cuenta");
    const idxMoneda = target.heads.indexOf("moneda");
    const idxGastado = target.heads.indexOf("gastado");
    const idxPresu = target.heads.findIndex(h => h.includes("presupuesto"));
    const idxPct = target.heads.findIndex(h => h.includes("%"));
    if (idxCuenta < 0 || idxPresu < 0) return false;

    // load storage
    const store = readStorage() || {};
    let touched = 0;
    rows.forEach(tr => {
      const tds = tr.children;
      const nombre = (tds[idxCuenta]?.textContent || "").trim().toLowerCase();
      if (!nombre) return;
      const monedaCell = idxMoneda >= 0 ? (tds[idxMoneda]?.textContent || "").trim() : "EUR";
      const gastoTxt = idxGastado >= 0 ? (tds[idxGastado]?.textContent || "").trim() : "0";
      const gasto = parseMoney(gastoTxt) || 0;

      // budget from store
      const rec = store[nombre];
      const presu = rec ? rec.presupuesto : null;
      const currency = (rec && rec.moneda) || monedaCell || "EUR";

      if (presu != null) {
        if (tds[idxPresu]) tds[idxPresu].textContent = fmtCurrency(presu, currency);
        if (idxPct >= 0 && tds[idxPct]) {
          const pct = presu > 0 ? Math.round((gasto / presu) * 1000) / 10 : null;
          tds[idxPct].textContent = pct != null ? (pct.toFixed(1).replace(".", ",") + " %") : "—";
        }
        touched++;
      }
    });
    if (touched) log("Presupuestos aplicados en", touched, "filas.");
    return touched > 0;
  };

  // Observer to keep table updated (filters/redraws)
  let resumenObserver = null;
  const ensureObserver = () => {
    if (resumenObserver) return;
    const t = document.querySelector("table");
    if (!t) return;
    resumenObserver = new MutationObserver(() => {
      // debounce minimal
      clearTimeout(ensureObserver._t);
      ensureObserver._t = setTimeout(applyToResumen, 60);
    });
    resumenObserver.observe(t.parentElement || t, { childList: true, subtree: true });
  };

  const init = () => {
    // capture from config if available
    captureFromConfig();
    // apply to resumen if present
    const ok = applyToResumen();
    if (ok) ensureObserver();
    // expose for debug
    window.__budgetPatchVersion = PATCH_VER;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
