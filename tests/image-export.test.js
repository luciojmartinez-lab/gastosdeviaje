import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  embedGpsInJpegBytes,
  extractImageGpsFromArrayBuffer
} from '../image-location.js';

const app = await readFile(new URL('../app.bundle.js', import.meta.url), 'utf8');

test('el JPEG exportado conserva las coordenadas GPS de la aplicación', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const exported = embedGpsInJpegBytes(jpeg, 40.123456, -1.987654);
  const point = extractImageGpsFromArrayBuffer(exported.buffer);
  assert.ok(point);
  assert.ok(Math.abs(point.latitude - 40.123456) < 0.000001);
  assert.ok(Math.abs(point.longitude + 1.987654) < 0.000001);
});

test('la exportación propone descarga, fecha y hora', () => {
  assert.match(app, /return `descarga-\$\{stamp\}-\$\{time\}\.\$\{extension\}`/);
  assert.match(app, /async function imageViewerExportBlob\(record\)/);
  assert.match(app, /embedGpsInJpegBlob\(blob, point\.latitude, point\.longitude\)/);
  assert.match(app, /link\.download = imageViewerDownloadName/);
  assert.match(app, /saveBlogCameraOriginal[\s\S]*?embedGpsInJpegBlob/);
});
