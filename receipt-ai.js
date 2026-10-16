const ENDPOINT = '/.netlify/functions/receipt-ai';

export async function getReceiptAIStatus(fetcher = fetch) {
  try {
    const response = await fetcher(ENDPOINT, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    const value = await response.json();
    return { enabled: value.enabled === true && value.freeOnly === true, message: String(value.message || '').slice(0, 200) };
  } catch { return { enabled: false, message: 'No se pudo comprobar la lectura con Google. Necesitas conexión; el OCR local sigue disponible.' }; }
}

export function normalizeReceiptProposal(value) {
  if (!value || value.currency !== 'EUR' || !Array.isArray(value.items) || !value.items.length || value.items.length > 150) throw new Error('Google no ha devuelto un ticket en euros con conceptos legibles.');
  const text = (input, limit) => typeof input === 'string' ? input.replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit) : '';
  const validAmount = amount => Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000;
  const items = value.items.map(item => ({
    name: text(item?.name, 160), quantity: item?.quantity, amountCents: item?.amountCents,
    uncertain: item?.uncertain !== false
  }));
  const total = validAmount(value.totalCents) && value.totalCents > 0 ? value.totalCents : null;
  const valid = items.every(item => item.name && Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 1000 && validAmount(item.amountCents) && !item.uncertain);
  const reconciled = valid && total !== null && items.reduce((sum, item) => sum + item.amountCents, 0) === total;
  const amount = cents => validAmount(cents) ? (cents / 100).toFixed(2).replace('.', ',') : '?';
  const proposal = [...items.map(item => `${Number.isFinite(item.quantity) ? item.quantity : '?'} ${item.name || 'Concepto ilegible'} ${amount(item.amountCents)}`), `TOTAL ${amount(total)}`].join('\n');
  return {
    text: proposal, itemText: reconciled ? proposal : '', itemsStatus: reconciled ? 'reconciled' : 'review',
    fields: { merchant: text(value.merchant, 160), total: total === null ? null : total / 100 },
    provider: 'google', warnings: Array.isArray(value.warnings) ? value.warnings.slice(0, 10).map(item => text(item, 200)) : []
  };
}

export async function readReceiptWithAI(meal, { accessCode, consent }, onProgress = () => {}, fetcher = fetch) {
  if (consent !== true) throw new Error('Marca que autorizas enviar esta foto a Google para leerla.');
  if (!String(accessCode || '').trim()) throw new Error('Introduce el código de acceso a la lectura gratuita.');
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(meal.ticketData || '')) throw new Error('Añade una foto JPEG, PNG o WebP del ticket.');
  if (meal.ticketData.length > 4_000_000) throw new Error('La foto es demasiado grande. Selecciona una imagen más pequeña.');
  onProgress({ status: 'Comprobando acceso gratuito y leyendo con Google…', progress: 0.1 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetcher(ENDPOINT, {
      method: 'POST', cache: 'no-store', credentials: 'omit', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Receipt-Access': String(accessCode).trim() },
      body: JSON.stringify({ image: meal.ticketData })
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('El servicio no ha respondido correctamente. No se reintentará automáticamente.'); }
    if (!response.ok) throw new Error(result.message || 'No se ha podido usar la lectura gratuita. Puedes usar el OCR local.');
    return normalizeReceiptProposal(result.receipt);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La lectura con Google ha tardado demasiado. No se reintentará automáticamente.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con la lectura de Google. Comprueba la conexión o usa el OCR local.');
    throw error;
  } finally { clearTimeout(timer); }
}
