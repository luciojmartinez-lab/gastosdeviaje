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
  assert.match(source, /setTab\('gastos', \{ expenseId: gasto\.id \}\)/);
  assert.doesNotMatch(source, /setTab\('blog'\)/);
});

test('al volver a Gastos conserva visible el gasto transferido y la entrada normal muestra el último', () => {
  assert.match(app, /function scrollToExpense\(expenseId, behavior = 'auto'\)/);
  assert.match(app, /if \(options\.expenseId\) scrollToExpense\(options\.expenseId\)/);
  assert.match(app, /else scrollToLastExpense\('auto'\)/);
});

test('las imágenes del gasto y los tickets que son foto pasan al Blog', () => {
  assert.match(app, /function expenseBlogImages\(gasto\)/);
  assert.match(app, /fileLooksLikeImage\(\{ type: ticketType, name: ticketName \}\)/);
  assert.match(app, /galleryImages: \(await expenseBlogImages\(gasto\)\)/);
  assert.match(app, /imagen adjunta/);
});

test('los tickets PDF antiguos pasan al Blog como imagen de su primera página', () => {
  assert.match(app, /async function expenseTicketBlogImage\(gasto\)/);
  assert.match(app, /ticketIsPdf/);
  assert.match(app, /pdf\.getPage\(1\)/);
  assert.match(app, /pdf-preview/);
  assert.match(app, /await pdf\.destroy\(\)/);
});

test('el PDF del Blog usa 80 por ciento para imágenes normales y aprovecha el espacio inferior', () => {
  assert.match(app, /\.blog-print-image\.landscape \{ width: 80%; \}/);
  assert.match(app, /\.blog-print-gallery \{ display: grid; width: 80%;/);
  assert.match(app, /\.blog-print-featured \.blog-print-image \{ width: 100%; max-width: 100%; \}/);
  assert.match(app, /\.blog-print-entry \{ break-inside: auto; page-break-inside: auto;/);
  assert.match(app, /class="blog-print-entry-heading"/);
});

test('los gastos permiten doble clic para editar y señalan si ya están en el Blog', () => {
  assert.match(app, /const expensesInBlog = new Set\(state\.blogEntries/);
  assert.match(app, /✓ Ya está en el Blog \(actualizar\)/);
  assert.match(app, /tr\.dataset\.gastoId = String\(g\.id\)/);
  assert.match(app, /document\.addEventListener\('dblclick',[\s\S]*?handleGastoAction\(expenseRow\.dataset\.gastoId, 'edit'\)/);
});

test('las entradas del Blog permiten doble clic para editar', () => {
  assert.match(app, /data-blog-entry-id="\$\{entry\.id\}"/);
  assert.match(app, /target\.closest\('#tabla-blog \.blog-day-entry\[data-blog-entry-id\]'\)/);
  assert.match(app, /openBlogEntryDialog\(entry\)/);
});

test('el Blog usa el campo de texto normal sin dictado propio', () => {
  assert.match(html, /<textarea id="blog-texto"/);
  assert.doesNotMatch(html, /blog-voice|Dictar por voz/);
  assert.doesNotMatch(app, /SpeechRecognition|startBlogDictation|blogDictationSession/);
});

test('la tabla del blog prioriza hora, ciudad y descripcion', () => {
  assert.match(html, /<th>Hora<\/th><th>Ciudad<\/th><th>Descripción<\/th><th>Tipo<\/th><th>País<\/th><th>Precio<\/th>/);
  assert.match(html, /class="blog-col-city"[\s\S]*?class="blog-col-description"/);
  assert.match(styles, /\.blog-col-time \{ width: 60px; \}/);
  assert.match(styles, /\.blog-col-city \{ width: 110px; \}/);
  assert.match(styles, /\.blog-col-description \{ width: 315px; \}/);
  assert.match(app, /entry\.hora \|\| '-'[\s\S]*?entry\.ciudadId[\s\S]*?entry\.descripcion[\s\S]*?blogTypeLabel\(entry\.tipo\)[\s\S]*?entry\.paisId/);
});

test('las transferencias se muestran de antiguas a modernas', () => {
  assert.match(app, /function compareTransferenciasChronologically\(a, b\)/);
  assert.match(app, /state\.transferencias = transferencias\.sort\(compareTransferenciasChronologically\)/);
  assert.match(app, /\.sort\(compareTransferenciasChronologically\)\.forEach\(t =>/);
});
