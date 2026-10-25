import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('el titulo del arranque movil queda por encima del tren', () => {
  const mobileStart = styles.indexOf('@media (max-width: 640px)');
  const mobileEnd = styles.indexOf('.offline-status', mobileStart);
  const mobileStyles = styles.slice(mobileStart, mobileEnd);
  assert.match(mobileStyles, /\.app-loading-title \{[\s\S]*?top: 22svh/);
  assert.match(mobileStyles, /\.app-loading-train-group \{[\s\S]*?top: 40svh/);
  assert.match(mobileStyles, /\.app-loading-cover \{[\s\S]*?display: none/);
});

test('la portada de ordenador separa el titulo, el tren y el progreso', () => {
  assert.match(styles, /\.app-loading-cover \{[\s\S]*?display: none/);
  assert.match(styles, /\.app-loading-title \{[\s\S]*?top: 17svh/);
  assert.match(styles, /\.app-loading-train-group \{[\s\S]*?top: 36svh/);
  assert.match(styles, /\.app-loading-progress \{[\s\S]*?top: 80svh/);
  assert.match(styles, /\.app-loading-title strong \{[\s\S]*?font-size: clamp\(2\.25rem, 5vw, 4\.25rem\)/);
});

test('el arranque conserva la portada y la cierra al terminar la carga sin espera mínima', async () => {
  const [html, app, sw] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
    readFile(new URL('../sw.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /rel="preload"[\s\S]*?bitacora-splash-mobile\.png/);
  assert.match(html, /app-loading-train-group[\s\S]*?app-loading-train[\s\S]*?app-loading-credit/);
  assert.match(html, /Preparando el viaje\.\.\.[\s\S]*?<strong>Versión 800v050 · 25\/10\/2026<\/strong>/);
  assert.match(styles, /\.app-loading-release strong \{[\s\S]*?font-weight: 800/);
  assert.match(styles, /\.app-loading-release \{[\s\S]*?top: calc\(76svh \+ 48px\)/);
  assert.doesNotMatch(app, /APP_LOADING_MIN_MS|APP_LOADING_STARTED_AT/);
  const timers=[],classes=new Set();let present=true,notices=0;
  const loading={classList:{contains:name=>classes.has(name),add:name=>classes.add(name)},remove:()=>{present=false;}};
  const context={$:()=>present?loading:null,window:{setTimeout:(callback,delay)=>timers.push({callback,delay})},showOfflineEntryNotice:()=>{notices++;}};
  runInNewContext(app.match(/function finishAppLoading\([^]*?\n\}/)[0]+'\nfinishAppLoading();',context);
  assert.equal(classes.has('is-ready'),true);assert.equal(timers.length,1);assert.equal(timers[0].delay,460);
  context.finishAppLoading();assert.equal(timers.length,1);
  timers[0].callback();assert.equal(present,false);assert.equal(notices,1);
  context.finishAppLoading();assert.equal(timers.length,1);
  assert.match(sw, /APP_SHELL_REQUIRED[\s\S]*?bitacora-splash-mobile\.png[\s\S]*?loading-train\.png/);
});
