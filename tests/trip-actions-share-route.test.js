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

test('los trayectos son líneas rectas discontinuas sin modos de transporte', () => {
  assert.match(app, /'line-dasharray': \[2\.5, 2\]/);
  assert.match(styles, /\.map-route \{[\s\S]*stroke-dasharray: 10 8;/);
  assert.match(app, /context\.setLineDash\(\[10, 8\]\)/);
  assert.doesNotMatch(app, /router\.project-osrm\.org|Carretera \(ruta real\)|Tren \(aproximada\)/);
  assert.doesNotMatch(sw, /router\.project-osrm\.org/);
  assert.match(help, /líneas rectas discontinuas/);
});

test('las entradas En ruta exigen GPS o una ubicación manual', () => {
  assert.doesNotMatch(app, /function locateBlogTextEnRoute\(/);
  assert.match(app, /function openBlogManualRouteLocation\(\)/);
  assert.match(app, /checkbox\.disabled = !hasLocation/);
  assert.match(app, /Añade manualmente una ubicación antes de marcar el texto/);
  const saveStart = app.indexOf('async function saveBlogEntryForm');
  const saveEnd = app.indexOf('function expenseBlogDescription', saveStart);
  assert.doesNotMatch(app.slice(saveStart, saveEnd), /currentDeviceImageLocation\(/);
  assert.match(app, /enRuta: type !== 'gasto' && entry\.enRuta === true/);
  assert.match(app, /function orderTripItemsWithRouteWaypoints\(items = \[\]\)/);
  assert.match(app, /function enRouteBlogItemsForTrip\(tripId\)/);
  assert.match(app, /tripRoutePresentation\(orderTripItemsWithRouteWaypoints/);
  assert.match(app, /\.\.\.enRouteBlogItemsForTrip\(trip\.id\)/);
  assert.match(styles, /\.blog-en-route-option/);
  assert.match(help, /marcadas «En ruta»/);
  assert.match(help, /nunca asigna automáticamente la ubicación actual/);
});

test('el alojamiento geolocalizado sustituye al centro de la ciudad como destino', () => {
  assert.match(app, /function isAccommodationExpense\(gasto\)/);
  assert.match(app, /function accommodationDestinationForTripCity\(tripId, cityId, targetDate = ''\)/);
  assert.match(app, /normalizePlaceName\(category && category\.nombre\) === 'alojamiento'/);
  assert.match(app, /cityWithAccommodationDestination\(baseCity, scopedTrip\.id, arrivalDate\)/);
  assert.match(app, /distance: targetDate \? dateDistanceDays\(date, targetDate\) : 0/);
  assert.match(help, /usa el alojamiento como destino/);
  assert.match(help, /Solo cuando no existe esa información utiliza las coordenadas generales de la ciudad/);
});
