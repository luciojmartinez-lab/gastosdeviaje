import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodePolyline6, routePointsWithExactAnchors } from '../netlify/functions/route-adjust.js';

await import('../timeline-routing.js');

const routing = globalThis.TimelineRouting;

test('el modo automático distingue coche y recorrido a pie', () => {
  const car = [
    { latitude: 40.09, longitude: -1.55, time: '2026-08-18T10:00:00' },
    { latitude: 40.02, longitude: -1.65, time: '2026-08-18T10:15:00' }
  ];
  car.activityType = 'IN_PASSENGER_VEHICLE';
  const walk = [
    { latitude: 40.09, longitude: -1.55, time: '2026-08-18T18:00:00' },
    { latitude: 40.095, longitude: -1.56, time: '2026-08-18T18:20:00' }
  ];
  walk.activityType = 'WALKING';
  assert.equal(routing.costingForPath(car, 'automatic'), 'auto');
  assert.equal(routing.costingForPath(walk, 'automatic'), 'pedestrian');
});

test('el coche y los trayectos a pie conservan puntos intermedios y fotos ancla', () => {
  const path = [
    { latitude: 40, longitude: -1, time: '2026-08-18T10:00:00' },
    { latitude: 40.01, longitude: -1.01, time: '2026-08-18T10:05:00' },
    { latitude: 40.02, longitude: -1.02, time: '2026-08-18T10:10:00', routingAnchor: true },
    { latitude: 40.03, longitude: -1.03, time: '2026-08-18T10:15:00' }
  ];
  assert.equal(routing.waypointsForPath(path, 'auto').length, 4);
  assert.equal(routing.waypointsForPath(path, 'pedestrian').length, 4);
});

test('el coche conserva una muestra de hasta 16 puntos para reducir diferencias entre ida y vuelta', () => {
  const path = Array.from({ length: 25 }, (_, index) => ({
    latitude: 40 + index * 0.001,
    longitude: -1 - index * 0.001,
    routingAnchor: index === 7 || index === 19
  }));
  const selected = routing.waypointsForPath(path, 'auto', 16);
  assert.equal(selected.length, 16);
  assert.ok(selected.some(point => point.routingAnchor && point.latitude === path[7].latitude));
  assert.ok(selected.some(point => point.routingAnchor && point.latitude === path[19].latitude));
});

test('un recorrido circular conserva un punto alejado para no colapsar', () => {
  const path = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.02, longitude: -1.02 },
    { latitude: 40.00001, longitude: -1.00001 }
  ];
  assert.equal(routing.waypointsForPath(path, 'auto').length, 3);
});

test('el decodificador de Valhalla usa precisión de seis decimales', () => {
  const encode = points => {
    let previousLat = 0;
    let previousLon = 0;
    const encodeValue = value => {
      let current = value < 0 ? ~(value << 1) : value << 1;
      let output = '';
      while (current >= 0x20) {
        output += String.fromCharCode((0x20 | (current & 0x1f)) + 63);
        current >>= 5;
      }
      return output + String.fromCharCode(current + 63);
    };
    return points.map(([lat, lon]) => {
      const nextLat = Math.round(lat * 1e6);
      const nextLon = Math.round(lon * 1e6);
      const encoded = encodeValue(nextLat - previousLat) + encodeValue(nextLon - previousLon);
      previousLat = nextLat;
      previousLon = nextLon;
      return encoded;
    }).join('');
  };
  const source = [[40.091234, -1.551234], [40.101111, -1.601111]];
  assert.deepEqual(decodePolyline6(encode(source)), source.map(([latitude, longitude]) => ({ latitude, longitude })));
});

test('el recorrido ajustado pasa por cada foto o punto GPS marcado como exacto', () => {
  const legs = [
    { shape: '_c`|@~zvpQ_ibE_ibE' },
    { shape: '_gayB~b`qQ_ibE_ibE' }
  ];
  const locations = [
    { lat: 40, lon: -3, exact: false },
    { lat: 40.005, lon: -3.02, exact: true },
    { lat: 40.02, lon: -3.03, exact: false }
  ];
  const points = routePointsWithExactAnchors(legs, locations);
  assert.ok(points.some(point => point.latitude === 40.005 && point.longitude === -3.02));
});

test('la interfaz permite conservar original, ajustar un día o todo el viaje y elegir coche o a pie', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.bundle.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /Cronología original/);
  assert.match(html, /Recorrido ajustado/);
  assert.match(html, /<option value="driving">Coche<\/option>/);
  assert.match(html, /<option value="walking">A pie<\/option>/);
  assert.match(html, /id="timeline-route-adjust-all">Ajustar todo el viaje<\/button>/);
  assert.match(html, /id="timeline-route-cancel" hidden>Cancelar proceso<\/button>/);
  assert.match(app, /adjustedTimelineRoutes/);
  assert.match(app, /async function adjustEntireTimelineTrip\(\)/);
  assert.match(app, /records\.filter\(record => !timelineAdjustedRouteCache\(record, mode\)\)/);
  assert.match(app, /Proceso cancelado\.[^`]+Puedes continuar cuando quieras\./);
  assert.match(app, /\.netlify\/functions\/route-adjust/);
  assert.match(app, />Cronología Maps<\/button>/);
  assert.match(app, /const adjustedTimelineRequested = tripMapState\.timelineRouteView === 'adjusted'/);
  assert.match(app, /timelineMapPaths\(importedTimelineRecords, \{[\s\S]*?adjusted: adjustedTimelineRequested/);
  assert.match(app, /restoreTimelineRoutingPreference\(state\.selectedViajeIds\)/);
  assert.match(app, /timelineRouteView, timelineRoutingMode/);
});
