const APP_VERSION = '700v172';
const CACHE_NAME = 'gastosdeviaje-700v172-offline-start';
const MAP_RUNTIME_CACHE = 'cuaderno-bitacora-map-runtime-v1';
const SHARED_FILES_CACHE = 'cuaderno-bitacora-shared-files-v1';
const SHARE_TARGET_PATH = new URL('./share-target', self.location.href).pathname;
const APP_SHELL_REQUIRED = [
  './',
  './index.html',
  './styles.css?v=700v172',
  './map-model.js?v=700v172',
  './app.bundle.js?v=700v172',
  './vendor/maplibre/maplibre-gl.css?v=5.24.0',
  './vendor/maplibre/maplibre-gl.js?v=5.24.0',
  './manifest.webmanifest?v=700v172',
  './version.txt',
  './assets/bitacora-splash.png',
  './assets/bitacora-splash-mobile.png',
  './assets/loading-train.png'
];
const APP_SHELL_OPTIONAL = [
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './ticket-ocr.js?v=700v172',
  './image-location.js?v=700v172',
  './ayuda.html',
  './vendor/pdfjs/pdf.min.mjs',
  './vendor/pdfjs/pdf.worker.min.mjs',
  './vendor/tesseract/tesseract.esm.min.js',
  './vendor/tesseract/worker.min.js',
  './vendor/tesseract/core/tesseract-core-lstm.wasm',
  './vendor/tesseract/core/tesseract-core-lstm.wasm.js',
  './vendor/tesseract/core/tesseract-core-simd-lstm.wasm',
  './vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js',
  './vendor/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm',
  './vendor/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js',
  './vendor/tesseract/lang/spa.traineddata.gz',
  './wordpress-gastos-viaje-importer.zip'
];

async function cacheBestEffort(cache, urls) {
  await Promise.all(urls.map(async url => {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response && response.ok) await cache.put(url, response);
    } catch (_) {}
  }));
}

function isMapRuntimeRequest(url) {
  return [
    'a.basemaps.cartocdn.com',
    'b.basemaps.cartocdn.com',
    'c.basemaps.cartocdn.com',
    'd.basemaps.cartocdn.com',
    'tile.openstreetmap.org',
    'tiles.openfreemap.org'
  ].includes(url.hostname);
}

async function updateRuntimeCache(cacheName, request) {
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    } catch (_) {}
  }
  return response;
}

async function cachedMapResponse(request) {
  const cached = await caches.match(request);
  if (cached) {
    updateRuntimeCache(MAP_RUNTIME_CACHE, request).catch(() => {});
    return cached;
  }
  try {
    return await updateRuntimeCache(MAP_RUNTIME_CACHE, request);
  } catch (_) {
    return cached || Response.error();
  }
}

async function updateNavigationCache(request) {
  const response = await fetch(request, { cache: 'no-store' });
  if (response && response.ok) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const copy = response.clone();
      await cache.put('./index.html', copy.clone());
      await cache.put(request, copy);
    } catch (_) {}
  }
  return response;
}

async function cachedNavigationResponse(request) {
  try {
    const current = await updateNavigationCache(request);
    if (current && current.ok) return current;
  } catch (_) {}
  return await caches.match(request, { ignoreSearch: true })
    || await caches.match('./index.html')
    || await caches.match('./')
    || Response.error();
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL_REQUIRED);
      await cacheBestEffort(cache, APP_SHELL_OPTIONAL);
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('gastosdeviaje-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({ type: 'APP_VERSION_ACTIVE', version: APP_VERSION }));
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_APP_VERSION' && event.source) {
    event.source.postMessage({ type: 'APP_VERSION_ACTIVE', version: APP_VERSION });
  }
});

async function receiveSharedContent(request) {
  const formData = await request.formData();
  const sharedFiles = formData.getAll('photos').filter(file => {
    if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return false;
    return true;
  });
  const files = sharedFiles.filter(file =>
    String(file.type || '').startsWith('image/') || /\.(?:jpe?g|png|webp)$/i.test(String(file.name || ''))
  );
  const textFiles = sharedFiles.filter(file =>
    String(file.type || '').toLowerCase() === 'text/plain' || /\.txt$/i.test(String(file.name || ''))
  );
  const sharedTextParts = [String(formData.get('text') || '').trim()].filter(Boolean);
  for (const file of textFiles) {
    if (file.size > 1024 * 1024) continue;
    const value = String(await file.text()).trim();
    if (value) sharedTextParts.push(value);
  }
  const title = String(formData.get('title') || '').trim();
  const sourceUrl = String(formData.get('url') || '').trim();
  const redirectUrl = new URL('./index.html', request.url);
  if (!files.length && !sharedTextParts.length && !title && !sourceUrl) {
    redirectUrl.searchParams.set('shared_error', 'unsupported');
    return Response.redirect(redirectUrl.href, 303);
  }
  const id = self.crypto && self.crypto.randomUUID
    ? self.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const cache = await caches.open(SHARED_FILES_CACHE);
  const storedFiles = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const fileUrl = new URL(`./__shared/${encodeURIComponent(id)}/${index}`, request.url).href;
    await cache.put(fileUrl, new Response(file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Cache-Control': 'no-store'
      }
    }));
    storedFiles.push({
      url: fileUrl,
      name: file.name || `imagen-${index + 1}.jpg`,
      type: file.type || 'image/jpeg',
      lastModified: Number(file.lastModified || Date.now())
    });
  }
  const metadataUrl = new URL(`./__shared/${encodeURIComponent(id)}/metadata.json`, request.url).href;
  await cache.put(metadataUrl, new Response(JSON.stringify({
    id,
    title,
    text: sharedTextParts.join('\n\n'),
    sourceUrl,
    files: storedFiles
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  }));
  redirectUrl.searchParams.set('shared', id);
  return Response.redirect(redirectUrl.href, 303);
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.origin === self.location.origin && url.pathname === SHARE_TARGET_PATH) {
    event.respondWith(receiveSharedContent(event.request));
    return;
  }
  if (event.request.method !== 'GET') return;
  if (isMapRuntimeRequest(url)) {
    event.respondWith(cachedMapResponse(event.request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(cachedNavigationResponse(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return caches.match(event.request);
      });
    })
  );
});
