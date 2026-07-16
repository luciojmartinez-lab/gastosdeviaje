import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, help, sw, version, pkg] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../version.txt', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8')
]);

test('la versiÃ³n 700v158 estÃ¡ alineada en app, cache y paquete', () => {
  assert.equal(version.trim(), '700v158');
  assert.match(pkg, /"version": "700\.158\.0"/);
  assert.match(html, /styles\.css\?v=700v158/);
  assert.match(html, /app\.bundle\.js\?v=700v158/);
  assert.match(html, /map-model\.js\?v=700v158/);
  assert.match(html, /sw\.js\?v=700v158/);
  assert.match(app, /const APP_VERSION = '700v158'/);
  assert.match(app, /image-location\.js\?v=700v158/);
  assert.match(app, /ticket-ocr\.js\?v=700v158/);
  assert.match(sw, /gastosdeviaje-700v158/);
  assert.doesNotMatch(html + app + sw, /700v136|700v135|700v134|700v133|700v132|700v131|700v128/);
});

test('las imÃ¡genes nuevas se guardan con objetivo mÃ¡s ligero', () => {
  assert.match(app, /const BLOG_IMAGE_TARGET_BYTES = 650 \* 1024;/);
  assert.match(app, /const BLOG_IMAGE_MAX_DIMENSION = 1600;/);
  assert.match(app, /const BLOG_IMAGE_OUTPUT_LIMIT = 1_100_000;/);
  assert.match(app, /compressBlogImage\(file, \{ skipMetadata: true \}\)/);
  assert.match(help, /objetivo aproximado de 650 KB/);
});

test('Avanzado permite reducir el espacio ocupado de imÃ¡genes ya guardadas', () => {
  assert.match(html, /id="btn-compact-storage"/);
  assert.match(html, /id="msg-compact-storage"/);
  assert.match(html, /Reducir espacio ocupado/);
  assert.match(app, /async function compactStoredImages\(\)/);
  assert.match(app, /compactStoredImagePayload/);
  assert.match(app, /PDF y otros documentos no se tocar/);
  assert.ok(app.includes("if ($('#btn-compact-storage')) $('#btn-compact-storage').onclick = compactStoragePrompt;"));
  assert.match(help, /Reducir espacio ocupado recomprime las im.genes ya guardadas/);
});
