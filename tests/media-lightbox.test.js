import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, help] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('la vista HTML del Blog abre imagenes en lightbox', () => {
  assert.match(app, /data-blog-lightbox="1"/);
  assert.match(app, /class="blog-lightbox"/);
  assert.match(app, /id="blog-lightbox-image"/);
  assert.match(app, /target\.closest\('\[data-blog-lightbox\]'\)/);
  assert.match(app, /event\.key === 'Escape'/);
  assert.match(app, /script data-keep-html="1"/);
  assert.match(app, /script:not\(\[data-keep-html\]\)/);
  assert.match(app, /@media print \{ \.blog-preview-toolbar, \.blog-lightbox \{ display: none !important; \}/);
  assert.match(help, /Al pulsar cualquier foto en la vista HTML se abre una lightbox/);
});

test('los documentos importantes del Blog conservan el color', () => {
  assert.match(app, /important-ticket/);
  assert.match(app, /minor-ticket/);
  assert.match(app, /\.blog-print-image\.ticket-document \{ background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; \}/);
  assert.match(app, /\.blog-print-image\.ticket-document\.minor-ticket \{ filter: grayscale\(1\) contrast\(1\.06\) brightness\(1\.06\);/);
  assert.match(help, /billetes de tren o avión y los documentos de alojamiento conservan el tamaño grande y el color original/);
});
