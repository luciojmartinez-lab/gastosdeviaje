let workerPromise = null;
let progressListener = () => {};
const OCR_PSM_AUTO = '3';
const OCR_PSM_SPARSE_TEXT = '11';

const cleanLine = value => String(value || '')
  .replace(/[|]/g, 'I')
  .replace(/\s+/g, ' ')
  .trim();

export const normalizeTicketText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const normalizeTicketConcepts = value => normalizeTicketText(value)
  .replace(/\bt[o0]ta[l1i]\b/g, 'total')
  .replace(/\bimp[o0]rte\b/g, 'importe');

const ticketLines = text => String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);

const TICKET_MONTHS = {
  ene: 1, enero: 1,
  feb: 2, febrero: 2,
  mar: 3, marzo: 3,
  abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6,
  jul: 7, julio: 7,
  ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9,
  oct: 10, octubre: 10,
  nov: 11, noviembre: 11,
  dic: 12, diciembre: 12
};

function validDateParts(day, month, year) {
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);
  if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${String(fullYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractTicketDate(text) {
  const lines = ticketLines(text);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketConcepts(line);
    const labeled = /\b(fecha|date|fec)\b/.test(normalized);
    const regex = /\b(0?[1-9]|[12]\d|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](\d{2}|\d{4})\b/g;
    let match;
    while ((match = regex.exec(line))) {
      const value = validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
      if (value) candidates.push({ value, score: (labeled ? 35 : 12) - index * 0.05 });
    }
    const isoRegex = /\b(\d{4})[\/.-](0?[1-9]|1[0-2])[\/.-](0?[1-9]|[12]\d|3[01])\b/g;
    while ((match = isoRegex.exec(line))) {
      const value = validDateParts(Number(match[3]), Number(match[2]), Number(match[1]));
      if (value) candidates.push({ value, score: (labeled ? 35 : 14) - index * 0.05 });
    }
    const monthRegex = /\b(0?[1-9]|[12]\d|3[01])[\s/.-]+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:t(?:iembre)?)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)[\s/.-]+(\d{2}|\d{4})\b/g;
    while ((match = monthRegex.exec(normalized))) {
      const month = TICKET_MONTHS[match[2]];
      const value = month ? validDateParts(Number(match[1]), month, Number(match[3])) : '';
      if (value) candidates.push({ value, score: (labeled ? 35 : 16) - index * 0.05 });
    }
    if (labeled) {
      const spacedRegex = /\b(0?[1-9]|[12]\d|3[01])\s+(0?[1-9]|1[0-2])\s+(\d{2}|\d{4})\b/g;
      while ((match = spacedRegex.exec(normalized))) {
        const value = validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
        if (value) candidates.push({ value, score: 28 - index * 0.05 });
      }
    }
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.value || '';
}

export function extractTicketTime(text) {
  const lines = ticketLines(text);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketText(line);
    const labeled = /\b(hora|time)\b/.test(normalized);
    const sharesLineWithDate = /\b(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:\d{2}|\d{4})\b|\b\d{4}[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:0?[1-9]|[12]\d|3[01])\b/.test(normalized);
    const regex = /\b([01]?\d|2[0-3])\s*([:.h])\s*([0-5]\d)(?::[0-5]\d)?\b/gi;
    let match;
    while ((match = regex.exec(line))) {
      if (match[2] === '.' && !labeled && !sharesLineWithDate) continue;
      candidates.push({
        value: `${String(Number(match[1])).padStart(2, '0')}:${match[3]}`,
        score: (labeled ? 35 : 12) + (sharesLineWithDate ? 12 : 0) - index * 0.05
      });
    }
    if (labeled) {
      const compactRegex = /\b([01]\d|2[0-3])([0-5]\d)\b/g;
      while ((match = compactRegex.exec(normalized))) {
        candidates.push({ value: `${match[1]}:${match[2]}`, score: 30 - index * 0.05 });
      }
    }
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.value || '';
}

