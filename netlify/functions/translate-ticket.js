import OpenAI from 'openai';
import process from 'node:process';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default async function translateTicket(request) {
  const model = 'gpt-5.4-nano';
  const maxTextChars = 12000;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!String(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    return json({ error: 'invalid_content_type' }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const sourceText = String(body && body.text || '').trim();
  if (!sourceText) return json({ error: 'missing_text' }, 400);
  if (sourceText.length > maxTextChars) return json({ error: 'text_too_long' }, 413);
  const languages = Array.isArray(body && body.sourceLanguages)
    ? body.sourceLanguages.map(value => String(value || '').trim()).filter(Boolean).slice(0, 12)
    : [];

  try {
    const apiKey = Netlify.env.get('NETLIFY_AI_GATEWAY_KEY')
      || Netlify.env.get('OPENAI_API_KEY')
      || process.env.NETLIFY_AI_GATEWAY_KEY
      || process.env.OPENAI_API_KEY;
    const baseURL = Netlify.env.get('NETLIFY_AI_GATEWAY_BASE_URL')
      || Netlify.env.get('OPENAI_BASE_URL')
      || process.env.NETLIFY_AI_GATEWAY_BASE_URL
      || process.env.OPENAI_BASE_URL;
    if (!apiKey || !baseURL) return json({ error: 'gateway_not_configured' }, 503);
    const client = new OpenAI({ apiKey, baseURL, timeout: 45000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: [
            'Traduce al español el texto OCR de un ticket o factura.',
            'Conserva el orden de las líneas, nombres propios, fechas, horas, importes, monedas, referencias, códigos y cantidades.',
            'No inventes contenido ni corrijas importes. Si un fragmento no se entiende, consérvalo tal como está.',
            'Devuelve únicamente la traducción en texto plano, sin Markdown, comentarios ni explicaciones.'
          ].join(' ')
        },
        {
          role: 'user',
          content: `${languages.length ? `Idiomas usados para leer el ticket: ${languages.join(', ')}\n\n` : ''}${sourceText}`
        }
      ],
      max_completion_tokens: 4000
    });
    const translation = String(completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content || '').trim();
    if (!translation) return json({ error: 'empty_translation' }, 502);
    return json({ translation, model });
  } catch (error) {
    console.error('Ticket translation failed', error && (error.status || error.code || error.message));
    const status = Number(error && error.status);
    const reason = status === 401 || status === 403
      ? 'gateway_unauthorized'
      : status === 404
        ? 'model_unavailable'
        : 'translation_unavailable';
    return json({ error: reason }, 503);
  }
}

export const config = {
  path: '/api/translate-ticket',
  method: 'POST',
  rateLimit: {
    windowLimit: 6,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
