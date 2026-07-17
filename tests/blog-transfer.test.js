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

test('las imágenes del Blog se pueden girar manualmente', () => {
  assert.match(html, /id="blog-image-rotate-left"/);
  assert.match(html, /id="blog-image-rotate-right"/);
  assert.match(app, /async function rotateActiveBlogImage\(direction\)/);
  assert.match(app, /context\.rotate\(quarterTurn \* Math\.PI \/ 2\)/);
  assert.match(app, /width: canvas\.width,[\s\S]*height: canvas\.height/);
  assert.match(app, /isExpenseWithImages = activeBlogEntryType === 'gasto' && hasImages/);
  assert.match(app, /if \(blogEntryImages\(entry\)\.length\) showBlogImages\(blogEntryImages\(entry\)\)/);
  assert.match(app, /if \(type === 'gasto' && activeBlogImage\)[\s\S]*galleryImages: activeBlogGalleryImages\.map\(normalizeBlogImageRecord\)/);
  assert.match(styles, /\.blog-image-rotate-actions/);
});

test('cada foto del Blog y de Gastos puede tener su propio tipo', () => {
  assert.match(html, /id="config-photo-types"/);
  assert.match(html, /id="g-extra-images-type"/);
  assert.match(html, /id="edit-gasto-extra-images-type"/);
  assert.match(app, /photoTypeId: String\(image\.photoTypeId \|\| ''\)/);
  assert.match(app, /data-blog-image-type="\$\{index\}"/);
  assert.match(app, /function setBlogImagePhotoType\(index, typeId\)/);
  assert.match(app, /imagePhotoTypeId: activeBlogImage\.photoTypeId \|\| ''/);
  assert.match(app, /photoTypeId: entry\.imagePhotoTypeId/);
  assert.match(app, /data-expense-image-type="\$\{index\}"/);
  assert.match(app, /photoTypeId: selectedType \? selectedType\.id : ''/);
});

test('las clasificaciones editadas de un gasto se guardan al seleccionarlas', () => {
  assert.match(html, /id="g-classification"/);
  assert.match(html, /id="edit-gasto-classification"/);
  assert.match(app, /function queueExpenseClassificationSave\(id, patch\)/);
  assert.match(app, /async function saveOpenExpenseCategoryClassification\(\)/);
  assert.match(app, /queueExpenseClassificationSave\(id, \{ catId, subcatId \}\)/);
  assert.match(app, /async function saveOpenExpenseClassification\(\)/);
  assert.match(app, /classificationId: selected \? selected\.id : ''/);
  assert.match(app, /edit-gasto-classification'\)\.onchange[\s\S]*saveOpenExpenseClassification\(\)/);
  assert.match(app, /edit-gasto-classification'\)\.value = String\(gasto\.classificationId \|\| ''\)/);
  assert.match(app, /classificationId: selectedClassification \? selectedClassification\.id : ''/);
  assert.match(html, /id="edit-gasto-extra-images-type" disabled/);
  assert.match(app, /async function saveOpenExpenseImageClassifications\(\)/);
  assert.match(app, /queueExpenseClassificationSave\(id, \{ extraImages \}\)/);
  assert.match(app, /edit-gasto-cat'\)\.onchange[\s\S]*saveOpenExpenseCategoryClassification\(\)/);
  assert.match(app, /edit-gasto-extra-images-current'\)\.onchange[\s\S]*saveOpenExpenseImageClassifications\(\)/);
});

test('los puntos geolocalizados admiten notas', () => {
  assert.match(html, /id="blog-point-notes"/);
  assert.match(app, /notas: type === 'punto' \? String\(data\.notas \|\| ''\) : ''/);
  assert.match(app, /values\.notas = String\(\$\('#blog-point-notes'\)/);
  assert.match(app, /entry\.tipo === 'punto' && entry\.notas/);
  assert.match(app, /texto: entry\.tipo === 'punto' \? entry\.notas \|\| '' : entry\.texto \|\| ''/);
});

test('textos e imágenes sin GPS permiten marcar una ubicación manual', () => {
  assert.match(html, /id="blog-en-route-location"[^>]*>Añadir ubicación manualmente/);
  assert.match(html, /id="blog-point-copy">Copiar coordenadas/);
  assert.match(app, /blogManualRouteLocationOpen && \['texto', 'imagen'\]\.includes\(activeBlogEntryType\)/);
  assert.match(app, /Introduce manualmente la latitud y la longitud\. No se usará tu ubicación actual/);
  assert.match(app, /function copyBlogPointCoordinates\(\)/);
  assert.match(app, /const text = `\$\{point\.latitude\.toFixed\(6\)\}, \$\{point\.longitude\.toFixed\(6\)\}`/);
  assert.match(app, /if \(\$\('#blog-point-map'\)\) \$\('#blog-point-map'\)\.hidden = !pointMode/);
  assert.match(app, /values\.imageLocationSource = 'manual'/);
  assert.match(styles, /\.blog-point-actions \.btn\[hidden\]/);
});

test('el Blog ya no muestra el mapa automático de puntos pero el PDF lo conserva', () => {
  assert.doesNotMatch(html, /id="blog-points-overview"/);
  assert.doesNotMatch(app, /function renderBlogPointsOverview/);
  assert.match(app, /function blogPrintPointMapHtml\(entries\)/);
  assert.match(app, /<h1>Mapa de puntos geolocalizados<\/h1>/);
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
