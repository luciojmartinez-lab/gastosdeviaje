import test from 'node:test';
import assert from 'node:assert/strict';
import '../map-model.js';

const { createDaily, createTrip, createOverviewPrintLayout } = globalThis.TripMapModel;

test('el recorrido diario respeta Barcelona, Varsovia y Torun aunque haya fotos intercaladas', () => {
  const records = [
    { kind: 'city', ciudadId: 1, cityName: 'Barcelona', hora: '09:30', routeNumber: 1, latitude: 41.38, longitude: 2.17 },
    { kind: 'photo', ciudadId: 1, hora: '10:00', routeNumber: 1, latitude: 41.38, longitude: 2.17 },
    { kind: 'city', ciudadId: 2, cityName: 'Varsovia', hora: '18:56', routeNumber: 2, latitude: 52.23, longitude: 21.01 },
    { kind: 'photo', ciudadId: 3, hora: '20:30', routeNumber: 3, latitude: 53.01, longitude: 18.61 },
    { kind: 'city', ciudadId: 3, cityName: 'Torun', hora: '21:18', routeNumber: 3, latitude: 53.01, longitude: 18.61 }
  ];
  const model = createDaily(records);
  assert.deepEqual(model.route.map(record => record.ciudadId), [1, 2, 3]);
  assert.deepEqual(model.markers.map(marker => marker.numberText), ['1', '2', '3']);
  assert.deepEqual(model.markers[2].labelLines, ['Torun', '21:18']);
});

test('un solo destino no dibuja línea y muestra únicamente la hora', () => {
  const model = createDaily([
    { kind: 'city', ciudadId: 3, cityName: 'Torun', hora: '08:20', routeNumber: 3, latitude: 53.01, longitude: 18.61 },
    { kind: 'photo', ciudadId: 3, hora: '09:10', routeNumber: 3, latitude: 53.02, longitude: 18.62 }
  ]);
  assert.equal(model.hasRoute, false);
  assert.deepEqual(model.route, []);
  assert.deepEqual(model.markers[0].labelLines, ['08:20']);
});

test('las ciudades repetidas conservan todos sus números de ruta', () => {
  const model = createTrip([
    { cityId: 1, name: 'Barcelona', number: 1, arrivalDate: '2026-03-25', latitude: 41.38, longitude: 2.17 },
    { cityId: 2, name: 'Varsovia', number: 2, arrivalDate: '2026-03-25', latitude: 52.23, longitude: 21.01 },
    { cityId: 3, name: 'Torun', number: 3, arrivalDate: '2026-03-28', latitude: 53.01, longitude: 18.61 },
    { cityId: 2, name: 'Varsovia', number: 7, arrivalDate: '2026-04-05', latitude: 52.23, longitude: 21.01 },
    { cityId: 1, name: 'Barcelona', number: 8, arrivalDate: '2026-04-08', latitude: 41.38, longitude: 2.17 }
  ]);
  const byName = Object.fromEntries(model.markerGroups.map(group => [group.labelLines[0], group.numberText]));
  assert.equal(byName.Barcelona, '1-8');
  assert.equal(byName.Varsovia, '2-7');
  assert.equal(byName.Torun, '3');
  assert.deepEqual(model.routeStops.map(stop => stop.number), [1, 2, 3, 7, 8]);
});

test('las fotos se agrupan sin alterar los marcadores de ciudades', () => {
  const model = createDaily([
    { kind: 'city', ciudadId: 3, cityName: 'Torun', hora: '08:00', latitude: 53.01, longitude: 18.61 },
    { kind: 'photo', ciudadId: 3, hora: '09:00', latitude: 53.0101, longitude: 18.6101 },
    { kind: 'photo', ciudadId: 3, hora: '10:00', latitude: 53.0102, longitude: 18.6102 }
  ]);
  assert.equal(model.routeMarkers.length, 1);
  assert.equal(model.photoGroups.length, 1);
  assert.equal(model.photoGroups[0].count, 2);
});

test('el PDF recorta solo el mapa y deja fuera la lista incrustada', () => {
  const layout = createOverviewPrintLayout({
    sourceWidth: 920,
    sourceHeight: 756,
    mapTop: 86,
    mapHeight: 460
  });
  assert.equal(layout.frameAspectRatio, '920 / 460');
  assert.equal(layout.imageOffsetPercent, (86 / 756) * 100);
  assert.ok(layout.mapTop + layout.mapHeight < layout.sourceHeight);
});
