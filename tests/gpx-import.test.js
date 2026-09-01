import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

await import('../gpx-import.js');

const { parse } = globalThis.GpxTrackImport;
const [html, app, sw] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8')
]);

const wikilocGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wikiloc">
  <trk><name><![CDATA[Salinas del Manzano]]></name><trkseg>
    <trkpt lat="40.100000" lon="-1.500000"><ele>1117.2</ele><time>2026-08-27T17:01:21Z</time></trkpt>
    <trkpt lat="40.100100" lon="-1.500100"><ele>1118.0</ele><time>2026-08-27T17:01:22Z</time></trkpt>
    <trkpt lat="40.200000" lon="-1.600000"><ele>1173.0</ele><time>2026-08-27T17:40:00Z</time></trkpt>
    <trkpt lat="40.200100" lon="-1.600100"><ele>1172.0</ele><time>2026-08-27T17:40:01Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

test('lee un GPX de Wikiloc, conserva hora y altitud y separa las pausas largas', () => {
  const result = parse(wikilocGpx, { selectedDate: '2026-08-27' });
  assert.equal(result.provider, 'Wikiloc');
  assert.equal(result.name, 'Salinas del Manzano');
  assert.equal(result.pointCount, 4);
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0][0].time, '2026-08-27T17:01:21.000Z');
  assert.equal(result.segments[0][0].elevation, 1117.2);
  assert.ok(result.observedDates.includes('2026-08-27'));
});

test('acepta GPX de Garmin y rutas rtept además de tracks trkpt', () => {
  const result = parse(`<gpx creator="Garmin Connect"><metadata><name>Paseo</name></metadata><rte>
    <rtept lon="-3.1" lat="40.1"><time>2026-08-28T08:00:00Z</time></rtept>
    <rtept lon="-3.2" lat="40.2"><time>2026-08-28T08:01:00Z</time></rtept>
  </rte></gpx>`);
  assert.equal(result.provider, 'Garmin');
  assert.equal(result.pointCount, 2);
  assert.equal(result.segments.length, 1);
});

test('rechaza archivos sin puntos GPX', () => {
  assert.throws(() => parse('<gpx creator="x"><metadata/></gpx>'), /no contiene puntos/i);
});

test('la interfaz importa, reemplaza y quita un GPX del día sin borrar Maps', () => {
  assert.match(html, /id="timeline-gpx-file-input"[^>]*accept="\.gpx/);
  assert.match(html, /id="timeline-select-gpx"[^>]*>Importar GPX del día</);
  assert.match(html, /id="timeline-delete-gpx"/);
  assert.match(html, /src="gpx-import\.js\?v=700v317"/);
  assert.match(app, /async function importTimelineGpxFile\(file\)/);
  assert.match(app, /gpxRoute: previous && previous\.gpxRoute \|\| null/);
  assert.match(app, /Datos de Maps eliminados\. Los recorridos GPX se conservan/);
  assert.match(app, /timelinePathsOutsideGpxIntervals/);
  assert.match(app, /path\.gpxRoute = true/);
  assert.match(app, /timelineRecordHasAdjustableMaps\(dayRecord, exactRecords\)/);
  assert.match(app, /gpxSignature: gpxPaths\.length \? timelineGpxRouteSignature/);
  assert.doesNotMatch(app, /routeAdjust\.disabled = [^;]*Boolean\(dayGpx\)/);
  assert.match(sw, /gpx-import\.js\?v=700v317/);
});

test('el GPX queda intacto y solo deja como ajustables los intervalos de Maps que no cubre', () => {
  const start = app.indexOf('function timelineGpxRouteSignature(route)');
  const end = app.indexOf('function timelineMapPaths(records)', start);
  const context = {};
  vm.runInNewContext(`${app.slice(start, end)}; this.outside = timelinePathsOutsideGpxIntervals; this.recordsOutside = timelineRecordsOutsideGpxIntervals;`, context);
  const maps = [[
    { latitude: 40, longitude: -3, time: '2026-08-26T07:00:00Z' },
    { latitude: 40.01, longitude: -3, time: '2026-08-26T08:00:00Z' },
    { latitude: 40.02, longitude: -3, time: '2026-08-26T09:00:00Z' },
    { latitude: 40.03, longitude: -3, time: '2026-08-26T10:00:00Z' },
    { latitude: 40.04, longitude: -3, time: '2026-08-26T11:00:00Z' },
    { latitude: 40.05, longitude: -3, time: '2026-08-26T12:00:00Z' }
  ]];
  const gpx = [[
    { latitude: 41, longitude: -4, time: '2026-08-26T09:00:00Z' },
    { latitude: 41.01, longitude: -4, time: '2026-08-26T10:00:00Z' }
  ]];
  const outside = context.outside(maps, gpx);
  assert.equal(outside.length, 2);
  assert.deepEqual(Array.from(outside[0], point => point.time), [
    '2026-08-26T07:00:00Z',
    '2026-08-26T08:00:00Z'
  ]);
  assert.deepEqual(Array.from(outside[1], point => point.time), [
    '2026-08-26T11:00:00Z',
    '2026-08-26T12:00:00Z'
  ]);
  const records = context.recordsOutside([
    { time: '2026-08-26T08:30:00Z' },
    { time: '2026-08-26T09:30:00Z' },
    { time: '2026-08-26T11:30:00Z' }
  ], gpx);
  assert.deepEqual(Array.from(records, record => record.time), [
    '2026-08-26T08:30:00Z',
    '2026-08-26T11:30:00Z'
  ]);
});
