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


// Locked archive-homepage contract (#4). Check built HTML so template changes
// cannot silently drop the approved copy, navigation, or publication boundary.
const homeNodes = children(parse(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')));
const byId = (id) => homeNodes.find((node) => attrs(node).id === id);
const visibleText = (node) => {
  if (!node || attrs(node)['aria-hidden'] === 'true') return '';
  return node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(visibleText).join('');
};
const textOf = (node) => visibleText(node).replace(/\s+/g, ' ').trim();
const withClass = (name) => homeNodes.find((node) => (attrs(node).class ?? '').split(/\s+/).includes(name));
assert.equal(textOf(byId('archive-title')), 'A working archive of science, tools, systems, and ideas.');
assert.equal(textOf(withClass('kicker')), 'ARCHIVE OF INDEPENDENT WORK');
assert.equal(textOf(withClass('lead')), 'Explore projects, essays, research threads, and practical systems spanning scientific software, molecular physiology, computational imaging, quantitative methods, and independent technical work.');
const actions = children(withClass('actions')).filter((node) => node.tagName === 'a');
assert.deepEqual(actions.map((node) => [textOf(node), attrs(node).href]), [
  ['Explore the work', '#projects'],
  ['Browse the atlas', `${base}molecular-physiology.html`],
]);
const primaryNav = homeNodes.find((node) => node.tagName === 'nav' && attrs(node)['aria-label'] === 'Primary');
assert.deepEqual(children(primaryNav).filter((node) => node.tagName === 'a').map((node) => [textOf(node), attrs(node).href]), [
  ['Work', `${base}#projects`], ['Atlas', `${base}molecular-physiology.html`],
  ['Notes', `${base}#notes`], ['Writing', `${base}#writing`], ['About', `${base}#about`],
]);
assert.equal(textOf(withClass('brand')), 'Nicholas J. Sisco');
assert.deepEqual(children(withClass('collections')).filter((node) => node.tagName === 'h3').map(textOf), [
  'Research & Methods', 'Software & Tools', 'Physiology & Atlas', 'Writing',
]);
for (const id of ['projects', 'physiology', 'notes', 'methods', 'writing', 'about']) {
  assert.ok(byId(id), `legacy homepage fragment #${id} must remain available`);
}
const homeLinks = new Set(homeNodes.filter((node) => node.tagName === 'a').map((node) => attrs(node).href));
for (const entry of readEntries().filter((entry) => entry.collection === 'notes' || entry.collection === 'projects')) {
  const route = `${base}${expectedRoute(entry)}`;
  if (entry.published && (entry.collection === 'notes' || ['literature', 'odgs'].includes(entry.slug))) {
    assert.ok(homeLinks.has(route), `missing published homepage entry: ${route}`);
  } else if (!entry.published) {
    assert.ok(!homeLinks.has(route), `unpublished entry appears on homepage: ${route}`);
  }
}
const visual = children(withClass('technical-field'));
const svg = visual.find((node) => node.tagName === 'svg');
assert.equal(attrs(svg)['aria-hidden'], 'true');
assert.equal(attrs(svg).focusable, 'false');
assert.match(textOf(withClass('technical-field')), /Decorative, not scientific evidence/);
assert.ok(!homeNodes.some((node) => ['script', 'form', 'input', 'iframe', 'img', 'image'].includes(node.tagName)), 'homepage must stay static and free of external/clinical imagery or submission controls');
assert.ok(homeNodes.some((node) => node.tagName === 'a' && attrs(node).href === '#main' && textOf(node) === 'Skip to content'));
assert.match(textOf(byId('projects')), /Bounded text summary only — no images, raw data, or repository links are published here until rights and a clean evidence destination are established\./);
console.log('Validated archive homepage copy, navigation, collections, publication links, legacy fragments, and decorative/read-only boundaries.');
