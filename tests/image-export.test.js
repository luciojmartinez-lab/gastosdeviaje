import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  embedGpsInJpegBytes,
  extractImageGpsFromArrayBuffer
} from '../image-location.js';

const [app, html] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);

const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('el JPEG exportado conserva las coordenadas GPS de la aplicación', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const exported = embedGpsInJpegBytes(jpeg, 40.123456, -1.987654);
  const point = extractImageGpsFromArrayBuffer(exported.buffer);
  assert.ok(point);
  assert.ok(Math.abs(point.latitude - 40.123456) < 0.000001);
  assert.ok(Math.abs(point.longitude + 1.987654) < 0.000001);
});

test('la exportación propone descarga, fecha y hora', () => {
  assert.match(html, /id="image-viewer-download"[^>]*>Descargar con GPS/);
  assert.match(html, /id="blog-image-download"[^>]*>Descargar con GPS/);
  assert.match(app, /return `descarga-\$\{stamp\}-\$\{time\}\.\$\{extension\}`/);
  assert.match(app, /async function imageViewerExportBlob\(record\)/);
  assert.match(app, /embedGpsInJpegBlob\(blob, point\.latitude, point\.longitude\)/);
  assert.match(app, /async function prepareImageDownloadFile\(record, date = new Date\(\)\)/);
  assert.match(app, /imageViewerExportBlob\(\{ \.\.\.record, blob, type \}\)/);
  assert.match(app, /link\.download = file\.name \|\| imageViewerDownloadName/);
  assert.match(app, /async function downloadActiveImageViewerFile\(\)/);
  assert.match(app, /async function downloadPrimaryBlogImage\(\)/);
  assert.match(app, /Para conservar el nombre y el GPS, pulsa «Descargar con GPS»/);
  assert.match(app, /Descarga iniciada como \$\{filename\}, con GPS incorporado/);
  assert.match(app, /saveBlogCameraOriginal[\s\S]*?embedGpsInJpegBlob/);
});

test('el nombre descargado incluye realmente la fecha y la hora', () => {
  const start = app.indexOf('function imageViewerDownloadName');
  const end = app.indexOf('\nasync function imageViewerExportBlob', start);
  const source = app.slice(start, end);
  const makeName = Function(`${source}; return imageViewerDownloadName;`)();
  assert.equal(makeName(new Date(2026, 7, 9, 18, 57, 6), 'image/jpeg'), 'descarga-2026-08-09-18-57-06.jpg');
});

test('el visor ajusta el ticket completo y permite cambiar su tamaño en móvil', () => {
  for (const id of ['image-viewer-fit', 'image-viewer-zoom-out', 'image-viewer-zoom-in', 'image-viewer-zoom-label']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /function applyImageViewerZoom\(\)/);
  assert.match(app, /function stepImageViewerZoom\(direction\)/);
  assert.match(styles, /\.image-viewer-stage img\.is-fit \{[\s\S]*?width: 100%;[\s\S]*?height: 100%;/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.image-viewer-actions \{[\s\S]*?grid-template-columns:/);
});

test('un nombre de archivo muy largo no ensancha ni recorta el visor', () => {
  assert.match(styles, /\.image-viewer-shell \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(styles, /\.image-viewer-shell > \* \{[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;/);
  assert.match(styles, /\.image-viewer-modal \.modal-head h2 \{[\s\S]*?flex: 1 1 0;[\s\S]*?text-overflow: ellipsis;/);
  assert.match(styles, /\.image-viewer-stage \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;/);
});
