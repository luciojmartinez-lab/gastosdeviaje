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
