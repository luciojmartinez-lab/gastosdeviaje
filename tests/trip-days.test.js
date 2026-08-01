import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, html, styles, help] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('Viajes muestra y suma la duración inclusiva de cada viaje', () => {
  const functionSource = app.match(/function inclusiveDateDays\(start, end\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource, 'Falta el cálculo de días inclusivos');
  const inclusiveDateDays = Function(`${functionSource}; return inclusiveDateDays;`)();

  assert.equal(inclusiveDateDays('2026-07-10', '2026-07-10'), 1);
  assert.equal(inclusiveDateDays('2026-07-10', '2026-07-12'), 3);
  assert.equal(inclusiveDateDays('2026-10-24', '2026-10-26'), 3);
  assert.equal(inclusiveDateDays('', '2026-07-12'), 0);
  assert.equal(inclusiveDateDays('2026-07-12', '2026-07-10'), 0);
  assert.match(html, /class="trip-end-col">Final<\/th><th class="trip-days-col">Días<\/th><th class="trip-daily-col" title="Media de gastos diarios"><span class="trip-daily-label-full">Media\/día<\/span><span class="trip-daily-label-mobile">M\/Día<\/span><\/th><th class="trip-total-col">/);
  assert.match(app, /let yearDays = 0;[\s\S]*?yearDays \+= days;/);
  assert.match(app, /const dailyAverage = tripDailyExpenseAverage\(total, days\)/);
  assert.match(app, /const yearDailyAverage = tripDailyExpenseAverage\(yearTotal, yearDays\)/);
  assert.match(app, /Subtotal \$\{escapeHtml\(year\)\}<\/td><td class="trip-days-col">\$\{yearDays \|\| '-'\}<\/td><td class="trip-daily-col">\$\{yearDailyAverage === null \? '-' : fmtCurrency\(yearDailyAverage, 'EUR'\)\}<\/td><td class="trip-total-col">\$\{fmtCurrency\(yearTotal, 'EUR'\)\}<\/td><td class="trip-expenses-col">\$\{yearExpenses\}/);
  assert.match(help, /Duración del viaje calculada entre Inicio y Final, contando ambos días/);
  assert.match(help, /Gasto total del viaje convertido a EUR dividido entre sus días/);
});

test('Viajes compacta fechas, media diaria y total en la anchura del móvil', () => {
  assert.match(app, /const fmtTripDate = iso => \{/);
  assert.match(app, /<span class="trip-date-compact"><span>\$\{escapeHtml\(weekday\)\}<\/span><span>\$\{day\}-\$\{month\}-\$\{year\.slice\(-2\)\}<\/span><\/span>/);
  assert.doesNotMatch(app, /trip-home-action-mobile/);
  assert.match(app, /trip-home-actions trip-actions-col"><select class="trip-home-action-select"/);
  assert.match(styles, /#tabla-viajes-home \{[\s\S]*?table-layout: fixed;/);
  assert.match(styles, /#view-viajes \.table-wrap \{\s*overflow-x: auto;/);
  assert.match(styles, /#tabla-viajes-home \{\s*width: 584px;\s*min-width: 584px;/);
  assert.match(html, /<th class="trip-total-col">[\s\S]*?<\/th><th class="trip-expenses-col">[\s\S]*?N\. Gastos/);
  assert.match(styles, /#tabla-viajes-home \.trip-actions-col \{[\s\S]*?border-left: 1px solid #dfe6f2;[\s\S]*?padding-left: 8px;/);
  assert.doesNotMatch(styles, /#tabla-viajes-home \.trip-expenses-col,[\s\S]*?#tabla-viajes-home \.trip-actions-col \{\s*display: none;/);
  assert.match(styles, /#tabla-viajes-home \.trip-daily-col,[\s\S]*?#tabla-viajes-home \.trip-total-col,[\s\S]*?white-space: nowrap;/);
  assert.match(help, /En móvil, Inicio y Final se muestran en dos líneas/);
  assert.match(help, /N\. Gastos<\/em> queda justo detrás del total/);
  assert.match(help, /No se oculta ninguna columna/);
});

test('la media diaria divide el gasto EUR entre los días del viaje', () => {
  const functionSource = app.match(/function tripDailyExpenseAverage\(totalEur, days\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource, 'Falta el cálculo de media diaria');
  const tripDailyExpenseAverage = Function(`${functionSource}; return tripDailyExpenseAverage;`)();

  assert.equal(tripDailyExpenseAverage(300, 3), 100);
  assert.equal(tripDailyExpenseAverage(0, 4), 0);
  assert.equal(tripDailyExpenseAverage(100, 0), null);
});
