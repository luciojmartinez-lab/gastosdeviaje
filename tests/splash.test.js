import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('el titulo del arranque movil queda por encima del tren', () => {
  const mobileStart = styles.indexOf('@media (max-width: 640px)');
  const mobileEnd = styles.indexOf('.offline-status', mobileStart);
  const mobileStyles = styles.slice(mobileStart, mobileEnd);
  assert.match(mobileStyles, /\.app-loading-title \{[\s\S]*?top: 22svh/);
  assert.match(mobileStyles, /\.app-loading-train-group \{[\s\S]*?top: 40svh/);
  assert.match(mobileStyles, /\.app-loading-cover \{[\s\S]*?display: none/);
});

test('el arranque conserva el entorno, coloca el credito bajo el tren y dura cuatro segundos', async () => {
  const [html, app, sw] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
    readFile(new URL('../sw.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /rel="preload"[\s\S]*?bitacora-splash-mobile\.png/);
  assert.match(html, /app-loading-train-group[\s\S]*?app-loading-train[\s\S]*?app-loading-credit/);
  assert.match(html, /Preparando el viaje\.\.\.[\s\S]*?<strong>Versión 700v192 · 19\/07\/2026<\/strong>/);
  assert.match(styles, /\.app-loading-release strong \{[\s\S]*?font-weight: 800/);
  assert.match(styles, /\.app-loading-release \{[\s\S]*?top: calc\(76svh \+ 48px\)/);
  assert.match(app, /const APP_LOADING_MIN_MS = 4000/);
  assert.match(sw, /APP_SHELL_REQUIRED[\s\S]*?bitacora-splash-mobile\.png[\s\S]*?loading-train\.png/);
});