export function parseTicketAmount(value) {
  let raw = String(value || '')
    .replace(/(?<=\d)[oO](?=\d|\b)/g, '0')
    .replace(/[^\d,.-]/g, '');
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
  const numericText = String(line || '').replace(/(?<=\d)[oO](?=\d|\b)/g, '0');
  const matches = numericText.match(/(?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d{1,2})/g) || [];
  return matches.map(parseTicketAmount).filter(value => Number.isFinite(value));
}

const CARD_PAYMENT_SIGNALS = /\b(copia\s+(?:cliente|comercio)|justificante|autorizacion|terminal|operacion|transaccion|contactless|tpv|datafono|visa|mastercard|redsys|servired|getnet|global\s+payments)\b/g;
const RECEIPT_SIGNALS = /\b(ticket|factura\s+simplificada|base\s+imponible|subtotal|articulo|unidades|cambio|mesa|iva)\b/g;

export function detectTicketDocumentType(text) {
  const normalized = normalizeTicketText(text);
  const cardSignals = normalized.match(CARD_PAYMENT_SIGNALS) || [];
  const receiptSignals = normalized.match(RECEIPT_SIGNALS) || [];
  let cardScore = cardSignals.length * 2;
  let receiptScore = receiptSignals.length * 2;
  if (/copia\s+(?:para\s+el\s+)?cliente|copia\s+comercio/.test(normalized)) cardScore += 5;
  if (/factura\s+simplificada|base\s+imponible|desglose\s+iva/.test(normalized)) receiptScore += 5;
  if (/\b(?:bbva|santander|caixabank|bankinter|sabadell|ing|unicaja|abanca|revolut|comercia|worldline)\b/.test(normalized)) cardScore += 2;
  return cardScore >= 6 && cardScore > receiptScore ? 'card_payment' : 'receipt';
}

export function extractTicketTotal(text) {
  const lines = ticketLines(text);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketConcepts(line);
    const amounts = amountsInLine(line);
    const hasBestLabel = /\btotal\s+(?:a\s+)?pagar\b|\b(?:importe\s+total|total\s+importe)\b|\btotal\s+(?:compra|operacion|ticket)\b/.test(normalized);
    const hasTotalLabel = /\btotal\b/.test(normalized) && !/\bsubtotal\b/.test(normalized);
    const hasAmountLabel = /\bimporte\b|\ba\s+pagar\b|\bimporte\s+cobrado\b/.test(normalized);
    const hasPaymentDueLabel = /\bpendiente\s+de\s+cobro\b|\bcobro\s+pendiente\b/.test(normalized);
    const tableHeader = /\b(?:unid(?:ad)?|cant(?:idad)?|descripcion|articulo|precio)\b/.test(normalized);
    const taxBreakdown = /\biva\b|i\.v\.a/.test(normalized) && !/iva\s+incl|impuestos\s+incl/.test(normalized);
    const excluded = /\bsubtotal\b|base\s+imponible|base\s+iva|cuota\s+iva|cambio|entregado|efectivo|descuento|propina/.test(normalized)
      || taxBreakdown;
    let labelScore = hasBestLabel ? 130 : hasTotalLabel ? 115 : hasPaymentDueLabel ? 105 : hasAmountLabel ? 95 : 0;
    if (tableHeader && !hasTotalLabel) labelScore = 0;
    if (hasAmountLabel && !hasTotalLabel && !hasPaymentDueLabel && amounts.length > 1) labelScore = 0;
    if (excluded) labelScore -= 120;
    if (labelScore > 0 && amounts.length) {
      candidates.push({ value: amounts.at(-1), score: labelScore + (/\beur\b|€/i.test(line) ? 10 : 0) + index / Math.max(lines.length, 1) });
    }
    const labelOnly = /^(?:total(?:\s+(?:importe|a\s+pagar|compra|operacion|ticket))?|importe(?:\s+(?:total|cobrado))?|a\s+pagar|pendiente\s+de\s+cobro|cobro\s+pendiente)(?:\s+(?:eur|euro|euros))?$/.test(
      normalized.replace(/[-_=.:]/g, ' ').replace(/\s+/g, ' ').trim()
    );
    if (labelScore > 0 && labelOnly && !amounts.length && index + 1 < lines.length) {
      const followingAmounts = amountsInLine(lines[index + 1]);
      const followingNormalized = normalizeTicketConcepts(lines[index + 1]);
      if (followingAmounts.length === 1 && !/subtotal|base\s+imponible|\biva\b|cambio|entregado/.test(followingNormalized)) {
        candidates.push({ value: followingAmounts.at(-1), score: labelScore - 8 });
      }
    }
  });
  return candidates.filter(item => item.value > 0).sort((a, b) => b.score - a.score)[0]?.value ?? null;
}

