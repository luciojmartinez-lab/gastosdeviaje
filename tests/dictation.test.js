import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import transcribeDictation, { config } from '../netlify/functions/transcribe-dictation.js';

const [app, html, help, functionSource] = await Promise.all([
  readFile(new URL('../app.bundle.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../ayuda.html', import.meta.url), 'utf8'),
  readFile(new URL('../netlify/functions/transcribe-dictation.js', import.meta.url), 'utf8'),
]);

function audioRequest(type = 'audio/webm') {
  const formData = new FormData();
  formData.append('audio', new Blob(['audio'], { type }), 'dictado.webm');
  return new Request('https://example.test/api/transcribe-dictation', {
    method: 'POST',
    body: formData,
  });
}

test('el endpoint de dictado exige una clave de servidor', async () => {
  globalThis.Netlify = { env: { get: () => undefined } };
  const response = await transcribeDictation(audioRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'transcription_not_configured' });
});

test('el endpoint envía el audio a OpenAI sin exponer la clave', async () => {
  const originalFetch = globalThis.fetch;
  let outgoing;
  globalThis.Netlify = { env: { get: key => key === 'OPENAI_TRANSCRIPTION_API_KEY' ? 'secret-test-key' : undefined } };
  globalThis.fetch = async (url, options) => {
    outgoing = { url, options };
    return Response.json({ text: 'Hola, mundo.' });
  };
  try {
    const response = await transcribeDictation(audioRequest());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: 'Hola, mundo.' });
    assert.equal(outgoing.url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(outgoing.options.headers.Authorization, 'Bearer secret-test-key');
    assert.equal(outgoing.options.body.get('model'), 'gpt-4o-mini-transcribe');
    assert.equal(outgoing.options.body.get('language'), 'es');
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.Netlify;
  }
});

test('el dictado usa captura propia y una función protegida', () => {
  assert.equal(config.path, '/api/transcribe-dictation');
  assert.equal(config.rateLimit.windowLimit, 10);
  assert.match(functionSource, /OPENAI_TRANSCRIPTION_API_KEY/);
  assert.doesNotMatch(html + app, /webkitSpeechRecognition|window\.SpeechRecognition/);
  assert.match(app, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(app, /new MediaRecorder/);
  assert.match(app, /fetch\('\/api\/transcribe-dictation'/);
  assert.match(app, /oncancel = \(\) => stopBlogDictation\(\{ discard: true \}\)/);
  assert.match(app, /Espera a que termine la transcripción antes de guardar/);
  assert.match(help, /grabación se envía al servicio de transcripción/);
});
