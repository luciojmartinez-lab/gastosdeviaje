import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helpPath = path.join(root, 'ayuda.html');
const indexPath = path.join(root, 'index.html');
const pdfPath = path.join(root, 'output', 'pdf', 'ayuda-cuaderno-bitacora.pdf');

test('la ayuda identifica fecha y versión y contiene las tres partes principales', async () => {
  const html = await readFile(helpPath, 'utf8');

  assert.match(html, /Fecha de creación:<\/strong> 17 de julio de 2026/);
  assert.match(html, /Última actualización:<\/strong> 21 de julio de 2026/);
  assert.match(html, /Versión documentada:<\/strong> 700v206/);
  assert.match(html, /id="objetivo"/);
  assert.match(html, /1\. Objetivo y filosofía de la aplicación/);
  assert.match(html, /id="flujo"/);
  assert.match(html, /2\. Flujo de trabajo más eficiente/);
  assert.match(html, /id="referencia"/);
  assert.match(html, /3\. Referencia completa de menús y pantallas/);
  assert.match(html, /El PDF respeta los filtros activos del Blog: día, país, ciudad o cualquier combinación/);
  assert.doesNotMatch(html, /No cambian el contenido del PDF completo/);
});

test('todos los modales tienen ayuda contextual con un destino documentado', async () => {
  const [index, app, help, styles] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readFile(path.join(root, 'app.bundle.js'), 'utf8'),
    readFile(helpPath, 'utf8'),
    readFile(path.join(root, 'styles.css'), 'utf8')
  ]);
  const allDialogIds = [...index.matchAll(/<dialog\s+id="([^"]+)"\s+class="[^"]*\bmodal\b/g)].map(match => match[1]);
  const dialogIds = allDialogIds.filter(id => !['context-help-dialog', 'sync-cloud-progress-dialog'].includes(id));
  const mapStart = app.indexOf('const DIALOG_HELP_TARGETS = {');
  const mapEnd = app.indexOf('\n};', mapStart);
  const helpMap = app.slice(mapStart, mapEnd);
  const targets = new Map([...helpMap.matchAll(/'([^']+-dialog)': '([^']+)'/g)].map(match => [match[1], match[2]]));
  const helpIds = new Set([...help.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));

  assert.equal(allDialogIds.length, 20);
  assert.equal(dialogIds.length, 18);
  assert.equal(targets.size, dialogIds.length);
  for (const dialogId of dialogIds) {
    assert.ok(targets.has(dialogId), `Falta ayuda contextual para ${dialogId}`);
    assert.ok(helpIds.has(targets.get(dialogId)), `Falta el destino #${targets.get(dialogId)} de ${dialogId}`);
  }
  assert.match(index, /id="context-help-dialog"[\s\S]*?id="context-help-close"[\s\S]*?id="context-help-frame"/);
  assert.match(index, /id="sync-cloud-progress-dialog"[^>]*data-context-help="false"/);
  assert.match(app, /function installDialogHelpLinks\(\)[\s\S]*?button\.textContent = 'i'/);
  assert.match(app, /button\.onclick = \(\) => openContextHelp\(button\.dataset\.helpTarget, button\)/);
  assert.match(app, /`ayuda\.html\?embedded=1&target=/);
  assert.match(app, /function openAppHelp\(trigger\)[\s\S]*?ayuda\.html\?embedded=app/);
  const helpInstaller = app.slice(
    app.indexOf('function installDialogHelpLinks()'),
    app.indexOf('const ADD_EXPENSE_DRAFT_FIELDS')
  );
  assert.match(helpInstaller, /\$\$\('a\.help-link'\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?openAppHelp\(link\)/);
  assert.match(help, /document\.documentElement\.classList\.add\('embedded-help'\)/);
  assert.match(help, /document\.documentElement\.classList\.add\('embedded-app-help'\)/);
  assert.match(help, /const renderTarget = targetId =>/);
  assert.match(help, /manual\.replaceChildren\(context\)/);
  assert.match(app, /installDialogHelpLinks\(\);[\s\S]*?bindEvents\(\)/);
  assert.match(app, /function openFormDialog\(\{ title, fields, onSubmit, helpTarget = 'referencia' \}\)/);
  assert.match(app, /texto: 'blog-formulario-texto'[\s\S]*?imagen: 'blog-formulario-imagen'[\s\S]*?punto: 'blog-formulario-punto'/);
  assert.match(app, /setDialogHelpTarget\('blog-entry-dialog', helpTarget\)/);
  for (const target of ['blog-formulario-texto', 'blog-formulario-imagen', 'blog-formulario-punto']) {
    assert.ok(helpIds.has(target), `Falta la ayuda dinámica #${target}`);
  }
  assert.equal((app.match(/\n\s+helpTarget: '/g) || []).length, 7);
  assert.match(styles, /\.dialog-help \{[\s\S]*?border-radius: 50%/);
  assert.match(styles, /\.context-help-modal \{[\s\S]*?height: min\(840px/);
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

  assert.equal(images.length, 9);
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
