import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, html, styles, help, translationFunction, pkg] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../netlify/functions/translate-ticket.js', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8')
]);

test('el ticket puede traducirse al español sin enviar la fotografía', () => {
  assert.match(html, /id="g-ticket-translate"[^>]*>Traducir al español/);
  assert.match(html, /id="edit-gasto-ticket-translate"[^>]*>Traducir al español/);
  assert.match(html, /Solo se envía el texto leído, nunca la fotografía/);
  assert.match(app, /fetch\(TICKET_TRANSLATION_ENDPOINT,[\s\S]*?text: sourceText,[\s\S]*?sourceLanguages/);
  assert.doesNotMatch(app.slice(app.indexOf('async function translateExpenseTicket'), app.indexOf('function ticketLink')), /ticketData|source\.source/);
  assert.match(translationFunction, /const model = 'gpt-5\.4-nano'/);
  assert.match(translationFunction, /Netlify\.env\.get\('OPENAI_API_KEY'\)/);
  assert.match(translationFunction, /Netlify\.env\.get\('OPENAI_BASE_URL'\)/);
  assert.match(translationFunction, /path: '\/api\/translate-ticket'/);
  assert.match(translationFunction, /rateLimit:[\s\S]*?windowLimit: 6/);
  assert.match(pkg, /"openai": "\^7\.3\.0"/);
});

test('la traducción aparece como segunda imagen junto al ticket', () => {
  for (const id of [
    'g-ticket-translation-preview',
    'edit-gasto-ticket-new-translation-preview',
    'edit-gasto-ticket-translation-preview'
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(styles, /\.expense-ticket-preview-pair \{[\s\S]*?grid-template-columns: repeat\(2/);
  assert.match(app, /async function createTicketTranslationImage\(translation, sourceLanguages\)/);
  assert.match(app, /TRADUCCIÓN AL ESPAÑOL/);
  assert.match(app, /function renderExpenseTicketTranslation\(prefix\)/);
});

test('la traducción se guarda, se restaura y pasa al Blog tras el original', () => {
  assert.match(app, /ticketTranslationData: normalizeTicketDataValue\(ticketTranslationData\)/);
  assert.match(app, /next\.ticketTranslationRef = await addAttachment/);
  assert.match(app, /ticketTranslationData: gasto\.ticketTranslationRef \?/);
  assert.match(app, /cloudFormat: 7/);
  const blogImages = app.slice(app.indexOf('async function expenseBlogImages'), app.indexOf('const numberValue', app.indexOf('async function expenseBlogImages')));
  assert.ok(blogImages.indexOf('translationImage') < blogImages.indexOf('ticketImage ='));
  assert.ok(blogImages.indexOf('images.unshift(normalizeBlogImageRecord(translationImage))') < blogImages.indexOf('images.unshift(ticketImage)'));
  assert.match(app, /data-open-ticket-translation/);
});

test('la ayuda explica el resultado, la conexión y el trabajo local', () => {
  assert.match(help, /id="traducir-ticket"/);
  assert.match(help, /crea una segunda imagen blanca con la traducción/);
  assert.match(help, /solo se envía el texto reconocido, nunca la fotografía/);
  assert.match(help, /Sin conexión, el original permanece disponible/);
});
