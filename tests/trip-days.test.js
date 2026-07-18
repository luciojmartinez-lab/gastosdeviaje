import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, html, help] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
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
  assert.match(html, /<th>Final<\/th><th>Días<\/th><th title="Media de gastos diarios">Media\/día<\/th><th>Gastos<\/th>/);
  assert.match(app, /let yearDays = 0;[\s\S]*?yearDays \+= days;/);
  assert.match(app, /const dailyAverage = tripDailyExpenseAverage\(total, days\)/);
  assert.match(app, /const yearDailyAverage = tripDailyExpenseAverage\(yearTotal, yearDays\)/);
  assert.match(app, /Subtotal \$\{escapeHtml\(year\)\}<\/td><td>\$\{yearDays \|\| '-'\}<\/td><td>\$\{yearDailyAverage === null \? '-' : fmtCurrency\(yearDailyAverage, 'EUR'\)\}<\/td><td>\$\{yearExpenses\}/);
  assert.match(help, /Duración del viaje calculada entre Inicio y Final, contando ambos días/);
  assert.match(help, /Gasto total del viaje convertido a EUR dividido entre sus días/);
});

test('la media diaria divide el gasto EUR entre los días del viaje', () => {
  const functionSource = app.match(/function tripDailyExpenseAverage\(totalEur, days\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource, 'Falta el cálculo de media diaria');
  const tripDailyExpenseAverage = Function(`${functionSource}; return tripDailyExpenseAverage;`)();

  assert.equal(tripDailyExpenseAverage(300, 3), 100);
  assert.equal(tripDailyExpenseAverage(0, 4), 0);
  assert.equal(tripDailyExpenseAverage(100, 0), null);
});
