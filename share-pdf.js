const asciiBytes = value => new TextEncoder().encode(value);

function concatenateBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach(part => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

export function buildImagePdfBlob(pageImages, options = {}) {
  if (!Array.isArray(pageImages) || !pageImages.length) throw new Error('El PDF necesita al menos una página');
  const pageWidth = Number(options.pageWidth) || 595.28;
  const pageHeight = Number(options.pageHeight) || 841.89;
  const margin = Math.max(0, Number(options.margin) || 0);
  const drawWidth = pageWidth - (margin * 2);
  const objects = new Array(3 + (pageImages.length * 3));
  const objectBytes = (id, body) => asciiBytes(`${id} 0 obj\n${body}\nendobj\n`);
  objects[1] = objectBytes(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = pageImages.map((_, index) => 3 + (index * 3));
  objects[2] = objectBytes(2, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);

  pageImages.forEach((page, index) => {
    const bytes = page.bytes instanceof Uint8Array ? page.bytes : new Uint8Array(page.bytes || []);
    if (!bytes.length || !Number(page.width) || !Number(page.height)) throw new Error(`La página ${index + 1} no contiene una imagen válida`);
    const pageId = pageIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageName = `Im${index + 1}`;
    const drawHeight = Math.min(pageHeight - (margin * 2), Math.max(1, Number(page.drawHeight) || (Number(page.height) * drawWidth / Number(page.width))));
    const imageY = pageHeight - margin - drawHeight;
    objects[pageId] = objectBytes(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects[imageId] = concatenateBytes([
      asciiBytes(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Number(page.width)} /Height ${Number(page.height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),
      bytes,
      asciiBytes('\nendstream\nendobj\n')
    ]);
    const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${margin.toFixed(2)} ${imageY.toFixed(2)} cm\n/${imageName} Do\nQ`;
    const contentBytes = asciiBytes(`${content}\n`);
    objects[contentId] = objectBytes(contentId, `<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`);
  });

  const header = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]);
  const offsets = new Array(objects.length).fill(0);
  const chunks = [header];
  let byteOffset = header.length;
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = byteOffset;
    chunks.push(objects[id]);
    byteOffset += objects[id].length;
  }
  const xrefOffset = byteOffset;
  const xref = [
    'xref',
    `0 ${objects.length}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
    ''
  ].join('\n');
  chunks.push(asciiBytes(xref));
  return new Blob(chunks, { type: 'application/pdf' });
}
