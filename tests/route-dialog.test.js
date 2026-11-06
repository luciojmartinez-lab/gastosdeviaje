import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';

const source = fs.readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
function fixture(date = '') {
  const dom = new JSDOM('<div id="route-dialog-body"></div>');
  const trip = {id: 1, nombre: 'Finlandia', fechaInicio: '2027-09-06', fechaFin: '2027-09-30'};
  const context = {
    $: selector => dom.window.document.querySelector(selector),
    $$: selector => [...dom.window.document.querySelectorAll(selector)],
    state: {viajes: [trip], lugares: []},
    routeEditorState: {tripId: 1, stops: [{cityId: 2, role: 'destination', date}]},
    routeCityOptionsForTrip: () => [], routeCityOptionsHtml: () => '<option>Helsinki</option>',
    routeStopRoleOptionsHtml: () => '<option>Destino</option>', escapeHtml: value => value,
    normalizedRouteStopRole: value => value, ROUTE_STOP_ROLE_DESTINATION: 'destination', ROUTE_STOP_ROLE_ENDPOINT: 'endpoint',
    tripCountryIds: () => [], tripMapState: {}, resetTripMapView() {}, closeRouteDialog() {},
    loadAll: async () => {}, setSelectedTrips() {}, renderLugarSelectors() {}, renderMapAfterTripChange() {},
    updateViaje: async (id, value) => { context.saved = value; }
  };
  for (const [start, end] of [
    ['function tripDateWithinRange(', 'function tripRouteArrivalDates('],
    ['function renderRouteDialog(', 'function openRouteDialog('],
    ['function closeRouteDialog(', 'function photoMapRecordKey(']
  ]) runInNewContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
  context.renderRouteDialog();
  return {context, dom};
}

test('el calendario de paradas permite navegar meses aunque el viaje solo abarque uno', () => {
  const {dom} = fixture();
  const input = dom.window.document.querySelector('[data-route-date]');
  assert.equal(input.type, 'date');
  assert.equal(input.hasAttribute('min'), false);
  assert.equal(input.hasAttribute('max'), false);
  assert.equal(input.value, '');
});

test('una fecha de parada fuera del viaje avisa, mantiene la fecha y no guarda', async () => {
  const {context, dom} = fixture();
  const input = dom.window.document.querySelector('[data-route-date]');
  input.value = context.routeEditorState.stops[0].date = '2027-10-01';
  await assert.rejects(context.saveRouteDialog(), /parada 1.*dentro.*parte superior/);
  assert.equal(context.saved, undefined);
  assert.equal(input.value, '2027-10-01');
  assert.equal(dom.window.document.activeElement, input);
});

test('las fechas de parada válidas y el día opcional vacío se conservan al guardar', async () => {
  for (const date of ['', '2027-09-06', '2027-09-30']) {
    const {context} = fixture(date);
    await context.saveRouteDialog();
    assert.equal(context.saved.routeStops[0].date, date);
  }
});

test('un día vacío propone inicio del viaje o la última fecha y respeta las fechas existentes', () => {
  const {context, dom} = fixture();
  const input = dom.window.document.querySelector('[data-route-date]');
  context.prepareRouteDateInput(input);
  assert.equal(input.value, '2027-09-06');
  assert.equal(context.routeEditorState.stops[0].date, '2027-09-06');
  input.value = '';
  context.routeEditorState.lastDate = '2027-09-14';
  context.prepareRouteDateInput(input);
  assert.equal(input.value, '2027-09-14');
  input.value = '2027-09-20';
  context.prepareRouteDateInput(input);
  assert.equal(input.value, '2027-09-20');
  input.value = '';
  context.routeEditorState.lastDate = '2028-01-01';
  context.prepareRouteDateInput(input);
  assert.equal(input.value, '2027-09-06');
});

