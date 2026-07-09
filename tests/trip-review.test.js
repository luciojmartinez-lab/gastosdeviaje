import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, styles, help] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('Revisar viaje tiene diÃ¡logo y acceso desde Viajes', () => {
  assert.match(html, /<dialog id="trip-review-dialog"/);
  assert.match(html, /id="trip-review-body"/);
  assert.match(app, /data-review-trip="\$\{v\.id\}"/);
  assert.match(app, /<option value="review">Revisar viaje<\/option>/);
  assert.match(app, /openTripReviewDialog\(tripReviewButton\.dataset\.reviewTrip\)/);
  assert.match(app, /if \(action === 'review'\) \{\s+openTripReviewDialog\(trip\.id\);/);
});

test('Revisar viaje evalÃºa los bloques clave sin modificar datos', () => {
  assert.match(app, /function buildTripReview\(trip\)/);
  assert.match(app, /title: 'Datos b.sicos'/);
  assert.match(app, /title: 'Gastos'/);
  assert.match(app, /title: 'Blog'/);
  assert.match(app, /title: 'Mapa'/);
  assert.match(app, /title: 'Documentos y copia'/);
  assert.match(app, /title: 'Backup'/);
  assert.match(app, /No modifica ning.n dato/);
  assert.match(app, /ciudad.*sin coordenadas|ciudad.+coordenadas/s);
});

test('Revisar viaje tiene estilos y ayuda', () => {
  assert.match(styles, /\.trip-review-modal/);
  assert.match(styles, /\.trip-review-summary/);
  assert.match(styles, /\.trip-review-list li\.warning/);
  assert.match(styles, /\.trip-review-list li\.error/);
  assert.match(help, /Revisar viaje abre un informe r.pido/);
});
