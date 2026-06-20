const DB_NAME = 'gastos_viaje_db';
const DB_VERSION = 7;
const APP_VERSION = '700v81';
const BACKUP_KEY = 'gastos_viaje_last_backup';
const EXPENSE_VIEW_KEY = 'gastos_viaje_expense_view';
const BACKUP_HISTORY_KEY = 'gastos_viaje_backup_history';
const DATA_UPDATED_KEY = 'gastos_viaje_data_updated_at';
const SYNC_KEY_STORAGE = 'gastos_viaje_sync_key';
const BACKUP_DIRECTORY_SETTING_KEY = 'backupDirectory';
const SYNC_ENDPOINT = '/api/travel-sync';
const LOCAL_BACKUP_LIMIT = 5;
const CLOUD_ATTACHMENT_CHUNK_CHARS = 2_500_000;
const CLOUD_ATTACHMENT_CHECK_BATCH = 75;
const TRIP_MAP_WIDTH = 920;
const TRIP_MAP_HEIGHT = 460;
let dbPromise = null;
let activeFormDialogSubmit = null;
let hasAppliedDefaultTripSelection = false;
let dataTrackingPaused = 0;
let localBackupHistoryCache = [];
let currentCloudMetadata = null;
let backupDirectorySettingCache;
const routeEditorState = {
  tripId: null,
  cityIds: [],
  dragIndex: null,
  optionMode: 'expenses'
};
const tripMapState = {
  key: '',
  countryScopeKey: '',
  zoomDelta: 0,
  panX: 0,
  panY: 0,
  showPlanned: true,
  printMode: false
};
const tripMapDrag = {
  active: false,
  frame: null,
  startX: 0,
  startY: 0,
  lastDx: 0,
  lastDy: 0
};
const tripMapGesture = {
  pointers: new Map(),
  frame: null,
  pinch: false,
  distance: 0,
  lastZoomAt: 0
};

function resetTripMapView() {
  tripMapState.key = '';
  tripMapState.zoomDelta = 0;
  tripMapState.panX = 0;
  tripMapState.panY = 0;
}

function tripMapSize() {
  if (tripMapState.printMode) {
    return {
      width: TRIP_MAP_WIDTH,
      height: TRIP_MAP_HEIGHT
    };
  }
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
  return {
    width: TRIP_MAP_WIDTH,
    height: isMobile ? TRIP_MAP_WIDTH : TRIP_MAP_HEIGHT
  };
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cuentas')) {
        const s = db.createObjectStore('cuentas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byMoneda', 'moneda');
        s.createIndex('byViaje', 'viajeId');
      } else {
        const s = req.transaction.objectStore('cuentas');
        if (!s.indexNames.contains('byViaje')) s.createIndex('byViaje', 'viajeId');
      }
      if (!db.objectStoreNames.contains('categorias')) {
        const s = db.createObjectStore('categorias', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byParent', 'parentId');
      }
      if (!db.objectStoreNames.contains('lugares')) {
        const s = db.createObjectStore('lugares', { keyPath: 'id', autoIncrement: true });
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
      if (!db.objectStoreNames.contains('localBackups')) {
        const s = db.createObjectStore('localBackups', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byDate', 'date');
      }
      if (!db.objectStoreNames.contains('appSettings')) {
        db.createObjectStore('appSettings', { keyPath: 'key' });
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

function getLocalBackupSummaries() {
  return store('localBackups').then(s => new Promise((resolve, reject) => {
    const items = [];
    const req = s.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(items);
        return;
      }
      const value = cursor.value || {};
      items.push({
        id: value.id,
        filename: value.filename,
        scope: value.scope,
        date: value.date,
        reason: value.reason
      });
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  }));
}

function localDataUpdatedAt() {
  return localStorage.getItem(DATA_UPDATED_KEY) || '';
}

function setLocalDataUpdatedAt(value = new Date().toISOString()) {
  const next = value || new Date().toISOString();
  localStorage.setItem(DATA_UPDATED_KEY, next);
  return next;
}

function noteLocalDataChanged(storeName) {
  if (!dataTrackingPaused && !['localBackups', 'appSettings'].includes(storeName)) setLocalDataUpdatedAt();
}

async function withDataTrackingPaused(callback) {
  dataTrackingPaused += 1;
  try {
    return await callback();
  } finally {
    dataTrackingPaused = Math.max(0, dataTrackingPaused - 1);
  }
}

async function addRecord(name, data) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.add(data);
    req.onsuccess = () => {
      noteLocalDataChanged(name);
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(name, data) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.put(data);
    req.onsuccess = () => {
      noteLocalDataChanged(name);
      resolve(data);
    };
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
      put.onsuccess = () => {
        noteLocalDataChanged(name);
        resolve(obj);
      };
      put.onerror = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteRecord(name, key) {
  const s = await store(name, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.delete(key);
    req.onsuccess = () => {
      noteLocalDataChanged(name);
      resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}

async function clearStores(names) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    names.forEach(name => tx.objectStore(name).clear());
    tx.oncomplete = () => {
      names.forEach(noteLocalDataChanged);
      resolve(true);
    };
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
const CATEGORY_SEED_KEY = 'gastos_viaje_categories_seeded';
const DEFAULT_CATEGORIAS = [
  { nombre: 'Comida', subs: [] },
  { nombre: 'Transporte', subs: [] },
  { nombre: 'Alojamiento', subs: [] },
  { nombre: 'Ocio', subs: [] }
];
const DEFAULT_MONEDAS = [
  { codigo: 'EUR', nombre: 'Euro', eurPorUnidad: 1, unidadesPorEuro: 1 }
];
const COMMON_CURRENCIES = [
  { codigo: 'PLN', nombre: 'Zloty polaco' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'GBP', nombre: 'Libra esterlina' },
  { codigo: 'JPY', nombre: 'Yen japonés' },
  { codigo: 'CHF', nombre: 'Franco suizo' },
  { codigo: 'NOK', nombre: 'Corona noruega' },
  { codigo: 'SEK', nombre: 'Corona sueca' },
  { codigo: 'DKK', nombre: 'Corona danesa' },
  { codigo: 'CZK', nombre: 'Corona checa' },
  { codigo: 'HUF', nombre: 'Florín húngaro' },
  { codigo: 'RON', nombre: 'Leu rumano' },
  { codigo: 'BGN', nombre: 'Lev búlgaro' },
  { codigo: 'ISK', nombre: 'Corona islandesa' },
  { codigo: 'TRY', nombre: 'Lira turca' },
  { codigo: 'CAD', nombre: 'Dólar canadiense' },
  { codigo: 'AUD', nombre: 'Dólar australiano' },
  { codigo: 'NZD', nombre: 'Dólar neozelandés' },
  { codigo: 'CNY', nombre: 'Yuan chino' },
  { codigo: 'HKD', nombre: 'Dólar de Hong Kong' },
  { codigo: 'SGD', nombre: 'Dólar de Singapur' },
  { codigo: 'KRW', nombre: 'Won surcoreano' },
  { codigo: 'THB', nombre: 'Baht tailandés' },
  { codigo: 'INR', nombre: 'Rupia india' },
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'BRL', nombre: 'Real brasileño' },
  { codigo: 'ARS', nombre: 'Peso argentino' },
  { codigo: 'CLP', nombre: 'Peso chileno' },
  { codigo: 'COP', nombre: 'Peso colombiano' },
  { codigo: 'PEN', nombre: 'Sol peruano' },
  { codigo: 'MAD', nombre: 'Dirham marroquí' },
  { codigo: 'EGP', nombre: 'Libra egipcia' },
  { codigo: 'ZAR', nombre: 'Rand sudafricano' },
  { codigo: 'AED', nombre: 'Dírham de Emiratos' },
  { codigo: 'ILS', nombre: 'Nuevo séquel israelí' }
];
const state = {
  activeTab: 'viajes',
  selectedViajeId: null,
  selectedViajeIds: [],
  cuentas: [],
  categorias: [],
  lugares: [],
  gastos: [],
  viajes: [],
  monedas: [],
  transferencias: []
};

let latestCurrencyQuote = null;

const collator = new Intl.Collator('es', { sensitivity: 'base' });
const todayIso = () => new Date().toISOString().slice(0, 10);
const numberValue = value => {
  const n = parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const optionalNumberValue = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const formatRate = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number(n.toFixed(6)).toString();
};
const formatCoordinate = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Number(n.toFixed(6)).toString();
};
const geocodeLatValue = result => optionalNumberValue(result && (result.lat ?? result.latitude));
const geocodeLngValue = result => optionalNumberValue(result && (result.lon ?? result.lng ?? result.longitude));
const fmtDate = iso => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}) : '-';
const fmtNumberEs = (amount, decimals = 2) => {
  const value = numberValue(amount);
  const sign = value < 0 ? '-' : '';
  const [integer, fraction] = Math.abs(value).toFixed(decimals).split('.');
  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction}`;
};
const fmtCurrency = (amount, currency = 'EUR') => {
  const code = String(currency || 'EUR').toUpperCase();
  const value = fmtNumberEs(amount);
  return code === 'EUR' ? `${value}\u00a0€` : `${value}\u00a0${code}`;
};
const fmtCurrencyWithEur = (amount, currency = 'EUR') => {
  const primary = fmtCurrency(amount, currency);
  if (currency === 'EUR') return primary;
  return `${primary}<div class="currency-eur">≈ ${fmtCurrency(toEur(amount, currency), 'EUR')}</div>`;
};
const fmtBudgetWithEur = (amount, currency = 'EUR') => (
  numberValue(amount) ? fmtCurrencyWithEur(amount, currency) : '-'
);
const fmtCurrencyWithEurInline = (amount, currency = 'EUR') => {
  const primary = fmtCurrency(amount, currency);
  if (currency === 'EUR') return primary;
  return `${primary} <span class="currency-eur-inline">(≈ ${fmtCurrency(toEur(amount, currency), 'EUR')})</span>`;
};
const fmtDailyCurrencyWithEur = (amount, currency = 'EUR') => {
  const primary = `${fmtCurrency(amount, currency)}/día`;
  if (currency === 'EUR') return primary;
  return `${primary} <span class="currency-eur-inline">(≈ ${fmtCurrency(toEur(amount, currency), 'EUR')}/día)</span>`;
};
const formatCurrencyLines = items => items
  .filter(item => Math.abs(numberValue(item.amount)) > 0.000001 || item.always)
  .map(item => `<div>${fmtCurrencyWithEurInline(item.amount, item.currency)}</div>`)
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

function sortLugaresHierarchical(lugares) {
  return sortCategoriasHierarchical(lugares);
}

function lugarName(id) {
  const lugar = state.lugares.find(l => l.id === Number(id));
  return lugar ? lugar.nombre : '';
}

function tripCountryIds(viaje) {
  if (!viaje) return [];
  if (Array.isArray(viaje.paisIds)) return viaje.paisIds.map(Number).filter(Boolean);
  if (viaje.paisId) return [Number(viaje.paisId)].filter(Boolean);
  return [];
}

function tripCityIds(viaje) {
  if (!viaje) return [];
  if (Array.isArray(viaje.ciudadIds)) return viaje.ciudadIds.map(Number).filter(Boolean);
  return [];
}

function tripCountryLabel(viaje) {
  const names = tripCountryIds(viaje).map(lugarName).filter(Boolean);
  return names.length ? names.join(' / ') : '-';
}

function gastoLugarLabel(gasto) {
  const pais = state.lugares.find(l => l.id === Number(gasto.paisId));
  const ciudad = state.lugares.find(l => l.id === Number(gasto.ciudadId));
  if (pais && ciudad) return `${pais.nombre} / ${ciudad.nombre}`;
  if (ciudad) return ciudad.nombre;
  if (pais) return pais.nombre;
  return '-';
}

function gastoCiudadLabel(gasto) {
  const ciudad = state.lugares.find(l => l.id === Number(gasto.ciudadId));
  return ciudad ? ciudad.nombre : '-';
}

function gastosPaisLabel(gastos) {
  const names = [];
  gastos.forEach(g => {
    const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
    const pais = state.lugares.find(l => l.id === Number(g.paisId || (ciudad && ciudad.parentId)));
    if (pais && !names.includes(pais.nombre)) names.push(pais.nombre);
  });
  return names.join(' / ');
}

function gastosPaisNames(gastos) {
  const names = [];
  gastos.forEach(g => {
    const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
    const pais = state.lugares.find(l => l.id === Number(g.paisId || (ciudad && ciudad.parentId)));
    if (pais && !names.includes(pais.nombre)) names.push(pais.nombre);
  });
  return names;
}

function gastoMatchesLugarFilters(g, paisId, ciudadId) {
  if (ciudadId && Number(g.ciudadId) !== Number(ciudadId)) return false;
  if (!paisId) return true;
  const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
  return Number(g.paisId) === Number(paisId) || Number(ciudad && ciudad.parentId) === Number(paisId);
}

function lugarHasCoords(lugar) {
  return lugar && Number.isFinite(Number(lugar.lat)) && Number.isFinite(Number(lugar.lng));
}

function normalizePlaceName(name) {
  return String(name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isTransitPlaceName(name) {
  const normalized = normalizePlaceName(name);
  return normalized === 'transito' || normalized === 'en transito' || normalized === 'transit';
}

function lugarCoordsLabel(lugar) {
  if (!lugarHasCoords(lugar)) return '-';
  return `${Number(lugar.lat).toFixed(5)}, ${Number(lugar.lng).toFixed(5)}`;
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

function currentCurrencyCodeInput() {
  return String($('#m-iso-entry')?.value || '').trim().toUpperCase();
}

function commonCurrencyByCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  return COMMON_CURRENCIES.find(item => item.codigo === normalized) || null;
}

function maybeFillCurrencyName(code, force = false) {
  const item = commonCurrencyByCode(code);
  const input = $('#m-nombre');
  if (!item || !input) return;
  const current = input.value.trim();
  const commonNames = COMMON_CURRENCIES.map(currency => currency.nombre.toLowerCase());
  if (force || !current || commonNames.includes(current.toLowerCase())) input.value = item.nombre;
}

function currencySuggestionMatches(currency, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return currency.codigo.toLowerCase().includes(needle) || currency.nombre.toLowerCase().includes(needle);
}

function currencySuggestionItems() {
  const query = $('#m-iso-entry') ? $('#m-iso-entry').value : '';
  const matches = COMMON_CURRENCIES.filter(currency => currencySuggestionMatches(currency, query));
  return matches.length ? matches : COMMON_CURRENCIES;
}

function hideCurrencySuggestions() {
  const panel = $('#currency-iso-options');
  const input = $('#m-iso-entry');
  if (panel) panel.hidden = true;
  if (input) input.setAttribute('aria-expanded', 'false');
}

function renderCurrencyCodeSuggestions(open = true) {
  const panel = $('#currency-iso-options');
  const input = $('#m-iso-entry');
  if (!panel || !input) return;
  const items = currencySuggestionItems();
  panel.innerHTML = items.map(currency => `
    <button type="button" class="currency-suggestion" data-currency-code="${escapeHtml(currency.codigo)}" role="option">
      <strong>${escapeHtml(currency.codigo)}</strong>
      <span>${escapeHtml(currency.nombre)}</span>
    </button>
  `).join('');
  panel.hidden = !open || !items.length;
  input.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
}

function selectCurrencySuggestion(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const input = $('#m-iso-entry');
  if (!normalized || !input) return;
  input.value = normalized;
  maybeFillCurrencyName(normalized, true);
  clearCurrencyQuote();
  hideCurrencySuggestions();
  input.blur();
}

function clearCurrencyQuote() {
  latestCurrencyQuote = null;
  const useButton = $('#btn-use-moneda-rate');
  if (useButton) useButton.hidden = true;
  setMessage('#msg-moneda-rate', '');
}

async function fetchCurrentCurrencyQuote(code) {
  const currency = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Escribe un código ISO de 3 letras, por ejemplo USD o JPY');
  if (currency === 'EUR') throw new Error('EUR ya es la moneda base');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/EUR/${encodeURIComponent(currency)}`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
    if (!response.ok) throw new Error(data && data.message ? data.message : 'No se pudo consultar ese cambio');
    const rate = numberValue(data && data.rate);
    if (rate <= 0) throw new Error('No se encontró cambio para esa moneda');
    return {
      codigo: currency,
      unidadesPorEuro: rate,
      eurPorUnidad: 1 / rate,
      fecha: data.date || todayIso()
    };
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('La consulta ha tardado demasiado. Revisa la conexión');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function toEur(amount, currency) {
  const cfg = getCurrencyConfig(currency);
  return cfg ? numberValue(amount) * numberValue(cfg.eurPorUnidad || 1) : 0;
}

function fromEur(amount, currency) {
  const cfg = getCurrencyConfig(currency);
  return cfg ? numberValue(amount) * numberValue(cfg.unidadesPorEuro || 1) : 0;
}

function getTripYear(viaje) {
  return (viaje && viaje.fechaInicio ? viaje.fechaInicio.slice(0, 4) : '') || 'Sin fecha';
}

function selectedTripIds() {
  return (state.selectedViajeIds || []).map(Number).filter(Boolean);
}

function selectedTripSet() {
  return new Set(selectedTripIds());
}

function hasTripSelection() {
  return selectedTripIds().length > 0;
}

function gastoMatchesTripSelection(gasto) {
  const ids = selectedTripSet();
  return !ids.size || ids.has(Number(gasto.viajeId));
}

function selectedTripsLabel() {
  const ids = selectedTripSet();
  if (!ids.size) return 'Sin filtro global: se muestran todos los viajes.';
  const selected = state.viajes.filter(v => ids.has(v.id));
  const years = [...new Set(selected.map(getTripYear))].sort();
  if (years.length === 1) {
    const tripsInYear = state.viajes.filter(v => getTripYear(v) === years[0]);
    if (tripsInYear.length && tripsInYear.every(v => ids.has(v.id))) {
      return `Filtro activo: año ${years[0]} (${selected.length} viajes).`;
    }
  }
  if (selected.length === 1) return `Filtro activo: ${selected[0].nombre}.`;
  return `Filtro activo: ${selected.length} viajes seleccionados.`;
}

function syncTripSelectsFromSelection() {
  const ids = selectedTripIds();
  const value = ids.length === 1 ? String(ids[0]) : '';
  if ($('#f-viaje')) $('#f-viaje').value = value;
  if ($('#r-viaje')) $('#r-viaje').value = value;
  if ($('#c-viaje')) $('#c-viaje').value = value;
  state.selectedViajeId = ids.length === 1 ? ids[0] : null;
}

function setSelectedTrips(ids) {
  state.selectedViajeIds = [...new Set((ids || []).map(Number).filter(Boolean))];
  tripMapState.showPlanned = true;
  resetTripMapView();
  syncTripSelectsFromSelection();
}

function defaultTripId() {
  const today = todayIso();
  const trips = state.viajes.slice();
  const active = trips
    .filter(v => (v.fechaInicio || '') <= today && today <= (v.fechaFin || v.fechaInicio || ''))
    .sort((a, b) => (a.fechaFin || '').localeCompare(b.fechaFin || '') || Number(b.id || 0) - Number(a.id || 0));
  if (active.length) return Number(active[0].id);
  const upcoming = trips
    .filter(v => (v.fechaInicio || v.fechaFin || '') >= today)
    .sort((a, b) => {
      const dateA = a.fechaInicio || a.fechaFin || '';
      const dateB = b.fechaInicio || b.fechaFin || '';
      return dateA.localeCompare(dateB) || Number(b.id || 0) - Number(a.id || 0);
    });
  if (upcoming.length) return Number(upcoming[0].id);
  const past = trips
    .sort((a, b) => {
      const dateA = a.fechaInicio || a.fechaFin || '';
      const dateB = b.fechaInicio || b.fechaFin || '';
      return dateB.localeCompare(dateA) || Number(b.id || 0) - Number(a.id || 0);
    });
  return past.length ? Number(past[0].id) : null;
}

function toggleSelectedTrip(id, checked) {
  const current = selectedTripSet();
  const tripId = Number(id);
  if (!tripId) return;
  if (checked) current.add(tripId);
  else current.delete(tripId);
  setSelectedTrips([...current]);
}

function setSelectedYear(year, checked) {
  const current = selectedTripSet();
  state.viajes
    .filter(v => getTripYear(v) === year)
    .forEach(v => {
      if (checked) current.add(v.id);
      else current.delete(v.id);
    });
  setSelectedTrips([...current]);
}

function tripName(id) {
  const trip = state.viajes.find(v => v.id === Number(id));
  return trip ? trip.nombre : '';
}

function accountLabel(account) {
  const suffix = account.viajeId ? ` (${tripName(account.viajeId) || 'viaje'})` : ' (global)';
  return `${account.nombre}${suffix}`;
}

function accountKey(account) {
  return `${(account.nombre || '').trim().toLowerCase()}|${account.moneda || ''}`;
}

function accountBudgetForTrip(viajeId) {
  const tripId = Number(viajeId);
  const tripAccounts = state.cuentas.filter(c => Number(c.viajeId) === tripId && numberValue(c.presupuesto) > 0);
  return tripAccounts.reduce((sum, c) => sum + toEur(c.presupuesto, c.moneda), 0);
}

function globalAccountBudget() {
  return state.cuentas
    .filter(c => !c.viajeId && numberValue(c.presupuesto) > 0)
    .reduce((sum, c) => sum + toEur(c.presupuesto, c.moneda), 0);
}

function effectiveTripBudget(viaje) {
  const explicit = numberValue(viaje && viaje.presupuesto);
  if (explicit > 0) return explicit;
  const accountBudget = accountBudgetForTrip(viaje && viaje.id);
  if (accountBudget > 0) return accountBudget;
  return globalAccountBudget();
}

function accountsForBudgetScope(gastos) {
  const ids = selectedTripSet();
  if (!ids.size) return state.cuentas;
  const tripAccounts = state.cuentas.filter(c => c.viajeId && ids.has(Number(c.viajeId)));
  if (tripAccounts.some(c => numberValue(c.presupuesto) > 0)) return tripAccounts;
  const usedAccountIds = new Set(gastos.map(g => Number(g.cuentaId)));
  return state.cuentas.filter(c => !c.viajeId || usedAccountIds.has(Number(c.id)));
}

function selectedTrips() {
  const ids = selectedTripSet();
  return ids.size ? state.viajes.filter(v => ids.has(Number(v.id))) : [];
}

function inclusiveDateDays(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(1, Math.ceil((endDate - startDate) / 86400000) + 1);
}

function summaryDays(gastos) {
  const selected = selectedTrips();
  const trips = selected.length ? selected : state.viajes;
  const tripDays = trips.reduce((sum, trip) => sum + inclusiveDateDays(trip.fechaInicio, trip.fechaFin), 0);
  if (tripDays > 0) return tripDays;
  if (!gastos.length) return 1;
  const dates = gastos.map(g => new Date(`${g.fecha}T00:00:00`));
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  return Math.max(1, Math.ceil((max - min) / 86400000) + 1);
}

function tripBudgetSummary(gastos) {
  const selected = selectedTrips();
  const trips = selected.length ? selected : state.viajes;
  if (!trips.length) return null;
  const budgetEur = trips.reduce((sum, trip) => sum + effectiveTripBudget(trip), 0);
  if (budgetEur <= 0) return null;
  const spentEur = gastos.reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
  return {
    budgetEur,
    remainingEur: budgetEur - spentEur,
    pct: spentEur * 100 / budgetEur
  };
}

function setMessage(selector, text, isError = false) {
  const el = $(selector);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', isError);
}

function backupHistory() {
  return localBackupHistoryCache;
}

function backupReasonLabel(reason) {
  const labels = {
    entry: 'Entrada en la app',
    manual: 'Copia manual',
    'before-sync': 'Antes de sincronizar',
    'after-sync': 'Después de sincronizar'
  };
  return labels[reason] || 'Copia local';
}

async function refreshLocalBackupHistory() {
  const all = await getLocalBackupSummaries();
  localBackupHistoryCache = all
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, LOCAL_BACKUP_LIMIT);
  renderBackupHistory();
  return localBackupHistoryCache;
}

async function recordBackup(filename, scope = 'all', data = null, reason = 'manual') {
  const entry = {
    filename,
    scope,
    date: new Date().toISOString(),
    reason,
    data: data || buildBackupData('all')
  };
  await addRecord('localBackups', entry);
  const all = (await getLocalBackupSummaries()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  for (const old of all.slice(LOCAL_BACKUP_LIMIT)) {
    await deleteRecord('localBackups', Number(old.id));
  }
  localBackupHistoryCache = all.slice(0, LOCAL_BACKUP_LIMIT);
  localStorage.setItem(BACKUP_KEY, entry.date);
  renderBackupStatus();
  renderBackupHistory();
  return entry;
}

function currentTripInProgress() {
  const ids = selectedTripSet();
  const today = todayIso();
  const trips = ids.size ? state.viajes.filter(v => ids.has(Number(v.id))) : state.viajes;
  return trips.some(v => v.fechaInicio && v.fechaFin && v.fechaInicio <= today && today <= v.fechaFin);
}

function renderBackupHistory() {
  const targets = $$('#backup-history, .backup-history');
  if (!targets.length) return;
  const history = backupHistory();
  if (!history.length) {
    targets.forEach(el => { el.innerHTML = '<p class="small">Todavía no hay copias guardadas en este dispositivo.</p>'; });
    return;
  }
  const html = `<ul class="backup-history-list">${history.map(item => {
    const date = new Date(item.date);
    const type = item.scope === 'trip' ? 'Un viaje' : 'Todos los viajes';
    return `<li><span class="backup-history-copy"><strong>${escapeHtml(item.filename || 'copia JSON')}</strong><span><b>${escapeHtml(backupReasonLabel(item.reason))}</b> · ${type} · ${date.toLocaleString('es-ES')}</span></span><button class="ghost compact-button" type="button" data-download-local-backup="${item.id}">Guardar archivo</button></li>`;
  }).join('')}</ul>`;
  targets.forEach(el => { el.innerHTML = html; });
}

function transferRateLabel(transfer) {
  if (!transfer || transfer.monedaFrom === transfer.monedaTo) return '-';
  const rate = numberValue(transfer.tipoCambio) || (numberValue(transfer.importeFrom) > 0
    ? numberValue(transfer.importeTo) / numberValue(transfer.importeFrom)
    : 0);
  if (rate <= 0) return '-';
  return `1\u00a0${transfer.monedaFrom} = ${rate.toLocaleString('es-ES', { maximumFractionDigits: 6 })}\u00a0${transfer.monedaTo}`;
}

function renderBackupStatus() {
  const items = $$('.backup-status');
  if (!items.length) {
    syncBackupShareAvailability();
    return;
  }
  const saved = localStorage.getItem(BACKUP_KEY);
  if (!saved) {
    items.forEach(el => {
      el.textContent = 'Aún no hay ninguna copia local en este dispositivo.';
      el.classList.add('backup-warning');
    });
    renderBackupHistory();
    syncBackupShareAvailability();
    return;
  }
  const date = new Date(saved);
  const ageDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  items.forEach(el => {
    el.textContent = `Última copia local creada: ${date.toLocaleString('es-ES')}${ageDays >= 7 ? ` (hace ${ageDays} días)` : ''}.`;
    const needsReminder = currentTripInProgress() && ageDays >= 2;
    if (needsReminder) el.textContent = `Recuerda crear una copia local: estás de viaje y la última copia es de hace ${ageDays} días.`;
    el.classList.toggle('backup-warning', needsReminder || ageDays >= 7);
  });
  renderBackupHistory();
  syncBackupShareAvailability();
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
  return `<button class="ghost" data-open-ticket="${gasto.id}" type="button">${escapeHtml(gasto.ticketName || 'Ver ticket')}</button>`;
}

function normalizeTicketDataValue(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value.data === 'string') return value.data;
  if (value && typeof value.url === 'string') return value.url;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function ticketDataInfo(value, fallbackType = 'application/octet-stream') {
  const original = normalizeTicketDataValue(value);
  let data = original;
  if (data.startsWith('data:') && !data.includes(',')) {
    const marker = data.indexOf(';base64');
    if (marker >= 0) data = `${data.slice(0, marker + 7)},${data.slice(marker + 7)}`;
  }
  if (data.startsWith('data:') && data.includes(',')) {
    const comma = data.indexOf(',');
    const meta = data.slice(0, comma);
    const payload = data.slice(comma + 1);
    const mime = (meta.match(/^data:([^;]+)/) || [])[1] || fallbackType;
    try {
      if (/;base64(?:;|$)/i.test(meta)) {
        const binary = atob(payload.replace(/\s+/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return { data, blob: new Blob([bytes], { type: mime }), encoding: 'data-url' };
      }
      return {
        data,
        blob: new Blob([decodeURIComponent(payload)], { type: mime }),
        encoding: 'data-url'
      };
    } catch {
      // Preserve malformed legacy content exactly instead of blocking the backup.
    }
  }
  return {
    data: original,
    blob: new Blob([original], { type: fallbackType }),
    encoding: 'legacy-text'
  };
}

function dataUrlToBlob(dataUrl, fallbackType = 'application/octet-stream') {
  return ticketDataInfo(dataUrl, fallbackType).blob;
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function prepareCloudBackupData(sourceData) {
  const attachments = new Map();
  const gastos = [];
  const sourceGastos = Array.isArray(sourceData && sourceData.gastos) ? sourceData.gastos : [];
  for (let index = 0; index < sourceGastos.length; index += 1) {
    const gasto = sourceGastos[index];
    const next = { ...gasto };
    if (gasto.ticketData) {
      setSyncMessage(`Preparando tickets y fotos: ${index + 1} de ${sourceGastos.length}`);
      const ticket = ticketDataInfo(gasto.ticketData, gasto.ticketType || 'application/octet-stream');
      const blob = ticket.blob;
      const id = await sha256Hex(blob);
      const parts = Math.max(1, Math.ceil(ticket.data.length / CLOUD_ATTACHMENT_CHUNK_CHARS));
      next.ticketRef = id;
      delete next.ticketData;
      if (!attachments.has(id)) {
        attachments.set(id, {
          id,
          name: gasto.ticketName || 'ticket',
          mime: blob.type || gasto.ticketType || 'application/octet-stream',
          size: blob.size,
          parts,
          encoding: ticket.encoding,
          data: ticket.data
        });
      }
    } else {
      delete next.ticketRef;
    }
    gastos.push(next);
  }
  return {
    data: {
      ...sourceData,
      cloudFormat: 2,
      gastos,
      attachments: Array.from(attachments.values()).map(({ data, ...metadata }) => metadata)
    },
    attachments: Array.from(attachments.values())
  };
}

async function syncAction(body) {
  const response = await fetch(SYNC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-key': syncKey()
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      payload_too_large: 'Un fragmento supera el tamaño permitido por Netlify',
      attachment_part_too_large: 'Un fragmento de foto es demasiado grande',
      attachment_incomplete: 'La foto no llegó completa a Netlify'
    };
    throw new Error(messages[payload.error] || 'No se pudo guardar un archivo en Netlify');
  }
  return payload;
}

async function existingCloudAttachmentIds(ids) {
  const existing = new Set();
  for (let index = 0; index < ids.length; index += CLOUD_ATTACHMENT_CHECK_BATCH) {
    const batch = ids.slice(index, index + CLOUD_ATTACHMENT_CHECK_BATCH);
    setSyncMessage(`Comprobando fotos en la nube: ${Math.min(index + batch.length, ids.length)} de ${ids.length}`);
    const result = await syncAction({ action: 'check-attachments', ids: batch });
    (result.existing || []).forEach(id => existing.add(id));
  }
  return existing;
}

async function uploadCloudAttachments(attachments) {
  const unique = Array.from(new Map(attachments.map(item => [item.id, item])).values());
  if (!unique.length) return { total: 0, uploaded: 0, reused: 0 };
  const existing = await existingCloudAttachmentIds(unique.map(item => item.id));
  const missing = unique.filter(item => !existing.has(item.id));
  for (let fileIndex = 0; fileIndex < missing.length; fileIndex += 1) {
    const attachment = missing[fileIndex];
    const total = Math.max(1, Math.ceil(String(attachment.data).length / CLOUD_ATTACHMENT_CHUNK_CHARS));
    for (let part = 0; part < total; part += 1) {
      setSyncMessage(`Subiendo foto ${fileIndex + 1} de ${missing.length}, parte ${part + 1} de ${total}`);
      await syncAction({
        action: 'put-attachment-part',
        id: attachment.id,
        index: part,
        total,
        data: String(attachment.data).slice(
          part * CLOUD_ATTACHMENT_CHUNK_CHARS,
          (part + 1) * CLOUD_ATTACHMENT_CHUNK_CHARS
        )
      });
    }
    await syncAction({
      action: 'commit-attachment',
      id: attachment.id,
      total,
      name: attachment.name,
      mime: attachment.mime,
      size: attachment.size,
      encoding: attachment.encoding
    });
  }
  return { total: unique.length, uploaded: missing.length, reused: existing.size };
}

async function localAttachmentDataById() {
  const result = new Map();
  const gastos = state.gastos.filter(gasto => gasto.ticketData);
  for (let index = 0; index < gastos.length; index += 1) {
    const gasto = gastos[index];
    const ticket = ticketDataInfo(gasto.ticketData, gasto.ticketType || 'application/octet-stream');
    result.set(await sha256Hex(ticket.blob), ticket.data);
  }
  return result;
}

async function downloadCloudAttachment(attachment) {
  const chunks = [];
  for (let part = 0; part < Number(attachment.parts || 0); part += 1) {
    setSyncMessage(`Recuperando fotos desde la nube: parte ${part + 1} de ${attachment.parts}`);
    const response = await fetch(
      `${SYNC_ENDPOINT}?attachment=${encodeURIComponent(attachment.id)}&part=${part}`,
      {
        headers: { 'x-sync-key': syncKey() },
        cache: 'force-cache'
      }
    );
    if (!response.ok) throw new Error(`No se pudo recuperar ${attachment.name || 'una foto'} desde la nube`);
    chunks.push(await response.text());
  }
  const dataUrl = chunks.join('');
  const ticket = ticketDataInfo(dataUrl, attachment.mime || 'application/octet-stream');
  if (await sha256Hex(ticket.blob) !== attachment.id) {
    throw new Error(`La foto ${attachment.name || ''} no superó la comprobación de integridad`);
  }
  return dataUrl;
}

async function hydrateCloudBackupData(sourceData) {
  const attachments = Array.isArray(sourceData && sourceData.attachments) ? sourceData.attachments : [];
  if (!attachments.length) return sourceData;
  const local = await localAttachmentDataById();
  const downloaded = new Map();
  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    if (local.has(attachment.id)) {
      downloaded.set(attachment.id, local.get(attachment.id));
      continue;
    }
    setSyncMessage(`Recuperando foto ${index + 1} de ${attachments.length} desde la nube`);
    downloaded.set(attachment.id, await downloadCloudAttachment(attachment));
  }
  return {
    ...sourceData,
    gastos: (sourceData.gastos || []).map(gasto => ({
      ...gasto,
      ticketData: gasto.ticketRef ? (downloaded.get(gasto.ticketRef) || '') : (gasto.ticketData || '')
    }))
  };
}

function openTicket(gastoId) {
  const gasto = state.gastos.find(g => Number(g.id) === Number(gastoId));
  if (!gasto || !gasto.ticketData) throw new Error('No se encuentra el ticket');
  const blob = dataUrlToBlob(gasto.ticketData, gasto.ticketType || 'application/octet-stream');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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

async function chooseSaveFile(filename, type = 'application/octet-stream', extension = '') {
  if (typeof window.showSaveFilePicker !== 'function') return { status: 'unsupported' };
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: extension === '.json' ? 'Copia JSON' : 'Archivo',
        accept: { [type]: extension ? [extension] : [] }
      }]
    });
    return { status: 'selected', handle };
  } catch (error) {
    if (error && error.name === 'AbortError') return { status: 'cancelled' };
    console.warn('No se pudo abrir el selector de guardado; se usará Descargas', error);
    return { status: 'unsupported' };
  }
}

