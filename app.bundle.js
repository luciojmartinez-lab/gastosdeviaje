const DB_NAME = 'gastos_viaje_db';
const DB_VERSION = 3;
const APP_VERSION = '500v13';
const BACKUP_KEY = 'gastos_viaje_last_backup';
let dbPromise = null;
let activeFormDialogSubmit = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cuentas')) {
        const s = db.createObjectStore('cuentas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byMoneda', 'moneda');
      }
      if (!db.objectStoreNames.contains('categorias')) {
        const s = db.createObjectStore('categorias', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byParent', 'parentId');
      }
      if (!db.objectStoreNames.contains('gastos')) {
        const s = db.createObjectStore('gastos', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byFecha', 'fecha');
        s.createIndex('byViaje', 'viajeId');
      } else {
        const s = req.transaction.objectStore('gastos');
        if (!s.indexNames.contains('byViaje')) s.createIndex('byViaje', 'viajeId');
      }
      if (!db.objectStoreNames.contains('viajes')) {
        const s = db.createObjectStore('viajes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byInicio', 'fechaInicio');
      }
      if (!db.objectStoreNames.contains('monedas')) {
        db.createObjectStore('monedas', { keyPath: 'codigo' });
      }
      if (!db.objectStoreNames.contains('transferencias')) {
        const s = db.createObjectStore('transferencias', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byFecha', 'fecha');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function store(name, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(name, mode).objectStore(name);
}

function getAll(name) {
  return store(name).then(s => new Promise((resolve, reject) => {
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function getOne(name, key) {
  return store(name).then(s => new Promise((resolve, reject) => {
    const req = s.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

async function addRecord(name, data) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(name, data) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.put(data);
    req.onsuccess = () => resolve(data);
    req.onerror = () => reject(req.error);
  });
}

async function updateRecord(name, key, patch) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.get(key);
    req.onsuccess = () => {
      if (!req.result) return reject(new Error('No existe'));
      const obj = { ...req.result, ...patch, updatedAt: new Date().toISOString() };
      const put = s.put(obj);
      put.onsuccess = () => resolve(obj);
      put.onerror = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteRecord(name, key) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function clearStores(names) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    names.forEach(name => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const BASE_MONEDAS = ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY'];
const DEFAULT_CUENTAS = [
  { nombre: 'Santander', moneda: 'EUR', saldoInicial: 0, presupuesto: 0 },
  { nombre: 'Efectivo', moneda: 'EUR', saldoInicial: 0, presupuesto: 0 },
  { nombre: 'Revolut', moneda: 'EUR', saldoInicial: 0, presupuesto: 0 }
];
const DEFAULT_CATEGORIAS = [
  { nombre: 'Comida', subs: ['Desayuno', 'Almuerzo', 'Cena'] },
  { nombre: 'Transporte', subs: ['Metro', 'Bus', 'Taxi'] },
  { nombre: 'Alojamiento', subs: [] },
  { nombre: 'Ocio', subs: [] }
];
const DEFAULT_MONEDAS = [
  { codigo: 'EUR', nombre: 'Euro', eurPorUnidad: 1, unidadesPorEuro: 1 }
];
const state = {
  activeTab: 'viajes',
  selectedViajeId: null,
  cuentas: [],
  categorias: [],
  gastos: [],
  viajes: [],
  monedas: [],
  transferencias: []
};

const collator = new Intl.Collator('es', { sensitivity: 'base' });
const todayIso = () => new Date().toISOString().slice(0, 10);
const numberValue = value => {
  const n = parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const formatRate = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number(n.toFixed(6)).toString();
};
const fmtDate = iso => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}) : '-';
const fmtCurrency = (amount, currency = 'EUR') => {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(numberValue(amount));
  } catch (_) {
    return `${numberValue(amount).toFixed(2)} ${currency}`;
  }
};
const formatCurrencyLines = items => items
  .filter(item => Math.abs(numberValue(item.amount)) > 0.000001 || item.always)
  .map(item => `<div>${fmtCurrency(item.amount, item.currency)}</div>`)
  .join('');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));

function byName(a, b) {
  return collator.compare(a.nombre || a.codigo || '', b.nombre || b.codigo || '');
}

function sortCategoriasHierarchical(categorias) {
  const parents = categorias.filter(c => !c.parentId).sort(byName);
  const children = categorias.filter(c => c.parentId);
  const ordered = [];
  parents.forEach(parent => {
    ordered.push(parent);
    children
      .filter(child => child.parentId === parent.id)
      .sort(byName)
      .forEach(child => ordered.push(child));
  });
  children
    .filter(child => !parents.some(parent => parent.id === child.parentId))
    .sort(byName)
    .forEach(child => ordered.push(child));
  return ordered;
}

function foreignCurrencies() {
  return state.monedas.filter(m => m.codigo !== 'EUR').sort(byName);
}

function allCurrencies() {
  return ['EUR', ...foreignCurrencies().map(m => m.codigo)];
}

function getCurrencyConfig(code) {
  if (code === 'EUR') return { codigo: 'EUR', eurPorUnidad: 1, unidadesPorEuro: 1 };
  return state.monedas.find(m => m.codigo === code) || null;
}

function hasValidCurrency(code) {
  const cfg = getCurrencyConfig(code);
  return !!cfg && numberValue(cfg.eurPorUnidad) > 0 && numberValue(cfg.unidadesPorEuro) > 0;
}

function toEur(amount, currency) {
  const cfg = getCurrencyConfig(currency);
  return cfg ? numberValue(amount) * numberValue(cfg.eurPorUnidad || 1) : 0;
}

function fromEur(amount, currency) {
  const cfg = getCurrencyConfig(currency);
  return cfg ? numberValue(amount) * numberValue(cfg.unidadesPorEuro || 1) : 0;
}

function setMessage(selector, text, isError = false) {
  const el = $(selector);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', isError);
}

function renderBackupStatus() {
  const items = $$('.backup-status');
  if (!items.length) return;
  const saved = localStorage.getItem(BACKUP_KEY);
  if (!saved) {
    items.forEach(el => {
      el.textContent = 'Aun no consta ningun backup en este dispositivo.';
      el.classList.add('backup-warning');
    });
    return;
  }
  const date = new Date(saved);
  const ageDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  items.forEach(el => {
    el.textContent = `Ultimo backup generado: ${date.toLocaleString('es-ES')}${ageDays >= 7 ? ` (hace ${ageDays} dias)` : ''}.`;
    el.classList.toggle('backup-warning', ageDays >= 7);
  });
}

function readFileData(input) {
  const file = input && input.files && input.files[0];
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || 'application/octet-stream', data: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ticketLink(gasto) {
  if (!gasto.ticketData) return '-';
  return `<a href="${escapeHtml(gasto.ticketData)}" target="_blank" rel="noopener">${escapeHtml(gasto.ticketName || 'Ver ticket')}</a>`;
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCurrentCsv() {
  const rows = filteredGastos();
  const header = ['Fecha', 'Viaje', 'Categoria', 'Subcategoria', 'Cuenta', 'Moneda', 'Importe', 'EUR', 'Descripcion', 'Ticket'];
  const lines = [header.map(csvCell).join(',')];
  const monthly = {};
  rows.forEach(g => {
    const trip = state.viajes.find(v => v.id === g.viajeId);
    const cat = state.categorias.find(c => c.id === g.catId);
    const sub = state.categorias.find(c => c.id === g.subcatId);
    const account = state.cuentas.find(c => c.id === g.cuentaId);
    const eur = toEur(g.importe, g.moneda);
    const month = (g.fecha || '').slice(0, 7) || 'sin fecha';
    monthly[month] = (monthly[month] || 0) + eur;
    lines.push([
      g.fecha,
      trip ? trip.nombre : '',
      cat ? cat.nombre : '',
      sub ? sub.nombre : '',
      account ? account.nombre : '',
      g.moneda,
      numberValue(g.importe).toFixed(2),
      eur.toFixed(2),
      g.desc || '',
      g.ticketName || ''
    ].map(csvCell).join(','));
  });
  lines.push('');
  lines.push(['Mes', 'Total EUR'].map(csvCell).join(','));
  Object.keys(monthly).sort().forEach(month => {
    lines.push([month, monthly[month].toFixed(2)].map(csvCell).join(','));
  });
  downloadText(`gastos_resumen_${APP_VERSION}_${todayIso()}.csv`, lines.join('\r\n'), 'text/csv;charset=utf-8');
}

function fillSelect(selector, options, placeholder) {
  const el = $(selector);
  const previous = el.value;
  el.innerHTML = '';
  if (placeholder !== null) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    el.appendChild(opt);
  }
  options.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    el.appendChild(opt);
  });
  if ([...el.options].some(o => o.value === previous)) el.value = previous;
}

async function addCuenta({ nombre, moneda, saldoInicial = 0, presupuesto = 0, nota = '' }) {
  const now = new Date().toISOString();
  return addRecord('cuentas', {
    nombre,
    moneda,
    saldoInicial: numberValue(saldoInicial),
    saldoActual: numberValue(saldoInicial),
    presupuesto: numberValue(presupuesto),
    nota,
    createdAt: now,
    updatedAt: now
  });
}

async function updateCuenta(id, patch) {
  return updateRecord('cuentas', Number(id), patch);
}

async function delCuenta(id) {
  return deleteRecord('cuentas', Number(id));
}

async function addCategoria({ nombre, parentId = null }) {
  return addRecord('categorias', { nombre, parentId: parentId ? Number(parentId) : null });
}

async function updateCategoria(id, patch) {
  return updateRecord('categorias', Number(id), patch);
}

async function delCategoria(id) {
  return deleteRecord('categorias', Number(id));
}

async function addViaje({ nombre, fechaInicio, fechaFin, presupuesto = 0 }) {
  const now = new Date().toISOString();
  return addRecord('viajes', { nombre, fechaInicio, fechaFin, presupuesto: numberValue(presupuesto), createdAt: now, updatedAt: now });
}

async function updateViaje(id, patch) {
  return updateRecord('viajes', Number(id), patch);
}

async function delViaje(id) {
  return deleteRecord('viajes', Number(id));
}

async function upsertMoneda({ codigo, nombre = '', eurPorUnidad, unidadesPorEuro }) {
  const code = String(codigo || '').trim().toUpperCase();
  if (!code || code === 'EUR') throw new Error('Usa un codigo extranjero distinto de EUR');
  const eur = numberValue(eurPorUnidad);
  const back = numberValue(unidadesPorEuro);
  if (eur <= 0 || back <= 0) throw new Error('Indica equivalencias mayores que cero');
  const now = new Date().toISOString();
  return putRecord('monedas', {
    codigo: code,
    nombre: nombre.trim(),
    eurPorUnidad: eur,
    unidadesPorEuro: back,
    updatedAt: now
  });
}

async function ensureBaseCurrency() {
  await putRecord('monedas', { ...DEFAULT_MONEDAS[0], updatedAt: new Date().toISOString() });
}

async function seedDefaultAccounts() {
  const existing = await getAll('cuentas');
  for (const account of DEFAULT_CUENTAS) {
    const found = existing.some(c => (c.nombre || '').trim().toLowerCase() === account.nombre.toLowerCase());
    if (!found) await addCuenta(account);
  }
}

async function seedDefaultCategories() {
  const existing = await getAll('categorias');
  for (const cat of DEFAULT_CATEGORIAS) {
    let parent = existing.find(c => !c.parentId && (c.nombre || '').trim().toLowerCase() === cat.nombre.toLowerCase());
    if (!parent) {
      const parentId = await addCategoria({ nombre: cat.nombre });
      parent = { id: parentId, nombre: cat.nombre, parentId: null };
      existing.push(parent);
    }
    for (const sub of cat.subs) {
      const found = existing.some(c => c.parentId === parent.id && (c.nombre || '').trim().toLowerCase() === sub.toLowerCase());
      if (!found) {
        const id = await addCategoria({ nombre: sub, parentId: parent.id });
        existing.push({ id, nombre: sub, parentId: parent.id });
      }
    }
  }
}

async function seedDefaults() {
  await ensureBaseCurrency();
  await seedDefaultAccounts();
  await seedDefaultCategories();
}

async function delMoneda(codigo) {
  return deleteRecord('monedas', String(codigo).toUpperCase());
}

async function addGasto({ fecha, viajeId, cuentaId, moneda, catId, subcatId = null, importe, desc = '', ticketName = '', ticketType = '', ticketData = '' }) {
  if (!hasValidCurrency(moneda)) throw new Error('Configura la equivalencia de esa moneda antes de usarla');
  const account = state.cuentas.find(c => c.id === Number(cuentaId));
  if (account && account.moneda !== moneda) throw new Error('La moneda del gasto debe coincidir con la cuenta');
  const amount = numberValue(importe);
  const now = new Date().toISOString();
  const id = await addRecord('gastos', {
    fecha,
    viajeId: viajeId ? Number(viajeId) : null,
    cuentaId: Number(cuentaId),
    moneda,
    catId: Number(catId),
    subcatId: subcatId ? Number(subcatId) : null,
    importe: amount,
    importeEur: toEur(amount, moneda),
    desc,
    ticketName,
    ticketType,
    ticketData,
    createdAt: now,
    updatedAt: now
  });
  if (account) {
    await updateCuenta(account.id, { saldoActual: +(numberValue(account.saldoActual) - amount).toFixed(2) });
  }
  return id;
}

async function updateGasto(id, patch) {
  const current = state.gastos.find(g => g.id === Number(id)) || await getOne('gastos', Number(id));
  if (!current) throw new Error('No existe el gasto');
  const next = { ...current, ...patch };
  next.viajeId = next.viajeId ? Number(next.viajeId) : null;
  next.cuentaId = Number(next.cuentaId);
  next.catId = Number(next.catId);
  next.subcatId = next.subcatId ? Number(next.subcatId) : null;
  const account = state.cuentas.find(c => c.id === next.cuentaId) || await getOne('cuentas', next.cuentaId);
  if (!account) throw new Error('La cuenta seleccionada no existe');
  next.moneda = account.moneda;
  if (!hasValidCurrency(next.moneda)) throw new Error('Configura la equivalencia de esa moneda antes de usarla');
  next.importe = numberValue(next.importe);
  if (next.importe <= 0) throw new Error('El importe debe ser mayor que cero');
  next.importeEur = toEur(next.importe, next.moneda);
  const saved = await updateRecord('gastos', Number(id), next);
  const oldAccount = await getOne('cuentas', Number(current.cuentaId));
  if (oldAccount) {
    await updateCuenta(oldAccount.id, { saldoActual: +(numberValue(oldAccount.saldoActual) + numberValue(current.importe)).toFixed(2) });
  }
  const newAccount = await getOne('cuentas', next.cuentaId);
  if (newAccount) {
    await updateCuenta(newAccount.id, { saldoActual: +(numberValue(newAccount.saldoActual) - next.importe).toFixed(2) });
  }
  return saved;
}

async function delGasto(id) {
  return deleteRecord('gastos', Number(id));
}

async function addTransferencia({ fecha, fromId, toId, importe, nota = '' }) {
  const source = state.cuentas.find(c => c.id === Number(fromId)) || await getOne('cuentas', Number(fromId));
  const target = state.cuentas.find(c => c.id === Number(toId)) || await getOne('cuentas', Number(toId));
  if (!source || !target) throw new Error('Selecciona cuenta de origen y destino');
  if (source.id === target.id) throw new Error('La cuenta de origen y destino no pueden ser la misma');
  if (!hasValidCurrency(source.moneda) || !hasValidCurrency(target.moneda)) throw new Error('Configura las monedas de las cuentas antes de transferir');
  const amountFrom = numberValue(importe);
  if (amountFrom <= 0) throw new Error('El importe debe ser mayor que cero');
  const eur = toEur(amountFrom, source.moneda);
  const amountTo = fromEur(eur, target.moneda);
  const now = new Date().toISOString();
  const id = await addRecord('transferencias', {
    fecha: fecha || todayIso(),
    fromId: source.id,
    toId: target.id,
    monedaFrom: source.moneda,
    monedaTo: target.moneda,
    importeFrom: amountFrom,
    importeTo: amountTo,
    importeEur: eur,
    nota: nota.trim(),
    createdAt: now,
    updatedAt: now
  });
  const freshSource = await getOne('cuentas', source.id);
  const freshTarget = await getOne('cuentas', target.id);
  await updateCuenta(source.id, { saldoActual: +(numberValue(freshSource.saldoActual) - amountFrom).toFixed(2) });
  await updateCuenta(target.id, { saldoActual: +(numberValue(freshTarget.saldoActual) + amountTo).toFixed(2) });
  return id;
}

async function delTransferencia(id) {
  const t = state.transferencias.find(item => item.id === Number(id)) || await getOne('transferencias', Number(id));
  if (!t) return false;
  const source = await getOne('cuentas', Number(t.fromId));
  const target = await getOne('cuentas', Number(t.toId));
  if (source) await updateCuenta(source.id, { saldoActual: +(numberValue(source.saldoActual) + numberValue(t.importeFrom)).toFixed(2) });
  if (target) await updateCuenta(target.id, { saldoActual: +(numberValue(target.saldoActual) - numberValue(t.importeTo)).toFixed(2) });
  return deleteRecord('transferencias', Number(id));
}

async function loadAll() {
  const [cuentas, categorias, gastos, viajes, monedas, transferencias] = await Promise.all([
    getAll('cuentas'),
    getAll('categorias'),
    getAll('gastos'),
    getAll('viajes'),
    getAll('monedas'),
    getAll('transferencias')
  ]);
  state.cuentas = cuentas.sort(byName);
  state.categorias = sortCategoriasHierarchical(categorias);
  state.gastos = gastos.map(g => ({ ...g, importeEur: g.importeEur ?? toEur(g.importe, g.moneda) }));
  state.viajes = viajes.sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || '') || byName(a, b));
  state.monedas = monedas.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  state.transferencias = transferencias.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  renderAll();
  if (state.activeTab === 'resumen') renderResumen();
}

function renderAll() {
  renderCurrencySelectors();
  renderAccountSelectors();
  renderTripSelectors();
  renderCategorySelectors();
  renderViajesHome();
  renderCuentas();
  renderTransferencias();
  renderViajes();
  renderMonedasConfig();
  renderCategorias();
  renderGastosTabla();
  renderBackupStatus();
  if (!$('#g-fecha').value) $('#g-fecha').value = todayIso();
  if ($('#t-fecha') && !$('#t-fecha').value) $('#t-fecha').value = todayIso();
}

function renderCurrencySelectors() {
  const currencies = allCurrencies().map(code => ({ value: code, label: code }));
  ['#g-moneda', '#c-moneda'].forEach(sel => fillSelect(sel, currencies, null));
  fillSelect('#f-moneda', currencies, '(todas)');
  fillSelect('#r-moneda', currencies, '(todas)');
}

function renderAccountSelectors() {
  const accounts = state.cuentas.map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#g-cuenta', accounts, '(elige cuenta)');
  fillSelect('#f-cuenta', accounts, '(todas)');
  fillSelect('#r-cuenta', accounts, '(todas)');
  if ($('#t-from')) fillSelect('#t-from', accounts, '(origen)');
  if ($('#t-to')) fillSelect('#t-to', accounts, '(destino)');
  if ($('#edit-gasto-cuenta')) fillSelect('#edit-gasto-cuenta', accounts, '(elige cuenta)');
}

function renderTripSelectors() {
  const trips = state.viajes.map(v => ({ value: String(v.id), label: v.nombre }));
  fillSelect('#g-viaje', trips, '(sin viaje)');
  fillSelect('#f-viaje', trips, '(todos)');
  fillSelect('#r-viaje', trips, '(todos)');
  if ($('#edit-gasto-viaje')) fillSelect('#edit-gasto-viaje', trips, '(sin viaje)');
}

function renderCategorySelectors() {
  const principal = state.categorias.filter(c => !c.parentId);
  const options = principal.map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#g-cat', options, '(elige categoria)');
  fillSelect('#f-cat', options, '(todas)');
  fillSelect('#cat-parent', options, '(Ninguna, es principal)');
  if ($('#edit-gasto-cat')) fillSelect('#edit-gasto-cat', options, '(elige categoria)');
  renderSubcategories();
  if ($('#edit-gasto-subcat')) renderEditSubcategories();
}

function renderSubcategories() {
  const catId = Number($('#g-cat').value);
  const options = state.categorias
    .filter(c => c.parentId === catId)
    .map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#g-subcat', options, '(sin subcategoria)');
}

function renderEditSubcategories() {
  const catId = Number($('#edit-gasto-cat').value);
  const options = state.categorias
    .filter(c => c.parentId === catId)
    .map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#edit-gasto-subcat', options, '(sin subcategoria)');
}

function renderCuentas() {
  const tbody = $('#tabla-cuentas tbody');
  tbody.innerHTML = '';
  state.cuentas.forEach(c => {
    const spent = state.gastos.filter(g => g.cuentaId === c.id).reduce((sum, g) => sum + fromEur(toEur(g.importe, g.moneda), c.moneda), 0);
    const overBudget = numberValue(c.presupuesto) > 0 && spent > numberValue(c.presupuesto);
    const tr = document.createElement('tr');
    if (overBudget || numberValue(c.saldoActual) < 0) tr.className = 'warning-row';
    tr.innerHTML = `<td>${escapeHtml(c.nombre)}</td><td><span class="badge">${escapeHtml(c.moneda)}</span></td><td>${fmtCurrency(c.saldoActual, c.moneda)}</td><td>${c.presupuesto ? fmtCurrency(c.presupuesto, c.moneda) : '-'}</td><td><button class="ghost" data-edit-cuenta="${c.id}">Editar</button> <button class="ghost" data-del-cuenta="${c.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderTransferencias() {
  const tbody = $('#tabla-transferencias tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  state.transferencias.forEach(t => {
    const source = state.cuentas.find(c => c.id === t.fromId);
    const target = state.cuentas.find(c => c.id === t.toId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${fmtDate(t.fecha)}</td><td>${escapeHtml(source ? source.nombre : '?')}</td><td>${escapeHtml(target ? target.nombre : '?')}</td><td>${fmtCurrency(t.importeFrom, t.monedaFrom)}</td><td>${fmtCurrency(t.importeTo, t.monedaTo)}</td><td>${escapeHtml(t.nota || '')}</td><td><button class="ghost" data-del-transfer="${t.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderViajes() {
  const tbody = $('#tabla-viajes tbody');
  tbody.innerHTML = '';
  state.viajes.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(v.nombre)}</td><td>${fmtDate(v.fechaInicio)}</td><td>${fmtDate(v.fechaFin)}</td><td>${numberValue(v.presupuesto) ? fmtCurrency(v.presupuesto, 'EUR') : '-'}</td><td><button class="ghost" data-edit-viaje="${v.id}">Editar</button> <button class="ghost" data-del-viaje="${v.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderMonedasConfig() {
  const tbody = $('#tabla-monedas tbody');
  tbody.innerHTML = '';
  const rows = [
    { codigo: 'EUR', nombre: 'Euro', eurPorUnidad: 1, unidadesPorEuro: 1, base: true },
    ...foreignCurrencies()
  ];
  rows.forEach(m => {
    const tr = document.createElement('tr');
    const actions = m.base ? '-' : `<button class="ghost" data-edit-moneda="${escapeHtml(m.codigo)}">Editar</button> <button class="ghost" data-del-moneda="${escapeHtml(m.codigo)}">Eliminar</button>`;
    tr.innerHTML = `<td><span class="badge">${escapeHtml(m.codigo)}</span></td><td>${escapeHtml(m.nombre || '-')}</td><td>${numberValue(m.eurPorUnidad).toFixed(6)} EUR</td><td>${numberValue(m.unidadesPorEuro).toFixed(6)} ${escapeHtml(m.codigo)}</td><td>${actions}</td>`;
    tbody.appendChild(tr);
  });
}

function renderViajesHome() {
  const tbody = $('#tabla-viajes-home tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const info = $('#selected-trip-info');
  const selected = state.viajes.find(v => v.id === state.selectedViajeId);
  info.textContent = selected ? `Viaje seleccionado: ${selected.nombre}` : 'Selecciona un viaje para consultar sus gastos o resumen.';
  if (!state.viajes.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6">Todavia no hay viajes. Puedes crearlos en Configuracion.</td>';
    tbody.appendChild(tr);
    return;
  }
  const tripsByYear = {};
  state.viajes.forEach(v => {
    const year = (v.fechaInicio || 'Sin fecha').slice(0, 4);
    (tripsByYear[year] = tripsByYear[year] || []).push(v);
  });
  Object.keys(tripsByYear).sort().forEach(year => {
    const header = document.createElement('tr');
    header.className = 'group-row';
    header.innerHTML = `<td colspan="8">Ano ${escapeHtml(year)}</td>`;
    tbody.appendChild(header);
    let yearExpenses = 0;
    let yearTotal = 0;
    tripsByYear[year].forEach(v => {
      const expenses = state.gastos.filter(g => g.viajeId === v.id);
      const total = expenses.reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
      const budget = numberValue(v.presupuesto);
      const remaining = budget ? budget - total : null;
      yearExpenses += expenses.length;
      yearTotal += total;
      const tr = document.createElement('tr');
      if (remaining !== null && remaining < 0) tr.className = 'warning-row';
      tr.innerHTML = `<td>${escapeHtml(v.nombre)}</td><td>${fmtDate(v.fechaInicio)}</td><td>${fmtDate(v.fechaFin)}</td><td>${expenses.length}</td><td>${fmtCurrency(total, 'EUR')}</td><td>${budget ? fmtCurrency(budget, 'EUR') : '-'}</td><td>${remaining === null ? '-' : fmtCurrency(remaining, 'EUR')}</td><td><button class="ghost" data-trip-gastos="${v.id}">Gastos</button> <button class="ghost" data-trip-resumen="${v.id}">Resumen</button> <button class="ghost" data-edit-viaje="${v.id}">Editar</button></td>`;
      tbody.appendChild(tr);
    });
    const subtotal = document.createElement('tr');
    subtotal.className = 'subtotal-row';
    subtotal.innerHTML = `<td colspan="3">Subtotal ${escapeHtml(year)}</td><td>${yearExpenses}</td><td>${fmtCurrency(yearTotal, 'EUR')}</td><td colspan="3"></td>`;
    tbody.appendChild(subtotal);
  });
}

function renderCategorias() {
  const tbody = $('#tabla-cats tbody');
  tbody.innerHTML = '';
  state.categorias.forEach(cat => {
    const parent = state.categorias.find(c => c.id === cat.parentId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(cat.nombre)}</td><td>${cat.parentId ? 'Subcategoria' : 'Categoria'}</td><td>${parent ? escapeHtml(parent.nombre) : '-'}</td><td><button class="ghost" data-edit-cat="${cat.id}">Editar</button> <button class="ghost" data-del-cat="${cat.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function filteredGastos() {
  const fMon = $('#f-moneda').value;
  const fCta = $('#f-cuenta').value;
  const fCat = $('#f-cat').value;
  const fViaje = $('#f-viaje').value;
  const fDesde = $('#f-desde').value;
  const fHasta = $('#f-hasta').value;
  const fDesc = ($('#f-desc').value || '').trim().toLowerCase();
  return state.gastos
    .filter(g => !fMon || g.moneda === fMon)
    .filter(g => !fCta || g.cuentaId === Number(fCta))
    .filter(g => !fCat || g.catId === Number(fCat))
    .filter(g => !fViaje || g.viajeId === Number(fViaje))
    .filter(g => !fDesde || g.fecha >= fDesde)
    .filter(g => !fHasta || g.fecha <= fHasta)
    .filter(g => !fDesc || (g.desc || '').toLowerCase().includes(fDesc))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
}

function renderGastosTabla() {
  const tbody = $('#tabla-gastos tbody');
  tbody.innerHTML = '';
  const rows = filteredGastos();
  const byGroup = {};
  rows.forEach(g => {
    const key = `${g.fecha || ''}|${g.viajeId || ''}`;
    (byGroup[key] = byGroup[key] || []).push(g);
  });
  let totalEur = 0;
  Object.keys(byGroup).sort((a, b) => {
    const [dateA, tripA] = a.split('|');
    const [dateB, tripB] = b.split('|');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const nameA = (state.viajes.find(v => v.id === Number(tripA)) || {}).nombre || '';
    const nameB = (state.viajes.find(v => v.id === Number(tripB)) || {}).nombre || '';
    return collator.compare(nameA, nameB);
  }).forEach(key => {
    const [date, tripId] = key.split('|');
    const groupTrip = state.viajes.find(v => v.id === Number(tripId));
    const title = `${fmtDate(date)}${groupTrip ? ` - ${escapeHtml(groupTrip.nombre)}` : ''}`;
    const header = document.createElement('tr');
    header.className = 'group-row';
    header.innerHTML = `<td colspan="10"><b>${title}</b></td>`;
    tbody.appendChild(header);
    let subtotalEur = 0;
    byGroup[key].forEach(g => {
      const cat = state.categorias.find(c => c.id === g.catId);
      const sub = state.categorias.find(c => c.id === g.subcatId);
      const cta = state.cuentas.find(c => c.id === g.cuentaId);
      const eur = toEur(g.importe, g.moneda);
      subtotalEur += eur;
      totalEur += eur;
      const tr = document.createElement('tr');
      tr.className = 'expense-row';
      tr.innerHTML = `<td class="mobile-hide"></td><td data-label="Categoria">${escapeHtml(cat ? cat.nombre : '?')}</td><td data-label="Subcat.">${escapeHtml(sub ? sub.nombre : '-')}</td><td data-label="Cuenta">${escapeHtml(cta ? cta.nombre : '?')}</td><td data-label="Moneda">${escapeHtml(g.moneda)}</td><td data-label="Importe">${fmtCurrency(g.importe, g.moneda)}</td><td data-label="EUR">${fmtCurrency(eur, 'EUR')}</td><td data-label="Descripcion">${escapeHtml(g.desc || '')}</td><td data-label="Ticket">${ticketLink(g)}</td><td data-label="Acciones"><button class="ghost" data-edit-gasto="${g.id}">Editar</button> <button class="ghost" data-dup-gasto="${g.id}">Duplicar</button> <button class="ghost" data-del-gasto="${g.id}">Eliminar</button></td>`;
      tbody.appendChild(tr);
    });
    const subtotal = document.createElement('tr');
    subtotal.className = 'subtotal-row';
    subtotal.innerHTML = `<td colspan="6" style="text-align:right"><i>Subtotal</i></td><td>${fmtCurrency(subtotalEur, 'EUR')}</td><td colspan="3"></td>`;
    tbody.appendChild(subtotal);
  });
  $('#tg-total').textContent = fmtCurrency(totalEur, 'EUR');
}

function drawPieChart(container, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const w = 360;
  const h = 240;
  const r = 74;
  const cx = 92;
  const cy = 118;
  let angle = -Math.PI / 2;
  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  if (!total) {
    svg += '<text x="20" y="120" fill="#6b7280">Sin datos</text>';
  }
  data.forEach((item, i) => {
    const slice = (item.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + slice);
    const y2 = cy + r * Math.sin(angle + slice);
    const large = slice > Math.PI ? 1 : 0;
    const color = `hsl(${(i * 57) % 360} 70% 48%)`;
    svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}"><title>${escapeHtml(item.label)}: ${fmtCurrency(item.value, 'EUR')}</title></path>`;
    angle += slice;
  });
  data.forEach((item, i) => {
    const color = `hsl(${(i * 57) % 360} 70% 48%)`;
    svg += `<rect x="190" y="${38 + i * 22}" width="10" height="10" fill="${color}"></rect><text x="208" y="${47 + i * 22}" font-size="8.5" fill="#374151">${escapeHtml(item.label.slice(0, 26))}</text>`;
  });
  svg += '</svg>';
  container.innerHTML = svg;
}

function drawBarChart(container, data) {
  const w = 360;
  const h = 240;
  const pad = 36;
  const max = Math.max(1, ...data.map(item => item.value));
  const slot = (w - pad * 2) / Math.max(1, data.length);
  const bw = slot * 0.65;
  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#e5e7eb"/>`;
  data.forEach((item, i) => {
    const value = Math.max(0, item.value);
    const x = pad + i * slot + (slot - bw) / 2;
    const barH = (value / max) * (h - pad * 2);
    const y = h - pad - barH;
    const color = `hsl(${(i * 57) % 360} 70% 48%)`;
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}"><title>${escapeHtml(item.label)}: ${fmtCurrency(value, 'EUR')}</title></rect><text x="${(x + bw / 2).toFixed(1)}" y="${h - pad + 15}" font-size="11" text-anchor="middle" fill="#374151">${escapeHtml(item.label.slice(0, 10))}</text>`;
  });
  if (!data.length) svg += '<text x="20" y="120" fill="#6b7280">Sin datos</text>';
  svg += '</svg>';
  container.innerHTML = svg;
}

function renderResumen() {
  const mon = $('#r-moneda').value;
  const cta = $('#r-cuenta').value;
  const viaje = $('#r-viaje').value;
  const gastos = state.gastos
    .filter(g => !mon || g.moneda === mon)
    .filter(g => !cta || g.cuentaId === Number(cta))
    .filter(g => !viaje || g.viajeId === Number(viaje));
  const totalEur = gastos.reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
  const totalsByCurrency = gastos.reduce((items, g) => {
    items[g.moneda] = (items[g.moneda] || 0) + numberValue(g.importe);
    return items;
  }, {});
  const totalLines = [{ currency: 'EUR', amount: totalEur, always: true }]
    .concat(Object.entries(totalsByCurrency)
      .filter(([currency]) => currency !== 'EUR')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => ({ currency, amount })));
  if (gastos.length) {
    const dates = gastos.map(g => new Date(`${g.fecha}T00:00:00`));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const days = Math.max(1, Math.ceil((max - min) / 86400000) + 1);
    $('#kpi-total').innerHTML = formatCurrencyLines(totalLines);
    $('#kpi-media').innerHTML = totalLines.map(item => ({
      currency: item.currency,
      amount: item.amount / days,
      always: item.always
    }))
      .filter(item => Math.abs(numberValue(item.amount)) > 0.000001 || item.always)
      .map(item => `<div>${fmtCurrency(item.amount, item.currency)}/dia</div>`)
      .join('');
  } else {
    $('#kpi-total').innerHTML = formatCurrencyLines(totalLines);
    $('#kpi-media').textContent = fmtCurrency(0, 'EUR');
  }
  const remainingByCurrency = {};
  let remainingEur = 0;
  const pcts = state.cuentas.map(c => {
    const spent = gastos
      .filter(g => g.cuentaId === c.id)
      .reduce((sum, g) => sum + fromEur(toEur(g.importe, g.moneda), c.moneda), 0);
    if (c.presupuesto) {
      const remaining = numberValue(c.presupuesto) - spent;
      remainingByCurrency[c.moneda] = (remainingByCurrency[c.moneda] || 0) + remaining;
      remainingEur += toEur(remaining, c.moneda);
    }
    return c.presupuesto ? Math.min(100, spent * 100 / c.presupuesto) : 0;
  });
  const budgetPct = `${(pcts.reduce((a, b) => a + b, 0) / Math.max(1, pcts.length)).toFixed(0)}%`;
  const remainingLines = [{ currency: 'EUR', amount: remainingEur, always: true }]
    .concat(Object.entries(remainingByCurrency)
      .filter(([currency]) => currency !== 'EUR')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => ({ currency, amount })));
  $('#kpi-presu').innerHTML = `<div>${budgetPct}</div><div class="kpi-note">Restante</div>${formatCurrencyLines(remainingLines)}`;

  const byCategory = {};
  gastos.forEach(g => {
    const cat = state.categorias.find(c => c.id === g.catId);
    const sub = state.categorias.find(c => c.id === g.subcatId);
    const key = `${cat ? cat.nombre : '?'}||${sub ? sub.nombre : '(sin subcat)'}`;
    byCategory[key] = (byCategory[key] || 0) + toEur(g.importe, g.moneda);
  });
  const categoryRows = Object.entries(byCategory)
    .map(([key, total]) => ({ cat: key.split('||')[0], sub: key.split('||')[1], total }))
    .sort((a, b) => b.total - a.total);
  $('#tabla-cat tbody').innerHTML = categoryRows.map(row => `<tr><td>${escapeHtml(row.cat)}</td><td>${escapeHtml(row.sub)}</td><td>${fmtCurrency(row.total, 'EUR')}</td></tr>`).join('');
  drawPieChart($('#chart-cat'), categoryRows.slice(0, 6).map(row => ({ label: row.sub === '(sin subcat)' ? row.cat : `${row.cat} · ${row.sub}`, value: row.total })));

  const categoryTotals = categoryRows
    .reduce((items, row) => {
      const found = items.find(item => item.cat === row.cat);
      if (found) found.total += row.total;
      else items.push({ cat: row.cat, total: row.total });
      return items;
    }, [])
    .sort((a, b) => b.total - a.total);
  const breakdownMode = $('#r-desglose') ? $('#r-desglose').value : 'subcategorias';
  if (breakdownMode === 'categorias') {
    $('#tabla-cat tbody').innerHTML = categoryTotals
      .map(row => `<tr><td>${escapeHtml(row.cat)}</td><td>-</td><td>${fmtCurrency(row.total, 'EUR')}</td></tr>`)
      .join('');
    drawPieChart($('#chart-cat'), categoryTotals.slice(0, 6).map(row => ({ label: row.cat, value: row.total })));
  } else {
    const groupedRows = [];
    const pieRows = [];
    categoryTotals.forEach(catRow => {
      categoryRows
        .filter(row => row.cat === catRow.cat)
        .sort((a, b) => b.total - a.total)
        .forEach(row => {
          groupedRows.push(`<tr><td>${escapeHtml(row.cat)}</td><td>${escapeHtml(row.sub)}</td><td>${fmtCurrency(row.total, 'EUR')}</td></tr>`);
          pieRows.push(row);
        });
      groupedRows.push(`<tr class="subtotal-row"><td>${escapeHtml(catRow.cat)}</td><td>Subtotal categoria</td><td>${fmtCurrency(catRow.total, 'EUR')}</td></tr>`);
    });
    $('#tabla-cat tbody').innerHTML = groupedRows.join('');
    drawPieChart($('#chart-cat'), pieRows.slice(0, 6).map(row => ({ label: row.sub === '(sin subcat)' ? row.cat : `${row.cat} · ${row.sub}`, value: row.total })));
  }

  const accounts = cta ? state.cuentas.filter(c => c.id === Number(cta)) : state.cuentas;
  const accountRows = accounts.map(c => {
    const spentAccountCurrency = gastos
      .filter(g => g.cuentaId === c.id)
      .reduce((sum, g) => sum + fromEur(toEur(g.importe, g.moneda), c.moneda), 0);
    const spentEur = gastos.filter(g => g.cuentaId === c.id).reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
    const budget = numberValue(c.presupuesto);
    const budgetEur = budget ? toEur(budget, c.moneda) : 0;
    const remainingEur = budget ? budgetEur - spentEur : null;
    return {
      label: c.nombre,
      moneda: c.moneda,
      total: spentAccountCurrency,
      totalEur: spentEur,
      presupuesto: budget,
      presupuestoEur: budgetEur,
      restanteEur: remainingEur,
      pct: budget ? spentEur * 100 / budgetEur : 0
    };
  }).sort((a, b) => b.totalEur - a.totalEur);
  drawBarChart($('#chart-cuenta'), accountRows.map(row => ({ label: row.label, value: row.totalEur })));
  $('#tabla-cuenta tbody').innerHTML = accountRows.map(row => `<tr class="${row.restanteEur !== null && row.restanteEur < 0 ? 'warning-row' : ''}"><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.moneda)}</td><td>${fmtCurrency(row.total, row.moneda)}</td><td>${fmtCurrency(row.totalEur, 'EUR')}</td><td>${row.presupuesto ? `${fmtCurrency(row.presupuesto, row.moneda)} / ${fmtCurrency(row.presupuestoEur, 'EUR')}` : '-'}</td><td>${row.restanteEur === null ? '-' : fmtCurrency(row.restanteEur, 'EUR')}</td><td>${row.pct.toFixed(1)}%</td></tr>`).join('');
}

