import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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

test('el editor del mapa conserva la ruta planificada, sus tipos y las ciudades repetidas', () => {
  assert.match(app, /openRouteDialog\(trip, \{ preferConfigured: true, optionMode: 'tripCountries' \}\)/);
  assert.match(app, /routeEditorState\.stops = configuredCityIds\.length[\s\S]*?tripRouteStops\(trip\)[\s\S]*?normalizeTripRouteStops\(trip, mapCityIds\)/);
  assert.match(app, /data-route-role="\$\{index\}"/);
  assert.match(app, /data-route-date="\$\{index\}"/);
  assert.match(app, /routeStops,/);
  assert.doesNotMatch(app, /mapCityIds\.length \? mapCityIds : configuredCityIds/);
});

test('el mapa permite alternar la vista de satélite sin cambiar sus puntos', () => {
  assert.match(app, /showSatellite: false/);
  assert.match(app, /data-map-satellite="1"/);
  assert.match(app, /tripMapState\.showSatellite = !tripMapState\.showSatellite/);
  assert.match(app, /type: 'raster'[\s\S]*?World_Imagery\/MapServer\/tile/);
  assert.match(app, /'raster-fade-duration': 150/);
  assert.match(app, /\$\{tripMapState\.showSatellite \? 'Mapa normal' : 'Satélite'\}/);
});

