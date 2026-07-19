import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, styles, help, sw, sharePdf] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../share-pdf.js', import.meta.url), 'utf8')
]);

test('Viajes muestra sus acciones en un desplegable', () => {
  assert.match(app, /class="trip-home-action-select" data-trip-home-action="\$\{v\.id\}"/);
  assert.match(app, /tripHomeActionId = target\.dataset\.tripHomeAction/);
  assert.match(styles, /\.trip-home-action-select/);
});

test('las entradas del Blog se comparten como un PDF real', () => {
  assert.match(app, /async function shareBlogEntry\(entry\)/);
  assert.match(app, /async function createBlogEntrySharePdf\(entry\)/);
  assert.match(app, /function blogSharePdfSliceHeight\(canvas, sourceY, maximumHeight\)/);
  assert.match(app, /context\.measureText\(word\)\.width <= maxWidth/);
  assert.match(app, /return new File\(\[blob\], fileName, \{ type: 'application\/pdf' \}\)/);
  assert.match(sharePdf, /\/MediaBox \[0 0 \$\{pageWidth\} \$\{pageHeight\}\]/);
  assert.match(app, /payload\.files = \[sharePdf\]/);
  assert.match(app, /navigator\.share\(payload\)/);
  assert.match(app, /downloadBlogEntrySharePdf\(sharePdf\)/);
  assert.match(app, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(app, /<option value="share">Compartir como PDF<\/option>/);
  assert.match(app, /handleBlogAction\(blogActionId, action\)/);
  assert.match(help, /PDF real[\s\S]*?páginas A4[\s\S]*?<code>about:blank<\/code>/);
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
  assert.match(app, /function dailyMapRecordsForScope[\s\S]*?enRuta: entry\.enRuta === true/);
  assert.match(styles, /\.blog-en-route-option/);
  assert.match(help, /marcadas «En ruta»/);
  assert.match(help, /coordenadas GPS exactas/);
  assert.match(help, /nunca asigna automáticamente la ubicación actual/);
});

test('las fotos clasificadas como destino sustituyen al centro de la ciudad', () => {
  assert.match(app, /function isAccommodationExpense\(gasto\)/);
  assert.match(app, /function accommodationDestinationForTripCity\(tripId, cityId, targetDate = ''\)/);
  assert.match(app, /function accommodationDestinationPhotoRecord\(destination, tripId, cityId\)/);
  assert.match(app, /function imageUsesAsDestination\(image\)/);
  assert.match(app, /const classifiedDestination = imageUsesAsDestination\(image\)/);
  assert.match(app, /const legacyAccommodation = !image\.photoTypeId && isAccommodationExpense\(gasto\)/);
  assert.match(app, /state\.blogEntries[\s\S]*?if \(!imageUsesAsDestination\(image\)\) return/);
  assert.match(app, /cityWithAccommodationDestination\(baseCity, scopedTrip\.id, arrivalDate\)/);
  assert.match(app, /accommodationPhotoRecord: accommodationDestinationPhotoRecord\(destination, item\.viajeId, cityId\)/);
  assert.match(app, /distance: targetDate \? dateDistanceDays\(date, targetDate\) : 0/);
  assert.match(help, /tiene prioridad como destino real de la ciudad/);
  assert.match(help, /fotos antiguas sin clasificar se conserva como respaldo la regla del gasto de Alojamiento/);
});

test('los tipos de fotos son configurables e incluyen Selfie', () => {
  assert.match(app, /const PHOTO_TYPES_SETTING_KEY = 'photoTypes'/);
  for (const name of ['Alojamiento', 'Comida', 'Paisaje', 'Ciudad', 'Retrato', 'Selfie']) {
    assert.match(app, new RegExp(`nombre: '${name}'`));
  }
  assert.match(app, /async function savePhotoTypes\(types\)/);
  assert.match(app, /photoTypes: state\.photoTypes/);
  assert.match(help, /Alojamiento, Comida, Paisaje, Ciudad, Retrato y Selfie/);
});