const MERCHANT_EXCLUSIONS = /^(ticket|factura|simplificada|copia|cliente|fecha|hora|mesa|caja|cajero|nif|cif|n\.i\.f|tel|telefono|www\.|https?|gracias|iva|total|subtotal|importe|direccion|domicilio|articulo|descripcion|unidades|venta|compra|operacion|transaccion|autorizacion|terminal|contactless|aprobada|aceptada)/i;
const ADDRESS_WORDS = /\b(calle|c\/|avenida|avda|plaza|paseo|carretera|cp\s*\d|codigo postal|tlf|telefono|madrid|barcelona)\b/i;
const BANK_BRAND_LINE = /^(?:bbva|banco\s+santander|santander|caixabank|la\s+caixa|bankinter|banco\s+sabadell|sabadell|ing|unicaja|kutxabank|abanca|ibercaja|openbank|revolut|wise|cajamar|comercia(?:\s+global\s+payments)?|global\s+payments|redsys|servired|worldline|getnet)$/i;
const PAYMENT_TERMINAL_LINE = /^(?:venta\b|compra\b|visa\b|mastercard\b|contactless\b|aut(?:orizacion)?[:.\s]|op(?:eracion)?[:.\s]|tran(?:saccion)?[:.\s]|terminal[:.\s]|app\s+(?:bbva|santander|caixabank|sabadell))/i;

export function extractTicketMerchant(text) {
  const lines = ticketLines(text).slice(0, 24);
  const documentType = detectTicketDocumentType(text);
  const explicit = lines.map((line, index) => {
    const match = line.match(/^\s*(?:comercio|establecimiento|merchant|nombre\s+comercio)\s*[:.-]\s*(.+)$/i);
    return match ? { value: cleanLine(match[1]), score: 100 - index } : null;
  }).filter(item => item && /[a-záéíóúüñ]{3}/i.test(item.value) && !/^\d+$/.test(item.value));
  if (explicit.length) return explicit.sort((a, b) => b.score - a.score)[0].value;
  const bankHeaderIndex = lines.findIndex(line => BANK_BRAND_LINE.test(line));
  const receiptBodyIndex = documentType === 'receipt'
    ? lines.findIndex(line => /\b(?:unid(?:ad)?|cant(?:idad)?|descripcion|articulo)\b.*\b(?:precio|importe)\b/i.test(normalizeTicketText(line)))
    : -1;
  const candidates = lines.map((line, index) => {
    const letters = line.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || [];
    const uppercase = line.match(/[A-ZÁÉÍÓÚÜÑ]/g) || [];
    let score = Math.max(0, 10 - index * 0.6);
    if (letters.length < 3 || line.length > 70 || MERCHANT_EXCLUSIONS.test(line)) score -= 30;
    if (BANK_BRAND_LINE.test(line)) score -= 60;
    if (PAYMENT_TERMINAL_LINE.test(line)) score -= 35;
    if (/\b\d{5}\b|@|\.com\b|\b(es|com|net)\b$/i.test(line) || ADDRESS_WORDS.test(line)) score -= 12;
    if (/\b(sa|s\.a\.|sl|s\.l\.|s\.l\.u\.|sociedad|restaurante|hotel|bar|cafeteria|supermercado)\b/i.test(line)) score += 7;
    if (letters.length && uppercase.length / letters.length > 0.65) score += 5;
    if (/\d{2}[\/.-]\d{2}/.test(line) || /\d{1,2}:\d{2}/.test(line)) score -= 15;
    if (documentType === 'receipt' && index <= 2) score += 12 - index * 2;
    if (documentType === 'receipt' && receiptBodyIndex >= 0 && index >= receiptBodyIndex) score -= 35;
    if (amountsInLine(line).length) score -= 20;
    if (documentType === 'card_payment' && bankHeaderIndex >= 0 && index > bankHeaderIndex && index <= bankHeaderIndex + 8
      && !BANK_BRAND_LINE.test(line) && !PAYMENT_TERMINAL_LINE.test(line)) {
      score += 28 - (index - bankHeaderIndex) * 2;
    }
    return { value: line.replace(/^[^\p{L}\d]+|[^\p{L}\d.)]+$/gu, ''), score };
  }).filter(item => item.value);
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return best?.score > 0 ? best.value : '';
}