test('el alojamiento conserva su coordenada y coloca la ciudad justo encima', () => {
  const start = app.indexOf('function stackMapCitiesWithLodgings');
  const end = app.indexOf('function tripMapItemsForCurrentScope', start);
  const context = {
    state: { viajes: [{ id: 1 }] },
    lugarHasCoords: item => Number.isFinite(Number(item && item.lat)) && Number.isFinite(Number(item && item.lng)),
    geographicDistanceMeters: () => 120,
    nearestTripCityForPoint: () => ({ id: 20 })
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.stackMapCitiesWithLodgings = stackMapCitiesWithLodgings;`, context);
  const result = context.stackMapCitiesWithLodgings([
    { ciudad: { id: 7, nombre: 'Barcelona', lat: 41.38, lng: 2.17 }, firstDate: '2026-08-08' }
  ], [
    { ciudad: { id: 'lodging', nombre: 'Alojamiento', lat: 41.39, lng: 2.18 }, firstDate: '2026-08-08', timelinePoint: true, timelineRole: 'lodging', pointEntry: { key: 'night-1' } }
  ], false);

  assert.equal(result.baseItems[0].ciudad.lat, 41.39);
  assert.equal(result.baseItems[0].ciudad.lng, 2.18);
  assert.equal(result.baseItems[0].stackedOverLodging, true);
  assert.equal(result.lodgingItems[0].stackedUnderCity, true);
  const dailyResult = context.stackMapCitiesWithLodgings([
    { ciudad: { id: 'daily-canete', nombre: 'Cañete', lat: 40.04, lng: -1.65 }, firstDate: '2026-08-12', dailyRecord: { kind: 'city', ciudadId: 10, fecha: '2026-08-12' } },
    { ciudad: { id: 'daily-salinas', nombre: 'Salinas del Manzano', lat: 40.09, lng: -1.55 }, firstDate: '2026-08-12', dailyRecord: { kind: 'city', ciudadId: 20, fecha: '2026-08-12' } }
  ], [
    { ciudad: { id: 'lodging-day', nombre: 'Casa', lat: 40.091, lng: -1.551 }, firstDate: '2026-08-12', timelinePoint: true, timelineRole: 'lodging', pointEntry: { key: 'night-day', viajeId: 1 } }
  ], true);
  assert.equal(dailyResult.baseItems[0].stackedOverLodging, undefined);
  assert.equal(dailyResult.baseItems[0].ciudad.nombre, 'Cañete');
  assert.equal(dailyResult.baseItems[1].stackedOverLodging, true);
  assert.equal(dailyResult.baseItems[1].ciudad.lat, 40.091);
  assert.match(app, /offset: item\.stackedOverLodging \? \[0, -30\]/);
  assert.match(styles, /\.trip-vector-marker\.stacked-city \.trip-vector-marker-label[\s\S]*?bottom: 24px/);
  assert.match(styles, /\.trip-vector-marker\.stacked-lodging \.trip-vector-marker-label[\s\S]*?top: 24px/);
});

test('una pulsación mantenida permite crear y nombrar un punto en el mapa', () => {
  assert.match(html, /id="map-point-dialog"[\s\S]*?id="map-point-name"[\s\S]*?id="map-point-date"[\s\S]*?id="map-point-time"/);
  assert.match(app, /const TRIP_MAP_LONG_PRESS_MS = 1400/);
  assert.match(app, /function installTripMapLongPress\(target, coordinatesForEvent\)/);
  assert.match(app, /openMapPointDialog\(\{ latitude: point\.latitude, longitude: point\.longitude \}\)/);
  assert.match(app, /tipo: 'punto',[\s\S]*?descripcion: name,[\s\S]*?latitude: context\.latitude,[\s\S]*?longitude: context\.longitude/);
  assert.match(app, /data-edit-map-point-name="1"/);
  assert.match(app, /updateBlogEntry\(entry\.id, \{ descripcion: name, \.\.\.locationPatch \}\)/);
  assert.match(html, /id="map-point-delete"[^>]*hidden/);
  assert.match(app, /data-delete-map-point="1"/);
  assert.match(app, /function deleteMapPoint\(context = activeMapPointContext\)[\s\S]*?delBlogEntry\(entry\.id\)/);
  assert.match(app, /¿Eliminar «\$\{name\}» del mapa y del Blog\?/);
  assert.match(html, /id="map-point-city"/);
  assert.match(app, /function resolvedManualMapPointEntry\(entry\)/);
  assert.match(app, /setSelectedTrips\(validSelectedTripIds, \{[\s\S]*?preserveMapState: validSelectedTripIds\.length === previousSelectedTripIds\.length/);
  assert.match(app, /draggable: Boolean\(manualPointContext \|\| cityContext\)/);
  assert.match(app, /marker\.on\('dragend',[\s\S]*?moveMapPoint\(manualPointContext, position\.lat, position\.lng\)/);
  assert.match(app, /function installFallbackManualPointDrag\(frame, options = \{\}\)/);
});

test('las localidades agrupadas se explican y pueden corregirse arrastrándolas bajo las fotos', () => {
  assert.match(app, /apunte sin GPS exacto agrupado/);
  assert.match(app, /function moveMapCity\(context, latitude, longitude\)[\s\S]*?updateLugar\(city\.id, \{ lat: point\.latitude, lng: point\.longitude \}\)/);
  assert.match(app, /element\.mapCityDragContext = markerDetail\.cityEdit/);
  assert.match(app, /data-map-city-drag/);
  assert.match(styles, /\.trip-vector-photo-marker \{[\s\S]*?z-index: 5/);
});

test('el GPS exacto corrige una localidad claramente distinta sin mover ciudades por alojamientos ajenos', () => {
  const start = app.indexOf('function resolvedMapCoordinateCity');
  const end = app.indexOf('function resolvedManualMapPointEntry', start);
  const source = app.slice(start, end);
  const state = {
    viajes: [{ id: 1 }],
    lugares: [
      { id: 10, nombre: 'Cañete', parentId: 5, lat: 40.04, lng: -1.65 },
      { id: 20, nombre: 'Salinas del Manzano', parentId: 5, lat: 40.09, lng: -1.55 }
    ]
  };
  const distance = (first, second) => Math.hypot(
    Number(first.latitude) - Number(second.latitude),
    Number(first.longitude) - Number(second.longitude)
  ) * 111000;
  const resolvedMapCoordinateCity = Function(
    'state',
    'storedImageCoordinate',
    'nearestTripCityForPoint',
    'lugarHasCoords',
    'geographicDistanceMeters',
    'TRIP_MAP_POINT_CITY_REASSIGN_GAIN_METERS',
    `${source}\nreturn resolvedMapCoordinateCity;`
  )(
    state,
    value => Number.isFinite(Number(value)) ? Number(value) : null,
    () => state.lugares[1],
    city => Number.isFinite(Number(city.lat)) && Number.isFinite(Number(city.lng)),
    distance,
    3000
  );
  const result = resolvedMapCoordinateCity({
    viajeId: 1,
    ciudadId: 10,
    paisId: 5,
    latitude: 40.091,
    longitude: -1.551,
    fecha: '2026-08-13'
  });

  assert.equal(result.ciudadId, 20);
  assert.equal(result.mapCityResolvedFromGps, true);
  assert.match(app, /filter\(candidate => accommodationCandidateMatchesCity\(tripId, cityId, candidate\)\)/);
  assert.match(app, /records\.push\(resolvedMapCoordinateCity\(\{/);
  assert.match(app, /const entry = resolvedMapPointEntry\(originalEntry\)/);
});

test('la Cronología completa las ciudades numeradas visitadas aunque no tengan gastos ese día', () => {
  const start = app.indexOf('function timelineVisitedDailyCityRecordsForScope');
  const end = app.indexOf('function tripDailyRouteOrder', start);
  const context = {
    TIMELINE_CITY_VISIT_MAX_DISTANCE_METERS: 3000,
    ROUTE_STOP_ROLE_DESTINATION: 'destination',
    state: {
      lugares: [
        { id: 3, nombre: 'Salinas del Manzano', parentId: 1, lat: 40.09, lng: -1.55 },
        { id: 4, nombre: 'Cañete', parentId: 1, lat: 40.04, lng: -1.65 }
      ]
    },
    timelineRecordsForTrip: () => [{ id: 'day-12', fecha: '2026-08-12' }],
    timelineMapPaths: () => [[
      { latitude: 40.091, longitude: -1.551, time: '2026-08-12T09:00:00+02:00' },
      { latitude: 40.041, longitude: -1.651, time: '2026-08-12T12:00:00+02:00' }
    ]],
    tripRouteStops: () => [
      { cityId: 3, role: 'destination' },
      { cityId: 4, role: 'destination' }
    ],
    lugarHasCoords: city => Number.isFinite(Number(city.lat)) && Number.isFinite(Number(city.lng)),
    isTransitPlaceName: () => false,
    cityWithAccommodationDestination: city => city,
    geographicDistanceMeters: (first, second) => Math.hypot(
      Number(first.latitude) - Number(second.latitude),
      Number(first.longitude) - Number(second.longitude)
    ) * 111000
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineVisitedDailyCityRecordsForScope = timelineVisitedDailyCityRecordsForScope;`, context);
  const records = context.timelineVisitedDailyCityRecordsForScope([{ id: 8 }], 1, '2026-08-12', false, new Set());

  assert.deepEqual(Array.from(records, record => Number(record.ciudadId)), [3, 4]);
  assert.equal(records[0].timelineVisited, true);
  const onlyMissing = context.timelineVisitedDailyCityRecordsForScope([{ id: 8 }], 1, '2026-08-12', false, new Set([3]));
  assert.deepEqual(Array.from(onlyMissing, record => Number(record.ciudadId)), [4]);
  assert.match(app, /const dailyCityRecords = \[\.\.\.actualDailyCityRecords, \.\.\.timelineVisitedDailyRecords, \.\.\.plannedDailyRecords\]/);
  assert.match(app, /timelineVisitedDailyCityRecordsForScope\([\s\S]*?actualDailyCityMarkerIds\s*\)/);
});

