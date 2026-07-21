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

test('al volver al Blog se recupera el inicio horizontal de la tabla', () => {
  assert.match(app, /function resetBlogTableHorizontalScroll\(\)/);
  assert.match(app, /wrapper\.scrollLeft = 0/);
  assert.match(app, /const previousTab = state\.activeTab/);
  assert.match(app, /if \(previousTab !== 'blog'\) resetBlogTableHorizontalScroll\(\)/);
});

test('el mapa diario separa los puntos y los números de destino', () => {
  const start = app.indexOf('function combineDailyMapRecords');
  const end = app.indexOf('function dailyMapItem', start);
  const source = app.slice(start, end);
  assert.ok(source.indexOf('chronology(a).localeCompare(chronology(b))') < source.indexOf('routeIndex(a) - routeIndex(b)'));
  assert.match(app, /dailyRecord\.kind === 'point' \? '•' : '\+'/);
  assert.match(app, /function tripVectorDestinationElement/);
  assert.match(app, /dailyModel\.destinationMarkers\.forEach/);
  assert.match(app, /offset: \[labelOnLeft \? -18 : 18, 0\]/);
  assert.match(app, /element\.classList\.add\('has-photo'\)/);
  assert.match(app, /openTripMapPhotoPopup\(encodedKeys, element\)/);
  assert.match(app, /function positionTripMapPhotoPopup\(popup, anchorElement\)/);
  assert.match(app, /record\.accommodationPhotoRecord/);
  assert.match(app, /\$\{destinationMarkers\}\s*<\/svg>/);
  assert.match(styles, /\.trip-vector-marker\s*\{[\s\S]*?pointer-events: none !important;/);
  assert.match(styles, /\.trip-vector-destination-marker\s*\{[\s\S]*?z-index: 6;/);
  assert.match(styles, /\.trip-vector-destination-marker\s*\{[\s\S]*?pointer-events: none !important;/);
  assert.match(styles, /\.trip-vector-destination-marker\s*\{[\s\S]*?background: #be123c;/);
  assert.match(app, /function tripVectorDestinationElement\(markerModel, labelOnLeft\)[\s\S]*?trip-vector-destination-label[\s\S]*?markerModel\.labelLines\[0\]/);
  assert.match(styles, /\.trip-vector-destination-label\s*\{[\s\S]*?font-size: 13px;[\s\S]*?font-weight: 900;/);
  assert.match(styles, /\.trip-vector-destination-marker\.label-right \.trip-vector-destination-label\s*\{[\s\S]*?left: 20px;[\s\S]*?text-align: left;/);
  assert.match(app, /const labelOnLeft = p\.x >= width \/ 2;[\s\S]*?class="map-destination-label"[\s\S]*?text-anchor="\$\{labelOnLeft \? 'end' : 'start'\}"/);
  assert.match(styles, /\.map-destination-number \.map-destination-label\s*\{[\s\S]*?font-size: 13px;[\s\S]*?font-weight: 900;/);
  assert.match(styles, /\.map-destination-number\s*\{[\s\S]*?pointer-events: none;/);
  assert.match(styles, /\.map-destination-number circle\s*\{[\s\S]*?fill: #be123c;/);
  assert.match(app, /destinationMarkers\.forEach[\s\S]*?context\.fillStyle = '#be123c'/);
  assert.match(styles, /\.trip-vector-marker\.has-photo,[\s\S]*?\.trip-vector-marker\.has-details\s*\{[\s\S]*?pointer-events: auto !important;/);
  assert.match(styles, /\.trip-vector-marker\.daily \.trip-vector-marker-dot\s*\{[\s\S]*?background: #7c3aed;/);
  assert.match(styles, /\.trip-vector-photo-marker\s*\{[\s\S]*?background: #0f766e;/);
  assert.match(app, /function dailyMapLabelLines\(record\)\s*\{[\s\S]*?return \[dailyMapCityName\(record\)\]/);
  assert.doesNotMatch(app, /La hora aparece junto a cada punto/);
  assert.match(styles, /\.map-photo-popup\.tail-bottom::after/);
  assert.match(styles, /\.map-photo-popup\.tail-top::after/);
});

test('el mapa oculta fechas y usa iconos minimos de transporte con notas', () => {
  assert.match(app, /function tripMapArrivalLabelLines\(item\)[\s\S]*?return \[name\];/);
  assert.match(app, /function tripMapTransportMarker\(record\)/);
  assert.match(app, /TRIP_MAP_TRAIN_ICON = '\.\/assets\/map-train-side\.webp'/);
  assert.match(app, /train: \{ type: 'train',[\s\S]*?image: TRIP_MAP_TRAIN_ICON, label: 'Tren' \}/);
  assert.match(app, /image\.src = transportMarker\.image/);
  assert.match(app, /class="map-marker-transport-image"/);
  assert.match(app, /context\.drawImage\(trainMarkerImage, x - 15, y - 10, 30, 20\)/);
  assert.match(app, /walk: \{ type: 'walk', icon: '🚶', label: 'Caminar' \}/);
  assert.match(app, /car: \{ type: 'car', icon: '🚗', label: 'Coche' \}/);
  assert.match(app, /bus: \{ type: 'bus', icon: '🚌', label: 'Bus' \}/);
  assert.match(app, /plane: \{ type: 'plane', icon: '✈️', label: 'Avión' \}/);
  assert.match(app, /wrappedSource && \(wrappedSource\.entry \|\| wrappedSource\.pointEntry \|\| wrappedSource\)/);
  assert.match(app, /hasExplicitTransport[\s\S]*?source\.transporte/);
  assert.match(app, /const noteLines = \[\.\.\.new Set/);
  assert.match(app, /map-marker-popup-notes/);
  assert.match(app, /const visibleLabelLines = transportMarker \? \[\] : labelLines\.slice\(0, 1\)/);
  assert.match(app, /const visibleMarkerLabelLines = transportMarker \? \[\] : markerLabelLines\.slice\(0, 1\)/);
  assert.match(app, /function openTripMapMarkerPopup\(detail, anchorElement = null\)/);
  assert.match(app, /data-map-marker-detail/);
  assert.match(styles, /\.trip-vector-marker\.transport \.trip-vector-marker-dot \{[\s\S]*?background: transparent/);
  assert.match(styles, /\.map-marker \.map-marker-transport-symbol/);
  assert.match(styles, /\.trip-vector-marker\.transport \.trip-vector-marker-dot img/);
  assert.match(styles, /\.map-marker \.map-marker-transport-image/);
  assert.match(styles, /\.trip-vector-marker\.has-details[\s\S]*?pointer-events: auto !important/);
});
