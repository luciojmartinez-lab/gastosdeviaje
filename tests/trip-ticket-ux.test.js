import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [app, html, styles, ticketOcr] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ticket-ocr.js', import.meta.url), 'utf8')
]);

test('los viajes se editan con doble clic desde ambas tablas', () => {
  assert.match(app, /tr\.dataset\.tripId = String\(v\.id\)/);
  assert.match(app, /#tabla-viajes-home \.trip-row\[data-trip-id\], #tabla-viajes \.trip-row\[data-trip-id\]/);
  assert.match(app, /handleTripConfigAction\(tripRow\.dataset\.tripId, 'edit'\)/);
});

test('los elementos editables de Configuración se abren con doble clic', () => {
  for (const type of ['cuenta', 'moneda', 'categoria', 'lugar', 'foto']) {
    assert.match(app, new RegExp(`data-editable-type=["']${type}["']|editableType = '${type}'`));
  }
  assert.match(app, /target\.closest\('\[data-editable-type\]\[data-editable-id\]'\)/);
  assert.match(app, /editButton\.click\(\)/);
  assert.match(styles, /\[data-editable-type\]\[data-editable-id\] \{[\s\S]*?cursor: pointer/);
});

test('una foto nueva de ticket muestra vista previa, gira y guarda esa versión', () => {
  for (const prefix of ['g', 'edit-gasto']) {
    assert.match(html, new RegExp(`id="${prefix}-ticket-new-preview"`));
    assert.match(html, new RegExp(`data-selected-ticket-rotate="${prefix}"`));
  }
  assert.match(styles, /\.selected-expense-ticket-preview img[\s\S]*?object-fit: contain/);
  assert.match(app, /const pendingExpenseTicketPreviews = \{ g: null, 'edit-gasto': null \}/);
  assert.match(app, /async function rotateSelectedExpenseTicket\(prefix, direction\)/);
  assert.match(app, /pendingExpenseTicketPreviews\[prefix\] = await rotateRasterImageRecord/);
  assert.match(app, /const ticket = await readSelectedExpenseTicket\('g'\)/);
  assert.match(app, /const ticket = await readSelectedExpenseTicket\('edit-gasto'\)/);
});

test('el lector local queda fijo en español e inglés y los tickets extranjeros pasan por Lens', () => {
  assert.doesNotMatch(html, /config-ticket-ocr|ticket-ocr-language-list|g-ticket-language|edit-gasto-ticket-language/);
  assert.match(app, /const TICKET_OCR_BASE_LANGUAGES = TICKET_OCR_LANGUAGES\.map/);
  assert.match(app, /function ticketOcrLanguagesForExpense\(\) \{[\s\S]*?return TICKET_OCR_BASE_LANGUAGES\.slice\(\)/);
  assert.match(app, /languages: TICKET_OCR_BASE_LANGUAGES/);
  assert.match(app, /record\.sourceLanguages = TICKET_OCR_BASE_LANGUAGES\.slice\(\)/);
  assert.doesNotMatch(app, /ticketOcrLanguagesForTrip|handleExpenseTicketLanguageChange|saveTicketOcrLanguageSettings/);
  assert.match(app, /caches\.open\(TICKET_OCR_LANGUAGE_CACHE\)/);
  assert.match(html, /Modo 1 · Traducción normal/);
  assert.match(html, /Modo 2 · Lectura con IA/);
});

test('la foto del ticket se reduce antes del OCR y sus metadatos se leen una sola vez', () => {
  assert.match(app, /const imageMetadataPromiseCache = new WeakMap\(\)/);
  assert.match(app, /const buffer = await file\.arrayBuffer\(\)[\s\S]*?extractImageGpsFromArrayBuffer\(buffer\)[\s\S]*?extractImageDateTimeFromArrayBuffer\(buffer\)/);
  assert.match(app, /const \{ point, captured \} = await readImageMetadataForFile\(selectedFile\)[\s\S]*?compressBlogImage\(selectedFile, \{ skipMetadata: true \}\)/);
  assert.match(app, /await pendingSelection[\s\S]*?recognizeExpenseTicketSource\(prefix, source/);
  assert.match(app, /#g-ticket-camera'\)\.onclick = \(\) => saveFormDraft\(addExpenseDraftKey\(\), ADD_EXPENSE_DRAFT_FIELDS\)/);
});

test('el lector local puede recuperarse si el trabajador tarda demasiado', () => {
  assert.match(ticketOcr, /const OCR_WORKER_START_TIMEOUT_MS = 45_000/);
  assert.match(ticketOcr, /export function resetTicketOcrWorker\(\)/);
  assert.match(ticketOcr, /El lector local ha tardado demasiado en iniciarse/);
  assert.doesNotMatch(ticketOcr, /const worker = await previousWorker/);
});
