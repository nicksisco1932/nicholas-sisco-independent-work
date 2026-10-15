import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const LIMITS = Object.freeze({ files: 10000, fileBytes: 16 * 1024 * 1024, totalBytes: 64 * 1024 * 1024, archiveBytes: 96 * 1024 * 1024, pathBytes: 512 });
export const BUILD_WORKFLOW = '.github/workflows/build-editorial-candidate.yml';
const HEX40 = /^[a-f0-9]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const ID = /^[1-9][0-9]*$/;
const EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.pdf', '.webmanifest', '.mp4', '.webm', '.mp3', '.ogg', '.wav']);
const RESERVED = new Set(['_worker.js', '_routes.json', '_headers', '_redirects', 'wrangler.json', 'wrangler.jsonc', 'wrangler.toml', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'functions']);

export function invariant(condition, message) {
  if (!condition) throw new Error(`Candidate rejected: ${message}`);
}

export function exactKeys(object, required, optional = [], label = 'object') {
  invariant(object && typeof object === 'object' && !Array.isArray(object), `${label} must be an object`);
  const allowed = new Set([...required, ...optional]);
  invariant(Object.keys(object).every((key) => allowed.has(key)), `${label} contains unexpected fields`);
  invariant(required.every((key) => Object.hasOwn(object, key)), `${label} is missing required fields`);
}

export function canonicalJson(value) {
  function sort(item) {
    if (Array.isArray(item)) return item.map(sort);
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])]));
    return item;
  }
  return `${JSON.stringify(sort(value))}\n`;
}

export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
export function validSha(value, bits = 256) { return typeof value === 'string' && (bits === 160 ? HEX40 : HEX64).test(value); }
export function validId(value) { return typeof value === 'string' && ID.test(value); }
export function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}

export function validateAssetPath(assetPath) {
  invariant(typeof assetPath === 'string' && Buffer.byteLength(assetPath) <= LIMITS.pathBytes, 'invalid asset path length');
  // Preserve the site's existing root routing bytes. The trusted control plane
  // separately requires exact equality to pinned public/_redirects before extraction.
  if (assetPath === '_redirects') return assetPath;
  invariant(/^[A-Za-z0-9_@+(),=\/-][A-Za-z0-9_@+(),=.\/-]*$/.test(assetPath), `unsafe asset path: ${assetPath}`);
  invariant(!assetPath.startsWith('/') && !assetPath.endsWith('/') && !assetPath.includes('//'), `absolute or empty path component: ${assetPath}`);
  const parts = assetPath.split('/');
  for (const part of parts) {
    invariant(part !== '.' && part !== '..' && !part.startsWith('.') && !part.endsWith('.'), `dot path component: ${assetPath}`);
    invariant(!RESERVED.has(part.toLowerCase()) && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part), `executable or configuration asset: ${assetPath}`);
  }
  invariant(EXTENSIONS.has(path.posix.extname(assetPath).toLowerCase()), `unexpected static asset extension: ${assetPath}`);
  return assetPath;
}

export function validateMetadata(metadata) {
  exactKeys(metadata, ['repository', 'repositoryId', 'sourceCommitSha', 'sourceTreeSha', 'sourceIdentity', 'syntheticMergeSha', 'finalMainSha', 'workflowPath', 'workflowSha', 'runId', 'runAttempt', 'pullRequest', 'editorialVersion', 'artifactClass', 'createdAt', 'toolchain', 'build', 'validations'], [], 'metadata');
  invariant(typeof metadata.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(metadata.repository), 'invalid repository');
  invariant(validId(metadata.repositoryId) && validId(metadata.runId), 'repository and run IDs must be decimal strings');
  for (const field of ['sourceCommitSha', 'sourceTreeSha', 'workflowSha']) invariant(validSha(metadata[field], 160), `invalid ${field}`);
  for (const field of ['syntheticMergeSha', 'finalMainSha']) invariant(metadata[field] === null || validSha(metadata[field], 160), `invalid ${field}`);
  invariant(['standalone-head', 'main'].includes(metadata.sourceIdentity), 'unknown source identity');
  invariant(metadata.sourceIdentity !== 'main' || (metadata.finalMainSha === metadata.sourceCommitSha && metadata.pullRequest === null && metadata.syntheticMergeSha === null), 'main identity must bind the exact final main commit');
  invariant(metadata.sourceIdentity !== 'standalone-head' || (metadata.finalMainSha === null && Number.isSafeInteger(metadata.pullRequest) && metadata.pullRequest > 0), 'PR identity must bind a standalone PR head');
  invariant(metadata.workflowPath === BUILD_WORKFLOW, 'unknown candidate build workflow');
  invariant(Number.isSafeInteger(metadata.runAttempt) && metadata.runAttempt > 0, 'invalid run attempt');
  invariant(typeof metadata.editorialVersion === 'string' && metadata.editorialVersion.length > 0 && metadata.editorialVersion.length <= 120 && !/[\r\n\x00-\x1f]/.test(metadata.editorialVersion), 'invalid editorial version');
  invariant(['release-candidate', 'engineering-fixture'].includes(metadata.artifactClass), 'invalid artifact class');
  invariant(validTimestamp(metadata.createdAt), 'invalid creation time');
  exactKeys(metadata.toolchain, ['node', 'packageLockSha256', 'wrangler'], [], 'toolchain');
  invariant(/^24\.\d+\.\d+$/.test(metadata.toolchain.node), 'Node 24 exact version required');
  invariant(/^\d+\.\d+\.\d+$/.test(metadata.toolchain.wrangler) && validSha(metadata.toolchain.packageLockSha256), 'locked toolchain versions required');
  exactKeys(metadata.build, ['command', 'siteOrigin', 'siteBase', 'configDigest'], [], 'build');
  invariant(metadata.build.command === 'npm run validate', 'unexpected build command');
  invariant(metadata.build.siteBase === '/' && validSha(metadata.build.configDigest), 'root base and configuration digest required');
  let origin;
  try { origin = new URL(metadata.build.siteOrigin); } catch { invariant(false, 'invalid site origin'); }
  invariant(origin.protocol === 'https:' && origin.origin === metadata.build.siteOrigin && !origin.username && !origin.password && origin.port === '', 'site origin must be a permanent HTTPS origin without credentials or path');
  const fixture = /(?:^|\.)(?:invalid|localhost|test|example)$/.test(origin.hostname) || /(?:^|\.)example\.(?:com|net|org)$/.test(origin.hostname) || /^[\d.]+$/.test(origin.hostname) || origin.hostname.startsWith('[');
  invariant(metadata.artifactClass !== 'release-candidate' || !fixture, 'fixture/local origins are not releasable');
  invariant(Array.isArray(metadata.validations) && metadata.validations.length > 0 && metadata.validations.length <= 32, 'validation receipts required');
  const names = new Set();
  for (const validation of metadata.validations) {
    exactKeys(validation, ['name', 'result'], [], 'validation');
    invariant(typeof validation.name === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(validation.name) && !/(approval|access|preview|phone|protection|deploy)/.test(validation.name), 'build cannot assert privileged validation evidence');
    invariant(validation.result === 'passed' && !names.has(validation.name), 'failed or duplicate validation receipt');
    names.add(validation.name);
  }
  return metadata;
}

