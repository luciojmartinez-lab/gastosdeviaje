import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

await import('../timeline-import.js');

const { coordinateFrom, importTrip } = globalThis.GoogleTimelineImport;
const [html, app, styles, worker] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../timeline-import-worker.js', import.meta.url), 'utf8')
]);

test('el lector acepta las coordenadas con grados que exporta Google Maps', () => {
  assert.deepEqual(coordinateFrom('40.123456°,-3.765432°'), {
    latitude: 40.123456,
    longitude: -3.765432
  });
  assert.deepEqual(coordinateFrom({ latLng: 'geo:39.5, -2.5' }), {
    latitude: 39.5,
    longitude: -2.5
  });
});

test('la importación conserva solo los días del viaje y detecta salida y llegada', () => {
  const data = {
    semanticSegments: [
      {
        startTime: '2026-08-07T10:00:00.000+02:00',
        endTime: '2026-08-07T11:00:00.000+02:00',
        timelinePath: [{ point: '40.000000°, -3.000000°', time: '2026-08-07T10:30:00.000+02:00' }]
      },
      {
        startTime: '2026-08-08T08:00:00.000+02:00',
        endTime: '2026-08-08T09:00:00.000+02:00',
        activity: {
          start: { latLng: '40.100000°, -3.100000°' },
          end: { latLng: '40.200000°, -3.200000°' },
          distanceMeters: 15000,
          topCandidate: { type: 'IN_PASSENGER_VEHICLE', probability: 0.9 }
        }
      },
      {
        startTime: '2026-08-08T09:00:00.000+02:00',
        endTime: '2026-08-08T09:30:00.000+02:00',
        timelinePath: [
          { point: '40.200000°, -3.200000°', time: '2026-08-08T09:00:00.000+02:00' },
          { point: '40.250000°, -3.250000°', time: '2026-08-08T09:30:00.000+02:00' }
        ]
      },
      {
        startTime: '2026-08-08T09:30:00.000+02:00',
        endTime: '2026-08-08T10:00:00.000+02:00',
        visit: {
          topCandidate: {
            placeName: 'Restaurante de prueba',
            semanticType: 'RESTAURANT',
            probability: 0.8,
            placeLocation: { latLng: '40.250000°, -3.250000°' }
          }
        }
      }
    ],
    rawSignals: [{ wifiScan: { timestamp: '2026-08-08T09:00:00.000+02:00' } }]
  };
  const result = importTrip(data, { startDate: '2026-08-08', endDate: '2026-08-30' });
  assert.equal(result.summary.dayCount, 1);
  assert.equal(result.summary.activityCount, 1);
  assert.equal(result.summary.visitCount, 1);
  assert.equal(result.days[0].visits[0].placeName, 'Restaurante de prueba');
  assert.equal(result.days[0].fecha, '2026-08-08');
  assert.equal(result.days[0].departure.latitude, 40.1);
  assert.equal(result.days[0].arrival.latitude, 40.2);
  assert.ok(result.days[0].points.length >= 3);
});

test('una pernocta estable entre las 03:00 y las 06:00 une la llegada y la salida', () => {
  const data = {
    semanticSegments: [
      {
        startTime: '2026-08-09T20:00:00.000+02:00',
        endTime: '2026-08-09T21:00:00.000+02:00',
        activity: {
          start: { latLng: '40.000000°, -3.000000°' },
          end: { latLng: '40.100000°, -3.100000°' },
          topCandidate: { type: 'IN_PASSENGER_VEHICLE' }
        }
      },
      {
        startTime: '2026-08-09T21:00:00.000+02:00',
        endTime: '2026-08-10T07:00:00.000+02:00',
        visit: { topCandidate: { placeLocation: { latLng: '40.100000°, -3.100000°' } } }
      },
      {
        startTime: '2026-08-10T08:00:00.000+02:00',
        endTime: '2026-08-10T09:00:00.000+02:00',
        activity: {
          start: { latLng: '40.100000°, -3.100000°' },
          end: { latLng: '40.200000°, -3.200000°' },
          topCandidate: { type: 'WALKING' }
        }
      }
    ]
  };
  const result = importTrip(data, { startDate: '2026-08-09', endDate: '2026-08-10' });
  const previous = result.days.find(day => day.fecha === '2026-08-09');
  const current = result.days.find(day => day.fecha === '2026-08-10');
  assert.equal(previous.arrivalMode, 'stable');
  assert.equal(current.departureMode, 'stable');
  assert.deepEqual(
    [previous.arrival.latitude, previous.arrival.longitude],
    [current.departure.latitude, current.departure.longitude]
  );
  assert.deepEqual([current.departure.latitude, current.departure.longitude], [40.1, -3.1]);
});

