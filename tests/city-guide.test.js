import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
import '../city-guide.js';

const {CityGuide} = globalThis;
const app = fs.readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const guide = {intro: 'Ciudad de prueba', items: [{name: 'Lugar A', description: 'Descripción A', photoTip: 'Consejo A'}], reviewed: true};
function fixture() {
  const dom = new JSDOM(html);
  const context = {CityGuide, AbortController, setTimeout, clearTimeout, routePlanShareState: null,
    $: selector => dom.window.document.querySelector(selector),
    $$: selector => [...dom.window.document.querySelectorAll(selector)],
    state: {lugares: [{id: 1, nombre: 'Finlandia'}, {id: 2, nombre: 'Oulu', parentId: 1, tourism: JSON.parse(JSON.stringify(guide))}]},
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    ReceiptAccess: {get: () => 'codigo-prueba', save() {}},
    alert: message => {context.alertMessage = message;}, renderLugares() {}, renderRouteSharePreview() {},
    setMessage: (selector, message) => {context.$(selector).textContent = message;},
    updateLugar: async (id, patch) => {context.saved = {...context.state.lugares.find(city => city.id === id), ...patch}; return context.saved;}
  };
  const dialog = context.$('#city-guide-dialog');
  dialog.showModal = () => dialog.setAttribute('open', ''); dialog.close = () => dialog.removeAttribute('open');
  runInNewContext(app.slice(app.indexOf('function cityTourism('), app.indexOf('function normalizeRouteLodging(')), context);
  return {context, dom};
}

test('la ficha limita cinco lugares y la propuesta exige campos válidos sin repetir nombres', () => {
  assert.equal(CityGuide.normalize({items: Array.from({length: 8}, (_, i) => ({name: 'Lugar '+i}))}).items.length, 5);
  assert.throws(() => CityGuide.normalize({intro: '', items: [{name: 'Café', description: 'D', photoTip: ''}, {name: 'CAFE', description: 'D', photoTip: ''}]}, true), /repetidos/);
  assert.throws(() => CityGuide.normalize({intro: '', items: [{name: 'A', description: {}, photoTip: ''}]}, true), /campos/);
  assert.equal(CityGuide.normalize(null).items.length, 0);
});

test('solo destinos únicos entran en el folleto; tránsito e inicio/regreso quedan fuera', () => {
  const destinations = CityGuide.destinations([{role: 'endpoint', city: {id: 1}}, {role: 'transit', city: {id: 2}}, {role: 'destination', city: {id: 3}}, {role: 'destination', city: {id: 3}}, {role: 'destination', city: {id: 4}}]);
  assert.deepEqual(destinations.map(stage => stage.city.id), [3, 4]);
});

test('la ficha existente se consulta, cancela sin cambios y guarda solo al pulsar Guardar', async () => {
  const {context} = fixture();
  context.openCityGuide(2);
  context.$('[data-guide-name="0"]').value = 'Nombre editado';
  context.closeCityGuide(); assert.equal(context.saved, undefined);
  context.openCityGuide(2); assert.equal(context.$('[data-guide-name="0"]').value, 'Lugar A');
  context.$('[data-guide-name="0"]').value = 'Nombre guardado';
  await context.saveCityGuide();
  assert.equal(context.saved.tourism.items[0].name, 'Nombre guardado');
  assert.equal(context.saved.tourism.reviewed, true);
  assert.equal(context.$('#city-guide-dialog').open, false);
});

test('al crear una ciudad prepara la ficha para Añadir y exige elegir antes el país', async () => {
  const {context} = fixture();
  context.$('#lugar-nombre').value = 'Kuopio'; context.openCityGuide();
  assert.match(context.alertMessage, /elige su país/);
  context.$('#lugar-parent').innerHTML = '<option value="1">Finlandia</option>';
  context.openCityGuide(); context.$('[data-guide-name="0"]').value = 'Lugar nuevo';
  await context.saveCityGuide();
  assert.equal(context.saved, undefined);
  const pending = runInNewContext('pendingCityGuide', context);
  assert.equal(pending.name, 'Kuopio'); assert.equal(pending.countryId, 1);
  assert.equal(pending.guide.items[0].name, 'Lugar nuevo');
  assert.match(context.$('#msg-lugar').textContent, /Pulsa Añadir/);
});

test('la propuesta usa solo ciudad y país, requiere consentimiento y no sustituye la ficha guardada', async () => {
  const {context} = fixture(); let sent;
  context.fetch = async (url, options) => {sent = JSON.parse(options.body); return Response.json({guide: {...guide, source: 'gemini', reviewed: false}});};
  context.openCityGuide(2); await context.proposeCityGuide(); assert.equal(sent, undefined);
  context.$('#city-guide-consent').checked = true;
  await context.proposeCityGuide();
  assert.deepEqual(sent, {mode: 'city-guide', city: 'Oulu', country: 'Finlandia', consent: true});
  assert.equal(context.saved, undefined);
  assert.equal(context.state.lugares[1].tourism.items[0].name, 'Lugar A');
  assert.match(context.$('#city-guide-status').textContent, /Revisa/);
});
