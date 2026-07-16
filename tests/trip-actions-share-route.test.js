import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, styles, help, sw] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8')
]);

test('Viajes muestra sus acciones en un desplegable', () => {
  assert.match(app, /class="trip-home-action-select" data-trip-home-action="\$\{v\.id\}"/);
  assert.match(app, /tripHomeActionId = target\.dataset\.tripHomeAction/);
  assert.match(styles, /\.trip-home-action-select/);
});

test('las entradas del Blog se pueden compartir con texto e imágenes', () => {
  assert.match(app, /async function shareBlogEntry\(entry\)/);
  assert.match(app, /navigator\.share\(payload\)/);
  assert.match(app, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(app, /<option value="share">Compartir<\/option>/);
  assert.match(app, /handleBlogAction\(blogActionId, action\)/);
});

test('los trayectos admiten carretera real, tren aproximado y línea directa', () => {
  assert.match(app, /Carretera \(ruta real\)/);
  assert.match(app, /Tren \(aproximada\)/);
  assert.match(app, /router\.project-osrm\.org\/route\/v1\/driving/);
  assert.match(app, /function approximateTrainCoordinates/);
  assert.match(app, /routeLegs,/);
  assert.match(styles, /\.map-route\.train/);
  assert.match(sw, /'router\.project-osrm\.org'/);
  assert.match(help, /carretera se calcula sobre calles reales de OpenStreetMap/);
});