test('guardar cierra las ventanas de origen; cancelar las conserva; un error no cierra ninguna', async () => {
  for (const action of ['save', 'cancel', 'invalid', 'failure']) {
    const {context, dom} = fixture('2027-09-14');
    dom.window.document.body.insertAdjacentHTML('beforeend', '<dialog id="origin" open></dialog><dialog id="unrelated" open></dialog><dialog id="route-dialog" open></dialog>');
    const parent = dom.window.document.querySelector('#origin');
    const route = dom.window.document.querySelector('#route-dialog');
    context.routeEditorState.parentDialogs = [parent];
    if (action === 'cancel') context.closeRouteDialog();
    else if (action === 'invalid') {
      context.routeEditorState.stops[0].date = '2027-10-01';
      await assert.rejects(context.saveRouteDialog(), /dentro/);
    } else if (action === 'failure') {
      context.updateViaje = async () => { throw new Error('No se pudo guardar'); };
      await assert.rejects(context.saveRouteDialog(), /No se pudo guardar/);
    } else await context.saveRouteDialog();
    assert.equal(route.open, action === 'invalid' || action === 'failure');
    assert.equal(parent.open, action !== 'save');
    assert.equal(dom.window.document.querySelector('#unrelated').open, true);
  }
});

test('las fechas del viaje se editan con la ruta y se guardan juntas sin cambiar el viaje antes', async () => {
  const {context, dom} = fixture('2027-09-14');
  assert.equal(dom.window.document.querySelector('#route-trip-start').value, '2027-09-06');
  assert.equal(dom.window.document.querySelector('#route-trip-end').value, '2027-09-30');
  context.routeEditorState.startDate = '2027-08-18';
  context.routeEditorState.endDate = '2027-10-01';
  context.routeEditorState.stops[0].date = '2027-08-20';
  assert.equal(context.state.viajes[0].fechaInicio, '2027-09-06');
  context.renderRouteDialog();
  assert.equal(dom.window.document.querySelector('#route-trip-start').value, '2027-08-18');
  await context.saveRouteDialog();
  assert.equal(context.saved.fechaInicio, '2027-08-18');
  assert.equal(context.saved.fechaFin, '2027-10-01');
  assert.equal(context.saved.routeStops[0].date, '2027-08-20');
});

test('una fecha final anterior al inicio y las fechas vacías bloquean el guardado', async () => {
  const {context} = fixture();
  context.routeEditorState.startDate = '2027-10-01';
  context.routeEditorState.endDate = '2027-09-30';
  await assert.rejects(context.saveRouteDialog(), /final.*anterior/);
  assert.equal(context.saved, undefined);
  context.routeEditorState.startDate = '';
  await assert.rejects(context.saveRouteDialog(), /Completa las fechas/);
  assert.equal(context.saved, undefined);
});

test('las etapas conservan visitas repetidas, cero noches, última estancia y cambios de horario', () => {
  const {context} = fixture();
  context.state.lugares = [{id: 2, nombre: 'Helsinki'}];
  const trip = {fechaFin: '2027-11-01'};
  const stages = context.routePlanStages(trip, [
    {cityId: 2, date: '2027-10-30'}, {cityId: 2, date: '2027-10-30'}, {cityId: 2, date: '2027-10-31'}
  ]);
  assert.equal(stages.length, 3);
  assert.equal(stages[0].nights, 0);
  assert.equal(stages[1].label, '30-10 · 1 noche');
  assert.equal(stages[2].label, '31-10 · 1 noche');
  const missing = context.routePlanStages(trip, [{cityId: 2, date: '2027-10-30'}, {cityId: 2}]);
  assert.equal(missing[0].nights, null);
  assert.equal(missing[1].label, 'Sin fecha · noches sin calcular');
  assert.equal(context.routePlanHasCoords({lat: null, lng: null}), false);
  assert.equal(context.routePlanHasCoords({lat: 0, lng: 0}), true);
});