test('una noche en movimiento usa el punto más próximo al cambio de día', () => {
  const data = {
    semanticSegments: [
      {
        startTime: '2026-08-09T20:00:00.000+02:00',
        endTime: '2026-08-10T06:00:00.000+02:00',
        timelinePath: [
          { point: '40.000000°, -3.000000°', time: '2026-08-09T20:00:00.000+02:00' },
          { point: '40.100000°, -3.100000°', time: '2026-08-10T00:02:00.000+02:00' },
          { point: '40.300000°, -3.300000°', time: '2026-08-10T03:00:00.000+02:00' },
          { point: '40.600000°, -3.600000°', time: '2026-08-10T06:00:00.000+02:00' }
        ]
      }
    ]
  };
  const result = importTrip(data, { startDate: '2026-08-09', endDate: '2026-08-10' });
  const previous = result.days.find(day => day.fecha === '2026-08-09');
  const current = result.days.find(day => day.fecha === '2026-08-10');
  assert.equal(previous.arrivalMode, 'transit');
  assert.equal(current.departureMode, 'transit');
  assert.deepEqual([previous.arrival.latitude, previous.arrival.longitude], [40.1, -3.1]);
  assert.deepEqual([current.departure.latitude, current.departure.longitude], [40.1, -3.1]);
});

test('la primera lectura precisa anterior al movimiento fija el alojamiento para llegada y salida', () => {
  const data = {
    semanticSegments: [
      {
        startTime: '2026-08-09T20:00:00.000+02:00',
        endTime: '2026-08-09T21:00:00.000+02:00',
        activity: {
          start: { latLng: '40.000000°, -3.000000°' },
          end: { latLng: '40.100000°, -3.100000°' },
          topCandidate: { type: 'IN_PASSENGER_VEHICLE' }
        }
      },
      {
        startTime: '2026-08-10T08:00:00.000+02:00',
        endTime: '2026-08-10T09:00:00.000+02:00',
        activity: {
          start: { latLng: '40.100000°, -3.100000°' },
          end: { latLng: '40.200000°, -3.200000°' },
          topCandidate: { type: 'IN_PASSENGER_VEHICLE' }
        }
      }
    ],
    rawSignals: [
      { position: { timestamp: '2026-08-10T03:10:00.000+02:00', LatLng: '40.099000°, -3.099000°', accuracyMeters: 200, source: 'CELL' } },
      { position: { timestamp: '2026-08-10T05:50:00.000+02:00', LatLng: '40.099000°, -3.099000°', accuracyMeters: 200, source: 'CELL' } },
      { position: { timestamp: '2026-08-10T06:30:00.000+02:00', LatLng: '40.100000°, -3.100000°', accuracyMeters: 80, source: 'GPS' } },
      { position: { timestamp: '2026-08-10T07:46:00.000+02:00', LatLng: '40.111111°, -3.111111°', accuracyMeters: 4, source: 'GPS' } },
      { activityRecord: { timestamp: '2026-08-10T07:46:10.000+02:00', probableActivities: [{ type: 'STILL', confidence: 1 }] } },
      { position: { timestamp: '2026-08-10T08:10:00.000+02:00', LatLng: '40.222222°, -3.222222°', accuracyMeters: 3, source: 'GPS' } },
      { activityRecord: { timestamp: '2026-08-10T08:10:00.000+02:00', probableActivities: [{ type: 'STILL', confidence: 1 }] } }
    ]
  };
  const result = importTrip(data, { startDate: '2026-08-09', endDate: '2026-08-10' });
  const previous = result.days.find(day => day.fecha === '2026-08-09');
  const current = result.days.find(day => day.fecha === '2026-08-10');
  assert.equal(previous.arrivalMode, 'precise');
  assert.equal(current.departureMode, 'precise');
  assert.deepEqual([previous.arrival.latitude, previous.arrival.longitude], [40.111111, -3.111111]);
  assert.deepEqual([current.departure.latitude, current.departure.longitude], [40.111111, -3.111111]);
});

