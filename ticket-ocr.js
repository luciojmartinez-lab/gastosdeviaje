let workerPromise = null;
let workerLanguageKey = '';
let ticketRecognitionTail = Promise.resolve();
let progressListener = () => {};
const OCR_WORKER_START_TIMEOUT_MS = 45_000;
const OCR_PSM_AUTO = '3';
const OCR_PSM_SINGLE_BLOCK = '6';
const OCR_PSM_SINGLE_LINE = '7';
const OCR_PSM_SPARSE_TEXT = '11';

const cleanLine = value => String(value || '')
  .replace(/[|]/g, 'I')
  .replace(/\s+/g, ' ')
  .trim();

const DOCUMENT_PREPROCESSOR_VERSION = '700v317';

export const normalizeTicketText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export function isGoogleLensTranslationText(text) {
  return /translated\s+with[\s\S]{0,32}google\s+lens/i.test(String(text || ''));
}

export function isGoogleLensAiReceiptSummary(text) {
  const normalized = normalizeTicketText(text).replace(/\s+/g, ' ');
  const sectionSignals = [
    /\bdetalles\s+de\s+la\s+compra\b/,
    /\bdetalles\s+del\s+comercio\b/,
    /\binformacion\s+de\s+la\s+tienda\b/,
    /\binformacion\s+de\s+la\s+transaccion\b/,
    /\bdesglose\s+de\s+productos\b/,
    /\bdesglose\s+detallado\b/,
    /\barticulos\s+adquiridos\b/,
    /\btotales\s+y\s+pago\b/
  ].filter(pattern => pattern.test(normalized)).length;
  const economicBreakdownSignals = [
    /\bcantidad\s+total\s+de\s+articulos\b/,
    /\bmonto\s+imponible\b/,
    /\bmonto\s+exento\s+de\s+impuestos\b/,
    /\btotal\s+de\s+la\s+compra\b/,
    /\bimporte\s+total\s+del\s+impuesto\s+ahorrado\b/,
    /\bmetodo\s+de\s+pago\s+utilizado\b/
  ].filter(pattern => pattern.test(normalized)).length;
  return /\bvista\s+creada\s+con\s+(?:ia|la)\b/.test(normalized)
    || sectionSignals >= 2
    || (/\b(?:informacion\s+de\s+la\s+tienda|este\s+es\s+un\s+recibo\s+de\s+compra)\b/.test(normalized)
      && /(?:^|\s)[*•·-]\s*(?:tienda|comercio|establecimiento|lugar|negocio|local|empresa|vendedor|proveedor|cadena|sucursal)\s*:/i.test(String(text || '')))
    || (/\bdesglose\s+economico\b/.test(normalized) && economicBreakdownSignals >= 2)
    || /\bel\s+ticket\s+de\s+compra\s+es\s+de\s+una\s+tienda\b[\s\S]{0,100}\btotal\b/.test(normalized)
    || /\beste\s+es\s+(?:el|un)\s+recibo\b[\s\S]{0,180}\b(?:de|en)\s+una\s+tienda\b/.test(normalized);
}

const normalizeTicketConcepts = value => normalizeTicketText(value)
  .replace(/\bt[o0]ta[l1i]\b/g, 'total')
  .replace(/\bimp[o0]rte\b/g, 'importe');

const ticketLines = text => String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);