test('el mapa muestra etiquetas y todas las etapas, agrupa visitas al mismo punto y no guarda la vista previa', () => {
  const {context, dom} = fixture();
  dom.window.document.body.insertAdjacentHTML('beforeend', '<dialog id="route-plan-dialog"></dialog><h2 id="route-plan-title"></h2><p id="route-plan-status"></p><div id="route-plan-map"></div><ol id="route-plan-stages"></ol>');
  const maps = [], markers = [];
  class FakeMap {
    constructor() { this.handlers = {}; maps.push(this); }
    addControl() {} on(name, fn) { this.handlers[name] = fn; }
    addSource(id, source) { this.source = source; } addLayer() {} resize() {} fitBounds() {}
    project() { return {x: 100, y: 100}; }
    remove() { this.removed = true; }
  }
  class Marker {
    constructor(options) { markers.push(options.element); }
    setLngLat() { return this; } addTo() { return this; }
  }
  context.document = dom.window.document;
  context.window = {maplibregl: {Map: FakeMap, Marker, NavigationControl: class {}, LngLatBounds: class {extend() {return this;}}}};
  context.state.lugares = [{id: 2, nombre: 'Helsinki', lat: 60.17, lng: 24.94}, {id: 3, nombre: 'Oulu', lat: 65, lng: 25.47}, {id: 4, nombre: 'Sin ubicación', lat: null, lng: null}];
  context.openRoutePlanMap({nombre: 'Finlandia', fechaFin: '2027-08-24'}, [
    {cityId: 2, date: '2027-08-18'}, {cityId: 3, date: '2027-08-20'}, {cityId: 4, date: '2027-08-21'}, {cityId: 2, date: '2027-08-23'}
  ], true);
  assert.equal(context.saved, undefined);
  assert.equal(dom.window.document.querySelectorAll('#route-plan-stages li').length, 4);
  assert.match(dom.window.document.querySelector('#route-plan-status').textContent, /Vista previa sin guardar.*Sin ubicación/);
  assert.equal(markers.length, 2);
  assert.equal(markers[0].textContent, 'Helsinki');
  assert.equal(dom.window.document.querySelector('#route-plan-label'), null);
  markers[0].querySelector('button').click();
  assert.match(dom.window.document.querySelector('#route-plan-label').textContent, /18-08 · 2 noches.*23-08 · 1 noche/);
  maps[0].handlers.load();
  assert.equal(maps[0].source.data.geometry.coordinates.length, 1, 'la ruta no salta una etapa sin coordenadas');
  context.closeRoutePlanMap();
  assert.equal(maps[0].removed, true);
});

test('sin mapa interactivo se conserva la vista sencilla y la lista, incluso sin coordenadas', () => {
  const {context, dom} = fixture();
  context.document = dom.window.document;
  context.window = {};
  context.TRIP_MAP_MIN_ZOOM = 2;
  for (const [start, end] of [
    ['function mapWorldPoint(', 'function chooseBlogMapZoom('],
    ['function mapLatLngFromWorldPoint(', 'function zoomTripMapAtPoint(']
  ]) runInNewContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
  dom.window.document.body.insertAdjacentHTML('beforeend', '<dialog id="route-plan-dialog"></dialog><h2 id="route-plan-title"></h2><p id="route-plan-status"></p><div id="route-plan-map"></div><ol id="route-plan-stages"></ol>');
  context.state.lugares = [{id: 2, nombre: 'Helsinki', lat: 60.17, lng: 24.94}];
  context.openRoutePlanMap({nombre: 'Finlandia', fechaFin: '2027-08-20'}, [{cityId: 2, date: '2027-08-18'}]);
  assert.ok(dom.window.document.querySelector('#route-plan-map svg'));
  assert.match(dom.window.document.querySelector('#route-plan-map').textContent, /Helsinki/);
  assert.doesNotMatch(dom.window.document.querySelector('#route-plan-map').textContent, /2 noches/);
  dom.window.document.querySelector('[data-route-plan-point]').dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true}));
  assert.match(dom.window.document.querySelector('#route-plan-label').textContent, /Helsinki \(18-08 · 2 noches\)/);
  context.state.lugares[0].lat = null;
  context.openRoutePlanMap({nombre: 'Finlandia'}, [{cityId: 2}]);
  assert.match(dom.window.document.querySelector('#route-plan-map').textContent, /No hay ciudades con coordenadas/);
  assert.match(dom.window.document.querySelector('#route-plan-stages').textContent, /Helsinki.*Sin fecha.*sin coordenadas/);
  assert.equal(context.saved, undefined);
});

