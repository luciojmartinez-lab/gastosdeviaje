import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = fs.readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
function fixture(accepted) {
  const writes = [], prompts = [], info = {};
  let renders = 0;
  const context = {
    state: {lugares: [{id: 2, parentId: 1, nombre: 'Oulu', lat: 65, lng: 25}], viajes: [{id: 3}], blogEntries: [{id: 4, tipo: 'punto', descripcion: 'Mirador', viajeId: 3, ciudadId: 2, mapCityManual: true}]},
    tripMapState: {},
    confirm: message => {prompts.push(message); return accepted;},
    $: () => info, renderTripMap: () => {renders++;},
    blogPointCoordinate: Number, storedImageCoordinate: Number,
    updateLugar: async (id, patch) => writes.push({kind: 'city', id, patch}),
    updateBlogEntry: async (id, patch) => writes.push({kind: 'point', id, patch}),
    closeTripMapPhotoPopup() {}, loadAll: async () => {}, setTab() {}
  };
  runInNewContext(source.slice(source.indexOf('function confirmMapPositionChange('), source.indexOf('function parseTimelineFileInWorker(')), context);
  runInNewContext(source.match(/async function moveMapPhoto\([^]*?\n\}/)[0], context);
  return {context, writes, prompts, info, renders: () => renders};
}

test('cancelar un arrastre de ciudad, punto o foto no escribe datos y restaura la vista anterior', async () => {
  for (const kind of ['city', 'point', 'photo']) {
    const {context, writes, prompts, renders, info} = fixture(false);
    if (kind === 'city') await context.moveMapCity({cityId: 2}, 66, 26);
    else if (kind === 'point') await context.moveMapPoint({entryId: 4}, 66, 26);
    else await context.moveMapPhoto({image: {name: 'Foto de prueba'}}, 66, 26);
    assert.equal(writes.length, 0);
    assert.equal(prompts.length, 1);
    assert.match(prompts[0], /nueva ubicación.*\n.*66\.000000/s);
    assert.equal(renders(), 1);
    assert.match(info.textContent, /cancelado/);
    assert.equal(context.state.lugares[0].lat, 65);
  }
});

test('aceptar un arrastre guarda la ubicación solicitada tras la confirmación', async () => {
  for (const kind of ['city', 'point']) {
    const {context, writes, prompts} = fixture(true);
    if (kind === 'city') await context.moveMapCity({cityId: 2}, 66, 26);
    else await context.moveMapPoint({entryId: 4}, 66, 26);
    assert.equal(prompts.length, 1);
    assert.equal(writes.length, 1);
    assert.equal(kind === 'city' ? writes[0].patch.lat : writes[0].patch.latitude, 66);
    if (kind === 'city') assert.match(prompts[0], /viajes que la utilizan/);
  }
});