export function candidateId(metadata, archiveSha256) {
  return `candidate-${sha256(canonicalJson({ metadata, archiveSha256 })).slice(0, 32)}`;
}

export async function packageCandidate(inputDir, outputDir, metadata) {
  validateMetadata(metadata);
  const root = path.resolve(inputDir);
  const target = path.resolve(outputDir);
  invariant(target !== root && !target.startsWith(`${root}${path.sep}`), 'package output must be outside the asset directory');
  const rootStat = await lstat(root);
  invariant(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'input must be a regular directory');
  const files = [];
  let totalSize = 0;
  const seen = new Set();
  async function walk(directory, prefix = '') {
    for (const entry of (await readdir(directory)).sort()) {
      const assetPath = prefix ? `${prefix}/${entry}` : entry;
      const fullPath = path.join(directory, entry);
      const stat = await lstat(fullPath);
      invariant(!stat.isSymbolicLink(), `symlink asset: ${assetPath}`);
      invariant(stat.isFile() || stat.isDirectory(), `nonregular asset: ${assetPath}`);
      if (stat.isDirectory()) {
        // Validate directory components using a harmless extension; hidden and reserved directories still fail.
        validateAssetPath(`${assetPath}/index.html`);
        await walk(fullPath, assetPath);
        continue;
      }
      validateAssetPath(assetPath);
      const folded = assetPath.toLowerCase();
      invariant(!seen.has(folded), 'case-colliding asset paths');
      seen.add(folded);
      invariant(stat.size <= LIMITS.fileBytes && files.length < LIMITS.files, 'asset file/count limit exceeded');
      const bytes = await readFile(fullPath);
      invariant(bytes.length === stat.size && bytes.length <= LIMITS.fileBytes, 'asset changed while packaging');
      totalSize += bytes.length;
      invariant(totalSize <= LIMITS.totalBytes, 'asset total size limit exceeded');
      files.push({ path: assetPath, size: bytes.length, sha256: sha256(bytes), base64: bytes.toString('base64') });
    }
  }
  await walk(root);
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  invariant(files.length > 0, 'empty asset bundle');
  const bundle = { schemaVersion: 1, format: 'editorial-static-assets-v1', files };
  const archive = canonicalJson(bundle);
  invariant(Buffer.byteLength(archive) <= LIMITS.archiveBytes, 'archive size limit exceeded');
  const archiveSha256 = sha256(archive);
  const manifest = { schemaVersion: 1, candidateId: candidateId(metadata, archiveSha256), artifactClass: metadata.artifactClass, metadata: structuredClone(metadata), archiveSha256, files: files.map(({ base64, ...file }) => file), totalSize, fileCount: files.length, createdAt: metadata.createdAt };
  await mkdir(target); // An existing output directory is never silently reused.
  await writeFile(path.join(target, 'candidate.bundle.json'), archive, { flag: 'wx' });
  await writeFile(path.join(target, 'manifest.json'), canonicalJson(manifest), { flag: 'wx' });
  return { bundle, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [command, input, output, metadataPath, ...extra] = process.argv.slice(2);
    invariant(command === 'pack' && input && output && metadataPath && extra.length === 0, 'usage: editorial-candidate.mjs pack DIST OUTPUT METADATA.json');
    const { manifest } = await packageCandidate(input, output, JSON.parse(await readFile(metadataPath, 'utf8')));
    process.stdout.write(`${canonicalJson({ candidateId: manifest.candidateId, archiveSha256: manifest.archiveSha256, fileCount: manifest.fileCount, totalSize: manifest.totalSize })}`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