async function writeBlobToFileHandle(handle, blob) {
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}

function backupDirectorySupported() {
  return typeof window.showDirectoryPicker === 'function';
}

async function getBackupDirectorySetting({ refresh = false } = {}) {
  if (!refresh && backupDirectorySettingCache !== undefined) return backupDirectorySettingCache;
  backupDirectorySettingCache = await getOne('appSettings', BACKUP_DIRECTORY_SETTING_KEY);
  return backupDirectorySettingCache;
}

async function backupDirectoryPermission(handle, request = false) {
  if (!handle) return 'denied';
  const options = { mode: 'readwrite' };
  if (typeof handle.queryPermission !== 'function') return 'unknown';
  let permission = await handle.queryPermission(options);
  if (permission === 'prompt' && request && typeof handle.requestPermission === 'function') {
    permission = await handle.requestPermission(options);
  }
  return permission;
}

async function renderBackupDirectorySetting() {
  const status = $('#backup-folder-status');
  const selectButton = $('#backup-folder-select');
  const forgetButton = $('#backup-folder-forget');
  if (!status || !selectButton || !forgetButton) return;
  if (!backupDirectorySupported()) {
    status.textContent = 'Este navegador no permite fijar una carpeta. Se usará el selector de archivos o Descargas.';
    selectButton.style.display = 'none';
    forgetButton.style.display = 'none';
    return;
  }
  selectButton.style.display = '';
  const setting = await getBackupDirectorySetting();
  if (!setting || !setting.handle) {
    status.textContent = 'Sin carpeta fija. La app preguntará dónde guardar cada archivo.';
    selectButton.textContent = 'Elegir carpeta';
    forgetButton.style.display = 'none';
    return;
  }
  let permission = 'unknown';
  try {
    permission = await backupDirectoryPermission(setting.handle);
  } catch {
    permission = 'denied';
  }
  const name = setting.name || setting.handle.name || 'carpeta seleccionada';
  status.textContent = permission === 'granted'
    ? `Carpeta fija: ${name}`
    : `Carpeta recordada: ${name}. Android puede pedir autorización al guardar.`;
  selectButton.textContent = 'Cambiar carpeta';
  forgetButton.style.display = '';
}

async function selectBackupDirectory() {
  if (!backupDirectorySupported()) {
    showBackupResult('Carpeta no disponible', 'Este navegador no permite fijar una carpeta. Las copias seguirán usando el selector de archivos o Descargas.');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const setting = {
      key: BACKUP_DIRECTORY_SETTING_KEY,
      handle,
      name: handle.name || 'Carpeta seleccionada',
      updatedAt: new Date().toISOString()
    };
    await putRecord('appSettings', setting);
    backupDirectorySettingCache = setting;
    await renderBackupDirectorySetting();
    setMessage('#msg-backup', `Carpeta de copias fijada: ${setting.name}`);
  } catch (error) {
    if (!error || error.name !== 'AbortError') {
      setMessage('#msg-backup', `No se pudo seleccionar la carpeta: ${error.message || error}`, true);
    }
  }
}

async function forgetBackupDirectory() {
  await deleteRecord('appSettings', BACKUP_DIRECTORY_SETTING_KEY);
  backupDirectorySettingCache = null;
  await renderBackupDirectorySetting();
  setMessage('#msg-backup', 'Se olvidó la carpeta fija. La próxima copia volverá a preguntar dónde guardarla.');
}

async function saveBlobToBackupDirectory(filename, blob, requestPermission = true) {
  const setting = await getBackupDirectorySetting();
  if (!setting || !setting.handle) return { status: 'unconfigured' };
  try {
    const permission = await backupDirectoryPermission(setting.handle, requestPermission);
    if (permission === 'denied' || permission === 'prompt') {
      await renderBackupDirectorySetting();
      return { status: 'denied', name: setting.name || setting.handle.name || '' };
    }
    const fileHandle = await setting.handle.getFileHandle(filename, { create: true });
    await writeBlobToFileHandle(fileHandle, blob);
    return { status: 'saved', name: setting.name || setting.handle.name || '' };
  } catch (error) {
    console.warn('No se pudo guardar en la carpeta fija', error);
    await renderBackupDirectorySetting();
    return { status: 'failed', name: setting.name || setting.handle.name || '', error };
  }
}

async function saveBlobOnDevice(filename, blob, fallbackLink = null) {
  const fixedDirectory = await saveBlobToBackupDirectory(filename, blob);
  if (fixedDirectory.status === 'saved') return 'folder';
  const selection = await chooseSaveFile(filename, blob.type || 'application/octet-stream', '.json');
  if (selection.status === 'cancelled') return 'cancelled';
  if (selection.status === 'selected') {
    try {
      await writeBlobToFileHandle(selection.handle, blob);
      return 'picker';
    } catch (error) {
      console.warn('No se pudo guardar en la ubicación elegida; se usará Descargas', error);
    }
  }
  if (fallbackLink) fallbackLink.click();
  else downloadText(filename, await blob.text(), blob.type || 'application/octet-stream');
  return 'download';
}

function downloadUtf8Csv(filename, text) {
  downloadText(filename, `\ufeff${text}`, 'text/csv;charset=utf-8');
}

function slugFilePart(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'sin-nombre';
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia('(max-width: 720px)').matches;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCurrentCsv() {
  const rows = filteredGastos();
  const header = ['Fecha', 'Viaje', 'Categoría', 'Subcategoría', 'Cuenta', 'Moneda', 'Importe', 'EUR', 'Descripción', 'Ticket'];
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
  downloadUtf8Csv(`gastos_resumen_${APP_VERSION}_${todayIso()}.csv`, lines.join('\r\n'));
}

function backupFilename(data) {
  const timestamp = backupTimestamp();
  if (data.backupScope === 'trip' && data.viajes && data.viajes[0]) {
    return `gastos_${slugFilePart(data.viajes[0].nombre)}_${timestamp}.json`;
  }
  return `gastos_todos-los-viajes_${timestamp}.json`;
}

function backupTimestamp() {
  const date = new Date();
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3)
  ].join('-');
}

function buildJsonBackupPayload(scope = 'all', tripId = null) {
  const data = buildBackupData(scope, tripId);
  const json = JSON.stringify(data, null, 2);
  const filename = backupFilename(data);
  return { data, json, filename };
}

async function prepareJsonBackup({ autoDownload = false, scope = 'all', tripId = null } = {}) {
  const { data, json, filename } = buildJsonBackupPayload(scope, tripId);
  const blob = new Blob([json], { type: 'application/json' });
  const link = $('#export-link');
  const openLink = $('#export-open-link');
  if (link.dataset.objectUrl) URL.revokeObjectURL(link.dataset.objectUrl);
  if (openLink.dataset.objectUrl) URL.revokeObjectURL(openLink.dataset.objectUrl);
  const url = URL.createObjectURL(blob);
  const openUrl = URL.createObjectURL(new Blob([json], { type: 'text/plain' }));
  link.href = url;
  link.download = filename;
  link.dataset.objectUrl = url;
  link.style.display = 'inline-flex';
  link.textContent = `Descargar ${filename}`;
  openLink.href = openUrl;
  openLink.dataset.objectUrl = openUrl;
  openLink.style.display = 'inline-flex';
  if ($('#export-json')) $('#export-json').value = json;
  if ($('#export-panel')) $('#export-panel').style.display = 'none';
  const saveMethod = autoDownload ? await saveBlobOnDevice(filename, blob, link) : 'prepared';
  await recordBackup(filename, scope, data, 'manual');
  return { filename, data, saveMethod };
}

async function createEntryBackup() {
  const data = buildBackupData('all');
  const filename = `gastos_entrada_${backupTimestamp()}.json`;
  return recordBackup(filename, 'all', data, 'entry');
}

async function createSyncBackup(reason) {
  const after = reason === 'after-sync';
  const data = buildBackupData('all');
  const filename = `gastos_${after ? 'sincronizado' : 'antes-de-sincronizar'}_${backupTimestamp()}${after ? '-2' : ''}.json`;
  return recordBackup(filename, 'all', data, reason);
}

function fillSelect(selector, options, placeholder) {
  const el = $(selector);
  if (!el) return;
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

function fillMultiSelect(selector, options, selectedValues = []) {
  const el = $(selector);
  if (!el) return;
  const selectedOrder = (selectedValues.length ? selectedValues : [...el.selectedOptions].map(o => o.value)).map(String);
  const selected = new Set(selectedOrder);
  const byValue = new Map(options.map(item => [String(item.value), item]));
  const orderedOptions = [
    ...selectedOrder.map(value => byValue.get(value)).filter(Boolean),
    ...options.filter(item => !selected.has(String(item.value)))
  ];
  el.innerHTML = '';
  orderedOptions.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    opt.selected = selected.has(String(item.value));
    el.appendChild(opt);
  });
}

function selectedMultiValues(selector) {
  const el = $(selector);
  return el ? [...el.selectedOptions].map(o => Number(o.value)).filter(Boolean) : [];
}

function allMultiValues(selector) {
  const el = $(selector);
  return el ? [...el.options].map(o => Number(o.value)).filter(Boolean) : [];
}

function fillOptionList(selector, options) {
  const el = $(selector);
  if (!el) return;
  el.innerHTML = '';
  options.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    if (item.parentId != null) opt.dataset.parentId = String(item.parentId);
    el.appendChild(opt);
  });
}

