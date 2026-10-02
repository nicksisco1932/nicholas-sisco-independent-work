import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublished } from '../src/lib/publication.mjs';

test('publication gate only emits explicitly published entries', () => {
  assert.equal(isPublished({ data: { published: true, status: 'Published research note' } }), true);
  assert.equal(isPublished({ data: { published: false, status: 'draft' } }), false);
  assert.equal(isPublished({ data: { status: 'Published research note' } }), false);
});

test('publication gate rejects contradictory draft metadata', () => {
  assert.throws(() => isPublished({ id: 'bad.mdx', data: { published: true, status: 'Draft' } }), /published and draft/);
});