test('una consulta nocturna precisa y en reposo puede identificar el alojamiento', () => {
  const data = {
    semanticSegments: [
      {
        startTime: '2026-08-09T20:00:00.000+02:00',
        endTime: '2026-08-09T21:00:00.000+02:00',
        activity: {
          start: { latLng: '40.000000°, -3.000000°' },
          end: { latLng: '40.100000°, -3.100000°' },
          topCandidate: { type: 'IN_PASSENGER_VEHICLE' }
        }
      },
      {
        startTime: '2026-08-10T09:00:00.000+02:00',
        endTime: '2026-08-10T10:00:00.000+02:00',
        activity: {
          start: { latLng: '40.100000°, -3.100000°' },
          end: { latLng: '40.200000°, -3.200000°' },
          topCandidate: { type: 'WALKING' }
        }
      }
    ],
    rawSignals: [
      { position: { timestamp: '2026-08-10T00:35:00.000+02:00', LatLng: '40.123456°, -3.123456°', accuracyMeters: 6, source: 'GPS' } },
      { activityRecord: { timestamp: '2026-08-10T00:35:12.000+02:00', probableActivities: [{ type: 'STILL', confidence: 0.99 }] } },
      { position: { timestamp: '2026-08-10T04:00:00.000+02:00', LatLng: '40.200000°, -3.200000°', accuracyMeters: 2, source: 'GPS' } },
      { activityRecord: { timestamp: '2026-08-10T04:00:00.000+02:00', probableActivities: [{ type: 'STILL', confidence: 1 }] } },
      { position: { timestamp: '2026-08-10T06:30:00.000+02:00', LatLng: '40.123500°, -3.123500°', accuracyMeters: 8, source: 'GPS' } },
      { activityRecord: { timestamp: '2026-08-10T06:30:00.000+02:00', probableActivities: [{ type: 'STILL', confidence: 1 }] } }
    ]
  };
  const result = importTrip(data, { startDate: '2026-08-09', endDate: '2026-08-10' });
  const previous = result.days.find(day => day.fecha === '2026-08-09');
  const current = result.days.find(day => day.fecha === '2026-08-10');
  assert.equal(current.departureMode, 'precise');
  assert.deepEqual([current.departure.latitude, current.departure.longitude], [40.123456, -3.123456]);
  assert.deepEqual([previous.arrival.latitude, previous.arrival.longitude], [40.123456, -3.123456]);
});

