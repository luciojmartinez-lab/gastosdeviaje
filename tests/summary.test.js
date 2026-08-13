import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [app, styles, html] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);

test('el gráfico de subcategorías incluye todas las filas del desglose', () => {
  assert.match(app, /drawPieChart\(\$\('#chart-cat'\), pieRows\.map\(/);
  assert.doesNotMatch(app, /pieRows\.slice\(0, 6\)/);
});

test('la leyenda del gráfico crece para mostrar todas las subcategorías', () => {
  const functionStart = app.indexOf('function drawPieChart');
  const functionEnd = app.indexOf('function drawBarChart', functionStart);
  const context = {
    escapeHtml: value => String(value),
    fmtCurrency: value => String(value)
  };
  vm.runInNewContext(`${app.slice(functionStart, functionEnd)}; this.drawPieChart = drawPieChart;`, context);

  const container = { innerHTML: '' };
  const data = Array.from({ length: 10 }, (_, index) => ({
    label: `Categoría · Subcategoría ${index + 1}`,
    value: index + 1
  }));
  context.drawPieChart(container, data);

  assert.match(container.innerHTML, /viewBox="0 0 360 260"/);
  assert.equal((container.innerHTML.match(/<rect /g) || []).length, 10);
  assert.match(container.innerHTML, /Subcategoría 10/);
  assert.match(styles, /#chart-cat \.chart \{\s*max-height: none;/);
});

test('el resumen de cuentas conserva una tabla y agrupa gastos y saldos con sus porcentajes', () => {
  assert.match(html, /<th>Gastado<\/th><th>% gastos<\/th><th>Saldo<\/th><th>% saldo<\/th><th>EUR<\/th>/);
  assert.match(app, /saldo: numberValue\(c\.saldoActual\)/);
  assert.match(app, /data-label="Gastado"[\s\S]*?data-label="% gastos"[\s\S]*?data-label="Saldo"[\s\S]*?data-label="% saldo"[\s\S]*?data-label="EUR"/);
  assert.match(app, /label: row\.chartLabel/);
  assert.match(app, /account-label-mobile[^>]*>\$\{escapeHtml\(row\.chartLabel\)\}/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?#tabla-cuenta \{[\s\S]*?display: table;[\s\S]*?width: 100%;[\s\S]*?table-layout: fixed/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(1\),[\s\S]*?#tabla-cuenta td:nth-child\(1\) \{ width: 18%;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(2\),[\s\S]*?#tabla-cuenta td:nth-child\(2\) \{ width: 12%;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(3\),[\s\S]*?#tabla-cuenta td:nth-child\(3\) \{ width: 19%;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(4\),[\s\S]*?#tabla-cuenta td:nth-child\(4\) \{ width: 14%; \}/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(7\),[\s\S]*?#tabla-cuenta td:nth-child\(7\) \{ display: none; \}/);
  assert.match(styles, /#resumen-cuentas \.table-wrap \{[\s\S]*?overflow-x: auto/);
  const accountMobileStart = styles.indexOf('  #resumen-cuentas .table-wrap {');
  const accountMobileEnd = styles.indexOf('  #tabla-cat {', accountMobileStart);
  assert.doesNotMatch(styles.slice(accountMobileStart, accountMobileEnd), /grid-template-columns/);
  assert.doesNotMatch(styles.slice(accountMobileStart, accountMobileEnd), /border-right/);
});

test('el presupuesto pertenece al viaje y las cuentas muestran gastos y saldos', () => {
  assert.match(html, /<th>% gastos<\/th><th>Saldo<\/th><th>% saldo<\/th>/);
  assert.match(app, /return Math\.max\(0, numberValue\(viaje && viaje\.presupuesto\)\)/);
  assert.match(app, /expensePct = percentageOfTotal\(row\.totalEur, totalEur\)/);
  assert.match(app, /balancePct = percentageOfTotal\(row\.saldoEur, accountBalanceEur\)/);
  assert.doesNotMatch(html, /Límite de gasto|Margen límite/);
  assert.doesNotMatch(app, /accountLimitTotals|Total límites|data-label="Límite"/);
});

test('los porcentajes por cuenta se calculan contra sus totales reales', () => {
  const start = app.indexOf('function percentageOfTotal');
  const end = app.indexOf('function selectedTrips()', start);
  const context = { numberValue: value => Number(value) || 0 };
  vm.runInNewContext(`${app.slice(start, end)}; this.percentageOfTotal = percentageOfTotal;`, context);

  const expenseShares = [184.97, 114.18, 50.39].map(value => context.percentageOfTotal(value, 349.54));
  const balanceShares = [120.12, 545.82, 32.13].map(value => context.percentageOfTotal(value, 698.07));
  assert.ok(Math.abs(expenseShares.reduce((sum, value) => sum + value, 0) - 100) < 0.000001);
  assert.ok(Math.abs(balanceShares.reduce((sum, value) => sum + value, 0) - 100) < 0.000001);
  assert.equal(context.percentageOfTotal(10, 0), 0);
});

test('el total de gastos se marca en rojo cuando supera el presupuesto del viaje', () => {
  assert.match(app, /isOverTripBudget = Boolean\(tripBudget && totalEur > tripBudget\.budgetEur \+ 0\.005\)/);
  assert.match(app, /classList\.toggle\('over-budget-value', isOverTripBudget\)/);
  assert.match(app, /subtotal-row\$\{isOverTripBudget \? ' over-budget-row' : ''\}/);
  assert.match(app, /summary-total-row\$\{isOverTripBudget \? ' over-budget-row' : ''\}/);
  assert.match(styles, /\.over-budget-row td \{[\s\S]*?color: #b91c1c/);
  assert.match(styles, /\.kpi \.big\.over-budget-value > div:not\(:first-child\) \{[\s\S]*?color: #b91c1c/);
});

test('las transferencias permiten detectar cuentas base y tarjetas recargables', () => {
  const start = app.indexOf('const ACCOUNT_TYPE_OPTIONS');
  const end = app.indexOf('function selectedTrips()', start);
  const context = {
    state: {
      transferencias: [{ fromId: 1, toId: 2, importeFrom: 340, importeTo: 340, monedaFrom: 'EUR', monedaTo: 'EUR' }]
    },
    toEur: value => Number(value) || 0,
    numberValue: value => Number(value) || 0,
    normalizePlaceName: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.inferredAccountType = inferredAccountType; this.effectiveTripBudget = effectiveTripBudget;`, context);
  assert.equal(context.inferredAccountType({ id: 1, nombre: 'Santander' }), 'base');
  assert.equal(context.inferredAccountType({ id: 2, nombre: 'Revolut' }), 'rechargeable');
  assert.equal(context.inferredAccountType({ id: 3, nombre: 'Efectivo' }), 'cash');
  assert.equal(context.inferredAccountType({ id: 1, nombre: 'Santander', accountType: 'standard' }), 'standard');
  assert.equal(context.effectiveTripBudget({ presupuesto: 1000 }), 1000);
  assert.equal(context.effectiveTripBudget({ presupuesto: 0 }), 0);
});
