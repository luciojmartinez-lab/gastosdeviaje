import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const app = await readFile(new URL('../app.bundle.js', import.meta.url), 'utf8');
const serverSource = await readFile(new URL('../netlify/functions/travel-sync.js', import.meta.url), 'utf8');

function sourceOf(name) {
  const match = app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `No se encontró ${name}`);
  return match[0];
}

function makeStore() {
  const saved = new Map();
  let revision = 0;
  return {
    async get(key, options = {}) {
      const item = saved.get(key);
      if (!item) return null;
      return options.type === 'json' ? JSON.parse(item.data) : item.data;
    },
    async set(key, value, options = {}) {
      if (options.onlyIfNew && saved.has(key)) return { modified: false };
      saved.set(key, { data: String(value), metadata: options.metadata || {}, etag: `etag-${++revision}` });
      return { modified: true };
    },
    async setJSON(key, value, options = {}) {
      return this.set(key, JSON.stringify(value), options);
    },
    async getMetadata(key) {
      const item = saved.get(key);
      return item ? { metadata: item.metadata, etag: item.etag } : null;
    },
    async list({ prefix }) {
      return { blobs: [...saved.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) };
    },
    async delete(key) {
      saved.delete(key);
    }
  };
}

class TestFileReader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(bytes => {
      this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;
      this.onload();
    }, error => {
      this.error = error;
      this.onerror();
    });
  }
}

test('una copia de datos superior al límite se guarda por partes y se recupera íntegra', async () => {
  const store = makeStore();
  globalThis.__testCloudStore = () => store;
  const moduleText = serverSource.replace(
    'import { getStore } from "@netlify/blobs";',
    'const getStore = globalThis.__testCloudStore;'
  );
  const { default: server } = await import(`data:text/javascript,${encodeURIComponent(moduleText)}`);
  const key = 'clave-de-prueba-para-copia-grande';
  const send = async (body) => {
    const response = await server(new Request('https://prueba.local/api/travel-sync', {
      method: 'POST',
      headers: { 'x-sync-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }));
    assert.equal(response.status, 200);
    return response.json();
  };
  const receive = async (query) => server(new Request(`https://prueba.local/api/travel-sync${query}`, {
    headers: { 'x-sync-key': key }
  }));
  const context = vm.createContext({
    Blob, Buffer, FileReader: TestFileReader, TextEncoder, crypto: webcrypto,
    CLOUD_ATTACHMENT_CHUNK_CHARS: 2_500_000,
    CLOUD_ATTACHMENT_CHECK_BATCH: 75,
    CLOUD_INLINE_DATA_LIMIT_BYTES: 5_300_000,
    APP_VERSION: 'prueba',
    setSyncMessage() {},
    buildBackupData: () => data,
    prepareCloudBackupData: async source => ({ data: source, attachments: [] }),
    backupFilename: () => 'copia.json',
    ensureLocalDataUpdatedAt: () => '2026-09-29T00:00:00.000Z',
    fetchCloudMetadata: async () => {
      const response = await receive('');
      if (response.status === 404) return null;
      const body = await response.json();
      return { ...body.metadata, etag: body.etag };
    },
    syncKey: () => key,
    SYNC_ENDPOINT: '/api/travel-sync',
    fetch: async (url, options = {}) => options.method === 'POST'
      ? server(new Request(`https://prueba.local${url}`, options))
      : receive(url.slice('/api/travel-sync'.length)),
    ticketDataInfo(data) {
      const [, encoded] = data.split(',');
      return { blob: new Blob([Buffer.from(encoded, 'base64')]) };
    },
    dataUrlToBlob(data) {
      const [, encoded] = data.split(',');
      return new Blob([Buffer.from(encoded, 'base64')]);
    }
  });
  vm.runInContext([
    sourceOf('sha256Hex'), sourceOf('cloudDataAttachment'), sourceOf('cloudDataReference'),
    sourceOf('syncAction'), sourceOf('existingCloudAttachmentIds'),
    sourceOf('uploadCloudAttachments'), sourceOf('downloadCloudAttachment'),
    sourceOf('downloadCloudData'), sourceOf('uploadCloudSnapshot'),
    'let currentCloudMetadata = null;'
  ].join('\n'), context);

  const data = {
    backupScope: 'all',
    gastos: Array.from({ length: 6_000 }, (_, index) => ({ id: index, descripcion: `${index}: ${'Viaje '.repeat(170)}` })),
    viajes: [{ id: 1, nombre: 'Prueba' }]
  };
  assert.ok(Buffer.byteLength(JSON.stringify(data)) > 5_300_000);
  context.sourceData = data;
  const attachment = await vm.runInContext('cloudDataAttachment(sourceData, "datos.json")', context);
  assert.ok(attachment.parts > 1);
  context.attachments = [attachment];
  await vm.runInContext('uploadCloudAttachments(attachments, "bloque de datos")', context);
  const ref = await vm.runInContext('cloudDataReference(attachments[0])', context);
  assert.equal(ref.id, createHash('sha256').update(JSON.stringify(data)).digest('hex'));
  assert.equal('data' in ref, false);
  const saved = await send({ dataRef: ref, expectedEtag: '', filename: 'datos.json' });
  assert.ok(saved.etag);
  const current = await receive('?content=1');
  assert.equal(current.status, 200);
  const snapshot = await current.json();
  assert.equal(snapshot.data, undefined);
  assert.deepEqual(snapshot.dataRef.id, ref.id);
  context.reference = snapshot.dataRef;
  const recovered = await vm.runInContext('downloadCloudData(reference)', context);
  assert.equal(JSON.stringify(recovered), JSON.stringify(data));

  context.tripData = { ...data, backupScope: 'trip', gastos: data.gastos.slice(0, 3_000) };
  context.savedEtag = saved.etag;
  await vm.runInContext('uploadCloudSnapshot({ backupData: tripData, backupName: "viaje.json", expectedEtag: savedEtag })', context);
  const latest = await (await receive('?content=1')).json();
  assert.ok(latest.dataRef);
  assert.equal(latest.data, undefined);
  const backupKeys = (await store.list({ prefix: 'users/' })).blobs.map(item => item.key)
    .filter(key => key.includes('/backups/'));
  assert.equal(backupKeys.length, 1);
  const tripBackup = await store.get(backupKeys[0], { type: 'json' });
  assert.ok(tripBackup.dataRef);
  assert.equal(tripBackup.data, undefined);
  context.reference = tripBackup.dataRef;
  assert.equal(JSON.stringify(await vm.runInContext('downloadCloudData(reference)', context)), JSON.stringify(context.tripData));
});

test('la copia antigua guardada directamente sigue siendo aceptada', async () => {
  const store = makeStore();
  globalThis.__testCloudStore = () => store;
  const moduleText = serverSource.replace('import { getStore } from "@netlify/blobs";', 'const getStore = globalThis.__testCloudStore;');
  const { default: server } = await import(`data:text/javascript,${encodeURIComponent(moduleText)}`);
  const response = await server(new Request('https://prueba.local/api/travel-sync', {
    method: 'POST',
    headers: { 'x-sync-key': 'clave-de-prueba-para-copia-antigua' },
    body: JSON.stringify({ data: { backupScope: 'all', gastos: [] }, expectedEtag: '' })
  }));
  assert.equal(response.status, 200);
});
