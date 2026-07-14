import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('el titulo del arranque movil queda por encima del tren', () => {
  const mobileStart = styles.indexOf('@media (max-width: 640px)');
  const mobileEnd = styles.indexOf('.offline-status', mobileStart);
  const mobileStyles = styles.slice(mobileStart, mobileEnd);
  assert.match(mobileStyles, /\.app-loading-title \{[\s\S]*?top: 23svh/);
  assert.match(mobileStyles, /\.app-loading-train \{[\s\S]*?top: 46svh/);
  assert.match(mobileStyles, /\.app-loading-cover \{[\s\S]*?display: none/);
});
