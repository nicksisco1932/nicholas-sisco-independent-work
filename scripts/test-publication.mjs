import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readEntries, contentDir } from './lib/content-inventory.mjs';

// readEntries() is fail-closed: any entry with a published:true + status:draft
// conflict throws here, identifying the entry.
const entries = readEntries();

// Route-namespace collision check: projects and notes share the root /<slug>.html
// namespace via src/pages/[slug].astro. A duplicate slug would silently clobber a page.
const rootSlugs = new Map();
for (const entry of entries.filter((e) => e.collection === 'projects' || e.collection === 'notes')) {
  if (rootSlugs.has(entry.slug)) {
    assert.fail(`duplicate root slug '${entry.slug}': ${rootSlugs.get(entry.slug)} and ${entry.collection}/${entry.file}`);
  }
  rootSlugs.set(entry.slug, `${entry.collection}/${entry.file}`);
}

const publishedNotes = entries.filter((entry) => entry.collection === 'notes' && entry.published);
assert.ok(publishedNotes.length > 0, 'expected at least one published note');

// Canonical spot checks: stable anchors, not counts — these never break on additions.
assert.ok(fs.existsSync(path.join(contentDir, 'notes/historical-universe.mdx')));
assert.ok(fs.existsSync(path.join(contentDir, 'notes/nmr-thermodynamic-inference.mdx')));

console.log(`Publication metadata checked for ${entries.length} content entries (${publishedNotes.length} published notes).`);
