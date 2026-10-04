import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'dist');
const output = path.join(root, 'legacy-pages');
const configuredSite = process.env.PUBLIC_SITE_URL?.trim();
if (!configuredSite) throw new Error('Set PUBLIC_SITE_URL to the permanent HTTPS domain before building migration notices.');
const target = new URL(configuredSite);
if (target.protocol !== 'https:' || target.pathname !== '/' || target.search || target.hash) {
  throw new Error('PUBLIC_SITE_URL must be the permanent HTTPS origin with no path, query, or fragment.');
}
if (!await fs.stat(source).catch(() => false)) throw new Error('Build the site before creating legacy migration notices.');
const configuredBase = process.env.PUBLIC_SITE_BASE?.trim() || '/nicholas-sisco-independent-work';
const base = configuredBase === '/' ? '/' : '/' + configuredBase.replace(/^\/+|\/+$/g, '') + '/';
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
let pageCount = 0;
const copiedAssets = new Set();
const allowedAsset = /\.(?:css|js|mjs|json|woff2?|ttf|otf|svg|png|jpe?g|webp|ico|avif)$/i;

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const scriptString = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

async function copyAsset(reference, referringPage) {
  let asset;
  try {
    const pageUrl = new URL(base + referringPage, 'https://legacy.invalid/');
    asset = new URL(reference, pageUrl);
  } catch {
    return;
  }
  if (asset.origin !== 'https://legacy.invalid' || !allowedAsset.test(asset.pathname)) return;
  let relative = asset.pathname.startsWith(base) ? asset.pathname.slice(base.length) : asset.pathname.slice(1);
  relative = decodeURIComponent(relative);
  const sourceFile = path.resolve(source, relative);
  const withinSource = path.relative(source, sourceFile);
  if (!withinSource || withinSource.startsWith('..') || path.isAbsolute(withinSource)) return;
  const stat = await fs.stat(sourceFile).catch(() => null);
  if (!stat?.isFile() || copiedAssets.has(relative)) return;
  copiedAssets.add(relative);
  const destination = path.join(output, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(sourceFile, destination);
  const content = await fs.readFile(sourceFile, 'utf8').catch(() => '');
  if (relative.endsWith('.css')) {
    for (const match of content.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) await copyAsset(match[1], relative);
    for (const match of content.matchAll(/@import\s+["']([^"']+)["']/gi)) await copyAsset(match[1], relative);
  } else if (/\.(?:m?js)$/i.test(relative)) {
    for (const match of content.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)["']/g)) await copyAsset(match[1], relative);
  }
}

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(filename);
      continue;
    }
    const relative = path.relative(source, filename).replaceAll(path.sep, '/');
    if (!relative.endsWith('.html')) continue;
    const destinationFile = path.join(output, relative);
    await fs.mkdir(path.dirname(destinationFile), { recursive: true });
    if (relative === 'forged-fitness/progress.html') {
      let html = await fs.readFile(filename, 'utf8');
      const destination = new URL(relative, target).href;
      html = html.replace(/(<link\s+rel=["']canonical["']\s+href=["'])[^"']*(["'][^>]*>)/i, '$1' + destination + '$2');
      html = html.replace(/(<meta\s+property=["']og:url["']\s+content=["'])[^"']*(["'][^>]*>)/i, '$1' + destination + '$2');
      html = html.replace(/(<link\s+rel=["']sitemap["']\s+href=["'])[^"']*(["'][^>]*>)/i, '$1' + new URL('sitemap-index.xml', target).href + '$2');
      html = html.replace('</head>', '<meta name="robots" content="noindex"></head>');
      await fs.writeFile(destinationFile, html);
      for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) await copyAsset(match[1], relative);
      for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
        for (const candidate of match[1].split(',')) await copyAsset(candidate.trim().split(/\s+/)[0], relative);
      }
      continue;
    }
    const destination = new URL(relative === 'index.html' || relative === '404.html' ? '/' : relative, target).href;
    const safeDestination = escapeHtml(destination);
    const jsDestination = scriptString(destination);
    const isCourseRoute = relative.startsWith('forged-fitness/');
    const title = relative === '404.html' ? 'This page is unavailable' : 'This site has moved';
    const notice = '<!doctype html>\n' +
      '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + title + ' · Nicholas Sisco</title><link rel="canonical" href="' + safeDestination + '">\n' +
      (isCourseRoute ? '' : '<meta http-equiv="refresh" content="1;url=' + safeDestination + '">') + '</head>\n' +
      '<body><main><h1>' + title + '</h1>' +
      (isCourseRoute ? '<p>Your course progress is stored on this site in this browser. <a href="' + escapeHtml(base + 'forged-fitness/progress.html') + '">Export it before moving to the new site</a>.</p>' : '') +
      '<p>This page has moved to <a data-new-address href="' + safeDestination + '">its new address</a>.</p></main>\n' +
      '<script>const destination=' + jsDestination + ';const next=destination+window.location.search+window.location.hash;document.querySelector("[data-new-address]").href=next;' +
      (isCourseRoute ? '' : 'window.location.replace(next);') + '</script></body></html>';
    await fs.writeFile(destinationFile, notice);
    pageCount += 1;
  }
}

await walk(source);
const progressIndex = path.join(source, 'forged-fitness', 'course-index.json');
await fs.mkdir(path.join(output, 'forged-fitness'), { recursive: true });
await fs.copyFile(progressIndex, path.join(output, 'forged-fitness', 'course-index.json'));
await fs.writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + new URL('sitemap-index.xml', target).href + '\n');
console.log('Prepared ' + pageCount + ' page-move notices; retained the progress page and ' + copiedAssets.size + ' required course assets.');
