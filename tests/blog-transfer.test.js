import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

test('al reemplazar un gasto existente en el blog permite conservar o reemplazar fecha y hora', () => {
  assert.match(html, /id="expense-blog-replace-dialog"/);
  assert.match(html, /id="expense-blog-replace-keep"/);
  assert.match(html, /id="expense-blog-replace-all"/);
  assert.match(html, /No aceptar/);
  assert.match(app, /function chooseExpenseBlogReplacement\(\)/);
  assert.match(app, /finish\('keep-date'\)/);
  assert.match(app, /finish\('replace-all'\)/);
  assert.match(app, /replacementMode === 'keep-date' \? existing\.fecha : gasto\.fecha \|\| currentLocalDate\(\)/);
  assert.match(app, /replacementMode === 'keep-date' \? existing\.hora : expenseBlogTime\(gasto\)/);
});

test('al anadir un gasto al blog permanece en Gastos', () => {
  const start = app.indexOf('async function addExpenseToBlog');
  const end = app.indexOf('function blogPrintImagesHtml', start);
  const source = app.slice(start, end);
  assert.match(source, /setTab\('gastos'\)/);
  assert.doesNotMatch(source, /setTab\('blog'\)/);
});

test('los gastos permiten doble clic para editar y señalan si ya están en el Blog', () => {
  assert.match(app, /const expensesInBlog = new Set\(state\.blogEntries/);
  assert.match(app, /✓ Ya está en el Blog \(actualizar\)/);
  assert.match(app, /tr\.dataset\.gastoId = String\(g\.id\)/);
  assert.match(app, /document\.addEventListener\('dblclick',[\s\S]*?handleGastoAction\(row\.dataset\.gastoId, 'edit'\)/);
});

test('la tabla del blog prioriza hora, ciudad y descripcion', () => {
  assert.match(html, /<th>Hora<\/th><th>Ciudad<\/th><th>Descripción<\/th><th>Tipo<\/th><th>País<\/th><th>Precio<\/th>/);
  assert.match(html, /class="blog-col-city"[\s\S]*?class="blog-col-description"/);
  assert.match(styles, /\.blog-col-city \{ width: 145px; \}/);
  assert.match(styles, /\.blog-col-description \{ width: 260px; \}/);
  assert.match(app, /entry\.hora \|\| '-'[\s\S]*?entry\.ciudadId[\s\S]*?entry\.descripcion[\s\S]*?blogTypeLabel\(entry\.tipo\)[\s\S]*?entry\.paisId/);
});

test('las transferencias se muestran de antiguas a modernas', () => {
  assert.match(app, /function compareTransferenciasChronologically\(a, b\)/);
  assert.match(app, /state\.transferencias = transferencias\.sort\(compareTransferenciasChronologically\)/);
  assert.match(app, /\.sort\(compareTransferenciasChronologically\)\.forEach\(t =>/);
});
