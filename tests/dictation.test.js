import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.bundle.js', import.meta.url), 'utf8');
const helperStart = app.indexOf('function cleanSpeechText');
const helperEnd = app.indexOf('function capitalizeSpeechText');
const helperSource = app.slice(helperStart, helperEnd);
const compactSpeechSegments = Function(`${helperSource}\nreturn compactSpeechSegments;`)();

test('el dictado sustituye hipotesis acumulativas aunque corrijan las ultimas palabras', () => {
  const transcript = compactSpeechSegments([
    'Ignacia ha cogido un dia mas porque se va a las diez y que',
    'Ignacia ha cogido un dia mas porque se va a las diez y quiere dar',
    'Ignacia ha cogido un dia mas porque se va a las diez y quiere darse una vuelta'
  ]);

  assert.equal(
    transcript,
    'Ignacia ha cogido un dia mas porque se va a las diez y quiere darse una vuelta'
  );
});

test('el dictado conserva segmentos independientes', () => {
  assert.equal(
    compactSpeechSegments(['Fuimos al museo esta manana', 'Despues cenamos cerca del hotel']),
    'Fuimos al museo esta manana Despues cenamos cerca del hotel'
  );
});
