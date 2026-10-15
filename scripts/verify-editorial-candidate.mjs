import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUILD_WORKFLOW, LIMITS, canonicalJson, candidateId, exactKeys, invariant, sha256, validId, validSha, validTimestamp, validateAssetPath, validateMetadata } from './editorial-candidate.mjs';

function parseBundle(input) {
  const bytes = typeof input === 'string' || Buffer.isBuffer(input) ? Buffer.from(input) : Buffer.from(canonicalJson(input));
  invariant(bytes.length <= LIMITS.archiveBytes, 'archive size limit exceeded');
  let bundle;
  try { bundle = JSON.parse(bytes.toString('utf8')); } catch { invariant(false, 'invalid bundle JSON'); }
  invariant(Buffer.from(canonicalJson(bundle)).equals(bytes), 'bundle must use canonical JSON (duplicate keys/invalid encoding rejected)');
  return { bundle, bytes };
}

function validateExpected(expected) {
  exactKeys(expected, ['repository', 'repositoryId', 'sourceCommitSha', 'sourceTreeSha', 'workflowPath', 'workflowSha', 'runId', 'runAttempt', 'artifactClass', 'artifactId', 'artifactName', 'archiveSha256', 'githubArtifactDigest', 'expiresAt', 'conclusion', 'siteOrigin', 'siteBase', 'configDigest'], [], 'trusted expected provenance');
  invariant(validId(expected.repositoryId) && validId(expected.runId) && validId(expected.artifactId), 'trusted IDs required');
  invariant(validSha(expected.archiveSha256) && /^sha256:[a-f0-9]{64}$/.test(expected.githubArtifactDigest), 'independent archive and GitHub artifact digests required');
  invariant(expected.workflowPath === BUILD_WORKFLOW && expected.conclusion === 'success', 'known successful workflow required');
  invariant(expected.artifactName === `editorial-${expected.runId}-${expected.runAttempt}`, 'artifact name must bind immutable run/attempt');
  invariant(validTimestamp(expected.expiresAt) && Date.parse(expected.expiresAt) > Date.now(), 'artifact expired or expiry unavailable');
}

/**
 * expected must come from trusted GitHub API/policy evidence, never the download.
 * The caller must hash the raw outer ZIP against githubArtifactDigest before
 * unpacking. Before extraction, trusted control also requires the existing root
 * _redirects bytes to equal pinned public/_redirects; candidates cannot choose routing.
 */
