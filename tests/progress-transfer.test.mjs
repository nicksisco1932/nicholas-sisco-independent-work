import assert from 'node:assert/strict';
import test from 'node:test';
import { importProgress, KEY } from '../src/scripts/progress.mjs';

const lessons = [
  { id: 'lesson-a', version: 'current-a' },
  { id: 'lesson-b', version: 'current-b' },
];

function storageWith(value = {}) {
  const store = new Map([[KEY, JSON.stringify(value)]]);
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, item) => store.set(key, item),
    read: () => JSON.parse(store.get(KEY) ?? '{}'),
  };
}

test('imports only known current lesson versions and preserves existing progress', () => {
  const storage = storageWith({ 'lesson-a': 'current-a' });
  const result = importProgress(storage, lessons, JSON.stringify({
    'lesson-b': 'current-b',
    'lesson-old': 'old-version',
    'lesson-a': 'stale-version',
  }));
  assert.deepEqual(result, { ok: true, imported: 1 });
  assert.deepEqual(storage.read(), { 'lesson-a': 'current-a', 'lesson-b': 'current-b' });
});

test('rejects malformed, non-map, and oversized inputs without writing', () => {
  for (const input of ['{', '[]', '"string"', ' '.repeat(262_145)]) {
    const storage = storageWith({ 'lesson-a': 'current-a' });
    const before = storage.read();
    assert.equal(importProgress(storage, lessons, input).ok, false);
    assert.deepEqual(storage.read(), before);
  }
});

test('reports unavailable local storage without throwing', () => {
  assert.equal(importProgress(null, lessons, '{}').ok, false);
});
