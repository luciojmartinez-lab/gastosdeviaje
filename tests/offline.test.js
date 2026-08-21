import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles, sw, help, ticketImageWorker, updateRecovery] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../ticket-image-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('../actualizar.html', import.meta.url), 'utf8')
]);

test('la app muestra estado claro cuando trabaja sin conexion', () => {
  assert.match(html, /id="offline-status"/);
  assert.match(html, /trabajando con datos locales/);
  assert.match(styles, /\.offline-status/);
  assert.match(styles, /\.offline-status\[hidden\]/);
  assert.match(app, /function updateOfflineStatus\(\)/);
  assert.match(app, /async function refreshNetworkAvailability\(\)/);
  assert.match(app, /version\.txt\?network=\$\{Date\.now\(\)\}/);
  assert.match(app, /window\.addEventListener\('online', \(\) => \{[\s\S]*?refreshNetworkAvailability\(\)/);
  assert.match(app, /window\.addEventListener\('offline', \(\) => \{[\s\S]*?appNetworkUnavailable = true;[\s\S]*?updateOfflineStatus\(\)/);
  assert.match(html, /id="offline-entry-dialog"/);
  assert.match(html, /Continuar sin conexi.n/);
  assert.match(html, /mapas nuevos[\s\S]*?buscar lugares[\s\S]*?cambios de moneda[\s\S]*?sincronizar con la nube/);
  assert.match(app, /Sin conexi.n · entrando con datos locales/);
  assert.match(app, /function showOfflineEntryNotice\(\)/);
  assert.match(app, /failed to fetch\|networkerror\|load failed/);
  assert.match(app, /failed to fetch\|networkerror\|load failed[\s\S]*?await refreshNetworkAvailability\(\)/);
  assert.match(app, /if \(typeof navigator !== 'undefined' && navigator\.onLine === false\) return;/);
  const startup = app.slice(app.indexOf("window.addEventListener('DOMContentLoaded'"), app.indexOf('\nObject.assign(window'));
  assert.match(startup, /finishAppLoading\(\);[\s\S]*?if \(!APP_HAS_SHARED_LAUNCH\) window\.setTimeout\(\(\) => checkCloudOnEntry\(\), 0\)/);
  assert.match(startup, /if \(APP_HAS_SHARED_LAUNCH\)[\s\S]*?createEntryBackup\(\)/);
  assert.match(app, /No hay conexi.n para consultar el cambio/);
});

test('el service worker se activa sin descargar archivos y prepara la cache despues', () => {
  assert.match(sw, /const APP_SHELL_CORE = \[/);
  assert.match(sw, /const APP_SHELL_REQUIRED = \[/);
  assert.match(sw, /const APP_SHELL_OPTIONAL = \[/);
  assert.match(sw, /async function prepareCurrentCache\(\)[\s\S]*?cacheBestEffort\(cache, APP_SHELL_CORE\)/);
  assert.match(sw, /coreReady[\s\S]*?if \(!coreReady\) return false;[\s\S]*?caches\.delete/);
  assert.doesNotMatch(sw, /cache\.addAll\(APP_SHELL_REQUIRED\)/);
  assert.match(sw, /event\.waitUntil\(activateCurrentVersion\)/);
  assert.match(sw, /WARM_APP_SHELL[\s\S]*?prepareCurrentCache\(\)/);
  const coreStart = sw.indexOf('const APP_SHELL_CORE = [');
  const coreEnd = sw.indexOf('];', coreStart);
  assert.doesNotMatch(sw.slice(coreStart, coreEnd), /splash|maplibre|manifest/);
  assert.match(sw, /\.\/version\.txt/);
  assert.match(sw, /\.\/vendor\/pdfjs\/pdf\.min\.mjs/);
  assert.match(sw, /\.\/vendor\/tesseract\/tesseract\.esm\.min\.js/);
  assert.match(sw, /\.\/vendor\/tesseract\/lang\/spa\.traineddata\.gz/);
  assert.match(sw, /\.\/ticket-image-worker\.js\?v=700v280/);
  assert.match(sw, /\.\/ticket-image-processing\.js\?v=700v280/);
  assert.match(sw, /\.\/timeline-import\.js\?v=700v280/);
  assert.match(sw, /\.\/timeline-import-worker\.js\?v=700v280/);
  assert.match(sw, /\.\/timeline-routing\.js\?v=700v280/);
  assert.match(sw, /const OCR_RUNTIME_CACHE = 'cuaderno-bitacora-ocr-runtime-opencv-4\.10\.0'/);
  assert.match(sw, /\.\/vendor\/opencv\/4\.10\.0\/opencv\.js/);
  const installStart = sw.indexOf("self.addEventListener('install'");
  const activateStart = sw.indexOf("self.addEventListener('activate'");
  const install = sw.slice(installStart, sw.indexOf('async function prepareCurrentCache', installStart));
  assert.match(install, /event\.waitUntil\(self\.skipWaiting\(\)\)/);
  assert.doesNotMatch(install, /fetch|cacheBestEffort|caches\.open/);
  const activate = sw.slice(activateStart, sw.indexOf("self.addEventListener('message'", activateStart));
  assert.doesNotMatch(activate, /cacheBestEffort|caches\.delete|prepareCurrentCache/);
});

test('el trabajador de imagen espera OpenCV sin bloquearse por su objeto thenable', () => {
  assert.match(ticketImageWorker, /resolve\(\{ cv: cvModule \}\)/);
  assert.match(ticketImageWorker, /const \{ cv \} = await loadOpenCv\(\)/);
  assert.doesNotMatch(ticketImageWorker, /resolve\(cvModule\)/);
});

test('los mapas vistos se guardan en cache dinamica para uso offline', () => {
  assert.match(sw, /const MAP_RUNTIME_CACHE = 'cuaderno-bitacora-map-runtime-v1'/);
  assert.match(sw, /function isMapRuntimeRequest\(url\)/);
  assert.match(sw, /a\.basemaps\.cartocdn\.com/);
  assert.match(sw, /tile\.openstreetmap\.org/);
  assert.match(sw, /server\.arcgisonline\.com/);
  assert.match(sw, /tiles\.openfreemap\.org/);
  assert.match(sw, /cachedMapResponse\(event\.request\)/);
  assert.match(sw, /response\.ok \|\| response\.type === 'opaque'/);
  assert.match(help, /Los mapas ya vistos se conservan en cach/);
});

test('la navegación abre primero la copia local y actualiza en segundo plano con cualquier red', () => {
  const start = sw.indexOf('async function cachedNavigationResponse');
  const end = sw.indexOf("self.addEventListener('install'", start);
  const navigation = sw.slice(start, end);
  const normalNavigation = navigation.slice(navigation.indexOf('const cached ='));
  assert.ok(normalNavigation.indexOf('caches.match(request, { ignoreSearch: true })') < normalNavigation.indexOf('await updateNavigationCache(request)'));
  assert.match(sw, /const timeout = setTimeout\(\(\) => controller\.abort\(\), 12000\)/);
  assert.match(sw, /fetch\(request, \{ cache: 'no-store', signal: controller\.signal \}\)/);
  assert.match(sw, /requestUrl\.searchParams\.has\('v'\)[\s\S]*?updateNavigationCache\(request\)/);
  assert.match(navigation, /caches\.match\('\.\/index\.html'\)/);
  assert.match(navigation, /updateNavigationCache\(request\)\.catch\(\(\) => \{\}\)/);
  assert.match(navigation, /offlineStartResponse\(\)/);
  assert.match(sw, /Tus viajes y gastos no se han borrado/);
  assert.match(sw, /event\.respondWith\(cachedNavigationResponse\(event\.request\)\)/);
});

test('una versión nueva provoca una sola recarga después de activar su service worker', () => {
  assert.match(html, /const hadControllerAtStart = Boolean\(navigator\.serviceWorker\.controller\)/);
  assert.match(html, /const reloadForUpdate = version =>/);
  assert.match(html, /Date\.now\(\) - lastAttempt < 15000/);
  assert.match(html, /pendingUpdateVersion = latestVersion;[\s\S]*?registration\.update\(\)[\s\S]*?reloadForUpdate\(latestVersion\)/);
  assert.match(html, /APP_VERSION_ACTIVE[\s\S]*?reloadForUpdate\(activeVersion\)/);
  assert.match(html, /controllerchange[\s\S]*?postMessage\(\{ type: 'GET_APP_VERSION' \}\)/);
  assert.match(sw, /const APP_VERSION = '700v280'/);
  assert.match(sw, /\.\/assets\/map-train-side\.webp/);
  assert.match(sw, /GET_APP_VERSION[\s\S]*?APP_VERSION_ACTIVE/);
  assert.doesNotMatch(html, /window\.location\.reload\(\)/);
});

test('hay una ruta directa para liberar una instalacion antigua atascada', () => {
  assert.match(updateRecovery, /navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(updateRecovery, /registration => registration\.unregister\(\)/);
  assert.match(updateRecovery, /version\.txt\?recovery=\$\{Date\.now\(\)\}/);
  assert.match(updateRecovery, /nextUrl\.searchParams\.set\('v', targetVersion/);
  assert.match(updateRecovery, /location\.replace\(nextUrl\.href\)/);
});
