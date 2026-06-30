let workerPromise = null;
let progressListener = () => {};

const cleanLine = value => String(value || '')
  .replace(/[|]/g, 'I')
  .replace(/\s+/g, ' ')
  .trim();

export const normalizeTicketText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

function validDateParts(day, month, year) {
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);
  if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${String(fullYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractTicketDate(text) {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketText(line);
    const regex = /\b(0?[1-9]|[12]\d|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](\d{2}|\d{4})\b/g;
    let match;
    while ((match = regex.exec(line))) {
      const value = validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
      if (value) candidates.push({ value, score: (normalized.includes('fecha') ? 10 : 0) - index * 0.05 });
    }
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.value || '';
}

export function extractTicketTime(text) {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketText(line);
    const regex = /\b([01]?\d|2[0-3])[:.]([0-5]\d)(?::[0-5]\d)?\b/g;
    let match;
    while ((match = regex.exec(line))) {
      candidates.push({
        value: `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`,
        score: (normalized.includes('hora') ? 10 : 0) - index * 0.05
      });
    }
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.value || '';
}

export function parseTicketAmount(value) {
  let raw = String(value || '').replace(/[^\d,.-]/g, '');
  if (!raw) return null;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    const thousands = decimal === ',' ? /\./g : /,/g;
    raw = raw.replace(thousands, '').replace(decimal, '.');
  } else if (comma >= 0) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if ((raw.match(/\./g) || []).length > 1) {
    const parts = raw.split('.');
    raw = `${parts.slice(0, -1).join('')}.${parts.at(-1)}`;
  }
  const amount = Number(raw);
  return Number.isFinite(amount) ? Math.abs(amount) : null;
}

function amountsInLine(line) {
  const matches = String(line || '').match(/(?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d{2})/g) || [];
  return matches.map(parseTicketAmount).filter(value => Number.isFinite(value));
}

export function extractTicketTotal(text) {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketText(line);
    const amounts = amountsInLine(line);
    if (!amounts.length) return;
    let score = 0;
    if (/total\s+(a\s+)?pagar|importe\s+total|total\s+(eur|€)/.test(normalized)) score += 30;
    else if (/\ba\s+pagar\b/.test(normalized)) score += 25;
    else if (/\btotal\b/.test(normalized)) score += 20;
    if (/subtotal|base\s+imponible|\biva\b|i\.v\.a|cambio|entregado|efectivo|tarjeta|descuento/.test(normalized)) score -= 25;
    if (/total/.test(normalized) && /iva incl|impuestos incl/.test(normalized)) score += 5;
    score += index / Math.max(lines.length, 1);
    candidates.push({ value: amounts.at(-1), score });
  });
  const strong = candidates.filter(item => item.score >= 15).sort((a, b) => b.score - a.score);
  if (strong.length) return strong[0].value;
  const fallback = candidates.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  return fallback[0]?.value ?? null;
}

const MERCHANT_EXCLUSIONS = /^(ticket|factura|simplificada|copia|cliente|fecha|hora|mesa|caja|cajero|nif|cif|n\.i\.f|tel|telefono|www\.|https?|gracias|iva|total|subtotal|importe|direccion|domicilio|articulo|descripcion|unidades)/i;
const ADDRESS_WORDS = /\b(calle|c\/|avenida|avda|plaza|paseo|carretera|cp\s*\d|codigo postal|tlf|telefono|madrid|barcelona)\b/i;

export function extractTicketMerchant(text) {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean).slice(0, 18);
  const candidates = lines.map((line, index) => {
    const letters = line.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || [];
    const uppercase = line.match(/[A-ZÁÉÍÓÚÜÑ]/g) || [];
    let score = Math.max(0, 10 - index * 0.6);
    if (letters.length < 3 || line.length > 70 || MERCHANT_EXCLUSIONS.test(line)) score -= 30;
    if (/\b\d{5}\b|@|\.com\b|\b(es|com|net)\b$/i.test(line) || ADDRESS_WORDS.test(line)) score -= 12;
    if (/\b(sa|s\.a\.|sl|s\.l\.|s\.l\.u\.|sociedad|restaurante|hotel|bar|cafeteria|supermercado)\b/i.test(line)) score += 7;
    if (letters.length && uppercase.length / letters.length > 0.65) score += 5;
    if (/\d{2}[\/.-]\d{2}/.test(line) || /\d{1,2}:\d{2}/.test(line)) score -= 15;
    return { value: line.replace(/^[^\p{L}\d]+|[^\p{L}\d.)]+$/gu, ''), score };
  }).filter(item => item.value);
  return candidates.sort((a, b) => b.score - a.score)[0]?.value || '';
}

export function extractTicketFields(text) {
  return {
    date: extractTicketDate(text),
    time: extractTicketTime(text),
    merchant: extractTicketMerchant(text),
    total: extractTicketTotal(text)
  };
}

async function imageFromBlob(blob) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = error => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function prepareImage(source) {
  const blob = typeof source === 'string' ? await dataUrlToBlob(source) : source;
  const image = await imageFromBlob(blob);
  const sourceWidth = image.width || image.naturalWidth;
  const sourceHeight = image.height || image.naturalHeight;
  const maxWidth = 2200;
  const scale = Math.min(1, maxWidth / Math.max(sourceWidth, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (image.close) image.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const grey = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
    const contrasted = grey < 140 ? Math.max(0, grey * 0.75) : Math.min(255, grey * 1.08);
    pixels.data[index] = contrasted;
    pixels.data[index + 1] = contrasted;
    pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

async function preparePdf(source, onProgress) {
  onProgress({ status: 'Preparando la primera página del PDF', progress: 0.04 });
  const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const blob = typeof source === 'string' ? await dataUrlToBlob(source) : source;
  const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const original = page.getViewport({ scale: 1 });
  const scale = Math.min(3, 2000 / Math.max(original.width, 1));
  const viewport = page.getViewport({ scale: Math.max(1.5, scale) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  await pdf.destroy();
  return canvas;
}

async function getWorker(onProgress) {
  progressListener = onProgress;
  if (!workerPromise) {
    workerPromise = import('./vendor/tesseract/tesseract.esm.min.js').then(async Tesseract => {
      const worker = await Tesseract.createWorker('spa', Tesseract.OEM.LSTM_ONLY, {
        workerPath: new URL('./vendor/tesseract/worker.min.js', import.meta.url).href,
        corePath: new URL('./vendor/tesseract/core', import.meta.url).href,
        langPath: new URL('./vendor/tesseract/lang', import.meta.url).href,
        workerBlobURL: false,
        logger: message => progressListener(message)
      });
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1'
      });
      return worker;
    }).catch(error => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export async function recognizeTicket(source, options = {}) {
  if (!source) throw new Error('Selecciona o fotografía primero un ticket.');
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const type = String(options.type || source.type || '').toLowerCase();
  const name = String(options.name || source.name || '').toLowerCase();
  const isPdf = type.includes('pdf') || name.endsWith('.pdf');
  const prepared = isPdf ? await preparePdf(source, onProgress) : await prepareImage(source);
  onProgress({ status: 'Preparando el lector local', progress: 0.08 });
  const worker = await getWorker(onProgress);
  const result = await worker.recognize(prepared, { rotateAuto: true });
  const text = result?.data?.text || '';
  return {
    text,
    confidence: Number(result?.data?.confidence) || 0,
    fields: extractTicketFields(text),
    pdfFirstPageOnly: isPdf
  };
}

