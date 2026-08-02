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
  assert.match(html, /id="g-ticket-translate"[^>]*>Traducir con Google Lens/);
  assert.match(html, /id="edit-gasto-ticket-translate"[^>]*>Traducir con Google Lens/);
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
});

test('al importar se elige ticket, traducción, segundo ticket o foto asociada', () => {
  assert.match(html, /id="shared-images-kind"[\s\S]*?value="ticket"[\s\S]*?value="photo"/);
  assert.match(html, /id="shared-images-ticket-action"[\s\S]*?value="replace"[\s\S]*?value="translation"[\s\S]*?value="secondary"/);
  assert.match(app, /async function routeSharedExpenseImages\(prefix, files, kind, action = 'replace'\)/);
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

test('la ayuda explica el flujo gratuito con Lens y el regreso a la aplicación', () => {
  assert.match(help, /id="traducir-ticket"/);
  assert.match(help, /Google Lens/);
  assert.match(help, /gratuit/i);
  assert.match(help, /traducci[oó]n|segundo ticket/);
});
