let workerPromise = null;
let progressListener = () => {};
const OCR_PSM_AUTO = '3';
const OCR_PSM_SINGLE_BLOCK = '6';
const OCR_PSM_SINGLE_LINE = '7';
const OCR_PSM_SPARSE_TEXT = '11';

const cleanLine = value => String(value || '')
  .replace(/[|]/g, 'I')
  .replace(/\s+/g, ' ')
  .trim();

const DOCUMENT_PREPROCESSOR_VERSION = '700v210';

export const normalizeTicketText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const normalizeTicketConcepts = value => normalizeTicketText(value)
  .replace(/\bt[o0]ta[l1i]\b/g, 'total')
  .replace(/\bimp[o0]rte\b/g, 'importe');

const ticketLines = text => String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);

const TICKET_MONTHS = {
  ene: 1, enero: 1, gen: 1, gener: 1, jan: 1, january: 1, tammi: 1, tammikuu: 1,
  feb: 2, febrero: 2, febrer: 2, february: 2, helmi: 2, helmikuu: 2,
  mar: 3, marzo: 3, marc: 3, march: 3, maalis: 3, maaliskuu: 3,
  abr: 4, abril: 4, apr: 4, april: 4, huhti: 4, huhtikuu: 4,
  may: 5, mayo: 5, maig: 5, touko: 5, toukokuu: 5,
  jun: 6, junio: 6, juny: 6, june: 6, kesa: 6, kesakuu: 6,
  jul: 7, julio: 7, juliol: 7, july: 7, heina: 7, heinakuu: 7,
  ago: 8, agosto: 8, agost: 8, aug: 8, august: 8, elo: 8, elokuu: 8,
  sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9, setembre: 9, september: 9, syys: 9, syyskuu: 9,
  oct: 10, octubre: 10, october: 10, loka: 10, lokakuu: 10,
  nov: 11, noviembre: 11, november: 11, marras: 11, marraskuu: 11,
  dic: 12, diciembre: 12, des: 12, desembre: 12, dec: 12, december: 12, joulu: 12, joulukuu: 12
};
const TICKET_MONTH_PATTERN = Object.keys(TICKET_MONTHS).sort((a, b) => b.length - a.length).join('|');

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
    const labeled = /\b(fecha|date|fec|data|paivamaara|datum)\b/.test(normalized);
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
    const monthRegex = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])[\\s/.-]+(${TICKET_MONTH_PATTERN})[\\s/.-]+(\\d{2}|\\d{4})\\b`, 'g');
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
    const labeled = /\b(hora|time|aika|heure|ora|zeit)\b/.test(normalized);
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

const FOOD_CONCEPT_WORDS = new Set([
  'agua', 'alioli', 'arroz', 'bocadillo', 'bolleria', 'cafe', 'cana', 'carne', 'cerveza',
  'croqueta', 'croquetas', 'desayuno', 'ensalada', 'hamburguesa', 'helado', 'menu', 'pan',
  'pasta', 'pastel', 'patata', 'patatas', 'pescado', 'pizza', 'pollo', 'postre', 'racion',
  'refresco', 'sandwich', 'tapa', 'tapas', 'tarta', 'tostada', 'tortilla', 'vino'
]);
const FOOD_BUSINESS_WORDS = [
  { words: ['supermercado', 'hipermercado'], subcategories: ['Supermercado', 'Super'] },
  { words: ['heladeria'], subcategories: ['Heladeria'] },
  { words: ['panaderia'], subcategories: ['Panaderia'] },
  { words: ['pasteleria', 'confiteria'], subcategories: ['Pasteleria'] },
  { words: ['cafeteria'], subcategories: ['Cafeteria'] },
  { words: ['restaurante', 'taperia', 'meson', 'pizzeria'], subcategories: ['Restaurante'] },
  { words: ['bar', 'taberna', 'cerveceria'], subcategories: ['Bar'] }
];
const NON_CONCEPT_LINE = /\b(total|subtotal|importe|base|iva|fecha|hora|nif|cif|telefono|empleado|mesa|comensales|precio|unidad|unid|descripcion|pendiente|cobro|efectivo|cambio|tarjeta|gracias)\b/;

function normalizedConceptTokens(line) {
  return normalizeTicketText(line).match(/[a-z]{2,}/g) || [];
}

export function extractTicketFoodEvidence(text, total = null) {
  const lines = ticketLines(text);
  const allTokens = new Set(normalizedConceptTokens(text));
  const businessRule = FOOD_BUSINESS_WORDS.find(rule => rule.words.some(word => allTokens.has(word)));
  const foodTerms = new Set();
  const pricedConcepts = new Set();
  const foodConcepts = new Set();
  lines.forEach(line => {
    const normalized = normalizeTicketText(line);
    const tokens = normalizedConceptTokens(line);
    const lineFoodTerms = tokens.filter(token => FOOD_CONCEPT_WORDS.has(token));
    lineFoodTerms.forEach(token => foodTerms.add(token));
    if (NON_CONCEPT_LINE.test(normalized)) return;
    const conceptKey = tokens.join(' ');
    if (!conceptKey) return;
    const amountCount = amountsInLine(line).length;
    const quantityPrefix = /^[^\p{L}\d]{0,8}(?:\d{1,3}[,.]\d{3}|\d{1,3}\s*x)\s+\p{L}/iu.test(line);
    const productLike = lineFoodTerms.length > 0 || quantityPrefix || (amountCount >= 2 && tokens.length >= 2);
    if (amountCount && productLike) pricedConcepts.add(conceptKey);
    if (lineFoodTerms.length) foodConcepts.add(conceptKey);
  });
  const conceptCount = Math.max(pricedConcepts.size, foodConcepts.size);
  const parsedTotal = Number(total);
  const isFood = foodTerms.size > 0 || Boolean(businessRule);
  return {
    isFood,
    conceptCount,
    restaurantLikely: isFood && (
      businessRule?.subcategories[0] === 'Restaurante'
      || conceptCount >= 3
      || (Number.isFinite(parsedTotal) && parsedTotal > 15)
    ),
    subcategories: businessRule?.subcategories || [],
    terms: [...foodTerms]
  };
}

const CARD_PAYMENT_SIGNALS = /\b(copia\s+(?:cliente|comercio)|justificante|customer\s+copy|cardholder\s+copy|autorizacion|authorization|terminal|operacion|transaction|transaccion|contactless|tpv|datafono|visa|mastercard|redsys|servired|getnet|global\s+payments)\b/g;
const RECEIPT_SIGNALS = /\b(ticket|receipt|kuitti|factura(?:\s+simplificada)?|invoice|lasku|base\s+(?:imponible|imposable)|subtotal|article|articulo|item|tuote|unidades|cambio|change|mesa|iva|vat|alv)\b/g;

const BEST_TOTAL_LABEL = /\b(?:grand\s+total|total\s+(?:importe?|amount|summa|a\s+)?(?:pagar|abonar|due|payable)?|(?:importe?|amount|balance)\s+(?:total|due|payable)|importe?\s+(?:a|per|poder)\s+(?:pagar|abonar)|(?:a|per)\s+(?:pagar|abonar)|pendent\s+de\s+cobrament|montant\s+(?:total|a\s+payer)|betrag\s+(?:gesamt|zu\s+zahlen)|zu\s+zahlen|importo\s+(?:totale|da\s+pagare)|da\s+pagare|valor\s+a\s+pagar|loppusumma|kokonaissumma|maksettav(?:a|aa))\b/;
const GENERIC_TOTAL_LABEL = /\b(?:total|yhteensa|loppusumma|kokonaissumma|gesamtbetrag)\b/;
const AMOUNT_TOTAL_LABEL = /\b(?:importe?|amount|summa|betrag|montant|importo|valor)\b|\b(?:a|per)\s+(?:pagar|abonar)\b/;
const PAYMENT_DUE_LABEL = /\b(?:pendiente\s+de\s+cobro|cobro\s+pendiente|pendent\s+de\s+cobrament|amount\s+due|balance\s+due|total\s+due|maksettav(?:a|aa)|zu\s+zahlen|a\s+payer|da\s+pagare)\b/;
const TOTAL_TABLE_HEADER = /\b(?:unid(?:ad|ades)?|cant(?:idad)?|descripcion|descripcio|articulo|article|item|unit|units|qty|quantity|price|preu|quantitat|kuvaus|tuote|maara|kpl|hinta)\b/;
const TOTAL_TAX_LABEL = /\b(?:iva|vat|alv|tax|vero|tva|mwst)\b/;
const TOTAL_TAX_INCLUDED = /\b(?:iva|vat|alv|tax|vero|tva|mwst)\s+(?:incl|included|sis|compris)/;
const TOTAL_EXCLUDED_LABEL = /\b(?:subtotal|sub\s+total|valisumma|base\s+(?:imponible|imposable|iva)|taxable\s+amount|net\s+amount|netto|cuota\s+iva|cambio|change|vaihtoraha|entregado|efectivo|cash|kateinen|descuento|discount|alennus|propina|tip|juomaraha)\b/;
const TOTAL_LABEL_ONLY = /^(?:(?:grand\s+)?total|importe?|amount|summa|betrag|montant|importo|valor|yhteensa|loppusumma|kokonaissumma|gesamtbetrag|maksettav(?:a|aa)|zu\s+zahlen|a\s+payer|da\s+pagare|(?:importe?\s+)?(?:a|per|poder)\s+(?:pagar|abonar)|pendiente\s+de\s+cobro|cobro\s+pendiente|pendent\s+de\s+cobrament)(?:\s+(?:eur|euro|euros|gbp|pounds?|sek|nok|dkk))?$/;

function ticketTotalLineExcluded(normalized) {
  const taxBreakdown = TOTAL_TAX_LABEL.test(normalized) && !TOTAL_TAX_INCLUDED.test(normalized);
  return TOTAL_EXCLUDED_LABEL.test(normalized) || taxBreakdown;
}

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
    const hasBestLabel = BEST_TOTAL_LABEL.test(normalized) || /\btotal\s+(?:compra|operacion|ticket)\b/.test(normalized);
    const hasTotalLabel = GENERIC_TOTAL_LABEL.test(normalized) && !/\b(?:subtotal|sub\s+total|valisumma)\b/.test(normalized);
    const hasAmountLabel = AMOUNT_TOTAL_LABEL.test(normalized);
    const hasPaymentDueLabel = PAYMENT_DUE_LABEL.test(normalized);
    const tableHeader = TOTAL_TABLE_HEADER.test(normalized);
    const excluded = ticketTotalLineExcluded(normalized);
    let labelScore = hasBestLabel ? 130 : hasTotalLabel ? 115 : hasPaymentDueLabel ? 105 : hasAmountLabel ? 95 : 0;
    if (tableHeader && !hasTotalLabel) labelScore = 0;
    if (hasAmountLabel && !hasTotalLabel && !hasPaymentDueLabel && amounts.length > 1) labelScore = 0;
    if (excluded) labelScore -= 120;
    if (labelScore > 0 && amounts.length) {
      candidates.push({ value: amounts.at(-1), score: labelScore + (/\b(?:eur|euro|euros|gbp|pounds?|sek|nok|dkk)\b|[€£]/i.test(line) ? 10 : 0) + index / Math.max(lines.length, 1) });
    }
    const labelOnly = TOTAL_LABEL_ONLY.test(normalized.replace(/[-_=.:]/g, ' ').replace(/\s+/g, ' ').trim());
    const separatedLabel = hasBestLabel || labelOnly || hasPaymentDueLabel;
    if (labelScore > 0 && separatedLabel && !amounts.length) {
      [-1, 1].forEach(offset => {
        const nearbyIndex = index + offset;
        if (nearbyIndex < 0 || nearbyIndex >= lines.length) return;
        const nearbyAmounts = amountsInLine(lines[nearbyIndex]);
        const nearbyNormalized = normalizeTicketConcepts(lines[nearbyIndex]);
        if (nearbyAmounts.length === 1 && !ticketTotalLineExcluded(nearbyNormalized)) {
          candidates.push({ value: nearbyAmounts[0], score: labelScore - (offset < 0 ? 6 : 8) });
        }
      });
    }
  });
  return candidates.filter(item => item.value > 0).sort((a, b) => b.score - a.score)[0]?.value ?? null;
}

const MERCHANT_EXCLUSIONS = /^(ticket|receipt|kuitti|factura|invoice|lasku|simplificada|copia|cliente|customer|fecha|date|hora|time|mesa|caja|cajero|nif|cif|n\.i\.f|tel|telefono|www\.|https?|gracias|iva|vat|alv|total|subtotal|importe|import|amount|summa|yhteensa|direccion|domicilio|articulo|item|descripcion|description|unidades|venta|compra|operacion|transaction|transaccion|autorizacion|authorization|terminal|contactless|aprobada|aceptada)/i;
const MERCHANT_METADATA_WORDS = /\b(fecha|hora|date|time|data|paivamaara|aika|mesa|comensales|caja|cajero|nif|cif|telefono|ticket|receipt|kuitti|factura|invoice|lasku|total|subtotal|importe|import|amount|summa|yhteensa|iva|vat|alv|descripcion|description|kuvaus|unidades|units|maara|precio|price|hinta)\b/i;
const ADDRESS_WORDS = /\b(calle|c\/|avenida|avda|plaza|paseo|carretera|rua|rúa|cp\s*\d|codigo postal|tlf|telefono|madrid|barcelona)\b/i;
const BANK_BRAND_LINE = /^(?:bbva|banco\s+santander|santander|caixabank|la\s+caixa|bankinter|banco\s+sabadell|sabadell|ing|unicaja|kutxabank|abanca|ibercaja|openbank|revolut|wise|cajamar|comercia(?:\s+global\s+payments)?|global\s+payments|redsys|servired|worldline|getnet)$/i;
const PAYMENT_TERMINAL_LINE = /^(?:venta\b|compra\b|visa\b|mastercard\b|contactless\b|aut(?:orizacion)?[:.\s]|op(?:eracion)?[:.\s]|tran(?:saccion)?[:.\s]|terminal[:.\s]|app\s+(?:bbva|santander|caixabank|sabadell))/i;

function cleanMerchantCandidate(value) {
  return cleanLine(value)
    .replace(/^(?:[I1lf]\s+)(?=\p{Lu}{5,}(?:\s|$))/u, '')
    .replace(/\s+[I1lf]$/, '')
    .replace(/^[^\p{L}\d]+|[^\p{L}\d.)]+$/gu, '')
    .trim();
}

export function extractTicketMerchant(text) {
  const lines = ticketLines(text).slice(0, 24);
  const documentType = detectTicketDocumentType(text);
  const explicit = lines.map((line, index) => {
    const match = line.match(/^\s*(?:comercio|establecimiento|merchant|nombre\s+comercio)\s*[:.-]\s*(.+)$/i);
    return match ? { value: cleanMerchantCandidate(match[1]), score: 100 - index } : null;
  }).filter(item => item && /\p{L}{3}/iu.test(item.value) && !/^\d+$/.test(item.value));
  if (explicit.length) return explicit.sort((a, b) => b.score - a.score)[0].value;
  const bankHeaderIndex = lines.findIndex(line => BANK_BRAND_LINE.test(line));
  const receiptBodyIndex = documentType === 'receipt'
    ? lines.findIndex(line => {
      const normalized = normalizeTicketText(line);
      return TOTAL_TABLE_HEADER.test(normalized) && AMOUNT_TOTAL_LABEL.test(normalized);
    })
    : -1;
  const fiscalDetailsIndex = lines.findIndex(line => /^\s*(?:n\.?i\.?f\.?|c\.?i\.?f\.?)\b/i.test(line));
  const candidates = lines.map((line, index) => {
    const letters = line.match(/\p{L}/gu) || [];
    const uppercase = line.match(/\p{Lu}/gu) || [];
    let score = Math.max(0, 10 - index * 0.6);
    if (letters.length < 3 || line.length > 70 || MERCHANT_EXCLUSIONS.test(line)) score -= 30;
    if (MERCHANT_METADATA_WORDS.test(normalizeTicketText(line))) score -= 60;
    if (BANK_BRAND_LINE.test(line)) score -= 60;
    if (PAYMENT_TERMINAL_LINE.test(line)) score -= 35;
    if (/\b\d{5}\b|@|\.com\b|\b(es|com|net)\b$/i.test(line) || ADDRESS_WORDS.test(line)) score -= 12;
    if (fiscalDetailsIndex >= 0 && index < fiscalDetailsIndex) {
      const distance = fiscalDetailsIndex - index;
      if (distance >= 2 && distance <= 4) score += 18 + distance * 4;
    }
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
    return { value: cleanMerchantCandidate(line), score };
  }).filter(item => item.value);
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return best?.score > 0 ? best.value : '';
}

export function isPlausibleTicketMerchant(value) {
  const line = cleanLine(value);
  const normalized = normalizeTicketText(line);
  const letters = normalized.match(/[a-z]/g) || [];
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  if (letters.length < 5 || compact.length < 5 || line.length > 60) return false;
  if (MERCHANT_EXCLUSIONS.test(line) || MERCHANT_METADATA_WORDS.test(normalized)) return false;
  if (ADDRESS_WORDS.test(line) || BANK_BRAND_LINE.test(line) || PAYMENT_TERMINAL_LINE.test(line)) return false;
  if (/\b\d{1,2}[:./-]\d{1,2}\b|^\d+$/.test(normalized)) return false;
  return letters.length / Math.max(1, line.replace(/\s/g, '').length) >= 0.58;
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

function ticketTextDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function correctTicketMerchantFromKnown(merchant, descriptions = []) {
  const source = cleanLine(merchant);
  const sourceKey = normalizeTicketText(source).replace(/[^a-z0-9]/g, '');
  if (sourceKey.length < 5) return source;
  const candidates = descriptions.map(value => cleanLine(String(value || '').split(/\r?\n|[.;,]|\s+-\s+/)[0]))
    .filter(value => value.length >= 5 && value.length <= 50 && value.split(/\s+/).length <= 5)
    .map(value => ({
      value,
      key: normalizeTicketText(value).replace(/[^a-z0-9]/g, '')
    }))
    .filter(item => item.key.slice(0, 4) === sourceKey.slice(0, 4) && Math.abs(item.key.length - sourceKey.length) <= 2)
    .map(item => ({ ...item, distance: ticketTextDistance(sourceKey, item.key) }))
    .sort((left, right) => left.distance - right.distance || Math.abs(left.key.length - sourceKey.length) - Math.abs(right.key.length - sourceKey.length));
  const best = candidates[0];
  const maximumDistance = sourceKey.length >= 8 ? 2 : 1;
  return best && best.distance > 0 && best.distance <= maximumDistance ? best.value : source;
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

function canvasFromGrayscale(values, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(width, height);
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < values.length; sourceIndex += 1, targetIndex += 4) {
    const value = values[sourceIndex];
    pixels.data[targetIndex] = value;
    pixels.data[targetIndex + 1] = value;
    pixels.data[targetIndex + 2] = value;
    pixels.data[targetIndex + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function prepareImageWithDocumentScanner(image, sourceWidth, sourceHeight, onProgress) {
  if (typeof Worker !== 'function') return Promise.reject(new Error('El navegador no admite el preprocesado documental.'));
  onProgress({ status: 'Detectando y enderezando el ticket', progress: 0.03 });
  const maximumPixels = 6_000_000;
  const scale = Math.min(
    1,
    3000 / Math.max(sourceWidth, sourceHeight, 1),
    Math.sqrt(maximumPixels / Math.max(1, sourceWidth * sourceHeight))
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(`./ticket-image-worker.js?v=${DOCUMENT_PREPROCESSOR_VERSION}`, import.meta.url));
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('El preprocesado del ticket ha tardado demasiado.'));
    }, 60000);
    const finish = callback => value => {
      clearTimeout(timeout);
      worker.terminate();
      callback(value);
    };
    worker.addEventListener('error', finish(event => reject(event.error || new Error(event.message || 'No se pudo preparar el ticket.'))), { once: true });
    worker.addEventListener('message', event => {
      const result = event.data || {};
      if (result.type === 'progress') {
        onProgress({ status: result.status || 'Preparando el ticket', progress: 0.05 });
        return;
      }
      clearTimeout(timeout);
      worker.terminate();
      if (result.error) {
        reject(new Error(result.error));
        return;
      }
      onProgress({ status: result.documentDetected ? 'Ticket enderezado' : 'Mejorando la imagen', progress: 0.07 });
      resolve({
        primary: canvasFromGrayscale(new Uint8ClampedArray(result.enhancedBuffer), result.width, result.height),
        binary: canvasFromGrayscale(new Uint8ClampedArray(result.binaryBuffer), result.width, result.height),
        documentDetected: Boolean(result.documentDetected)
      });
    });
    worker.postMessage({ width, height, buffer: pixels.data.buffer }, [pixels.data.buffer]);
  });
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

export function findFirstTextBand(data, width, height) {
  if (!data || width < 8 || height < 8 || data.length < width * height * 4) return null;
  const scan = (startRatio, endRatio) => {
    const startY = Math.max(0, Math.floor(height * startRatio));
    const endY = Math.min(height, Math.ceil(height * endRatio));
    const minimumDarkPixels = Math.max(5, Math.round(width * 0.012));
    const minimumBandHeight = Math.max(3, Math.round(height * 0.003));
    const allowedGap = Math.max(2, Math.round(height * 0.0015));
    let bandStart = -1;
    let lastActive = -1;
    const finishBand = () => {
      if (bandStart < 0 || lastActive - bandStart + 1 < minimumBandHeight) return null;
      let minX = width;
      let maxX = -1;
      for (let y = bandStart; y <= lastActive; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          if (data[offset] < 150) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
          }
        }
      }
      if (maxX < minX || maxX - minX + 1 < width * 0.08) return null;
      const padX = Math.max(4, Math.round(width * 0.035));
      const padY = Math.max(3, Math.round((lastActive - bandStart + 1) * 0.18));
      const x = Math.max(0, minX - padX);
      const y = Math.max(0, bandStart - padY);
      return {
        x,
        y,
        width: Math.min(width, maxX + padX + 1) - x,
        height: Math.min(height, lastActive + padY + 1) - y
      };
    };
    for (let y = startY; y < endY; y += 1) {
      let darkPixels = 0;
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4] < 150) darkPixels += 1;
      }
      if (darkPixels >= minimumDarkPixels) {
        if (bandStart < 0) bandStart = y;
        lastActive = y;
      } else if (bandStart >= 0 && y - lastActive > allowedGap) {
        const band = finishBand();
        if (band) return band;
        bandStart = -1;
        lastActive = -1;
      }
    }
    return finishBand();
  };
  return scan(0.08, 0.48) || scan(0.02, 0.48);
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

function cropCanvasBounds(source, bounds, binary = false) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));
  const context = canvas.getContext('2d', { willReadFrequently: binary });
  context.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  if (binary) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const value = pixels.data[index] < 185 ? 0 : 255;
      pixels.data[index] = value;
      pixels.data[index + 1] = value;
      pixels.data[index + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
  }
  return canvas;
}

function prepareImageFallback(image, sourceWidth, sourceHeight) {
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
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const grey = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
    const contrasted = grey < 140 ? Math.max(0, grey * 0.75) : Math.min(255, grey * 1.08);
    pixels.data[index] = contrasted;
    pixels.data[index + 1] = contrasted;
    pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return { primary: canvas, binary: null, documentDetected: Boolean(detectedBounds) };
}

async function prepareImage(source, onProgress) {
  const blob = typeof source === 'string' ? await dataUrlToBlob(source) : source;
  const image = await imageFromBlob(blob);
  const sourceWidth = image.width || image.naturalWidth;
  const sourceHeight = image.height || image.naturalHeight;
  try {
    try {
      return await prepareImageWithDocumentScanner(image, sourceWidth, sourceHeight, onProgress);
    } catch (error) {
      console.warn('No se pudo usar el preprocesado documental; se aplica el modo compatible.', error);
      onProgress({ status: 'Aplicando mejora compatible', progress: 0.06 });
      return prepareImageFallback(image, sourceWidth, sourceHeight);
    }
  } finally {
    if (image.close) image.close();
  }
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
  return { primary: canvas, binary: null, documentDetected: true };
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
  const preparedResult = isPdf ? await preparePdf(source, onProgress) : await prepareImage(source, onProgress);
  const prepared = preparedResult.primary;
  onProgress({ status: 'Preparando el lector local', progress: 0.08 });
  const worker = await getWorker(onProgress);
  const recognitionPsm = preparedResult.binary && preparedResult.documentDetected
    ? OCR_PSM_SINGLE_BLOCK
    : OCR_PSM_AUTO;
  if (recognitionPsm !== OCR_PSM_AUTO) {
    await worker.setParameters({ tessedit_pageseg_mode: recognitionPsm });
  }
  try {
  const result = await worker.recognize(prepared, { rotateAuto: recognitionPsm === OCR_PSM_AUTO });
  const primaryText = result?.data?.text || '';
  let text = primaryText;
  let classificationText = primaryText;
  let fields = extractTicketFields(primaryText);
  if (fields.merchant && !isPlausibleTicketMerchant(fields.merchant)) fields.merchant = '';
  let additionalPasses = 0;
  let titleMerchant = '';
  if (preparedResult.binary && (preparedResult.documentDetected || !fields.total || !fields.merchant || !fields.date)) {
    onProgress({ status: 'Revisando la imagen con contraste adaptativo', progress: 0.78 });
    const binaryResult = await worker.recognize(preparedResult.binary, { rotateAuto: false });
    const binaryText = binaryResult?.data?.text || '';
    const binaryFields = extractTicketFields(binaryText);
    if (binaryFields.merchant && !isPlausibleTicketMerchant(binaryFields.merchant)) binaryFields.merchant = '';
    text = [primaryText, binaryText].filter(Boolean).join('\n');
    if (binaryText.trim()) classificationText = binaryText;
    fields = {
      documentType: detectTicketDocumentType(text),
      date: fields.date || binaryFields.date || '',
      time: fields.time || binaryFields.time || '',
      merchant: preparedResult.documentDetected
        ? binaryFields.merchant || fields.merchant || ''
        : fields.merchant || binaryFields.merchant || '',
      total: fields.total ?? binaryFields.total ?? null
    };
    additionalPasses += 1;
  }
  const preparedContext = prepared.getContext('2d', { willReadFrequently: true });
  const titleBounds = findFirstTextBand(
    preparedContext.getImageData(0, 0, prepared.width, prepared.height).data,
    prepared.width,
    prepared.height
  );
  if (!fields.merchant && titleBounds) {
    await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_SINGLE_LINE });
    try {
      onProgress({ status: 'Leyendo el título', progress: 0.82 });
      const titleResult = await worker.recognize(cropCanvasBounds(prepared, titleBounds, true));
      const titleText = titleResult?.data?.text || '';
      const titleConfidence = Number(titleResult?.data?.confidence || 0);
      const titleCandidate = extractTicketMerchant(titleText);
      if (isPlausibleTicketMerchant(titleCandidate) && titleConfidence >= 60) {
        titleMerchant = titleCandidate;
        fields.merchant = titleMerchant;
      }
      text = [titleText, primaryText].filter(Boolean).join('\n');
      additionalPasses += 1;
    } finally {
      await worker.setParameters({ tessedit_pageseg_mode: recognitionPsm });
    }
  }
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
      const mergedMerchant = [fields.merchant, headerFields.merchant, mergedFields.merchant]
        .find(isPlausibleTicketMerchant) || titleMerchant || '';
      fields = {
        documentType: mergedFields.documentType,
        date: headerFields.date || fields.date || mergedFields.date || footerFields.date || '',
        time: headerFields.time || fields.time || mergedFields.time || footerFields.time || '',
        merchant: mergedMerchant,
        total: fields.total ?? footerFields.total ?? mergedFields.total ?? null
      };
    } finally {
      await worker.setParameters({ tessedit_pageseg_mode: recognitionPsm });
    }
  }
  return {
    text,
    classificationText,
    confidence: Number(result?.data?.confidence) || 0,
    fields,
    foodEvidence: extractTicketFoodEvidence(classificationText, fields.total),
    additionalPasses,
    pdfFirstPageOnly: isPdf,
    documentDetected: preparedResult.documentDetected
  };
  } finally {
    if (recognitionPsm !== OCR_PSM_AUTO) {
      try {
        await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_AUTO });
      } catch (_) {
        // El siguiente uso vuelve a preparar el lector; este restablecimiento es preventivo.
      }
    }
  }
}