function moveSelectedMultiOption(selector, direction) {
  const el = $(selector);
  if (!el) return;
  const selected = [...el.selectedOptions];
  if (!selected.length) return;
  const ordered = direction < 0 ? selected : selected.reverse();
  ordered.forEach(option => {
    const sibling = direction < 0 ? option.previousElementSibling : option.nextElementSibling;
    if (!sibling) return;
    if (direction < 0) el.insertBefore(option, sibling);
    else el.insertBefore(sibling, option);
  });
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function unselectSelectedMultiOptions(selector) {
  const el = $(selector);
  if (!el) return;
  [...el.selectedOptions].forEach(option => {
    option.selected = false;
  });
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function removeSelectedMultiOptions(selector) {
  const el = $(selector);
  if (!el) return;
  [...el.selectedOptions].forEach(option => option.remove());
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function resetPlannedCitySelector(countrySelector, citySelector) {
  syncPlannedCitySelector(countrySelector, citySelector, true);
  const el = $(citySelector);
  if (!el) return;
  [...el.options].forEach(option => { option.selected = false; });
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function addCuenta({ nombre, moneda, saldoInicial = 0, presupuesto = 0, nota = '', viajeId = null }) {
  const now = new Date().toISOString();
  return addRecord('cuentas', {
    nombre,
    moneda,
    viajeId: viajeId ? Number(viajeId) : null,
    saldoInicial: numberValue(saldoInicial),
    saldoActual: numberValue(saldoInicial),
    presupuesto: numberValue(presupuesto),
    nota,
    createdAt: now,
    updatedAt: now
  });
}

async function cloneGlobalAccountsForTrip(viajeId) {
  const tripId = Number(viajeId);
  if (!tripId) return;
  const globalAccounts = state.cuentas.filter(c => !c.viajeId);
  const existingTripAccounts = state.cuentas.filter(c => Number(c.viajeId) === tripId);
  for (const account of globalAccounts) {
    const exists = existingTripAccounts.some(c =>
      (c.nombre || '').trim().toLowerCase() === (account.nombre || '').trim().toLowerCase()
      && c.moneda === account.moneda
    );
    if (exists) continue;
    await addCuenta({
      nombre: account.nombre,
      moneda: account.moneda,
      saldoInicial: 0,
      presupuesto: 0,
      nota: 'Copiada desde plantilla global',
      viajeId: tripId
    });
  }
}

async function migrateGlobalAccountToTrip(accountId, viajeId) {
  const tripId = Number(viajeId);
  const source = state.cuentas.find(c => c.id === Number(accountId));
  const trip = state.viajes.find(v => v.id === tripId);
  if (!source || source.viajeId || !trip) throw new Error('Selecciona una cuenta global y un viaje');
  const existing = state.cuentas.find(c =>
    Number(c.viajeId) === tripId
    && (c.nombre || '').trim().toLowerCase() === (source.nombre || '').trim().toLowerCase()
    && c.moneda === source.moneda
  );
  const targetId = existing ? existing.id : await addCuenta({
    nombre: source.nombre,
    moneda: source.moneda,
    saldoInicial: numberValue(source.saldoActual),
    presupuesto: 0,
    nota: `Migrada desde cuenta global para ${trip.nombre}`,
    viajeId: tripId
  });
  const expenses = state.gastos.filter(g => Number(g.viajeId) === tripId && Number(g.cuentaId) === Number(source.id));
  for (const gasto of expenses) {
    await updateRecord('gastos', Number(gasto.id), { cuentaId: Number(targetId) });
  }
  return targetId;
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

async function addLugar({ nombre, parentId = null, lat = null, lng = null }) {
  return addRecord('lugares', {
    nombre,
    parentId: parentId ? Number(parentId) : null,
    lat: optionalNumberValue(lat),
    lng: optionalNumberValue(lng)
  });
}

async function updateLugar(id, patch) {
  return updateRecord('lugares', Number(id), patch);
}

async function delLugar(id) {
  return deleteRecord('lugares', Number(id));
}

async function addViaje({ nombre, fechaInicio, fechaFin, presupuesto = 0, paisIds = [], ciudadIds = [] }) {
  const now = new Date().toISOString();
  const id = await addRecord('viajes', {
    nombre,
    fechaInicio,
    fechaFin,
    presupuesto: numberValue(presupuesto),
    paisIds: (paisIds || []).map(Number).filter(Boolean),
    ciudadIds: (ciudadIds || []).map(Number).filter(Boolean),
    createdAt: now,
    updatedAt: now
  });
  await cloneGlobalAccountsForTrip(id);
  return id;
}

async function updateViaje(id, patch) {
  return updateRecord('viajes', Number(id), patch);
}

async function delViaje(id) {
  return deleteRecord('viajes', Number(id));
}

function normalizeCurrencyCode(codigo) {
  const code = String(codigo || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error('Escribe un código ISO de 3 letras, por ejemplo PLN, USD o JPY');
  if (code === 'EUR') throw new Error('EUR ya es la moneda base');
  return code;
}

function normalizeCurrencyValues({ codigo, nombre = '', eurPorUnidad, unidadesPorEuro }) {
  const code = normalizeCurrencyCode(codigo);
  const eur = numberValue(eurPorUnidad);
  const back = numberValue(unidadesPorEuro);
  if (eur <= 0 || back <= 0) throw new Error('Indica equivalencias mayores que cero');
  return {
    codigo: code,
    nombre: String(nombre || '').trim(),
    eurPorUnidad: eur,
    unidadesPorEuro: back
  };
}

async function upsertMoneda(data) {
  const values = normalizeCurrencyValues(data);
  const now = new Date().toISOString();
  return putRecord('monedas', {
    ...values,
    updatedAt: now
  });
}

async function updateMonedaWithCode(oldCodigo, data) {
  const oldCode = normalizeCurrencyCode(oldCodigo);
  const values = normalizeCurrencyValues(data);
  const newCode = values.codigo;
  const now = new Date().toISOString();
  if (newCode !== oldCode && (await getOne('monedas', newCode))) throw new Error(`Ya existe la moneda ${newCode}`);
  await putRecord('monedas', { ...values, updatedAt: now });
  if (newCode === oldCode) return true;

  const cuentas = await getAll('cuentas');
  for (const cuenta of cuentas) {
    if (cuenta.moneda === oldCode) await putRecord('cuentas', { ...cuenta, moneda: newCode, updatedAt: now });
  }

  const gastos = await getAll('gastos');
  for (const gasto of gastos) {
    if (gasto.moneda === oldCode) {
      await putRecord('gastos', {
        ...gasto,
        moneda: newCode,
        importeEur: numberValue(gasto.importe) * values.eurPorUnidad,
        updatedAt: now
      });
    }
  }

  const transferencias = await getAll('transferencias');
  for (const transfer of transferencias) {
    if (transfer.monedaFrom === oldCode || transfer.monedaTo === oldCode) {
      await putRecord('transferencias', {
        ...transfer,
        monedaFrom: transfer.monedaFrom === oldCode ? newCode : transfer.monedaFrom,
        monedaTo: transfer.monedaTo === oldCode ? newCode : transfer.monedaTo,
        updatedAt: now
      });
    }
  }

  await deleteRecord('monedas', oldCode);
  return true;
}

async function ensureBaseCurrency() {
  if (await getOne('monedas', 'EUR')) return;
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
  const shouldSeedDefaultChildren = existing.length === 0;
  for (const cat of DEFAULT_CATEGORIAS) {
    let parent = existing.find(c => !c.parentId && (c.nombre || '').trim().toLowerCase() === cat.nombre.toLowerCase());
    if (!parent) {
      const parentId = await addCategoria({ nombre: cat.nombre });
      parent = { id: parentId, nombre: cat.nombre, parentId: null };
      existing.push(parent);
    }
    if (!shouldSeedDefaultChildren) continue;
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

async function addGasto({ fecha, viajeId, cuentaId, moneda, catId, subcatId = null, paisId = null, ciudadId = null, importe, desc = '', ticketName = '', ticketType = '', ticketData = '' }) {
  if (!hasValidCurrency(moneda)) throw new Error('Configura la equivalencia de esa moneda antes de usarla');
  const account = state.cuentas.find(c => c.id === Number(cuentaId));
  if (account && account.moneda !== moneda) throw new Error('La moneda del gasto debe coincidir con la cuenta');
  if (account && account.viajeId && Number(viajeId) !== Number(account.viajeId)) throw new Error('Esa cuenta pertenece a otro viaje');
  const amount = numberValue(importe);
  if (amount === 0) throw new Error('El importe no puede ser cero');
  const now = new Date().toISOString();
  const id = await addRecord('gastos', {
    fecha,
    viajeId: viajeId ? Number(viajeId) : null,
    cuentaId: Number(cuentaId),
    moneda,
    catId: Number(catId),
    subcatId: subcatId ? Number(subcatId) : null,
    paisId: paisId ? Number(paisId) : null,
    ciudadId: ciudadId ? Number(ciudadId) : null,
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
  next.paisId = next.paisId ? Number(next.paisId) : null;
  next.ciudadId = next.ciudadId ? Number(next.ciudadId) : null;
  const account = state.cuentas.find(c => c.id === next.cuentaId) || await getOne('cuentas', next.cuentaId);
  if (!account) throw new Error('La cuenta seleccionada no existe');
  if (account.viajeId && Number(next.viajeId) !== Number(account.viajeId)) throw new Error('Esa cuenta pertenece a otro viaje');
  next.moneda = account.moneda;
  if (!hasValidCurrency(next.moneda)) throw new Error('Configura la equivalencia de esa moneda antes de usarla');
  next.importe = numberValue(next.importe);
  if (next.importe === 0) throw new Error('El importe no puede ser cero');
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
  const gastoId = Number(id);
  const current = state.gastos.find(g => g.id === gastoId) || await getOne('gastos', gastoId);
  if (current) {
    const account = await getOne('cuentas', Number(current.cuentaId));
    if (account) {
      await updateCuenta(account.id, { saldoActual: +(numberValue(account.saldoActual) + numberValue(current.importe)).toFixed(2) });
    }
  }
  return deleteRecord('gastos', gastoId);
}

async function addTransferencia({ fecha, fromId, toId, importe, importeTo = null, nota = '' }) {
  const source = state.cuentas.find(c => c.id === Number(fromId)) || await getOne('cuentas', Number(fromId));
  const target = state.cuentas.find(c => c.id === Number(toId)) || await getOne('cuentas', Number(toId));
  if (!source || !target) throw new Error('Selecciona cuenta de origen y destino');
  if (source.id === target.id) throw new Error('La cuenta de origen y destino no pueden ser la misma');
  if (!hasValidCurrency(source.moneda) || !hasValidCurrency(target.moneda)) throw new Error('Configura las monedas de las cuentas antes de transferir');
  const amountFrom = numberValue(importe);
  if (amountFrom <= 0) throw new Error('El importe debe ser mayor que cero');
  const explicitAmountTo = numberValue(importeTo);
  const eur = toEur(amountFrom, source.moneda);
  const amountTo = explicitAmountTo > 0 ? explicitAmountTo : fromEur(eur, target.moneda);
  if (source.moneda !== target.moneda && amountTo <= 0) throw new Error('Indica el importe que entra en destino o configura el cambio de la moneda');
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
    tipoCambio: amountTo / amountFrom,
    importeToManual: explicitAmountTo > 0,
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
  const [cuentas, categorias, lugares, gastos, viajes, monedas, transferencias] = await Promise.all([
    getAll('cuentas'),
    getAll('categorias'),
    getAll('lugares'),
    getAll('gastos'),
    getAll('viajes'),
    getAll('monedas'),
    getAll('transferencias')
  ]);
  state.cuentas = cuentas.sort(byName);
  state.categorias = sortCategoriasHierarchical(categorias);
  state.lugares = sortLugaresHierarchical(lugares);
  state.gastos = gastos.map(g => ({ ...g, importeEur: g.importeEur ?? toEur(g.importe, g.moneda) }));
  state.viajes = viajes.sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || '') || byName(a, b));
  const validSelectedTripIds = selectedTripIds().filter(id => state.viajes.some(v => v.id === id));
  if (!validSelectedTripIds.length && !hasAppliedDefaultTripSelection && state.viajes.length) {
    const defaultTripIdValue = defaultTripId();
    setSelectedTrips(defaultTripIdValue ? [defaultTripIdValue] : []);
    hasAppliedDefaultTripSelection = true;
  } else {
    setSelectedTrips(validSelectedTripIds);
  }
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
  renderLugarSelectors();
  renderViajesHome();
  renderCuentas();
  renderTransferencias();
  renderViajes();
  renderMonedasConfig();
  renderCategorias();
  renderLugares();
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
  const accounts = state.cuentas.map(c => ({ value: String(c.id), label: accountLabel(c) }));
  renderGastoAccountSelector();
  renderFilterAccountSelector();
  renderResumenAccountSelector();
  renderTransferAccountSelectors();
  renderEditGastoAccountSelector();
}

function accountsForGastoTrip(viajeId) {
  const tripId = Number(viajeId);
  return state.cuentas.filter(c => tripId ? Number(c.viajeId) === tripId : !c.viajeId);
}

function renderGastoAccountSelector() {
  const tripId = Number($('#g-viaje') ? $('#g-viaje').value : 0);
  const accounts = accountsForGastoTrip(tripId).map(c => ({ value: String(c.id), label: accountLabel(c) }));
  fillSelect('#g-cuenta', accounts, '(elige cuenta)');
  const selected = state.cuentas.find(c => Number(c.id) === Number($('#g-cuenta') ? $('#g-cuenta').value : 0));
  if (selected && $('#g-moneda')) $('#g-moneda').value = selected.moneda;
}

function applyDefaultTripCountryToExpense() {
  if (!$('#g-viaje') || !$('#g-pais')) return;
  const trip = state.viajes.find(v => Number(v.id) === Number($('#g-viaje').value));
  const paisIds = tripCountryIds(trip);
  if (paisIds.length === 1) {
    $('#g-pais').value = String(paisIds[0]);
    renderCiudades();
  } else if (!paisIds.length) {
    $('#g-pais').value = '';
    renderCiudades();
  }
}

function tripCountryScopeForSelector(selector) {
  const tripId = Number($(selector) ? $(selector).value : 0);
  const trip = state.viajes.find(v => Number(v.id) === tripId);
  return tripCountryIds(trip);
}

function cityOptionsForScope(paisSelector, tripSelector) {
  const selectedPais = Number($(paisSelector) ? $(paisSelector).value : 0);
  const tripPaisIds = tripCountryScopeForSelector(tripSelector);
  const allowedPaisIds = selectedPais ? [selectedPais] : tripPaisIds;
  return state.lugares
    .filter(l => l.parentId && (!allowedPaisIds.length || allowedPaisIds.includes(Number(l.parentId))))
    .map(l => ({ value: String(l.id), label: l.nombre }));
}

function gastosForSelectorTripScope(tripSelector) {
  const tripId = Number($(tripSelector) ? $(tripSelector).value : 0);
  return state.gastos.filter(g => tripId ? Number(g.viajeId) === tripId : gastoMatchesTripSelection(g));
}

function usedPaisOptionsForGastos(gastos) {
  const map = new Map();
  gastos.forEach(g => {
    const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
    const pais = state.lugares.find(l => l.id === Number(g.paisId || (ciudad && ciudad.parentId)));
    if (pais) map.set(String(pais.id), pais.nombre);
  });
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([value, label]) => ({ value, label }));
}

function usedCiudadOptionsForGastos(gastos, paisId = 0) {
  const map = new Map();
  gastos.forEach(g => {
    const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
    if (!ciudad) return;
    if (paisId && Number(ciudad.parentId) !== Number(paisId) && Number(g.paisId) !== Number(paisId)) return;
    map.set(String(ciudad.id), ciudad.nombre);
  });
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([value, label]) => ({ value, label }));
}

function renderFilterAccountSelector() {
  const tripId = Number($('#f-viaje') ? $('#f-viaje').value : 0);
  const source = tripId
    ? state.cuentas.filter(c => Number(c.viajeId) === tripId)
    : state.cuentas;
  const accounts = source.map(c => ({ value: String(c.id), label: accountLabel(c) }));
  fillSelect('#f-cuenta', accounts, '(todas)');
}

function renderResumenAccountSelector() {
  const tripId = Number($('#r-viaje') ? $('#r-viaje').value : 0);
  const source = tripId
    ? state.cuentas.filter(c => Number(c.viajeId) === tripId)
    : state.cuentas;
  const accounts = source.map(c => ({ value: String(c.id), label: accountLabel(c) }));
  fillSelect('#r-cuenta', accounts, '(todas)');
}

function renderEditGastoAccountSelector() {
  if (!$('#edit-gasto-cuenta')) return;
  const tripId = Number($('#edit-gasto-viaje') ? $('#edit-gasto-viaje').value : 0);
  const accounts = accountsForGastoTrip(tripId).map(c => ({ value: String(c.id), label: accountLabel(c) }));
  fillSelect('#edit-gasto-cuenta', accounts, '(elige cuenta)');
  const selected = state.cuentas.find(c => Number(c.id) === Number($('#edit-gasto-cuenta').value));
  if (selected && $('#edit-gasto-moneda')) $('#edit-gasto-moneda').value = selected.moneda;
}

function renderTransferAccountSelectors() {
  const ids = selectedTripSet();
  const source = ids.size
    ? state.cuentas.filter(c => c.viajeId && ids.has(Number(c.viajeId)))
    : state.cuentas;
  const accounts = source.map(c => ({ value: String(c.id), label: accountLabel(c) }));
  if ($('#t-from')) fillSelect('#t-from', accounts, '(origen)');
  if ($('#t-to')) fillSelect('#t-to', accounts, '(destino)');
  updateTransferRatePreview();
}

function updateTransferRatePreview() {
  const el = $('#t-cambio');
  if (!el) return;
  const source = state.cuentas.find(c => c.id === Number($('#t-from') ? $('#t-from').value : 0));
  const target = state.cuentas.find(c => c.id === Number($('#t-to') ? $('#t-to').value : 0));
  const amountFrom = numberValue($('#t-importe') ? $('#t-importe').value : 0);
  const amountTo = numberValue($('#t-importe-to') ? $('#t-importe-to').value : 0);
  if (!source || !target || source.moneda === target.moneda || amountFrom <= 0 || amountTo <= 0) {
    el.value = '';
    return;
  }
  el.value = `1 ${source.moneda} = ${(amountTo / amountFrom).toLocaleString('es-ES', { maximumFractionDigits: 6 })} ${target.moneda}`;
}

function renderAccountTemplateSelector() {
  const selector = $('#c-template');
  if (!selector) return;
  const selectedTripId = Number($('#c-viaje') ? $('#c-viaje').value : 0);
  const globals = state.cuentas
    .filter(c => !c.viajeId)
    .slice()
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  const existingKeys = new Set(state.cuentas
    .filter(c => selectedTripId && Number(c.viajeId) === selectedTripId)
    .map(accountKey));
  const available = selectedTripId ? globals.filter(c => !existingKeys.has(accountKey(c))) : [];
  const placeholder = selectedTripId
    ? (available.length ? '(cuenta nueva)' : '(todas las plantillas ya añadidas)')
    : '(elige un viaje para usar plantilla)';
  fillSelect('#c-template', available.map(c => ({ value: String(c.id), label: `${c.nombre} (${c.moneda})` })), placeholder);
  selector.disabled = !selectedTripId;
}

function applyAccountTemplate() {
  const templateId = Number($('#c-template') ? $('#c-template').value : 0);
  const template = state.cuentas.find(c => Number(c.id) === templateId && !c.viajeId);
  if (!template) return;
  $('#c-nombre').value = template.nombre || '';
  $('#c-moneda').value = template.moneda || $('#c-moneda').value;
}

function renderTripSelectors() {
  const trips = state.viajes.map(v => ({ value: String(v.id), label: v.nombre }));
  fillSelect('#g-viaje', trips, '(sin viaje)');
  fillSelect('#f-viaje', trips, '(todos)');
  fillSelect('#r-viaje', trips, '(todos)');
  fillSelect('#c-viaje', trips, '(plantilla global)');
  if ($('#edit-gasto-viaje')) fillSelect('#edit-gasto-viaje', trips, '(sin viaje)');
  fillSelect('#backup-export-trip', trips, '(elige viaje)');
  fillSelect('#backup-import-trip', trips, '');
  syncTripSelectsFromSelection();
  renderGastoAccountSelector();
  renderFilterAccountSelector();
  renderResumenAccountSelector();
  renderEditGastoAccountSelector();
  renderTransferAccountSelectors();
  renderAccountTemplateSelector();
}

function renderCategorySelectors() {
  const principal = state.categorias.filter(c => !c.parentId);
  const options = principal.map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#g-cat', options, '(elige categoría)');
  fillSelect('#f-cat', options, '(todas)');
  fillSelect('#cat-parent', options, '(Ninguna, es principal)');
  if ($('#edit-gasto-cat')) fillSelect('#edit-gasto-cat', options, '(elige categoría)');
  renderSubcategories();
  renderFilterSubcategories();
  if ($('#edit-gasto-subcat')) renderEditSubcategories();
}

function renderSubcategories() {
  const catId = Number($('#g-cat').value);
  const options = state.categorias
    .filter(c => c.parentId === catId)
    .map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#g-subcat', options, '(sin subcategoría)');
}

function renderFilterSubcategories() {
  const catId = Number($('#f-cat') ? $('#f-cat').value : 0);
  const parents = new Map(state.categorias.filter(c => !c.parentId).map(c => [Number(c.id), c.nombre]));
  const options = state.categorias
    .filter(c => c.parentId && (!catId || Number(c.parentId) === catId))
    .map(c => ({
      value: String(c.id),
      label: catId ? c.nombre : `${parents.get(Number(c.parentId)) || 'Categoría'} · ${c.nombre}`
    }));
  fillSelect('#f-subcat', options, '(todas)');
}

function renderEditSubcategories() {
  const catId = Number($('#edit-gasto-cat').value);
  const options = state.categorias
    .filter(c => c.parentId === catId)
    .map(c => ({ value: String(c.id), label: c.nombre }));
  fillSelect('#edit-gasto-subcat', options, '(sin subcategoría)');
}

function renderLugarSelectors() {
  const paises = state.lugares.filter(l => !l.parentId).map(l => ({ value: String(l.id), label: l.nombre }));
  fillSelect('#g-pais', paises, '(sin país)');
  fillSelect('#edit-gasto-pais', paises, '(sin país)');
  fillSelect('#lugar-parent', paises, '(Ninguno, es país)');
  fillMultiSelect('#v-paises', paises);
  renderTripPlannedCitySelector();
  renderCiudades();
  renderEditCiudades();
  renderFilterPaises();
  renderResumenPaises();
  renderMapPaises();
}

function plannedCityOptionsForCountries(paisIds = [], preferredOrder = []) {
  const allowedCountries = new Set((paisIds || []).map(Number).filter(Boolean));
  const order = new Map((preferredOrder || []).map((id, index) => [Number(id), index]));
  return state.lugares
    .filter(l => l.parentId)
    .filter(l => !isTransitPlaceName(l.nombre))
    .filter(l => !allowedCountries.size || allowedCountries.has(Number(l.parentId)))
    .map(l => {
      const pais = state.lugares.find(item => Number(item.id) === Number(l.parentId));
      return {
        value: String(l.id),
        label: `${l.nombre}${pais ? ` (${pais.nombre})` : ''}`,
        parentId: Number(l.parentId)
      };
    })
    .sort((a, b) => {
      const ai = order.has(Number(a.value)) ? order.get(Number(a.value)) : Number.POSITIVE_INFINITY;
      const bi = order.has(Number(b.value)) ? order.get(Number(b.value)) : Number.POSITIVE_INFINITY;
      return ai - bi || a.label.localeCompare(b.label, 'es');
    });
}

function syncPlannedCitySelector(countrySelector, citySelector, selectAllMissing = false) {
  const paisIds = selectedMultiValues(countrySelector);
  const cityEl = $(citySelector);
  const currentOrder = allMultiValues(citySelector);
  const previousCountryIds = new Set(String(cityEl && cityEl.dataset.countryIds || '').split(',').map(Number).filter(Boolean));
  const newCountryIds = new Set(paisIds.filter(id => !previousCountryIds.has(Number(id))));
  const options = paisIds.length ? plannedCityOptionsForCountries(paisIds, currentOrder) : [];
  const optionIds = options.map(option => Number(option.value)).filter(Boolean);
  const optionSet = new Set(optionIds);
  const included = [
    ...currentOrder.filter(id => optionSet.has(Number(id))),
    ...optionIds.filter(id => {
      if (currentOrder.includes(id)) return false;
      const option = options.find(item => Number(item.value) === Number(id));
      return selectAllMissing || !currentOrder.length || newCountryIds.has(Number(option && option.parentId));
    })
  ];
  const byValue = new Map(options.map(item => [Number(item.value), item]));
  fillOptionList(citySelector, included.map(id => byValue.get(Number(id))).filter(Boolean));
  if (cityEl) cityEl.dataset.countryIds = paisIds.join(',');
}

function renderTripPlannedCitySelector() {
  syncPlannedCitySelector('#v-paises', '#v-ciudades');
  updateTripPlanningCounters();
}

function updateTripPlanningCounters() {
  const paisSelect = $('#v-paises');
  const ciudadSelect = $('#v-ciudades');
  const paisCount = $('#v-paises-count');
  const ciudadCount = $('#v-ciudades-count');
  const ciudadPanel = $('#v-ciudades-panel');
  const ciudadHelp = $('#v-ciudades-help');
  const selectedPaises = selectedMultiValues('#v-paises');
  const selectedCiudades = allMultiValues('#v-ciudades');
  const totalPaises = paisSelect ? paisSelect.options.length : 0;
  const totalCiudades = ciudadSelect ? ciudadSelect.options.length : 0;
  if (paisCount) paisCount.textContent = `(${selectedPaises.length}/${totalPaises})`;
  if (ciudadCount) ciudadCount.textContent = selectedPaises.length ? `(${selectedCiudades.length}/${totalCiudades})` : '(elige país)';
  if (ciudadSelect) ciudadSelect.disabled = !selectedPaises.length;
  if (ciudadPanel) ciudadPanel.classList.toggle('disabled', !selectedPaises.length);
  if (ciudadHelp) {
    ciudadHelp.textContent = !selectedPaises.length
      ? 'Selecciona antes al menos un país.'
      : (totalCiudades ? 'Se añaden todas las ciudades creadas para esos países; quita las que no quieras.' : 'No hay ciudades creadas para los países seleccionados.');
  }
}

function renderCiudades() {
  const options = cityOptionsForScope('#g-pais', '#g-viaje');
  fillSelect('#g-ciudad', options, '(sin ciudad)');
}

function renderEditCiudades() {
  const options = cityOptionsForScope('#edit-gasto-pais', '#edit-gasto-viaje');
  fillSelect('#edit-gasto-ciudad', options, '(sin ciudad)');
}

function renderFilterPaises() {
  const options = usedPaisOptionsForGastos(gastosForSelectorTripScope('#f-viaje'));
  fillSelect('#f-pais', options, '(todos)');
  renderFilterCiudades();
}

function renderFilterCiudades() {
  const paisId = Number($('#f-pais') ? $('#f-pais').value : 0);
  const base = gastosForSelectorTripScope('#f-viaje').filter(g => gastoMatchesLugarFilters(g, paisId, ''));
  const options = usedCiudadOptionsForGastos(base, paisId);
  fillSelect('#f-ciudad', options, '(todas)');
}

function renderResumenPaises() {
  const options = usedPaisOptionsForGastos(gastosForSelectorTripScope('#r-viaje'));
  fillSelect('#r-pais', options, '(todos)');
  renderResumenCiudades();
}

function renderMapPaises() {
  const select = $('#map-pais');
  if (!select) return;
  const gastos = gastosForSelectorTripScope('#r-viaje');
  const options = mapPaisOptionsForScope(gastos);
  const scopeKey = `${[...mapScopedTripIds(gastos)].sort((a, b) => a - b).join(',')}|${options.map(option => option.value).join(',')}`;
  const scopeChanged = tripMapState.countryScopeKey !== scopeKey;
  tripMapState.countryScopeKey = scopeKey;
  fillSelect('#map-pais', options, options.length ? '(todos)' : '(sin países)');
  if (options.length === 1) {
    select.value = options[0].value;
  } else if (scopeChanged) {
    select.value = '';
  }
  renderTripMap();
}

function renderResumenCiudades() {
  const paisId = Number($('#r-pais') ? $('#r-pais').value : 0);
  const base = gastosForSelectorTripScope('#r-viaje').filter(g => gastoMatchesLugarFilters(g, paisId, ''));
  const options = usedCiudadOptionsForGastos(base, paisId);
  fillSelect('#r-ciudad', options, '(todas)');
}

function renderCuentas() {
  const tbody = $('#tabla-cuentas tbody');
  tbody.innerHTML = '';
  const selectedTripId = Number($('#c-viaje') ? $('#c-viaje').value : 0);
  if (selectedTripId) {
    const trip = state.viajes.find(v => v.id === selectedTripId);
    const tripExpenses = state.gastos.filter(g => Number(g.viajeId) === selectedTripId);
    const usedAccountIds = new Set(tripExpenses.map(g => Number(g.cuentaId)));
    const tripAccounts = state.cuentas.filter(c => Number(c.viajeId) === selectedTripId);
    const usedAccounts = state.cuentas.filter(c => usedAccountIds.has(Number(c.id)));
    const accounts = [...usedAccounts, ...tripAccounts.filter(c => !usedAccountIds.has(Number(c.id)))];
    const tripAccountBudget = tripAccounts.reduce((sum, c) => sum + toEur(c.presupuesto, c.moneda), 0);
    const tripBudget = trip ? effectiveTripBudget(trip) : 0;
    const tripSpentEur = tripExpenses.reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
    const totalSaldoEur = accounts.reduce((sum, c) => sum + toEur(c.saldoActual, c.moneda), 0);
    if (!accounts.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6">No hay cuentas ni gastos asociados a ${escapeHtml(trip ? trip.nombre : 'este viaje')}.</td>`;
      tbody.appendChild(tr);
      return;
    }
    accounts.forEach(c => {
      const spentEur = tripExpenses.filter(g => Number(g.cuentaId) === Number(c.id)).reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
      const isTripAccount = Number(c.viajeId) === selectedTripId;
      let budget = isTripAccount ? numberValue(c.presupuesto) : 0;
      let saldo = numberValue(c.saldoActual);
      if (!isTripAccount && accounts.length === 1 && tripBudget > 0) {
        budget = fromEur(tripBudget, c.moneda);
        saldo = fromEur(tripBudget - spentEur, c.moneda);
      }
      const tr = document.createElement('tr');
      if (budget > 0 && spentEur > toEur(budget, c.moneda)) tr.className = 'warning-row';
      const migrate = !isTripAccount && usedAccountIds.has(Number(c.id))
        ? ` <button class="ghost" data-migrate-cuenta="${c.id}" data-migrate-viaje="${selectedTripId}">Pasar a viaje</button>`
        : '';
      const tripCell = isTripAccount ? escapeHtml(trip ? trip.nombre : 'Viaje') : `${escapeHtml(trip ? trip.nombre : 'Viaje')} <span class="badge">Global usada</span>`;
      tr.innerHTML = `<td>${escapeHtml(c.nombre)}</td><td>${tripCell}</td><td><span class="badge">${escapeHtml(c.moneda)}</span></td><td>${fmtCurrencyWithEur(saldo, c.moneda)}</td><td>${fmtBudgetWithEur(budget, c.moneda)}</td><td><button class="ghost" data-edit-cuenta="${c.id}">Editar</button> <button class="ghost" data-del-cuenta="${c.id}">Eliminar</button>${migrate}</td>`;
      tbody.appendChild(tr);
    });
    if (tripAccountBudget > 0) {
      const tr = document.createElement('tr');
      tr.className = 'subtotal-row';
      tr.innerHTML = `<td>Total cuentas del viaje</td><td>${escapeHtml(trip ? trip.nombre : 'Viaje')}</td><td><span class="badge">EUR</span></td><td>${fmtCurrency(totalSaldoEur, 'EUR')}</td><td>${fmtCurrency(tripAccountBudget, 'EUR')}</td><td>-</td>`;
      tbody.appendChild(tr);
    }
    if (tripBudget > 0 && (tripAccountBudget <= 0 || Math.abs(tripBudget - tripAccountBudget) > 0.01)) {
      const remaining = tripBudget - tripSpentEur;
      const tr = document.createElement('tr');
      tr.className = remaining < 0 ? 'warning-row' : 'subtotal-row';
      tr.innerHTML = `<td>Presupuesto del viaje</td><td>${escapeHtml(trip ? trip.nombre : 'Viaje')}</td><td><span class="badge">EUR</span></td><td>${fmtCurrency(remaining, 'EUR')}</td><td>${fmtCurrency(tripBudget, 'EUR')}</td><td>-</td>`;
      tbody.appendChild(tr);
    }
    return;
  }
  state.cuentas.filter(c => !c.viajeId).forEach(c => {
    const spent = state.gastos.filter(g => g.cuentaId === c.id).reduce((sum, g) => sum + fromEur(toEur(g.importe, g.moneda), c.moneda), 0);
    const overBudget = numberValue(c.presupuesto) > 0 && spent > numberValue(c.presupuesto);
    const tr = document.createElement('tr');
    if (overBudget || numberValue(c.saldoActual) < 0) tr.className = 'warning-row';
    tr.innerHTML = `<td>${escapeHtml(c.nombre)}</td><td><span class="badge">Global</span></td><td><span class="badge">${escapeHtml(c.moneda)}</span></td><td>${fmtCurrencyWithEur(c.saldoActual, c.moneda)}</td><td>${fmtBudgetWithEur(c.presupuesto, c.moneda)}</td><td><button class="ghost" data-edit-cuenta="${c.id}">Editar</button> <button class="ghost" data-del-cuenta="${c.id}">Eliminar</button></td>`;
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
    tr.innerHTML = `<td>${fmtDate(t.fecha)}</td><td>${escapeHtml(source ? accountLabel(source) : '?')}</td><td>${escapeHtml(target ? accountLabel(target) : '?')}</td><td>${fmtCurrency(t.importeFrom, t.monedaFrom)}</td><td>${fmtCurrency(t.importeTo, t.monedaTo)}</td><td>${escapeHtml(transferRateLabel(t))}</td><td>${escapeHtml(t.nota || '')}</td><td><button class="ghost" data-del-transfer="${t.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderViajes() {
  const tbody = $('#tabla-viajes tbody');
  tbody.innerHTML = '';
  state.viajes.forEach(v => {
    const budget = numberValue(v.presupuesto);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(v.nombre)}</td><td>${escapeHtml(tripCountryLabel(v))}</td><td>${fmtDate(v.fechaInicio)}</td><td>${fmtDate(v.fechaFin)}</td><td>${budget ? fmtCurrency(budget, 'EUR') : '-'}</td><td><button class="ghost" data-edit-viaje="${v.id}">Editar</button> <button class="ghost" data-del-viaje="${v.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderMonedasConfig() {
  renderCurrencyCodeDatalist();
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
  const selectedIds = selectedTripSet();
  info.textContent = selectedTripsLabel();
  if (!state.viajes.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8">Todavía no hay viajes. Puedes crearlos en Configuración.</td>';
    tbody.appendChild(tr);
    return;
  }
  const tripsByYear = {};
  state.viajes.forEach(v => {
    const year = getTripYear(v);
    (tripsByYear[year] = tripsByYear[year] || []).push(v);
  });
  Object.keys(tripsByYear).sort().forEach(year => {
    const yearTrips = tripsByYear[year];
    const yearChecked = yearTrips.every(v => selectedIds.has(v.id));
    const header = document.createElement('tr');
    header.className = 'group-row';
    header.innerHTML = `<td><label class="trip-check"><input type="checkbox" data-trip-year="${escapeHtml(year)}"${yearChecked ? ' checked' : ''}> <span>Año ${escapeHtml(year)}</span></label></td><td colspan="7">Selecciona el año para sumar todos sus viajes</td>`;
    tbody.appendChild(header);
    const yearInput = header.querySelector('input[data-trip-year]');
    let yearExpenses = 0;
    let yearTotal = 0;
    let yearBudget = 0;
    yearTrips.forEach(v => {
      const expenses = state.gastos.filter(g => g.viajeId === v.id);
      const total = expenses.reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
      const budget = effectiveTripBudget(v);
      const remaining = budget ? budget - total : null;
      yearExpenses += expenses.length;
      yearTotal += total;
      yearBudget += budget;
      const tr = document.createElement('tr');
      if (remaining !== null && remaining < 0) tr.className = 'warning-row';
      tr.innerHTML = `<td><label class="trip-check"><input type="checkbox" data-trip-check="${v.id}"${selectedIds.has(v.id) ? ' checked' : ''}> <span>${escapeHtml(v.nombre)}</span></label></td><td>${fmtDate(v.fechaInicio)}</td><td>${fmtDate(v.fechaFin)}</td><td>${expenses.length}</td><td>${fmtCurrency(total, 'EUR')}</td><td>${budget ? fmtCurrency(budget, 'EUR') : '-'}</td><td>${remaining === null ? '-' : fmtCurrency(remaining, 'EUR')}</td><td class="trip-home-actions"><span class="trip-actions-inline"><button class="ghost" data-trip-gastos="${v.id}">Gastos</button> <button class="ghost" data-trip-resumen="${v.id}">Resumen</button> <button class="ghost" data-edit-viaje="${v.id}">Editar</button></span></td>`;
      tbody.appendChild(tr);
    });
    const subtotal = document.createElement('tr');
    const yearRemaining = yearBudget ? yearBudget - yearTotal : null;
    subtotal.className = yearRemaining !== null && yearRemaining < 0 ? 'warning-row' : 'subtotal-row';
    subtotal.innerHTML = `<td colspan="3">Subtotal ${escapeHtml(year)}</td><td>${yearExpenses}</td><td>${fmtCurrency(yearTotal, 'EUR')}</td><td>${yearBudget ? fmtCurrency(yearBudget, 'EUR') : '-'}</td><td>${yearRemaining === null ? '-' : fmtCurrency(yearRemaining, 'EUR')}</td><td></td>`;
    tbody.appendChild(subtotal);
    if (yearInput) yearInput.indeterminate = !yearChecked && yearTrips.some(v => selectedIds.has(v.id));
  });
}

function renderCategorias() {
  const tree = $('#categorias-tree');
  if (!tree) return;
  const openCategoryIds = new Set($$('#categorias-tree .category-node[open]').map(el => String(el.dataset.categoryNode || '')));
  const parents = state.categorias.filter(cat => !cat.parentId).sort(byName);
  const children = state.categorias.filter(cat => cat.parentId).sort(byName);
  if (!parents.length) {
    tree.innerHTML = '<p class="small">Todavía no hay categorías guardadas.</p>';
    return;
  }
  tree.innerHTML = parents.map(cat => {
    const subcats = children.filter(sub => Number(sub.parentId) === Number(cat.id));
    const open = openCategoryIds.has(String(cat.id)) ? ' open' : '';
    const subHtml = subcats.length
      ? subcats.map(sub => `<div class="place-row">
          <div class="place-name"><strong>${escapeHtml(sub.nombre)}</strong><span>Subcategoría</span></div>
          <div class="place-actions"><button class="ghost" data-edit-cat="${sub.id}">Editar</button><button class="ghost" data-del-cat="${sub.id}">Eliminar</button></div>
        </div>`).join('')
      : '<p class="small">Todavía no hay subcategorías en esta categoría.</p>';
    return `<details class="category-node" data-category-node="${cat.id}"${open}>
      <summary><span class="category-title"><strong>${escapeHtml(cat.nombre)}</strong></span><span class="category-meta">${subcats.length} subcategorías</span></summary>
      <div class="category-body">
        <div class="category-toolbar"><button class="ghost" data-edit-cat="${cat.id}">Editar categoría</button><button class="ghost" data-del-cat="${cat.id}">Eliminar categoría</button></div>
        <div class="subcategory-list">${subHtml}</div>
      </div>
    </details>`;
  }).join('');
}

function renderLugares() {
  const tree = $('#lugares-tree');
  if (!tree) return;
  const openCountryIds = new Set($$('#lugares-tree .country-node[open]').map(el => String(el.dataset.countryNode || '')));
  const count = $('#lugares-count');
  const paises = state.lugares.filter(l => !l.parentId).sort(byName);
  const ciudades = state.lugares.filter(l => l.parentId).sort(byName);
  if (count) {
    count.textContent = `(${paises.length} países, ${ciudades.length} ciudades)`;
  }
  if (!paises.length) {
    tree.innerHTML = '<p class="small">Todavía no hay países guardados.</p>';
    return;
  }
  tree.innerHTML = paises.map(pais => {
    const cityList = ciudades.filter(ciudad => Number(ciudad.parentId) === Number(pais.id));
    const open = openCountryIds.has(String(pais.id)) ? ' open' : '';
    const cityHtml = cityList.length
      ? cityList.map(ciudad => `<div class="place-row">
          <div class="place-name"><strong>${escapeHtml(ciudad.nombre)}</strong><span>${escapeHtml(lugarCoordsLabel(ciudad))}</span></div>
          <div class="place-actions"><button class="ghost" data-locate-lugar="${ciudad.id}">Localizar</button><button class="ghost" data-edit-lugar="${ciudad.id}">Editar</button><button class="ghost" data-del-lugar="${ciudad.id}">Eliminar</button></div>
        </div>`).join('')
      : '<p class="small">Todavía no hay ciudades en este país.</p>';
    return `<details class="country-node" data-country-node="${pais.id}"${open}>
      <summary><span class="country-title"><strong>${escapeHtml(pais.nombre)}</strong><span>${escapeHtml(lugarCoordsLabel(pais))}</span></span><span class="country-meta">${cityList.length} ciudades</span></summary>
      <div class="country-body">
        <div class="country-toolbar"><button class="ghost" data-locate-lugar="${pais.id}">Localizar país</button><button class="ghost" data-edit-lugar="${pais.id}">Editar país</button><button class="ghost" data-del-lugar="${pais.id}">Eliminar país</button></div>
        <div class="city-list">${cityHtml}</div>
      </div>
    </details>`;
  }).join('');
}

function filteredGastos() {
  const fMon = $('#f-moneda').value;
  const fCta = $('#f-cuenta').value;
  const fCat = $('#f-cat').value;
  const fSubcat = $('#f-subcat') ? $('#f-subcat').value : '';
  const fPais = $('#f-pais') ? $('#f-pais').value : '';
  const fCiudad = $('#f-ciudad') ? $('#f-ciudad').value : '';
  const fDesde = $('#f-desde').value;
  const fHasta = $('#f-hasta').value;
  const fDesc = ($('#f-desc').value || '').trim().toLowerCase();
  return state.gastos
    .filter(g => !fMon || g.moneda === fMon)
    .filter(g => !fCta || g.cuentaId === Number(fCta))
    .filter(g => !fCat || g.catId === Number(fCat))
    .filter(g => !fSubcat || g.subcatId === Number(fSubcat))
    .filter(g => gastoMatchesLugarFilters(g, fPais, fCiudad))
    .filter(gastoMatchesTripSelection)
    .filter(g => !fDesde || g.fecha >= fDesde)
    .filter(g => !fHasta || g.fecha <= fHasta)
    .filter(g => !fDesc || (g.desc || '').toLowerCase().includes(fDesc))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
}

function hasActiveGastoFilters() {
  return hasTripSelection() || ['#f-moneda', '#f-cuenta', '#f-cat', '#f-subcat', '#f-pais', '#f-ciudad', '#f-viaje', '#f-desde', '#f-hasta', '#f-desc']
    .some(sel => $(sel) && $(sel).value);
}

function updateMobileClearFilters() {
  const button = $('#f-clear-mobile');
  if (!button) return;
  button.style.display = hasActiveGastoFilters() ? '' : 'none';
}

function clearExpenseFilters() {
  ['#f-moneda', '#f-cuenta', '#f-cat', '#f-subcat', '#f-pais', '#f-ciudad', '#f-viaje', '#f-desde', '#f-hasta', '#f-desc'].forEach(sel => $(sel).value = '');
  setSelectedTrips([]);
  renderFilterSubcategories();
  renderFilterCiudades();
  closeFiltersPanel();
  renderViajesHome();
  renderGastosTabla();
  renderCuentas();
  renderTransferAccountSelectors();
  renderBackupStatus();
  renderResumen();
}

function renderGastosTabla() {
  const tbody = $('#tabla-gastos tbody');
  tbody.innerHTML = '';
  applyExpenseViewMode();
  updateMobileClearFilters();
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
    const paisNames = gastosPaisNames(byGroup[key]);
    const chips = [
      groupTrip ? `<span class="group-chip trip-chip">${escapeHtml(groupTrip.nombre)}</span>` : '',
      ...paisNames.map(name => `<span class="group-chip country-chip">${escapeHtml(name)}</span>`)
    ].filter(Boolean).join(' ');
    const title = `${fmtDate(date)}${chips ? ` ${chips}` : ''}`;
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
      tr.innerHTML = `<td data-label="Ciudad">${escapeHtml(gastoCiudadLabel(g))}</td><td data-label="Categoría">${escapeHtml(cat ? cat.nombre : '?')}</td><td data-label="Subcat.">${escapeHtml(sub ? sub.nombre : '-')}</td><td data-label="Cuenta">${escapeHtml(cta ? accountLabel(cta) : '?')}</td><td data-label="Moneda">${escapeHtml(g.moneda)}</td><td data-label="Importe">${fmtCurrency(g.importe, g.moneda)}</td><td data-label="EUR">${fmtCurrency(eur, 'EUR')}</td><td data-label="Descripción">${escapeHtml(g.desc || '')}</td><td data-label="Ticket">${ticketLink(g)}</td><td class="action-col" data-label="Acciones"><span class="desktop-actions"><button class="ghost" data-edit-gasto="${g.id}">Editar</button> <button class="ghost" data-dup-gasto="${g.id}">Duplicar</button> <button class="ghost" data-del-gasto="${g.id}">Eliminar</button></span><select class="mobile-action-select" data-gasto-action="${g.id}" aria-label="Acciones del gasto"><option value="">Acciones</option><option value="edit">Editar</option><option value="dup">Duplicar</option><option value="del">Eliminar</option></select></td>`;
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

function mapScopedTripIds(gastos = []) {
  const ids = new Set();
  const selectedResumenTripId = Number($('#r-viaje') ? $('#r-viaje').value : 0);
  if (selectedResumenTripId) ids.add(selectedResumenTripId);
  else if (hasTripSelection()) selectedTripIds().forEach(id => ids.add(Number(id)));
  else state.viajes.forEach(v => ids.add(Number(v.id)));
  return ids;
}

function mapScopedTrips(gastos = []) {
  const ids = mapScopedTripIds(gastos);
  return state.viajes.filter(v => ids.has(Number(v.id)));
}

function mapCityOrderForScope(gastos = []) {
  const trips = mapScopedTrips(gastos);
  if (trips.length !== 1) return new Map();
  const order = new Map();
  tripCityIds(trips[0]).forEach((id, index) => {
    const key = Number(id);
    if (key && !order.has(key)) order.set(key, index);
  });
  return order;
}

function mapPaisOptionsForScope(gastos = []) {
  const byId = new Map();
  usedPaisOptionsForGastos(gastos).forEach(option => {
    byId.set(Number(option.value), option.label);
  });
  mapScopedTrips(gastos).forEach(trip => {
    tripCountryIds(trip).forEach(id => {
      const pais = state.lugares.find(l => Number(l.id) === Number(id));
      if (pais) byId.set(Number(pais.id), pais.nombre);
    });
    tripCityIds(trip).forEach(id => {
      const ciudad = state.lugares.find(l => Number(l.id) === Number(id));
      const pais = state.lugares.find(l => Number(l.id) === Number(ciudad && ciudad.parentId));
      if (pais) byId.set(Number(pais.id), pais.nombre);
    });
  });
  return [...byId.entries()]
    .map(([value, label]) => ({ value: String(value), label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function compareGastosRouteOrder(a, b) {
  return (a.fecha || '').localeCompare(b.fecha || '') ||
    (a.createdAt || '').localeCompare(b.createdAt || '') ||
    Number(a.id || 0) - Number(b.id || 0);
}

function mapRouteCities(gastos, paisId) {
  const byCity = new Map();
  const routeOrder = mapCityOrderForScope(gastos);
  const scopedTrips = mapScopedTrips(gastos);
  const scopedTripIds = mapScopedTripIds(gastos);
  gastos
    .filter(g => gastoMatchesLugarFilters(g, paisId, ''))
    .slice()
    .sort(compareGastosRouteOrder)
    .forEach((g, index) => {
      const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
      if (!ciudad) return;
      if (isTransitPlaceName(ciudad.nombre)) return;
      const pais = state.lugares.find(l => l.id === Number(g.paisId || ciudad.parentId));
      if (paisId && Number(pais && pais.id) !== Number(paisId)) return;
      const key = Number(ciudad.id);
      if (!byCity.has(key)) {
        byCity.set(key, {
          ciudad,
          pais,
          firstDate: g.fecha || '',
          firstOrder: index,
          routeOrder: routeOrder.has(key) ? routeOrder.get(key) : Number.POSITIVE_INFINITY,
          count: 0,
          totalEur: 0
        });
      }
      const item = byCity.get(key);
      item.count += 1;
      item.totalEur += toEur(g.importe, g.moneda);
    });
  if (scopedTrips.length === 1) {
    const plannedIds = tripCityIds(scopedTrips[0]).map(Number).filter(Boolean);
    if (!plannedIds.length) {
      return [...byCity.values()].sort((a, b) => {
        const aOrdered = Number.isFinite(a.routeOrder);
        const bOrdered = Number.isFinite(b.routeOrder);
        if (aOrdered || bOrdered) {
          return (aOrdered ? a.routeOrder : Number.POSITIVE_INFINITY) - (bOrdered ? b.routeOrder : Number.POSITIVE_INFINITY) ||
            Number(a.firstOrder || 0) - Number(b.firstOrder || 0) ||
            byName(a.ciudad, b.ciudad);
        }
        return (a.firstDate || '9999-99-99').localeCompare(b.firstDate || '9999-99-99') ||
          Number(a.firstOrder || 0) - Number(b.firstOrder || 0) ||
          byName(a.ciudad, b.ciudad);
      });
    }
    const seenPlanned = new Set();
    const plannedItems = plannedIds.map((id, index) => {
      const ciudad = state.lugares.find(l => Number(l.id) === Number(id));
      if (!ciudad || isTransitPlaceName(ciudad.nombre)) return null;
      const pais = state.lugares.find(l => Number(l.id) === Number(ciudad.parentId));
      if (paisId && Number(pais && pais.id) !== Number(paisId)) return null;
      const expenseItem = byCity.get(id);
      if (!tripMapState.showPlanned && !expenseItem) return null;
      seenPlanned.add(id);
      return {
        ciudad,
        pais,
        firstDate: expenseItem ? expenseItem.firstDate : '',
        firstOrder: expenseItem ? expenseItem.firstOrder : index,
        routeOrder: index,
        count: expenseItem ? expenseItem.count : 0,
        totalEur: expenseItem ? expenseItem.totalEur : 0,
        plannedOnly: tripMapState.showPlanned && !expenseItem,
        repeatedStop: plannedIds.indexOf(id) !== index
      };
    }).filter(Boolean);
    const extraExpenseItems = [...byCity.values()]
      .filter(item => !seenPlanned.has(Number(item.ciudad.id)));
    return plannedItems.concat(extraExpenseItems).sort((a, b) => {
      const aOrdered = Number.isFinite(a.routeOrder);
      const bOrdered = Number.isFinite(b.routeOrder);
      if (aOrdered || bOrdered) {
        return (aOrdered ? a.routeOrder : Number.POSITIVE_INFINITY) - (bOrdered ? b.routeOrder : Number.POSITIVE_INFINITY) ||
          Number(a.firstOrder || 0) - Number(b.firstOrder || 0) ||
          byName(a.ciudad, b.ciudad);
      }
      return (a.firstDate || '9999-99-99').localeCompare(b.firstDate || '9999-99-99') ||
        Number(a.firstOrder || 0) - Number(b.firstOrder || 0) ||
        byName(a.ciudad, b.ciudad);
    });
  }
  if (tripMapState.showPlanned) {
    const plannedCityIds = new Set(
      state.viajes
        .filter(v => scopedTripIds.has(Number(v.id)))
        .flatMap(tripCityIds)
        .map(Number)
        .filter(Boolean)
    );
    plannedCityIds.forEach(id => {
      if (byCity.has(id)) return;
      const ciudad = state.lugares.find(l => Number(l.id) === Number(id));
      if (!ciudad || isTransitPlaceName(ciudad.nombre)) return;
      const pais = state.lugares.find(l => Number(l.id) === Number(ciudad.parentId));
      if (paisId && Number(pais && pais.id) !== Number(paisId)) return;
      byCity.set(id, {
        ciudad,
        pais,
        firstDate: '',
        firstOrder: Number.POSITIVE_INFINITY,
        routeOrder: routeOrder.has(Number(id)) ? routeOrder.get(Number(id)) : Number.POSITIVE_INFINITY,
        count: 0,
        totalEur: 0,
        configuredOnly: true,
        plannedOnly: true
      });
    });
  }
  return [...byCity.values()].sort((a, b) => {
    if (!!a.configuredOnly !== !!b.configuredOnly) return a.configuredOnly ? 1 : -1;
    const aOrdered = Number.isFinite(a.routeOrder);
    const bOrdered = Number.isFinite(b.routeOrder);
    if (aOrdered || bOrdered) {
      return (aOrdered ? a.routeOrder : Number.POSITIVE_INFINITY) - (bOrdered ? b.routeOrder : Number.POSITIVE_INFINITY) ||
        Number(a.firstOrder || 0) - Number(b.firstOrder || 0) ||
        byName(a.ciudad, b.ciudad);
    }
    return (a.firstDate || '9999-99-99').localeCompare(b.firstDate || '9999-99-99') ||
      Number(a.firstOrder || 0) - Number(b.firstOrder || 0) ||
      byName(a.ciudad, b.ciudad);
  });
}

function renderCurrencyCodeDatalist() {
  renderCurrencyCodeSuggestions(false);
}

function mapWorldPoint(lat, lng, zoom) {
  const scale = 256 * (2 ** zoom);
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const sin = Math.sin(safeLat * Math.PI / 180);
  return {
    x: ((Number(lng) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  };
}

function chooseMapZoom(items, width, height) {
  if (items.length <= 1) return 11;
  for (let zoom = 11; zoom >= 4; zoom -= 1) {
    const points = items.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom));
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= width * 0.68 && spanY <= height * 0.58) return zoom;
  }
  return 4;
}

function mapGeocodeNames(name) {
  const clean = String(name || '').trim();
  const normalized = normalizePlaceName(clean);
  const names = [clean];
  if (normalized === 'torun') names.push('Toruń');
  if (normalized === 'gdansk' || normalized === 'gdanks') names.push('Gdańsk', 'Gdansk');
  if (normalized === 'varsovia') names.push('Warszawa', 'Warsaw');
  return [...new Set(names.filter(Boolean))];
}

async function fetchFirstGeocodeResultForPlace(name, country = '') {
  if (isTransitPlaceName(name)) return null;
  const queries = mapGeocodeNames(name)
    .map(cityName => [cityName, country].filter(Boolean).join(', '));
  for (const query of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = (await response.json())[0];
    if (result) return result;
  }
  return null;
}

async function fetchFirstGeocodeResult(item) {
  return fetchFirstGeocodeResultForPlace(item.ciudad.nombre, item.pais ? item.pais.nombre : '');
}

async function locateLugarById(id) {
  const lugar = state.lugares.find(item => item.id === Number(id));
  if (!lugar) throw new Error('No existe el lugar');
  if (isTransitPlaceName(lugar.nombre)) throw new Error('En tránsito no es un lugar concreto para localizar en el mapa');
  const parent = state.lugares.find(item => item.id === Number(lugar.parentId));
  const result = await fetchFirstGeocodeResultForPlace(lugar.nombre, parent ? parent.nombre : '');
  if (!result) throw new Error(`No he encontrado coordenadas para ${lugar.nombre}`);
  await updateLugar(lugar.id, {
    lat: geocodeLatValue(result),
    lng: geocodeLngValue(result)
  });
  await loadAll();
  return result;
}

async function locateLugarForm() {
  const name = $('#lugar-nombre').value.trim();
  if (!name) throw new Error('Escribe primero el nombre');
  if (isTransitPlaceName(name)) throw new Error('En tránsito no es un lugar concreto para localizar en el mapa');
  const parent = state.lugares.find(item => item.id === Number($('#lugar-parent').value));
  const result = await fetchFirstGeocodeResultForPlace(name, parent ? parent.nombre : '');
  if (!result) throw new Error(`No he encontrado coordenadas para ${name}`);
  $('#lugar-lat').value = formatCoordinate(geocodeLatValue(result));
  $('#lugar-lng').value = formatCoordinate(geocodeLngValue(result));
}

async function geocodeTripMapCities() {
  resetTripMapView();
  await loadAll();
  const info = $('#trip-map-info');
  const paisId = Number($('#map-pais') ? $('#map-pais').value : 0);
  const gastos = gastosForSelectorTripScope('#r-viaje');
  const cities = mapRouteCities(gastos, paisId);
  const candidates = cities.filter(item => item.ciudad && !isTransitPlaceName(item.ciudad.nombre) && !lugarHasCoords(item.ciudad));
  if (!candidates.length) {
    renderTripMap();
    if (info) info.textContent = 'Mapa actualizado con las coordenadas guardadas en Configuración.';
    return;
  }
  if (info) info.textContent = `Localizando ${candidates.length} ciudades...`;
  let updated = 0;
  const failed = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const item = candidates[i];
    try {
      const result = await fetchFirstGeocodeResult(item);
      if (!result) throw new Error('sin resultado');
      await updateLugar(item.ciudad.id, {
        lat: geocodeLatValue(result),
        lng: geocodeLngValue(result)
      });
      updated += 1;
    } catch (err) {
      failed.push(item.ciudad.nombre);
    }
    if (i < candidates.length - 1) await wait(900);
  }
  resetTripMapView();
  await loadAll();
  if (info) {
    const failText = failed.length ? ` No localizadas: ${failed.join(', ')}.` : '';
    info.textContent = `${updated} ciudades localizadas.${failText}`;
  }
}

async function refreshTripMapFromConfig() {
  resetTripMapView();
  await loadAll();
  renderTripMap();
  const info = $('#trip-map-info');
  if (info) info.textContent = 'Mapa actualizado con las coordenadas guardadas en Configuración.';
}

function currentMapTrip() {
  const selectedResumenTripId = Number($('#r-viaje') ? $('#r-viaje').value : 0);
  if (selectedResumenTripId) return state.viajes.find(v => Number(v.id) === selectedResumenTripId) || null;
  const ids = selectedTripIds();
  if (ids.length === 1) return state.viajes.find(v => Number(v.id) === ids[0]) || null;
  const gastos = gastosForSelectorTripScope('#r-viaje');
  const tripIds = [...new Set(gastos.map(g => Number(g.viajeId)).filter(Boolean))];
  if (tripIds.length === 1) return state.viajes.find(v => Number(v.id) === tripIds[0]) || null;
  return null;
}

function currentMapCountryId(trip) {
  const selected = Number($('#map-pais') ? $('#map-pais').value : 0);
  if (selected) return selected;
  const countries = tripCountryIds(trip);
  return countries.length === 1 ? countries[0] : 0;
}

function renderMapAfterTripChange() {
  renderResumenAccountSelector();
  renderResumenPaises();
  renderMapPaises();
  renderViajesHome();
  renderGastosTabla();
  renderCuentas();
  renderTransferAccountSelectors();
  renderBackupStatus();
  renderResumen();
}

async function addMapStopToTrip() {
  const trip = currentMapTrip();
  if (!trip) {
    alert('Selecciona un único viaje para editar sus paradas.');
    return;
  }
  openRouteDialog(trip);
}

function routeCityOptionsForTrip(trip) {
  const routeIds = routeEditorState.cityIds.map(Number).filter(Boolean);
  const expenseIds = state.gastos
    .filter(g => Number(g.viajeId) === Number(trip.id))
    .map(g => Number(g.ciudadId))
    .filter(Boolean);
  const tripCountryIdsSet = new Set(tripCountryIds(trip).map(Number).filter(Boolean));
  const countryCityIds = routeEditorState.optionMode === 'tripCountries'
    ? state.lugares
      .filter(l => l.parentId && tripCountryIdsSet.has(Number(l.parentId)))
      .map(l => Number(l.id))
      .filter(Boolean)
    : [];
  const allowedCityIds = new Set([...routeIds, ...expenseIds, ...countryCityIds]);
  const source = state.lugares
    .filter(l => l.parentId && allowedCityIds.has(Number(l.id)))
    .sort((a, b) => {
      const paisA = lugarName(a.parentId);
      const paisB = lugarName(b.parentId);
      return collator.compare(paisA, paisB) || collator.compare(a.nombre, b.nombre);
    });
  return source.map(ciudad => ({
    value: String(ciudad.id),
    label: `${ciudad.nombre} (${lugarName(ciudad.parentId) || 'sin país'})`
  }));
}

function routeCityOptionsHtml(options, selectedId = '') {
  const selected = String(selectedId || '');
  return `<option value="">(elige ciudad)</option>${options
    .map(option => `<option value="${escapeHtml(option.value)}"${selected === String(option.value) ? ' selected' : ''}>${escapeHtml(option.label)}</option>`)
    .join('')}`;
}

function moveRouteStop(fromIndex, toIndex) {
  const from = Number(fromIndex);
  const to = Math.max(0, Math.min(routeEditorState.cityIds.length - 1, Number(toIndex)));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
  const ids = routeEditorState.cityIds.slice();
  const [item] = ids.splice(from, 1);
  ids.splice(to, 0, item);
  routeEditorState.cityIds = ids;
}

function renderRouteDialog() {
  const body = $('#route-dialog-body');
  const trip = state.viajes.find(v => Number(v.id) === Number(routeEditorState.tripId));
  if (!body || !trip) return;
  const options = routeCityOptionsForTrip(trip);
  const optionHtml = id => routeCityOptionsHtml(options, id);
  const rows = routeEditorState.cityIds.map((id, index) => `
    <tr class="route-stop-row" draggable="true" data-route-row="${index}">
      <td><input type="number" min="1" max="${Math.max(1, routeEditorState.cityIds.length)}" value="${index + 1}" data-route-position="${index}" aria-label="Número de parada"></td>
      <td><select data-route-city="${index}" aria-label="Ciudad de la parada ${index + 1}">${optionHtml(id)}</select></td>
      <td class="route-stop-actions">
        <button type="button" class="ghost icon-btn" data-route-up="${index}" title="Subir parada">↑</button>
        <button type="button" class="ghost icon-btn" data-route-down="${index}" title="Bajar parada">↓</button>
        <button type="button" class="ghost icon-btn" data-route-delete="${index}" title="Borrar parada">×</button>
      </td>
    </tr>
  `).join('');
  body.innerHTML = `
    <p class="small route-help">Edita el orden de la ruta. Puedes arrastrar filas en PC, cambiar el número de parada o usar subir/bajar.</p>
    <div class="table-wrap route-table-wrap">
      <table class="route-stops-table">
        <thead><tr><th>Nº</th><th>Ciudad</th><th>Acciones</th></tr></thead>
        <tbody>
          ${rows || '<tr><td colspan="3" class="small">Todavía no hay paradas planificadas.</td></tr>'}
          <tr class="route-add-row">
            <td>${routeEditorState.cityIds.length + 1}</td>
            <td><select id="route-add-city" aria-label="Añadir ciudad">${optionHtml('')}</select></td>
            <td><button type="button" class="btn ghost icon-btn" data-route-add="1" title="Añadir parada">+</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function openRouteDialog(trip, options = {}) {
  const dialog = $('#route-dialog');
  if (!dialog) return;
  const gastos = gastosForSelectorTripScope('#r-viaje')
    .filter(g => Number(g.viajeId) === Number(trip.id));
  const mapCityIds = mapRouteCities(gastos, 0)
    .map(item => Number(item.ciudad && item.ciudad.id))
    .filter(Boolean);
  const configuredCityIds = tripCityIds(trip).map(Number).filter(Boolean);
  routeEditorState.tripId = Number(trip.id);
  routeEditorState.cityIds = options.preferConfigured ? configuredCityIds : (mapCityIds.length ? mapCityIds : configuredCityIds);
  routeEditorState.dragIndex = null;
  routeEditorState.optionMode = options.optionMode || 'expenses';
  $('#route-dialog-title').textContent = `Añadir / modificar paradas de ${trip.nombre}`;
  setMessage('#msg-route-dialog', '');
  renderRouteDialog();
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeRouteDialog() {
  const dialog = $('#route-dialog');
  routeEditorState.tripId = null;
  routeEditorState.cityIds = [];
  routeEditorState.dragIndex = null;
  routeEditorState.optionMode = 'expenses';
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

async function saveRouteDialog() {
  const trip = state.viajes.find(v => Number(v.id) === Number(routeEditorState.tripId));
  if (!trip) throw new Error('No se encontró el viaje');
  const cityIds = routeEditorState.cityIds.map(Number).filter(Boolean);
  const paisIds = new Set(tripCountryIds(trip).map(Number).filter(Boolean));
  cityIds.forEach(id => {
    const city = state.lugares.find(l => Number(l.id) === Number(id));
    if (city && city.parentId) paisIds.add(Number(city.parentId));
  });
  await updateViaje(trip.id, {
    ciudadIds: cityIds,
    paisIds: [...paisIds],
    updatedAt: new Date().toISOString()
  });
  tripMapState.showPlanned = true;
  resetTripMapView();
  closeRouteDialog();
  await loadAll();
  setSelectedTrips([trip.id]);
  renderLugarSelectors();
  renderMapAfterTripChange();
}

function tripMapItemsForCurrentScope() {
  const paisId = Number($('#map-pais') ? $('#map-pais').value : 0);
  const gastos = gastosForSelectorTripScope('#r-viaje');
  const scopedTripIds = mapScopedTripIds(gastos);
  const cities = mapRouteCities(gastos, paisId);
  return {
    paisId,
    cities,
    withCoords: cities.filter(item => lugarHasCoords(item.ciudad)),
    shouldDrawRoute: scopedTripIds.size <= 1
  };
}

function zoomTripMapAtPoint(x, y, delta = 1) {
  const { withCoords } = tripMapItemsForCurrentScope();
  if (!withCoords.length || !delta) return false;
  const { width, height } = tripMapSize();
  const baseZoom = chooseMapZoom(withCoords, width, height);
  const oldZoom = Math.max(4, Math.min(18, baseZoom + tripMapState.zoomDelta));
  const newZoom = Math.max(4, Math.min(18, oldZoom + delta));
  if (newZoom === oldZoom) return false;
  const oldPoints = withCoords.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, oldZoom));
  const oldCenterX = (Math.min(...oldPoints.map(p => p.x)) + Math.max(...oldPoints.map(p => p.x))) / 2;
  const oldCenterY = (Math.min(...oldPoints.map(p => p.y)) + Math.max(...oldPoints.map(p => p.y))) / 2;
  const oldStartX = oldCenterX - width / 2 - tripMapState.panX;
  const oldStartY = oldCenterY - height / 2 - tripMapState.panY;
  const factor = 2 ** (newZoom - oldZoom);
  const clickedNewX = (oldStartX + x) * factor;
  const clickedNewY = (oldStartY + y) * factor;
  const newPoints = withCoords.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, newZoom));
  const newCenterX = (Math.min(...newPoints.map(p => p.x)) + Math.max(...newPoints.map(p => p.x))) / 2;
  const newCenterY = (Math.min(...newPoints.map(p => p.y)) + Math.max(...newPoints.map(p => p.y))) / 2;
  tripMapState.zoomDelta = newZoom - baseZoom;
  tripMapState.panX = newCenterX - width / 2 - (clickedNewX - x);
  tripMapState.panY = newCenterY - height / 2 - (clickedNewY - y);
  renderTripMap();
  return true;
}

function zoomTripMapAtClient(frame, clientX, clientY, delta = 1) {
  if (!frame) return false;
  const rect = frame.getBoundingClientRect();
  const { width, height } = tripMapSize();
  const x = Math.max(0, Math.min(width, ((clientX - rect.left) / rect.width) * width));
  const y = Math.max(0, Math.min(height, ((clientY - rect.top) / rect.height) * height));
  return zoomTripMapAtPoint(x, y, delta);
}

function zoomTripMapAt(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('.map-controls')) return;
  const frame = target.closest('.trip-map-frame');
  if (!frame) return;
  event.preventDefault();
  zoomTripMapAtClient(frame, event.clientX, event.clientY, 1);
}

function renderTripMap() {
  const container = $('#trip-map');
  const info = $('#trip-map-info');
  if (!container || !info) return;
  const { paisId, cities, withCoords, shouldDrawRoute } = tripMapItemsForCurrentScope();
  const missing = cities.filter(item => !lugarHasCoords(item.ciudad));
  if (!cities.length) {
    container.innerHTML = '<div class="map-empty">Sin ciudades en este viaje.</div>';
    info.textContent = '';
    return;
  }
  if (!withCoords.length) {
    container.innerHTML = '<div class="map-empty">Añade latitud y longitud a las ciudades para ver el mapa.</div>';
    info.textContent = `Faltan coordenadas: ${missing.map(item => item.ciudad.nombre).join(', ')}.`;
    return;
  }
  const { width, height } = tripMapSize();
  const routeKey = [
    `${width}x${height}`,
    paisId || 'all',
    withCoords.map(item => `${item.ciudad.id}:${item.ciudad.lat}:${item.ciudad.lng}`).join(',')
  ].join('|');
  if (tripMapState.key !== routeKey) {
    tripMapState.key = routeKey;
    tripMapState.zoomDelta = 0;
    tripMapState.panX = 0;
    tripMapState.panY = 0;
  }
  const baseZoom = chooseMapZoom(withCoords, width, height);
  const zoom = Math.max(4, Math.min(18, baseZoom + tripMapState.zoomDelta));
  const worldPoints = withCoords.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom));
  const minX = Math.min(...worldPoints.map(p => p.x));
  const maxX = Math.max(...worldPoints.map(p => p.x));
  const minY = Math.min(...worldPoints.map(p => p.y));
  const maxY = Math.max(...worldPoints.map(p => p.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const startX = centerX - width / 2 - tripMapState.panX;
  const startY = centerY - height / 2 - tripMapState.panY;
  const maxTile = (2 ** zoom) - 1;
  const tileMinX = Math.max(0, Math.floor(startX / 256));
  const tileMaxX = Math.min(maxTile, Math.floor((startX + width) / 256));
  const tileMinY = Math.max(0, Math.floor(startY / 256));
  const tileMaxY = Math.min(maxTile, Math.floor((startY + height) / 256));
  const tiles = [];
  for (let x = tileMinX; x <= tileMaxX; x += 1) {
    for (let y = tileMinY; y <= tileMaxY; y += 1) {
      const left = ((x * 256 - startX) / width) * 100;
      const top = ((y * 256 - startY) / height) * 100;
      const tileW = (256 / width) * 100;
      const tileH = (256 / height) * 100;
      const primary = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
      const fallback = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
      tiles.push(`<img class="map-tile" src="${primary}" onerror="this.onerror=null;this.src='${fallback}'" alt="" loading="lazy" decoding="async" draggable="false" style="left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;width:${tileW.toFixed(3)}%;height:${tileH.toFixed(3)}%;">`);
    }
  }
  const project = item => {
    const point = mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom);
    return {
      x: point.x - startX,
      y: point.y - startY
    };
  };
  const projectedItems = withCoords.map((item, index) => ({ ...item, index, point: project(item) }));
  const pointGroups = new Map();
  projectedItems.forEach(item => {
    const key = `${Math.round(item.point.x / 4)}:${Math.round(item.point.y / 4)}`;
    if (!pointGroups.has(key)) pointGroups.set(key, []);
    pointGroups.get(key).push(item);
  });
  const routeItems = projectedItems.filter(item => !item.configuredOnly);
  const routePoints = routeItems.map(item => item.point).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const markers = [...pointGroups.values()].map(group => {
    const item = group[0];
    const p = item.point;
    const labelX = p.x + 12 > width - 120 ? p.x - 12 : p.x + 12;
    const anchor = p.x + 12 > width - 120 ? 'end' : 'start';
    const routeStops = group.filter(stop => !stop.configuredOnly);
    const markerText = routeStops.length
      ? routeStops.map(stop => stop.index + 1).join('/')
      : '+';
    const cityNames = [...new Set(group.map(stop => stop.ciudad.nombre))];
    const markerLabel = routeStops.length
      ? `${markerText}. ${cityNames.join(' / ')}`
      : cityNames.join(' / ');
    const title = routeStops.length
      ? routeStops.map(stop => stop.plannedOnly
        ? `${stop.index + 1}. ${stop.ciudad.nombre} · parada planificada sin gastos`
        : `${stop.index + 1}. ${stop.ciudad.nombre} · ${stop.count} gastos · ${fmtCurrency(stop.totalEur, 'EUR')}`).join('\n')
      : `${cityNames.join(' / ')} · sin gastos en este viaje`;
    return `<g class="map-marker${item.configuredOnly ? ' map-marker-config' : ''}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8"></circle><text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" class="map-marker-number">${markerText}</text><text x="${labelX.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="${anchor}">${escapeHtml(markerLabel)}</text><title>${escapeHtml(title)}</title></g>`;
  }).join('');
  const zoomLabel = tripMapState.zoomDelta === 0 ? 'auto' : `${tripMapState.zoomDelta > 0 ? '+' : ''}${tripMapState.zoomDelta}`;
  container.innerHTML = `<div class="trip-map-shell">
    <div class="map-controls" aria-label="Controles del mapa">
      <div class="map-controls-actions">
        <button type="button" data-map-zoom="reset" title="Volver al encuadre automático">Centrar</button>
        <button type="button" data-map-planned="1" title="Mostrar u ocultar ciudades planificadas">${tripMapState.showPlanned ? 'Planificadas' : 'Solo gastos'}</button>
        <button type="button" data-map-add-stop="1" title="Añadir, borrar o reordenar paradas del viaje">Añadir / modificar parada</button>
        <button type="button" data-map-refresh="1" title="Actualizar con las coordenadas guardadas en Configuración">Actualizar</button>
        <button type="button" data-map-geocode="1" title="Buscar coordenadas reales para las ciudades">Localizar</button>
      </div>
      <div class="map-controls-zoom">
        <button type="button" data-map-zoom="out" title="Reducir mapa">-</button>
        <span>Z ${zoom} ${zoomLabel}</span>
        <button type="button" data-map-zoom="in" title="Ampliar mapa">+</button>
      </div>
    </div>
    <div class="trip-map-frame" data-map-pan="1" style="aspect-ratio:${width} / ${height}">
      <div class="map-tiles" aria-hidden="true">${tiles.join('')}</div>
      <svg class="trip-map-overlay" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mapa del viaje">
        ${shouldDrawRoute && routePoints && routeItems.length > 1 ? `<polyline points="${routePoints}" class="map-route"></polyline>` : ''}
        ${markers}
      </svg>
      <div class="map-attribution">© OpenStreetMap · © CARTO</div>
    </div>
  </div>`;
  const missingText = missing.length ? ` Faltan coordenadas: ${missing.map(item => item.ciudad.nombre).join(', ')}.` : '';
  const route = withCoords.filter(item => !item.configuredOnly).map(item => item.ciudad.nombre).join(' → ');
  const configuredStops = withCoords.filter(item => item.configuredOnly).map(item => item.ciudad.nombre);
  const configuredText = configuredStops.length ? ` Paradas configuradas sin gasto: ${configuredStops.join(', ')}.` : '';
  const routeLabel = shouldDrawRoute ? `Ruta: ${route || 'sin gastos con ciudad'}.` : `Ciudades: ${route || 'sin gastos con ciudad'}.`;
  info.textContent = `${withCoords.length} ciudades en el mapa. ${routeLabel}${configuredText}${missingText}`;
}

function mapGesturePoints() {
  return [...tripMapGesture.pointers.values()];
}

function mapGestureDistance(points) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function mapGestureCenter(points) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function clearMapGestureFrame(frame) {
  if (frame) frame.classList.remove('dragging');
  tripMapGesture.frame = null;
  tripMapGesture.pinch = false;
  tripMapGesture.distance = 0;
  tripMapGesture.lastZoomAt = 0;
}

function mapFrameScale(frame) {
  const rect = frame ? frame.getBoundingClientRect() : null;
  const { width, height } = tripMapSize();
  return {
    x: rect && rect.width ? width / rect.width : 1,
    y: rect && rect.height ? height / rect.height : 1
  };
}

function setMapDragTransform(dx, dy) {
  if (!tripMapDrag.frame) return;
  tripMapDrag.frame.querySelectorAll('.map-tiles, .trip-map-overlay').forEach(el => {
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
}

function startTripMapDrag(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('.map-controls')) return;
  const frame = target.closest('.trip-map-frame');
  if (!frame) return;
  try {
    frame.setPointerCapture(event.pointerId);
  } catch {
    // Algunos navegadores móviles no permiten capturar el puntero en ciertos gestos.
  }
  tripMapGesture.frame = frame;
  tripMapGesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const points = mapGesturePoints();
  if (points.length >= 2) {
    setMapDragTransform(0, 0);
    tripMapDrag.active = false;
    tripMapDrag.frame = null;
    tripMapDrag.lastDx = 0;
    tripMapDrag.lastDy = 0;
    tripMapGesture.pinch = true;
    tripMapGesture.distance = mapGestureDistance(points);
    tripMapGesture.lastZoomAt = 0;
    frame.classList.add('dragging');
    event.preventDefault();
    return;
  }
  tripMapDrag.active = true;
  tripMapDrag.frame = frame;
  tripMapDrag.startX = event.clientX;
  tripMapDrag.startY = event.clientY;
  tripMapDrag.lastDx = 0;
  tripMapDrag.lastDy = 0;
  frame.classList.add('dragging');
}

function moveTripMapDrag(event) {
  if (tripMapGesture.pointers.has(event.pointerId)) {
    tripMapGesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  if (tripMapGesture.pinch && tripMapGesture.pointers.size >= 2) {
    const points = mapGesturePoints();
    const distance = mapGestureDistance(points);
    const center = mapGestureCenter(points);
    const frame = tripMapGesture.frame;
    const now = Date.now();
    const ratio = 1.55;
    if (distance && tripMapGesture.distance && now - tripMapGesture.lastZoomAt > 320) {
      if (distance > tripMapGesture.distance * ratio) {
        if (zoomTripMapAtClient(frame, center.x, center.y, 1)) {
          tripMapGesture.distance = distance;
          tripMapGesture.lastZoomAt = now;
        }
      } else if (distance < tripMapGesture.distance / ratio) {
        if (zoomTripMapAtClient(frame, center.x, center.y, -1)) {
          tripMapGesture.distance = distance;
          tripMapGesture.lastZoomAt = now;
        }
      }
    }
    event.preventDefault();
    return;
  }
  if (!tripMapDrag.active) return;
  tripMapDrag.lastDx = event.clientX - tripMapDrag.startX;
  tripMapDrag.lastDy = event.clientY - tripMapDrag.startY;
  setMapDragTransform(tripMapDrag.lastDx, tripMapDrag.lastDy);
  event.preventDefault();
}

function endTripMapDrag(event) {
  if (event && tripMapGesture.pointers.has(event.pointerId)) {
    tripMapGesture.pointers.delete(event.pointerId);
  }
  if (tripMapGesture.pinch) {
    if (tripMapGesture.pointers.size < 2) clearMapGestureFrame(tripMapGesture.frame);
    return;
  }
  if (!tripMapDrag.active) return;
  const frame = tripMapDrag.frame;
  const dx = tripMapDrag.lastDx;
  const dy = tripMapDrag.lastDy;
  const moved = Math.abs(dx) > 2 || Math.abs(dy) > 2;
  if (moved) {
    const scale = mapFrameScale(frame);
    tripMapState.panX += dx * scale.x;
    tripMapState.panY += dy * scale.y;
  }
  tripMapDrag.active = false;
  tripMapDrag.frame = null;
  tripMapDrag.lastDx = 0;
  tripMapDrag.lastDy = 0;
  if (frame) frame.classList.remove('dragging');
  if (tripMapGesture.pointers.size === 0) clearMapGestureFrame(frame);
  if (moved) renderTripMap();
}

function renderResumen() {
  const mon = $('#r-moneda').value;
  const cta = $('#r-cuenta').value;
  const pais = $('#r-pais') ? $('#r-pais').value : '';
  const ciudad = $('#r-ciudad') ? $('#r-ciudad').value : '';
  const gastos = state.gastos
    .filter(g => !mon || g.moneda === mon)
    .filter(g => !cta || g.cuentaId === Number(cta))
    .filter(g => gastoMatchesLugarFilters(g, pais, ciudad))
    .filter(gastoMatchesTripSelection);
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
  const days = summaryDays(gastos);
  const daysLine = `<div>${days} ${days === 1 ? 'día' : 'días'}</div>`;
  if (gastos.length) {
    $('#kpi-total').innerHTML = `${daysLine}<div class="kpi-note">Total</div>${formatCurrencyLines(totalLines)}`;
    $('#kpi-media').innerHTML = totalLines.map(item => ({
      currency: item.currency,
      amount: item.amount / days,
      always: item.always
    }))
      .filter(item => Math.abs(numberValue(item.amount)) > 0.000001 || item.always)
      .map(item => `<div>${fmtDailyCurrencyWithEur(item.amount, item.currency)}</div>`)
      .join('');
  } else {
    $('#kpi-total').innerHTML = `${daysLine}<div class="kpi-note">Total</div>${formatCurrencyLines(totalLines)}`;
    $('#kpi-media').innerHTML = `<div>${fmtCurrency(0, 'EUR')}/día</div>`;
  }
  const tripBudget = tripBudgetSummary(gastos);
  let budgetPct = '0%';
  let remainingLines = [{ currency: 'EUR', amount: 0, always: true }];
  if (tripBudget) {
    budgetPct = `${Math.min(100, tripBudget.pct).toFixed(0)}%`;
    remainingLines = [{ currency: 'EUR', amount: tripBudget.remainingEur, always: true }];
  } else {
    const remainingByCurrency = {};
    let remainingEur = 0;
    const budgetAccounts = accountsForBudgetScope(gastos);
    const pcts = budgetAccounts.map(c => {
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
    budgetPct = `${(pcts.reduce((a, b) => a + b, 0) / Math.max(1, pcts.length)).toFixed(0)}%`;
    remainingLines = [{ currency: 'EUR', amount: remainingEur, always: true }]
      .concat(Object.entries(remainingByCurrency)
        .filter(([currency]) => currency !== 'EUR')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => ({ currency, amount })));
  }
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
  const totalShare = value => totalEur ? `${((numberValue(value) * 100) / totalEur).toFixed(1)}%` : '0.0%';
  const breakdownRow = (firstLabel, secondLabel, value, className = '') =>
    `<tr${className ? ` class="${className}"` : ''}><td>${escapeHtml(firstLabel)}</td><td>${escapeHtml(secondLabel)}</td><td>${fmtCurrency(value, 'EUR')}</td><td>${totalShare(value)}</td></tr>`;
  const summaryTotalRow = (firstLabel = 'Total', secondLabel = '-') =>
    `<tr class="subtotal-row summary-total-row"><td>${escapeHtml(firstLabel)}</td><td>${escapeHtml(secondLabel)}</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${totalEur ? '100.0%' : '0.0%'}</td></tr>`;
  $('#tabla-cat tbody').innerHTML = categoryRows.map(row => breakdownRow(row.cat, row.sub, row.total)).join('') + summaryTotalRow('Total', '-');
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
  const breakdownHead = $('#tabla-cat thead tr');
  if (breakdownHead) breakdownHead.innerHTML = '<th>Categoría</th><th>Subcategoría</th><th>Total EUR</th><th>% gasto</th>';
  if (breakdownMode === 'categorias') {
    $('#tabla-cat tbody').innerHTML = categoryTotals
      .map(row => breakdownRow(row.cat, '-', row.total))
      .join('') + summaryTotalRow('Total', '-');
    drawPieChart($('#chart-cat'), categoryTotals.slice(0, 6).map(row => ({ label: row.cat, value: row.total })));
  } else {
    const groupedRows = [];
    const pieRows = [];
    categoryTotals.forEach(catRow => {
      categoryRows
        .filter(row => row.cat === catRow.cat)
        .sort((a, b) => b.total - a.total)
        .forEach(row => {
          groupedRows.push(breakdownRow(row.cat, row.sub, row.total));
          pieRows.push(row);
        });
          groupedRows.push(breakdownRow(catRow.cat, 'Subtotal categoría', catRow.total, 'subtotal-row'));
    });
    groupedRows.push(summaryTotalRow('Total', '-'));
    $('#tabla-cat tbody').innerHTML = groupedRows.join('');
    drawPieChart($('#chart-cat'), pieRows.slice(0, 6).map(row => ({ label: row.sub === '(sin subcat)' ? row.cat : `${row.cat} · ${row.sub}`, value: row.total })));
  }

  if (breakdownMode === 'ciudades') {
    const cityTotals = {};
    gastos.forEach(g => {
      const ciudad = state.lugares.find(l => l.id === Number(g.ciudadId));
      const paisLugar = state.lugares.find(l => l.id === Number(g.paisId || (ciudad && ciudad.parentId)));
      const key = `${ciudad ? ciudad.nombre : '(sin ciudad)'}||${paisLugar ? paisLugar.nombre : '-'}`;
      cityTotals[key] = (cityTotals[key] || 0) + toEur(g.importe, g.moneda);
    });
    const cityRows = Object.entries(cityTotals)
      .map(([key, total]) => ({ ciudad: key.split('||')[0], pais: key.split('||')[1], total }))
      .sort((a, b) => b.total - a.total);
    if (breakdownHead) breakdownHead.innerHTML = '<th>Ciudad</th><th>País</th><th>Total EUR</th><th>% gasto</th>';
    $('#tabla-cat tbody').innerHTML = cityRows
      .map(row => breakdownRow(row.ciudad, row.pais, row.total))
      .join('') + summaryTotalRow('Total', '-');
    drawPieChart($('#chart-cat'), cityRows.slice(0, 6).map(row => ({ label: row.ciudad, value: row.total })));
  }

  const usedAccountIds = new Set(gastos.map(g => Number(g.cuentaId)));
  const accounts = cta
    ? state.cuentas.filter(c => c.id === Number(cta))
    : state.cuentas.filter(c => usedAccountIds.has(Number(c.id)));
  let accountRows = accounts.map(c => {
    const spentAccountCurrency = gastos
      .filter(g => g.cuentaId === c.id)
      .reduce((sum, g) => sum + fromEur(toEur(g.importe, g.moneda), c.moneda), 0);
    const spentEur = gastos.filter(g => g.cuentaId === c.id).reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
    let budget = numberValue(c.presupuesto);
    let budgetEur = budget ? toEur(budget, c.moneda) : 0;
    let remainingEur = budget ? budgetEur - spentEur : null;
    let pct = budget ? spentEur * 100 / budgetEur : 0;
    return {
      label: accountLabel(c),
      moneda: c.moneda,
      total: spentAccountCurrency,
      totalEur: spentEur,
      presupuesto: budget,
      presupuestoEur: budgetEur,
      restanteEur: remainingEur,
      pct
    };
  }).sort((a, b) => b.totalEur - a.totalEur);
  drawBarChart($('#chart-cuenta'), accountRows.map(row => ({ label: row.label, value: row.totalEur })));
  const accountHtml = accountRows.map(row => `<tr class="${row.restanteEur !== null && row.restanteEur < 0 ? 'warning-row' : ''}"><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.moneda)}</td><td>${fmtCurrency(row.total, row.moneda)}</td><td>${fmtCurrency(row.totalEur, 'EUR')}</td><td>${row.presupuesto ? `${fmtCurrency(row.presupuesto, row.moneda)} / ${fmtCurrency(row.presupuestoEur, 'EUR')}` : '-'}</td><td>${row.restanteEur === null ? '-' : fmtCurrency(row.restanteEur, 'EUR')}</td><td>${row.pct.toFixed(1)}%</td></tr>`);
  const accountBudgetEur = accountRows.reduce((sum, row) => sum + numberValue(row.presupuestoEur), 0);
  const accountRemainingEur = accountBudgetEur ? accountBudgetEur - totalEur : null;
  const accountPct = accountBudgetEur ? totalEur * 100 / accountBudgetEur : 0;
  if (accountBudgetEur) {
    accountHtml.push(`<tr class="${accountRemainingEur !== null && accountRemainingEur < 0 ? 'warning-row' : 'subtotal-row'}"><td>Total / presupuesto de cuentas</td><td>EUR</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${fmtCurrency(accountBudgetEur, 'EUR')}</td><td>${accountRemainingEur === null ? '-' : fmtCurrency(accountRemainingEur, 'EUR')}</td><td>${accountPct.toFixed(1)}%</td></tr>`);
  }
  if (tripBudget) {
    accountHtml.push(`<tr class="${tripBudget.remainingEur < 0 ? 'warning-row' : 'subtotal-row'}"><td>Total / presupuesto del viaje</td><td>EUR</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${fmtCurrency(tripBudget.budgetEur, 'EUR')}</td><td>${fmtCurrency(tripBudget.remainingEur, 'EUR')}</td><td>${tripBudget.pct.toFixed(1)}%</td></tr>`);
  } else if (!accountBudgetEur) {
    accountHtml.push(`<tr class="subtotal-row"><td>Total gastado</td><td>EUR</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>-</td><td>-</td><td>-</td></tr>`);
  }
  $('#tabla-cuenta tbody').innerHTML = accountHtml.join('');
  renderTripMap();
}

async function exportAll() {
  return buildBackupData('all');
}

function buildBackupData(scope = 'all', tripId = null) {
  if (scope === 'trip') return buildTripBackupData(tripId);
  return {
    version: APP_VERSION,
    generatedAt: new Date().toISOString(),
    dataUpdatedAt: ensureLocalDataUpdatedAt(),
    backupScope: 'all',
    cuentas: state.cuentas,
    categorias: state.categorias,
    lugares: state.lugares,
    gastos: state.gastos,
    viajes: state.viajes,
    monedas: state.monedas,
    transferencias: state.transferencias
  };
}

async function exportTripBackup(tripId) {
  return buildTripBackupData(tripId);
}

function buildTripBackupData(tripId) {
  const id = Number(tripId);
  const trip = state.viajes.find(v => Number(v.id) === id);
  if (!trip) throw new Error('Elige un viaje para exportar');
  const gastos = state.gastos.filter(g => Number(g.viajeId) === id);
  const usedAccountIds = new Set(gastos.map(g => Number(g.cuentaId)).filter(Boolean));
  const cuentas = state.cuentas.filter(c => Number(c.viajeId) === id || usedAccountIds.has(Number(c.id)));
  const accountIds = new Set(cuentas.map(c => Number(c.id)));
  const transferencias = state.transferencias.filter(t => accountIds.has(Number(t.fromId)) || accountIds.has(Number(t.toId)));
  return {
    version: APP_VERSION,
    generatedAt: new Date().toISOString(),
    dataUpdatedAt: ensureLocalDataUpdatedAt(),
    backupScope: 'trip',
    cuentas,
    categorias: state.categorias,
    lugares: state.lugares,
    gastos,
    viajes: [trip],
    monedas: state.monedas,
    transferencias
  };
}

async function importAll(data) {
  if (!data || !Array.isArray(data.cuentas) || !Array.isArray(data.categorias) || !Array.isArray(data.gastos)) {
    throw new Error('Archivo no válido');
  }
  await clearStores(['cuentas', 'categorias', 'lugares', 'gastos', 'viajes', 'monedas', 'transferencias']);
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
      paisIds: tripCountryIds(v),
      ciudadIds: tripCityIds(v),
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
      viajeId: c.viajeId ? Number(c.viajeId) : null,
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
  for (const l of data.lugares || []) {
    const obj = {
      nombre: l.nombre,
      parentId: l.parentId ? Number(l.parentId) : null,
      lat: optionalNumberValue(l.lat),
      lng: optionalNumberValue(l.lng)
    };
    if (l.id != null) obj.id = l.id;
    await addRecord('lugares', obj);
  }
  for (const g of data.gastos || []) {
    const obj = {
      ...g,
      viajeId: g.viajeId || null,
      paisId: g.paisId || null,
      ciudadId: g.ciudadId || null,
      importe: numberValue(g.importe),
      importeEur: toEur(g.importe, g.moneda)
    };
    if (g.id == null) delete obj.id;
    await addRecord('gastos', obj);
  }
}

async function importTripBackup(data, targetTripId) {
  if (!data || !Array.isArray(data.viajes) || !data.viajes.length || !Array.isArray(data.gastos)) {
    throw new Error('El archivo no contiene un viaje exportado');
  }
  const targetId = Number(targetTripId);
  const targetTrip = state.viajes.find(v => Number(v.id) === targetId);
  if (!targetTrip) throw new Error('Elige el viaje que quieres reemplazar');
  const sourceTrip = data.viajes[0];
  const sourceTripId = Number(sourceTrip.id);
  const now = new Date().toISOString();

  for (const l of data.lugares || []) {
    if (l.id == null || state.lugares.some(existing => Number(existing.id) === Number(l.id))) continue;
    await addRecord('lugares', {
      id: Number(l.id),
      nombre: l.nombre,
      parentId: l.parentId ? Number(l.parentId) : null,
      lat: optionalNumberValue(l.lat),
      lng: optionalNumberValue(l.lng)
    });
  }
  await loadAll();

  const oldTripAccounts = state.cuentas.filter(c => Number(c.viajeId) === targetId);
  const oldTripAccountIds = new Set(oldTripAccounts.map(c => Number(c.id)));
  for (const gasto of state.gastos.filter(g => Number(g.viajeId) === targetId)) {
    await deleteRecord('gastos', Number(gasto.id));
  }
  for (const transfer of state.transferencias.filter(t => oldTripAccountIds.has(Number(t.fromId)) || oldTripAccountIds.has(Number(t.toId)))) {
    await deleteRecord('transferencias', Number(transfer.id));
  }
  for (const account of oldTripAccounts) {
    await deleteRecord('cuentas', Number(account.id));
  }
  const tripPatch = { updatedAt: now };
  if (sourceTrip.presupuesto != null) tripPatch.presupuesto = numberValue(sourceTrip.presupuesto);
  if (Array.isArray(sourceTrip.paisIds) || sourceTrip.paisId) tripPatch.paisIds = tripCountryIds(sourceTrip);
  if (Array.isArray(sourceTrip.ciudadIds)) tripPatch.ciudadIds = tripCityIds(sourceTrip);
  await updateViaje(targetId, tripPatch);
  const accountMap = {};
  for (const c of (data.cuentas || []).filter(c => Number(c.viajeId) === sourceTripId)) {
    const obj = {
      nombre: c.nombre,
      moneda: c.moneda || 'EUR',
      viajeId: targetId,
      saldoInicial: numberValue(c.saldoInicial),
      saldoActual: numberValue(c.saldoActual ?? c.saldoInicial),
      presupuesto: numberValue(c.presupuesto),
      nota: c.nota || '',
      createdAt: c.createdAt || now,
      updatedAt: now
    };
    accountMap[Number(c.id)] = await addRecord('cuentas', obj);
  }
  for (const g of data.gastos || []) {
    const sourceAccountId = Number(g.cuentaId);
    let cuentaId = accountMap[sourceAccountId];
    if (!cuentaId) {
      const sourceAccount = (data.cuentas || []).find(c => Number(c.id) === sourceAccountId);
      const global = sourceAccount && state.cuentas.find(c => !c.viajeId && accountKey(c) === accountKey(sourceAccount));
      cuentaId = global ? global.id : null;
    }
    if (!cuentaId) continue;
    const obj = {
      ...g,
      id: undefined,
      viajeId: targetId,
      cuentaId: Number(cuentaId),
      importe: numberValue(g.importe),
      importeEur: toEur(g.importe, g.moneda),
      createdAt: g.createdAt || now,
      updatedAt: now
    };
    delete obj.id;
    await addRecord('gastos', obj);
  }
}

async function seedIfEmpty() {
  await seedDefaults();
}

function scrollToGastosStart() {
  const view = $('#view-gastos');
  if (!view) return;
  requestAnimationFrame(() => {
    const top = Math.max(0, view.getBoundingClientRect().top + window.scrollY - 12);
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

function setTab(id) {
  state.activeTab = id;
  ['viajes', 'gastos', 'resumen', 'config'].forEach(tab => {
    $(`#tab-${tab}`).classList.toggle('active', tab === id);
    $(`#view-${tab}`).style.display = tab === id ? 'block' : 'none';
  });
  if (id === 'resumen') renderResumen();
  if (id === 'gastos') scrollToGastosStart();
}

function applySelectedTrip(id) {
  setSelectedTrips(id ? [Number(id)] : []);
  renderViajesHome();
  renderFilterAccountSelector();
  renderResumenAccountSelector();
  renderFilterPaises();
  renderResumenPaises();
  renderMapPaises();
  renderGastosTabla();
  renderCuentas();
  renderResumen();
}

function openEditGasto(gasto) {
  const dialog = $('#edit-gasto-dialog');
  if (!dialog || !gasto) return;
  $('#edit-gasto-id').value = gasto.id;
  $('#edit-gasto-fecha').value = gasto.fecha || todayIso();
  $('#edit-gasto-viaje').value = gasto.viajeId ? String(gasto.viajeId) : '';
  renderEditGastoAccountSelector();
  $('#edit-gasto-cuenta').value = String(gasto.cuentaId || '');
  const account = state.cuentas.find(c => c.id === Number(gasto.cuentaId));
  $('#edit-gasto-moneda').value = account ? account.moneda : gasto.moneda;
  $('#edit-gasto-cat').value = String(gasto.catId || '');
  renderEditSubcategories();
  $('#edit-gasto-subcat').value = gasto.subcatId ? String(gasto.subcatId) : '';
  $('#edit-gasto-pais').value = gasto.paisId ? String(gasto.paisId) : '';
  renderEditCiudades();
  $('#edit-gasto-ciudad').value = gasto.ciudadId ? String(gasto.ciudadId) : '';
  const currentAmount = numberValue(gasto.importe);
  $('#edit-gasto-tipo').value = currentAmount < 0 ? 'ingreso' : 'gasto';
  $('#edit-gasto-importe').value = Math.abs(currentAmount);
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

function openAddGasto() {
  const dialog = $('#add-gasto-dialog');
  if (!dialog) return;
  setMessage('#msg-gasto', '');
  if (!$('#g-fecha').value) $('#g-fecha').value = todayIso();
  const ids = selectedTripIds();
  if (ids.length === 1 && $('#g-viaje')) $('#g-viaje').value = String(ids[0]);
  renderGastoAccountSelector();
  applyDefaultTripCountryToExpense();
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeAddGasto() {
  const dialog = $('#add-gasto-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function openFiltersPanel() {
  const panel = $('#filters-panel');
  if (!panel) return;
  panel.classList.add('open');
  document.body.classList.add('filters-open');
}

function closeFiltersPanel() {
  const panel = $('#filters-panel');
  if (!panel) return;
  panel.classList.remove('open');
  document.body.classList.remove('filters-open');
}

function applyExpenseViewMode() {
  const table = $('#tabla-gastos');
  const selector = $('#f-view');
  const mobileSelector = $('#f-view-mobile');
  if (!table || !selector) return;
  if (mobileSelector && mobileSelector.value !== selector.value) mobileSelector.value = selector.value;
  table.classList.toggle('cards-mode', selector.value === 'cards');
  table.classList.toggle('table-mode', selector.value === 'table');
}

function setExpenseViewMode(value) {
  const view = value === 'cards' ? 'cards' : 'table';
  if ($('#f-view')) $('#f-view').value = view;
  if ($('#f-view-mobile')) $('#f-view-mobile').value = view;
  localStorage.setItem(EXPENSE_VIEW_KEY, view);
  applyExpenseViewMode();
}

function openPrintDialog() {
  const dialog = $('#print-dialog');
  if (!dialog) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closePrintDialog() {
  const dialog = $('#print-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function syncBackupExportTripVisibility() {
  const tripMode = $('#backup-export-scope') && $('#backup-export-scope').value === 'trip';
  const field = $('#backup-export-trip-field');
  if (field) field.style.display = tripMode ? '' : 'none';
  if ($('#backup-export-trip')) {
    $('#backup-export-trip').disabled = !tripMode;
    if (!tripMode) $('#backup-export-trip').value = '';
  }
}

function syncBackupShareAvailability() {
  const key = ensureSyncKey();
  if ($('#sync-key-input') && document.activeElement !== $('#sync-key-input')) {
    $('#sync-key-input').value = key;
  }
}

function generateSyncKey() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const raw = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  return raw.match(/.{1,6}/g).join('-');
}

function ensureSyncKey() {
  let key = (localStorage.getItem(SYNC_KEY_STORAGE) || '').trim();
  if (!key) {
    key = generateSyncKey();
    localStorage.setItem(SYNC_KEY_STORAGE, key);
  }
  return key;
}

function syncKey() {
  return (localStorage.getItem(SYNC_KEY_STORAGE) || ensureSyncKey()).trim();
}

function inferLocalDataUpdatedAt() {
  const dates = [
    ...state.cuentas,
    ...state.categorias,
    ...state.lugares,
    ...state.gastos,
    ...state.viajes,
    ...state.monedas,
    ...state.transferencias
  ].flatMap(item => [item && item.updatedAt, item && item.createdAt]).filter(Boolean).sort();
  return dates[dates.length - 1] || new Date(0).toISOString();
}

function ensureLocalDataUpdatedAt() {
  return localDataUpdatedAt() || setLocalDataUpdatedAt(inferLocalDataUpdatedAt());
}

function formatSyncDate(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-ES');
}

function setSyncMessage(text, isError = false) {
  setMessage('#sync-message', text, isError);
}

function syncMetadataDate(metadata) {
  return metadata && (metadata.updatedAt || metadata.savedAt) || '';
}

function hasMeaningfulLocalData() {
  return Boolean(
    state.viajes.length
    || state.gastos.length
    || state.transferencias.length
    || state.lugares.length
    || state.monedas.some(item => item.codigo !== 'EUR')
  );
}

async function fetchCloudMetadata() {
  if (!navigator.onLine) throw new Error('No hay conexión a Internet');
  const response = await fetch(SYNC_ENDPOINT, {
    headers: { 'x-sync-key': syncKey() },
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo consultar la copia en Netlify');
  const payload = await response.json();
  return payload.metadata || null;
}

async function fetchCloudSnapshot() {
  const response = await fetch(`${SYNC_ENDPOINT}?content=1`, {
    headers: { 'x-sync-key': syncKey() },
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo recuperar la versión de la nube');
  return response.json();
}

async function uploadCloudSnapshot({ backupData = null, backupName = '' } = {}) {
  const manualFullBackup = backupData && backupData.backupScope === 'all';
  const fullData = manualFullBackup ? backupData : buildBackupData('all');
  const fullName = manualFullBackup && backupName ? backupName : backupFilename(fullData);
  const preparedFull = await prepareCloudBackupData(fullData);
  const preparedBackup = backupData && backupData.backupScope === 'trip'
    ? await prepareCloudBackupData(backupData)
    : null;
  const attachmentStats = await uploadCloudAttachments([
    ...preparedFull.attachments,
    ...(preparedBackup ? preparedBackup.attachments : [])
  ]);
  const body = {
    data: preparedFull.data,
    updatedAt: fullData.dataUpdatedAt || ensureLocalDataUpdatedAt(),
    filename: fullName,
    appVersion: APP_VERSION
  };
  if (preparedBackup) {
    body.backup = {
      data: preparedBackup.data,
      filename: backupName || backupFilename(backupData)
    };
  }
  const text = JSON.stringify(body);
  if (new TextEncoder().encode(text).byteLength > 5_300_000) {
    throw new Error('Los datos sin fotos superan el tamaño permitido. Será necesario dividir también el archivo de datos.');
  }
  const response = await fetch(SYNC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-key': syncKey()
    },
    body: text
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    if (detail.error === 'payload_too_large') throw new Error('La copia supera el tamaño permitido por Netlify');
    throw new Error('No se pudo guardar la copia en Netlify');
  }
  const saved = await response.json();
  const verified = await fetchCloudMetadata();
  const savedTime = Date.parse(saved.savedAt || 0);
  const verifiedTime = Date.parse(verified && verified.savedAt || 0);
  if (!verified || !verifiedTime || (savedTime && verifiedTime < savedTime)) {
    throw new Error('Netlify recibió la copia, pero no confirmó la fecha nueva. Comprueba de nuevo antes de sincronizar.');
  }
  verified.attachmentStats = attachmentStats;
  currentCloudMetadata = verified;
  return verified;
}

function renderSyncComparison(metadata) {
  currentCloudMetadata = metadata;
  const localDataDate = ensureLocalDataUpdatedAt();
  const localBackupDate = localStorage.getItem(BACKUP_KEY) || '';
  const cloudDataDate = syncMetadataDate(metadata);
  const cloudBackupDate = metadata && (metadata.savedAt || cloudDataDate) || '';
  if ($('#sync-local-backup-date')) {
    $('#sync-local-backup-date').textContent = localBackupDate ? formatSyncDate(localBackupDate) : 'No existe todavía';
  }
  if ($('#sync-local-date')) {
    $('#sync-local-date').textContent = `Datos modificados: ${formatSyncDate(localDataDate)}`;
  }
  if ($('#sync-cloud-date')) {
    $('#sync-cloud-date').textContent = metadata ? `Datos modificados: ${formatSyncDate(cloudDataDate)}` : '';
  }
  if ($('#sync-cloud-saved-date')) {
    $('#sync-cloud-saved-date').textContent = metadata ? formatSyncDate(cloudBackupDate) : 'No existe todavía';
  }

  const localTime = Date.parse(localDataDate || 0);
  const cloudTime = Date.parse(cloudDataDate || 0);
  const cloudIsPreferred = metadata && (cloudTime > localTime || (!hasMeaningfulLocalData() && cloudTime !== localTime));
  const downloadButton = $('#sync-download');
  const uploadButton = $('#sync-upload');
  if (downloadButton) downloadButton.style.display = cloudIsPreferred ? '' : 'none';
  if (uploadButton) uploadButton.style.display = !metadata || (hasMeaningfulLocalData() && localTime > cloudTime) ? '' : 'none';

  if (!metadata) {
    setSyncMessage('No hay una versión en la nube. Puedes guardar la versión local.');
  } else if (cloudIsPreferred) {
    setSyncMessage('La versión de la nube es más reciente. ¿Quieres actualizar este dispositivo?');
  } else if (localTime > cloudTime) {
    setSyncMessage('La versión local es más reciente. ¿Quieres guardarla en la nube?');
  } else {
    setSyncMessage('La versión local y la versión en la nube están sincronizadas.');
  }
}

async function refreshSyncComparison() {
  setSyncMessage('Consultando Netlify...');
  if ($('#sync-download')) $('#sync-download').style.display = 'none';
  if ($('#sync-upload')) $('#sync-upload').style.display = 'none';
  try {
    renderSyncComparison(await fetchCloudMetadata());
  } catch (error) {
    currentCloudMetadata = null;
    const localBackupDate = localStorage.getItem(BACKUP_KEY) || '';
    if ($('#sync-local-backup-date')) {
      $('#sync-local-backup-date').textContent = localBackupDate ? formatSyncDate(localBackupDate) : 'No existe todavía';
    }
    if ($('#sync-local-date')) {
      $('#sync-local-date').textContent = `Datos modificados: ${formatSyncDate(ensureLocalDataUpdatedAt())}`;
    }
    if ($('#sync-cloud-saved-date')) $('#sync-cloud-saved-date').textContent = 'No se pudo consultar';
    if ($('#sync-cloud-date')) $('#sync-cloud-date').textContent = '';
    setSyncMessage(error.message || String(error), true);
  }
}

async function openSyncDialog(metadata = undefined) {
  const dialog = $('#sync-dialog');
  if (!dialog) return;
  const keyInput = $('#sync-key-input');
  if (keyInput) {
    keyInput.type = 'password';
    keyInput.value = ensureSyncKey();
  }
  if ($('#sync-key-toggle')) $('#sync-key-toggle').textContent = 'Mostrar';
  if (!dialog.open) dialog.showModal();
  if (metadata !== undefined) renderSyncComparison(metadata);
  else await refreshSyncComparison();
}

function closeSyncDialog() {
  const dialog = $('#sync-dialog');
  if (dialog && dialog.open) dialog.close();
}

async function saveChangedSyncKey() {
  const input = $('#sync-key-input');
  const next = String(input ? input.value : '').trim();
  if (next.length < 12) throw new Error('La clave debe tener al menos 12 caracteres');
  const current = syncKey();
  if (next === current) {
    setSyncMessage('La clave no ha cambiado.');
    return;
  }
  if (!confirm('Cambiar la clave abre otro espacio de copias en la nube. ¿Continuar?')) {
    input.value = current;
    return;
  }
  localStorage.setItem(SYNC_KEY_STORAGE, next);
  currentCloudMetadata = null;
  await refreshSyncComparison();
}

function toggleSyncKeyVisibility() {
  const input = $('#sync-key-input');
  const button = $('#sync-key-toggle');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (button) button.textContent = show ? 'Ocultar' : 'Mostrar';
}

async function copySyncKey() {
  await navigator.clipboard.writeText(syncKey());
  setSyncMessage('Clave copiada. Guárdala para usarla en otro dispositivo.');
}

async function performCloudDownload() {
  setSyncMessage('Preparando la sincronización...');
  const remote = await fetchCloudSnapshot();
  if (!remote || !remote.data) throw new Error('No hay datos disponibles en la nube');
  await createSyncBackup('before-sync');
  const hydratedData = await hydrateCloudBackupData(remote.data);
  await withDataTrackingPaused(() => importAll(hydratedData));
  setLocalDataUpdatedAt(remote.updatedAt || remote.savedAt || new Date().toISOString());
  await loadAll();
  await createSyncBackup('after-sync');
  await refreshLocalBackupHistory();
  renderSyncComparison({
    savedAt: remote.savedAt,
    updatedAt: remote.updatedAt,
    filename: remote.filename,
    appVersion: remote.appVersion
  });
  showBackupResult('Sincronización realizada', 'Los datos se actualizaron desde la nube. Se crearon una copia local anterior y otra posterior terminada en -2.');
}

async function performCloudUpload() {
  setSyncMessage('Guardando la versión local...');
  await createSyncBackup('before-sync');
  const saved = await uploadCloudSnapshot();
  await createSyncBackup('after-sync');
  await refreshLocalBackupHistory();
  renderSyncComparison(saved);
  const stats = saved.attachmentStats || {};
  const photoDetail = stats.total
    ? ` Fotos nuevas: ${stats.uploaded}. Fotos ya existentes: ${stats.reused}.`
    : ' No había fotos pendientes.';
  showBackupResult('Sincronización realizada', `La copia en la nube se guardó correctamente.${photoDetail} Se crearon una copia local anterior y otra posterior terminada en -2.`);
}

async function checkCloudOnEntry() {
  try {
    const metadata = await fetchCloudMetadata();
    if (!metadata) return;
    const cloudTime = Date.parse(syncMetadataDate(metadata) || 0);
    const localTime = Date.parse(ensureLocalDataUpdatedAt() || 0);
    const cloudIsPreferred = cloudTime > localTime || (!hasMeaningfulLocalData() && cloudTime !== localTime);
    if (cloudIsPreferred) await openSyncDialog(metadata);
  } catch (error) {
    console.warn('No se pudo comprobar la sincronización al entrar', error);
  }
}

async function downloadStoredLocalBackup(id) {
  const summary = backupHistory().find(item => Number(item.id) === Number(id));
  const filename = (summary && summary.filename) || 'gastos-copia.json';
  const fixedSetting = await getBackupDirectorySetting();
  let selection = { status: 'unsupported' };
  let fixedDirectoryReady = false;
  if (fixedSetting && fixedSetting.handle) {
    try {
      const permission = await backupDirectoryPermission(fixedSetting.handle, true);
      fixedDirectoryReady = permission === 'granted' || permission === 'unknown';
    } catch {
      fixedDirectoryReady = false;
    }
  }
  if (!fixedDirectoryReady) {
    selection = await chooseSaveFile(filename, 'application/json', '.json');
    if (selection.status === 'cancelled') return 'cancelled';
  }
  const backup = await getOne('localBackups', Number(id));
  if (!backup || !backup.data) throw new Error('No se encuentra esa copia local');
  const finalFilename = backup.filename || filename;
  const json = JSON.stringify(backup.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  if (fixedDirectoryReady) {
    const fixedDirectory = await saveBlobToBackupDirectory(finalFilename, blob, false);
    if (fixedDirectory.status === 'saved') return 'folder';
  }
  if (selection.status === 'selected') {
    try {
      await writeBlobToFileHandle(selection.handle, blob);
      return 'picker';
    } catch (error) {
      console.warn('No se pudo guardar en la ubicación elegida; se usará Descargas', error);
    }
  }
  downloadText(finalFilename, json, 'application/json');
  return 'download';
}

function openBackupDialog(mode = 'all') {
  const dialog = $('#backup-dialog');
  if (!dialog) return;
  const importOnly = mode === 'import';
  const backupOnly = mode === 'backup';
  if ($('#backup-export-section')) $('#backup-export-section').style.display = importOnly ? 'none' : '';
  if ($('#backup-import-section')) $('#backup-import-section').style.display = backupOnly ? 'none' : '';
  if ($('#backup-export-section') && !$('#backup-history')) {
    const box = document.createElement('div');
    box.className = 'backup-history-box';
    box.innerHTML = '<h3>Ultimas copias</h3><div id="backup-history"></div><p class="small">Si estas dentro de las fechas de un viaje y pasan 2 dias sin copia, la app mostrara un recordatorio.</p>';
    $('#backup-export-section').appendChild(box);
  }
  const title = importOnly ? 'Importación' : backupOnly ? 'Backups' : 'Importación / Backups';
  const heading = $('#backup-dialog h2');
  if (heading) heading.textContent = title;
  const ids = selectedTripIds();
  if (ids.length === 1 && $('#backup-export-trip')) {
    $('#backup-export-scope').value = 'trip';
    $('#backup-export-trip').value = String(ids[0]);
  } else if ($('#backup-export-scope')) {
    $('#backup-export-scope').value = 'all';
  }
  syncBackupExportTripVisibility();
  syncBackupShareAvailability();
  renderBackupDirectorySetting().catch(error => console.warn('No se pudo mostrar la carpeta de copias', error));
  if ($('#backup-import-trip')) {
    const tripImport = $('#backup-import-mode').value === 'trip';
    $('#backup-import-trip').disabled = !tripImport;
    if (!tripImport) $('#backup-import-trip').value = '';
  }
  renderBackupHistory();
  setMessage('#msg-backup', '');
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeBackupDialog() {
  const dialog = $('#backup-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function openBackupDialogSafe(mode = 'all') {
  try {
    const normalizedMode = typeof mode === 'string' ? mode : 'all';
    const dialog = $('#backup-dialog');
    if (!dialog) return;
    const importOnly = normalizedMode === 'import';
    const backupOnly = normalizedMode === 'backup';
    if ($('#backup-export-section')) $('#backup-export-section').style.display = importOnly ? 'none' : '';
    if ($('#backup-import-section')) $('#backup-import-section').style.display = backupOnly ? 'none' : '';
    const heading = $('#backup-dialog h2');
    if (heading) heading.textContent = importOnly ? 'Importación' : backupOnly ? 'Backups' : 'Importación / Backups';
    const ids = selectedTripIds();
    if (ids.length === 1 && $('#backup-export-trip')) {
      $('#backup-export-scope').value = 'trip';
      $('#backup-export-trip').value = String(ids[0]);
    } else if ($('#backup-export-scope')) {
      $('#backup-export-scope').value = 'all';
    }
    syncBackupExportTripVisibility();
    syncBackupShareAvailability();
    renderBackupDirectorySetting().catch(error => console.warn('No se pudo mostrar la carpeta de copias', error));
    if ($('#backup-import-trip')) {
      const tripImport = $('#backup-import-mode').value === 'trip';
      $('#backup-import-trip').disabled = !tripImport;
      if (!tripImport) $('#backup-import-trip').value = '';
    }
    renderBackupHistory();
    setMessage('#msg-backup', '');
    if (dialog.open) return;
    if (dialog.showModal) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', 'open');
      }
    } else {
      dialog.setAttribute('open', 'open');
    }
  } catch (err) {
    alert(`No se pudo abrir Importación/Backups: ${err.message || err}`);
  }
}

function closeBackupResultDialog() {
  const dialog = $('#backup-result-dialog');
  const isImport = (($('#backup-result-title') && $('#backup-result-title').textContent) || '').toLowerCase().includes('import');
  if (dialog) {
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
  }
  closeBackupDialog();
  if (isImport) setTab('viajes');
}

function showBackupResult(title, detail = '') {
  if ($('#backup-result-title')) $('#backup-result-title').textContent = title;
  if ($('#backup-result-detail')) $('#backup-result-detail').textContent = detail;
  const dialog = $('#backup-result-dialog');
  if (dialog) {
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }
  setMessage('#msg-backup', '');
}

function showBackupResultSoon(title, detail = '') {
  setTimeout(() => showBackupResult(title, detail), 900);
}

async function handleBackupDownload() {
  try {
    const result = await prepareJsonBackup({
      autoDownload: true,
      scope: $('#backup-export-scope').value,
      tripId: $('#backup-export-trip').value
    });
    const { filename, data, saveMethod } = result;
    const folderSetting = await getBackupDirectorySetting();
    const folderName = folderSetting && (folderSetting.name || (folderSetting.handle && folderSetting.handle.name));
    const localDetail = saveMethod === 'folder'
      ? `Copia local creada y guardada en la carpeta ${folderName || 'seleccionada'}: ${filename}`
      : saveMethod === 'picker'
      ? `Copia local creada y guardada en la ubicación elegida: ${filename}`
      : saveMethod === 'cancelled'
        ? `Copia local creada dentro de la app. No se guardó un archivo externo: ${filename}`
        : `Copia local creada: ${filename}`;
    setMessage('#msg-backup', localDetail);
    setMessage('#msg-export', localDetail);
    if (confirm('¿Quieres guardar también esta copia en la nube para que esté disponible al sincronizar?')) {
      try {
        const saved = await uploadCloudSnapshot({ backupData: data, backupName: filename });
        const stats = saved.attachmentStats || {};
        const detail = stats.total
          ? ` Fotos nuevas: ${stats.uploaded}. Fotos ya existentes: ${stats.reused}.`
          : ' No había fotos pendientes.';
        showBackupResult('Copias creadas', `${localDetail}. También se guardó una copia en Netlify.${detail}`);
      } catch (cloudError) {
        showBackupResult('Copia local creada', `${localDetail}. No se pudo guardar la copia en la nube: ${cloudError.message || cloudError}`);
      }
    } else showBackupResultSoon('Copia local creada', localDetail);
  } catch (err) {
    setMessage('#msg-backup', err.message || String(err), true);
  }
}

function handleBackupImportClick() {
  const input = $('#file-import');
  if (input) input.click();
}

function printableSectionHtml(id) {
  const original = $(`#view-${id}`);
  if (!original) return '';
  const clone = original.cloneNode(true);
  clone.removeAttribute('id');
  clone.style.display = 'block';
  clone.querySelectorAll('.map-controls').forEach(el => el.remove());
  clone.querySelectorAll('.map-tile').forEach(el => {
    el.removeAttribute('loading');
    el.setAttribute('decoding', 'sync');
  });
  clone.querySelectorAll('.section-head, .filters-card, .row4, .action-col, .desktop-actions, .mobile-action-select, button, input, select, label').forEach(el => el.remove());
  clone.querySelectorAll('[style]').forEach(el => {
    if (el.closest('.trip-map')) return;
    if (el instanceof HTMLElement) el.removeAttribute('style');
  });
  const mapCard = clone.querySelector('#resumen-mapa');
  if (mapCard) mapCard.insertAdjacentHTML('afterbegin', '<h2>Mapa del viaje</h2>');
  const title = id === 'gastos' ? 'Gastos' : 'Resumen';
  return `<section class="print-section print-${id}"><h1>${title}</h1>${clone.innerHTML}</section>`;
}

function printableDocument(section) {
  const sections = section === 'todo' ? ['gastos', 'resumen'] : [section];
  const body = sections.map(printableSectionHtml).filter(Boolean).join('<div class="page-break"></div>');
  const printClass = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile-print' : 'desktop-print';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gastos de Viaje - ${APP_VERSION}</title><style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1f2937; background: #fff; }
    h1 { margin: 0 0 8px; font-size: 18px; }
    h2 { margin: 8px 0 6px; font-size: 14px; }
    .card, .kpi .box { margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-shadow: none; }
    .kpi { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }
    .small { color: #6b7280; font-size: 10px; }
    .big { font-weight: 700; font-size: 13px; }
    .table-wrap { overflow: visible; }
    table { width: 100%; min-width: 0; margin-top: 4px; border-collapse: collapse; }
    th, td { padding: 3px 5px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; font-size: 10px; line-height: 1.18; }
    .group-row td { padding: 5px 6px; background: #eef2ff; color: #1e40af; font-weight: 700; }
    .subtotal-row td { padding: 4px 5px; background: #f8fafc; font-weight: 700; }
    .expense-row { break-inside: avoid; page-break-inside: avoid; }
    .chart { max-width: 100%; height: auto; }
    body.desktop-print .chart { width: 60%; max-width: 640px; max-height: 360px; display: block; margin: 4px auto 6px; }
    body.desktop-print .card:has(.chart) { padding: 6px 8px; }
    body.mobile-print .chart { width: 100%; }
    #resumen-cuentas, #resumen-mapa { break-before: page; page-break-before: always; }
    #resumen-mapa, .trip-map, .trip-map-shell, .trip-map-frame { break-inside: avoid; page-break-inside: avoid; }
    .trip-map { min-height: 0; margin-top: 6px; border: 1px solid #dbe3ef; border-radius: 6px; background: #dbeafe; overflow: hidden; }
    .trip-map-shell { position: relative; }
    .map-controls { display: none !important; }
    .trip-map-frame { position: relative; width: 100%; height: 92mm !important; min-height: 0 !important; aspect-ratio: auto !important; overflow: hidden; border-radius: 6px; background: #cfe8f3; }
    .map-tiles, .trip-map-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
    .map-tile { position: absolute; object-fit: cover; max-width: none !important; user-select: none; pointer-events: none; }
    .trip-map-overlay { z-index: 2; pointer-events: none; }
    .map-route { fill: none; stroke: #1d4ed8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; opacity: 0.85; }
    .map-marker circle { fill: #dc2626; stroke: #fff; stroke-width: 3; }
    .map-marker-config circle { fill: #2563eb; }
    .map-marker text { fill: #111827; font-size: 15px; font-weight: 700; paint-order: stroke; stroke: #fff; stroke-width: 4px; stroke-linejoin: round; }
    .map-marker .map-marker-number { fill: #fff; stroke: none; font-size: 9px; text-anchor: middle; font-weight: 800; }
    .map-attribution { position: absolute; left: 6px; bottom: 6px; z-index: 3; padding: 2px 4px; color: #334155; font-size: 9px; text-shadow: 0 1px 2px #fff; }
    .page-break { break-after: page; page-break-after: always; height: 0; }
    @media screen { body { padding: 12px; } }
  </style></head><body class="${printClass}">${body}<script>
    function waitForPrintImages() {
      var images = Array.prototype.slice.call(document.images || []);
      if (!images.length) return Promise.resolve();
      var waits = images.map(function(img) {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise(function(resolve) {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      });
      return Promise.race([
        Promise.all(waits),
        new Promise(function(resolve) { setTimeout(resolve, 3500); })
      ]);
    }
    waitForPrintImages().then(function(){ setTimeout(function(){ window.print(); }, 150); });
  </script></body></html>`;
}

function printSection(section) {
  closePrintDialog();
  const needsResumen = section === 'resumen' || section === 'todo';
  const savedMapState = { ...tripMapState };
  if (needsResumen) tripMapState.printMode = true;
  if (section === 'gastos' || section === 'todo') renderGastosTabla();
  if (needsResumen) renderResumen();
  const html = printableDocument(section);
  if (needsResumen) {
    Object.assign(tripMapState, savedMapState);
    renderResumen();
  }
  const win = window.open('', '_blank');
  if (!win) {
    alert('El navegador ha bloqueado la ventana de impresión. Permite ventanas emergentes para imprimir.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
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
    if (field.type === 'multiselect') {
      const selected = new Set((field.value || []).map(String));
      const fieldOptions = field.routeList
        ? (field.value || [])
          .map(value => (field.options || []).find(option => String(option.value) === String(value)))
          .filter(Boolean)
        : (field.options || []);
      const options = fieldOptions.map(option => `<option value="${escapeHtml(option.value)}"${field.routeList ? '' : (selected.has(String(option.value)) ? ' selected' : '')}${option.parentId != null ? ` data-parent-id="${escapeHtml(option.parentId)}"` : ''}>${escapeHtml(option.label)}</option>`).join('');
      const controls = field.reorder
        ? `<div class="multi-select-order-actions"><button class="btn ghost" type="button" data-form-move="${escapeHtml(field.name)}" data-form-dir="-1">Subir</button><button class="btn ghost" type="button" data-form-move="${escapeHtml(field.name)}" data-form-dir="1">Bajar</button><button class="btn ghost" type="button" data-form-remove="${escapeHtml(field.name)}" title="Quitar de este viaje">X</button><button class="btn ghost" type="button" data-form-reset="${escapeHtml(field.name)}">Restablecer</button>${field.routeTripId ? `<button class="btn ghost" type="button" data-form-route="${escapeHtml(field.routeTripId)}">Añadir / modificar</button>` : ''}</div>`
        : '';
      return `<div class="form-field form-field-${escapeHtml(field.name)} form-field-multiselect"><label>${escapeHtml(field.label)}</label><select id="form-field-${escapeHtml(field.name)}" multiple size="${field.size || 4}">${options}</select>${controls}</div>`;
    }
    if (field.type === 'select') {
      const selected = String(field.value ?? '');
      const placeholder = field.placeholder ? `<option value="">${escapeHtml(field.placeholder)}</option>` : '';
      const options = (field.options || []).map(option => `<option value="${escapeHtml(option.value)}"${selected === String(option.value) ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
      return `<div class="form-field form-field-${escapeHtml(field.name)} form-field-select"><label>${escapeHtml(field.label)}</label><select id="form-field-${escapeHtml(field.name)}">${placeholder}${options}</select></div>`;
    }
    return `<div class="form-field form-field-${escapeHtml(field.name)} form-field-input"><label>${escapeHtml(field.label)}</label><input id="form-field-${escapeHtml(field.name)}" type="${field.type || 'text'}"${step}${min} value="${value}"></div>`;
  }).join('');
  $$('#form-dialog-fields [data-form-move]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      moveSelectedMultiOption(`#form-field-${button.dataset.formMove}`, Number(button.dataset.formDir));
    };
  });
  $$('#form-dialog-fields [data-form-remove]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      removeSelectedMultiOptions(`#form-field-${button.dataset.formRemove}`);
    };
  });
  $$('#form-dialog-fields [data-form-reset]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      if (button.dataset.formReset === 'ciudadIds') resetPlannedCitySelector('#form-field-paisIds', '#form-field-ciudadIds');
    };
  });
  $$('#form-dialog-fields [data-form-route]').forEach(button => {
    button.onclick = async event => {
      event.preventDefault();
      if (!activeFormDialogSubmit) return;
      try {
        const tripId = Number(button.dataset.formRoute);
        await activeFormDialogSubmit(formDialogValues());
        closeFormDialog();
        await loadAll();
        const trip = state.viajes.find(v => Number(v.id) === tripId);
        if (trip) openRouteDialog(trip, { preferConfigured: true, optionMode: 'tripCountries' });
      } catch (err) {
        setMessage('#msg-form-dialog', err.message || String(err), true);
      }
    };
  });
  const formPaisSelect = $('#form-field-paisIds');
  const formCiudadSelect = $('#form-field-ciudadIds');
  if (formPaisSelect && formCiudadSelect) {
    formCiudadSelect.dataset.countryIds = selectedMultiValues('#form-field-paisIds').join(',');
    formPaisSelect.onchange = () => syncPlannedCitySelector('#form-field-paisIds', '#form-field-ciudadIds');
  }
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
  $$('#form-dialog-fields select').forEach(select => {
    values[select.id.replace('form-field-', '')] = select.multiple
      ? (select.id === 'form-field-ciudadIds'
        ? [...select.options].map(option => Number(option.value)).filter(Boolean)
        : [...select.selectedOptions].map(option => Number(option.value)).filter(Boolean))
      : select.value;
  });
  return values;
}

async function resetDataValue(option) {
  const value = String(option || '').trim().toLowerCase();
  const map = {
    todo: ['cuentas', 'categorias', 'lugares', 'gastos', 'viajes', 'monedas', 'transferencias'],
    categorias: ['categorias'],
    lugares: ['lugares'],
    monedas: ['monedas'],
    cuentas: ['cuentas'],
    viajes: ['viajes'],
    gastos: ['gastos'],
    transferencias: ['transferencias']
  };
  const stores = map[value];
  if (!stores) {
    alert('Opción no reconocida. Usa: todo, categorías, monedas, cuentas, viajes, gastos o transferencias.');
    return;
  }
  if (!confirm(`Se borrará: ${value}. ¿Continuar?`)) return;
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
    setSelectedTrips([]);
    await loadAll();
    alert('Reset completado');
  } catch (err) {
    alert(`No se pudo resetear: ${err.message || err}`);
  }
}

async function resetDataPrompt() {
  openFormDialog({
    title: 'Resetear datos',
    fields: [{ name: 'opcion', label: 'Escribe: todo, categorías, monedas, cuentas, viajes, gastos o transferencias', value: 'todo' }],
    onSubmit: values => resetDataValue(values.opcion)
  });
}

async function handleGastoAction(id, action) {
  const gasto = state.gastos.find(item => item.id === Number(id));
  if (!gasto) return;
  if (action === 'edit') {
    openEditGasto(gasto);
  } else if (action === 'dup') {
    await addGasto({ ...gasto, id: undefined, desc: `${gasto.desc || ''}`.trim(), fecha: gasto.fecha || todayIso() });
    await loadAll();
  } else if (action === 'del' && confirm('Eliminar este gasto?')) {
    await delGasto(gasto.id);
    await loadAll();
  }
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
  $('#btn-open-add-gasto').onclick = openAddGasto;
  $('#btn-open-add-gasto-bottom').onclick = openAddGasto;
  $('#btn-open-filters').onclick = openFiltersPanel;
  $('#filters-close').onclick = closeFiltersPanel;
  $('#add-gasto-close').onclick = closeAddGasto;
  $('#add-gasto-cancel').onclick = closeAddGasto;
  $('#add-gasto-form').onsubmit = event => {
    event.preventDefault();
    $('#btn-add-gasto').click();
  };
  const savedExpenseView = localStorage.getItem(EXPENSE_VIEW_KEY) || 'table';
  $('#f-view').value = savedExpenseView;
  $('#f-view-mobile').value = savedExpenseView;
  $('#f-view').onchange = () => {
    setExpenseViewMode($('#f-view').value);
  };
  $('#f-view-mobile').onchange = () => {
    setExpenseViewMode($('#f-view-mobile').value);
  };
  $('#g-cat').onchange = renderSubcategories;
  $('#edit-gasto-cat').onchange = renderEditSubcategories;
  $('#g-pais').onchange = renderCiudades;
  $('#edit-gasto-pais').onchange = renderEditCiudades;
  $('#edit-gasto-cuenta').onchange = () => {
    const account = state.cuentas.find(c => c.id === Number($('#edit-gasto-cuenta').value));
    if (account) $('#edit-gasto-moneda').value = account.moneda;
  };
  $('#edit-gasto-viaje').onchange = () => {
    renderEditGastoAccountSelector();
    renderEditCiudades();
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
  $('#route-dialog-close').onclick = closeRouteDialog;
  $('#route-dialog-cancel').onclick = closeRouteDialog;
  $('#route-dialog-form').onsubmit = async event => {
    event.preventDefault();
    try {
      await saveRouteDialog();
    } catch (err) {
      setMessage('#msg-route-dialog', err.message || String(err), true);
    }
  };
  $('#edit-gasto-form').onsubmit = async event => {
    event.preventDefault();
    try {
      const id = Number($('#edit-gasto-id').value);
      const cuentaId = $('#edit-gasto-cuenta').value;
      const catId = $('#edit-gasto-cat').value;
      const rawImporte = numberValue($('#edit-gasto-importe').value);
      const importe = $('#edit-gasto-tipo')?.value === 'ingreso' ? -Math.abs(rawImporte) : Math.abs(rawImporte);
      if (!cuentaId || !catId || importe === 0) throw new Error('Completa cuenta, categoría e importe');
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
        paisId: $('#edit-gasto-pais').value || null,
        ciudadId: $('#edit-gasto-ciudad').value || null,
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
  $('#g-viaje').onchange = () => {
    renderGastoAccountSelector();
    applyDefaultTripCountryToExpense();
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
  ['#f-moneda', '#f-cuenta', '#f-subcat', '#f-ciudad', '#f-desde', '#f-hasta'].forEach(sel => $(sel).onchange = renderGastosTabla);
  $('#f-cat').onchange = () => {
    renderFilterSubcategories();
    renderGastosTabla();
  };
  $('#f-pais').onchange = () => {
    renderFilterCiudades();
    renderGastosTabla();
  };
  $('#f-desc').oninput = renderGastosTabla;
  $('#f-viaje').onchange = () => {
    setSelectedTrips($('#f-viaje').value ? [Number($('#f-viaje').value)] : []);
    renderFilterAccountSelector();
    renderFilterPaises();
    renderViajesHome();
    renderGastosTabla();
    renderCuentas();
    renderTransferAccountSelectors();
    renderBackupStatus();
    renderResumen();
  };
  ['#r-moneda', '#r-cuenta', '#r-ciudad', '#r-desglose'].forEach(sel => $(sel).onchange = renderResumen);
  $('#r-pais').onchange = () => {
    renderResumenCiudades();
    renderResumen();
  };
  $('#map-pais').onchange = () => {
    tripMapState.showPlanned = true;
    resetTripMapView();
    renderTripMap();
  };
  $('#r-viaje').onchange = () => {
    setSelectedTrips($('#r-viaje').value ? [Number($('#r-viaje').value)] : []);
    tripMapState.showPlanned = true;
    resetTripMapView();
    renderResumenAccountSelector();
    renderResumenPaises();
    renderMapPaises();
    renderViajesHome();
    renderGastosTabla();
    renderCuentas();
    renderTransferAccountSelectors();
    renderBackupStatus();
    renderResumen();
  };
  $('#c-viaje').onchange = () => {
    if ($('#c-template')) $('#c-template').value = '';
    renderAccountTemplateSelector();
    renderCuentas();
  };
  if ($('#c-template')) $('#c-template').onchange = applyAccountTemplate;

  async function saveNewGasto(keepOpen = false) {
    try {
      const fecha = $('#g-fecha').value || todayIso();
      const cuentaId = $('#g-cuenta').value;
      const moneda = $('#g-moneda').value;
      const catId = $('#g-cat').value;
      const rawImporte = numberValue($('#g-importe').value);
      const importe = $('#g-tipo')?.value === 'ingreso' ? -Math.abs(rawImporte) : Math.abs(rawImporte);
      if (!cuentaId || !catId || importe === 0) throw new Error('Completa cuenta, categoría e importe');
      const ticket = await readFileData($('#g-ticket'));
      await addGasto({
        fecha,
        viajeId: $('#g-viaje').value || null,
        cuentaId,
        moneda,
        catId,
        subcatId: $('#g-subcat').value || null,
        paisId: $('#g-pais').value || null,
        ciudadId: $('#g-ciudad').value || null,
        importe,
        desc: $('#g-desc').value.trim(),
        ticketName: ticket ? ticket.name : '',
        ticketType: ticket ? ticket.type : '',
        ticketData: ticket ? ticket.data : ''
      });
      $('#g-importe').value = '';
      $('#g-desc').value = '';
      $('#g-ticket').value = '';
      setMessage('#msg-gasto', keepOpen ? 'Gasto añadido. Puedes seguir.' : 'Gasto añadido');
      if (!keepOpen) closeAddGasto();
      await loadAll();
      if (keepOpen && $('#g-importe')) $('#g-importe').focus();
    } catch (err) {
      setMessage('#msg-gasto', err.message || String(err), true);
    }
  }

  $('#btn-add-gasto').onclick = () => saveNewGasto(false);
  $('#btn-add-gasto-continue').onclick = () => saveNewGasto(true);

  $('#btn-add-cuenta').onclick = async () => {
    try {
      const viajeId = $('#c-viaje').value || null;
      const templateId = Number($('#c-template') ? $('#c-template').value : 0);
      const template = viajeId ? state.cuentas.find(c => Number(c.id) === templateId && !c.viajeId) : null;
      const nombre = $('#c-nombre').value.trim() || (template ? template.nombre : '');
      if (!nombre) throw new Error('Pon un nombre');
      const moneda = template && !$('#c-moneda').value ? template.moneda : $('#c-moneda').value;
      if (!hasValidCurrency(moneda)) throw new Error('Configura esa moneda antes de crear la cuenta');
      const nextKey = accountKey({ nombre, moneda });
      const exists = state.cuentas.some(c =>
        (viajeId ? Number(c.viajeId) === Number(viajeId) : !c.viajeId)
        && accountKey(c) === nextKey
      );
      if (exists) throw new Error(viajeId ? 'Esa cuenta ya existe en este viaje' : 'Esa plantilla global ya existe');
      await addCuenta({
        nombre,
        moneda,
        viajeId,
        saldoInicial: $('#c-saldo').value,
        presupuesto: $('#c-presu').value,
        nota: $('#c-nota').value.trim()
      });
      ['#c-nombre', '#c-template', '#c-saldo', '#c-presu', '#c-nota'].forEach(sel => { if ($(sel)) $(sel).value = ''; });
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
        importeTo: $('#t-importe-to') ? $('#t-importe-to').value : '',
        nota: $('#t-nota').value
      });
      ['#t-importe', '#t-importe-to', '#t-cambio', '#t-nota'].forEach(sel => { if ($(sel)) $(sel).value = ''; });
      if (!$('#t-fecha').value) $('#t-fecha').value = todayIso();
      setMessage('#msg-transfer', 'Transferencia anadida');
      await loadAll();
    } catch (err) {
      setMessage('#msg-transfer', err.message || String(err), true);
    }
  };

  ['#t-from', '#t-to'].forEach(sel => {
    if ($(sel)) $(sel).onchange = updateTransferRatePreview;
  });
  ['#t-importe', '#t-importe-to'].forEach(sel => {
    if ($(sel)) $(sel).oninput = updateTransferRatePreview;
  });

  $('#btn-add-viaje').onclick = async () => {
    try {
      const nombre = $('#v-nombre').value.trim();
      const fechaInicio = $('#v-inicio').value;
      const fechaFin = $('#v-fin').value;
      if (!nombre || !fechaInicio || !fechaFin) throw new Error('Completa nombre, inicio y final');
      if (fechaFin < fechaInicio) throw new Error('La fecha final no puede ser anterior al inicio');
      const paisIds = selectedMultiValues('#v-paises');
      if (!paisIds.length) throw new Error('Selecciona al menos un país');
      await addViaje({ nombre, fechaInicio, fechaFin, presupuesto: $('#v-presu').value, paisIds, ciudadIds: allMultiValues('#v-ciudades') });
      ['#v-nombre', '#v-inicio', '#v-fin', '#v-presu'].forEach(sel => $(sel).value = '');
      if ($('#v-paises')) [...$('#v-paises').options].forEach(opt => { opt.selected = false; });
      if ($('#v-ciudades')) [...$('#v-ciudades').options].forEach(opt => { opt.selected = false; });
      setMessage('#msg-viaje', 'Viaje anadido');
      await loadAll();
    } catch (err) {
      setMessage('#msg-viaje', err.message || String(err), true);
    }
  };

  $('#v-inicio').onchange = () => {
    const start = $('#v-inicio').value;
    if (start && (!$('#v-fin').value || $('#v-fin').value < start)) $('#v-fin').value = start;
  };
  $('#v-paises').onchange = renderTripPlannedCitySelector;
  $('#v-ciudades').onchange = updateTripPlanningCounters;
  if ($('#v-ciudades-up')) $('#v-ciudades-up').onclick = event => {
    event.preventDefault();
    moveSelectedMultiOption('#v-ciudades', -1);
  };
  if ($('#v-ciudades-down')) $('#v-ciudades-down').onclick = event => {
    event.preventDefault();
    moveSelectedMultiOption('#v-ciudades', 1);
  };
  if ($('#v-ciudades-remove')) $('#v-ciudades-remove').onclick = event => {
    event.preventDefault();
    removeSelectedMultiOptions('#v-ciudades');
  };
  if ($('#v-ciudades-reset')) $('#v-ciudades-reset').onclick = event => {
    event.preventDefault();
    resetPlannedCitySelector('#v-paises', '#v-ciudades');
  };

  $('#m-iso-entry').oninput = () => {
    const code = currentCurrencyCodeInput();
    $('#m-iso-entry').value = code;
    maybeFillCurrencyName(code);
    clearCurrencyQuote();
    renderCurrencyCodeSuggestions(true);
  };
  $('#m-iso-entry').onfocus = () => renderCurrencyCodeSuggestions(true);
  $('#m-iso-entry').onkeydown = event => {
    if (event.key === 'Escape') hideCurrencySuggestions();
  };

  $('#btn-check-moneda').onclick = async () => {
    const button = $('#btn-check-moneda');
    try {
      clearCurrencyQuote();
      const code = currentCurrencyCodeInput();
      setMessage('#msg-moneda-rate', 'Consultando cambio actual...');
      button.disabled = true;
      latestCurrencyQuote = await fetchCurrentCurrencyQuote(code);
      $('#btn-use-moneda-rate').hidden = false;
      setMessage('#msg-moneda-rate', `Referencia Frankfurter ${latestCurrencyQuote.fecha}: 1 EUR ≈ ${formatRate(latestCurrencyQuote.unidadesPorEuro)} ${latestCurrencyQuote.codigo}. No se aplica automáticamente.`);
    } catch (err) {
      setMessage('#msg-moneda-rate', err.message || String(err), true);
    } finally {
      button.disabled = false;
    }
  };

  $('#btn-use-moneda-rate').onclick = () => {
    const code = currentCurrencyCodeInput();
    if (!latestCurrencyQuote || latestCurrencyQuote.codigo !== code) {
      setMessage('#msg-moneda-rate', 'Consulta primero el cambio de esta moneda', true);
      return;
    }
    $('#m-back').value = formatRate(latestCurrencyQuote.unidadesPorEuro);
    $('#m-eur').value = formatRate(latestCurrencyQuote.eurPorUnidad);
    setMessage('#msg-moneda-rate', `Cambio copiado al formulario: 1 EUR = ${formatRate(latestCurrencyQuote.unidadesPorEuro)} ${latestCurrencyQuote.codigo}`);
  };

  $('#btn-add-moneda').onclick = async () => {
    try {
      await upsertMoneda({
        codigo: currentCurrencyCodeInput(),
        nombre: $('#m-nombre').value,
        eurPorUnidad: $('#m-eur').value,
        unidadesPorEuro: $('#m-back').value
      });
      ['#m-iso-entry', '#m-nombre', '#m-eur', '#m-back'].forEach(sel => $(sel).value = '');
      clearCurrencyQuote();
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
      setMessage('#msg-cat', 'Categoría guardada');
      await loadAll();
    } catch (err) {
      setMessage('#msg-cat', err.message || String(err), true);
    }
  };

  $('#btn-add-lugar').onclick = async () => {
    try {
      const nombre = $('#lugar-nombre').value.trim();
      if (!nombre) throw new Error('Escribe un nombre');
      await addLugar({
        nombre,
        parentId: $('#lugar-parent').value || null,
        lat: $('#lugar-lat').value,
        lng: $('#lugar-lng').value
      });
      $('#lugar-nombre').value = '';
      $('#lugar-parent').value = '';
      $('#lugar-lat').value = '';
      $('#lugar-lng').value = '';
      setMessage('#msg-lugar', 'Lugar guardado');
      await loadAll();
    } catch (err) {
      setMessage('#msg-lugar', err.message || String(err), true);
    }
  };
  $('#btn-locate-lugar').onclick = async () => {
    try {
      await locateLugarForm();
      setMessage('#msg-lugar', 'Coordenadas encontradas');
    } catch (err) {
      setMessage('#msg-lugar', err.message || String(err), true);
    }
  };

  $('#f-clear').onclick = clearExpenseFilters;
  $('#f-clear-mobile').onclick = clearExpenseFilters;
  $('#btn-reset').onclick = resetDataPrompt;

  document.addEventListener('change', async event => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.tripCheck) {
      toggleSelectedTrip(target.dataset.tripCheck, target.checked);
      renderViajesHome();
      renderFilterAccountSelector();
      renderResumenAccountSelector();
      renderFilterPaises();
      renderResumenPaises();
      renderMapPaises();
      renderGastosTabla();
      renderCuentas();
      renderResumen();
      return;
    }
    if (target instanceof HTMLInputElement && target.dataset.tripYear) {
      setSelectedYear(target.dataset.tripYear, target.checked);
      renderViajesHome();
      renderFilterAccountSelector();
      renderResumenAccountSelector();
      renderFilterPaises();
      renderResumenPaises();
      renderMapPaises();
      renderGastosTabla();
      renderCuentas();
      renderResumen();
      return;
    }
    if (!(target instanceof HTMLSelectElement) || !target.dataset.gastoAction || !target.value) return;
    try {
      const action = target.value;
      target.value = '';
      await handleGastoAction(target.dataset.gastoAction, action);
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const suggestion = target.closest('[data-currency-code]');
    if (suggestion) {
      selectCurrencySuggestion(suggestion.dataset.currencyCode);
      return;
    }
    if (!target.closest('.currency-code-field')) hideCurrencySuggestions();
  });

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target instanceof HTMLSelectElement && target.dataset.routeCity) {
      const index = Number(target.dataset.routeCity);
      routeEditorState.cityIds[index] = Number(target.value);
      return;
    }
    if (target instanceof HTMLInputElement && target.dataset.routePosition) {
      const index = Number(target.dataset.routePosition);
      const next = Math.max(1, Math.min(routeEditorState.cityIds.length, Number(target.value || 1))) - 1;
      moveRouteStop(index, next);
      renderRouteDialog();
    }
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const deleteButton = target.closest('[data-route-delete]');
    if (deleteButton) {
      routeEditorState.cityIds.splice(Number(deleteButton.dataset.routeDelete), 1);
      renderRouteDialog();
      return;
    }
    const addButton = target.closest('[data-route-add]');
    if (addButton) {
      const select = $('#route-add-city');
      const cityId = Number(select ? select.value : 0);
      if (!cityId) {
        setMessage('#msg-route-dialog', 'Elige una ciudad para añadirla a la ruta', true);
        return;
      }
      routeEditorState.cityIds.push(cityId);
      setMessage('#msg-route-dialog', '');
      renderRouteDialog();
      return;
    }
    const upButton = target.closest('[data-route-up]');
    if (upButton) {
      const index = Number(upButton.dataset.routeUp);
      moveRouteStop(index, index - 1);
      renderRouteDialog();
      return;
    }
    const downButton = target.closest('[data-route-down]');
    if (downButton) {
      const index = Number(downButton.dataset.routeDown);
      moveRouteStop(index, index + 1);
      renderRouteDialog();
    }
  });

  document.addEventListener('dragstart', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest('[data-route-row]');
    if (!row) return;
    routeEditorState.dragIndex = Number(row.dataset.routeRow);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(routeEditorState.dragIndex));
    }
  });

  document.addEventListener('dragover', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('[data-route-row]')) event.preventDefault();
  });

  document.addEventListener('drop', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest('[data-route-row]');
    if (!row) return;
    event.preventDefault();
    const from = routeEditorState.dragIndex;
    const to = Number(row.dataset.routeRow);
    if (from == null) return;
    moveRouteStop(from, to);
    routeEditorState.dragIndex = null;
    renderRouteDialog();
  });

  document.addEventListener('pointerdown', startTripMapDrag);
  document.addEventListener('pointermove', moveTripMapDrag);
  document.addEventListener('pointerup', endTripMapDrag);
  document.addEventListener('pointercancel', endTripMapDrag);
  document.addEventListener('dblclick', zoomTripMapAt);

  document.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    try {
      const localBackupButton = target.closest('[data-download-local-backup]');
      if (localBackupButton) {
        await downloadStoredLocalBackup(localBackupButton.dataset.downloadLocalBackup);
        return;
      }
      const mapZoomButton = target.closest('[data-map-zoom]');
      if (mapZoomButton) {
        const action = mapZoomButton.dataset.mapZoom;
        const { width, height } = tripMapSize();
        if (action === 'in') {
          zoomTripMapAtPoint(width / 2, height / 2, 1);
        } else if (action === 'out') {
          zoomTripMapAtPoint(width / 2, height / 2, -1);
        } else {
          resetTripMapView();
          renderTripMap();
        }
        return;
      }
      const mapGeocodeButton = target.closest('[data-map-geocode]');
      if (mapGeocodeButton) {
        await geocodeTripMapCities();
        return;
      }
      const mapAddStopButton = target.closest('[data-map-add-stop]');
      if (mapAddStopButton) {
        await addMapStopToTrip();
        return;
      }
      const mapRefreshButton = target.closest('[data-map-refresh]');
      if (mapRefreshButton) {
        await refreshTripMapFromConfig();
        return;
      }
      const mapPlannedButton = target.closest('[data-map-planned]');
      if (mapPlannedButton) {
        tripMapState.showPlanned = !tripMapState.showPlanned;
        resetTripMapView();
        renderTripMap();
        return;
      }
      if (target.dataset.openTicket) {
        openTicket(target.dataset.openTicket);
        return;
      } else if (target.dataset.delCuenta) {
        if (confirm('Eliminar esta cuenta?')) await delCuenta(target.dataset.delCuenta);
      } else if (target.dataset.migrateCuenta) {
        const trip = state.viajes.find(v => v.id === Number(target.dataset.migrateViaje));
        if (!trip) return;
        if (confirm(`Pasar esta cuenta global a cuenta específica de ${trip.nombre}? Los gastos de ese viaje se moverán a la nueva cuenta.`)) {
          await migrateGlobalAccountToTrip(target.dataset.migrateCuenta, target.dataset.migrateViaje);
        }
      } else if (target.dataset.editCuenta) {
        const c = state.cuentas.find(item => item.id === Number(target.dataset.editCuenta));
        if (!c) return;
        openFormDialog({
          title: 'Editar cuenta',
          fields: [
            { name: 'nombre', label: 'Nombre', value: c.nombre },
            { name: 'presupuesto', label: 'Presupuesto', type: 'number', step: '0.01', value: c.presupuesto || 0 },
            { name: 'saldoActual', label: 'Saldo actual', type: 'number', step: '0.01', value: numberValue(c.saldoActual) }
          ],
          onSubmit: values => {
            return updateCuenta(c.id, { nombre: values.nombre.trim() || c.nombre, presupuesto: numberValue(values.presupuesto), saldoActual: numberValue(values.saldoActual) });
          }
        });
        return;
      } else if (target.dataset.delViaje) {
        if (confirm('Eliminar este viaje? Los gastos se conservarán sin viaje.')) await delViaje(target.dataset.delViaje);
      } else if (target.dataset.editViaje) {
        const v = state.viajes.find(item => item.id === Number(target.dataset.editViaje));
        if (!v) return;
        openFormDialog({
          title: 'Editar viaje',
          fields: [
            { name: 'nombre', label: 'Nombre', value: v.nombre },
            { name: 'fechaInicio', label: 'Fecha de inicio', type: 'date', value: v.fechaInicio },
            { name: 'fechaFin', label: 'Fecha final', type: 'date', value: v.fechaFin },
            { name: 'paisIds', label: 'Países creados', type: 'multiselect', value: tripCountryIds(v), options: state.lugares.filter(l => !l.parentId).map(l => ({ value: String(l.id), label: l.nombre })) },
            { name: 'ciudadIds', label: 'Ciudades planificadas', type: 'multiselect', size: 6, value: tripCityIds(v), options: plannedCityOptionsForCountries(tripCountryIds(v), tripCityIds(v)), reorder: true, routeList: true, routeTripId: v.id },
            { name: 'presupuesto', label: 'Presupuesto del viaje (EUR)', type: 'number', step: '0.01', min: '0', value: v.presupuesto || 0 }
          ],
          onSubmit: values => {
            if (values.fechaFin < values.fechaInicio) throw new Error('La fecha final no puede ser anterior al inicio');
            if (!(values.paisIds || []).length) throw new Error('Selecciona al menos un país');
            return updateViaje(v.id, { nombre: values.nombre.trim() || v.nombre, fechaInicio: values.fechaInicio, fechaFin: values.fechaFin, paisIds: values.paisIds || [], ciudadIds: values.ciudadIds || [], presupuesto: numberValue(values.presupuesto) });
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
            { name: 'codigo', label: 'Código', value: m.codigo },
            { name: 'nombre', label: 'Nombre', value: m.nombre || '' },
            { name: 'eurPorUnidad', label: '1 moneda equivale a EUR', type: 'number', step: '0.000001', min: '0', value: m.eurPorUnidad },
            { name: 'unidadesPorEuro', label: '1 EUR equivale a moneda', type: 'number', step: '0.000001', min: '0', value: m.unidadesPorEuro }
          ],
          onSubmit: values => updateMonedaWithCode(m.codigo, values)
        });
        return;
      } else if (target.dataset.delCat) {
        if (confirm('¿Eliminar esta categoría?')) await delCategoria(target.dataset.delCat);
      } else if (target.dataset.editCat) {
        const c = state.categorias.find(item => item.id === Number(target.dataset.editCat));
        if (!c) return;
        openFormDialog({
          title: 'Editar categoría',
          fields: [{ name: 'nombre', label: 'Nombre', value: c.nombre }],
          onSubmit: values => updateCategoria(c.id, { nombre: values.nombre.trim() || c.nombre })
        });
        return;
      } else if (target.dataset.delLugar) {
        if (confirm('Eliminar este lugar?')) await delLugar(target.dataset.delLugar);
      } else if (target.dataset.locateLugar) {
        await locateLugarById(target.dataset.locateLugar);
        await loadAll();
        setMessage('#msg-lugar', 'Lugar localizado');
        resetTripMapView();
        renderTripMap();
        return;
      } else if (target.dataset.editLugar) {
        const l = state.lugares.find(item => item.id === Number(target.dataset.editLugar));
        if (!l) return;
        openFormDialog({
          title: 'Editar lugar',
          fields: [
            { name: 'nombre', label: 'Nombre', value: l.nombre },
            { name: 'lat', label: 'Latitud', type: 'number', step: '0.000001', value: l.lat ?? '' },
            { name: 'lng', label: 'Longitud', type: 'number', step: '0.000001', value: l.lng ?? '' }
          ],
          onSubmit: values => updateLugar(l.id, {
            nombre: values.nombre.trim() || l.nombre,
            lat: optionalNumberValue(values.lat),
            lng: optionalNumberValue(values.lng)
          })
        });
        return;
      } else if (target.dataset.delGasto) {
        await handleGastoAction(target.dataset.delGasto, 'del');
        return;
      } else if (target.dataset.editGasto) {
        await handleGastoAction(target.dataset.editGasto, 'edit');
        return;
      } else if (target.dataset.dupGasto) {
        await handleGastoAction(target.dataset.dupGasto, 'dup');
        return;
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

  $('#btn-export').onclick = () => openBackupDialogSafe();
  $('#backup-close').onclick = closeBackupDialog;
  $('#backup-exit').onclick = closeBackupResultDialog;
  $('#backup-export-scope').onchange = () => {
    syncBackupExportTripVisibility();
  };
  $('#backup-import-mode').onchange = () => {
    const tripImport = $('#backup-import-mode').value === 'trip';
    $('#backup-import-trip').disabled = !tripImport;
    if (!tripImport) $('#backup-import-trip').value = '';
  };
  $('#backup-download').onclick = handleBackupDownload;
  $('#backup-folder-select').onclick = selectBackupDirectory;
  $('#backup-folder-forget').onclick = () => {
    forgetBackupDirectory().catch(error => setMessage('#msg-backup', error.message || String(error), true));
  };
  $('#backup-import').onclick = handleBackupImportClick;
  $('#btn-import').onclick = () => openBackupDialogSafe('import');
  $('#btn-import-home').onclick = () => openBackupDialogSafe('import');
  $('#btn-backup-home').onclick = () => openBackupDialogSafe('backup');
  $('#btn-sync-home').onclick = () => openSyncDialog();
  $('#btn-sync-config').onclick = () => openSyncDialog();
  $('#sync-close').onclick = closeSyncDialog;
  $('#sync-refresh').onclick = refreshSyncComparison;
  $('#sync-key-save').onclick = async () => {
    try {
      await saveChangedSyncKey();
    } catch (error) {
      setSyncMessage(error.message || String(error), true);
    }
  };
  $('#sync-key-toggle').onclick = toggleSyncKeyVisibility;
  $('#sync-key-copy').onclick = async () => {
    try {
      await copySyncKey();
    } catch {
      setSyncMessage('No se pudo copiar la clave. Puedes mostrarla y copiarla manualmente.', true);
    }
  };
  $('#sync-download').onclick = async () => {
    try {
      await performCloudDownload();
    } catch (error) {
      setSyncMessage(error.message || String(error), true);
    }
  };
  $('#sync-upload').onclick = async () => {
    try {
      await performCloudUpload();
    } catch (error) {
      setSyncMessage(error.message || String(error), true);
    }
  };
  $('#btn-export-csv').onclick = exportCurrentCsv;
  $('#btn-print-summary').onclick = openPrintDialog;
  $('#print-dialog-close').onclick = closePrintDialog;
  $('#print-resumen').onclick = () => printSection('resumen');
  $('#print-gastos').onclick = () => printSection('gastos');
  $('#print-todo').onclick = () => printSection('todo');
  $('#file-import').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const mode = $('#backup-import-mode') ? $('#backup-import-mode').value : 'all';
      const ok = confirm(mode === 'trip'
        ? 'Importar reemplazará los gastos y cuentas propias del viaje elegido. ¿Continuar?'
        : 'Importar reemplazará todos los datos locales actuales. Si quieres conservarlos, cancela y exporta primero. ¿Continuar?');
      if (!ok) return;
      const data = JSON.parse(await file.text());
      if (mode === 'trip') await importTripBackup(data, $('#backup-import-trip').value);
      else await importAll(data);
      await loadAll();
      setMessage('#msg-backup', 'Datos importados');
      showBackupResult('Importación realizada', file.name);
    } catch (err) {
      alert(`Archivo no válido: ${err.message || err}`);
    } finally {
      event.target.value = '';
    }
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  ensureSyncKey();
  await withDataTrackingPaused(seedIfEmpty);
  await loadAll();
  ensureLocalDataUpdatedAt();
  await refreshLocalBackupHistory();
  try {
    await createEntryBackup();
  } catch (error) {
    console.warn('No se pudo crear la copia local de entrada', error);
  }
  renderBackupStatus();
  await checkCloudOnEntry();
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
  addLugar,
  updateLugar,
  delLugar,
  upsertMoneda,
  exportAll,
  importAll,
  openBackupDialog,
  openBackupDialogSafe,
  closeBackupDialog,
  handleBackupDownload,
  handleBackupImportClick,
  openSyncDialog
});
