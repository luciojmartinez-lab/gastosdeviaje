import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [app, html, styles] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

test('los viajes se editan con doble clic desde ambas tablas', () => {
  assert.match(app, /tr\.dataset\.tripId = String\(v\.id\)/);
  assert.match(app, /#tabla-viajes-home \.trip-row\[data-trip-id\], #tabla-viajes \.trip-row\[data-trip-id\]/);
  assert.match(app, /handleTripConfigAction\(tripRow\.dataset\.tripId, 'edit'\)/);
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

test('los idiomas de tickets son configurables y se preparan por país del viaje', async () => {
  assert.match(html, /id="config-ticket-ocr"/);
  assert.match(html, /id="ticket-ocr-language-list"/);
  assert.match(app, /const TICKET_OCR_COUNTRY_ALIASES = \{/);
  assert.match(app, /pol: \['polonia', 'poland', 'polska'\]/);
  assert.match(app, /jpn: \['japon', 'japan', 'nippon'\]/);
  assert.match(app, /kor: \['corea', 'corea del sur'/);
  assert.match(app, /warmTicketOcrLanguagesForTrip\(newTripId\)/);
  assert.match(app, /caches\.open\(TICKET_OCR_LANGUAGE_CACHE\)/);
  for (const code of ['spa', 'cat', 'eng', 'fin', 'pol', 'fra', 'deu', 'ita', 'por', 'nld', 'jpn', 'kor']) {
    const file = new URL(`../vendor/tesseract/lang/${code}.traineddata.gz`, import.meta.url);
    await access(file);
    assert.ok((await stat(file)).size > 100_000, `${code} no contiene un paquete OCR válido`);
  }
});