test('inicio y regreso muestran solo la fecha y el texto compartido respeta la selección sin recalcular noches', () => {
  const {context} = fixture();
  context.state.lugares = [{id: 2, nombre: 'Barcelona'}, {id: 3, nombre: 'Oulu'}, {id: 4, nombre: 'Ciudad privada no seleccionada'}, {id: 5, nombre: 'Inari'}];
  const stages = context.routePlanStages({fechaFin: '2027-08-28'}, [
    {cityId: 2, role: 'endpoint', date: '2027-08-18'},
    {cityId: 3, date: '2027-08-19'},
    {cityId: 4, date: '2027-08-21'},
    {cityId: 5, date: '2027-08-24'},
    {cityId: 2, role: 'endpoint', date: '2027-08-28'}
  ]);
  assert.equal(stages[0].label, '18-08');
  assert.equal(stages[4].label, '28-08');
  const text = context.routeShareText('Viaje compartido', [stages[1], stages[3]], 'Nos encontramos en Oulu.');
  assert.match(text, /Oulu.*\nLlegada: 19\/08\/2027\nSalida: 21\/08\/2027 · 2 noches/);
  assert.match(text, /Inari.*\nLlegada: 24\/08\/2027/);
  assert.doesNotMatch(text, /privada|Barcelona|cuenta|saldo|gasto/i);
  assert.match(text, /Nos encontramos en Oulu/);
  assert.equal(context.routeShareText('Viaje', []), '');
});

test('compartir usa solo las casillas marcadas y deja de estar disponible si no se marca ninguna', () => {
  const {context, dom} = fixture();
  context.document = dom.window.document; context.window = {};
  dom.window.document.body.insertAdjacentHTML('beforeend', '<dialog id="route-plan-dialog"></dialog><h2 id="route-plan-title"></h2><p id="route-plan-status"></p><div id="route-plan-map"></div><ol id="route-plan-stages"></ol><textarea id="route-share-preview"></textarea><textarea id="route-share-note"></textarea><button id="route-share-text"></button><button id="route-share-copy"></button><button id="route-share-pdf"></button><p id="route-share-status"></p>');
  context.state.lugares = [{id: 2, nombre: 'Oulu'}, {id: 3, nombre: 'Inari'}];
  context.openRoutePlanMap({nombre: 'Finlandia', fechaFin: '2027-08-24'}, [{cityId: 2, date: '2027-08-18'}, {cityId: 3, date: '2027-08-20'}], true);
  const checkboxes = [...dom.window.document.querySelectorAll('[data-route-share-stage]')];
  checkboxes[0].checked = false;
  context.renderRouteSharePreview();
  const preview = dom.window.document.querySelector('#route-share-preview');
  assert.doesNotMatch(preview.value, /Oulu/);
  assert.match(preview.value, /Inari/);
  checkboxes[1].checked = false;
  context.renderRouteSharePreview();
  assert.equal(preview.value, '');
  assert.equal(dom.window.document.querySelector('#route-share-text').disabled, true);
  assert.equal(dom.window.document.querySelector('#route-share-pdf').disabled, true);
});

