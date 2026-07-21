import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, help, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

test('la comparación usa exactamente dos selectores simples e independientes', () => {
  assert.match(html, /id="resumen-comparacion"[\s\S]*?id="compare-main-trip"[\s\S]*?id="compare-other-trip"/);
  assert.equal((html.match(/id="compare-(?:main|other)-trip"/g) || []).length, 2);
  assert.doesNotMatch(html, /id="compare-(?:main|other)-trip"[^>]*\bmultiple\b/);
  const selectorStart = app.indexOf('function renderTripComparisonSelectors');
  const selectorEnd = app.indexOf('function buildTripComparisonData', selectorStart);
  const selectorSource = app.slice(selectorStart, selectorEnd);
  assert.match(selectorSource, /validMainId[\s\S]*?trips\[0\]/);
  assert.match(selectorSource, /Number\(option\.value\) !== validMainId/);
  assert.doesNotMatch(selectorSource, /selectedTripIds|selectedTripSet|getTripYear\(.*===/);
});

test('el viaje principal por defecto es el terminado más recientemente y puede cambiarse', () => {
  const sortStart = app.indexOf('function sortedTripsForComparison');
  const sortEnd = app.indexOf('function comparisonTripOptionLabel', sortStart);
  const sortSource = app.slice(sortStart, sortEnd);
  assert.match(sortSource, /comparisonTripDate\(b\)\.localeCompare\(comparisonTripDate\(a\)\)/);
  assert.match(app, /#compare-main-trip'\)\.onchange = \(\) =>/);
  assert.match(app, /mainSelect\.value = String\(otherId\)[\s\S]*?otherSelect\.value = String\(mainId\)/);
});

test('la comparación admite años diferentes y distingue el año en cada opción', () => {
  assert.match(app, /return `\$\{trip\.nombre\} · \$\{year\}`/);
  assert.match(app, /const tripOptions = trips\.map\(trip =>/);
  assert.match(help, /abarcan todo el historial[\s\S]*?año distinto/);
  assert.match(help, /independientes de las casillas marcadas en Viajes/);
});

test('la diferencia se calcula como principal menos comparado y ajusta por días', () => {
  assert.match(app, /const totalDifference = main\.total - other\.total/);
  assert.match(app, /const dailyDifference = mainDaily - otherDaily/);
  assert.match(app, /const difference = category\.mainTotal - category\.otherTotal/);
  assert.match(app, /tripDailyExpenseAverage\(value, days\)/);
  assert.match(help, /viaje principal menos viaje comparado/);
});

test('las categorías despliegan subcategorías sin perder la comparación diaria', () => {
  assert.match(html, /id="tabla-comparacion-categorias"[\s\S]*?Principal\/día[\s\S]*?Comparado\/día/);
  assert.match(app, /data-comparison-category=/);
  assert.match(app, /comparison-subcategory-row/);
  assert.match(app, /openComparisonCategories\.has\(category\.key\)/);
  assert.match(styles, /\.comparison-subcategory-row > th/);
  assert.match(styles, /\.comparison-category-toggle/);
});

test('la comparacion movil cabe en el ancho y agrupa porcentaje y media diaria', () => {
  assert.match(app, /class="comparison-mobile-daily"/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?#tabla-comparacion-general,[\s\S]*?#tabla-comparacion-categorias \{[\s\S]*?min-width: 0/);
  assert.match(styles, /#tabla-comparacion-categorias th:nth-child\(n\+5\),[\s\S]*?display: none/);
  assert.match(styles, /\.comparison-mobile-daily \{[\s\S]*?display: block !important/);
  assert.match(styles, /#view-resumen \.summary-menu > h2 \{[\s\S]*?display: none/);
  assert.match(help, /En m[\s\S]*?el porcentaje y la media diaria aparecen debajo del importe/);
});
