import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, help] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('los borradores tienen almacenamiento local y restauracion generica', () => {
  assert.match(app, /const FORM_DRAFTS_KEY = 'gastos_viaje_form_drafts_v1'/);
  assert.match(app, /const FORM_DRAFT_MAX_AGE_DAYS = 30/);
  assert.match(app, /function saveFormDraft\(key, selectors/);
  assert.match(app, /function pruneExpiredFormDrafts\(\)/);
  assert.match(app, /function restoreSimpleFormDraft\(key, selectors, messageSelector\)/);
  assert.match(app, /function bindFormDraft\(key, selectors/);
  assert.match(app, /localStorage\.setItem\(FORM_DRAFTS_KEY/);
  assert.match(app, /\['file', 'button', 'submit', 'reset', 'hidden'\]\.includes\(type\)/);
  assert.match(help, /los archivos, tickets y fotos seleccionados no se guardan como borrador/);
});

test('nuevo gasto guarda borrador y lo descarta solo al cancelar o guardar', () => {
  assert.match(html, /id="add-gasto-dialog"/);
  assert.match(app, /const ADD_EXPENSE_DRAFT_FIELDS = \[/);
  assert.match(app, /'#g-fecha'/);
  assert.match(app, /'#g-importe'/);
  assert.match(app, /'#g-desc'/);
  assert.match(app, /function restoreAddExpenseDraft\(\)/);
  assert.match(app, /bindFormDraft\(addExpenseDraftKey\(\), ADD_EXPENSE_DRAFT_FIELDS\)/);
  assert.match(app, /clearFormDraft\(addExpenseDraftKey\(\)\)/);
  assert.match(app, /discardAddExpenseDraft\(\);\s+closeAddGasto\(\);/);
  assert.match(app, /Si hab.as elegido tickets o fotos, tendr.s que volver a seleccionarlos/);
});

test('blog nuevo guarda borrador por viaje y mantiene tipo de entrada', () => {
  assert.match(html, /id="blog-entry-dialog"/);
  assert.match(app, /const BLOG_ENTRY_DRAFT_FIELDS = \[/);
  assert.match(app, /function blogEntryDraftKey\(tripId = null\)/);
  assert.match(app, /scheduleFormDraftSave\(key, BLOG_ENTRY_DRAFT_FIELDS, \(\) => \(\{ type: activeBlogEntryType \}\)\)/);
  assert.match(app, /restoreBlogEntryDraft\(trip\)/);
  assert.match(app, /clearFormDraft\(blogEntryDraftKey\(trip\.id\)\)/);
  assert.match(app, /discardActiveBlogEntryDraft\(\);\s+closeBlogEntryDialog\(\);/);
});

test('configuracion guarda borradores de creacion', () => {
  assert.match(app, /const INLINE_FORM_DRAFTS = \[/);
  for (const key of ['config-lugar', 'config-viaje', 'config-moneda', 'config-cuenta', 'config-transferencia', 'config-categoria']) {
    assert.match(app, new RegExp(`key: '${key}'`));
    assert.match(app, new RegExp(`clearFormDraft\\('${key}'\\)`));
  }
  assert.match(app, /restoreInlineFormDrafts\(\)/);
  assert.match(app, /scheduleInlineFormDraft\('config-viaje'\)/);
});

test('Avanzado permite revisar y limpiar borradores guardados', () => {
  assert.match(html, /id="btn-clear-form-drafts"/);
  assert.match(html, /id="msg-form-drafts"/);
  assert.match(html, /id="form-drafts-list"/);
  assert.match(app, /function renderFormDraftStatus\(message = ''\)/);
  assert.match(app, /function clearAllFormDrafts\(\)/);
  assert.match(app, /if \(\$\(\'#btn-clear-form-drafts\'\)\) \$\(\'#btn-clear-form-drafts\'\)\.onclick = clearAllFormDrafts;/);
  assert.match(help, /Avanzado puedes ver cu.ntos borradores hay y limpiarlos manualmente/);
});