test('Mapa en Editar viaje previsualiza valores actuales sin guardar ni cerrar el formulario', () => {
  const {context, dom} = fixture();
  dom.window.document.body.insertAdjacentHTML('beforeend', '<dialog id="form-dialog"><form id="form-dialog-form"><button type="submit">Guardar</button></form><h2 id="form-dialog-title"></h2><div id="form-dialog-fields"></div></dialog>');
  context.setDialogHelpTarget = () => {};
  context.setMessage = () => {};
  context.mergeTripRouteStops = (trip, ids) => ids.map(cityId => ({cityId}));
  let captured, saves = 0;
  context.openRoutePlanMap = (trip, stops, preview) => { captured = {trip, stops, preview}; };
  for (const [start, end] of [['function openFormDialog(', 'function closeFormDialog('], ['function formDialogValues(', 'async function resetDataValue(']]) {
    runInNewContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
  }
  context.openFormDialog({title: 'Editar viaje', onSubmit: () => saves++, fields: [
    {name: 'nombre', value: 'Finlandia'}, {name: 'fechaInicio', type: 'date', value: '2027-09-06'}, {name: 'fechaFin', type: 'date', value: '2027-09-30'},
    {name: 'ciudadIds', type: 'multiselect', value: [2, 3], options: [{value: 2, label: 'Helsinki'}, {value: 3, label: 'Oulu'}], reorder: true, routeList: true, routeTripId: 1}
  ]});
  dom.window.document.querySelector('#form-field-nombre').value = 'Nombre sin guardar';
  dom.window.document.querySelector('#form-field-fechaInicio').value = '2027-08-18';
  dom.window.document.querySelector('[data-form-route-map]').click();
  assert.equal(saves, 0);
  assert.equal(captured.trip.nombre, 'Nombre sin guardar');
  assert.equal(captured.trip.fechaInicio, '2027-08-18');
  assert.equal(captured.stops.length, 2);
  assert.equal(captured.preview, true);
  assert.equal(dom.window.document.querySelector('#form-dialog').open, true);
  assert.equal(context.state.viajes[0].fechaInicio, '2027-09-06');
});

test('el alojamiento se guarda por visita, con precio doble por noche o estancia, sin crear gastos', async () => {
  const {context} = fixture('2027-09-14');
  context.routeEditorState.stops[0].lodging = {name: 'Hotel de prueba', doublePrice: '125,50', currency: 'eur', priceBasis: 'stay', info: 'Desayuno incluido', url: 'https://example.com/hotel'};
  await context.saveRouteDialog();
  const saved = context.saved.routeStops[0].lodging;
  assert.equal(saved.doublePrice, 125.5);
  assert.equal(saved.currency, 'EUR');
  assert.equal(saved.priceBasis, 'stay');
  assert.match(context.routeLodgingLines(saved).join('\n'), /Habitación doble: 125,50 EUR por estancia/);
  assert.equal(context.saved.gastos, undefined);
  assert.equal(context.normalizeRouteLodging({currency: 'EUR'}), null);
  assert.equal(context.normalizeRouteLodging({name: 'Gratis', doublePrice: 0}).doublePrice, 0);
});

test('precios negativos, monedas incorrectas y webs inseguras impiden guardar el alojamiento', async () => {
  for (const lodging of [{name: 'Hotel', doublePrice: -1}, {doublePrice: 20, currency: 'EURO'}, {name: 'Hotel', url: 'javascript:alert(1)'}]) {
    const {context} = fixture('2027-09-14');
    context.routeEditorState.stops[0].lodging = lodging;
    await assert.rejects(context.saveRouteDialog(), /precio|moneda|web/);
    assert.equal(context.saved, undefined);
  }
});

