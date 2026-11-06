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
    state: {viajes: [trip], lugares: []},
    routeEditorState: {tripId: 1, stops: [{cityId: 2, role: 'destination', date}]},
    routeCityOptionsForTrip: () => [], routeCityOptionsHtml: () => '<option>Helsinki</option>',
    routeStopRoleOptionsHtml: () => '<option>Destino</option>', escapeHtml: value => value,
    normalizedRouteStopRole: value => value, ROUTE_STOP_ROLE_DESTINATION: 'destination',
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
  assert.match(markers[0].textContent, /18-08 · 2 noches.*23-08 · 1 noche/);
  maps[0].handlers.load();
  assert.equal(maps[0].source.data.geometry.coordinates.length, 1, 'no conecta saltando una ciudad sin coordenadas');
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
  assert.match(dom.window.document.querySelector('#route-plan-map').textContent, /Helsinki \(18-08 · 2 noches\)/);
  context.state.lugares[0].lat = null;
  context.openRoutePlanMap({nombre: 'Finlandia'}, [{cityId: 2}]);
  assert.match(dom.window.document.querySelector('#route-plan-map').textContent, /No hay ciudades con coordenadas/);
  assert.match(dom.window.document.querySelector('#route-plan-stages').textContent, /Helsinki.*Sin fecha.*sin coordenadas/);
  assert.equal(context.saved, undefined);
});
