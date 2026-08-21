const DB_NAME = 'gastos_viaje_db';
const DB_VERSION = 10;
const APP_VERSION = '700v278';
const BLOG_TRANSIT_CITY_VALUE = '__transit__';
const ROUTE_STOP_ROLE_DESTINATION = 'destination';
const ROUTE_STOP_ROLE_TRANSIT = 'transit';
const ROUTE_STOP_ROLE_ENDPOINT = 'endpoint';
const DESTINATION_RECORD_MAX_DISTANCE_METERS = 50_000;
const LODGING_NAME_MAX_DISTANCE_METERS = 200;
const LODGING_FUZZY_NAME_MAX_DISTANCE_METERS = 1_500;
const TIMELINE_SUPPLEMENT_MAX_DISTANCE_METERS = 25;
const TIMELINE_SUPPLEMENT_GROUP_DISTANCE_METERS = 50;
const TIMELINE_CITY_VISIT_MAX_DISTANCE_METERS = 3_000;
const BACKUP_KEY = 'gastos_viaje_last_backup';
const EXPENSE_VIEW_KEY = 'gastos_viaje_expense_view';
const BACKUP_HISTORY_KEY = 'gastos_viaje_backup_history';
const DATA_UPDATED_KEY = 'gastos_viaje_data_updated_at';
const FORM_DRAFTS_KEY = 'gastos_viaje_form_drafts_v1';
const FORM_DRAFT_MAX_AGE_DAYS = 30;
const OFFLINE_ENTRY_NOTICE_KEY = 'gastos_viaje_offline_notice_shown';
const LENS_RETURN_TARGET_KEY = 'gastos_viaje_lens_return_target_v1';
const LENS_RETURN_CACHE = 'cuaderno-bitacora-lens-return-v1';
const SYNC_KEY_STORAGE = 'gastos_viaje_sync_key';
const SYNC_STATE_STORAGE = 'gastos_viaje_sync_state_v1';
const BACKUP_DIRECTORY_SETTING_KEY = 'backupDirectory';
const PHOTO_TYPES_SETTING_KEY = 'photoTypes';
const TICKET_OCR_LANGUAGES_SETTING_KEY = 'ticketOcrLanguages';
const TICKET_OCR_LANGUAGE_CACHE = 'cuaderno-bitacora-ocr-languages-v1';
const SYNC_ENDPOINT = '/api/travel-sync';
const LOCAL_BACKUP_LIMIT = 5;
const CLOUD_ATTACHMENT_CHUNK_CHARS = 2_500_000;
const CLOUD_ATTACHMENT_CHECK_BATCH = 75;
const BLOG_IMAGE_TARGET_BYTES = 650 * 1024;
const BLOG_IMAGE_OUTPUT_LIMIT = 1_100_000;
const BLOG_IMAGE_MAX_DIMENSION = 1600;
const DEFAULT_PHOTO_TYPES = [
  { id: 'alojamiento', nombre: 'Alojamiento', useAsDestination: true },
  { id: 'comida', nombre: 'Comida', useAsDestination: false },
  { id: 'paisaje', nombre: 'Paisaje', useAsDestination: false },
  { id: 'ciudad', nombre: 'Ciudad', useAsDestination: false },
  { id: 'retrato', nombre: 'Retrato', useAsDestination: false },
  { id: 'selfie', nombre: 'Selfie', useAsDestination: false }
];
const TICKET_OCR_LANGUAGES = [
  { code: 'spa', name: 'Español', fixed: true },
  { code: 'cat', name: 'Catalán' },
  { code: 'eng', name: 'Inglés' },
  { code: 'fin', name: 'Finés' },
  { code: 'pol', name: 'Polaco' },
  { code: 'fra', name: 'Francés' },
  { code: 'deu', name: 'Alemán' },
  { code: 'ita', name: 'Italiano' },
  { code: 'por', name: 'Portugués' },
  { code: 'nld', name: 'Neerlandés' },
  { code: 'jpn', name: 'Japonés' },
  { code: 'kor', name: 'Coreano' }
];
const TICKET_OCR_COUNTRY_ALIASES = {
  spa: ['espana', 'spain'],
  eng: ['reino unido', 'gran bretana', 'inglaterra', 'escocia', 'gales', 'irlanda', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'ireland', 'estados unidos', 'united states', 'australia', 'nueva zelanda', 'new zealand'],
  fin: ['finlandia', 'finland', 'suomi'],
  pol: ['polonia', 'poland', 'polska'],
  fra: ['francia', 'france'],
  deu: ['alemania', 'germany', 'deutschland', 'austria', 'osterreich'],
  ita: ['italia', 'italy'],
  por: ['portugal', 'brasil', 'brazil'],
  nld: ['paises bajos', 'holanda', 'netherlands', 'holland'],
  jpn: ['japon', 'japan', 'nippon'],
  kor: ['corea', 'corea del sur', 'south korea', 'republic of korea', 'korea']
};
const DIALOG_HELP_TARGETS = {
  'offline-entry-dialog': 'offline',
  'add-gasto-dialog': 'gasto-formulario',
  'edit-gasto-dialog': 'gasto-formulario',
  'image-datetime-dialog': 'gasto-formulario',
  'expense-files-dialog': 'gasto-archivos',
  'image-viewer-dialog': 'traducir-ticket',
  'form-dialog': 'referencia',
  'timeline-dialog': 'mapa-controles',
  'lodging-name-dialog': 'mapa-controles',
  'map-point-dialog': 'mapa-controles',
  'route-dialog': 'ruta-paradas',
  'trip-documents-dialog': 'documentos-viaje',
  'trip-review-dialog': 'revisar-viaje',
  'blog-entry-dialog': 'blog-formulario',
  'blog-location-dialog': 'blog-formulario-punto',
  'expense-blog-replace-dialog': 'gasto-a-blog',
  'shared-images-dialog': 'compartir',
  'blog-pdf-guide-dialog': 'blog-pdf',
  'wordpress-export-dialog': 'wordpress-exportar',
  'print-dialog': 'informe-pdf',
  'backup-dialog': 'backup',
  'sync-dialog': 'sincronizacion',
  'backup-result-dialog': 'backup'
};
const SHARED_FILES_CACHE = 'cuaderno-bitacora-shared-files-v1';
const TRIP_MAP_WIDTH = 920;
const TRIP_MAP_HEIGHT = 460;
const TRIP_MAP_LONG_PRESS_MS = 1400;
const TRIP_MAP_POINT_CITY_REASSIGN_GAIN_METERS = 3000;
const TRIP_MAP_MIN_ZOOM = 2;
const TRIP_MAP_MAX_ZOOM = 20;
let dbPromise = null;
let appNetworkUnavailable = false;
let activeFormDialogSubmit = null;
let hasAppliedDefaultTripSelection = false;
let dataTrackingPaused = 0;
let localBackupHistoryCache = [];
let currentCloudMetadata = null;
let backupDirectorySettingCache;
let activeTripDocumentsId = null;
let activeEditExpenseActionAnchor = null;
let activeEditTicketRecord = null;
const pendingExpenseTicketLocations = { g: null, 'edit-gasto': null };
const pendingExpenseTicketLocationChecks = { g: Promise.resolve(), 'edit-gasto': Promise.resolve() };
const pendingExpenseTicketPreviews = { g: null, 'edit-gasto': null };
const pendingExpenseTicketTranslations = { g: null, 'edit-gasto': null };
const ticketOcrRunIds = { g: 0, 'edit-gasto': 0 };
const pendingExpenseExtraPreviewUrls = { g: [], 'edit-gasto': [] };
let activeImageViewerRecord = null;
let activeImageViewerUrl = '';
let activeImageViewerZoom = 0;
let activeBlogEntryId = null;
let activeBlogEntryAnchor = null;
let activeBlogEntryType = '';
let activeBlogImage = null;
let activeBlogGalleryImages = [];
let activeBlogCameraOriginalFile = null;
let blogManualRouteLocationOpen = false;
let imageLocationModulePromise = null;
let blogSharePdfModulePromise = null;
const imageGpsCache = new WeakMap();
const imageDateTimeCache = new WeakMap();
const imageMetadataPromiseCache = new WeakMap();
let currentImageLocationPromise = null;
let lastCurrentImageLocation = null;
let blogPointLocationRequestToken = 0;
let pendingSharedImagesPayload = null;
let sharedImagePreviewUrls = [];
let pendingLensReturnTarget = null;
let sharedContentAppReady = false;
let pendingSharedLaunchTargets = [];
let sharedLaunchDrainPromise = Promise.resolve();
let sharedContentRecoveryGeneration = 0;
const consumedSharedContentIds = new Set();
const sharedContentConsumptionPromises = new Map();
let activeContextHelpTrigger = null;
const tripMapPhotoLookup = new Map();
const tripMapMarkerDetailLookup = new Map();
let tripVectorMap = null;
let tripVectorMarkers = [];
let tripVectorPhotoMarkers = [];
let tripVectorMapFailed = false;
let activeTimelineTripId = null;
let timelineBulkRoutingActive = false;
let timelineBulkRoutingCancelled = false;
let activeLodgingEditContext = null;
let activeMapPointContext = null;
let tripMapLongPressCleanup = null;
let openBlogDays = new Set();
let openBlogDaysScope = '';
let pendingBlogPdfDay = '';
let openExpenseGroups = new Set();
let openExpenseGroupsScope = '';
let backupCloudUploadInProgress = false;
let blogFilterTripId = null;
const blogPointPickerState = {
  centerLat: 40.4168,
  centerLng: -3.7038,
  zoom: 15
};
const blogPointMapGesture = {
  pointers: new Map(),
  frame: null,
  dragging: false,
  pinching: false,
  startX: 0,
  startY: 0,
  lastDx: 0,
  lastDy: 0,
  startDistance: 0,
  scale: 1,
  centerX: 0,
  centerY: 0,
  ignoreClickUntil: 0
};
const routeEditorState = {
  tripId: null,
  stops: [],
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
  showPhotos: true,
  showTimeline: true,
  timelineRouteView: 'original',
  timelineRoutingMode: 'automatic',
  showSatellite: false,
  destinationOnly: false,
  day: '',
  cityId: 0,
  printMode: false,
  vectorCenter: null,
  vectorZoom: null,
  photoEditKey: '',
  preserveViewportOnNextRender: false
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
  startDistance: 0,
  scale: 1,
  centerX: 0,
  centerY: 0
};

function resetTripMapView() {
  tripMapState.key = '';
  tripMapState.zoomDelta = 0;
  tripMapState.panX = 0;
  tripMapState.panY = 0;
  tripMapState.vectorCenter = null;
  tripMapState.vectorZoom = null;
  tripMapState.preserveViewportOnNextRender = false;
}

function tripMapSize() {
  if (tripMapState.printMode) {
    return {
      width: TRIP_MAP_WIDTH,
      height: TRIP_MAP_HEIGHT
    };
  }
  const container = typeof document !== 'undefined' ? $('#trip-map') : null;
  const fullscreen = Boolean(container && (
    (document.fullscreenElement && document.fullscreenElement === container)
    || container.classList.contains('map-fullscreen-fallback')
  ));
  if (fullscreen && typeof window !== 'undefined') {
    const viewportWidth = Math.max(1, window.innerWidth || TRIP_MAP_WIDTH);
    const viewportHeight = Math.max(1, window.innerHeight || TRIP_MAP_HEIGHT);
    const controlsAllowance = viewportWidth <= 720 ? 126 : 58;
    return {
      width: TRIP_MAP_WIDTH,
      height: Math.max(TRIP_MAP_HEIGHT, Math.round(TRIP_MAP_WIDTH * Math.max(240, viewportHeight - controlsAllowance) / viewportWidth))
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
      if (!db.objectStoreNames.contains('tripDocuments')) {
        const s = db.createObjectStore('tripDocuments', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byViaje', 'viajeId');
      }
      if (!db.objectStoreNames.contains('blogEntries')) {
        const s = db.createObjectStore('blogEntries', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byViaje', 'viajeId');
        s.createIndex('bySourceGasto', 'sourceGastoId', { unique: false });
      }
      if (!db.objectStoreNames.contains('timelineDays')) {
        const s = db.createObjectStore('timelineDays', { keyPath: 'id' });
        s.createIndex('byViaje', 'viajeId');
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

function setDialogHelpTarget(dialogId, target) {
  const button = $(`#${dialogId} .dialog-help`);
  if (button) button.dataset.helpTarget = target || 'referencia';
}

function closeContextHelp() {
  const dialog = $('#context-help-dialog');
  if (!dialog) return;
  if (dialog.open && dialog.close) dialog.close();
  else {
    dialog.removeAttribute('open');
    restoreContextHelpFocus();
  }
}

function restoreContextHelpFocus() {
  const frame = $('#context-help-frame');
  if (frame) frame.src = 'about:blank';
  const trigger = activeContextHelpTrigger;
  activeContextHelpTrigger = null;
  if (trigger && trigger.isConnected) {
    try {
      trigger.focus({ preventScroll: true });
    } catch (_) {
      trigger.focus();
    }
  }
}

function openHelpDialog(src, title, trigger) {
  const dialog = $('#context-help-dialog');
  const frame = $('#context-help-frame');
  if (!dialog || !frame) return;
  activeContextHelpTrigger = trigger || document.activeElement;
  const heading = $('#context-help-title');
  if (heading) heading.textContent = title;
  frame.title = title;
  frame.src = src;
  if (dialog.open) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function openContextHelp(target, trigger) {
  openHelpDialog(
    `ayuda.html?embedded=1&target=${encodeURIComponent(target || 'referencia')}`,
    'Ayuda de esta pantalla',
    trigger
  );
}

function openAppHelp(trigger) {
  openHelpDialog('ayuda.html?embedded=app', 'Ayuda', trigger);
}

function installDialogHelpLinks() {
  $$('dialog.modal').forEach(dialog => {
    if (dialog.id === 'context-help-dialog' || dialog.dataset.contextHelp === 'false') return;
    const target = DIALOG_HELP_TARGETS[dialog.id] || 'referencia';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dialog-help';
    button.dataset.helpTarget = target;
    button.textContent = 'i';
    button.title = 'Abrir ayuda de esta pantalla';
    button.setAttribute('aria-label', 'Abrir ayuda de esta pantalla');
    button.onclick = () => openContextHelp(button.dataset.helpTarget, button);
    const head = dialog.querySelector('.modal-head');
    if (head) {
      const closeButton = head.querySelector('.icon-btn');
      head.insertBefore(button, closeButton || null);
    } else {
      button.classList.add('dialog-help-floating');
      const form = dialog.querySelector('form');
      if (form) form.prepend(button);
    }
  });
  $$('a.help-link').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      openAppHelp(link);
    });
  });
}

const ADD_EXPENSE_DRAFT_FIELDS = [
  '#g-fecha', '#g-hora', '#g-viaje', '#g-cuenta', '#g-moneda',
  '#g-cat', '#g-subcat', '#g-pais', '#g-ciudad', '#g-importe',
  '#g-tipo', '#g-desc', '#g-ticket-type', '#g-extra-images-map'
];
const BLOG_ENTRY_DRAFT_FIELDS = [
  '#blog-fecha', '#blog-hora', '#blog-tipo', '#blog-pais', '#blog-ciudad',
  '#blog-descripcion', '#blog-wordpress', '#blog-featured', '#blog-en-route', '#blog-texto',
  '#blog-point-notes', '#blog-point-transport-walk', '#blog-point-transport-car',
  '#blog-point-transport-train', '#blog-point-transport-bus', '#blog-point-transport-plane',
  '#blog-point-lat', '#blog-point-lng', '#blog-images-map'
];
const INLINE_FORM_DRAFTS = [
  {
    key: 'config-lugar',
    fields: ['#lugar-nombre', '#lugar-parent', '#lugar-lat', '#lugar-lng'],
    message: '#msg-lugar'
  },
  {
    key: 'config-viaje',
    fields: ['#v-nombre', '#v-inicio', '#v-fin', '#v-presu', '#v-paises', '#v-ciudades'],
    message: '#msg-viaje',
    restore: restoreTripConfigDraft
  },
  {
    key: 'config-moneda',
    fields: ['#m-iso-entry', '#m-nombre', '#m-eur', '#m-back'],
    message: '#msg-moneda'
  },
  {
    key: 'config-cuenta',
    fields: ['#c-nombre', '#c-template', '#c-moneda', '#c-viaje', '#c-tipo', '#c-saldo', '#c-nota'],
    message: '#msg-cuenta'
  },
  {
    key: 'config-transferencia',
    fields: ['#t-fecha', '#t-from', '#t-to', '#t-importe', '#t-importe-to', '#t-nota'],
    message: '#msg-transfer'
  },
  {
    key: 'config-categoria',
    fields: ['#cat-nombre', '#cat-parent'],
    message: '#msg-cat'
  }
];

let restoringFormDraft = false;
const formDraftTimers = new Map();

function formDraftKey(name, context = 'global') {
  return `${name}:${context || 'global'}`;
}

function readFormDrafts() {
  try {
    return JSON.parse(localStorage.getItem(FORM_DRAFTS_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function writeFormDrafts(drafts) {
  try {
    localStorage.setItem(FORM_DRAFTS_KEY, JSON.stringify(drafts || {}));
  } catch (_) {}
}

function formDraftUpdatedMs(draft) {
  const time = Date.parse(draft && draft.updatedAt);
  return Number.isFinite(time) ? time : 0;
}

function pruneExpiredFormDrafts() {
  const drafts = readFormDrafts();
  const now = Date.now();
  const maxAgeMs = FORM_DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [key, draft] of Object.entries(drafts)) {
    const updatedMs = formDraftUpdatedMs(draft);
    if (!updatedMs || now - updatedMs > maxAgeMs) {
      delete drafts[key];
      changed = true;
    }
  }
  if (changed) writeFormDrafts(drafts);
  return drafts;
}

function formDraftLabel(key) {
  if (key === addExpenseDraftKey()) return 'Nuevo gasto';
  if (String(key || '').startsWith('blog-entry:')) {
    const tripId = Number(String(key).split(':')[1]);
    const trip = state.viajes.find(item => Number(item.id) === tripId);
    return `Entrada de blog${trip ? ` · ${trip.nombre}` : ''}`;
  }
  const labels = {
    'config-lugar': 'País / ciudad',
    'config-viaje': 'Viaje',
    'config-moneda': 'Moneda',
    'config-cuenta': 'Cuenta',
    'config-transferencia': 'Transferencia',
    'config-categoria': 'Categoría'
  };
  return labels[key] || key;
}

function formDraftAgeText(draft) {
  const updatedMs = formDraftUpdatedMs(draft);
  if (!updatedMs) return 'fecha no disponible';
  const minutes = Math.max(0, Math.round((Date.now() - updatedMs) / 60000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} días`;
}

function renderFormDraftStatus(message = '') {
  if (typeof document === 'undefined') return;
  const status = $('#msg-form-drafts');
  const list = $('#form-drafts-list');
  const button = $('#btn-clear-form-drafts');
  if (!status && !list && !button) return;
  const drafts = pruneExpiredFormDrafts();
  const entries = Object.entries(drafts).sort((a, b) => formDraftUpdatedMs(b[1]) - formDraftUpdatedMs(a[1]));
  if (button) button.disabled = entries.length === 0;
  if (status) {
    status.textContent = message || (entries.length
      ? `${entries.length} ${entries.length === 1 ? 'borrador guardado' : 'borradores guardados'} en este dispositivo.`
      : 'No hay borradores guardados.');
    status.classList.remove('error');
  }
  if (list) {
    list.innerHTML = entries.length
      ? `<ul>${entries.map(([key, draft]) => `<li>${escapeHtml(formDraftLabel(key))} · ${escapeHtml(formDraftAgeText(draft))}</li>`).join('')}</ul>`
      : '';
  }
}

function clearAllFormDrafts() {
  formDraftTimers.forEach(timer => window.clearTimeout(timer));
  formDraftTimers.clear();
  const drafts = pruneExpiredFormDrafts();
  const count = Object.keys(drafts).length;
  if (!count) {
    resetAddExpenseForm();
    renderFormDraftStatus('No hay borradores guardados.');
    return;
  }
  if (!confirm(`Se borrarán ${count} ${count === 1 ? 'borrador guardado' : 'borradores guardados'} en este dispositivo. ¿Continuar?`)) return;
  writeFormDrafts({});
  resetAddExpenseForm();
  renderFormDraftStatus('Borradores eliminados.');
}

function formFieldDraftId(selector) {
  return String(selector || '').replace(/^#/, '');
}

function formDraftFieldValue(field) {
  if (!field || !field.id) return undefined;
  const tag = String(field.tagName || '').toLowerCase();
  const type = String(field.type || '').toLowerCase();
  if (['file', 'button', 'submit', 'reset', 'hidden'].includes(type)) return undefined;
  if (type === 'checkbox') return Boolean(field.checked);
  if (tag === 'select' && field.multiple) return [...field.selectedOptions].map(option => option.value);
  return field.value;
}

function collectFormDraftValues(selectors) {
  const values = {};
  for (const selector of selectors || []) {
    const field = $(selector);
    const value = formDraftFieldValue(field);
    if (value !== undefined) values[formFieldDraftId(selector)] = value;
  }
  return values;
}

function hasMeaningfulDraftValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value === true;
  return String(value ?? '').trim() !== '';
}

function hasMeaningfulFormDraft(values) {
  return Object.values(values || {}).some(hasMeaningfulDraftValue);
}

function saveFormDraft(key, selectors, meta = {}) {
  if (restoringFormDraft || !key) return;
  const values = collectFormDraftValues(selectors);
  const drafts = readFormDrafts();
  if (!hasMeaningfulFormDraft(values)) {
    delete drafts[key];
  } else {
    drafts[key] = {
      values,
      meta,
      updatedAt: new Date().toISOString()
    };
  }
  writeFormDrafts(drafts);
  renderFormDraftStatus();
}

function scheduleFormDraftSave(key, selectors, metaFactory = () => ({})) {
  if (!key) return;
  window.clearTimeout(formDraftTimers.get(key));
  formDraftTimers.set(key, window.setTimeout(() => {
    saveFormDraft(key, selectors, metaFactory() || {});
  }, 250));
}

function getFormDraft(key) {
  return readFormDrafts()[key] || null;
}

function clearFormDraft(key) {
  if (!key) return;
  window.clearTimeout(formDraftTimers.get(key));
  formDraftTimers.delete(key);
  const drafts = readFormDrafts();
  if (drafts[key]) {
    delete drafts[key];
    writeFormDrafts(drafts);
  }
  renderFormDraftStatus();
}

function applyFormDraftValues(selectors, values) {
  if (!values) return;
  restoringFormDraft = true;
  try {
    for (const selector of selectors || []) {
      const field = $(selector);
      if (!field) continue;
      const id = formFieldDraftId(selector);
      if (!Object.prototype.hasOwnProperty.call(values, id)) continue;
      const value = values[id];
      const tag = String(field.tagName || '').toLowerCase();
      const type = String(field.type || '').toLowerCase();
      if (type === 'checkbox') {
        field.checked = Boolean(value);
      } else if (tag === 'select' && field.multiple) {
        const selected = new Set((Array.isArray(value) ? value : [value]).map(String));
        [...field.options].forEach(option => { option.selected = selected.has(String(option.value)); });
      } else if (tag === 'select') {
        const hasOption = [...field.options].some(option => String(option.value) === String(value));
        if (hasOption || value === '') field.value = String(value);
      } else {
        field.value = value ?? '';
      }
    }
  } finally {
    restoringFormDraft = false;
  }
}

function restoreSimpleFormDraft(key, selectors, messageSelector) {
  const draft = getFormDraft(key);
  if (!draft) return false;
  applyFormDraftValues(selectors, draft.values);
  if (messageSelector) setMessage(messageSelector, 'Borrador restaurado.');
  return true;
}

function bindFormDraft(key, selectors, metaFactory = () => ({})) {
  for (const selector of selectors || []) {
    const field = $(selector);
    if (!field) continue;
    ['input', 'change'].forEach(eventName => {
      field.addEventListener(eventName, () => scheduleFormDraftSave(key, selectors, metaFactory));
    });
  }
}

function scheduleInlineFormDraft(key) {
  const config = INLINE_FORM_DRAFTS.find(item => item.key === key);
  if (config) scheduleFormDraftSave(config.key, config.fields);
}

function restoreTripConfigDraft(draft) {
  if (!draft) return false;
  applyFormDraftValues(['#v-nombre', '#v-inicio', '#v-fin', '#v-presu', '#v-paises'], draft.values);
  renderTripPlannedCitySelector();
  applyFormDraftValues(['#v-ciudades'], draft.values);
  updateTripPlanningCounters();
  setMessage('#msg-viaje', 'Borrador restaurado.');
  return true;
}

function restoreInlineFormDrafts() {
  for (const config of INLINE_FORM_DRAFTS) {
    const draft = getFormDraft(config.key);
    if (!draft) continue;
    if (typeof config.restore === 'function') config.restore(draft);
    else restoreSimpleFormDraft(config.key, config.fields, config.message);
  }
}

const BASE_MONEDAS = ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY'];
const DEFAULT_CUENTAS = [
  { nombre: 'Santander', moneda: 'EUR', saldoInicial: 0, accountType: '' },
  { nombre: 'Efectivo', moneda: 'EUR', saldoInicial: 0, accountType: 'cash' },
  { nombre: 'Revolut', moneda: 'EUR', saldoInicial: 0, accountType: '' }
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
  photoTypes: [],
  ticketOcrLanguages: ['spa'],
  lugares: [],
  gastos: [],
  viajes: [],
  viajeDocumentos: [],
  blogEntries: [],
  timelineDays: [],
  monedas: [],
  transferencias: []
};
const openComparisonCategories = new Set();

let latestCurrencyQuote = null;
const TICKET_OCR_LEARNING_KEY = 'cuaderno_bitacora_ticket_categories_v1';
const pendingTicketOcr = { g: null, 'edit-gasto': null };
let ticketOcrModulePromise = null;
let pendingExpenseClassificationSave = Promise.resolve();
let pendingExpenseMediaSave = Promise.resolve();

const collator = new Intl.Collator('es', { sensitivity: 'base' });
const todayIso = () => new Date().toISOString().slice(0, 10);
const currentLocalDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const currentLocalTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
const normalizeExpenseTime = value => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};
function expenseTimeValue(gasto) {
  const explicit = normalizeExpenseTime(gasto && gasto.hora);
  if (explicit) return explicit;
  const created = new Date(gasto && gasto.createdAt || '');
  if (Number.isNaN(created.getTime())) return '';
  return `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`;
}
function compareExpensesChronologically(a, b) {
  return (a.fecha || '').localeCompare(b.fecha || '')
    || expenseTimeValue(a).localeCompare(expenseTimeValue(b))
    || (a.createdAt || '').localeCompare(b.createdAt || '')
    || Number(a.id || 0) - Number(b.id || 0);
}
function storedImageCoordinate(value, min, max) {
  if (value == null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
function normalizeStoredImageRecord(image = {}) {
  image = image && typeof image === 'object' ? image : {};
  const latitude = storedImageCoordinate(image.latitude ?? image.lat, -90, 90);
  const longitude = storedImageCoordinate(image.longitude ?? image.lng ?? image.lon, -180, 180);
  const hasExactPoint = latitude != null && longitude != null;
  return {
    id: image.id || '',
    name: String(image.name || image.imageName || 'imagen.jpg'),
    type: String(image.type || image.imageType || 'image/jpeg'),
    size: Math.max(0, Number(image.size || image.imageSize) || 0),
    data: image.data || image.imageData || '',
    fileRef: image.fileRef || '',
    width: Math.max(0, Number(image.width || image.imageWidth) || 0),
    height: Math.max(0, Number(image.height || image.imageHeight) || 0),
    latitude,
    longitude,
    locationSource: String(image.locationSource || ''),
    photoTypeId: String(image.photoTypeId || ''),
    photoTypeName: String(image.photoTypeName || ''),
    mapEnabled: image.mapEnabled === true && hasExactPoint,
    capturedDate: String(image.capturedDate || ''),
    capturedTime: String(image.capturedTime || ''),
    createdAt: image.createdAt || ''
  };
}
function storedImageCoordinates(image) {
  const normalized = normalizeStoredImageRecord(image);
  return normalized.latitude == null || normalized.longitude == null
    ? null
    : { latitude: normalized.latitude, longitude: normalized.longitude };
}
function expenseExtraImages(gasto) {
  return Array.isArray(gasto && gasto.extraImages)
    ? gasto.extraImages.map(normalizeStoredImageRecord).filter(image => image.data || image.fileRef)
    : [];
}

function resolvedExpenseTicketLocation(latitude, longitude, locationSource = '', extraImages = []) {
  const ticketLatitude = storedImageCoordinate(latitude, -90, 90);
  const ticketLongitude = storedImageCoordinate(longitude, -180, 180);
  const firstPhotoLocation = (Array.isArray(extraImages) ? extraImages : [])
    .map(image => ({
      latitude: storedImageCoordinate(image?.latitude ?? image?.lat, -90, 90),
      longitude: storedImageCoordinate(image?.longitude ?? image?.lng ?? image?.lon, -180, 180)
    }))
    .find(point => point.latitude != null && point.longitude != null) || null;
  if (ticketLatitude != null && ticketLongitude != null) {
    const inherited = String(locationSource || '') === 'expense-photo'
      || Boolean(firstPhotoLocation
        && Math.abs(firstPhotoLocation.latitude - ticketLatitude) < 0.0000001
        && Math.abs(firstPhotoLocation.longitude - ticketLongitude) < 0.0000001);
    return {
      latitude: ticketLatitude,
      longitude: ticketLongitude,
      locationSource: inherited ? 'expense-photo' : String(locationSource || ''),
      inherited
    };
  }
  for (const image of Array.isArray(extraImages) ? extraImages : []) {
    const imageLatitude = storedImageCoordinate(image?.latitude ?? image?.lat, -90, 90);
    const imageLongitude = storedImageCoordinate(image?.longitude ?? image?.lng ?? image?.lon, -180, 180);
    if (imageLatitude != null && imageLongitude != null) {
      return {
        latitude: imageLatitude,
        longitude: imageLongitude,
        locationSource: 'expense-photo',
        inherited: true
      };
    }
  }
  return { latitude: null, longitude: null, locationSource: '', inherited: false };
}

function expenseTicketLocationForExpense(gasto) {
  return resolvedExpenseTicketLocation(
    gasto?.ticketLatitude,
    gasto?.ticketLongitude,
    gasto?.ticketLocationSource,
    gasto?.extraImages
  );
}

function expenseTicketImageRecord(gasto) {
  if (!gasto?.ticketData) return null;
  const data = normalizeTicketDataValue(gasto.ticketData);
  if (!/^data:image\//i.test(data) && !fileLooksLikeImage({ type: gasto.ticketType, name: gasto.ticketName })) return null;
  const location = expenseTicketLocationForExpense(gasto);
  return normalizeStoredImageRecord({
    id: `expense-ticket-${gasto.id || ''}`,
    name: gasto.ticketName || 'ticket.jpg',
    type: gasto.ticketType || 'image/jpeg',
    size: gasto.ticketSize || 0,
    data,
    width: gasto.ticketWidth || 0,
    height: gasto.ticketHeight || 0,
    latitude: location.latitude,
    longitude: location.longitude,
    locationSource: location.locationSource,
    photoTypeId: gasto.ticketPhotoTypeId || '',
    photoTypeName: gasto.ticketPhotoTypeName || '',
    mapEnabled: gasto.ticketMapEnabled === true && location.inherited !== true,
    capturedDate: gasto.ticketCapturedDate || '',
    capturedTime: gasto.ticketCapturedTime || '',
    createdAt: gasto.createdAt || ''
  });
}

function expenseTicketTranslationRecord(gasto) {
  if (!gasto?.ticketTranslationData) return null;
  const kind = gasto.ticketTranslationKind === 'secondary-ticket' ? 'secondary-ticket' : 'translation';
  return normalizeStoredImageRecord({
    id: `expense-ticket-${gasto.id || ''}-translation`,
    name: gasto.ticketTranslationName || (kind === 'secondary-ticket' ? 'segundo-ticket.jpg' : 'traduccion-ticket.jpg'),
    type: gasto.ticketTranslationType || 'image/jpeg',
    size: gasto.ticketTranslationSize || 0,
    data: normalizeTicketDataValue(gasto.ticketTranslationData),
    width: gasto.ticketTranslationWidth || 0,
    height: gasto.ticketTranslationHeight || 0,
    createdAt: gasto.updatedAt || gasto.createdAt || '',
    kind
  });
}

function isAccommodationExpense(gasto) {
  const category = state.categorias.find(item => Number(item.id) === Number(gasto && gasto.catId));
  return normalizePlaceName(category && category.nombre) === 'alojamiento';
}

function dateDistanceDays(first, second) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(first || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(second || ''))) return Number.POSITIVE_INFINITY;
  return Math.abs(new Date(`${first}T12:00:00Z`).getTime() - new Date(`${second}T12:00:00Z`).getTime()) / 86400000;
}

function accommodationDestinationForTripCity(tripId, cityId, targetDate = '') {
  const candidates = [];
  const append = ({ image, date = '', priority, order = '', source, index = 0 }) => {
    const point = storedImageCoordinates(image);
    if (!point) return;
    candidates.push({
      ...point,
      date,
      priority,
      distance: targetDate ? dateDistanceDays(date, targetDate) : 0,
      source,
      image,
      index,
      order
    });
  };
  state.gastos
    .filter(gasto => Number(gasto.viajeId) === Number(tripId) && Number(gasto.ciudadId) === Number(cityId))
    .forEach(gasto => {
      expenseExtraImages(gasto).forEach((image, index) => {
        const classifiedDestination = imageUsesAsDestination(image);
        const legacyAccommodation = !image.photoTypeId && isAccommodationExpense(gasto);
        if (!classifiedDestination && !legacyAccommodation) return;
        const date = image.capturedDate || gasto.fecha || '';
        append({
          image,
          date,
          priority: classifiedDestination ? 0 : 1,
          order: `${gasto.fecha || ''}T${expenseTimeValue(gasto) || '00:00'}-${gasto.id || 0}`,
          source: gasto,
          index
        });
      });
    });
  state.blogEntries
    .filter(entry => Number(entry.viajeId) === Number(tripId) && Number(entry.ciudadId) === Number(cityId))
    .forEach(entry => {
      blogEntryImages(entry).forEach((image, index) => {
        if (!imageUsesAsDestination(image)) return;
        append({
          image,
          date: image.capturedDate || entry.fecha || '',
          priority: 0,
          order: `${entry.fecha || ''}T${entry.hora || '00:00'}-${entry.id || 0}`,
          source: entry,
          index
        });
      });
    });
  return candidates
    .filter(candidate => accommodationCandidateMatchesCity(tripId, cityId, candidate))
    .sort((a, b) =>
    a.priority - b.priority
    || a.distance - b.distance
    || String(a.date || '').localeCompare(String(b.date || ''))
    || String(a.order || '').localeCompare(String(b.order || ''))
    || a.index - b.index
  )[0] || null;
}

function accommodationDestinationPhotoRecord(destination, tripId, cityId) {
  if (!destination || !destination.image) return null;
  const image = normalizeStoredImageRecord(destination.image);
  if (!image.data && !image.fileRef) return null;
  const source = destination.source || {};
  return {
    key: photoMapRecordKey(image, `destination-${tripId}-${cityId}-${source.id || destination.order || destination.index || 0}`),
    kind: 'photo',
    image,
    descripcion: source.descripcion || source.desc || photoTypeLabel(image) || 'Foto del alojamiento',
    fecha: image.capturedDate || destination.date || source.fecha || '',
    hora: image.capturedTime || source.hora || (source.desc ? expenseTimeValue(source) : ''),
    paisId: source.paisId || null,
    ciudadId: Number(cityId) || null,
    viajeId: Number(tripId) || null,
    latitude: destination.latitude,
    longitude: destination.longitude,
    source: 'destination'
  };
}

function cityWithAccommodationDestination(city, tripId, targetDate = '') {
  if (!city) return city;
  const destination = accommodationDestinationForTripCity(tripId, city.id, targetDate);
  return destination
    ? { ...city, lat: destination.latitude, lng: destination.longitude, accommodationDestination: true }
    : city;
}
async function expenseTicketBlogImage(gasto) {
  const ticketData = normalizeTicketDataValue(gasto && gasto.ticketData);
  if (!ticketData) return null;
  const location = expenseTicketLocationForExpense(gasto);
  const dataUrlType = (ticketData.match(/^data:([^;,]+)/i) || [])[1] || '';
  const ticketType = String(gasto.ticketType || dataUrlType || '').toLowerCase();
  const ticketName = String(gasto.ticketName || 'Ticket');
  const ticketIsImage = fileLooksLikeImage({ type: ticketType, name: ticketName }) || /^data:image\//i.test(ticketData);
  if (ticketIsImage) {
    return normalizeBlogImageRecord({
      id: `expense-ticket-${gasto.id || ''}`,
      name: ticketName,
      type: ticketType || 'image/jpeg',
      size: Math.max(0, Number(gasto.ticketSize) || 0),
      data: ticketData,
      latitude: location.latitude,
      longitude: location.longitude,
      locationSource: location.locationSource,
      mapEnabled: gasto.ticketMapEnabled === true && location.inherited !== true,
      capturedDate: gasto.ticketCapturedDate || '',
      capturedTime: gasto.ticketCapturedTime || '',
      photoTypeId: String(gasto.ticketPhotoTypeId || ''),
      photoTypeName: String(gasto.ticketPhotoTypeName || ''),
      createdAt: gasto.createdAt || ''
    });
  }
  const ticketIsPdf = ticketType.includes('pdf')
    || /\.pdf$/i.test(ticketName)
    || /^data:application\/pdf/i.test(ticketData);
  if (!ticketIsPdf) return null;

  const ticketInfo = ticketDataInfo(ticketData, gasto.ticketType || 'application/pdf');
  const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', window.location.href).href;
  const pdf = await pdfjs.getDocument({ data: await ticketInfo.blob.arrayBuffer() }).promise;
  const canvas = document.createElement('canvas');
  try {
    const page = await pdf.getPage(1);
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, 1800 / Math.max(original.width, 1));
    const viewport = page.getViewport({ scale: Math.max(1.4, scale) });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const imageBlob = await canvasToJpeg(canvas, 0.84);
    return normalizeBlogImageRecord({
      id: `expense-ticket-${gasto.id || ''}-pdf-preview`,
      name: ticketName.replace(/\.pdf$/i, '') + ' · página 1.jpg',
      type: 'image/jpeg',
      size: imageBlob.size,
      data: await readBlobAsDataUrl(imageBlob),
      width: canvas.width,
      height: canvas.height,
      latitude: location.latitude,
      longitude: location.longitude,
      locationSource: location.locationSource,
      mapEnabled: gasto.ticketMapEnabled === true && location.inherited !== true,
      capturedDate: gasto.ticketCapturedDate || '',
      capturedTime: gasto.ticketCapturedTime || '',
      photoTypeId: String(gasto.ticketPhotoTypeId || ''),
      photoTypeName: String(gasto.ticketPhotoTypeName || ''),
      createdAt: gasto.createdAt || ''
    });
  } finally {
    canvas.width = 1;
    canvas.height = 1;
    await pdf.destroy();
  }
}

async function expenseBlogImages(gasto) {
  const images = expenseExtraImages(gasto);
  const translationImage = expenseTicketTranslationRecord(gasto);
  const ticketImage = await expenseTicketBlogImage(gasto);
  if (translationImage) images.unshift(normalizeBlogImageRecord(translationImage));
  if (ticketImage) images.unshift(ticketImage);
  return images;
}
function expenseAttachmentCount(gasto) {
  return (gasto && gasto.ticketData ? 1 : 0)
    + (gasto && gasto.ticketTranslationData ? 1 : 0)
    + expenseExtraImages(gasto).length;
}
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
const fmtTripDate = iso => {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return `<span class="trip-date-full">${escapeHtml(fmtDate(iso))}</span>`;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const shortWeekday = date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  const weekday = `${shortWeekday.charAt(0).toUpperCase()}${shortWeekday.slice(1)}`;
  return `<span class="trip-date-full">${escapeHtml(fmtDate(iso))}</span><span class="trip-date-compact"><span>${escapeHtml(weekday)}</span><span>${day}-${month}-${year.slice(-2)}</span></span>`;
};
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

function tripLodgingLocations(viaje) {
  if (!viaje || !Array.isArray(viaje.lodgingLocations)) return [];
  return viaje.lodgingLocations.map(location => {
    const latitude = storedImageCoordinate(location && (location.latitude ?? location.lat), -90, 90);
    const longitude = storedImageCoordinate(location && (location.longitude ?? location.lng), -180, 180);
    const name = String(location && (location.name || location.nombre) || '').trim();
    if (latitude == null || longitude == null || !name) return null;
    return {
      name,
      latitude,
      longitude,
      updatedAt: String(location.updatedAt || '')
    };
  }).filter(Boolean);
}

function normalizedRouteStopRole(value, index = 0, cityIds = []) {
  const role = String(value || '').trim().toLowerCase();
  if ([ROUTE_STOP_ROLE_DESTINATION, ROUTE_STOP_ROLE_TRANSIT, ROUTE_STOP_ROLE_ENDPOINT].includes(role)) return role;
  if (cityIds.length === 1) return ROUTE_STOP_ROLE_DESTINATION;
  if (index === 0) return ROUTE_STOP_ROLE_ENDPOINT;
  if (index === cityIds.length - 1 && Number(cityIds[index]) === Number(cityIds[0])) return ROUTE_STOP_ROLE_ENDPOINT;
  return ROUTE_STOP_ROLE_DESTINATION;
}

function normalizeTripRouteStops(viaje, cityIds = []) {
  const ids = (cityIds.length ? cityIds : (Array.isArray(viaje && viaje.ciudadIds) ? viaje.ciudadIds : []))
    .map(Number)
    .filter(Boolean);
  const stored = Array.isArray(viaje && viaje.routeStops) ? viaje.routeStops : [];
  if (!ids.length && stored.length) {
    stored.forEach(stop => {
      const cityId = Number(stop && stop.cityId);
      if (cityId) ids.push(cityId);
    });
  }
  return ids.map((cityId, index) => {
    const saved = stored[index] && Number(stored[index].cityId) === Number(cityId) ? stored[index] : null;
    return {
      cityId,
      role: normalizedRouteStopRole(saved && saved.role, index, ids),
      date: tripDateWithinRange(saved && saved.date, viaje) ? String(saved.date) : ''
    };
  });
}

function tripRouteStops(viaje) {
  return normalizeTripRouteStops(viaje);
}

function mergeTripRouteStops(viaje, cityIds = []) {
  const ids = (cityIds || []).map(Number).filter(Boolean);
  const previousByCity = new Map();
  tripRouteStops(viaje).forEach(stop => {
    if (!previousByCity.has(stop.cityId)) previousByCity.set(stop.cityId, []);
    previousByCity.get(stop.cityId).push(stop);
  });
  return ids.map((cityId, index) => {
    const previous = previousByCity.get(cityId)?.shift();
    return {
      cityId,
      role: normalizedRouteStopRole(previous && previous.role, index, ids),
      date: tripDateWithinRange(previous && previous.date, viaje) ? previous.date : ''
    };
  });
}

function tripCityIds(viaje) {
  if (!viaje) return [];
  if (Array.isArray(viaje.ciudadIds) && viaje.ciudadIds.length) return viaje.ciudadIds.map(Number).filter(Boolean);
  if (Array.isArray(viaje.routeStops)) return viaje.routeStops.map(stop => Number(stop && stop.cityId)).filter(Boolean);
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

function gastosDestinoCiudadName(gastos) {
  const ordered = (gastos || []).slice().sort(compareExpensesChronologically);
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const cityName = gastoCiudadLabel(ordered[index]);
    if (cityName && cityName !== '-') return cityName;
  }
  return '';
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

function normalizeTicketOcrLanguages(codes = []) {
  const supported = new Set(TICKET_OCR_LANGUAGES.map(language => language.code));
  const normalized = [...new Set((Array.isArray(codes) ? codes : []).map(String).filter(code => supported.has(code)))];
  if (!normalized.includes('spa')) normalized.unshift('spa');
  return normalized;
}

function normalizeRequestedTicketOcrLanguages(codes = []) {
  const supported = new Set(TICKET_OCR_LANGUAGES.map(language => language.code));
  const normalized = [...new Set((Array.isArray(codes) ? codes : []).map(String).filter(code => supported.has(code)))];
  return normalized.length ? normalized : ['spa'];
}

function ticketOcrLanguageName(code) {
  return TICKET_OCR_LANGUAGES.find(language => language.code === code)?.name || code;
}

function ticketOcrLanguageCodesForCountry(countryName) {
  const normalized = normalizePlaceName(countryName);
  if (!normalized) return [];
  return Object.entries(TICKET_OCR_COUNTRY_ALIASES)
    .filter(([, aliases]) => aliases.some(alias => normalized === alias || normalized.startsWith(`${alias} `)))
    .map(([code]) => code);
}

function automaticTicketOcrLanguagesForCountryIds(countryIds = []) {
  return [...new Set((countryIds || []).flatMap(countryId => {
    const country = state.lugares.find(place => Number(place.id) === Number(countryId) && !place.parentId);
    return ticketOcrLanguageCodesForCountry(country?.nombre);
  }))];
}

function automaticTicketOcrLanguagesForTrip(tripId) {
  const trip = state.viajes.find(item => Number(item.id) === Number(tripId));
  return trip ? automaticTicketOcrLanguagesForCountryIds(tripCountryIds(trip)) : [];
}

function ticketOcrLanguagesForTrip(tripId) {
  return normalizeTicketOcrLanguages([
    ...automaticTicketOcrLanguagesForTrip(tripId),
    ...state.ticketOcrLanguages
  ]);
}

function ticketOcrLanguagesForExpense(prefix) {
  const chosenLanguage = String($(`#${prefix}-ticket-language`)?.value || '');
  if (TICKET_OCR_LANGUAGES.some(language => language.code === chosenLanguage)) return [chosenLanguage];
  return ticketOcrLanguagesForTrip(Number($(`#${prefix}-viaje`)?.value));
}

function lensTicketSourceLanguage(prefix) {
  const chosenLanguage = String($(`#${prefix}-ticket-language`)?.value || '');
  if (TICKET_OCR_LANGUAGES.some(language => language.code === chosenLanguage)) {
    return { languages: [chosenLanguage], spanish: chosenLanguage === 'spa' };
  }
  const countryId = Number($(`#${prefix}-pais`)?.value || 0);
  const countryLanguages = countryId ? automaticTicketOcrLanguagesForCountryIds([countryId]) : [];
  const languages = countryLanguages.length ? countryLanguages : ticketOcrLanguagesForExpense(prefix);
  return { languages, spanish: languages.length === 1 && languages[0] === 'spa' };
}

function renderExpenseTicketLanguageSelect(prefix) {
  const select = $(`#${prefix}-ticket-language`);
  if (!select) return;
  const previous = String(select.value || '');
  select.innerHTML = `<option value="">Automático · viaje y configuración</option>${TICKET_OCR_LANGUAGES.map(language => `<option value="${escapeHtml(language.code)}">${escapeHtml(language.name)}</option>`).join('')}`;
  select.value = TICKET_OCR_LANGUAGES.some(language => language.code === previous) ? previous : '';
}

async function cacheTicketOcrLanguage(code) {
  const supported = TICKET_OCR_LANGUAGES.some(language => language.code === code);
  if (!supported) throw new Error(`Idioma de tickets no compatible: ${code}`);
  const url = new URL(`./vendor/tesseract/lang/${code}.traineddata.gz`, window.location.href).href;
  if (!window.caches) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`No se pudo descargar ${ticketOcrLanguageName(code)}`);
    return;
  }
  const cache = await caches.open(TICKET_OCR_LANGUAGE_CACHE);
  if (await cache.match(url)) return;
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error(`No se pudo descargar ${ticketOcrLanguageName(code)}`);
  await cache.put(url, response.clone());
}

async function warmTicketOcrLanguages(codes = []) {
  const languages = normalizeRequestedTicketOcrLanguages(codes);
  await Promise.all(languages.map(cacheTicketOcrLanguage));
  return languages;
}

function warmTicketOcrLanguagesForTrip(tripId) {
  return warmTicketOcrLanguages(ticketOcrLanguagesForTrip(tripId));
}

function renderTicketOcrLanguageControls() {
  const container = $('#ticket-ocr-language-list');
  if (!container) return;
  const configured = new Set(normalizeTicketOcrLanguages(state.ticketOcrLanguages));
  container.innerHTML = TICKET_OCR_LANGUAGES.map(language => `<label class="check-option"><input type="checkbox" data-ticket-ocr-language="${escapeHtml(language.code)}"${configured.has(language.code) ? ' checked' : ''}${language.fixed ? ' disabled' : ''}> ${escapeHtml(language.name)}${language.fixed ? ' · siempre' : ''}</label>`).join('');
  const automatic = [...new Set(selectedTripIds().flatMap(automaticTicketOcrLanguagesForTrip))];
  const status = $('#msg-ticket-ocr-languages');
  if (status && !status.dataset.busy) {
    status.textContent = automatic.length
      ? `Por el viaje seleccionado se activará automáticamente: ${automatic.map(ticketOcrLanguageName).join(', ')}.`
      : 'Los idiomas adicionales se descargan una sola vez y después funcionan sin conexión.';
    status.classList.remove('error');
  }
}

async function saveTicketOcrLanguageSettings() {
  const status = $('#msg-ticket-ocr-languages');
  const codes = normalizeTicketOcrLanguages($$('[data-ticket-ocr-language]:checked').map(input => input.dataset.ticketOcrLanguage));
  state.ticketOcrLanguages = codes;
  await putRecord('appSettings', {
    key: TICKET_OCR_LANGUAGES_SETTING_KEY,
    codes,
    updatedAt: new Date().toISOString()
  });
  if (status) {
    status.dataset.busy = '1';
    status.textContent = 'Descargando los idiomas elegidos para usarlos también sin conexión…';
    status.classList.remove('error');
  }
  try {
    await warmTicketOcrLanguages(codes);
    if (status) status.textContent = 'Idiomas preparados. Ya pueden usarse sin conexión.';
  } catch (error) {
    if (status) {
      status.textContent = `${error.message || error}. Se volverá a intentar cuando haya conexión.`;
      status.classList.add('error');
    }
  } finally {
    if (status) delete status.dataset.busy;
  }
}

function normalizePhotoTypes(types = []) {
  const seen = new Set();
  return (Array.isArray(types) ? types : []).map((type, index) => {
    const nombre = String(type && type.nombre || '').trim();
    const id = String(type && type.id || '').trim() || `foto-${index + 1}`;
    if (!nombre || seen.has(id)) return null;
    seen.add(id);
    return { id, nombre, useAsDestination: type.useAsDestination === true };
  }).filter(Boolean).sort((a, b) => {
    const byName = normalizePlaceName(a.nombre).localeCompare(normalizePlaceName(b.nombre), 'es');
    return byName || String(a.id).localeCompare(String(b.id), 'es');
  });
}

function photoTypeById(id) {
  return state.photoTypes.find(type => String(type.id) === String(id || '')) || null;
}

function photoTypeLabel(image) {
  const configured = photoTypeById(image && image.photoTypeId);
  return configured ? configured.nombre : String(image && image.photoTypeName || '').trim();
}

function imageUsesAsDestination(image) {
  const configured = photoTypeById(image && image.photoTypeId);
  return Boolean(configured && configured.useAsDestination && storedImageCoordinates(image));
}

function photoTypeOptionsHtml(selectedId = '') {
  return `<option value="">Sin clasificar</option>${state.photoTypes.map(type => `<option value="${escapeHtml(type.id)}"${String(type.id) === String(selectedId || '') ? ' selected' : ''}>${escapeHtml(type.nombre)}${type.useAsDestination ? ' · destino' : ''}</option>`).join('')}`;
}

async function savePhotoTypes(types) {
  const normalized = normalizePhotoTypes(types);
  await putRecord('appSettings', {
    key: PHOTO_TYPES_SETTING_KEY,
    items: normalized,
    updatedAt: new Date().toISOString()
  });
  state.photoTypes = normalized;
  setLocalDataUpdatedAt();
  renderPhotoTypeControls();
}

async function addPhotoType({ nombre, useAsDestination = false }) {
  const cleanName = String(nombre || '').trim();
  if (!cleanName) throw new Error('Escribe el nombre del tipo de foto');
  if (state.photoTypes.some(type => normalizePlaceName(type.nombre) === normalizePlaceName(cleanName))) throw new Error('Ese tipo de foto ya existe');
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `foto-${Date.now()}-${Math.random()}`;
  await savePhotoTypes([...state.photoTypes, { id, nombre: cleanName, useAsDestination }]);
}

async function updatePhotoType(id, patch) {
  const current = photoTypeById(id);
  if (!current) throw new Error('No se encuentra el tipo de foto');
  const nombre = String(patch.nombre || current.nombre).trim();
  if (!nombre) throw new Error('Escribe el nombre del tipo de foto');
  if (state.photoTypes.some(type => type.id !== current.id && normalizePlaceName(type.nombre) === normalizePlaceName(nombre))) throw new Error('Ese tipo de foto ya existe');
  await savePhotoTypes(state.photoTypes.map(type => type.id === current.id
    ? { ...type, nombre, useAsDestination: patch.useAsDestination === true }
    : type));
}

async function deletePhotoType(id) {
  const current = photoTypeById(id);
  if (!current) return;
  await savePhotoTypes(state.photoTypes.filter(type => type.id !== current.id));
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
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('No hay conexión para consultar el cambio. Puedes introducirlo manualmente');
  }
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
  if ($('#map-viaje')) $('#map-viaje').value = value;
  if ($('#c-viaje')) $('#c-viaje').value = value;
  state.selectedViajeId = ids.length === 1 ? ids[0] : null;
}

function setSelectedTrips(ids, options = {}) {
  state.selectedViajeIds = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (options.preserveMapState !== true) {
    tripMapState.showPlanned = true;
    tripMapState.showPhotos = true;
    tripMapState.showTimeline = true;
    tripMapState.timelineRouteView = 'original';
    tripMapState.timelineRoutingMode = 'automatic';
    tripMapState.destinationOnly = false;
    tripMapState.day = '';
    restoreTimelineRoutingPreference(state.selectedViajeIds);
    resetTripMapView();
  }
  syncTripSelectsFromSelection();
  syncBlogAvailability();
  if (state.activeTab === 'blog') renderBlog();
}

function timelineRecordsForTrip(tripId) {
  return state.timelineDays
    .filter(record => Number(record.viajeId) === Number(tripId))
    .slice()
    .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
}

function timelineRoutingModeKey(value = tripMapState.timelineRoutingMode) {
  return window.TimelineRouting ? window.TimelineRouting.normalizeMode(value) : 'automatic';
}

function timelineAdjustedRouteCache(record, mode = timelineRoutingModeKey()) {
  const routes = record && record.adjustedTimelineRoutes;
  const cached = routes && routes[timelineRoutingModeKey(mode)];
  return cached && Array.isArray(cached.paths) && cached.paths.length ? cached : null;
}

function restoreTimelineRoutingPreference(selectedIds = selectedTripIds()) {
  const ids = (selectedIds || []).map(Number).filter(Boolean);
  if (ids.length !== 1) return;
  const trip = state.viajes.find(item => Number(item.id) === ids[0]);
  if (!trip) return;
  const records = timelineRecordsForTrip(trip.id);
  const storedMode = timelineRoutingModeKey(trip.timelineRoutingMode);
  const availableModes = ['automatic', 'driving', 'walking'].filter(mode =>
    records.some(record => timelineAdjustedRouteCache(record, mode))
  );
  const mode = availableModes.includes(storedMode) ? storedMode : availableModes[0] || storedMode;
  const storedView = trip.timelineRouteView === 'adjusted' || trip.timelineRouteView === 'original'
    ? trip.timelineRouteView
    : '';
  tripMapState.timelineRoutingMode = mode;
  tripMapState.timelineRouteView = storedView || (availableModes.length ? 'adjusted' : 'original');
}

async function persistTimelineRoutingPreference(trip = selectedMapTimelineTrip()) {
  if (!trip) return null;
  const timelineRouteView = tripMapState.timelineRouteView === 'adjusted' ? 'adjusted' : 'original';
  const timelineRoutingMode = timelineRoutingModeKey();
  if (trip.timelineRouteView === timelineRouteView && trip.timelineRoutingMode === timelineRoutingMode) return trip;
  const updated = await updateRecord('viajes', trip.id, { timelineRouteView, timelineRoutingMode });
  state.viajes = state.viajes.map(item => Number(item.id) === Number(trip.id) ? updated : item);
  return updated;
}

function timelineRoutingRecordSignature(record) {
  const point = value => value ? {
    latitude: Number(value.latitude),
    longitude: Number(value.longitude),
    time: String(value.time || ''),
    kind: String(value.kind || '')
  } : null;
  return JSON.stringify({
    departureMode: String(record && record.departureMode || ''),
    arrivalMode: String(record && record.arrivalMode || ''),
    departure: point(record && record.departure),
    arrival: point(record && record.arrival),
    points: (Array.isArray(record && record.points) ? record.points : []).map(point),
    activities: (Array.isArray(record && record.activities) ? record.activities : []).map(activity => ({
      activityType: String(activity && activity.activityType || ''),
      startTime: String(activity && (activity.startTime || activity.start && activity.start.time) || ''),
      endTime: String(activity && (activity.endTime || activity.end && activity.end.time) || ''),
      start: point(activity && activity.start),
      end: point(activity && activity.end)
    }))
  });
}

function selectedTimelineDayRecord(trip = selectedMapTimelineTrip()) {
  if (!trip || !tripMapState.day) return null;
  return timelineRecordsForTrip(trip.id).find(record => record.fecha === tripMapState.day) || null;
}

function selectedMapTimelineTrip() {
  const mapTripId = Number($('#map-viaje') && $('#map-viaje').value || 0);
  const selectedIds = selectedTripIds();
  const tripId = mapTripId || (selectedIds.length === 1 ? selectedIds[0] : 0);
  return state.viajes.find(trip => Number(trip.id) === Number(tripId)) || null;
}

function setTimelineMessage(message = '', error = false) {
  const element = $('#timeline-message');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', Boolean(error));
}

function renderTimelineDialog() {
  const trip = state.viajes.find(item => Number(item.id) === Number(activeTimelineTripId)) || selectedMapTimelineTrip();
  const status = $('#timeline-trip-status');
  const toggle = $('#timeline-toggle-layer');
  const remove = $('#timeline-delete');
  const select = $('#timeline-select-file');
  const close = $('#timeline-close');
  const footerClose = $('#timeline-cancel');
  const routingControls = $('#timeline-routing-controls');
  const routeView = $('#timeline-route-view');
  const routeMode = $('#timeline-route-mode');
  const routeAdjust = $('#timeline-route-adjust');
  const routeAdjustAll = $('#timeline-route-adjust-all');
  const routeCancel = $('#timeline-route-cancel');
  const routeClear = $('#timeline-route-clear');
  const routeHelp = $('#timeline-routing-help');
  if (!trip) {
    if (status) status.innerHTML = '<strong>Selecciona un viaje</strong><span>La Cronología de Maps se importa solamente para un viaje cada vez.</span>';
    if (select) select.disabled = true;
    if (toggle) toggle.hidden = true;
    if (remove) remove.hidden = true;
    if (routingControls) routingControls.hidden = true;
    return;
  }
  activeTimelineTripId = Number(trip.id);
  const records = timelineRecordsForTrip(trip.id);
  const pointCount = records.reduce((sum, record) => sum + (Array.isArray(record.points) ? record.points.length : 0), 0);
  const first = records[0];
  const last = records[records.length - 1];
  if (status) {
    status.innerHTML = records.length
      ? `<strong>${escapeHtml(trip.nombre)} · ${records.length} ${records.length === 1 ? 'día importado' : 'días importados'}</strong><span>${escapeHtml(summaryDocumentDate(first.fecha, true))} – ${escapeHtml(summaryDocumentDate(last.fecha, true))} · ${pointCount} puntos del recorrido</span><span>Archivo: ${escapeHtml(first.sourceName || 'Cronología.json')} · importado ${escapeHtml(new Date(first.importedAt || Date.now()).toLocaleString('es-ES'))}</span>`
      : `<strong>${escapeHtml(trip.nombre)}</strong><span>Viaje del ${escapeHtml(summaryDocumentDate(trip.fechaInicio, true))} al ${escapeHtml(summaryDocumentDate(trip.fechaFin, true))}. Todavía no hay una Cronología de Maps importada.</span>`;
  }
  if (select) select.disabled = timelineBulkRoutingActive;
  if (toggle) {
    toggle.hidden = !records.length;
    toggle.disabled = timelineBulkRoutingActive;
    toggle.textContent = tripMapState.showTimeline ? 'Ocultar recorrido' : 'Mostrar recorrido';
  }
  if (remove) {
    remove.hidden = !records.length;
    remove.disabled = timelineBulkRoutingActive;
  }
  if (close) close.disabled = timelineBulkRoutingActive;
  if (footerClose) footerClose.disabled = timelineBulkRoutingActive;
  if (routingControls) routingControls.hidden = !records.length;
  if (routeView) routeView.value = tripMapState.timelineRouteView === 'adjusted' ? 'adjusted' : 'original';
  if (routeMode) routeMode.value = timelineRoutingModeKey();
  const dayRecord = selectedTimelineDayRecord(trip);
  const cached = timelineAdjustedRouteCache(dayRecord);
  if (routeAdjust) {
    routeAdjust.disabled = !dayRecord || timelineBulkRoutingActive;
    routeAdjust.textContent = cached ? 'Recalcular el día' : 'Ajustar el día';
  }
  const currentMode = timelineRoutingModeKey();
  const pendingDays = records.filter(record => !timelineAdjustedRouteCache(record, currentMode));
  if (routeAdjustAll) {
    routeAdjustAll.disabled = !records.length || timelineBulkRoutingActive || !pendingDays.length;
    routeAdjustAll.textContent = pendingDays.length
      ? `Ajustar todo el viaje (${pendingDays.length})`
      : 'Todo el viaje ajustado';
  }
  if (routeCancel) routeCancel.hidden = !timelineBulkRoutingActive;
  if (routeView) routeView.disabled = timelineBulkRoutingActive;
  if (routeMode) routeMode.disabled = timelineBulkRoutingActive;
  if (routeClear) {
    routeClear.hidden = !cached;
    routeClear.disabled = timelineBulkRoutingActive;
  }
  if (routeHelp) {
    routeHelp.textContent = !tripMapState.day
      ? 'Puedes ajustar todo el viaje o seleccionar primero un día para ajustar únicamente esa fecha.'
      : !dayRecord
        ? `La Cronología importada no contiene recorrido el ${blogDayDateLabel(tripMapState.day)}.`
        : cached
          ? `${blogDayDateLabel(dayRecord.fecha)} ajustado y guardado con ${cached.provider || 'Valhalla / OpenStreetMap'}.`
          : `Se ajustará únicamente el ${blogDayDateLabel(dayRecord.fecha)} y el resultado quedará guardado.`;
  }
}

function openTimelineDialog() {
  const trip = selectedMapTimelineTrip();
  activeTimelineTripId = trip ? Number(trip.id) : null;
  setTimelineMessage('');
  renderTimelineDialog();
  const dialog = $('#timeline-dialog');
  if (!dialog || dialog.open) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeTimelineDialog() {
  const dialog = $('#timeline-dialog');
  if (!dialog) return;
  if (dialog.open && dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function timelineRoutingErrorMessage(error, status) {
  const code = String(error || '');
  if (status === 429 || code === 'rate_limited') return 'El servicio gratuito está ocupado. Espera un poco y vuelve a intentarlo.';
  if (code === 'route_timeout') return 'El ajuste ha tardado demasiado. Prueba otra vez o cambia entre Coche y A pie.';
  if (code === 'route_unavailable' || code === 'empty_route') return 'No se encontró una carretera o camino válido entre esos puntos.';
  return 'No se pudo consultar el servicio de rutas.';
}

async function requestAdjustedTimelinePath(path, preferredMode) {
  if (!window.TimelineRouting) throw new Error('No se ha cargado el ajustador de recorridos.');
  const costing = window.TimelineRouting.costingForPath(path, preferredMode);
  const locations = window.TimelineRouting.waypointsForPath(path, costing, 16);
  if (locations.length < 2) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch('/.netlify/functions/route-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costing, locations }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(timelineRoutingErrorMessage(payload && payload.error, response.status));
    const points = (Array.isArray(payload.points) ? payload.points : [])
      .map(point => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) }))
      .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    if (points.length < 2) throw new Error('No se encontró una carretera o camino válido entre esos puntos.');
    return {
      points,
      costing,
      adjusted: true,
      distanceKm: Number(payload.distanceKm || 0),
      durationSeconds: Number(payload.durationSeconds || 0)
    };
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('El ajuste ha tardado demasiado. Prueba otra vez.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function adjustSelectedTimelineDay(options = {}) {
  const trip = options.trip || selectedMapTimelineTrip();
  const record = options.record || selectedTimelineDayRecord(trip);
  if (!options.record && !tripMapState.day) throw new Error('Selecciona primero un día en el mapa.');
  if (!record) throw new Error('Ese día no tiene recorrido importado de Cronología de Maps.');
  if (!window.TimelineRouting) throw new Error('No se ha cargado el ajustador de recorridos.');
  const preferredMode = timelineRoutingModeKey(options.mode || $('#timeline-route-mode') && $('#timeline-route-mode').value);
  tripMapState.timelineRoutingMode = preferredMode;
  const originalPaths = timelineMapPaths([record]);
  const exactRecords = dailyMapRecordsForScope(new Set([Number(trip.id)]), 0)
    .filter(item => item.fecha === record.fecha);
  const sourcePaths = timelineMapPathsWithDailyRecords(originalPaths, exactRecords);
  if (!sourcePaths.length) throw new Error('Ese día no tiene suficientes puntos para ajustar el recorrido.');

  const adjustedPaths = [];
  const failures = [];
  for (let index = 0; index < sourcePaths.length; index += 1) {
    if (timelineBulkRoutingCancelled && options.bulk) break;
    const prefix = options.progressPrefix ? `${options.progressPrefix} · ` : '';
    setTimelineMessage(`${prefix}ajustando tramo ${index + 1} de ${sourcePaths.length}…`);
    try {
      const adjusted = await requestAdjustedTimelinePath(sourcePaths[index], preferredMode);
      if (adjusted) adjustedPaths.push(adjusted);
    } catch (error) {
      failures.push(error.message || String(error));
      adjustedPaths.push({
        points: sourcePaths[index].map(point => ({ latitude: point.latitude, longitude: point.longitude })),
        costing: window.TimelineRouting.costingForPath(sourcePaths[index], preferredMode),
        adjusted: false
      });
    }
  }
  if (timelineBulkRoutingCancelled && options.bulk) return { cancelled: true, failures: [] };
  if (!adjustedPaths.some(path => path.adjusted)) throw new Error(failures[0] || 'No se pudo ajustar ningún tramo.');
  const unifiedAdjustedPaths = window.TimelineRouting.unifyLikelyRoundTrips(sourcePaths, adjustedPaths);
  adjustedPaths.splice(0, adjustedPaths.length, ...unifiedAdjustedPaths);
  const adjustedTimelineRoutes = {
    ...(record.adjustedTimelineRoutes || {}),
    [preferredMode]: {
      createdAt: new Date().toISOString(),
      provider: 'Valhalla / OpenStreetMap',
      paths: adjustedPaths
    }
  };
  const updated = await updateRecord('timelineDays', record.id, { adjustedTimelineRoutes });
  state.timelineDays = state.timelineDays.map(item => String(item.id) === String(record.id) ? updated : item);
  if (!options.silent) {
    tripMapState.timelineRouteView = 'adjusted';
    await persistTimelineRoutingPreference(trip);
    resetTripMapView();
    renderTripMap();
    renderTimelineDialog();
    setTimelineMessage(failures.length
      ? `Recorrido guardado. ${adjustedPaths.length - failures.length} tramos ajustados y ${failures.length} conservados como en el original.`
      : `Recorrido ajustado y guardado: ${adjustedPaths.length} ${adjustedPaths.length === 1 ? 'tramo' : 'tramos'}.`);
  }
  return { cancelled: false, failures, adjustedPaths };
}

async function adjustEntireTimelineTrip() {
  const trip = selectedMapTimelineTrip();
  if (!trip) throw new Error('Selecciona un viaje.');
  const mode = timelineRoutingModeKey($('#timeline-route-mode') && $('#timeline-route-mode').value);
  tripMapState.timelineRoutingMode = mode;
  const records = timelineRecordsForTrip(trip.id);
  const pending = records.filter(record => !timelineAdjustedRouteCache(record, mode));
  if (!pending.length) {
    tripMapState.timelineRouteView = 'adjusted';
    await persistTimelineRoutingPreference(trip);
    renderTripMap();
    setTimelineMessage('Todos los días del viaje ya están ajustados para este tipo de recorrido.');
    return;
  }
  timelineBulkRoutingActive = true;
  timelineBulkRoutingCancelled = false;
  renderTimelineDialog();
  let completed = 0;
  let failed = 0;
  for (let index = 0; index < pending.length; index += 1) {
    if (timelineBulkRoutingCancelled) break;
    const record = pending[index];
    const progressPrefix = `Día ${index + 1} de ${pending.length} (${blogDayDateLabel(record.fecha)})`;
    try {
      const result = await adjustSelectedTimelineDay({ trip, record, mode, silent: true, bulk: true, progressPrefix });
      if (result && result.cancelled) break;
      completed += 1;
    } catch (error) {
      failed += 1;
      setTimelineMessage(`${progressPrefix}: ${error.message || String(error)} Se continúa con el siguiente día.`, true);
    }
  }
  const cancelled = timelineBulkRoutingCancelled;
  timelineBulkRoutingActive = false;
  timelineBulkRoutingCancelled = false;
  tripMapState.timelineRouteView = 'adjusted';
  await persistTimelineRoutingPreference(trip);
  resetTripMapView();
  renderTripMap();
  renderTimelineDialog();
  const remaining = timelineRecordsForTrip(trip.id).filter(record => !timelineAdjustedRouteCache(record, mode)).length;
  setTimelineMessage(cancelled
    ? `Proceso cancelado. ${completed} días guardados; quedan ${remaining}. Puedes continuar cuando quieras.`
    : `Ajuste general terminado: ${completed} días guardados${failed ? ` y ${failed} sin ajustar` : ''}.`);
}

async function clearSelectedTimelineAdjustment() {
  const record = selectedTimelineDayRecord();
  if (!record) return;
  const mode = timelineRoutingModeKey();
  const adjustedTimelineRoutes = { ...(record.adjustedTimelineRoutes || {}) };
  delete adjustedTimelineRoutes[mode];
  const updated = await updateRecord('timelineDays', record.id, { adjustedTimelineRoutes });
  state.timelineDays = state.timelineDays.map(item => String(item.id) === String(record.id) ? updated : item);
  tripMapState.timelineRouteView = 'original';
  await persistTimelineRoutingPreference();
  resetTripMapView();
  renderTripMap();
  renderTimelineDialog();
  setTimelineMessage('Se ha quitado el ajuste guardado de este día. La Cronología original se conserva.');
}

function closeLodgingNameDialog() {
  const dialog = $('#lodging-name-dialog');
  if (dialog && dialog.open && dialog.close) dialog.close();
  else if (dialog) dialog.removeAttribute('open');
  activeLodgingEditContext = null;
}

function openLodgingNameDialog(context) {
  if (!context || !context.recordId) return;
  activeLodgingEditContext = { ...context };
  const input = $('#lodging-name-input');
  const remember = $('#lodging-name-remember');
  const source = $('#lodging-name-source');
  if (input) input.value = context.name === 'Alojamiento' ? '' : context.name;
  if (remember) remember.checked = context.source !== 'night';
  if (source) source.textContent = context.sourceLabel
    ? `Nombre actual: ${context.name}. Origen: ${context.sourceLabel}.`
    : `Nombre actual: ${context.name}.`;
  const dialog = $('#lodging-name-dialog');
  if (!dialog || dialog.open) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
  setTimeout(() => input && input.focus(), 0);
}

function linkedTimelineLodgingTargets(record, role) {
  const targets = [{ record, role }];
  const ownPoint = role === 'arrival' ? record.arrival : record.departure;
  state.timelineDays
    .filter(candidate => Number(candidate.viajeId) === Number(record.viajeId) && String(candidate.id) !== String(record.id))
    .filter(candidate => dateDistanceDays(candidate.fecha, record.fecha) === 1)
    .forEach(candidate => {
      const candidateRole = candidate.fecha < record.fecha ? 'arrival' : 'departure';
      if ((role === 'departure' && candidateRole !== 'arrival') || (role === 'arrival' && candidateRole !== 'departure')) return;
      const candidatePoint = candidateRole === 'arrival' ? candidate.arrival : candidate.departure;
      if (lodgingDistanceMeters(ownPoint, candidatePoint) <= 50) targets.push({ record: candidate, role: candidateRole });
    });
  return targets;
}

async function saveLodgingName() {
  const context = activeLodgingEditContext;
  if (!context) return;
  const name = lodgingCandidateName($('#lodging-name-input') && $('#lodging-name-input').value);
  if (!name) throw new Error('Escribe el nombre del alojamiento');
  const record = state.timelineDays.find(item => String(item.id) === String(context.recordId));
  const trip = state.viajes.find(item => Number(item.id) === Number(context.tripId));
  if (!record || !trip) throw new Error('No se encuentra el alojamiento que quieres editar');
  const role = context.role === 'arrival' ? 'arrival' : 'departure';
  const rememberLocation = Boolean($('#lodging-name-remember') && $('#lodging-name-remember').checked);
  const point = { latitude: context.latitude, longitude: context.longitude };
  const linkedTargets = linkedTimelineLodgingTargets(record, role);
  const updatedRecords = [];
  if (rememberLocation) {
    const lodgingLocations = tripLodgingLocations(trip)
      .filter(location => lodgingDistanceMeters(location, point) > LODGING_NAME_MAX_DISTANCE_METERS);
    lodgingLocations.push({ name, ...point, updatedAt: new Date().toISOString() });
    const savedTrip = await updateViaje(trip.id, { lodgingLocations });
    state.viajes = state.viajes.map(item => Number(item.id) === Number(savedTrip.id) ? savedTrip : item);
    for (const target of linkedTargets) {
      if (!target.record.lodgingNames || !target.record.lodgingNames[target.role]) continue;
      const lodgingNames = { ...target.record.lodgingNames };
      delete lodgingNames[target.role];
      updatedRecords.push(await updateRecord('timelineDays', target.record.id, { lodgingNames }));
    }
  } else {
    for (const target of linkedTargets) {
      updatedRecords.push(await updateRecord('timelineDays', target.record.id, {
        lodgingNames: { ...(target.record.lodgingNames || {}), [target.role]: name }
      }));
    }
  }
  const updatedById = new Map(updatedRecords.map(item => [String(item.id), item]));
  state.timelineDays = state.timelineDays.map(item => updatedById.get(String(item.id)) || item);
  const popup = $('#trip-map-photo-popup');
  if (popup) popup.hidden = true;
  closeLodgingNameDialog();
  renderTripMap();
}

function closeMapPointDialog() {
  const dialog = $('#map-point-dialog');
  if (dialog && dialog.open && dialog.close) dialog.close();
  else if (dialog) dialog.removeAttribute('open');
  activeMapPointContext = null;
}

function currentMapPointTrip() {
  const trips = mapScopedTrips(gastosForSelectorTripScope('#map-viaje'));
  return trips.length === 1 ? trips[0] : null;
}

function mapPointDefaultDate(trip) {
  if (tripMapState.day) return tripMapState.day;
  const today = currentLocalDate();
  if ((!trip.fechaInicio || today >= trip.fechaInicio) && (!trip.fechaFin || today <= trip.fechaFin)) return today;
  return trip.fechaInicio || today;
}

function mapPointTripCityIds(trip, date = '', ignoreEntryId = 0) {
  if (!trip) return [];
  const tripId = Number(trip.id);
  const ids = new Set(date ? [] : tripCityIds(trip).map(Number).filter(Boolean));
  state.gastos
    .filter(item => Number(item.viajeId) === tripId && (!date || item.fecha === date))
    .forEach(item => {
      if (Number(item.ciudadId)) ids.add(Number(item.ciudadId));
    });
  state.blogEntries
    .filter(item => Number(item.viajeId) === tripId
      && Number(item.id) !== Number(ignoreEntryId)
      && (!date || item.fecha === date))
    .forEach(item => {
      if (Number(item.ciudadId)) ids.add(Number(item.ciudadId));
    });
  tripRouteStops(trip)
    .filter(stop => !date || stop.date === date)
    .forEach(stop => {
      if (Number(stop.cityId)) ids.add(Number(stop.cityId));
    });
  return [...ids];
}

function mapPointTripCities(trip) {
  const ids = new Set(mapPointTripCityIds(trip));
  state.gastos
    .filter(item => Number(item.viajeId) === Number(trip && trip.id))
    .forEach(item => {
      if (Number(item.ciudadId)) ids.add(Number(item.ciudadId));
    });
  state.blogEntries
    .filter(item => Number(item.viajeId) === Number(trip && trip.id))
    .forEach(item => {
      if (Number(item.ciudadId)) ids.add(Number(item.ciudadId));
    });
  return [...ids]
    .map(id => state.lugares.find(place => Number(place.id) === id))
    .filter(city => city && !isTransitPlaceName(city.nombre))
    .sort(byName);
}

function nearestTripCityForPoint(trip, point, options = {}) {
  if (!trip || !point) return null;
  const datedIds = new Set(mapPointTripCityIds(trip, String(options.date || ''), options.ignoreEntryId));
  const candidates = mapPointTripCities(trip)
    .filter(city => lugarHasCoords(city))
    .map(city => ({
      city,
      dated: datedIds.has(Number(city.id)),
      distance: geographicDistanceMeters(
        point,
        { latitude: Number(city.lat), longitude: Number(city.lng) }
      )
    }))
    .sort((a, b) => a.distance - b.distance || Number(b.dated) - Number(a.dated));
  return candidates[0]?.city || null;
}

function accommodationCandidateMatchesCity(tripId, cityId, point) {
  const trip = state.viajes.find(item => Number(item.id) === Number(tripId));
  const assignedCity = state.lugares.find(item => Number(item.id) === Number(cityId));
  if (!trip || !assignedCity || !lugarHasCoords(assignedCity) || !point) return true;
  const nearestCity = nearestTripCityForPoint(trip, point);
  if (!nearestCity || Number(nearestCity.id) === Number(cityId) || !lugarHasCoords(nearestCity)) return true;
  const assignedDistance = geographicDistanceMeters(point, {
    latitude: Number(assignedCity.lat),
    longitude: Number(assignedCity.lng)
  });
  const nearestDistance = geographicDistanceMeters(point, {
    latitude: Number(nearestCity.lat),
    longitude: Number(nearestCity.lng)
  });
  return assignedDistance - nearestDistance < TRIP_MAP_POINT_CITY_REASSIGN_GAIN_METERS;
}

function resolvedMapCoordinateCity(record, options = {}) {
  if (!record || record.mapCityManual === true && options.respectManual !== false) return record;
  const trip = state.viajes.find(item => Number(item.id) === Number(record.viajeId));
  const latitude = storedImageCoordinate(record.latitude, -90, 90);
  const longitude = storedImageCoordinate(record.longitude, -180, 180);
  const point = latitude == null || longitude == null ? null : { latitude, longitude };
  const city = trip && point
    ? nearestTripCityForPoint(trip, point, { date: record.fecha, ignoreEntryId: record.id || record.blogEntryId })
    : null;
  if (!city || Number(city.id) === Number(record.ciudadId)) return record;
  const storedCity = state.lugares.find(item => Number(item.id) === Number(record.ciudadId));
  if (storedCity && lugarHasCoords(storedCity)) {
    const storedDistance = geographicDistanceMeters(point, { latitude: Number(storedCity.lat), longitude: Number(storedCity.lng) });
    const suggestedDistance = geographicDistanceMeters(point, { latitude: Number(city.lat), longitude: Number(city.lng) });
    if (storedDistance - suggestedDistance < TRIP_MAP_POINT_CITY_REASSIGN_GAIN_METERS) return record;
  }
  return {
    ...record,
    ciudadId: Number(city.id),
    paisId: Number(city.parentId) || null,
    mapCityResolvedFromGps: true
  };
}

function resolvedManualMapPointEntry(entry) {
  if (!entry || entry.tipo !== 'punto' || entry.mapCityManual === true) return entry;
  return resolvedMapCoordinateCity(entry);
}

function resolvedMapPointEntry(entry) {
  if (!entry || !blogPointCoordinates(entry)) return entry;
  return entry.tipo === 'punto'
    ? resolvedManualMapPointEntry(entry)
    : resolvedMapCoordinateCity(entry);
}

function renderMapPointCityOptions(trip, cityId = null) {
  const select = $('#map-point-city');
  if (!select) return;
  const cities = mapPointTripCities(trip);
  const selected = Number(cityId) || 0;
  const selectedCity = selected ? state.lugares.find(item => Number(item.id) === selected) : null;
  if (selectedCity && !cities.some(item => Number(item.id) === selected)) cities.push(selectedCity);
  cities.sort(byName);
  select.innerHTML = `<option value="">Sin localidad</option>${cities.map(city => `<option value="${Number(city.id)}"${Number(city.id) === selected ? ' selected' : ''}>${escapeHtml(city.nombre)}</option>`).join('')}`;
}

function openMapPointDialog(context = {}) {
  const dialog = $('#map-point-dialog');
  const input = $('#map-point-name');
  if (!dialog || !input) return;
  const editing = Number(context.entryId) > 0;
  const trip = editing
    ? state.viajes.find(item => Number(item.id) === Number(context.tripId))
    : currentMapPointTrip();
  if (!trip) {
    alert('Selecciona un solo viaje antes de añadir un punto al mapa.');
    return;
  }
  const latitude = blogPointCoordinate(context.latitude, -90, 90);
  const longitude = blogPointCoordinate(context.longitude, -180, 180);
  if (latitude == null || longitude == null) return;
  const pointDate = String(context.date || mapPointDefaultDate(trip));
  const storedCity = context.cityId
    ? state.lugares.find(item => Number(item.id) === Number(context.cityId))
    : null;
  const suggestedCity = nearestTripCityForPoint(trip, { latitude, longitude }, {
    date: pointDate,
    ignoreEntryId: context.entryId
  });
  const city = context.cityManual === true ? storedCity : (suggestedCity || storedCity);
  activeMapPointContext = {
    mode: editing ? 'edit' : 'add',
    entryId: editing ? Number(context.entryId) : null,
    tripId: Number(trip.id),
    cityId: city ? Number(city.id) : null,
    countryId: city ? Number(city.parentId) || null : null,
    cityManual: context.cityManual === true,
    date: pointDate,
    latitude,
    longitude
  };
  $('#map-point-title').textContent = editing ? 'Editar punto' : '¿Añadir este punto?';
  $('#map-point-save').textContent = editing ? 'Guardar cambios' : 'Añadir punto';
  $('#map-point-delete').hidden = !editing;
  $('#map-point-save').disabled = false;
  $('#map-point-date-fields').hidden = editing;
  $('#map-point-location').textContent = editing
    ? `Punto de ${trip.nombre}${city ? ` · ${city.nombre}` : ''}.`
    : `${trip.nombre}${city ? ` · cerca de ${city.nombre}` : ''} · ${latitude.toFixed(6)}, ${longitude.toFixed(6)}.`;
  input.value = String(context.name || '');
  renderMapPointCityOptions(trip, city && city.id);
  $('#map-point-date').value = pointDate;
  $('#map-point-time').value = String(context.time || currentLocalTime()).slice(0, 5);
  setMessage('#msg-map-point', '');
  if (!dialog.open) {
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }
  setTimeout(() => input.focus(), 0);
}

async function saveMapPoint() {
  const context = activeMapPointContext;
  if (!context) return;
  const name = String($('#map-point-name') && $('#map-point-name').value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!name) throw new Error('Escribe un nombre para el punto');
  const selectedCityId = Number($('#map-point-city') && $('#map-point-city').value) || null;
  const selectedCity = selectedCityId
    ? state.lugares.find(item => Number(item.id) === selectedCityId)
    : null;
  const locationPatch = {
    ciudadId: selectedCity ? Number(selectedCity.id) : null,
    paisId: selectedCity ? Number(selectedCity.parentId) || null : null,
    mapCityManual: context.cityManual === true
  };
  if (context.mode === 'edit') {
    const entry = state.blogEntries.find(item => Number(item.id) === Number(context.entryId) && item.tipo === 'punto');
    if (!entry) throw new Error('No se encuentra el punto que quieres editar');
    await updateBlogEntry(entry.id, { descripcion: name, ...locationPatch });
  } else {
    const trip = state.viajes.find(item => Number(item.id) === Number(context.tripId));
    if (!trip) throw new Error('El viaje seleccionado ya no existe');
    const date = String($('#map-point-date') && $('#map-point-date').value || '');
    const time = String($('#map-point-time') && $('#map-point-time').value || '').slice(0, 5);
    if (!date) throw new Error('Indica la fecha del punto');
    if ((trip.fechaInicio && date < trip.fechaInicio) || (trip.fechaFin && date > trip.fechaFin)) {
      throw new Error('La fecha debe estar dentro del viaje');
    }
    await addBlogEntry({
      viajeId: trip.id,
      fecha: date,
      hora: time || currentLocalTime(),
      tipo: 'punto',
      descripcion: name,
      ...locationPatch,
      latitude: context.latitude,
      longitude: context.longitude,
      wordpressIncluded: true
    });
  }
  tripMapState.preserveViewportOnNextRender = true;
  closeMapPointDialog();
  await loadAll();
  setTab('mapa');
}

async function deleteMapPoint(context = activeMapPointContext) {
  if (!context || Number(context.entryId) <= 0) return;
  const entry = state.blogEntries.find(item => Number(item.id) === Number(context.entryId) && item.tipo === 'punto');
  if (!entry) throw new Error('No se encuentra el punto que quieres eliminar');
  const name = String(entry.descripcion || context.name || 'este punto');
  if (!confirm(`¿Eliminar «${name}» del mapa y del Blog?`)) return;
  await delBlogEntry(entry.id);
  tripMapState.preserveViewportOnNextRender = true;
  const popup = $('#trip-map-photo-popup');
  if (popup) popup.hidden = true;
  closeMapPointDialog();
  await loadAll();
  setTab('mapa');
}

async function moveMapPoint(context, latitude, longitude) {
  if (!context || Number(context.entryId) <= 0) return;
  const entry = state.blogEntries.find(item => Number(item.id) === Number(context.entryId) && item.tipo === 'punto');
  if (!entry) throw new Error('No se encuentra el punto que quieres mover');
  const point = {
    latitude: blogPointCoordinate(latitude, -90, 90),
    longitude: blogPointCoordinate(longitude, -180, 180)
  };
  if (point.latitude == null || point.longitude == null) throw new Error('La nueva posición no es válida');
  const trip = state.viajes.find(item => Number(item.id) === Number(entry.viajeId));
  const city = entry.mapCityManual === true
    ? state.lugares.find(item => Number(item.id) === Number(entry.ciudadId))
    : nearestTripCityForPoint(trip, point, { date: entry.fecha, ignoreEntryId: entry.id });
  tripMapState.preserveViewportOnNextRender = true;
  await updateBlogEntry(entry.id, {
    latitude: point.latitude,
    longitude: point.longitude,
    ciudadId: city ? Number(city.id) : null,
    paisId: city ? Number(city.parentId) || null : null
  });
  closeTripMapPhotoPopup();
  await loadAll();
  setTab('mapa');
}

async function moveMapCity(context, latitude, longitude) {
  const cityId = Number(context && context.cityId);
  const city = state.lugares.find(item => Number(item.id) === cityId && Number(item.parentId) > 0);
  if (!city) throw new Error('No se encuentra la localidad que quieres mover');
  const point = {
    latitude: blogPointCoordinate(latitude, -90, 90),
    longitude: blogPointCoordinate(longitude, -180, 180)
  };
  if (point.latitude == null || point.longitude == null) throw new Error('La nueva posición no es válida');
  tripMapState.preserveViewportOnNextRender = true;
  await updateLugar(city.id, { lat: point.latitude, lng: point.longitude });
  closeTripMapPhotoPopup();
  await loadAll();
  setTab('mapa');
  if ($('#trip-map-info')) $('#trip-map-info').textContent = `Posición de ${city.nombre} actualizada manualmente.`;
}

function parseTimelineFileInWorker(file, trip) {
  if (typeof Worker !== 'function') {
    return file.text()
      .then(text => JSON.parse(text))
      .then(data => window.GoogleTimelineImport.importTrip(data, {
        startDate: trip.fechaInicio,
        endDate: trip.fechaFin || trip.fechaInicio
      }));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker('./timeline-import-worker.js?v=700v278');
    worker.addEventListener('message', event => {
      const payload = event.data || {};
      if (payload.type === 'status') {
        setTimelineMessage(payload.message || 'Analizando la Cronología de Maps…');
        return;
      }
      worker.terminate();
      if (payload.type === 'complete') resolve(payload.result);
      else reject(new Error(payload.message || 'No se pudo analizar la Cronología de Maps.'));
    });
    worker.addEventListener('error', event => {
      worker.terminate();
      reject(new Error(event.message || 'No se pudo iniciar el lector de la Cronología de Maps.'));
    });
    worker.postMessage({
      file,
      trip: { startDate: trip.fechaInicio, endDate: trip.fechaFin || trip.fechaInicio }
    });
  });
}

async function importTimelineFile(file) {
  const trip = state.viajes.find(item => Number(item.id) === Number(activeTimelineTripId));
  if (!trip) throw new Error('Selecciona un viaje antes de importar la Cronología de Maps.');
  if (!file || !/\.json$/i.test(file.name || '')) throw new Error('Selecciona el archivo Cronología.json exportado por Google Maps.');
  const select = $('#timeline-select-file');
  if (select) select.disabled = true;
  setTimelineMessage(`Preparando ${file.name}…`);
  try {
    const result = await parseTimelineFileInWorker(file, trip);
    if (!result || !Array.isArray(result.days) || !result.days.length) {
      throw new Error(`La exportación no contiene recorridos entre ${summaryDocumentDate(trip.fechaInicio, true)} y ${summaryDocumentDate(trip.fechaFin, true)}.`);
    }
    const existing = timelineRecordsForTrip(trip.id);
    const existingByDate = new Map(existing.map(record => [record.fecha, record]));
    const lodgingNamesByDate = new Map(existing
      .filter(record => record.lodgingNames && Object.keys(record.lodgingNames).length)
      .map(record => [record.fecha, { ...record.lodgingNames }]));
    const importedDates = new Set(result.days.map(record => record.fecha));
    const changedDates = new Set();
    for (const record of existing) {
      if (!importedDates.has(record.fecha)) await deleteRecord('timelineDays', record.id);
    }
    const importedAt = new Date().toISOString();
    for (const record of result.days) {
      const previous = existingByDate.get(record.fecha);
      if (!previous || timelineRoutingRecordSignature(previous) !== timelineRoutingRecordSignature(record)) {
        changedDates.add(record.fecha);
      }
      await putRecord('timelineDays', {
        ...record,
        id: `${trip.id}:${record.fecha}`,
        viajeId: Number(trip.id),
        source: 'google-maps-timeline',
        sourceName: file.name || 'Cronología.json',
        sourceSize: Number(file.size || 0),
        sourceLastModified: Number(file.lastModified || 0),
        importedAt,
        lodgingNames: lodgingNamesByDate.get(record.fecha) || {},
        adjustedTimelineRoutes: previous && previous.adjustedTimelineRoutes || {}
      });
    }
    tripMapState.showTimeline = true;
    const autoAdjust = tripMapState.timelineRouteView === 'adjusted';
    const autoAdjustMode = timelineRoutingModeKey();
    await loadAll();
    activeTimelineTripId = Number(trip.id);
    let adjustedCount = 0;
    let adjustmentFailures = 0;
    if (autoAdjust && changedDates.size) {
      const changedRecords = timelineRecordsForTrip(trip.id).filter(record => changedDates.has(record.fecha));
      timelineBulkRoutingActive = true;
      timelineBulkRoutingCancelled = false;
      renderTimelineDialog();
      for (let index = 0; index < changedRecords.length; index += 1) {
        const record = changedRecords[index];
        try {
          await adjustSelectedTimelineDay({
            trip,
            record,
            mode: autoAdjustMode,
            silent: true,
            bulk: true,
            progressPrefix: `Actualizando ${blogDayDateLabel(record.fecha)}`
          });
          adjustedCount += 1;
        } catch (error) {
          adjustmentFailures += 1;
        }
      }
      timelineBulkRoutingActive = false;
      timelineBulkRoutingCancelled = false;
      tripMapState.timelineRouteView = 'adjusted';
    }
    resetTripMapView();
    renderTripMap();
    renderTimelineDialog();
    const adjustmentText = autoAdjust && changedDates.size
      ? ` Ajuste automático: ${adjustedCount} ${adjustedCount === 1 ? 'día recalculado' : 'días recalculados'}${adjustmentFailures ? ` y ${adjustmentFailures} sin recalcular` : ''}.`
      : '';
    setTimelineMessage(`Importación terminada: ${result.summary.dayCount} días y ${result.summary.pointCount} puntos del recorrido.${adjustmentText}`);
  } finally {
    if (select) select.disabled = false;
  }
}

async function deleteImportedTimeline() {
  const trip = state.viajes.find(item => Number(item.id) === Number(activeTimelineTripId));
  if (!trip) return;
  if (!confirm(`¿Eliminar la Cronología de Maps importada de ${trip.nombre}? Los gastos, fotos y entradas del Blog no se modificarán.`)) return;
  for (const record of timelineRecordsForTrip(trip.id)) await deleteRecord('timelineDays', record.id);
  await loadAll();
  activeTimelineTripId = Number(trip.id);
  resetTripMapView();
  renderTripMap();
  renderTimelineDialog();
  setTimelineMessage('Cronología de Maps eliminada de este viaje.');
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

function accountForBackup(account) {
  const { presupuesto: _legacyAccountLimit, ...data } = account || {};
  return data;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'Automático según movimientos' },
  { value: 'base', label: 'Cuenta base' },
  { value: 'rechargeable', label: 'Tarjeta recargable' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'standard', label: 'Cuenta normal' }
];

function normalizeAccountType(value) {
  const type = String(value || '').trim().toLowerCase();
  return ACCOUNT_TYPE_OPTIONS.some(option => option.value === type) ? type : '';
}

function accountTransferProfile(account) {
  return state.transferencias.reduce((profile, transfer) => {
    if (Number(transfer.fromId) === Number(account.id)) {
      profile.outgoingCount += 1;
      profile.outgoingEur += toEur(transfer.importeFrom, transfer.monedaFrom || account.moneda);
    }
    if (Number(transfer.toId) === Number(account.id)) {
      profile.incomingCount += 1;
      profile.incomingEur += toEur(transfer.importeTo, transfer.monedaTo || account.moneda);
    }
    return profile;
  }, { incomingCount: 0, outgoingCount: 0, incomingEur: 0, outgoingEur: 0 });
}

function inferredAccountType(account) {
  const explicit = normalizeAccountType(account && account.accountType);
  if (explicit) return explicit;
  const normalizedName = normalizePlaceName(account && account.nombre);
  if (/\b(efectivo|cash|metalico)\b/.test(normalizedName)) return 'cash';
  const profile = accountTransferProfile(account || {});
  if (profile.incomingCount > 0 && profile.incomingEur > profile.outgoingEur * 1.25 + 0.01) return 'rechargeable';
  if (profile.outgoingCount > 0 && profile.outgoingEur > profile.incomingEur * 1.25 + 0.01) return 'base';
  return 'standard';
}

function accountTypeLabel(account, includeDetection = false) {
  const explicit = normalizeAccountType(account && account.accountType);
  const type = explicit || inferredAccountType(account);
  const option = ACCOUNT_TYPE_OPTIONS.find(item => item.value === type);
  const label = option ? option.label : 'Cuenta normal';
  return includeDetection && !explicit ? `${label} (detectada)` : label;
}

function effectiveTripBudget(viaje) {
  return Math.max(0, numberValue(viaje && viaje.presupuesto));
}

function percentageOfTotal(value, total) {
  const denominator = numberValue(total);
  return denominator ? numberValue(value) * 100 / denominator : 0;
}

function selectedTrips() {
  const ids = selectedTripSet();
  return ids.size ? state.viajes.filter(v => ids.has(Number(v.id))) : [];
}

function inclusiveDateDays(start, end) {
  if (!start || !end) return 0;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return 0;
  return Math.floor((endTime - startTime) / 86400000) + 1;
}

function tripDailyExpenseAverage(totalEur, days) {
  const dayCount = Number(days);
  if (!Number.isFinite(dayCount) || dayCount <= 0) return null;
  return (Number(totalEur) || 0) / dayCount;
}

function comparisonTripDate(trip) {
  return (trip && (trip.fechaFin || trip.fechaInicio)) || '';
}

function sortedTripsForComparison() {
  return state.viajes.slice().sort((a, b) =>
    comparisonTripDate(b).localeCompare(comparisonTripDate(a))
    || (b.fechaInicio || '').localeCompare(a.fechaInicio || '')
    || Number(b.id || 0) - Number(a.id || 0));
}

function comparisonTripOptionLabel(trip) {
  const year = getTripYear(trip);
  return `${trip.nombre} · ${year}`;
}

function renderTripComparisonSelectors() {
  const mainSelect = $('#compare-main-trip');
  const otherSelect = $('#compare-other-trip');
  if (!mainSelect || !otherSelect) return;
  const trips = sortedTripsForComparison();
  const currentMainId = Number(mainSelect.value);
  const currentOtherId = Number(otherSelect.value);
  const validMainId = trips.some(trip => Number(trip.id) === currentMainId)
    ? currentMainId
    : Number(trips[0] && trips[0].id);
  const tripOptions = trips.map(trip => ({
    value: String(trip.id),
    label: comparisonTripOptionLabel(trip)
  }));
  fillSelect('#compare-main-trip', tripOptions, trips.length ? null : '(sin viajes)');
  mainSelect.value = validMainId ? String(validMainId) : '';
  fillSelect('#compare-other-trip', tripOptions.filter(option => Number(option.value) !== validMainId), '(elige otro viaje)');
  otherSelect.value = currentOtherId && currentOtherId !== validMainId
    && trips.some(trip => Number(trip.id) === currentOtherId)
    ? String(currentOtherId)
    : '';
  mainSelect.disabled = trips.length === 0;
  otherSelect.disabled = trips.length < 2;
  const swap = $('#compare-swap');
  if (swap) swap.disabled = !validMainId || !Number(otherSelect.value);
}

function buildTripComparisonData(tripId) {
  const trip = state.viajes.find(item => Number(item.id) === Number(tripId));
  if (!trip) return null;
  const expenses = state.gastos.filter(expense => Number(expense.viajeId) === Number(trip.id));
  const total = expenses.reduce((sum, expense) => sum + toEur(expense.importe, expense.moneda), 0);
  const days = inclusiveDateDays(trip.fechaInicio, trip.fechaFin);
  const dailyAverage = tripDailyExpenseAverage(total, days);
  const budget = effectiveTripBudget(trip);
  const breakdown = new Map();
  expenses.forEach(expense => {
    const category = state.categorias.find(item => Number(item.id) === Number(expense.catId));
    const subcategory = state.categorias.find(item => Number(item.id) === Number(expense.subcatId));
    const categoryKey = category ? `category-${category.id}` : 'category-none';
    const categoryItem = breakdown.get(categoryKey) || {
      key: categoryKey,
      label: category ? category.nombre : '(sin categoría)',
      total: 0,
      subcategories: new Map()
    };
    const amount = toEur(expense.importe, expense.moneda);
    categoryItem.total += amount;
    const subcategoryKey = subcategory ? `subcategory-${subcategory.id}` : 'subcategory-none';
    const subcategoryItem = categoryItem.subcategories.get(subcategoryKey) || {
      key: subcategoryKey,
      label: subcategory ? subcategory.nombre : '(sin subcategoría)',
      total: 0
    };
    subcategoryItem.total += amount;
    categoryItem.subcategories.set(subcategoryKey, subcategoryItem);
    breakdown.set(categoryKey, categoryItem);
  });
  return {
    trip,
    expenses,
    total,
    days,
    dailyAverage,
    budget,
    remaining: budget > 0 ? budget - total : null,
    budgetPct: budget > 0 ? total * 100 / budget : null,
    breakdown
  };
}

function comparisonDeltaClass(value) {
  const amount = numberValue(value);
  if (Math.abs(amount) < 0.005) return 'comparison-delta-neutral';
  return amount > 0 ? 'comparison-delta-positive' : 'comparison-delta-negative';
}

function formatSignedCurrency(value) {
  const amount = numberValue(value);
  if (Math.abs(amount) < 0.005) return fmtCurrency(0, 'EUR');
  return `${amount > 0 ? '+' : '−'}${fmtCurrency(Math.abs(amount), 'EUR')}`;
}

function formatSignedNumber(value, suffix = '') {
  const amount = numberValue(value);
  if (Math.abs(amount) < 0.005) return `0${suffix}`;
  return `${amount > 0 ? '+' : '−'}${Math.abs(amount).toLocaleString('es-ES', { maximumFractionDigits: 1 })}${suffix}`;
}

function comparisonAmountCell(value, tripTotal, days) {
  const share = tripTotal ? value * 100 / tripTotal : 0;
  return `<strong>${fmtCurrency(value, 'EUR')}</strong><span class="comparison-share">${share.toFixed(1)}% del viaje</span><span class="comparison-mobile-daily">${comparisonDailyCell(value, days)}</span>`;
}

function comparisonDifferenceCell(mainValue, otherValue, mainTripTotal, otherTripTotal, mainDays, otherDays) {
  const difference = mainValue - otherValue;
  const mainShare = mainTripTotal ? mainValue * 100 / mainTripTotal : 0;
  const otherShare = otherTripTotal ? otherValue * 100 / otherTripTotal : 0;
  const mainDaily = tripDailyExpenseAverage(mainValue, mainDays);
  const otherDaily = tripDailyExpenseAverage(otherValue, otherDays);
  const dailyDifference = mainDaily === null || otherDaily === null ? null : mainDaily - otherDaily;
  return `<strong>${formatSignedCurrency(difference)}</strong><span class="comparison-share-difference">${formatSignedNumber(mainShare - otherShare, ' puntos del viaje')}</span><span class="comparison-daily-difference">${dailyDifference === null ? '-' : `${formatSignedCurrency(dailyDifference)}/día`}</span>`;
}

function comparisonDailyCell(value, days) {
  const daily = tripDailyExpenseAverage(value, days);
  return daily === null ? '-' : `${fmtCurrency(daily, 'EUR')}/día`;
}

function comparisonMetricRow(label, mainValue, otherValue, difference, differenceClass = '') {
  return `<tr><th scope="row">${escapeHtml(label)}</th><td>${mainValue}</td><td>${otherValue}</td><td${differenceClass ? ` class="${differenceClass}"` : ''}>${difference}</td></tr>`;
}

function renderTripComparison() {
  const results = $('#comparison-results');
  const message = $('#comparison-message');
  const mainSelect = $('#compare-main-trip');
  const otherSelect = $('#compare-other-trip');
  const generalBody = $('#tabla-comparacion-general tbody');
  const categoryBody = $('#tabla-comparacion-categorias tbody');
  if (!results || !message || !mainSelect || !otherSelect || !generalBody || !categoryBody) return;
  const main = buildTripComparisonData(Number(mainSelect.value));
  const other = buildTripComparisonData(Number(otherSelect.value));
  const swap = $('#compare-swap');
  if (swap) swap.disabled = !main || !other;
  if (!main || !other) {
    results.hidden = true;
    message.hidden = false;
    message.textContent = state.viajes.length < 2
      ? 'Hace falta tener al menos dos viajes para compararlos.'
      : 'Elige un segundo viaje para compararlo con el principal.';
    return;
  }
  message.hidden = true;
  results.hidden = false;
  const mainLabel = comparisonTripOptionLabel(main.trip);
  const otherLabel = comparisonTripOptionLabel(other.trip);
  ['#comparison-main-heading', '#comparison-category-main-heading'].forEach(selector => {
    if ($(selector)) {
      $(selector).textContent = mainLabel;
      $(selector).dataset.mobileLabel = 'Principal';
    }
  });
  ['#comparison-other-heading', '#comparison-category-other-heading'].forEach(selector => {
    if ($(selector)) {
      $(selector).textContent = otherLabel;
      $(selector).dataset.mobileLabel = 'Comparado';
    }
  });
  const totalDifference = main.total - other.total;
  const daysDifference = main.days - other.days;
  const mainDaily = main.dailyAverage === null ? 0 : main.dailyAverage;
  const otherDaily = other.dailyAverage === null ? 0 : other.dailyAverage;
  const dailyDifference = mainDaily - otherDaily;
  const rows = [
    comparisonMetricRow('Gasto total', fmtCurrency(main.total, 'EUR'), fmtCurrency(other.total, 'EUR'), formatSignedCurrency(totalDifference), comparisonDeltaClass(totalDifference)),
    comparisonMetricRow('Duración', `${main.days} ${main.days === 1 ? 'día' : 'días'}`, `${other.days} ${other.days === 1 ? 'día' : 'días'}`, formatSignedNumber(daysDifference, daysDifference === 1 || daysDifference === -1 ? ' día' : ' días'), comparisonDeltaClass(daysDifference)),
    comparisonMetricRow('Media diaria', main.dailyAverage === null ? '-' : `${fmtCurrency(main.dailyAverage, 'EUR')}/día`, other.dailyAverage === null ? '-' : `${fmtCurrency(other.dailyAverage, 'EUR')}/día`, formatSignedCurrency(dailyDifference), comparisonDeltaClass(dailyDifference))
  ];
  if (main.budgetPct !== null || other.budgetPct !== null) {
    const budgetDifference = numberValue(main.budgetPct) - numberValue(other.budgetPct);
    rows.push(comparisonMetricRow(
      'Presupuesto usado',
      main.budgetPct === null ? '-' : `${main.budgetPct.toFixed(1)}%`,
      other.budgetPct === null ? '-' : `${other.budgetPct.toFixed(1)}%`,
      main.budgetPct === null || other.budgetPct === null ? '-' : formatSignedNumber(budgetDifference, ' puntos'),
      main.budgetPct === null || other.budgetPct === null ? '' : comparisonDeltaClass(budgetDifference)
    ));
  }
  if (main.remaining !== null || other.remaining !== null) {
    const remainingDifference = numberValue(main.remaining) - numberValue(other.remaining);
    rows.push(comparisonMetricRow(
      'Presupuesto restante',
      main.remaining === null ? '-' : fmtCurrency(main.remaining, 'EUR'),
      other.remaining === null ? '-' : fmtCurrency(other.remaining, 'EUR'),
      main.remaining === null || other.remaining === null ? '-' : formatSignedCurrency(remainingDifference),
      main.remaining === null || other.remaining === null ? '' : comparisonDeltaClass(remainingDifference)
    ));
  }
  generalBody.innerHTML = rows.join('');

  const categoryKeys = new Set([...main.breakdown.keys(), ...other.breakdown.keys()]);
  const categories = [...categoryKeys].map(key => {
    const mainCategory = main.breakdown.get(key);
    const otherCategory = other.breakdown.get(key);
    return {
      key,
      label: (mainCategory || otherCategory).label,
      mainTotal: mainCategory ? mainCategory.total : 0,
      otherTotal: otherCategory ? otherCategory.total : 0,
      mainSubcategories: mainCategory ? mainCategory.subcategories : new Map(),
      otherSubcategories: otherCategory ? otherCategory.subcategories : new Map()
    };
  }).sort((a, b) => Math.max(Math.abs(b.mainTotal), Math.abs(b.otherTotal)) - Math.max(Math.abs(a.mainTotal), Math.abs(a.otherTotal)) || collator.compare(a.label, b.label));
  const categoryRows = [];
  categories.forEach(category => {
    const subcategoryKeys = new Set([...category.mainSubcategories.keys(), ...category.otherSubcategories.keys()]);
    const isOpen = openComparisonCategories.has(category.key);
    const categoryLabel = subcategoryKeys.size
      ? `<button type="button" class="comparison-category-toggle" data-comparison-category="${escapeHtml(category.key)}" aria-expanded="${isOpen}"><span aria-hidden="true">${isOpen ? '−' : '+'}</span>${escapeHtml(category.label)}</button>`
      : escapeHtml(category.label);
    const difference = category.mainTotal - category.otherTotal;
    categoryRows.push(`<tr class="comparison-category-row"><th scope="row">${categoryLabel}</th><td>${comparisonAmountCell(category.mainTotal, main.total, main.days)}</td><td>${comparisonAmountCell(category.otherTotal, other.total, other.days)}</td><td class="${comparisonDeltaClass(difference)}">${comparisonDifferenceCell(category.mainTotal, category.otherTotal, main.total, other.total, main.days, other.days)}</td><td>${comparisonDailyCell(category.mainTotal, main.days)}</td><td>${comparisonDailyCell(category.otherTotal, other.days)}</td></tr>`);
    [...subcategoryKeys].map(key => {
      const mainSubcategory = category.mainSubcategories.get(key);
      const otherSubcategory = category.otherSubcategories.get(key);
      return {
        key,
        label: (mainSubcategory || otherSubcategory).label,
        mainTotal: mainSubcategory ? mainSubcategory.total : 0,
        otherTotal: otherSubcategory ? otherSubcategory.total : 0
      };
    }).sort((a, b) => Math.max(Math.abs(b.mainTotal), Math.abs(b.otherTotal)) - Math.max(Math.abs(a.mainTotal), Math.abs(a.otherTotal)) || collator.compare(a.label, b.label)).forEach(subcategory => {
      const subDifference = subcategory.mainTotal - subcategory.otherTotal;
      categoryRows.push(`<tr class="comparison-subcategory-row"${isOpen ? '' : ' hidden'}><th scope="row">${escapeHtml(subcategory.label)}</th><td>${comparisonAmountCell(subcategory.mainTotal, main.total, main.days)}</td><td>${comparisonAmountCell(subcategory.otherTotal, other.total, other.days)}</td><td class="${comparisonDeltaClass(subDifference)}">${comparisonDifferenceCell(subcategory.mainTotal, subcategory.otherTotal, main.total, other.total, main.days, other.days)}</td><td>${comparisonDailyCell(subcategory.mainTotal, main.days)}</td><td>${comparisonDailyCell(subcategory.otherTotal, other.days)}</td></tr>`);
    });
  });
  const totalDifferenceForRow = main.total - other.total;
  categoryRows.push(`<tr class="subtotal-row comparison-total-row"><th scope="row">Total</th><td>${fmtCurrency(main.total, 'EUR')}</td><td>${fmtCurrency(other.total, 'EUR')}</td><td class="${comparisonDeltaClass(totalDifferenceForRow)}">${formatSignedCurrency(totalDifferenceForRow)}</td><td>${comparisonDailyCell(main.total, main.days)}</td><td>${comparisonDailyCell(other.total, other.days)}</td></tr>`);
  categoryBody.innerHTML = categoryRows.join('');
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
    return `<li><span class="backup-history-copy"><strong>${escapeHtml(item.filename || 'copia JSON')}</strong><span><b>${escapeHtml(backupReasonLabel(item.reason))}</b> · ${type} · ${date.toLocaleString('es-ES')}</span></span><button class="ghost compact-button" type="button" data-download-local-backup="${item.id}">Copiar a carpeta local</button></li>`;
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

function compareTransferenciasChronologically(a, b) {
  return (a.fecha || '').localeCompare(b.fecha || '')
    || Number(a.id || 0) - Number(b.id || 0);
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

function fileLooksLikeImage(file) {
  const type = String(file && file.type || '').toLowerCase();
  const name = String(file && file.name || '').toLowerCase();
  return type.startsWith('image/') || /\.(?:jpe?g|png|webp|gif|bmp|svg)$/i.test(name);
}

async function readFileData(input, options = {}) {
  const file = input && input.files && input.files[0];
  if (!file) return Promise.resolve(null);
  if (options.compressImages !== false && fileLooksLikeImage(file)) {
    try {
      const image = await compressBlogImage(file, { skipMetadata: true });
      return {
        name: image.name,
        type: image.type,
        size: image.size,
        data: image.data,
        width: image.width,
        height: image.height,
        compressed: true
      };
    } catch (error) {
      console.warn('No se pudo compactar la imagen; se guardará el archivo original.', error);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: Number(file.size) || 0,
      data: reader.result
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function selectedFileInput(fileSelector, cameraSelector) {
  const camera = $(cameraSelector);
  if (camera && camera.files && camera.files.length) return camera;
  return $(fileSelector);
}

function deviceLocationFromPosition(position) {
  const latitude = storedImageCoordinate(position && position.coords && position.coords.latitude, -90, 90);
  const longitude = storedImageCoordinate(position && position.coords && position.coords.longitude, -180, 180);
  if (latitude == null || longitude == null) return null;
  return {
    latitude,
    longitude,
    accuracy: Math.max(0, Number(position.coords.accuracy) || 0),
    source: 'device',
    capturedAt: Number(position.timestamp) || Date.now()
  };
}

function requestCurrentDeviceLocation({ timeoutMs = 30_000, targetAccuracy = 80, onProgress = null } = {}) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('Este dispositivo no permite obtener la ubicación.'));
  }
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let best = null;
    let freshBest = null;
    let watchId = null;
    let settled = false;
    let timer = null;
    const clear = () => {
      if (timer) window.clearTimeout(timer);
      if (watchId != null && navigator.geolocation.clearWatch) navigator.geolocation.clearWatch(watchId);
    };
    const finish = (value, error = null) => {
      if (settled) return;
      settled = true;
      clear();
      if (error) reject(error);
      else resolve(value);
    };
    const accept = position => {
      if (settled) return;
      const location = deviceLocationFromPosition(position);
      if (!location) return;
      const accuracy = Number(location.accuracy) || Number.POSITIVE_INFINITY;
      const fresh = location.capturedAt >= startedAt - 15_000;
      const currentBest = fresh ? freshBest : best;
      const bestAccuracy = currentBest ? Number(currentBest.accuracy) || Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
      if (!currentBest || accuracy < bestAccuracy) {
        if (fresh) freshBest = location;
        else best = location;
      }
      const preferred = freshBest || best;
      if (typeof onProgress === 'function') onProgress(preferred);
      if (freshBest && (Number(freshBest.accuracy) || Number.POSITIVE_INFINITY) <= targetAccuracy) finish(freshBest);
    };
    const fail = error => {
      if (settled) return;
      if (error && error.code === 1) {
        finish(null, new Error('No se concedió permiso para usar la ubicación.'));
      }
    };
    const highAccuracyOptions = { enableHighAccuracy: true, timeout: 12_000, maximumAge: 120_000 };
    if (navigator.geolocation.watchPosition) {
      watchId = navigator.geolocation.watchPosition(accept, fail, highAccuracyOptions);
    } else {
      navigator.geolocation.getCurrentPosition(accept, fail, highAccuracyOptions);
    }
    navigator.geolocation.getCurrentPosition(accept, fail, {
      enableHighAccuracy: false,
      timeout: 4_000,
      maximumAge: 300_000
    });
    timer = window.setTimeout(() => {
      if (freshBest || best) finish(freshBest || best);
      else finish(null, new Error('No se pudo obtener la ubicación actual.'));
    }, timeoutMs);
  });
}

async function currentDeviceImageLocation() {
  if (lastCurrentImageLocation && Date.now() - lastCurrentImageLocation.capturedAt < 60_000) {
    return lastCurrentImageLocation;
  }
  if (currentImageLocationPromise) return currentImageLocationPromise;
  currentImageLocationPromise = requestCurrentDeviceLocation({ timeoutMs: 30_000, targetAccuracy: 100 })
    .then(location => {
      lastCurrentImageLocation = location;
      return location;
    })
    .catch(() => null)
    .finally(() => {
      currentImageLocationPromise = null;
    });
  return currentImageLocationPromise;
}

async function readImageMetadataForFile(file) {
  if (!file) return { point: null, captured: null };
  if (imageMetadataPromiseCache.has(file)) return imageMetadataPromiseCache.get(file);
  const metadataPromise = (async () => {
    let point = imageGpsCache.has(file) ? imageGpsCache.get(file) : null;
    let captured = imageDateTimeCache.has(file) ? imageDateTimeCache.get(file) : null;
    const type = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    const canContainExif = (!type || /jpe?g/.test(type) || /\.jpe?g$/.test(name))
      && typeof file.arrayBuffer === 'function';
    if ((!imageGpsCache.has(file) || !imageDateTimeCache.has(file)) && canContainExif) {
      try {
        imageLocationModulePromise ||= import('./image-location.js?v=700v278');
        const locationReader = await imageLocationModulePromise;
        const buffer = await file.arrayBuffer();
        const exifPoint = locationReader.extractImageGpsFromArrayBuffer(buffer);
        point = exifPoint ? { ...exifPoint, source: 'exif' } : null;
        captured = locationReader.extractImageDateTimeFromArrayBuffer(buffer) || null;
      } catch (error) {
        console.warn('No se pudieron leer los metadatos EXIF de la imagen', error);
      }
    }
    captured ||= fileModifiedDateTime(file);
    imageGpsCache.set(file, point);
    imageDateTimeCache.set(file, captured);
    return { point, captured };
  })();
  imageMetadataPromiseCache.set(file, metadataPromise);
  return metadataPromise;
}

async function imageGpsForFile(file, options = {}) {
  if (!file) return null;
  let point = imageGpsCache.has(file) ? imageGpsCache.get(file) : undefined;
  if (point === undefined) ({ point } = await readImageMetadataForFile(file));
  if (!point && options.useCurrentLocation) {
    point = await currentDeviceImageLocation();
    if (point) imageGpsCache.set(file, point);
  }
  return point;
}

function fileModifiedDateTime(file) {
  const timestamp = Number(file && file.lastModified);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return null;
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
    time: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  };
}

async function imageDateTimeForFile(file) {
  if (!file) return null;
  const { captured } = await readImageMetadataForFile(file);
  return captured;
}

function chooseImageDateTimeReplacement(message) {
  const dialog = $('#image-datetime-dialog');
  if (!dialog) return Promise.resolve(window.confirm(message));
  return new Promise(resolve => {
    const messageElement = $('#image-datetime-message');
    const keepButton = $('#image-datetime-keep');
    const replaceButton = $('#image-datetime-replace');
    let resolved = false;
    const finish = replace => {
      if (resolved) return;
      resolved = true;
      if (keepButton) keepButton.onclick = null;
      if (replaceButton) replaceButton.onclick = null;
      dialog.oncancel = null;
      if (dialog.close) dialog.close();
      else dialog.removeAttribute('open');
      resolve(replace);
    };
    if (messageElement) messageElement.textContent = message;
    if (keepButton) keepButton.onclick = () => finish(false);
    if (replaceButton) replaceButton.onclick = () => finish(true);
    dialog.oncancel = event => {
      event.preventDefault();
      finish(false);
    };
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', 'open');
  });
}

async function applyImageDateTimeToFields(image, dateSelector, timeSelector, ownerLabel) {
  if (!image) return false;
  const dateField = $(dateSelector);
  const timeField = $(timeSelector);
  const capturedDate = String(image.capturedDate || image.date || '');
  const capturedTime = String(image.capturedTime || image.time || '');
  if ((!capturedDate && !capturedTime) || (!dateField && !timeField)) return false;
  const currentDate = dateField ? String(dateField.value || '') : '';
  const currentTime = timeField ? String(timeField.value || '') : '';
  const hasConflict = Boolean(
    (capturedDate && currentDate && capturedDate !== currentDate)
    || (capturedTime && currentTime && capturedTime !== currentTime)
  );
  if (hasConflict) {
    const photoValue = `${capturedDate ? summaryDocumentDate(capturedDate, true) : 'sin fecha'}${capturedTime ? ` a las ${capturedTime}` : ''}`;
    const currentValue = `${currentDate ? summaryDocumentDate(currentDate, true) : 'sin fecha'}${currentTime ? ` a las ${currentTime}` : ''}`;
    const replace = await chooseImageDateTimeReplacement(`La foto de referencia es del ${photoValue}, pero ${ownerLabel} tiene ${currentValue}. ¿Quieres reemplazar su fecha y hora por las de la foto?`);
    if (!replace) return false;
  }
  if (capturedDate && dateField) dateField.value = capturedDate;
  if (capturedTime && timeField) timeField.value = capturedTime;
  return true;
}

async function applyExpenseImageDateTime(prefix, captured) {
  return applyImageDateTimeToFields(
    captured,
    `#${prefix}-fecha`,
    `#${prefix}-hora`,
    prefix === 'edit-gasto' ? 'el gasto guardado' : 'el gasto'
  );
}

function renderSelectedExpenseTicketPreview(prefix) {
  const preview = $(`#${prefix}-ticket-new-preview`);
  const rotate = $(`#${prefix}-ticket-new-rotate`);
  const image = pendingExpenseTicketPreviews[prefix];
  if (preview) {
    preview.replaceChildren();
    preview.hidden = !image?.data;
    if (image?.data) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'expense-ticket-preview-open';
      button.title = `Ampliar ${image.name || 'ticket seleccionado'}`;
      button.onclick = () => openImageViewer(image, image.name || 'Ticket seleccionado');
      const element = document.createElement('img');
      element.src = image.data;
      element.alt = `Vista previa de ${image.name || 'ticket seleccionado'}`;
      button.appendChild(element);
      preview.appendChild(button);
    }
  }
  if (rotate) rotate.hidden = !image?.data;
  renderExpenseTicketTranslation(prefix);
}

function ticketTranslationPatch(record = null) {
  return {
    ticketTranslationName: record?.name || '',
    ticketTranslationType: record?.type || '',
    ticketTranslationData: record?.data || '',
    ticketTranslationSize: Math.max(0, Number(record?.size) || 0),
    ticketTranslationWidth: Math.max(0, Number(record?.width) || 0),
    ticketTranslationHeight: Math.max(0, Number(record?.height) || 0),
    ticketTranslationText: String(record?.text || ''),
    ticketTranslationSourceLanguages: Array.isArray(record?.sourceLanguages) ? record.sourceLanguages.map(String) : [],
    ticketTranslationKind: record?.kind === 'secondary-ticket' ? 'secondary-ticket' : (record?.data ? 'translation' : '')
  };
}

function ticketTranslationRecordFromExpense(gasto) {
  const image = expenseTicketTranslationRecord(gasto);
  return image ? {
    ...image,
    text: String(gasto.ticketTranslationText || ''),
    sourceLanguages: Array.isArray(gasto.ticketTranslationSourceLanguages)
      ? gasto.ticketTranslationSourceLanguages.map(String)
      : [],
    kind: gasto.ticketTranslationKind === 'secondary-ticket' ? 'secondary-ticket' : 'translation'
  } : null;
}

function openTicketTranslationRecord(record) {
  if (!record?.data) throw new Error('No se encuentra la traducción del ticket');
  openImageViewer(record, record.kind === 'secondary-ticket' ? 'Segundo ticket' : 'Traducción del ticket');
}

function fillTicketTranslationPreview(container, record) {
  if (!container) return;
  container.replaceChildren();
  container.hidden = !record?.data;
  if (!record?.data) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'expense-ticket-preview-open';
  const secondary = record.kind === 'secondary-ticket';
  const label = secondary ? 'Segundo ticket' : 'Traducción';
  button.dataset.companionLabel = label;
  button.title = `Ampliar ${label.toLocaleLowerCase('es')}`;
  button.onclick = () => openTicketTranslationRecord(record);
  const image = document.createElement('img');
  image.src = record.data;
  image.alt = `Vista previa de ${label.toLocaleLowerCase('es')}`;
  button.append(image);
  container.append(button);
}

function renderExpenseTicketTranslation(prefix) {
  const record = pendingExpenseTicketTranslations[prefix];
  if (prefix === 'g') {
    fillTicketTranslationPreview($('#g-ticket-translation-preview'), record);
    return;
  }
  const hasReplacement = Boolean(selectedFileInput('#edit-gasto-ticket', '#edit-gasto-ticket-camera')?.files?.[0]);
  fillTicketTranslationPreview($('#edit-gasto-ticket-new-translation-preview'), hasReplacement ? record : null);
  fillTicketTranslationPreview($('#edit-gasto-ticket-translation-preview'), hasReplacement ? null : record);
}

async function readSelectedExpenseTicket(prefix) {
  const preview = pendingExpenseTicketPreviews[prefix];
  if (preview?.data) return { ...preview };
  return readFileData(selectedFileInput(`#${prefix}-ticket`, `#${prefix}-ticket-camera`));
}

async function rotateSelectedExpenseTicket(prefix, direction) {
  const current = pendingExpenseTicketPreviews[prefix];
  if (!current?.data) throw new Error('Selecciona o fotografía primero un ticket.');
  pendingExpenseTicketPreviews[prefix] = await rotateRasterImageRecord(current, direction);
  pendingTicketOcr[prefix] = null;
  pendingExpenseTicketTranslations[prefix] = null;
  renderSelectedExpenseTicketPreview(prefix);
  setTicketOcrStatus(prefix, 'Orientación cambiada. Puedes leer el ticket o guardar el gasto.');
}

function handleSelectedExpenseTicketRotation(prefix, direction) {
  const buttons = $$(`[data-selected-ticket-rotate="${prefix}"]`);
  buttons.forEach(button => { button.disabled = true; });
  queueExpenseMediaSave(() => rotateSelectedExpenseTicket(prefix, direction))
    .catch(error => setMessage(prefix === 'g' ? '#msg-gasto' : '#msg-edit-gasto', error.message || String(error), true))
    .finally(() => buttons.forEach(button => { button.disabled = false; }));
}

function clearExpenseTicketSelection(prefix) {
  ticketOcrRunIds[prefix] = (ticketOcrRunIds[prefix] || 0) + 1;
  const file = $(`#${prefix}-ticket`);
  const camera = $(`#${prefix}-ticket-camera`);
  const status = $(`#${prefix}-ticket-selected`);
  if (file) file.value = '';
  if (camera) camera.value = '';
  if (status) {
    const keepsCurrent = prefix === 'edit-gasto' && currentEditTicket()?.ticketData && !$('#edit-gasto-ticket-remove')?.checked;
    status.textContent = keepsCurrent
      ? 'El ticket actual se conserva. Usa Elegir archivo o Cámara solo para sustituirlo.'
      : prefix === 'edit-gasto'
        ? 'Este gasto quedará sin ticket salvo que elijas un archivo o uses la cámara.'
        : 'El ticket es opcional. Elige archivo o Cámara para añadirlo.';
  }
  pendingExpenseTicketLocations[prefix] = null;
  pendingExpenseTicketLocationChecks[prefix] = Promise.resolve();
  const mapOption = $(`#${prefix}-ticket-map-option`);
  const mapCheckbox = $(`#${prefix}-ticket-map`);
  if (mapOption) mapOption.hidden = true;
  if (mapCheckbox) mapCheckbox.checked = false;
  const typeSelect = $(`#${prefix}-ticket-type`);
  if (typeSelect) typeSelect.value = '';
  pendingExpenseTicketPreviews[prefix] = null;
  pendingExpenseTicketTranslations[prefix] = null;
  renderSelectedExpenseTicketPreview(prefix);
  pendingTicketOcr[prefix] = null;
  setTicketOcrStatus(prefix, '');
  syncTicketOcrAvailability(prefix);
  syncExpenseTicketTypeAvailability(prefix);
}

function syncExpenseTicketMapOption(prefix, point, checked = false) {
  const option = $(`#${prefix}-ticket-map-option`);
  const checkbox = $(`#${prefix}-ticket-map`);
  if (option) option.hidden = !point;
  if (checkbox) checkbox.checked = Boolean(point && checked);
}

function syncExpenseTicketTypeAvailability(prefix) {
  const select = $(`#${prefix}-ticket-type`);
  if (!select) return;
  const selectedTicket = selectedFileInput(`#${prefix}-ticket`, `#${prefix}-ticket-camera`);
  const currentTicket = prefix === 'edit-gasto' && !$('#edit-gasto-ticket-remove')?.checked
    ? currentEditTicket()
    : null;
  select.disabled = !selectedTicket && !currentTicket?.ticketData;
}

function expenseExtraImageInputs(prefix) {
  return {
    file: $(`#${prefix}-extra-images`),
    camera: $(`#${prefix}-extra-images-camera`),
    status: $(`#${prefix}-extra-images-selected`),
    classifications: $(`#${prefix}-extra-images-classifications`),
    mapOption: $(`#${prefix}-extra-images-map-option`),
    mapCheckbox: $(`#${prefix}-extra-images-map`)
  };
}

function setMapOptionText(label, text) {
  if (!label) return;
  const textNode = Array.from(label.childNodes).find(node => node.nodeType === 3);
  if (textNode) textNode.textContent = ` ${text}`;
  else label.append(document.createTextNode(` ${text}`));
}

function selectedExpenseExtraImageFiles(prefix) {
  return selectedExpenseExtraImageRecords(prefix).map(record => record.file);
}

function selectedExpenseExtraImageRecords(prefix) {
  const inputs = expenseExtraImageInputs(prefix);
  return [
    ...(inputs.file && inputs.file.files ? Array.from(inputs.file.files).map(file => ({ file, useCurrentLocation: false })) : []),
    ...(inputs.camera && inputs.camera.files ? Array.from(inputs.camera.files).map(file => ({ file, useCurrentLocation: true })) : [])
  ];
}

function revokePendingExpenseExtraPreviewUrls(prefix) {
  (pendingExpenseExtraPreviewUrls[prefix] || []).forEach(url => URL.revokeObjectURL(url));
  pendingExpenseExtraPreviewUrls[prefix] = [];
}

function renderSelectedExpenseImageClassifications(prefix, reset = false) {
  const inputs = expenseExtraImageInputs(prefix);
  if (!inputs.classifications) return;
  const previous = reset
    ? []
    : selectedExpenseExtraImageRecords(prefix).map((record, index) => $(`[data-new-expense-image-type="${prefix}-${index}"]`)?.value || '');
  const records = selectedExpenseExtraImageRecords(prefix);
  revokePendingExpenseExtraPreviewUrls(prefix);
  inputs.classifications.innerHTML = records.length
    ? `<p class="small"><strong>Clasificación de cada imagen nueva</strong></p><div class="pending-expense-image-list">${records.map((record, index) => {
      const url = URL.createObjectURL(record.file);
      pendingExpenseExtraPreviewUrls[prefix].push(url);
      const name = escapeHtml(record.file.name || `Imagen ${index + 1}`);
      return `<label><button type="button" class="pending-expense-image-preview" data-open-pending-expense-image="${prefix}" data-pending-expense-image-index="${index}" title="Ampliar ${name}"><img src="${escapeHtml(url)}" alt="Vista previa de ${name}"></button><span>${name}</span><select data-new-expense-image-type="${prefix}-${index}" aria-label="Clasificación de ${name}">${photoTypeOptionsHtml(previous[index])}</select></label>`;
    }).join('')}</div>`
    : '';
}

function clearExpenseExtraImageSelection(prefix) {
  const inputs = expenseExtraImageInputs(prefix);
  if (inputs.file) inputs.file.value = '';
  if (inputs.camera) inputs.camera.value = '';
  if (inputs.status) {
    inputs.status.textContent = prefix === 'edit-gasto'
      ? 'Ninguna imagen nueva seleccionada.'
      : 'Ninguna imagen adicional seleccionada.';
  }
  if (inputs.mapOption) inputs.mapOption.hidden = true;
  if (inputs.mapCheckbox) inputs.mapCheckbox.checked = false;
  revokePendingExpenseExtraPreviewUrls(prefix);
  if (inputs.classifications) inputs.classifications.innerHTML = '';
}

async function syncExpenseExtraImageSelection(prefix, options = {}) {
  const inputs = expenseExtraImageInputs(prefix);
  const files = selectedExpenseExtraImageFiles(prefix);
  renderSelectedExpenseImageClassifications(prefix, options.resetClassifications === true);
  if (!inputs.status) return;
  if (!files.length) {
    inputs.status.textContent = prefix === 'edit-gasto' ? 'Ninguna imagen nueva seleccionada.' : 'Ninguna imagen adicional seleccionada.';
    if (inputs.mapOption) inputs.mapOption.hidden = true;
    if (inputs.mapCheckbox) inputs.mapCheckbox.checked = false;
    return;
  }
  inputs.status.textContent = `Comprobando ubicación de ${files.length} ${files.length === 1 ? 'imagen' : 'imágenes'}...`;
  const records = selectedExpenseExtraImageRecords(prefix);
  const pointsPromise = Promise.all(records.map(record => imageGpsForFile(record.file, { useCurrentLocation: record.useCurrentLocation })));
  const captured = options.applyDateTime ? await imageDateTimeForFile(files[0]) : null;
  if (captured && selectedExpenseExtraImageFiles(prefix)[0] === files[0]) {
    await applyExpenseImageDateTime(prefix, captured);
    if (prefix === 'g') scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  }
  const points = await pointsPromise;
  if (selectedExpenseExtraImageFiles(prefix)[0] !== files[0]) return;
  const locatedCount = points.filter(Boolean).length;
  const exifCount = points.filter(point => point && point.source === 'exif').length;
  const currentCount = points.filter(point => point && point.source === 'device').length;
  if (locatedCount) {
    const locationParts = [
      exifCount ? `${exifCount} con GPS del archivo` : '',
      currentCount ? `${currentCount} con ubicación actual del móvil` : '',
      locatedCount < files.length ? `${files.length - locatedCount} sin GPS` : ''
    ].filter(Boolean).join(' · ');
    inputs.status.textContent = `${files.length} ${files.length === 1 ? 'imagen seleccionada' : 'imágenes seleccionadas'} · ${locationParts}.`;
  } else {
    inputs.status.textContent = `${files.length} ${files.length === 1 ? 'imagen seleccionada' : 'imágenes seleccionadas'} · el archivo recibido no contiene coordenadas GPS.`;
  }
  if (inputs.mapOption) {
    inputs.mapOption.hidden = locatedCount === 0;
    setMapOptionText(inputs.mapOption, locatedCount === files.length ? 'Añadir al mapa' : 'Añadir al mapa las imágenes con GPS');
  }
  if (inputs.mapCheckbox && locatedCount === 0) inputs.mapCheckbox.checked = false;
}

async function readSelectedExpenseExtraImages(prefix) {
  const inputs = expenseExtraImageInputs(prefix);
  const records = selectedExpenseExtraImageRecords(prefix);
  const images = [];
  for (let index = 0; index < records.length; index += 1) {
    const selectedType = photoTypeById($(`[data-new-expense-image-type="${prefix}-${index}"]`)?.value);
    if (inputs.status) inputs.status.textContent = `Preparando imagen ${index + 1} de ${records.length}...`;
    const image = await compressBlogImage(records[index].file, { useCurrentLocation: records[index].useCurrentLocation });
    const hasExactPoint = Boolean(storedImageCoordinates(image));
    const addToMap = Boolean(inputs.mapCheckbox && inputs.mapCheckbox.checked && hasExactPoint);
    images.push({
      ...image,
      photoTypeId: selectedType ? selectedType.id : '',
      photoTypeName: selectedType ? selectedType.nombre : '',
      mapEnabled: addToMap,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString()
    });
  }
  return images;
}

async function syncExpenseTicketSelection(prefix, source) {
  ticketOcrRunIds[prefix] = (ticketOcrRunIds[prefix] || 0) + 1;
  const file = $(`#${prefix}-ticket`);
  const camera = $(`#${prefix}-ticket-camera`);
  const status = $(`#${prefix}-ticket-selected`);
  const selected = source === 'camera' ? camera : file;
  const other = source === 'camera' ? file : camera;
  if (!selected || !selected.files || !selected.files.length) return;
  if (other) other.value = '';
  if (prefix === 'edit-gasto' && $('#edit-gasto-ticket-remove')) {
    $('#edit-gasto-ticket-remove').checked = false;
  }
  const selectedFile = selected.files[0];
  const selectedName = selectedFile.name || (source === 'camera' ? 'Foto de cámara' : 'Ticket seleccionado');
  pendingExpenseTicketPreviews[prefix] = null;
  pendingExpenseTicketTranslations[prefix] = null;
  renderSelectedExpenseTicketPreview(prefix);
  pendingExpenseTicketLocations[prefix] = null;
  syncExpenseTicketMapOption(prefix, null);
  if (status) status.textContent = fileLooksLikeImage(selectedFile)
    ? `${selectedName} · comprobando GPS…`
    : selectedName;
  pendingTicketOcr[prefix] = null;
  setTicketOcrStatus(prefix, 'Listo para leer en este dispositivo.');
  syncTicketOcrAvailability(prefix);
  syncExpenseTicketTypeAvailability(prefix);
  if (!fileLooksLikeImage(selectedFile)) return;
  const { point, captured } = await readImageMetadataForFile(selectedFile);
  const preview = await compressBlogImage(selectedFile, { skipMetadata: true });
  if (selectedFileInput(`#${prefix}-ticket`, `#${prefix}-ticket-camera`)?.files?.[0] !== selectedFile) return;
  pendingExpenseTicketPreviews[prefix] = preview;
  renderSelectedExpenseTicketPreview(prefix);
  pendingExpenseTicketLocations[prefix] = point ? {
    latitude: point.latitude,
    longitude: point.longitude,
    locationSource: point.source || 'exif',
    capturedDate: captured?.date || '',
    capturedTime: captured?.time || ''
  } : {
    latitude: null,
    longitude: null,
    locationSource: '',
    capturedDate: captured?.date || '',
    capturedTime: captured?.time || ''
  };
  syncExpenseTicketMapOption(prefix, point, false);
  if (status) status.textContent = point
    ? `${selectedName} · con GPS del archivo. Puedes añadirlo al mapa.`
    : `${selectedName} · sin GPS.`;
}

function normalizeTicketMerchantKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(s\.?a\.?u?|s\.?l\.?u?|sociedad|limitada|anonima)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ticketCategoryMemory() {
  try {
    const value = JSON.parse(localStorage.getItem(TICKET_OCR_LEARNING_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function rememberTicketCategory(prefix) {
  const result = pendingTicketOcr[prefix];
  if (!result?.merchant || !result.categoryEdited) return;
  const key = normalizeTicketMerchantKey(result.merchant);
  if (!key) return;
  const catId = Number($(`#${prefix}-cat`)?.value);
  const subcatId = Number($(`#${prefix}-subcat`)?.value);
  const category = state.categorias.find(item => Number(item.id) === catId);
  const subcategory = state.categorias.find(item => Number(item.id) === subcatId);
  if (!category) return;
  const memory = ticketCategoryMemory();
  memory[key] = {
    catId,
    catName: category.nombre,
    subcatId: subcategory ? subcatId : null,
    subcatName: subcategory?.nombre || '',
    confirmed: true,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(TICKET_OCR_LEARNING_KEY, JSON.stringify(memory));
}

function normalizedTicketSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findCategoryByNames(names, parentId = null) {
  const wanted = names.map(normalizedTicketSearch);
  const candidates = state.categorias.filter(item => {
    if (parentId === null && item.parentId) return false;
    if (parentId !== null && Number(item.parentId) !== Number(parentId)) return false;
    return true;
  });
  for (const value of wanted) {
    const exact = candidates.find(item => normalizedTicketSearch(item.nombre) === value);
    if (exact) return exact;
  }
  for (const value of wanted) {
    const partial = candidates.find(item => normalizedTicketSearch(item.nombre).startsWith(value));
    if (partial) return partial;
  }
  return null;
}

function learnedTicketCategory(merchant) {
  const key = normalizeTicketMerchantKey(merchant);
  const saved = ticketCategoryMemory()[key];
  if (!saved?.confirmed) return null;
  const category = state.categorias.find(item => !item.parentId && (
    Number(item.id) === Number(saved.catId)
    || normalizedTicketSearch(item.nombre) === normalizedTicketSearch(saved.catName)
  ));
  if (!category) return null;
  const subcategory = state.categorias.find(item => Number(item.parentId) === Number(category.id) && (
    Number(item.id) === Number(saved.subcatId)
    || (saved.subcatName && normalizedTicketSearch(item.nombre) === normalizedTicketSearch(saved.subcatName))
  ));
  return { category, subcategory: subcategory || null, learned: true };
}

function suggestTicketCategory(text, merchant, foodEvidence = null) {
  const merchantKey = normalizeTicketMerchantKey(merchant);
  const paddedMerchant = ` ${merchantKey} `;
  const foodBusinessRules = [
    { words: ['mercadona', 'carrefour', 'alcampo', 'lidl', 'aldi', 'supermercado', 'hipermercado', 'alimentacion', 'ultramarinos'], subcategories: ['Supermercado', 'Super'] },
    { words: ['heladeria', 'helados'], subcategories: ['Heladeria'] },
    { words: ['panaderia'], subcategories: ['Panaderia'] },
    { words: ['pasteleria', 'confiteria'], subcategories: ['Pasteleria'] },
    { words: ['cafeteria', 'cafe'], subcategories: ['Cafeteria'] },
    { words: ['restaurante', 'taperia', 'meson', 'pizzeria'], subcategories: ['Restaurante'] },
    { words: ['bar', 'taberna', 'cerveceria'], subcategories: ['Bar'] }
  ];
  const foodRule = foodBusinessRules.find(rule => rule.words.some(word => paddedMerchant.includes(` ${word} `)));
  if (foodRule) {
    const category = findCategoryByNames(['Comida']);
    if (category) {
      const subcategory = findCategoryByNames(foodRule.subcategories, category.id);
      return { category, subcategory: subcategory || null, learned: false };
    }
  }

  if (foodEvidence?.isFood) {
    const category = findCategoryByNames(['Comida']);
    if (category) {
      const inferredSubcategories = Array.isArray(foodEvidence.subcategories) && foodEvidence.subcategories.length
        ? foodEvidence.subcategories
        : foodEvidence.restaurantLikely ? ['Restaurante'] : [];
      const subcategory = inferredSubcategories.length
        ? findCategoryByNames(inferredSubcategories, category.id)
        : null;
      return { category, subcategory: subcategory || null, learned: false, fromConcepts: true };
    }
  }

  const learned = learnedTicketCategory(merchant);
  if (learned) return learned;
  const haystack = normalizedTicketSearch(`${merchant || ''}\n${text || ''}`);
  const rules = [
    { words: ['renfe', 'iryo', 'ouigo', 'ferrocarril', 'tren'], categories: ['Transporte'], subcategories: ['Tren'] },
    { words: ['taxi', 'uber', 'cabify'], categories: ['Transporte'], subcategories: ['Taxi'] },
    { words: ['metro', 'autobus', 'bus ', 'transporte urbano'], categories: ['Transporte'], subcategories: ['Metro', 'Autobús', 'Bus'] },
    { words: ['gasolina', 'gasoleo', 'combustible', 'repsol', 'cepsa', 'bp '], categories: ['Transporte'], subcategories: ['Combustible', 'Gasolina'] },
    { words: ['parking', 'aparcamiento'], categories: ['Transporte'], subcategories: ['Parking', 'Aparcamiento'] },
    { words: ['hotel', 'hostal', 'apartamento', 'alojamiento', 'residencia', 'booking'], categories: ['Alojamiento'], subcategories: ['Hotel', 'Residencia', 'Apartamento'] },
    { words: ['museo', 'entrada', 'cine', 'teatro', 'espectaculo', 'visita'], categories: ['Ocio'], subcategories: ['Museos', 'Entradas', 'Visitas'] }
  ];
  const rule = rules.find(item => item.words.some(word => haystack.includes(word)));
  if (!rule) {
    const direct = state.categorias
      .filter(item => !item.parentId)
      .find(item => haystack.includes(normalizedTicketSearch(item.nombre)));
    return direct ? { category: direct, subcategory: null, learned: false } : null;
  }
  const category = findCategoryByNames(rule.categories);
  if (!category) return null;
  const subcategory = findCategoryByNames(rule.subcategories, category.id);
  return { category, subcategory, learned: false };
}

function setTicketOcrStatus(prefix, text, isError = false) {
  const status = $(`#${prefix}-ticket-ocr-status`);
  if (!status) return;
  status.textContent = text;
  status.classList.toggle('error', isError);
}

function currentEditTicket() {
  const id = Number($('#edit-gasto-id')?.value);
  if (activeEditTicketRecord && Number(activeEditTicketRecord.id) === id) return activeEditTicketRecord;
  return state.gastos.find(item => Number(item.id) === id) || null;
}

function ticketOcrSource(prefix) {
  const preview = pendingExpenseTicketPreviews[prefix];
  const pendingLocation = pendingExpenseTicketLocations[prefix];
  if (preview?.data) return {
    source: preview.data,
    type: preview.type,
    name: preview.name,
    latitude: pendingLocation?.latitude ?? preview.latitude,
    longitude: pendingLocation?.longitude ?? preview.longitude
  };
  const input = selectedFileInput(`#${prefix}-ticket`, `#${prefix}-ticket-camera`);
  const file = input?.files?.[0];
  if (file) return { source: file, type: file.type, name: file.name };
  if (prefix === 'edit-gasto' && !$('#edit-gasto-ticket-remove')?.checked) {
    const gasto = currentEditTicket();
    const image = expenseTicketImageRecord(gasto);
    if (image) return {
      source: image.data,
      type: image.type,
      name: image.name,
      latitude: image.latitude,
      longitude: image.longitude
    };
    if (gasto?.ticketData) return { source: normalizeTicketDataValue(gasto.ticketData), type: gasto.ticketType, name: gasto.ticketName };
  }
  return null;
}

function syncTicketOcrAvailability(prefix) {
  const button = $(`#${prefix}-ticket-read`);
  const translateButton = $(`#${prefix}-ticket-translate`);
  const unavailable = !ticketOcrSource(prefix);
  if (button && !button.dataset.busy) button.disabled = unavailable;
  if (translateButton && !translateButton.dataset.busy) translateButton.disabled = unavailable;
}

function ticketOcrProgressLabel(message, languages = ['spa']) {
  const languageNames = normalizeRequestedTicketOcrLanguages(languages).map(ticketOcrLanguageName).join(', ');
  const labels = {
    'loading tesseract core': 'Preparando el lector local',
    'initializing tesseract': 'Iniciando el lector',
    'loading language traineddata': `Cargando idiomas: ${languageNames}`,
    'initializing api': 'Preparando el idioma',
    'recognizing text': 'Leyendo el ticket'
  };
  const label = labels[message?.status] || message?.status || 'Leyendo el ticket';
  const progress = Number(message?.progress);
  return Number.isFinite(progress) && progress > 0
    ? `${label}… ${Math.min(100, Math.round(progress * 100))}%`
    : `${label}…`;
}

function ticketDateAlignedToTrip(prefix, value) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { value: date, corrected: false };
  const tripId = Number($(`#${prefix}-viaje`)?.value);
  const trip = state.viajes.find(item => Number(item.id) === tripId);
  if (!trip || tripDateWithinRange(date, trip)) return { value: date, corrected: false };
  const startYear = String(trip.fechaInicio || '').slice(0, 4);
  const endYear = String(trip.fechaFin || trip.fechaInicio || '').slice(0, 4);
  if (/^\d{4}$/.test(startYear) && startYear === endYear && date.slice(0, 4) !== startYear) {
    const corrected = `${startYear}${date.slice(4)}`;
    if (tripDateWithinRange(corrected, trip)) return { value: corrected, corrected: true };
  }
  return { value: '', corrected: false, rejected: true };
}

function applyTicketOcrFields(prefix, result, options = {}) {
  const fields = result.fields || {};
  const detected = [];
  const applied = [];
  const preserved = [];
  const preserveExisting = !options.replaceExisting && (prefix === 'edit-gasto' || options.onlyEmpty);
  const applyValue = (field, value, label) => {
    if (value === '' || value === null || value === undefined) return false;
    detected.push(label);
    const control = $(`#${prefix}-${field}`);
    if (!control) return false;
    const current = String(control.value || '').trim();
    const preserveCurrent = preserveExisting || (options.preserveDescription && field === 'desc');
    if (preserveCurrent && current) {
      if (current !== String(value).trim()) preserved.push(label);
      return false;
    }
    control.value = value;
    applied.push(label);
    return true;
  };
  const alignedDate = ticketDateAlignedToTrip(prefix, fields.date);
  if (alignedDate.rejected) preserved.push('fecha incompatible con las fechas del viaje');
  else applyValue('fecha', alignedDate.value, alignedDate.corrected ? 'fecha (año ajustado al viaje)' : 'fecha');
  applyValue('hora', fields.time || '', 'hora');
  applyValue('importe', Number.isFinite(fields.total) && fields.total > 0 ? fields.total.toFixed(2) : '', 'total');
  const merchantApplied = applyValue('desc', fields.merchant || '', 'establecimiento');
  const suggestion = suggestTicketCategory(
    result.classificationText || result.text || '',
    fields.merchant,
    result.foodEvidence
  );
  if (suggestion?.category) {
    const suggestionSource = suggestion.learned ? ' aprendida' : suggestion.fromConcepts ? ' por conceptos' : '';
    detected.push(`categoría${suggestion.subcategory ? ' y subcategoría' : ''}${suggestionSource}`);
    const categoryControl = $(`#${prefix}-cat`);
    const subcategoryControl = $(`#${prefix}-subcat`);
    if (categoryControl?.value && preserveExisting) {
      const categoryDiffers = Number(categoryControl.value) !== Number(suggestion.category.id);
      const subcategoryDiffers = suggestion.subcategory
        && Number(subcategoryControl?.value) !== Number(suggestion.subcategory.id);
      if (categoryDiffers || subcategoryDiffers) preserved.push('categoría y subcategoría');
    } else if (categoryControl) {
      categoryControl.value = String(suggestion.category.id);
      rememberLastValidExpenseCategory(prefix);
      if (prefix === 'g') renderSubcategories();
      else renderEditSubcategories();
      if (suggestion.subcategory && subcategoryControl) subcategoryControl.value = String(suggestion.subcategory.id);
      applied.push(`categoría${suggestion.subcategory ? ' y subcategoría' : ''}${suggestionSource}`);
    }
  }
  pendingTicketOcr[prefix] = {
    merchant: merchantApplied ? fields.merchant || '' : '',
    text: result.text || '',
    categoryEdited: false
  };
  if (!detected.length) throw new Error('No se han podido reconocer datos claros en este ticket. Puedes introducirlos manualmente.');
  const documentLabel = options.documentLabel
    || (fields.documentType === 'card_payment' ? 'Justificante de tarjeta detectado.' : 'Ticket de comercio detectado.');
  const missingAmount = Number.isFinite(fields.total) && fields.total > 0
    ? ''
    : ' No se encontró un total claro en el justificante; se mantiene el importe que ya figuraba.';
  const appliedMessage = applied.length ? ` Campos completados: ${[...new Set(applied)].join(', ')}.` : '';
  const preservedMessage = preserved.length ? ` Se conservaron sin cambios: ${[...new Set(preserved)].join(', ')}.` : '';
  return `${documentLabel} Datos reconocidos: ${[...new Set(detected)].join(', ')}.${appliedMessage}${preservedMessage} Revisa los datos; no se guardarán hasta que pulses ${prefix === 'edit-gasto' ? 'Guardar cambios' : 'Añadir'}.${missingAmount}${result.pdfFirstPageOnly ? ' En PDF se ha leído la primera página.' : ''}`;
}

function markTicketCategoryEdited(prefix) {
  if (!pendingTicketOcr[prefix]) return;
  pendingTicketOcr[prefix].categoryEdited = true;
  setTicketOcrStatus(prefix, 'Categoría modificada manualmente. Al guardar se recordará esta corrección para el establecimiento.');
}

function rememberLastValidExpenseCategory(prefix) {
  const category = $(`#${prefix}-cat`);
  if (category?.value) category.dataset.lastValidValue = category.value;
}

function handleExpenseCategoryChange(prefix) {
  const category = $(`#${prefix}-cat`);
  if (!category) return;
  if (!category.value && category.dataset.lastValidValue
    && [...category.options].some(option => option.value === category.dataset.lastValidValue)) {
    category.value = category.dataset.lastValidValue;
  }
  rememberLastValidExpenseCategory(prefix);
  if (prefix === 'g') renderSubcategories();
  else renderEditSubcategories();
  markTicketCategoryEdited(prefix);
}

function handleExpenseSubcategoryChange(prefix) {
  const category = $(`#${prefix}-cat`);
  const subcategory = $(`#${prefix}-subcat`);
  const selected = state.categorias.find(item => Number(item.id) === Number(subcategory?.value));
  if (category && selected?.parentId && Number(category.value) !== Number(selected.parentId)) {
    category.value = String(selected.parentId);
    rememberLastValidExpenseCategory(prefix);
    if (prefix === 'g') renderSubcategories();
    else renderEditSubcategories();
    subcategory.value = String(selected.id);
  }
  markTicketCategoryEdited(prefix);
}

async function recognizeExpenseTicketSource(prefix, source, options = {}) {
  const button = options.button || null;
  const languages = normalizeRequestedTicketOcrLanguages(options.languages || ticketOcrLanguagesForExpense(prefix));
  const runId = (ticketOcrRunIds[prefix] || 0) + 1;
  ticketOcrRunIds[prefix] = runId;
  try {
    if (button) {
      button.dataset.busy = '1';
      button.disabled = true;
      button.textContent = 'Leyendo…';
    }
    setTicketOcrStatus(prefix, options.preparingMessage
      || `Preparando lectura en ${languages.map(ticketOcrLanguageName).join(', ')}…`);
    await warmTicketOcrLanguages(languages);
    ticketOcrModulePromise ||= import('./ticket-ocr.js?v=700v278');
    const ocr = await ticketOcrModulePromise;
    const result = await ocr.recognizeTicket(source.source, {
      type: source.type,
      name: source.name,
      languages,
      preferLargeTitle: options.preferLargeTitle === true,
      onProgress: message => {
        if (ticketOcrRunIds[prefix] === runId) {
          setTicketOcrStatus(prefix, ticketOcrProgressLabel(message, languages));
        }
      }
    });
    if (ticketOcrRunIds[prefix] !== runId) return null;
    const dialog = prefix === 'g' ? $('#add-gasto-dialog') : $('#edit-gasto-dialog');
    if (dialog && !dialog.open) return null;
    if (result.fields?.merchant) {
      result.fields.merchant = ocr.correctTicketMerchantFromKnown(
        result.fields.merchant,
        state.gastos.map(item => item.descripcion)
      );
    }
    setTicketOcrStatus(prefix, applyTicketOcrFields(prefix, result, options));
    if (prefix === 'g') scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
    return result;
  } catch (error) {
    console.error(error);
    if (ticketOcrRunIds[prefix] === runId) {
      setTicketOcrStatus(prefix, error?.message || 'No se ha podido leer el ticket.', true);
    }
    return null;
  } finally {
    if (button && ticketOcrRunIds[prefix] === runId) {
      delete button.dataset.busy;
      button.textContent = 'Leer ticket';
    }
    if (ticketOcrRunIds[prefix] === runId) syncTicketOcrAvailability(prefix);
  }
}

async function readExpenseTicket(prefix) {
  const button = $(`#${prefix}-ticket-read`);
  if (button?.dataset.busy) return null;
  if (button) {
    button.dataset.busy = '1';
    button.disabled = true;
    button.textContent = 'Leyendo…';
  }
  const pendingSelection = pendingExpenseTicketLocationChecks[prefix];
  if (pendingSelection) {
    setTicketOcrStatus(prefix, 'Preparando la foto para leerla sin sobrecargar el dispositivo…');
    try {
      await pendingSelection;
    } catch (error) {
      setTicketOcrStatus(prefix, error?.message || 'No se ha podido preparar la foto del ticket.', true);
      if (button) {
        delete button.dataset.busy;
        button.textContent = 'Leer ticket';
      }
      syncTicketOcrAvailability(prefix);
      return null;
    }
  }
  const source = ticketOcrSource(prefix);
  if (!source) {
    setTicketOcrStatus(prefix, 'Selecciona o fotografía primero un ticket.', true);
    if (button) {
      delete button.dataset.busy;
      button.textContent = 'Leer ticket';
    }
    syncTicketOcrAvailability(prefix);
    return null;
  }
  return recognizeExpenseTicketSource(prefix, source, {
    button,
    languages: ticketOcrLanguagesForExpense(prefix)
  });
}

async function handleExpenseTicketLanguageChange(prefix) {
  ticketOcrRunIds[prefix] = (ticketOcrRunIds[prefix] || 0) + 1;
  pendingTicketOcr[prefix] = null;
  const button = $(`#${prefix}-ticket-read`);
  if (button) {
    delete button.dataset.busy;
    button.textContent = 'Leer ticket';
  }
  syncTicketOcrAvailability(prefix);
  const languages = ticketOcrLanguagesForExpense(prefix);
  setTicketOcrStatus(prefix, `Reiniciando la lectura en ${languages.map(ticketOcrLanguageName).join(', ')}…`);
  try {
    ticketOcrModulePromise ||= import('./ticket-ocr.js?v=700v278');
    const ocr = await ticketOcrModulePromise;
    ocr.resetTicketOcrWorker?.();
    await pendingExpenseTicketLocationChecks[prefix];
    if (!ticketOcrSource(prefix)) {
      setTicketOcrStatus(prefix, `Lectura preparada en ${languages.map(ticketOcrLanguageName).join(', ')}.`);
      await warmTicketOcrLanguages(languages);
      return null;
    }
    return readExpenseTicket(prefix);
  } catch (error) {
    setTicketOcrStatus(prefix, error?.message || 'No se ha podido reiniciar la lectura.', true);
    return null;
  }
}

async function readLensTicketTranslation(prefix, record, originalSource = null) {
  if (!record?.data) return null;
  const previousStatus = 'Resultado de Lens preparado junto al ticket principal.';
  try {
    const recognitionSource = originalSource || record.data;
    const result = await recognizeExpenseTicketSource(prefix, {
      source: recognitionSource,
      type: originalSource?.type || record.type || 'image/jpeg',
      name: originalSource?.name || record.name || 'traduccion-lens.jpg'
    }, {
      languages: ['spa'],
      replaceExisting: true,
      preserveDescription: true,
      preferLargeTitle: true,
      documentLabel: 'Resultado de Google Lens analizado.',
      preparingMessage: 'Analizando el resultado de Google Lens…'
    });
    if (result) {
      record.text = result.text || '';
      record.sourceLanguages = ['spa'];
    } else {
      setTicketOcrStatus(prefix, `${previousStatus} No se encontraron otros datos claros; puedes completarlos manualmente.`);
    }
    return result;
  } catch (error) {
    console.warn('No se pudieron completar datos desde la traducción de Lens', error);
    setTicketOcrStatus(prefix, `${previousStatus} No se encontraron otros datos claros; puedes completarlos manualmente.`);
    return null;
  }
}

function readStoredLensReturnTarget() {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const target = JSON.parse(storage.getItem(LENS_RETURN_TARGET_KEY) || 'null');
      if (target) return target;
    } catch (_) {}
  }
  return null;
}

async function readLensTicketText(prefix, text) {
  const sourceText = cleanLensSharedText(text);
  if (!sourceText) return null;
  try {
    setTicketOcrStatus(prefix, 'Analizando el texto reconocido por Google Lens…');
    ticketOcrModulePromise ||= import('./ticket-ocr.js?v=700v278');
    const ocr = await ticketOcrModulePromise;
    const fields = ocr.extractTicketFields(sourceText);
    if (fields.merchant) {
      fields.merchant = ocr.correctTicketMerchantFromKnown(
        fields.merchant,
        state.gastos.map(item => item.desc || item.descripcion || '')
      );
    }
    const result = {
      text: sourceText,
      classificationText: sourceText,
      fields,
      foodEvidence: ocr.extractTicketFoodEvidence(sourceText, fields.total)
    };
    setTicketOcrStatus(prefix, applyTicketOcrFields(prefix, result, {
      replaceExisting: true,
      preserveDescription: true,
      documentLabel: 'Texto de Google Lens analizado.'
    }));
    if (prefix === 'g') saveFormDraft(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS, { lensReturn: true });
    return result;
  } catch (error) {
    console.warn('No se pudieron aplicar los datos reconocidos por Lens', error);
    setTicketOcrStatus(prefix, error?.message || 'No se han podido analizar los datos compartidos por Google Lens.', true);
    return null;
  }
}

function deleteLensReturnSource(target) {
  if (!target?.sourceUrl || !('caches' in window)) return;
  caches.open(LENS_RETURN_CACHE)
    .then(cache => cache.delete(target.sourceUrl))
    .catch(() => {});
}

function writeLensReturnTarget(target = null) {
  const previous = pendingLensReturnTarget || readStoredLensReturnTarget();
  pendingLensReturnTarget = target;
  for (const storage of [sessionStorage, localStorage]) {
    try {
      if (target) storage.setItem(LENS_RETURN_TARGET_KEY, JSON.stringify(target));
      else storage.removeItem(LENS_RETURN_TARGET_KEY);
    } catch (_) {}
  }
  if (!target || (previous?.sourceUrl && previous.sourceUrl !== target.sourceUrl)) {
    deleteLensReturnSource(previous);
  }
}

function currentLensReturnTarget() {
  let target = pendingLensReturnTarget || readStoredLensReturnTarget();
  const startedAt = Number(target?.startedAt || 0);
  if (!target || !['g', 'edit-gasto'].includes(target.prefix) || Date.now() - startedAt > 30 * 60 * 1000) {
    writeLensReturnTarget(null);
    return null;
  }
  pendingLensReturnTarget = target;
  return target;
}

async function rememberLensReturnTarget(prefix, source = null) {
  if (prefix === 'g') saveFormDraft(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS, { lensReturn: true });
  const sourceLanguage = lensTicketSourceLanguage(prefix);
  const target = {
    prefix,
    expenseId: prefix === 'edit-gasto' ? Number($('#edit-gasto-id')?.value || 0) : 0,
    tripId: Number($(`#${prefix}-viaje`)?.value || 0),
    startedAt: Date.now(),
    sourceLanguages: sourceLanguage.languages,
    spanishSource: sourceLanguage.spanish
  };
  writeLensReturnTarget(target);
  if (!source || !('caches' in window)) return target;
  try {
    const blob = source.source instanceof Blob
      ? source.source
      : dataUrlToBlob(source.source, source.type || 'image/jpeg');
    const token = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    target.sourceUrl = new URL(`./__lens-return/${token}`, window.location.href).href;
    target.sourceName = source.name || 'ticket.jpg';
    target.sourceType = source.type || blob.type || 'image/jpeg';
    const cache = await caches.open(LENS_RETURN_CACHE);
    await cache.put(target.sourceUrl, new Response(blob, {
      headers: { 'Content-Type': target.sourceType, 'Cache-Control': 'no-store' }
    }));
    writeLensReturnTarget(target);
  } catch (error) {
    console.warn('No se pudo conservar temporalmente el ticket para volver desde Lens', error);
  }
  return target;
}

async function translateExpenseTicket(prefix) {
  const button = $(`#${prefix}-ticket-translate`);
  const source = ticketOcrSource(prefix);
  if (!source) {
    setTicketOcrStatus(prefix, 'Selecciona o fotografía primero un ticket.', true);
    return;
  }
  if (!fileLooksLikeImage({ type: source.type, name: source.name }) && !/^data:image\//i.test(String(source.source || ''))) {
    setTicketOcrStatus(prefix, 'Google Lens necesita una imagen. Si el ticket es un PDF, abre una página o haz una captura antes de compartirla.', true);
    return;
  }
  try {
    button.dataset.busy = '1';
    button.disabled = true;
    button.textContent = 'Abriendo…';
    const blob = source.source instanceof Blob
      ? source.source
      : dataUrlToBlob(source.source, source.type || 'image/jpeg');
    await rememberLensReturnTarget(prefix, { ...source, source: blob });
    openImageViewer({
      ...source,
      name: source.name || 'ticket.jpg',
      type: source.type || blob.type || 'image/jpeg',
      blob,
      data: typeof source.source === 'string' ? source.source : ''
    }, 'Leer ticket con Google Lens');
    if ($('#image-viewer-status')) {
      $('#image-viewer-status').textContent = 'Pulsa «Compartir / Google Lens», elige Lens y lee o traduce. Después comparte el resultado de nuevo con Cuaderno de Bitácora.';
    }
    setTicketOcrStatus(prefix, 'Ticket listo para compartir con Google Lens. La aplicación no usa ningún servicio de pago.');
  } catch (error) {
    console.error(error);
    setTicketOcrStatus(prefix, error?.message || 'No se ha podido preparar el ticket para Google Lens.', true);
  } finally {
    delete button.dataset.busy;
    button.textContent = 'Leer con Google Lens';
    syncTicketOcrAvailability(prefix);
  }
}

function ticketLink(gasto) {
  if (!gasto.ticketData) return '-';
  const name = String(gasto.ticketName || 'Ticket');
  return `<button class="ghost current-ticket-link" data-open-ticket="${gasto.id}" type="button" title="${escapeHtml(name)}">Abrir ticket</button>`;
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

function imageViewerBlob(record) {
  if (record?.file instanceof Blob) return record.file;
  if (record?.blob instanceof Blob) return record.blob;
  if (record?.data) return dataUrlToBlob(record.data, record.type || 'image/jpeg');
  return null;
}

function applyImageViewerZoom() {
  const image = $('#image-viewer-image');
  const stage = $('#image-viewer-stage');
  if (!image || !stage) return;
  const fitted = activeImageViewerZoom === 0;
  image.classList.toggle('is-fit', fitted);
  image.classList.toggle('is-zoomed', !fitted);
  stage.classList.toggle('is-zoomed', !fitted);
  if (fitted) image.style.removeProperty('--image-viewer-zoom');
  else image.style.setProperty('--image-viewer-zoom', `${Math.round(activeImageViewerZoom * 100)}%`);
  if ($('#image-viewer-zoom-label')) {
    $('#image-viewer-zoom-label').textContent = fitted
      ? 'Ajustada'
      : `${Math.round(activeImageViewerZoom * 100)}%`;
  }
  if ($('#image-viewer-zoom-out')) $('#image-viewer-zoom-out').disabled = activeImageViewerZoom > 0 && activeImageViewerZoom <= 0.25;
  if ($('#image-viewer-zoom-in')) $('#image-viewer-zoom-in').disabled = activeImageViewerZoom >= 3;
  if (fitted) {
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }
}

function setImageViewerZoom(zoom) {
  activeImageViewerZoom = zoom === 0 ? 0 : Math.min(3, Math.max(0.25, Number(zoom) || 1));
  applyImageViewerZoom();
}

function stepImageViewerZoom(direction) {
  const current = activeImageViewerZoom || 1;
  setImageViewerZoom(current + (direction > 0 ? 0.25 : -0.25));
}

function closeImageViewer() {
  const dialog = $('#image-viewer-dialog');
  if (dialog?.close) dialog.close();
  else dialog?.removeAttribute('open');
  if (activeImageViewerUrl) URL.revokeObjectURL(activeImageViewerUrl);
  activeImageViewerUrl = '';
  activeImageViewerRecord = null;
  activeImageViewerZoom = 0;
  if ($('#image-viewer-image')) {
    $('#image-viewer-image').removeAttribute('src');
    $('#image-viewer-image').alt = '';
  }
  if ($('#image-viewer-status')) $('#image-viewer-status').textContent = '';
}

function openImageViewer(record, title = '') {
  const blob = imageViewerBlob(record);
  const name = String(record?.name || title || 'imagen.jpg');
  const type = String(record?.type || blob?.type || 'image/jpeg');
  if (!blob || !/^image\//i.test(type)) throw new Error('Esta vista ampliada solo está disponible para imágenes.');
  if (activeImageViewerUrl) URL.revokeObjectURL(activeImageViewerUrl);
  const embeddedImageUrl = /^data:image\//i.test(String(record?.data || '')) ? String(record.data) : '';
  const displayUrl = embeddedImageUrl || (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '');
  if (!displayUrl) throw new Error('El navegador no ha podido preparar la vista ampliada de esta imagen.');
  activeImageViewerUrl = embeddedImageUrl ? '' : displayUrl;
  const point = storedImageCoordinates(record);
  activeImageViewerRecord = {
    name,
    type,
    blob,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null
  };
  activeImageViewerZoom = 0;
  if ($('#image-viewer-title')) $('#image-viewer-title').textContent = title || name;
  if ($('#image-viewer-image')) {
    $('#image-viewer-image').onload = applyImageViewerZoom;
    $('#image-viewer-image').src = displayUrl;
    $('#image-viewer-image').alt = `Vista ampliada de ${name}`;
  }
  applyImageViewerZoom();
  if ($('#image-viewer-status')) $('#image-viewer-status').textContent = '';
  const dialog = $('#image-viewer-dialog');
  if (dialog?.showModal) dialog.showModal();
  else dialog?.setAttribute('open', 'open');
}

function imageViewerDownloadName(date = new Date(), type = 'image/jpeg') {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  const time = [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ].join('-');
  const extension = /png/i.test(type) ? 'png' : /webp/i.test(type) ? 'webp' : 'jpg';
  return `descarga-${stamp}-${time}.${extension}`;
}

async function imageViewerExportBlob(record) {
  const point = storedImageCoordinates(record);
  const blob = record?.blob;
  if (!blob || !point || !/jpe?g/i.test(String(record.type || blob.type || ''))) return blob;
  imageLocationModulePromise ||= import('./image-location.js?v=700v278');
  const metadata = await imageLocationModulePromise;
  return metadata.embedGpsInJpegBlob(blob, point.latitude, point.longitude);
}

async function prepareImageDownloadFile(record, date = new Date()) {
  const blob = imageViewerBlob(record);
  if (!blob) throw new Error('No se encuentra la imagen que quieres descargar.');
  const point = storedImageCoordinates(record);
  const type = record?.type || blob.type || 'image/jpeg';
  const exportBlob = await imageViewerExportBlob({ ...record, blob, type });
  const exportType = exportBlob?.type || type;
  const filename = imageViewerDownloadName(date, exportType);
  return {
    file: new File([exportBlob], filename, { type: exportType, lastModified: date.getTime() }),
    filename,
    point
  };
}

function downloadImageViewerFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name || imageViewerDownloadName(new Date(), file.type);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadActiveImageViewerFile() {
  const status = $('#image-viewer-status');
  const record = activeImageViewerRecord;
  if (!record?.blob) throw new Error('No se encuentra la imagen que quieres descargar.');
  const point = storedImageCoordinates(record);
  if (status) status.textContent = point
    ? 'Preparando la descarga con sus coordenadas GPS…'
    : 'Preparando la descarga…';
  const { file, filename } = await prepareImageDownloadFile(record);
  downloadImageViewerFile(file);
  if (status) status.textContent = point
    ? `Descarga iniciada como ${filename}, con GPS incorporado.`
    : `Descarga iniciada como ${filename}. Esta imagen no tenía coordenadas GPS.`;
  return file;
}

async function downloadPrimaryBlogImage() {
  if (!activeBlogImage) throw new Error('No hay ninguna imagen preparada para descargar.');
  const status = $('#blog-image-download-status');
  const point = storedImageCoordinates(activeBlogImage);
  if (status) status.textContent = point
    ? 'Preparando el JPEG con GPS…'
    : 'Preparando el JPEG…';
  const { file, filename } = await prepareImageDownloadFile(activeBlogImage);
  downloadImageViewerFile(file);
  if (status) status.textContent = point
    ? `Descargado como ${filename}, con GPS incorporado.`
    : `Descargado como ${filename}; esta imagen no tenía GPS.`;
  return file;
}

async function shareImageViewerFile() {
  const status = $('#image-viewer-status');
  const record = activeImageViewerRecord;
  if (!record?.blob) throw new Error('No se encuentra la imagen que quieres compartir.');
  if (status) status.textContent = storedImageCoordinates(record)
    ? 'Preparando la imagen con sus coordenadas GPS…'
    : 'Preparando la imagen…';
  const exportBlob = await imageViewerExportBlob(record);
  const file = new File([exportBlob], imageViewerDownloadName(new Date(), record.type || exportBlob.type), {
    type: record.type || exportBlob.type || 'image/jpeg',
    lastModified: Date.now()
  });
  const shareData = { files: [file] };
  let supportsFileShare = typeof navigator.share === 'function';
  if (supportsFileShare && typeof navigator.canShare === 'function') {
    try {
      supportsFileShare = navigator.canShare(shareData);
    } catch {
      supportsFileShare = false;
    }
  }
  if (!supportsFileShare) {
    downloadImageViewerFile(file);
    if (status) status.textContent = 'El navegador no permite compartir archivos desde aquí. Se ha descargado la imagen para que puedas abrirla o compartirla con Google Lens.';
    return;
  }
  try {
    if (status) status.textContent = 'Elige Google Lens para leer o traducir el ticket. Después comparte el texto o la imagen resultante con Cuaderno de Bitácora.';
    await navigator.share(shareData);
  } catch (error) {
    if (error?.name !== 'AbortError') throw error;
    if (status) status.textContent = 'No se ha compartido la imagen.';
  }
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function prepareCloudBackupData(sourceData) {
  const attachments = new Map();
  const addAttachment = async ({ data, name, mime }) => {
    const file = ticketDataInfo(data, mime || 'application/octet-stream');
    const blob = file.blob;
    const id = await sha256Hex(blob);
    const parts = Math.max(1, Math.ceil(file.data.length / CLOUD_ATTACHMENT_CHUNK_CHARS));
    if (!attachments.has(id)) {
      attachments.set(id, {
        id,
        name: name || 'archivo',
        mime: blob.type || mime || 'application/octet-stream',
        size: blob.size,
        parts,
        encoding: file.encoding,
        data: file.data
      });
    }
    return id;
  };
  const gastos = [];
  const sourceGastos = Array.isArray(sourceData && sourceData.gastos) ? sourceData.gastos : [];
  for (let index = 0; index < sourceGastos.length; index += 1) {
    const gasto = sourceGastos[index];
    const next = { ...gasto };
    if (gasto.ticketData) {
      setSyncMessage(`Preparando tickets y fotos: ${index + 1} de ${sourceGastos.length}`);
      next.ticketRef = await addAttachment({
        data: gasto.ticketData,
        name: gasto.ticketName || 'ticket',
        mime: gasto.ticketType || 'application/octet-stream'
      });
      delete next.ticketData;
    } else {
      delete next.ticketRef;
    }
    if (gasto.ticketTranslationData) {
      next.ticketTranslationRef = await addAttachment({
        data: gasto.ticketTranslationData,
        name: gasto.ticketTranslationName || 'traduccion-ticket.jpg',
        mime: gasto.ticketTranslationType || 'image/jpeg'
      });
      delete next.ticketTranslationData;
    } else {
      delete next.ticketTranslationRef;
    }
    const sourceExtraImages = Array.isArray(gasto.extraImages) ? gasto.extraImages : [];
    next.extraImages = [];
    for (let imageIndex = 0; imageIndex < sourceExtraImages.length; imageIndex += 1) {
      const image = sourceExtraImages[imageIndex];
      const nextImage = { ...image };
      if (image && image.data) {
        setSyncMessage(`Preparando imágenes de gastos: ${imageIndex + 1} de ${sourceExtraImages.length}`);
        nextImage.fileRef = await addAttachment({
          data: image.data,
          name: image.name || 'imagen-gasto.jpg',
          mime: image.type || 'image/jpeg'
        });
        delete nextImage.data;
      }
      next.extraImages.push(nextImage);
    }
    gastos.push(next);
  }
  const viajeDocumentos = [];
  const sourceDocuments = Array.isArray(sourceData && sourceData.viajeDocumentos) ? sourceData.viajeDocumentos : [];
  for (let index = 0; index < sourceDocuments.length; index += 1) {
    const document = sourceDocuments[index];
    const next = { ...document };
    if (document.fileData) {
      setSyncMessage(`Preparando documentos de viaje: ${index + 1} de ${sourceDocuments.length}`);
      next.fileRef = await addAttachment({
        data: document.fileData,
        name: document.fileName || 'documento',
        mime: document.fileType || 'application/octet-stream'
      });
      delete next.fileData;
    } else {
      delete next.fileRef;
    }
    viajeDocumentos.push(next);
  }
  const blogEntries = [];
  const sourceBlogEntries = Array.isArray(sourceData && sourceData.blogEntries) ? sourceData.blogEntries : [];
  for (let index = 0; index < sourceBlogEntries.length; index += 1) {
    const entry = sourceBlogEntries[index];
    const next = { ...entry };
    if (entry.imageData) {
      setSyncMessage(`Preparando imágenes del blog: ${index + 1} de ${sourceBlogEntries.length}`);
      next.imageRef = await addAttachment({
        data: entry.imageData,
        name: entry.imageName || 'imagen-blog.jpg',
        mime: entry.imageType || 'image/jpeg'
      });
      delete next.imageData;
    } else {
      delete next.imageRef;
    }
    const sourceGalleryImages = Array.isArray(entry.galleryImages) ? entry.galleryImages : [];
    next.galleryImages = [];
    for (let imageIndex = 0; imageIndex < sourceGalleryImages.length; imageIndex += 1) {
      const image = sourceGalleryImages[imageIndex];
      const nextImage = { ...image };
      if (image && image.data) {
        setSyncMessage(`Preparando galerías del blog: ${imageIndex + 1} de ${sourceGalleryImages.length}`);
        nextImage.fileRef = await addAttachment({
          data: image.data,
          name: image.name || 'galeria-blog.jpg',
          mime: image.type || 'image/jpeg'
        });
        delete nextImage.data;
      }
      next.galleryImages.push(nextImage);
    }
    blogEntries.push(next);
  }
  return {
    data: {
      ...sourceData,
      cloudFormat: 7,
      gastos,
      viajeDocumentos,
      blogEntries,
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
      attachment_part_too_large: 'Un fragmento de archivo es demasiado grande',
      attachment_incomplete: 'El archivo no llegó completo a Netlify'
    };
    throw new Error(messages[payload.error] || 'No se pudo guardar un archivo en Netlify');
  }
  return payload;
}

async function existingCloudAttachmentIds(ids) {
  const existing = new Set();
  for (let index = 0; index < ids.length; index += CLOUD_ATTACHMENT_CHECK_BATCH) {
    const batch = ids.slice(index, index + CLOUD_ATTACHMENT_CHECK_BATCH);
    setSyncMessage(`Comprobando archivos en la nube: ${Math.min(index + batch.length, ids.length)} de ${ids.length}`);
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
      setSyncMessage(`Subiendo archivo ${fileIndex + 1} de ${missing.length}, parte ${part + 1} de ${total}`);
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
  const gastos = state.gastos.filter(gasto => gasto.ticketData || gasto.ticketTranslationData);
  for (let index = 0; index < gastos.length; index += 1) {
    const gasto = gastos[index];
    if (gasto.ticketData) {
      const ticket = ticketDataInfo(gasto.ticketData, gasto.ticketType || 'application/octet-stream');
      result.set(await sha256Hex(ticket.blob), ticket.data);
    }
    if (gasto.ticketTranslationData) {
      const translation = ticketDataInfo(gasto.ticketTranslationData, gasto.ticketTranslationType || 'image/jpeg');
      result.set(await sha256Hex(translation.blob), translation.data);
    }
  }
  const expenseImages = state.gastos.flatMap(gasto => expenseExtraImages(gasto));
  for (let index = 0; index < expenseImages.length; index += 1) {
    const image = expenseImages[index];
    if (!image.data) continue;
    const file = ticketDataInfo(image.data, image.type || 'image/jpeg');
    result.set(await sha256Hex(file.blob), file.data);
  }
  const documents = state.viajeDocumentos.filter(document => document.fileData);
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    const file = ticketDataInfo(document.fileData, document.fileType || 'application/octet-stream');
    result.set(await sha256Hex(file.blob), file.data);
  }
  const blogImages = state.blogEntries.filter(entry => entry.imageData);
  for (let index = 0; index < blogImages.length; index += 1) {
    const entry = blogImages[index];
    const file = ticketDataInfo(entry.imageData, entry.imageType || 'image/jpeg');
    result.set(await sha256Hex(file.blob), file.data);
  }
  const blogGalleryFiles = state.blogEntries.flatMap(entry => blogGalleryImages(entry));
  for (let index = 0; index < blogGalleryFiles.length; index += 1) {
    const image = blogGalleryFiles[index];
    if (!image.data) continue;
    const file = ticketDataInfo(image.data, image.type || 'image/jpeg');
    result.set(await sha256Hex(file.blob), file.data);
  }
  return result;
}

async function downloadCloudAttachment(attachment) {
  const chunks = [];
  for (let part = 0; part < Number(attachment.parts || 0); part += 1) {
    setSyncMessage(`Recuperando archivos desde la nube: parte ${part + 1} de ${attachment.parts}`);
    const response = await fetch(
      `${SYNC_ENDPOINT}?attachment=${encodeURIComponent(attachment.id)}&part=${part}`,
      {
        headers: { 'x-sync-key': syncKey() },
        cache: 'force-cache'
      }
    );
    if (!response.ok) throw new Error(`No se pudo recuperar ${attachment.name || 'un archivo'} desde la nube`);
    chunks.push(await response.text());
  }
  const dataUrl = chunks.join('');
  const ticket = ticketDataInfo(dataUrl, attachment.mime || 'application/octet-stream');
  if (await sha256Hex(ticket.blob) !== attachment.id) {
    throw new Error(`El archivo ${attachment.name || ''} no superó la comprobación de integridad`);
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
    setSyncMessage(`Recuperando archivo ${index + 1} de ${attachments.length} desde la nube`);
    downloaded.set(attachment.id, await downloadCloudAttachment(attachment));
  }
  return {
    ...sourceData,
    gastos: (sourceData.gastos || []).map(gasto => ({
      ...gasto,
      ticketData: gasto.ticketRef ? (downloaded.get(gasto.ticketRef) || '') : (gasto.ticketData || ''),
      ticketTranslationData: gasto.ticketTranslationRef ? (downloaded.get(gasto.ticketTranslationRef) || '') : (gasto.ticketTranslationData || ''),
      extraImages: (Array.isArray(gasto.extraImages) ? gasto.extraImages : []).map(image => ({
        ...image,
        data: image.fileRef ? (downloaded.get(image.fileRef) || '') : (image.data || '')
      }))
    })),
    viajeDocumentos: (sourceData.viajeDocumentos || []).map(document => ({
      ...document,
      fileData: document.fileRef ? (downloaded.get(document.fileRef) || '') : (document.fileData || '')
    })),
    blogEntries: (sourceData.blogEntries || []).map(entry => ({
      ...entry,
      imageData: entry.imageRef ? (downloaded.get(entry.imageRef) || '') : (entry.imageData || ''),
      galleryImages: (Array.isArray(entry.galleryImages) ? entry.galleryImages : []).map(image => ({
        ...image,
        data: image.fileRef ? (downloaded.get(image.fileRef) || '') : (image.data || '')
      }))
    }))
  };
}

function openTicket(gastoId) {
  const gasto = state.gastos.find(g => Number(g.id) === Number(gastoId));
  if (!gasto || !gasto.ticketData) throw new Error('No se encuentra el ticket');
  const image = expenseTicketImageRecord(gasto);
  if (image) {
    openImageViewer(image, gasto.ticketName || 'Ticket');
    return;
  }
  const blob = dataUrlToBlob(gasto.ticketData, gasto.ticketType || 'application/octet-stream');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function openTicketTranslation(gastoId) {
  const gasto = state.gastos.find(g => Number(g.id) === Number(gastoId));
  const record = ticketTranslationRecordFromExpense(gasto);
  if (!record) throw new Error('No se encuentra la traducción del ticket');
  openTicketTranslationRecord(record);
}

function expenseTicketIsRasterImage(gasto) {
  if (!gasto?.ticketData) return false;
  const ticketData = normalizeTicketDataValue(gasto.ticketData);
  return /^data:image\//i.test(ticketData)
    || fileLooksLikeImage({ type: gasto.ticketType, name: gasto.ticketName });
}

function syncEditExpenseTicketRotation(gasto = currentEditTicket()) {
  const controls = $('#edit-gasto-ticket-rotate');
  if (!controls) return;
  controls.hidden = Boolean($('#edit-gasto-ticket-remove')?.checked) || !expenseTicketIsRasterImage(gasto);
}

function renderEditExpenseTicket(gasto = currentEditTicket()) {
  const current = $('#edit-gasto-ticket-current');
  const preview = $('#edit-gasto-ticket-preview');
  if (!current || !preview) return;
  preview.replaceChildren();
  if (!gasto?.ticketData) {
    current.textContent = 'Sin ticket asociado.';
    preview.hidden = true;
    syncExpenseTicketMapOption('edit-gasto', null);
    syncEditExpenseTicketRotation(gasto);
    renderExpenseTicketTranslation('edit-gasto');
    return;
  }
  const name = String(gasto.ticketName || 'Ticket');
  current.innerHTML = `<strong>Ticket actual</strong> · ${ticketLink(gasto)}<span class="current-ticket-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'expense-ticket-preview-open';
  openButton.dataset.openTicket = String(gasto.id);
  openButton.title = `Abrir ${name}`;
  if (expenseTicketIsRasterImage(gasto)) {
    const image = document.createElement('img');
    image.src = normalizeTicketDataValue(gasto.ticketData);
    image.alt = `Vista previa de ${name}`;
    openButton.append(image);
  } else {
    const fileLabel = document.createElement('span');
    fileLabel.className = 'expense-ticket-preview-file';
    fileLabel.textContent = /pdf/i.test(String(gasto.ticketType || '')) ? 'PDF · Abrir ticket' : 'Abrir ticket';
    openButton.append(fileLabel);
  }
  preview.append(openButton);
  const removingTicket = Boolean($('#edit-gasto-ticket-remove')?.checked);
  preview.hidden = removingTicket;
  renderExpenseTicketTranslation('edit-gasto');
  const ticketImage = expenseTicketImageRecord(gasto);
  const ticketPoint = removingTicket ? null : storedImageCoordinates(ticketImage);
  syncExpenseTicketMapOption('edit-gasto', ticketPoint, ticketImage?.mapEnabled === true);
  syncEditExpenseTicketRotation(gasto);
}

async function detectStoredExpenseTicketLocation(gasto) {
  if (!expenseTicketIsRasterImage(gasto) || storedImageCoordinates(expenseTicketImageRecord(gasto))) return;
  const expectedId = Number(gasto.id);
  const expectedData = normalizeTicketDataValue(gasto.ticketData);
  const ticket = ticketDataInfo(expectedData, gasto.ticketType || 'image/jpeg');
  const source = new File([ticket.blob], gasto.ticketName || 'ticket.jpg', { type: gasto.ticketType || ticket.blob.type || 'image/jpeg' });
  const [point, captured] = await Promise.all([imageGpsForFile(source), imageDateTimeForFile(source)]);
  const current = currentEditTicket();
  if (!$('#edit-gasto-dialog')?.open || !point || Number(current?.id) !== expectedId || normalizeTicketDataValue(current.ticketData) !== expectedData) return;
  activeEditTicketRecord = {
    ...current,
    ticketLatitude: point.latitude,
    ticketLongitude: point.longitude,
    ticketLocationSource: point.source || 'exif',
    ticketCapturedDate: captured?.date || '',
    ticketCapturedTime: captured?.time || '',
    ticketMapEnabled: false
  };
  renderEditExpenseTicket(activeEditTicketRecord);
}

function openExpenseImage(gastoId, imageIndex) {
  const gasto = state.gastos.find(g => Number(g.id) === Number(gastoId));
  const image = expenseExtraImages(gasto)[Number(imageIndex)];
  if (!image || !image.data) throw new Error('No se encuentra la imagen');
  openImageViewer(image, image.name || 'Imagen asociada');
}

function renderExpenseFilesDialog(gasto) {
  const list = $('#expense-files-list');
  if (!list || !gasto) return;
  const items = [];
  if (gasto.ticketData) {
    const ticketTypeLabel = photoTypeLabel({ photoTypeId: gasto.ticketPhotoTypeId, photoTypeName: gasto.ticketPhotoTypeName });
    items.push(`<li><span class="trip-document-info"><strong>Ticket principal</strong><span>${escapeHtml(gasto.ticketName || 'Ticket')} · ${escapeHtml(ticketTypeLabel || 'Sin clasificar')}</span></span><button type="button" class="ghost" data-open-ticket="${gasto.id}">Abrir</button></li>`);
  }
  if (gasto.ticketTranslationData) {
    const companionLabel = gasto.ticketTranslationKind === 'secondary-ticket' ? 'Segundo ticket' : 'Traducción del ticket';
    items.push(`<li><span class="trip-document-info"><strong>${companionLabel}</strong><span>${escapeHtml(gasto.ticketTranslationName || companionLabel)}</span></span><button type="button" class="ghost" data-open-ticket-translation="${gasto.id}">Abrir</button></li>`);
  }
  expenseExtraImages(gasto).forEach((image, index) => {
    const typeLabel = photoTypeLabel(image);
    items.push(`<li><span class="trip-document-info"><strong>Imagen adicional ${index + 1}</strong><span>${escapeHtml(image.name || 'Imagen')}${typeLabel ? ` · ${escapeHtml(typeLabel)}` : ' · Sin clasificar'}</span></span><button type="button" class="ghost" data-open-expense-image="${gasto.id}" data-expense-image-index="${index}">Abrir</button></li>`);
  });
  list.innerHTML = items.length
    ? `<ul class="trip-document-list expense-file-list">${items.join('')}</ul>`
    : '<p class="small">Este gasto no tiene archivos asociados.</p>';
}

function openExpenseFilesDialog(gastoId) {
  const gasto = state.gastos.find(g => Number(g.id) === Number(gastoId));
  if (!gasto) throw new Error('No se encuentra el gasto');
  if ($('#expense-files-title')) $('#expense-files-title').textContent = `Archivos · ${gasto.desc || 'Gasto'}`;
  renderExpenseFilesDialog(gasto);
  const dialog = $('#expense-files-dialog');
  if (dialog && dialog.showModal) dialog.showModal();
  else if (dialog) dialog.setAttribute('open', 'open');
}

function closeExpenseFilesDialog() {
  const dialog = $('#expense-files-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function renderEditExpenseImages(gasto) {
  const container = $('#edit-gasto-extra-images-current');
  if (!container) return;
  const images = expenseExtraImages(gasto);
  container.innerHTML = images.length
    ? `<p class="small"><strong>Imágenes actuales</strong></p><ul class="expense-current-image-list">${images.map((image, index) => {
      const point = storedImageCoordinates(image);
      const checked = image.mapEnabled && point ? ' checked' : '';
      const mapControl = point
        ? `<label><input type="checkbox" data-map-expense-image="${index}"${checked}> Mapa</label>`
        : '<span class="small">Sin GPS</span>';
      const name = escapeHtml(image.name || `imagen ${index + 1}`);
      const rotateControls = `<span class="expense-current-image-rotate"><button type="button" class="ghost expense-ticket-rotate-button" data-rotate-expense-image="${index}" data-rotate-direction="left" title="Girar a la izquierda" aria-label="Girar ${name} a la izquierda"><span aria-hidden="true">&#8634;</span> Izquierda</button><button type="button" class="ghost expense-ticket-rotate-button" data-rotate-expense-image="${index}" data-rotate-direction="right" title="Girar a la derecha" aria-label="Girar ${name} a la derecha"><span aria-hidden="true">&#8635;</span> Derecha</button></span>`;
      return `<li><button type="button" class="expense-current-image-preview" data-open-expense-image="${gasto.id}" data-expense-image-index="${index}" title="Abrir ${name}"><img src="${escapeHtml(normalizeTicketDataValue(image.data))}" alt="Vista previa de ${name}"></button><button type="button" class="ghost expense-current-image-open" data-open-expense-image="${gasto.id}" data-expense-image-index="${index}">Abrir ${name}</button><div class="expense-current-image-controls"><select data-expense-image-type="${index}" aria-label="Tipo de ${name}">${photoTypeOptionsHtml(image.photoTypeId)}</select>${rotateControls}</div><div class="expense-current-image-options">${mapControl}<label><input type="checkbox" data-remove-expense-image="${index}"> Quitar</label></div></li>`;
    }).join('')}</ul>`
    : '<p class="small">No hay imágenes adicionales.</p>';
}

function formatFileSize(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function compactImageFileName(name = 'imagen') {
  const base = String(name || 'imagen').replace(/\.[^.]+$/, '') || 'imagen';
  return `${base}.jpg`;
}

async function compactStoredImagePayload({ data, name = 'imagen', type = 'image/jpeg' } = {}) {
  if (!data) return null;
  const file = ticketDataInfo(data, type || 'application/octet-stream');
  const mime = String(file.blob.type || type || '').toLowerCase();
  if (!mime.startsWith('image/')) return null;
  const originalText = String(file.data || data || '');
  const originalSize = Number(file.blob.size) || Math.max(0, Math.round(originalText.length * 0.75));
  const nextName = compactImageFileName(name);
  const source = typeof File === 'function'
    ? new File([file.blob], nextName, { type: file.blob.type || type || 'image/jpeg' })
    : file.blob;
  try {
    const image = await compressBlogImage(source, { skipMetadata: true });
    const savedBytes = Math.max(0, originalSize - Number(image.size || 0));
    const savedText = Math.max(0, originalText.length - String(image.data || '').length);
    if (savedBytes <= Math.max(2048, originalSize * 0.03) && savedText <= Math.max(2048, originalText.length * 0.03)) {
      return null;
    }
    return {
      name: compactImageFileName(name),
      type: image.type,
      size: image.size,
      data: image.data,
      width: image.width,
      height: image.height,
      savedBytes,
      savedText
    };
  } catch (error) {
    console.warn('No se pudo compactar una imagen guardada.', error);
    return null;
  }
}

function addCompactStats(stats, result) {
  if (!result) return;
  stats.optimized += 1;
  stats.savedBytes += Math.max(0, Number(result.savedBytes) || 0);
  stats.savedText += Math.max(0, Number(result.savedText) || 0);
}

async function compactStoredImages() {
  const stats = {
    scanned: 0,
    optimized: 0,
    savedBytes: 0,
    savedText: 0
  };
  for (const gasto of state.gastos) {
    let changed = false;
    const next = { ...gasto };
    if (next.ticketData) {
      stats.scanned += 1;
      const compacted = await compactStoredImagePayload({
        data: next.ticketData,
        name: next.ticketName || 'ticket',
        type: next.ticketType || 'application/octet-stream'
      });
      if (compacted) {
        next.ticketData = compacted.data;
        next.ticketName = compacted.name;
        next.ticketType = compacted.type;
        changed = true;
        addCompactStats(stats, compacted);
      }
    }
    if (Array.isArray(next.extraImages) && next.extraImages.length) {
      const images = [];
      for (const sourceImage of next.extraImages) {
        const image = { ...sourceImage };
        if (image.data) {
          stats.scanned += 1;
          const compacted = await compactStoredImagePayload({
            data: image.data,
            name: image.name || 'imagen-gasto',
            type: image.type || 'image/jpeg'
          });
          if (compacted) {
            Object.assign(image, {
              data: compacted.data,
              name: compacted.name,
              type: compacted.type,
              size: compacted.size,
              width: compacted.width,
              height: compacted.height
            });
            changed = true;
            addCompactStats(stats, compacted);
          }
        }
        images.push(image);
      }
      next.extraImages = images;
    }
    if (changed) await putRecord('gastos', { ...next, updatedAt: new Date().toISOString() });
  }
  for (const document of state.viajeDocumentos) {
    if (!document.fileData) continue;
    stats.scanned += 1;
    const compacted = await compactStoredImagePayload({
      data: document.fileData,
      name: document.fileName || 'documento',
      type: document.fileType || 'application/octet-stream'
    });
    if (!compacted) continue;
    await putRecord('tripDocuments', {
      ...document,
      fileData: compacted.data,
      fileName: compacted.name,
      fileType: compacted.type,
      fileSize: compacted.size,
      updatedAt: new Date().toISOString()
    });
    addCompactStats(stats, compacted);
  }
  for (const entry of state.blogEntries) {
    let changed = false;
    const next = { ...entry };
    if (next.imageData) {
      stats.scanned += 1;
      const compacted = await compactStoredImagePayload({
        data: next.imageData,
        name: next.imageName || 'imagen-blog',
        type: next.imageType || 'image/jpeg'
      });
      if (compacted) {
        next.imageData = compacted.data;
        next.imageName = compacted.name;
        next.imageType = compacted.type;
        next.imageSize = compacted.size;
        next.imageWidth = compacted.width;
        next.imageHeight = compacted.height;
        changed = true;
        addCompactStats(stats, compacted);
      }
    }
    if (Array.isArray(next.galleryImages) && next.galleryImages.length) {
      const images = [];
      for (const sourceImage of next.galleryImages) {
        const image = { ...sourceImage };
        if (image.data) {
          stats.scanned += 1;
          const compacted = await compactStoredImagePayload({
            data: image.data,
            name: image.name || 'galeria-blog',
            type: image.type || 'image/jpeg'
          });
          if (compacted) {
            Object.assign(image, {
              data: compacted.data,
              name: compacted.name,
              type: compacted.type,
              size: compacted.size,
              width: compacted.width,
              height: compacted.height
            });
            changed = true;
            addCompactStats(stats, compacted);
          }
        }
        images.push(image);
      }
      next.galleryImages = images;
    }
    if (changed) await putRecord('blogEntries', { ...next, updatedAt: new Date().toISOString() });
  }
  return stats;
}

async function compactStoragePrompt() {
  if (!confirm('Se recomprimirán las imágenes guardadas en Gastos, Blog y Documentos de viaje. Los PDF y otros documentos no se tocarán. Conviene tener una copia reciente antes de continuar. ¿Reducir espacio ocupado ahora?')) return;
  const button = $('#btn-compact-storage');
  if (button) button.disabled = true;
  setMessage('#msg-compact-storage', 'Reduciendo espacio ocupado…');
  try {
    const stats = await compactStoredImages();
    await loadAll();
    const saved = formatFileSize(stats.savedBytes) || '0 B';
    const detail = stats.optimized
      ? `Optimización terminada: ${stats.optimized} de ${stats.scanned} imágenes compactadas. Ahorro aproximado: ${saved}.`
      : `No había imágenes que compactar. Revisadas: ${stats.scanned}.`;
    setMessage('#msg-compact-storage', detail);
  } catch (error) {
    setMessage('#msg-compact-storage', error.message || String(error), true);
  } finally {
    if (button) button.disabled = false;
  }
}

function tripDocumentsFor(tripId) {
  return state.viajeDocumentos
    .filter(item => Number(item.viajeId) === Number(tripId))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function renderTripDocumentsDialog() {
  const list = $('#trip-documents-list');
  if (!list) return;
  const documents = tripDocumentsFor(activeTripDocumentsId);
  if (!documents.length) {
    list.innerHTML = '<p class="small">Todavía no hay documentos asociados a este viaje.</p>';
    return;
  }
  list.innerHTML = `<ul class="trip-document-list">${documents.map(document => {
    const date = document.createdAt ? formatSyncDate(document.createdAt) : '';
    const detail = [document.fileName, formatFileSize(document.fileSize), date].filter(Boolean).join(' · ');
    return `<li>
      <span class="trip-document-info">
        <strong>${escapeHtml(document.descripcion || 'Documento')}</strong>
        <span>${escapeHtml(detail)}</span>
      </span>
      <span class="trip-document-actions">
        <button type="button" class="ghost" data-open-trip-document="${document.id}">Abrir</button>
        <button type="button" class="ghost danger-text" data-delete-trip-document="${document.id}">Eliminar</button>
      </span>
    </li>`;
  }).join('')}</ul>`;
}

function clearTripDocumentForm() {
  if ($('#trip-document-description')) $('#trip-document-description').value = '';
  if ($('#trip-document-file')) $('#trip-document-file').value = '';
  if ($('#trip-document-camera')) $('#trip-document-camera').value = '';
  if ($('#trip-document-selected')) $('#trip-document-selected').textContent = 'Ningún archivo seleccionado.';
  setMessage('#msg-trip-document', '');
}

function openTripDocumentsDialog(tripId) {
  const trip = state.viajes.find(item => Number(item.id) === Number(tripId));
  if (!trip) throw new Error('No se encuentra el viaje');
  activeTripDocumentsId = Number(trip.id);
  if ($('#trip-documents-title')) $('#trip-documents-title').textContent = `Documentos viaje · ${trip.nombre}`;
  clearTripDocumentForm();
  renderTripDocumentsDialog();
  const dialog = $('#trip-documents-dialog');
  if (!dialog) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeTripDocumentsDialog() {
  activeTripDocumentsId = null;
  const dialog = $('#trip-documents-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

async function saveTripDocumentFromForm() {
  if (!activeTripDocumentsId) throw new Error('No hay un viaje seleccionado');
  const description = String($('#trip-document-description') ? $('#trip-document-description').value : '').trim();
  if (!description) throw new Error('Escribe una descripción');
  const fileInput = $('#trip-document-camera') && $('#trip-document-camera').files.length
    ? $('#trip-document-camera')
    : $('#trip-document-file');
  const file = await readFileData(fileInput);
  if (!file) throw new Error('Elige un documento, una foto o usa la cámara');
  await addTripDocument({
    viajeId: activeTripDocumentsId,
    descripcion: description,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileData: file.data
  });
  state.viajeDocumentos = await getAll('tripDocuments');
  clearTripDocumentForm();
  renderTripDocumentsDialog();
  renderViajes();
  renderViajesHome();
  setMessage('#msg-trip-document', 'Documento añadido');
}

function openTripDocument(id) {
  const document = state.viajeDocumentos.find(item => Number(item.id) === Number(id));
  if (!document || !document.fileData) throw new Error('No se encuentra el documento');
  const blob = dataUrlToBlob(document.fileData, document.fileType || 'application/octet-stream');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function reviewPlural(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function tripReviewExpenseLabel(gasto) {
  const parts = [
    gasto.fecha || 'sin fecha',
    expenseTimeValue(gasto) || '',
    gasto.desc || ''
  ].filter(Boolean);
  return parts.join(' · ') || `gasto ${gasto.id || ''}`.trim();
}

function tripReviewEntryLabel(entry) {
  const parts = [
    entry.fecha || 'sin fecha',
    entry.hora || '',
    entry.descripcion || entry.tipo || ''
  ].filter(Boolean);
  return parts.join(' · ') || `entrada ${entry.id || ''}`.trim();
}

function tripReviewSample(items, formatter, max = 4) {
  const list = items.slice(0, max).map(formatter).filter(Boolean);
  const rest = items.length - list.length;
  return `${list.join('; ')}${rest > 0 ? `; y ${reviewPlural(rest, 'más', 'más')}` : ''}`;
}

function tripReviewItem(severity, title, detail = '') {
  return { severity, title, detail };
}

function tripReviewItemHtml(item) {
  return `<li class="${escapeHtml(item.severity || 'info')}"><strong>${escapeHtml(item.title)}</strong>${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ''}</li>`;
}

function tripReviewSectionHtml(section) {
  const items = section.items && section.items.length
    ? section.items
    : [tripReviewItem('ok', 'Sin avisos', 'No se han detectado problemas en este bloque.')];
  return `<section class="trip-review-section">
    <h3>${escapeHtml(section.title)}</h3>
    <ul class="trip-review-list">${items.map(tripReviewItemHtml).join('')}</ul>
  </section>`;
}

function tripReviewCityNames(ids) {
  return ids
    .map(id => state.lugares.find(lugar => Number(lugar.id) === Number(id)))
    .filter(Boolean)
    .map(city => city.nombre);
}

function tripReviewImageRecords(tripId) {
  const fromExpenses = state.gastos
    .filter(gasto => Number(gasto.viajeId) === Number(tripId))
    .flatMap(gasto => [expenseTicketImageRecord(gasto), ...expenseExtraImages(gasto)].filter(Boolean).map(image => ({
      ...image,
      source: 'Gastos',
      owner: gasto.desc || gasto.fecha || `gasto ${gasto.id || ''}`.trim()
    })));
  const fromBlog = blogEntriesForTrip(tripId)
    .flatMap(entry => blogEntryImages(entry).map(image => ({
      ...image,
      source: 'Blog',
      owner: entry.descripcion || entry.fecha || `entrada ${entry.id || ''}`.trim()
    })));
  return [...fromExpenses, ...fromBlog];
}

function buildTripReview(trip) {
  const tripId = Number(trip && trip.id);
  const expenses = state.gastos
    .filter(gasto => Number(gasto.viajeId) === tripId)
    .sort(compareExpensesChronologically);
  const entries = blogEntriesForTrip(tripId);
  const documents = tripDocumentsFor(tripId);
  const plannedCityIds = tripCityIds(trip);
  const plannedCountryIds = tripCountryIds(trip);
  const visitedCityIds = [...new Set([
    ...expenses.map(gasto => Number(gasto.ciudadId)).filter(Boolean),
    ...entries.map(entry => Number(entry.ciudadId)).filter(Boolean)
  ])];
  const reviewCityIds = [...new Set([...plannedCityIds, ...visitedCityIds])];
  const imageRecords = tripReviewImageRecords(tripId);
  const mapImages = imageRecords.filter(image => image.mapEnabled);
  const gpsImages = imageRecords.filter(storedImageCoordinates);
  const totalEur = expenses.reduce((sum, gasto) => sum + toEur(gasto.importe, gasto.moneda), 0);
  const budget = effectiveTripBudget(trip);
  const warnings = [];
  const sections = [];

  const basicItems = [];
  if (!trip.nombre) basicItems.push(tripReviewItem('warning', 'El viaje no tiene nombre', 'Pon un nombre claro para que el PDF, el blog y las copias sean fáciles de identificar.'));
  if (!trip.fechaInicio || !trip.fechaFin) basicItems.push(tripReviewItem('error', 'Faltan fechas del viaje', 'Define fecha de inicio y fecha final.'));
  else if (trip.fechaFin < trip.fechaInicio) basicItems.push(tripReviewItem('error', 'La fecha final es anterior al inicio', `${fmtDate(trip.fechaInicio)} → ${fmtDate(trip.fechaFin)}.`));
  else basicItems.push(tripReviewItem('ok', 'Fechas del viaje correctas', `${fmtDate(trip.fechaInicio)} → ${fmtDate(trip.fechaFin)}.`));
  if (!plannedCountryIds.length) basicItems.push(tripReviewItem('warning', 'No hay países planificados', 'Añade al menos un país en Configuración → Viajes.'));
  else basicItems.push(tripReviewItem('ok', 'Países planificados', tripCountryLabel(trip)));
  if (!plannedCityIds.length) basicItems.push(tripReviewItem('warning', 'No hay ciudades planificadas', 'Añadirlas mejora el mapa del viaje y la ruta.'));
  else basicItems.push(tripReviewItem('ok', 'Ciudades planificadas', tripReviewCityNames(plannedCityIds).join(' → ')));
  const preparatoryExpenses = trip.fechaInicio ? expenses.filter(gasto => gasto.fecha && gasto.fecha < trip.fechaInicio) : [];
  const preparatoryEntries = trip.fechaInicio ? entries.filter(entry => entry.fecha && entry.fecha < trip.fechaInicio) : [];
  if (preparatoryExpenses.length || preparatoryEntries.length) {
    basicItems.push(tripReviewItem('info', 'Preparativos detectados', `${reviewPlural(preparatoryExpenses.length, 'gasto')} y ${reviewPlural(preparatoryEntries.length, 'entrada')} anteriores al inicio. Se tratarán como preparativos en el blog/PDF.`));
  }
  sections.push({ title: 'Datos básicos', items: basicItems });

  const expenseItems = [];
  if (!expenses.length) {
    expenseItems.push(tripReviewItem('warning', 'No hay gastos en este viaje', 'Si el viaje ya está completo, revisa que los gastos estén asociados al viaje correcto.'));
  } else {
    expenseItems.push(tripReviewItem('ok', 'Gastos asociados', `${reviewPlural(expenses.length, 'gasto')} · total ${fmtCurrency(totalEur, 'EUR')}${budget ? ` · presupuesto ${fmtCurrency(budget, 'EUR')}` : ''}.`));
  }
  const missingExpenseDate = expenses.filter(gasto => !gasto.fecha);
  const missingExpenseTime = expenses.filter(gasto => !normalizeExpenseTime(gasto.hora));
  const missingExpenseCity = expenses.filter(gasto => !gasto.ciudadId);
  const missingExpenseAccount = expenses.filter(gasto => !state.cuentas.some(cuenta => Number(cuenta.id) === Number(gasto.cuentaId)));
  const missingExpenseCategory = expenses.filter(gasto => !state.categorias.some(cat => Number(cat.id) === Number(gasto.catId)));
  const expensesAfterEnd = trip.fechaFin ? expenses.filter(gasto => gasto.fecha && gasto.fecha > trip.fechaFin) : [];
  if (missingExpenseDate.length) expenseItems.push(tripReviewItem('error', `${reviewPlural(missingExpenseDate.length, 'gasto')} sin fecha`, tripReviewSample(missingExpenseDate, tripReviewExpenseLabel)));
  if (missingExpenseTime.length) expenseItems.push(tripReviewItem('warning', `${reviewPlural(missingExpenseTime.length, 'gasto')} sin hora explícita`, 'La app puede usar la hora de creación como apoyo, pero para ordenar el relato y el mapa es mejor guardar la hora real.'));
  if (missingExpenseCity.length) expenseItems.push(tripReviewItem('warning', `${reviewPlural(missingExpenseCity.length, 'gasto')} sin ciudad`, tripReviewSample(missingExpenseCity, tripReviewExpenseLabel)));
  if (missingExpenseAccount.length) expenseItems.push(tripReviewItem('error', `${reviewPlural(missingExpenseAccount.length, 'gasto')} sin cuenta válida`, tripReviewSample(missingExpenseAccount, tripReviewExpenseLabel)));
  if (missingExpenseCategory.length) expenseItems.push(tripReviewItem('warning', `${reviewPlural(missingExpenseCategory.length, 'gasto')} sin categoría válida`, tripReviewSample(missingExpenseCategory, tripReviewExpenseLabel)));
  if (expensesAfterEnd.length) expenseItems.push(tripReviewItem('warning', `${reviewPlural(expensesAfterEnd.length, 'gasto')} posterior al final del viaje`, tripReviewSample(expensesAfterEnd, tripReviewExpenseLabel)));
  const attachedExpenses = expenses.filter(expenseAttachmentCount);
  expenseItems.push(attachedExpenses.length
    ? tripReviewItem('ok', 'Archivos en gastos', `${reviewPlural(attachedExpenses.length, 'gasto')} tienen ticket o imágenes.`)
    : tripReviewItem('info', 'Sin tickets o imágenes en gastos', 'No es obligatorio, pero puede ser útil para revisar facturas y recuerdos.'));
  sections.push({ title: 'Gastos', items: expenseItems });

  const blogItems = [];
  if (!entries.length) {
    blogItems.push(tripReviewItem('warning', 'No hay entradas de blog', 'Si quieres generar relato o WordPress, añade textos, imágenes o puntos.'));
  } else {
    blogItems.push(tripReviewItem('ok', 'Entradas de blog', `${reviewPlural(entries.length, 'entrada')} en el viaje.`));
  }
  const missingEntryDate = entries.filter(entry => !entry.fecha);
  const missingEntryCity = entries.filter(entry => !entry.ciudadId && entry.enTransito !== true);
  const imageEntriesWithoutImage = entries.filter(entry => entry.tipo === 'imagen' && !blogEntryImages(entry).length);
  const pointEntriesWithoutCoordinates = entries.filter(entry => entry.tipo === 'punto' && !blogPointCoordinates(entry));
  if (missingEntryDate.length) blogItems.push(tripReviewItem('error', `${reviewPlural(missingEntryDate.length, 'entrada')} sin fecha`, tripReviewSample(missingEntryDate, tripReviewEntryLabel)));
  if (missingEntryCity.length) blogItems.push(tripReviewItem('warning', `${reviewPlural(missingEntryCity.length, 'entrada')} sin ciudad`, tripReviewSample(missingEntryCity, tripReviewEntryLabel)));
  if (imageEntriesWithoutImage.length) blogItems.push(tripReviewItem('error', `${reviewPlural(imageEntriesWithoutImage.length, 'entrada de imagen', 'entradas de imagen')} sin imagen`, tripReviewSample(imageEntriesWithoutImage, tripReviewEntryLabel)));
  if (pointEntriesWithoutCoordinates.length) blogItems.push(tripReviewItem('warning', `${reviewPlural(pointEntriesWithoutCoordinates.length, 'punto')} sin coordenadas`, tripReviewSample(pointEntriesWithoutCoordinates, tripReviewEntryLabel)));
  const wordpressEntries = entries.filter(entry => entry.wordpress !== false);
  if (entries.length) blogItems.push(tripReviewItem('info', 'WordPress', `${reviewPlural(wordpressEntries.length, 'entrada')} marcadas para WordPress.`));
  sections.push({ title: 'Blog', items: blogItems });

  const mapItems = [];
  const missingCityCoords = reviewCityIds
    .map(id => state.lugares.find(lugar => Number(lugar.id) === Number(id)))
    .filter(city => city && !lugarHasCoords(city));
  if (!reviewCityIds.length) {
    mapItems.push(tripReviewItem('warning', 'No hay ciudades para el mapa', 'Añade ciudades al viaje o a los gastos/entradas.'));
  } else if (missingCityCoords.length) {
    mapItems.push(tripReviewItem('warning', `${reviewPlural(missingCityCoords.length, 'ciudad')} sin coordenadas`, missingCityCoords.map(city => city.nombre).join(', ')));
  } else {
    mapItems.push(tripReviewItem('ok', 'Ciudades con coordenadas', `${reviewPlural(reviewCityIds.length, 'ciudad')} listas para el mapa.`));
  }
  const brokenMapImages = mapImages.filter(image => !storedImageCoordinates(image));
  if (brokenMapImages.length) mapItems.push(tripReviewItem('error', `${reviewPlural(brokenMapImages.length, 'foto')} marcada para mapa sin coordenadas`, tripReviewSample(brokenMapImages, image => `${image.source} · ${image.owner || image.name}`)));
  mapItems.push(mapImages.length
    ? tripReviewItem('ok', 'Fotos en el mapa', `${reviewPlural(mapImages.length, 'foto')} marcadas para el mapa.`)
    : tripReviewItem('info', 'Sin fotos marcadas para el mapa', gpsImages.length ? `${reviewPlural(gpsImages.length, 'foto')} tienen GPS y podrían añadirse si quieres.` : 'No se han encontrado fotos con GPS marcadas para el mapa.'));
  sections.push({ title: 'Mapa', items: mapItems });

  const documentItems = [];
  documentItems.push(documents.length
    ? tripReviewItem('ok', 'Documentos de viaje', `${reviewPlural(documents.length, 'documento')} guardados.`)
    : tripReviewItem('info', 'Sin documentos de viaje', 'Puedes añadir reservas, billetes, seguros o pasaportes desde Documentos viaje.'));
  const documentsWithoutFile = documents.filter(document => !document.fileData && !document.fileRef);
  if (documentsWithoutFile.length) documentItems.push(tripReviewItem('error', `${reviewPlural(documentsWithoutFile.length, 'documento')} sin archivo`, tripReviewSample(documentsWithoutFile, document => document.descripcion || document.fileName || 'documento')));
  sections.push({ title: 'Documentos y copia', items: documentItems });

  const backupItems = [];
  const lastBackup = localStorage.getItem(BACKUP_KEY) || '';
  if (!lastBackup) {
    backupItems.push(tripReviewItem('warning', 'No hay copia local registrada', 'Crea una copia antes de hacer cambios grandes o cerrar el viaje.'));
  } else {
    const backupDate = new Date(lastBackup);
    const backupAge = Number.isNaN(backupDate.getTime()) ? null : Math.floor((Date.now() - backupDate.getTime()) / 86400000);
    if (backupAge != null && backupAge > 7) backupItems.push(tripReviewItem('warning', 'La última copia local es antigua', `Última copia: ${backupDate.toLocaleString('es-ES')} · hace ${backupAge} días.`));
    else backupItems.push(tripReviewItem('ok', 'Copia local reciente', `Última copia: ${backupDate.toLocaleString('es-ES')}.`));
  }
  sections.push({ title: 'Backup', items: backupItems });

  const flat = sections.flatMap(section => section.items);
  const problemCount = flat.filter(item => item.severity === 'error').length;
  const warningCount = flat.filter(item => item.severity === 'warning').length;
  warnings.push(...flat.filter(item => item.severity === 'error' || item.severity === 'warning'));

  return {
    problemCount,
    warningCount,
    summary: {
      expenses: expenses.length,
      blog: entries.length,
      warnings: warnings.length
    },
    sections
  };
}

function renderTripReview(trip) {
  if (!trip) return;
  const review = buildTripReview(trip);
  const body = $('#trip-review-body');
  if (!body) return;
  const status = review.problemCount
    ? `${review.problemCount} problema(s) y ${review.warningCount} aviso(s)`
    : review.warningCount
      ? `${review.warningCount} aviso(s)`
      : 'Sin avisos importantes';
  body.innerHTML = `
    <p class="small">Revisión rápida antes de cerrar, exportar o publicar el viaje. No modifica ningún dato.</p>
    <div class="trip-review-summary">
      <div class="trip-review-box"><strong>${review.summary.expenses}</strong><span>Gastos</span></div>
      <div class="trip-review-box"><strong>${review.summary.blog}</strong><span>Entradas de blog</span></div>
      <div class="trip-review-box"><strong>${review.summary.warnings}</strong><span>${escapeHtml(status)}</span></div>
    </div>
    ${review.sections.map(tripReviewSectionHtml).join('')}
  `;
}

function openTripReviewDialog(tripId) {
  const trip = state.viajes.find(item => Number(item.id) === Number(tripId));
  if (!trip) throw new Error('No se encuentra el viaje');
  if ($('#trip-review-title')) $('#trip-review-title').textContent = `Revisar viaje · ${trip.nombre || ''}`;
  renderTripReview(trip);
  const dialog = $('#trip-review-dialog');
  if (!dialog) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeTripReviewDialog() {
  const dialog = $('#trip-review-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
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
  const header = ['Fecha', 'Hora', 'Viaje', 'Categoría', 'Subcategoría', 'Cuenta', 'Moneda', 'Importe', 'EUR', 'Descripción', 'Archivos'];
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
      expenseTimeValue(g),
      trip ? trip.nombre : '',
      cat ? cat.nombre : '',
      sub ? sub.nombre : '',
      account ? account.nombre : '',
      g.moneda,
      numberValue(g.importe).toFixed(2),
      eur.toFixed(2),
      g.desc || '',
      [g.ticketName || '', ...expenseExtraImages(g).map(image => image.name || 'Imagen')].filter(Boolean).join(' | ')
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

async function addCuenta({ nombre, moneda, saldoInicial = 0, nota = '', viajeId = null, accountType = '' }) {
  const now = new Date().toISOString();
  return addRecord('cuentas', {
    nombre,
    moneda,
    viajeId: viajeId ? Number(viajeId) : null,
    saldoInicial: numberValue(saldoInicial),
    saldoActual: numberValue(saldoInicial),
    accountType: normalizeAccountType(accountType),
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
      accountType: normalizeAccountType(account.accountType),
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
    accountType: normalizeAccountType(source.accountType),
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
  const normalizedCityIds = (ciudadIds || []).map(Number).filter(Boolean);
  const id = await addRecord('viajes', {
    nombre,
    fechaInicio,
    fechaFin,
    presupuesto: numberValue(presupuesto),
    paisIds: (paisIds || []).map(Number).filter(Boolean),
    ciudadIds: normalizedCityIds,
    routeStops: normalizeTripRouteStops({ fechaInicio, fechaFin, ciudadIds: normalizedCityIds }, normalizedCityIds),
    lodgingLocations: [],
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
  const tripId = Number(id);
  for (const document of state.viajeDocumentos.filter(item => Number(item.viajeId) === tripId)) {
    await deleteRecord('tripDocuments', Number(document.id));
  }
  for (const entry of state.blogEntries.filter(item => Number(item.viajeId) === tripId)) {
    await deleteRecord('blogEntries', Number(entry.id));
  }
  for (const record of state.timelineDays.filter(item => Number(item.viajeId) === tripId)) {
    await deleteRecord('timelineDays', record.id);
  }
  return deleteRecord('viajes', tripId);
}

async function addTripDocument({ viajeId, descripcion, fileName, fileType, fileSize = 0, fileData }) {
  const tripId = Number(viajeId);
  if (!state.viajes.some(v => Number(v.id) === tripId)) throw new Error('El viaje no existe');
  const detail = String(descripcion || '').trim();
  if (!detail) throw new Error('Escribe una descripción');
  if (!fileData) throw new Error('Elige un documento, una foto o usa la cámara');
  const now = new Date().toISOString();
  return addRecord('tripDocuments', {
    viajeId: tripId,
    descripcion: detail,
    fileName: String(fileName || 'documento'),
    fileType: String(fileType || 'application/octet-stream'),
    fileSize: Math.max(0, Number(fileSize) || 0),
    fileData,
    createdAt: now,
    updatedAt: now
  });
}

async function delTripDocument(id) {
  return deleteRecord('tripDocuments', Number(id));
}

function normalizeBlogImageRecord(image = {}) {
  return normalizeStoredImageRecord(image);
}

function blogGalleryImages(entry) {
  return Array.isArray(entry && entry.galleryImages)
    ? entry.galleryImages.map(normalizeBlogImageRecord).filter(image => image.data || image.fileRef)
    : [];
}

function blogEntryImages(entry) {
  const images = [];
  if (entry && (entry.imageData || entry.imageRef)) {
    images.push(normalizeBlogImageRecord({
      id: entry.imageId || `primary-${entry.id || ''}`,
      name: entry.imageName,
      type: entry.imageType,
      size: entry.imageSize,
      data: entry.imageData,
      fileRef: entry.imageRef,
      width: entry.imageWidth,
      height: entry.imageHeight,
      latitude: entry.imageLatitude,
      longitude: entry.imageLongitude,
      locationSource: entry.imageLocationSource,
      photoTypeId: entry.imagePhotoTypeId,
      photoTypeName: entry.imagePhotoTypeName,
      mapEnabled: entry.imageMapEnabled,
      createdAt: entry.createdAt
    }));
  }
  images.push(...blogGalleryImages(entry));
  return images;
}

function blogPointCoordinate(value, min, max) {
  if (value == null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function blogPointCoordinates(entry) {
  const latitude = blogPointCoordinate(entry && entry.latitude, -90, 90);
  const longitude = blogPointCoordinate(entry && entry.longitude, -180, 180);
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function blogPointMapUrl(entry, zoom = 18) {
  const point = blogPointCoordinates(entry);
  if (!point) return '';
  return `https://www.openstreetmap.org/?mlat=${point.latitude.toFixed(6)}&mlon=${point.longitude.toFixed(6)}#map=${zoom}/${point.latitude.toFixed(6)}/${point.longitude.toFixed(6)}`;
}

function geographicDistanceMeters(a, b) {
  const first = blogPointCoordinates(a);
  const second = blogPointCoordinates(b);
  if (!first || !second) return Number.POSITIVE_INFINITY;
  const radians = value => value * Math.PI / 180;
  const latDelta = radians(second.latitude - first.latitude);
  const lngDelta = radians(second.longitude - first.longitude);
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const haversine = Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function addBlogEntry(data) {
  const tripId = Number(data.viajeId);
  if (!state.viajes.some(v => Number(v.id) === tripId)) throw new Error('El viaje no existe');
  const type = String(data.tipo || '').toLowerCase();
  if (!['gasto', 'imagen', 'texto', 'punto'].includes(type)) throw new Error('Tipo de entrada no válido');
  const transport = type === 'punto' ? normalizeBlogPointTransport(data.transporte || data.transport) : '';
  const description = String(data.descripcion || '').trim() || blogPointTransportLabel(transport);
  if (!description) throw new Error('Escribe una descripción');
  if (type === 'texto' && !String(data.texto || '').trim()) throw new Error('Escribe el texto de la entrada');
  const galleryImages = Array.isArray(data.galleryImages) ? data.galleryImages.map(normalizeBlogImageRecord).filter(image => image.data) : [];
  if (type === 'imagen' && !data.imageData && !galleryImages.length) throw new Error('Selecciona una imagen, una galería o usa la cámara');
  const storesImages = ['imagen', 'punto', 'gasto'].includes(type);
  const hasPrimaryImage = storesImages && Boolean(data.imageData || data.imageRef);
  const enRuta = type !== 'gasto' && data.enRuta === true;
  const point = (type === 'punto' || enRuta) ? blogPointCoordinates(data) : null;
  if (type === 'punto' && !point) throw new Error('Indica un punto geolocalizado válido');
  if (enRuta && !point) throw new Error('La entrada En ruta necesita una ubicación válida');
  const now = new Date().toISOString();
  return addRecord('blogEntries', {
    viajeId: tripId,
    fecha: data.fecha || currentLocalDate(),
    hora: data.hora || currentLocalTime(),
    tipo: type,
    descripcion: description,
    paisId: data.paisId ? Number(data.paisId) : null,
    ciudadId: data.ciudadId ? Number(data.ciudadId) : null,
    enTransito: data.enTransito === true,
    texto: ['texto', 'imagen'].includes(type) ? String(data.texto || '') : '',
    notas: type === 'punto' ? String(data.notas || '') : '',
    transporte: type === 'punto' ? transport : '',
    mapCityManual: type === 'punto' && data.mapCityManual === true,
    imageName: hasPrimaryImage ? String(data.imageName || 'imagen.jpg') : '',
    imageType: hasPrimaryImage ? String(data.imageType || 'image/jpeg') : '',
    imageSize: hasPrimaryImage ? Math.max(0, Number(data.imageSize) || 0) : 0,
    imageData: hasPrimaryImage ? data.imageData || '' : '',
    imageRef: hasPrimaryImage ? data.imageRef || '' : '',
    imageWidth: hasPrimaryImage ? Math.max(0, Number(data.imageWidth) || 0) : 0,
    imageHeight: hasPrimaryImage ? Math.max(0, Number(data.imageHeight) || 0) : 0,
    imageId: hasPrimaryImage ? String(data.imageId || '') : '',
    imageLatitude: hasPrimaryImage ? storedImageCoordinate(data.imageLatitude, -90, 90) : null,
    imageLongitude: hasPrimaryImage ? storedImageCoordinate(data.imageLongitude, -180, 180) : null,
    imageLocationSource: hasPrimaryImage ? String(data.imageLocationSource || '') : '',
    imagePhotoTypeId: hasPrimaryImage ? String(data.imagePhotoTypeId || '') : '',
    imagePhotoTypeName: hasPrimaryImage ? String(data.imagePhotoTypeName || '') : '',
    imageMapEnabled: hasPrimaryImage && data.imageMapEnabled === true,
    galleryImages,
    sourceGastoId: type === 'gasto' && data.sourceGastoId ? Number(data.sourceGastoId) : null,
    gastoImporte: type === 'gasto' ? numberValue(data.gastoImporte) : 0,
    gastoMoneda: type === 'gasto' ? String(data.gastoMoneda || 'EUR') : '',
    gastoImporteEur: type === 'gasto' ? numberValue(data.gastoImporteEur) : 0,
    wordpressIncluded: data.wordpressIncluded !== false,
    featuredImage: type === 'imagen' && Boolean(data.featuredImage),
    enRuta,
    dailyMapDate: type === 'imagen' ? String(data.dailyMapDate || '') : '',
    latitude: point ? point.latitude : null,
    longitude: point ? point.longitude : null,
    createdAt: data.createdAt || now,
    updatedAt: now
  });
}

async function updateBlogEntry(id, patch) {
  return updateRecord('blogEntries', Number(id), patch);
}

async function delBlogEntry(id) {
  return deleteRecord('blogEntries', Number(id));
}

function compareBlogEntries(a, b) {
  return Number(String(b.dailyMapDate || '').startsWith('trip-overview:')) - Number(String(a.dailyMapDate || '').startsWith('trip-overview:')) ||
    `${a.fecha || ''}T${a.hora || '00:00'}`.localeCompare(`${b.fecha || ''}T${b.hora || '00:00'}`) ||
    Number(Boolean(b.dailyMapDate)) - Number(Boolean(a.dailyMapDate)) ||
    Number(a.id || 0) - Number(b.id || 0);
}

function normalizeImportedBlogEntry(entry = {}) {
  const type = ['gasto', 'imagen', 'texto', 'punto'].includes(String(entry.tipo || '').toLowerCase())
    ? String(entry.tipo).toLowerCase()
    : 'texto';
  const hasStoredTransport = Object.prototype.hasOwnProperty.call(entry, 'transporte')
    || Object.prototype.hasOwnProperty.call(entry, 'transport');
  const transport = type === 'punto'
    ? (hasStoredTransport
      ? normalizeBlogPointTransport(entry.transporte || entry.transport)
      : inferBlogPointTransport(entry.descripcion))
    : '';
  const now = new Date().toISOString();
  const obj = {
    ...entry,
    viajeId: Number(entry.viajeId),
    fecha: entry.fecha || currentLocalDate(),
    hora: entry.hora || '00:00',
    tipo: type,
    descripcion: String(entry.descripcion || '').trim() || blogPointTransportLabel(transport) || (type === 'gasto' ? 'Gasto' : 'Entrada del blog'),
    paisId: entry.paisId ? Number(entry.paisId) : null,
    ciudadId: entry.ciudadId ? Number(entry.ciudadId) : null,
    enTransito: entry.enTransito === true,
    texto: String(entry.texto || ''),
    notas: type === 'punto' ? String(entry.notas || '') : '',
    transporte: transport,
    imageName: String(entry.imageName || ''),
    imageType: String(entry.imageType || ''),
    imageSize: Math.max(0, Number(entry.imageSize) || 0),
    imageData: entry.imageData || '',
    imageWidth: Math.max(0, Number(entry.imageWidth) || 0),
    imageHeight: Math.max(0, Number(entry.imageHeight) || 0),
    imageId: String(entry.imageId || ''),
    imageLatitude: ['imagen', 'punto', 'gasto'].includes(type) ? storedImageCoordinate(entry.imageLatitude, -90, 90) : null,
    imageLongitude: ['imagen', 'punto', 'gasto'].includes(type) ? storedImageCoordinate(entry.imageLongitude, -180, 180) : null,
    imageLocationSource: ['imagen', 'punto', 'gasto'].includes(type) ? String(entry.imageLocationSource || '') : '',
    imagePhotoTypeId: ['imagen', 'punto', 'gasto'].includes(type) ? String(entry.imagePhotoTypeId || '') : '',
    imagePhotoTypeName: ['imagen', 'punto', 'gasto'].includes(type) ? String(entry.imagePhotoTypeName || '') : '',
    imageMapEnabled: ['imagen', 'punto', 'gasto'].includes(type) && entry.imageMapEnabled === true,
    galleryImages: Array.isArray(entry.galleryImages)
      ? entry.galleryImages.map(normalizeBlogImageRecord).filter(image => image.data || image.fileRef)
      : [],
    sourceGastoId: entry.sourceGastoId ? Number(entry.sourceGastoId) : null,
    gastoImporte: numberValue(entry.gastoImporte),
    gastoMoneda: String(entry.gastoMoneda || ''),
    gastoImporteEur: numberValue(entry.gastoImporteEur),
    wordpressIncluded: entry.wordpressIncluded !== false,
    featuredImage: type === 'imagen' && Boolean(entry.featuredImage),
    enRuta: type !== 'gasto' && entry.enRuta === true,
    dailyMapDate: type === 'imagen' ? String(entry.dailyMapDate || '') : '',
    latitude: (type === 'punto' || entry.enRuta === true) ? blogPointCoordinate(entry.latitude, -90, 90) : null,
    longitude: (type === 'punto' || entry.enRuta === true) ? blogPointCoordinate(entry.longitude, -180, 180) : null,
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now
  };
  if (entry.id != null) obj.id = Number(entry.id);
  return obj;
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

async function addGasto({ fecha, hora = '', viajeId, cuentaId, moneda, catId, subcatId = null, paisId = null, ciudadId = null, importe, desc = '', ticketName = '', ticketType = '', ticketData = '', ticketSize = 0, ticketWidth = 0, ticketHeight = 0, ticketPhotoTypeId = '', ticketPhotoTypeName = '', ticketLatitude = null, ticketLongitude = null, ticketLocationSource = '', ticketCapturedDate = '', ticketCapturedTime = '', ticketMapEnabled = false, ticketTranslationName = '', ticketTranslationType = '', ticketTranslationData = '', ticketTranslationSize = 0, ticketTranslationWidth = 0, ticketTranslationHeight = 0, ticketTranslationText = '', ticketTranslationSourceLanguages = [], ticketTranslationKind = '', extraImages = [] }) {
  if (!hasValidCurrency(moneda)) throw new Error('Configura la equivalencia de esa moneda antes de usarla');
  const account = state.cuentas.find(c => c.id === Number(cuentaId));
  if (account && account.moneda !== moneda) throw new Error('La moneda del gasto debe coincidir con la cuenta');
  if (account && account.viajeId && Number(viajeId) !== Number(account.viajeId)) throw new Error('Esa cuenta pertenece a otro viaje');
  const amount = numberValue(importe);
  if (amount === 0) throw new Error('El importe no puede ser cero');
  const now = new Date().toISOString();
  const storedExtraImages = Array.isArray(extraImages) ? extraImages : [];
  const ticketLocation = ticketData
    ? resolvedExpenseTicketLocation(ticketLatitude, ticketLongitude, ticketLocationSource, storedExtraImages)
    : { latitude: null, longitude: null, locationSource: '' };
  const id = await addRecord('gastos', {
    fecha,
    hora: normalizeExpenseTime(hora) || currentLocalTime(),
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
    ticketSize: Math.max(0, Number(ticketSize) || 0),
    ticketWidth: Math.max(0, Number(ticketWidth) || 0),
    ticketHeight: Math.max(0, Number(ticketHeight) || 0),
    ticketPhotoTypeId: String(ticketPhotoTypeId || ''),
    ticketPhotoTypeName: String(ticketPhotoTypeName || ''),
    ticketLatitude: ticketLocation.latitude,
    ticketLongitude: ticketLocation.longitude,
    ticketLocationSource: ticketLocation.locationSource,
    ticketCapturedDate: String(ticketCapturedDate || ''),
    ticketCapturedTime: String(ticketCapturedTime || ''),
    ticketMapEnabled: ticketMapEnabled === true && ticketLocation.latitude != null && ticketLocation.longitude != null && ticketLocation.inherited !== true,
    ticketTranslationName: String(ticketTranslationName || ''),
    ticketTranslationType: String(ticketTranslationType || ''),
    ticketTranslationData: normalizeTicketDataValue(ticketTranslationData),
    ticketTranslationSize: Math.max(0, Number(ticketTranslationSize) || 0),
    ticketTranslationWidth: Math.max(0, Number(ticketTranslationWidth) || 0),
    ticketTranslationHeight: Math.max(0, Number(ticketTranslationHeight) || 0),
    ticketTranslationText: String(ticketTranslationText || ''),
    ticketTranslationSourceLanguages: Array.isArray(ticketTranslationSourceLanguages) ? ticketTranslationSourceLanguages.map(String) : [],
    ticketTranslationKind: ticketTranslationData ? (ticketTranslationKind === 'secondary-ticket' ? 'secondary-ticket' : 'translation') : '',
    extraImages: storedExtraImages,
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
  next.ticketPhotoTypeId = String(next.ticketPhotoTypeId || '');
  next.ticketPhotoTypeName = String(next.ticketPhotoTypeName || '');
  next.extraImages = Array.isArray(next.extraImages) ? next.extraImages : [];
  const ticketLocation = next.ticketData
    ? resolvedExpenseTicketLocation(next.ticketLatitude, next.ticketLongitude, next.ticketLocationSource, next.extraImages)
    : { latitude: null, longitude: null, locationSource: '' };
  next.ticketLatitude = ticketLocation.latitude;
  next.ticketLongitude = ticketLocation.longitude;
  next.ticketLocationSource = ticketLocation.locationSource;
  next.ticketCapturedDate = String(next.ticketCapturedDate || '');
  next.ticketCapturedTime = String(next.ticketCapturedTime || '');
  next.ticketMapEnabled = next.ticketMapEnabled === true && next.ticketLatitude != null && next.ticketLongitude != null && ticketLocation.inherited !== true;
  next.ticketTranslationName = String(next.ticketTranslationName || '');
  next.ticketTranslationType = String(next.ticketTranslationType || '');
  next.ticketTranslationData = normalizeTicketDataValue(next.ticketTranslationData);
  next.ticketTranslationSize = Math.max(0, Number(next.ticketTranslationSize) || 0);
  next.ticketTranslationWidth = Math.max(0, Number(next.ticketTranslationWidth) || 0);
  next.ticketTranslationHeight = Math.max(0, Number(next.ticketTranslationHeight) || 0);
  next.ticketTranslationText = String(next.ticketTranslationText || '');
  next.ticketTranslationSourceLanguages = Array.isArray(next.ticketTranslationSourceLanguages) ? next.ticketTranslationSourceLanguages.map(String) : [];
  next.ticketTranslationKind = next.ticketTranslationData ? (next.ticketTranslationKind === 'secondary-ticket' ? 'secondary-ticket' : 'translation') : '';
  next.paisId = next.paisId ? Number(next.paisId) : null;
  next.ciudadId = next.ciudadId ? Number(next.ciudadId) : null;
  next.hora = normalizeExpenseTime(next.hora) || expenseTimeValue(current) || currentLocalTime();
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

function queueExpenseClassificationSave(id, patch) {
  const gastoId = Number(id);
  const operation = pendingExpenseClassificationSave
    .catch(() => {})
    .then(async () => {
      const saved = await updateRecord('gastos', gastoId, patch);
      const index = state.gastos.findIndex(gasto => Number(gasto.id) === gastoId);
      if (index >= 0) state.gastos[index] = saved;
      return saved;
    });
  pendingExpenseClassificationSave = operation.catch(() => {});
  return operation;
}

function queueExpenseMediaSave(callback) {
  const operation = pendingExpenseMediaSave
    .catch(() => {})
    .then(callback);
  pendingExpenseMediaSave = operation.catch(() => {});
  return operation;
}

async function saveOpenExpenseCategoryClassification() {
  const id = Number($('#edit-gasto-id')?.value);
  const catId = Number($('#edit-gasto-cat')?.value);
  if (!id || !catId) return;
  const subcatId = Number($('#edit-gasto-subcat')?.value) || null;
  await queueExpenseClassificationSave(id, { catId, subcatId });
  rememberTicketCategory('edit-gasto');
  setMessage('#msg-edit-gasto', 'Categoría guardada');
}

async function saveOpenExpenseTicketClassification() {
  const id = Number($('#edit-gasto-id')?.value);
  const current = currentEditTicket();
  if (!id || !current?.ticketData || $('#edit-gasto-ticket-remove')?.checked) return;
  const selected = photoTypeById($('#edit-gasto-ticket-type')?.value);
  const saved = await queueExpenseClassificationSave(id, {
    ticketPhotoTypeId: selected ? selected.id : '',
    ticketPhotoTypeName: selected ? selected.nombre : ''
  });
  activeEditTicketRecord = { ...activeEditTicketRecord, ...saved };
  setMessage('#msg-edit-gasto', 'Clasificación del ticket guardada');
}

function expenseTicketLocationPatch(prefix, gasto = null) {
  const selected = pendingExpenseTicketLocations[prefix];
  const existing = gasto ? expenseTicketImageRecord(gasto) : null;
  const point = selected?.latitude != null && selected?.longitude != null
    ? { latitude: selected.latitude, longitude: selected.longitude }
    : storedImageCoordinates(existing);
  return {
    ticketLatitude: point ? point.latitude : null,
    ticketLongitude: point ? point.longitude : null,
    ticketLocationSource: point ? (selected?.locationSource || existing?.locationSource || 'exif') : '',
    ticketCapturedDate: selected?.capturedDate || existing?.capturedDate || '',
    ticketCapturedTime: selected?.capturedTime || existing?.capturedTime || '',
    ticketMapEnabled: Boolean(point && $(`#${prefix}-ticket-map`)?.checked)
  };
}

async function saveOpenExpenseTicketMapSetting() {
  const id = Number($('#edit-gasto-id')?.value);
  const current = currentEditTicket();
  const selectedReplacement = selectedFileInput('#edit-gasto-ticket', '#edit-gasto-ticket-camera')?.files?.[0];
  if (!id || !current?.ticketData || selectedReplacement) return;
  const saved = await queueExpenseClassificationSave(id, expenseTicketLocationPatch('edit-gasto', current));
  activeEditTicketRecord = { ...activeEditTicketRecord, ...saved };
  setMessage('#msg-edit-gasto', $('#edit-gasto-ticket-map')?.checked ? 'Ticket añadido al mapa' : 'Ticket retirado del mapa');
}

function editExpenseImagesFromControls(gasto) {
  return expenseExtraImages(gasto).map((image, index) => {
    const selectedType = photoTypeById($(`[data-expense-image-type="${index}"]`)?.value);
    const hasExactPoint = Boolean(storedImageCoordinates(image));
    return {
      ...image,
      photoTypeId: selectedType ? selectedType.id : '',
      photoTypeName: selectedType ? selectedType.nombre : '',
      mapEnabled: Boolean($(`[data-map-expense-image="${index}"]`)?.checked && hasExactPoint)
    };
  });
}

async function saveOpenExpenseImageClassifications() {
  const id = Number($('#edit-gasto-id')?.value);
  const current = state.gastos.find(gasto => Number(gasto.id) === id);
  if (!id || !current) return;
  const extraImages = editExpenseImagesFromControls(current);
  await queueExpenseClassificationSave(id, { extraImages });
  setMessage('#msg-edit-gasto', 'Clasificación de fotos guardada');
}

async function rotateOpenExpenseImage(imageIndex, direction) {
  const id = Number($('#edit-gasto-id')?.value);
  const current = state.gastos.find(gasto => Number(gasto.id) === id);
  const index = Number(imageIndex);
  if (!id || !current || !Number.isInteger(index)) return;
  const removedIndexes = new Set($$('[data-remove-expense-image]:checked').map(input => Number(input.dataset.removeExpenseImage)));
  const extraImages = editExpenseImagesFromControls(current);
  if (!extraImages[index]) throw new Error('No se encuentra la imagen para girarla.');
  extraImages[index] = normalizeStoredImageRecord(await rotateRasterImageRecord(extraImages[index], direction));
  const saved = await queueExpenseClassificationSave(id, { extraImages });
  renderEditExpenseImages(saved);
  removedIndexes.forEach(removedIndex => {
    const checkbox = $(`[data-remove-expense-image="${removedIndex}"]`);
    if (checkbox) checkbox.checked = true;
  });
  setMessage('#msg-edit-gasto', 'Imagen girada y guardada');
}

async function rotateOpenExpenseTicket(direction) {
  const id = Number($('#edit-gasto-id')?.value);
  const current = currentEditTicket();
  if (!id || !expenseTicketIsRasterImage(current)) throw new Error('El ticket actual no es una imagen que se pueda girar.');
  const ticket = ticketDataInfo(current.ticketData, current.ticketType || 'image/jpeg');
  const rotated = await rotateRasterImageRecord({
    name: current.ticketName || 'ticket',
    type: current.ticketType || ticket.blob.type || 'image/jpeg',
    size: ticket.blob.size,
    data: ticket.data
  }, direction);
  const saved = await queueExpenseClassificationSave(id, {
    ticketName: rotated.name,
    ticketType: rotated.type,
    ticketData: rotated.data,
    ticketSize: rotated.size || 0,
    ticketWidth: rotated.width || 0,
    ticketHeight: rotated.height || 0
  });
  activeEditTicketRecord = { ...activeEditTicketRecord, ...saved };
  renderEditExpenseTicket(activeEditTicketRecord);
  setMessage('#msg-edit-gasto', 'Ticket girado y guardado');
}

async function handleOpenExpenseTicketRotation(direction) {
  const buttons = $$('#edit-gasto-ticket-rotate button');
  const saveButton = $('#edit-gasto-form button[type="submit"]');
  buttons.forEach(button => { button.disabled = true; });
  if (saveButton) saveButton.dataset.waitingForTicketRotation = '1';
  try {
    await queueExpenseMediaSave(() => rotateOpenExpenseTicket(direction));
  } catch (err) {
    setMessage('#msg-edit-gasto', err.message || String(err), true);
  } finally {
    buttons.forEach(button => { button.disabled = false; });
    if (saveButton) delete saveButton.dataset.waitingForTicketRotation;
  }
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
  const [cuentas, categorias, lugares, gastos, viajes, viajeDocumentos, blogEntries, timelineDays, monedas, transferencias, photoTypeSetting, ticketOcrLanguageSetting] = await Promise.all([
    getAll('cuentas'),
    getAll('categorias'),
    getAll('lugares'),
    getAll('gastos'),
    getAll('viajes'),
    getAll('tripDocuments'),
    getAll('blogEntries'),
    getAll('timelineDays'),
    getAll('monedas'),
    getAll('transferencias'),
    getOne('appSettings', PHOTO_TYPES_SETTING_KEY),
    getOne('appSettings', TICKET_OCR_LANGUAGES_SETTING_KEY)
  ]);
  state.cuentas = cuentas.sort(byName);
  state.categorias = sortCategoriasHierarchical(categorias);
  state.photoTypes = normalizePhotoTypes(photoTypeSetting && photoTypeSetting.items);
  if (!photoTypeSetting) {
    state.photoTypes = normalizePhotoTypes(DEFAULT_PHOTO_TYPES);
    await putRecord('appSettings', { key: PHOTO_TYPES_SETTING_KEY, items: state.photoTypes, updatedAt: new Date().toISOString() });
  }
  state.ticketOcrLanguages = normalizeTicketOcrLanguages(ticketOcrLanguageSetting?.codes || ['spa']);
  state.lugares = sortLugaresHierarchical(lugares);
  state.gastos = gastos.map(g => ({
    ...g,
    hora: normalizeExpenseTime(g.hora) || expenseTimeValue(g),
    extraImages: Array.isArray(g.extraImages) ? g.extraImages : [],
    importeEur: g.importeEur ?? toEur(g.importe, g.moneda)
  }));
  state.viajes = viajes.sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || '') || byName(a, b));
  state.viajeDocumentos = viajeDocumentos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  state.blogEntries = blogEntries.sort(compareBlogEntries);
  state.timelineDays = timelineDays.sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
  const previousSelectedTripIds = selectedTripIds();
  const validSelectedTripIds = previousSelectedTripIds.filter(id => state.viajes.some(v => v.id === id));
  if (!validSelectedTripIds.length && !hasAppliedDefaultTripSelection && state.viajes.length) {
    const defaultTripIdValue = defaultTripId();
    setSelectedTrips(defaultTripIdValue ? [defaultTripIdValue] : []);
    hasAppliedDefaultTripSelection = true;
  } else {
    setSelectedTrips(validSelectedTripIds, {
      preserveMapState: validSelectedTripIds.length === previousSelectedTripIds.length
    });
  }
  state.monedas = monedas.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  state.transferencias = transferencias.sort(compareTransferenciasChronologically);
  renderAll();
  restoreInlineFormDrafts();
  selectedTripIds().forEach(tripId => warmTicketOcrLanguagesForTrip(tripId).catch(() => {}));
  if (state.activeTab === 'resumen') renderResumen();
  if (state.activeTab === 'mapa') renderMapPaises();
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
  renderPhotoTypeControls();
  renderTicketOcrLanguageControls();
  renderExpenseTicketLanguageSelect('g');
  renderExpenseTicketLanguageSelect('edit-gasto');
  renderLugares();
  renderGastosTabla();
  renderBackupStatus();
  syncBlogAvailability();
  renderBlog();
  if (!$('#g-fecha').value) $('#g-fecha').value = todayIso();
  if ($('#g-hora') && !$('#g-hora').value) $('#g-hora').value = currentLocalTime();
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
  } else if (!paisIds.length || !paisIds.includes(Number($('#g-pais').value))) {
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
  const tripId = Number($(tripSelector) ? $(tripSelector).value : 0);
  const trip = state.viajes.find(v => Number(v.id) === tripId);
  const tripPaisIds = tripCountryScopeForSelector(tripSelector);
  const allowedPaisIds = selectedPais ? [selectedPais] : tripPaisIds;
  const allowedCityIds = new Set(tripCityIds(trip));
  if (tripId) {
    state.gastos
      .filter(gasto => Number(gasto.viajeId) === tripId && gasto.ciudadId)
      .forEach(gasto => allowedCityIds.add(Number(gasto.ciudadId)));
  }
  return state.lugares
    .filter(l => l.parentId && (!allowedPaisIds.length || allowedPaisIds.includes(Number(l.parentId))))
    .filter(l => !tripId || allowedCityIds.has(Number(l.id)))
    .map(l => ({ value: String(l.id), label: l.nombre }));
}

function latestExpenseLocationForDate(tripId, fecha) {
  const limitDate = fecha || currentLocalDate();
  const candidates = state.gastos
    .filter(gasto => Number(gasto.viajeId) === Number(tripId) && gasto.ciudadId && (!limitDate || (gasto.fecha || '') <= limitDate));
  const mostRecentlyEntered = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || Number(b.id || 0) - Number(a.id || 0);
  const sameDay = candidates.filter(gasto => (gasto.fecha || '') === limitDate).sort(mostRecentlyEntered);
  if (sameDay.length) return sameDay[0];
  return candidates
    .filter(gasto => (gasto.fecha || '') < limitDate)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || mostRecentlyEntered(a, b))[0] || null;
}

function applyDefaultExpenseLocation() {
  if (!$('#g-viaje') || !$('#g-pais') || !$('#g-ciudad')) return;
  const tripId = Number($('#g-viaje').value);
  const latest = tripId ? latestExpenseLocationForDate(tripId, $('#g-fecha').value) : null;
  if (!latest) {
    applyDefaultTripCountryToExpense();
    $('#g-ciudad').value = '';
    return;
  }
  const city = state.lugares.find(lugar => Number(lugar.id) === Number(latest.ciudadId));
  const countryId = Number(latest.paisId || (city && city.parentId));
  if (countryId) $('#g-pais').value = String(countryId);
  renderCiudades();
  if ([...$('#g-ciudad').options].some(option => Number(option.value) === Number(latest.ciudadId))) {
    $('#g-ciudad').value = String(latest.ciudadId);
  }
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
  if ($('#c-tipo')) $('#c-tipo').value = normalizeAccountType(template.accountType);
}

function renderTripSelectors() {
  const trips = state.viajes.map(v => ({ value: String(v.id), label: v.nombre }));
  fillSelect('#g-viaje', trips, '(sin viaje)');
  fillSelect('#f-viaje', trips, '(todos)');
  fillSelect('#r-viaje', trips, '(todos)');
  fillSelect('#map-viaje', trips, '(todos)');
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
  renderTripComparisonSelectors();
  renderTripComparison();
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
    .filter(c => Number(c.parentId) === catId)
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
    .filter(c => Number(c.parentId) === catId)
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
  const gastos = gastosForSelectorTripScope('#map-viaje');
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
  if (state.activeTab === 'mapa') renderTripMap();
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
    const totalSaldoEur = accounts.reduce((sum, c) => sum + toEur(c.saldoActual, c.moneda), 0);
    if (!accounts.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6">No hay cuentas ni gastos asociados a ${escapeHtml(trip ? trip.nombre : 'este viaje')}.</td>`;
      tbody.appendChild(tr);
      return;
    }
    accounts.forEach(c => {
      const isTripAccount = Number(c.viajeId) === selectedTripId;
      const saldo = numberValue(c.saldoActual);
      const tr = document.createElement('tr');
      tr.dataset.editableType = 'cuenta';
      tr.dataset.editableId = String(c.id);
      if (saldo < 0) tr.className = 'warning-row';
      const migrate = !isTripAccount && usedAccountIds.has(Number(c.id))
        ? ` <button class="ghost" data-migrate-cuenta="${c.id}" data-migrate-viaje="${selectedTripId}">Pasar a viaje</button>`
        : '';
      const tripCell = isTripAccount ? escapeHtml(trip ? trip.nombre : 'Viaje') : `${escapeHtml(trip ? trip.nombre : 'Viaje')} <span class="badge">Global usada</span>`;
      tr.innerHTML = `<td>${escapeHtml(c.nombre)}</td><td>${escapeHtml(accountTypeLabel(c, true))}</td><td>${tripCell}</td><td><span class="badge">${escapeHtml(c.moneda)}</span></td><td>${fmtCurrencyWithEur(saldo, c.moneda)}</td><td><button class="ghost" data-edit-cuenta="${c.id}">Editar</button> <button class="ghost" data-del-cuenta="${c.id}">Eliminar</button>${migrate}</td>`;
      tbody.appendChild(tr);
    });
    const tr = document.createElement('tr');
    tr.className = 'subtotal-row';
    tr.innerHTML = `<td>Total cuentas</td><td>-</td><td>${escapeHtml(trip ? trip.nombre : 'Viaje')}</td><td><span class="badge">EUR</span></td><td>${fmtCurrency(totalSaldoEur, 'EUR')}</td><td>-</td>`;
    tbody.appendChild(tr);
    return;
  }
  state.cuentas.filter(c => !c.viajeId).forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.editableType = 'cuenta';
    tr.dataset.editableId = String(c.id);
    if (numberValue(c.saldoActual) < 0) tr.className = 'warning-row';
    tr.innerHTML = `<td>${escapeHtml(c.nombre)}</td><td>${escapeHtml(accountTypeLabel(c, true))}</td><td><span class="badge">Global</span></td><td><span class="badge">${escapeHtml(c.moneda)}</span></td><td>${fmtCurrencyWithEur(c.saldoActual, c.moneda)}</td><td><button class="ghost" data-edit-cuenta="${c.id}">Editar</button> <button class="ghost" data-del-cuenta="${c.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderTransferencias() {
  const tbody = $('#tabla-transferencias tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const selectedIds = selectedTripSet();
  state.transferencias.filter(t => {
    if (!selectedIds.size) return true;
    const source = state.cuentas.find(c => c.id === Number(t.fromId));
    const target = state.cuentas.find(c => c.id === Number(t.toId));
    return selectedIds.has(Number(source && source.viajeId)) || selectedIds.has(Number(target && target.viajeId));
  }).sort(compareTransferenciasChronologically).forEach(t => {
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
    const documentCount = tripDocumentsFor(v.id).length;
    const tr = document.createElement('tr');
    tr.className = 'trip-row';
    tr.dataset.tripId = String(v.id);
    tr.innerHTML = `<td>${escapeHtml(v.nombre)}</td><td>${escapeHtml(tripCountryLabel(v))}</td><td>${fmtDate(v.fechaInicio)}</td><td>${fmtDate(v.fechaFin)}</td><td>${budget ? fmtCurrency(budget, 'EUR') : '-'}</td><td><select class="trip-config-action-select" data-trip-config-action="${v.id}" aria-label="Acciones de ${escapeHtml(v.nombre)}"><option value="">Acciones</option><option value="review">Revisar viaje</option><option value="documents">Documentos viaje (${documentCount})</option><option value="edit">Editar</option><option value="delete">Eliminar</option></select></td>`;
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
    if (!m.base) {
      tr.dataset.editableType = 'moneda';
      tr.dataset.editableId = String(m.codigo);
    }
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
  renderTicketOcrLanguageControls();
  if (!state.viajes.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="10">Todavía no hay viajes. Puedes crearlos en Configuración.</td>';
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
    header.innerHTML = `<td class="trip-year-title" colspan="10"><label class="trip-check"><input type="checkbox" data-trip-year="${escapeHtml(year)}"${yearChecked ? ' checked' : ''}> <span>Año ${escapeHtml(year)}</span></label><span class="trip-year-help">Selecciona el año para sumar todos sus viajes</span></td>`;
    tbody.appendChild(header);
    const yearInput = header.querySelector('input[data-trip-year]');
    let yearExpenses = 0;
    let yearDays = 0;
    let yearTotal = 0;
    let yearBudget = 0;
    yearTrips.forEach(v => {
      const expenses = state.gastos.filter(g => g.viajeId === v.id);
      const days = inclusiveDateDays(v.fechaInicio, v.fechaFin);
      const total = expenses.reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
      const dailyAverage = tripDailyExpenseAverage(total, days);
      const budget = effectiveTripBudget(v);
      const remaining = budget ? budget - total : null;
      yearExpenses += expenses.length;
      yearDays += days;
      yearTotal += total;
      yearBudget += budget;
      const tr = document.createElement('tr');
      if (remaining !== null && remaining < 0) tr.className = 'warning-row';
      tr.classList.add('trip-row');
      tr.dataset.tripId = String(v.id);
      const documentCount = tripDocumentsFor(v.id).length;
      const actionOptions = `<option value="">Acciones</option><option value="review">Revisar viaje</option><option value="documents">Documentos viaje (${documentCount})</option><option value="edit">Editar</option>`;
      tr.innerHTML = `<td class="trip-name-col"><label class="trip-check"><input type="checkbox" data-trip-check="${v.id}"${selectedIds.has(v.id) ? ' checked' : ''}> <span>${escapeHtml(v.nombre)}</span></label></td><td class="trip-start-col">${fmtTripDate(v.fechaInicio)}</td><td class="trip-end-col">${fmtTripDate(v.fechaFin)}</td><td class="trip-days-col">${days || '-'}</td><td class="trip-daily-col">${dailyAverage === null ? '-' : fmtCurrency(dailyAverage, 'EUR')}</td><td class="trip-total-col">${fmtCurrency(total, 'EUR')}</td><td class="trip-expenses-col">${expenses.length}</td><td class="trip-budget-col">${budget ? fmtCurrency(budget, 'EUR') : '-'}</td><td class="trip-remaining-col">${remaining === null ? '-' : fmtCurrency(remaining, 'EUR')}</td><td class="trip-home-actions trip-actions-col"><select class="trip-home-action-select" data-trip-home-action="${v.id}" aria-label="Acciones de ${escapeHtml(v.nombre)}">${actionOptions}</select></td>`;
      tbody.appendChild(tr);
    });
    const subtotal = document.createElement('tr');
    const yearRemaining = yearBudget ? yearBudget - yearTotal : null;
    const yearDailyAverage = tripDailyExpenseAverage(yearTotal, yearDays);
    subtotal.className = yearRemaining !== null && yearRemaining < 0 ? 'warning-row' : 'subtotal-row';
    subtotal.innerHTML = `<td class="trip-subtotal-label" colspan="3">Subtotal ${escapeHtml(year)}</td><td class="trip-days-col">${yearDays || '-'}</td><td class="trip-daily-col">${yearDailyAverage === null ? '-' : fmtCurrency(yearDailyAverage, 'EUR')}</td><td class="trip-total-col">${fmtCurrency(yearTotal, 'EUR')}</td><td class="trip-expenses-col">${yearExpenses}</td><td class="trip-budget-col">${yearBudget ? fmtCurrency(yearBudget, 'EUR') : '-'}</td><td class="trip-remaining-col">${yearRemaining === null ? '-' : fmtCurrency(yearRemaining, 'EUR')}</td><td class="trip-actions-col"></td>`;
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
      ? subcats.map(sub => `<div class="place-row" data-editable-type="categoria" data-editable-id="${sub.id}">
          <div class="place-name"><strong>${escapeHtml(sub.nombre)}</strong><span>Subcategoría</span></div>
          <div class="place-actions"><button class="ghost" data-edit-cat="${sub.id}">Editar</button><button class="ghost" data-del-cat="${sub.id}">Eliminar</button></div>
        </div>`).join('')
      : '<p class="small">Todavía no hay subcategorías en esta categoría.</p>';
    return `<details class="category-node" data-category-node="${cat.id}" data-editable-type="categoria" data-editable-id="${cat.id}"${open}>
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
      ? cityList.map(ciudad => `<div class="place-row" data-editable-type="lugar" data-editable-id="${ciudad.id}">
          <div class="place-name"><strong>${escapeHtml(ciudad.nombre)}</strong><span>${escapeHtml(lugarCoordsLabel(ciudad))}</span></div>
          <div class="place-actions"><button class="ghost" data-locate-lugar="${ciudad.id}">Localizar</button><button class="ghost" data-edit-lugar="${ciudad.id}">Editar</button><button class="ghost" data-del-lugar="${ciudad.id}">Eliminar</button></div>
        </div>`).join('')
      : '<p class="small">Todavía no hay ciudades en este país.</p>';
    return `<details class="country-node" data-country-node="${pais.id}" data-editable-type="lugar" data-editable-id="${pais.id}"${open}>
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
    .sort(compareExpensesChronologically);
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

function applyExpenseFilters() {
  renderGastosTabla();
  closeFiltersPanel();
  const trigger = $('#btn-open-filters');
  if (!trigger) return;
  try {
    trigger.focus({ preventScroll: true });
  } catch (_) {
    trigger.focus();
  }
}

function expenseGroupKey(expense) {
  return `${expense.fecha || ''}|${expense.viajeId || ''}`;
}

function syncOpenExpenseGroups(groupKeys) {
  const scope = groupKeys.join(',');
  if (openExpenseGroupsScope === scope) return;
  openExpenseGroupsScope = scope;
  openExpenseGroups = new Set(groupKeys.length ? [groupKeys[groupKeys.length - 1]] : []);
}

function renderGastosTabla() {
  const tbody = $('#tabla-gastos tbody');
  tbody.innerHTML = '';
  applyExpenseViewMode();
  updateMobileClearFilters();
  const rows = filteredGastos();
  const expensesInBlog = new Set(state.blogEntries
    .filter(entry => entry.tipo === 'gasto' && entry.sourceGastoId)
    .map(entry => Number(entry.sourceGastoId)));
  if ($('#btn-last-expense')) $('#btn-last-expense').disabled = !rows.length;
  const byGroup = {};
  rows.forEach(g => {
    const key = expenseGroupKey(g);
    (byGroup[key] = byGroup[key] || []).push(g);
  });
  const groupKeys = Object.keys(byGroup).sort((a, b) => {
    const [dateA, tripA] = a.split('|');
    const [dateB, tripB] = b.split('|');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const nameA = (state.viajes.find(v => v.id === Number(tripA)) || {}).nombre || '';
    const nameB = (state.viajes.find(v => v.id === Number(tripB)) || {}).nombre || '';
    return collator.compare(nameA, nameB);
  });
  syncOpenExpenseGroups(groupKeys);
  const tableView = ($('#f-view') ? $('#f-view').value : 'table') === 'table';
  let totalEur = 0;
  groupKeys.forEach(key => {
    const [date] = key.split('|');
    const destinationCity = gastosDestinoCiudadName(byGroup[key]);
    const paisNames = gastosPaisNames(byGroup[key]);
    const chips = [
      destinationCity ? `<span class="group-chip city-chip">${escapeHtml(destinationCity)}</span>` : '',
      ...paisNames.map(name => `<span class="group-chip country-chip">${escapeHtml(name)}</span>`)
    ].filter(Boolean).join(' ');
    const dateTitle = date ? `Día ${blogDayDateLabel(date)}` : 'Sin fecha';
    const title = `${dateTitle}${chips ? ` ${chips}` : ''}`;
    const isOpen = !tableView || openExpenseGroups.has(key);
    const header = document.createElement('tr');
    header.className = tableView ? 'group-row expense-day-row' : 'group-row';
    header.innerHTML = tableView
      ? `<td colspan="10"><button type="button" class="expense-day-toggle" data-expense-group-toggle="${escapeHtml(key)}" aria-expanded="${isOpen}"><span aria-hidden="true">${isOpen ? '−' : '+'}</span><span class="expense-day-title">${title}</span></button></td>`
      : `<td colspan="10"><b>${title}</b></td>`;
    tbody.appendChild(header);
    let subtotalEur = 0;
    byGroup[key].sort(compareExpensesChronologically).forEach(g => {
      const cat = state.categorias.find(c => c.id === g.catId);
      const sub = state.categorias.find(c => c.id === g.subcatId);
      const cta = state.cuentas.find(c => c.id === g.cuentaId);
      const eur = toEur(g.importe, g.moneda);
      subtotalEur += eur;
      totalEur += eur;
      const tr = document.createElement('tr');
      tr.className = 'expense-row';
      tr.dataset.gastoId = String(g.id);
      tr.dataset.expenseGroupEntry = key;
      tr.hidden = !isOpen;
      const attachmentCount = expenseAttachmentCount(g);
      const filesOption = attachmentCount
        ? `<option value="files">Ver archivos (${attachmentCount})</option>`
        : '<option value="files" disabled>Ver archivos (ninguno)</option>';
      const blogOption = g.viajeId
        ? `<option value="blog">${expensesInBlog.has(Number(g.id)) ? '✓ Ya está en el Blog (actualizar)' : 'Añadir al Blog'}</option>`
        : '<option value="blog" disabled>Añadir al blog (sin viaje)</option>';
      const attachmentIndicator = attachmentCount
        ? `<button type="button" class="expense-attachment-indicator" data-expense-files="${g.id}" title="${attachmentCount} archivo(s) adjunto(s)" aria-label="Ver ${attachmentCount} archivo(s) adjunto(s)">📎 ${attachmentCount}</button>`
        : '';
      tr.innerHTML = `<td data-label="Hora">${escapeHtml(expenseTimeValue(g) || '-')}</td><td data-label="Ciudad">${escapeHtml(gastoCiudadLabel(g))}</td><td data-label="Categoría">${escapeHtml(cat ? cat.nombre : '?')}</td><td data-label="Subcat.">${escapeHtml(sub ? sub.nombre : '-')}</td><td data-label="Cuenta">${escapeHtml(cta ? accountLabel(cta) : '?')}</td><td data-label="Moneda">${escapeHtml(g.moneda)}</td><td data-label="Importe">${fmtCurrency(g.importe, g.moneda)}</td><td data-label="EUR">${g.moneda === 'EUR' ? '' : fmtCurrency(eur, 'EUR')}</td><td class="expense-description-cell" data-label="Descripción"><span>${escapeHtml(g.desc || '')}</span>${attachmentIndicator}</td><td class="action-col" data-label="Acciones"><select class="expense-action-select" data-gasto-action="${g.id}" aria-label="Acciones del gasto"><option value="">Acciones</option>${filesOption}${blogOption}<option value="edit">Editar</option><option value="dup">Duplicar</option><option value="del">Eliminar</option></select></td>`;
      tbody.appendChild(tr);
    });
    const subtotal = document.createElement('tr');
    subtotal.className = 'subtotal-row';
    subtotal.dataset.expenseGroupEntry = key;
    subtotal.hidden = !isOpen;
    subtotal.innerHTML = `<td colspan="7" style="text-align:right"><i>Subtotal</i></td><td>${fmtCurrency(subtotalEur, 'EUR')}</td><td colspan="2"></td>`;
    tbody.appendChild(subtotal);
  });
  $('#tg-total').textContent = fmtCurrency(totalEur, 'EUR');
}

function drawPieChart(container, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const w = 360;
  const legendStartY = 38;
  const legendRowHeight = 22;
  const h = Math.max(240, legendStartY + Math.max(0, data.length - 1) * legendRowHeight + 24);
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
    const legendY = legendStartY + i * legendRowHeight;
    svg += `<rect x="190" y="${legendY}" width="10" height="10" fill="${color}"></rect><text x="208" y="${legendY + 9}" font-size="8.5" fill="#374151">${escapeHtml(item.label.slice(0, 26))}</text>`;
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
  const selectedMapTripId = Number($('#map-viaje') ? $('#map-viaje').value : 0);
  if (selectedMapTripId) ids.add(selectedMapTripId);
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

function destinationRouteScope(trip) {
  const completeStops = tripRouteStops(trip).map((stop, routeIndex) => ({ ...stop, routeIndex }));
  const completeIds = completeStops.map(stop => Number(stop.cityId)).filter(Boolean);
  const destinationStops = completeStops.filter(stop => stop.role === ROUTE_STOP_ROLE_DESTINATION);
  const applied = tripMapState.destinationOnly && destinationStops.length > 0;
  const visibleStops = applied ? destinationStops : completeStops;
  const visibleIds = visibleStops.map(stop => Number(stop.cityId)).filter(Boolean);
  const visibleIdSet = new Set(visibleIds);
  return {
    completeStops,
    completeIds,
    visibleStops,
    applied,
    visibleIds,
    omittedIds: applied ? new Set(completeIds.filter(id => !visibleIdSet.has(id))) : new Set()
  };
}

function firstDestinationArrivalForTrip(trip, scope = destinationRouteScope(trip)) {
  const firstStop = scope.completeStops.find(stop => stop.role === ROUTE_STOP_ROLE_DESTINATION);
  if (!trip || !firstStop) return null;
  const city = state.lugares.find(place => Number(place.id) === Number(firstStop.cityId));
  const inferredDates = tripRouteArrivalDates(trip, scope.completeIds);
  const configuredDate = firstStop.date || inferredDates[firstStop.routeIndex] || '';
  const eligible = record => {
    const date = String(record && record.fecha || '');
    return Boolean(date) && (!configuredDate || date >= configuredDate);
  };
  const compare = (a, b) => `${a.fecha || ''}T${normalizeExpenseTime(a.hora) || '99:99'}`
    .localeCompare(`${b.fecha || ''}T${normalizeExpenseTime(b.hora) || '99:99'}`);
  const routeCities = [...new Set(scope.completeIds)]
    .map(id => state.lugares.find(place => Number(place.id) === Number(id)))
    .filter(place => place && lugarHasCoords(place));
  const exactCandidates = city && lugarHasCoords(city)
    ? dailyMapRecordsForScope(new Set([Number(trip.id)]), 0)
      .filter(eligible)
      .filter(record => {
        const nearest = routeCities
          .map(place => ({
            id: Number(place.id),
            distance: geographicDistanceMeters(
              { latitude: record.latitude, longitude: record.longitude },
              { latitude: Number(place.lat), longitude: Number(place.lng) }
            )
          }))
          .sort((a, b) => a.distance - b.distance)[0];
        return nearest
          && nearest.id === Number(firstStop.cityId)
          && nearest.distance <= DESTINATION_RECORD_MAX_DISTANCE_METERS;
      })
      .sort(compare)
    : [];
  const cityCandidates = [...state.blogEntries, ...state.gastos]
    .filter(record => Number(record.viajeId) === Number(trip.id))
    .filter(record => Number(record.ciudadId) === Number(firstStop.cityId))
    .filter(eligible)
    .sort(compare);
  const arrival = exactCandidates[0] || cityCandidates[0] || null;
  return {
    cityId: Number(firstStop.cityId),
    fecha: String(arrival && arrival.fecha || configuredDate || ''),
    hora: normalizeExpenseTime(arrival && arrival.hora)
  };
}

function mapRecordPrecedesFirstDestination(record, trip, scope) {
  const arrival = firstDestinationArrivalForTrip(trip, scope);
  if (!arrival || !arrival.fecha) return false;
  const recordDate = String(record && record.fecha || '');
  if (!recordDate) return false;
  if (recordDate !== arrival.fecha) return recordDate < arrival.fecha;
  const recordTime = normalizeExpenseTime(record && record.hora);
  return Boolean(arrival.hora && recordTime && recordTime < arrival.hora);
}

function tripDateWithinRange(date, trip) {
  const value = String(date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (trip && trip.fechaInicio && value < trip.fechaInicio) return false;
  if (trip && trip.fechaFin && value > trip.fechaFin) return false;
  return true;
}

function tripRouteArrivalDates(trip, routeIds = tripCityIds(trip)) {
  const ids = routeIds.map(Number).filter(Boolean);
  if (!trip || !ids.length) return ids.map(() => '');
  const actualDates = new Map();
  const fallbackDates = new Map();
  const append = (target, cityId, date) => {
    const id = Number(cityId);
    const value = String(date || '');
    if (!id || !tripDateWithinRange(value, trip)) return;
    if (!target.has(id)) target.set(id, new Set());
    target.get(id).add(value);
  };
  state.blogEntries
    .filter(entry => Number(entry.viajeId) === Number(trip.id))
    .forEach(entry => {
      append(actualDates, entry.ciudadId, entry.fecha);
      blogEntryImages(entry).forEach(image => append(actualDates, entry.ciudadId, image.capturedDate));
    });
  state.gastos
    .filter(gasto => Number(gasto.viajeId) === Number(trip.id))
    .forEach(gasto => {
      expenseExtraImages(gasto).forEach(image => append(actualDates, gasto.ciudadId, image.capturedDate));
      append(fallbackDates, gasto.ciudadId, gasto.fecha);
    });
  const occurrences = new Map();
  ids.forEach((id, index) => {
    if (!occurrences.has(id)) occurrences.set(id, []);
    occurrences.get(id).push(index);
  });
  const configuredStops = tripRouteStops(trip);
  const result = ids.map((id, index) => (
    Number(configuredStops[index] && configuredStops[index].cityId) === id
      ? configuredStops[index].date || ''
      : ''
  ));
  occurrences.forEach((indexes, cityId) => {
    const source = actualDates.get(cityId) && actualDates.get(cityId).size
      ? actualDates.get(cityId)
      : fallbackDates.get(cityId);
    const dates = source ? [...source].sort() : [];
    indexes.forEach((routeIndex, occurrenceIndex) => {
      if (!dates.length || result[routeIndex]) return;
      const dateIndex = indexes.length === 1
        ? 0
        : Math.round((occurrenceIndex * (dates.length - 1)) / (indexes.length - 1));
      result[routeIndex] = dates[dateIndex] || '';
    });
  });
  if (trip.fechaInicio && !result[0]) result[0] = trip.fechaInicio;
  if (trip.fechaFin && !result[result.length - 1]) result[result.length - 1] = trip.fechaFin;
  return result;
}

function mapRouteCities(gastos, paisId) {
  const byCity = new Map();
  const routeOrder = mapCityOrderForScope(gastos);
  const scopedTrips = mapScopedTrips(gastos);
  const scopedTripIds = mapScopedTripIds(gastos);
  const destinationTrip = scopedTrips.length === 1 ? scopedTrips[0] : null;
  gastos
    .filter(g => gastoMatchesLugarFilters(g, paisId, ''))
    .filter(g => mapRecordMatchesDestination(g, destinationTrip))
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
        const destinationCity = cityWithAccommodationDestination(ciudad, g.viajeId, g.fecha);
        byCity.set(key, {
          ciudad: destinationCity,
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
    const scopedTrip = scopedTrips[0];
    const destinationScope = destinationRouteScope(scopedTrip);
    const omittedEndpointIds = destinationScope.omittedIds;
    const plannedStops = destinationScope.visibleStops;
    const plannedIds = plannedStops.map(stop => Number(stop.cityId));
    const completeArrivalDates = tripRouteArrivalDates(scopedTrip, destinationScope.completeIds);
    if (!plannedIds.length) {
      return [...byCity.values()]
        .filter(item => !omittedEndpointIds.has(Number(item.ciudad.id)))
        .sort((a, b) => {
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
    const plannedItems = plannedStops.map((stop, index) => {
      const id = Number(stop.cityId);
      const baseCity = state.lugares.find(l => Number(l.id) === Number(id));
      const arrivalDate = stop.date || completeArrivalDates[stop.routeIndex] || '';
      const ciudad = cityWithAccommodationDestination(baseCity, scopedTrip.id, arrivalDate);
      if (!ciudad || isTransitPlaceName(ciudad.nombre)) return null;
      const pais = state.lugares.find(l => Number(l.id) === Number(ciudad.parentId));
      if (paisId && Number(pais && pais.id) !== Number(paisId)) return null;
      const expenseItem = byCity.get(id);
      if (!tripMapState.showPlanned && !expenseItem) return null;
      seenPlanned.add(id);
      return {
        ciudad,
        pais,
        firstDate: arrivalDate,
        firstOrder: expenseItem ? expenseItem.firstOrder : index,
        routeOrder: stop.routeIndex,
        count: expenseItem ? expenseItem.count : 0,
        totalEur: expenseItem ? expenseItem.totalEur : 0,
        plannedOnly: tripMapState.showPlanned && !expenseItem,
        repeatedStop: plannedIds.indexOf(id) !== index,
        stopRole: stop.role
      };
    }).filter(Boolean);
    const extraExpenseItems = [...byCity.values()]
      .filter(item => !seenPlanned.has(Number(item.ciudad.id)))
      .filter(item => !omittedEndpointIds.has(Number(item.ciudad.id)));
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
  const exactPoints = items.length > 0 && items.every(item => item.blogPoint || item.photoPoint || (item.dailyPoint && !item.cityFallback));
  if (items.length <= 1) return exactPoints ? 17 : 13;
  const maximumZoom = exactPoints ? 17 : 13;
  for (let zoom = maximumZoom; zoom >= TRIP_MAP_MIN_ZOOM; zoom -= 1) {
    const points = items.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom));
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= width * 0.68 && spanY <= height * 0.58) return zoom;
  }
  return TRIP_MAP_MIN_ZOOM;
}

function chooseBlogMapZoom(items, width, height) {
  if (items.length <= 1) return 16;
  for (let zoom = 17; zoom >= TRIP_MAP_MIN_ZOOM; zoom -= 1) {
    const points = items.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom));
    const spanX = Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x));
    const spanY = Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y));
    if (spanX <= width * 0.68 && spanY <= height * 0.62) return zoom;
  }
  return TRIP_MAP_MIN_ZOOM;
}

function blogMapViewport(items, width, height) {
  const usableItems = items.filter(item => lugarHasCoords(item.ciudad));
  if (!usableItems.length) throw new Error('No hay puntos válidos para encuadrar el mapa del Blog.');
  const zoom = chooseBlogMapZoom(usableItems, width, height);
  const world = usableItems.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom));
  const centerWorld = {
    x: (Math.min(...world.map(point => point.x)) + Math.max(...world.map(point => point.x))) / 2,
    y: (Math.min(...world.map(point => point.y)) + Math.max(...world.map(point => point.y))) / 2
  };
  const center = mapLatLngFromWorldPoint(centerWorld.x, centerWorld.y, zoom);
  return { zoom, layer: mapTileLayer(center.latitude, center.longitude, zoom, width, height) };
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
  const gastos = gastosForSelectorTripScope('#map-viaje');
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

function currentMapTrip() {
  const selectedMapTripId = Number($('#map-viaje') ? $('#map-viaje').value : 0);
  if (selectedMapTripId) return state.viajes.find(v => Number(v.id) === selectedMapTripId) || null;
  const ids = selectedTripIds();
  if (ids.length === 1) return state.viajes.find(v => Number(v.id) === ids[0]) || null;
  const gastos = gastosForSelectorTripScope('#map-viaje');
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
  openRouteDialog(trip, { preferConfigured: true, optionMode: 'tripCountries' });
}

function routeCityOptionsForTrip(trip) {
  const routeIds = routeEditorState.stops.map(stop => Number(stop && stop.cityId)).filter(Boolean);
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

function fillPhotoTypeSelect(selector) {
  const select = $(selector);
  if (!select) return;
  const selected = select.value;
  select.innerHTML = photoTypeOptionsHtml(selected);
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}

function renderPhotoTypes() {
  const container = $('#photo-types-list');
  if (!container) return;
  container.innerHTML = state.photoTypes.length
    ? `<ul>${state.photoTypes.map(type => `<li data-editable-type="foto" data-editable-id="${escapeHtml(type.id)}"><span><strong>${escapeHtml(type.nombre)}</strong>${type.useAsDestination ? '<small>Destino de alojamiento</small>' : ''}</span><div><button type="button" class="ghost" data-edit-photo-type="${escapeHtml(type.id)}">Editar</button><button type="button" class="ghost" data-delete-photo-type="${escapeHtml(type.id)}">Eliminar</button></div></li>`).join('')}</ul>`
    : '<p class="small">No hay tipos de fotos configurados.</p>';
}

function renderPhotoTypeControls() {
  fillPhotoTypeSelect('#g-ticket-type');
  fillPhotoTypeSelect('#edit-gasto-ticket-type');
  renderSelectedExpenseImageClassifications('g');
  renderSelectedExpenseImageClassifications('edit-gasto');
  renderPhotoTypes();
}

function moveRouteStop(fromIndex, toIndex) {
  const from = Number(fromIndex);
  const to = Math.max(0, Math.min(routeEditorState.stops.length - 1, Number(toIndex)));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
  const stops = routeEditorState.stops.slice();
  const [item] = stops.splice(from, 1);
  stops.splice(to, 0, item);
  routeEditorState.stops = stops;
}

function routeStopRoleOptionsHtml(selectedRole = ROUTE_STOP_ROLE_DESTINATION) {
  const roles = [
    { value: ROUTE_STOP_ROLE_DESTINATION, label: 'Destino' },
    { value: ROUTE_STOP_ROLE_TRANSIT, label: 'En tránsito' },
    { value: ROUTE_STOP_ROLE_ENDPOINT, label: 'Inicio / regreso' }
  ];
  return roles.map(role => `<option value="${role.value}"${role.value === selectedRole ? ' selected' : ''}>${role.label}</option>`).join('');
}

function renderRouteDialog() {
  const body = $('#route-dialog-body');
  const trip = state.viajes.find(v => Number(v.id) === Number(routeEditorState.tripId));
  if (!body || !trip) return;
  const options = routeCityOptionsForTrip(trip);
  const optionHtml = id => routeCityOptionsHtml(options, id);
  const rows = routeEditorState.stops.map((stop, index) => `
    <tr class="route-stop-row" draggable="true" data-route-row="${index}">
      <td><input type="number" min="1" max="${Math.max(1, routeEditorState.stops.length)}" value="${index + 1}" data-route-position="${index}" aria-label="Número de parada"></td>
      <td><select data-route-city="${index}" aria-label="Ciudad de la parada ${index + 1}">${optionHtml(stop.cityId)}</select></td>
      <td><select data-route-role="${index}" aria-label="Tipo de la parada ${index + 1}">${routeStopRoleOptionsHtml(stop.role)}</select></td>
      <td><input type="date" min="${escapeHtml(trip.fechaInicio || '')}" max="${escapeHtml(trip.fechaFin || '')}" value="${escapeHtml(stop.date || '')}" data-route-date="${index}" aria-label="Día previsto de la parada ${index + 1}"></td>
      <td class="route-stop-actions">
        <button type="button" class="ghost icon-btn" data-route-up="${index}" title="Subir parada">↑</button>
        <button type="button" class="ghost icon-btn" data-route-down="${index}" title="Bajar parada">↓</button>
        <button type="button" class="ghost icon-btn" data-route-delete="${index}" title="Borrar parada">×</button>
      </td>
    </tr>
  `).join('');
  body.innerHTML = `
    <p class="small route-help">Indica si cada parada es destino, tránsito o inicio/regreso. El día previsto es opcional; permite que el mapa de cada día muestre solamente lo que corresponde.</p>
    <div class="table-wrap route-table-wrap">
      <table class="route-stops-table">
        <thead><tr><th>Nº</th><th>Ciudad</th><th>Tipo</th><th>Día previsto</th><th>Acciones</th></tr></thead>
        <tbody>
          ${rows || '<tr><td colspan="5" class="small">Todavía no hay paradas planificadas.</td></tr>'}
          <tr class="route-add-row">
            <td>${routeEditorState.stops.length + 1}</td>
            <td><select id="route-add-city" aria-label="Añadir ciudad">${optionHtml('')}</select></td>
            <td colspan="2" class="small">Añade la parada y después elige su tipo y día.</td>
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
  const gastos = gastosForSelectorTripScope('#map-viaje')
    .filter(g => Number(g.viajeId) === Number(trip.id));
  const mapCityIds = mapRouteCities(gastos, 0)
    .map(item => Number(item.ciudad && item.ciudad.id))
    .filter(Boolean);
  const configuredCityIds = tripCityIds(trip).map(Number).filter(Boolean);
  routeEditorState.tripId = Number(trip.id);
  routeEditorState.stops = configuredCityIds.length
    ? tripRouteStops(trip)
    : normalizeTripRouteStops(trip, mapCityIds);
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
  routeEditorState.stops = [];
  routeEditorState.dragIndex = null;
  routeEditorState.optionMode = 'expenses';
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

async function saveRouteDialog() {
  const trip = state.viajes.find(v => Number(v.id) === Number(routeEditorState.tripId));
  if (!trip) throw new Error('No se encontró el viaje');
  const editorCityIds = routeEditorState.stops.map(stop => Number(stop && stop.cityId));
  const routeStops = routeEditorState.stops
    .map((stop, index) => ({
      cityId: Number(stop && stop.cityId),
      role: normalizedRouteStopRole(stop && stop.role, index, editorCityIds),
      date: tripDateWithinRange(stop && stop.date, trip) ? String(stop.date) : ''
    }))
    .filter(stop => stop.cityId);
  if (routeStops.length && !routeStops.some(stop => stop.role === ROUTE_STOP_ROLE_DESTINATION)) {
    throw new Error('Marca al menos una parada como Destino');
  }
  const datedStops = routeStops.filter(stop => stop.date);
  if (datedStops.some((stop, index) => index > 0 && stop.date < datedStops[index - 1].date)) {
    throw new Error('Los días previstos deben seguir el orden de la ruta');
  }
  const cityIds = routeStops.map(stop => stop.cityId);
  const paisIds = new Set(tripCountryIds(trip).map(Number).filter(Boolean));
  cityIds.forEach(id => {
    const city = state.lugares.find(l => Number(l.id) === Number(id));
    if (city && city.parentId) paisIds.add(Number(city.parentId));
  });
  await updateViaje(trip.id, {
    ciudadIds: cityIds,
    routeStops,
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

function photoMapRecordKey(image, fallback) {
  return String(image && image.id || fallback || '').trim();
}

function photoMapDataFingerprint(data) {
  const value = String(data || '');
  if (!value) return '';
  const middle = Math.max(0, Math.floor(value.length / 2) - 48);
  const sample = `${value.slice(0, 96)}${value.slice(middle, middle + 96)}${value.slice(-96)}`;
  let hash = 2166136261;
  for (let index = 0; index < sample.length; index += 1) {
    hash ^= sample.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}-${(hash >>> 0).toString(36)}`;
}

function photoMapImageSignatures(image) {
  const normalized = normalizeStoredImageRecord(image);
  const point = storedImageCoordinates(normalized);
  const signatures = [];
  if (normalized.id) signatures.push(`id:${normalized.id}`);
  if (normalized.fileRef) signatures.push(`ref:${normalized.fileRef}`);
  const dataFingerprint = photoMapDataFingerprint(normalized.data);
  if (dataFingerprint) signatures.push(`data:${dataFingerprint}`);
  const usefulMetadata = Boolean(normalized.capturedDate || normalized.capturedTime || point);
  if (usefulMetadata) {
    signatures.push(`meta:${[
      normalized.name.toLocaleLowerCase('es'),
      normalized.size,
      normalized.width,
      normalized.height,
      normalized.capturedDate,
      normalized.capturedTime,
      point ? point.latitude.toFixed(5) : '',
      point ? point.longitude.toFixed(5) : ''
    ].join('|')}`);
  }
  return signatures;
}

function photoMapMatchesCountry(record, paisId) {
  if (!paisId) return true;
  const city = state.lugares.find(item => Number(item.id) === Number(record.ciudadId));
  return Number(record.paisId || (city && city.parentId)) === Number(paisId);
}

function photoMapRecordsForScope(scopedTripIds, paisId) {
  const records = [];
  const seen = new Set();
  let duplicateCount = 0;
  const append = record => {
    if (!record || !record.image || (!record.image.mapEnabled && !record.enRuta)) return;
    const point = storedImageCoordinates(record.image);
    if (!point || !photoMapMatchesCountry(record, paisId)) return;
    const key = photoMapRecordKey(record.image, record.fallbackKey);
    const keySignature = `key:${key}`;
    const signatures = photoMapImageSignatures(record.image);
    if (!key || seen.has(keySignature) || signatures.some(signature => seen.has(signature))) {
      duplicateCount += 1;
      return;
    }
    signatures.forEach(signature => seen.add(signature));
    seen.add(keySignature);
    records.push(resolvedMapCoordinateCity({
      ...record,
      key,
      latitude: point.latitude,
      longitude: point.longitude
    }));
  };

  state.blogEntries
    .filter(entry => scopedTripIds.has(Number(entry.viajeId)))
    .forEach(entry => {
      const hasPrimaryImage = Boolean(entry.imageData || entry.imageRef);
      blogEntryImages(entry).forEach((image, index) => append({
        image,
        fallbackKey: `blog-${entry.id}-${index}`,
        blogEntryId: entry.id,
        imageSlot: hasPrimaryImage && index === 0 ? 'primary' : 'gallery',
        imageIndex: hasPrimaryImage ? index - 1 : index,
        expenseId: entry.expenseId || null,
        descripcion: entry.descripcion || 'Foto',
        fecha: entry.fecha || '',
        hora: entry.hora || '',
        paisId: entry.paisId || null,
        ciudadId: entry.ciudadId || null,
        viajeId: entry.viajeId,
        enRuta: entry.enRuta === true,
        source: 'blog'
      }));
    });

  state.gastos
    .filter(gasto => scopedTripIds.has(Number(gasto.viajeId)))
    .forEach(gasto => {
      const ticketImage = expenseTicketImageRecord(gasto);
      if (ticketImage) append({
        image: ticketImage,
        fallbackKey: `gasto-${gasto.id}-ticket`,
        expenseId: gasto.id,
        imageSlot: 'ticket',
        imageIndex: -1,
        descripcion: gasto.desc || 'Ticket del gasto',
        fecha: ticketImage.capturedDate || gasto.fecha || '',
        hora: ticketImage.capturedTime || expenseTimeValue(gasto),
        paisId: gasto.paisId || null,
        ciudadId: gasto.ciudadId || null,
        viajeId: gasto.viajeId,
        source: 'gasto-ticket'
      });
      expenseExtraImages(gasto).forEach((image, index) => append({
        image,
        fallbackKey: `gasto-${gasto.id}-${index}`,
        expenseId: gasto.id,
        imageSlot: 'extra',
        imageIndex: index,
        descripcion: gasto.desc || 'Foto del gasto',
        fecha: gasto.fecha || '',
        hora: expenseTimeValue(gasto),
        paisId: gasto.paisId || null,
        ciudadId: gasto.ciudadId || null,
        viajeId: gasto.viajeId,
        source: 'gasto'
      }));
    });
  records.duplicateCount = duplicateCount;
  return records;
}

function photoMapImageMatchesSignatures(image, targetSignatures) {
  if (!targetSignatures || !targetSignatures.size) return false;
  return photoMapImageSignatures(image).some(signature => targetSignatures.has(signature));
}

function correctedMapPhotoImage(image, latitude, longitude) {
  return {
    ...(image && typeof image === 'object' ? image : {}),
    latitude,
    longitude,
    locationSource: 'manual',
    mapEnabled: true
  };
}

async function moveMapPhoto(context, latitude, longitude) {
  const record = typeof context === 'string' ? tripMapPhotoLookup.get(context) : context;
  if (!record || !record.image) throw new Error('No se encuentra la foto que quieres mover');
  const point = {
    latitude: storedImageCoordinate(latitude, -90, 90),
    longitude: storedImageCoordinate(longitude, -180, 180)
  };
  if (point.latitude == null || point.longitude == null) throw new Error('La nueva posición no es válida');
  const targetSignatures = new Set(photoMapImageSignatures(record.image));
  let changed = 0;
  const now = new Date().toISOString();

  for (const entry of state.blogEntries) {
    let next = entry;
    let entryChanged = false;
    const primaryImage = entry.imageData || entry.imageRef
      ? normalizeBlogImageRecord({
        id: entry.imageId || `primary-${entry.id || ''}`,
        name: entry.imageName,
        type: entry.imageType,
        size: entry.imageSize,
        data: entry.imageData,
        fileRef: entry.imageRef,
        width: entry.imageWidth,
        height: entry.imageHeight,
        latitude: entry.imageLatitude,
        longitude: entry.imageLongitude,
        locationSource: entry.imageLocationSource,
        photoTypeId: entry.imagePhotoTypeId,
        photoTypeName: entry.imagePhotoTypeName,
        mapEnabled: entry.imageMapEnabled,
        createdAt: entry.createdAt
      })
      : null;
    const directPrimary = record.source === 'blog'
      && Number(record.blogEntryId) === Number(entry.id)
      && record.imageSlot === 'primary';
    if (primaryImage && (directPrimary || photoMapImageMatchesSignatures(primaryImage, targetSignatures))) {
      next = {
        ...next,
        imageLatitude: point.latitude,
        imageLongitude: point.longitude,
        imageLocationSource: 'manual',
        imageMapEnabled: true
      };
      entryChanged = true;
      changed += 1;
    }
    if (Array.isArray(entry.galleryImages) && entry.galleryImages.length) {
      const galleryImages = entry.galleryImages.map((image, index) => {
        const directGallery = record.source === 'blog'
          && Number(record.blogEntryId) === Number(entry.id)
          && record.imageSlot === 'gallery'
          && Number(record.imageIndex) === index;
        if (!directGallery && !photoMapImageMatchesSignatures(image, targetSignatures)) return image;
        entryChanged = true;
        changed += 1;
        return correctedMapPhotoImage(image, point.latitude, point.longitude);
      });
      if (entryChanged) next = { ...next, galleryImages };
    }
    if (entryChanged) await putRecord('blogEntries', { ...next, updatedAt: now });
  }

  for (const gasto of state.gastos) {
    let next = gasto;
    let expenseChanged = false;
    const ticketImage = expenseTicketImageRecord(gasto);
    const directTicket = record.source === 'gasto-ticket'
      && Number(record.expenseId) === Number(gasto.id);
    if (ticketImage && (directTicket || photoMapImageMatchesSignatures(ticketImage, targetSignatures))) {
      next = {
        ...next,
        ticketLatitude: point.latitude,
        ticketLongitude: point.longitude,
        ticketLocationSource: 'manual',
        ticketMapEnabled: true
      };
      expenseChanged = true;
      changed += 1;
    }
    if (Array.isArray(gasto.extraImages) && gasto.extraImages.length) {
      const previousFirstPoint = storedImageCoordinates(gasto.extraImages[0]);
      let firstPhotoMoved = false;
      const extraImages = gasto.extraImages.map((image, index) => {
        const directExtra = record.source === 'gasto'
          && Number(record.expenseId) === Number(gasto.id)
          && record.imageSlot === 'extra'
          && Number(record.imageIndex) === index;
        if (!directExtra && !photoMapImageMatchesSignatures(image, targetSignatures)) return image;
        if (index === 0) firstPhotoMoved = true;
        expenseChanged = true;
        changed += 1;
        return correctedMapPhotoImage(image, point.latitude, point.longitude);
      });
      if (expenseChanged) next = { ...next, extraImages };
      const ticketInheritedFromFirstPhoto = firstPhotoMoved && (
        String(gasto.ticketLocationSource || '') === 'expense-photo'
        || (previousFirstPoint
          && Math.abs(Number(gasto.ticketLatitude) - previousFirstPoint.latitude) < 0.0000001
          && Math.abs(Number(gasto.ticketLongitude) - previousFirstPoint.longitude) < 0.0000001)
      );
      if (ticketInheritedFromFirstPhoto) {
        next = {
          ...next,
          ticketLatitude: point.latitude,
          ticketLongitude: point.longitude,
          ticketLocationSource: 'expense-photo'
        };
      }
    }
    if (expenseChanged) await putRecord('gastos', { ...next, updatedAt: now });
  }

  if (!changed) throw new Error('No se pudo localizar el registro original de la foto');
  tripMapState.photoEditKey = '';
  tripMapState.preserveViewportOnNextRender = true;
  closeTripMapPhotoPopup();
  await loadAll();
  setTab('mapa');
  const info = $('#trip-map-info');
  if (info) info.textContent = 'Posición de la foto corregida. Las futuras descargas con GPS usarán estas coordenadas.';
}

function mapRecordMatchesDestination(record, trip) {
  if (!trip) return true;
  const scope = destinationRouteScope(trip);
  if (!scope.applied) return true;
  if (mapRecordPrecedesFirstDestination(record, trip, scope)) return false;
  const recordDate = String(record && record.fecha || '');
  const cityMatchesDestination = cityId => {
    const allStops = scope.completeStops.filter(stop => Number(stop.cityId) === Number(cityId));
    const destinationStops = allStops.filter(stop => stop.role === ROUTE_STOP_ROLE_DESTINATION);
    if (!destinationStops.length) return false;
    if (allStops.every(stop => stop.role === ROUTE_STOP_ROLE_DESTINATION)) return true;
    return destinationStops.some(stop => !stop.date || !recordDate || stop.date === recordDate);
  };
  const recordCityId = Number(record && record.ciudadId);
  if (recordCityId) return cityMatchesDestination(recordCityId);
  const latitude = storedImageCoordinate(record && record.latitude, -90, 90);
  const longitude = storedImageCoordinate(record && record.longitude, -180, 180);
  if (latitude == null || longitude == null) return false;
  const nearest = [...new Set(scope.completeIds)]
    .map(id => state.lugares.find(place => Number(place.id) === Number(id)))
    .filter(city => city && lugarHasCoords(city))
    .map(city => ({
      id: Number(city.id),
      distance: geographicDistanceMeters(
        { latitude, longitude },
        { latitude: Number(city.lat), longitude: Number(city.lng) }
      )
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  return Boolean(
    nearest
    && nearest.distance <= DESTINATION_RECORD_MAX_DISTANCE_METERS
    && cityMatchesDestination(nearest.id)
  );
}

function photoMapItems(records) {
  return records.map(record => ({
    ciudad: {
      id: `photo-point-${record.key}`,
      nombre: record.descripcion || 'Foto',
      lat: record.latitude,
      lng: record.longitude
    },
    pais: state.lugares.find(item => Number(item.id) === Number(record.paisId)) || null,
    firstDate: record.fecha || '',
    firstOrder: Number.POSITIVE_INFINITY,
    routeOrder: Number.POSITIVE_INFINITY,
    count: 0,
    totalEur: 0,
    configuredOnly: true,
    plannedOnly: false,
    photoPoint: true,
    photoRecord: record,
    routeWaypoint: record.enRuta === true
  }));
}

function dailyMapRecordsForScope(scopedTripIds, paisId) {
  const points = state.blogEntries
    .filter(entry => (entry.tipo === 'punto' || (entry.tipo === 'texto' && entry.enRuta === true)) && scopedTripIds.has(Number(entry.viajeId)) && blogPointCoordinates(entry))
    .filter(entry => {
      if (!paisId) return true;
      const city = state.lugares.find(item => Number(item.id) === Number(entry.ciudadId));
      return Number(entry.paisId || (city && city.parentId)) === Number(paisId);
    })
    .map(originalEntry => {
      const entry = resolvedMapPointEntry(originalEntry);
      const point = blogPointCoordinates(entry);
      return {
        key: `point-${entry.id}`,
        kind: 'point',
        entry,
        blogEntryId: entry.id,
        expenseId: entry.expenseId || null,
        viajeId: entry.viajeId,
        fecha: entry.fecha || '',
        hora: entry.hora || '',
        descripcion: entry.descripcion || 'Punto',
        enRuta: entry.enRuta === true,
        paisId: entry.paisId || null,
        ciudadId: entry.ciudadId || null,
        latitude: point.latitude,
        longitude: point.longitude
      };
    });
  const photos = photoMapRecordsForScope(scopedTripIds, paisId).map(record => ({
    ...record,
    kind: 'photo'
  }));
  return [...points, ...photos].sort((a, b) =>
    `${a.fecha || ''}T${a.hora || '00:00'}`.localeCompare(`${b.fecha || ''}T${b.hora || '00:00'}`)
    || String(a.key || '').localeCompare(String(b.key || ''))
  );
}

function blogEntryMatchesMapCountry(entry, paisId) {
  if (!paisId) return true;
  const city = state.lugares.find(item => Number(item.id) === Number(entry && entry.ciudadId));
  return Number(entry && entry.paisId || (city && city.parentId)) === Number(paisId);
}

function dailyMapDatesForScope(scopedTripIds, paisId) {
  const dates = new Set();
  state.gastos
    .filter(gasto => scopedTripIds.has(Number(gasto.viajeId)))
    .filter(gasto => gastoMatchesLugarFilters(gasto, paisId, ''))
    .forEach(gasto => {
      if (gasto.fecha) dates.add(gasto.fecha);
    });
  state.blogEntries
    .filter(entry => scopedTripIds.has(Number(entry.viajeId)))
    .filter(entry => blogEntryMatchesMapCountry(entry, paisId))
    .forEach(entry => {
      if (entry.fecha) dates.add(entry.fecha);
    });
  state.viajes
    .filter(trip => scopedTripIds.has(Number(trip.id)))
    .flatMap(tripRouteStops)
    .forEach(stop => {
      if (!stop.date) return;
      const city = state.lugares.find(place => Number(place.id) === Number(stop.cityId));
      if (!paisId || Number(city && city.parentId) === Number(paisId)) dates.add(stop.date);
    });
  state.timelineDays
    .filter(record => scopedTripIds.has(Number(record.viajeId)))
    .forEach(record => {
      if (record.fecha) dates.add(record.fecha);
    });
  return [...dates].sort().reverse();
}

function timelineRecordsForMap(scopedTripIds, selectedDay = '') {
  if (!tripMapState.showTimeline || scopedTripIds.size !== 1) return [];
  return state.timelineDays
    .filter(record => scopedTripIds.has(Number(record.viajeId)))
    .filter(record => !selectedDay || record.fecha === selectedDay)
    .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
}

function lodgingCandidateName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  const generic = normalizePlaceName(name);
  if (['alojamiento', 'gasto', 'hotel', 'hostal', 'reserva', 'pernocta'].includes(generic)
    || generic.startsWith('en ')
    || /^(?:traducido|translated)\b/.test(generic)) return '';
  return name.slice(0, 120);
}

function lodgingDistanceMeters(first, second) {
  return geographicDistanceMeters(
    { latitude: first && first.latitude, longitude: first && first.longitude },
    { latitude: second && second.latitude, longitude: second && second.longitude }
  );
}

function nearestRememberedLodging(trip, point) {
  return tripLodgingLocations(trip)
    .map(location => ({ ...location, distance: lodgingDistanceMeters(location, point) }))
    .filter(location => location.distance <= LODGING_NAME_MAX_DISTANCE_METERS)
    .sort((a, b) => a.distance - b.distance || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
}

function nearestAccommodationExpense(record, role, point) {
  const targetDate = String(point && point.time || '').slice(0, 10) || record.fecha || '';
  return state.gastos
    .filter(gasto => Number(gasto.viajeId) === Number(record.viajeId) && isAccommodationExpense(gasto))
    .map(gasto => {
      const location = expenseTicketLocationForExpense(gasto);
      const specificName = lodgingCandidateName(gasto.desc);
      const located = location.latitude != null && location.longitude != null;
      return {
        name: specificName || 'Alojamiento',
        generic: !specificName,
        located,
        expenseId: gasto.id,
        distance: located ? lodgingDistanceMeters(location, point) : Number.POSITIVE_INFINITY,
        dateDistance: dateDistanceDays(gasto.fecha, targetDate),
        future: String(gasto.fecha || '') > targetDate
      };
    })
    .filter(candidate => candidate.located
      ? candidate.distance <= LODGING_NAME_MAX_DISTANCE_METERS
      : Number.isFinite(candidate.dateDistance))
    .sort((a, b) => Number(b.located) - Number(a.located)
      || a.distance - b.distance
      || Number(a.future) - Number(b.future)
      || a.dateDistance - b.dateDistance
      || Number(a.expenseId) - Number(b.expenseId))[0] || null;
}

function nearestTimelineVisitName(record, point) {
  return (Array.isArray(record && record.visits) ? record.visits : [])
    .map(visit => ({
      name: lodgingCandidateName(visit.placeName || visit.name),
      distance: lodgingDistanceMeters(visit, point)
    }))
    .filter(candidate => candidate.name
      && !/^en\s+/i.test(normalizePlaceName(candidate.name))
      && candidate.distance <= LODGING_NAME_MAX_DISTANCE_METERS)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function nearestLodgingBlogPoint(record, point) {
  const candidates = [];
  state.blogEntries
    .filter(entry => Number(entry.viajeId) === Number(record.viajeId))
    .forEach(entry => {
      const name = lodgingCandidateName(entry.descripcion);
      if (!name) return;
      const lodgingLabel = /(^|\s)(?:casa|alojamiento|hotel|hostal|pension|apartamento|camping)(\s|$)/i.test(normalizePlaceName(name));
      const directPoint = blogPointCoordinates(entry);
      if (directPoint) candidates.push({ name, lodgingLabel, distance: lodgingDistanceMeters(directPoint, point) });
      blogEntryImages(entry).filter(imageUsesAsDestination).forEach(image => {
        const imagePoint = storedImageCoordinates(image);
        if (imagePoint) candidates.push({ name, lodgingLabel, distance: lodgingDistanceMeters(imagePoint, point) });
      });
    });
  return candidates
    .filter(candidate => candidate.distance <= LODGING_NAME_MAX_DISTANCE_METERS
      || (candidate.lodgingLabel && candidate.distance <= LODGING_FUZZY_NAME_MAX_DISTANCE_METERS))
    .sort((a, b) => Number(b.lodgingLabel) - Number(a.lodgingLabel) || a.distance - b.distance)[0] || null;
}

function timelineLodgingNameInfo(record, role) {
  const point = role === 'arrival' ? record.arrival : record.departure;
  const manualName = lodgingCandidateName(record && record.lodgingNames && record.lodgingNames[role]);
  if (manualName) return { name: manualName, source: 'night', sourceLabel: 'Nombre guardado para esta noche' };
  const trip = state.viajes.find(item => Number(item.id) === Number(record.viajeId));
  const remembered = nearestRememberedLodging(trip, point);
  if (remembered) return { name: remembered.name, source: 'remembered', sourceLabel: 'Nombre recordado para esta ubicación' };
  const expense = nearestAccommodationExpense(record, role, point);
  if (expense && !expense.generic) return {
    name: expense.name,
    source: 'expense',
    sourceLabel: expense.located
      ? 'Gasto de Alojamiento geolocalizado cercano'
      : 'Nombre del gasto de Alojamiento aplicado a la ubicación nocturna de Cronología de Maps'
  };
  const blogPoint = nearestLodgingBlogPoint(record, point);
  if (blogPoint) return { name: blogPoint.name, source: 'blog', sourceLabel: 'Punto cercano del Blog' };
  const timelineVisit = nearestTimelineVisitName(record, point);
  if (timelineVisit) return { name: timelineVisit.name, source: 'timeline', sourceLabel: 'Lugar indicado por la Cronología de Maps' };
  if (expense) return {
    name: 'Alojamiento',
    source: 'expense',
    sourceLabel: expense.located
      ? 'Gasto de Alojamiento geolocalizado cercano sin nombre de establecimiento'
      : 'Gasto de Alojamiento sin GPS situado mediante la ubicación nocturna de Cronología de Maps'
  };
  return { name: 'Alojamiento', source: 'fallback', sourceLabel: 'Nombre genérico' };
}

function timelineLodgingPointRecord(record, role) {
  const point = role === 'arrival' ? record.arrival : record.departure;
  const mode = role === 'arrival' ? record.arrivalMode : record.departureMode;
  if (mode !== 'precise') return null;
  if (!point || storedImageCoordinate(point.latitude, -90, 90) == null || storedImageCoordinate(point.longitude, -180, 180) == null) return null;
  const lodging = timelineLodgingNameInfo(record, role);
  return {
    key: `timeline-lodging-${record.viajeId}-${record.fecha}-${role}`,
    kind: 'point',
    timelinePoint: true,
    timelineRole: 'lodging',
    timelineRecordId: record.id,
    timelineLodgingRole: role,
    lodgingName: lodging.name,
    lodgingNameSource: lodging.source,
    lodgingNameSourceLabel: lodging.sourceLabel,
    viajeId: record.viajeId,
    fecha: record.fecha,
    hora: String(point.time || '').slice(11, 16),
    descripcion: lodging.name,
    notas: `Alojamiento deducido de una ubicación precisa mientras el teléfono permanecía quieto durante el descanso. ${lodging.sourceLabel}.`,
    enRuta: false,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude)
  };
}

function timelineMapMarkerItems(records, dailyMode) {
  const items = [];
  records.forEach(record => {
    const departureRecord = timelineLodgingPointRecord(record, 'departure');
    const arrivalRecord = timelineLodgingPointRecord(record, 'arrival');
    const markerRecords = [departureRecord];
    if (dailyMode && record.arrival && record.departure) {
      const separated = window.GoogleTimelineImport
        ? window.GoogleTimelineImport.distanceMeters(record.departure, record.arrival) >= 20
        : true;
      const sameLodging = departureRecord && arrivalRecord
        && normalizePlaceName(departureRecord.lodgingName) === normalizePlaceName(arrivalRecord.lodgingName)
        && lodgingDistanceMeters(departureRecord, arrivalRecord) <= LODGING_FUZZY_NAME_MAX_DISTANCE_METERS;
      if (separated && !sameLodging && departureRecord) markerRecords.push(arrivalRecord);
    }
    if (!departureRecord && arrivalRecord) markerRecords.push(arrivalRecord);
    markerRecords.filter(Boolean).forEach(markerRecord => {
      if (dailyMode) {
        items.push(dailyMapItem(markerRecord));
        return;
      }
      items.push({
        ciudad: {
          id: markerRecord.key,
          nombre: `${markerRecord.lodgingName} · ${blogDayDateLabel(markerRecord.fecha)}`,
          lat: markerRecord.latitude,
          lng: markerRecord.longitude
        },
        firstDate: markerRecord.fecha,
        configuredOnly: true,
        plannedOnly: false,
        timelinePoint: true,
        timelineRole: 'lodging',
        pointEntry: markerRecord
      });
    });
  });
  return items;
}

function timelineMapPaths(records) {
  const options = arguments[1] || {};
  if (options.adjusted === true) {
    return records.flatMap(record => {
      const cached = timelineAdjustedRouteCache(record, options.mode);
      if (!cached) return timelineMapPaths([record]);
      return cached.paths
        .map(entry => {
          const path = (Array.isArray(entry) ? entry : entry && entry.points || [])
            .map(point => ({
              latitude: Number(point && point.latitude),
              longitude: Number(point && point.longitude),
              time: point && point.time || ''
            }))
            .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
          path.adjustedRoute = entry && entry.adjusted !== false;
          path.costing = entry && entry.costing || '';
          return path;
        })
        .filter(path => path.length > 1);
    });
  }
  const paths = [];
  records.forEach(record => {
    const points = Array.isArray(record.points) ? record.points : [];
    const activities = Array.isArray(record.activities) ? record.activities : [];
    activities.forEach((activity, activityIndex) => {
      const startTime = String(activity.startTime || activity.start && activity.start.time || '');
      const endTime = String(activity.endTime || activity.end && activity.end.time || '');
      const startMs = Date.parse(startTime);
      const endMs = Date.parse(endTime);
      const activityPoints = points.filter(point => {
        const pointMs = Date.parse(point && point.time || '');
        if (!Number.isFinite(pointMs)) return false;
        if (Number.isFinite(startMs) && pointMs < startMs) return false;
        if (Number.isFinite(endMs) && pointMs > endMs) return false;
        return true;
      });
      const departure = activityIndex === 0 && record.departureMode === 'precise'
        ? record.departure
        : activity.start;
      const arrival = activityIndex === activities.length - 1 && record.arrivalMode === 'precise'
        ? record.arrival
        : activity.end;
      const path = [departure, ...activityPoints, arrival]
        .filter(Boolean)
        .map(point => ({
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          time: point.time || ''
        }))
        .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
        .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
        .filter((point, index, candidates) => {
          if (!index) return true;
          const previous = candidates[index - 1];
          return Math.abs(point.latitude - previous.latitude) > 0.000001
            || Math.abs(point.longitude - previous.longitude) > 0.000001;
        });
      if (path.length > 1) {
        path.activityType = activity.activityType || '';
        path.startTime = startTime;
        path.endTime = endTime;
        paths.push(path);
      }
    });
    if (!activities.length) {
      const semanticPathPoints = points.filter(point => !point.kind || point.kind === 'path');
      const fallbackSource = semanticPathPoints.length > 1 ? semanticPathPoints : points;
      const fallbackPath = fallbackSource
        .filter(Boolean)
        .map(point => ({
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          time: point.time || ''
        }))
        .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
        .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
        .filter((point, index, candidates) => {
          if (!index) return true;
          const previous = candidates[index - 1];
          return lodgingDistanceMeters(previous, point) > 3;
        });
      if (fallbackPath.length > 1) paths.push(fallbackPath);
    }
  });
  return paths;
}

function timelineMapPathsWithDailyRecords(paths = [], records = []) {
  const timelinePoints = paths
    .flat()
    .map(point => ({ ...point, timeKey: String(point && point.time || '').slice(0, 16) }))
    .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(point.timeKey))
    .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
  if (!timelinePoints.length) return paths;

  const supplemental = records
    .filter(record => record && (record.kind === 'point' || record.kind === 'photo') && record.timelinePoint !== true)
    .map(record => ({
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
      time: `${record.fecha || ''}T${record.hora || ''}`,
      timeKey: `${record.fecha || ''}T${record.hora || ''}`.slice(0, 16),
      routingAnchor: true
    }))
    .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(point.timeKey))
    .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
  const connectors = [];
  const accepted = [];

  supplemental.forEach(point => {
    const alreadyCovered = timelinePoints.some(candidate => lodgingDistanceMeters(candidate, point) <= TIMELINE_SUPPLEMENT_MAX_DISTANCE_METERS);
    const grouped = accepted.some(candidate => lodgingDistanceMeters(candidate, point) <= TIMELINE_SUPPLEMENT_GROUP_DISTANCE_METERS);
    if (alreadyCovered || grouped) return;
    const beforeCandidates = timelinePoints.filter(candidate => candidate.timeKey <= point.timeKey);
    const before = beforeCandidates[beforeCandidates.length - 1] || null;
    const after = timelinePoints.find(candidate => candidate.timeKey >= point.timeKey) || null;
    const connector = [before, point, after]
      .filter(Boolean)
      .filter((candidate, index, candidates) => !index || lodgingDistanceMeters(candidates[index - 1], candidate) > 1);
    if (connector.length > 1) {
      const connectorPath = connector.map(({ latitude, longitude, time, routingAnchor }) => ({
        latitude,
        longitude,
        time,
        routingAnchor: routingAnchor === true
      }));
      connectorPath.activityType = '';
      connectors.push(connectorPath);
      accepted.push(point);
    }
  });

  return [...paths, ...connectors];
}

function timelineAdjustedMapPathsWithDailyRecords(adjustedPaths = [], originalPaths = [], records = []) {
  const adjustedPoints = adjustedPaths.flat().filter(point => Number.isFinite(point && point.latitude) && Number.isFinite(point && point.longitude));
  const missingRecords = records.filter(record => {
    if (!record || (record.kind !== 'point' && record.kind !== 'photo') || record.timelinePoint === true) return false;
    const point = { latitude: Number(record.latitude), longitude: Number(record.longitude) };
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return false;
    return !adjustedPoints.some(candidate => lodgingDistanceMeters(candidate, point) <= TIMELINE_SUPPLEMENT_MAX_DISTANCE_METERS);
  });
  if (!missingRecords.length) return adjustedPaths;
  const supplementedOriginal = timelineMapPathsWithDailyRecords(originalPaths, missingRecords);
  const connectors = supplementedOriginal.slice(originalPaths.length);
  connectors.forEach(path => { path.exactConnector = true; });
  return [...adjustedPaths, ...connectors];
}

function plannedDailyMapRecordsForScope(scopedTripIds, paisId, day, destinationOnlyApplied = false) {
  if (!tripMapState.showPlanned || !day) return [];
  const records = [];
  state.viajes
    .filter(trip => scopedTripIds.has(Number(trip.id)))
    .forEach(trip => {
      tripRouteStops(trip).forEach((stop, routeIndex) => {
        if (stop.date !== day) return;
        if (destinationOnlyApplied && stop.role !== ROUTE_STOP_ROLE_DESTINATION) return;
        const baseCity = state.lugares.find(place => Number(place.id) === Number(stop.cityId));
        if (!baseCity || !lugarHasCoords(baseCity) || isTransitPlaceName(baseCity.nombre)) return;
        if (paisId && Number(baseCity.parentId) !== Number(paisId)) return;
        const city = cityWithAccommodationDestination(baseCity, trip.id, day);
        records.push({
          key: `planned-${trip.id}-${routeIndex}-${day}`,
          kind: 'city',
          viajeId: trip.id,
          fecha: day,
          hora: '99:98',
          descripcion: city.nombre,
          ciudadId: Number(stop.cityId),
          paisId: Number(city.parentId) || null,
          latitude: Number(city.lat),
          longitude: Number(city.lng),
          accommodationDestination: city.accommodationDestination === true,
          plannedOnly: true,
          stopRole: stop.role
        });
      });
    });
  return records;
}

function dailyExactRecordCoverage(records = []) {
  const blogEntryIds = new Set();
  const expenseIds = new Set();
  records.forEach(record => {
    const blogEntryId = Number(record?.blogEntryId || record?.entry?.id || 0);
    const expenseId = Number(record?.expenseId || record?.entry?.expenseId || 0);
    if (blogEntryId) blogEntryIds.add(blogEntryId);
    if (expenseId) expenseIds.add(expenseId);
  });
  return { blogEntryIds, expenseIds };
}

function dailyCityMapRecordsForScope(scopedTripIds, paisId, day, destinationTrip = null, exactRecords = []) {
  const configuredCityIds = [...new Set(state.viajes
    .filter(trip => scopedTripIds.has(Number(trip.id)))
    .flatMap(tripCityIds)
    .map(Number)
    .filter(Boolean))];
  const defaultCityId = configuredCityIds.length === 1 ? configuredCityIds[0] : 0;
  const exactCoverage = dailyExactRecordCoverage(exactRecords);
  const byCity = new Map();
  const append = item => {
    if (!mapRecordMatchesDestination(item, destinationTrip)) return;
    const cityId = Number(item.ciudadId || defaultCityId);
    const city = state.lugares.find(place => Number(place.id) === cityId);
    if (!city || !lugarHasCoords(city) || isTransitPlaceName(city.nombre)) return;
    const countryId = Number(item.paisId || city.parentId || 0);
    if (paisId && countryId !== Number(paisId)) return;
    if (!byCity.has(cityId)) {
      const destination = accommodationDestinationForTripCity(item.viajeId, cityId, day);
      byCity.set(cityId, {
        key: `city-${day}-${cityId}`,
        kind: 'city',
        viajeId: item.viajeId,
        fecha: day,
        hora: item.hora || '',
        descripcion: city.nombre,
        latitude: destination ? destination.latitude : Number(city.lat),
        longitude: destination ? destination.longitude : Number(city.lng),
        accommodationDestination: Boolean(destination),
        accommodationPhotoRecord: accommodationDestinationPhotoRecord(destination, item.viajeId, cityId),
        paisId: countryId || null,
        ciudadId: cityId,
        count: 0
      });
    }
    const record = byCity.get(cityId);
    record.count += 1;
    if (item.hora && (!record.hora || item.hora < record.hora)) record.hora = item.hora;
  };
  state.gastos
    .filter(gasto => scopedTripIds.has(Number(gasto.viajeId)) && gasto.fecha === day)
    .filter(gasto => gastoMatchesLugarFilters(gasto, paisId, ''))
    .filter(gasto => !exactCoverage.expenseIds.has(Number(gasto.id)))
    .forEach(gasto => append({ ...gasto, hora: expenseTimeValue(gasto) }));
  state.blogEntries
    .filter(entry => scopedTripIds.has(Number(entry.viajeId)) && entry.fecha === day)
    .filter(entry => blogEntryMatchesMapCountry(entry, paisId))
    .filter(entry => !exactCoverage.blogEntryIds.has(Number(entry.id)))
    .filter(entry => !entry.expenseId || !exactCoverage.expenseIds.has(Number(entry.expenseId)))
    .forEach(append);
  return [...byCity.values()]
    .sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99') || String(a.descripcion || '').localeCompare(String(b.descripcion || ''), 'es'));
}

function timelineVisitedDailyCityRecordsForScope(scopedTrips, paisId, day, destinationOnlyApplied = false, existingCityIds = new Set()) {
  if (!day || !scopedTrips.length) return [];
  const timelineRecords = scopedTrips
    .flatMap(trip => timelineRecordsForTrip(trip.id))
    .filter(record => record.fecha === day);
  const timelinePoints = timelineMapPaths(timelineRecords)
    .flat()
    .filter(point => Number.isFinite(Number(point && point.latitude)) && Number.isFinite(Number(point && point.longitude)));
  if (!timelinePoints.length) return [];
  const seenCityIds = new Set([...existingCityIds].map(Number).filter(Boolean));
  const records = [];
  scopedTrips.forEach(trip => {
    tripRouteStops(trip).forEach((stop, routeIndex) => {
      const cityId = Number(stop.cityId);
      if (!cityId || seenCityIds.has(cityId)) return;
      if (destinationOnlyApplied && stop.role !== ROUTE_STOP_ROLE_DESTINATION) return;
      const baseCity = state.lugares.find(place => Number(place.id) === cityId);
      if (!baseCity || !lugarHasCoords(baseCity) || isTransitPlaceName(baseCity.nombre)) return;
      if (paisId && Number(baseCity.parentId) !== Number(paisId)) return;
      const city = cityWithAccommodationDestination(baseCity, trip.id, day);
      const nearest = timelinePoints
        .map(point => ({
          point,
          distance: geographicDistanceMeters(
            { latitude: Number(city.lat), longitude: Number(city.lng) },
            { latitude: Number(point.latitude), longitude: Number(point.longitude) }
          )
        }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!nearest || nearest.distance > TIMELINE_CITY_VISIT_MAX_DISTANCE_METERS) return;
      seenCityIds.add(cityId);
      records.push({
        key: `timeline-city-${trip.id}-${cityId}-${day}`,
        kind: 'city',
        viajeId: Number(trip.id),
        fecha: day,
        hora: String(nearest.point.time || '').slice(11, 16),
        descripcion: city.nombre,
        ciudadId: cityId,
        paisId: Number(city.parentId) || null,
        latitude: Number(city.lat),
        longitude: Number(city.lng),
        accommodationDestination: city.accommodationDestination === true,
        timelineVisited: true,
        plannedOnly: false,
        routeIndex
      });
    });
  });
  return records;
}

function tripDailyRouteOrder(trip, day) {
  const routeIds = tripCityIds(trip).map(Number).filter(Boolean);
  const arrivalDates = tripRouteArrivalDates(trip, routeIds);
  const candidatesByCity = new Map();
  routeIds.forEach((cityId, index) => {
    if (!candidatesByCity.has(cityId)) candidatesByCity.set(cityId, []);
    candidatesByCity.get(cityId).push({ index, date: arrivalDates[index] || '' });
  });
  const result = new Map();
  candidatesByCity.forEach((candidates, cityId) => {
    const exact = candidates.find(candidate => candidate.date === day);
    const previous = candidates
      .filter(candidate => candidate.date && candidate.date < day)
      .sort((a, b) => b.date.localeCompare(a.date) || b.index - a.index)[0];
    const next = candidates
      .filter(candidate => candidate.date && candidate.date > day)
      .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index)[0];
    result.set(cityId, (exact || previous || next || candidates[0]).index);
  });
  return result;
}

function combineDailyMapRecords(exactRecords = [], cityRecords = [], routeOrder = new Map()) {
  const routeIndex = record => routeOrder.has(Number(record.ciudadId))
    ? Number(routeOrder.get(Number(record.ciudadId)))
    : Number.POSITIVE_INFINITY;
  const chronology = record => `${record.fecha || ''}T${record.hora || '99:99'}`;
  const records = [...cityRecords, ...exactRecords].sort((a, b) =>
    chronology(a).localeCompare(chronology(b))
    || Number(b.kind === 'city') - Number(a.kind === 'city')
    || routeIndex(a) - routeIndex(b)
    || String(a.key || '').localeCompare(String(b.key || ''))
  ).map(record => ({
    ...record,
    routeNumber: Number.isFinite(routeIndex(record)) ? routeIndex(record) + 1 : null
  }));
  return { records, usesCityFallback: cityRecords.some(record => !record.accommodationDestination) };
}

function dailyMapItem(record) {
  return {
    ciudad: {
      id: `daily-${record.key}`,
      nombre: record.descripcion || (record.kind === 'photo' ? 'Foto' : 'Punto'),
      lat: record.latitude,
      lng: record.longitude
    },
    firstDate: record.fecha || '',
    configuredOnly: true,
    plannedOnly: record.plannedOnly === true,
    dailyPoint: true,
    cityFallback: record.kind === 'city' && !record.accommodationDestination,
    accommodationDestination: record.accommodationDestination === true,
    dailyRecord: record,
    timelinePoint: record.timelinePoint === true,
    timelineRole: record.timelineRole || '',
    blogPoint: record.kind === 'point',
    pointEntry: record.entry || null,
    photoPoint: record.kind === 'photo',
    photoRecord: record.kind === 'photo' ? record : null
  };
}

function stackMapCitiesWithLodgings(baseItems = [], lodgingItems = [], dailyMode = false) {
  const stackedBaseItems = baseItems.slice();
  const stackedLodgingKeys = new Set();
  const usedCityIndexes = new Set();
  lodgingItems
    .filter(item => item.timelinePoint && item.timelineRole === 'lodging' && lugarHasCoords(item.ciudad))
    .forEach(lodgingItem => {
      const lodgingDate = String(lodgingItem.firstDate || lodgingItem.pointEntry && lodgingItem.pointEntry.fecha || '');
      if (!lodgingDate) return;
      const lodgingTripId = Number(lodgingItem.pointEntry && lodgingItem.pointEntry.viajeId
        || lodgingItem.dailyRecord && lodgingItem.dailyRecord.viajeId);
      const lodgingTrip = lodgingTripId
        ? state.viajes.find(item => Number(item.id) === lodgingTripId)
        : null;
      const lodgingCity = lodgingTrip
        ? nearestTripCityForPoint(lodgingTrip, {
          latitude: Number(lodgingItem.ciudad.lat),
          longitude: Number(lodgingItem.ciudad.lng)
        }, { date: lodgingDate })
        : null;
      const candidates = stackedBaseItems
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => !usedCityIndexes.has(index)
          && !item.blogPoint && !item.photoPoint && !item.timelinePoint
          && String(item.firstDate || item.dailyRecord && item.dailyRecord.fecha || '') === lodgingDate
          && (!dailyMode || item.dailyRecord && item.dailyRecord.kind === 'city')
          && (!lodgingCity || Number(item.dailyRecord && item.dailyRecord.ciudadId || item.ciudad && item.ciudad.id) === Number(lodgingCity.id))
          && lugarHasCoords(item.ciudad))
        .map(candidate => ({
          ...candidate,
          distance: geographicDistanceMeters(
            { latitude: Number(candidate.item.ciudad.lat), longitude: Number(candidate.item.ciudad.lng) },
            { latitude: Number(lodgingItem.ciudad.lat), longitude: Number(lodgingItem.ciudad.lng) }
          )
        }))
        .filter(candidate => candidate.distance <= 60_000)
        .sort((a, b) => a.distance - b.distance || a.index - b.index);
      const match = candidates[0];
      if (!match) return;
      const latitude = Number(lodgingItem.ciudad.lat);
      const longitude = Number(lodgingItem.ciudad.lng);
      const dailyRecord = match.item.dailyRecord
        ? {
          ...match.item.dailyRecord,
          latitude,
          longitude,
          accommodationDestination: true,
          stackedOverLodging: true
        }
        : null;
      stackedBaseItems[match.index] = {
        ...match.item,
        ciudad: {
          ...match.item.ciudad,
          lat: latitude,
          lng: longitude,
          accommodationDestination: true
        },
        accommodationDestination: true,
        stackedOverLodging: true,
        stackedLodgingKey: lodgingItem.pointEntry && lodgingItem.pointEntry.key || lodgingItem.ciudad.id,
        ...(dailyRecord ? { dailyRecord } : {})
      };
      usedCityIndexes.add(match.index);
      stackedLodgingKeys.add(String(lodgingItem.pointEntry && lodgingItem.pointEntry.key || lodgingItem.ciudad.id));
    });
  return {
    baseItems: stackedBaseItems,
    lodgingItems: lodgingItems.map(item => ({
      ...item,
      stackedUnderCity: stackedLodgingKeys.has(String(item.pointEntry && item.pointEntry.key || item.ciudad.id))
    }))
  };
}

function tripMapItemsForCurrentScope() {
  const paisId = Number($('#map-pais') ? $('#map-pais').value : 0);
  const gastos = gastosForSelectorTripScope('#map-viaje');
  const scopedTripIds = mapScopedTripIds(gastos);
  const scopedTrips = mapScopedTrips(gastos);
  const destinationOnlyAvailable = scopedTrips.length === 1
    && tripRouteStops(scopedTrips[0]).some(stop => stop.role === ROUTE_STOP_ROLE_DESTINATION);
  const destinationOnlyApplied = tripMapState.destinationOnly && destinationOnlyAvailable;
  const destinationTrip = destinationOnlyApplied ? scopedTrips[0] : null;
  const exactDailyRecords = dailyMapRecordsForScope(scopedTripIds, paisId)
    .filter(record => mapRecordMatchesDestination(record, destinationTrip));
  const dayOptions = dailyMapDatesForScope(scopedTripIds, paisId);
  if (tripMapState.day && !dayOptions.includes(tripMapState.day)) tripMapState.day = '';
  const dailyMode = Boolean(tripMapState.day);
  let importedTimelineRecords = [];
  let timelinePaths = [];
  const selectedExactDailyRecords = dailyMode
    ? exactDailyRecords.filter(record => record.fecha === tripMapState.day)
    : [];
  const actualDailyCityRecords = dailyMode
    ? dailyCityMapRecordsForScope(scopedTripIds, paisId, tripMapState.day, destinationTrip, selectedExactDailyRecords)
    : [];
  const actualDailyCityIds = new Set([
    ...selectedExactDailyRecords.map(record => Number(record.ciudadId)),
    ...actualDailyCityRecords.map(record => Number(record.ciudadId))
  ].filter(Boolean));
  const actualDailyCityMarkerIds = new Set(
    actualDailyCityRecords.map(record => Number(record.ciudadId)).filter(Boolean)
  );
  const timelineVisitedDailyRecords = dailyMode
    ? timelineVisitedDailyCityRecordsForScope(
      scopedTrips,
      paisId,
      tripMapState.day,
      destinationOnlyApplied,
      actualDailyCityMarkerIds
    )
    : [];
  const representedDailyCityIds = new Set([
    ...actualDailyCityIds,
    ...timelineVisitedDailyRecords.map(record => Number(record.ciudadId))
  ].filter(Boolean));
  const plannedDailyRecords = dailyMode
    ? plannedDailyMapRecordsForScope(scopedTripIds, paisId, tripMapState.day, destinationOnlyApplied)
      .filter(record => !representedDailyCityIds.has(Number(record.ciudadId)))
    : [];
  const dailyCityRecords = [...actualDailyCityRecords, ...timelineVisitedDailyRecords, ...plannedDailyRecords];
  const dailyRouteOrder = dailyMode && scopedTrips.length === 1
    ? tripDailyRouteOrder(scopedTrips[0], tripMapState.day)
    : new Map();
  const combinedDailyRecords = combineDailyMapRecords(selectedExactDailyRecords, dailyCityRecords, dailyRouteOrder);
  const dailyRecords = dailyMode ? combinedDailyRecords.records : [];
  const cities = mapRouteCities(gastos, paisId);
  const points = state.blogEntries
    .filter(entry => (entry.tipo === 'punto' || (entry.tipo === 'texto' && entry.enRuta === true)) && scopedTripIds.has(Number(entry.viajeId)) && blogPointCoordinates(entry))
    .filter(entry => mapRecordMatchesDestination(entry, destinationTrip))
    .filter(entry => {
      if (!paisId) return true;
      const city = state.lugares.find(item => Number(item.id) === Number(entry.ciudadId));
      return Number(entry.paisId || (city && city.parentId)) === paisId;
    })
    .map(originalEntry => {
      const entry = resolvedMapPointEntry(originalEntry);
      const point = blogPointCoordinates(entry);
      return {
        ciudad: {
          id: `blog-point-${entry.id}`,
          nombre: entry.descripcion || 'Punto',
          lat: point.latitude,
          lng: point.longitude
        },
        pais: state.lugares.find(item => Number(item.id) === Number(entry.paisId)) || null,
        firstDate: entry.fecha || '',
        firstOrder: Number.POSITIVE_INFINITY,
        routeOrder: Number.POSITIVE_INFINITY,
        count: 0,
        totalEur: 0,
        configuredOnly: true,
        plannedOnly: false,
        blogPoint: true,
        pointEntry: entry,
        routeWaypoint: entry.enRuta === true
      };
    });
  const photoScopeRecords = photoMapRecordsForScope(scopedTripIds, paisId);
  const duplicatePhotoCount = Number(photoScopeRecords.duplicateCount || 0);
  const allPhotoRecords = photoScopeRecords.filter(record => mapRecordMatchesDestination(record, destinationTrip));
  const cityOptionsById = new Map();
  const appendCityOption = cityId => {
    const id = Number(cityId);
    if (!id || cityOptionsById.has(id)) return;
    const city = state.lugares.find(item => Number(item.id) === id);
    if (city && !isTransitPlaceName(city.nombre)) cityOptionsById.set(id, city);
  };
  cities.forEach(item => appendCityOption(item.ciudad && item.ciudad.id));
  points.forEach(item => appendCityOption(item.pointEntry && item.pointEntry.ciudadId));
  allPhotoRecords.forEach(record => appendCityOption(record.ciudadId));
  const cityOptions = [...cityOptionsById.values()];
  if (tripMapState.cityId && !cityOptionsById.has(Number(tripMapState.cityId))) tripMapState.cityId = 0;
  if (dailyMode && tripMapState.cityId) tripMapState.cityId = 0;
  const cityMode = Boolean(tripMapState.cityId);
  if (!cityMode) {
    importedTimelineRecords = timelineRecordsForMap(scopedTripIds, dailyMode ? tripMapState.day : '');
    const adjustedTimelineRequested = tripMapState.timelineRouteView === 'adjusted'
      && importedTimelineRecords.length > 0;
    const importedPaths = timelineMapPaths(importedTimelineRecords, {
      adjusted: adjustedTimelineRequested,
      mode: tripMapState.timelineRoutingMode
    });
    const visibleExactRecords = dailyMode ? selectedExactDailyRecords : exactDailyRecords;
    timelinePaths = adjustedTimelineRequested
      ? timelineAdjustedMapPathsWithDailyRecords(
        importedPaths,
        timelineMapPaths(importedTimelineRecords),
        visibleExactRecords
      )
      : timelineMapPathsWithDailyRecords(importedPaths, visibleExactRecords);
  }
  const selectedCity = cityMode ? cityOptionsById.get(Number(tripMapState.cityId)) || null : null;
  const visibleCities = cityMode
    ? cities.filter(item => Number(item.ciudad && item.ciudad.id) === Number(tripMapState.cityId)).slice(0, 1)
    : cities;
  const visiblePoints = cityMode
    ? points.filter(item => Number(item.pointEntry && item.pointEntry.ciudadId) === Number(tripMapState.cityId))
    : points;
  const visiblePhotoRecords = cityMode
    ? allPhotoRecords.filter(record => Number(record.ciudadId) === Number(tripMapState.cityId))
    : allPhotoRecords;
  if (cityMode && !visibleCities.length && selectedCity && lugarHasCoords(selectedCity)) {
    const firstDate = [...visiblePoints.map(item => item.firstDate), ...visiblePhotoRecords.map(record => record.fecha)]
      .filter(Boolean)
      .sort()[0] || '';
    visibleCities.push({
      ciudad: selectedCity,
      pais: state.lugares.find(item => Number(item.id) === Number(selectedCity.parentId)) || null,
      firstDate,
      firstOrder: 0,
      routeOrder: 0,
      count: 0,
      totalEur: 0,
      configuredOnly: true,
      plannedOnly: false
    });
  }
  const photos = tripMapState.showPhotos ? photoMapItems(visiblePhotoRecords) : [];
  const dailyItems = dailyMode ? dailyRecords.map(dailyMapItem) : [];
  const rawBaseMapItems = dailyMode ? dailyItems : [...visibleCities, ...visiblePoints, ...photos];
  const rawTimelineItems = timelineMapMarkerItems(importedTimelineRecords, dailyMode)
    .filter(timelineItem => !rawBaseMapItems.some(item => {
      const name = `${item.ciudad && item.ciudad.nombre || ''} ${item.pointEntry && item.pointEntry.descripcion || ''}`;
      const lodgingName = normalizePlaceName(timelineItem.pointEntry && timelineItem.pointEntry.lodgingName);
      const sameLodgingName = lodgingName && normalizePlaceName(name).includes(lodgingName);
      if (!sameLodgingName && !/(^|\s)(?:casa|alojamiento)(?:\s|$)/i.test(name)) return false;
      if (!window.GoogleTimelineImport) return false;
      return window.GoogleTimelineImport.distanceMeters(
        { latitude: Number(item.ciudad && item.ciudad.lat), longitude: Number(item.ciudad && item.ciudad.lng) },
        { latitude: Number(timelineItem.ciudad && timelineItem.ciudad.lat), longitude: Number(timelineItem.ciudad && timelineItem.ciudad.lng) }
      ) < 50;
    }));
  const stackedItems = stackMapCitiesWithLodgings(rawBaseMapItems, rawTimelineItems, dailyMode);
  const mapItems = [...stackedItems.baseItems, ...stackedItems.lodgingItems];
  const visibleDailyRecords = dailyMode
    ? stackedItems.baseItems.map(item => item.dailyRecord).filter(Boolean)
    : dailyRecords;
  const timelineExtentItems = timelinePaths.flatMap((points, pathIndex) => points.map((point, pointIndex) => ({
    ciudad: {
      id: `timeline-extent-${pathIndex}-${pointIndex}`,
      nombre: 'Cronología de Maps',
      lat: point.latitude,
      lng: point.longitude
    },
    timelineExtent: true,
    dailyPoint: true,
    configuredOnly: true
  })));
  const cityDays = cityMode
    ? new Set([
      ...visibleCities.map(item => item.firstDate),
      ...visiblePoints.map(item => item.firstDate),
      ...visiblePhotoRecords.map(record => record.fecha)
    ].filter(Boolean))
    : new Set();
  return {
    paisId,
    cities: mapItems,
    withCoords: mapItems.filter(item => lugarHasCoords(item.ciudad)),
    shouldDrawRoute: !dailyMode && !cityMode && scopedTripIds.size <= 1,
    destinationOnlyAvailable,
    destinationOnlyApplied,
    pointCount: visiblePoints.length,
    photoCount: photos.length,
    accommodationDestinationCount: mapItems.filter(item => item.accommodationDestination || (item.ciudad && item.ciudad.accommodationDestination)).length,
    duplicatePhotoCount,
    availablePhotoCount: visiblePhotoRecords.length,
    dailyMode,
    dailyRecords: visibleDailyRecords,
    dailyUsesCityFallback: dailyMode && combinedDailyRecords.usesCityFallback,
    dayOptions,
    cityMode,
    cityOptions,
    selectedCity,
    cityDayCount: cityDays.size,
    scopedTrips,
    timelinePaths,
    timelineAdjustment: timelinePaths.some(path => path.adjustedRoute === true)
      ? (timelinePaths.every(path => path.adjustedRoute === true) ? 'adjusted' : 'partial')
      : 'original',
    timelineExtentItems,
    timelineAvailable: scopedTrips.length === 1 && state.timelineDays.some(record => Number(record.viajeId) === Number(scopedTrips[0].id))
  };
}

function mapLatLngFromWorldPoint(x, y, zoom) {
  const scale = 256 * (2 ** zoom);
  const longitude = (Number(x) / scale) * 360 - 180;
  const mercator = Math.PI - (2 * Math.PI * Number(y)) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(mercator));
  return { latitude, longitude };
}

function mapTileLayer(centerLat, centerLng, zoom, width, height) {
  const center = mapWorldPoint(centerLat, centerLng, zoom);
  const startX = center.x - width / 2;
  const startY = center.y - height / 2;
  const maxTile = (2 ** zoom) - 1;
  const tileMinX = Math.max(0, Math.floor(startX / 256));
  const tileMaxX = Math.min(maxTile, Math.floor((startX + width) / 256));
  const tileMinY = Math.max(0, Math.floor(startY / 256));
  const tileMaxY = Math.min(maxTile, Math.floor((startY + height) / 256));
  const tiles = [];
  const descriptors = [];
  for (let x = tileMinX; x <= tileMaxX; x += 1) {
    for (let y = tileMinY; y <= tileMaxY; y += 1) {
      const left = ((x * 256 - startX) / width) * 100;
      const top = ((y * 256 - startY) / height) * 100;
      const tileW = (256 / width) * 100;
      const tileH = (256 / height) * 100;
      const primary = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
      const fallback = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
      descriptors.push({ primary, fallback, left: x * 256 - startX, top: y * 256 - startY, width: 256, height: 256 });
      tiles.push(`<img class="map-tile" src="${primary}" onerror="this.onerror=null;this.src='${fallback}'" alt="" loading="lazy" decoding="async" draggable="false" style="left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;width:${tileW.toFixed(3)}%;height:${tileH.toFixed(3)}%;">`);
    }
  }
  return { startX, startY, html: tiles.join(''), tiles: descriptors };
}

function zoomTripMapAtPoint(x, y, delta = 1) {
  const { withCoords, timelineExtentItems } = tripMapItemsForCurrentScope();
  const extentItems = [...withCoords, ...timelineExtentItems];
  if (!extentItems.length || !delta) return false;
  const { width, height } = tripMapSize();
  const baseZoom = chooseMapZoom(extentItems, width, height);
  const oldZoom = Math.max(TRIP_MAP_MIN_ZOOM, Math.min(TRIP_MAP_MAX_ZOOM, baseZoom + tripMapState.zoomDelta));
  const newZoom = Math.max(TRIP_MAP_MIN_ZOOM, Math.min(TRIP_MAP_MAX_ZOOM, oldZoom + delta));
  if (newZoom === oldZoom) return false;
  const oldPoints = extentItems.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, oldZoom));
  const oldCenterX = (Math.min(...oldPoints.map(p => p.x)) + Math.max(...oldPoints.map(p => p.x))) / 2;
  const oldCenterY = (Math.min(...oldPoints.map(p => p.y)) + Math.max(...oldPoints.map(p => p.y))) / 2;
  const oldStartX = oldCenterX - width / 2 - tripMapState.panX;
  const oldStartY = oldCenterY - height / 2 - tripMapState.panY;
  const factor = 2 ** (newZoom - oldZoom);
  const clickedNewX = (oldStartX + x) * factor;
  const clickedNewY = (oldStartY + y) * factor;
  const newPoints = extentItems.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, newZoom));
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
  if (target.closest('.maplibregl-map')) return;
  if (target.closest('.map-controls, .map-photo-popup')) return;
  const frame = target.closest('.trip-map-frame');
  if (!frame) return;
  event.preventDefault();
  zoomTripMapAtClient(frame, event.clientX, event.clientY, 1);
}

function groupNearbyPhotoMapItems(items, maximumDistance = 30, maximumScreenDistance = 18) {
  const groups = [];
  items.forEach(item => {
    const selectedForEditing = tripMapState.photoEditKey
      && item.photoRecord
      && item.photoRecord.key === tripMapState.photoEditKey;
    const group = groups.find(existing =>
      !selectedForEditing
      && !existing.some(groupItem => groupItem.photoRecord && groupItem.photoRecord.key === tripMapState.photoEditKey)
      && (geographicDistanceMeters(existing[0].photoRecord, item.photoRecord) < maximumDistance
        || Math.hypot(existing[0].point.x - item.point.x, existing[0].point.y - item.point.y) < maximumScreenDistance)
    );
    if (group) group.push(item);
    else groups.push([item]);
  });
  return groups;
}

function closeTripMapPhotoPopup() {
  const popup = $('#trip-map-photo-popup');
  if (popup) popup.hidden = true;
}

function positionTripMapPhotoPopup(popup, anchorElement) {
  const frame = popup && popup.closest('.trip-map-frame');
  if (!frame || !(anchorElement instanceof Element)) {
    popup.classList.remove('tail-top', 'tail-bottom');
    popup.style.removeProperty('left');
    popup.style.removeProperty('top');
    popup.style.removeProperty('--map-photo-tail-x');
    return;
  }
  const frameRect = frame.getBoundingClientRect();
  const anchorRect = anchorElement.getBoundingClientRect();
  const anchorX = anchorRect.left + anchorRect.width / 2 - frameRect.left;
  const anchorY = anchorRect.top + anchorRect.height / 2 - frameRect.top;
  const popupWidth = popup.offsetWidth;
  const popupHeight = popup.offsetHeight;
  const edge = 10;
  const gap = 18;
  const left = Math.max(edge, Math.min(frameRect.width - popupWidth - edge, anchorX - popupWidth / 2));
  const placeAbove = anchorY >= popupHeight + gap + edge || anchorY > frameRect.height / 2;
  const desiredTop = placeAbove ? anchorY - popupHeight - gap : anchorY + gap;
  const top = Math.max(edge, Math.min(frameRect.height - popupHeight - edge, desiredTop));
  const tailX = Math.max(18, Math.min(popupWidth - 18, anchorX - left));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.setProperty('--map-photo-tail-x', `${tailX}px`);
  popup.classList.toggle('tail-bottom', placeAbove);
  popup.classList.toggle('tail-top', !placeAbove);
}

function openTripMapPhotoPopup(encodedKeys, anchorElement = null) {
  const popup = $('#trip-map-photo-popup');
  if (!popup) return;
  const keys = decodeURIComponent(String(encodedKeys || '')).split('|').filter(Boolean);
  const records = keys.map(key => tripMapPhotoLookup.get(key)).filter(Boolean);
  if (!records.length) return;
  popup.innerHTML = `<div class="map-photo-popup-head"><strong>${records.length === 1 ? 'Foto' : `${records.length} fotos`}</strong><button type="button" class="ghost icon-btn" data-map-photo-close="1" aria-label="Cerrar">x</button></div><div class="map-photo-popup-list">${records.map(record => `<article class="map-photo-popup-item"><button type="button" class="map-photo-thumbnail" data-open-map-photo="${escapeHtml(record.key)}" aria-label="Abrir foto"><img src="${escapeHtml(record.image.data || '')}" alt="${escapeHtml(record.descripcion || 'Foto')}"></button><div><strong>${escapeHtml(record.descripcion || 'Foto')}</strong><span>${escapeHtml(summaryDocumentDate(record.fecha, true))}${record.hora ? ` · ${escapeHtml(record.hora)}` : ''}</span><button type="button" class="ghost map-photo-position-button" data-adjust-map-photo="${escapeHtml(record.key)}">Ajustar posición</button></div></article>`).join('')}</div><span class="map-photo-position-hint">También puedes mantener pulsado y arrastrar un punto de una sola foto.</span>`;
  popup.hidden = false;
  positionTripMapPhotoPopup(popup, anchorElement);
}

function openTripMapMarkerPopup(detail, anchorElement = null) {
  const popup = $('#trip-map-photo-popup');
  if (!popup || !detail) return;
  const meta = [detail.place, ...(detail.dateLines || [])].filter(Boolean);
  const info = (detail.infoLines || []).filter(Boolean);
  const notes = (detail.noteLines || []).filter(Boolean);
  popup.innerHTML = `<div class="map-photo-popup-head"><strong>${escapeHtml(detail.title || 'Punto')}</strong><button type="button" class="ghost icon-btn" data-map-photo-close="1" aria-label="Cerrar">x</button></div><div class="map-marker-popup-detail">${meta.length ? meta.map(line => `<span>${escapeHtml(line)}</span>`).join('') : '<span>Sin fecha indicada</span>'}${info.map(line => `<p class="map-marker-popup-info">${escapeHtml(line)}</p>`).join('')}${notes.map(note => `<p class="map-marker-popup-notes"><strong>Notas:</strong> ${escapeHtml(note)}</p>`).join('')}${detail.lodgingEdit ? '<button type="button" class="ghost" data-edit-timeline-lodging="1">Editar nombre del alojamiento</button>' : ''}${detail.cityEdit ? '<span class="map-point-drag-hint">Mantén pulsado el marcador y arrástralo para corregir la posición guardada de la localidad.</span>' : ''}${detail.pointEdit ? '<span class="map-point-drag-hint">Mantén pulsado el punto y arrástralo para ajustar su posición.</span><button type="button" class="ghost" data-edit-map-point-name="1">Editar punto</button><button type="button" class="ghost danger" data-delete-map-point="1">Eliminar punto</button>' : ''}</div>`;
  popup.hidden = false;
  if (detail.lodgingEdit) {
    const editButton = popup.querySelector('[data-edit-timeline-lodging]');
    if (editButton) editButton.onclick = () => openLodgingNameDialog(detail.lodgingEdit);
  }
  if (detail.pointEdit) {
    const editButton = popup.querySelector('[data-edit-map-point-name]');
    if (editButton) editButton.onclick = () => openMapPointDialog(detail.pointEdit);
    const deleteButton = popup.querySelector('[data-delete-map-point]');
    if (deleteButton) deleteButton.onclick = () => deleteMapPoint(detail.pointEdit).catch(error => alert(error.message || String(error)));
  }
  positionTripMapPhotoPopup(popup, anchorElement);
}

function openTripMapPhoto(key) {
  const record = tripMapPhotoLookup.get(String(key || ''));
  if (!record || !record.image || !record.image.data) throw new Error('No se encuentra la foto');
  const blob = dataUrlToBlob(record.image.data, record.image.type || 'image/jpeg');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function isTripMapFullscreen() {
  const container = $('#trip-map');
  return Boolean(container && (
    document.fullscreenElement === container
    || container.classList.contains('map-fullscreen-fallback')
  ));
}

async function toggleTripMapFullscreen() {
  const container = $('#trip-map');
  if (!container) return;
  if (document.fullscreenElement === container) {
    await document.exitFullscreen();
    return;
  }
  if (container.classList.contains('map-fullscreen-fallback')) {
    container.classList.remove('map-fullscreen-fallback');
    document.body.classList.remove('map-fullscreen-open');
    resetTripMapView();
    renderTripMap();
    return;
  }
  if (container.requestFullscreen) {
    try {
      await container.requestFullscreen({ navigationUI: 'hide' });
      return;
    } catch (error) {
      console.warn('Se usará el modo de pantalla completa compatible', error);
    }
  }
  container.classList.add('map-fullscreen-fallback');
  document.body.classList.add('map-fullscreen-open');
  resetTripMapView();
  renderTripMap();
}

function dailyMapDateTimeLabel(record) {
  const date = record && record.fecha ? summaryDocumentDate(record.fecha, true) : 'Sin fecha';
  return `${date} · ${record && record.hora ? record.hora : '--:--'}`;
}

function dailyMapCityName(record) {
  const city = state.lugares.find(item => Number(item.id) === Number(record && record.ciudadId));
  if (city && city.nombre) return city.nombre;
  const description = String(record && record.descripcion || '').split(' · ')[0].trim();
  return description || 'Punto';
}

function dailyMapLabelLines(record) {
  return [dailyMapCityName(record)];
}

function tripMapArrivalLabelLines(item) {
  const name = item && item.ciudad && item.ciudad.nombre ? item.ciudad.nombre : 'Punto';
  return [name];
}

const TRIP_MAP_TRAIN_ICON = './assets/map-train-side.webp';

const BLOG_POINT_TRANSPORT_OPTIONS = {
  walk: { type: 'walk', icon: '🚶', label: 'Caminar' },
  car: { type: 'car', icon: '🚗', label: 'Coche' },
  train: { type: 'train', icon: '🚂', image: TRIP_MAP_TRAIN_ICON, label: 'Tren' },
  bus: { type: 'bus', icon: '🚌', label: 'Bus' },
  plane: { type: 'plane', icon: '✈️', label: 'Avión' }
};

function inferBlogPointTransport(value) {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES');
  if (/(^|\W)(caminar|caminando|andando|a\s+pie|walk|walking)(\W|$)/.test(text)) return 'walk';
  if (/(^|\W)(tren|trenes|ferrocarril)(\W|$)/.test(text)) return 'train';
  if (/(^|\W)(coche|coches|automovil|automoviles|auto)(\W|$)/.test(text)) return 'car';
  if (/(^|\W)(bus|buses|autobus|autobuses|autocar|autocares)(\W|$)/.test(text)) return 'bus';
  if (/(^|\W)(avion|aviones|vuelo|vuelos)(\W|$)/.test(text)) return 'plane';
  return '';
}

function normalizeBlogPointTransport(value) {
  const normalized = String(value || '').trim().toLocaleLowerCase('es-ES');
  return BLOG_POINT_TRANSPORT_OPTIONS[normalized] ? normalized : inferBlogPointTransport(normalized);
}

function blogPointTransportLabel(value) {
  return BLOG_POINT_TRANSPORT_OPTIONS[normalizeBlogPointTransport(value)]?.label || '';
}

function selectedBlogPointTransport() {
  const selected = $$('[data-point-transport]').find(input => input.checked);
  return normalizeBlogPointTransport(selected && selected.dataset.pointTransport);
}

function setBlogPointTransportSelection(value = '') {
  const selected = normalizeBlogPointTransport(value);
  $$('[data-point-transport]').forEach(input => {
    input.checked = input.dataset.pointTransport === selected;
  });
}

function tripMapTransportMarker(record) {
  const wrappedSource = record && (record.dailyRecord || record.pointEntry || record.entry || record);
  const source = wrappedSource && (wrappedSource.entry || wrappedSource.pointEntry || wrappedSource);
  const hasExplicitTransport = Boolean(source) && (
    Object.prototype.hasOwnProperty.call(source, 'transporte')
    || Object.prototype.hasOwnProperty.call(source, 'transport')
  );
  const explicit = hasExplicitTransport
    ? normalizeBlogPointTransport(source.transporte || source.transport)
    : '';
  const legacy = hasExplicitTransport
    ? ''
    : inferBlogPointTransport(source && (source.descripcion || source.desc) || record && record.ciudad && record.ciudad.nombre || '');
  const option = BLOG_POINT_TRANSPORT_OPTIONS[explicit || legacy];
  return option ? { ...option } : null;
}

function tripMapMarkerDetail(items = [], dailyRecord = null) {
  const itemList = items.length ? items : [];
  const first = itemList[0] || {};
  const source = dailyRecord || first.dailyRecord || first.pointEntry || first.entry || first;
  const title = String(source && (source.descripcion || source.desc) || first.ciudad && first.ciudad.nombre || 'Punto').trim() || 'Punto';
  const place = dailyRecord
    ? dailyMapCityName(dailyRecord)
    : String(first.ciudad && first.ciudad.nombre || '').trim();
  const dateLines = [...new Set((dailyRecord ? [{ dailyRecord }] : itemList).map(item => {
    const record = item.dailyRecord || item.pointEntry || item.entry || item;
    const date = record && (record.fecha || record.firstDate) || item.firstDate || '';
    if (!date) return '';
    const time = record && record.hora || '';
    return `${summaryDocumentDate(date, true)}${time ? ` · ${time}` : ''}`;
  }).filter(Boolean))];
  const noteLines = [...new Set((dailyRecord ? [{ dailyRecord }] : itemList).map(item => {
    const record = item.dailyRecord || item.pointEntry || item.entry || item;
    return String(record && (record.notas || record.notes) || '').trim();
  }).filter(Boolean))];
  const lodgingEdit = source && source.timelinePoint && source.timelineRecordId
    ? {
      tripId: Number(source.viajeId),
      recordId: String(source.timelineRecordId),
      date: String(source.fecha || ''),
      role: source.timelineLodgingRole === 'arrival' ? 'arrival' : 'departure',
      latitude: Number(source.latitude),
      longitude: Number(source.longitude),
      name: String(source.lodgingName || 'Alojamiento'),
      source: String(source.lodgingNameSource || ''),
      sourceLabel: String(source.lodgingNameSourceLabel || '')
    }
    : null;
  const groupedEditablePoint = itemList
    .map(item => item && item.dailyRecord && item.dailyRecord.entry || item && item.pointEntry || item && item.entry || item)
    .find(record => record && record.tipo === 'punto') || null;
  const editablePoint = source && source.entry && source.entry.tipo === 'punto'
    ? source.entry
    : (source && source.tipo === 'punto' ? source : groupedEditablePoint);
  const editablePointCoordinates = editablePoint ? blogPointCoordinates(editablePoint) : null;
  const pointEdit = editablePoint && editablePointCoordinates
    ? {
      entryId: Number(editablePoint.id),
      tripId: Number(editablePoint.viajeId),
      cityId: Number(editablePoint.ciudadId) || null,
      cityManual: editablePoint.mapCityManual === true,
      latitude: editablePointCoordinates.latitude,
      longitude: editablePointCoordinates.longitude,
      name: String(editablePoint.descripcion || ''),
      date: String(editablePoint.fecha || ''),
      time: String(editablePoint.hora || '')
    }
    : null;
  const cityIds = [...new Set((dailyRecord ? [dailyRecord.ciudadId] : itemList.map(item => item && item.ciudad && item.ciudad.id))
    .map(Number)
    .filter(Boolean))];
  const editableCity = cityIds.length === 1
    ? state.lugares.find(item => Number(item.id) === cityIds[0] && Number(item.parentId) > 0)
    : null;
  const cityEdit = editableCity
    && !pointEdit
    && !(dailyRecord && (dailyRecord.kind !== 'city' || dailyRecord.accommodationDestination))
    && !itemList.some(item => item && (item.photoPoint || item.timelinePoint || item.stackedOverLodging || item.stackedUnderCity))
    ? {
      cityId: Number(editableCity.id),
      latitude: Number(editableCity.lat),
      longitude: Number(editableCity.lng),
      name: String(editableCity.nombre || '')
    }
    : null;
  const groupedCount = dailyRecord && dailyRecord.kind === 'city' ? Number(dailyRecord.count) || 0 : 0;
  const infoLines = groupedCount
    ? [`${groupedCount} ${groupedCount === 1 ? 'apunte sin GPS exacto agrupado' : 'apuntes sin GPS exacto agrupados'} en esta localidad.`]
    : [];
  return {
    title,
    place: place && place !== title ? place : '',
    dateLines,
    noteLines,
    infoLines,
    lodgingEdit,
    pointEdit,
    cityEdit
  };
}

function openTripMapMarkerNameEditor(detail) {
  if (detail && detail.lodgingEdit) openLodgingNameDialog(detail.lodgingEdit);
  else if (detail && detail.pointEdit) openMapPointDialog(detail.pointEdit);
}

async function loadMapTileForCanvas(descriptor) {
  for (const url of [descriptor.primary, descriptor.fallback]) {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (!response.ok) continue;
      const blob = await response.blob();
      return await loadImageFile(blob);
    } catch (error) {
      console.warn('No se pudo incorporar una tesela al mapa del Blog', error);
    }
  }
  return null;
}

async function loadMapMarkerImageForCanvas(url) {
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return null;
    return await loadImageFile(await response.blob());
  } catch (error) {
    console.warn('No se pudo incorporar el icono de transporte al mapa del Blog', error);
    return null;
  }
}

function dailyMapPresentation(records = []) {
  return window.TripMapModel.createDaily(records, {
    getCityName: dailyMapCityName
  });
}

function tripRoutePresentation(items = []) {
  return window.TripMapModel.createTrip(items.map((item, index) => ({
    item,
    cityId: item && item.ciudad && item.ciudad.id,
    name: item && item.ciudad && item.ciudad.nombre,
    latitude: item && item.ciudad && item.ciudad.lat,
    longitude: item && item.ciudad && item.ciudad.lng,
    number: Number(item && item.index) + 1 || index + 1,
    arrivalDate: item && item.firstDate,
    route: item.routeWaypoint === true || !item.configuredOnly
  })), {
    getName: stop => stop.name || 'Punto',
    formatDate: date => summaryDocumentDate(date, true)
  });
}

function tripRouteItemDateTime(item) {
  const source = item.photoRecord || item.pointEntry || item;
  const date = source.fecha || item.firstDate || '';
  return date ? `${date}T${source.hora || '00:00'}` : '';
}

function orderTripItemsWithRouteWaypoints(items = []) {
  const base = items.filter(item => !item.configuredOnly && !item.routeWaypoint);
  const waypoints = items.filter(item => item.routeWaypoint && lugarHasCoords(item.ciudad));
  if (base.length < 2 || !waypoints.length) return items;
  const assigned = Array.from({ length: base.length - 1 }, () => []);
  waypoints.forEach(waypoint => {
    let best = null;
    for (let index = 0; index < base.length - 1; index += 1) {
      const from = base[index];
      const to = base[index + 1];
      const direct = geographicDistanceMeters(
        { latitude: from.ciudad.lat, longitude: from.ciudad.lng },
        { latitude: to.ciudad.lat, longitude: to.ciudad.lng }
      );
      const fromDistance = geographicDistanceMeters(
        { latitude: from.ciudad.lat, longitude: from.ciudad.lng },
        { latitude: waypoint.ciudad.lat, longitude: waypoint.ciudad.lng }
      );
      const toDistance = geographicDistanceMeters(
        { latitude: waypoint.ciudad.lat, longitude: waypoint.ciudad.lng },
        { latitude: to.ciudad.lat, longitude: to.ciudad.lng }
      );
      const waypointDate = tripRouteItemDateTime(waypoint).slice(0, 10);
      const fromDate = tripRouteItemDateTime(from).slice(0, 10);
      const toDate = tripRouteItemDateTime(to).slice(0, 10);
      const minDate = fromDate && toDate ? (fromDate < toDate ? fromDate : toDate) : '';
      const maxDate = fromDate && toDate ? (fromDate > toDate ? fromDate : toDate) : '';
      const datePenalty = waypointDate && minDate && maxDate && (waypointDate < minDate || waypointDate > maxDate) ? 1_000_000 : 0;
      const score = Math.max(0, fromDistance + toDistance - direct) + datePenalty;
      const progress = fromDistance / Math.max(1, fromDistance + toDistance);
      if (!best || score < best.score) best = { index, score, progress };
    }
    if (best) assigned[best.index].push({ waypoint, progress: best.progress });
  });
  assigned.forEach(group => group.sort((a, b) => a.progress - b.progress || tripRouteItemDateTime(a.waypoint).localeCompare(tripRouteItemDateTime(b.waypoint))));
  const routeItems = [base[0]];
  assigned.forEach((group, index) => routeItems.push(...group.map(item => item.waypoint), base[index + 1]));
  const routeSet = new Set(routeItems);
  return [...routeItems, ...items.filter(item => !routeSet.has(item))];
}

function enRouteBlogItemsForTrip(tripId) {
  const items = [];
  state.blogEntries.filter(entry => Number(entry.viajeId) === Number(tripId) && entry.enRuta === true).forEach(entry => {
    if (entry.tipo === 'imagen') {
      blogEntryImages(entry).forEach((image, index) => {
        const point = storedImageCoordinates(image);
        if (!point) return;
        items.push({
          ciudad: { id: `en-route-image-${entry.id}-${index}`, nombre: entry.descripcion || 'Foto en ruta', lat: point.latitude, lng: point.longitude },
          firstDate: entry.fecha || '',
          configuredOnly: true,
          routeWaypoint: true,
          photoPoint: true,
          photoRecord: { fecha: entry.fecha || '', hora: entry.hora || '', descripcion: entry.descripcion || 'Foto en ruta' }
        });
      });
      return;
    }
    const point = blogPointCoordinates(entry);
    if (!point) return;
    items.push({
      ciudad: { id: `en-route-entry-${entry.id}`, nombre: entry.descripcion || 'Huella en ruta', lat: point.latitude, lng: point.longitude },
      firstDate: entry.fecha || '',
      configuredOnly: true,
      routeWaypoint: true,
      blogPoint: true,
      pointEntry: entry
    });
  });
  return items;
}

function dailyMapBlogLayers(records = []) {
  const model = dailyMapPresentation(records);
  return {
    dailyRoute: model.route,
    routeMarkers: model.routeMarkers,
    markerModels: model.markers,
    destinationMarkers: model.destinationMarkers,
    exactPoints: model.exactPoints,
    photoGroups: model.photoGroups,
    hasRoute: model.hasRoute
  };
}

async function createDailyMapBlogImage(records, day, timelinePaths = []) {
  if (!records.length && !timelinePaths.length) throw new Error('Ese día no tiene puntos geolocalizados para copiar.');
  const width = TRIP_MAP_WIDTH;
  const mapHeight = TRIP_MAP_HEIGHT;
  const headerHeight = 58;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = headerHeight + mapHeight;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, canvas.height);
  context.fillStyle = '#0f172a';
  context.font = '700 25px system-ui, sans-serif';
  context.fillText(`Mapa del día ${blogDayDateLabel(day)}`, 20, 36);

  const items = [
    ...records.map(record => ({
      ciudad: { lat: record.latitude, lng: record.longitude },
      blogPoint: record.kind !== 'city',
      cityFallback: record.kind === 'city'
    })),
    ...timelinePaths.flatMap(path => path.map(point => ({
      ciudad: { lat: point.latitude, lng: point.longitude },
      timelineExtent: true
    })))
  ];
  const { zoom, layer } = blogMapViewport(items, width, mapHeight);
  context.fillStyle = '#cfe8f3';
  context.fillRect(0, headerHeight, width, mapHeight);
  const tileImages = await Promise.all(layer.tiles.map(loadMapTileForCanvas));
  tileImages.forEach((image, index) => {
    if (!image) return;
    const tile = layer.tiles[index];
    context.drawImage(image, tile.left, headerHeight + tile.top, tile.width, tile.height);
  });

  const { dailyRoute, markerModels, destinationMarkers, exactPoints, photoGroups, hasRoute: dailyHasRoute } = dailyMapBlogLayers(records);
  const trainMarkerImage = markerModels.some(({ record }) => {
    const marker = record.kind === 'point' ? tripMapTransportMarker(record) : null;
    return Boolean(marker && marker.image);
  })
    ? await loadMapMarkerImageForCanvas(TRIP_MAP_TRAIN_ICON)
    : null;
  if (dailyRoute.length > 1 && !timelinePaths.length) {
    context.beginPath();
    dailyRoute.forEach((record, index) => {
      const point = mapWorldPoint(record.latitude, record.longitude, zoom);
      const x = point.x - layer.startX;
      const y = headerHeight + point.y - layer.startY;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineWidth = 4;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#1d4ed8';
    context.stroke();
  }

  timelinePaths.forEach(path => {
    if (path.length < 2) return;
    context.beginPath();
    path.forEach((record, index) => {
      const point = mapWorldPoint(record.latitude, record.longitude, zoom);
      const x = point.x - layer.startX;
      const y = headerHeight + point.y - layer.startY;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineWidth = 5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#0f766e';
    context.stroke();
  });

  exactPoints.filter(record => !tripMapTransportMarker(record)).forEach(record => {
    const point = mapWorldPoint(record.latitude, record.longitude, zoom);
    const x = point.x - layer.startX;
    const y = headerHeight + point.y - layer.startY;
    context.fillStyle = '#7c3aed';
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#ffffff';
    context.stroke();
  });

  photoGroups.forEach(group => {
    const point = mapWorldPoint(group.latitude, group.longitude, zoom);
    const x = point.x - layer.startX + 13;
    const y = headerHeight + point.y - layer.startY - 13;
    context.fillStyle = '#0f766e';
    context.beginPath();
    context.arc(x, y, 9, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#ffffff';
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = '800 14px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText('+', x, y + 4.5);
    if (group.count > 1) {
      context.fillStyle = '#f97316';
      context.beginPath();
      context.arc(x + 8, y - 8, 7, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = '#ffffff';
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '800 8px system-ui, sans-serif';
      context.fillText(String(group.count), x + 8, y - 5.5);
    }
    context.textAlign = 'left';
  });

  markerModels.forEach((markerModel, index) => {
    const { record, labelLines } = markerModel;
    const transportMarker = record.kind === 'point' ? tripMapTransportMarker(record) : null;
    const point = mapWorldPoint(record.latitude, record.longitude, zoom);
    const x = point.x - layer.startX;
    const y = headerHeight + point.y - layer.startY;
    context.textAlign = 'center';
    if (transportMarker) {
      if (transportMarker.image && trainMarkerImage) {
        context.drawImage(trainMarkerImage, x - 15, y - 10, 30, 20);
      } else {
        context.font = '18px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        context.fillText(transportMarker.icon, x, y + 6);
      }
    } else {
      context.fillStyle = '#7c3aed';
      context.beginPath();
      context.arc(x, y, 10, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = '#ffffff';
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '800 10px system-ui, sans-serif';
      context.fillText(markerModel.numberText, x, y + 3.5);
    }
    if (labelLines.length && !transportMarker) {
      context.font = '900 16px system-ui, sans-serif';
      const textWidth = Math.max(...labelLines.map(label => context.measureText(label).width));
      const labelOnLeft = x + textWidth + 28 > width;
      const labelX = labelOnLeft ? x - textWidth - 18 : x + 15;
      const preferredLabelY = index % 2 === 0 ? y - 12 : y + 22;
      const labelY = Math.max(headerHeight + 20, Math.min(headerHeight + mapHeight - 10 - (labelLines.length - 1) * 19, preferredLabelY));
      context.textAlign = 'left';
      context.fillStyle = '#ffffffdd';
      context.fillRect(labelX - 4, labelY - 17, textWidth + 8, 22 + (labelLines.length - 1) * 19);
      context.fillStyle = '#111827';
      labelLines.forEach((label, lineIndex) => context.fillText(label, labelX, labelY + lineIndex * 19));
    }
  });
  destinationMarkers.forEach(markerModel => {
    const point = mapWorldPoint(markerModel.record.latitude, markerModel.record.longitude, zoom);
    const pointX = point.x - layer.startX;
    const labelOnLeft = pointX >= width / 2;
    const x = pointX + (labelOnLeft ? -18 : 18);
    const y = headerHeight + point.y - layer.startY;
    context.fillStyle = '#be123c';
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#ffffff';
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = '900 9px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(markerModel.numberText, x, y + 3);
    const cityName = markerModel.labelLines[0] || dailyMapCityName(markerModel.record);
    context.font = '900 16px system-ui, sans-serif';
    context.lineWidth = 5;
    context.lineJoin = 'round';
    context.strokeStyle = '#ffffff';
    context.fillStyle = '#111827';
    context.textAlign = labelOnLeft ? 'right' : 'left';
    const labelX = x + (labelOnLeft ? -12 : 12);
    context.strokeText(cityName, labelX, y + 5);
    context.fillText(cityName, labelX, y + 5);
  });
  context.textAlign = 'left';
  context.fillStyle = '#ffffffdd';
  context.fillRect(width - 190, canvas.height - 22, 186, 18);
  context.fillStyle = '#475569';
  context.font = '11px system-ui, sans-serif';
  context.fillText('© OpenStreetMap · © CARTO', width - 184, canvas.height - 9);
  const blob = await canvasToJpeg(canvas, 0.88);
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: `mapa-${day}.jpg`,
    type: 'image/jpeg',
    size: blob.size,
    data: await readBlobAsDataUrl(blob),
    width: canvas.width,
    height: canvas.height
  };
}

async function createTripOverviewMapBlogImage(trip) {
  const routeIds = tripCityIds(trip);
  const arrivalDates = tripRouteArrivalDates(trip, routeIds);
  const stops = routeIds.map((id, index) => ({
    city: cityWithAccommodationDestination(
      state.lugares.find(item => Number(item.id) === Number(id)) || null,
      trip.id,
      arrivalDates[index] || ''
    ),
    number: index + 1,
    arrivalDate: arrivalDates[index] || ''
  })).filter(stop => stop.city);
  const locatedStops = stops.filter(stop => lugarHasCoords(stop.city));
  if (!locatedStops.length) throw new Error('Las ciudades del viaje no tienen coordenadas para crear el mapa.');
  const routeItems = orderTripItemsWithRouteWaypoints([
    ...locatedStops.map((stop, index) => ({
      ciudad: stop.city,
      firstDate: stop.arrivalDate,
      index,
      configuredOnly: false,
      routeWaypoint: false,
      stop
    })),
    ...enRouteBlogItemsForTrip(trip.id)
  ]);
  const mapModel = tripRoutePresentation(routeItems);
  const timelinePaths = tripMapState.showTimeline
    ? timelineMapPaths(timelineRecordsForTrip(trip.id))
    : [];
  const exactMapRecords = dailyMapRecordsForScope(new Set([Number(trip.id)]), 0);
  const width = TRIP_MAP_WIDTH;
  const mapHeight = TRIP_MAP_HEIGHT;
  const headerHeight = 86;
  const listHeaderHeight = 48;
  const listLineHeight = 24;
  const footerHeight = 18;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = headerHeight + mapHeight + listHeaderHeight + stops.length * listLineHeight + footerHeight;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0f172a';
  context.font = '800 28px system-ui, sans-serif';
  context.fillText(trip.nombre || 'Viaje', 22, 34);
  context.fillStyle = '#475569';
  context.font = '600 16px system-ui, sans-serif';
  const dateRange = [trip.fechaInicio, trip.fechaFin].filter(Boolean).map(date => summaryDocumentDate(date, true)).join(' — ');
  context.fillText(dateRange || 'Fechas no indicadas', 22, 62);

  const items = [
    ...mapModel.routeStops.map(item => ({
      ciudad: { lat: item.latitude, lng: item.longitude }
    })),
    ...exactMapRecords.map(record => ({
      ciudad: { lat: record.latitude, lng: record.longitude },
      blogPoint: record.kind === 'point',
      photoPoint: record.kind === 'photo'
    })),
    ...timelinePaths.flatMap(path => path.map(point => ({
      ciudad: { lat: point.latitude, lng: point.longitude }
    })))
  ];
  const { zoom, layer } = blogMapViewport(items, width, mapHeight);
  context.fillStyle = '#cfe8f3';
  context.fillRect(0, headerHeight, width, mapHeight);
  const tileImages = await Promise.all(layer.tiles.map(loadMapTileForCanvas));
  tileImages.forEach((image, index) => {
    if (!image) return;
    const tile = layer.tiles[index];
    context.drawImage(image, tile.left, headerHeight + tile.top, tile.width, tile.height);
  });
  const projectedStops = mapModel.routeStops.map(item => {
    const point = mapWorldPoint(item.latitude, item.longitude, zoom);
    return { ...item, x: point.x - layer.startX, y: headerHeight + point.y - layer.startY };
  });
  if (projectedStops.length > 1 && !timelinePaths.length) {
    context.beginPath();
    projectedStops.forEach((stop, index) => index ? context.lineTo(stop.x, stop.y) : context.moveTo(stop.x, stop.y));
    context.lineWidth = 4;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#1d4ed8';
    context.setLineDash([10, 8]);
    context.stroke();
    context.setLineDash([]);
  }
  timelinePaths.forEach(path => {
    if (path.length < 2) return;
    context.beginPath();
    path.forEach((record, index) => {
      const point = mapWorldPoint(record.latitude, record.longitude, zoom);
      const x = point.x - layer.startX;
      const y = headerHeight + point.y - layer.startY;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineWidth = 5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#0f766e';
    context.stroke();
  });
  exactMapRecords.forEach(record => {
    const point = mapWorldPoint(record.latitude, record.longitude, zoom);
    const x = point.x - layer.startX;
    const y = headerHeight + point.y - layer.startY;
    context.fillStyle = record.kind === 'photo' ? '#0f766e' : '#7c3aed';
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#ffffff';
    context.stroke();
    if (record.kind === 'photo') {
      context.fillStyle = '#ffffff';
      context.font = '800 11px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('+', x, y + 3.5);
      context.textAlign = 'left';
    }
  });
  const projectedByIndex = new Map(projectedStops.map(stop => [stop._mapIndex, stop]));
  mapModel.markerGroups.filter(markerGroup => !markerGroup.primary.item.routeWaypoint).forEach(markerGroup => {
    const group = markerGroup.entries.map(entry => projectedByIndex.get(entry._mapIndex)).filter(Boolean);
    const stop = group[0];
    if (!stop) return;
    const numberText = markerGroup.numberText;
    context.font = '800 11px system-ui, sans-serif';
    const markerWidth = Math.max(20, Math.ceil(context.measureText(numberText).width) + 12);
    context.fillStyle = '#dc2626';
    context.beginPath();
    context.moveTo(stop.x - markerWidth / 2 + 10, stop.y - 10);
    context.lineTo(stop.x + markerWidth / 2 - 10, stop.y - 10);
    context.quadraticCurveTo(stop.x + markerWidth / 2, stop.y - 10, stop.x + markerWidth / 2, stop.y);
    context.quadraticCurveTo(stop.x + markerWidth / 2, stop.y + 10, stop.x + markerWidth / 2 - 10, stop.y + 10);
    context.lineTo(stop.x - markerWidth / 2 + 10, stop.y + 10);
    context.quadraticCurveTo(stop.x - markerWidth / 2, stop.y + 10, stop.x - markerWidth / 2, stop.y);
    context.quadraticCurveTo(stop.x - markerWidth / 2, stop.y - 10, stop.x - markerWidth / 2 + 10, stop.y - 10);
    context.closePath();
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = '#ffffff';
    context.stroke();
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.fillText(numberText, stop.x, stop.y + 3.5);
    context.textAlign = 'left';
    const labelLines = markerGroup.labelLines;
    context.font = '700 13px system-ui, sans-serif';
    const labelWidth = Math.max(...labelLines.map(line => context.measureText(line).width));
    const labelLeft = stop.x + markerWidth / 2 + 7 + labelWidth > width ? stop.x - markerWidth / 2 - 7 - labelWidth : stop.x + markerWidth / 2 + 7;
    context.fillStyle = '#ffffffdd';
    context.fillRect(labelLeft - 3, stop.y - 17, labelWidth + 6, labelLines.length * 16 + 3);
    context.fillStyle = '#172033';
    labelLines.forEach((line, index) => context.fillText(line, labelLeft, stop.y - 5 + index * 15));
  });
  context.fillStyle = '#ffffffdd';
  context.fillRect(width - 190, headerHeight + mapHeight - 20, 186, 18);
  context.fillStyle = '#475569';
  context.font = '11px system-ui, sans-serif';
  context.fillText('© OpenStreetMap · © CARTO', width - 184, headerHeight + mapHeight - 7);

  const listTop = headerHeight + mapHeight;
  context.fillStyle = '#ffffff';
  context.fillRect(0, listTop, width, canvas.height - listTop);
  context.strokeStyle = '#cbd5e1';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(22, listTop + 12);
  context.lineTo(width - 22, listTop + 12);
  context.stroke();
  context.fillStyle = '#0f172a';
  context.font = '800 20px system-ui, sans-serif';
  context.fillText('Ciudades visitadas', 22, listTop + 38);
  context.font = '600 15px system-ui, sans-serif';
  stops.forEach((stop, index) => {
    const date = stop.arrivalDate ? summaryDocumentDate(stop.arrivalDate, true) : 'Fecha no disponible';
    context.fillStyle = '#172033';
    context.fillText(`${stop.number}. ${stop.city.nombre}`, 28, listTop + listHeaderHeight + index * listLineHeight + 17);
    context.fillStyle = '#475569';
    context.textAlign = 'right';
    context.fillText(date, width - 28, listTop + listHeaderHeight + index * listLineHeight + 17);
    context.textAlign = 'left';
  });
  const blob = await canvasToJpeg(canvas, 0.9);
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: `mapa-${slugFilePart(trip.nombre || 'viaje')}.jpg`,
    type: 'image/jpeg',
    size: blob.size,
    data: await readBlobAsDataUrl(blob),
    width: canvas.width,
    height: canvas.height
  };
}

async function copyDailyMapToBlog() {
  const trip = currentMapTrip();
  const day = tripMapState.day;
  if (!trip || !day) throw new Error('Selecciona un único viaje y un día del mapa.');
  const scope = tripMapItemsForCurrentScope();
  if (scope.scopedTrips.length !== 1 || (!scope.dailyRecords.length && !scope.timelinePaths.length)) throw new Error('Ese día no tiene puntos para copiar.');
  const info = $('#trip-map-info');
  if (info) info.textContent = 'Preparando la imagen del mapa para el Blog...';
  const image = await createDailyMapBlogImage(scope.dailyRecords, day, scope.timelinePaths);
  const existing = state.blogEntries.find(entry =>
    Number(entry.viajeId) === Number(trip.id)
    && entry.tipo === 'imagen'
    && entry.dailyMapDate === day
  );
  const places = scope.dailyRecords.map(record => record.entry || record).filter(Boolean);
  const countryIds = [...new Set(places.map(item => Number(item.paisId)).filter(Boolean))];
  const cityIds = [...new Set(places.map(item => Number(item.ciudadId)).filter(Boolean))];
  const snapshot = {
    viajeId: Number(trip.id),
    fecha: day,
    hora: '00:00',
    tipo: 'imagen',
    descripcion: `Mapa del día ${blogDayDateLabel(day)}`,
    paisId: countryIds.length === 1 ? countryIds[0] : null,
    ciudadId: cityIds.length === 1 ? cityIds[0] : null,
    imageName: image.name,
    imageType: image.type,
    imageSize: image.size,
    imageData: image.data,
    imageWidth: image.width,
    imageHeight: image.height,
    imageId: image.id,
    imageMapEnabled: false,
    galleryImages: [],
    wordpressIncluded: true,
    featuredImage: true,
    dailyMapDate: day
  };
  const previousFeatured = state.blogEntries.find(entry =>
    Number(entry.viajeId) === Number(trip.id)
    && entry.tipo === 'imagen'
    && entry.fecha === day
    && entry.featuredImage
    && Number(entry.id) !== Number(existing && existing.id)
  );
  if (previousFeatured) await updateBlogEntry(previousFeatured.id, { featuredImage: false });
  if (existing) {
    await updateBlogEntry(existing.id, { ...snapshot, updatedAt: new Date().toISOString() });
  } else {
    await addBlogEntry(snapshot);
  }
  await loadAll();
  tripMapState.day = day;
  tripMapState.cityId = 0;
  renderTripMap();
  if ($('#trip-map-info')) {
    $('#trip-map-info').textContent = `${existing ? 'Mapa actualizado' : 'Mapa copiado'} en el Blog al principio del ${blogDayDateLabel(day)}.`;
  }
}

async function copyTripOverviewMapToBlog() {
  const trip = currentMapTrip();
  if (!trip) throw new Error('Selecciona un único viaje.');
  const info = $('#trip-map-info');
  if (info) info.textContent = 'Preparando el mapa completo para la primera página del Blog...';
  const image = await createTripOverviewMapBlogImage(trip);
  const overviewKey = `trip-overview:${trip.id}`;
  const existing = state.blogEntries.find(entry =>
    Number(entry.viajeId) === Number(trip.id)
    && entry.tipo === 'imagen'
    && entry.dailyMapDate === overviewKey
  );
  const snapshot = {
    viajeId: Number(trip.id),
    fecha: trip.fechaInicio || currentLocalDate(),
    hora: '00:00',
    tipo: 'imagen',
    descripcion: trip.nombre || 'Mapa del viaje',
    paisId: null,
    ciudadId: null,
    imageName: image.name,
    imageType: image.type,
    imageSize: image.size,
    imageData: image.data,
    imageWidth: image.width,
    imageHeight: image.height,
    imageId: image.id,
    imageMapEnabled: false,
    galleryImages: [],
    wordpressIncluded: true,
    featuredImage: false,
    dailyMapDate: overviewKey
  };
  if (existing) await updateBlogEntry(existing.id, { ...snapshot, updatedAt: new Date().toISOString() });
  else await addBlogEntry(snapshot);
  await loadAll();
  if ($('#trip-map-info')) $('#trip-map-info').textContent = `${existing ? 'Página inicial actualizada' : 'Página inicial creada'} en el Blog para ${trip.nombre}.`;
}

async function copyCurrentMapToBlog() {
  if (tripMapState.day) return copyDailyMapToBlog();
  if (tripMapState.cityId) throw new Error('El mapa por ciudad no se copia al Blog. Elige Todos los días y Todas las ciudades.');
  return copyTripOverviewMapToBlog();
}

function destroyTripVectorMap() {
  if (tripMapLongPressCleanup) {
    tripMapLongPressCleanup();
    tripMapLongPressCleanup = null;
  }
  tripVectorPhotoMarkers.forEach(marker => {
    try { marker.remove(); } catch {}
  });
  tripVectorMarkers.forEach(marker => {
    try { marker.remove(); } catch {}
  });
  tripVectorPhotoMarkers = [];
  tripVectorMarkers = [];
  if (tripVectorMap) {
    try { tripVectorMap.remove(); } catch {}
    tripVectorMap = null;
  }
}

function tripVectorMarkerElement(item, index, dailyMode, dailyHasRoute = false, routeGroup = [], presentation = null) {
  const element = document.createElement('div');
  const dailyRecord = dailyMode ? item.dailyRecord : null;
  const groupedRouteItems = routeGroup.length ? routeGroup.map(entry => entry.item) : [];
  const routePoint = groupedRouteItems.length > 0 || !item.configuredOnly;
  const pointMarker = Boolean(item.blogPoint);
  const transportMarker = pointMarker ? tripMapTransportMarker(dailyRecord || item) : null;
  element.className = `trip-vector-marker${item.configuredOnly ? ' configured' : ''}${pointMarker ? ' point' : ''}${item.timelinePoint ? ' timeline' : ''}${dailyRecord ? ' daily' : ''}${routeGroup.length > 1 ? ' repeated' : ''}${item.stackedOverLodging ? ' stacked-city' : ''}${item.stackedUnderCity ? ' stacked-lodging' : ''}${transportMarker ? ` transport ${transportMarker.type}` : ''}`;
  const dot = document.createElement('span');
  dot.className = 'trip-vector-marker-dot';
  const routeNumberText = presentation && presentation.numberText
    ? presentation.numberText
    : (routeGroup.length ? routeGroup.map(entry => entry.index + 1).join('-') : String(index + 1));
  if (transportMarker && transportMarker.image) {
    const image = document.createElement('img');
    image.src = transportMarker.image;
    image.alt = '';
    dot.append(image);
  } else {
    dot.textContent = item.timelinePoint
      ? 'A'
      : transportMarker
      ? transportMarker.icon
      : dailyRecord
        ? (dailyRecord.kind === 'point' ? '•' : '+')
        : (routePoint ? routeNumberText : (pointMarker ? '•' : '+'));
  }
  const label = document.createElement('span');
  label.className = 'trip-vector-marker-label';
  const labelLines = presentation && presentation.labelLines
    ? presentation.labelLines
    : (dailyRecord
      ? dailyMapLabelLines(dailyRecord)
      : groupedRouteItems.length
        ? tripMapArrivalLabelLines(item)
        : tripMapArrivalLabelLines(item));
  const visibleLabelLines = transportMarker ? [] : labelLines.slice(0, 1);
  label.textContent = visibleLabelLines.join('\n');
  element.append(dot);
  if (visibleLabelLines.length) element.append(label);
  const detailItems = dailyRecord ? [item] : (groupedRouteItems.length ? groupedRouteItems : [item]);
  const markerDetail = tripMapMarkerDetail(detailItems, dailyRecord);
  element.mapPointDragContext = markerDetail.pointEdit || null;
  element.mapCityDragContext = markerDetail.cityEdit || null;
  if (markerDetail.pointEdit) element.classList.add('manual-point-draggable');
  if (markerDetail.cityEdit) element.classList.add('city-position-draggable');
  element.title = `${markerDetail.title} · pulsa para ver los detalles`;
  const accommodationPhoto = dailyRecord && dailyRecord.accommodationPhotoRecord;
  if (accommodationPhoto) {
    const encodedKeys = encodeURIComponent(accommodationPhoto.key);
    element.classList.add('has-photo');
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', `Abrir ${accommodationPhoto.descripcion || 'foto del alojamiento'}`);
    element.dataset.mapPhotoKeys = encodedKeys;
    const open = event => {
      event.preventDefault();
      event.stopPropagation();
      if (element.dataset.ignoreMapPointClick === '1') return;
      openTripMapPhotoPopup(encodedKeys, element);
    };
    element.addEventListener('click', open);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
    if (markerDetail.lodgingEdit || markerDetail.pointEdit) {
      element.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
        openTripMapMarkerNameEditor(markerDetail);
      });
    }
  } else {
    element.classList.add('has-details');
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', `${transportMarker ? `${transportMarker.label}: ` : ''}${markerDetail.title}. Ver detalles`);
    const open = event => {
      event.preventDefault();
      event.stopPropagation();
      if (element.dataset.ignoreMapPointClick === '1') return;
      openTripMapMarkerPopup(markerDetail, element);
    };
    element.addEventListener('click', open);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
    if (markerDetail.lodgingEdit || markerDetail.pointEdit) {
      element.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
        openTripMapMarkerNameEditor(markerDetail);
      });
    }
  }
  return element;
}

function tripVectorDestinationElement(markerModel, labelOnLeft) {
  const element = document.createElement('span');
  element.className = `trip-vector-destination-marker ${labelOnLeft ? 'label-left' : 'label-right'}${markerModel.record.stackedOverLodging ? ' stacked-city' : ''}`;
  const number = document.createElement('span');
  number.textContent = markerModel.numberText;
  const label = document.createElement('span');
  label.className = 'trip-vector-destination-label';
  label.textContent = markerModel.labelLines[0] || dailyMapCityName(markerModel.record);
  element.append(number, label);
  element.title = `Destino ${markerModel.numberText} · ${dailyMapCityName(markerModel.record)}`;
  return element;
}

function tripVectorPhotoElement(records) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `trip-vector-photo-marker${records.length === 1 ? ' photo-position-draggable' : ''}${records[0] && records[0].key === tripMapState.photoEditKey ? ' editing-position' : ''}`;
  element.setAttribute('aria-label', records.length === 1 ? records[0].descripcion || 'Foto' : `${records.length} fotos`);
  element.innerHTML = `<span>+</span>${records.length > 1 ? `<b>${records.length}</b>` : ''}`;
  const encodedKeys = encodeURIComponent(records.map(record => record.key).join('|'));
  element.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (element.dataset.ignoreMapPointClick === '1') return;
    openTripMapPhotoPopup(encodedKeys, element);
  });
  element.title = records.length === 1
    ? 'Foto · mantén pulsado y arrastra para corregir su posición'
    : `${records.length} fotos · abre el grupo para elegir cuál quieres ajustar`;
  return element;
}

function renderTripVectorPhotoMarkers(map, photoItems) {
  tripVectorPhotoMarkers.forEach(marker => {
    try { marker.remove(); } catch {}
  });
  tripVectorPhotoMarkers = [];
  if (!map || !photoItems.length) return;
  const projected = photoItems.map(item => {
    const point = map.project([Number(item.ciudad.lng), Number(item.ciudad.lat)]);
    return { ...item, point: { x: point.x, y: point.y } };
  });
  groupNearbyPhotoMapItems(projected).forEach(group => {
    const records = group.map(item => item.photoRecord).filter(Boolean);
    if (!records.length) return;
    const longitude = group.reduce((sum, item) => sum + Number(item.ciudad.lng), 0) / group.length;
    const latitude = group.reduce((sum, item) => sum + Number(item.ciudad.lat), 0) / group.length;
    const markerElement = tripVectorPhotoElement(records);
    const editableRecord = records.length === 1 ? records[0] : null;
    const marker = new window.maplibregl.Marker({
      element: markerElement,
      anchor: 'center',
      draggable: Boolean(editableRecord)
    }).setLngLat([longitude, latitude]).addTo(map);
    if (editableRecord) {
      marker.on('dragstart', () => {
        closeTripMapPhotoPopup();
        markerElement.classList.add('dragging');
        markerElement.dataset.ignoreMapPointClick = '1';
      });
      marker.on('dragend', () => {
        markerElement.classList.remove('dragging');
        window.setTimeout(() => delete markerElement.dataset.ignoreMapPointClick, 400);
        const position = marker.getLngLat();
        moveMapPhoto(editableRecord, position.lat, position.lng)
          .catch(error => alert(error.message || String(error)));
      });
    }
    tripVectorPhotoMarkers.push(marker);
  });
}

function updateTripVectorZoomLabel(map, baseZoom) {
  const label = document.querySelector('#trip-map .map-controls-zoom span');
  if (!label || !map) return;
  const zoom = map.getZoom();
  const delta = zoom - baseZoom;
  const roundedZoom = Math.round(zoom * 10) / 10;
  const roundedDelta = Math.round(delta * 10) / 10;
  label.textContent = `Z ${roundedZoom} ${Math.abs(roundedDelta) < 0.05 ? 'auto' : `${roundedDelta > 0 ? '+' : ''}${roundedDelta}`}`;
}

function installTripMapLongPress(target, coordinatesForEvent) {
  if (!target || typeof coordinatesForEvent !== 'function') return;
  if (tripMapLongPressCleanup) tripMapLongPressCleanup();
  let timer = null;
  let start = null;
  let activePointerId = null;
  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
    start = null;
    activePointerId = null;
  };
  const pointerDown = event => {
    if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    if (event.target instanceof Element && event.target.closest('.trip-vector-marker, .trip-vector-photo-marker, .map-marker, .map-photo-popup, .maplibregl-ctrl')) return;
    clear();
    activePointerId = event.pointerId;
    start = { x: event.clientX, y: event.clientY };
    timer = window.setTimeout(() => {
      const point = coordinatesForEvent({ clientX: start.x, clientY: start.y });
      clear();
      if (!point) return;
      if (navigator.vibrate) navigator.vibrate(35);
      openMapPointDialog({ latitude: point.latitude, longitude: point.longitude });
    }, TRIP_MAP_LONG_PRESS_MS);
  };
  const pointerMove = event => {
    if (event.pointerId !== activePointerId || !start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 16) clear();
  };
  const pointerEnd = event => {
    if (event.pointerId === activePointerId) clear();
  };
  const contextMenu = event => event.preventDefault();
  target.addEventListener('pointerdown', pointerDown, true);
  target.addEventListener('pointermove', pointerMove, true);
  target.addEventListener('pointerup', pointerEnd, true);
  target.addEventListener('pointercancel', pointerEnd, true);
  target.addEventListener('pointerleave', pointerEnd, true);
  target.addEventListener('contextmenu', contextMenu, true);
  tripMapLongPressCleanup = () => {
    clear();
    target.removeEventListener('pointerdown', pointerDown, true);
    target.removeEventListener('pointermove', pointerMove, true);
    target.removeEventListener('pointerup', pointerEnd, true);
    target.removeEventListener('pointercancel', pointerEnd, true);
    target.removeEventListener('pointerleave', pointerEnd, true);
    target.removeEventListener('contextmenu', contextMenu, true);
  };
}

function installFallbackPositionDrag(frame, marker, options, movePosition) {
  const { startX, startY, zoom, width, height } = options;
  let pointerId = null;
  let start = null;
  let dragging = false;
  const reset = () => {
    marker.removeAttribute('transform');
    marker.classList.remove('dragging');
    pointerId = null;
    start = null;
    dragging = false;
  };
  marker.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    event.stopPropagation();
    pointerId = event.pointerId;
    start = { x: event.clientX, y: event.clientY };
    try { marker.setPointerCapture(pointerId); } catch {}
  });
  marker.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId || !start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!dragging && Math.hypot(dx, dy) < 5) return;
    dragging = true;
    event.preventDefault();
    event.stopPropagation();
    marker.classList.add('dragging');
    const rect = frame.getBoundingClientRect();
    marker.setAttribute('transform', `translate(${dx * width / rect.width} ${dy * height / rect.height})`);
  });
  marker.addEventListener('pointerup', event => {
    if (event.pointerId !== pointerId || !start) return;
    event.stopPropagation();
    if (!dragging) {
      reset();
      return;
    }
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    const x = Math.max(0, Math.min(width, ((event.clientX - rect.left) / rect.width) * width));
    const y = Math.max(0, Math.min(height, ((event.clientY - rect.top) / rect.height) * height));
    const point = mapLatLngFromWorldPoint(startX + x, startY + y, zoom);
    marker.dataset.ignoreMapPointClick = '1';
    window.setTimeout(() => delete marker.dataset.ignoreMapPointClick, 400);
    reset();
    movePosition(point.latitude, point.longitude).catch(error => alert(error.message || String(error)));
  });
  marker.addEventListener('pointercancel', reset);
}

function installFallbackManualPointDrag(frame, options = {}) {
  if (!frame) return;
  const { startX, startY, zoom, width, height } = options;
  frame.querySelectorAll('[data-map-point-drag]').forEach(marker => {
    const detail = tripMapMarkerDetailLookup.get(marker.getAttribute('data-map-point-drag'));
    const context = detail && detail.pointEdit;
    if (!context) return;
    marker.classList.add('manual-point-draggable');
    let pointerId = null;
    let start = null;
    let dragging = false;
    const reset = () => {
      marker.removeAttribute('transform');
      marker.classList.remove('dragging');
      pointerId = null;
      start = null;
      dragging = false;
    };
    marker.addEventListener('pointerdown', event => {
      if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
      event.stopPropagation();
      pointerId = event.pointerId;
      start = { x: event.clientX, y: event.clientY };
      try { marker.setPointerCapture(pointerId); } catch {}
    });
    marker.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId || !start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) < 5) return;
      dragging = true;
      event.preventDefault();
      event.stopPropagation();
      marker.classList.add('dragging');
      const rect = frame.getBoundingClientRect();
      marker.setAttribute('transform', `translate(${dx * width / rect.width} ${dy * height / rect.height})`);
    });
    marker.addEventListener('pointerup', event => {
      if (event.pointerId !== pointerId || !start) return;
      event.stopPropagation();
      if (!dragging) {
        reset();
        return;
      }
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const x = Math.max(0, Math.min(width, ((event.clientX - rect.left) / rect.width) * width));
      const y = Math.max(0, Math.min(height, ((event.clientY - rect.top) / rect.height) * height));
      const point = mapLatLngFromWorldPoint(startX + x, startY + y, zoom);
      marker.dataset.ignoreMapPointClick = '1';
      window.setTimeout(() => delete marker.dataset.ignoreMapPointClick, 400);
      reset();
      moveMapPoint(context, point.latitude, point.longitude)
        .catch(error => alert(error.message || String(error)));
    });
    marker.addEventListener('pointercancel', reset);
  });
  frame.querySelectorAll('[data-map-photo-drag]').forEach(marker => {
    const record = tripMapPhotoLookup.get(marker.getAttribute('data-map-photo-drag'));
    if (!record) return;
    marker.classList.add('photo-position-draggable');
    let pointerId = null;
    let start = null;
    let dragging = false;
    const reset = () => {
      marker.removeAttribute('transform');
      marker.classList.remove('dragging');
      pointerId = null;
      start = null;
      dragging = false;
    };
    marker.addEventListener('pointerdown', event => {
      if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
      event.stopPropagation();
      pointerId = event.pointerId;
      start = { x: event.clientX, y: event.clientY };
      try { marker.setPointerCapture(pointerId); } catch {}
    });
    marker.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId || !start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) < 5) return;
      dragging = true;
      event.preventDefault();
      event.stopPropagation();
      marker.classList.add('dragging');
      const rect = frame.getBoundingClientRect();
      marker.setAttribute('transform', `translate(${dx * width / rect.width} ${dy * height / rect.height})`);
    });
    marker.addEventListener('pointerup', event => {
      if (event.pointerId !== pointerId || !start) return;
      event.stopPropagation();
      if (!dragging) {
        reset();
        return;
      }
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const x = Math.max(0, Math.min(width, ((event.clientX - rect.left) / rect.width) * width));
      const y = Math.max(0, Math.min(height, ((event.clientY - rect.top) / rect.height) * height));
      const point = mapLatLngFromWorldPoint(startX + x, startY + y, zoom);
      marker.dataset.ignoreMapPointClick = '1';
      window.setTimeout(() => delete marker.dataset.ignoreMapPointClick, 400);
      reset();
      moveMapPhoto(record, point.latitude, point.longitude)
        .catch(error => alert(error.message || String(error)));
    });
    marker.addEventListener('pointercancel', reset);
  });
  frame.querySelectorAll('[data-map-city-drag]').forEach(marker => {
    const detail = tripMapMarkerDetailLookup.get(marker.getAttribute('data-map-city-drag'));
    const context = detail && detail.cityEdit;
    if (!context) return;
    marker.classList.add('city-position-draggable');
    installFallbackPositionDrag(frame, marker, options, (latitude, longitude) => moveMapCity(context, latitude, longitude));
  });
}

function addTripMapSatellite(map) {
  if (!map || !tripMapState.showSatellite || map.getSource('trip-satellite')) return;
  map.addSource('trip-satellite', {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    maxzoom: 19,
    attribution: 'Imágenes © Esri — Fuente: Esri, Vantor, Earthstar Geographics y la comunidad GIS'
  });
  const satelliteBeforeLayer = (map.getStyle().layers || []).find(layer => layer.type === 'line' || layer.type === 'symbol');
  map.addLayer({
    id: 'trip-satellite-layer',
    type: 'raster',
    source: 'trip-satellite',
    paint: {
      'raster-opacity': 1,
      'raster-fade-duration': 150
    }
  }, satelliteBeforeLayer ? satelliteBeforeLayer.id : undefined);
}

function initializeTripVectorMap({ container, withCoords, extentItems = withCoords, dailyMode, shouldDrawRoute, baseZoom, timelinePaths = [] }) {
  if (!container || !window.maplibregl || !extentItems.length) return false;
  if (typeof window.maplibregl.supported === 'function' && !window.maplibregl.supported()) {
    tripVectorMapFailed = true;
    return false;
  }
  const frame = container.querySelector('.trip-map-frame');
  if (!frame) return false;
  destroyTripVectorMap();
  frame.classList.add('trip-map-vector-frame');
  frame.removeAttribute('data-map-pan');
  frame.querySelector('.map-tiles')?.remove();
  frame.querySelector('.trip-map-overlay')?.remove();
  frame.querySelector('.map-attribution')?.remove();
  const host = document.createElement('div');
  host.className = 'trip-vector-map';
  host.innerHTML = '<div class="trip-vector-loading">Cargando mapa vectorial…</div>';
  frame.prepend(host);

  const coordinates = extentItems.map(item => [Number(item.ciudad.lng), Number(item.ciudad.lat)]);
  const storedCenter = Array.isArray(tripMapState.vectorCenter) && tripMapState.vectorCenter.length === 2
    ? tripMapState.vectorCenter
    : null;
  const storedZoom = Number.isFinite(tripMapState.vectorZoom) ? tripMapState.vectorZoom : null;
  const center = storedCenter || [
    coordinates.reduce((sum, point) => sum + point[0], 0) / coordinates.length,
    coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length
  ];
  let map;
  try {
    map = new window.maplibregl.Map({
      container: host,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center,
      zoom: storedZoom == null ? baseZoom : storedZoom,
      minZoom: TRIP_MAP_MIN_ZOOM,
      maxZoom: TRIP_MAP_MAX_ZOOM,
      attributionControl: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false
    });
  } catch (error) {
    console.warn('El dispositivo no pudo iniciar el mapa vectorial', error);
    tripVectorMapFailed = true;
    host.remove();
    window.setTimeout(renderTripMap, 0);
    return false;
  }
  tripVectorMap = map;
  installTripMapLongPress(host, pointer => {
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = pointer.clientX - rect.left;
    const y = pointer.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const point = map.unproject([x, y]);
    return { latitude: Number(point.lat), longitude: Number(point.lng) };
  });
  if (map.touchZoomRotate && typeof map.touchZoomRotate.disableRotation === 'function') {
    map.touchZoomRotate.disableRotation();
  }

  const dailyModel = dailyMode
    ? dailyMapPresentation(withCoords.map(item => item.dailyRecord).filter(Boolean))
    : null;
  const dailyRoute = dailyModel ? dailyModel.route : [];
  const dailyHasRoute = Boolean(dailyModel && dailyModel.hasRoute);
  const standardItems = withCoords.filter(item => !item.photoPoint
    && !(dailyMode && item.stackedOverLodging && item.dailyRecord && item.dailyRecord.kind === 'city'));
  const photoItems = withCoords.filter(item => item.photoPoint);
  const tripModel = dailyMode ? null : tripRoutePresentation(orderTripItemsWithRouteWaypoints([...standardItems, ...photoItems.filter(item => item.routeWaypoint)]));
  const markerGroups = dailyMode
    ? standardItems.map((item, index) => ({
      group: [{ item, index }],
      presentation: dailyModel.recordMarkers.find(marker => marker.record === item.dailyRecord) || null
    }))
    : tripModel.markerGroups.filter(markerGroup => !markerGroup.primary.item.photoPoint).map(markerGroup => ({
      group: markerGroup.entries.map(entry => ({ item: entry.item, index: entry.item.index })),
      presentation: markerGroup
    }));
  markerGroups.forEach(({ group, presentation }) => {
    const { item, index } = group[0];
    const routeGroup = !dailyMode && !item.configuredOnly ? group : [];
    const markerElement = tripVectorMarkerElement(item, index, dailyMode, dailyHasRoute, routeGroup, presentation);
    const manualPointContext = markerElement.mapPointDragContext || null;
    const cityContext = markerElement.mapCityDragContext || null;
    const marker = new window.maplibregl.Marker({
      element: markerElement,
      anchor: 'center',
      offset: item.stackedOverLodging ? [0, -30] : [0, 0],
      draggable: Boolean(manualPointContext || cityContext)
    }).setLngLat([Number(item.ciudad.lng), Number(item.ciudad.lat)]).addTo(map);
    if (manualPointContext || cityContext) {
      marker.on('dragstart', () => {
        closeTripMapPhotoPopup();
        markerElement.classList.add('dragging');
        markerElement.dataset.ignoreMapPointClick = '1';
      });
      marker.on('dragend', () => {
        markerElement.classList.remove('dragging');
        window.setTimeout(() => delete markerElement.dataset.ignoreMapPointClick, 400);
        const position = marker.getLngLat();
        const move = manualPointContext
          ? moveMapPoint(manualPointContext, position.lat, position.lng)
          : moveMapCity(cityContext, position.lat, position.lng);
        move
          .catch(error => alert(error.message || String(error)));
      });
    }
    tripVectorMarkers.push(marker);
  });
  if (dailyMode) {
    dailyModel.destinationMarkers.forEach(markerModel => {
      const labelOnLeft = Number(markerModel.record.longitude) >= Number(center[0]);
      const stackedOverLodging = markerModel.record.stackedOverLodging === true;
      const marker = new window.maplibregl.Marker({
        element: tripVectorDestinationElement(markerModel, labelOnLeft),
        anchor: 'center',
        offset: stackedOverLodging ? [0, -30] : [labelOnLeft ? -18 : 18, 0]
      }).setLngLat([Number(markerModel.record.longitude), Number(markerModel.record.latitude)]).addTo(map);
      tripVectorMarkers.push(marker);
    });
  }

  let loaded = false;
  let tileErrorCount = 0;
  let tileFallbackTimer = null;
  const startupTimer = window.setTimeout(() => {
    if (tripVectorMap !== map || loaded) return;
    tripVectorMapFailed = true;
    destroyTripVectorMap();
    renderTripMap();
  }, 15_000);
  map.on('load', () => {
    loaded = true;
    window.clearTimeout(startupTimer);
    host.querySelector('.trip-vector-loading')?.remove();
    map.resize();
    addTripMapSatellite(map);
    const routeCoordinates = dailyMode
      ? dailyRoute.map(record => [Number(record.longitude), Number(record.latitude)])
      : tripModel.routeStops.map(stop => [Number(stop.longitude), Number(stop.latitude)]);
    if (!timelinePaths.length && (dailyMode ? dailyRoute.length > 1 : shouldDrawRoute) && routeCoordinates.length > 1) {
      map.addSource('trip-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: routeCoordinates }
        }
      });
      map.addLayer({
        id: 'trip-route-line',
        type: 'line',
        source: 'trip-route',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 4,
          'line-opacity': 0.82,
          'line-dasharray': [2.5, 2]
        }
      });
    }
    const timelineCoordinates = timelinePaths
      .map(path => path.map(point => [Number(point.longitude), Number(point.latitude)]))
      .filter(path => path.length > 1);
    if (timelineCoordinates.length) {
      map.addSource('google-timeline-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'MultiLineString', coordinates: timelineCoordinates }
        }
      });
      map.addLayer({
        id: 'google-timeline-route-line',
        type: 'line',
        source: 'google-timeline-route',
        paint: {
          'line-color': '#0f766e',
          'line-width': 5,
          'line-opacity': 0.9
        }
      });
    }
    if (!storedCenter || storedZoom == null) {
      const bounds = coordinates.reduce(
        (result, point) => result.extend(point),
        new window.maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      const samePoint = bounds.getWest() === bounds.getEast() && bounds.getSouth() === bounds.getNorth();
      if (samePoint) {
        map.jumpTo({ center: coordinates[0], zoom: withCoords[0] && (withCoords[0].blogPoint || withCoords[0].photoPoint || withCoords[0].timelinePoint) ? 16 : 13 });
      } else {
        map.fitBounds(bounds, { padding: 54, maxZoom: 17, duration: 0 });
      }
    }
    renderTripVectorPhotoMarkers(map, photoItems);
    updateTripVectorZoomLabel(map, baseZoom);
  });
  map.on('zoom', () => updateTripVectorZoomLabel(map, baseZoom));
  map.on('movestart', closeTripMapPhotoPopup);
  map.on('moveend', () => {
    const currentCenter = map.getCenter();
    tripMapState.vectorCenter = [currentCenter.lng, currentCenter.lat];
    tripMapState.vectorZoom = map.getZoom();
    renderTripVectorPhotoMarkers(map, photoItems);
  });
  map.on('error', event => {
    console.warn(loaded ? 'No se pudo cargar una parte del mapa vectorial' : 'No se pudo iniciar el mapa vectorial', event && event.error || event);
    if (!loaded) return;
    if (event && event.sourceId === 'trip-satellite') return;
    tileErrorCount += 1;
    if (tileErrorCount < 4 || tileFallbackTimer) return;
    tileFallbackTimer = window.setTimeout(() => {
      if (tripVectorMap !== map) return;
      tripVectorMapFailed = true;
      destroyTripVectorMap();
      renderTripMap();
    }, 1_200);
  });
  return true;
}

function renderTripMap() {
  const container = $('#trip-map');
  const info = $('#trip-map-info');
  if (!container || !info) return;
  const {
    paisId,
    cities,
    withCoords,
    shouldDrawRoute,
    destinationOnlyAvailable,
    destinationOnlyApplied,
    pointCount,
    photoCount,
    accommodationDestinationCount,
    duplicatePhotoCount,
    availablePhotoCount,
    dailyMode,
    dailyRecords,
    dailyUsesCityFallback,
    dayOptions,
    cityMode,
    cityOptions,
    selectedCity,
    cityDayCount,
    scopedTrips,
    timelinePaths,
    timelineAdjustment,
    timelineExtentItems,
    timelineAvailable
  } = tripMapItemsForCurrentScope();
  const extentItems = [...withCoords, ...timelineExtentItems];
  const missing = cities.filter(item => !lugarHasCoords(item.ciudad));
  if (!cities.length) {
    destroyTripVectorMap();
    const emptyDayOptions = dayOptions.map(day => `<option value="${escapeHtml(day)}"${tripMapState.day === day ? ' selected' : ''}>${escapeHtml(blogDayDateLabel(day))}</option>`).join('');
    const emptyMessage = dailyMode
      ? (destinationOnlyApplied ? 'No hay destinos para el día elegido.' : 'No hay puntos ni ciudades para el día elegido.')
      : 'Sin ciudades en este viaje.';
    container.innerHTML = `<div class="trip-map-shell">
      <div class="map-controls" aria-label="Controles del mapa">
        <div class="map-controls-actions">
          <button type="button" data-map-zoom="reset" disabled>Centrar</button>
          <label class="map-day-control" title="Mostrar solamente los puntos y fotos de un día"><span>Día</span><select data-map-day="1"><option value="">Todos los días</option>${emptyDayOptions}</select></label>
          <button type="button" data-map-planned="1" title="Mostrar u ocultar ciudades planificadas">${tripMapState.showPlanned ? 'Planificadas' : 'Solo gastos'}</button>
          <button type="button" data-map-destination="1" class="${destinationOnlyApplied ? 'active' : ''}" aria-pressed="${destinationOnlyApplied}" title="${destinationOnlyApplied ? 'Volver a mostrar todas las paradas' : 'Mostrar únicamente las paradas marcadas como Destino'}"${destinationOnlyAvailable ? '' : ' disabled'}>Solo destinos</button>
          <button type="button" data-map-timeline="1" class="${timelineAvailable && tripMapState.showTimeline ? 'active' : ''}" title="Exportar previamente la Cronología de Maps y después importarla en este viaje"${scopedTrips.length === 1 ? '' : ' disabled'}>Cronología Maps</button>
          <button type="button" data-map-satellite="1" class="${tripMapState.showSatellite ? 'active' : ''}" aria-pressed="${tripMapState.showSatellite}" title="Mostrar u ocultar las imágenes de satélite" disabled>${tripMapState.showSatellite ? 'Mapa normal' : 'Satélite'}</button>
          <button type="button" data-map-add-stop="1" title="Añadir, borrar, clasificar o reordenar paradas del viaje">Añadir / modificar parada</button>
          <button type="button" data-map-geocode="1" title="Buscar coordenadas reales para las ciudades">Localizar</button>
        </div>
      </div>
      <div class="map-empty">${emptyMessage}</div>
    </div>`;
    info.textContent = dailyMode ? `Día seleccionado: ${blogDayDateLabel(tripMapState.day)}.${destinationOnlyApplied ? ' Solo se muestran paradas marcadas como Destino.' : ''}` : '';
    return;
  }
  if (!extentItems.length) {
    destroyTripVectorMap();
    container.innerHTML = '<div class="map-empty">Añade latitud y longitud a las ciudades para ver el mapa.</div>';
    info.textContent = `Faltan coordenadas: ${missing.map(item => item.ciudad.nombre).join(', ')}.`;
    return;
  }
  const duplicatePhotoText = duplicatePhotoCount
    ? ` Se ${duplicatePhotoCount === 1 ? 'ha' : 'han'} ocultado ${duplicatePhotoCount} ${duplicatePhotoCount === 1 ? 'foto duplicada' : 'fotos duplicadas'} procedentes de Gastos o Blog.`
    : '';
  const { width, height } = tripMapSize();
  const routeKey = [
    `${width}x${height}`,
    paisId || 'all',
    tripMapState.day || 'route',
    tripMapState.cityId ? `city-${tripMapState.cityId}` : 'all-cities',
    destinationOnlyApplied ? 'destination' : 'complete',
    tripMapState.showTimeline ? 'timeline-on' : 'timeline-off',
    extentItems.map(item => `${item.ciudad.id}:${item.ciudad.lat}:${item.ciudad.lng}`).join(',')
  ].join('|');
  if (tripMapState.key !== routeKey) {
    tripMapState.key = routeKey;
    if (tripMapState.preserveViewportOnNextRender) {
      tripMapState.preserveViewportOnNextRender = false;
    } else {
      tripMapState.zoomDelta = 0;
      tripMapState.panX = 0;
      tripMapState.panY = 0;
      tripMapState.vectorCenter = null;
      tripMapState.vectorZoom = null;
    }
  } else if (tripMapState.preserveViewportOnNextRender) {
    tripMapState.preserveViewportOnNextRender = false;
  }
  const baseZoom = chooseMapZoom(extentItems, width, height);
  const zoom = Math.max(TRIP_MAP_MIN_ZOOM, Math.min(TRIP_MAP_MAX_ZOOM, baseZoom + tripMapState.zoomDelta));
  const tileZoom = Math.floor(zoom);
  const tileScale = 2 ** (zoom - tileZoom);
  const worldPoints = extentItems.map(item => mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom));
  const minX = Math.min(...worldPoints.map(p => p.x));
  const maxX = Math.max(...worldPoints.map(p => p.x));
  const minY = Math.min(...worldPoints.map(p => p.y));
  const maxY = Math.max(...worldPoints.map(p => p.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const startX = centerX - width / 2 - tripMapState.panX;
  const startY = centerY - height / 2 - tripMapState.panY;
  const tileLevelHtml = (sourceZoom, sourceScale, opacity, allowFallback, eager = false) => {
    const maxTile = (2 ** sourceZoom) - 1;
    const tileMinX = Math.max(0, Math.floor((startX / sourceScale) / 256));
    const tileMaxX = Math.min(maxTile, Math.floor(((startX + width) / sourceScale) / 256));
    const tileMinY = Math.max(0, Math.floor((startY / sourceScale) / 256));
    const tileMaxY = Math.min(maxTile, Math.floor(((startY + height) / sourceScale) / 256));
    const result = [];
    for (let x = tileMinX; x <= tileMaxX; x += 1) {
      for (let y = tileMinY; y <= tileMaxY; y += 1) {
        const left = ((x * 256 * sourceScale - startX) / width) * 100;
        const top = ((y * 256 * sourceScale - startY) / height) * 100;
        const tileW = ((256 * sourceScale) / width) * 100;
        const tileH = ((256 * sourceScale) / height) * 100;
        const primary = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${sourceZoom}/${x}/${y}.png`;
        const fallback = `https://tile.openstreetmap.org/${sourceZoom}/${x}/${y}.png`;
        const errorAction = allowFallback
          ? `this.onerror=null;this.src='${fallback}'`
          : 'this.remove()';
        result.push(`<img class="map-tile" src="${primary}" onerror="${errorAction}" alt="" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" draggable="false" style="left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;width:${tileW.toFixed(3)}%;height:${tileH.toFixed(3)}%;opacity:${opacity.toFixed(3)};">`);
      }
    }
    return result;
  };
  const mapLibreSupported = Boolean(
    window.maplibregl
      && (typeof window.maplibregl.supported !== 'function' || window.maplibregl.supported())
  );
  const useVectorInteractiveMap = Boolean(mapLibreSupported && !tripVectorMapFailed && !tripMapState.printMode && state.activeTab === 'mapa');
  if (!useVectorInteractiveMap && tripVectorMap) destroyTripVectorMap();
  const zoomFraction = zoom - tileZoom;
  const overviewZoom = Math.max(TRIP_MAP_MIN_ZOOM, Math.min(tileZoom, 7));
  const overviewScale = tileScale * (2 ** (tileZoom - overviewZoom));
  const tiles = useVectorInteractiveMap ? [] : tileLevelHtml(overviewZoom, overviewScale, 1, true, true);
  if (!useVectorInteractiveMap && overviewZoom !== tileZoom) {
    tiles.push(...tileLevelHtml(tileZoom, tileScale, 1, true));
  }
  if (!useVectorInteractiveMap && zoomFraction > 0.02 && tileZoom < TRIP_MAP_MAX_ZOOM) {
    tiles.push(...tileLevelHtml(tileZoom + 1, tileScale / 2, zoomFraction, false));
  }
  const project = item => {
    const point = mapWorldPoint(item.ciudad.lat, item.ciudad.lng, zoom);
    return {
      x: point.x - startX,
      y: point.y - startY
    };
  };
  const projectedItems = withCoords.map((item, index) => ({ ...item, index, point: project(item) }));
  const standardItems = dailyMode
    ? projectedItems
      .filter(item => !(item.stackedOverLodging && item.dailyRecord && item.dailyRecord.kind === 'city'))
      .sort((a, b) => Number(b.photoPoint) - Number(a.photoPoint))
    : projectedItems.filter(item => !item.photoPoint);
  const photoItems = dailyMode ? [] : projectedItems.filter(item => item.photoPoint);
  const dailyModel = dailyMode ? dailyMapPresentation(dailyRecords) : null;
  const tripModel = dailyMode ? null : tripRoutePresentation(orderTripItemsWithRouteWaypoints([...standardItems, ...photoItems.filter(item => item.routeWaypoint)]));
  const pointGroups = dailyMode
    ? standardItems.map(item => ({
      items: [item],
      presentation: dailyModel.recordMarkers.find(marker => marker.record === item.dailyRecord) || null
    }))
    : tripModel.markerGroups.filter(markerGroup => !markerGroup.primary.item.photoPoint).map(markerGroup => ({
      items: markerGroup.entries.map(entry => entry.item),
      presentation: markerGroup
    }));
  const dailyRoute = dailyModel ? dailyModel.route : [];
  const routeItems = tripModel ? tripModel.routeStops.map(stop => stop.item) : [];
  const routePoints = dailyMode
    ? dailyRoute.map(record => project({ ciudad: { lat: record.latitude, lng: record.longitude } })).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : routeItems.map(item => item.point).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const timelineRoutePoints = timelinePaths.map(path => path
    .map(point => project({ ciudad: { lat: point.latitude, lng: point.longitude } }))
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' '));
  tripMapMarkerDetailLookup.clear();
  const markers = pointGroups.map(({ items: group, presentation }, markerIndex) => {
    const item = group[0];
    const p = item.point;
    const markerY = p.y - (item.stackedOverLodging ? 22 : 0);
    const labelX = p.x + 12 > width - 120 ? p.x - 12 : p.x + 12;
    const anchor = p.x + 12 > width - 120 ? 'end' : 'start';
    const routeStops = group.filter(stop => !stop.configuredOnly);
    const pointStops = group.filter(stop => stop.blogPoint);
    const dailyRecord = dailyMode ? item.dailyRecord : null;
    const dailyPhoto = Boolean(dailyRecord && dailyRecord.kind === 'photo');
    const accommodationPhoto = dailyRecord && dailyRecord.accommodationPhotoRecord;
    const transportMarker = dailyRecord && dailyRecord.kind === 'point'
      ? tripMapTransportMarker(dailyRecord)
      : (pointStops.length ? tripMapTransportMarker(pointStops[0]) : null);
    const markerText = item.timelinePoint
      ? 'A'
      : dailyRecord
      ? (dailyRecord.kind === 'point' ? '•' : '+')
      : routeStops.length
      ? (presentation && presentation.numberText || routeStops.map(stop => stop.index + 1).join('-'))
      : (pointStops.length ? '•' : '+');
    const cityNames = [...new Set(group.map(stop => stop.ciudad.nombre))];
    const markerLabelLines = presentation && presentation.labelLines
      ? presentation.labelLines
      : [cityNames.join(' / ')];
    const visibleMarkerLabelLines = transportMarker ? [] : markerLabelLines.slice(0, 1);
    const markerLabelText = visibleMarkerLabelLines.map((line, lineIndex) => `<tspan x="${labelX.toFixed(1)}" dy="${lineIndex ? 13 : 0}">${escapeHtml(line)}</tspan>`).join('');
    const markerLabelY = item.stackedUnderCity
      ? p.y + 25
      : markerY - 12 - (visibleMarkerLabelLines.length - 1) * 6.5;
    const markerLabel = visibleMarkerLabelLines.length
      ? `<text x="${labelX.toFixed(1)}" y="${markerLabelY.toFixed(1)}" text-anchor="${anchor}">${markerLabelText}</text>`
      : '';
    const markerDetail = tripMapMarkerDetail(group, dailyRecord);
    const title = `${markerDetail.title} · pulsa para ver los detalles`;
    const markerPhotoRecord = dailyPhoto ? dailyRecord : accommodationPhoto;
    const photoKeys = markerPhotoRecord ? encodeURIComponent(markerPhotoRecord.key) : '';
    const photoAction = markerPhotoRecord
      ? ` role="button" tabindex="0" data-map-photo-keys="${photoKeys}" aria-label="Abrir ${escapeHtml(markerPhotoRecord.descripcion || 'foto')}"`
      : '';
    const detailKey = markerPhotoRecord ? '' : `marker-${markerIndex}`;
    if (detailKey) tripMapMarkerDetailLookup.set(detailKey, markerDetail);
    const detailAction = detailKey
      ? ` role="button" tabindex="0" data-map-marker-detail="${detailKey}" aria-label="${escapeHtml(`${transportMarker ? `${transportMarker.label}: ` : ''}${markerDetail.title}. Ver detalles`)}"`
      : '';
    const pointDragAction = markerDetail.pointEdit && detailKey
      ? ` data-map-point-drag="${detailKey}"`
      : '';
    const cityDragAction = markerDetail.cityEdit && detailKey
      ? ` data-map-city-drag="${detailKey}"`
      : '';
    const markerVisual = transportMarker
      ? (transportMarker.image
        ? `<image href="${escapeHtml(transportMarker.image)}" x="${(p.x - 15).toFixed(1)}" y="${(markerY - 10).toFixed(1)}" width="30" height="20" class="map-marker-transport-image" preserveAspectRatio="xMidYMid meet"></image>`
        : `<text x="${p.x.toFixed(1)}" y="${(markerY + 6).toFixed(1)}" class="map-marker-transport-symbol">${transportMarker.icon}</text>`)
      : `<circle cx="${p.x.toFixed(1)}" cy="${markerY.toFixed(1)}" r="${dailyPhoto ? 10 : 8}"></circle><text x="${p.x.toFixed(1)}" y="${(markerY + 4).toFixed(1)}" class="map-marker-number">${markerText}</text>`;
    return `<g class="map-marker${dailyRecord ? ' map-marker-daily' : ''}${dailyPhoto ? ' map-marker-photo' : ''}${item.timelinePoint ? ' map-marker-timeline' : ''}${transportMarker ? ` map-marker-transport ${transportMarker.type}` : ''}${markerPhotoRecord || detailKey ? ' map-marker-clickable' : ''}${item.configuredOnly ? ' map-marker-config' : ''}${pointStops.length ? ' map-marker-point' : ''}"${photoAction || detailAction}${pointDragAction}${cityDragAction}>${markerVisual}${markerLabel}<title>${escapeHtml(title)}</title></g>`;
  }).join('');
  tripMapPhotoLookup.clear();
  const interactivePhotoItems = dailyMode ? projectedItems.filter(item => item.photoPoint) : photoItems;
  interactivePhotoItems.forEach(item => tripMapPhotoLookup.set(item.photoRecord.key, item.photoRecord));
  if (dailyMode) {
    dailyRecords
      .map(record => record.accommodationPhotoRecord)
      .filter(Boolean)
      .forEach(record => tripMapPhotoLookup.set(record.key, record));
  }
  const photoMarkers = groupNearbyPhotoMapItems(photoItems).map(group => {
    const x = group.reduce((sum, item) => sum + item.point.x, 0) / group.length;
    const y = group.reduce((sum, item) => sum + item.point.y, 0) / group.length;
    const records = group.map(item => item.photoRecord);
    const keys = encodeURIComponent(records.map(record => record.key).join('|'));
    const title = records.map(record => `${record.descripcion || 'Foto'} · ${summaryDocumentDate(record.fecha, true)} ${record.hora || ''}`.trim()).join('\n');
    const badge = records.length > 1
      ? `<circle class="map-marker-photo-badge" cx="${(x + 9).toFixed(1)}" cy="${(y - 9).toFixed(1)}" r="7"></circle><text class="map-marker-photo-count" x="${(x + 9).toFixed(1)}" y="${(y - 6.5).toFixed(1)}">${records.length}</text>`
      : '';
    const photoDragAction = records.length === 1 ? ` data-map-photo-drag="${escapeHtml(records[0].key)}"` : '';
    const editingClass = records.length === 1 && records[0].key === tripMapState.photoEditKey ? ' editing-position' : '';
    return `<g class="map-marker map-marker-photo${records.length === 1 ? ' photo-position-draggable' : ''}${editingClass}" role="button" tabindex="0" data-map-photo-keys="${keys}"${photoDragAction} aria-label="${escapeHtml(records.length === 1 ? records[0].descripcion || 'Foto' : `${records.length} fotos`)}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9"></circle><text class="map-marker-photo-plus" x="${x.toFixed(1)}" y="${(y + 4.4).toFixed(1)}">+</text>${badge}<title>${escapeHtml(title)}</title></g>`;
  }).join('');
  const destinationMarkers = dailyMode ? dailyModel.destinationMarkers.map(markerModel => {
    const p = project({ ciudad: { lat: markerModel.record.latitude, lng: markerModel.record.longitude } });
    const stackedOverLodging = markerModel.record.stackedOverLodging === true;
    const labelOnLeft = p.x >= width / 2;
    const x = stackedOverLodging ? p.x : p.x + (labelOnLeft ? -18 : 18);
    const y = p.y - (stackedOverLodging ? 22 : 0);
    const cityName = markerModel.labelLines[0] || dailyMapCityName(markerModel.record);
    const labelX = x + (labelOnLeft ? -12 : 12);
    return `<g class="map-destination-number"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8"></circle><text class="number" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}">${escapeHtml(markerModel.numberText)}</text><text class="map-destination-label" x="${labelX.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${labelOnLeft ? 'end' : 'start'}">${escapeHtml(cityName)}</text><title>Destino ${escapeHtml(markerModel.numberText)} · ${escapeHtml(cityName)}</title></g>`;
  }).join('') : '';
  const roundedZoom = Math.round(zoom * 10) / 10;
  const roundedDelta = Math.round(tripMapState.zoomDelta * 10) / 10;
  const zoomLabel = Math.abs(roundedDelta) < 0.05 ? 'auto' : `${roundedDelta > 0 ? '+' : ''}${roundedDelta}`;
  const dayOptionsHtml = dayOptions.map(day => `<option value="${escapeHtml(day)}"${tripMapState.day === day ? ' selected' : ''}>${escapeHtml(blogDayDateLabel(day))}</option>`).join('');
  const cityOptionsHtml = cityOptions.map(city => `<option value="${Number(city.id)}"${Number(tripMapState.cityId) === Number(city.id) ? ' selected' : ''}>${escapeHtml(city.nombre)}</option>`).join('');
  const fullscreen = isTripMapFullscreen();
  const canCopyDailyMap = dailyMode && scopedTrips.length === 1 && (dailyRecords.length > 0 || timelinePaths.length > 0);
  const canCopyTripOverview = !dailyMode && !cityMode && scopedTrips.length === 1 && tripCityIds(scopedTrips[0]).length > 0;
  const canCopyMapToBlog = canCopyDailyMap || canCopyTripOverview;
  const copyMapTitle = dailyMode
    ? 'Guardar el mapa al principio del día en el Blog'
    : 'Crear o actualizar la primera página del Blog con el mapa completo del viaje';
  container.innerHTML = `<div class="trip-map-shell">
    <div class="map-controls" aria-label="Controles del mapa">
      <div class="map-controls-actions">
        <button type="button" data-map-zoom="reset" title="Volver al encuadre automático">Centrar</button>
        <label class="map-day-control" title="Mostrar solamente los puntos y fotos de un día"><span>Día</span><select data-map-day="1"><option value="">Todos los días</option>${dayOptionsHtml}</select></label>
        <label class="map-city-control" title="Mostrar los puntos y fotos de una ciudad durante todo el viaje"><span>Ciudad</span><select data-map-city="1"><option value="">Todas las ciudades</option>${cityOptionsHtml}</select></label>
        <button type="button" data-map-copy-blog="1" class="${canCopyMapToBlog ? 'active' : ''}" title="${copyMapTitle}"${canCopyMapToBlog ? '' : ' disabled'}>Copiar al Blog</button>
        <button type="button" data-map-planned="1" title="Mostrar u ocultar ciudades planificadas">${tripMapState.showPlanned ? 'Planificadas' : 'Solo gastos'}</button>
        <button type="button" data-map-photos="1" class="${tripMapState.showPhotos ? 'active' : ''}" aria-pressed="${tripMapState.showPhotos}" title="Mostrar u ocultar fotos geolocalizadas"${availablePhotoCount ? '' : ' disabled'}>Fotos${availablePhotoCount ? ` (${availablePhotoCount})` : ''}</button>
        <button type="button" data-map-destination="1" class="${destinationOnlyApplied ? 'active' : ''}" aria-pressed="${destinationOnlyApplied}" title="${destinationOnlyApplied ? 'Volver a mostrar todas las paradas' : (destinationOnlyAvailable ? 'Mostrar únicamente las paradas marcadas como Destino' : 'Marca alguna parada como Destino en el editor de ruta')}"${destinationOnlyAvailable ? '' : ' disabled'}>Solo destinos</button>
        <button type="button" data-map-timeline="1" class="${timelineAvailable && tripMapState.showTimeline ? 'active' : ''}" aria-pressed="${timelineAvailable && tripMapState.showTimeline}" title="Exportar previamente la Cronología de Maps y después importarla en este viaje"${scopedTrips.length === 1 ? '' : ' disabled'}>Cronología Maps</button>
        <button type="button" data-map-satellite="1" class="${tripMapState.showSatellite ? 'active' : ''}" aria-pressed="${tripMapState.showSatellite}" title="${useVectorInteractiveMap ? 'Mostrar u ocultar las imágenes de satélite' : 'La vista de satélite requiere el mapa interactivo'}"${useVectorInteractiveMap ? '' : ' disabled'}>${tripMapState.showSatellite ? 'Mapa normal' : 'Satélite'}</button>
        <button type="button" data-map-add-stop="1" title="Añadir, borrar o reordenar paradas del viaje">Añadir / modificar parada</button>
        <button type="button" data-map-geocode="1" title="Buscar coordenadas reales para las ciudades">Localizar</button>
        <button type="button" data-map-fullscreen="1" class="${fullscreen ? 'active' : ''}" title="${fullscreen ? 'Volver al tamaño normal' : 'Ampliar el mapa a toda la pantalla'}">${fullscreen ? 'Tamaño normal' : 'Pantalla completa'}</button>
      </div>
      <div class="map-controls-zoom">
        <button type="button" data-map-zoom="out" title="Reducir mapa">-</button>
        <span>Z ${roundedZoom} ${zoomLabel}</span>
        <button type="button" data-map-zoom="in" title="Ampliar mapa">+</button>
      </div>
    </div>
    <div class="trip-map-frame" data-map-pan="1" style="aspect-ratio:${width} / ${height}">
      <div class="map-tiles" aria-hidden="true">${tiles.join('')}</div>
      <svg class="trip-map-overlay" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mapa del viaje">
        ${!timelinePaths.length && (dailyMode ? dailyRoute.length > 1 : shouldDrawRoute && routeItems.length > 1) && routePoints ? `<polyline points="${routePoints}" class="map-route"></polyline>` : ''}
        ${timelineRoutePoints.map(points => `<polyline points="${points}" class="map-timeline-route"></polyline>`).join('')}
        ${markers}
        ${photoMarkers}
        ${destinationMarkers}
      </svg>
      <div id="trip-map-photo-popup" class="map-photo-popup" hidden></div>
      <div class="map-attribution">© OpenStreetMap · © CARTO</div>
    </div>
  </div>`;
  if (useVectorInteractiveMap) {
    initializeTripVectorMap({
      container,
      withCoords,
      extentItems,
      dailyMode,
      shouldDrawRoute,
      baseZoom,
      timelinePaths
    });
  } else {
    const frame = container.querySelector('.trip-map-frame');
    installTripMapLongPress(frame, pointer => {
      if (!frame) return null;
      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = ((pointer.clientX - rect.left) / rect.width) * width;
      const y = ((pointer.clientY - rect.top) / rect.height) * height;
      if (x < 0 || y < 0 || x > width || y > height) return null;
      return mapLatLngFromWorldPoint(startX + x, startY + y, zoom);
    });
    installFallbackManualPointDrag(frame, { startX, startY, zoom, width, height });
  }
  container.querySelectorAll('[data-map-photo-keys]').forEach(marker => {
    const open = event => {
      event.preventDefault();
      event.stopPropagation();
      if (marker.dataset.ignoreMapPointClick === '1') return;
      openTripMapPhotoPopup(marker.getAttribute('data-map-photo-keys'), marker);
    };
    marker.addEventListener('click', open);
    marker.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
  });
  container.querySelectorAll('[data-map-marker-detail]').forEach(marker => {
    const detail = tripMapMarkerDetailLookup.get(marker.getAttribute('data-map-marker-detail'));
    const open = event => {
      event.preventDefault();
      event.stopPropagation();
      if (marker.dataset.ignoreMapPointClick === '1') return;
      openTripMapMarkerPopup(detail, marker);
    };
    marker.addEventListener('click', open);
    marker.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
    if (detail && (detail.lodgingEdit || detail.pointEdit)) {
      marker.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
        openTripMapMarkerNameEditor(detail);
      });
    }
  });
  if (dailyMode) {
    const fallbackText = dailyUsesCityFallback ? ' Los datos sin GPS exacto se muestran agrupados en su ciudad.' : '';
    const accommodationText = accommodationDestinationCount ? ' El alojamiento geolocalizado se usa como destino de la ciudad.' : '';
    const routeText = timelinePaths.length
      ? `${timelineAdjustment === 'adjusted'
        ? 'con recorrido ajustado a carreteras y caminos'
        : timelineAdjustment === 'partial'
          ? 'con recorrido parcialmente ajustado'
          : 'con recorrido estimado de Cronología de Maps'} (${timelinePaths.reduce((sum, path) => sum + path.length, 0)} puntos)`
      : (dailyRoute.length > 1 ? 'con línea entre las ciudades' : 'sin líneas');
    info.textContent = `${dailyRecords.length} ${dailyRecords.length === 1 ? 'punto marcado' : 'puntos marcados'} el ${blogDayDateLabel(tripMapState.day)}, ${routeText}. La ciudad aparece junto a cada punto.${accommodationText}${fallbackText}${duplicatePhotoText}`;
    return;
  }
  if (cityMode) {
    const dayText = cityDayCount === 1 ? '1 día' : `${cityDayCount} días`;
    const pointText = pointCount === 1 ? '1 punto' : `${pointCount} puntos`;
    const photoText = photoCount === 1 ? '1 foto' : `${photoCount} fotos`;
    info.textContent = `${selectedCity ? selectedCity.nombre : 'Ciudad'}: ${pointText} y ${photoText} de ${dayText}, sin líneas. Las fechas reúnen todo el periodo pasado en la ciudad.${duplicatePhotoText}`;
    return;
  }
  const missingText = missing.length ? ` Faltan coordenadas: ${missing.map(item => item.ciudad.nombre).join(', ')}.` : '';
  const route = withCoords.filter(item => !item.configuredOnly).map(item => item.ciudad.nombre).join(' → ');
  const configuredStops = withCoords.filter(item => item.configuredOnly && !item.blogPoint && !item.photoPoint && !item.timelinePoint).map(item => item.ciudad.nombre);
  const configuredText = configuredStops.length ? ` Paradas configuradas sin gasto: ${configuredStops.join(', ')}.` : '';
  const cityCount = withCoords.filter(item => !item.blogPoint && !item.photoPoint && !item.timelinePoint).length;
  const visiblePointCount = withCoords.filter(item => item.blogPoint).length;
  const pointText = visiblePointCount ? ` ${visiblePointCount} ${visiblePointCount === 1 ? 'punto geolocalizado' : 'puntos geolocalizados'}.` : '';
  const photoText = photoCount ? ` ${photoCount} ${photoCount === 1 ? 'foto geolocalizada' : 'fotos geolocalizadas'}.` : '';
  const accommodationText = accommodationDestinationCount ? ` ${accommodationDestinationCount} ${accommodationDestinationCount === 1 ? 'destino usa' : 'destinos usan'} la ubicación GPS del alojamiento.` : '';
  const routeLabel = timelinePaths.length
    ? 'La ruta calculada por la aplicación está oculta mientras se muestra la Cronología de Maps.'
    : shouldDrawRoute
    ? `Ruta: ${route || 'sin gastos con ciudad'}.`
    : `Ciudades: ${route || 'sin gastos con ciudad'}.`;
  const destinationText = destinationOnlyApplied ? ' Modo solo destinos: se muestran únicamente las paradas marcadas como Destino.' : '';
  const timelineText = timelinePaths.length ? ` Cronología de Maps: ${timelinePaths.length} ${timelinePaths.length === 1 ? 'día' : 'días'} con recorrido ${timelineAdjustment === 'adjusted' ? 'ajustado' : timelineAdjustment === 'partial' ? 'parcialmente ajustado' : 'estimado'}.` : '';
  info.textContent = `${cityCount} ciudades en el mapa.${pointText}${photoText}${accommodationText} ${routeLabel}${timelineText}${destinationText}${configuredText}${missingText}${duplicatePhotoText}`;
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
  if (frame) {
    frame.classList.remove('dragging');
    frame.querySelectorAll('.map-tiles, .trip-map-overlay').forEach(el => {
      el.style.transform = '';
      el.style.transformOrigin = '';
    });
    frame.querySelectorAll('.trip-map-overlay .map-marker').forEach(marker => {
      marker.style.transform = '';
      marker.style.transformOrigin = '';
      marker.style.transformBox = '';
    });
  }
  tripMapGesture.frame = null;
  tripMapGesture.pinch = false;
  tripMapGesture.startDistance = 0;
  tripMapGesture.scale = 1;
  tripMapGesture.centerX = 0;
  tripMapGesture.centerY = 0;
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

function setMapPinchTransform(frame, scale, clientX, clientY) {
  if (!frame) return;
  const rect = frame.getBoundingClientRect();
  const originX = clientX - rect.left;
  const originY = clientY - rect.top;
  const transformedLayers = frame.querySelectorAll('.map-tiles, .trip-map-overlay');
  transformedLayers.forEach(el => {
    el.style.transformOrigin = `${originX}px ${originY}px`;
    el.style.transform = `scale(${scale})`;
  });
  const inverseScale = 1 / scale;
  frame.querySelectorAll('.trip-map-overlay .map-marker').forEach(marker => {
    const anchor = marker.querySelector('circle');
    const centerX = Number(anchor && anchor.getAttribute('cx'));
    const centerY = Number(anchor && anchor.getAttribute('cy'));
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return;
    marker.style.transformBox = 'view-box';
    marker.style.transformOrigin = `${centerX}px ${centerY}px`;
    marker.style.transform = `scale(${inverseScale})`;
  });
}

function startTripMapDrag(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('.maplibregl-map')) return;
  if (target.closest('.map-controls, .map-photo-popup')) return;
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
    tripMapGesture.startDistance = mapGestureDistance(points);
    tripMapGesture.scale = 1;
    const center = mapGestureCenter(points);
    tripMapGesture.centerX = center.x;
    tripMapGesture.centerY = center.y;
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
    if (distance && tripMapGesture.startDistance) {
      const scale = Math.max(0.45, Math.min(3.5, distance / tripMapGesture.startDistance));
      tripMapGesture.scale = scale;
      tripMapGesture.centerX = center.x;
      tripMapGesture.centerY = center.y;
      setMapPinchTransform(frame, scale, center.x, center.y);
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
    if (tripMapGesture.pointers.size < 2) {
      const frame = tripMapGesture.frame;
      const scale = tripMapGesture.scale;
      const centerX = tripMapGesture.centerX;
      const centerY = tripMapGesture.centerY;
      const delta = Math.abs(scale - 1) > 0.015 ? Math.log2(scale) : 0;
      clearMapGestureFrame(frame);
      if (delta) zoomTripMapAtClient(frame, centerX, centerY, delta);
    }
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

function summaryDocumentDate(value, dateOnly = false) {
  if (!value) return '-';
  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-ES');
}

function renderSummaryDocuments() {
  const tripBody = $('#tabla-documentos-viaje tbody');
  const expenseBody = $('#tabla-documentos-gastos tbody');
  if (!tripBody || !expenseBody) return;
  const selectedIds = selectedTripSet();
  const includedTripIds = selectedIds.size
    ? selectedIds
    : new Set(state.viajes.map(viaje => Number(viaje.id)));
  const showTripName = includedTripIds.size !== 1;
  const emptyRow = message => `<tr><td colspan="3" class="small">${message}</td></tr>`;
  const descriptionCell = (description, viajeId) => {
    const trip = showTripName ? tripName(viajeId) : '';
    return `<span class="summary-document-description">${escapeHtml(description || 'Documento')}</span>${trip ? `<span class="summary-document-trip">${escapeHtml(trip)}</span>` : ''}`;
  };

  const tripDocuments = state.viajeDocumentos
    .filter(document => document.fileData && includedTripIds.has(Number(document.viajeId)))
    .sort((a, b) => (a.createdAt || a.updatedAt || '').localeCompare(b.createdAt || b.updatedAt || ''));
  tripBody.innerHTML = tripDocuments.length
    ? tripDocuments.map(document => `<tr>
      <td>${summaryDocumentDate(document.createdAt || document.updatedAt)}</td>
      <td>${descriptionCell(document.descripcion || document.fileName || 'Documento', document.viajeId)}</td>
      <td><button type="button" class="ghost summary-document-link" data-open-trip-document="${document.id}">Abrir archivo</button></td>
    </tr>`).join('')
    : emptyRow('No hay documentos de viaje para la selección actual.');

  const expenseDocuments = state.gastos
    .filter(gasto => includedTripIds.has(Number(gasto.viajeId)))
    .flatMap(gasto => [
      ...(gasto.ticketData ? [{ gasto, kind: 'ticket', name: gasto.ticketName || 'Ticket' }] : []),
      ...expenseExtraImages(gasto).map((image, index) => ({ gasto, kind: 'image', image, index, name: image.name || `Imagen ${index + 1}` }))
    ])
    .sort((a, b) => compareExpensesChronologically(a.gasto, b.gasto));
  expenseBody.innerHTML = expenseDocuments.length
    ? expenseDocuments.map(item => `<tr>
      <td>${summaryDocumentDate(item.gasto.fecha || item.gasto.createdAt, Boolean(item.gasto.fecha))}</td>
      <td>${descriptionCell(`${item.gasto.desc || 'Gasto'} · ${item.name}`, item.gasto.viajeId)}</td>
      <td>${item.kind === 'ticket'
        ? `<button type="button" class="ghost summary-document-link" data-open-ticket="${item.gasto.id}">Abrir archivo</button>`
        : `<button type="button" class="ghost summary-document-link" data-open-expense-image="${item.gasto.id}" data-expense-image-index="${item.index}">Abrir archivo</button>`}</td>
    </tr>`).join('')
    : emptyRow('No hay tickets ni imágenes de gastos para la selección actual.');
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
  const isOverTripBudget = Boolean(tripBudget && totalEur > tripBudget.budgetEur + 0.005);
  $('#kpi-total').classList.toggle('over-budget-value', isOverTripBudget);
  let budgetPct = '-';
  let remainingLines = [];
  if (tripBudget) {
    budgetPct = `${Math.min(100, tripBudget.pct).toFixed(0)}%`;
    remainingLines = [{ currency: 'EUR', amount: tripBudget.remainingEur, always: true }];
  }
  $('#kpi-presu').innerHTML = tripBudget
    ? `<div>${budgetPct}</div><div class="kpi-note">Restante</div>${formatCurrencyLines(remainingLines)}`
    : '<div>-</div><div class="kpi-note">Sin presupuesto de viaje</div>';

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
    `<tr class="subtotal-row summary-total-row${isOverTripBudget ? ' over-budget-row' : ''}"><td>${escapeHtml(firstLabel)}</td><td>${escapeHtml(secondLabel)}</td><td>${fmtCurrency(totalEur, 'EUR')}</td><td>${totalEur ? '100.0%' : '0.0%'}</td></tr>`;
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
  const breakdownMode = $('#r-desglose') ? $('#r-desglose').value : 'categorias';
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
    drawPieChart($('#chart-cat'), pieRows.map(row => ({ label: row.sub === '(sin subcat)' ? row.cat : `${row.cat} · ${row.sub}`, value: row.total })));
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

  const usedAccountIds = new Set(gastos.map(g => Number(g.cuentaId)).filter(Boolean));
  const selectedAccountTripIds = selectedTripSet();
  const availableAccountIds = new Set([
    ...usedAccountIds,
    ...state.cuentas
      .filter(c => c.viajeId && (!selectedAccountTripIds.size || selectedAccountTripIds.has(Number(c.viajeId))))
      .map(c => Number(c.id))
  ]);
  const accounts = cta
    ? state.cuentas.filter(c => c.id === Number(cta))
    : state.cuentas.filter(c => availableAccountIds.has(Number(c.id)));
  let accountRows = accounts.map(c => {
    const spentAccountCurrency = gastos
      .filter(g => g.cuentaId === c.id)
      .reduce((sum, g) => sum + fromEur(toEur(g.importe, g.moneda), c.moneda), 0);
    const spentEur = gastos.filter(g => g.cuentaId === c.id).reduce((sum, g) => sum + toEur(g.importe, g.moneda), 0);
    return {
      label: accountLabel(c),
      chartLabel: c.nombre,
      moneda: c.moneda,
      total: spentAccountCurrency,
      totalEur: spentEur,
      saldo: numberValue(c.saldoActual),
      saldoEur: toEur(c.saldoActual, c.moneda)
    };
  }).sort((a, b) => b.totalEur - a.totalEur);
  drawBarChart($('#chart-cuenta'), accountRows.map(row => ({ label: row.chartLabel, value: row.totalEur })));
  const accountBalanceEur = accountRows.reduce((sum, row) => sum + numberValue(row.saldoEur), 0);
  const accountHtml = accountRows.map(row => {
    const expensePct = percentageOfTotal(row.totalEur, totalEur);
    const balancePct = percentageOfTotal(row.saldoEur, accountBalanceEur);
    return `<tr><td data-label="Cuenta"><span class="account-label-full">${escapeHtml(row.label)}</span><span class="account-label-mobile">${escapeHtml(row.chartLabel)}</span></td><td data-label="Moneda">${escapeHtml(row.moneda)}</td><td data-label="Gastado">${fmtCurrency(row.total, row.moneda)}</td><td data-label="% gastos">${expensePct.toFixed(1)}%</td><td data-label="Saldo">${fmtCurrency(row.saldo, row.moneda)}</td><td data-label="% saldo">${balancePct.toFixed(1)}%</td><td data-label="EUR">${row.moneda === 'EUR' ? '' : fmtCurrency(row.totalEur, 'EUR')}</td></tr>`;
  });
  accountHtml.push(`<tr class="subtotal-row${isOverTripBudget ? ' over-budget-row' : ''}"><td data-label="Cuenta"><span class="account-label-full">Total cuentas</span><span class="account-label-mobile">Total</span></td><td data-label="Moneda">EUR</td><td data-label="Gastado">${fmtCurrency(totalEur, 'EUR')}</td><td data-label="% gastos">${totalEur ? '100%' : '0%'}</td><td data-label="Saldo">${fmtCurrency(accountBalanceEur, 'EUR')}</td><td data-label="% saldo">${accountBalanceEur ? '100%' : '0%'}</td><td data-label="EUR"></td></tr>`);
  $('#tabla-cuenta tbody').innerHTML = accountHtml.join('');
  if (state.activeTab === 'mapa' || tripMapState.printMode) renderTripMap();
  renderTripComparison();
  renderSummaryDocuments();
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
    cuentas: state.cuentas.map(accountForBackup),
    categorias: state.categorias,
    photoTypes: state.photoTypes,
    ticketOcrLanguages: state.ticketOcrLanguages,
    lugares: state.lugares,
    gastos: state.gastos,
    viajes: state.viajes,
    viajeDocumentos: state.viajeDocumentos,
    blogEntries: state.blogEntries,
    timelineDays: state.timelineDays,
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
  const viajeDocumentos = state.viajeDocumentos.filter(document => Number(document.viajeId) === id);
  const blogEntries = state.blogEntries.filter(entry => Number(entry.viajeId) === id);
  const timelineDays = state.timelineDays.filter(record => Number(record.viajeId) === id);
  const usedAccountIds = new Set(gastos.map(g => Number(g.cuentaId)).filter(Boolean));
  const cuentas = state.cuentas
    .filter(c => Number(c.viajeId) === id || usedAccountIds.has(Number(c.id)))
    .map(accountForBackup);
  const accountIds = new Set(cuentas.map(c => Number(c.id)));
  const transferencias = state.transferencias.filter(t => accountIds.has(Number(t.fromId)) || accountIds.has(Number(t.toId)));
  return {
    version: APP_VERSION,
    generatedAt: new Date().toISOString(),
    dataUpdatedAt: ensureLocalDataUpdatedAt(),
    backupScope: 'trip',
    cuentas,
    categorias: state.categorias,
    photoTypes: state.photoTypes,
    ticketOcrLanguages: state.ticketOcrLanguages,
    lugares: state.lugares,
    gastos,
    viajes: [trip],
    viajeDocumentos,
    blogEntries,
    timelineDays,
    monedas: state.monedas,
    transferencias
  };
}

async function importAll(data) {
  if (!data || !Array.isArray(data.cuentas) || !Array.isArray(data.categorias) || !Array.isArray(data.gastos)) {
    throw new Error('Archivo no válido');
  }
  await clearStores(['cuentas', 'categorias', 'lugares', 'gastos', 'viajes', 'tripDocuments', 'blogEntries', 'timelineDays', 'monedas', 'transferencias']);
  await putRecord('appSettings', {
    key: PHOTO_TYPES_SETTING_KEY,
    items: normalizePhotoTypes(Array.isArray(data.photoTypes) ? data.photoTypes : DEFAULT_PHOTO_TYPES),
    updatedAt: new Date().toISOString()
  });
  await putRecord('appSettings', {
    key: TICKET_OCR_LANGUAGES_SETTING_KEY,
    codes: normalizeTicketOcrLanguages(data.ticketOcrLanguages || ['spa']),
    updatedAt: new Date().toISOString()
  });
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
      routeStops: tripRouteStops(v),
      lodgingLocations: tripLodgingLocations(v),
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
      accountType: normalizeAccountType(c.accountType),
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
  for (const document of data.viajeDocumentos || []) {
    const obj = {
      ...document,
      viajeId: Number(document.viajeId),
      descripcion: String(document.descripcion || '').trim() || document.fileName || 'Documento',
      fileName: document.fileName || 'documento',
      fileType: document.fileType || 'application/octet-stream',
      fileSize: Math.max(0, Number(document.fileSize) || 0),
      createdAt: document.createdAt || new Date().toISOString(),
      updatedAt: document.updatedAt || new Date().toISOString()
    };
    if (document.id == null) delete obj.id;
    await addRecord('tripDocuments', obj);
  }
  for (const entry of data.blogEntries || []) {
    const obj = normalizeImportedBlogEntry(entry);
    if (entry.id == null) delete obj.id;
    await addRecord('blogEntries', obj);
  }
  for (const record of data.timelineDays || []) {
    const tripId = Number(record.viajeId);
    const fecha = String(record.fecha || '');
    if (!tripId || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    await putRecord('timelineDays', {
      ...record,
      id: `${tripId}:${fecha}`,
      viajeId: tripId,
      fecha
    });
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
  if (Array.isArray(data.photoTypes) && data.photoTypes.length) {
    const mergedTypes = [...state.photoTypes];
    data.photoTypes.forEach(type => {
      if (!mergedTypes.some(existing => existing.id === type.id)) mergedTypes.push(type);
    });
    await savePhotoTypes(mergedTypes);
  }

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
  for (const document of state.viajeDocumentos.filter(item => Number(item.viajeId) === targetId)) {
    await deleteRecord('tripDocuments', Number(document.id));
  }
  for (const entry of state.blogEntries.filter(item => Number(item.viajeId) === targetId)) {
    await deleteRecord('blogEntries', Number(entry.id));
  }
  for (const record of state.timelineDays.filter(item => Number(item.viajeId) === targetId)) {
    await deleteRecord('timelineDays', record.id);
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
  if (Array.isArray(sourceTrip.lodgingLocations)) tripPatch.lodgingLocations = tripLodgingLocations(sourceTrip);
  if (Array.isArray(sourceTrip.ciudadIds) || Array.isArray(sourceTrip.routeStops)) {
    tripPatch.ciudadIds = tripCityIds(sourceTrip);
    tripPatch.routeStops = tripRouteStops(sourceTrip);
  }
  await updateViaje(targetId, tripPatch);
  const accountMap = {};
  for (const c of (data.cuentas || []).filter(c => Number(c.viajeId) === sourceTripId)) {
    const obj = {
      nombre: c.nombre,
      moneda: c.moneda || 'EUR',
      viajeId: targetId,
      saldoInicial: numberValue(c.saldoInicial),
      saldoActual: numberValue(c.saldoActual ?? c.saldoInicial),
      accountType: normalizeAccountType(c.accountType),
      nota: c.nota || '',
      createdAt: c.createdAt || now,
      updatedAt: now
    };
    accountMap[Number(c.id)] = await addRecord('cuentas', obj);
  }
  const expenseMap = {};
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
    const newExpenseId = await addRecord('gastos', obj);
    if (g.id != null) expenseMap[Number(g.id)] = Number(newExpenseId);
  }
  for (const document of data.viajeDocumentos || []) {
    const obj = {
      ...document,
      id: undefined,
      viajeId: targetId,
      descripcion: String(document.descripcion || '').trim() || document.fileName || 'Documento',
      fileName: document.fileName || 'documento',
      fileType: document.fileType || 'application/octet-stream',
      fileSize: Math.max(0, Number(document.fileSize) || 0),
      createdAt: document.createdAt || now,
      updatedAt: now
    };
    delete obj.id;
    await addRecord('tripDocuments', obj);
  }
  for (const entry of data.blogEntries || []) {
    const obj = normalizeImportedBlogEntry({ ...entry, id: undefined, viajeId: targetId });
    if (obj.sourceGastoId) obj.sourceGastoId = expenseMap[Number(obj.sourceGastoId)] || null;
    delete obj.id;
    await addRecord('blogEntries', obj);
  }
  for (const record of data.timelineDays || []) {
    const fecha = String(record.fecha || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    await putRecord('timelineDays', {
      ...record,
      id: `${targetId}:${fecha}`,
      viajeId: targetId,
      fecha,
      importedAt: record.importedAt || now
    });
  }
}

function selectedBlogTrip() {
  const ids = selectedTripIds();
  if (ids.length !== 1) return null;
  return state.viajes.find(v => Number(v.id) === Number(ids[0])) || null;
}

function syncBlogAvailability() {
  const button = $('#tab-blog');
  const trip = selectedBlogTrip();
  if (button) {
    button.disabled = !trip;
    button.title = trip ? `Blog de ${trip.nombre}` : 'Selecciona exactamente un viaje para abrir el Blog';
  }
  if ($('#btn-blog-add')) $('#btn-blog-add').disabled = !trip;
  if ($('#btn-blog-add-bottom')) $('#btn-blog-add-bottom').disabled = !trip;
  if ($('#btn-blog-pdf')) $('#btn-blog-pdf').disabled = !trip;
  if ($('#btn-blog-day-pdf-bottom')) $('#btn-blog-day-pdf-bottom').disabled = !trip;
  if ($('#btn-blog-wordpress')) $('#btn-blog-wordpress').disabled = !trip;
}

function blogTypeLabel(type) {
  return ({ gasto: 'Gasto', imagen: 'Imagen y Texto', texto: 'Solo Texto', punto: 'Punto' })[type] || type || '-';
}

function blogPlaceName(id) {
  return id ? (state.lugares.find(item => Number(item.id) === Number(id)) || {}).nombre || '-' : '-';
}

function blogEntryCityName(entry) {
  return entry && entry.enTransito === true ? 'En tránsito' : blogPlaceName(entry && entry.ciudadId);
}

function blogEntriesForTrip(tripId) {
  return state.blogEntries
    .filter(entry => Number(entry.viajeId) === Number(tripId))
    .slice()
    .sort(compareBlogEntries);
}

function blogDayDateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return String(value || 'Sin fecha');
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function blogDayHeading(date, entries = []) {
  const cities = [...new Set(entries.map(blogEntryCityName).filter(name => name && name !== '-'))];
  const countries = [...new Set(entries.map(entry => blogPlaceName(entry.paisId)).filter(name => name && name !== '-'))];
  const places = cities.length ? cities : countries;
  return `Día ${blogDayDateLabel(date)}${places.length ? ` — ${places.join(' / ')}` : ''}`;
}

function groupBlogEntriesByDay(entries) {
  const groups = new Map();
  for (const entry of entries || []) {
    const date = entry.fecha || '';
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(entry);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayEntries]) => ({ date, entries: dayEntries.slice().sort(compareBlogEntries) }));
}

function resetBlogFilterControls() {
  ['#blog-filter-date', '#blog-filter-country', '#blog-filter-city'].forEach(selector => {
    const field = $(selector);
    if (field) field.value = '';
  });
}

function openEditViajeDialog(v) {
  if (!v) return;
  openFormDialog({
    title: 'Editar viaje',
    helpTarget: 'crear-viaje',
    fields: [
      { name: 'nombre', label: 'Nombre', value: v.nombre },
      { name: 'fechaInicio', label: 'Fecha de inicio', type: 'date', value: v.fechaInicio },
      { name: 'fechaFin', label: 'Fecha final', type: 'date', value: v.fechaFin },
      { name: 'paisIds', label: 'Países creados', type: 'multiselect', value: tripCountryIds(v), options: state.lugares.filter(l => !l.parentId).map(l => ({ value: String(l.id), label: l.nombre })) },
      { name: 'ciudadIds', label: 'Ciudades planificadas', type: 'multiselect', size: 6, value: tripCityIds(v), options: plannedCityOptionsForCountries(tripCountryIds(v), tripCityIds(v)), reorder: true, routeList: true, routeTripId: v.id },
      { name: 'presupuesto', label: 'Presupuesto del viaje (EUR)', type: 'number', step: '0.01', min: '0', value: v.presupuesto || 0 }
    ],
    onSubmit: async values => {
      if (values.fechaFin < values.fechaInicio) throw new Error('La fecha final no puede ser anterior al inicio');
      if (!(values.paisIds || []).length) throw new Error('Selecciona al menos un país');
      const cityIds = values.ciudadIds || [];
      const updated = await updateViaje(v.id, {
        nombre: values.nombre.trim() || v.nombre,
        fechaInicio: values.fechaInicio,
        fechaFin: values.fechaFin,
        paisIds: values.paisIds || [],
        ciudadIds: cityIds,
        routeStops: mergeTripRouteStops({ ...v, fechaInicio: values.fechaInicio, fechaFin: values.fechaFin }, cityIds),
        presupuesto: numberValue(values.presupuesto)
      });
      warmTicketOcrLanguages([...automaticTicketOcrLanguagesForCountryIds(values.paisIds), ...state.ticketOcrLanguages]).catch(() => {});
      return updated;
    }
  });
}

async function handleTripConfigAction(id, action) {
  const trip = state.viajes.find(item => item.id === Number(id));
  if (!trip) return;
  if (action === 'review') {
    openTripReviewDialog(trip.id);
  } else if (action === 'documents') {
    openTripDocumentsDialog(trip.id);
  } else if (action === 'edit') {
    openEditViajeDialog(trip);
  } else if (action === 'delete' && confirm('Eliminar este viaje? Los gastos se conservarán sin viaje.')) {
    await delViaje(trip.id);
    await loadAll();
  }
}

function syncBlogFilterOptions(trip, entries) {
  const tripId = trip ? Number(trip.id) : null;
  if (blogFilterTripId !== tripId) {
    resetBlogFilterControls();
    blogFilterTripId = tripId;
  }
  const dateField = $('#blog-filter-date');
  const countryField = $('#blog-filter-country');
  const cityField = $('#blog-filter-city');
  if (!trip) {
    fillSelect('#blog-filter-date', [], '(todos los días)');
    fillSelect('#blog-filter-country', [], '(todos los países)');
    fillSelect('#blog-filter-city', [], '(todas las ciudades)');
    [dateField, countryField, cityField].forEach(field => {
      if (field) field.disabled = true;
    });
    return;
  }
  const dates = [...new Set(entries.map(entry => entry.fecha).filter(Boolean))]
    .sort()
    .map(value => ({ value, label: blogDayHeading(value, entries.filter(entry => entry.fecha === value)) }));
  const countryIds = [...new Set(entries.map(entry => Number(entry.paisId)).filter(Boolean))];
  const countries = countryIds
    .map(id => ({ value: String(id), label: blogPlaceName(id) }))
    .sort((a, b) => collator.compare(a.label, b.label));
  fillSelect('#blog-filter-date', dates, '(todos los días)');
  fillSelect('#blog-filter-country', countries, '(todos los países)');
  const selectedCountry = Number(countryField ? countryField.value : 0);
  const countryEntries = entries.filter(entry => !selectedCountry || Number(entry.paisId) === selectedCountry);
  const cityIds = [...new Set(countryEntries
    .map(entry => Number(entry.ciudadId))
    .filter(Boolean))];
  const cities = cityIds
    .map(id => ({ value: String(id), label: blogPlaceName(id) }))
    .sort((a, b) => collator.compare(a.label, b.label));
  if (countryEntries.some(entry => entry.enTransito === true)) {
    cities.unshift({ value: BLOG_TRANSIT_CITY_VALUE, label: 'En tránsito' });
  }
  fillSelect('#blog-filter-city', cities, '(todas las ciudades)');
  [dateField, countryField, cityField].forEach(field => {
    if (field) field.disabled = !entries.length;
  });
}

function filteredBlogEntries(entries) {
  const date = $('#blog-filter-date') ? $('#blog-filter-date').value : '';
  const countryId = Number($('#blog-filter-country') ? $('#blog-filter-country').value : 0);
  const cityValue = $('#blog-filter-city') ? $('#blog-filter-city').value : '';
  const cityId = Number(cityValue);
  return entries.filter(entry =>
    (!date || entry.fecha === date) &&
    (!countryId || Number(entry.paisId) === countryId) &&
    (!cityValue || (cityValue === BLOG_TRANSIT_CITY_VALUE ? entry.enTransito === true : Number(entry.ciudadId) === cityId))
  );
}

function syncOpenBlogDays(trip, entries) {
  const dates = [...new Set(entries.map(entry => entry.fecha || ''))].sort();
  const scope = `${trip ? trip.id : ''}|${dates.join(',')}`;
  if (openBlogDaysScope !== scope) {
    openBlogDaysScope = scope;
    openBlogDays = new Set(dates.length ? [dates[dates.length - 1]] : []);
  }
  const filteredDate = $('#blog-filter-date') ? $('#blog-filter-date').value : '';
  if (filteredDate) openBlogDays.add(filteredDate);
}

function currentOpenBlogDay(entries) {
  const availableDates = new Set((entries || []).map(entry => entry.fecha || '').filter(Boolean));
  const filteredDate = $('#blog-filter-date') ? $('#blog-filter-date').value : '';
  if (filteredDate && availableDates.has(filteredDate)) return filteredDate;
  const openDates = [...openBlogDays].filter(date => availableDates.has(date));
  return openDates.length ? openDates[openDates.length - 1] : '';
}

function syncBlogDayPdfButton(trip, entries) {
  const button = $('#btn-blog-day-pdf-bottom');
  if (!button) return;
  const day = trip ? currentOpenBlogDay(entries) : '';
  button.disabled = !trip || !day;
  button.dataset.blogPdfDay = day;
  button.title = day
    ? `Crear el PDF completo del ${blogDayDateLabel(day)}`
    : 'Despliega un día del Blog para crear su PDF';
}

function openCurrentBlogDayPdfGuide() {
  const trip = selectedBlogTrip();
  const entries = trip ? filteredBlogEntries(blogEntriesForTrip(trip.id)) : [];
  const day = currentOpenBlogDay(entries);
  if (!day) {
    alert('Despliega un día del Blog para crear su PDF.');
    return;
  }
  openBlogPdfGuide(day);
}

function blogEntryShareText(entry) {
  const place = [blogPlaceName(entry.paisId), blogEntryCityName(entry)].filter(value => value && value !== '-').join(' · ');
  const lines = [
    entry.descripcion || blogTypeLabel(entry.tipo),
    [summaryDocumentDate(entry.fecha, true), entry.hora || '', place].filter(Boolean).join(' · ')
  ];
  if (['texto', 'imagen'].includes(entry.tipo) && entry.texto) lines.push(String(entry.texto).trim());
  if (entry.tipo === 'punto' && entry.notas) lines.push(String(entry.notas).trim());
  if (entry.tipo === 'gasto') lines.push(fmtCurrency(entry.gastoImporte, entry.gastoMoneda || 'EUR'));
  const pointUrl = blogPointMapUrl(entry);
  if (pointUrl) lines.push(pointUrl);
  return lines.filter(Boolean).join('\n');
}

function blogShareWrappedLines(context, value, maxWidth) {
  const lines = [];
  String(value || '').split(/\r?\n/).forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap(word => {
      if (context.measureText(word).width <= maxWidth) return [word];
      const parts = [];
      let part = '';
      for (const character of [...word]) {
        const candidate = `${part}${character}`;
        if (part && context.measureText(candidate).width > maxWidth) {
          parts.push(part);
          part = character;
        } else {
          part = candidate;
        }
      }
      if (part) parts.push(part);
      return parts;
    });
    if (!words.length) {
      lines.push('');
      return;
    }
    let line = '';
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
}

function loadBlogShareImage(record) {
  return new Promise(resolve => {
    if (!record || !record.data) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = record.data;
  });
}

function canvasJpegBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo preparar la imagen para compartir'));
    }, 'image/jpeg', 0.9);
  });
}

async function createBlogEntryShareCanvas(entry) {
  const width = 1080;
  const margin = 64;
  const contentWidth = width - (margin * 2);
  const gap = 24;
  const imageRecords = blogEntryImages(entry).filter(image => image.data);
  const loadedImages = (await Promise.all(imageRecords.map(loadBlogShareImage))).filter(Boolean);
  const measuringCanvas = document.createElement('canvas');
  const context = measuringCanvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite preparar la tarjeta para compartir');

  const heading = blogDayHeading(entry.fecha, [entry]);
  const place = [blogPlaceName(entry.paisId), blogEntryCityName(entry)].filter(value => value && value !== '-').join(' · ');
  const typeDetail = entry.tipo === 'gasto'
    ? `${blogTypeLabel(entry.tipo)} · ${fmtCurrency(entry.gastoImporte, entry.gastoMoneda || 'EUR')}`
    : blogTypeLabel(entry.tipo);
  const metadata = [
    [summaryDocumentDate(entry.fecha, true), entry.hora || ''].filter(Boolean).join(' · '),
    place,
    typeDetail
  ].filter(Boolean).join('     ');
  const description = entry.descripcion || blogTypeLabel(entry.tipo);
  const bodyText = ['texto', 'imagen'].includes(entry.tipo) ? entry.texto : entry.tipo === 'punto' ? entry.notas : '';

  context.font = '700 48px Arial, sans-serif';
  const headingLines = blogShareWrappedLines(context, heading, contentWidth);
  context.font = '400 25px Arial, sans-serif';
  const metadataLines = blogShareWrappedLines(context, metadata, contentWidth);
  context.font = '600 36px Arial, sans-serif';
  const descriptionLines = blogShareWrappedLines(context, description, contentWidth);
  context.font = '400 29px Arial, sans-serif';
  const bodyLines = bodyText ? blogShareWrappedLines(context, bodyText, contentWidth) : [];

  const columnCount = loadedImages.length > 1 ? 2 : 1;
  const columnWidth = columnCount === 2 ? (contentWidth - gap) / 2 : Math.min(contentWidth, 760);
  const maximumImageHeight = loadedImages.length > 12 ? 340 : loadedImages.length > 1 ? 520 : 900;
  const imageLayouts = loadedImages.map(image => {
    const scale = Math.min(columnWidth / image.naturalWidth, maximumImageHeight / image.naturalHeight);
    return { image, width: Math.round(image.naturalWidth * scale), height: Math.round(image.naturalHeight * scale) };
  });
  const imageRows = [];
  for (let index = 0; index < imageLayouts.length; index += columnCount) {
    const row = imageLayouts.slice(index, index + columnCount);
    imageRows.push({ images: row, height: Math.max(...row.map(item => item.height)) });
  }

  const headingHeight = headingLines.length * 58;
  const metadataHeight = metadataLines.length * 34;
  const descriptionHeight = descriptionLines.length * 44;
  const bodyHeight = bodyLines.length ? bodyLines.length * 40 + 16 : 0;
  const imagesHeight = imageRows.length
    ? imageRows.reduce((total, row) => total + row.height, 0) + gap * (imageRows.length - 1) + 34
    : 0;
  const height = Math.max(720, margin + headingHeight + 18 + metadataHeight + 38 + descriptionHeight + bodyHeight + imagesHeight + 92);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.ceil(height);
  const draw = canvas.getContext('2d');
  if (!draw) throw new Error('El navegador no permite preparar la tarjeta para compartir');
  draw.fillStyle = '#fff';
  draw.fillRect(0, 0, canvas.width, canvas.height);

  let y = margin;
  const drawLines = (lines, lineHeight) => {
    lines.forEach(line => {
      y += lineHeight;
      if (line) draw.fillText(line, margin, y);
    });
  };
  draw.fillStyle = '#1f2937';
  draw.font = '700 48px Arial, sans-serif';
  drawLines(headingLines, 58);
  y += 18;
  draw.fillStyle = '#64748b';
  draw.font = '400 25px Arial, sans-serif';
  drawLines(metadataLines, 34);
  y += 38;
  draw.fillStyle = '#1f2937';
  draw.font = '600 36px Arial, sans-serif';
  drawLines(descriptionLines, 44);
  if (bodyLines.length) {
    y += 16;
    draw.font = '400 29px Arial, sans-serif';
    drawLines(bodyLines, 40);
  }
  if (imageRows.length) {
    y += 34;
    imageRows.forEach((row, rowIndex) => {
      row.images.forEach((item, columnIndex) => {
        const columnX = columnCount === 1 ? margin + (contentWidth - item.width) / 2 : margin + columnIndex * (columnWidth + gap);
        const imageY = y + (row.height - item.height) / 2;
        draw.drawImage(item.image, columnX, imageY, item.width, item.height);
      });
      y += row.height;
      if (rowIndex < imageRows.length - 1) y += gap;
    });
  }
  draw.strokeStyle = '#dbe3ef';
  draw.lineWidth = 2;
  draw.beginPath();
  draw.moveTo(margin, canvas.height - 66);
  draw.lineTo(width - margin, canvas.height - 66);
  draw.stroke();
  draw.fillStyle = '#64748b';
  draw.font = '600 22px Arial, sans-serif';
  draw.fillText('Cuaderno de Bitácora', margin, canvas.height - 28);

  return canvas;
}

function blogSharePdfSliceHeight(canvas, sourceY, maximumHeight) {
  if (sourceY + maximumHeight >= canvas.height) return canvas.height - sourceY;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return maximumHeight;
  const minimumHeight = Math.max(Math.floor(maximumHeight * 0.75), maximumHeight - 360);
  let blankRows = 0;
  try {
    for (let height = maximumHeight; height >= minimumHeight; height -= 2) {
      const pixels = context.getImageData(0, sourceY + height - 1, canvas.width, 1).data;
      let blank = true;
      for (let offset = 0; offset < pixels.length; offset += 32) {
        if (pixels[offset] < 246 || pixels[offset + 1] < 246 || pixels[offset + 2] < 246) {
          blank = false;
          break;
        }
      }
      blankRows = blank ? blankRows + 1 : 0;
      if (blankRows >= 4) return Math.max(1, height);
    }
  } catch (error) {
    console.warn('No se pudo ajustar el salto de página del PDF', error);
  }
  return maximumHeight;
}

async function blogShareCanvasPdfBlob(canvas) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;
  const drawWidth = pageWidth - (margin * 2);
  const pointsPerPixel = drawWidth / canvas.width;
  const pixelsPerPage = Math.max(1, Math.floor((pageHeight - (margin * 2)) / pointsPerPixel));
  const pageImages = [];
  let sourceY = 0;
  while (sourceY < canvas.height) {
    const maximumHeight = Math.min(pixelsPerPage, canvas.height - sourceY);
    const sourceHeight = blogSharePdfSliceHeight(canvas, sourceY, maximumHeight);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeight;
    const pageContext = pageCanvas.getContext('2d');
    if (!pageContext) throw new Error('El navegador no permite preparar las páginas del PDF');
    pageContext.fillStyle = '#fff';
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    const jpeg = await canvasJpegBlob(pageCanvas);
    pageImages.push({
      bytes: new Uint8Array(await jpeg.arrayBuffer()),
      width: pageCanvas.width,
      height: pageCanvas.height,
      drawHeight: sourceHeight * pointsPerPixel
    });
    sourceY += sourceHeight;
  }

  blogSharePdfModulePromise ||= import('./share-pdf.js?v=700v278');
  const pdfBuilder = await blogSharePdfModulePromise;
  return pdfBuilder.buildImagePdfBlob(pageImages, { pageWidth, pageHeight, margin });
}

async function createBlogEntrySharePdf(entry) {
  const canvas = await createBlogEntryShareCanvas(entry);
  const blob = await blogShareCanvasPdfBlob(canvas);
  const description = entry.descripcion || blogTypeLabel(entry.tipo);
  const fileName = `entrada-blog-${entry.fecha || currentLocalDate()}-${slugFilePart(description)}.pdf`;
  return new File([blob], fileName, { type: 'application/pdf' });
}

function downloadBlogEntrySharePdf(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareBlogEntry(entry) {
  if (!entry) return;
  const title = entry.descripcion || 'Entrada del Blog';
  const text = blogEntryShareText(entry);
  let sharePdf = null;
  try {
    sharePdf = await createBlogEntrySharePdf(entry);
  } catch (error) {
    console.warn('No se pudo crear el PDF de la entrada del Blog', error);
  }
  const canSharePdf = sharePdf && navigator.share && (!navigator.canShare || navigator.canShare({ files: [sharePdf] }));
  if (canSharePdf) {
    try {
      await navigator.share({ files: [sharePdf] });
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      console.warn('No se pudo compartir el PDF de la entrada del Blog', error);
    }
  }
  if (sharePdf) {
    downloadBlogEntrySharePdf(sharePdf);
    alert('La entrada se ha descargado como PDF para que puedas compartirla desde Descargas.');
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      console.warn('No se pudo compartir el texto de la entrada del Blog', error);
    }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    alert('La entrada se ha copiado al portapapeles.');
    return;
  }
  window.prompt('Copia la entrada para compartirla:', text);
}

async function handleBlogAction(id, action) {
  const entry = state.blogEntries.find(item => Number(item.id) === Number(id));
  if (!entry) return;
  if (action === 'share') {
    await shareBlogEntry(entry);
  } else if (action === 'map') {
    const url = blogPointMapUrl(entry);
    if (url) window.open(url, '_blank', 'noopener');
  } else if (action === 'edit') {
    openBlogEntryDialog(entry);
  } else if (action === 'delete' && confirm('¿Eliminar esta entrada del blog?')) {
    await delBlogEntry(entry.id);
    await loadAll();
  }
}

function renderBlog() {
  const tbody = $('#tabla-blog tbody');
  if (!tbody) return;
  if ($('#btn-blog-last')) $('#btn-blog-last').disabled = true;
  const trip = selectedBlogTrip();
  syncBlogAvailability();
  if ($('#blog-title')) $('#blog-title').textContent = trip ? `Blog · ${trip.nombre}` : 'Blog';
  if (!trip) {
    syncBlogFilterOptions(null, []);
    syncBlogDayPdfButton(null, []);
    if ($('#blog-status')) $('#blog-status').textContent = 'Selecciona exactamente un viaje para consultar su blog.';
    tbody.innerHTML = '<tr><td colspan="8" class="blog-empty">El Blog solo está disponible con un único viaje seleccionado.</td></tr>';
    return;
  }
  const entries = blogEntriesForTrip(trip.id);
  syncBlogFilterOptions(trip, entries);
  syncOpenBlogDays(trip, entries);
  const filteredEntries = filteredBlogEntries(entries);
  syncBlogDayPdfButton(trip, filteredEntries);
  if ($('#btn-blog-last')) $('#btn-blog-last').disabled = !filteredEntries.length;
  if ($('#blog-status')) {
    $('#blog-status').textContent = filteredEntries.length === entries.length
      ? `${entries.length} ${entries.length === 1 ? 'entrada' : 'entradas'} en este viaje.`
      : `${filteredEntries.length} de ${entries.length} entradas coinciden con los filtros.`;
  }
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="blog-empty">Todavía no hay entradas en este blog.</td></tr>';
    return;
  }
  if (!filteredEntries.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="blog-empty">No hay entradas que coincidan con estos filtros.</td></tr>';
    return;
  }
  tbody.innerHTML = groupBlogEntriesByDay(filteredEntries).map(group => {
    const isOpen = openBlogDays.has(group.date);
    return `
    <tr class="blog-day-row"><th colspan="8"><button type="button" class="blog-day-toggle" data-blog-day-toggle="${escapeHtml(group.date)}" aria-expanded="${isOpen}"><span>${isOpen ? '−' : '+'}</span>${escapeHtml(blogDayHeading(group.date, group.entries))}</button></th></tr>
    ${group.entries.map(entry => {
      const imageCount = blogEntryImages(entry).length;
      const imageNote = imageCount
        ? `<span class="blog-entry-note">${imageCount} ${imageCount === 1 ? 'imagen adjunta' : 'imágenes adjuntas'}</span>`
        : '';
      const point = blogPointCoordinates(entry);
      const pointNote = point ? `<span class="blog-entry-note">${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}</span>` : '';
      const routeNote = entry.enRuta ? '<span class="blog-entry-note blog-entry-route-note">En ruta</span>' : '';
      const notes = entry.tipo === 'punto' && String(entry.notas || '').trim();
      const pointOption = point ? '<option value="map">Mapa</option>' : '';
      return `<tr class="blog-day-entry" data-blog-day-entry="${escapeHtml(group.date)}" data-blog-entry-id="${entry.id}"${isOpen ? '' : ' hidden'}>
      <td>${escapeHtml(entry.hora || '-')}</td>
      <td>${escapeHtml(blogEntryCityName(entry))}</td>
      <td>${escapeHtml(entry.descripcion || '')}${notes ? `<span class="blog-entry-note blog-entry-point-notes">${escapeHtml(notes)}</span>` : ''}</td>
      <td>${escapeHtml(blogTypeLabel(entry.tipo))}${imageNote}${entry.featuredImage ? '<span class="blog-entry-note">Destacada</span>' : ''}${routeNote}${pointNote}</td>
      <td>${escapeHtml(blogPlaceName(entry.paisId))}</td>
      <td>${entry.tipo === 'gasto' ? fmtCurrency(entry.gastoImporte, entry.gastoMoneda || 'EUR') : '-'}</td>
      <td>${entry.wordpressIncluded !== false ? '<span class="badge">Sí</span>' : 'No'}</td>
      <td class="blog-entry-actions"><select class="blog-action-select" data-blog-action="${entry.id}" aria-label="Acciones de ${escapeHtml(entry.descripcion || 'la entrada')}"><option value="">Acciones</option><option value="share">Compartir como PDF</option>${pointOption}<option value="edit">Editar</option><option value="delete">Eliminar</option></select></td>
    </tr>`;
    }).join('')}
  `;
  }).join('');
}

function blogCountryOptions(trip) {
  const ids = new Set(trip ? tripCountryIds(trip).map(Number) : []);
  return state.lugares
    .filter(item => !item.parentId && (!ids.size || ids.has(Number(item.id))))
    .map(item => ({ value: String(item.id), label: item.nombre }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

function renderBlogCountries(selected = '') {
  const trip = selectedBlogTrip();
  fillSelect('#blog-pais', blogCountryOptions(trip), '(sin país)');
  if ($('#blog-pais')) $('#blog-pais').value = selected ? String(selected) : '';
  renderBlogCities();
}

function renderBlogCities(selected = '') {
  const countryId = Number($('#blog-pais') ? $('#blog-pais').value : 0);
  const trip = selectedBlogTrip();
  const allowed = new Set(trip ? tripCityIds(trip).map(Number) : []);
  const options = state.lugares
    .filter(item => item.parentId && (!countryId || Number(item.parentId) === countryId))
    .filter(item => !allowed.size || allowed.has(Number(item.id)) || Number(item.id) === Number(selected))
    .map(item => ({ value: String(item.id), label: item.nombre }))
    .sort((a, b) => collator.compare(a.label, b.label));
  options.unshift({ value: BLOG_TRANSIT_CITY_VALUE, label: 'En tránsito' });
  fillSelect('#blog-ciudad', options, '(sin ciudad)');
  if ($('#blog-ciudad')) $('#blog-ciudad').value = selected ? String(selected) : '';
}

function blogPointFieldCoordinates() {
  return blogPointCoordinates({
    latitude: $('#blog-point-lat') ? $('#blog-point-lat').value : null,
    longitude: $('#blog-point-lng') ? $('#blog-point-lng').value : null
  });
}

function blogPointPickerAvailable() {
  return activeBlogEntryType === 'punto'
    || (blogManualRouteLocationOpen && ['texto', 'imagen'].includes(activeBlogEntryType));
}

function syncBlogPointFieldsVisibility() {
  const visible = blogPointPickerAvailable();
  const pointMode = activeBlogEntryType === 'punto';
  if ($('#blog-point-fields')) $('#blog-point-fields').hidden = !visible;
  if ($('#blog-point-notes-option')) $('#blog-point-notes-option').hidden = !pointMode;
  if ($('#blog-point-current')) $('#blog-point-current').hidden = !pointMode;
  if ($('#blog-point-search')) $('#blog-point-search').hidden = !pointMode;
  if ($('#blog-point-zoom-in')) $('#blog-point-zoom-in').hidden = !pointMode;
  if ($('#blog-point-zoom-out')) $('#blog-point-zoom-out').hidden = !pointMode;
  if ($('#blog-point-map')) $('#blog-point-map').hidden = !pointMode;
  if (pointMode) renderBlogPointPicker();
}

function blogPointDefaultCenter() {
  const city = state.lugares.find(item => Number(item.id) === Number($('#blog-ciudad') ? $('#blog-ciudad').value : 0));
  if (city && lugarHasCoords(city)) return { latitude: Number(city.lat), longitude: Number(city.lng), zoom: 15 };
  const country = state.lugares.find(item => Number(item.id) === Number($('#blog-pais') ? $('#blog-pais').value : 0));
  if (country && lugarHasCoords(country)) return { latitude: Number(country.lat), longitude: Number(country.lng), zoom: 8 };
  return { latitude: 40.4168, longitude: -3.7038, zoom: 5 };
}

function renderBlogPointPicker() {
  const container = $('#blog-point-map');
  if (!container || activeBlogEntryType !== 'punto') return;
  const width = 640;
  const height = 360;
  const zoom = Math.max(3, Math.min(19, Number(blogPointPickerState.zoom) || 15));
  const layer = mapTileLayer(blogPointPickerState.centerLat, blogPointPickerState.centerLng, zoom, width, height);
  const selected = blogPointFieldCoordinates();
  let marker = '';
  if (selected) {
    const point = mapWorldPoint(selected.latitude, selected.longitude, zoom);
    const left = ((point.x - layer.startX) / width) * 100;
    const top = ((point.y - layer.startY) / height) * 100;
    marker = `<span class="blog-point-picker-marker" style="left:${left.toFixed(3)}%;top:${top.toFixed(3)}%"></span>`;
  }
  container.innerHTML = `<div class="blog-point-map-frame" data-blog-point-map="1" data-map-start-x="${layer.startX}" data-map-start-y="${layer.startY}" data-map-zoom="${zoom}" data-map-width="${width}" data-map-height="${height}"><div class="map-tiles" aria-hidden="true">${layer.html}</div>${marker}<div class="map-attribution">© OpenStreetMap · © CARTO</div></div>`;
}

function scrollBlogPointMapIntoView() {
  window.requestAnimationFrame(() => {
    const map = $('#blog-point-map');
    if (map && map.scrollIntoView) map.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function blogPointGesturePoints() {
  return [...blogPointMapGesture.pointers.values()];
}

function clearBlogPointMapTransform(frame) {
  if (!frame) return;
  frame.classList.remove('dragging');
  frame.querySelectorAll('.map-tiles, .blog-point-picker-marker').forEach(element => {
    element.style.transform = '';
    element.style.transformOrigin = '';
    element.style.translate = '';
    element.style.scale = '';
  });
}

function setBlogPointMapTransform(frame, transform, origin = '') {
  if (!frame) return;
  frame.querySelectorAll('.map-tiles, .blog-point-picker-marker').forEach(element => {
    if (element.classList.contains('blog-point-picker-marker')) {
      if (transform.startsWith('translate(')) {
        element.style.translate = `${blogPointMapGesture.lastDx}px ${blogPointMapGesture.lastDy}px`;
      } else if (transform.startsWith('scale(')) {
        element.style.scale = String(blogPointMapGesture.scale);
      }
      return;
    }
    element.style.transformOrigin = origin;
    element.style.transform = transform;
  });
}

function zoomBlogPointMapAtClient(frame, clientX, clientY, delta = 1) {
  if (!frame || !delta) return false;
  const oldZoom = Math.max(3, Math.min(19, Number(blogPointPickerState.zoom) || 15));
  const zoomSteps = Math.max(-3, Math.min(3, Math.round(delta)));
  if (!zoomSteps) return false;
  const newZoom = Math.max(3, Math.min(19, oldZoom + zoomSteps));
  if (newZoom === oldZoom) return false;
  const rect = frame.getBoundingClientRect();
  const width = Number(frame.dataset.mapWidth || 640);
  const height = Number(frame.dataset.mapHeight || 360);
  const x = Math.max(0, Math.min(width, ((clientX - rect.left) / rect.width) * width));
  const y = Math.max(0, Math.min(height, ((clientY - rect.top) / rect.height) * height));
  const oldCenter = mapWorldPoint(blogPointPickerState.centerLat, blogPointPickerState.centerLng, oldZoom);
  const factor = 2 ** (newZoom - oldZoom);
  const anchoredX = (oldCenter.x - width / 2 + x) * factor;
  const anchoredY = (oldCenter.y - height / 2 + y) * factor;
  const center = mapLatLngFromWorldPoint(anchoredX - x + width / 2, anchoredY - y + height / 2, newZoom);
  blogPointPickerState.centerLat = Math.max(-85.05112878, Math.min(85.05112878, center.latitude));
  blogPointPickerState.centerLng = Math.max(-180, Math.min(180, center.longitude));
  blogPointPickerState.zoom = newZoom;
  renderBlogPointPicker();
  return true;
}

function startBlogPointMapGesture(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const frame = target.closest('[data-blog-point-map]');
  if (!frame) return;
  try {
    frame.setPointerCapture(event.pointerId);
  } catch {
    // Algunos navegadores móviles no permiten capturar todos los gestos.
  }
  blogPointMapGesture.frame = frame;
  blogPointMapGesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const points = blogPointGesturePoints();
  if (points.length >= 2) {
    blogPointMapGesture.dragging = false;
    blogPointMapGesture.pinching = true;
    blogPointMapGesture.startDistance = mapGestureDistance(points);
    blogPointMapGesture.scale = 1;
    const center = mapGestureCenter(points);
    blogPointMapGesture.centerX = center.x;
    blogPointMapGesture.centerY = center.y;
  } else {
    blogPointMapGesture.dragging = true;
    blogPointMapGesture.pinching = false;
    blogPointMapGesture.startX = event.clientX;
    blogPointMapGesture.startY = event.clientY;
    blogPointMapGesture.lastDx = 0;
    blogPointMapGesture.lastDy = 0;
  }
  frame.classList.add('dragging');
}

function moveBlogPointMapGesture(event) {
  if (!blogPointMapGesture.pointers.has(event.pointerId)) return;
  blogPointMapGesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (blogPointMapGesture.pinching && blogPointMapGesture.pointers.size >= 2) {
    const points = blogPointGesturePoints();
    const distance = mapGestureDistance(points);
    const center = mapGestureCenter(points);
    if (distance && blogPointMapGesture.startDistance) {
      blogPointMapGesture.scale = Math.max(0.45, Math.min(3.5, distance / blogPointMapGesture.startDistance));
      blogPointMapGesture.centerX = center.x;
      blogPointMapGesture.centerY = center.y;
      const frame = blogPointMapGesture.frame;
      const rect = frame.getBoundingClientRect();
      setBlogPointMapTransform(
        frame,
        `scale(${blogPointMapGesture.scale})`,
        `${center.x - rect.left}px ${center.y - rect.top}px`
      );
    }
    event.preventDefault();
    return;
  }
  if (!blogPointMapGesture.dragging) return;
  blogPointMapGesture.lastDx = event.clientX - blogPointMapGesture.startX;
  blogPointMapGesture.lastDy = event.clientY - blogPointMapGesture.startY;
  setBlogPointMapTransform(
    blogPointMapGesture.frame,
    `translate(${blogPointMapGesture.lastDx}px, ${blogPointMapGesture.lastDy}px)`
  );
  event.preventDefault();
}

function endBlogPointMapGesture(event) {
  if (!blogPointMapGesture.pointers.has(event.pointerId)) return;
  blogPointMapGesture.pointers.delete(event.pointerId);
  const frame = blogPointMapGesture.frame;
  if (blogPointMapGesture.pinching) {
    if (blogPointMapGesture.pointers.size < 2) {
      const scale = blogPointMapGesture.scale;
      const centerX = blogPointMapGesture.centerX;
      const centerY = blogPointMapGesture.centerY;
      clearBlogPointMapTransform(frame);
      blogPointMapGesture.pointers.clear();
      blogPointMapGesture.pinching = false;
      blogPointMapGesture.dragging = false;
      blogPointMapGesture.frame = null;
      blogPointMapGesture.ignoreClickUntil = Date.now() + 400;
      const delta = Math.abs(scale - 1) > 0.12 ? Math.log2(scale) : 0;
      if (delta) zoomBlogPointMapAtClient(frame, centerX, centerY, delta);
    }
    return;
  }
  if (!blogPointMapGesture.dragging) return;
  const dx = blogPointMapGesture.lastDx;
  const dy = blogPointMapGesture.lastDy;
  const moved = Math.abs(dx) > 4 || Math.abs(dy) > 4;
  clearBlogPointMapTransform(frame);
  if (moved && frame) {
    const rect = frame.getBoundingClientRect();
    const width = Number(frame.dataset.mapWidth || 640);
    const height = Number(frame.dataset.mapHeight || 360);
    const center = mapWorldPoint(blogPointPickerState.centerLat, blogPointPickerState.centerLng, blogPointPickerState.zoom);
    const next = mapLatLngFromWorldPoint(
      center.x - dx * (width / rect.width),
      center.y - dy * (height / rect.height),
      blogPointPickerState.zoom
    );
    blogPointPickerState.centerLat = Math.max(-85.05112878, Math.min(85.05112878, next.latitude));
    blogPointPickerState.centerLng = Math.max(-180, Math.min(180, next.longitude));
    blogPointMapGesture.ignoreClickUntil = Date.now() + 400;
    renderBlogPointPicker();
  }
  blogPointMapGesture.pointers.clear();
  blogPointMapGesture.dragging = false;
  blogPointMapGesture.frame = null;
  blogPointMapGesture.lastDx = 0;
  blogPointMapGesture.lastDy = 0;
}

function zoomBlogPointMapWithWheel(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const frame = target.closest('[data-blog-point-map]');
  if (!frame) return;
  event.preventDefault();
  zoomBlogPointMapAtClient(frame, event.clientX, event.clientY, event.deltaY < 0 ? 1 : -1);
}

function setBlogPointCoordinates(latitude, longitude, message = '') {
  const point = blogPointCoordinates({ latitude, longitude });
  if (!point) throw new Error('Las coordenadas no son válidas');
  $('#blog-point-lat').value = point.latitude.toFixed(6);
  $('#blog-point-lng').value = point.longitude.toFixed(6);
  blogPointPickerState.centerLat = point.latitude;
  blogPointPickerState.centerLng = point.longitude;
  if (message) setMessage('#blog-point-status', message);
  renderBlogPointPicker();
  if (activeBlogEntryType === 'punto' && activeBlogImage) {
    showBlogImages([activeBlogImage, ...activeBlogGalleryImages]);
  }
  syncBlogEnRouteOption();
  scheduleActiveBlogEntryDraftSave();
}

function resetBlogPointPicker(entry = null) {
  const point = entry ? blogPointCoordinates(entry) : null;
  const fallback = blogPointDefaultCenter();
  $('#blog-point-lat').value = point ? point.latitude.toFixed(6) : '';
  $('#blog-point-lng').value = point ? point.longitude.toFixed(6) : '';
  blogPointPickerState.centerLat = point ? point.latitude : fallback.latitude;
  blogPointPickerState.centerLng = point ? point.longitude : fallback.longitude;
  blogPointPickerState.zoom = point ? 16 : fallback.zoom;
  setMessage('#blog-point-status', point ? 'Punto guardado. Puedes corregirlo pulsando en el mapa.' : 'Pulsa en el mapa para marcar el punto.');
  renderBlogPointPicker();
  syncBlogEnRouteOption();
}

function selectBlogPointFromMap(event, frame) {
  if (Date.now() < blogPointMapGesture.ignoreClickUntil) return;
  const rect = frame.getBoundingClientRect();
  const width = Number(frame.dataset.mapWidth || 640);
  const height = Number(frame.dataset.mapHeight || 280);
  const x = Number(frame.dataset.mapStartX) + ((event.clientX - rect.left) / rect.width) * width;
  const y = Number(frame.dataset.mapStartY) + ((event.clientY - rect.top) / rect.height) * height;
  const point = mapLatLngFromWorldPoint(x, y, Number(frame.dataset.mapZoom || 15));
  setBlogPointCoordinates(point.latitude, point.longitude, 'Punto marcado en el mapa.');
}

function showBlogLocationState(title, message, { searching = false, isError = false } = {}) {
  const dialog = $('#blog-location-dialog');
  if (!dialog) return;
  $('#blog-location-title').textContent = title;
  $('#blog-location-message').textContent = message;
  $('#blog-location-message').classList.toggle('error', isError);
  $('#blog-location-spinner').hidden = !searching;
  $('#blog-location-close').hidden = searching;
  dialog.dataset.searching = searching ? '1' : '0';
  if (!dialog.open) {
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }
}

function closeBlogLocationDialog() {
  const dialog = $('#blog-location-dialog');
  if (!dialog || dialog.dataset.searching === '1') return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
  scrollBlogPointMapIntoView();
}

async function useCurrentBlogPointLocation({ automatic = false } = {}) {
  const token = ++blogPointLocationRequestToken;
  const button = $('#blog-point-current');
  if (button) button.disabled = true;
  scrollBlogPointMapIntoView();
  showBlogLocationState(
    'Buscando localización',
    'Buscando una posición GPS fiable. Puede tardar algo más si estás en movimiento; no necesita datos móviles.',
    { searching: true }
  );
  try {
    const location = await requestCurrentDeviceLocation({
      timeoutMs: 35_000,
      targetAccuracy: 80,
      onProgress: current => {
        if (token !== blogPointLocationRequestToken) return;
        const accuracy = Math.round(Number(current.accuracy) || 0);
        showBlogLocationState(
          'Buscando localización',
          accuracy ? `Posición recibida con ${accuracy} m de precisión. Intentando mejorarla…` : 'Posición recibida. Intentando mejorar su precisión…',
          { searching: true }
        );
      }
    });
    if (token !== blogPointLocationRequestToken) return;
    blogPointPickerState.zoom = 17;
    setBlogPointCoordinates(
      location.latitude,
      location.longitude,
      `Ubicación actual seleccionada · precisión aproximada ${Math.round(location.accuracy || 0)} m.`
    );
    showBlogLocationState(
      'Punto localizado',
      `Se ha marcado la ubicación actual con una precisión aproximada de ${Math.round(location.accuracy || 0)} m. Puedes mover el mapa o corregir el punto.`,
      { searching: false }
    );
  } catch (error) {
    if (token !== blogPointLocationRequestToken) return;
    const detail = error && error.message ? error.message : 'No se pudo obtener la ubicación actual.';
    setMessage('#blog-point-status', 'Punto no encontrado. Puedes marcarlo manualmente en el mapa.', true);
    showBlogLocationState(
      'Punto no encontrado',
      `${detail} Comprueba que la ubicación del teléfono esté activada o marca el punto manualmente.`,
      { searching: false, isError: true }
    );
  } finally {
    if (token === blogPointLocationRequestToken && button) button.disabled = false;
    if (automatic) scheduleActiveBlogEntryDraftSave();
  }
}

async function searchBlogPointLocation() {
  const description = String($('#blog-descripcion') ? $('#blog-descripcion').value : '').trim();
  if (!description) throw new Error('Escribe primero la descripción del lugar');
  const place = [blogPlaceName($('#blog-ciudad') ? $('#blog-ciudad').value : ''), blogPlaceName($('#blog-pais') ? $('#blog-pais').value : '')]
    .filter(value => value && value !== '-')
    .join(', ');
  setMessage('#blog-point-status', 'Buscando el lugar...');
  const result = await fetchFirstGeocodeResultForPlace(description, place);
  if (!result) throw new Error(`No se encontró ${description}`);
  blogPointPickerState.zoom = 17;
  setBlogPointCoordinates(geocodeLatValue(result), geocodeLngValue(result), 'Lugar encontrado. Comprueba el punto en el mapa.');
}

function clearBlogImageSelection() {
  activeBlogImage = null;
  activeBlogGalleryImages = [];
  activeBlogCameraOriginalFile = null;
  if ($('#blog-image-file')) $('#blog-image-file').value = '';
  if ($('#blog-image-gallery')) $('#blog-image-gallery').value = '';
  if ($('#blog-image-camera')) $('#blog-image-camera').value = '';
  if ($('#blog-image-status')) $('#blog-image-status').textContent = 'Ninguna imagen seleccionada.';
  if ($('#blog-image-download-status')) $('#blog-image-download-status').textContent = '';
  updateBlogOriginalActions();
  if ($('#blog-image-preview')) {
    $('#blog-image-preview').hidden = true;
    $('#blog-image-preview').removeAttribute('src');
  }
  if ($('#blog-primary-photo-type-field')) $('#blog-primary-photo-type-field').hidden = true;
  if ($('#blog-image-rotate-actions')) $('#blog-image-rotate-actions').hidden = true;
  if ($('#blog-gallery-preview')) {
    $('#blog-gallery-preview').hidden = true;
    $('#blog-gallery-preview').innerHTML = '';
  }
  if ($('#blog-images-map-option')) $('#blog-images-map-option').hidden = true;
  if ($('#blog-images-map')) {
    $('#blog-images-map').checked = false;
    $('#blog-images-map').indeterminate = false;
  }
}

function syncBlogImageFieldsForType() {
  const hasImages = Boolean(activeBlogImage);
  const isImageEntry = activeBlogEntryType === 'imagen';
  const isPointEntry = activeBlogEntryType === 'punto';
  const isExpenseWithImages = activeBlogEntryType === 'gasto' && hasImages;
  if ($('#blog-image-fields')) $('#blog-image-fields').hidden = !isImageEntry && !isPointEntry && !isExpenseWithImages;
  if ($('#blog-image-label')) {
    $('#blog-image-label').textContent = isExpenseWithImages
      ? 'Imágenes adjuntas del gasto'
      : isPointEntry ? 'Fotos del punto geolocalizado' : 'Imagen';
  }
  if ($('#blog-image-picker-actions')) $('#blog-image-picker-actions').hidden = !isImageEntry && !isPointEntry;
  if ($('#blog-image-gps-help')) $('#blog-image-gps-help').hidden = !isImageEntry && !isPointEntry;
}

function showBlogImages(images = []) {
  const point = activeBlogEntryType === 'punto' ? blogPointFieldCoordinates() : null;
  const normalized = images
    .map(normalizeBlogImageRecord)
    .filter(image => image.data)
    .map(image => !storedImageCoordinates(image) && point
      ? {
        ...image,
        latitude: point.latitude,
        longitude: point.longitude,
        locationSource: 'manual'
      }
      : image);
  activeBlogImage = normalized[0] || null;
  activeBlogGalleryImages = normalized.slice(1);
  const located = normalized.filter(storedImageCoordinates);
  const enabledCount = normalized.filter(image => image.mapEnabled && storedImageCoordinates(image)).length;
  if ($('#blog-image-download-status')) $('#blog-image-download-status').textContent = '';
  if ($('#blog-image-status')) {
    if (!normalized.length) {
      $('#blog-image-status').textContent = 'Ninguna imagen seleccionada.';
    } else if (normalized.length === 1) {
      const locationText = located.length
        ? (normalized[0].locationSource === 'device'
          ? 'con ubicación actual del móvil'
          : normalized[0].locationSource === 'manual'
            ? 'con ubicación manual'
            : 'con GPS del archivo')
        : 'sin GPS';
      $('#blog-image-status').textContent = `${normalized[0].name} · ${formatFileSize(normalized[0].size)} · ${normalized[0].width} × ${normalized[0].height} · ${locationText}`;
    } else {
      const deviceCount = located.filter(image => image.locationSource === 'device').length;
      const manualCount = located.filter(image => image.locationSource === 'manual').length;
      const exifCount = located.length - deviceCount - manualCount;
      const locationParts = [
        exifCount ? `${exifCount} con GPS del archivo` : '',
        deviceCount ? `${deviceCount} con ubicación actual del móvil` : '',
        manualCount ? `${manualCount} con ubicación manual` : '',
        normalized.length > located.length ? `${normalized.length - located.length} sin GPS` : ''
      ].filter(Boolean).join(' · ');
      $('#blog-image-status').textContent = `${normalized.length} imágenes preparadas para la galería${locationParts ? ` · ${locationParts}` : ''}. Toca una foto para ampliarla o usa «Hacer primera» para cambiar el orden.`;
    }
  }
  if ($('#blog-image-preview')) {
    $('#blog-image-preview').src = normalized[0] ? normalized[0].data : '';
    $('#blog-image-preview').hidden = normalized.length === 0;
  }
  if ($('#blog-primary-photo-type-field')) {
    $('#blog-primary-photo-type-field').hidden = normalized.length !== 1;
    $('#blog-primary-photo-type').innerHTML = photoTypeOptionsHtml(normalized[0] ? normalized[0].photoTypeId : '');
  }
  if ($('#blog-image-rotate-actions')) $('#blog-image-rotate-actions').hidden = normalized.length === 0;
  if ($('#blog-gallery-preview')) {
    $('#blog-gallery-preview').innerHTML = normalized.map((image, index) => `<figure class="${index === 0 ? 'is-primary' : ''}"><button type="button" class="blog-gallery-select" data-open-blog-gallery-image="${index}" title="Ampliar ${escapeHtml(image.name || `imagen ${index + 1}`)}"><img src="${escapeHtml(image.data)}" alt="Imagen ${index + 1}"></button><figcaption>${index === 0 ? '<strong>Primera</strong> · ' : ''}${escapeHtml(image.name)} · ${storedImageCoordinates(image) ? 'GPS' : 'sin GPS'}</figcaption><select data-blog-image-type="${index}" aria-label="Tipo de ${escapeHtml(image.name || `imagen ${index + 1}`)}">${photoTypeOptionsHtml(image.photoTypeId)}</select><button type="button" class="ghost blog-gallery-primary" data-blog-primary-image="${index}" ${index === 0 ? 'disabled' : ''}>${index === 0 ? 'Primera' : 'Hacer primera'}</button><button type="button" class="ghost blog-gallery-remove" data-blog-remove-image="${index}" aria-label="Quitar ${escapeHtml(image.name || `imagen ${index + 1}`)}">Quitar</button></figure>`).join('');
    $('#blog-gallery-preview').hidden = normalized.length === 0;
  }
  if ($('#blog-images-map-option')) {
    $('#blog-images-map-option').hidden = located.length === 0;
    setMapOptionText($('#blog-images-map-option'), located.length === normalized.length ? 'Añadir al mapa' : 'Añadir al mapa las imágenes con GPS');
  }
  if ($('#blog-images-map')) {
    const mappableCount = located.length;
    $('#blog-images-map').checked = mappableCount > 0 && enabledCount === mappableCount;
    $('#blog-images-map').indeterminate = enabledCount > 0 && enabledCount < mappableCount;
  }
  syncBlogImageFieldsForType();
  syncBlogEnRouteOption();
}

function selectBlogPrimaryImage(index) {
  const images = [activeBlogImage, ...activeBlogGalleryImages].filter(Boolean);
  const selectedIndex = Number(index);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= images.length || selectedIndex === 0) return;
  const [selected] = images.splice(selectedIndex, 1);
  images.unshift(selected);
  showBlogImages(images);
  applyBlogImageDateTime(selected);
}

function removeBlogImage(index) {
  const images = [activeBlogImage, ...activeBlogGalleryImages].filter(Boolean);
  const imageIndex = Number(index);
  if (!Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= images.length) return;
  const [removed] = images.splice(imageIndex, 1);
  showBlogImages(images);
  setMessage('#msg-blog-entry', `${removed.name || 'Imagen'} se quitará al guardar la entrada.`);
  scheduleActiveBlogEntryDraftSave();
}

function setActiveBlogImagesMapEnabled(enabled) {
  const images = [activeBlogImage, ...activeBlogGalleryImages].filter(Boolean).map(image => ({
    ...image,
    mapEnabled: Boolean(enabled && storedImageCoordinates(image))
  }));
  showBlogImages(images);
}

function showBlogImage(image) {
  showBlogImages(image ? [image] : []);
}

function setBlogImagePhotoType(index, typeId) {
  const images = [activeBlogImage, ...activeBlogGalleryImages].filter(Boolean);
  const imageIndex = Number(index);
  if (!Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= images.length) return;
  const type = photoTypeById(typeId);
  images[imageIndex] = {
    ...images[imageIndex],
    photoTypeId: type ? type.id : '',
    photoTypeName: type ? type.nombre : ''
  };
  showBlogImages(images);
  scheduleActiveBlogEntryDraftSave();
}

async function rotateRasterImageRecord(image, direction) {
  if (!image || !image.data) throw new Error('No se encuentra la imagen para girarla.');
  const quarterTurn = direction === 'left' ? -1 : 1;
  const source = new Image();
  await new Promise((resolve, reject) => {
    source.onload = resolve;
    source.onerror = () => reject(new Error('No se pudo abrir la imagen para girarla.'));
    source.src = image.data;
  });
  const sourceWidth = source.naturalWidth || image.width;
  const sourceHeight = source.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error('La imagen no tiene dimensiones válidas.');
  const canvas = document.createElement('canvas');
  canvas.width = sourceHeight;
  canvas.height = sourceWidth;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(quarterTurn * Math.PI / 2);
  context.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  source.src = '';
  const blob = await canvasToJpeg(canvas, 0.92);
  return {
    ...image,
    name: String(image.name || 'imagen').replace(/\.[^.]+$/, '') + '.jpg',
    type: 'image/jpeg',
    size: blob.size,
    data: await readBlobAsDataUrl(blob),
    fileRef: '',
    width: canvas.width,
    height: canvas.height
  };
}

async function rotateActiveBlogImage(direction) {
  if (!activeBlogImage || !activeBlogImage.data) return;
  const rotated = normalizeBlogImageRecord(await rotateRasterImageRecord(activeBlogImage, direction));
  showBlogImages([rotated, ...activeBlogGalleryImages]);
  scheduleActiveBlogEntryDraftSave();
  setMessage('#msg-blog-entry', 'Imagen girada. Guarda la entrada para conservar el cambio.');
}

function syncBlogEnRouteOption(message = '', isError = false) {
  const option = $('#blog-en-route-option');
  const checkbox = $('#blog-en-route');
  const status = $('#blog-en-route-status');
  const locationButton = $('#blog-en-route-location');
  const available = ['texto', 'imagen', 'punto'].includes(activeBlogEntryType);
  if (option) option.hidden = !available;
  const manualLocationAvailable = ['texto', 'imagen'].includes(activeBlogEntryType);
  if (locationButton) {
    locationButton.hidden = !manualLocationAvailable;
    locationButton.textContent = blogPointFieldCoordinates() ? 'Cambiar ubicación manualmente' : 'Añadir ubicación manualmente';
  }
  const locatedImages = activeBlogEntryType === 'imagen'
    ? [activeBlogImage, ...activeBlogGalleryImages].filter(image => image && storedImageCoordinates(image))
    : [];
  const point = blogPointFieldCoordinates();
  const hasLocation = activeBlogEntryType === 'imagen' ? Boolean(locatedImages.length || point) : Boolean(point);
  if (checkbox && available) {
    checkbox.disabled = !hasLocation;
    if (!hasLocation) checkbox.checked = false;
  }
  if (!status || !available) return;
  if (message) {
    status.textContent = message;
    status.classList.toggle('error', isError);
    return;
  }
  status.classList.remove('error');
  if (!checkbox || !checkbox.checked) {
    status.textContent = hasLocation
      ? 'Ubicación disponible. Puedes activar «En ruta».'
      : activeBlogEntryType === 'punto'
        ? 'Marca primero el punto en el mapa.'
        : 'Sin ubicación. Añádela manualmente antes de activar «En ruta».';
    return;
  }
  if (activeBlogEntryType === 'imagen') {
    const manualOverride = blogManualRouteLocationOpen && point;
    status.textContent = manualOverride
      ? `Ubicación manual: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}.`
      : locatedImages.length
      ? `${locatedImages.length} ${locatedImages.length === 1 ? 'foto geolocalizada se usará' : 'fotos geolocalizadas se usarán'} en el recorrido.`
      : `Ubicación manual: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}.`;
    return;
  }
  status.textContent = `Ubicación guardada: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}.`;
}

function openBlogManualRouteLocation() {
  blogManualRouteLocationOpen = true;
  let point = blogPointFieldCoordinates();
  if (!point && activeBlogEntryType === 'imagen') {
    const locatedImage = [activeBlogImage, ...activeBlogGalleryImages].find(image => storedImageCoordinates(image));
    point = locatedImage ? storedImageCoordinates(locatedImage) : null;
    if (point) {
      $('#blog-point-lat').value = point.latitude.toFixed(6);
      $('#blog-point-lng').value = point.longitude.toFixed(6);
    }
  }
  syncBlogPointFieldsVisibility();
  setMessage('#blog-point-status', point
    ? 'Coordenadas preparadas. Puedes copiarlas o corregirlas escribiendo nuevos valores.'
    : 'Introduce manualmente la latitud y la longitud. No se usará tu ubicación actual.');
  syncBlogEnRouteOption();
}

async function copyBlogPointCoordinates() {
  const point = blogPointFieldCoordinates();
  if (!point) {
    setMessage('#blog-point-status', 'Introduce una latitud y una longitud válidas antes de copiarlas.', true);
    return;
  }
  const text = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    setMessage('#blog-point-status', `Coordenadas copiadas: ${text}`);
    return;
  }
  window.prompt('Copia estas coordenadas:', text);
}

function setBlogEntryType(type) {
  activeBlogEntryType = type;
  blogManualRouteLocationOpen = false;
  const helpTarget = {
    texto: 'blog-formulario-texto',
    imagen: 'blog-formulario-imagen',
    punto: 'blog-formulario-punto'
  }[type] || 'blog-formulario';
  setDialogHelpTarget('blog-entry-dialog', helpTarget);
  if ($('#blog-entry-type-choice')) $('#blog-entry-type-choice').hidden = true;
  if ($('#blog-entry-fields')) $('#blog-entry-fields').hidden = false;
  if ($('#blog-tipo')) $('#blog-tipo').value = blogTypeLabel(type);
  if ($('#blog-expense-fields')) $('#blog-expense-fields').hidden = type !== 'gasto';
  syncBlogImageFieldsForType();
  if ($('#blog-text-fields')) $('#blog-text-fields').hidden = !['texto', 'imagen'].includes(type);
  if ($('#blog-text-label')) $('#blog-text-label').textContent = type === 'imagen' ? 'Texto (opcional)' : 'Texto';
  syncBlogPointFieldsVisibility();
  if ($('#blog-featured-option')) $('#blog-featured-option').hidden = type !== 'imagen';
  if (type === 'punto') {
    const existingPoint = blogPointFieldCoordinates();
    resetBlogPointPicker(existingPoint);
    scrollBlogPointMapIntoView();
    if (!activeBlogEntryId && !restoringFormDraft && !existingPoint) {
      window.setTimeout(() => useCurrentBlogPointLocation({ automatic: true }), 0);
    }
  }
  syncBlogEnRouteOption();
  if (!restoringFormDraft) scheduleActiveBlogEntryDraftSave();
}

function blogEntryDraftKey(tripId = null) {
  const id = tripId || (selectedBlogTrip() ? selectedBlogTrip().id : '');
  return id ? formDraftKey('blog-entry', id) : '';
}

function scheduleActiveBlogEntryDraftSave() {
  if (activeBlogEntryId) return;
  const key = blogEntryDraftKey();
  if (!key) return;
  scheduleFormDraftSave(key, BLOG_ENTRY_DRAFT_FIELDS, () => ({ type: activeBlogEntryType }));
}

function bindBlogEntryDraftFields() {
  for (const selector of BLOG_ENTRY_DRAFT_FIELDS) {
    const field = $(selector);
    if (!field) continue;
    ['input', 'change'].forEach(eventName => {
      field.addEventListener(eventName, scheduleActiveBlogEntryDraftSave);
    });
  }
}

function discardActiveBlogEntryDraft() {
  const key = blogEntryDraftKey();
  if (key) clearFormDraft(key);
  setMessage('#msg-blog-entry', '');
}

function restoreBlogEntryDraft(trip) {
  const draft = getFormDraft(blogEntryDraftKey(trip && trip.id));
  if (!draft) return false;
  const values = draft.values || {};
  const type = String(draft.meta && draft.meta.type || '').trim();
  restoringFormDraft = true;
  try {
    if (type) setBlogEntryType(type);
    applyFormDraftValues([
      '#blog-fecha', '#blog-hora', '#blog-descripcion', '#blog-wordpress', '#blog-featured',
      '#blog-en-route', '#blog-texto', '#blog-point-notes', '#blog-point-transport-walk',
      '#blog-point-transport-car', '#blog-point-transport-train', '#blog-point-transport-bus',
      '#blog-point-transport-plane'
    ], values);
    setBlogPointTransportSelection(selectedBlogPointTransport());
    applyFormDraftValues(['#blog-pais'], values);
    renderBlogCities(values['blog-ciudad'] || '');
    applyFormDraftValues(['#blog-ciudad', '#blog-point-lat', '#blog-point-lng', '#blog-images-map'], values);
    if (type === 'punto') {
      const point = blogPointFieldCoordinates();
      if (point) {
        blogPointPickerState.centerLat = point.latitude;
        blogPointPickerState.centerLng = point.longitude;
      }
      renderBlogPointPicker();
    }
    syncBlogEnRouteOption();
  } finally {
    restoringFormDraft = false;
  }
  setMessage('#msg-blog-entry', 'Borrador restaurado. Si habías elegido imágenes, tendrás que volver a seleccionarlas.');
  return true;
}

function closeBlogEntryDialog() {
  activeBlogEntryId = null;
  activeBlogEntryAnchor = null;
  activeBlogEntryType = '';
  blogManualRouteLocationOpen = false;
  activeBlogImage = null;
  activeBlogGalleryImages = [];
  activeBlogCameraOriginalFile = null;
  updateBlogOriginalActions();
  const dialog = $('#blog-entry-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function openBlogEntryDialog(entry = null) {
  const trip = selectedBlogTrip();
  if (!trip) {
    alert('Selecciona exactamente un viaje para añadir una entrada.');
    return;
  }
  activeBlogEntryId = entry ? Number(entry.id) : null;
  activeBlogEntryAnchor = entry ? captureBlogEntryAnchor(entry.id) : null;
  activeBlogEntryType = '';
  setDialogHelpTarget('blog-entry-dialog', 'blog-formulario');
  blogManualRouteLocationOpen = false;
  clearBlogImageSelection();
  if ($('#blog-entry-title')) $('#blog-entry-title').textContent = entry ? 'Editar entrada del blog' : `Añadir entrada · ${trip.nombre}`;
  if ($('#blog-entry-id')) $('#blog-entry-id').value = entry ? String(entry.id) : '';
  if ($('#blog-fecha')) $('#blog-fecha').value = entry ? entry.fecha : currentLocalDate();
  if ($('#blog-hora')) $('#blog-hora').value = entry ? entry.hora : currentLocalTime();
  if ($('#blog-descripcion')) $('#blog-descripcion').value = entry ? entry.descripcion || '' : '';
  if ($('#blog-texto')) $('#blog-texto').value = entry ? entry.texto || '' : '';
  if ($('#blog-point-notes')) $('#blog-point-notes').value = entry && entry.tipo === 'punto' ? entry.notas || '' : '';
  const entryTransport = entry && entry.tipo === 'punto'
    ? (Object.prototype.hasOwnProperty.call(entry, 'transporte')
      ? entry.transporte
      : inferBlogPointTransport(entry.descripcion))
    : '';
  setBlogPointTransportSelection(entryTransport);
  if ($('#blog-en-route')) $('#blog-en-route').checked = Boolean(entry && entry.enRuta);
  if ($('#blog-point-lat')) $('#blog-point-lat').value = entry && entry.latitude != null ? formatCoordinate(entry.latitude) : '';
  if ($('#blog-point-lng')) $('#blog-point-lng').value = entry && entry.longitude != null ? formatCoordinate(entry.longitude) : '';
  if ($('#blog-wordpress')) $('#blog-wordpress').checked = entry ? entry.wordpressIncluded !== false : true;
  if ($('#blog-featured')) $('#blog-featured').checked = Boolean(entry && entry.tipo === 'imagen' && entry.featuredImage);
  if ($('#blog-gasto-precio')) {
    $('#blog-gasto-precio').value = entry && entry.tipo === 'gasto'
      ? fmtCurrency(entry.gastoImporte, entry.gastoMoneda || 'EUR')
      : '';
  }
  if ($('#blog-entry-type-choice')) $('#blog-entry-type-choice').hidden = Boolean(entry);
  if ($('#blog-entry-fields')) $('#blog-entry-fields').hidden = !entry;
  const lastEntry = !entry
    ? blogEntriesForTrip(trip.id).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || Number(b.id || 0) - Number(a.id || 0))[0]
    : null;
  const locationSource = entry || lastEntry;
  renderBlogCountries(locationSource ? locationSource.paisId : '');
  if (entry) {
    renderBlogCities(entry.enTransito === true ? BLOG_TRANSIT_CITY_VALUE : entry.ciudadId);
    setBlogEntryType(entry.tipo);
    if (blogEntryImages(entry).length) showBlogImages(blogEntryImages(entry));
    if (entry.tipo === 'punto') resetBlogPointPicker(entry);
  } else if (lastEntry) {
    renderBlogCities(lastEntry.enTransito === true ? BLOG_TRANSIT_CITY_VALUE : lastEntry.ciudadId);
  }
  if ($('#msg-blog-entry')) setMessage('#msg-blog-entry', '');
  if (!entry) restoreBlogEntryDraft(trip);
  const dialog = $('#blog-entry-dialog');
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen')), 'image/jpeg', quality);
  });
}

async function compressBlogImage(file, options = {}) {
  const fileName = String(file && file.name || '');
  const supportedByType = String(file && file.type || '').startsWith('image/');
  const supportedByName = /\.(?:jpe?g|png|webp|gif)$/i.test(fileName);
  if (!file || (!supportedByType && !supportedByName)) throw new Error('Selecciona un archivo de imagen');
  let gps = null;
  let captured = null;
  if (!options.skipMetadata) {
    [gps, captured] = await Promise.all([
      imageGpsForFile(file, options),
      imageDateTimeForFile(file)
    ]);
  }
  const image = await loadImageFile(file);
  try {
    let width = image.naturalWidth || image.width;
    let height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error('La imagen no tiene dimensiones válidas');
    const scale = Math.min(1, BLOG_IMAGE_MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    let blob = null;
    let outputWidth = width;
    let outputHeight = height;
    for (let resizeRound = 0; resizeRound < 4; resizeRound += 1) {
      outputWidth = width;
      outputHeight = height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      for (const quality of [0.86, 0.78, 0.68, 0.58]) {
        blob = await canvasToJpeg(canvas, quality);
        if (blob.size <= BLOG_IMAGE_TARGET_BYTES) break;
      }
      canvas.width = 1;
      canvas.height = 1;
      if (blob.size <= BLOG_IMAGE_TARGET_BYTES) break;
      const longestEdge = Math.max(width, height);
      if (longestEdge <= 640) break;
      const resizeScale = Math.max(640 / longestEdge, 0.82);
      width = Math.max(1, Math.round(width * resizeScale));
      height = Math.max(1, Math.round(height * resizeScale));
    }
    if (!blob || blob.size > BLOG_IMAGE_OUTPUT_LIMIT) {
      throw new Error('El navegador no pudo reducir suficientemente la imagen. Prueba con otra foto o recórtala antes.');
    }
    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: String(file.name || 'imagen').replace(/\.[^.]+$/, '') + '.jpg',
      type: 'image/jpeg',
      size: blob.size,
      data: await readBlobAsDataUrl(blob),
      width: outputWidth,
      height: outputHeight,
      latitude: gps ? gps.latitude : null,
      longitude: gps ? gps.longitude : null,
      locationSource: gps ? gps.source || 'exif' : '',
      mapEnabled: false,
      capturedDate: captured ? captured.date : '',
      capturedTime: captured ? captured.time : ''
    };
  } finally {
    image.src = '';
  }
}

function updateBlogOriginalActions(message = '', isError = false) {
  const actions = $('#blog-original-actions');
  if (actions) actions.hidden = !activeBlogCameraOriginalFile;
  setMessage('#blog-original-status', message, isError);
}

async function applyBlogImageDateTime(image) {
  const result = await applyImageDateTimeToFields(image, '#blog-fecha', '#blog-hora', activeBlogEntryId ? 'la entrada guardada del Blog' : 'la entrada del Blog');
  scheduleActiveBlogEntryDraftSave();
  return result;
}

async function selectBlogImage(input, otherInput, options = {}) {
  const file = input && input.files && input.files[0];
  if (!file) return;
  [otherInput, $('#blog-image-gallery')].filter(Boolean).forEach(field => { field.value = ''; });
  activeBlogCameraOriginalFile = options.fromCamera ? file : null;
  updateBlogOriginalActions(activeBlogCameraOriginalFile ? 'Original listo para guardar fuera de la aplicación.' : '');
  setMessage('#msg-blog-entry', '');
  if ($('#blog-image-status')) $('#blog-image-status').textContent = 'Comprimiendo imagen...';
  try {
    const image = await compressBlogImage(file, options);
    showBlogImage(image);
    await applyBlogImageDateTime(image);
  } catch (error) {
    input.value = '';
    if (options.fromCamera) activeBlogCameraOriginalFile = null;
    updateBlogOriginalActions();
    if (activeBlogImage) showBlogImage(activeBlogImage);
    else if ($('#blog-image-status')) $('#blog-image-status').textContent = 'Ninguna imagen seleccionada.';
    setMessage('#msg-blog-entry', error.message || String(error), true);
  }
}

async function selectBlogGallery(input) {
  const files = input && input.files ? Array.from(input.files) : [];
  if (!files.length) return;
  if ($('#blog-image-file')) $('#blog-image-file').value = '';
  if ($('#blog-image-camera')) $('#blog-image-camera').value = '';
  activeBlogCameraOriginalFile = null;
  updateBlogOriginalActions();
  setMessage('#msg-blog-entry', '');
  const images = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      if ($('#blog-image-status')) $('#blog-image-status').textContent = `Comprimiendo imagen ${index + 1} de ${files.length}...`;
      images.push(await compressBlogImage(files[index]));
    }
    showBlogImages(images);
    applyBlogImageDateTime(images[0]);
  } catch (error) {
    input.value = '';
    if (activeBlogImage) showBlogImages([activeBlogImage, ...activeBlogGalleryImages]);
    else clearBlogImageSelection();
    setMessage('#msg-blog-entry', error.message || String(error), true);
  }
}

function replaceSharedLaunchQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('shared');
  url.searchParams.delete('shared_error');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

async function deleteSharedLaunchCache(metadataUrl, files = []) {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(SHARED_FILES_CACHE);
    await Promise.all([metadataUrl, ...files.map(file => file.url)].filter(Boolean).map(url => cache.delete(url)));
  } catch (error) {
    console.warn('No se pudieron limpiar las imágenes compartidas temporales', error);
  }
}

function revokeSharedImagePreviewUrls() {
  sharedImagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
  sharedImagePreviewUrls = [];
}

function openBlogGalleryImage(index = 0) {
  const images = [activeBlogImage, ...activeBlogGalleryImages].filter(Boolean);
  const imageIndex = Number(index);
  if (!Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= images.length) return;
  const image = images[imageIndex];
  openImageViewer(image, image.name || `Imagen ${imageIndex + 1}`);
}

function activeSharedExpenseFormTarget(tripId = Number($('#shared-images-trip')?.value || 0)) {
  const addDialog = $('#add-gasto-dialog');
  const editDialog = $('#edit-gasto-dialog');
  let prefix = '';
  if (addDialog?.open && Number($('#g-viaje')?.value || 0) === Number(tripId)) prefix = 'g';
  else if (editDialog?.open && Number($('#edit-gasto-viaje')?.value || 0) === Number(tripId)) prefix = 'edit-gasto';
  if (!prefix) return null;
  const amount = numberValue($(`#${prefix}-importe`)?.value);
  const description = String($(`#${prefix}-desc`)?.value || '').trim() || (prefix === 'g' ? 'Nuevo gasto' : 'Gasto abierto');
  const expenseId = prefix === 'edit-gasto' ? Number($('#edit-gasto-id')?.value || 0) : 0;
  const gasto = expenseId ? state.gastos.find(item => Number(item.id) === expenseId) || null : null;
  return {
    value: `current:${prefix}`,
    prefix,
    expenseId,
    gasto,
    hasTicket: Boolean(ticketOcrSource(prefix)),
    companionExists: Boolean(pendingExpenseTicketTranslations[prefix]?.data),
    label: `${prefix === 'g' ? 'Gasto abierto sin guardar' : 'Gasto que estás editando'} · ${description}${amount ? ` · ${fmtCurrency(Math.abs(amount), $(`#${prefix}-moneda`)?.value || 'EUR')}` : ''}`
  };
}

async function restoreLensTicketSource(prefix, target) {
  if (!prefix || ticketOcrSource(prefix) || !target?.sourceUrl || !('caches' in window)) return;
  try {
    const cache = await caches.open(LENS_RETURN_CACHE);
    const response = await cache.match(target.sourceUrl);
    if (!response) return;
    const blob = await response.blob();
    const file = new File([blob], target.sourceName || 'ticket.jpg', {
      type: target.sourceType || blob.type || 'image/jpeg',
      lastModified: Number(target.startedAt || Date.now())
    });
    assignSharedFilesToInput($(`#${prefix}-ticket`), [file]);
    pendingExpenseTicketLocationChecks[prefix] = syncExpenseTicketSelection(prefix, 'file');
    await pendingExpenseTicketLocationChecks[prefix];
  } catch (error) {
    console.warn('No se pudo restaurar el ticket al volver desde Lens', error);
  }
}

async function restoreLensExpenseFormTarget(target, tripId) {
  if (!target || !['g', 'edit-gasto'].includes(target.prefix)) return activeSharedExpenseFormTarget(tripId);
  let current = activeSharedExpenseFormTarget(tripId);
  if (!current || current.prefix !== target.prefix) {
    applySelectedTrip(tripId || target.tripId);
    if (target.prefix === 'edit-gasto') {
      const gasto = state.gastos.find(item => Number(item.id) === Number(target.expenseId));
      if (gasto) openEditGasto(gasto);
    } else {
      openAddGasto();
    }
    current = activeSharedExpenseFormTarget(tripId || target.tripId);
  }
  if (current) {
    await restoreLensTicketSource(current.prefix, target);
    current = activeSharedExpenseFormTarget(tripId || target.tripId);
  }
  return current;
}

function renderSharedExpenseOptions() {
  const select = $('#shared-images-expense');
  if (!select) return;
  const tripId = Number($('#shared-images-trip')?.value || 0);
  const previousValue = select.value;
  const currentTarget = activeSharedExpenseFormTarget(tripId);
  const expenses = state.gastos
    .filter(gasto => Number(gasto.viajeId) === tripId)
    .slice()
    .sort((a, b) => compareExpensesChronologically(b, a));
  const options = [];
  if (currentTarget) options.push(`<option value="${currentTarget.value}">${escapeHtml(currentTarget.label)}</option>`);
  options.push(...expenses.map(gasto => `<option value="${gasto.id}">${escapeHtml(`${summaryDocumentDate(gasto.fecha, true)} ${expenseTimeValue(gasto) || ''} · ${gasto.desc || 'Gasto'} · ${fmtCurrency(Math.abs(numberValue(gasto.importe)), gasto.moneda || 'EUR')}`)}</option>`));
  select.innerHTML = options.length ? options.join('') : '<option value="">(este viaje no tiene gastos)</option>';
  select.disabled = !options.length;
  if (previousValue && [...select.options].some(option => option.value === previousValue)) select.value = previousValue;
}

function selectedSharedExpense() {
  const tripId = Number($('#shared-images-trip')?.value || 0);
  const expenseId = Number($('#shared-images-expense')?.value || 0);
  return state.gastos.find(gasto => Number(gasto.id) === expenseId && Number(gasto.viajeId) === tripId) || null;
}

function selectedSharedExpenseTarget() {
  const value = String($('#shared-images-expense')?.value || '');
  if (value.startsWith('current:')) {
    const current = activeSharedExpenseFormTarget();
    return current?.value === value ? current : null;
  }
  const gasto = selectedSharedExpense();
  return gasto ? {
    value,
    prefix: '',
    expenseId: Number(gasto.id),
    gasto,
    hasTicket: Boolean(gasto.ticketData),
    companionExists: Boolean(gasto.ticketTranslationData)
  } : null;
}

function syncSharedTicketAction() {
  const destination = $('#shared-images-destination')?.value || 'blog';
  const kind = $('#shared-images-kind')?.value || 'ticket';
  const target = destination === 'expense-existing' ? selectedSharedExpenseTarget() : null;
  const gasto = target?.gasto || null;
  const lensResult = Boolean(pendingSharedImagesPayload?.fromLens);
  const spanishLensReading = Boolean(lensResult && pendingSharedImagesPayload?.lensSpanishOnly);
  const actionRow = $('#shared-images-ticket-action-row');
  const actionSelect = $('#shared-images-ticket-action');
  const actionLabel = $('#shared-images-ticket-action-label');
  const secondaryOption = actionSelect?.querySelector('option[value="secondary"]');
  if (secondaryOption) secondaryOption.hidden = lensResult;
  if (lensResult && actionSelect) actionSelect.value = 'translation';
  if (actionLabel) actionLabel.textContent = lensResult ? 'Resultado recibido de Google Lens' : 'Este gasto ya tiene ticket';
  const action = actionSelect?.value || 'replace';
  const needsAction = Boolean(target?.hasTicket && kind === 'ticket' && !spanishLensReading);
  if (actionRow) actionRow.hidden = !needsAction;
  const note = $('#shared-images-ticket-action-note');
  if (!note) return;
  if (!needsAction) {
    note.textContent = spanishLensReading
      ? 'Lectura en español: se usarán los datos reconocidos y se conservará únicamente el ticket original.'
      : target && kind === 'ticket'
      ? 'La imagen se preparará como ticket principal.'
      : '';
    return;
  }
  if (action === 'replace') {
    note.textContent = 'La imagen sustituirá al ticket principal actual cuando guardes el gasto.';
    return;
  }
  const companionExists = Boolean(target?.companionExists);
  const label = action === 'secondary' ? 'segundo ticket' : 'traducción';
  note.textContent = companionExists
    ? `Ya existe ${gasto?.ticketTranslationKind === 'secondary-ticket' ? 'un segundo ticket' : 'una traducción'}. Esta imagen la reemplazará como ${label} cuando guardes.`
    : `La imagen se colocará junto al ticket principal como ${label}.`;
}

function sharedPayloadText(payload) {
  const text = String(payload?.text || '').trim();
  const sourceUrl = String(payload?.sourceUrl || '').trim();
  const parts = text ? [text] : [];
  if (sourceUrl && !text.includes(sourceUrl)) parts.push(sourceUrl);
  if (!parts.length && String(payload?.title || '').trim()) parts.push(String(payload.title).trim());
  return parts.join('\n\n');
}

function sharedPayloadDescription(payload, text = sharedPayloadText(payload)) {
  const meaningfulDescription = value => {
    const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
    return /^(?:texto|contenido|imagen|foto) compartid[oa]$/i.test(cleaned) ? '' : cleaned;
  };
  const title = meaningfulDescription(payload?.title);
  const firstLine = meaningfulDescription(String(text || '').split(/\r?\n/)[0]);
  return (title || firstLine).slice(0, 240);
}

function cleanLensSharedText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .filter(line => !/^\s*(?:traducid[oa]\s+con\s+google\s+lens|translated\s+by\s+google\s+lens|google\s+lens)\s*[.!]?\s*$/i.test(line))
    .join('\n')
    .trim();
}

function lensSharedReceiptText(payload) {
  const text = cleanLensSharedText(String(payload?.text || ''));
  if (!text || /^https?:\/\/\S+$/i.test(text)) return '';
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const signals = [
    /\b(?:total|importe|amount|subtotal|pagar|payment)\b/,
    /(?:[€$£¥₩￥]|\b(?:eur|usd|jpy|krw)\b)/i,
    /\b\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}\b|\b\d{1,2}:\d{2}\b/,
    /\b(?:recibo|ticket|factura|telefono|tienda|restaurant|store)\b/
  ].filter(pattern => pattern.test(normalized)).length;
  return signals > 0 && (lines.length >= 2 || text.length >= 60) ? text : '';
}

function sharedPayloadLooksLikeLens(payload) {
  const hint = [payload?.title, payload?.text, payload?.sourceUrl]
    .map(value => String(value || ''))
    .join(' ');
  return Boolean(currentLensReturnTarget()) || /google\s*lens|traducid[oa]\s+con\s+google\s+lens|lens\b/i.test(hint);
}

function syncSharedImagesDestination() {
  const hasImages = Boolean(pendingSharedImagesPayload?.files?.length);
  const hasText = Boolean(sharedPayloadText(pendingSharedImagesPayload));
  const destination = $('#shared-images-destination')?.value || 'blog';
  const existing = hasImages && destination === 'expense-existing';
  const expenseDestination = hasImages && (existing || destination === 'expense-new');
  const requiresDescription = hasImages && destination === 'blog';
  const description = String($('#shared-images-description')?.value || '').trim();
  if ($('#shared-images-description-row')) $('#shared-images-description-row').hidden = !hasImages || existing;
  if ($('#shared-images-description')) $('#shared-images-description').required = requiresDescription;
  if ($('#shared-images-expense-row')) $('#shared-images-expense-row').hidden = !existing;
  if ($('#shared-images-kind-row')) $('#shared-images-kind-row').hidden = !expenseDestination;
  syncSharedTicketAction();
  const canContinue = (hasImages || hasText)
    && Boolean($('#shared-images-trip')?.value)
    && (!existing || Boolean($('#shared-images-expense')?.value))
    && (!requiresDescription || Boolean(description));
  if ($('#shared-images-continue')) $('#shared-images-continue').disabled = !canContinue;
}

async function updateSharedImagesGpsSummary(payload) {
  const summary = $('#shared-images-summary');
  if (!summary) return;
  if (!payload?.files?.length) {
    summary.textContent = 'Texto listo para añadir al Blog.';
    return;
  }
  summary.textContent = `Comprobando GPS de ${payload.files.length} ${payload.files.length === 1 ? 'imagen' : 'imágenes'}...`;
  const points = await Promise.all(payload.files.map(file => imageGpsForFile(file)));
  if (pendingSharedImagesPayload !== payload) return;
  const located = points.filter(Boolean).length;
  summary.textContent = `${payload.files.length} ${payload.files.length === 1 ? 'imagen recibida' : 'imágenes recibidas'} · ${located} con GPS${located < payload.files.length ? ` · ${payload.files.length - located} sin GPS` : ''}.`;
}

function waitForSharedPreviewImages() {
  const images = $$('#shared-images-preview img');
  if (!images.length) return Promise.resolve();
  const ready = Promise.all(images.map(image => image.complete
    ? Promise.resolve()
    : new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
  return Promise.race([ready, new Promise(resolve => window.setTimeout(resolve, 3000))]);
}

async function openSharedImagesDialog(payload) {
  payload = { ...payload, files: Array.isArray(payload?.files) ? payload.files : [] };
  payload.fromLens = Boolean(payload.fromLens || sharedPayloadLooksLikeLens(payload));
  if (payload.fromLens && $('#image-viewer-dialog')?.open) closeImageViewer();
  pendingSharedImagesPayload = payload;
  revokeSharedImagePreviewUrls();
  const hasImages = payload.files.length > 0;
  const sharedText = sharedPayloadText(payload);
  const lensReceiptText = payload.fromLens ? lensSharedReceiptText(payload) : '';
  if ($('#shared-content-title')) $('#shared-content-title').textContent = hasImages ? 'Imágenes recibidas' : 'Texto recibido';
  if ($('#shared-content-intro')) {
    $('#shared-content-intro').textContent = hasImages
      ? payload.fromLens
        ? 'Se ha recibido el resultado de Google Lens. Se aplicará al gasto que tenías abierto y podrás revisar los datos antes de guardar.'
        : 'Elige dónde preparar las imágenes compartidas. No se guardará nada hasta que confirmes el formulario correspondiente.'
      : 'Elige el viaje. El texto se preparará como una nueva entrada del Blog y podrás revisarlo antes de guardarlo.';
  }
  const preview = $('#shared-images-preview');
  if (preview) {
    preview.classList.toggle('shared-text-preview', !hasImages);
    preview.innerHTML = hasImages
      ? payload.files.map((file, index) => {
        const url = URL.createObjectURL(file);
        sharedImagePreviewUrls.push(url);
        return `<figure><button type="button" data-open-shared-image="${index}" title="Ampliar ${escapeHtml(file.name || `imagen ${index + 1}`)}"><img src="${escapeHtml(url)}" alt="Imagen compartida ${index + 1}"></button><figcaption>${escapeHtml(file.name || `Imagen ${index + 1}`)}</figcaption></figure>`;
      }).join('')
      : escapeHtml(sharedText).replace(/\n/g, '<br>');
  }
  const tripSelect = $('#shared-images-trip');
  const trips = state.viajes.slice().sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || '') || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  const selectedIds = selectedTripIds();
  const lensTarget = payload.fromLens ? currentLensReturnTarget() : null;
  payload.lensSpanishOnly = Boolean(payload.fromLens && lensTarget?.spanishSource);
  const defaultTripId = lensTarget?.tripId && trips.some(trip => Number(trip.id) === Number(lensTarget.tripId))
    ? Number(lensTarget.tripId)
    : selectedIds.length === 1 ? Number(selectedIds[0]) : Number(trips[0]?.id || 0);
  if (tripSelect) {
    tripSelect.innerHTML = trips.length
      ? trips.map(trip => `<option value="${trip.id}">${escapeHtml(trip.nombre)}</option>`).join('')
      : '<option value="">(no hay viajes creados)</option>';
    tripSelect.value = defaultTripId ? String(defaultTripId) : '';
    tripSelect.disabled = !trips.length;
  }
  let currentFormTarget = activeSharedExpenseFormTarget(defaultTripId);
  if (payload.fromLens && lensTarget) {
    currentFormTarget = await restoreLensExpenseFormTarget(lensTarget, defaultTripId);
  }
  const preferredStoredExpense = lensTarget?.expenseId
    ? state.gastos.find(item => Number(item.id) === Number(lensTarget.expenseId) && Number(item.viajeId) === Number(defaultTripId))
    : null;
  if ($('#shared-images-destination')) {
    $('#shared-images-destination').value = payload.fromLens && (currentFormTarget || preferredStoredExpense)
      ? 'expense-existing'
      : payload.fromLens ? 'expense-new' : 'blog';
  }
  if ($('#shared-images-kind')) $('#shared-images-kind').value = 'ticket';
  if ($('#shared-images-ticket-action')) $('#shared-images-ticket-action').value = payload.fromLens ? 'translation' : 'replace';
  if ($('#shared-images-destination-field')) $('#shared-images-destination-field').hidden = !hasImages;
  if ($('#shared-images-description')) $('#shared-images-description').value = hasImages
    ? sharedPayloadDescription(payload, sharedText)
    : '';
  const descriptionLabel = $('#shared-images-description-row label');
  if (descriptionLabel) descriptionLabel.textContent = payload.files.length === 1 ? 'Descripción de la foto' : 'Descripción de las fotos';
  if ($('#msg-shared-images')) setMessage('#msg-shared-images', '');
  renderSharedExpenseOptions();
  if ($('#shared-images-expense') && payload.fromLens) {
    const preferredValue = currentFormTarget?.value || (preferredStoredExpense ? String(preferredStoredExpense.id) : '');
    if (preferredValue && [...$('#shared-images-expense').options].some(option => option.value === preferredValue)) {
      $('#shared-images-expense').value = preferredValue;
    }
  }
  if (payload.fromLens && lensReceiptText && !hasImages && currentFormTarget) {
    await readLensTicketText(currentFormTarget.prefix, lensReceiptText);
    pendingSharedImagesPayload = null;
    writeLensReturnTarget(null);
    setTab('gastos');
    return;
  }
  syncSharedImagesDestination();
  await Promise.all([
    waitForSharedPreviewImages(),
    updateSharedImagesGpsSummary(payload).catch(error => {
      if ($('#shared-images-summary')) $('#shared-images-summary').textContent = `No se pudo comprobar el GPS: ${error.message || error}`;
    })
  ]);
  if (pendingSharedImagesPayload !== payload) return;
  const dialog = $('#shared-images-dialog');
  if (dialog?.showModal) dialog.showModal();
  else dialog?.setAttribute('open', 'open');
}

function closeSharedImagesDialog() {
  const wasLensResult = Boolean(pendingSharedImagesPayload?.fromLens);
  const dialog = $('#shared-images-dialog');
  if (dialog?.close) dialog.close();
  else dialog?.removeAttribute('open');
  revokeSharedImagePreviewUrls();
  pendingSharedImagesPayload = null;
  if (wasLensResult) writeLensReturnTarget(null);
}

function assignSharedFilesToInput(input, files) {
  if (!input || typeof DataTransfer === 'undefined') throw new Error('Este navegador no permite trasladar las imágenes al formulario.');
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  input.files = transfer.files;
}

async function prepareSharedBlogImages(files) {
  const images = [];
  for (let index = 0; index < files.length; index += 1) {
    setMessage('#msg-shared-images', `Preparando imagen ${index + 1} de ${files.length}...`);
    images.push(await compressBlogImage(files[index]));
  }
  return images;
}

async function prepareSharedTicketCompanion(file, kind) {
  const image = await compressBlogImage(file, { skipMetadata: true });
  return {
    ...image,
    name: file.name || image.name,
    text: '',
    sourceLanguages: [],
    kind: kind === 'secondary' ? 'secondary-ticket' : 'translation'
  };
}

async function routeSharedExpenseImages(prefix, files, kind, action = 'replace', options = {}) {
  const [first, ...remaining] = files;
  if (kind === 'photo') {
    assignSharedFilesToInput($(`#${prefix}-extra-images`), files);
    await syncExpenseExtraImageSelection(prefix, { resetClassifications: true });
    return;
  }
  if (options.fromLens && options.spanishOnly) {
    const lensRecord = await prepareSharedTicketCompanion(first, 'translation');
    if (options.lensText) await readLensTicketText(prefix, options.lensText);
    else await readLensTicketTranslation(prefix, lensRecord, first);
    return;
  }
  if (action === 'translation' || action === 'secondary') {
    const companion = await prepareSharedTicketCompanion(first, action);
    pendingExpenseTicketTranslations[prefix] = companion;
    renderExpenseTicketTranslation(prefix);
    if (action === 'translation' && options.lensText) {
      companion.text = options.lensText;
      companion.sourceLanguages = ['spa'];
      await readLensTicketText(prefix, options.lensText);
    } else if (action === 'translation') await readLensTicketTranslation(prefix, companion, first);
    else setTicketOcrStatus(prefix, 'Segundo ticket preparado junto al ticket principal. Revisa y guarda el gasto.');
  } else {
    assignSharedFilesToInput($(`#${prefix}-ticket`), [first]);
    await syncExpenseTicketSelection(prefix, 'file');
    if (options.fromLens) {
      if (options.lensText) await readLensTicketText(prefix, options.lensText);
      else {
        const lensRecord = pendingExpenseTicketPreviews[prefix];
        if (lensRecord?.data) await readLensTicketTranslation(prefix, lensRecord, first);
      }
    }
  }
  if (remaining.length) {
    assignSharedFilesToInput($(`#${prefix}-extra-images`), remaining);
    await syncExpenseExtraImageSelection(prefix, { resetClassifications: true });
  }
}

async function continueSharedImagesImport() {
  const payload = pendingSharedImagesPayload;
  const tripId = Number($('#shared-images-trip')?.value || 0);
  const destination = $('#shared-images-destination')?.value || 'blog';
  const files = Array.isArray(payload?.files) ? payload.files.slice() : [];
  const sharedText = sharedPayloadText(payload);
  const sharedKind = $('#shared-images-kind')?.value || 'ticket';
  const ticketAction = $('#shared-images-ticket-action')?.value || 'replace';
  const lensOptions = {
    fromLens: Boolean(payload?.fromLens),
    spanishOnly: Boolean(payload?.lensSpanishOnly),
    lensText: payload?.fromLens ? lensSharedReceiptText(payload) : ''
  };
  const selectedExpenseValue = String($('#shared-images-expense')?.value || '');
  const currentExpenseTarget = selectedExpenseValue.startsWith('current:') ? selectedSharedExpenseTarget() : null;
  const expenseId = Number(selectedExpenseValue || 0);
  if (!files.length && !sharedText) throw new Error('No hay contenido compartido disponible.');
  if (!tripId || !state.viajes.some(trip => Number(trip.id) === tripId)) throw new Error('Elige un viaje.');
  const suggestedDescription = files.length
    ? String($('#shared-images-description')?.value || '').trim()
    : sharedPayloadDescription(payload, sharedText);
  if (files.length && destination === 'blog' && !suggestedDescription) {
    throw new Error('Escribe una descripción para la foto.');
  }
  if (!files.length) {
    applySelectedTrip(tripId);
    closeSharedImagesDialog();
    setTab('blog');
    openBlogEntryDialog();
    setBlogEntryType('texto');
    if ($('#blog-descripcion')) $('#blog-descripcion').value = suggestedDescription;
    if ($('#blog-texto')) $('#blog-texto').value = sharedText;
    scheduleActiveBlogEntryDraftSave();
    return;
  }
  if (destination === 'blog') {
    const images = await prepareSharedBlogImages(files);
    applySelectedTrip(tripId);
    closeSharedImagesDialog();
    setTab('blog');
    openBlogEntryDialog();
    setBlogEntryType('imagen');
    showBlogImages(images);
    applyBlogImageDateTime(images[0]);
    if (suggestedDescription && $('#blog-descripcion')) $('#blog-descripcion').value = suggestedDescription;
    scheduleActiveBlogEntryDraftSave();
    return;
  }
  if (destination === 'expense-existing' && currentExpenseTarget) {
    closeSharedImagesDialog();
    setTab('gastos');
    await routeSharedExpenseImages(
      currentExpenseTarget.prefix,
      files,
      sharedKind,
      currentExpenseTarget.hasTicket ? ticketAction : 'replace',
      lensOptions
    );
    return;
  }
  applySelectedTrip(tripId);
  closeSharedImagesDialog();
  setTab('gastos');
  if (destination === 'expense-new') {
    openAddGasto();
    if (!payload?.fromLens && $('#g-desc')) $('#g-desc').value = suggestedDescription;
    const action = payload?.fromLens && ticketOcrSource('g') ? ticketAction : 'replace';
    await routeSharedExpenseImages('g', files, sharedKind, action, lensOptions);
    return;
  }
  const gasto = state.gastos.find(item => Number(item.id) === expenseId && Number(item.viajeId) === tripId);
  if (!gasto) throw new Error('Elige un gasto existente.');
  openEditGasto(gasto);
  await routeSharedExpenseImages('edit-gasto', files, sharedKind, gasto.ticketData ? ticketAction : 'replace', lensOptions);
}

async function consumeSharedContentId(id) {
  const sharedId = String(id || '').trim();
  if (!sharedId || consumedSharedContentIds.has(sharedId)) return;
  if (sharedContentConsumptionPromises.has(sharedId)) return sharedContentConsumptionPromises.get(sharedId);
  const consumption = (async () => {
    const metadataUrl = new URL(`./__shared/${encodeURIComponent(sharedId)}/metadata.json`, window.location.href).href;
    const response = await fetch(metadataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('El contenido compartido ya no está disponible. Vuelve a compartirlo desde la aplicación de origen.');
    const metadata = await response.json();
    const descriptors = Array.isArray(metadata.files) ? metadata.files : [];
    const files = await Promise.all(descriptors.map(async (descriptor, index) => {
      const fileResponse = await fetch(descriptor.url, { cache: 'no-store' });
      if (!fileResponse.ok) throw new Error(`No se pudo recuperar la imagen ${index + 1}.`);
      const blob = await fileResponse.blob();
      return new File([blob], descriptor.name || `imagen-${index + 1}.jpg`, {
        type: descriptor.type || blob.type || 'image/jpeg',
        lastModified: Number(descriptor.lastModified || Date.now())
      });
    }));
    if (!files.length && !sharedPayloadText(metadata)) throw new Error('No se recibió contenido compatible.');
    await openSharedImagesDialog({ ...metadata, files });
    consumedSharedContentIds.add(sharedId);
    await deleteSharedLaunchCache(metadataUrl, descriptors);
  })();
  sharedContentConsumptionPromises.set(sharedId, consumption);
  try {
    await consumption;
  } finally {
    sharedContentConsumptionPromises.delete(sharedId);
  }
}

let sharedContentRecoveryPromise = null;
async function recoverPendingSharedContent() {
  if (!sharedContentAppReady || !('caches' in window)) return;
  if (sharedContentRecoveryPromise) return sharedContentRecoveryPromise;
  sharedContentRecoveryPromise = (async () => {
    const cache = await caches.open(SHARED_FILES_CACHE);
    const requests = await cache.keys();
    requests
      .map(request => {
        const match = new URL(request.url).pathname.match(/\/__shared\/([^/]+)\/metadata\.json$/);
        return match ? decodeURIComponent(match[1]) : '';
      })
      .filter(Boolean)
      .forEach(id => {
        const target = new URL('./index.html', window.location.href);
        target.searchParams.set('shared', id);
        queueSharedLaunchTarget(target.href);
      });
  })().finally(() => {
    sharedContentRecoveryPromise = null;
  });
  return sharedContentRecoveryPromise;
}

function scheduleSharedContentRecovery() {
  if (!sharedContentAppReady) return;
  const generation = ++sharedContentRecoveryGeneration;
  [0, 150, 500, 1200, 2500].forEach(delay => {
    window.setTimeout(() => {
      if (generation !== sharedContentRecoveryGeneration || document.visibilityState === 'hidden') return;
      recoverPendingSharedContent().catch(error => {
        console.warn('No se pudo recuperar todavía el contenido compartido', error);
      });
    }, delay);
  });
}

async function consumeSharedImagesLaunch(targetUrl = window.location.href) {
  const url = new URL(String(targetUrl || window.location.href), window.location.href);
  const errorCode = url.searchParams.get('shared_error');
  const id = url.searchParams.get('shared');
  if (!id && !errorCode) return;
  replaceSharedLaunchQuery();
  if (errorCode) {
    alert('No se recibió contenido compatible desde Android.');
    return;
  }
  await consumeSharedContentId(id);
}

function queueSharedLaunchTarget(targetUrl) {
  const value = String(targetUrl || '').trim();
  if (!value) return;
  pendingSharedLaunchTargets.push(value);
  if (!sharedContentAppReady) return;
  sharedLaunchDrainPromise = sharedLaunchDrainPromise.then(async () => {
    while (pendingSharedLaunchTargets.length) {
      const target = pendingSharedLaunchTargets.shift();
      try {
        await consumeSharedImagesLaunch(target);
      } catch (error) {
        alert(error.message || String(error));
      }
    }
  });
}

if ('launchQueue' in window && typeof window.launchQueue.setConsumer === 'function') {
  window.launchQueue.setConsumer(params => {
    if (params?.targetURL) queueSharedLaunchTarget(params.targetURL);
  });
}

if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type !== 'SHARED_CONTENT_READY' || !event.data.id) return;
    const target = new URL('./index.html', window.location.href);
    target.searchParams.set('shared', event.data.id);
    queueSharedLaunchTarget(target.href);
    scheduleSharedContentRecovery();
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleSharedContentRecovery();
});
window.addEventListener('focus', scheduleSharedContentRecovery);
window.addEventListener('pageshow', scheduleSharedContentRecovery);

function assignBlogEntryImages(values, image, galleryImages = []) {
  Object.assign(values, {
    imageName: image ? image.name : '',
    imageType: image ? image.type : '',
    imageSize: image ? image.size : 0,
    imageData: image ? image.data : '',
    imageRef: image ? image.fileRef || '' : '',
    imageWidth: image ? image.width : 0,
    imageHeight: image ? image.height : 0,
    imageId: image ? image.id || '' : '',
    imageLatitude: image ? image.latitude : null,
    imageLongitude: image ? image.longitude : null,
    imageLocationSource: image ? image.locationSource || '' : '',
    imagePhotoTypeId: image ? image.photoTypeId || '' : '',
    imagePhotoTypeName: image ? photoTypeLabel(image) : '',
    imageMapEnabled: Boolean(image && image.mapEnabled === true),
    galleryImages: galleryImages.map(normalizeBlogImageRecord)
  });
}

async function saveBlogEntryForm() {
  const trip = selectedBlogTrip();
  if (!trip) throw new Error('El viaje seleccionado ha cambiado');
  const type = activeBlogEntryType;
  const transport = type === 'punto' ? selectedBlogPointTransport() : '';
  const description = String($('#blog-descripcion').value || '').trim() || blogPointTransportLabel(transport);
  if (!description) throw new Error(type === 'punto'
    ? 'Escribe una descripción o marca un medio de transporte'
    : 'Escribe una descripción');
  const current = activeBlogEntryId ? state.blogEntries.find(entry => Number(entry.id) === activeBlogEntryId) : null;
  const blogEntryAnchor = current
    ? (activeBlogEntryAnchor || captureBlogEntryAnchor(current.id))
    : null;
  const enRuta = type !== 'gasto' && Boolean($('#blog-en-route') && $('#blog-en-route').checked);
  const cityValue = $('#blog-ciudad').value;
  const values = {
    viajeId: trip.id,
    fecha: $('#blog-fecha').value || currentLocalDate(),
    hora: $('#blog-hora').value || currentLocalTime(),
    tipo: type,
    descripcion: description,
    paisId: $('#blog-pais').value || null,
    ciudadId: cityValue && cityValue !== BLOG_TRANSIT_CITY_VALUE ? cityValue : null,
    enTransito: cityValue === BLOG_TRANSIT_CITY_VALUE,
    enRuta,
    transporte: type === 'punto' ? transport : '',
    latitude: null,
    longitude: null,
    wordpressIncluded: Boolean($('#blog-wordpress') && $('#blog-wordpress').checked),
    featuredImage: type === 'imagen' && Boolean($('#blog-featured') && $('#blog-featured').checked)
  };
  if (['texto', 'imagen'].includes(type)) {
    values.texto = $('#blog-texto').value;
  }
  if (type === 'texto') {
    if (!String(values.texto).trim()) throw new Error('Escribe el texto de la entrada');
    if (enRuta) {
      const point = blogPointFieldCoordinates();
      if (!point) throw new Error('Añade manualmente una ubicación antes de marcar el texto «En ruta».');
      values.latitude = point.latitude;
      values.longitude = point.longitude;
    }
  }
  if (type === 'imagen') {
    if (!activeBlogImage) throw new Error('Selecciona una imagen, una galería o usa la cámara');
    if (!activeBlogImage.id) {
      activeBlogImage.id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    }
    assignBlogEntryImages(values, activeBlogImage, activeBlogGalleryImages);
    if (enRuta) {
      const locatedImage = [activeBlogImage, ...activeBlogGalleryImages].find(image => storedImageCoordinates(image));
      const manualPoint = blogManualRouteLocationOpen ? blogPointFieldCoordinates() : null;
      const point = manualPoint || (locatedImage ? storedImageCoordinates(locatedImage) : null);
      if (!point) throw new Error('La imagen no tiene GPS. Añade manualmente una ubicación antes de marcarla «En ruta».');
      values.latitude = point.latitude;
      values.longitude = point.longitude;
      if (manualPoint) {
        values.imageLatitude = manualPoint.latitude;
        values.imageLongitude = manualPoint.longitude;
        values.imageLocationSource = 'manual';
      }
    }
    if (values.featuredImage) values.wordpressIncluded = true;
    const previousFeatured = values.featuredImage ? state.blogEntries.find(entry =>
      entry.tipo === 'imagen' && entry.featuredImage &&
      Number(entry.viajeId) === Number(trip.id) && entry.fecha === values.fecha &&
      Number(entry.id) !== Number(current && current.id)
    ) : null;
    if (previousFeatured) {
      if (!confirm('Ya existe una imagen destacada para este día. ¿Quieres sustituirla y conservar la anterior como imagen normal?')) {
        throw new Error('Se mantiene la imagen destacada anterior.');
      }
      await updateBlogEntry(previousFeatured.id, { featuredImage: false });
    }
  }
  if (type === 'gasto') {
    assignBlogEntryImages(values, activeBlogImage, activeBlogGalleryImages);
  }
  if (type === 'punto') {
    const point = blogPointFieldCoordinates();
    if (!point) throw new Error('Marca un punto válido en el mapa');
    const duplicate = state.blogEntries.find(entry =>
      entry.tipo === 'punto' &&
      Number(entry.viajeId) === Number(trip.id) &&
      Number(entry.id) !== Number(current && current.id) &&
      geographicDistanceMeters(entry, point) < 30
    );
    const duplicatePoint = duplicate ? blogPointCoordinates(duplicate) : null;
    if (duplicate && duplicatePoint) {
      const distance = Math.max(0, Math.round(geographicDistanceMeters(duplicate, point)));
      const useExisting = confirm(`Ya existe el punto «${duplicate.descripcion}» a ${distance} m. ¿Quieres usar esa misma ubicación para esta entrada?`);
      if (!useExisting) throw new Error('No se ha guardado. Marca otra ubicación o acepta usar el punto existente.');
    }
    values.latitude = duplicatePoint ? duplicatePoint.latitude : point.latitude;
    values.longitude = duplicatePoint ? duplicatePoint.longitude : point.longitude;
    values.notas = String($('#blog-point-notes') ? $('#blog-point-notes').value : '').trim();
    if (activeBlogImage) {
      const pointImages = [activeBlogImage, ...activeBlogGalleryImages].map(image => (
        storedImageCoordinates(image)
          ? normalizeBlogImageRecord(image)
          : normalizeBlogImageRecord({
            ...image,
            latitude: values.latitude,
            longitude: values.longitude,
            locationSource: 'manual'
          })
      ));
      activeBlogImage = pointImages[0];
      activeBlogGalleryImages = pointImages.slice(1);
      assignBlogEntryImages(values, activeBlogImage, activeBlogGalleryImages);
    } else {
      assignBlogEntryImages(values, null, []);
    }
  }
  if (current) {
    if (type === 'gasto') {
      Object.assign(values, {
        sourceGastoId: current.sourceGastoId,
        gastoImporte: current.gastoImporte,
        gastoMoneda: current.gastoMoneda,
        gastoImporteEur: current.gastoImporteEur
      });
    }
    await updateBlogEntry(current.id, values);
  } else {
    await addBlogEntry(values);
    clearFormDraft(blogEntryDraftKey(trip.id));
  }
  closeBlogEntryDialog();
  await loadAll();
  setTab('blog', { blogEntryAnchor });
}

function expenseBlogDescription(gasto) {
  if (String(gasto.desc || '').trim()) return String(gasto.desc).trim();
  const category = state.categorias.find(item => Number(item.id) === Number(gasto.subcatId || gasto.catId));
  return category ? category.nombre : 'Gasto';
}

function expenseBlogTime(gasto) {
  return expenseTimeValue(gasto) || currentLocalTime();
}

function chooseExpenseBlogReplacement() {
  const dialog = $('#expense-blog-replace-dialog');
  if (!dialog) {
    return Promise.resolve(confirm('Este gasto ya existe en el blog. ¿Quieres reemplazar sus datos manteniendo la fecha y hora editadas en el blog?') ? 'keep-date' : 'cancel');
  }
  return new Promise(resolve => {
    const keepButton = $('#expense-blog-replace-keep');
    const replaceAllButton = $('#expense-blog-replace-all');
    const cancelButton = $('#expense-blog-replace-cancel');
    let resolved = false;
    const finish = value => {
      if (resolved) return;
      resolved = true;
      if (keepButton) keepButton.onclick = null;
      if (replaceAllButton) replaceAllButton.onclick = null;
      if (cancelButton) cancelButton.onclick = null;
      dialog.oncancel = null;
      if (dialog.close) dialog.close();
      else dialog.removeAttribute('open');
      resolve(value);
    };
    if (keepButton) keepButton.onclick = () => finish('keep-date');
    if (replaceAllButton) replaceAllButton.onclick = () => finish('replace-all');
    if (cancelButton) cancelButton.onclick = () => finish('cancel');
    dialog.oncancel = event => {
      event.preventDefault();
      finish('cancel');
    };
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', 'open');
  });
}

async function addExpenseToBlog(gasto, options = {}) {
  if (!gasto.viajeId) throw new Error('Este gasto no pertenece a ningún viaje');
  const existing = state.blogEntries.find(entry => entry.tipo === 'gasto' && Number(entry.sourceGastoId) === Number(gasto.id));
  const replacementMode = existing ? await chooseExpenseBlogReplacement() : 'replace-all';
  if (replacementMode === 'cancel') return false;
  const wordpressIncluded = confirm('¿Quieres incluir este gasto en el post de WordPress correspondiente a ese día?');
  const snapshot = {
    viajeId: Number(gasto.viajeId),
    tipo: 'gasto',
    descripcion: expenseBlogDescription(gasto),
    paisId: gasto.paisId || null,
    ciudadId: gasto.ciudadId || null,
    enTransito: false,
    sourceGastoId: Number(gasto.id),
    gastoImporte: numberValue(gasto.importe),
    gastoMoneda: gasto.moneda || 'EUR',
    gastoImporteEur: toEur(gasto.importe, gasto.moneda),
    galleryImages: (await expenseBlogImages(gasto)).map(image => normalizeBlogImageRecord({ ...image })),
    wordpressIncluded,
    featuredImage: false
  };
  if (existing) {
    await updateBlogEntry(existing.id, {
      ...snapshot,
      fecha: replacementMode === 'keep-date' ? existing.fecha : gasto.fecha || currentLocalDate(),
      hora: replacementMode === 'keep-date' ? existing.hora : expenseBlogTime(gasto)
    });
  } else {
    await addBlogEntry({
      ...snapshot,
      fecha: gasto.fecha || currentLocalDate(),
      hora: expenseBlogTime(gasto)
    });
  }
  setSelectedTrips([Number(gasto.viajeId)]);
  await loadAll();
  setTab('gastos', {
    expenseId: gasto.id,
    expenseActionAnchor: options.expenseActionAnchor || null
  });
  return true;
}

function blogPrintImageClasses(image, context = '') {
  const orientation = Number(image.width) > Number(image.height) ? 'landscape' : 'portrait';
  const identity = normalizePlaceName([
    image.id,
    image.name,
    image.photoTypeName,
    photoTypeLabel(image),
    context
  ].filter(Boolean).join(' '));
  const ticketDocument = String(image.id || '').startsWith('expense-ticket-')
    || /\b(ticket|factura|recibo|justificante)\b/.test(identity);
  const importantTicket = ticketDocument && /\b(tren|ave|renfe|ferrocarril|avion|vuelo|aerolinea|boarding|embarque|hotel|hostal|alojamiento|apartamento|apartahotel|pension|camping|booking|reserva)\b/.test(identity);
  return `${orientation}${ticketDocument ? ' ticket-document' : ''}${importantTicket ? ' important-ticket' : ticketDocument ? ' minor-ticket' : ''}`;
}

function blogPrintImagesHtml(images, description) {
  const normalized = (images || []).map(normalizeBlogImageRecord).filter(image => image.data);
  if (!normalized.length) return '';
  if (normalized.length === 1) {
    const image = normalized[0];
    const imageClass = blogPrintImageClasses(image, description);
    return `<img class="blog-print-image ${imageClass}" src="${escapeHtml(image.data)}" alt="${escapeHtml(description || 'Imagen')}" data-blog-lightbox="1">`;
  }
  const countClass = normalized.length === 2 ? ' count-2' : normalized.length === 3 ? ' count-3' : ' count-4-plus';
  return `<div class="blog-print-gallery${countClass}">${normalized.map(image => {
    const imageClass = blogPrintImageClasses(image, description);
    return `<figure><img class="blog-print-image ${imageClass}" src="${escapeHtml(image.data)}" alt="${escapeHtml(description || 'Imagen')}" data-blog-lightbox="1"></figure>`;
  }).join('')}</div>`;
}

function blogPrintEntryHtml(entry, options = {}) {
  const place = [blogPlaceName(entry.paisId), blogEntryCityName(entry)].filter(value => value && value !== '-').join(' · ');
  const price = entry.tipo === 'gasto' ? fmtCurrency(entry.gastoImporte, entry.gastoMoneda || 'EUR') : '';
  const text = ['texto', 'imagen'].includes(entry.tipo) && entry.texto
    ? `<div class="blog-print-text">${escapeHtml(entry.texto).replace(/\r?\n/g, '<br>')}</div>`
    : '';
  const images = blogEntryImages(entry).slice(options.skipFirstImage ? 1 : 0);
  const image = blogPrintImagesHtml(images, entry.descripcion);
  const pointUrl = entry.tipo === 'punto' ? blogPointMapUrl(entry) : '';
  const point = blogPointCoordinates(entry);
  const pointHtml = point && pointUrl
    ? `<div class="blog-print-point"><strong>📍 ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}</strong>${entry.tipo === 'punto' && entry.notas ? `<p>${escapeHtml(entry.notas).replace(/\r?\n/g, '<br>')}</p>` : ''}<a href="${escapeHtml(pointUrl)}">Abrir en OpenStreetMap</a></div>`
    : '';
  return `<article class="blog-print-entry">
    <div class="blog-print-entry-heading">
      <div class="blog-print-meta"><strong>${summaryDocumentDate(entry.fecha, true)} · ${escapeHtml(entry.hora || '')}</strong><span>${escapeHtml(place)}</span><span>${escapeHtml(blogTypeLabel(entry.tipo))}${price ? ` · ${price}` : ''}</span></div>
      <h2>${escapeHtml(entry.descripcion || '')}</h2>
    </div>
    ${text}${image}${pointHtml}
  </article>`;
}

function blogMapSizeControlsHtml() {
  return `<div class="blog-map-size-controls" role="group" aria-label="Tamaño del mapa">
    <button type="button" data-blog-map-size="out" aria-label="Reducir mapa">−</button>
    <button type="button" data-blog-map-size="fit">Ajustar</button>
    <span data-blog-map-size-label>100%</span>
    <button type="button" data-blog-map-size="in" aria-label="Ampliar mapa">+</button>
  </div>`;
}

function blogPrintFeaturedHtml(entry) {
  const image = entry ? blogEntryImages(entry)[0] : null;
  if (!image || !image.data) return '';
  const imageClass = blogPrintImageClasses(image, entry.descripcion);
  const dailyMap = String(entry.dailyMapDate || '') === String(entry.fecha || '');
  return `<figure class="blog-print-featured${dailyMap ? ' daily-map' : ''}"${dailyMap ? ' data-blog-map-resizable="1"' : ''}>
    ${dailyMap ? blogMapSizeControlsHtml() : ''}
    <img class="blog-print-image ${imageClass}" src="${escapeHtml(image.data)}" alt="${escapeHtml(entry.descripcion || 'Imagen destacada')}" data-blog-lightbox="1">
    <figcaption>${escapeHtml(entry.descripcion || '')}</figcaption>
  </figure>`;
}

function blogPrintDayHtml(group) {
  const dailyMap = group.entries.find(entry =>
    entry.tipo === 'imagen'
    && String(entry.dailyMapDate || '') === String(group.date || '')
    && blogEntryImages(entry).length
  ) || null;
  const featured = dailyMap || group.entries.find(entry => entry.tipo === 'imagen' && entry.featuredImage && blogEntryImages(entry).length) || null;
  const timeline = group.entries.filter(entry => !featured || Number(entry.id) !== Number(featured.id) || blogEntryImages(entry).length > 1);
  const imageCount = group.entries.reduce((total, entry) => total + blogEntryImages(entry).length, 0);
  const compact = group.entries.length >= 4 || imageCount >= 3;
  return `<section class="blog-print-day${compact ? ' compact' : ''}">
    <h1>${escapeHtml(blogDayHeading(group.date, group.entries))}</h1>
    ${blogPrintFeaturedHtml(featured)}
    ${timeline.map(entry => blogPrintEntryHtml(entry, { skipFirstImage: Boolean(featured && Number(entry.id) === Number(featured.id)) })).join('')}
  </section>`;
}

function isTripOverviewBlogEntry(entry, trip) {
  if (!entry || !String(entry.dailyMapDate || '').startsWith('trip-overview:')) return false;
  return !trip || String(entry.dailyMapDate) === `trip-overview:${trip.id}`;
}

function blogPrintOverviewHtml(entry, trip) {
  const image = entry ? blogEntryImages(entry)[0] : null;
  if (!image || !image.data) return '';
  const routeIds = tripCityIds(trip);
  const arrivalDates = tripRouteArrivalDates(trip, routeIds);
  const stops = routeIds.map((id, index) => ({
    city: state.lugares.find(item => Number(item.id) === Number(id)) || null,
    number: index + 1,
    arrivalDate: arrivalDates[index] || ''
  })).filter(stop => stop.city);
  const expectedSourceHeight = 86 + TRIP_MAP_HEIGHT + 48 + stops.length * 24 + 18;
  const layout = window.TripMapModel.createOverviewPrintLayout({
    sourceWidth: Number(image.width) || TRIP_MAP_WIDTH,
    sourceHeight: Number(image.height) || expectedSourceHeight,
    mapTop: 86,
    mapHeight: TRIP_MAP_HEIGHT
  });
  const dateRange = [trip.fechaInicio, trip.fechaFin]
    .filter(Boolean)
    .map(date => summaryDocumentDate(date, true))
    .join(' — ');
  const stopList = stops.map(stop => `<li><span><strong>${stop.number}.</strong> ${escapeHtml(stop.city.nombre)}</span><time>${escapeHtml(stop.arrivalDate ? summaryDocumentDate(stop.arrivalDate, true) : 'Fecha no disponible')}</time></li>`).join('');
  return `<section class="blog-print-overview" data-blog-map-resizable="1" aria-label="Mapa general de ${escapeHtml(trip.nombre || 'viaje')}">
    <header><h1>${escapeHtml(trip.nombre || 'Viaje')}</h1><p>${escapeHtml(dateRange || 'Fechas no indicadas')}</p></header>
    ${blogMapSizeControlsHtml()}
    <div class="blog-print-overview-map" style="aspect-ratio:${layout.frameAspectRatio};--overview-map-offset:-${layout.imageOffsetPercent.toFixed(6)}%">
      <img src="${escapeHtml(image.data)}" alt="Mapa general de ${escapeHtml(trip.nombre || 'viaje')}">
    </div>
    <div class="blog-print-overview-list"><h2>Ciudades visitadas</h2><ol>${stopList}</ol></div>
  </section>`;
}

function blogPrintPreparationDayHtml(group, index) {
  const placeNames = [...new Set(group.entries.flatMap(entry => [blogEntryCityName(entry), blogPlaceName(entry.paisId)]).filter(name => name && name !== '-'))];
  return `<div class="blog-print-preparation-day${index ? ' separated' : ''}">
    <h2>${escapeHtml(blogDayDateLabel(group.date))}${placeNames.length ? ` — ${escapeHtml(placeNames.join(' / '))}` : ''}</h2>
    ${group.entries.map(entry => blogPrintEntryHtml(entry)).join('')}
  </div>`;
}

function blogPrintPreparationsHtml(entries) {
  const groups = groupBlogEntriesByDay(entries);
  return `<section class="blog-print-preparations">
    <h1>Preparativos Viaje</h1>
    ${groups.length ? groups.map(blogPrintPreparationDayHtml).join('') : '<p class="blog-print-empty">No hay anotaciones anteriores al inicio del viaje.</p>'}
  </section>`;
}

function blogPrintBodyHtml(trip, entries, options = {}) {
  const overviewEntries = Array.isArray(options.overviewEntries) ? options.overviewEntries : entries;
  const overview = overviewEntries.find(entry => isTripOverviewBlogEntry(entry, trip)) || null;
  const timeline = entries.filter(entry => !isTripOverviewBlogEntry(entry, trip));
  const preparations = trip.fechaInicio ? timeline.filter(entry => String(entry.fecha || '') < trip.fechaInicio) : [];
  const travelEntries = trip.fechaInicio ? timeline.filter(entry => String(entry.fecha || '') >= trip.fechaInicio) : timeline;
  return [
    blogPrintOverviewHtml(overview, trip),
    preparations.length ? blogPrintPreparationsHtml(preparations) : '',
    groupBlogEntriesByDay(travelEntries).map(blogPrintDayHtml).join('')
  ].filter(Boolean).join('');
}

function wordpressExportEntry(entry, trip) {
  const images = blogEntryImages(entry).map((image, index) => ({
    sourceKey: `${slugFilePart(trip.nombre)}-${entry.fecha}-${entry.id}-image-${index + 1}-${image.name || 'imagen'}-${image.size || 0}`,
    imageName: image.name || `imagen-${index + 1}.jpg`,
    imageType: image.type || 'image/jpeg',
    imageSize: Number(image.size || 0),
    imageData: image.data || '',
    imageWidth: Number(image.width || 0),
    imageHeight: Number(image.height || 0),
    descripcion: entry.descripcion || ''
  }));
  const primaryImage = images[0] || {};
  const imageKey = images.length
    ? `${entry.id}-${images.map(image => `${image.imageName}-${image.imageSize}`).join('-')}`
    : `${entry.id}-${entry.updatedAt || entry.createdAt || ''}`;
  return {
    sourceKey: `${slugFilePart(trip.nombre)}-${entry.fecha}-${imageKey}`,
    id: entry.id,
    fecha: entry.fecha,
    hora: entry.hora || '',
    tipo: entry.tipo,
    descripcion: entry.descripcion || '',
    pais: blogPlaceName(entry.paisId) === '-' ? '' : blogPlaceName(entry.paisId),
    ciudad: blogEntryCityName(entry) === '-' ? '' : blogEntryCityName(entry),
    texto: entry.tipo === 'punto' ? entry.notas || '' : entry.texto || '',
    notas: entry.tipo === 'punto' ? entry.notas || '' : '',
    gastoImporte: numberValue(entry.gastoImporte),
    gastoMoneda: entry.gastoMoneda || 'EUR',
    imageName: primaryImage.imageName || '',
    imageType: primaryImage.imageType || '',
    imageSize: primaryImage.imageSize || 0,
    imageData: primaryImage.imageData || '',
    imageWidth: primaryImage.imageWidth || 0,
    imageHeight: primaryImage.imageHeight || 0,
    images,
    latitude: entry.tipo === 'punto' ? blogPointCoordinate(entry.latitude, -90, 90) : null,
    longitude: entry.tipo === 'punto' ? blogPointCoordinate(entry.longitude, -180, 180) : null,
    mapUrl: entry.tipo === 'punto' ? blogPointMapUrl(entry) : '',
    featuredImage: Boolean(entry.tipo === 'imagen' && entry.featuredImage)
  };
}

function wordpressDayGroups(trip) {
  return groupBlogEntriesByDay(blogEntriesForTrip(trip.id).filter(entry => entry.wordpressIncluded !== false));
}

function renderWordPressExportDays(trip) {
  const container = $('#wordpress-export-days');
  if (!container) return;
  const groups = wordpressDayGroups(trip);
  if (!groups.length) {
    container.innerHTML = '<p class="small">No hay entradas marcadas para WordPress.</p>';
    return;
  }
  container.innerHTML = groups.map(group => {
    const featured = group.entries.find(entry => entry.tipo === 'imagen' && entry.featuredImage);
    const title = blogDayHeading(group.date, group.entries);
    return `<div class="wordpress-export-day">
      <label class="check-option"><input type="checkbox" data-wordpress-day="${escapeHtml(group.date)}" checked> Exportar este día</label>
      <label>Título del post<input data-wordpress-title="${escapeHtml(group.date)}" value="${escapeHtml(title)}"></label>
      <p class="small">${group.entries.length} entrada(s) · ${featured ? `Imagen destacada: ${escapeHtml(featured.descripcion || featured.imageName || 'Imagen')}` : 'Sin imagen destacada'}</p>
    </div>`;
  }).join('');
}

function openWordPressExportDialog() {
  const trip = selectedBlogTrip();
  if (!trip) {
    alert('Selecciona exactamente un viaje para exportarlo a WordPress.');
    return;
  }
  if ($('#wordpress-export-title')) $('#wordpress-export-title').textContent = `Exportar a WordPress · ${trip.nombre}`;
  renderWordPressExportDays(trip);
  const dialog = $('#wordpress-export-dialog');
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeWordPressExportDialog() {
  const dialog = $('#wordpress-export-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function exportBlogToWordPress() {
  const trip = selectedBlogTrip();
  if (!trip) throw new Error('El viaje seleccionado ha cambiado');
  const selectedDates = new Set($$('[data-wordpress-day]:checked').map(field => field.dataset.wordpressDay));
  const groups = wordpressDayGroups(trip).filter(group => selectedDates.has(group.date));
  if (!groups.length) throw new Error('Selecciona al menos un día para exportar');
  const titleByDate = new Map($$('[data-wordpress-title]').map(field => [field.dataset.wordpressTitle, String(field.value || '').trim()]));
  const payload = {
    format: 'gastos-viaje-wordpress-v1',
    appVersion: APP_VERSION,
    generatedAt: new Date().toISOString(),
    trip: {
      sourceKey: slugFilePart(trip.nombre),
      nombre: trip.nombre,
      fechaInicio: trip.fechaInicio || '',
      fechaFin: trip.fechaFin || ''
    },
    days: groups.map(group => ({
      sourceKey: `${slugFilePart(trip.nombre)}-${group.date}`,
      date: group.date,
      title: titleByDate.get(group.date) || blogDayHeading(group.date, group.entries),
      countries: [...new Set(group.entries.map(entry => blogPlaceName(entry.paisId)).filter(value => value && value !== '-'))],
      cities: [...new Set(group.entries.map(blogEntryCityName).filter(value => value && value !== '-'))],
      entries: group.entries.map(entry => wordpressExportEntry(entry, trip))
    }))
  };
  downloadText(
    `wordpress-${slugFilePart(trip.nombre)}-${currentLocalDate()}.json`,
    JSON.stringify(payload),
    'application/json;charset=utf-8'
  );
  closeWordPressExportDialog();
}

function openBlogPdfGuide(day = '') {
  const trip = selectedBlogTrip();
  if (!trip) {
    alert('Selecciona exactamente un viaje para guardar su blog en PDF.');
    return;
  }
  pendingBlogPdfDay = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? String(day) : '';
  if ($('#blog-pdf-guide-title')) {
    $('#blog-pdf-guide-title').textContent = pendingBlogPdfDay
      ? `PDF del ${blogDayDateLabel(pendingBlogPdfDay)}`
      : 'Vista HTML y PDF del Blog';
  }
  if ($('#blog-pdf-guide-scope')) {
    $('#blog-pdf-guide-scope').textContent = pendingBlogPdfDay
      ? 'Se incluirán únicamente las entradas de este día, sin la portada general ni otros días.'
      : 'Se incluirán las entradas que coinciden con los filtros actuales del Blog.';
  }
  const dialog = $('#blog-pdf-guide-dialog');
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeBlogPdfGuide() {
  pendingBlogPdfDay = '';
  const dialog = $('#blog-pdf-guide-dialog');
  if (!dialog) return;
  if (dialog.open && dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function continueBlogPdf() {
  const day = pendingBlogPdfDay;
  closeBlogPdfGuide();
  setTimeout(() => printBlog({ day }), 0);
}

function printBlog(options = {}) {
  const trip = selectedBlogTrip();
  if (!trip) {
    alert('Selecciona exactamente un viaje para ver su blog.');
    return;
  }
  const allEntries = blogEntriesForTrip(trip.id);
  if (!allEntries.length) {
    alert('Este viaje todavía no tiene entradas en el blog.');
    return;
  }
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(options.day || '')) ? String(options.day) : '';
  const entries = day
    ? allEntries.filter(entry => entry.fecha === day && !isTripOverviewBlogEntry(entry, trip))
    : filteredBlogEntries(allEntries);
  if (!entries.length) {
    alert('No hay entradas del Blog que coincidan con los filtros seleccionados.');
    return;
  }
  const body = blogPrintBodyHtml(trip, entries, { overviewEntries: day ? [] : allEntries });
  const htmlFileName = `blog-${slugFilePart(trip.nombre)}-${day || currentLocalDate()}.html`;
  const documentTitle = day ? `Blog · ${trip.nombre} · ${blogDayDateLabel(day)}` : `Blog · ${trip.nombre}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(documentTitle)}</title><style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color: #1f2937; }
    h1 { margin: 0 0 6mm; font-size: 22px; }
    h2 { margin: 3mm 0; font-size: 16px; }
    .blog-print-overview { display: block; width: 100%; break-after: page; page-break-after: always; }
    .blog-print-overview > header { margin-bottom: 5mm; }
    .blog-print-overview > header h1 { margin-bottom: 1mm; }
    .blog-print-overview > header p { margin: 0; color: #64748b; font-size: 12px; }
    .blog-print-overview-map { position: relative; width: 100%; overflow: auto; background: #cfe8f3; }
    .blog-print-overview-map img { display: block; width: var(--blog-map-size, 100%); max-width: none; height: auto; transform: translateY(var(--overview-map-offset)); transform-origin: top left; }
    .blog-print-overview-list { margin-top: 5mm; padding-top: 4mm; border-top: 1px solid #94a3b8; }
    .blog-print-overview-list h2 { margin: 0 0 2mm; }
    .blog-print-overview-list ol { margin: 0; padding: 0; list-style: none; }
    .blog-print-overview-list li { display: flex; justify-content: space-between; gap: 8mm; padding: 0.8mm 1mm; font-size: 11px; line-height: 1.25; }
    .blog-print-overview-list time { flex: 0 0 auto; color: #475569; }
    .blog-print-preparations { margin-bottom: 8mm; }
    .blog-print-preparation-day { padding-top: 1mm; }
    .blog-print-preparation-day.separated { margin-top: 5mm; padding-top: 6mm; border-top: 1px solid #94a3b8; }
    .blog-print-preparations .blog-print-entry { padding-bottom: 4mm; margin-bottom: 4mm; border-bottom: 0; }
    .blog-print-empty { color: #64748b; font-style: italic; }
    .blog-print-day { break-before: page; page-break-before: always; }
    .blog-print-day + .blog-print-day { margin-top: 0; padding-top: 0; border-top: 0; }
    .blog-print-day > h1 { break-after: avoid-page; page-break-after: avoid; }
    .blog-print-entry { break-inside: auto; page-break-inside: auto; padding: 0 0 4mm; margin: 0 0 4mm; border-bottom: 1px solid #dbe3ef; }
    .blog-print-day.compact .blog-print-entry { padding-bottom: 2.5mm; margin-bottom: 2.5mm; }
    .blog-print-entry-heading { break-inside: avoid; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
    .blog-print-meta { display: flex; flex-wrap: wrap; gap: 3mm 7mm; color: #64748b; font-size: 11px; }
    .blog-print-text { margin-top: 3mm; font-size: 12px; line-height: 1.5; white-space: normal; }
    .blog-print-image { display: block; height: auto; max-height: 205mm; margin: 3mm auto 0; object-fit: contain; break-inside: avoid; page-break-inside: avoid; background: #fff; cursor: zoom-in; }
    .blog-print-image.landscape { width: 62%; }
    .blog-print-image.portrait { width: 28%; min-width: 42mm; }
    .blog-print-day.compact .blog-print-image.landscape { width: 52%; }
    .blog-print-day.compact .blog-print-image.portrait { width: 24%; min-width: 36mm; }
    .blog-print-image.ticket-document { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .blog-print-image.ticket-document.minor-ticket { filter: grayscale(1) contrast(1.06) brightness(1.06); width: 18.5%; min-width: 28mm; }
    .blog-print-day.compact .blog-print-image.ticket-document.minor-ticket { width: 16%; min-width: 24mm; }
    .blog-print-gallery { --gallery-row-height: 23mm; display: grid; width: 90%; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: var(--gallery-row-height); gap: 1mm; align-items: stretch; margin: 3mm auto 0; }
    .blog-print-day.compact .blog-print-gallery { width: 90%; gap: 1mm; }
    .blog-print-gallery.count-2 { --gallery-row-height: 41mm; width: 80%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm; }
    .blog-print-gallery.count-3 { --gallery-row-height: 27mm; width: 80%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2mm; }
    .blog-print-day.compact .blog-print-gallery.count-2,
    .blog-print-day.compact .blog-print-gallery.count-3 { width: 80%; gap: 2mm; }
    .blog-print-gallery figure { display: flex; height: var(--gallery-row-height); align-items: center; justify-content: center; break-inside: avoid; page-break-inside: avoid; margin: 0; overflow: hidden; background: #fff; }
    .blog-print-gallery .blog-print-image,
    .blog-print-day.compact .blog-print-gallery .blog-print-image { width: auto; min-width: 0; max-width: 100%; height: var(--gallery-row-height); max-height: var(--gallery-row-height); margin: 0; object-fit: contain; }
    .blog-print-gallery .blog-print-image.ticket-document.minor-ticket,
    .blog-print-day.compact .blog-print-gallery .blog-print-image.ticket-document.minor-ticket { width: auto; min-width: 0; height: 66.666%; max-height: 66.666%; }
    .blog-print-point { display: flex; flex-wrap: wrap; gap: 3mm 7mm; align-items: center; margin-top: 4mm; padding: 4mm; border: 1px solid #c4b5fd; border-radius: 3mm; background: #f5f3ff; font-size: 11px; }
    .blog-print-point p { flex-basis: 100%; margin: 0; white-space: pre-line; }
    .blog-print-point a { color: #5b21b6; }
    .blog-print-featured { margin: 0 0 8mm; text-align: center; }
    .blog-print-featured .blog-print-image { width: 100%; max-width: 100%; }
    .blog-print-featured .blog-print-image.portrait { width: 80%; max-width: 80%; }
    .blog-print-day.compact .blog-print-featured .blog-print-image { width: 82%; max-width: 82%; }
    .blog-print-day.compact .blog-print-featured .blog-print-image.portrait { width: 64%; max-width: 64%; }
    .blog-print-featured.daily-map .blog-print-image,
    .blog-print-day.compact .blog-print-featured.daily-map .blog-print-image { width: var(--blog-map-size, 100%); max-width: none; }
    .blog-print-featured.daily-map { overflow-x: auto; }
    .blog-print-featured figcaption { margin-top: 2mm; color: #64748b; font-size: 11px; }
    .blog-map-size-controls { position: sticky; z-index: 2; left: 0; display: flex; width: max-content; align-items: center; gap: 6px; margin: 0 0 8px; padding: 5px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffffee; box-shadow: 0 3px 10px #0f172a1a; }
    .blog-map-size-controls button { min-width: 40px; min-height: 38px; padding: 5px 10px; border: 1px solid #b9c8da; border-radius: 6px; color: #173d63; background: #eef5ff; font: inherit; font-weight: 700; }
    .blog-map-size-controls span { min-width: 46px; color: #475569; text-align: center; font-size: 12px; font-weight: 700; }
    .blog-preview-toolbar { position: sticky; z-index: 10; top: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: -8mm -8mm 8mm; padding: 10px; border-bottom: 1px solid #cbd5e1; background: #ffffffee; box-shadow: 0 4px 14px #0f172a1f; }
    .blog-preview-toolbar button { min-height: 42px; padding: 8px 12px; border: 1px solid #b9c8da; border-radius: 6px; color: #173d63; background: #eef5ff; font: inherit; font-weight: 650; }
    .blog-preview-toolbar button.primary { border-color: #0876c9; color: #fff; background: #0876c9; }
    .blog-preview-status { flex: 1 1 100%; margin: 0; color: #475569; font-size: 12px; }
    .blog-lightbox { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; padding: 18px; background: rgba(15, 23, 42, 0.92); }
    .blog-lightbox[hidden] { display: none; }
    .blog-lightbox img { display: block; max-width: 96vw; max-height: 92vh; width: auto; height: auto; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.55); }
    .blog-lightbox button { position: fixed; top: 14px; right: 14px; width: 44px; height: 44px; border: 0; border-radius: 999px; background: #fff; color: #111827; font-size: 28px; line-height: 1; cursor: pointer; }
    @media screen {
      body { max-width: 210mm; margin: 0 auto; padding: 12mm; }
      .blog-print-overview { margin-bottom: 6mm; padding-bottom: 5mm; border-bottom: 1px solid #94a3b8; }
    }
    @media print { .blog-preview-toolbar, .blog-lightbox, .blog-map-size-controls { display: none !important; } [data-blog-map-resizable] { --blog-map-size: 100% !important; overflow: hidden !important; } .blog-print-image { cursor: default; } }
  </style></head><body><nav class="blog-preview-toolbar" aria-label="Acciones de la vista del Blog">
    <button type="button" class="primary" id="blog-preview-share">Compartir HTML</button>
    <button type="button" id="blog-preview-download">Descargar HTML</button>
    <button type="button" id="blog-preview-print">Imprimir / PDF</button>
    <button type="button" id="blog-preview-close">Cerrar</button>
    <p class="blog-preview-status" id="blog-preview-status">Usa estos botones; el menú de Chrome compartiría solamente about:blank.</p>
  </nav>${body}<div class="blog-lightbox" id="blog-lightbox" hidden><button type="button" id="blog-lightbox-close" aria-label="Cerrar">×</button><img id="blog-lightbox-image" alt=""></div><script data-keep-html="1">
    (function(){
      var lightbox = document.getElementById('blog-lightbox');
      var lightboxImage = document.getElementById('blog-lightbox-image');
      var closeButton = document.getElementById('blog-lightbox-close');
      function closeLightbox(){ lightbox.hidden = true; lightboxImage.removeAttribute('src'); lightboxImage.alt = ''; }
      function resizeMap(button) {
        var container = button.closest('[data-blog-map-resizable]');
        if (!container) return;
        var current = Number(container.dataset.blogMapSize || 100);
        var action = button.getAttribute('data-blog-map-size');
        var next = action === 'fit' ? 100 : Math.max(60, Math.min(200, current + (action === 'in' ? 20 : -20)));
        container.dataset.blogMapSize = String(next);
        container.style.setProperty('--blog-map-size', next + '%');
        var label = container.querySelector('[data-blog-map-size-label]');
        if (label) label.textContent = next + '%';
      }
      document.addEventListener('click', function(event) {
        var target = event.target;
        var mapSizeButton = target && target.closest ? target.closest('[data-blog-map-size]') : null;
        if (mapSizeButton) { resizeMap(mapSizeButton); return; }
        var image = target && target.closest ? target.closest('[data-blog-lightbox]') : null;
        if (image) {
          event.preventDefault();
          lightboxImage.src = image.currentSrc || image.src;
          lightboxImage.alt = image.alt || 'Imagen';
          lightbox.hidden = false;
          return;
        }
        if (event.target === lightbox) closeLightbox();
      });
      closeButton.addEventListener('click', closeLightbox);
      document.addEventListener('keydown', function(event){ if (event.key === 'Escape' && !lightbox.hidden) closeLightbox(); });
    })();
  </script><script>
    var htmlFileName = ${JSON.stringify(htmlFileName)};
    function htmlFileContent(){
      var clone = document.documentElement.cloneNode(true);
      var toolbar = clone.querySelector('.blog-preview-toolbar');
      if(toolbar) toolbar.remove();
      Array.from(clone.querySelectorAll('script:not([data-keep-html])')).forEach(function(script){script.remove();});
      return '<!doctype html>\\n' + clone.outerHTML;
    }
    function createHtmlFile(){return new File([htmlFileContent()],htmlFileName,{type:'text/html'});}
    function downloadHtmlFile(file){
      var url=URL.createObjectURL(file);
      var link=document.createElement('a');
      link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
    }
    async function shareHtmlFile(){
      var file=createHtmlFile();
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        try{await navigator.share({files:[file]});return;}catch(error){if(error && error.name==='AbortError')return;}
      }
      downloadHtmlFile(file);
      document.getElementById('blog-preview-status').textContent='El HTML se ha descargado. Compártelo desde la carpeta Descargas.';
    }
    document.getElementById('blog-preview-share').onclick=shareHtmlFile;
    document.getElementById('blog-preview-download').onclick=function(){downloadHtmlFile(createHtmlFile());document.getElementById('blog-preview-status').textContent='HTML descargado.';};
    document.getElementById('blog-preview-print').onclick=function(){window.print();};
    document.getElementById('blog-preview-close').onclick=function(){window.close();};
    Promise.all(Array.from(document.images).map(function(img){return img.complete ? Promise.resolve() : new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},150);});
  </script></body></html>`;
  const win = window.open('', '_blank');
  if (!win) {
    alert('El navegador ha bloqueado la ventana del PDF. Permite ventanas emergentes.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

async function seedIfEmpty() {
  await seedDefaults();
}

function scrollElementBelowHeader(element, behavior = 'smooth') {
  if (!element) return;
  const header = $('header');
  const headerHeight = header ? header.offsetHeight : 0;
  const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - headerHeight - 12);
  window.scrollTo({ top, behavior });
}

function scrollToSectionStart(id) {
  const view = $(`#view-${id}`);
  if (!view) return;
  requestAnimationFrame(() => {
    scrollElementBelowHeader(view, 'auto');
  });
}

function scrollToExpense(expenseId, behavior = 'auto') {
  const row = $(`#tabla-gastos tbody .expense-row[data-gasto-id="${Number(expenseId)}"]`);
  if (!row) return;
  const groupKey = row.dataset.expenseGroupEntry || '';
  if (row.hidden && groupKey) {
    openExpenseGroups.add(groupKey);
    renderGastosTabla();
    requestAnimationFrame(() => scrollToExpense(expenseId, behavior));
    return;
  }
  scrollElementBelowHeader(row, behavior);
}

function captureExpenseActionAnchor(expenseId) {
  const select = $(`#tabla-gastos tbody .expense-action-select[data-gasto-action="${Number(expenseId)}"]`);
  if (!select) return null;
  return {
    expenseId: Number(expenseId),
    viewportTop: select.getBoundingClientRect().top
  };
}

function restoreExpenseActionAnchor(anchor) {
  const expenseId = Number(anchor && anchor.expenseId);
  const row = $(`#tabla-gastos tbody .expense-row[data-gasto-id="${expenseId}"]`);
  const groupKey = row ? row.dataset.expenseGroupEntry || '' : '';
  if (row && row.hidden && groupKey) {
    openExpenseGroups.add(groupKey);
    renderGastosTabla();
    requestAnimationFrame(() => restoreExpenseActionAnchor(anchor));
    return;
  }
  const select = $(`#tabla-gastos tbody .expense-action-select[data-gasto-action="${expenseId}"]`);
  if (!select) {
    if (expenseId) scrollToExpense(expenseId);
    return;
  }
  const viewportTop = Number(anchor.viewportTop);
  if (Number.isFinite(viewportTop)) {
    const difference = select.getBoundingClientRect().top - viewportTop;
    if (Math.abs(difference) > 1) {
      window.scrollTo({ top: Math.max(0, window.scrollY + difference), behavior: 'auto' });
    }
  }
  select.value = '';
  select.classList.add('expense-action-return');
  row?.classList.add('expense-entry-return');
  try {
    select.focus({ preventScroll: true });
  } catch (_) {
    select.focus();
  }
  window.setTimeout(() => {
    select.classList.remove('expense-action-return');
    row?.classList.remove('expense-entry-return');
  }, 4000);
}

function captureBlogEntryAnchor(entryId) {
  const id = Number(entryId);
  const select = $(`#tabla-blog tbody .blog-action-select[data-blog-action="${id}"]`);
  const row = $(`#tabla-blog tbody .blog-day-entry[data-blog-entry-id="${id}"]`);
  const target = select || row;
  if (!target) return null;
  return {
    entryId: id,
    viewportTop: target.getBoundingClientRect().top,
    scrollY: window.scrollY
  };
}

function restoreBlogEntryAnchor(anchor) {
  const entryId = Number(anchor && anchor.entryId);
  const row = $(`#tabla-blog tbody .blog-day-entry[data-blog-entry-id="${entryId}"]`);
  const select = $(`#tabla-blog tbody .blog-action-select[data-blog-action="${entryId}"]`);
  const target = select || row;
  if (!target) {
    const scrollY = Number(anchor && anchor.scrollY);
    if (Number.isFinite(scrollY)) window.scrollTo({ top: Math.max(0, scrollY), behavior: 'auto' });
    return;
  }
  const viewportTop = Number(anchor && anchor.viewportTop);
  if (Number.isFinite(viewportTop)) {
    const difference = target.getBoundingClientRect().top - viewportTop;
    if (Math.abs(difference) > 1) {
      window.scrollTo({ top: Math.max(0, window.scrollY + difference), behavior: 'auto' });
    }
  }
  if (select) {
    select.value = '';
    select.classList.add('blog-action-return');
    try {
      select.focus({ preventScroll: true });
    } catch (_) {
      select.focus();
    }
  }
  if (row) row.classList.add('blog-entry-return');
  window.setTimeout(() => {
    select?.classList.remove('blog-action-return');
    row?.classList.remove('blog-entry-return');
  }, 4000);
}

function scrollToLastExpense(behavior = 'smooth') {
  const rows = $$('#tabla-gastos tbody .expense-row');
  if (!rows.length) return;
  const target = rows[rows.length - 1];
  const groupKey = target.dataset.expenseGroupEntry || '';
  if (target.hidden && groupKey) {
    openExpenseGroups.add(groupKey);
    renderGastosTabla();
    requestAnimationFrame(() => {
      const refreshedRows = $$('#tabla-gastos tbody .expense-row');
      scrollElementBelowHeader(refreshedRows[refreshedRows.length - 1], behavior);
    });
    return;
  }
  scrollElementBelowHeader(target, behavior);
}

function scrollToLastBlogEntry() {
  const rows = $$('#tabla-blog tbody .blog-day-entry');
  if (!rows.length) return;
  const target = rows[rows.length - 1];
  const date = target.dataset.blogDayEntry || '';
  if (target.hidden && date) {
    openBlogDays.add(date);
    renderBlog();
    requestAnimationFrame(() => {
      const refreshedRows = $$('#tabla-blog tbody .blog-day-entry');
      scrollElementBelowHeader(refreshedRows[refreshedRows.length - 1]);
    });
    return;
  }
  scrollElementBelowHeader(target);
}

function resetBlogTableHorizontalScroll() {
  const wrapper = $('#tabla-blog')?.closest('.table-wrap');
  if (wrapper) wrapper.scrollLeft = 0;
}

function setTab(id, options = {}) {
  if (id === 'blog' && !selectedBlogTrip()) return;
  const previousTab = state.activeTab;
  if (id !== 'mapa' && tripVectorMap) destroyTripVectorMap();
  state.activeTab = id;
  ['viajes', 'gastos', 'blog', 'mapa', 'resumen', 'config'].forEach(tab => {
    $(`#tab-${tab}`).classList.toggle('active', tab === id);
    $(`#view-${tab}`).style.display = tab === id ? 'block' : 'none';
  });
  if (id === 'mapa') renderMapPaises();
  if (id === 'resumen') renderResumen();
  if (id === 'blog') {
    renderBlog();
    if (previousTab !== 'blog') resetBlogTableHorizontalScroll();
    const anchoredEntry = options.blogEntryAnchor
      ? state.blogEntries.find(entry => Number(entry.id) === Number(options.blogEntryAnchor.entryId))
      : null;
    if (anchoredEntry && anchoredEntry.fecha && !openBlogDays.has(anchoredEntry.fecha)) {
      openBlogDays.add(anchoredEntry.fecha);
      renderBlog();
    }
  }
  if (id === 'gastos') {
    requestAnimationFrame(() => {
      if (options.expenseActionAnchor) restoreExpenseActionAnchor(options.expenseActionAnchor);
      else if (options.expenseId) scrollToExpense(options.expenseId);
      else scrollToLastExpense('auto');
    });
  }
  if (id === 'blog') {
    if (options.blogEntryAnchor) {
      requestAnimationFrame(() => restoreBlogEntryAnchor(options.blogEntryAnchor));
    } else {
      scrollToSectionStart(id);
    }
  }
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
  renderTransferAccountSelectors();
  renderTransferencias();
  renderResumen();
}

function openEditGasto(gasto) {
  const dialog = $('#edit-gasto-dialog');
  if (!dialog || !gasto) return;
  activeEditExpenseActionAnchor = captureExpenseActionAnchor(gasto.id);
  activeEditTicketRecord = gasto.ticketData ? { ...gasto } : null;
  $('#edit-gasto-id').value = gasto.id;
  $('#edit-gasto-fecha').value = gasto.fecha || todayIso();
  $('#edit-gasto-hora').value = expenseTimeValue(gasto) || currentLocalTime();
  $('#edit-gasto-viaje').value = gasto.viajeId ? String(gasto.viajeId) : '';
  renderEditGastoAccountSelector();
  $('#edit-gasto-cuenta').value = String(gasto.cuentaId || '');
  const account = state.cuentas.find(c => c.id === Number(gasto.cuentaId));
  $('#edit-gasto-moneda').value = account ? account.moneda : gasto.moneda;
  $('#edit-gasto-cat').value = String(gasto.catId || '');
  rememberLastValidExpenseCategory('edit-gasto');
  renderEditSubcategories();
  $('#edit-gasto-subcat').value = gasto.subcatId ? String(gasto.subcatId) : '';
  $('#edit-gasto-pais').value = gasto.paisId ? String(gasto.paisId) : '';
  renderEditCiudades();
  $('#edit-gasto-ciudad').value = gasto.ciudadId ? String(gasto.ciudadId) : '';
  const currentAmount = numberValue(gasto.importe);
  $('#edit-gasto-tipo').value = currentAmount < 0 ? 'ingreso' : 'gasto';
  $('#edit-gasto-importe').value = Math.abs(currentAmount);
  $('#edit-gasto-desc').value = gasto.desc || '';
  clearExpenseTicketSelection('edit-gasto');
  pendingExpenseTicketTranslations['edit-gasto'] = ticketTranslationRecordFromExpense(gasto);
  clearExpenseExtraImageSelection('edit-gasto');
  $('#edit-gasto-ticket-remove').checked = false;
  $('#edit-gasto-ticket-type').value = gasto.ticketData ? String(gasto.ticketPhotoTypeId || '') : '';
  syncExpenseTicketTypeAvailability('edit-gasto');
  renderEditExpenseTicket(gasto);
  renderExpenseTicketTranslation('edit-gasto');
  pendingExpenseTicketLocationChecks['edit-gasto'] = detectStoredExpenseTicketLocation(gasto).catch(() => {});
  syncTicketOcrAvailability('edit-gasto');
  renderEditExpenseImages(gasto);
  setMessage('#msg-edit-gasto', '');
  warmTicketOcrLanguagesForTrip(Number($('#edit-gasto-viaje')?.value)).catch(() => {});
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeEditGasto({ restoreAnchor = true } = {}) {
  const dialog = $('#edit-gasto-dialog');
  if (!dialog) return;
  const expenseActionAnchor = activeEditExpenseActionAnchor;
  activeEditExpenseActionAnchor = null;
  activeEditTicketRecord = null;
  pendingExpenseTicketLocations['edit-gasto'] = null;
  pendingExpenseTicketLocationChecks['edit-gasto'] = Promise.resolve();
  pendingTicketOcr['edit-gasto'] = null;
  pendingExpenseTicketPreviews['edit-gasto'] = null;
  pendingExpenseTicketTranslations['edit-gasto'] = null;
  renderSelectedExpenseTicketPreview('edit-gasto');
  setTicketOcrStatus('edit-gasto', '');
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
  if (restoreAnchor && expenseActionAnchor) {
    setTab('gastos', { expenseActionAnchor });
  }
}

function addExpenseDraftKey() {
  return formDraftKey('expense-new');
}

function restoreAddExpenseDraft() {
  const draft = getFormDraft(addExpenseDraftKey());
  if (!draft) return false;
  const values = draft.values || {};
  applyFormDraftValues(['#g-fecha', '#g-hora', '#g-viaje', '#g-tipo', '#g-importe', '#g-desc'], values);
  renderGastoAccountSelector();
  applyFormDraftValues(['#g-cuenta', '#g-moneda'], values);
  applyFormDraftValues(['#g-cat'], values);
  renderSubcategories();
  applyFormDraftValues(['#g-subcat', '#g-ticket-type'], values);
  applyFormDraftValues(['#g-pais'], values);
  renderCiudades();
  applyFormDraftValues(['#g-ciudad', '#g-extra-images-map'], values);
  setMessage('#msg-gasto', 'Borrador restaurado. Si habías elegido tickets o fotos, tendrás que volver a seleccionarlos.');
  return true;
}

function discardAddExpenseDraft() {
  clearFormDraft(addExpenseDraftKey());
  setMessage('#msg-gasto', '');
}

function resetAddExpenseForm() {
  const form = $('#add-gasto-form');
  if (!form) return;
  form.reset();
  clearExpenseTicketSelection('g');
  clearExpenseExtraImageSelection('g');
  pendingTicketOcr.g = null;
  $('#g-fecha').value = todayIso();
  $('#g-hora').value = currentLocalTime();
  const ids = selectedTripIds();
  if (ids.length === 1 && $('#g-viaje')) $('#g-viaje').value = String(ids[0]);
  renderGastoAccountSelector();
  renderSubcategories();
  renderCiudades();
  applyDefaultExpenseLocation();
  rememberLastValidExpenseCategory('g');
  setMessage('#msg-gasto', '');
}

function openAddGasto() {
  const dialog = $('#add-gasto-dialog');
  if (!dialog) return;
  const hasDraft = Boolean(getFormDraft(addExpenseDraftKey()));
  if (!hasDraft) {
    resetAddExpenseForm();
  } else {
    clearExpenseTicketSelection('g');
    clearExpenseExtraImageSelection('g');
    restoreAddExpenseDraft();
  }
  rememberLastValidExpenseCategory('g');
  warmTicketOcrLanguagesForTrip(Number($('#g-viaje')?.value)).catch(() => {});
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeAddGasto() {
  const dialog = $('#add-gasto-dialog');
  if (!dialog) return;
  pendingTicketOcr.g = null;
  pendingExpenseTicketPreviews.g = null;
  pendingExpenseTicketTranslations.g = null;
  renderSelectedExpenseTicketPreview('g');
  setTicketOcrStatus('g', '');
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
  renderGastosTabla();
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
    ...state.viajeDocumentos,
    ...state.blogEntries,
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

function readSyncState() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATE_STORAGE) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function writeSyncState(stateValue) {
  try {
    localStorage.setItem(SYNC_STATE_STORAGE, JSON.stringify(stateValue || {}));
  } catch (_) {}
}

function syncDirectionLabel(direction) {
  if (direction === 'upload') return 'subida a la nube';
  if (direction === 'download') return 'actualización desde la nube';
  return 'sincronización';
}

function renderSyncLastStatus() {
  const element = $('#sync-last-status');
  if (!element) return;
  const last = readSyncState();
  if (!last || !last.at) {
    element.textContent = 'Este dispositivo todavía no tiene una sincronización confirmada.';
    return;
  }
  const parts = [
    `Última sincronización: ${syncDirectionLabel(last.direction)} el ${formatSyncDate(last.at)}`,
    last.cloudUpdatedAt ? `nube ${formatSyncDate(last.cloudUpdatedAt)}` : '',
    last.localUpdatedAt ? `local ${formatSyncDate(last.localUpdatedAt)}` : ''
  ].filter(Boolean);
  element.textContent = `${parts.join(' · ')}.`;
}

function recordSuccessfulSync(direction, metadata, localUpdatedAt = ensureLocalDataUpdatedAt()) {
  const cloudUpdatedAt = syncMetadataDate(metadata);
  writeSyncState({
    direction,
    at: new Date().toISOString(),
    localUpdatedAt,
    cloudUpdatedAt,
    cloudSavedAt: metadata && metadata.savedAt || '',
    cloudEtag: metadata && metadata.etag || '',
    filename: metadata && metadata.filename || '',
    appVersion: metadata && metadata.appVersion || ''
  });
  renderSyncLastStatus();
}

function syncComparisonAnalysis(metadata, localDataDate = ensureLocalDataUpdatedAt()) {
  const last = readSyncState();
  const localTime = Date.parse(localDataDate || 0);
  const cloudDataDate = syncMetadataDate(metadata);
  const cloudTime = Date.parse(cloudDataDate || 0);
  const lastLocalTime = Date.parse(last.localUpdatedAt || 0);
  const lastCloudTime = Date.parse(last.cloudUpdatedAt || 0);
  const localChangedSinceSync = Boolean(last.at && localTime && lastLocalTime && localTime > lastLocalTime);
  const cloudChangedSinceSync = Boolean(
    metadata
    && last.at
    && (
      (metadata.etag && last.cloudEtag && metadata.etag !== last.cloudEtag)
      || (cloudTime && lastCloudTime && cloudTime > lastCloudTime)
    )
  );
  const conflict = Boolean(metadata && localChangedSinceSync && cloudChangedSinceSync);
  return {
    conflict,
    localChangedSinceSync,
    cloudChangedSinceSync,
    cloudIsPreferred: Boolean(metadata && (cloudTime > localTime || (!hasMeaningfulLocalData() && cloudTime !== localTime))),
    localIsPreferred: Boolean(metadata ? localTime > cloudTime : hasMeaningfulLocalData()),
    localTime,
    cloudTime
  };
}

function hasMeaningfulLocalData() {
  return Boolean(
    state.viajes.length
    || state.gastos.length
    || state.transferencias.length
    || state.lugares.length
    || state.viajeDocumentos.length
    || state.blogEntries.length
    || state.timelineDays.length
    || state.monedas.some(item => item.codigo !== 'EUR')
  );
}

async function fetchCloudMetadata() {
  if (!navigator.onLine) throw new Error('No hay conexión a Internet');
  const response = await fetch(`${SYNC_ENDPOINT}?metadata=1&_=${Date.now()}`, {
    headers: { 'x-sync-key': syncKey() },
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo consultar la copia en Netlify');
  const payload = await response.json();
  return payload.metadata ? { ...payload.metadata, etag: payload.etag || '' } : null;
}

async function fetchCloudSnapshot() {
  const response = await fetch(`${SYNC_ENDPOINT}?content=1&_=${Date.now()}`, {
    headers: { 'x-sync-key': syncKey() },
    cache: 'no-store'
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo recuperar la versión de la nube');
  return response.json();
}

async function uploadCloudSnapshot({ backupData = null, backupName = '', expectedEtag = undefined } = {}) {
  let uploadExpectedEtag = expectedEtag;
  if (uploadExpectedEtag === undefined) {
    const latestMetadata = await fetchCloudMetadata().catch(error => {
      if (error && /No hay conexión/.test(error.message || '')) throw error;
      return null;
    });
    uploadExpectedEtag = latestMetadata ? latestMetadata.etag || '' : '';
  }
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
    appVersion: APP_VERSION,
    expectedEtag: uploadExpectedEtag
  };
  if (preparedBackup) {
    body.backup = {
      data: preparedBackup.data,
      filename: backupName || backupFilename(backupData)
    };
  }
  const text = JSON.stringify(body);
  if (new TextEncoder().encode(text).byteLength > 5_300_000) {
    throw new Error('Los datos sin archivos adjuntos superan el tamaño permitido. Será necesario dividir también el archivo de datos.');
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
    if (detail.error === 'cloud_changed') throw new Error('La copia en la nube cambió mientras se preparaba la subida. Pulsa “Comprobar de nuevo” antes de decidir si bajar o subir.');
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
  const analysis = syncComparisonAnalysis(metadata, localDataDate);
  renderSyncLastStatus();
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

  const downloadButton = $('#sync-download');
  const uploadButton = $('#sync-upload');
  if (downloadButton) downloadButton.style.display = analysis.conflict || analysis.cloudIsPreferred ? '' : 'none';
  if (uploadButton) uploadButton.style.display = analysis.conflict || !metadata || analysis.localIsPreferred ? '' : 'none';

  if (!metadata) {
    setSyncMessage('No hay una versión en la nube. Puedes guardar la versión local; la subida puede tardar un poco si contiene fotos o documentos.');
  } else if (analysis.conflict) {
    setSyncMessage('Atención: hay cambios en este dispositivo y también en la nube desde la última sincronización confirmada. Antes de elegir, se crea una copia local. Si bajas, este dispositivo queda como la nube; si subes, la nube queda como este dispositivo.', true);
  } else if (analysis.cloudIsPreferred) {
    setSyncMessage('La versión de la nube es más reciente. ¿Quieres actualizar este dispositivo?');
  } else if (analysis.localIsPreferred) {
    setSyncMessage('La versión local es más reciente. ¿Quieres guardarla en la nube? La subida puede tardar un poco si contiene fotos o documentos.');
  } else {
    setSyncMessage('La versión local y la versión en la nube están sincronizadas.');
  }
}

async function refreshSyncComparison() {
  setSyncMessage('Consultando Netlify...');
  renderSyncLastStatus();
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

function setCloudDownloadProgress(active) {
  const dialog = $('#sync-cloud-progress-dialog');
  if (!dialog) return;
  if (active) {
    dialog.setAttribute('aria-busy', 'true');
    if (!dialog.open) {
      if (dialog.showModal) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', 'open');
        }
      } else {
        dialog.setAttribute('open', 'open');
      }
    }
    return;
  }
  dialog.removeAttribute('aria-busy');
  if (dialog.open) {
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
  }
}

async function performCloudDownload() {
  try {
    setCloudDownloadProgress(true);
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
    const verified = await fetchCloudMetadata();
    const metadata = verified || {
      savedAt: remote.savedAt,
      updatedAt: remote.updatedAt,
      filename: remote.filename,
      appVersion: remote.appVersion
    };
    recordSuccessfulSync('download', metadata, ensureLocalDataUpdatedAt());
    renderSyncComparison(metadata);
  } finally {
    setCloudDownloadProgress(false);
  }
  showBackupResult('Sincronización realizada', 'Los datos se actualizaron desde la nube. Se crearon una copia local anterior y otra posterior terminada en -2.');
}

async function performCloudUpload() {
  setSyncMessage('Subiendo copia a la nube… Puede tardar un poco si contiene fotos o documentos.');
  const latestMetadata = await fetchCloudMetadata();
  const analysis = syncComparisonAnalysis(latestMetadata);
  renderSyncComparison(latestMetadata);
  if (analysis.conflict && !confirm('Hay cambios locales y cambios en la nube desde la última sincronización. Subir reemplazará la copia de la nube por este dispositivo. ¿Continuar?')) {
    setSyncMessage('Subida cancelada. Puedes actualizar desde la nube o revisar tus copias locales antes de decidir.');
    return;
  }
  await createSyncBackup('before-sync');
  const saved = await uploadCloudSnapshot({ expectedEtag: latestMetadata ? latestMetadata.etag || '' : '' });
  await createSyncBackup('after-sync');
  await refreshLocalBackupHistory();
  recordSuccessfulSync('upload', saved, ensureLocalDataUpdatedAt());
  renderSyncComparison(saved);
  const stats = saved.attachmentStats || {};
  const photoDetail = stats.total
    ? ` Archivos nuevos: ${stats.uploaded}. Archivos ya existentes: ${stats.reused}.`
    : ' No había archivos pendientes.';
  showBackupResult('Sincronización realizada', `La copia en la nube se guardó correctamente.${photoDetail} Se crearon una copia local anterior y otra posterior terminada en -2.`);
}

async function checkCloudOnEntry() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    const metadata = await fetchCloudMetadata();
    if (!metadata) return;
    const analysis = syncComparisonAnalysis(metadata, ensureLocalDataUpdatedAt());
    if (analysis.conflict || analysis.cloudIsPreferred) await openSyncDialog(metadata);
  } catch (error) {
    if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error && error.message || '')) {
      await refreshNetworkAvailability();
    }
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

function setBackupUploadState(active, title = 'Subiendo copia a la nube…', detail = 'Puede tardar un poco si contiene fotos o documentos.') {
  backupCloudUploadInProgress = Boolean(active);
  const status = $('#backup-upload-status');
  if (status) status.hidden = !backupCloudUploadInProgress;
  if ($('#backup-progress-title')) $('#backup-progress-title').textContent = title;
  if ($('#backup-progress-detail')) $('#backup-progress-detail').textContent = detail;
  const downloadButton = $('#backup-download');
  const closeButton = $('#backup-close');
  if (downloadButton) downloadButton.disabled = backupCloudUploadInProgress;
  if (closeButton) closeButton.disabled = backupCloudUploadInProgress;
  const dialog = $('#backup-dialog');
  if (dialog) {
    if (backupCloudUploadInProgress) dialog.setAttribute('aria-busy', 'true');
    else dialog.removeAttribute('aria-busy');
  }
}

async function handleBackupDownload() {
  setBackupUploadState(true, 'Haciendo backup', 'Preparando y guardando la copia local…');
  try {
    await new Promise(resolve => window.requestAnimationFrame(resolve));
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
    setBackupUploadState(false);
    if (confirm('La subida a la nube puede tardar un poco, especialmente si la copia contiene fotos o documentos. Mientras se realiza verás el aviso “Subiendo copia a la nube…”. ¿Quieres continuar?')) {
      setBackupUploadState(true, 'Subiendo copia a la nube…', 'Puede tardar un poco si contiene fotos o documentos.');
      try {
        const saved = await uploadCloudSnapshot({ backupData: data, backupName: filename });
        recordSuccessfulSync('upload', saved, ensureLocalDataUpdatedAt());
        const stats = saved.attachmentStats || {};
        const detail = stats.total
          ? ` Archivos nuevos: ${stats.uploaded}. Archivos ya existentes: ${stats.reused}.`
          : ' No había archivos pendientes.';
        showBackupResult('Copias creadas', `${localDetail}. También se guardó una copia en Netlify.${detail}`);
      } catch (cloudError) {
        showBackupResult('Copia local creada', `${localDetail}. No se pudo guardar la copia en la nube: ${cloudError.message || cloudError}`);
      } finally {
        setBackupUploadState(false);
      }
    } else showBackupResultSoon('Copia local creada', localDetail);
  } catch (err) {
    setMessage('#msg-backup', err.message || String(err), true);
  } finally {
    setBackupUploadState(false);
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
  if (id === 'resumen') {
    const mapCard = $('#resumen-mapa');
    if (mapCard) clone.appendChild(mapCard.cloneNode(true));
  }
  clone.removeAttribute('id');
  clone.style.display = 'block';
  clone.querySelectorAll('.map-controls').forEach(el => el.remove());
  clone.querySelectorAll('.map-tile').forEach(el => {
    el.removeAttribute('loading');
    el.setAttribute('decoding', 'sync');
  });
  clone.querySelectorAll('[data-expense-group-entry]').forEach(el => el.removeAttribute('hidden'));
  clone.querySelectorAll('[data-expense-group-toggle]').forEach(button => {
    const label = button.querySelector('.expense-day-title');
    const heading = document.createElement('b');
    heading.innerHTML = label ? label.innerHTML : button.textContent.replace(/^[+−]\s*/, '');
    button.replaceWith(heading);
  });
  clone.querySelectorAll('.section-head, .filters-card, .row4, .action-col, .expense-action-select, button, input, select, label').forEach(el => el.remove());
  clone.querySelectorAll('#tabla-gastos .group-row td[colspan="10"]').forEach(el => el.setAttribute('colspan', '9'));
  clone.querySelectorAll('#tabla-gastos .subtotal-row td:last-child, #tabla-gastos tfoot td:last-child').forEach(el => el.setAttribute('colspan', '1'));
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
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cuaderno de Bitácora - ${APP_VERSION}</title><style>
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
    #resumen-mapa { break-after: page; page-break-after: always; }
    #resumen-mapa, .trip-map, .trip-map-shell, .trip-map-frame { break-inside: avoid; page-break-inside: avoid; }
    .trip-map { min-height: 0; margin-top: 6px; border: 1px solid #dbe3ef; border-radius: 6px; background: #dbeafe; overflow: hidden; }
    .trip-map-shell { position: relative; }
    .map-controls { display: none !important; }
    .trip-map-frame { position: relative; width: 100%; height: 92mm !important; min-height: 0 !important; aspect-ratio: auto !important; overflow: hidden; border-radius: 6px; background: #cfe8f3; }
    .map-tiles, .trip-map-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
    .map-tile { position: absolute; object-fit: cover; max-width: none !important; user-select: none; pointer-events: none; }
    .trip-map-overlay { z-index: 2; pointer-events: none; }
    .map-route { fill: none; stroke: #1d4ed8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 10 8; opacity: 0.85; }
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

function openFormDialog({ title, fields, onSubmit, helpTarget = 'referencia' }) {
  const dialog = $('#form-dialog');
  const container = $('#form-dialog-fields');
  if (!dialog || !container) return;
  $('#form-dialog-title').textContent = title;
  setDialogHelpTarget('form-dialog', helpTarget);
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
    if (field.type === 'checkbox') {
      return `<div class="form-field form-field-${escapeHtml(field.name)} form-field-checkbox"><label class="check-option"><input id="form-field-${escapeHtml(field.name)}" type="checkbox"${field.value ? ' checked' : ''}> ${escapeHtml(field.label)}</label></div>`;
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
    values[input.id.replace('form-field-', '')] = input.type === 'checkbox' ? input.checked : input.value;
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
    todo: ['cuentas', 'categorias', 'lugares', 'gastos', 'viajes', 'tripDocuments', 'blogEntries', 'timelineDays', 'monedas', 'transferencias'],
    categorias: ['categorias'],
    lugares: ['lugares'],
    monedas: ['monedas'],
    cuentas: ['cuentas'],
    viajes: ['viajes', 'tripDocuments', 'blogEntries', 'timelineDays'],
    gastos: ['gastos'],
    blog: ['blogEntries'],
    transferencias: ['transferencias']
  };
  const stores = map[value];
  if (!stores) {
    alert('Opción no reconocida. Usa: todo, categorías, monedas, cuentas, viajes, gastos, blog o transferencias.');
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
    if (value === 'todo') {
      await deleteRecord('appSettings', PHOTO_TYPES_SETTING_KEY);
      await deleteRecord('appSettings', TICKET_OCR_LANGUAGES_SETTING_KEY);
    }
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
    helpTarget: 'avanzado',
    fields: [{ name: 'opcion', label: 'Escribe: todo, categorías, monedas, cuentas, viajes, gastos, blog o transferencias', value: 'todo' }],
    onSubmit: values => resetDataValue(values.opcion)
  });
}

async function handleGastoAction(id, action) {
  const gasto = state.gastos.find(item => item.id === Number(id));
  if (!gasto) return;
  if (action === 'files') {
    openExpenseFilesDialog(gasto.id);
  } else if (action === 'ticket') {
    openTicket(gasto.id);
  } else if (action === 'blog') {
    const expenseActionAnchor = captureExpenseActionAnchor(gasto.id);
    await addExpenseToBlog(gasto, { expenseActionAnchor });
  } else if (action === 'edit') {
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
  $('#tab-blog').onclick = () => setTab('blog');
  $('#tab-mapa').onclick = () => setTab('mapa');
  $('#tab-resumen').onclick = () => setTab('resumen');
  $('#tab-config').onclick = () => setTab('config');
  $('#context-help-close').onclick = closeContextHelp;
  $('#context-help-dialog').onclose = restoreContextHelpFocus;
  $('#timeline-close').onclick = closeTimelineDialog;
  $('#timeline-cancel').onclick = closeTimelineDialog;
  $('#timeline-dialog').oncancel = event => {
    event.preventDefault();
    closeTimelineDialog();
  };
  $('#lodging-name-close').onclick = closeLodgingNameDialog;
  $('#lodging-name-cancel').onclick = closeLodgingNameDialog;
  $('#lodging-name-dialog').oncancel = event => {
    event.preventDefault();
    closeLodgingNameDialog();
  };
  $('#lodging-name-form').onsubmit = event => {
    event.preventDefault();
    setMessage('#msg-lodging-name', 'Guardando…');
    saveLodgingName()
      .catch(error => setMessage('#msg-lodging-name', error.message || String(error)));
  };
  $('#map-point-close').onclick = closeMapPointDialog;
  $('#map-point-cancel').onclick = closeMapPointDialog;
  $('#map-point-city').onchange = event => {
    if (!activeMapPointContext) return;
    const cityId = Number(event.target.value) || null;
    const city = cityId ? state.lugares.find(item => Number(item.id) === cityId) : null;
    activeMapPointContext.cityId = city ? Number(city.id) : null;
    activeMapPointContext.countryId = city ? Number(city.parentId) || null : null;
    activeMapPointContext.cityManual = true;
  };
  $('#map-point-date').onchange = event => {
    if (!activeMapPointContext || activeMapPointContext.mode !== 'add' || activeMapPointContext.cityManual) return;
    const trip = state.viajes.find(item => Number(item.id) === Number(activeMapPointContext.tripId));
    const city = nearestTripCityForPoint(trip, activeMapPointContext, { date: event.target.value });
    activeMapPointContext.date = event.target.value;
    activeMapPointContext.cityId = city ? Number(city.id) : null;
    activeMapPointContext.countryId = city ? Number(city.parentId) || null : null;
    renderMapPointCityOptions(trip, city && city.id);
  };
  $('#map-point-delete').onclick = () => {
    setMessage('#msg-map-point', 'Eliminando…');
    deleteMapPoint()
      .catch(error => setMessage('#msg-map-point', error.message || String(error)));
  };
  $('#map-point-dialog').oncancel = event => {
    event.preventDefault();
    closeMapPointDialog();
  };
  $('#map-point-form').onsubmit = event => {
    event.preventDefault();
    $('#map-point-save').disabled = true;
    setMessage('#msg-map-point', 'Guardando…');
    saveMapPoint()
      .catch(error => {
        $('#map-point-save').disabled = false;
        setMessage('#msg-map-point', error.message || String(error));
      });
  };
  $('#timeline-select-file').onclick = () => {
    const input = $('#timeline-file-input');
    if (!input) return;
    input.value = '';
    input.click();
  };
  $('#timeline-file-input').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      await importTimelineFile(file);
    } catch (error) {
      setTimelineMessage(error.message || String(error), true);
      renderTimelineDialog();
    }
  };
  $('#timeline-toggle-layer').onclick = () => {
    tripMapState.showTimeline = !tripMapState.showTimeline;
    resetTripMapView();
    renderTripMap();
    closeTimelineDialog();
  };
  $('#timeline-route-view').onchange = event => {
    tripMapState.timelineRouteView = event.target.value === 'adjusted' ? 'adjusted' : 'original';
    persistTimelineRoutingPreference().catch(() => {});
    resetTripMapView();
    renderTripMap();
    renderTimelineDialog();
  };
  $('#timeline-route-mode').onchange = event => {
    tripMapState.timelineRoutingMode = timelineRoutingModeKey(event.target.value);
    persistTimelineRoutingPreference().catch(() => {});
    if (tripMapState.timelineRouteView === 'adjusted') {
      resetTripMapView();
      renderTripMap();
    }
    renderTimelineDialog();
  };
  $('#timeline-route-adjust').onclick = () => {
    const button = $('#timeline-route-adjust');
    button.disabled = true;
    adjustSelectedTimelineDay()
      .catch(error => setTimelineMessage(error.message || String(error), true))
      .finally(() => {
        button.disabled = false;
        renderTimelineDialog();
      });
  };
  $('#timeline-route-adjust-all').onclick = () => {
    adjustEntireTimelineTrip()
      .catch(error => {
        timelineBulkRoutingActive = false;
        timelineBulkRoutingCancelled = false;
        setTimelineMessage(error.message || String(error), true);
        renderTimelineDialog();
      });
  };
  $('#timeline-route-cancel').onclick = () => {
    timelineBulkRoutingCancelled = true;
    setTimelineMessage('Cancelando al terminar la consulta actual…');
  };
  $('#timeline-route-clear').onclick = () => {
    clearSelectedTimelineAdjustment().catch(error => setTimelineMessage(error.message || String(error), true));
  };
  $('#timeline-delete').onclick = () => {
    deleteImportedTimeline().catch(error => setTimelineMessage(error.message || String(error), true));
  };
  $('#btn-clear-trip').onclick = () => {
    applySelectedTrip(null);
    setTab('viajes');
  };
  $('#btn-open-add-gasto').onclick = openAddGasto;
  $('#btn-open-add-gasto-bottom').onclick = openAddGasto;
  $('#btn-last-expense').onclick = () => scrollToLastExpense();
  $('#btn-blog-add').onclick = () => openBlogEntryDialog();
  $('#btn-blog-last').onclick = scrollToLastBlogEntry;
  $('#btn-blog-pdf').onclick = () => openBlogPdfGuide();
  $('#btn-blog-add-bottom').onclick = () => openBlogEntryDialog();
  $('#btn-blog-day-pdf-bottom').onclick = openCurrentBlogDayPdfGuide;
  $('#blog-pdf-guide-close').onclick = closeBlogPdfGuide;
  $('#blog-pdf-guide-cancel').onclick = closeBlogPdfGuide;
  $('#blog-pdf-guide-continue').onclick = continueBlogPdf;
  $('#btn-blog-wordpress').onclick = openWordPressExportDialog;
  $('#shared-images-close').onclick = closeSharedImagesDialog;
  $('#shared-images-cancel').onclick = closeSharedImagesDialog;
  $('#shared-images-dialog').oncancel = event => {
    event.preventDefault();
    closeSharedImagesDialog();
  };
  $('#shared-images-trip').onchange = () => {
    renderSharedExpenseOptions();
    syncSharedImagesDestination();
  };
  $('#shared-images-destination').onchange = () => {
    if ($('#shared-images-destination').value === 'expense-existing') renderSharedExpenseOptions();
    syncSharedImagesDestination();
  };
  $('#shared-images-description').oninput = syncSharedImagesDestination;
  $('#shared-images-expense').onchange = syncSharedImagesDestination;
  $('#shared-images-kind').onchange = syncSharedImagesDestination;
  $('#shared-images-ticket-action').onchange = syncSharedImagesDestination;
  $('#shared-images-form').onsubmit = async event => {
    event.preventDefault();
    const button = $('#shared-images-continue');
    if (button) button.disabled = true;
    setMessage('#msg-shared-images', 'Preparando importación...');
    try {
      await continueSharedImagesImport();
    } catch (error) {
      setMessage('#msg-shared-images', error.message || String(error), true);
      syncSharedImagesDestination();
    }
  };
  $('#wordpress-export-close').onclick = closeWordPressExportDialog;
  $('#wordpress-export-cancel').onclick = closeWordPressExportDialog;
  $('#wordpress-export-download').onclick = () => {
    try {
      exportBlogToWordPress();
    } catch (error) {
      setMessage('#msg-wordpress-export', error.message || String(error), true);
    }
  };
  $('#blog-filter-date').onchange = renderBlog;
  $('#blog-filter-country').onchange = () => {
    if ($('#blog-filter-city')) $('#blog-filter-city').value = '';
    renderBlog();
  };
  $('#blog-filter-city').onchange = renderBlog;
  $('#blog-entry-close').onclick = closeBlogEntryDialog;
  $('#blog-entry-cancel').onclick = () => {
    discardActiveBlogEntryDraft();
    closeBlogEntryDialog();
  };
  $('#blog-entry-form').onsubmit = async event => {
    event.preventDefault();
    try {
      await saveBlogEntryForm();
    } catch (error) {
      setMessage('#msg-blog-entry', error.message || String(error), true);
    }
  };
  bindBlogEntryDraftFields();
  $$('[data-blog-type]').forEach(button => {
    button.onclick = () => setBlogEntryType(button.dataset.blogType);
  });
  $$('[data-point-transport]').forEach(input => {
    input.onchange = () => {
      if (input.checked) {
        $$('[data-point-transport]').forEach(other => {
          if (other !== input) other.checked = false;
        });
      }
      scheduleActiveBlogEntryDraftSave();
    };
  });
  $('#blog-pais').onchange = () => {
    renderBlogCities();
    if (activeBlogEntryType === 'punto' && !blogPointFieldCoordinates()) resetBlogPointPicker();
    if (activeBlogEntryType === 'imagen' && activeBlogImage) showBlogImages([activeBlogImage, ...activeBlogGalleryImages]);
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-ciudad').onchange = () => {
    if (activeBlogEntryType === 'punto' && !blogPointFieldCoordinates()) resetBlogPointPicker();
    if (activeBlogEntryType === 'imagen' && activeBlogImage) showBlogImages([activeBlogImage, ...activeBlogGalleryImages]);
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-featured').onchange = () => {
    if ($('#blog-featured').checked) $('#blog-wordpress').checked = true;
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-wordpress').onchange = () => {
    if (!$('#blog-wordpress').checked) $('#blog-featured').checked = false;
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-en-route').onchange = () => {
    syncBlogEnRouteOption();
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-en-route-location').onclick = () => {
    openBlogManualRouteLocation();
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-image-file').onchange = () => selectBlogImage($('#blog-image-file'), $('#blog-image-camera'));
  $('#blog-image-gallery').onchange = () => selectBlogGallery($('#blog-image-gallery'));
  $('#blog-image-camera').onchange = () => selectBlogImage($('#blog-image-camera'), $('#blog-image-file'), { useCurrentLocation: true, fromCamera: true });
  $('#blog-image-rotate-left').onclick = async () => {
    try {
      await rotateActiveBlogImage('left');
    } catch (error) {
      setMessage('#msg-blog-entry', error.message || String(error), true);
    }
  };
  $('#blog-image-rotate-right').onclick = async () => {
    try {
      await rotateActiveBlogImage('right');
    } catch (error) {
      setMessage('#msg-blog-entry', error.message || String(error), true);
    }
  };
  $('#blog-image-download').onclick = async event => {
    const button = event.currentTarget;
    try {
      button.disabled = true;
      await downloadPrimaryBlogImage();
    } catch (error) {
      if ($('#blog-image-download-status')) $('#blog-image-download-status').textContent = error.message || String(error);
    } finally {
      button.disabled = false;
    }
  };
  $('#blog-save-original').onclick = saveBlogCameraOriginal;
  $('#blog-image-preview').oncontextmenu = event => {
    event.preventDefault();
    if ($('#blog-image-download-status')) $('#blog-image-download-status').textContent = 'Para conservar el nombre y el GPS, pulsa «Descargar con GPS».';
  };
  $('#blog-image-preview').onclick = () => openBlogGalleryImage(0);
  $('#blog-image-preview').onkeydown = event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    openBlogGalleryImage(0);
  };
  $('#blog-gallery-preview').onclick = event => {
    const removeButton = event.target.closest('[data-blog-remove-image]');
    if (removeButton) {
      removeBlogImage(removeButton.dataset.blogRemoveImage);
      return;
    }
    const imageButton = event.target.closest('[data-open-blog-gallery-image]');
    if (imageButton) {
      openBlogGalleryImage(imageButton.dataset.openBlogGalleryImage);
      return;
    }
    const button = event.target.closest('[data-blog-primary-image]');
    if (button) selectBlogPrimaryImage(button.dataset.blogPrimaryImage);
  };
  $('#blog-gallery-preview').onchange = event => {
    const select = event.target.closest('[data-blog-image-type]');
    if (select) setBlogImagePhotoType(select.dataset.blogImageType, select.value);
  };
  $('#blog-gallery-preview').oncontextmenu = event => {
    if (!event.target.closest('img')) return;
    event.preventDefault();
    if ($('#blog-image-download-status')) $('#blog-image-download-status').textContent = 'Para conservar el nombre y el GPS, pulsa «Descargar con GPS».';
  };
  $('#blog-primary-photo-type').onchange = () => setBlogImagePhotoType(0, $('#blog-primary-photo-type').value);
  $('#blog-images-map').onchange = () => {
    setActiveBlogImagesMapEnabled($('#blog-images-map').checked);
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-point-current').onclick = () => {
    useCurrentBlogPointLocation();
    syncBlogEnRouteOption();
    scheduleActiveBlogEntryDraftSave();
  };
  $('#blog-point-search').onclick = async () => {
    try {
      await searchBlogPointLocation();
      syncBlogEnRouteOption();
      scheduleActiveBlogEntryDraftSave();
    } catch (error) {
      setMessage('#blog-point-status', error.message || String(error), true);
    }
  };
  $('#blog-point-copy').onclick = async () => {
    try {
      await copyBlogPointCoordinates();
    } catch (error) {
      setMessage('#blog-point-status', 'No se pudieron copiar las coordenadas.', true);
    }
  };
  ['#blog-point-lat', '#blog-point-lng'].forEach(selector => {
    $(selector).onchange = () => {
      const point = blogPointFieldCoordinates();
      if (!point) {
        setMessage('#blog-point-status', 'Revisa la latitud y la longitud.', true);
        syncBlogEnRouteOption();
        scheduleActiveBlogEntryDraftSave();
        return;
      }
      blogPointPickerState.centerLat = point.latitude;
      blogPointPickerState.centerLng = point.longitude;
      renderBlogPointPicker();
      syncBlogEnRouteOption();
      scheduleActiveBlogEntryDraftSave();
    };
  });
  $('#blog-point-zoom-in').onclick = () => {
    blogPointPickerState.zoom = Math.min(19, blogPointPickerState.zoom + 1);
    renderBlogPointPicker();
  };
  $('#blog-point-zoom-out').onclick = () => {
    blogPointPickerState.zoom = Math.max(3, blogPointPickerState.zoom - 1);
    renderBlogPointPicker();
  };
  $('#blog-location-close').onclick = closeBlogLocationDialog;
  $('#blog-location-dialog').oncancel = event => {
    if ($('#blog-location-dialog').dataset.searching === '1') event.preventDefault();
  };
  $('#offline-entry-continue').onclick = closeOfflineEntryNotice;
  $('#btn-open-filters').onclick = openFiltersPanel;
  $('#filters-close').onclick = closeFiltersPanel;
  $('#add-gasto-close').onclick = closeAddGasto;
  $('#add-gasto-cancel').onclick = () => {
    discardAddExpenseDraft();
    resetAddExpenseForm();
    closeAddGasto();
  };
  $('#add-gasto-dialog').oncancel = () => closeAddGasto();
  $('#add-gasto-form').onsubmit = event => {
    event.preventDefault();
    $('#btn-add-gasto').click();
  };
  bindFormDraft(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  INLINE_FORM_DRAFTS.forEach(config => bindFormDraft(config.key, config.fields));
  const savedExpenseView = localStorage.getItem(EXPENSE_VIEW_KEY) || 'table';
  $('#f-view').value = savedExpenseView;
  $('#f-view-mobile').value = savedExpenseView;
  $('#f-view').onchange = () => {
    setExpenseViewMode($('#f-view').value);
  };
  $('#f-view-mobile').onchange = () => {
    setExpenseViewMode($('#f-view-mobile').value);
  };
  $('#g-cat').onchange = () => {
    handleExpenseCategoryChange('g');
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  };
  $('#g-subcat').onchange = () => {
    handleExpenseSubcategoryChange('g');
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  };
  $('#edit-gasto-cat').onchange = () => {
    handleExpenseCategoryChange('edit-gasto');
    saveOpenExpenseCategoryClassification().catch(err => setMessage('#msg-edit-gasto', err.message || String(err), true));
  };
  $('#edit-gasto-subcat').onchange = () => {
    handleExpenseSubcategoryChange('edit-gasto');
    saveOpenExpenseCategoryClassification().catch(err => setMessage('#msg-edit-gasto', err.message || String(err), true));
  };
  $('#g-ticket').onchange = () => { pendingExpenseTicketLocationChecks.g = syncExpenseTicketSelection('g', 'file'); };
  $('#g-ticket-camera').onclick = () => saveFormDraft(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  $('#g-ticket-camera').onchange = () => { pendingExpenseTicketLocationChecks.g = syncExpenseTicketSelection('g', 'camera'); };
  $('#g-ticket-type').onchange = () => scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  $('#g-ticket-read').onclick = () => readExpenseTicket('g');
  $('#g-ticket-translate').onclick = () => translateExpenseTicket('g');
  $('#g-ticket-language').onchange = () => handleExpenseTicketLanguageChange('g');
  $('#g-extra-images').onchange = () => syncExpenseExtraImageSelection('g', { applyDateTime: true, resetClassifications: true });
  $('#g-extra-images-camera').onchange = () => syncExpenseExtraImageSelection('g', { applyDateTime: true, resetClassifications: true });
  $('#edit-gasto-ticket').onchange = () => { pendingExpenseTicketLocationChecks['edit-gasto'] = syncExpenseTicketSelection('edit-gasto', 'file'); };
  $('#edit-gasto-ticket-camera').onchange = () => { pendingExpenseTicketLocationChecks['edit-gasto'] = syncExpenseTicketSelection('edit-gasto', 'camera'); };
  $('#edit-gasto-ticket-read').onclick = () => readExpenseTicket('edit-gasto');
  $('#edit-gasto-ticket-translate').onclick = () => translateExpenseTicket('edit-gasto');
  $('#edit-gasto-ticket-language').onchange = () => handleExpenseTicketLanguageChange('edit-gasto');
  $('#edit-gasto-ticket-type').onchange = () => {
    saveOpenExpenseTicketClassification().catch(err => setMessage('#msg-edit-gasto', err.message || String(err), true));
  };
  $('#edit-gasto-ticket-map').onchange = () => {
    saveOpenExpenseTicketMapSetting().catch(err => setMessage('#msg-edit-gasto', err.message || String(err), true));
  };
  $('#edit-gasto-ticket-rotate-left').onclick = () => handleOpenExpenseTicketRotation('left');
  $('#edit-gasto-ticket-rotate-right').onclick = () => handleOpenExpenseTicketRotation('right');
  $$('[data-selected-ticket-rotate]').forEach(button => {
    button.onclick = () => handleSelectedExpenseTicketRotation(button.dataset.selectedTicketRotate, button.dataset.rotateDirection);
  });
  // An extra image added while editing must not reopen a second modal to offer
  // replacing the saved date/time. On Android, stacking that confirmation over
  // this long scrollable dialog can make Chrome continuously recenter the page.
  $('#edit-gasto-extra-images').onchange = () => syncExpenseExtraImageSelection('edit-gasto', { resetClassifications: true });
  $('#edit-gasto-extra-images-camera').onchange = () => syncExpenseExtraImageSelection('edit-gasto', { resetClassifications: true });
  $('#edit-gasto-extra-images-current').onchange = event => {
    if (!event.target.closest('[data-expense-image-type], [data-map-expense-image]')) return;
    saveOpenExpenseImageClassifications().catch(err => setMessage('#msg-edit-gasto', err.message || String(err), true));
  };
  $('#edit-gasto-extra-images-current').onclick = event => {
    const button = event.target.closest('[data-rotate-expense-image]');
    if (!button) return;
    const buttons = Array.from(button.parentElement.querySelectorAll('button'));
    buttons.forEach(item => { item.disabled = true; });
    queueExpenseMediaSave(() => rotateOpenExpenseImage(button.dataset.rotateExpenseImage, button.dataset.rotateDirection))
      .catch(err => {
        buttons.forEach(item => { item.disabled = false; });
        setMessage('#msg-edit-gasto', err.message || String(err), true);
      });
  };
  $('#edit-gasto-ticket-remove').onchange = () => {
    if ($('#edit-gasto-ticket-remove').checked) {
      clearExpenseTicketSelection('edit-gasto');
    } else {
      const current = currentEditTicket();
      pendingExpenseTicketTranslations['edit-gasto'] = ticketTranslationRecordFromExpense(current);
      $('#edit-gasto-ticket-type').value = current?.ticketData ? String(current.ticketPhotoTypeId || '') : '';
      syncExpenseTicketTypeAvailability('edit-gasto');
    }
    syncTicketOcrAvailability('edit-gasto');
    renderEditExpenseTicket();
  };
  $('#g-pais').onchange = () => {
    renderCiudades();
    syncExpenseExtraImageSelection('g');
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  };
  $('#g-ciudad').onchange = () => {
    syncExpenseExtraImageSelection('g');
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  };
  $('#g-fecha').onchange = () => {
    applyDefaultExpenseLocation();
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  };
  $('#edit-gasto-pais').onchange = () => {
    renderEditCiudades();
    syncExpenseExtraImageSelection('edit-gasto');
    const current = state.gastos.find(gasto => Number(gasto.id) === Number($('#edit-gasto-id').value));
    if (current) renderEditExpenseImages(current);
  };
  $('#edit-gasto-ciudad').onchange = () => {
    syncExpenseExtraImageSelection('edit-gasto');
    const current = state.gastos.find(gasto => Number(gasto.id) === Number($('#edit-gasto-id').value));
    if (current) renderEditExpenseImages(current);
  };
  $('#edit-gasto-cuenta').onchange = () => {
    const account = state.cuentas.find(c => c.id === Number($('#edit-gasto-cuenta').value));
    if (account) $('#edit-gasto-moneda').value = account.moneda;
  };
  $('#edit-gasto-viaje').onchange = () => {
    renderEditGastoAccountSelector();
    renderEditCiudades();
    warmTicketOcrLanguagesForTrip(Number($('#edit-gasto-viaje').value)).catch(() => {});
  };
  $('#edit-gasto-close').onclick = closeEditGasto;
  $('#edit-gasto-cancel').onclick = closeEditGasto;
  $('#edit-gasto-dialog').oncancel = event => {
    event.preventDefault();
    closeEditGasto();
  };
  $('#expense-files-close').onclick = closeExpenseFilesDialog;
  $('#expense-files-done').onclick = closeExpenseFilesDialog;
  $('#image-viewer-close').onclick = closeImageViewer;
  $('#image-viewer-done').onclick = closeImageViewer;
  $('#image-viewer-fit').onclick = () => setImageViewerZoom(0);
  $('#image-viewer-zoom-out').onclick = () => stepImageViewerZoom(-1);
  $('#image-viewer-zoom-in').onclick = () => stepImageViewerZoom(1);
  $('#image-viewer-image').ondblclick = () => setImageViewerZoom(activeImageViewerZoom ? 0 : 1);
  $('#image-viewer-dialog').oncancel = event => {
    event.preventDefault();
    closeImageViewer();
  };
  $('#image-viewer-share').onclick = async () => {
    const button = $('#image-viewer-share');
    try {
      button.disabled = true;
      await shareImageViewerFile();
    } catch (error) {
      if ($('#image-viewer-status')) $('#image-viewer-status').textContent = error?.message || 'No se ha podido compartir la imagen.';
    } finally {
      button.disabled = false;
    }
  };
  $('#image-viewer-download').onclick = async () => {
    const button = $('#image-viewer-download');
    try {
      button.disabled = true;
      await downloadActiveImageViewerFile();
    } catch (error) {
      if ($('#image-viewer-status')) $('#image-viewer-status').textContent = error?.message || 'No se ha podido descargar la imagen.';
    } finally {
      button.disabled = false;
    }
  };
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
      const saveButton = $('#edit-gasto-form button[type="submit"]');
      if (saveButton?.dataset.waitingForTicketRotation) {
        setMessage('#msg-edit-gasto', 'Terminando de girar el ticket antes de guardar…');
      }
      await pendingExpenseMediaSave;
      await pendingExpenseClassificationSave;
      await pendingExpenseTicketLocationChecks['edit-gasto'];
      const id = Number($('#edit-gasto-id').value);
      const cuentaId = $('#edit-gasto-cuenta').value;
      const catId = $('#edit-gasto-cat').value;
      const rawImporte = numberValue($('#edit-gasto-importe').value);
      const importe = $('#edit-gasto-tipo')?.value === 'ingreso' ? -Math.abs(rawImporte) : Math.abs(rawImporte);
      if (!cuentaId || !catId || importe === 0) throw new Error('Completa cuenta, categoría e importe');
      const current = state.gastos.find(g => g.id === id);
      const currentTicket = activeEditTicketRecord && Number(activeEditTicketRecord.id) === id
        ? activeEditTicketRecord
        : current;
      const ticket = await readSelectedExpenseTicket('edit-gasto');
      const newExtraImages = await readSelectedExpenseExtraImages('edit-gasto');
      const removedExtraImageIndexes = new Set($$('[data-remove-expense-image]:checked').map(input => Number(input.dataset.removeExpenseImage)));
      const extraImages = editExpenseImagesFromControls(current)
        .filter((image, index) => !removedExtraImageIndexes.has(index))
        .concat(newExtraImages);
      const ticketPatch = $('#edit-gasto-ticket-remove').checked
        ? { ticketName: '', ticketType: '', ticketData: '', ticketSize: 0, ticketWidth: 0, ticketHeight: 0, ticketPhotoTypeId: '', ticketPhotoTypeName: '', ticketLatitude: null, ticketLongitude: null, ticketLocationSource: '', ticketCapturedDate: '', ticketCapturedTime: '', ticketMapEnabled: false, ...ticketTranslationPatch(null) }
        : ticket
          ? { ticketName: ticket.name, ticketType: ticket.type, ticketData: ticket.data, ticketSize: ticket.size || 0, ticketWidth: ticket.width || 0, ticketHeight: ticket.height || 0, ...expenseTicketLocationPatch('edit-gasto'), ...ticketTranslationPatch(pendingExpenseTicketTranslations['edit-gasto']) }
          : { ticketName: currentTicket ? currentTicket.ticketName : '', ticketType: currentTicket ? currentTicket.ticketType : '', ticketData: currentTicket ? currentTicket.ticketData : '', ticketSize: currentTicket ? currentTicket.ticketSize || 0 : 0, ticketWidth: currentTicket ? currentTicket.ticketWidth || 0 : 0, ticketHeight: currentTicket ? currentTicket.ticketHeight || 0 : 0, ...expenseTicketLocationPatch('edit-gasto', currentTicket), ...ticketTranslationPatch(pendingExpenseTicketTranslations['edit-gasto'] || ticketTranslationRecordFromExpense(currentTicket)) };
      const selectedTicketType = photoTypeById($('#edit-gasto-ticket-type').value);
      if (ticketPatch.ticketData) {
        ticketPatch.ticketPhotoTypeId = selectedTicketType ? selectedTicketType.id : '';
        ticketPatch.ticketPhotoTypeName = selectedTicketType ? selectedTicketType.nombre : '';
      }
      await updateGasto(id, {
        fecha: $('#edit-gasto-fecha').value || todayIso(),
        hora: $('#edit-gasto-hora').value || currentLocalTime(),
        viajeId: $('#edit-gasto-viaje').value || null,
        cuentaId,
        catId,
        subcatId: $('#edit-gasto-subcat').value || null,
        paisId: $('#edit-gasto-pais').value || null,
        ciudadId: $('#edit-gasto-ciudad').value || null,
        importe,
        desc: $('#edit-gasto-desc').value.trim(),
        extraImages,
        ...ticketPatch
      });
      rememberTicketCategory('edit-gasto');
      const expenseActionAnchor = activeEditExpenseActionAnchor || captureExpenseActionAnchor(id);
      closeEditGasto({ restoreAnchor: false });
      await loadAll();
      setTab('gastos', { expenseActionAnchor });
    } catch (err) {
      setMessage('#msg-edit-gasto', err.message || String(err), true);
    }
  };
  $('#g-cuenta').onchange = () => {
    const account = state.cuentas.find(c => c.id === Number($('#g-cuenta').value));
    if (account) $('#g-moneda').value = account.moneda;
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
  };
  $('#g-viaje').onchange = () => {
    renderGastoAccountSelector();
    applyDefaultExpenseLocation();
    warmTicketOcrLanguagesForTrip(Number($('#g-viaje').value)).catch(() => {});
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
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
    scheduleFormDraftSave(addExpenseDraftKey(), ADD_EXPENSE_DRAFT_FIELDS);
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
    tripMapState.day = '';
    resetTripMapView();
    renderTripMap();
  };
  $('#map-viaje').onchange = () => {
    applySelectedTrip($('#map-viaje').value ? Number($('#map-viaje').value) : null);
  };
  $('#r-viaje').onchange = () => {
    setSelectedTrips($('#r-viaje').value ? [Number($('#r-viaje').value)] : []);
    tripMapState.showPlanned = true;
    tripMapState.destinationOnly = false;
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
  if ($('#btn-toggle-comparison')) $('#btn-toggle-comparison').onclick = () => {
    const comparison = $('#resumen-comparacion');
    const button = $('#btn-toggle-comparison');
    if (!comparison || !button) return;
    const shouldOpen = comparison.hidden;
    comparison.hidden = !shouldOpen;
    button.setAttribute('aria-expanded', String(shouldOpen));
    button.classList.toggle('active', shouldOpen);
    if (shouldOpen) {
      renderTripComparisonSelectors();
      renderTripComparison();
      requestAnimationFrame(() => comparison.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
  document.querySelectorAll('#view-resumen .summary-links a').forEach(link => {
    link.addEventListener('click', () => {
      const comparison = $('#resumen-comparacion');
      const button = $('#btn-toggle-comparison');
      if (comparison) comparison.hidden = true;
      if (button) {
        button.setAttribute('aria-expanded', 'false');
        button.classList.remove('active');
      }
    });
  });
  if ($('#compare-main-trip')) $('#compare-main-trip').onchange = () => {
    openComparisonCategories.clear();
    renderTripComparisonSelectors();
    renderTripComparison();
  };
  if ($('#compare-other-trip')) $('#compare-other-trip').onchange = () => {
    openComparisonCategories.clear();
    renderTripComparison();
  };
  if ($('#compare-swap')) $('#compare-swap').onclick = () => {
    const mainSelect = $('#compare-main-trip');
    const otherSelect = $('#compare-other-trip');
    const mainId = Number(mainSelect && mainSelect.value);
    const otherId = Number(otherSelect && otherSelect.value);
    if (!mainId || !otherId) return;
    mainSelect.value = String(otherId);
    renderTripComparisonSelectors();
    otherSelect.value = String(mainId);
    openComparisonCategories.clear();
    renderTripComparison();
  };
  if ($('#tabla-comparacion-categorias tbody')) $('#tabla-comparacion-categorias tbody').onclick = event => {
    const toggle = event.target.closest('[data-comparison-category]');
    if (!toggle) return;
    const key = toggle.dataset.comparisonCategory;
    if (openComparisonCategories.has(key)) openComparisonCategories.delete(key);
    else openComparisonCategories.add(key);
    renderTripComparison();
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
      await pendingExpenseMediaSave;
      await pendingExpenseTicketLocationChecks.g;
      const ticket = await readSelectedExpenseTicket('g');
      const selectedTicketType = ticket ? photoTypeById($('#g-ticket-type').value) : null;
      const extraImages = await readSelectedExpenseExtraImages('g');
      await addGasto({
        fecha,
        hora: $('#g-hora').value || currentLocalTime(),
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
        ticketData: ticket ? ticket.data : '',
        ticketSize: ticket ? ticket.size || 0 : 0,
        ticketWidth: ticket ? ticket.width || 0 : 0,
        ticketHeight: ticket ? ticket.height || 0 : 0,
        ticketPhotoTypeId: selectedTicketType ? selectedTicketType.id : '',
        ticketPhotoTypeName: selectedTicketType ? selectedTicketType.nombre : '',
        ...(ticket ? expenseTicketLocationPatch('g') : {}),
        ...ticketTranslationPatch(ticket ? pendingExpenseTicketTranslations.g : null),
        extraImages
      });
      clearFormDraft(addExpenseDraftKey());
      rememberTicketCategory('g');
      $('#g-importe').value = '';
      $('#g-desc').value = '';
      clearExpenseTicketSelection('g');
      clearExpenseExtraImageSelection('g');
      $('#g-hora').value = currentLocalTime();
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
        accountType: $('#c-tipo') ? $('#c-tipo').value : '',
        nota: $('#c-nota').value.trim()
      });
      clearFormDraft('config-cuenta');
      ['#c-nombre', '#c-template', '#c-tipo', '#c-saldo', '#c-nota'].forEach(sel => { if ($(sel)) $(sel).value = ''; });
      setMessage('#msg-cuenta', 'Cuenta anadida');
      await loadAll();
    } catch (err) {
      setMessage('#msg-cuenta', err.message || String(err), true);
    }
  };

  $('#btn-add-transfer').onclick = async () => {
    try {
      const sourceId = Number($('#t-from').value);
      const targetId = Number($('#t-to').value);
      await addTransferencia({
        fecha: $('#t-fecha').value || todayIso(),
        fromId: sourceId,
        toId: targetId,
        importe: $('#t-importe').value,
        importeTo: $('#t-importe-to') ? $('#t-importe-to').value : '',
        nota: $('#t-nota').value
      });
      clearFormDraft('config-transferencia');
      ['#t-importe', '#t-importe-to', '#t-cambio', '#t-nota'].forEach(sel => { if ($(sel)) $(sel).value = ''; });
      if (!$('#t-fecha').value) $('#t-fecha').value = todayIso();
      await loadAll();
      const source = state.cuentas.find(account => Number(account.id) === sourceId);
      const target = state.cuentas.find(account => Number(account.id) === targetId);
      const detected = [source, target]
        .filter(Boolean)
        .map(account => `${account.nombre}: ${accountTypeLabel(account)}`)
        .join(' · ');
      setMessage('#msg-transfer', `Transferencia añadida${detected ? ` · ${detected}` : ''}`);
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
      const newTripId = await addViaje({ nombre, fechaInicio, fechaFin, presupuesto: $('#v-presu').value, paisIds, ciudadIds: allMultiValues('#v-ciudades') });
      clearFormDraft('config-viaje');
      ['#v-nombre', '#v-inicio', '#v-fin', '#v-presu'].forEach(sel => $(sel).value = '');
      if ($('#v-paises')) [...$('#v-paises').options].forEach(opt => { opt.selected = false; });
      if ($('#v-ciudades')) [...$('#v-ciudades').options].forEach(opt => { opt.selected = false; });
      setMessage('#msg-viaje', 'Viaje anadido');
      await loadAll();
      warmTicketOcrLanguagesForTrip(newTripId).catch(() => {});
    } catch (err) {
      setMessage('#msg-viaje', err.message || String(err), true);
    }
  };

  $('#v-inicio').onchange = () => {
    const start = $('#v-inicio').value;
    if (start && (!$('#v-fin').value || $('#v-fin').value < start)) $('#v-fin').value = start;
    scheduleInlineFormDraft('config-viaje');
  };
  $('#v-paises').onchange = () => {
    renderTripPlannedCitySelector();
    scheduleInlineFormDraft('config-viaje');
  };
  $('#v-ciudades').onchange = () => {
    updateTripPlanningCounters();
    scheduleInlineFormDraft('config-viaje');
  };
  if ($('#v-ciudades-up')) $('#v-ciudades-up').onclick = event => {
    event.preventDefault();
    moveSelectedMultiOption('#v-ciudades', -1);
    scheduleInlineFormDraft('config-viaje');
  };
  if ($('#v-ciudades-down')) $('#v-ciudades-down').onclick = event => {
    event.preventDefault();
    moveSelectedMultiOption('#v-ciudades', 1);
    scheduleInlineFormDraft('config-viaje');
  };
  if ($('#v-ciudades-remove')) $('#v-ciudades-remove').onclick = event => {
    event.preventDefault();
    removeSelectedMultiOptions('#v-ciudades');
    scheduleInlineFormDraft('config-viaje');
  };
  if ($('#v-ciudades-reset')) $('#v-ciudades-reset').onclick = event => {
    event.preventDefault();
    resetPlannedCitySelector('#v-paises', '#v-ciudades');
    scheduleInlineFormDraft('config-viaje');
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
      clearFormDraft('config-moneda');
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
      clearFormDraft('config-categoria');
      $('#cat-nombre').value = '';
      $('#cat-parent').value = '';
      setMessage('#msg-cat', 'Categoría guardada');
      await loadAll();
    } catch (err) {
      setMessage('#msg-cat', err.message || String(err), true);
    }
  };

  $('#btn-add-photo-type').onclick = async () => {
    try {
      await addPhotoType({
        nombre: $('#photo-type-name').value,
        useAsDestination: $('#photo-type-destination').checked
      });
      $('#photo-type-name').value = '';
      $('#photo-type-destination').checked = false;
      setMessage('#msg-photo-type', 'Tipo de foto guardado');
    } catch (err) {
      setMessage('#msg-photo-type', err.message || String(err), true);
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
      clearFormDraft('config-lugar');
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
  $('#f-apply').onclick = applyExpenseFilters;
  $('#btn-reset').onclick = resetDataPrompt;

  document.addEventListener('change', async event => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.ticketOcrLanguage) {
      await saveTicketOcrLanguageSettings();
      return;
    }
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
      renderTransferAccountSelectors();
      renderTransferencias();
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
      renderTransferAccountSelectors();
      renderTransferencias();
      renderResumen();
      return;
    }
    if (!(target instanceof HTMLSelectElement) || !target.value) return;
    const gastoActionId = target.dataset.gastoAction;
    const tripConfigActionId = target.dataset.tripConfigAction;
    const tripHomeActionId = target.dataset.tripHomeAction;
    const blogActionId = target.dataset.blogAction;
    // Este controlador pertenece solo a los menús "Acciones". No debe vaciar
    // los desplegables normales de los formularios (categoría, ciudad, etc.).
    if (!gastoActionId && !tripConfigActionId && !tripHomeActionId && !blogActionId) return;
    try {
      const action = target.value;
      target.value = '';
      if (gastoActionId) await handleGastoAction(gastoActionId, action);
      else if (blogActionId) await handleBlogAction(blogActionId, action);
      else await handleTripConfigAction(tripConfigActionId || tripHomeActionId, action);
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  document.addEventListener('dblclick', event => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('button, select, input, textarea, a')) return;
    const editable = target.closest('[data-editable-type][data-editable-id]');
    if (editable) {
      const type = editable.dataset.editableType;
      const id = String(editable.dataset.editableId || '');
      const controls = {
        cuenta: ['[data-edit-cuenta]', 'editCuenta'],
        moneda: ['[data-edit-moneda]', 'editMoneda'],
        categoria: ['[data-edit-cat]', 'editCat'],
        lugar: ['[data-edit-lugar]', 'editLugar'],
        foto: ['[data-edit-photo-type]', 'editPhotoType']
      }[type];
      const editButton = controls
        ? $$(controls[0]).find(control => String(control.dataset[controls[1]] || '') === id)
        : null;
      if (editButton) {
        event.preventDefault();
        editButton.click();
        return;
      }
    }
    const tripRow = target.closest('#tabla-viajes-home .trip-row[data-trip-id], #tabla-viajes .trip-row[data-trip-id]');
    if (tripRow) {
      event.preventDefault();
      handleTripConfigAction(tripRow.dataset.tripId, 'edit').catch(error => alert(error.message || String(error)));
      return;
    }
    const expenseRow = target.closest('#tabla-gastos .expense-row[data-gasto-id]');
    if (expenseRow) {
      event.preventDefault();
      handleGastoAction(expenseRow.dataset.gastoId, 'edit').catch(error => alert(error.message || String(error)));
      return;
    }
    const blogRow = target.closest('#tabla-blog .blog-day-entry[data-blog-entry-id]');
    if (!blogRow) return;
    const entry = state.blogEntries.find(item => Number(item.id) === Number(blogRow.dataset.blogEntryId));
    if (!entry) return;
    event.preventDefault();
    openBlogEntryDialog(entry);
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const blogPointMap = target.closest('[data-blog-point-map]');
    if (blogPointMap) {
      selectBlogPointFromMap(event, blogPointMap);
      return;
    }
    const openBlogPoint = target.closest('[data-open-blog-point]');
    if (openBlogPoint) {
      const entry = state.blogEntries.find(item => Number(item.id) === Number(openBlogPoint.dataset.openBlogPoint));
      const url = blogPointMapUrl(entry);
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }
    const blogDayToggle = target.closest('[data-blog-day-toggle]');
    if (blogDayToggle) {
      const date = blogDayToggle.dataset.blogDayToggle;
      if (openBlogDays.has(date)) openBlogDays.delete(date);
      else openBlogDays.add(date);
      renderBlog();
      return;
    }
    const expenseGroupToggle = target.closest('[data-expense-group-toggle]');
    if (expenseGroupToggle) {
      const key = expenseGroupToggle.dataset.expenseGroupToggle;
      if (openExpenseGroups.has(key)) openExpenseGroups.delete(key);
      else openExpenseGroups.add(key);
      renderGastosTabla();
      return;
    }
    const editBlogButton = target.closest('[data-edit-blog]');
    if (editBlogButton) {
      const entry = state.blogEntries.find(item => Number(item.id) === Number(editBlogButton.dataset.editBlog));
      if (entry) openBlogEntryDialog(entry);
      return;
    }
    const deleteBlogButton = target.closest('[data-delete-blog]');
    if (deleteBlogButton) {
      if (!confirm('¿Eliminar esta entrada del blog?')) return;
      delBlogEntry(deleteBlogButton.dataset.deleteBlog)
        .then(loadAll)
        .catch(error => alert(error.message || String(error)));
      return;
    }
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
    if (target instanceof HTMLSelectElement && target.dataset.mapDay) {
      tripMapState.day = target.value || '';
      if (tripMapState.day) tripMapState.cityId = 0;
      resetTripMapView();
      renderTripMap();
      return;
    }
    if (target instanceof HTMLSelectElement && target.dataset.mapCity) {
      tripMapState.cityId = Number(target.value) || 0;
      if (tripMapState.cityId) tripMapState.day = '';
      resetTripMapView();
      renderTripMap();
      return;
    }
    if (target instanceof HTMLSelectElement && target.dataset.routeCity) {
      const index = Number(target.dataset.routeCity);
      if (routeEditorState.stops[index]) routeEditorState.stops[index].cityId = Number(target.value);
      return;
    }
    if (target instanceof HTMLSelectElement && target.dataset.routeRole) {
      const index = Number(target.dataset.routeRole);
      if (routeEditorState.stops[index]) routeEditorState.stops[index].role = target.value;
      return;
    }
    if (target instanceof HTMLInputElement && target.dataset.routeDate) {
      const index = Number(target.dataset.routeDate);
      if (routeEditorState.stops[index]) routeEditorState.stops[index].date = target.value || '';
      return;
    }
    if (target instanceof HTMLInputElement && target.dataset.routePosition) {
      const index = Number(target.dataset.routePosition);
      const next = Math.max(1, Math.min(routeEditorState.stops.length, Number(target.value || 1))) - 1;
      moveRouteStop(index, next);
      renderRouteDialog();
    }
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const deleteButton = target.closest('[data-route-delete]');
    if (deleteButton) {
      const index = Number(deleteButton.dataset.routeDelete);
      routeEditorState.stops.splice(index, 1);
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
      const firstCityId = Number(routeEditorState.stops[0] && routeEditorState.stops[0].cityId);
      const role = firstCityId && cityId === firstCityId
        ? ROUTE_STOP_ROLE_ENDPOINT
        : ROUTE_STOP_ROLE_DESTINATION;
      routeEditorState.stops.push({ cityId, role, date: '' });
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
  document.addEventListener('pointerdown', startBlogPointMapGesture);
  document.addEventListener('pointermove', moveBlogPointMapGesture);
  document.addEventListener('pointerup', endBlogPointMapGesture);
  document.addEventListener('pointercancel', endBlogPointMapGesture);
  document.addEventListener('wheel', zoomBlogPointMapWithWheel, { passive: false });
  document.addEventListener('dblclick', zoomTripMapAt);
  document.addEventListener('fullscreenchange', () => {
    const container = $('#trip-map');
    if (!document.fullscreenElement) document.body.classList.remove('map-fullscreen-open');
    if (container) {
      resetTripMapView();
      renderTripMap();
    }
  });
  window.addEventListener('resize', () => {
    if (!isTripMapFullscreen()) return;
    resetTripMapView();
    renderTripMap();
  });

  document.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    try {
      const sharedImageButton = target.closest('[data-open-shared-image]');
      if (sharedImageButton) {
        const index = Number(sharedImageButton.dataset.openSharedImage);
        const file = pendingSharedImagesPayload?.files?.[index];
        if (!file) throw new Error('La imagen compartida ya no está disponible.');
        openImageViewer({ file, name: file.name, type: file.type }, file.name || `Imagen ${index + 1}`);
        return;
      }
      const pendingExpenseImageButton = target.closest('[data-open-pending-expense-image]');
      if (pendingExpenseImageButton) {
        const prefix = pendingExpenseImageButton.dataset.openPendingExpenseImage;
        const index = Number(pendingExpenseImageButton.dataset.pendingExpenseImageIndex);
        const file = selectedExpenseExtraImageRecords(prefix)[index]?.file;
        if (!file) throw new Error('La imagen seleccionada ya no está disponible.');
        openImageViewer({ file, name: file.name, type: file.type }, file.name || `Imagen ${index + 1}`);
        return;
      }
      const localBackupButton = target.closest('[data-download-local-backup]');
      if (localBackupButton) {
        await downloadStoredLocalBackup(localBackupButton.dataset.downloadLocalBackup);
        return;
      }
      const expenseFilesButton = target.closest('[data-expense-files]');
      if (expenseFilesButton) {
        openExpenseFilesDialog(expenseFilesButton.dataset.expenseFiles);
        return;
      }
      const expenseImageButton = target.closest('[data-open-expense-image]');
      if (expenseImageButton) {
        openExpenseImage(expenseImageButton.dataset.openExpenseImage, expenseImageButton.dataset.expenseImageIndex);
        return;
      }
      const openTicketButton = target.closest('[data-open-ticket]');
      if (openTicketButton) {
        openTicket(openTicketButton.dataset.openTicket);
        return;
      }
      const openTicketTranslationButton = target.closest('[data-open-ticket-translation]');
      if (openTicketTranslationButton) {
        openTicketTranslation(openTicketTranslationButton.dataset.openTicketTranslation);
        return;
      }
      const tripReviewButton = target.closest('[data-review-trip]');
      if (tripReviewButton) {
        openTripReviewDialog(tripReviewButton.dataset.reviewTrip);
        return;
      }
      const tripDocumentsButton = target.closest('[data-trip-documents]');
      if (tripDocumentsButton) {
        openTripDocumentsDialog(tripDocumentsButton.dataset.tripDocuments);
        return;
      }
      const openTripDocumentButton = target.closest('[data-open-trip-document]');
      if (openTripDocumentButton) {
        openTripDocument(openTripDocumentButton.dataset.openTripDocument);
        return;
      }
      const deleteTripDocumentButton = target.closest('[data-delete-trip-document]');
      if (deleteTripDocumentButton) {
        if (!confirm('¿Eliminar este documento del viaje?')) return;
        await delTripDocument(deleteTripDocumentButton.dataset.deleteTripDocument);
        state.viajeDocumentos = await getAll('tripDocuments');
        renderTripDocumentsDialog();
        renderViajes();
        renderViajesHome();
        return;
      }
      const mapPhotoMarker = target.closest('[data-map-photo-keys]');
      if (mapPhotoMarker) {
        if (mapPhotoMarker.dataset.ignoreMapPointClick === '1') return;
        openTripMapPhotoPopup(mapPhotoMarker.getAttribute('data-map-photo-keys'), mapPhotoMarker);
        return;
      }
      const mapPhotoClose = target.closest('[data-map-photo-close]');
      if (mapPhotoClose) {
        closeTripMapPhotoPopup();
        return;
      }
      const mapPhotoOpen = target.closest('[data-open-map-photo]');
      if (mapPhotoOpen) {
        openTripMapPhoto(mapPhotoOpen.dataset.openMapPhoto);
        return;
      }
      const adjustMapPhoto = target.closest('[data-adjust-map-photo]');
      if (adjustMapPhoto) {
        const key = adjustMapPhoto.dataset.adjustMapPhoto;
        if (!tripMapPhotoLookup.has(key)) throw new Error('No se encuentra la foto que quieres ajustar');
        tripMapState.photoEditKey = key;
        tripMapState.preserveViewportOnNextRender = true;
        closeTripMapPhotoPopup();
        renderTripMap();
        const info = $('#trip-map-info');
        if (info) info.textContent = 'La foto seleccionada aparece separada. Mantén pulsado su punto + y arrástralo hasta la posición exacta.';
        return;
      }
      const mapFullscreenButton = target.closest('[data-map-fullscreen]');
      if (mapFullscreenButton) {
        await toggleTripMapFullscreen();
        return;
      }
      const mapCopyBlogButton = target.closest('[data-map-copy-blog]');
      if (mapCopyBlogButton) {
        mapCopyBlogButton.setAttribute('disabled', 'disabled');
        try {
          await copyCurrentMapToBlog();
        } finally {
          if (document.contains(mapCopyBlogButton)) mapCopyBlogButton.removeAttribute('disabled');
        }
        return;
      }
      const mapZoomButton = target.closest('[data-map-zoom]');
      if (mapZoomButton) {
        const action = mapZoomButton.dataset.mapZoom;
        if (tripVectorMap && (action === 'in' || action === 'out')) {
          tripVectorMap.easeTo({
            zoom: Math.max(TRIP_MAP_MIN_ZOOM, Math.min(TRIP_MAP_MAX_ZOOM, tripVectorMap.getZoom() + (action === 'in' ? 1 : -1))),
            duration: 240
          });
          return;
        }
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
      const mapTimelineButton = target.closest('[data-map-timeline]');
      if (mapTimelineButton) {
        openTimelineDialog();
        return;
      }
      const mapAddStopButton = target.closest('[data-map-add-stop]');
      if (mapAddStopButton) {
        await addMapStopToTrip();
        return;
      }
      const mapPlannedButton = target.closest('[data-map-planned]');
      if (mapPlannedButton) {
        tripMapState.showPlanned = !tripMapState.showPlanned;
        resetTripMapView();
        renderTripMap();
        return;
      }
      const mapPhotosButton = target.closest('[data-map-photos]');
      if (mapPhotosButton) {
        tripMapState.showPhotos = !tripMapState.showPhotos;
        resetTripMapView();
        renderTripMap();
        return;
      }
      const mapSatelliteButton = target.closest('[data-map-satellite]');
      if (mapSatelliteButton) {
        tripMapState.showSatellite = !tripMapState.showSatellite;
        renderTripMap();
        return;
      }
      const mapDestinationButton = target.closest('[data-map-destination]');
      if (mapDestinationButton) {
        const { destinationOnlyAvailable } = tripMapItemsForCurrentScope();
        if (!destinationOnlyAvailable) return;
        tripMapState.destinationOnly = !tripMapState.destinationOnly;
        resetTripMapView();
        renderTripMap();
        return;
      }
      if (target.dataset.editPhotoType) {
        const type = photoTypeById(target.dataset.editPhotoType);
        if (!type) return;
        openFormDialog({
          title: 'Editar tipo de foto',
          helpTarget: 'clasificaciones',
          fields: [
            { name: 'nombre', label: 'Nombre', value: type.nombre },
            { name: 'useAsDestination', label: 'Usar como punto de destino', type: 'checkbox', value: type.useAsDestination }
          ],
          onSubmit: values => updatePhotoType(type.id, values)
        });
        return;
      }
      if (target.dataset.deletePhotoType) {
        const type = photoTypeById(target.dataset.deletePhotoType);
        if (type && confirm(`¿Eliminar el tipo de foto ${type.nombre}? Las fotos conservarán el nombre guardado, pero quedarán fuera de este filtro.`)) {
          await deletePhotoType(type.id);
        }
        return;
      }
      if (target.dataset.delCuenta) {
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
        const accountScope = c.viajeId ? (tripName(c.viajeId) || 'viaje') : 'plantilla global';
        openFormDialog({
          title: `Editar ${c.nombre} · ${accountScope}`,
          helpTarget: 'cuentas',
          fields: [
            { name: 'nombre', label: 'Nombre', value: c.nombre },
            { name: 'accountType', label: 'Tipo de cuenta', type: 'select', value: normalizeAccountType(c.accountType), options: ACCOUNT_TYPE_OPTIONS },
            { name: 'saldoActual', label: 'Saldo actual', type: 'number', step: '0.01', value: numberValue(c.saldoActual) }
          ],
          onSubmit: async values => {
            await updateCuenta(c.id, { nombre: values.nombre.trim() || c.nombre, accountType: normalizeAccountType(values.accountType), saldoActual: numberValue(values.saldoActual) });
          }
        });
        return;
      } else if (target.dataset.delViaje) {
        if (confirm('Eliminar este viaje? Los gastos se conservarán sin viaje.')) await delViaje(target.dataset.delViaje);
      } else if (target.dataset.editViaje) {
        const v = state.viajes.find(item => item.id === Number(target.dataset.editViaje));
        if (!v) return;
        openEditViajeDialog(v);
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
          helpTarget: 'monedas',
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
          helpTarget: 'categorias',
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
          helpTarget: 'paises-ciudades',
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
      } else {
        return;
      }
      await loadAll();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $('#btn-export').onclick = () => openBackupDialogSafe();
  $('#trip-documents-close').onclick = closeTripDocumentsDialog;
  $('#trip-review-close').onclick = closeTripReviewDialog;
  $('#trip-review-done').onclick = closeTripReviewDialog;
  $('#trip-document-file').onchange = () => {
    if ($('#trip-document-file').files.length) {
      $('#trip-document-camera').value = '';
      $('#trip-document-selected').textContent = $('#trip-document-file').files[0].name;
    }
  };
  $('#trip-document-camera').onchange = () => {
    if ($('#trip-document-camera').files.length) {
      $('#trip-document-file').value = '';
      $('#trip-document-selected').textContent = $('#trip-document-camera').files[0].name || 'Foto de cámara';
    }
  };
  $('#trip-document-add').onclick = async () => {
    try {
      await saveTripDocumentFromForm();
    } catch (error) {
      setMessage('#msg-trip-document', error.message || String(error), true);
    }
  };
  $('#trip-documents-form').onsubmit = event => {
    event.preventDefault();
  };
  $('#backup-close').onclick = closeBackupDialog;
  $('#backup-dialog').oncancel = event => {
    if (backupCloudUploadInProgress) event.preventDefault();
  };
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
  if ($('#btn-compact-storage')) $('#btn-compact-storage').onclick = compactStoragePrompt;
  if ($('#btn-clear-form-drafts')) $('#btn-clear-form-drafts').onclick = clearAllFormDrafts;
  renderFormDraftStatus();
  $('#btn-import').onclick = () => openBackupDialogSafe('import');
  $('#btn-import-home').onclick = () => openBackupDialogSafe('import');
  $('#btn-backup-home').onclick = () => openBackupDialogSafe('backup');
  $('#btn-sync-home').onclick = () => openSyncDialog();
  $('#btn-sync-config').onclick = () => openSyncDialog();
  $('#sync-close').onclick = closeSyncDialog;
  $('#sync-cloud-progress-dialog').oncancel = event => event.preventDefault();
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
  $('#btn-print-summary-top').onclick = openPrintDialog;
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

const APP_LOADING_STARTED_AT = Date.now();
const APP_LOADING_MIN_MS = 4000;
const APP_LOADING_MAX_MS = 8000;
const APP_HAS_SHARED_LAUNCH = new URL(window.location.href).searchParams.has('shared')
  || new URL(window.location.href).searchParams.has('shared_error');

if (APP_HAS_SHARED_LAUNCH) {
  const loadingMessage = $('#app-loading p');
  if (loadingMessage) loadingMessage.textContent = 'Preparando contenido compartido...';
}

function finishAppLoading() {
  const loading = $('#app-loading');
  if (!loading || loading.classList.contains('is-ready')) return;
  const elapsed = Date.now() - APP_LOADING_STARTED_AT;
  const delay = Math.max(0, APP_LOADING_MIN_MS - elapsed);
  window.setTimeout(() => {
    if (!loading || loading.classList.contains('is-ready')) return;
    loading.classList.add('is-ready');
    window.setTimeout(() => {
      loading.remove();
      showOfflineEntryNotice();
    }, 460);
  }, delay);
}

function showOfflineEntryNotice() {
  if (typeof navigator === 'undefined' || (navigator.onLine !== false && !appNetworkUnavailable)) return;
  if (sessionStorage.getItem(OFFLINE_ENTRY_NOTICE_KEY) === '1') return;
  sessionStorage.setItem(OFFLINE_ENTRY_NOTICE_KEY, '1');
  const dialog = $('#offline-entry-dialog');
  if (!dialog || dialog.open) return;
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', 'open');
}

function closeOfflineEntryNotice() {
  const dialog = $('#offline-entry-dialog');
  if (!dialog) return;
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

async function saveBlogCameraOriginal() {
  const file = activeBlogCameraOriginalFile;
  if (!file) {
    updateBlogOriginalActions('', false);
    return;
  }
  const point = storedImageCoordinates(activeBlogImage);
  let exportBlob = file;
  if (point && /jpe?g/i.test(String(file.type || file.name || ''))) {
    imageLocationModulePromise ||= import('./image-location.js?v=700v278');
    const metadata = await imageLocationModulePromise;
    exportBlob = await metadata.embedGpsInJpegBlob(file, point.latitude, point.longitude);
  }
  const filename = imageViewerDownloadName(new Date(), exportBlob.type || file.type || 'image/jpeg');
  const shareFile = new File([exportBlob], filename, { type: exportBlob.type || file.type || 'image/jpeg' });
  try {
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [shareFile] })) {
      await navigator.share({
        files: [shareFile],
        title: filename,
        text: 'Foto original del blog'
      });
      updateBlogOriginalActions('Abierto el menú del sistema. Elige Guardar imagen/Fotos si aparece.');
      return;
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      updateBlogOriginalActions('Guardado cancelado.');
      return;
    }
    console.warn('No se pudo compartir la foto original', error);
  }
  const url = URL.createObjectURL(exportBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  updateBlogOriginalActions('Descarga iniciada. En algunos móviles se guarda en Descargas.');
}

window.setTimeout(finishAppLoading, APP_HAS_SHARED_LAUNCH ? 15000 : APP_LOADING_MAX_MS);

function updateOfflineStatus() {
  const status = $('#offline-status');
  const offline = typeof navigator !== 'undefined' && (navigator.onLine === false || appNetworkUnavailable);
  if (status) status.hidden = !offline;
  const loadingMessage = $('#app-loading p');
  if (loadingMessage && !APP_HAS_SHARED_LAUNCH) {
    if (offline) loadingMessage.textContent = 'Sin conexión · entrando con datos locales...';
    else if (loadingMessage.textContent.startsWith('Sin conexión')) loadingMessage.textContent = 'Preparando el viaje...';
  }
  if (offline && !$('#app-loading')) showOfflineEntryNotice();
  if (!offline) closeOfflineEntryNotice();
}

async function refreshNetworkAvailability() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    appNetworkUnavailable = true;
    updateOfflineStatus();
    return false;
  }
  try {
    const response = await fetch(`./version.txt?network=${Date.now()}`, { cache: 'no-store' });
    appNetworkUnavailable = !response.ok;
  } catch (_) {
    appNetworkUnavailable = true;
  }
  updateOfflineStatus();
  return !appNetworkUnavailable;
}

updateOfflineStatus();
window.addEventListener('online', () => {
  refreshNetworkAvailability();
});
window.addEventListener('offline', () => {
  appNetworkUnavailable = true;
  updateOfflineStatus();
});

window.addEventListener('DOMContentLoaded', async () => {
  try {
    updateOfflineStatus();
    installDialogHelpLinks();
    bindEvents();
    ensureSyncKey();
    await withDataTrackingPaused(seedIfEmpty);
    await loadAll();
    ensureLocalDataUpdatedAt();
    await refreshLocalBackupHistory();
    if (!APP_HAS_SHARED_LAUNCH) {
      try {
        await createEntryBackup();
      } catch (error) {
        console.warn('No se pudo crear la copia local de entrada', error);
      }
    }
    renderBackupStatus();
    sharedContentAppReady = true;
    const queuedSharedTargets = pendingSharedLaunchTargets.slice();
    pendingSharedLaunchTargets = [];
    queuedSharedTargets.forEach(queueSharedLaunchTarget);
    if (APP_HAS_SHARED_LAUNCH) queueSharedLaunchTarget(window.location.href);
    await recoverPendingSharedContent();
    await sharedLaunchDrainPromise;
    finishAppLoading();
    if (APP_HAS_SHARED_LAUNCH) {
      window.setTimeout(() => {
        createEntryBackup()
          .then(renderBackupStatus)
          .catch(error => console.warn('No se pudo crear la copia local de entrada', error));
      }, 0);
    }
    if (!APP_HAS_SHARED_LAUNCH) window.setTimeout(() => checkCloudOnEntry(), 0);
  } finally {
    finishAppLoading();
  }
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