export function extractTicketFields(text) {
  return {
    documentType: detectTicketDocumentType(text),
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

export function findReceiptBounds(data, width, height) {
  if (!data || width < 8 || height < 8 || data.length < width * height * 4) return null;
  const total = width * height;
  const paper = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (brightness >= 175 && saturation <= 48) paper[index] = 1;
  }
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  let best = null;
  for (let start = 0; start < total; start += 1) {
    if (!paper[start] || visited[start]) continue;
    let stackLength = 1;
    stack[0] = start;
    visited[start] = 1;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (stackLength) {
      const current = stack[--stackLength];
      const x = current % width;
      const y = Math.floor(current / width);
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x > 0 && paper[current - 1] && !visited[current - 1]) {
        visited[current - 1] = 1;
        stack[stackLength++] = current - 1;
      }
      if (x + 1 < width && paper[current + 1] && !visited[current + 1]) {
        visited[current + 1] = 1;
        stack[stackLength++] = current + 1;
      }
      if (y > 0 && paper[current - width] && !visited[current - width]) {
        visited[current - width] = 1;
        stack[stackLength++] = current - width;
      }
      if (y + 1 < height && paper[current + width] && !visited[current + width]) {
        visited[current + width] = 1;
        stack[stackLength++] = current + width;
      }
    }
    if (!best || count > best.count) best = { count, minX, minY, maxX, maxY };
  }
  if (!best || best.count < total * 0.08) return null;
  const boxWidth = best.maxX - best.minX + 1;
  const boxHeight = best.maxY - best.minY + 1;
  if (boxWidth < width * 0.3 || boxHeight < height * 0.35) return null;
  if (boxWidth > width * 0.97 && boxHeight > height * 0.97) return null;
  const padX = Math.round(width * 0.018);
  const padY = Math.round(height * 0.018);
  const x = Math.max(0, best.minX - padX);
  const y = Math.max(0, best.minY - padY);
  return {
    x,
    y,
    width: Math.min(width, best.maxX + padX + 1) - x,
    height: Math.min(height, best.maxY + padY + 1) - y
  };
}

