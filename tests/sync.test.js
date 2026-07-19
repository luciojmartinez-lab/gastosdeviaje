import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, fn, help] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../netlify/functions/travel-sync.js', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8')
]);

test('la sincronizacion guarda una marca local de ultima sync confirmada', () => {
  assert.match(app, /const SYNC_STATE_STORAGE = 'gastos_viaje_sync_state_v1'/);
  assert.match(app, /function readSyncState\(\)/);
  assert.match(app, /function recordSuccessfulSync\(direction, metadata/);
  assert.match(app, /function renderSyncLastStatus\(\)/);
  assert.match(html, /id="sync-last-status"/);
  assert.match(app, /recordSuccessfulSync\('download'/);
  assert.match(app, /recordSuccessfulSync\('upload'/);
  assert.match(app, /uploadCloudSnapshot\(\{ backupData: data, backupName: filename \}\);\s*recordSuccessfulSync\('upload'/);
  assert.match(help, /recuerda la .ltima sincronizaci.n confirmada/);
});

test('la descarga desde la nube muestra un modal de progreso hasta finalizar', () => {
  assert.match(html, /id="sync-cloud-progress-dialog"/);
  assert.match(html, /Sincronizando desde la nube/);
  assert.match(html, /No cierres la aplicación/);
  assert.match(app, /function setCloudDownloadProgress\(active\)/);
  assert.match(app, /async function performCloudDownload\(\) \{\s*try \{\s*setCloudDownloadProgress\(true\);/);
  assert.match(app, /\} finally \{\s*setCloudDownloadProgress\(false\);\s*\}/);
  assert.match(app, /sync-cloud-progress-dialog'\)\.oncancel = event => event\.preventDefault\(\)/);
  assert.match(help, /modal destacado <em>Sincronizando desde la nube<\/em>/);
});

test('el dialogo detecta conflicto cuando cambiaron local y nube', () => {
  assert.match(app, /function syncComparisonAnalysis\(metadata/);
  assert.match(app, /localChangedSinceSync/);
  assert.match(app, /cloudChangedSinceSync/);
  assert.match(app, /analysis\.conflict/);
  assert.match(app, /hay cambios en este dispositivo y tambi.n en la nube/);
  assert.match(app, /analysis\.conflict \|\| analysis\.cloudIsPreferred/);
  assert.match(app, /analysis\.conflict \|\| !metadata \|\| analysis\.localIsPreferred/);
});

test('las subidas usan ETag esperado y bloquean sobrescrituras concurrentes', () => {
  assert.match(app, /expectedEtag: uploadExpectedEtag/);
  assert.match(app, /expectedEtag: latestMetadata \? latestMetadata\.etag \|\| '' : ''/);
  assert.match(app, /detail\.error === 'cloud_changed'/);
  assert.match(fn, /const expectedEtag = typeof body\.expectedEtag === "string" \? body\.expectedEtag : null/);
  assert.match(fn, /currentEtag !== expectedEtag/);
  assert.match(fn, /error: "cloud_changed"/);
  assert.match(fn, /etag: savedMetadata && savedMetadata\.etag \|\| ""/);
  assert.match(help, /la copia de la nube no haya cambiado mientras se prepara el env.o/);
});