test('reordenar ciudades repetidas y normalizar el viaje conserva sus alojamientos distintos', () => {
  const {context} = fixture();
  runInNewContext(source.slice(source.indexOf('function normalizeTripRouteStops('), source.indexOf('function tripCityIds(')), context);
  const trip = {ciudadIds: [2, 3, 2], routeStops: [
    {cityId: 2, lodging: {name: 'Primer hotel'}}, {cityId: 3, lodging: {name: 'Segundo hotel'}}, {cityId: 2, lodging: {name: 'Hotel del regreso'}}
  ]};
  const merged = context.mergeTripRouteStops(trip, [2, 2, 3]);
  assert.equal(merged[0].lodging.name, 'Primer hotel');
  assert.equal(merged[1].lodging.name, 'Hotel del regreso');
  assert.equal(merged[2].lodging.name, 'Segundo hotel');
  assert.equal(context.tripRouteStops({...trip, routeStops: JSON.parse(JSON.stringify(trip.routeStops))})[2].lodging.name, 'Hotel del regreso');
});

test('el PDF se abre antes de compartir; cambios de formato, selección o alojamientos exigen nueva vista', async () => {
  const {context, dom} = fixture();
  context.document = dom.window.document; context.window = {}; context.File = File;
  dom.window.document.body.insertAdjacentHTML('beforeend', '<dialog id="route-plan-dialog"></dialog><dialog id="pdf-viewer-dialog"></dialog><h2 id="route-plan-title"></h2><p id="route-plan-status"></p><div id="route-plan-map"></div><ol id="route-plan-stages"></ol><textarea id="route-share-preview"></textarea><textarea id="route-share-note"></textarea><select id="route-share-pdf-format"><option value="summary">Resumen</option><option value="brochure">Folleto</option></select><input type="checkbox" id="route-share-lodgings" checked><button id="route-share-text"></button><button id="route-share-copy"></button><button id="route-share-view-pdf"></button><button id="route-share-pdf"></button><p id="route-share-status"></p>');
  context.state.lugares = [{id: 2, nombre: 'Oulu'}];
  context.openRoutePlanMap({nombre: 'Finlandia', fechaFin: '2027-09-20'}, [{cityId: 2, date: '2027-09-14', lodging: {name: 'Hotel visible', doublePrice: 99}}], true);
  let built = 0, shared = 0, opened = 0;
  context.routeItineraryPdf = async () => { built++; return new Blob(['PDF'], {type: 'application/pdf'}); };
  context.openPdfDocument = async () => { opened++; dom.window.document.querySelector('#pdf-viewer-dialog').setAttribute('open', ''); };
  context.navigator = {canShare: () => true, share: async () => { shared++; }};
  const share = dom.window.document.querySelector('#route-share-pdf');
  assert.equal(share.disabled, true);
  await context.shareRoutePdf();
  assert.equal(opened, 1); assert.equal(shared, 0); assert.equal(built, 1);
  assert.equal(share.disabled, false);
  await context.shareRoutePdf();
  assert.equal(shared, 1); assert.equal(built, 1);
  dom.window.document.querySelector('#route-share-pdf-format').value = 'brochure';
  context.renderRouteSharePreview(); assert.equal(share.disabled, true);
  await context.viewRoutePdf(); assert.equal(built, 2);
  dom.window.document.body.insertAdjacentHTML('beforeend', '<input type="checkbox" id="route-plan-show-route" checked>');
  dom.window.document.querySelector('#route-plan-show-route').checked = false;
  context.renderRouteSharePreview(); assert.equal(share.disabled, true, 'cambiar la ruta exige volver a revisar el PDF');
  dom.window.document.querySelector('#route-plan-show-route').checked = true;
  dom.window.document.querySelector('#route-share-lodgings').checked = false;
  context.renderRouteSharePreview(); assert.equal(share.disabled, true);
  assert.doesNotMatch(dom.window.document.querySelector('#route-share-preview').value, /Hotel visible|99/);
});