async function exportAll() {
  return {
    version: APP_VERSION,
    generatedAt: new Date().toISOString(),
    cuentas: state.cuentas,
    categorias: state.categorias,
    gastos: state.gastos,
    viajes: state.viajes,
    monedas: state.monedas,
    transferencias: state.transferencias
  };
}

async function importAll(data) {
  if (!data || !Array.isArray(data.cuentas) || !Array.isArray(data.categorias) || !Array.isArray(data.gastos)) {
    throw new Error('Archivo no valido');
  }
  await clearStores(['cuentas', 'categorias', 'gastos', 'viajes', 'monedas', 'transferencias']);
  await ensureBaseCurrency();
  for (const m of data.monedas || []) {
    const codigo = String(m.codigo || '').toUpperCase();
    if (!codigo || codigo === 'EUR') continue;
    await putRecord('monedas', {
      codigo,
      nombre: m.nombre || '',
      eurPorUnidad: numberValue(m.eurPorUnidad),
      unidadesPorEuro: numberValue(m.unidadesPorEuro),
      updatedAt: m.updatedAt || new Date().toISOString()
    });
  }
  for (const v of data.viajes || []) {
    const obj = {
      nombre: v.nombre,
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin,
      presupuesto: numberValue(v.presupuesto),
      createdAt: v.createdAt || new Date().toISOString(),
      updatedAt: v.updatedAt || new Date().toISOString()
    };
    if (v.id != null) obj.id = v.id;
    await addRecord('viajes', obj);
  }
  for (const c of data.cuentas || []) {
    const obj = {
      nombre: c.nombre,
      moneda: c.moneda || 'EUR',
      saldoInicial: numberValue(c.saldoInicial),
      saldoActual: numberValue(c.saldoActual ?? c.saldoInicial),
      presupuesto: numberValue(c.presupuesto),
      nota: c.nota || '',
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString()
    };
    if (c.id != null) obj.id = c.id;
    await addRecord('cuentas', obj);
  }
  for (const t of data.transferencias || []) {
    const obj = {
      fecha: t.fecha || todayIso(),
      fromId: Number(t.fromId),
      toId: Number(t.toId),
      monedaFrom: t.monedaFrom || 'EUR',
      monedaTo: t.monedaTo || 'EUR',
      importeFrom: numberValue(t.importeFrom),
      importeTo: numberValue(t.importeTo),
      importeEur: numberValue(t.importeEur),
      nota: t.nota || '',
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString()
    };
    if (t.id != null) obj.id = t.id;
    await addRecord('transferencias', obj);
  }
  for (const c of data.categorias || []) {
    const obj = {
      nombre: c.nombre,
      parentId: c.parentId ? Number(c.parentId) : null
    };
    if (c.id != null) obj.id = c.id;
    await addRecord('categorias', obj);
  }
  for (const g of data.gastos || []) {
    const obj = {
      ...g,
      viajeId: g.viajeId || null,
      importe: numberValue(g.importe),
      importeEur: toEur(g.importe, g.moneda)
    };
    if (g.id == null) delete obj.id;
    await addRecord('gastos', obj);
  }
}