function googleLensAiSummaryBody(text) {
  const lines = ticketLines(text);
  const start = lines.findIndex(line => /\b(?:vista\s+creada\s+con\s+(?:ia|la)|detalles\s+de\s+la\s+compra|detalles\s+del\s+comercio|informacion\s+de\s+la\s+tienda|desglose\s+economico|este\s+es\s+(?:el|un)\s+recibo|el\s+ticket\s+de\s+compra)\b/i.test(normalizeTicketText(line)));
  const body = start >= 0 ? lines.slice(start) : lines;
  const end = body.findIndex(line => /\bcoincidencias\s+(?:visuales|exactas)\b/i.test(normalizeTicketText(line)));
  return (end >= 0 ? body.slice(0, end) : body).join('\n');
}

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
    const labeled = /\b(fecha|date|fec|data|paivamaara|datum)\b/.test(normalized) || /(?:日付|年月日|날짜|일자)/u.test(line);
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
    const eastAsianRegex = /(\d{4})\s*(?:年|년)\s*(0?[1-9]|1[0-2])\s*(?:月|월)\s*(0?[1-9]|[12]\d|3[01])\s*(?:日|일)?/gu;
    while ((match = eastAsianRegex.exec(line))) {
      const value = validDateParts(Number(match[3]), Number(match[2]), Number(match[1]));
      if (value) candidates.push({ value, score: (labeled ? 38 : 18) - index * 0.05 });
    }
    const monthRegex = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])(?:[\\s/.-]+|\\s+de\\s+)(${TICKET_MONTH_PATTERN})(?:[\\s/.-]+|\\s+de\\s+)(\\d{2}|\\d{4})\\b`, 'g');
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
    const labeled = /\b(hora|time|aika|heure|ora|zeit)\b/.test(normalized) || /(?:時刻|時間|시간)/u.test(line);
    const writtenDate = new RegExp(`\\b(?:0?[1-9]|[12]\\d|3[01])(?:[\\s/.-]+|\\s+de\\s+)(?:${TICKET_MONTH_PATTERN})(?:[\\s/.-]+|\\s+de\\s+)(?:\\d{2}|\\d{4})\\b`).test(normalized);
    const sharesLineWithDate = writtenDate || /\b(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:\d{2}|\d{4})\b|\b\d{4}[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:0?[1-9]|[12]\d|3[01])\b/.test(normalized);
    const phoneLine = /\b(?:tel(?:efono)?|phone|telefono|fax)\b/.test(normalized);
    const regex = /\b([01]?\d|2[0-3])\s*([:.h])\s*([0-5]\d)(?::[0-5]\d)?\b/gi;
    let match;
    while ((match = regex.exec(line))) {
      if (phoneLine && !labeled && !sharesLineWithDate) continue;
      if (match[2] === '.' && !labeled && !sharesLineWithDate) continue;
      candidates.push({
        value: `${String(Number(match[1])).padStart(2, '0')}:${match[3]}`,
        score: (labeled ? 35 : 12) + (sharesLineWithDate ? 12 : 0) - index * 0.05
      });
    }
    const eastAsianRegex = /\b([01]?\d|2[0-3])\s*(?:時|시)\s*([0-5]?\d)\s*(?:分|분)?/gu;
    while ((match = eastAsianRegex.exec(line))) {
      candidates.push({ value: `${String(Number(match[1])).padStart(2, '0')}:${String(Number(match[2])).padStart(2, '0')}`, score: (labeled ? 38 : 18) - index * 0.05 });
    }
    if (labeled && !writtenDate) {
      const compactRegex = /\b([01]\d|2[0-3])([0-5]\d)\b/g;
      while ((match = compactRegex.exec(normalized))) {
        candidates.push({ value: `${match[1]}:${match[2]}`, score: 30 - index * 0.05 });
      }
    }
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.value || '';
}

function extractGoogleLensAiSummaryTime(text) {
  if (!isGoogleLensAiReceiptSummary(text)) return '';
  const summary = googleLensAiSummaryBody(text);
  const normalized = normalizeTicketText(summary).replace(/\s+/g, ' ');
  const match = normalized.match(/\bfecha\s+y\s+hora\b[\s\S]{0,160}?\b(?:a\s+las\s+)?([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)\b/);
  return match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : extractTicketTime(summary);
}

function extractGoogleLensAiSummaryDate(text) {
  return isGoogleLensAiReceiptSummary(text) ? extractTicketDate(googleLensAiSummaryBody(text)) : '';
}

export function extractGoogleLensAiTotal(text) {
  if (!isGoogleLensAiReceiptSummary(text)) return null;
  const summary = normalizeOcrCurrencyMarkers(googleLensAiSummaryBody(text)).replace(/\s+/g, ' ');
  const match = summary.match(/\b(?:total\s+pagado|total\s+de\s+la\s+compra|total\s+de)\s*:?\s*([€$£¥])?\s*(\d(?:[\d.,\s]*\d)?)\s*(yen(?:es)?|jpy|won(?:es)?|krw|euros?|eur|dolares?|usd|libras?|gbp)?/i);
  if (!match) return null;
  const currency = normalizeTicketText(match[3]);
  const integerCurrency = match[1] === '¥' || /^(?:yen|yenes|jpy|won|wones|krw)$/.test(currency);
  const value = integerCurrency
    ? Number(String(match[2]).replace(/\D/g, ''))
    : parseTicketAmount(match[2]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseTicketAmount(value) {
  let raw = String(value || '')
    .replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0')
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
  const numericText = String(line || '').replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0');
  const matches = numericText.match(/(?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d{1,2})/g) || [];
  return matches.map(parseTicketAmount).filter(value => Number.isFinite(value));
}

function normalizeOcrCurrencyMarkers(value) {
  return String(value || '')
    .replace(/(?<![\p{L}\d])Y(?:[xXrR*])?(?=\s*[\dBbZzSsIiLlOo|])/gu, '¥')
    .replace(/(?<![\p{L}\d])(?:[xX*\\])(?=\s*\d{2,}(?![\p{L}\d]))/gu, '¥');
}

function parseOcrCurrencyInteger(value) {
  const compact = String(value || '').replace(/[,\.\s]/g, '');
  if (/^\d+$/.test(compact)) return Number(compact);
  if (!/^[BbZzSsIiLlOo|][\dBbZzSsIiLlOo|]+$/.test(compact)) return null;
  const corrected = compact
    .replace(/[Bb]/g, '8')
    .replace(/[Zz]/g, '2')
    .replace(/[Ss]/g, '5')
    .replace(/[IiLl|]/g, '1')
    .replace(/[Oo]/g, '0');
  return /^\d+$/.test(corrected) ? Number(corrected) : null;
}

function integerCurrencyAmountsInLine(line) {
  const normalized = normalizeOcrCurrencyMarkers(
    String(line || '').replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0')
  );
  const prefixed = Array.from(normalized.matchAll(/[¥₩￥]\s*([\dBbZzSsIiLlOo|](?:[\dBbZzSsIiLlOo|,.\s]*[\dBbZzSsIiLlOo|])?)(?![\p{L}\d])/gu))
    .map(match => parseOcrCurrencyInteger(match[1]));
  const suffixed = Array.from(normalized.matchAll(/(?:^|[^\p{L}\d])((?:\d{1,3}(?:[,.\s]\d{3})+|\d+))\s*(?:円|원|jpy|krw)(?![\p{L}\d])/giu))
    .map(match => Number(String(match[1] || '').replace(/\D/g, '')));
  return prefixed.concat(suffixed).filter(value => Number.isFinite(value));
}

function labeledIntegerAmountsInLine(line) {
  const normalized = normalizeOcrCurrencyMarkers(normalizeTicketText(line).replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0'));
  const labelIndex = normalized.search(/\b(?:grand\s+)?total\b|\b(?:importe?|amount|summa|betrag|montant|importo|valor)\b|\b(?:a|per)\s+(?:pagar|abonar)\b/);
  if (labelIndex < 0) return [];
  const tail = normalized.slice(labelIndex);
  return Array.from(tail.matchAll(/(?:^|[^\p{L}\d])((?:\d{1,3}(?:[,\s.]\d{3})+)|\d+)(?![\p{L}\d,.])/gu))
    .filter(match => !/^\s*%/.test(tail.slice((match.index || 0) + match[0].length)))
    .map(match => Number(String(match[1] || '').replace(/\D/g, '')))
    .filter(value => Number.isFinite(value) && value > 0);
}

function groupedIntegerAmountsInLine(line) {
  const normalized = String(line || '').replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0');
  return Array.from(normalized.matchAll(/(?:^|[^\d])((?:\d{1,3})(?:[,.\s]+\d{3})+)(?!\d)/g))
    .map(match => Number(String(match[1] || '').replace(/\D/g, '')))
    .filter(value => Number.isFinite(value));
}

function standaloneIntegerAmount(line) {
  const value = normalizeOcrCurrencyMarkers(String(line || '').replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0')).trim();
  if (!/^(?:[¥₩￥]\s*)?(?:\d{1,3}(?:[,.\s]+\d{3})+|\d+)(?:\s*(?:円|원|jpy|krw))?$/iu.test(value)) return [];
  const amount = Number(value.replace(/\D/g, ''));
  return Number.isFinite(amount) ? [amount] : [];
}

function eastAsianFallbackAmountsInLine(line) {
  const normalized = String(line || '').replace(/(?<=\d)[oOuU](?=\d|\b)/g, '0');
  const matches = normalized.match(/(?:[¥₩￥\\]\s*)?\d{1,3}(?:\s*[, .]+\s*\d{3})+(?:\s*(?:円|원|jpy|krw))?/giu) || [];
  return matches.map(value => Number(value.replace(/\D/g, ''))).filter(value => Number.isFinite(value) && value > 0);
}

const FOOD_CONCEPT_WORDS = new Set([
  'agua', 'alioli', 'arandano', 'arandanos', 'arroz', 'bocadillo', 'bolleria', 'bollo', 'cafe', 'cana', 'carne', 'cerveza',
  'chocolat', 'chocolate', 'croqueta', 'croquetas', 'desayuno', 'dulce', 'ensalada', 'galleta', 'hamburguesa', 'helado', 'menu', 'pan',
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

const CARD_PAYMENT_SIGNALS = /\b(copia\s+(?:cliente|comercio)|justificante|customer\s+copy|cardholder\s+copy|aut|autorizacion|authorization|terminal|operacion|transaction|transaccion|contactless|tpv|datafono|visa|mastercard|redsys|servired|getnet|global\s+payments)\b/g;
const RECEIPT_SIGNALS = /\b(ticket|receipt|kuitti|factura(?:\s+simplificada)?|invoice|lasku|base\s+(?:imponible|imposable)|subtotal|article|articulo|item|tuote|unidades|cambio|change|mesa|iva|vat|alv)\b/g;
const EAST_ASIAN_RECEIPT_SIGNALS = /(?:領収書|レシート|請求書|영수증|계산서)/gu;

const BEST_TOTAL_LABEL = /\b(?:grand\s+total|total\s+(?:importe?|amount|summa|a\s+)?(?:pagar|abonar|due|payable)?|(?:importe?|amount|balance)\s+(?:total|due|payable)|importe?\s+(?:a|per|poder)\s+(?:pagar|abonar)|(?:a|per)\s+(?:pagar|abonar)|pendent\s+de\s+cobrament|montant\s+(?:total|a\s+payer)|betrag\s+(?:gesamt|zu\s+zahlen)|zu\s+zahlen|importo\s+(?:totale|da\s+pagare)|da\s+pagare|valor\s+a\s+pagar|loppusumma|kokonaissumma|maksettav(?:a|aa))\b/;
const GENERIC_TOTAL_LABEL = /\b(?:total|yhteensa|loppusumma|kokonaissumma|gesamtbetrag)\b/;
const AMOUNT_TOTAL_LABEL = /\b(?:importe?|amount|summa|betrag|montant|importo|valor)\b|\b(?:a|per)\s+(?:pagar|abonar)\b/;
const PAYMENT_DUE_LABEL = /\b(?:pendiente\s+de\s+cobro|cobro\s+pendiente|pendent\s+de\s+cobrament|amount\s+due|balance\s+due|total\s+due|maksettav(?:a|aa)|zu\s+zahlen|a\s+payer|da\s+pagare)\b/;
// Google Lens occasionally translates the Japanese receipt label 合計 (total)
// as the Spanish verb "combinar". Treat it as a total only when the line also
// contains an amount, so ordinary prose using that verb cannot win by itself.
const LENS_MISTRANSLATED_TOTAL_LABEL = /^\s*(?:[iIlL1|]\s+)?(?:combinar|combinado)\b(?=[^\d¥₩￥]*[¥₩￥]?\s*\d)/i;
const TOTAL_TABLE_HEADER = /\b(?:unid(?:ad|ades)?|cant(?:idad)?|descripcion|descripcio|articulo|article|item|unit|units|qty|quantity|price|preu|quantitat|kuvaus|tuote|maara|kpl|hinta)\b/;
const TOTAL_TAX_LABEL = /\b(?:iva|vat|alv|tax|impuesto|impuestos|impositiv(?:a|o|as|os)|vero|tva|mwst)\b/;
const TOTAL_TAX_INCLUDED = /\b(?:iva|vat|alv|tax|impuesto|impuestos|vero|tva|mwst)\s+(?:incl|incluido|incluidos|included|sis|compris)/;
const TOTAL_EXCLUDED_LABEL = /\b(?:subtotal|sub\s+total|total\s+parcial|partial\s+total|valisumma|total\s+(?:del?\s+)?producto|product\s+total|base\s+(?:imponible|imposable|iva)|taxable\s+amount|net\s+amount|netto|cuota\s+iva|deposito|deposit|importe\s+recibido|amount\s+(?:received|tendered)|recibido|received|tendered|cambio|cambiar|change|vaihtoraha|vuelto|entregado|efectivo|cash|kateinen|descuento|discount|alennus|propina|tip|juomaraha)\b/;
const PER_PERSON_TOTAL_LABEL = /\b(?:total\s*(?:\/|por\s+|per\s+)(?:comensal(?:es)?|persona(?:s)?|person|diner)|(?:importe?\s+)?(?:por|per)\s+(?:comensal(?:es)?|persona(?:s)?|person|diner)|cada\s+(?:comensal|persona))\b/;
const TOTAL_LABEL_ONLY = /^(?:(?:grand\s+)?total|importe?|amount|summa|betrag|montant|importo|valor|yhteensa|loppusumma|kokonaissumma|gesamtbetrag|maksettav(?:a|aa)|zu\s+zahlen|a\s+payer|da\s+pagare|(?:importe?\s+)?(?:a|per|poder)\s+(?:pagar|abonar)|pendiente\s+de\s+cobro|cobro\s+pendiente|pendent\s+de\s+cobrament)(?:\s+(?:eur|euro|euros|gbp|pounds?|sek|nok|dkk))?$/;
const EAST_ASIAN_BEST_TOTAL_LABEL = /(?:総\s*合\s*計|合\s*計\s*金\s*額|お\s*支\s*払(?:\s*い)?(?:\s*合\s*計|\s*金\s*額)?|お\s*会\s*計|合\s*計|支\s*払\s*合\s*計|합\s*계\s*금\s*액|총\s*결\s*제\s*금\s*액|결\s*제\s*금\s*액|받\s*을\s*금\s*액|총\s*액|합\s*계)/u;
const EAST_ASIAN_TOTAL_LABEL_ONLY = /^(?:総\s*合\s*計|合\s*計\s*金\s*額|お\s*支\s*払(?:\s*い)?(?:\s*合\s*計|\s*金\s*額)?|お\s*会\s*計|合\s*計|支\s*払\s*合\s*計|합\s*계\s*금\s*액|총\s*결\s*제\s*금\s*액|결\s*제\s*금\s*액|받\s*을\s*금\s*액|총\s*액|합\s*계)(?:\s*(?:jpy|krw|円|원))?$/iu;
const EAST_ASIAN_EXCLUDED_TOTAL_LABEL = /(?:小計|消費税|税額|お預り|お釣り|소계|부가세|세액|거스름돈)/u;

function ticketTotalLineExcluded(normalized) {
  const taxBreakdown = TOTAL_TAX_LABEL.test(normalized) && !TOTAL_TAX_INCLUDED.test(normalized);
  return TOTAL_EXCLUDED_LABEL.test(normalized) || EAST_ASIAN_EXCLUDED_TOTAL_LABEL.test(normalized) || taxBreakdown;
}

function isBareTicketTotalLine(line) {
  const source = String(line || '');
  const match = /(?:grand\s+)?total\s*[:=.-]?\s*(?:[€£¥₩￥$]|\d)/iu.exec(source);
  if (!match) return false;
  // Lens sometimes prefixes the real total with a long OCR rendering of the
  // receipt separator. Accept punctuation and isolated stray letters there,
  // but not an actual product or explanatory phrase.
  return !/[\p{L}\d]{2,}/u.test(source.slice(0, match.index));
}

function validOcrBox(box) {
  return box
    && [box.x0, box.y0, box.x1, box.y1].every(value => Number.isFinite(Number(value)))
    && Number(box.x1) > Number(box.x0)
    && Number(box.y1) > Number(box.y0);
}

function ticketOcrLineFragments(blocks = []) {
  const fragments = [];
  (Array.isArray(blocks) ? blocks : []).forEach(block => {
    (block?.paragraphs || []).forEach(paragraph => {
      (paragraph?.lines || []).forEach(line => {
        const words = (line?.words || [])
          .filter(word => cleanLine(word?.text) && validOcrBox(word?.bbox))
          .sort((left, right) => Number(left.bbox.x0) - Number(right.bbox.x0));
        const text = cleanLine(line?.text) || cleanLine(words.map(word => word.text).join(' '));
        const wordBox = words.length ? {
          x0: Math.min(...words.map(word => Number(word.bbox.x0))),
          y0: Math.min(...words.map(word => Number(word.bbox.y0))),
          x1: Math.max(...words.map(word => Number(word.bbox.x1))),
          y1: Math.max(...words.map(word => Number(word.bbox.y1)))
        } : null;
        const box = validOcrBox(line?.bbox) ? line.bbox : wordBox;
        if (!text || !validOcrBox(box)) return;
        const baselineValues = [line?.baseline?.y0, line?.baseline?.y1]
          .map(Number)
          .filter(Number.isFinite);
        fragments.push({
          text,
          confidence: Number(line?.confidence || 0),
          x0: Number(box.x0),
          y0: Number(box.y0),
          x1: Number(box.x1),
          y1: Number(box.y1),
          baselineY: baselineValues.length
            ? baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length
            : null
        });
      });
    });
  });
  return fragments.filter((fragment, index, values) => !values.slice(0, index).some(previous => (
    previous.text === fragment.text
      && Math.abs(previous.x0 - fragment.x0) <= 1
      && Math.abs(previous.y0 - fragment.y0) <= 1
      && Math.abs(previous.x1 - fragment.x1) <= 1
      && Math.abs(previous.y1 - fragment.y1) <= 1
  )));
}

function median(values = []) {
  const ordered = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!ordered.length) return 0;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function fragmentFitsTicketRow(row, fragment, medianHeight) {
  const rowHeight = Math.max(1, row.y1 - row.y0);
  const fragmentHeight = Math.max(1, fragment.y1 - fragment.y0);
  const baselineTolerance = Math.max(4, medianHeight * 0.35);
  if (Number.isFinite(row.baselineY) && Number.isFinite(fragment.baselineY)) {
    return Math.abs(row.baselineY - fragment.baselineY) <= baselineTolerance;
  }
  const overlap = Math.max(0, Math.min(row.y1, fragment.y1) - Math.max(row.y0, fragment.y0));
  const overlapRatio = overlap / Math.min(rowHeight, fragmentHeight);
  const rowCenter = (row.y0 + row.y1) / 2;
  const fragmentCenter = (fragment.y0 + fragment.y1) / 2;
  return overlapRatio >= 0.45
    && Math.abs(rowCenter - fragmentCenter) <= Math.max(4, Math.max(rowHeight, fragmentHeight) * 0.6);
}

export function reconstructTicketLayoutRows(blocks = []) {
  const fragments = ticketOcrLineFragments(blocks);
  const medianHeight = median(fragments.map(fragment => fragment.y1 - fragment.y0)) || 12;
  const rows = [];
  fragments
    .sort((left, right) => (left.baselineY ?? (left.y0 + left.y1) / 2) - (right.baselineY ?? (right.y0 + right.y1) / 2)
      || left.x0 - right.x0)
    .forEach(fragment => {
      const matches = rows
        .filter(row => fragmentFitsTicketRow(row, fragment, medianHeight))
        .sort((left, right) => {
          const leftCenter = Number.isFinite(left.baselineY) ? left.baselineY : (left.y0 + left.y1) / 2;
          const rightCenter = Number.isFinite(right.baselineY) ? right.baselineY : (right.y0 + right.y1) / 2;
          const fragmentCenter = Number.isFinite(fragment.baselineY) ? fragment.baselineY : (fragment.y0 + fragment.y1) / 2;
          return Math.abs(leftCenter - fragmentCenter) - Math.abs(rightCenter - fragmentCenter);
        });
      const row = matches[0];
      if (!row) {
        rows.push({
          fragments: [fragment],
          x0: fragment.x0,
          y0: fragment.y0,
          x1: fragment.x1,
          y1: fragment.y1,
          baselineY: fragment.baselineY
        });
        return;
      }
      row.fragments.push(fragment);
      row.x0 = Math.min(row.x0, fragment.x0);
      row.y0 = Math.min(row.y0, fragment.y0);
      row.x1 = Math.max(row.x1, fragment.x1);
      row.y1 = Math.max(row.y1, fragment.y1);
      const baselines = row.fragments.map(item => item.baselineY).filter(Number.isFinite);
      row.baselineY = baselines.length ? median(baselines) : null;
    });
  return rows
    .map(row => {
      const ordered = row.fragments.sort((left, right) => left.x0 - right.x0);
      return {
        text: cleanLine(ordered.map(fragment => fragment.text).join(' ')),
        confidence: ordered.reduce((sum, fragment) => sum + fragment.confidence, 0) / Math.max(1, ordered.length),
        bbox: { x0: row.x0, y0: row.y0, x1: row.x1, y1: row.y1 }
      };
    })
    .filter(row => row.text)
    .sort((left, right) => left.bbox.y0 - right.bbox.y0 || left.bbox.x0 - right.bbox.x0);
}

export function reconstructTicketLayoutText(blocks = []) {
  return reconstructTicketLayoutRows(blocks).map(row => row.text).join('\n');
}

function ticketTotalRowScore(line) {
  const normalized = normalizeTicketConcepts(line);
  if (ticketTotalLineExcluded(normalized)) return 0;
  if (isBareTicketTotalLine(line)) return 150;
  if (BEST_TOTAL_LABEL.test(normalized) || LENS_MISTRANSLATED_TOTAL_LABEL.test(normalized)
    || EAST_ASIAN_BEST_TOTAL_LABEL.test(line)) return 130;
  if (GENERIC_TOTAL_LABEL.test(normalized) && !/\b(?:subtotal|sub\s+total|total\s+parcial|partial\s+total|valisumma)\b/.test(normalized)) return 115;
  if (PAYMENT_DUE_LABEL.test(normalized)) return 105;
  return 0;
}

function bestTicketLayoutTotalRow(blocks = []) {
  return reconstructTicketLayoutRows(blocks)
    .map(row => ({ ...row, score: ticketTotalRowScore(row.text), value: extractTicketTotal(row.text) }))
    .filter(row => row.score > 0)
    .sort((left, right) => right.score - left.score
      || Number(Number.isFinite(right.value)) - Number(Number.isFinite(left.value))
      || right.bbox.y0 - left.bbox.y0)[0] || null;
}

export function extractTicketLayoutTotal(blocks = []) {
  const candidate = bestTicketLayoutTotalRow(blocks);
  return Number.isFinite(candidate?.value) && candidate.value > 0 ? candidate.value : null;
}

export function reconcileTicketLayoutTotal(textTotal, layoutTotal) {
  if (Number.isFinite(textTotal) && textTotal > 0) return textTotal;
  return Number.isFinite(layoutTotal) && layoutTotal > 0 ? layoutTotal : null;
}

function recoverTruncatedCurrencyTotal(lines, explicit) {
  if (explicit != null && (!Number.isInteger(explicit) || explicit <= 0)) return explicit;
  const hasExplicit = Number.isInteger(explicit) && explicit > 0;
  const explicitDigits = hasExplicit ? String(explicit) : '';
  const counts = new Map();
  lines.forEach(line => {
    const normalized = normalizeTicketConcepts(line);
    const unsafeSummary = /\b(?:subtotal|total\s+(?:del?\s+)?producto|deposito|custodia|saldo|cambio|cambiar|vuelto|descuento|propina|efectivo|cash|entregado|recibido)\b/.test(normalized);
    if (unsafeSummary) return;
    const paymentSummary = /\b(?:pago|pagado|payment|paid|cobrado|cobro|cargo|debito|debitado|importe\s+(?:a|por)\s+pagar|amount\s+due|balance\s+due)\b/.test(normalized);
    const values = new Set(integerCurrencyAmountsInLine(line));
    values.forEach(value => {
      if (!Number.isInteger(value) || value <= 0) return;
      const current = counts.get(value) || { count: 0, paymentSummary: false };
      current.count += 1;
      current.paymentSummary ||= paymentSummary;
      counts.set(value, current);
    });
  });
  const recovered = [...counts.entries()]
    .filter(([value, evidence]) => hasExplicit
      ? (evidence.count >= 2 || evidence.paymentSummary)
        && value > explicit
        && String(value).length <= explicitDigits.length + 2
        && String(value).endsWith(explicitDigits)
      : evidence.paymentSummary)
    .sort((left, right) => Number(right[1].paymentSummary) - Number(left[1].paymentSummary)
      || right[1].count - left[1].count
      || left[0] - right[0])[0]?.[0];
  return recovered || (hasExplicit ? explicit : null);
}

function summaryAmountsInLine(line) {
  const normalized = normalizeOcrCurrencyMarkers(String(line || ''));
  const looseIntegers = Array.from(normalized.matchAll(/(?:^|[^\p{L}\d])(-?(?:\d{1,3}(?:[,\.\s]\d{3})+|\d+))(?![\p{L}\d,.])/gu))
    .filter(match => !/^\s*%/.test(normalized.slice((match.index || 0) + match[0].length)))
    .map(match => Number(String(match[1] || '').replace(/\D/g, '')))
    .filter(value => Number.isFinite(value));
  return [...new Set(
    amountsInLine(line)
      .concat(integerCurrencyAmountsInLine(line), groupedIntegerAmountsInLine(line), labeledIntegerAmountsInLine(line), standaloneIntegerAmount(line), looseIntegers)
      .map(value => Math.abs(Number(value)))
      .filter(value => Number.isFinite(value) && value > 0)
  )];
}

function ticketAmountDigitDistance(left, right) {
  const leftDigits = String(Math.trunc(left));
  const rightDigits = String(Math.trunc(right));
  if (leftDigits.length !== rightDigits.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < leftDigits.length; index += 1) {
    if (leftDigits[index] !== rightDigits[index]) distance += 1;
  }
  return distance;
}

function recoverRepeatedSummarySuffix(lines, explicit) {
  if (!Number.isInteger(explicit) || explicit <= 0) return explicit;
  const summaryValues = [];
  lines.forEach(line => {
    const normalized = normalizeTicketConcepts(line);
    const summaryLine = GENERIC_TOTAL_LABEL.test(normalized)
      || TOTAL_EXCLUDED_LABEL.test(normalized)
      || TOTAL_TAX_LABEL.test(normalized)
      || PAYMENT_DUE_LABEL.test(normalized)
      || /\b(?:monto\s+sujeto|dinero\s+electronico|pago|pagado|payment|paid|cobrado|custodia)\b/.test(normalized);
    if (!summaryLine) return;
    summaryAmountsInLine(line)
      .filter(value => Number.isInteger(value) && value >= 100)
      .forEach(value => summaryValues.push(value));
  });
  const parentsBySuffix = new Map();
  [...new Set(summaryValues)].forEach(value => {
    const digits = String(value);
    if (digits.length < 4) return;
    const suffix = Number(digits.slice(1));
    if (!Number.isInteger(suffix) || suffix < 100) return;
    if (!parentsBySuffix.has(suffix)) parentsBySuffix.set(suffix, new Set());
    parentsBySuffix.get(suffix).add(value);
  });
  const explicitDigits = String(explicit);
  const candidate = [...parentsBySuffix.entries()]
    .filter(([value, parents]) => parents.size >= 2 && (
      explicit <= 9
      || String(value).endsWith(explicitDigits)
      || ticketAmountDigitDistance(value, explicit) === 1
    ))
    .sort((left, right) => right[1].size - left[1].size
      || ticketAmountDigitDistance(left[0], explicit) - ticketAmountDigitDistance(right[0], explicit)
      || right[0] - left[0])[0]?.[0];
  return candidate || explicit;
}

function inferCalculatedTicketTotal(lines) {
  let base = null;
  let basePriority = 0;
  let baseExcludesTax = false;
  let discount = 0;
  let tax = 0;
  const tenderAmounts = [];
  lines.forEach(line => {
    const normalized = normalizeTicketConcepts(line);
    const amounts = summaryAmountsInLine(line);
    if (!amounts.length) return;
    // A grouped integer such as `8.000yenes` can also yield the partial
    // candidate `8`. Summary lines contain a single monetary figure, so keep
    // the complete (largest) reading instead of relying on parser order.
    const amount = Math.max(...amounts);
    const productTotal = /\b(?:total\s+(?:del?\s+)?producto|product\s+total)\b/.test(normalized);
    const subtotal = /\b(?:subtotal|sub\s+total|valisumma)\b/.test(normalized);
    const discountLine = /\b(?:descuento|discount|alennus|rebaja)\b/.test(normalized);
    if (/^\s*(?:custodia|entregado|recibido|tendered|amount\s+received|cash\s+received)\b/.test(normalized)) {
      tenderAmounts.push(amount);
      return;
    }
    if ((productTotal || subtotal) && !discountLine) {
      const priority = productTotal ? 2 : 1;
      if (priority >= basePriority) {
        base = amount;
        basePriority = priority;
        baseExcludesTax = /\b(?:sin\s+incluir|antes\s+de|excluido|excluding|before)\b[^\n]*\b(?:impuestos?|tax|iva|vat)\b/.test(normalized);
      }
      return;
    }
    if (discountLine) {
      discount += amount;
      return;
    }
    if (/^(?:impuesto|iva|vat|tax)\b/.test(normalized)) tax += amount;
  });
  if (!Number.isFinite(base) || base <= 0) return null;
  if (discount <= 0 && (!baseExcludesTax || tax <= 0)) {
    // Lens can read a zero-tax Japanese subtotal one digit off while preserving
    // the exact cash received. Accept the tender only when it practically
    // equals the subtotal; a larger banknote remains excluded.
    const closeTender = tenderAmounts
      .filter(value => Math.abs(value - base) <= Math.max(2, base * 0.005))
      .sort((left, right) => Math.abs(left - base) - Math.abs(right - base))[0];
    return Number.isFinite(closeTender) ? { value: closeTender, evidence: 1 } : null;
  }
  const value = base - discount + (baseExcludesTax ? tax : 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Number(value.toFixed(2));
  const evidence = lines.filter(line => summaryAmountsInLine(line).includes(rounded)).length;
  return { value: rounded, evidence };
}

export function reconcileTicketTotalReadings(readings = [], fallback = null) {
  const texts = readings.map(value => String(value || '').trim()).filter(Boolean);
  const entries = texts
    .map(text => ({ text, value: extractTicketTotal(text) }))
    .filter(entry => Number.isFinite(entry.value) && entry.value > 0);
  if (!entries.length) return null;
  if (entries.length === 1) return entries[0].value;
  const values = entries.map(entry => entry.value);
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  const consensusEntry = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || values.indexOf(left[0]) - values.indexOf(right[0]))[0]?.[0];
  if (consensusEntry != null && counts.get(consensusEntry) >= 2) return consensusEntry;
  if (Number.isFinite(fallback) && fallback > 0 && counts.get(fallback) >= 2) return fallback;
  return null;
}

export function detectTicketDocumentType(text) {
  const normalized = normalizeTicketText(text);
  const cardSignals = normalized.match(CARD_PAYMENT_SIGNALS) || [];
  const receiptSignals = normalized.match(RECEIPT_SIGNALS) || [];
  let cardScore = cardSignals.length * 2;
  let receiptScore = receiptSignals.length * 2;
  receiptScore += (String(text || '').match(EAST_ASIAN_RECEIPT_SIGNALS) || []).length * 3;
  if (/copia\s+(?:para\s+el\s+)?cliente|copia\s+comercio/.test(normalized)) cardScore += 5;
  if (/factura\s+simplificada|base\s+imponible|desglose\s+iva/.test(normalized)) receiptScore += 5;
  const hasBankBrand = /\b(?:bbva|santander|caixabank|bankinter|sabadell|ing|unicaja|abanca|revolut|comercia|worldline)\b/.test(normalized);
  if (hasBankBrand) cardScore += 2;
  if (hasBankBrand && /\b(?:venta|compra)\b[^\n]{0,40}\b(?:debit|debito|credit|credito|visa|mastercard)\b/.test(normalized)) cardScore += 3;
  const bankCopyThreshold = hasBankBrand && receiptScore === 0 && cardScore >= 4;
  return (cardScore >= 6 || bankCopyThreshold) && cardScore > receiptScore ? 'card_payment' : 'receipt';
}

export function extractCardPaymentAmount(text) {
  const lines = ticketLines(text);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketConcepts(line);
    const amounts = amountsInLine(line).filter(value => value > 0);
    if (amounts.length !== 1 || ticketTotalLineExcluded(normalized)) return;
    const hasCurrency = /(?:eur|euro|euros|€|gbp|£|usd|\$|sek|nok|dkk)/i.test(line);
    const maskedAmount = /\*{2,}\s*\d+[,.]\d{1,2}/.test(line);
    const paymentNearby = lines.slice(Math.max(0, index - 2), index + 1)
      .some(value => /\b(?:venta|compra|importe?|amount|deb(?:ito)?|cargo)\b/i.test(normalizeTicketText(value)));
    if (!hasCurrency && !maskedAmount) return;
    candidates.push({
      value: amounts[0],
      score: (hasCurrency ? 45 : 0) + (maskedAmount ? 30 : 0) + (paymentNearby ? 20 : 0) + index / Math.max(lines.length, 1)
    });
  });
  return candidates.sort((left, right) => right.score - left.score)[0]?.value ?? null;
}

export function extractTicketTotal(text) {
  const lines = ticketLines(text);
  const candidates = [];
  lines.forEach((line, index) => {
    const normalized = normalizeTicketConcepts(line);
    let amounts = amountsInLine(line);
    const hasEastAsianBestLabel = EAST_ASIAN_BEST_TOTAL_LABEL.test(line);
    const hasBestLabel = BEST_TOTAL_LABEL.test(normalized)
      || /\btotal\s+(?:compra|operacion|ticket)\b/.test(normalized)
      || LENS_MISTRANSLATED_TOTAL_LABEL.test(normalized)
      || hasEastAsianBestLabel;
    const hasTotalLabel = GENERIC_TOTAL_LABEL.test(normalized) && !/\b(?:subtotal|sub\s+total|valisumma)\b/.test(normalized);
    const hasAmountLabel = AMOUNT_TOTAL_LABEL.test(normalized);
    const hasPaymentDueLabel = PAYMENT_DUE_LABEL.test(normalized);
    const tableHeader = TOTAL_TABLE_HEADER.test(normalized);
    const excluded = ticketTotalLineExcluded(normalized);
    const integerCurrencyAmounts = integerCurrencyAmountsInLine(line);
    if (integerCurrencyAmounts.length && (hasBestLabel || hasTotalLabel || hasPaymentDueLabel)) amounts = integerCurrencyAmounts;
    else {
      const groupedIntegers = groupedIntegerAmountsInLine(line);
      if (groupedIntegers.length && (hasBestLabel || hasTotalLabel || hasPaymentDueLabel)) {
        amounts = groupedIntegers;
      } else if (!amounts.length && (hasBestLabel || hasTotalLabel || hasPaymentDueLabel)) {
        const labeledIntegers = labeledIntegerAmountsInLine(line);
        if (labeledIntegers.length) amounts = labeledIntegers;
      }
    }
    const bareTotal = isBareTicketTotalLine(line);
    let labelScore = bareTotal ? 150 : hasBestLabel ? 130 : hasTotalLabel ? 115 : hasPaymentDueLabel ? 105 : hasAmountLabel ? 95 : 0;
    if (tableHeader && !hasTotalLabel) labelScore = 0;
    if (hasAmountLabel && !hasTotalLabel && !hasPaymentDueLabel && amounts.length > 1) labelScore = 0;
    if (excluded) labelScore = 0;
    if (labelScore > 0 && amounts.length) {
      candidates.push({ value: amounts.at(-1), score: labelScore + (/\b(?:eur|euro|euros|gbp|pounds?|sek|nok|dkk|jpy|krw)\b|[€£¥₩円원]/iu.test(line) ? 10 : 0) + index / Math.max(lines.length, 1) });
    }
    const cleanedLabel = normalized.replace(/[-_=.:]/g, ' ').replace(/\s+/g, ' ').trim();
    const labelOnly = TOTAL_LABEL_ONLY.test(cleanedLabel) || EAST_ASIAN_TOTAL_LABEL_ONLY.test(String(line || '').replace(/[-_=.:]/g, ' ').replace(/\s+/g, ' ').trim());
    const separatedLabel = hasBestLabel || labelOnly || hasPaymentDueLabel;
    if (labelScore > 0 && separatedLabel && !amounts.length) {
      [-1, 1].forEach(offset => {
        const nearbyIndex = index + offset;
        if (nearbyIndex < 0 || nearbyIndex >= lines.length) return;
        const nearbyDecimalAmounts = amountsInLine(lines[nearbyIndex]);
        const nearbyAmounts = nearbyDecimalAmounts.length
          ? nearbyDecimalAmounts
          : [...new Set(integerCurrencyAmountsInLine(lines[nearbyIndex]).concat(standaloneIntegerAmount(lines[nearbyIndex])))];
        const nearbyNormalized = normalizeTicketConcepts(lines[nearbyIndex]);
        if (nearbyAmounts.length === 1 && !ticketTotalLineExcluded(nearbyNormalized)) {
          candidates.push({ value: nearbyAmounts[0], score: labelScore - (offset < 0 ? 6 : 8) });
        }
      });
    }
  });
  const explicit = candidates.filter(item => item.value > 0).sort((a, b) => b.score - a.score)[0]?.value ?? null;
  const recoveredExplicit = explicit != null ? recoverTruncatedCurrencyTotal(lines, explicit) : null;
  const reinforcedExplicit = recoveredExplicit != null
    ? recoverRepeatedSummarySuffix(lines, recoveredExplicit)
    : null;
  const calculated = inferCalculatedTicketTotal(lines);
  if (calculated && calculated.evidence > 0
    && (reinforcedExplicit == null || reinforcedExplicit !== calculated.value)) return calculated.value;
  if (reinforcedExplicit != null) return reinforcedExplicit;
  if (calculated && calculated.evidence > 0) return calculated.value;
  const paymentRecovered = recoverTruncatedCurrencyTotal(lines, null);
  if (paymentRecovered != null) return paymentRecovered;
  const source = String(text || '');
  if (detectTicketDocumentType(source) === 'card_payment') {
    const cardTotal = extractCardPaymentAmount(source);
    if (Number.isFinite(cardTotal)) return cardTotal;
  }
  if (!/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(source)) return null;
  const startIndex = Math.floor(lines.length * 0.35);
  const fallback = [];
  lines.slice(startIndex).forEach((line, offset) => {
    const normalized = normalizeTicketConcepts(line);
    if (ticketTotalLineExcluded(normalized)) return;
    eastAsianFallbackAmountsInLine(line).forEach(value => fallback.push({ value, index: startIndex + offset }));
  });
  if (!fallback.length) return null;
  const maximum = Math.max(...fallback.map(item => item.value));
  const plausible = fallback.filter(item => item.value >= maximum * 0.55);
  const grouped = new Map();
  plausible.forEach(item => {
    const current = grouped.get(item.value) || { value: item.value, count: 0, firstIndex: item.index, lastIndex: item.index };
    current.count += 1;
    current.firstIndex = Math.min(current.firstIndex, item.index);
    current.lastIndex = Math.max(current.lastIndex, item.index);
    grouped.set(item.value, current);
  });
  const best = [...grouped.values()]
    .filter(item => item.count >= 2)
    .sort((left, right) => right.count - left.count || right.value - left.value || left.firstIndex - right.firstIndex)[0];
  return best?.value ?? null;
}

export function extractTicketTotalChoices(text) {
  const lines = ticketLines(text);
  const perPersonCandidates = [];
  const generalLines = [];
  lines.forEach(line => {
    const normalized = normalizeTicketConcepts(line);
    const match = PER_PERSON_TOTAL_LABEL.exec(normalized);
    if (!match) {
      generalLines.push(line);
      return;
    }
    const tail = line.slice(match.index);
    const decimalAmounts = amountsInLine(tail);
    const amounts = decimalAmounts.length ? decimalAmounts : summaryAmountsInLine(tail);
    if (amounts.length) perPersonCandidates.push(decimalAmounts.length ? amounts.at(-1) : Math.max(...amounts));
    const beforeLabel = line.slice(0, match.index).trim();
    if (beforeLabel && GENERIC_TOTAL_LABEL.test(normalizeTicketConcepts(beforeLabel))) {
      generalLines.push(beforeLabel);
    }
  });
  const perPerson = perPersonCandidates.find(value => Number.isFinite(value) && value > 0) ?? null;
  const general = extractTicketTotal(generalLines.join('\n'));
  if (!Number.isFinite(general) || general <= 0 || !Number.isFinite(perPerson) || perPerson <= 0
    || Math.abs(general - perPerson) < 0.005) return null;
  const dinersMatch = normalizeTicketConcepts(text).match(/\b(?:comensales?|personas?|diners?)\s*:?\s*(\d{1,3})\b/);
  const diners = dinersMatch ? Number(dinersMatch[1]) : null;
  return {
    general,
    perPerson,
    diners: Number.isInteger(diners) && diners > 0 ? diners : null
  };
}

const MERCHANT_EXCLUSIONS = /^(ticket|receipt|kuitti|factura|invoice|lasku|simplificada|copia|cliente|customer|fecha|date|hora|time|mesa|caja|cajero|nif|cif|n\.i\.f|tel|telefono|www\.|https?|gracias|iva|vat|alv|total|subtotal|importe|import|amount|summa|yhteensa|direccion|domicilio|articulo|item|descripcion|description|unidades|venta|compra|operacion|transaction|transaccion|autorizacion|authorization|terminal|contactless|aprobada|aceptada|traducid[oa]\s+con\s+google\s+lens|translated\s+by\s+google\s+lens|google\s+lens)/i;
const MERCHANT_METADATA_WORDS = /\b(fecha|hora|date|time|data|paivamaara|aika|mesa|comensales|caja|cajero|nif|cif|telefono|ticket|receipt|kuitti|factura|invoice|lasku|total|subtotal|importe|import|amount|summa|yhteensa|impuesto|impuestos|iva|vat|alv|descripcion|description|kuvaus|unidades|units|maara|precio|price|hinta)\b/i;
const EAST_ASIAN_MERCHANT_METADATA_WORDS = /(?:領収書|レシート|請求書|日付|時刻|合計|小計|消費税|영수증|계산서|날짜|시간|합계|소계|부가세)/u;
const ADDRESS_WORDS = /\b(calle|c\/|avenida|avda|plaza|paseo|carretera|rua|rúa|cp\s*\d|codigo postal|tlf|telefono|madrid|barcelona)\b/i;
const BANK_BRAND_LINE = /^(?:bbva|banco\s+santander|santander|by(?:\s+\S{1,3})?\s+santander|caixabank|la\s+caixa|bankinter|banco\s+sabadell|sabadell|ing|unicaja|kutxabank|abanca|ibercaja|openbank|revolut|wise|cajamar|comercia(?:\s+global\s+payments)?|global\s+payments|redsys|servired|worldline|getnet(?:\s+by\s+santander)?)$/i;
const PAYMENT_TERMINAL_LINE = /^(?:venta\b|compra\b|visa\b|mastercard\b|contactless\b|aut(?:orizacion)?[:.\s]|op(?:eracion)?[:.\s]|tran(?:saccion)?[:.\s]|terminal[:.\s]|app\s+(?:bbva|santander|caixabank|sabadell))/i;
const MERCHANT_PROMOTIONAL_LINE = /\b(?:gana|acumula|canjea|ahorra|consigue|usa)\b.*\b(?:puntos?|recompensas?|descuentos?|rakuten)\b|\b(?:puntos?|recompensas?)\b.*\b(?:rakuten|ahorra|acumula)\b/i;
const LENS_AI_INTERFACE_LINE = /\b(?:detalles\s+de\s+la\s+compra|detalles\s+del\s+comercio|informacion\s+de\s+la\s+tienda|informacion\s+de\s+la\s+transaccion|desglose\s+de\s+productos|desglose\s+detallado|articulos?\s+adquiridos|totales\s+y\s+pago|desglose\s+economico|vista\s+creada\s+con\s+(?:ia|la)|mostrar\s+mas|pregunta\s+(?:lo\s+que\s+quieras|sobre\s+esta\s+imagen)|coincidencias\s+(?:visuales|exactas)|busquedas?\s+relacionadas?|las\s+respuestas\s+de\s+la\s+ia|shutterstock)\b/i;
const MERCHANT_FIELD_LABEL = '(?:tienda|comercio|establecimiento|lugar|negocio|local|empresa|vendedor|proveedor|cadena|sucursal)';

function cleanMerchantCandidate(value) {
  return cleanLine(value)
    .replace(/^(?:[I1lf]\s+)(?=\p{Lu}{5,}(?:\s|$))/u, '')
    .replace(/\s+[I1lf]$/, '')
    .replace(/\s+(?:tel(?:efono)?|phone)\s*:?[\s.-]*$/iu, '')
    .replace(/(?<=\p{L})[.:;]\s+(?=\p{L})/gu, ' ')
    .replace(/^[^\p{L}\d]+|[^\p{L}\d.)]+$/gu, '')
    .trim();
}

export function extractGoogleLensAiMerchant(text) {
  if (!isGoogleLensAiReceiptSummary(text)) return '';
  const lines = ticketLines(text);
  for (const line of lines) {
    const place = line.match(new RegExp(`^\\s*(?:[•*·-]\\s*)?${MERCHANT_FIELD_LABEL}\\s*:\\s*(.+)$`, 'i'));
    if (!place) continue;
    const candidate = cleanMerchantCandidate(place[1]
      .replace(/\s*[（(][^）)]*[）)]\s*[.]?\s*$/, '')
      .replace(/\s*\([^)]*$/, ''));
    if (isPlausibleTicketMerchant(candidate)) return candidate;
  }
  const flattened = String(text || '').replace(/\s+/g, ' ');
  const sentence = flattened.match(/\b(?:realizad[ao]\s+en|es\s+de)\s+una\s+tienda\s+(.+?)(?=\s+en\s+(?:jap[oó]n|españa|francia|italia|alemania|portugal|reino\s+unido|estados\s+unidos)\b|\s+con\s+un\s+total\b|[.;]|$)/i);
  const candidate = cleanMerchantCandidate((sentence?.[1] || '')
    .replace(/^(?:de\s+)?(?:conveniencia\s+)?(?:japonesa?|coreana?|china|española?|francesa?|italiana?|alemana?|portuguesa?)\s+/i, ''));
  return isPlausibleTicketMerchant(candidate) ? candidate : '';
}

export function extractTicketMerchant(text) {
  if (isGoogleLensAiReceiptSummary(text)) return extractGoogleLensAiMerchant(text);
  const lines = ticketLines(text).slice(0, 24);
  const documentType = detectTicketDocumentType(text);
  const explicit = lines.map((line, index) => {
    const match = line.match(new RegExp(`^\\s*(?:[•*·-]\\s*)?(?:${MERCHANT_FIELD_LABEL}|merchant|nombre\\s+comercio|店名|店舗名|상호|가맹점)\\s*[:.-]\\s*(.+)$`, 'iu'));
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
    if (MERCHANT_METADATA_WORDS.test(normalizeTicketText(line)) || EAST_ASIAN_MERCHANT_METADATA_WORDS.test(line)) score -= 60;
    if (BANK_BRAND_LINE.test(line)) score -= 60;
    if (PAYMENT_TERMINAL_LINE.test(line)) score -= 35;
    if (MERCHANT_PROMOTIONAL_LINE.test(normalizeTicketText(line))) score -= 80;
    if (LENS_AI_INTERFACE_LINE.test(normalizeTicketText(line))) score -= 80;
    if (/\b\d{5}\b|@|\.com\b|\b(es|com|net)\b$/i.test(line) || ADDRESS_WORDS.test(line)) score -= 12;
    if (fiscalDetailsIndex >= 0 && index < fiscalDetailsIndex) {
      const distance = fiscalDetailsIndex - index;
      if (distance >= 2 && distance <= 4) score += 18 + distance * 4;
    }
    if (/\b(sa|s\.a\.|sl|s\.l\.|s\.l\.u\.|sociedad|restaurante|hotel|bar|cafeteria|supermercado|farmacia|gasolinera|pharmacy|drug)\b/i.test(line)) score += 7;
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
  const best = candidates
    .filter(item => isPlausibleTicketMerchant(item.value))
    .sort((a, b) => b.score - a.score)[0];
  return best?.score > 0 ? best.value : '';
}

export function isPlausibleTicketMerchant(value) {
  const line = cleanLine(value);
  const normalized = normalizeTicketText(line);
  const letters = normalized.match(/\p{L}/gu) || [];
  const words = normalized.match(/\p{L}+/gu) || [];
  const compact = normalized.replace(/[^\p{L}\d]/gu, '');
  const minimumLetters = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(line) ? 2 : 5;
  if (letters.length < minimumLetters || compact.length < minimumLetters || line.length > 60) return false;
  if (/(\p{L})\1{3,}/iu.test(line)) return false;
  if (words.length >= 3 && words.filter(word => word.length <= 2).length / words.length >= 0.75) return false;
  if (MERCHANT_EXCLUSIONS.test(line) || MERCHANT_METADATA_WORDS.test(normalized)
    || EAST_ASIAN_MERCHANT_METADATA_WORDS.test(line) || MERCHANT_PROMOTIONAL_LINE.test(normalized)
    || LENS_AI_INTERFACE_LINE.test(normalized)) return false;
  if (ADDRESS_WORDS.test(line) || BANK_BRAND_LINE.test(line) || PAYMENT_TERMINAL_LINE.test(line)) return false;
  if (/\b\d{1,2}[:./-]\d{1,2}\b|^\d+$/.test(normalized)) return false;
  return letters.length / Math.max(1, line.replace(/\s/g, '').length) >= 0.58;
}

export function extractTicketFields(text) {
  const lensAiSummary = isGoogleLensAiReceiptSummary(text);
  const totalChoices = extractTicketTotalChoices(text);
  const fields = {
    documentType: detectTicketDocumentType(text),
    date: lensAiSummary ? extractGoogleLensAiSummaryDate(text) : extractTicketDate(text),
    time: lensAiSummary ? extractGoogleLensAiSummaryTime(text) : extractTicketTime(text),
    merchant: extractTicketMerchant(text),
    total: totalChoices?.general ?? (lensAiSummary ? extractGoogleLensAiTotal(text) : null) ?? extractTicketTotal(text)
  };
  if (totalChoices) fields.totalChoices = totalChoices;
  return fields;
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
        original: canvas,
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
  const original = document.createElement('canvas');
  original.width = canvas.width;
  original.height = canvas.height;
  original.getContext('2d').drawImage(canvas, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const grey = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
    const contrasted = grey < 140 ? Math.max(0, grey * 0.75) : Math.min(255, grey * 1.08);
    pixels.data[index] = contrasted;
    pixels.data[index + 1] = contrasted;
    pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return { original, primary: canvas, binary: null, documentDetected: Boolean(detectedBounds) };
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

function normalizeWorkerLanguages(languages) {
  const values = Array.isArray(languages) ? languages : String(languages || 'spa').split('+');
  const normalized = [...new Set(values.map(value => String(value || '').trim()).filter(value => /^[a-z]{3}$/.test(value)))];
  return (normalized.length ? normalized : ['spa']).join('+');
}

function withTimeout(promise, timeoutMs, message) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function resetTicketOcrWorker() {
  const previousWorker = workerPromise;
  workerPromise = null;
  workerLanguageKey = '';
  progressListener = () => {};
  if (previousWorker) {
    void previousWorker
      .then(worker => worker?.terminate?.())
      .catch(() => {});
  }
}

async function getWorker(onProgress, languages = ['spa']) {
  progressListener = onProgress;
  const languageKey = normalizeWorkerLanguages(languages);
  if (workerPromise && workerLanguageKey !== languageKey) {
    resetTicketOcrWorker();
    progressListener = onProgress;
  }
  if (!workerPromise) {
    workerLanguageKey = languageKey;
    const rawWorkerPromise = import('./vendor/tesseract/tesseract.esm.min.js').then(async module => {
      const Tesseract = module.default || module;
      const worker = await Tesseract.createWorker(languageKey, Tesseract.OEM.LSTM_ONLY, {
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
    });
    const activeWorkerPromise = withTimeout(
      rawWorkerPromise,
      OCR_WORKER_START_TIMEOUT_MS,
      'El lector local ha tardado demasiado en iniciarse. Pulsa «Leer ticket» para volver a intentarlo.'
    ).catch(error => {
      if (workerPromise === activeWorkerPromise) {
        workerPromise = null;
        workerLanguageKey = '';
      }
      throw error;
    });
    workerPromise = activeWorkerPromise;
    void rawWorkerPromise.then(worker => {
      if (workerPromise !== activeWorkerPromise || workerLanguageKey !== languageKey) {
        return worker?.terminate?.();
      }
      return null;
    }).catch(() => {});
  }
  return workerPromise;
}

const OCR_TEXT_WITH_LAYOUT = { text: true, blocks: true };

function ticketMerchantFromLayout(text, rows, imageHeight, confidence) {
  const merchant = extractTicketMerchant(text);
  if (!isPlausibleTicketMerchant(merchant)) return '';
  const normalizedMerchant = normalizeTicketText(merchant).replace(/\s+/g, ' ').trim();
  const row = rows.find(item => normalizeTicketText(item.text).replace(/\s+/g, ' ').includes(normalizedMerchant));
  if (row) {
    const maximumTop = detectTicketDocumentType(text) === 'card_payment' ? 0.7 : 0.45;
    if (row.bbox.y0 > imageHeight * maximumTop || row.confidence < 45) return '';
    return merchant;
  }
  return confidence >= 60 ? merchant : '';
}

function ticketRecognitionQuality(recognition) {
  const fields = recognition.fields;
  return (recognition.layoutTotalRow?.value ? 8 : Number.isFinite(fields.total) && fields.total > 0 ? 5 : 0)
    + (fields.merchant ? 4 : 0)
    + (fields.date ? 2 : 0)
    + (fields.time ? 1 : 0)
    + recognition.confidence / 100;
}

function normalizeTicketRecognition(result, image) {
  const linearText = String(result?.data?.text || '').trim();
  const blocks = result?.data?.blocks || [];
  const rows = reconstructTicketLayoutRows(blocks);
  const layoutText = rows.map(row => row.text).join('\n');
  const text = layoutText || linearText;
  const confidence = Number(result?.data?.confidence || 0);
  const fields = extractTicketFields(text);
  const layoutTotalRow = bestTicketLayoutTotalRow(blocks);
  if (!fields.totalChoices) fields.total = reconcileTicketLayoutTotal(fields.total, layoutTotalRow?.value);
  fields.merchant = ticketMerchantFromLayout(text, rows, image.height, confidence);
  return { result, image, text, linearText, rows, blocks, confidence, fields, layoutTotalRow };
}

async function recognizeTicketLayoutPass(worker, image, rotateAuto = false) {
  const result = await worker.recognize(image, { rotateAuto }, OCR_TEXT_WITH_LAYOUT);
  return normalizeTicketRecognition(result, image);
}

function totalFromKnownLayoutRow(text) {
  const explicit = extractTicketTotal(text);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const values = [...new Set(ticketLines(text).flatMap(summaryAmountsInLine))]
    .filter(value => Number.isFinite(value) && value > 0);
  return values.length ? Math.max(...values) : null;
}

export function chooseConfirmedTicketTotal(current, confirmed, confidence) {
  if (!Number.isFinite(confirmed) || confirmed <= 0 || confidence < 35) return current;
  if (!Number.isFinite(current) || current <= 0 || current === confirmed) return confirmed;
  const currentDigits = Number.isInteger(current) ? String(current) : '';
  const confirmedDigits = Number.isInteger(confirmed) ? String(confirmed) : '';
  // The focused visual pass may restore one leading digit lost by OCR (980 -> 1980).
  // Once the text pass already has four digits, however, a longer suffix match is
  // usually the yen sign misread as a digit (1980 -> 41980), so keep the text total.
  if (currentDigits && confirmedDigits && currentDigits.length <= 3
    && confirmedDigits.length === currentDigits.length + 1
    && confirmedDigits.endsWith(currentDigits)) return confirmed;
  return current;
}

async function confirmLayoutTotal(worker, recognition, onProgress) {
  const row = recognition.layoutTotalRow;
  if (!row?.bbox) return null;
  const rowHeight = Math.max(1, row.bbox.y1 - row.bbox.y0);
  const verticalPadding = Math.max(6, Math.round(rowHeight * 0.55));
  const bounds = {
    x: 0,
    y: Math.max(0, Math.round(row.bbox.y0 - verticalPadding)),
    width: recognition.image.width,
    height: Math.min(
      recognition.image.height,
      Math.round(row.bbox.y1 + verticalPadding)
    ) - Math.max(0, Math.round(row.bbox.y0 - verticalPadding))
  };
  if (bounds.height <= 0) return null;
  await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_SINGLE_LINE });
  onProgress({ status: 'Confirmando la fila del total', progress: 0.92 });
  const result = await worker.recognize(cropCanvasBounds(recognition.image, bounds), { rotateAuto: false }, OCR_TEXT_WITH_LAYOUT);
  const confirmedText = reconstructTicketLayoutText(result?.data?.blocks) || String(result?.data?.text || '');
  return {
    value: totalFromKnownLayoutRow(`${row.text} ${confirmedText}`),
    confidence: Number(result?.data?.confidence || 0)
  };
}

async function recognizeMissingCardPaymentAmount(worker, recognition, onProgress) {
  if (recognition.fields.documentType !== 'card_payment'
    || (Number.isFinite(recognition.fields.total) && recognition.fields.total > 0)) return null;
  const image = recognition.image;
  const timeRow = recognition.rows.find(row => /\b(?:hora|time)\b/i.test(normalizeTicketText(row.text)));
  const rowHeight = timeRow ? Math.max(1, timeRow.bbox.y1 - timeRow.bbox.y0) : 0;
  const bounds = [];
  if (timeRow && rowHeight) {
    const y = Math.max(0, Math.round(timeRow.bbox.y0 - rowHeight * 2));
    bounds.push({
      x: Math.round(image.width * 0.25),
      y,
      width: Math.round(image.width * 0.5),
      height: Math.min(image.height - y, Math.round(rowHeight * 6))
    });
  }
  [0.64, 0.7].forEach(startRatio => bounds.push({
    x: Math.round(image.width * 0.22),
    y: Math.round(image.height * startRatio),
    width: Math.round(image.width * 0.56),
    height: Math.round(image.height * 0.16)
  }));
  await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_SINGLE_BLOCK });
  onProgress({ status: 'Comprobando el importe del pago con tarjeta', progress: 0.9 });
  let passes = 0;
  for (const area of bounds) {
    if (area.width <= 0 || area.height <= 0) continue;
    passes += 1;
    const result = await worker.recognize(cropCanvasBounds(image, area), { rotateAuto: false }, { text: true });
    const text = String(result?.data?.text || '').trim();
    const value = extractCardPaymentAmount(text);
    if (Number.isFinite(value) && value > 0) {
      return { value, text, confidence: Number(result?.data?.confidence || 0), passes };
    }
  }
  return { value: null, text: '', confidence: 0, passes };
}

async function recognizeMissingTicketTitle(worker, recognition, onProgress) {
  if (recognition.fields.merchant) return '';
  const context = recognition.image.getContext('2d', { willReadFrequently: true });
  const titleBounds = findFirstTextBand(
    context.getImageData(0, 0, recognition.image.width, recognition.image.height).data,
    recognition.image.width,
    recognition.image.height
  );
  if (!titleBounds) return '';
  await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_SINGLE_LINE });
  onProgress({ status: 'Comprobando el nombre del comercio', progress: 0.96 });
  const titleResult = await worker.recognize(cropCanvasBounds(recognition.image, titleBounds, true), { rotateAuto: false }, { text: true });
  const titleText = String(titleResult?.data?.text || '');
  const titleCandidate = extractTicketMerchant(titleText);
  return Number(titleResult?.data?.confidence || 0) >= 60 && isPlausibleTicketMerchant(titleCandidate)
    ? titleCandidate
    : '';
}

async function recognizeTicketUnlocked(source, options = {}) {
  if (!source) throw new Error('Selecciona o fotografía primero un ticket.');
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const type = String(options.type || source.type || '').toLowerCase();
  const name = String(options.name || source.name || '').toLowerCase();
  const isPdf = type.includes('pdf') || name.endsWith('.pdf');
  const reviewTranslatedReceipt = options.reviewTranslatedReceipt === true;
  const preparedResult = isPdf
    ? await preparePdf(source, onProgress)
    : await prepareImage(source, onProgress);
  const primaryImage = reviewTranslatedReceipt && preparedResult.original
    ? preparedResult.original
    : preparedResult.primary;
  onProgress({ status: 'Preparando el lector local', progress: 0.08 });
  const worker = await getWorker(onProgress, options.languages || ['spa', 'eng']);
  let additionalPasses = 0;
  try {
    await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_AUTO });
    onProgress({ status: reviewTranslatedReceipt ? 'Leyendo la traducción de Google Lens' : 'Leyendo el ticket', progress: 0.15 });
    const primary = await recognizeTicketLayoutPass(worker, primaryImage, !preparedResult.documentDetected);
    let selected = primary;

    if (!reviewTranslatedReceipt
      && preparedResult.original
      && preparedResult.original !== primaryImage
      && isGoogleLensTranslationText(primary.text)) {
      onProgress({ status: 'Leyendo la traducción de Google Lens sin deformarla', progress: 0.72 });
      const lensOriginal = await recognizeTicketLayoutPass(worker, preparedResult.original, false);
      additionalPasses += 1;
      if (ticketRecognitionQuality(lensOriginal) > ticketRecognitionQuality(selected)) selected = lensOriginal;
    }

    if (preparedResult.binary && (!selected.fields.total || !selected.fields.merchant)) {
      onProgress({ status: 'Comprobando el contraste del ticket', progress: 0.78 });
      const contrast = await recognizeTicketLayoutPass(worker, preparedResult.binary, false);
      additionalPasses += 1;
      if (ticketRecognitionQuality(contrast) > ticketRecognitionQuality(selected)) selected = contrast;
    }

    const cardAmount = await recognizeMissingCardPaymentAmount(worker, selected, onProgress);
    if (cardAmount) {
      additionalPasses += cardAmount.passes;
      if (Number.isFinite(cardAmount.value) && cardAmount.value > 0) {
        selected.fields.total = cardAmount.value;
        selected.text = [selected.text, cardAmount.text].filter(Boolean).join('\n');
      }
    }

    if (selected.layoutTotalRow) {
      const confirmation = await confirmLayoutTotal(worker, selected, onProgress);
      additionalPasses += confirmation ? 1 : 0;
      if (confirmation) {
        selected.fields.total = chooseConfirmedTicketTotal(
          selected.fields.total,
          confirmation.value,
          confirmation.confidence
        );
      }
    }

    const titleMerchant = await recognizeMissingTicketTitle(worker, selected, onProgress);
    additionalPasses += titleMerchant ? 1 : 0;
    if (titleMerchant) selected.fields.merchant = titleMerchant;

    const text = selected.text;
    const classificationText = text;
    return {
      text,
      classificationText,
      confidence: selected.confidence,
      fields: selected.fields,
      lensAiSummary: isGoogleLensAiReceiptSummary(text),
      readings: text ? [text] : [],
      foodEvidence: extractTicketFoodEvidence(classificationText, selected.fields.total),
      additionalPasses,
      pdfFirstPageOnly: isPdf,
      documentDetected: preparedResult.documentDetected,
      layoutAware: true
    };
  } finally {
    try {
      await worker.setParameters({ tessedit_pageseg_mode: OCR_PSM_AUTO });
    } catch (_) {
      // El siguiente uso vuelve a preparar el lector; este restablecimiento es preventivo.
    }
  }
}

export function recognizeTicket(source, options = {}) {
  const recognition = ticketRecognitionTail.then(
    () => recognizeTicketUnlocked(source, options),
    () => recognizeTicketUnlocked(source, options)
  );
  ticketRecognitionTail = recognition.catch(() => {});
  return recognition;
}
