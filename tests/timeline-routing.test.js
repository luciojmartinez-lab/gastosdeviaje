import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
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

test('la ida y la vuelta cercanas reutilizan el mismo trazado en sentido inverso', () => {
  const outbound = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.04, longitude: -1.05 },
    { latitude: 40.08, longitude: -1.1 }
  ];
  const inbound = [
    { latitude: 40.0802, longitude: -1.1001 },
    { latitude: 40.041, longitude: -1.052 },
    { latitude: 40.0002, longitude: -1.0001 }
  ];
  const adjusted = routing.unifyLikelyRoundTrips([outbound, inbound], [
    { adjusted: true, costing: 'auto', points: outbound },
    { adjusted: true, costing: 'auto', points: [inbound[0], { latitude: 40.05, longitude: -1.06 }, inbound[2]] }
  ]);
  assert.equal(adjusted[0].sharedRoundTrip, true);
  assert.equal(adjusted[1].sharedRoundTrip, true);
  assert.deepEqual(adjusted[1].points, adjusted[0].points.slice().reverse());
});

test('la ida y la vuelta se unifican aunque los puntos originales de Maps sean escasos e imprecisos', () => {
  const outbound = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.08, longitude: -1.1 }
  ];
  const inbound = [
    { latitude: 40.081, longitude: -1.101 },
    { latitude: 40.055, longitude: -1.035 },
    { latitude: 40.001, longitude: -1.001 }
  ];
  const outboundRoad = [
    outbound[0],
    { latitude: 40.035, longitude: -1.035 },
    outbound[1]
  ];
  const inboundRoad = [
    inbound[0],
    { latitude: 40.038, longitude: -1.04 },
    inbound[inbound.length - 1]
  ];
  const adjusted = routing.unifyLikelyRoundTrips([outbound, inbound], [
    { adjusted: true, costing: 'auto', points: outboundRoad },
    { adjusted: true, costing: 'pedestrian', points: inboundRoad }
  ]);
  assert.equal(adjusted[0].sharedRoundTrip, true);
  assert.deepEqual(adjusted[1].points, adjusted[0].points.slice().reverse());
});

test('dos tramos duplicados con los mismos extremos y sentido comparten también el trazado', () => {
  const first = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.04, longitude: -1.05 },
    { latitude: 40.08, longitude: -1.1 }
  ];
  const duplicate = [
    { latitude: 40.0003, longitude: -1.0002 },
    { latitude: 40.042, longitude: -1.048 },
    { latitude: 40.0802, longitude: -1.1003 }
  ];
  const adjusted = routing.unifyLikelyRoundTrips([first, duplicate], [
    { adjusted: true, costing: 'auto', points: first },
    { adjusted: true, costing: 'auto', points: duplicate }
  ]);
  assert.equal(adjusted[0].sharedRoundTrip, true);
  assert.deepEqual(adjusted[1].points, adjusted[0].points);
});

test('una ida y vuelta incluida en un único tramo reutiliza la misma carretera', () => {
  const source = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.035, longitude: -1.035 },
    { latitude: 40.08, longitude: -1.1 },
    { latitude: 40.038, longitude: -1.04 },
    { latitude: 40.0002, longitude: -1.0001 }
  ];
  const adjustedPath = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.02, longitude: -1.02 },
    { latitude: 40.04, longitude: -1.04 },
    { latitude: 40.08, longitude: -1.1 },
    { latitude: 40.042, longitude: -1.045 },
    { latitude: 40.021, longitude: -1.025 },
    { latitude: 40.0002, longitude: -1.0001 }
  ];
  const [result] = routing.unifyLikelyRoundTrips([source], [
    { adjusted: true, costing: 'auto', points: adjustedPath }
  ]);
  assert.equal(result.internalRoundTrip, true);
  const turnaroundIndex = (result.points.length - 1) / 2;
  assert.deepEqual(
    result.points.slice(turnaroundIndex),
    result.points.slice(0, turnaroundIndex + 1).reverse()
  );
});

test('un tramo independiente y la mitad de otro circular comparten la misma carretera', () => {
  const oneWay = [
    { latitude: 40.089, longitude: -1.554 },
    { latitude: 40.044, longitude: -1.65 },
    { latitude: 40.04, longitude: -1.649 }
  ];
  const circular = [
    { latitude: 40.088, longitude: -1.555 },
    { latitude: 40.042, longitude: -1.647 },
    { latitude: 40.04, longitude: -1.649 },
    { latitude: 40.043, longitude: -1.648 },
    { latitude: 40.089, longitude: -1.556 }
  ];
  const oneWayAdjusted = [
    oneWay[0],
    { latitude: 40.065, longitude: -1.60 },
    oneWay[oneWay.length - 1]
  ];
  const circularAdjusted = [
    circular[0],
    { latitude: 40.063, longitude: -1.603 },
    circular[2],
    { latitude: 40.064, longitude: -1.602 },
    circular[circular.length - 1]
  ];
  const result = routing.unifyLikelyRoundTrips([oneWay, circular], [
    { adjusted: true, costing: 'pedestrian', points: oneWayAdjusted },
    { adjusted: true, costing: 'pedestrian', points: circularAdjusted }
  ]);
  assert.equal(result[1].internalRoundTrip, true);
  const circularHalf = result[1].points.slice(0, Math.floor(result[1].points.length / 2) + 1);
  assert.deepEqual(circularHalf, result[0].points);
  assert.deepEqual(
    result[1].points.slice(Math.floor(result[1].points.length / 2)),
    circularHalf.slice().reverse()
  );
});