test('Solo destinos usa la clasificación y no borra el día al filtrar', () => {
  assert.match(app, /const destinationStops = completeStops\.filter\(stop => stop\.role === ROUTE_STOP_ROLE_DESTINATION\)/);
  assert.doesNotMatch(app, /completeIds\.slice\(1, -1\)/);
  assert.match(app, /Solo destinos<\/button>/);
  assert.match(app, /const dayOptions = dailyMapDatesForScope\(scopedTripIds, paisId\)/);
  assert.match(app, /plannedDailyMapRecordsForScope\(scopedTripIds, paisId, tripMapState\.day, destinationOnlyApplied\)/);
  assert.match(app, /No hay destinos para el día elegido/);
  assert.match(app, /Día seleccionado:[\s\S]*?Solo se muestran paradas marcadas como Destino/);
  assert.match(app, /function firstDestinationArrivalForTrip\(trip, scope = destinationRouteScope\(trip\)\)/);
  assert.match(app, /mapRecordPrecedesFirstDestination\(record, trip, scope\)/);
  assert.match(app, /const nearest = \[\.\.\.new Set\(scope\.completeIds\)\]/);
  assert.match(app, /nearest\.distance <= DESTINATION_RECORD_MAX_DISTANCE_METERS/);
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
  assert.match(app, /offset: stackedOverLodging \? \[0, -30\] : \[labelOnLeft \? -18 : 18, 0\]/);
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

test('el mapa diario no repite en la ciudad una entrada que ya tiene GPS exacto', () => {
  const start = app.indexOf('function dailyExactRecordCoverage');
  const end = app.indexOf('function dailyCityMapRecordsForScope', start);
  const source = app.slice(start, end);
  const dailyExactRecordCoverage = Function(`${source}\nreturn dailyExactRecordCoverage;`)();
  const coverage = dailyExactRecordCoverage([
    { kind: 'point', blogEntryId: 41, entry: { id: 41 } },
    { kind: 'photo', blogEntryId: 52, expenseId: 17 },
    { kind: 'photo', expenseId: 23 }
  ]);
  assert.deepEqual([...coverage.blogEntryIds], [41, 52]);
  assert.deepEqual([...coverage.expenseIds], [17, 23]);
  assert.match(app, /dailyCityMapRecordsForScope\(scopedTripIds, paisId, tripMapState\.day, destinationTrip, selectedExactDailyRecords\)/);
  assert.match(app, /!exactCoverage\.blogEntryIds\.has\(Number\(entry\.id\)\)/);
  assert.match(app, /!exactCoverage\.expenseIds\.has\(Number\(gasto\.id\)\)/);
  assert.match(app, /!entry\.expenseId \|\| !exactCoverage\.expenseIds\.has\(Number\(entry\.expenseId\)\)/);
});

test('las fotos con GPS se pueden mover y guardan la posición corregida', () => {
  assert.match(app, /async function moveMapPhoto\(context, latitude, longitude\)/);
  assert.match(app, /function correctedMapPhotoImage\(image, latitude, longitude\)[\s\S]*?locationSource: 'manual',[\s\S]*?mapEnabled: true/);
  assert.match(app, /imageLatitude: point\.latitude,[\s\S]*?imageLongitude: point\.longitude,[\s\S]*?imageLocationSource: 'manual'/);
  assert.match(app, /ticketLatitude: point\.latitude,[\s\S]*?ticketLongitude: point\.longitude,[\s\S]*?ticketLocationSource: 'manual'/);
  assert.match(app, /new window\.maplibregl\.Marker\(\{[\s\S]*?draggable: Boolean\(editableRecord\)[\s\S]*?moveMapPhoto\(editableRecord, position\.lat, position\.lng\)/);
  assert.match(app, /data-map-photo-drag="\$\{escapeHtml\(records\[0\]\.key\)\}"/);
  assert.match(app, /data-adjust-map-photo="\$\{escapeHtml\(record\.key\)\}"/);
  assert.match(app, /tripMapState\.photoEditKey = key;[\s\S]*?Mantén pulsado su punto \+ y arrástralo/);
  assert.match(styles, /\.trip-vector-photo-marker\.photo-position-draggable,[\s\S]*?\.map-marker-photo\.photo-position-draggable/);
});

test('los cambios de datos no construyen el mapa mientras su pestaña está oculta', () => {
  const start = app.indexOf('function renderMapPaises()');
  const end = app.indexOf('function renderResumenCiudades()', start);
  assert.match(app.slice(start, end), /if \(state\.activeTab === 'mapa'\) renderTripMap\(\)/);
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
