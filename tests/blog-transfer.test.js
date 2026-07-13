import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8')
]);

test('al reemplazar un gasto existente en el blog permite conservar o reemplazar fecha y hora', () => {
  assert.match(html, /id="expense-blog-replace-dialog"/);
  assert.match(html, /id="expense-blog-replace-keep"/);
  assert.match(html, /id="expense-blog-replace-all"/);
  assert.match(html, /No aceptar/);
  assert.match(app, /function chooseExpenseBlogReplacement\(\)/);
  assert.match(app, /finish\('keep-date'\)/);
  assert.match(app, /finish\('replace-all'\)/);
  assert.match(app, /replacementMode === 'keep-date' \? existing\.fecha : gasto\.fecha \|\| currentLocalDate\(\)/);
  assert.match(app, /replacementMode === 'keep-date' \? existing\.hora : expenseBlogTime\(gasto\)/);
});

test('las transferencias se muestran de antiguas a modernas', () => {
  assert.match(app, /function compareTransferenciasChronologically\(a, b\)/);
  assert.match(app, /state\.transferencias = transferencias\.sort\(compareTransferenciasChronologically\)/);
  assert.match(app, /\.sort\(compareTransferenciasChronologically\)\.forEach\(t =>/);
});