test('una lectura precisa posterior al primer movimiento no se convierte en alojamiento', () => {
  const data = {
    semanticSegments: [{
      startTime: '2026-08-10T08:00:00.000+02:00',
      endTime: '2026-08-10T09:00:00.000+02:00',
      activity: {
        start: { latLng: '40.100000°, -3.100000°' },
        end: { latLng: '40.200000°, -3.200000°' },
        topCandidate: { type: 'IN_PASSENGER_VEHICLE' }
      }
    }],
    rawSignals: [
      { position: { timestamp: '2026-08-10T03:10:00.000+02:00', LatLng: '40.099000°, -3.099000°', accuracyMeters: 200, source: 'CELL' } },
      { position: { timestamp: '2026-08-10T05:50:00.000+02:00', LatLng: '40.099000°, -3.099000°', accuracyMeters: 200, source: 'CELL' } },
      { position: { timestamp: '2026-08-10T08:10:00.000+02:00', LatLng: '40.222222°, -3.222222°', accuracyMeters: 3, source: 'GPS' } },
      { activityRecord: { timestamp: '2026-08-10T08:10:00.000+02:00', probableActivities: [{ type: 'STILL', confidence: 1 }] } }
    ]
  };
  const result = importTrip(data, { startDate: '2026-08-10', endDate: '2026-08-10' });
  assert.notEqual(result.days[0].departureMode, 'precise');
});

test('Cronología avisa de la exportación previa y se procesa fuera de la interfaz', () => {
  assert.match(html, /id="timeline-dialog"/);
  assert.match(html, /Debes exportar previamente la Cronología de Maps/);
  assert.match(html, /selecciona <em>Cronología\.json<\/em> desde el lugar donde lo hayas descargado/);
  assert.match(html, /id="timeline-file-input"[^>]*accept="\.json,application\/json"/);
  assert.match(app, /data-map-timeline="1"/);
  assert.match(app, /new Worker\('\.\/timeline-import-worker\.js\?v=700v292'\)/);
  assert.match(worker, /GoogleTimelineImport\.importTrip/);
  assert.match(app, /adjustedTimelineRoutes: previous && previous\.adjustedTimelineRoutes \|\| \{\}/);
  assert.match(app, /const autoAdjust = tripMapState\.timelineRouteView === 'adjusted'/);
  assert.match(app, /filter\(record => !timelineRecordIsStationaryNoise\(record, exactRecords\)\)/);
  assert.match(app, /forEach\(record => adjustmentDates\.add\(record\.fecha\)\)/);
  assert.match(app, /progressPrefix: `Actualizando \$\{blogDayDateLabel\(record\.fecha\)\}`/);
  assert.match(app, /Ajuste automático:/);
});

test('la reimportación detecta solo los días cuyo recorrido realmente cambió', () => {
  const start = app.indexOf('function timelineRoutingRecordSignature');
  const end = app.indexOf('function selectedTimelineDayRecord', start);
  const context = {};
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineRoutingRecordSignature = timelineRoutingRecordSignature;`, context);
  const base = {
    fecha: '2026-08-15',
    importedAt: 'primera importación',
    points: [{ latitude: 40, longitude: -3, time: '2026-08-15T10:00:00+02:00' }],
    activities: []
  };
  assert.equal(
    context.timelineRoutingRecordSignature(base),
    context.timelineRoutingRecordSignature({ ...base, importedAt: 'segunda importación', sourceName: 'Cronología (1).json' })
  );
  assert.notEqual(
    context.timelineRoutingRecordSignature(base),
    context.timelineRoutingRecordSignature({ ...base, points: [{ ...base.points[0], latitude: 40.01 }] })
  );
});

test('la reimportación conserva los ajustes existentes y calcula solo los días pendientes', () => {
  const start = app.indexOf('function timelineImportAdjustmentPlan');
  const end = app.indexOf('function selectedTimelineDayRecord', start);
  const context = {};
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineImportAdjustmentPlan = timelineImportAdjustmentPlan;`, context);
  const records = [
    { fecha: '2026-08-09', adjusted: true },
    { fecha: '2026-08-10', adjusted: false },
    { fecha: '2026-08-11', adjusted: true }
  ];
  const result = context.timelineImportAdjustmentPlan(
    records,
    new Set(['2026-08-09', '2026-08-10']),
    record => record.adjusted
  );
  assert.deepEqual(result.pending.map(record => record.fecha), ['2026-08-10']);
  assert.deepEqual(result.preserved.map(record => record.fecha), ['2026-08-09']);
});

