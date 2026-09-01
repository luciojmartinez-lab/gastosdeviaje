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

test('los desgloses y sus subtotales muestran las divisas originales además del total EUR', () => {
  assert.match(app, /formatForeignCurrencyTotals\(currencies\)/);
  assert.match(app, /Subtotal categoría'[\s\S]*?catRow\.currencies/);
  assert.match(app, /formatForeignCurrencyTotals\(totalsByCurrency, ''\)/);
  assert.match(app, /accountSpentCurrencies[\s\S]*?formatForeignCurrencyTotals\(accountSpentCurrencies, ''\)/);

  const functionStart = app.indexOf('function addCurrencyTotal');
  const functionEnd = app.indexOf('function byName', functionStart);
  const context = {
    numberValue: value => Number(value) || 0,
    fmtCurrency: (amount, currency) => `${Number(amount).toFixed(2)} ${currency}`
  };
  vm.runInNewContext(`${app.slice(functionStart, functionEnd)}; this.addCurrencyTotal = addCurrencyTotal; this.formatForeignCurrencyTotals = formatForeignCurrencyTotals;`, context);
  const totals = {};
  context.addCurrencyTotal(totals, 'JPY', 2481);
  context.addCurrencyTotal(totals, 'KRW', 12500);
  context.addCurrencyTotal(totals, 'EUR', 30);
  const formatted = context.formatForeignCurrencyTotals(totals);
  assert.match(formatted, /2481\.00 JPY/);
  assert.match(formatted, /12500\.00 KRW/);
  assert.doesNotMatch(formatted, /30\.00 EUR/);
});

test('el desglose oculta subcategoría en Categorías y Original cuando todo está en EUR', () => {
  const initialTable = html.match(/<table id="tabla-cat"[\s\S]*?<\/table>/)?.[0] || '';
  assert.match(initialTable, /class="without-secondary without-original"/);
  assert.match(initialTable, /<th class="breakdown-primary">Categoría<\/th><th class="breakdown-eur"[^>]*>EUR<\/th><th class="breakdown-percent"[^>]*>%<\/th>/);
  assert.doesNotMatch(initialTable, /Subcategoría|>Original</);
  assert.match(app, /showSecondBreakdownColumn = breakdownMode !== 'categorias'/);
  assert.match(app, /originalCurrencyTotalMarkup = formatForeignCurrencyTotals\(totalsByCurrency, ''\)/);
  assert.match(app, /showOriginalBreakdownColumn = Boolean\(originalCurrencyTotalMarkup\)/);
  assert.match(app, /if \(showSecondBreakdownColumn\) cells\.push/);
  assert.match(app, /if \(showOriginalBreakdownColumn\) cells\.push/);
  assert.match(styles, /#tabla-cat\.without-secondary\.without-original \{\s*min-width: 360px;/);
});

test('un viaje puede usar cuentas de varias monedas y cada cuenta fija la moneda del gasto', () => {
  assert.match(app, /function accountsForGastoTrip\(viajeId\)[\s\S]*Number\(c\.viajeId\) === tripId/);
  assert.match(app, /\$\('#g-cuenta'\)\.onchange[\s\S]*\$\('#g-moneda'\)\.value = account\.moneda/);
  assert.match(app, /La moneda del gasto debe coincidir con la cuenta/);
  assert.match(styles, /#tabla-cat \{[\s\S]*?width: max-content;[\s\S]*?min-width: 680px;[\s\S]*?table-layout: auto/);
  assert.match(styles, /#tabla-cuenta \{[\s\S]*?width: max-content;[\s\S]*?min-width: 860px;[\s\S]*?table-layout: auto/);
});

test('las cuentas se distinguen por código y símbolo de moneda en vez de repetir el viaje', () => {
  const functionStart = app.indexOf('function currencySymbol');
  const functionEnd = app.indexOf('function accountKey', functionStart);
  const context = { Intl };
  vm.runInNewContext(`${app.slice(functionStart, functionEnd)}; this.accountLabel = accountLabel; this.accountChartLabel = accountChartLabel;`, context);
  assert.equal(context.accountLabel({ nombre: 'Revolut', moneda: 'JPY', viajeId: 7 }), 'Revolut · JPY (¥)');
  assert.equal(context.accountLabel({ nombre: 'Efectivo', moneda: 'KRW', viajeId: 7 }), 'Efectivo · KRW (₩)');
  assert.equal(context.accountChartLabel({ nombre: 'Santander', moneda: 'EUR' }), 'Santander · €');
  assert.match(app, /accountsForGastoTrip\(tripId\)\.map\(c => \(\{ value: String\(c\.id\), label: accountLabel\(c\) \}\)\)/);
  assert.match(app, /chartLabel: accountChartLabel\(matrix \|\| account\)/);
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
  assert.match(app, /row\.saldoEur \+= toEur\(account\.saldoActual, account\.moneda\)/);
  assert.match(app, /data-label="Gastado"[\s\S]*?data-label="% gastos"[\s\S]*?data-label="Saldo"[\s\S]*?data-label="% saldo"[\s\S]*?data-label="EUR"/);
  assert.match(app, /label: row\.chartLabel/);
  assert.match(app, /account-label-mobile[^>]*>\$\{escapeHtml\(row\.chartLabel\)\}/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?#tabla-cuenta \{[\s\S]*?display: table;[\s\S]*?width: max-content;[\s\S]*?table-layout: auto/);
  assert.match(styles, /#tabla-cuenta \{[\s\S]*?font-size: 13px/);
  assert.match(styles, /#tabla-cuenta th \{[\s\S]*?font-size: 13px;[\s\S]*?text-align: center;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(n\) \{ text-align: center; \}/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(1\),[\s\S]*?#tabla-cuenta td:nth-child\(1\) \{ min-width: 160px;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(2\),[\s\S]*?#tabla-cuenta td:nth-child\(2\) \{ min-width: 76px;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(7\),[\s\S]*?#tabla-cuenta td:nth-child\(7\) \{ display: table-cell; min-width: 110px;/);
  assert.match(styles, /#tabla-cuenta \.account-label-full \{[\s\S]*?display: inline;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(3\),[\s\S]*?#tabla-cuenta td:nth-child\(3\) \{ min-width: 135px;/);
  assert.match(styles, /#tabla-cuenta th:nth-child\(4\),[\s\S]*?#tabla-cuenta td:nth-child\(4\) \{ min-width: 92px; \}/);
  assert.doesNotMatch(styles, /#tabla-cuenta td:nth-child\(7\) \{ display: none;/);
  assert.match(styles, /#resumen-desglose \.table-wrap,[\s\S]*?#resumen-cuentas \.table-wrap \{[\s\S]*?overflow-x: auto/);
  const accountMobileStart = styles.indexOf('  #resumen-desglose .table-wrap,');
  const accountMobileEnd = styles.indexOf('  #tabla-cat {', accountMobileStart);
  assert.doesNotMatch(styles.slice(accountMobileStart, accountMobileEnd), /grid-template-columns/);
  assert.doesNotMatch(styles.slice(accountMobileStart, accountMobileEnd), /border-right/);
  assert.match(app, /account-label-mobile">Total<\/span>/);
});

test('varios viajes agrupan las cuentas parciales por su matriz global', () => {
  const start = app.indexOf('function accountMatrixFor');
  const end = app.indexOf('function accountForBackup', start);
  const context = {
    state: { cuentas: [] },
    normalizePlaceName: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    accountLabel: account => `${account.nombre} (${account.viajeId || 'global'})`,
    accountChartLabel: account => `${account.nombre} · ${account.moneda === 'EUR' ? '€' : account.moneda}`,
    toEur: (value, currency) => Number(value) * (currency === 'PLN' ? 0.25 : 1),
    fromEur: (value, currency) => Number(value) / (currency === 'PLN' ? 0.25 : 1)
  };
  vm.runInNewContext(`${app.slice(start, end)}; this.accountMatrixFor = accountMatrixFor; this.summaryAccountRows = summaryAccountRows;`, context);
  const matrices = [
    { id: 1, nombre: 'Santander', moneda: 'EUR', viajeId: null },
    { id: 2, nombre: 'Efectivo', moneda: 'EUR', viajeId: null },
    { id: 3, nombre: 'Revolut', moneda: 'EUR', viajeId: null }
  ];
  const parciales = [
    { id: 11, nombre: 'Santander', moneda: 'EUR', viajeId: 101, saldoActual: 100 },
    { id: 12, nombre: 'Santander', moneda: 'EUR', viajeId: 102, saldoActual: 200 },
    { id: 21, nombre: 'Efectivo Polonia', moneda: 'PLN', viajeId: 101, saldoActual: 400 },
    { id: 31, nombre: 'Revolut', moneda: 'EUR', viajeId: 101, saldoActual: 50 },
    { id: 32, nombre: 'Revolut Polonia', moneda: 'PLN', viajeId: 102, saldoActual: 200 }
  ];
  context.state.cuentas = [...matrices, ...parciales];
  const gastos = [
    { cuentaId: 11, importe: 10, moneda: 'EUR' },
    { cuentaId: 12, importe: 20, moneda: 'EUR' },
    { cuentaId: 21, importe: 40, moneda: 'PLN' },
    { cuentaId: 31, importe: 30, moneda: 'EUR' },
    { cuentaId: 32, importe: 80, moneda: 'PLN' }
  ];

  const rows = context.summaryAccountRows(parciales, gastos, true);
  assert.equal(JSON.stringify(rows.map(row => row.chartLabel).sort()), JSON.stringify(['Efectivo · €', 'Revolut · €', 'Santander · €']));
  assert.equal(rows.find(row => row.chartLabel === 'Santander · €').totalEur, 30);
  assert.equal(rows.find(row => row.chartLabel === 'Santander · €').saldoEur, 300);
  assert.equal(rows.find(row => row.chartLabel === 'Revolut · €').totalEur, 50);
  assert.equal(rows.find(row => row.chartLabel === 'Revolut · €').saldoEur, 100);
  assert.equal(rows.find(row => row.chartLabel === 'Efectivo · €').totalEur, 10);
  assert.match(app, /aggregateByMatrix = !cta && selectedAccountTripIds\.size !== 1/);
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
