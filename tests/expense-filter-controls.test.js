import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, app, styles, help] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('el cuadro de filtros de Gastos tiene un botón para aplicar y cerrar', () => {
  assert.match(html, /id="f-apply"[^>]*>Aplicar filtros<\/button>/);
  assert.match(html, /id="f-clear"[^>]*>Quitar filtros<\/button>/);
  assert.match(app, /function applyExpenseFilters\(\)[\s\S]*?renderGastosTabla\(\);[\s\S]*?closeFiltersPanel\(\)/);
  assert.match(app, /\$\('#f-apply'\)\.onclick = applyExpenseFilters/);
  assert.match(styles, /\.filter-actions \{[\s\S]*?display: flex/);
  assert.match(help, /<em>Aplicar filtros<\/em> confirma la selección y cierra el cuadro/);
});

test('el desplazamiento se detiene en los límites de la aplicación', () => {
  assert.match(styles, /html \{[\s\S]*?overscroll-behavior: none/);
  assert.match(styles, /body \{[\s\S]*?overscroll-behavior: none/);
  assert.match(styles, /\.filters-card\.open \{[\s\S]*?overscroll-behavior: contain/);
  assert.match(help, /se detiene en el inicio y evita el arrastre exterior/);
});
