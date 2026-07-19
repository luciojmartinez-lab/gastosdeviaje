import assert from 'node:assert/strict';
import test from 'node:test';
import { buildImagePdfBlob } from '../share-pdf.js';

test('el PDF compartido contiene páginas A4 e índices internos válidos', async () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  const blob = buildImagePdfBlob([
    { bytes: jpeg, width: 1080, height: 1400, drawHeight: 709.3 },
    { bytes: jpeg, width: 1080, height: 600, drawHeight: 304.2 }
  ], { pageWidth: 595.28, pageHeight: 841.89, margin: 24 });
  assert.equal(blob.type, 'application/pdf');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder('latin1').decode(bytes);
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/Type \/Pages \/Count 2/);
  assert.match(text, /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.equal((text.match(/\/Subtype \/Image/g) || []).length, 2);
  assert.match(text, /startxref\n\d+\n%%EOF/);

  const xrefStart = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xrefStart, xrefStart + 4), 'xref');
  const xrefLines = text.slice(xrefStart).split('\n');
  const objectOffsets = xrefLines.slice(3, 11).map(line => Number(line.slice(0, 10)));
  objectOffsets.forEach((offset, index) => {
    assert.equal(text.slice(offset, offset + String(index + 1).length + 6), `${index + 1} 0 obj`);
  });
});
