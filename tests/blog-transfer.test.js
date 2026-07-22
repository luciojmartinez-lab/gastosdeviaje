import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles, help] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('al reemplazar un gasto existente en el blog permite conservar o reemplazar fecha y hora', () => {
  assert.match(html, /id="expense-blog-replace-dialog"/);
  assert.match(html, /id="expense-blog-replace-keep"/);
  assert.match(html, /id="expense-blog-replace-all"/);
  assert.match(html, /id="expense-blog-replace-cancel">Cancelar<\/button>/);
  assert.match(html, /id="expense-blog-replace-keep">Conservar Fecha\/hora Blog<\/button>/);
  assert.match(html, /id="expense-blog-replace-all">Reemplazar Datos Blog<\/button>/);
  assert.doesNotMatch(html, /No aceptar/);
  assert.match(app, /function chooseExpenseBlogReplacement\(\)/);
  assert.match(app, /finish\('keep-date'\)/);
  assert.match(app, /finish\('replace-all'\)/);
  assert.match(app, /replacementMode === 'keep-date' \? existing\.fecha : gasto\.fecha \|\| currentLocalDate\(\)/);
  assert.match(app, /replacementMode === 'keep-date' \? existing\.hora : expenseBlogTime\(gasto\)/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.expense-blog-replace-actions \{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(help, /<em>Cancelar<\/em> no cambia la entrada; <em>Conservar Fecha\/hora Blog<\/em>/);
});

test('al anadir un gasto al blog permanece en Gastos', () => {
  const start = app.indexOf('async function addExpenseToBlog');
  const end = app.indexOf('function blogPrintImagesHtml', start);
  const source = app.slice(start, end);
  assert.match(source, /setTab\('gastos', \{[\s\S]*?expenseId: gasto\.id,[\s\S]*?expenseActionAnchor: options\.expenseActionAnchor \|\| null/);
  assert.doesNotMatch(source, /setTab\('blog'\)/);
});

test('al volver a Gastos recupera cerrado el desplegable usado en su posición anterior', () => {
  assert.match(app, /function captureExpenseActionAnchor\(expenseId\)/);
  assert.match(app, /viewportTop: select\.getBoundingClientRect\(\)\.top/);
  assert.match(app, /function restoreExpenseActionAnchor\(anchor\)/);
  assert.match(app, /window\.scrollTo\(\{ top: Math\.max\(0, window\.scrollY \+ difference\), behavior: 'auto' \}\)/);
  assert.match(app, /select\.value = ''/);
  assert.match(app, /select\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /expense-action-return/);
  assert.match(app, /addExpenseToBlog\(gasto, \{ expenseActionAnchor \}\)/);
  assert.match(app, /if \(options\.expenseActionAnchor\) restoreExpenseActionAnchor\(options\.expenseActionAnchor\)/);
  assert.match(styles, /\.expense-action-select\.expense-action-return/);
  assert.match(app, /row\?\.classList\.add\('expense-entry-return'\)/);
  assert.match(styles, /\.expense-row\.expense-entry-return > td/);
  assert.match(app, /function scrollToExpense\(expenseId, behavior = 'auto'\)/);
  assert.match(app, /else scrollToLastExpense\('auto'\)/);
});

test('al editar un gasto vuelve a su desplegable y lo resalta temporalmente', () => {
  const start = app.indexOf("$('#edit-gasto-form').onsubmit");
  const end = app.indexOf("$('#g-cuenta').onchange", start);
  const source = app.slice(start, end);
  assert.match(source, /const expenseActionAnchor = activeEditExpenseActionAnchor \|\| captureExpenseActionAnchor\(id\)/);
  assert.match(source, /setTab\('gastos', \{ expenseActionAnchor \}\)/);
  assert.match(app, /row\?\.classList\.remove\('expense-entry-return'\)/);
});

test('al cancelar, cerrar o pulsar Escape en la edición vuelve al gasto y lo resalta', () => {
  assert.match(app, /activeEditExpenseActionAnchor = captureExpenseActionAnchor\(gasto\.id\)/);
  assert.match(app, /function closeEditGasto\(\{ restoreAnchor = true \} = \{\}\)/);
  assert.match(app, /if \(restoreAnchor && expenseActionAnchor\) \{[\s\S]*?setTab\('gastos', \{ expenseActionAnchor \}\)/);
  assert.match(app, /\$\('#edit-gasto-dialog'\)\.oncancel = event => \{[\s\S]*?closeEditGasto\(\)/);
  assert.match(app, /closeEditGasto\(\{ restoreAnchor: false \}\)/);
});

test('el conflicto de fecha y hora de una foto ofrece Mantener o Reemplazar', () => {
  assert.match(html, /id="image-datetime-dialog"/);
  assert.match(html, /id="image-datetime-keep">Mantener<\/button>/);
  assert.match(html, /id="image-datetime-replace">Reemplazar<\/button>/);
  assert.match(app, /function chooseImageDateTimeReplacement\(message\)/);
  assert.match(app, /await chooseImageDateTimeReplacement/);
  assert.match(help, /<em>Mantener<\/em> conserva las del gasto y <em>Reemplazar<\/em> aplica las de la foto/);
});

test('al editar una entrada del Blog vuelve a su desplegable y conserva la posición', () => {
  assert.match(app, /function captureBlogEntryAnchor\(entryId\)/);
  assert.match(app, /viewportTop: target\.getBoundingClientRect\(\)\.top/);
  assert.match(app, /activeBlogEntryAnchor = entry \? captureBlogEntryAnchor\(entry\.id\) : null/);
  assert.match(app, /const blogEntryAnchor = current[\s\S]*?activeBlogEntryAnchor \|\| captureBlogEntryAnchor\(current\.id\)/);
  assert.match(app, /setTab\('blog', \{ blogEntryAnchor \}\)/);
  assert.match(app, /function restoreBlogEntryAnchor\(anchor\)/);
  assert.match(app, /window\.scrollTo\(\{ top: Math\.max\(0, window\.scrollY \+ difference\), behavior: 'auto' \}\)/);
  assert.match(app, /select\.classList\.add\('blog-action-return'\)/);
  assert.match(app, /row\.classList\.add\('blog-entry-return'\)/);
  assert.match(app, /if \(options\.blogEntryAnchor\)[\s\S]*?restoreBlogEntryAnchor\(options\.blogEntryAnchor\)/);
  assert.match(styles, /\.blog-action-select\.blog-action-return/);
  assert.match(styles, /\.blog-day-entry\.blog-entry-return > td/);
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
  assert.match(app, /if \(type === 'gasto'\)[\s\S]*galleryImages: activeBlogGalleryImages\.map\(normalizeBlogImageRecord\)/);
  assert.match(styles, /\.blog-image-rotate-actions/);
});

test('cada imagen de una entrada del Blog se puede quitar al editar', () => {
  assert.match(app, /data-blog-remove-image="\$\{index\}"/);
  assert.match(app, /function removeBlogImage\(index\)/);
  assert.match(app, /images\.splice\(imageIndex, 1\)/);
  assert.match(app, /se quitará al guardar la entrada/);
  assert.match(app, /removeBlogImage\(removeButton\.dataset\.blogRemoveImage\)/);
  assert.match(styles, /\.blog-gallery-preview \.blog-gallery-remove/);
  assert.match(help, /<tr><td>Quitar<\/td><td>Marca una fotografía para eliminarla de la entrada al guardar/);
});

test('los tickets e imágenes de Gastos se giran antes de actualizar el Blog', () => {
  assert.match(html, /id="edit-gasto-ticket-preview"/);
  assert.match(html, /id="edit-gasto-ticket-rotate-left"/);
  assert.match(html, /id="edit-gasto-ticket-rotate-right"/);
  assert.match(app, /async function rotateRasterImageRecord\(image, direction\)/);
  assert.match(app, /async function rotateOpenExpenseTicket\(direction\)/);
  assert.match(app, /async function rotateOpenExpenseImage\(imageIndex, direction\)/);
  assert.match(app, /data-rotate-expense-image="\$\{index\}"/);
  assert.match(app, /ticketData: rotated\.data/);
  assert.match(app, /activeEditTicketRecord = \{ \.\.\.activeEditTicketRecord, \.\.\.saved \};[\s\S]*?renderEditExpenseTicket\(activeEditTicketRecord\)/);
  assert.match(app, /const currentTicket = activeEditTicketRecord[\s\S]*?ticketData: currentTicket \? currentTicket\.ticketData : ''/);
  assert.match(app, /queueExpenseClassificationSave\(id, \{ extraImages \}\)/);
  assert.match(app, /function queueExpenseMediaSave\(callback\)/);
  assert.match(app, /await pendingExpenseMediaSave;[\s\S]*await pendingExpenseClassificationSave;/);
  assert.match(app, /Terminando de girar el ticket antes de guardar/);
  assert.match(styles, /\.expense-image-rotate-actions/);
  assert.match(styles, /\.expense-ticket-preview-open img[\s\S]*?object-fit: contain/);
  assert.match(styles, /\.edit-ticket-fields \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(app, /class="expense-current-image-preview"[\s\S]*?<img src=/);
  assert.match(app, /class="expense-current-image-rotate"[\s\S]*?Izquierda[\s\S]*?Derecha/);
  assert.match(styles, /\.expense-current-image-preview img[\s\S]*?object-fit: contain/);
});

test('el ticket explica cuándo se conserva y puede añadirse al mapa si tiene GPS', () => {
  assert.match(html, /El ticket es opcional\. Elige archivo o Cámara para añadirlo\./);
  assert.match(html, /El ticket actual se conserva\. Usa Elegir archivo o Cámara solo para sustituirlo\./);
  assert.match(html, /id="g-ticket-map-option"[\s\S]*?id="g-ticket-map"/);
  assert.match(html, /id="edit-gasto-ticket-map-option"[\s\S]*?id="edit-gasto-ticket-map"/);
  assert.match(app, /async function syncExpenseTicketSelection\(prefix, source\)[\s\S]*?imageGpsForFile\(selectedFile/);
  assert.match(app, /function expenseTicketLocationPatch\(prefix, gasto = null\)/);
  assert.match(app, /ticketMapEnabled: Boolean\(point/);
  assert.match(app, /const ticketImage = expenseTicketImageRecord\(gasto\);[\s\S]*?source: 'gasto-ticket'/);
  assert.match(app, /await pendingExpenseTicketLocationChecks\['edit-gasto'\]/);
  assert.match(app, /await pendingExpenseTicketLocationChecks\.g/);
  assert.match(help, /GPS y mapa del ticket/);
  assert.match(help, /cada imagen actual se ve antes de decidir si se gira/);
});

test('cada foto del Blog y de Gastos puede tener su propio tipo', () => {
  assert.match(html, /id="config-photo-types"/);
  assert.match(html, /id="g-extra-images-classifications"/);
  assert.match(html, /id="edit-gasto-extra-images-classifications"/);
  assert.match(app, /photoTypeId: String\(image\.photoTypeId \|\| ''\)/);
  assert.match(app, /data-blog-image-type="\$\{index\}"/);
  assert.match(app, /function setBlogImagePhotoType\(index, typeId\)/);
  assert.match(app, /imagePhotoTypeId: activeBlogImage\.photoTypeId \|\| ''/);
  assert.match(app, /photoTypeId: entry\.imagePhotoTypeId/);
  assert.match(app, /data-expense-image-type="\$\{index\}"/);
  assert.match(app, /data-new-expense-image-type="\$\{prefix\}-\$\{index\}"/);
  assert.match(app, /photoTypeId: selectedType \? selectedType\.id : ''/);
});

test('las clasificaciones de tickets y fotos se guardan al seleccionarlas', () => {
  assert.match(html, /id="g-ticket-type" disabled/);
  assert.match(html, /id="edit-gasto-ticket-type" disabled/);
  assert.match(app, /function queueExpenseClassificationSave\(id, patch\)/);
  assert.match(app, /async function saveOpenExpenseCategoryClassification\(\)/);
  assert.match(app, /queueExpenseClassificationSave\(id, \{ catId, subcatId \}\)/);
  assert.match(app, /async function saveOpenExpenseTicketClassification\(\)/);
  assert.match(app, /ticketPhotoTypeId: selected \? selected\.id : ''/);
  assert.match(app, /edit-gasto-ticket-type'\)\.onchange[\s\S]*saveOpenExpenseTicketClassification\(\)/);
  assert.match(app, /edit-gasto-ticket-type'\)\.value = gasto\.ticketData \? String\(gasto\.ticketPhotoTypeId \|\| ''\) : ''/);
  assert.match(app, /ticketPhotoTypeId: selectedTicketType \? selectedTicketType\.id : ''/);
  assert.match(app, /photoTypeId: String\(gasto\.ticketPhotoTypeId \|\| ''\)/);
  assert.doesNotMatch(html, /id="edit-gasto-extra-images-type"/);
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

test('un punto cercano puede reutilizarse en una nueva entrada', () => {
  assert.match(app, /const duplicatePoint = duplicate \? blogPointCoordinates\(duplicate\) : null/);
  assert.match(app, /Ya existe el punto «\$\{duplicate\.descripcion\}» a \$\{distance\} m\. ¿Quieres usar esa misma ubicación para esta entrada\?/);
  assert.match(app, /values\.latitude = duplicatePoint \? duplicatePoint\.latitude : point\.latitude/);
  assert.match(app, /values\.longitude = duplicatePoint \? duplicatePoint\.longitude : point\.longitude/);
  assert.match(help, /Aceptar reutiliza exactamente sus coordenadas en la nueva entrada/);
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

test('el selector de punto es legible y conserva En ruta al editar en movil', () => {
  assert.match(html, /class="blog-point-zoom-actions" role="group" aria-label="Zoom del mapa"/);
  assert.match(styles, /\.blog-point-actions \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) auto/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.blog-point-actions \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.blog-point-map-frame \{[\s\S]*aspect-ratio: 16 \/ 9/);
  assert.match(app, /const width = 640;\s+const height = 360;/);
  assert.match(app, /function resetBlogPointPicker\(entry = null\)[\s\S]*renderBlogPointPicker\(\);\s+syncBlogEnRouteOption\(\);/);
  assert.match(app, /if \(type === 'punto'\) \{[\s\S]*?resetBlogPointPicker\(existingPoint\)/);
  assert.match(help, /las coordenadas guardadas se restauran en el mapa y mantienen disponible la opción/);
});

test('los puntos permiten elegir un único transporte y caminar sustituye la descripción vacía', () => {
  assert.match(html, /data-point-transport="walk"[^>]*> Caminar/);
  assert.match(html, /data-point-transport="car"[^>]*> Coche/);
  assert.match(html, /data-point-transport="train"[^>]*> Tren/);
  assert.match(html, /data-point-transport="bus"[^>]*> Bus/);
  assert.match(html, /data-point-transport="plane"[^>]*> Avión/);
  assert.match(app, /function selectedBlogPointTransport\(\)/);
  assert.match(app, /if \(other !== input\) other\.checked = false/);
  assert.match(app, /const description = String\(\$\('#blog-descripcion'\)\.value \|\| ''\)\.trim\(\) \|\| blogPointTransportLabel\(transport\)/);
  assert.match(app, /transporte: type === 'punto' \? transport : ''/);
  assert.match(app, /Escribe una descripción o marca un medio de transporte/);
  assert.match(help, /Caminar, Coche, Tren, Bus y Avión/);
});

test('el punto busca GPS al entrar mediante un modal y baja hasta el mapa', () => {
  assert.match(html, /id="blog-location-dialog"/);
  assert.match(html, /id="blog-location-title">Buscando localización/);
  assert.match(app, /function requestCurrentDeviceLocation\(/);
  assert.match(app, /navigator\.geolocation\.watchPosition\(accept, fail, highAccuracyOptions\)/);
  assert.match(app, /location\.capturedAt >= startedAt - 15_000/);
  assert.match(app, /timeoutMs: 35_000/);
  assert.match(app, /Punto localizado/);
  assert.match(app, /Punto no encontrado/);
  assert.match(app, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(app, /window\.setTimeout\(\(\) => useCurrentBlogPointLocation\(\{ automatic: true \}\), 0\)/);
  assert.match(help, /la búsqueda GPS comienza automáticamente/);
});

test('el mapa del punto admite arrastre zoom de rueda y gesto de dos dedos', () => {
  assert.match(styles, /\.blog-point-map-frame \{[\s\S]*?touch-action: none/);
  assert.match(styles, /\.blog-point-map-frame\.dragging/);
  assert.match(app, /function startBlogPointMapGesture\(event\)/);
  assert.match(app, /function moveBlogPointMapGesture\(event\)/);
  assert.match(app, /function endBlogPointMapGesture\(event\)/);
  assert.match(app, /function zoomBlogPointMapWithWheel\(event\)/);
  assert.match(app, /document\.addEventListener\('wheel', zoomBlogPointMapWithWheel, \{ passive: false \}\)/);
  assert.match(app, /blogPointMapGesture\.pinching/);
  assert.match(help, /arrastrar el mapa[\s\S]*?ampliar y reducir con dos dedos/);
});

test('el Blog y su PDF no añaden un mapa automático de puntos al final', () => {
  assert.doesNotMatch(html, /id="blog-points-overview"/);
  assert.doesNotMatch(app, /function renderBlogPointsOverview/);
  assert.doesNotMatch(app, /function blogPrintPointMapHtml\(entries\)/);
  assert.doesNotMatch(app, /<h1>Mapa de puntos geolocalizados<\/h1>/);
  assert.doesNotMatch(app, /blogPrintPointMapHtml\(timeline\)/);
});

test('el PDF del Blog compacta páginas, iguala galerías y neutraliza tickets', () => {
  assert.match(app, /function blogPrintImageClasses\(image\)/);
  assert.match(app, /startsWith\('expense-ticket-'\)/);
  assert.match(app, /ticket-document/);
  assert.match(app, /\.blog-print-image\.landscape \{ width: 62%; \}/);
  assert.match(app, /\.blog-print-image\.portrait \{ width: 28%; min-width: 42mm; \}/);
  assert.match(app, /\.blog-print-image\.ticket-document \{ filter: grayscale\(1\) contrast\(1\.06\) brightness\(1\.06\)/);
  assert.match(app, /\.blog-print-gallery \{ display: grid; width: 84%;/);
  assert.match(app, /\.blog-print-gallery figure \{ display: flex; aspect-ratio: 4 \/ 3;/);
  assert.match(app, /\.blog-print-gallery \.blog-print-image \{ width: 100%; min-width: 0; height: 100%; max-height: none;/);
  assert.match(app, /\.blog-print-featured \.blog-print-image \{ width: 100%; max-width: 100%; \}/);
  assert.match(app, /\.blog-print-featured \.blog-print-image\.portrait \{ width: 80%; max-width: 80%; \}/);
  assert.match(app, /\.blog-print-day \{ break-before: auto; page-break-before: auto; \}/);
  assert.doesNotMatch(app, /\.blog-print-day \{ break-before: page; page-break-before: always; \}/);
  assert.match(app, /\.blog-print-entry \{ break-inside: auto; page-break-inside: auto;/);
  assert.match(app, /class="blog-print-entry-heading"/);
  assert.match(help, /galerías usan celdas de igual altura/);
  assert.match(help, /tickets se imprimen con un tono neutro/);
});

test('el PDF del Blog respeta los filtros activos de día, país y ciudad', () => {
  assert.match(app, /function filteredBlogEntries\(entries\)[\s\S]*?entry\.fecha === date[\s\S]*?entry\.paisId\) === countryId[\s\S]*?entry\.ciudadId\) === cityId/);
  const printStart = app.indexOf('function printBlog(options = {})');
  const printEnd = app.indexOf('\nasync function seedIfEmpty()', printStart);
  const printBlogSource = app.slice(printStart, printEnd);
  assert.match(printBlogSource, /const allEntries = blogEntriesForTrip\(trip\.id\)/);
  assert.match(printBlogSource, /const entries = day[\s\S]*?allEntries\.filter\(entry => entry\.fecha === day[\s\S]*?: filteredBlogEntries\(allEntries\)/);
  assert.match(printBlogSource, /No hay entradas del Blog que coincidan con los filtros seleccionados/);
  assert.match(printBlogSource, /blogPrintBodyHtml\(trip, entries, \{ overviewEntries: day \? \[\] : allEntries \}\)/);
  assert.match(app, /const overviewEntries = Array\.isArray\(options\.overviewEntries\) \? options\.overviewEntries : entries/);
  assert.match(app, /preparations\.length \? blogPrintPreparationsHtml\(preparations\) : ''/);
});

test('el boton inferior crea el PDF solamente del dia desplegado', () => {
  assert.match(html, /id="btn-blog-day-pdf-bottom"[^>]*>PDF del d/);
  assert.match(app, /function currentOpenBlogDay\(entries\)/);
  assert.match(app, /const openDates = \[\.\.\.openBlogDays\]/);
  assert.match(app, /return openDates\.length \? openDates\[openDates\.length - 1\] : ''/);
  assert.match(app, /function openCurrentBlogDayPdfGuide\(\)[\s\S]*?openBlogPdfGuide\(day\)/);
  assert.match(app, /allEntries\.filter\(entry => entry\.fecha === day && !isTripOverviewBlogEntry\(entry, trip\)\)/);
  assert.match(app, /overviewEntries: day \? \[\] : allEntries/);
  assert.match(help, /PDF del d[\s\S]*?d[\s\S]*?que est[\s\S]*?desplegado[\s\S]*?no a[\s\S]*?la portada general ni otros d/);
});

test('copiar el mapa diario al Blog conserva el dia seleccionado', () => {
  const copyStart = app.indexOf('async function copyDailyMapToBlog()');
  const copyEnd = app.indexOf('\nfunction copyCurrentMapToBlog()', copyStart);
  const copySource = app.slice(copyStart, copyEnd);
  assert.match(copySource, /await loadAll\(\);[\s\S]*?tripMapState\.day = day;[\s\S]*?tripMapState\.cityId = 0;[\s\S]*?renderTripMap\(\);/);
  assert.match(help, /mantiene ese d[\s\S]*?seleccionado/);
});

test('el Blog permite identificar y filtrar entradas En tránsito', () => {
  assert.match(app, /const BLOG_TRANSIT_CITY_VALUE = '__transit__'/);
  assert.match(app, /options\.unshift\(\{ value: BLOG_TRANSIT_CITY_VALUE, label: 'En tránsito' \}\)/);
  assert.match(app, /enTransito: cityValue === BLOG_TRANSIT_CITY_VALUE/);
  assert.match(app, /function blogEntryCityName\(entry\)[\s\S]*?'En tránsito'/);
  assert.match(app, /cities\.unshift\(\{ value: BLOG_TRANSIT_CITY_VALUE, label: 'En tránsito' \}\)/);
  assert.match(app, /cityValue === BLOG_TRANSIT_CITY_VALUE \? entry\.enTransito === true/);
  assert.match(app, /renderBlogCities\(entry\.enTransito === true \? BLOG_TRANSIT_CITY_VALUE : entry\.ciudadId\)/);
  assert.match(app, /missingEntryCity = entries\.filter\(entry => !entry\.ciudadId && entry\.enTransito !== true\)/);
  assert.match(app, /function blogDayHeading\(date, entries = \[\]\)[\s\S]*entries\.map\(blogEntryCityName\)/);
  assert.match(app, /<td>\$\{escapeHtml\(blogEntryCityName\(entry\)\)\}<\/td>/);
  assert.match(app, /function blogPrintEntryHtml\(entry, options = \{\}\)[\s\S]*blogEntryCityName\(entry\)/);
  assert.match(app, /ciudad: blogEntryCityName\(entry\) === '-' \? '' : blogEntryCityName\(entry\)/);
  assert.match(help, /marcar <em>En tránsito<\/em> cuando la entrada sucede durante un desplazamiento/);
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
  assert.doesNotMatch(help, /dictado|modo No molestar/i);
});

test('la tabla del blog prioriza hora, ciudad y descripcion', () => {
  assert.match(html, /<th>Hora<\/th><th>Ciudad<\/th><th>Descripción<\/th><th>Tipo<\/th><th>País<\/th><th>Precio<\/th>/);
  assert.match(html, /class="blog-col-city"[\s\S]*?class="blog-col-description"/);
  assert.match(styles, /\.blog-col-time \{ width: 60px; \}/);
  assert.match(styles, /\.blog-col-city \{ width: 110px; \}/);
  assert.match(styles, /\.blog-col-description \{ width: 315px; \}/);
  assert.match(app, /entry\.hora \|\| '-'[\s\S]*?blogEntryCityName\(entry\)[\s\S]*?entry\.descripcion[\s\S]*?blogTypeLabel\(entry\.tipo\)[\s\S]*?entry\.paisId/);
});

test('las transferencias se muestran de antiguas a modernas', () => {
  assert.match(app, /function compareTransferenciasChronologically\(a, b\)/);
  assert.match(app, /state\.transferencias = transferencias\.sort\(compareTransferenciasChronologically\)/);
  assert.match(app, /\.sort\(compareTransferenciasChronologically\)\.forEach\(t =>/);
});
