const ENDPOINT = '/.netlify/functions/receipt-ai';

export async function getReceiptAIStatus(fetcher = fetch, accessCode = '') {
  try {
    const response = await fetcher(ENDPOINT, { cache: 'no-store', headers:accessCode?{'X-Receipt-Access':accessCode}:{}, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    const value = await response.json();
    return { enabled: value.enabled === true && value.freeOnly === true, message: String(value.message || '').slice(0, 200), limits:value.limits, usage:value.usage, usageText:receiptUsageText(value) };
  } catch { return { enabled: false, message: 'No se pudo comprobar la lectura con Google. Necesitas conexión; el OCR local sigue disponible.' }; }
}

export function receiptUsageText({limits,usage}={}) {
  if(!limits)return 'Uso de Google no disponible. El OCR local y Lens siguen disponibles.';
  const base=`Cuota gratuita confirmada el ${limits.confirmedAt}: ${limits.daily} solicitudes/día · ${limits.minute}/minuto · ${Number(limits.inputTokensMinute).toLocaleString('es-ES')} tokens de entrada/minuto. Protección de la app: ${limits.appRequestsMinute||6} peticiones/minuto por conexión (incluye consultas de uso).`;
  if(!usage?.available)return base+' El contador compartido no está disponible; no significa que no hayas usado cuota.';
  return base+`\nRegistro de la app hoy: ${usage.requests} intentos · Restante orientativo: ${Math.max(0,limits.daily-usage.requests)} según este registro.\nÚltimo minuto: ${usage.minuteRequests} intentos y ${Number(usage.minuteInputTokens).toLocaleString('es-ES')} tokens de entrada registrados. Reinicio diario: ${new Date(usage.resetsAt).toLocaleString('es-ES')}.\nEstimación compartida entre dispositivos: no incluye uso anterior a este contador ni uso fuera de la app; cuenta también intentos fallidos. El saldo oficial puede ser distinto. Google puede cambiar las cuotas o saturarse antes.`;
}

export function normalizeExpenseReceipt(value) {
  if(!value||typeof value!=='object'||!value.uncertain||typeof value.sourceLanguage!=='string')throw new Error('Google no ha devuelto una lectura válida.');
  const clean=(text,max)=>typeof text==='string'?text.trim().slice(0,max):'';
  const merchant=value.uncertain.merchant===false?clean(value.merchant,160).replace(/[\r\n\t]+/g,' '):'';
  const currency=value.uncertain.currency===false&&/^[A-Z]{3}$/.test(value.currency||'')?value.currency:null;
  const raw=typeof value.total==='string'&&/^\d{1,12}(?:\.\d{1,2})?$/.test(value.total)?value.total:null;
  const total=value.uncertain.total===false&&currency&&raw&&Number(raw)>0?Number(raw):null;
  if(!merchant&&total===null)throw new Error('No se han reconocido emisor ni total claros. Puedes usar Lens o el OCR local.');
  const sourceLanguage=clean(value.sourceLanguage,20).toLowerCase(),foreign=sourceLanguage!=='es'&&!sourceLanguage.startsWith('es-');
  const originalText=foreign?clean(value.originalText,16000):'',spanishText=foreign?clean(value.spanishText,16000):'';
  const warnings=Array.isArray(value.warnings)?value.warnings.slice(0,12).map(text=>clean(text,250)).filter(Boolean):[];
  if(String(value.spanishText||'').length>16000||String(value.originalText||'').length>16000)warnings.push('El texto es demasiado largo y se muestra solo una parte. Conserva y revisa la foto original.');
  if(foreign&&!spanishText)warnings.push('No se pudo completar la traducción al español. Se conservan las traducciones anteriores.');
  return {fields:{merchant,total,currency},sourceLanguage,originalText,spanishText,warnings,provider:'google'};
}

export function normalizeReceiptProposal(value, {photoCount=1} = {}) {
  if (!value || value.currency !== 'EUR' || !Array.isArray(value.items) || !value.items.length || value.items.length > 250) throw new Error('Google no ha devuelto un ticket en euros con conceptos legibles.');
  const text = (input, limit) => typeof input === 'string' ? input.replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit) : '';
  const validAmount = amount => Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000;
  const items = value.items.map(item => ({
    name: text(item?.name, 160), quantity: item?.quantity, amountCents: item?.amountCents,
    uncertain: item?.uncertain !== false
  }));
  const total = validAmount(value.totalCents) && value.totalCents > 0 ? value.totalCents : null;
  const valid = items.every(item => item.name && Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 1000 && validAmount(item.amountCents) && !item.uncertain);
  const warnings=Array.isArray(value.warnings)?value.warnings.slice(0,10).map(item=>text(item,200)).filter(Boolean):[];
  const assemblyValid=photoCount===1 || (value.assembly?.photoCount===photoCount && value.assembly?.complete===true && value.assembly?.overlapUncertain===false && warnings.length===0);
  if(!assemblyValid)warnings.unshift('No se ha podido confirmar la unión de todas las fotos sin omitir o repetir líneas. Revisa el orden, los solapamientos y el total final.');
  const reconciled = valid && assemblyValid && total !== null && items.reduce((sum, item) => sum + item.amountCents, 0) === total;
  const amount = cents => validAmount(cents) ? (cents / 100).toFixed(2).replace('.', ',') : '?';
  const proposal = [...items.map(item => `${Number.isFinite(item.quantity) ? item.quantity : '?'} ${item.name || 'Concepto ilegible'} ${amount(item.amountCents)}`), `TOTAL ${amount(total)}`].join('\n');
  return {
    text: proposal, itemText: reconciled ? proposal : '', itemsStatus: reconciled ? 'reconciled' : 'review',
    fields: { merchant: text(value.merchant, 160), total: total === null ? null : total / 100 },
    provider: 'google', warnings
  };
}

export async function readReceiptWithAI(meal, { accessCode, consent, mode='group' }, onProgress = () => {}, fetcher = fetch) {
  if(!['group','expense'].includes(mode))throw new Error('Modo de lectura no válido.');
  if (consent !== true) throw new Error('Marca que autorizas enviar las fotos de este ticket a Google para leerlo.');
  if (!String(accessCode || '').trim()) throw new Error('Introduce el código de acceso a la lectura gratuita.');
  const images=Array.isArray(meal.ticketPhotos)&&meal.ticketPhotos.length?meal.ticketPhotos.map(photo=>photo?.data):meal.ticketData?[meal.ticketData]:[];
  if(!images.length||images.length>8||images.some(image=>typeof image!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(image)))throw new Error('Añade entre una y ocho fotos JPEG, PNG o WebP del ticket.');
  if(images.reduce((sum,image)=>sum+image.length,0)>4_000_000)throw new Error('Las fotos juntas son demasiado grandes. Recorta el fondo o elige fotos más pequeñas; no se ha enviado ninguna.');
  if(new Set(images).size!==images.length)throw new Error('Hay una foto repetida. Quita la copia antes de leer el ticket.');
  onProgress({ status: 'Comprobando acceso gratuito y leyendo con Google…', progress: 0.1 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetcher(ENDPOINT, {
      method: 'POST', cache: 'no-store', credentials: 'omit', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Receipt-Access': String(accessCode).trim() },
      body: JSON.stringify({...(images.length===1?{image:images[0]}:{images}),...(mode==='expense'?{mode}:{})})
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('El servicio no ha respondido correctamente. No se reintentará automáticamente.'); }
    if (!response.ok) throw new Error(result.message || 'No se ha podido usar la lectura gratuita. Puedes usar el OCR local.');
    return mode==='expense'?normalizeExpenseReceipt(result.expense):normalizeReceiptProposal(result.receipt,{photoCount:images.length});
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La lectura con Google ha tardado demasiado. No se reintentará automáticamente.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con la lectura de Google. Comprueba la conexión o usa el OCR local.');
    throw error;
  } finally { clearTimeout(timer); }
}
