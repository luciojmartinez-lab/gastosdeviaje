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

test('el resumen de cuentas muestra saldo y cabe como tarjetas en móvil', () => {
  assert.match(html, /<th>Gastado<\/th><th>Saldo<\/th><th>EUR<\/th>/);
  assert.match(app, /saldo: numberValue\(c\.saldoActual\)/);
  assert.match(app, /data-label="Gastado"[\s\S]*?data-label="Saldo"[\s\S]*?data-label="EUR"/);
  assert.match(app, /label: row\.chartLabel/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?#tabla-cuenta tr \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /#tabla-cuenta td::before \{[\s\S]*?content: attr\(data-label\)/);
});
