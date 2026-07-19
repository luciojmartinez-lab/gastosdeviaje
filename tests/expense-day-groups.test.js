import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, styles, help] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('Gastos en vista Tabla agrupa y pliega los movimientos por día', () => {
  assert.match(app, /let openExpenseGroups = new Set\(\)/);
  assert.match(app, /function expenseGroupKey\(expense\)[\s\S]*expense\.fecha[\s\S]*expense\.viajeId/);
  assert.match(app, /function syncOpenExpenseGroups\(groupKeys\)[\s\S]*new Set\(groupKeys\.length \? \[groupKeys\[groupKeys\.length - 1\]\] : \[\]\)/);
  assert.match(app, /const tableView = [\s\S]*=== 'table'/);
  assert.match(app, /class="expense-day-toggle" data-expense-group-toggle=/);
  assert.match(app, /aria-expanded="\$\{isOpen\}"/);
  assert.match(app, /tr\.dataset\.expenseGroupEntry = key;[\s\S]*tr\.hidden = !isOpen/);
  assert.match(app, /subtotal\.dataset\.expenseGroupEntry = key;[\s\S]*subtotal\.hidden = !isOpen/);
  assert.match(app, /target\.closest\('\[data-expense-group-toggle\]'\)[\s\S]*openExpenseGroups\.delete\(key\)[\s\S]*openExpenseGroups\.add\(key\)/);
  assert.match(styles, /\.expense-day-row td/);
  assert.match(styles, /\.expense-day-toggle/);
  assert.match(styles, /#tabla-gastos \.expense-row\[hidden\][\s\S]*#tabla-gastos \.subtotal-row\[hidden\]/);
});

test('la cabecera diaria muestra la ciudad de destino y los países, no el viaje', () => {
  assert.match(app, /function gastosDestinoCiudadName\(gastos\)[\s\S]*sort\(compareExpensesChronologically\)[\s\S]*index = ordered\.length - 1/);
  assert.match(app, /const destinationCity = gastosDestinoCiudadName\(byGroup\[key\]\)/);
  assert.match(app, /destinationCity \? `<span class="group-chip city-chip">/);
  assert.doesNotMatch(app, /group-chip trip-chip/);
  assert.match(styles, /\.city-chip \{/);
  assert.match(help, /Si durante el día hay gastos en varias ciudades, se toma como destino la última ciudad registrada cronológicamente/);
});

test('Tarjetas, Último gasto, retorno e impresión no pierden movimientos plegados', () => {
  assert.match(app, /const isOpen = !tableView \|\| openExpenseGroups\.has\(key\)/);
  assert.match(app, /function setExpenseViewMode\(value\)[\s\S]*renderGastosTabla\(\)/);
  assert.match(app, /function scrollToLastExpense[\s\S]*target\.hidden && groupKey[\s\S]*openExpenseGroups\.add\(groupKey\)/);
  assert.match(app, /function restoreExpenseActionAnchor[\s\S]*row && row\.hidden && groupKey[\s\S]*openExpenseGroups\.add\(groupKey\)/);
  assert.match(app, /clone\.querySelectorAll\('\[data-expense-group-entry\]'\)\.forEach\(el => el\.removeAttribute\('hidden'\)\)/);
  assert.match(app, /clone\.querySelectorAll\('\[data-expense-group-toggle\]'\)[\s\S]*button\.replaceWith\(heading\)/);
  assert.match(help, /En <strong>Tabla<\/strong>, cada día se abre con \+ y se cierra con −/);
  assert.match(help, /La impresión incluye todos los grupos filtrados/);
});