test('el fondo del PDF usa OpenFreeMap sin clave y libera el mapa temporal al terminar o fallar', async () => {
  for (const event of ['idle', 'error']) {
    const {context, dom} = fixture();
    context.document = dom.window.document; context.setTimeout = setTimeout; context.clearTimeout = clearTimeout;
    dom.window.HTMLCanvasElement.prototype.getContext = () => ({drawImage() {}});
    let created;
    class FakeMap {
      constructor(options) { this.options = options; this.handlers = {}; created = this; }
      on(name, fn) { this.handlers[name] = fn; }
      getCanvas() { return dom.window.document.createElement('canvas'); }
      remove() { this.removed = true; }
    }
    context.window = {maplibregl: {Map: FakeMap, supported: () => true}};
    const promise = context.routePdfBaseMap({latitude: 65, longitude: 25}, 5, 960, 900);
    assert.equal(created.options.style, 'https://tiles.openfreemap.org/styles/positron');
    assert.equal(created.options.zoom, 4, 'alinea la escala de MapLibre con la proyección de 256 píxeles');
    assert.equal(created.options.pixelRatio, 1.5);
    created.handlers[event]();
    const result = await promise;
    assert.equal(Boolean(result), event === 'idle');
    assert.equal(created.removed, true);
    assert.equal(dom.window.document.querySelector('[aria-hidden="true"]'), null);
  }
});

test('las etiquetas estáticas se mantienen en el mapa sin cubrir los puntos de ciudades cercanas', () => {
  const {context} = fixture();
  const points = [{x: 100, y: 100}, {x: 110, y: 120}];
  const boxes = context.routePdfLabelLayout(points.map(point => ({point, w: 200, h: 38})), points, {x: 0, y: 0, w: 600, h: 300});
  for (const box of boxes) {
    assert.ok(box.x >= 0 && box.x + box.w <= 600);
    assert.ok(box.y >= 0 && box.y + box.h <= 300);
    for (const point of points) assert.equal(point.x > box.x && point.x < box.x + box.w && point.y > box.y && point.y < box.y + box.h, false);
  }
});

test('la ruta sigue el orden, conserva el regreso y no conecta etapas omitidas o sin coordenadas', () => {
  const {context} = fixture();
  const city = (lat, lng) => ({lat, lng});
  const stages = [{number: 1, city: city(41, 2)}, {number: 2, city: city(60, 24)}, {number: 3, city: city(65, 25)}, {number: 4, city: city(41, 2)}];
  const segments = context.routePlanSegments(stages);
  assert.equal(segments.length, 3);
  assert.equal(segments[0][0][0], 2); assert.equal(segments[0][1][0], 24);
  assert.equal(segments[2][1][0], 2);
  assert.equal(context.routePlanSegments([stages[0], stages[2], stages[3]]).length, 1);
  stages[1].city = {lat: null, lng: null};
  assert.equal(context.routePlanSegments(stages).length, 1);
});

