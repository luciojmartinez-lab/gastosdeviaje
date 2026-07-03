const CACHE_NAME = 'gastosdeviaje-700v113';
const SHARED_FILES_CACHE = 'cuaderno-bitacora-shared-files-v1';
const SHARE_TARGET_PATH = new URL('./share-target', self.location.href).pathname;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=700v113',
  './app.bundle.js?v=700v113',
  './ticket-ocr.js?v=700v113',
  './image-location.js?v=700v113',
  './ayuda.html',
  './manifest.webmanifest',
  './icon.svg',
  './wordpress-gastos-viaje-importer.zip'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('gastosdeviaje-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function receiveSharedImages(request) {
  const formData = await request.formData();
  const files = formData.getAll('photos').filter(file => {
    if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return false;
    return String(file.type || '').startsWith('image/') || /\.(?:jpe?g|png|webp)$/i.test(String(file.name || ''));
  });
  const redirectUrl = new URL('./index.html', request.url);
  if (!files.length) {
    redirectUrl.searchParams.set('shared_error', 'no-image');
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
    title: String(formData.get('title') || ''),
    text: String(formData.get('text') || ''),
    sourceUrl: String(formData.get('url') || ''),
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
    event.respondWith(receiveSharedImages(event.request));
    return;
  }
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('./index.html', copy.clone());
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
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
