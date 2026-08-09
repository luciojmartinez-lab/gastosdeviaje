import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const [app, html, styles, help, pkg] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8')
]);

test('Google Lens recibe el archivo real del ticket sin servicios de pago', async () => {
  assert.match(html, /id="g-ticket-translate"[^>]*>Leer con Google Lens/);
  assert.match(html, /id="edit-gasto-ticket-translate"[^>]*>Leer con Google Lens/);
  assert.match(html, /id="image-viewer-share"[^>]*>Compartir \/ Google Lens/);
  assert.match(app, /const shareData = \{ files: \[file\] \}/);
  assert.match(app, /await navigator\.share\(shareData\)/);
  const translateFlow = app.slice(app.indexOf('async function translateExpenseTicket'), app.indexOf('function ticketLink'));
  assert.match(translateFlow, /openImageViewer\(/);
  assert.doesNotMatch(translateFlow, /fetch\(|sourceText|OPENAI/);
  assert.doesNotMatch(pkg, /"openai"/);
  await assert.rejects(access(new URL('../netlify/functions/translate-ticket.js', import.meta.url)));
});

test('tickets, traducciones y fotos se amplían y pueden compartirse', () => {
  for (const id of ['image-viewer-dialog', 'image-viewer-image', 'image-viewer-share']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /function openImageViewer\(record, title = ''\)/);
  assert.match(app, /function openTicket\(gastoId\)[\s\S]*?openImageViewer\(image/);
  assert.match(app, /function openExpenseImage\(gastoId, imageIndex\)[\s\S]*?openImageViewer\(image/);
  assert.match(app, /data-open-shared-image/);
  assert.match(app, /data-open-pending-expense-image/);
  assert.match(html, /id="blog-image-preview"[^>]*role="button"[^>]*tabindex="0"/);
  assert.match(app, /data-open-blog-gallery-image/);
  assert.match(app, /function openBlogGalleryImage\(index = 0\)/);
});

test('al importar se elige ticket, traducción, segundo ticket o foto asociada', () => {
  assert.match(html, /id="shared-images-kind"[\s\S]*?value="ticket"[\s\S]*?value="photo"/);
  assert.match(html, /id="shared-images-ticket-action"[\s\S]*?value="replace"[\s\S]*?value="translation"[\s\S]*?value="secondary"/);
  assert.match(app, /async function routeSharedExpenseImages\(prefix, files, kind, action = 'replace', options = \{\}\)/);
  assert.match(app, /kind: kind === 'secondary' \? 'secondary-ticket' : 'translation'/);
  assert.match(app, /assignSharedFilesToInput\(\$\(`#\$\{prefix\}-ticket`\), \[first\]\)/);
  assert.match(app, /assignSharedFilesToInput\(\$\(`#\$\{prefix\}-extra-images`\), files\)/);
});

test('la imagen compañera se guarda y aparece junto al ticket original', () => {
  for (const id of [
    'g-ticket-translation-preview',
    'edit-gasto-ticket-new-translation-preview',
    'edit-gasto-ticket-translation-preview'
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(styles, /\.expense-ticket-preview-pair \{[\s\S]*?grid-template-columns: repeat\(2/);
  assert.match(app, /ticketTranslationKind: record\?\.kind === 'secondary-ticket'/);
  assert.match(app, /next\.ticketTranslationRef = await addAttachment/);
  assert.match(app, /ticketTranslationData: gasto\.ticketTranslationRef \?/);
  const blogImages = app.slice(app.indexOf('async function expenseBlogImages'), app.indexOf('const numberValue', app.indexOf('async function expenseBlogImages')));
  assert.ok(blogImages.indexOf('translationImage') < blogImages.indexOf('ticketImage ='));
  assert.ok(blogImages.indexOf('images.unshift(normalizeBlogImageRecord(translationImage))') < blogImages.indexOf('images.unshift(ticketImage)'));
});

test('Lens vuelve al gasto abierto sin guardarlo ni recargar la aplicación', () => {
  assert.match(app, /function activeSharedExpenseFormTarget/);
  assert.match(app, /Gasto abierto sin guardar/);
  assert.match(app, /value: `current:\$\{prefix\}`/);
  assert.match(app, /destination === 'expense-existing' && currentExpenseTarget[\s\S]*?routeSharedExpenseImages\([\s\S]*?currentExpenseTarget\.prefix/);
  assert.match(app, /await rememberLensReturnTarget\(prefix, \{ \.\.\.source, source: blob \}\)/);
  assert.match(app, /for \(const storage of \[sessionStorage, localStorage\]\)/);
  assert.match(app, /storage\.setItem\(LENS_RETURN_TARGET_KEY/);
  assert.match(app, /saveFormDraft\(addExpenseDraftKey\(\), ADD_EXPENSE_DRAFT_FIELDS, \{ lensReturn: true \}\)/);
  assert.match(app, /cache\.put\(target\.sourceUrl/);
  assert.match(app, /restoreLensExpenseFormTarget/);
  assert.match(app, /restoreLensTicketSource/);
  assert.match(app, /payload\.fromLens[\s\S]*?'expense-existing'/);
});

test('el resultado de Lens sustituye los datos reconocidos tanto en texto como en imagen', () => {
  assert.match(app, /secondaryOption\.hidden = lensResult/);
  assert.match(app, /if \(lensResult && actionSelect\) actionSelect\.value = 'translation'/);
  assert.match(app, /async function readLensTicketTranslation/);
  assert.match(app, /languages: \['spa'\]/);
  assert.match(app, /replaceExisting: true/);
  assert.match(app, /preferLargeTitle: true/);
  assert.match(app, /async function readLensTicketText/);
  assert.match(app, /ocr\.extractTicketFields\(sourceText\)/);
  assert.match(app, /payload\.fromLens && sharedText && !hasImages && currentFormTarget/);
  assert.match(app, /const preserveExisting = !options\.replaceExisting/);
  assert.match(app, /await readLensTicketTranslation\(prefix, companion\)/);
  assert.match(app, /preserveDescription: true/);
  assert.match(app, /options\.preserveDescription && field === 'desc'/);
  assert.match(app, /cleanLensSharedText/);
});

test('Lens en español usa los datos sin crear un segundo ticket', () => {
  assert.match(app, /function lensTicketSourceLanguage\(prefix\)/);
  assert.match(app, /spanishSource: sourceLanguage\.spanish/);
  assert.match(app, /payload\.lensSpanishOnly = Boolean/);
  assert.match(app, /options\.fromLens && options\.spanishOnly/);
  const spanishRoute = app.slice(
    app.indexOf('if (options.fromLens && options.spanishOnly)'),
    app.indexOf("if (action === 'translation'", app.indexOf('if (options.fromLens && options.spanishOnly)'))
  );
  assert.match(spanishRoute, /readLensTicket/);
  assert.doesNotMatch(spanishRoute, /pendingExpenseTicketTranslations/);
});

test('la ayuda explica el flujo gratuito con Lens y el regreso a la aplicación', () => {
  assert.match(help, /id="traducir-ticket"/);
  assert.match(help, /Google Lens/);
  assert.match(help, /gratuit/i);
  assert.match(help, /español|otro idioma/);
  assert.match(help, /no llama a OpenAI ni a otra API de pago/);
});
