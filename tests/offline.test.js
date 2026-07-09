import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles, sw, help] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('la app muestra estado claro cuando trabaja sin conexion', () => {
  assert.match(html, /id="offline-status"/);
  assert.match(html, /trabajando con datos locales/);
  assert.match(styles, /\.offline-status/);
  assert.match(styles, /\.offline-status\[hidden\]/);
  assert.match(app, /function updateOfflineStatus\(\)/);
  assert.match(app, /window\.addEventListener\('online', updateOfflineStatus\)/);
  assert.match(app, /window\.addEventListener\('offline', updateOfflineStatus\)/);
  assert.match(app, /No hay conexi.n para consultar el cambio/);
});

test('el service worker separa cache critica y opcional para no romper la instalacion', () => {
  assert.match(sw, /const APP_SHELL_REQUIRED = \[/);
  assert.match(sw, /const APP_SHELL_OPTIONAL = \[/);
  assert.match(sw, /await cache\.addAll\(APP_SHELL_REQUIRED\)/);
  assert.match(sw, /await cacheBestEffort\(cache, APP_SHELL_OPTIONAL\)/);
  assert.match(sw, /\.\/version\.txt/);
  assert.match(sw, /\.\/vendor\/pdfjs\/pdf\.min\.mjs/);
  assert.match(sw, /\.\/vendor\/tesseract\/tesseract\.esm\.min\.js/);
  assert.match(sw, /\.\/vendor\/tesseract\/lang\/spa\.traineddata\.gz/);
});

test('los mapas vistos se guardan en cache dinamica para uso offline', () => {
  assert.match(sw, /const MAP_RUNTIME_CACHE = 'cuaderno-bitacora-map-runtime-v1'/);
  assert.match(sw, /function isMapRuntimeRequest\(url\)/);
  assert.match(sw, /a\.basemaps\.cartocdn\.com/);
  assert.match(sw, /tile\.openstreetmap\.org/);
  assert.match(sw, /tiles\.openfreemap\.org/);
  assert.match(sw, /cachedMapResponse\(event\.request\)/);
  assert.match(sw, /response\.ok \|\| response\.type === 'opaque'/);
  assert.match(help, /Los mapas ya vistos se conservan en cach/);
});
