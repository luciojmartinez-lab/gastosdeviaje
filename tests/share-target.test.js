import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [manifestText, html, app, sw] = await Promise.all([
  readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8')
]);
const manifest = JSON.parse(manifestText);

test('el destino Compartir acepta imagenes, texto y archivos TXT', () => {
  const accepted = manifest.share_target.params.files.accept;
  assert.ok(accepted.includes('text/plain'));
  assert.ok(accepted.includes('.txt'));
  assert.match(sw, /async function receiveSharedContent\(request\)/);
  assert.match(sw, /const textFiles = sharedFiles\.filter/);
  assert.match(sw, /await file\.text\(\)/);
  assert.match(sw, /!files\.length && !sharedTextParts\.length/);
});

test('el service worker recibe texto sin exigir una imagen', async () => {
  const functionStart = sw.indexOf('async function receiveSharedContent');
  const functionEnd = sw.indexOf("self.addEventListener('fetch'", functionStart);
  const receiverSource = sw.slice(functionStart, functionEnd);
  const stored = new Map();
  const cacheApi = {
    open: async () => ({
      put: async (key, response) => stored.set(String(key), response.clone())
    })
  };
  const receiver = Function(
    'caches',
    'self',
    `const SHARED_FILES_CACHE = 'test-shared'; ${receiverSource}; return receiveSharedContent;`
  )(cacheApi, { crypto: { randomUUID: () => 'text-test' } });
  const formValues = new Map([
    ['title', 'Apunte compartido'],
    ['text', 'Texto recibido desde Android'],
    ['url', '']
  ]);
  const response = await receiver({
    url: 'https://example.test/share-target',
    formData: async () => ({
      get: name => formValues.get(name) || '',
      getAll: () => []
    })
  });

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://example.test/index.html?shared=text-test');
  const metadataResponse = stored.get('https://example.test/__shared/text-test/metadata.json');
  assert.ok(metadataResponse);
  const metadata = await metadataResponse.json();
  assert.equal(metadata.text, 'Texto recibido desde Android');
  assert.deepEqual(metadata.files, []);
});

test('las fotos compartidas piden una descripción editable y no imponen Texto compartido', () => {
  assert.match(html, /id="shared-images-description"/);
  assert.match(html, /Describe la foto antes de continuar/);
  assert.match(app, /requiresDescription = hasImages && !existing/);
  assert.match(app, /Escribe una descripción para la foto/);
  assert.match(app, /#g-desc'\)\) \$\('#g-desc'\)\.value = suggestedDescription/);
  assert.doesNotMatch(app, /title \|\| firstLine \|\| 'Texto compartido'/);
});

test('el texto compartido abre una entrada de Blog revisable', () => {
  assert.match(html, /id="shared-content-title"/);
  assert.match(html, /id="shared-images-destination-field"/);
  assert.match(app, /function sharedPayloadText\(payload\)/);
  assert.match(app, /if \(!files\.length\) \{[\s\S]*?setBlogEntryType\('texto'\)[\s\S]*?#blog-texto/);
  assert.match(app, /Texto listo para añadir al Blog/);
});

test('el contenido compartido se prepara antes de mostrar el diálogo', () => {
  assert.match(app, /async function openSharedImagesDialog\(payload\)/);
  assert.match(app, /await Promise\.all\(\[[\s\S]*?waitForSharedPreviewImages\(\)[\s\S]*?updateSharedImagesGpsSummary\(payload\)/);
  const openStart = app.indexOf('async function openSharedImagesDialog(payload)');
  const openEnd = app.indexOf('\nfunction closeSharedImagesDialog()', openStart);
  const source = app.slice(openStart, openEnd);
  assert.ok(source.indexOf('await Promise.all([') < source.indexOf('dialog.showModal()'));
  assert.match(app, /await openSharedImagesDialog\(\{ \.\.\.metadata, files \}\)/);
  assert.match(app, /APP_HAS_SHARED_LAUNCH[\s\S]*?Preparando contenido compartido/);
  assert.match(app, /APP_HAS_SHARED_LAUNCH \? 15000 : APP_LOADING_MAX_MS/);
});
