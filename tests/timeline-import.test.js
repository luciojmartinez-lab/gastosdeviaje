import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
  assert.equal(result.days[0].fecha, '2026-08-08');
  assert.equal(result.days[0].departure.latitude, 40.1);
  assert.equal(result.days[0].arrival.latitude, 40.2);
  assert.ok(result.days[0].points.length >= 3);
});

test('Cronología avisa de la exportación previa y se procesa fuera de la interfaz', () => {
  assert.match(html, /id="timeline-dialog"/);
  assert.match(html, /Debes exportar previamente la Cronología desde Google Maps/);
  assert.match(html, /selecciona <em>Cronología\.json<\/em> desde el lugar donde lo hayas descargado/);
  assert.match(html, /id="timeline-file-input"[^>]*accept="\.json,application\/json"/);
  assert.match(app, /data-map-timeline="1"/);
  assert.match(app, /new Worker\('\.\/timeline-import-worker\.js\?v=700v249'\)/);
  assert.match(worker, /GoogleTimelineImport\.importTrip/);
});

test('el recorrido importado se guarda por viaje, se sincroniza y tiene capa propia', () => {
  assert.match(app, /createObjectStore\('timelineDays', \{ keyPath: 'id' \}\)/);
  assert.match(app, /timelineDays: state\.timelineDays/);
  assert.match(app, /timelineDays = state\.timelineDays\.filter/);
  assert.match(app, /source: 'google-maps-timeline'/);
  assert.match(app, /class="map-timeline-route"/);
  assert.match(app, /google-timeline-route-line/);
  assert.match(app, /item\.timelineRole === 'arrival' \? 'L' : 'S'/);
  assert.match(styles, /\.map-timeline-route/);
  assert.match(styles, /\.trip-vector-marker\.timeline/);
});

test('la Cronología se integra en los mapas copiados al Blog sin alterar el mapa por ciudad', () => {
  assert.match(app, /if \(!cityMode\) \{[\s\S]*?importedTimelineRecords = timelineRecordsForMap/);
  assert.match(app, /createDailyMapBlogImage\(scope\.dailyRecords, day, scope\.timelinePaths\)/);
  assert.match(app, /timelinePaths\.flatMap\(path => path\.map/);
  assert.match(app, /timelinePaths\.forEach\(path => \{[\s\S]*?strokeStyle = '#0f766e'/);
  assert.match(app, /dailyRecords\.length > 0 \|\| timelinePaths\.length > 0/);
});