export function verifyCandidate(input, manifest, expected) {
  validateExpected(expected);
  exactKeys(manifest, ['schemaVersion', 'candidateId', 'artifactClass', 'metadata', 'archiveSha256', 'files', 'totalSize', 'fileCount', 'createdAt'], [], 'manifest');
  invariant(manifest.schemaVersion === 1, 'unknown manifest schema');
  validateMetadata(manifest.metadata);
  const metadata = manifest.metadata;
  for (const field of ['repository', 'repositoryId', 'sourceCommitSha', 'sourceTreeSha', 'workflowPath', 'workflowSha', 'runId', 'runAttempt', 'artifactClass']) invariant(metadata[field] === expected[field], `provenance mismatch: ${field}`);
  for (const [manifestField, expectedField] of [['siteOrigin', 'siteOrigin'], ['siteBase', 'siteBase'], ['configDigest', 'configDigest']]) invariant(metadata.build[manifestField] === expected[expectedField], `configuration mismatch: ${manifestField}`);
  invariant(manifest.artifactClass === metadata.artifactClass && manifest.createdAt === metadata.createdAt, 'manifest identity mismatch');
  const { bundle, bytes } = parseBundle(input);
  exactKeys(bundle, ['schemaVersion', 'format', 'files'], [], 'bundle');
  invariant(bundle.schemaVersion === 1 && bundle.format === 'editorial-static-assets-v1', 'unknown bundle format');
  const digest = sha256(bytes);
  invariant(digest === manifest.archiveSha256 && digest === expected.archiveSha256, 'archive digest mismatch');
  invariant(manifest.candidateId === candidateId(metadata, digest), 'candidate identity mismatch');
  invariant(Array.isArray(bundle.files) && bundle.files.length > 0 && bundle.files.length <= LIMITS.files, 'invalid file count');
  invariant(Array.isArray(manifest.files) && manifest.files.length === bundle.files.length && manifest.fileCount === bundle.files.length, 'extra or missing files');
  const seen = new Set();
  const directories = new Set();
  const spellings = new Map();
  const decoded = [];
  let lastPath = '';
  let totalSize = 0;
  for (let index = 0; index < bundle.files.length; index++) {
    const file = bundle.files[index];
    const entry = manifest.files[index];
    exactKeys(file, ['path', 'size', 'sha256', 'base64'], [], 'bundle file');
    exactKeys(entry, ['path', 'size', 'sha256'], [], 'manifest file');
    validateAssetPath(file.path);
    invariant(file.path > lastPath, 'file paths must be sorted and unique');
    lastPath = file.path;
    const folded = file.path.toLowerCase();
    invariant(!seen.has(folded), 'case-colliding file path');
    const components = file.path.split('/');
    for (let i = 1; i <= components.length; i++) {
      const original = components.slice(0, i).join('/');
      const normalized = original.toLowerCase();
      invariant(!spellings.has(normalized) || spellings.get(normalized) === original, 'directory/file spelling collision');
      spellings.set(normalized, original);
      if (i < components.length) {
        invariant(!seen.has(normalized), 'file/directory collision');
        directories.add(normalized);
      }
    }
    invariant(!directories.has(folded), 'file/directory collision');
    seen.add(folded);
    invariant(Number.isSafeInteger(file.size) && file.size >= 0 && file.size <= LIMITS.fileBytes, 'invalid or oversized file');
    invariant(typeof file.base64 === 'string' && file.base64.length <= Math.ceil(LIMITS.fileBytes / 3) * 4 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64), 'invalid base64 payload');
    const data = Buffer.from(file.base64, 'base64');
    invariant(data.toString('base64') === file.base64 && data.length === file.size, 'noncanonical base64 or file size mismatch');
    invariant(validSha(file.sha256) && sha256(data) === file.sha256, `file digest mismatch: ${file.path}`);
    invariant(entry.path === file.path && entry.size === file.size && entry.sha256 === file.sha256, 'file manifest mismatch');
    totalSize += data.length;
    invariant(totalSize <= LIMITS.totalBytes, 'total size limit exceeded');
    decoded.push({ path: file.path, data });
  }
  invariant(manifest.totalSize === totalSize, 'total size mismatch');
  return { candidateId: manifest.candidateId, archiveSha256: digest, files: decoded, provenance: { artifactId: expected.artifactId, artifactName: expected.artifactName, githubArtifactDigest: expected.githubArtifactDigest, expiresAt: expected.expiresAt, runId: expected.runId, runAttempt: expected.runAttempt } };
}

export async function extractCandidate(bundle, manifest, expected, outputDir) {
  const result = verifyCandidate(bundle, manifest, expected);
  const target = path.resolve(outputDir);
  const parent = path.dirname(target);
  const parentStat = await lstat(parent);
  const actualParent = path.resolve(await realpath(parent));
  const sameParent = process.platform === 'win32' ? actualParent.toLowerCase() === parent.toLowerCase() : actualParent === parent;
  invariant(parentStat.isDirectory() && !parentStat.isSymbolicLink() && sameParent, 'extraction parent must be a real directory');
  await mkdir(target); // Must be fresh; never merge into an existing tree or follow a pre-planted link.
  for (const file of result.files) {
    const destination = path.resolve(target, ...file.path.split('/'));
    invariant(destination.startsWith(`${target}${path.sep}`), 'extraction escaped target');
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.data, { flag: 'wx', mode: 0o644 });
  }
  return { ...result, files: result.files.map(({ path: assetPath, data }) => ({ path: assetPath, size: data.length, sha256: sha256(data) })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [inputDir, expectedPath, outputDir, ...extra] = process.argv.slice(2);
    invariant(inputDir && expectedPath && outputDir && extra.length === 0, 'usage: verify-editorial-candidate.mjs INPUT EXPECTED.json FRESH_OUTPUT');
    const entries = (await import('node:fs/promises')).readdir;
    invariant((await entries(inputDir)).sort().join(',') === 'candidate.bundle.json,manifest.json', 'artifact contains unexpected or missing files');
    for (const name of ['candidate.bundle.json', 'manifest.json']) invariant((await lstat(path.join(inputDir, name))).isFile() && !(await lstat(path.join(inputDir, name))).isSymbolicLink(), 'artifact entry must be a regular file');
    const manifestBytes = await readFile(path.join(inputDir, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestBytes);
    invariant(manifestBytes === canonicalJson(manifest), 'manifest must use canonical JSON');
    const result = await extractCandidate(await readFile(path.join(inputDir, 'candidate.bundle.json')), manifest, JSON.parse(await readFile(expectedPath, 'utf8')), outputDir);
    process.stdout.write(canonicalJson({ candidateId: result.candidateId, archiveSha256: result.archiveSha256, provenance: result.provenance, fileCount: result.files.length }));
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
