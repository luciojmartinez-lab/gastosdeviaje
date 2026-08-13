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

test('el resumen de cuentas conserva una tabla y muestra hasta saldo en móvil', () => {
  assert.match(html, /<th>Gastado<\/th><th>Saldo<\/th><th>EUR<\/th>/);
  assert.match(app, /saldo: numberValue\(c\.saldoActual\)/);
  assert.match(app, /data-label="Gastado"[\s\S]*?data-label="Saldo"[\s\S]*?data-label="EUR"/);
  assert.match(app, /label: row\.chartLabel/);
  assert.match(app, /account-label-mobile[^>]*>\$\{escapeHtml\(row\.chartLabel\)\}/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?#tabla-cuenta \{[\s\S]*?display: table;[\s\S]*?width: 621px;[\s\S]*?table-layout: fixed/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(1\),[\s\S]*?#tabla-cuenta td:nth-child\(1\) \{ width: 92px;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(2\),[\s\S]*?#tabla-cuenta td:nth-child\(2\) \{ width: 66px;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(3\),[\s\S]*?#tabla-cuenta td:nth-child\(3\) \{ width: 72px;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(4\),[\s\S]*?#tabla-cuenta td:nth-child\(4\) \{ width: 72px; \}/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(8\),[\s\S]*?#tabla-cuenta td:nth-child\(8\) \{ width: 64px; \}/);
  assert.match(styles, /#resumen-cuentas \.table-wrap \{[\s\S]*?overflow-x: auto/);
  const accountMobileStart = styles.indexOf('  #resumen-cuentas .table-wrap {');
  const accountMobileEnd = styles.indexOf('  #tabla-cat {', accountMobileStart);
  assert.doesNotMatch(styles.slice(accountMobileStart, accountMobileEnd), /grid-template-columns/);
  assert.doesNotMatch(styles.slice(accountMobileStart, accountMobileEnd), /border-right/);
});

test('presupuesto de viaje, límite de cuenta y saldo son conceptos separados', () => {
  assert.match(html, /<th>Límite<\/th><th>Disponible<\/th>/);
  assert.match(app, /return Math\.max\(0, numberValue\(viaje && viaje\.presupuesto\)\)/);
  assert.match(app, /remainingEur = budget \? budgetEur - spentEur : null/);
  assert.match(app, /las transferencias no son gastos/);
  assert.doesNotMatch(app, /budgetEur - spentEur - netTransferOutEur/);
  assert.doesNotMatch(app, /Total \/ presupuesto del viaje/);
});

test('el total de límites solo agrega cuentas que tienen límite', () => {
  const start = app.indexOf('function accountLimitTotals');
  const end = app.indexOf('function selectedTrips()', start);
  const context = { numberValue: value => Number(value) || 0 };
  vm.runInNewContext(`${app.slice(start, end)}; this.accountLimitTotals = accountLimitTotals;`, context);

  const totals = context.accountLimitTotals([
    { totalEur: 184.97, saldoEur: 120.12, presupuestoEur: 0 },
    { totalEur: 114.18, saldoEur: 545.82, presupuestoEur: 1000 },
    { totalEur: 50.39, saldoEur: 32.13, presupuestoEur: 0 }
  ]);

  assert.equal(totals.spentEur, 114.18);
  assert.equal(totals.balanceEur, 545.82);
  assert.equal(totals.budgetEur, 1000);
  assert.ok(Math.abs(totals.remainingEur - 885.82) < 0.000001);
  assert.equal(totals.pct, 11.418);
  assert.doesNotMatch(app, /accountBudgetEur \? accountBudgetEur - totalEur/);
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
