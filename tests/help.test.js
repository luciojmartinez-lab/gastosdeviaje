import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helpPath = path.join(root, 'ayuda.html');
const pdfPath = path.join(root, 'output', 'pdf', 'ayuda-cuaderno-bitacora.pdf');

test('la ayuda identifica fecha y versión y contiene las tres partes principales', async () => {
  const html = await readFile(helpPath, 'utf8');

  assert.match(html, /Fecha de creación:<\/strong> 17 de julio de 2026/);
  assert.match(html, /Última actualización:<\/strong> 18 de julio de 2026/);
  assert.match(html, /Versión documentada:<\/strong> 700v176/);
  assert.match(html, /id="objetivo"/);
  assert.match(html, /1\. Objetivo y filosofía de la aplicación/);
  assert.match(html, /id="flujo"/);
  assert.match(html, /2\. Flujo de trabajo más eficiente/);
  assert.match(html, /id="referencia"/);
  assert.match(html, /3\. Referencia completa de menús y pantallas/);
  assert.match(html, /El PDF respeta los filtros activos del Blog: día, país, ciudad o cualquier combinación/);
  assert.doesNotMatch(html, /No cambian el contenido del PDF completo/);
});

test('todos los hipervínculos internos de la ayuda tienen destino', async () => {
  const html = await readFile(helpPath, 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const targets = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);

  assert.ok(targets.length >= 90, `Se esperaban al menos 90 enlaces internos y hay ${targets.length}`);
  for (const target of targets) {
    assert.ok(ids.has(target), `Falta el destino interno #${target}`);
  }
});

test('las capturas explicativas y el PDF descargable están publicados', async () => {
  const html = await readFile(helpPath, 'utf8');
  const serviceWorker = await readFile(path.join(root, 'sw.js'), 'utf8');
  const images = [...html.matchAll(/<img\s+src="([^"]+)"/g)].map(match => match[1]);

  assert.equal(images.length, 8);
  for (const image of images) {
    const file = path.join(root, image.replaceAll('/', path.sep));
    await access(file);
    assert.ok((await stat(file)).size > 20_000, `${image} parece incompleta`);
    assert.ok(serviceWorker.includes(`'./${image}'`), `${image} no está en la caché opcional`);
  }

  assert.match(html, /href="output\/pdf\/ayuda-cuaderno-bitacora\.pdf"\s+download/);
  assert.match(serviceWorker, /\.\/output\/pdf\/ayuda-cuaderno-bitacora\.pdf/);
  const pdf = await readFile(pdfPath);
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 500_000, 'El PDF de ayuda parece incompleto');
});
