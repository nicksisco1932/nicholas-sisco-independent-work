import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublished } from '../src/lib/publication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root, 'src/content');
const entries = [];
for (const collection of fs.readdirSync(content, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  for (const file of fs.readdirSync(path.join(content, collection.name)).filter((x) => x.endsWith('.mdx'))) {
    const text = fs.readFileSync(path.join(content, collection.name, file), 'utf8');
    const frontmatter = text.split(/^---\s*$/m)[1] ?? '';
    const published = /^published:\s*true\s*$/m.test(frontmatter);
    const status = /^status:\s*["']?([^\r\n"']+)/m.exec(frontmatter)?.[1]?.trim() ?? '';
    assert.doesNotThrow(() => isPublished({ id: `${collection.name}/${file}`, data: { published, status } }), `${collection.name}/${file}`);
    entries.push({ collection: collection.name, file, published });
  }
}
assert.equal(entries.length, 82, `expected 82 markdown entries, saw ${entries.length}`);
const notes = entries.filter((entry) => entry.collection === 'notes');
assert.equal(notes.filter((entry) => entry.published).length, 4, 'four reviewed notes should be public');
assert.ok(fs.existsSync(path.join(content, 'notes/historical-universe.mdx')));
assert.ok(fs.existsSync(path.join(content, 'notes/nmr-thermodynamic-inference.mdx')));
console.log(`Publication metadata checked for ${entries.length} content entries.`);