test('dos falsos tramos circulares y una vuelta normal comparten un único trazado', () => {
  const salinas = { latitude: 40.0887, longitude: -1.5537 };
  const canete = { latitude: 40.0423, longitude: -1.6470 };
  const outboundCircular = [
    salinas,
    { latitude: 40.066, longitude: -1.60 },
    canete,
    { latitude: 40.08873, longitude: -1.55369 }
  ];
  const inboundCircular = [
    canete,
    { latitude: 40.08873, longitude: -1.55369 },
    { latitude: 40.0437, longitude: -1.6505 }
  ];
  const inbound = [
    { latitude: 40.0417, longitude: -1.6477 },
    { latitude: 40.063, longitude: -1.604 },
    { latitude: 40.08872, longitude: -1.55366 }
  ];
  const preferredRoad = [
    salinas,
    { latitude: 40.072, longitude: -1.59 },
    { latitude: 40.058, longitude: -1.62 },
    canete
  ];
  const alternateRoad = [
    canete,
    { latitude: 40.060, longitude: -1.61 },
    salinas
  ];
  const result = routing.unifyLikelyRoundTrips(
    [outboundCircular, inboundCircular, inbound],
    [
      { adjusted: true, costing: 'auto', points: [...preferredRoad, ...preferredRoad.slice(0, -1).reverse()] },
      { adjusted: true, costing: 'pedestrian', points: [...alternateRoad, ...alternateRoad.slice(0, -1).reverse()] },
      { adjusted: true, costing: 'auto', points: alternateRoad }
    ]
  );
  const firstHalf = result[0].points.slice(0, Math.floor(result[0].points.length / 2) + 1);
  const secondHalf = result[1].points.slice(0, Math.floor(result[1].points.length / 2) + 1);
  assert.deepEqual(secondHalf, firstHalf.slice().reverse());
  assert.deepEqual(result[2].points, firstHalf.slice().reverse());
});

test('un único tramo circular por carreteras realmente distintas no se pliega', () => {
  const source = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.03, longitude: -1.08 },
    { latitude: 40.08, longitude: -1.1 },
    { latitude: 40.09, longitude: -0.99 },
    { latitude: 40.0001, longitude: -1.0001 }
  ];
  const [result] = routing.unifyLikelyRoundTrips([source], [
    { adjusted: true, costing: 'auto', points: source }
  ]);
  assert.equal(result.internalRoundTrip, undefined);
  assert.deepEqual(result.points, source);
});

test('una ruta circular realmente separada mantiene distintos los trayectos', () => {
  const outbound = [
    { latitude: 40, longitude: -1 },
    { latitude: 40.04, longitude: -1.05 },
    { latitude: 40.08, longitude: -1.1 }
  ];
  const inbound = [
    { latitude: 40.08, longitude: -1.1 },
    { latitude: 40.12, longitude: -1.02 },
    { latitude: 40, longitude: -1 }
  ];
  const adjusted = routing.unifyLikelyRoundTrips([outbound, inbound], [
    { adjusted: true, costing: 'auto', points: outbound },
    { adjusted: true, costing: 'auto', points: inbound }
  ]);
  assert.equal(adjusted[0].sharedRoundTrip, undefined);
  assert.equal(adjusted[1].sharedRoundTrip, undefined);
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
  assert.match(app, /routingMode === 'automatic'[\s\S]*?primaryCosting === 'auto' \? 'pedestrian' : 'auto'/);
  assert.match(app, />Cronología Maps<\/button>/);
  assert.match(app, /const adjustedTimelineRequested = tripMapState\.timelineRouteView === 'adjusted'/);
  assert.match(app, /timelineMapPaths\(importedTimelineRecords, \{[\s\S]*?adjusted: adjustedTimelineRequested/);
  assert.match(app, /restoreTimelineRoutingPreference\(state\.selectedViajeIds\)/);
  assert.match(app, /timelineRouteView, timelineRoutingMode/);
  assert.match(app, /unifyLikelyRoundTrips\(sourcePaths, adjustedPaths\)/);
});

test('el modo automático prueba el modo alternativo si Valhalla no encuentra ruta', async () => {
  const app = await readFile(new URL('../app.bundle.js', import.meta.url), 'utf8');
  const start = app.indexOf('function timelineRoutingErrorMessage');
  const end = app.indexOf('async function adjustSelectedTimelineDay', start);
  const costings = [];
  const context = {
    AbortController: class {
      constructor() { this.signal = {}; }
      abort() {}
    },
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      costings.push(request.costing);
      if (costings.length === 1) {
        return { ok: false, status: 422, json: async () => ({ error: 'route_unavailable' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          points: [{ latitude: 40, longitude: -3 }, { latitude: 40.1, longitude: -3.1 }],
          distanceKm: 12,
          durationSeconds: 900
        })
      };
    },
    window: {
      TimelineRouting: {
        normalizeMode: () => 'automatic',
        costingForPath: () => 'pedestrian',
        waypointsForPath: () => [{ latitude: 40, longitude: -3 }, { latitude: 40.1, longitude: -3.1 }]
      },
      setTimeout: () => 1,
      clearTimeout: () => {}
    }
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.requestAdjustedTimelinePath = requestAdjustedTimelinePath;`, context);
  const result = await context.requestAdjustedTimelinePath([], 'automatic');
  assert.deepEqual(costings, ['pedestrian', 'auto']);
  assert.equal(result.costing, 'auto');
});
