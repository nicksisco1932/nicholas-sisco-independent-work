import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { readEntries, expectedRoute } from './lib/content-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const base = '/nicholas-sisco-independent-work/';
const origin = 'https://nicksisco1932.github.io';
const htmlFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(dist);
// Every published content entry must have produced its route. This is derived
// from the content tree, so publishing a new entry never requires a test change —
// unlike the old hardcoded route count. Stronger than a count: a silently
// dropped page fails here even when the total looks right.
const unbuilt = [];
for (const entry of readEntries().filter((e) => e.published)) {
  const route = expectedRoute(entry);
  if (!fs.existsSync(path.join(dist, route))) unbuilt.push(`${entry.collection}/${entry.file} -> ${route}`);
}
assert.deepEqual(unbuilt, [], `published entries with no built route:\n${unbuilt.join('\n')}`);
const problems = [];
const built = new Map();
function attrs(node) { return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value])); }
function children(node, out = []) { if (!node) return out; out.push(node); for (const child of node.childNodes ?? []) children(child, out); if (node.content) children(node.content, out); return out; }
for (const file of htmlFiles) {
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  const doc = parse(fs.readFileSync(file, 'utf8'));
  const nodes = children(doc);
  const ids = new Set();
  for (const node of nodes) {
    const a = attrs(node);
    if (a.id) {
      if (ids.has(a.id)) problems.push(`${relative}: duplicate id #${a.id}`);
      ids.add(a.id);
    }
  }
  const title = nodes.find((node) => node.tagName === 'title');
  const description = nodes.find((node) => node.tagName === 'meta' && attrs(node).name === 'description');
  const canonical = nodes.find((node) => node.tagName === 'link' && attrs(node).rel === 'canonical');
  const h1s = nodes.filter((node) => node.tagName === 'h1');
  if (!title || !description || !attrs(canonical).href || h1s.length !== 1) problems.push(`${relative}: missing title, description, canonical, or exactly one h1`);
  built.set(relative, ids);
}
const toRoute = (pathname) => {
  if (!pathname.startsWith(base)) return null;
  let pathPart = decodeURIComponent(pathname.slice(base.length));
  if (!pathPart || pathPart.endsWith('/')) pathPart += 'index.html';
  else if (!pathPart.endsWith('.html') && !path.posix.extname(pathPart)) pathPart += '.html';
  return pathPart;
};
for (const file of htmlFiles) {
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  const doc = parse(fs.readFileSync(file, 'utf8'));
  for (const node of children(doc)) {
    const a = attrs(node);
    const ref = a.href ?? a.src;
    if (!ref || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('javascript:')) continue;
    let url;
    try { url = new URL(ref, `${origin}${base}${relative}`); } catch { problems.push(`${relative}: invalid URL ${ref}`); continue; }
    if (url.origin !== origin || !url.pathname.startsWith(base)) continue;
    const target = toRoute(url.pathname);
    if (target && built.has(target)) {
      if (url.hash && !built.get(target).has(decodeURIComponent(url.hash.slice(1)))) problems.push(`${relative}: broken fragment ${ref}`);
      continue;
    }
    const assetPath = path.join(dist, decodeURIComponent(url.pathname.slice(base.length)));
    if (!fs.existsSync(assetPath)) problems.push(`${relative}: broken internal link ${ref} -> ${assetPath}`);
  }
}
assert.deepEqual(problems, [], problems.slice(0, 80).join('\n'));
console.log(`Validated ${htmlFiles.length} pages, metadata, duplicate IDs, internal links, and fragments.`);

