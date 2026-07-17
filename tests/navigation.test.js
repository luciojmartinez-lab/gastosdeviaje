import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

test('Mapa es una opción principal con vista y selectores propios', () => {
  assert.match(html, /<button id="tab-mapa">Mapa<\/button>/);
  assert.match(html, /<section id="view-mapa"/);
  assert.match(html, /<select id="map-viaje"><\/select>/);
  assert.match(html, /<select id="map-pais"><\/select>/);
  assert.doesNotMatch(html, /href="#resumen-mapa"/);
  assert.match(app, /\['viajes', 'gastos', 'blog', 'mapa', 'resumen', 'config'\]/);
  assert.match(app, /#tab-mapa'\)\.onclick = \(\) => setTab\('mapa'\)/);
  assert.match(app, /if \(id === 'resumen'\) \{[\s\S]*?clone\.appendChild\(mapCard\.cloneNode\(true\)\)/);
});

test('el menú móvil reparte el espacio entre los seis botones', () => {
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?nav button \{[\s\S]*?flex: 1 1 0;/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?nav \{[\s\S]*?gap: 2px;/);
});

test('el editor del mapa conserva la ruta planificada y las ciudades repetidas', () => {
  assert.match(app, /openRouteDialog\(trip, \{ preferConfigured: true, optionMode: 'tripCountries' \}\)/);
  assert.match(app, /routeEditorState\.cityIds = configuredCityIds\.length \? configuredCityIds : mapCityIds/);
  assert.doesNotMatch(app, /mapCityIds\.length \? mapCityIds : configuredCityIds/);
});

test('el mapa diario separa los puntos y los números de destino', () => {
  const start = app.indexOf('function combineDailyMapRecords');
  const end = app.indexOf('function dailyMapItem', start);
  const source = app.slice(start, end);
  assert.ok(source.indexOf('chronology(a).localeCompare(chronology(b))') < source.indexOf('routeIndex(a) - routeIndex(b)'));
  assert.match(app, /dailyRecord\.kind === 'point' \? '•' : '\+'/);
  assert.match(app, /function tripVectorDestinationElement/);
  assert.match(app, /dailyModel\.destinationMarkers\.forEach/);
  assert.match(app, /\$\{destinationMarkers\}\s*<\/svg>/);
  assert.match(styles, /\.trip-vector-destination-marker\s*\{[\s\S]*?z-index: 6;/);
});