function cropCanvas(source, startRatio, endRatio) {
  const startY = Math.max(0, Math.floor(source.height * startRatio));
  const endY = Math.min(source.height, Math.ceil(source.height * endRatio));
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = Math.max(1, endY - startY);
  canvas.getContext('2d').drawImage(source, 0, startY, source.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function prepareImage(source) {
  const blob = typeof source === 'string' ? await dataUrlToBlob(source) : source;
  const image = await imageFromBlob(blob);
  const sourceWidth = image.width || image.naturalWidth;
  const sourceHeight = image.height || image.naturalHeight;
  const analysisScale = Math.min(1, 480 / Math.max(sourceWidth, 1));
  const analysis = document.createElement('canvas');
  analysis.width = Math.max(1, Math.round(sourceWidth * analysisScale));
  analysis.height = Math.max(1, Math.round(sourceHeight * analysisScale));
  const analysisContext = analysis.getContext('2d', { willReadFrequently: true });
  analysisContext.drawImage(image, 0, 0, analysis.width, analysis.height);
  const detectedBounds = findReceiptBounds(
    analysisContext.getImageData(0, 0, analysis.width, analysis.height).data,
    analysis.width,
    analysis.height
  );
  const sourceBounds = detectedBounds
    ? {
        x: detectedBounds.x / analysis.width * sourceWidth,
        y: detectedBounds.y / analysis.height * sourceHeight,
        width: detectedBounds.width / analysis.width * sourceWidth,
        height: detectedBounds.height / analysis.height * sourceHeight
      }
    : { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const maxWidth = 2000;
  const preferredWidth = 1600;
  const scale = Math.min(
    maxWidth / Math.max(sourceBounds.width, 1),
    Math.max(1, preferredWidth / Math.max(sourceBounds.width, 1))
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceBounds.width * scale));
  canvas.height = Math.max(1, Math.round(sourceBounds.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(
    image,
    sourceBounds.x,
    sourceBounds.y,
    sourceBounds.width,
    sourceBounds.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
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
    workerPromise = import('./vendor/tesseract/tesseract.esm.min.js').then(async module => {
      const Tesseract = module.default || module;
      const worker = await Tesseract.createWorker('spa', Tesseract.OEM.LSTM_ONLY, {
        workerPath: new URL('./vendor/tesseract/worker.min.js', import.meta.url).href,
        corePath: new URL('./vendor/tesseract/core', import.meta.url).href,
        langPath: new URL('./vendor/tesseract/lang', import.meta.url).href,
        workerBlobURL: false,
        logger: message => progressListener(message)
      });
      await worker.setParameters({
        tessedit_pageseg_mode: OCR_PSM_AUTO,
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
  const primaryText = result?.data?.text || '';
  let text = primaryText;
  let fields = extractTicketFields(primaryText);
  let additionalPasses = 0;
  if (!fields.total || !fields.merchant || !fields.date) {
    await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_SPARSE_TEXT });
    try {
      onProgress({ status: 'Revisando la cabecera', progress: 0.86 });
      const headerResult = await worker.recognize(cropCanvas(prepared, 0, 0.56));
      const headerText = headerResult?.data?.text || '';
      const headerFields = extractTicketFields(headerText);
      additionalPasses += 1;
      let footerText = '';
      let footerFields = {};
      if (!fields.total) {
        onProgress({ status: 'Revisando el total', progress: 0.93 });
        const footerResult = await worker.recognize(cropCanvas(prepared, 0.43, 1));
        footerText = footerResult?.data?.text || '';
        footerFields = extractTicketFields(footerText);
        additionalPasses += 1;
      }
      text = [primaryText, headerText, footerText].filter(Boolean).join('\n');
      const mergedFields = extractTicketFields(text);
      fields = {
        documentType: mergedFields.documentType,
        date: headerFields.date || fields.date || mergedFields.date || footerFields.date || '',
        time: headerFields.time || fields.time || mergedFields.time || footerFields.time || '',
        merchant: headerFields.merchant || fields.merchant || mergedFields.merchant || '',
        total: fields.total ?? footerFields.total ?? mergedFields.total ?? null
      };
    } finally {
      await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_AUTO });
    }
  }
  return {
    text,
    confidence: Number(result?.data?.confidence) || 0,
    fields,
    additionalPasses,
    pdfFirstPageOnly: isPdf
  };
}