test('el recorrido importado se guarda por viaje, se sincroniza y tiene capa propia', () => {
  assert.match(app, /createObjectStore\('timelineDays', \{ keyPath: 'id' \}\)/);
  assert.match(app, /timelineDays: state\.timelineDays/);
  assert.match(app, /timelineDays = state\.timelineDays\.filter/);
  assert.match(app, /source: 'google-maps-timeline'/);
  assert.match(app, /class="map-timeline-route"/);
  assert.match(app, /google-timeline-route-line/);
  assert.match(app, /descripcion: lodging\.name/);
  assert.match(app, /\? 'A'/);
  assert.doesNotMatch(app, /descripcion: `(?:Llegada a|Salida desde)/);
  assert.doesNotMatch(app, /Salida desde la pernocta|Llegada según Cronología/);
  assert.match(styles, /\.map-timeline-route/);
  assert.match(styles, /\.trip-vector-marker\.timeline/);
});

test('el alojamiento toma nombres cercanos y permite corregirlos para una noche o una ubicación', () => {
  assert.match(html, /id="lodging-name-dialog"/);
  assert.match(html, /id="lodging-name-remember"/);
  assert.match(app, /function nearestAccommodationExpense/);
  assert.match(app, /isAccommodationExpense\(gasto\)/);
  assert.match(app, /LODGING_NAME_MAX_DISTANCE_METERS = 200/);
  assert.match(app, /function timelineLodgingNameInfo/);
  assert.match(app, /Nombre recordado para esta ubicación/);
  assert.match(app, /Gasto de Alojamiento geolocalizado cercano/);
  assert.match(app, /Gasto de Alojamiento sin GPS situado mediante la ubicación nocturna/);
  assert.match(app, /const blogPoint = nearestLodgingBlogPoint[\s\S]*?const timelineVisit = nearestTimelineVisitName/);
  assert.match(app, /LODGING_FUZZY_NAME_MAX_DISTANCE_METERS = 1_500/);
  assert.match(app, /data-edit-timeline-lodging/);
  assert.match(app, /lodgingNames: \{ \.\.\.\(target\.record\.lodgingNames \|\| \{\}\), \[target\.role\]: name \}/);
  assert.match(app, /lodgingLocations\.push\(\{ name, \.\.\.point/);
  assert.match(app, /lodgingNamesByDate/);
  assert.match(styles, /\.lodging-name-modal/);
});

test('la Cronología se integra en los mapas copiados al Blog sin alterar el mapa por ciudad', () => {
  assert.match(app, /if \(!cityMode\) \{[\s\S]*?importedTimelineRecords = timelineRecordsForMap/);
  assert.match(app, /createDailyMapBlogImage\(scope\.dailyRecords, day, scope\.timelinePaths\)/);
  assert.match(app, /timelinePaths\.flatMap\(path => path\.map/);
  assert.match(app, /timelinePaths\.forEach\(path => \{[\s\S]*?strokeStyle = '#0f766e'/);
  assert.match(app, /timelineMapPathsWithDailyRecords\([\s\S]*?dailyMode \? selectedExactDailyRecords : exactDailyRecords/);
  assert.match(app, /TIMELINE_SUPPLEMENT_MAX_DISTANCE_METERS = 25/);
  assert.match(app, /dailyRecords\.length > 0 \|\| timelinePaths\.length > 0/);
  assert.match(app, /activities\.forEach\(\(activity, activityIndex\) => \{/);
});

test('Cronología enlaza una foto GPS que Google dejó fuera del recorrido', () => {
  const start = app.indexOf('function timelineMapPathsWithDailyRecords');
  const end = app.indexOf('function plannedDailyMapRecordsForScope', start);
  const context = {
    TIMELINE_SUPPLEMENT_MAX_DISTANCE_METERS: 25,
    TIMELINE_SUPPLEMENT_GROUP_DISTANCE_METERS: 50,
    lodgingDistanceMeters: (first, second) => Math.hypot(
      Number(first.latitude) - Number(second.latitude),
      Number(first.longitude) - Number(second.longitude)
    ) * 111_000
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineMapPathsWithDailyRecords = timelineMapPathsWithDailyRecords;`, context);
  const paths = [[
    { latitude: 40, longitude: -3, time: '2026-08-12T18:00:00+02:00' },
    { latitude: 40, longitude: -3, time: '2026-08-12T21:00:00+02:00' }
  ]];
  const result = context.timelineMapPathsWithDailyRecords(paths, [
    { kind: 'photo', fecha: '2026-08-12', hora: '18:30', latitude: 40.0001, longitude: -3 },
    { kind: 'photo', fecha: '2026-08-12', hora: '19:38', latitude: 40.01, longitude: -3 }
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[1].length, 3);
  assert.equal(result[1][1].latitude, 40.01);
});

test('un ajuste guardado incorpora después los nuevos puntos GPS exactos', () => {
  const start = app.indexOf('function timelineMapPathsWithDailyRecords');
  const end = app.indexOf('function plannedDailyMapRecordsForScope', start);
  const context = {
    TIMELINE_SUPPLEMENT_MAX_DISTANCE_METERS: 25,
    TIMELINE_SUPPLEMENT_GROUP_DISTANCE_METERS: 50,
    lodgingDistanceMeters: (first, second) => Math.hypot(
      Number(first.latitude) - Number(second.latitude),
      Number(first.longitude) - Number(second.longitude)
    ) * 111_000
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineAdjustedMapPathsWithDailyRecords = timelineAdjustedMapPathsWithDailyRecords;`, context);
  const adjusted = [[
    { latitude: 40, longitude: -3 },
    { latitude: 40.01, longitude: -3 }
  ]];
  const original = [[
    { latitude: 40, longitude: -3, time: '2026-08-15T10:00:00+02:00' },
    { latitude: 40.01, longitude: -3, time: '2026-08-15T11:00:00+02:00' }
  ]];
  const result = context.timelineAdjustedMapPathsWithDailyRecords(adjusted, original, [
    { kind: 'photo', fecha: '2026-08-15', hora: '10:30', latitude: 40.005, longitude: -3.004 }
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[1][1].longitude, -3.004);
  assert.equal(result[1].exactConnector, true);
});

test('Cronología dibuja los puntos horarios aunque Google no reconozca una actividad', () => {
  const start = app.indexOf('function timelineRecordPointCandidates(record)');
  const end = app.indexOf('function timelineMapPathsWithDailyRecords', start);
  const context = {
    TIMELINE_STATIONARY_MAX_SPREAD_METERS: 300,
    TIMELINE_STATIONARY_EXACT_EVIDENCE_METERS: 50,
    timelineAdjustedRouteCache: () => null,
    lodgingDistanceMeters: (first, second) => Math.hypot(
      Number(first.latitude) - Number(second.latitude),
      Number(first.longitude) - Number(second.longitude)
    ) * 111_000
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineMapPaths = timelineMapPaths;`, context);
  const paths = context.timelineMapPaths([{
    fecha: '2026-08-15',
    activities: [],
    points: [
      { latitude: 40, longitude: -3, time: '2026-08-15T10:00:00+02:00', kind: 'path' },
      { latitude: 40.003, longitude: -3.002, time: '2026-08-15T12:00:00+02:00', kind: 'path' },
      { latitude: 40.006, longitude: -3.004, time: '2026-08-15T18:00:00+02:00', kind: 'path' }
    ]
  }]);

  assert.equal(paths.length, 1);
  assert.equal(paths[0].length, 3);
  assert.equal(paths[0][1].time, '2026-08-15T12:00:00+02:00');
});

test('Cronología no inventa recorridos cuando Maps no detecta actividad y solo hay deriva GPS', () => {
  const start = app.indexOf('function timelineRecordPointCandidates(record)');
  const end = app.indexOf('function timelineMapPathsWithDailyRecords', start);
  const context = {
    TIMELINE_STATIONARY_MAX_SPREAD_METERS: 300,
    TIMELINE_STATIONARY_EXACT_EVIDENCE_METERS: 50,
    timelineAdjustedRouteCache: record => record.adjustedTimelineRoutes && record.adjustedTimelineRoutes.automatic,
    lodgingDistanceMeters: (first, second) => Math.hypot(
      Number(first.latitude) - Number(second.latitude),
      Number(first.longitude) - Number(second.longitude)
    ) * 111_000
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.timelineMapPaths = timelineMapPaths; this.timelineRecordIsStationaryNoise = timelineRecordIsStationaryNoise;`, context);
  const stationary = {
    viajeId: 1,
    fecha: '2026-08-24',
    activities: [],
    departureMode: 'precise',
    arrivalMode: 'precise',
    departure: { latitude: 40, longitude: -3, time: '2026-08-24T07:00:00+02:00' },
    arrival: { latitude: 40, longitude: -3, time: '2026-08-24T23:00:00+02:00' },
    points: [
      { latitude: 40, longitude: -3, time: '2026-08-24T08:00:00+02:00', kind: 'path' },
      { latitude: 40.001, longitude: -3.001, time: '2026-08-24T13:00:00+02:00', kind: 'path' },
      { latitude: 40.0018, longitude: -3, time: '2026-08-24T19:00:00+02:00', kind: 'path' }
    ],
    adjustedTimelineRoutes: {
      automatic: { paths: [{ adjusted: true, points: [
        { latitude: 40, longitude: -3 },
        { latitude: 40.01, longitude: -3.01 }
      ] }] }
    }
  };

  assert.equal(context.timelineRecordIsStationaryNoise(stationary), true);
  assert.equal(context.timelineMapPaths([stationary]).length, 0);
  assert.equal(context.timelineMapPaths([stationary], { adjusted: true, mode: 'automatic' }).length, 0);

  const exactPhotoAtHome = [{
    kind: 'photo', viajeId: 1, fecha: '2026-08-24', hora: '12:00', latitude: 40.0001, longitude: -3
  }];
  assert.equal(context.timelineRecordIsStationaryNoise(stationary, exactPhotoAtHome), true);

  const exactPhotosShowingMovement = [
    exactPhotoAtHome[0],
    { kind: 'photo', viajeId: 1, fecha: '2026-08-24', hora: '18:00', latitude: 40.0015, longitude: -3 }
  ];
  assert.equal(context.timelineRecordIsStationaryNoise(stationary, exactPhotosShowingMovement), false);
  assert.equal(context.timelineMapPaths([stationary], { exactRecords: exactPhotosShowingMovement }).length, 1);

  const realMovement = {
    ...stationary,
    points: [
      stationary.points[0],
      { latitude: 40.01, longitude: -3, time: '2026-08-24T13:00:00+02:00', kind: 'path' }
    ],
    adjustedTimelineRoutes: {}
  };
  assert.equal(context.timelineRecordIsStationaryNoise(realMovement), false);
  assert.equal(context.timelineMapPaths([realMovement]).length, 1);
});

test('mostrar Cronología cierra el cuadro y oculta solamente la línea calculada', () => {
  assert.match(app, /\$\('#timeline-toggle-layer'\)\.onclick = \(\) => \{[\s\S]*?renderTripMap\(\);[\s\S]*?closeTimelineDialog\(\);/);
  assert.match(app, /!timelinePaths\.length && \(dailyMode \? dailyRoute\.length > 1 : shouldDrawRoute\)/);
  assert.match(app, /if \(dailyRoute\.length > 1 && !timelinePaths\.length\)/);
  assert.match(app, /if \(projectedStops\.length > 1 && !timelinePaths\.length\)/);
  assert.doesNotMatch(app, /descripcion: `\$\{record\.descripcion\} · \$\{record\.count\}/);
});