async function seedIfEmpty() {
  await seedDefaults();
}

function setTab(id) {
  state.activeTab = id;
  ['viajes', 'gastos', 'resumen', 'config'].forEach(tab => {
    $(`#tab-${tab}`).classList.toggle('active', tab === id);
    $(`#view-${tab}`).style.display = tab === id ? 'block' : 'none';
  });
  if (id === 'resumen') renderResumen();
}

function applySelectedTrip(id) {
  state.selectedViajeId = id ? Number(id) : null;
  const value = state.selectedViajeId ? String(state.selectedViajeId) : '';
  if ($('#f-viaje')) $('#f-viaje').value = value;
  if ($('#r-viaje')) $('#r-viaje').value = value;
  renderViajesHome();
  renderGastosTabla();
  renderResumen();
}

function openEditGasto(gasto) {
  const dialog = $('#edit-gasto-dialog');
  if (!dialog || !gasto) return;
  $('#edit-gasto-id').value = gasto.id;
  $('#edit-gasto-fecha').value = gasto.fecha || todayIso();
  $('#edit-gasto-viaje').value = gasto.viajeId ? String(gasto.viajeId) : '';
  $('#edit-gasto-cuenta').value = String(gasto.cuentaId || '');
  const account = state.cuentas.find(c => c.id === Number(gasto.cuentaId));
  $('#edit-gasto-moneda').value = account ? account.moneda : gasto.moneda;
  $('#edit-gasto-cat').value = String(gasto.catId || '');
  renderEditSubcategories();
  $('#edit-gasto-subcat').value = gasto.subcatId ? String(gasto.subcatId) : '';
  $('#edit-gasto-importe').value = numberValue(gasto.importe);
  $('#edit-gasto-desc').value = gasto.desc || '';
  $('#edit-gasto-ticket').value = '';
  $('#edit-gasto-ticket-remove').checked = false;
  $('#edit-gasto-ticket-current').innerHTML = gasto.ticketData ? `Ticket actual: ${ticketLink(gasto)}` : 'Sin ticket asociado.';
  setMessage('#msg-edit-gasto', '');
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeEditGasto() {
  const dialog = $('#edit-gasto-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function openFormDialog({ title, fields, onSubmit }) {
  const dialog = $('#form-dialog');
  const container = $('#form-dialog-fields');
  if (!dialog || !container) return;
  $('#form-dialog-title').textContent = title;
  container.innerHTML = fields.map(field => {
    const value = escapeHtml(field.value ?? '');
    const step = field.step ? ` step="${escapeHtml(field.step)}"` : '';
    const min = field.min != null ? ` min="${escapeHtml(field.min)}"` : '';
    return `<div><label>${escapeHtml(field.label)}</label><input id="form-field-${escapeHtml(field.name)}" type="${field.type || 'text'}"${step}${min} value="${value}"></div>`;
  }).join('');
  setMessage('#msg-form-dialog', '');
  activeFormDialogSubmit = onSubmit;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeFormDialog() {
  const dialog = $('#form-dialog');
  activeFormDialogSubmit = null;
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function formDialogValues() {
  const values = {};
  $$('#form-dialog-fields input').forEach(input => {
    values[input.id.replace('form-field-', '')] = input.value;
  });
  return values;
}

async function resetDataValue(option) {
  const value = String(option || '').trim().toLowerCase();
  const map = {
    todo: ['cuentas', 'categorias', 'gastos', 'viajes', 'monedas', 'transferencias'],
    categorias: ['categorias'],
    monedas: ['monedas'],
    cuentas: ['cuentas'],
    viajes: ['viajes'],
    gastos: ['gastos'],
    transferencias: ['transferencias']
  };
  const stores = map[value];
  if (!stores) {
    alert('Opcion no reconocida. Usa: todo, categorias, monedas, cuentas, viajes, gastos o transferencias.');
    return;
  }
  if (!confirm(`Se borrara: ${value}. Continuar?`)) return;
  try {
    if (window.caches && value === 'todo') {
      const keys = await caches.keys();
      for (const key of keys) await caches.delete(key);
    }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations && value === 'todo') {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    await clearStores(stores);
    if (value === 'todo' || value === 'monedas') await ensureBaseCurrency();
    if (value === 'todo' || value === 'cuentas') await seedDefaultAccounts();
    if (value === 'todo' || value === 'categorias') await seedDefaultCategories();
    state.selectedViajeId = null;
    await loadAll();
    alert('Reset completado');
  } catch (err) {
    alert(`No se pudo resetear: ${err.message || err}`);
  }
}

async function resetDataPrompt() {
  openFormDialog({
    title: 'Resetear datos',
    fields: [{ name: 'opcion', label: 'Escribe: todo, categorias, monedas, cuentas, viajes, gastos o transferencias', value: 'todo' }],
    onSubmit: values => resetDataValue(values.opcion)
  });
}

function bindEvents() {
  $('#tab-viajes').onclick = () => setTab('viajes');
  $('#tab-gastos').onclick = () => setTab('gastos');
  $('#tab-resumen').onclick = () => setTab('resumen');
  $('#tab-config').onclick = () => setTab('config');
  $('#btn-clear-trip').onclick = () => {
    applySelectedTrip(null);
    setTab('viajes');
  };
  $('#g-cat').onchange = renderSubcategories;
  $('#edit-gasto-cat').onchange = renderEditSubcategories;
  $('#edit-gasto-cuenta').onchange = () => {
    const account = state.cuentas.find(c => c.id === Number($('#edit-gasto-cuenta').value));
    if (account) $('#edit-gasto-moneda').value = account.moneda;
  };
  $('#edit-gasto-close').onclick = closeEditGasto;
  $('#edit-gasto-cancel').onclick = closeEditGasto;
  $('#form-dialog-close').onclick = closeFormDialog;
  $('#form-dialog-cancel').onclick = closeFormDialog;
  $('#form-dialog-form').onsubmit = async event => {
    event.preventDefault();
    if (!activeFormDialogSubmit) return;
    try {
      await activeFormDialogSubmit(formDialogValues());
      closeFormDialog();
      await loadAll();
    } catch (err) {
      setMessage('#msg-form-dialog', err.message || String(err), true);
    }
  };
  $('#edit-gasto-form').onsubmit = async event => {
    event.preventDefault();
    try {
      const id = Number($('#edit-gasto-id').value);
      const cuentaId = $('#edit-gasto-cuenta').value;
      const catId = $('#edit-gasto-cat').value;
      const importe = numberValue($('#edit-gasto-importe').value);
      if (!cuentaId || !catId || importe <= 0) throw new Error('Completa cuenta, categoria e importe');
      const current = state.gastos.find(g => g.id === id);
      const ticket = await readFileData($('#edit-gasto-ticket'));
      const ticketPatch = $('#edit-gasto-ticket-remove').checked
        ? { ticketName: '', ticketType: '', ticketData: '' }
        : ticket
          ? { ticketName: ticket.name, ticketType: ticket.type, ticketData: ticket.data }
          : { ticketName: current ? current.ticketName : '', ticketType: current ? current.ticketType : '', ticketData: current ? current.ticketData : '' };
      await updateGasto(id, {
        fecha: $('#edit-gasto-fecha').value || todayIso(),
        viajeId: $('#edit-gasto-viaje').value || null,
        cuentaId,
        catId,
        subcatId: $('#edit-gasto-subcat').value || null,
        importe,
        desc: $('#edit-gasto-desc').value.trim(),
        ...ticketPatch
      });
      closeEditGasto();
      await loadAll();
    } catch (err) {
      setMessage('#msg-edit-gasto', err.message || String(err), true);
    }
  };
  $('#g-cuenta').onchange = () => {
    const account = state.cuentas.find(c => c.id === Number($('#g-cuenta').value));
    if (account) $('#g-moneda').value = account.moneda;
  };
  $('#g-moneda').onchange = () => {
    const account = state.cuentas.find(c => c.id === Number($('#g-cuenta').value));
    if (account && account.moneda !== $('#g-moneda').value) {
      setMessage('#msg-gasto', 'La moneda debe coincidir con la cuenta seleccionada', true);
    } else if ($('#g-moneda').value !== 'EUR' && !hasValidCurrency($('#g-moneda').value)) {
      setMessage('#msg-gasto', 'Configura primero esa moneda extranjera', true);
    } else {
      setMessage('#msg-gasto', '');
    }
  };
  function syncCurrencyRate(source) {
    const eurPerUnit = $('#m-eur');
    const unitsPerEur = $('#m-back');
    const value = source === 'eur' ? numberValue(eurPerUnit.value) : numberValue(unitsPerEur.value);
    if (value <= 0) return;
    if (source === 'eur') unitsPerEur.value = formatRate(1 / value);
    else eurPerUnit.value = formatRate(1 / value);
  }
  $('#m-eur').oninput = () => syncCurrencyRate('eur');
  $('#m-back').oninput = () => syncCurrencyRate('back');
  ['#f-moneda', '#f-cuenta', '#f-cat', '#f-desde', '#f-hasta'].forEach(sel => $(sel).onchange = renderGastosTabla);
  $('#f-desc').oninput = renderGastosTabla;
  $('#f-viaje').onchange = () => {
    state.selectedViajeId = $('#f-viaje').value ? Number($('#f-viaje').value) : null;
    if ($('#r-viaje')) $('#r-viaje').value = $('#f-viaje').value;
    renderViajesHome();
    renderGastosTabla();
  };
  ['#r-moneda', '#r-cuenta', '#r-desglose'].forEach(sel => $(sel).onchange = renderResumen);
  $('#r-viaje').onchange = () => {
    state.selectedViajeId = $('#r-viaje').value ? Number($('#r-viaje').value) : null;
    if ($('#f-viaje')) $('#f-viaje').value = $('#r-viaje').value;
    renderViajesHome();
    renderResumen();
  };

  $('#btn-add-gasto').onclick = async () => {
    try {
      const fecha = $('#g-fecha').value || todayIso();
      const cuentaId = $('#g-cuenta').value;
      const moneda = $('#g-moneda').value;
      const catId = $('#g-cat').value;
      const importe = numberValue($('#g-importe').value);
      if (!cuentaId || !catId || importe <= 0) throw new Error('Completa cuenta, categoria e importe');
      const ticket = await readFileData($('#g-ticket'));
      await addGasto({
        fecha,
        viajeId: $('#g-viaje').value || null,
        cuentaId,
        moneda,
        catId,
        subcatId: $('#g-subcat').value || null,
        importe,
        desc: $('#g-desc').value.trim(),
        ticketName: ticket ? ticket.name : '',
        ticketType: ticket ? ticket.type : '',
        ticketData: ticket ? ticket.data : ''
      });
      $('#g-importe').value = '';
      $('#g-desc').value = '';
      $('#g-ticket').value = '';
      setMessage('#msg-gasto', 'Gasto anadido');
      await loadAll();
    } catch (err) {
      setMessage('#msg-gasto', err.message || String(err), true);
    }
  };

  $('#btn-add-cuenta').onclick = async () => {
    try {
      const nombre = $('#c-nombre').value.trim();
      if (!nombre) throw new Error('Pon un nombre');
      const moneda = $('#c-moneda').value;
      if (!hasValidCurrency(moneda)) throw new Error('Configura esa moneda antes de crear la cuenta');
      await addCuenta({
        nombre,
        moneda,
        saldoInicial: $('#c-saldo').value,
        presupuesto: $('#c-presu').value,
        nota: $('#c-nota').value.trim()
      });
      ['#c-nombre', '#c-saldo', '#c-presu', '#c-nota'].forEach(sel => $(sel).value = '');
      setMessage('#msg-cuenta', 'Cuenta anadida');
      await loadAll();
    } catch (err) {
      setMessage('#msg-cuenta', err.message || String(err), true);
    }
  };

  $('#btn-add-transfer').onclick = async () => {
    try {
      await addTransferencia({
        fecha: $('#t-fecha').value || todayIso(),
        fromId: $('#t-from').value,
        toId: $('#t-to').value,
        importe: $('#t-importe').value,
        nota: $('#t-nota').value
      });
      ['#t-importe', '#t-nota'].forEach(sel => $(sel).value = '');
      if (!$('#t-fecha').value) $('#t-fecha').value = todayIso();
      setMessage('#msg-transfer', 'Transferencia anadida');
      await loadAll();
    } catch (err) {
      setMessage('#msg-transfer', err.message || String(err), true);
    }
  };

  $('#btn-add-viaje').onclick = async () => {
    try {
      const nombre = $('#v-nombre').value.trim();
      const fechaInicio = $('#v-inicio').value;
      const fechaFin = $('#v-fin').value;
      if (!nombre || !fechaInicio || !fechaFin) throw new Error('Completa nombre, inicio y final');
      if (fechaFin < fechaInicio) throw new Error('La fecha final no puede ser anterior al inicio');
      await addViaje({ nombre, fechaInicio, fechaFin, presupuesto: $('#v-presu').value });
      ['#v-nombre', '#v-inicio', '#v-fin', '#v-presu'].forEach(sel => $(sel).value = '');
      setMessage('#msg-viaje', 'Viaje anadido');
      await loadAll();
    } catch (err) {
      setMessage('#msg-viaje', err.message || String(err), true);
    }
  };

  $('#btn-add-moneda').onclick = async () => {
    try {
      await upsertMoneda({
        codigo: $('#m-codigo').value,
        nombre: $('#m-nombre').value,
        eurPorUnidad: $('#m-eur').value,
        unidadesPorEuro: $('#m-back').value
      });
      ['#m-codigo', '#m-nombre', '#m-eur', '#m-back'].forEach(sel => $(sel).value = '');
      setMessage('#msg-moneda', 'Moneda guardada');
      await loadAll();
    } catch (err) {
      setMessage('#msg-moneda', err.message || String(err), true);
    }
  };

  $('#btn-add-cat').onclick = async () => {
    try {
      const nombre = $('#cat-nombre').value.trim();
      if (!nombre) throw new Error('Escribe un nombre');
      await addCategoria({ nombre, parentId: $('#cat-parent').value || null });
      $('#cat-nombre').value = '';
      $('#cat-parent').value = '';
      setMessage('#msg-cat', 'Categoria guardada');
      await loadAll();
    } catch (err) {
      setMessage('#msg-cat', err.message || String(err), true);
    }
  };

  $('#f-clear').onclick = () => {
    ['#f-moneda', '#f-cuenta', '#f-cat', '#f-viaje', '#f-desde', '#f-hasta', '#f-desc'].forEach(sel => $(sel).value = '');
    state.selectedViajeId = null;
    renderViajesHome();
    renderGastosTabla();
  };
  $('#btn-reset').onclick = resetDataPrompt;

  document.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    try {
      if (target.dataset.delCuenta) {
        if (confirm('Eliminar esta cuenta?')) await delCuenta(target.dataset.delCuenta);
      } else if (target.dataset.editCuenta) {
        const c = state.cuentas.find(item => item.id === Number(target.dataset.editCuenta));
        if (!c) return;
        openFormDialog({
          title: 'Editar cuenta',
          fields: [
            { name: 'nombre', label: 'Nombre', value: c.nombre },
            { name: 'presupuesto', label: 'Presupuesto', type: 'number', step: '0.01', value: c.presupuesto || 0 },
            { name: 'ajuste', label: 'Ajuste de saldo actual (+50, -20, ...)', type: 'number', step: '0.01', value: '' }
          ],
          onSubmit: values => {
            const saldoActual = values.ajuste ? numberValue(c.saldoActual) + numberValue(values.ajuste) : numberValue(c.saldoActual);
            return updateCuenta(c.id, { nombre: values.nombre.trim() || c.nombre, presupuesto: numberValue(values.presupuesto), saldoActual });
          }
        });
        return;
      } else if (target.dataset.delViaje) {
        if (confirm('Eliminar este viaje? Los gastos se conservaran sin viaje.')) await delViaje(target.dataset.delViaje);
      } else if (target.dataset.editViaje) {
        const v = state.viajes.find(item => item.id === Number(target.dataset.editViaje));
        if (!v) return;
        openFormDialog({
          title: 'Editar viaje',
          fields: [
            { name: 'nombre', label: 'Nombre', value: v.nombre },
            { name: 'fechaInicio', label: 'Fecha de inicio', type: 'date', value: v.fechaInicio },
            { name: 'fechaFin', label: 'Fecha final', type: 'date', value: v.fechaFin },
            { name: 'presupuesto', label: 'Presupuesto del viaje (EUR)', type: 'number', step: '0.01', min: '0', value: v.presupuesto || 0 }
          ],
          onSubmit: values => {
            if (values.fechaFin < values.fechaInicio) throw new Error('La fecha final no puede ser anterior al inicio');
            return updateViaje(v.id, { nombre: values.nombre.trim() || v.nombre, fechaInicio: values.fechaInicio, fechaFin: values.fechaFin, presupuesto: numberValue(values.presupuesto) });
          }
        });
        return;
      } else if (target.dataset.delMoneda) {
        const code = target.dataset.delMoneda;
        const inUse = state.cuentas.some(c => c.moneda === code) || state.gastos.some(g => g.moneda === code);
        if (inUse) throw new Error('No se puede eliminar una moneda usada por cuentas o gastos');
        if (confirm(`Eliminar ${code}?`)) await delMoneda(code);
      } else if (target.dataset.editMoneda) {
        const m = state.monedas.find(item => item.codigo === target.dataset.editMoneda);
        if (!m) return;
        openFormDialog({
          title: `Editar ${m.codigo}`,
          fields: [
            { name: 'eurPorUnidad', label: `1 ${m.codigo} equivale a EUR`, type: 'number', step: '0.000001', min: '0', value: m.eurPorUnidad },
            { name: 'unidadesPorEuro', label: `1 EUR equivale a ${m.codigo}`, type: 'number', step: '0.000001', min: '0', value: m.unidadesPorEuro }
          ],
          onSubmit: values => upsertMoneda({ ...m, eurPorUnidad: values.eurPorUnidad, unidadesPorEuro: values.unidadesPorEuro })
        });
        return;
      } else if (target.dataset.delCat) {
        if (confirm('Eliminar esta categoria?')) await delCategoria(target.dataset.delCat);
      } else if (target.dataset.editCat) {
        const c = state.categorias.find(item => item.id === Number(target.dataset.editCat));
        if (!c) return;
        openFormDialog({
          title: 'Editar categoria',
          fields: [{ name: 'nombre', label: 'Nombre', value: c.nombre }],
          onSubmit: values => updateCategoria(c.id, { nombre: values.nombre.trim() || c.nombre })
        });
        return;
      } else if (target.dataset.delGasto) {
        if (confirm('Eliminar este gasto?')) await delGasto(target.dataset.delGasto);
      } else if (target.dataset.editGasto) {
        const g = state.gastos.find(item => item.id === Number(target.dataset.editGasto));
        if (!g) return;
        openEditGasto(g);
        return;
      } else if (target.dataset.dupGasto) {
        const g = state.gastos.find(item => item.id === Number(target.dataset.dupGasto));
        if (!g) return;
        await addGasto({ ...g, id: undefined, desc: `${g.desc || ''}`.trim(), fecha: g.fecha || todayIso() });
      } else if (target.dataset.delTransfer) {
        if (confirm('Eliminar esta transferencia y deshacer el movimiento de saldo?')) await delTransferencia(target.dataset.delTransfer);
      } else if (target.dataset.tripGastos) {
        applySelectedTrip(target.dataset.tripGastos);
        setTab('gastos');
        return;
      } else if (target.dataset.tripResumen) {
        applySelectedTrip(target.dataset.tripResumen);
        setTab('resumen');
        return;
      } else {
        return;
      }
      await loadAll();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $('#btn-export').onclick = async () => {
    try {
      const data = await exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = $('#export-link');
      const openLink = $('#export-open-link');
      if (link.dataset.objectUrl) URL.revokeObjectURL(link.dataset.objectUrl);
      if (openLink.dataset.objectUrl) URL.revokeObjectURL(openLink.dataset.objectUrl);
      const url = URL.createObjectURL(blob);
      const openUrl = URL.createObjectURL(new Blob([json], { type: 'text/plain' }));
      const filename = `gastos_backup_v${APP_VERSION}_${todayIso()}.json`;
      link.href = url;
      link.download = filename;
      link.dataset.objectUrl = url;
      link.style.display = 'inline-flex';
      link.textContent = `Descargar ${filename}`;
      openLink.href = openUrl;
      openLink.dataset.objectUrl = openUrl;
      openLink.style.display = 'inline-flex';
      $('#export-json').value = json;
      $('#export-panel').style.display = 'block';
      localStorage.setItem(BACKUP_KEY, new Date().toISOString());
      renderBackupStatus();
      setMessage('#msg-export', 'Backup generado. Usa Descargar, Abrir JSON o copia el texto.');
    } catch (err) {
      alert(`No se pudo exportar: ${err.message || err}`);
    }
  };
  $('#btn-import').onclick = () => $('#file-import').click();
  $('#btn-export-home').onclick = () => {
    setTab('config');
    $('#btn-export').click();
  };
  $('#btn-export-csv').onclick = exportCurrentCsv;
  $('#btn-print-summary').onclick = () => {
    setTab('resumen');
    window.print();
  };
  $('#file-import').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const ok = confirm('Importar reemplazara todos los datos locales actuales. Si quieres conservarlos, cancela y exporta primero. Continuar?');
      if (!ok) return;
      await importAll(JSON.parse(await file.text()));
      await loadAll();
      alert('Datos importados');
    } catch (err) {
      alert(`Archivo no valido: ${err.message || err}`);
    } finally {
      event.target.value = '';
    }
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  await seedIfEmpty();
  await loadAll();
});

Object.assign(window, {
  state,
  loadAll,
  renderAll,
  renderResumen,
  addCuenta,
  updateCuenta,
  delCuenta,
  addGasto,
  updateGasto,
  delGasto,
  addViaje,
  updateViaje,
  delViaje,
  upsertMoneda,
  exportAll,
  importAll
});