test('el PDF coloca tabla y noches debajo del mapa, continúa sin perder etapas y deja turismo después', async () => {
  for (const format of ['summary', 'brochure']) {
    const pages = []; let texts = [];
    const draw = {scale() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText(text, x, y) { texts.push({text, x, y}); }};
    const canvas = {getContext: () => draw};
    const context = {
      document: {createElement: () => canvas},
      blogShareWrappedLines: (draw, text) => text ? String(text).split('\n') : [],
      canvasJpegBlob: async () => {pages.push(texts); texts = []; return new Blob(['page']);},
      drawRoutePdfMap: async (draw, stages, box) => draw.fillText('MAPA', box.x, box.y),
      routeShareDate: date => date, routeLodgingLines: () => ['ALOJAMIENTO DE PRUEBA'], cityTourism: value => value,
      CityGuide: {destinations: stages => stages.slice(0, 1)},
      builder: {buildImagePdfBlob: () => new Blob(['pdf'])}
    };
    runInNewContext(source.slice(source.indexOf('async function routeItineraryPdf('), source.indexOf('async function viewRoutePdf(')).replace("  const pdf = await (routeItineraryPdfPromise ||= import('./share-pdf.js?v=800v071'));", '  const pdf = builder;'), context);
    const stages = Array.from({length: 30}, (_, i) => ({number: i+1, city: {id: i+1, nombre: 'Ciudad '+(i+1)}, date: '2027-08-18', departureDate: '2027-08-20', nights: 2, tourism: {intro: 'INTRO TURISMO', items: [{name: 'Lugar turístico', description: 'Descripción'}], reviewed: true}}));
    await context.routeItineraryPdf('Prueba', stages, '', {format});
    const first = pages[0];
    assert.ok(first.find(t => t.text === 'MAPA'));
    assert.ok(first.find(t => t.text === 'Noches'));
    assert.ok(first.find(t => t.text === 'Ciudad 1'));
    assert.ok(first.find(t => t.text === 'Noches').y > first.find(t => t.text === 'MAPA').y);
    const tablePage = pages.findIndex(page => page.some(t => t.text === 'Ciudad 30'));
    assert.ok(tablePage > 0, 'el recorrido largo continúa en otras páginas');
    for (let i=1; i<=30; i++) assert.equal(pages.flat().filter(t => t.text === 'Ciudad '+i).length, 1);
    const tourismPage = pages.findIndex(page => page.some(t => t.text === 'INTRO TURISMO'));
    if (format === 'brochure') {
      const lodgingPage = pages.findLastIndex(page => page.some(t => t.text === 'ALOJAMIENTO DE PRUEBA'));
      assert.ok(lodgingPage >= tablePage);
      assert.ok(tourismPage > lodgingPage, 'turismo después de todos los alojamientos');
    }
    else assert.equal(tourismPage, -1);
    for (const page of pages) assert.ok(page.every(t => t.y < 1500), 'sin texto fuera de página');
  }
});

test('el folleto usa la foto guardada sin red, conserva créditos y continúa si está dañada', async () => {
  await import('../tourism-photos.js');
  const photo={title:'File:Cathedral.jpg',author:'Autora de prueba',credit:'Crédito completo',url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Cathedral.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cathedral.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',data:'data:image/jpeg;base64,/9j/AA=='};
  for(const fail of [false,true]){
    const texts=[];let images=0,closed=0;
    const draw={scale(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(text){texts.push(text);},drawImage(){images++;}};
    const context={TourismPhotos:globalThis.TourismPhotos,document:{createElement:()=>({getContext:()=>draw})},blogShareWrappedLines:(draw,text)=>text?[text]:[],canvasJpegBlob:async()=>new Blob(['page']),drawRoutePdfMap:async()=>{},routeShareDate:d=>d,routeLodgingLines:()=>[],cityTourism:value=>value,CityGuide:{destinations:s=>s},builder:{buildImagePdfBlob:()=>new Blob(['pdf'])},dataUrlToBlob:data=>{assert.equal(data,photo.data);return new Blob(['jpeg']);},loadImageFile:async()=>{if(fail)throw Error('Imagen dañada');return{width:800,height:600,close(){closed++;}};},fetch:()=>{throw Error('No debe consultar internet al preparar el PDF');}};
    runInNewContext(source.slice(source.indexOf('async function routeItineraryPdf('),source.indexOf('async function viewRoutePdf(')).replace("  const pdf = await (routeItineraryPdfPromise ||= import('./share-pdf.js?v=800v071'));",'  const pdf = builder;'),context);
    await context.routeItineraryPdf('Viaje',[{number:1,city:{nombre:'Ciudad'},date:'2027-08-18',departureDate:'2027-08-20',nights:2,tourism:{intro:'Intro',items:[{name:'Catedral',description:'Texto conservado',photo}],reviewed:true}}],'',{format:'brochure'});
    assert.equal(images,fail?0:1);assert.equal(closed,fail?0:1);
    const text=texts.join('\n');for(const value of [photo.author,photo.licenseUrl,photo.sourceUrl,'Texto conservado'])assert.ok(text.includes(value));
    if(fail)assert.match(text,/Foto guardada no disponible/);
  }
});
