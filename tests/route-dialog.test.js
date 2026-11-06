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
    ['async function saveRouteDialog(', 'function photoMapRecordKey(']
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
  await assert.rejects(context.saveRouteDialog(), /parada 1.*dentro.*Crear\/Editar Viaje/);
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
