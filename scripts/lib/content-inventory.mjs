import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublished } from '../../src/lib/publication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const contentDir = path.join(root, 'src/content');

/**
 * Collection -> URL prefix (relative to dist/) for that collection's entry routes.
 * Mirrors the getStaticPaths() route tables in src/pages/**\/[slug].astro.
 * Adding a NEW COLLECTION without extending this map fails loudly on purpose:
 * a new collection is an architectural change whose routes must be declared here.
 * Adding content to an existing collection needs no test changes.
 */
export const ROUTE_PREFIX = {
  projects: '',
  notes: '',
  'atlas-concepts': 'molecular-physiology/concepts/',
  'atlas-updates': 'molecular-physiology/updates/',
  'course-guides': 'forged-fitness/guides/',
  'course-lessons': 'forged-fitness/lessons/',
  'course-paths': 'forged-fitness/paths/',
  'course-resources': 'forged-fitness/resources/',
  'course-weeks': 'forged-fitness/weeks/',
};

/**
 * Read every .mdx content entry with its publication state.
 * Throws (fail-closed) on a published+draft metadata conflict, via isPublished.
 */
export function readEntries() {
  const entries = [];
  for (const collection of fs.readdirSync(contentDir, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    if (!(collection.name in ROUTE_PREFIX)) {
      throw new Error(
        `content collection '${collection.name}' has no route prefix in scripts/lib/content-inventory.mjs — declare its routes before publishing.`
      );
    }
    for (const file of fs.readdirSync(path.join(contentDir, collection.name)).filter((x) => x.endsWith('.mdx'))) {
      const text = fs.readFileSync(path.join(contentDir, collection.name, file), 'utf8');
      const frontmatter = text.split(/^---\s*$/m)[1] ?? '';
      const publishedFlag = /^published:\s*true\s*$/m.test(frontmatter);
      const status = /^status:\s*["']?([^\r\n"']+)/m.exec(frontmatter)?.[1]?.trim() ?? '';
      const id = `${collection.name}/${file}`;
      // isPublished throws on a published:true + status:draft conflict.
      const published = isPublished({ id, data: { published: publishedFlag, status } });
      entries.push({ collection: collection.name, file, slug: file.replace(/\.mdx$/, ''), published });
    }
  }
  return entries;
}

/** dist-relative HTML path a published entry must produce (build.format: 'file'). */
export function expectedRoute(entry) {
  return `${ROUTE_PREFIX[entry.collection]}${entry.slug}.html`;
}
