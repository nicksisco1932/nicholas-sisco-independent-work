import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as packer from '../scripts/editorial-candidate.mjs';
import * as verifier from '../scripts/verify-editorial-candidate.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const workflowSha = 'c'.repeat(40);
const metadata = () => ({
  repository: 'nicksisco1932/nicholas-sisco-independent-work', repositoryId: '1396449686',
  sourceCommitSha: commit, sourceTreeSha: tree, sourceIdentity: 'standalone-head',
  syntheticMergeSha: 'd'.repeat(40), finalMainSha: null,
  workflowPath: '.github/workflows/build-editorial-candidate.yml', workflowSha,
  runId: '1001', runAttempt: 1, pullRequest: 12, editorialVersion: 'engineering-test',
  artifactClass: 'engineering-fixture', createdAt: '2026-10-15T12:00:00.000Z',
  toolchain: { node: '24.19.0', packageLockSha256: 'e'.repeat(64), wrangler: '4.147.0' },
  build: { command: 'npm run validate', siteOrigin: 'https://website-v1.invalid', siteBase: '/', configDigest: 'f'.repeat(64) },
  validations: [{ name: 'site-validation', result: 'passed' }],
});
function expected(manifest, overrides = {}) {
  const m = manifest.metadata;
  return {
    repository: m.repository, repositoryId: m.repositoryId, sourceCommitSha: m.sourceCommitSha,
    sourceTreeSha: m.sourceTreeSha, workflowPath: m.workflowPath, workflowSha: m.workflowSha,
    runId: m.runId, runAttempt: m.runAttempt, artifactClass: m.artifactClass,
    artifactId: '555', artifactName: `editorial-${m.runId}-${m.runAttempt}`,
    archiveSha256: manifest.archiveSha256, githubArtifactDigest: `sha256:${'1'.repeat(64)}`,
    expiresAt: '2099-10-15T12:00:00.000Z', conclusion: 'success',
    siteOrigin: m.build.siteOrigin, siteBase: m.build.siteBase, configDigest: m.build.configDigest,
    ...overrides,
  };
}
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'editorial-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, 'dist');
  const output = path.join(root, 'candidate');
  await mkdir(path.join(input, 'article'), { recursive: true });
  await writeFile(path.join(input, 'index.html'), '<!doctype html><a href="/article/">Article</a>');
  await writeFile(path.join(input, 'article', 'index.html'), '<h1>Reviewed text</h1>');
  await writeFile(path.join(input, 'app.js'), 'console.log("static asset");');
  return { root, input, output };
}
async function candidate(t, overrides = {}) {
  const f = await fixture(t);
  const result = await packer.packageCandidate(f.input, f.output, { ...metadata(), ...overrides });
  return { ...f, ...result };
}
function altered(bundle, manifest, mutate) {
  const b = structuredClone(bundle);
  const m = structuredClone(manifest);
  mutate(b, m);
  const bytes = packer.canonicalJson(b);
  m.archiveSha256 = sha(bytes);
  m.candidateId = packer.candidateId(m.metadata, m.archiveSha256);
  return { bundle: bytes, manifest: m, expected: expected(m) };
}

test('packager and independent verifier expose the documented boundary', () => {
  for (const name of ['packageCandidate', 'canonicalJson']) assert.equal(typeof packer[name], 'function');
  for (const name of ['verifyCandidate', 'extractCandidate']) assert.equal(typeof verifier[name], 'function');
});

test('same inputs produce the same immutable bundle and candidate identity', async (t) => {
  const a = await candidate(t);
  const b = await packer.packageCandidate(a.input, path.join(a.root, 'second'), metadata());
  assert.deepEqual(a.bundle, b.bundle);
  assert.deepEqual(a.manifest, b.manifest);
  assert.match(a.manifest.candidateId, /^candidate-[a-f0-9]{32}$/);
  assert.deepEqual(a.manifest.files.map((f) => f.path), ['app.js', 'article/index.html', 'index.html']);
  assert.equal(a.manifest.archiveSha256, sha(await readFile(path.join(a.output, 'candidate.bundle.json'))));
  assert.notEqual(a.manifest.archiveSha256, expected(a.manifest).githubArtifactDigest.slice(7));
});

test('candidate identity binds every reviewed metadata field as well as asset bytes', async (t) => {
  const a = await candidate(t);
  const b = await packer.packageCandidate(a.input, path.join(a.root, 'second'), { ...metadata(), editorialVersion: 'revised-label' });
  assert.equal(a.manifest.archiveSha256, b.manifest.archiveSha256);
  assert.notEqual(a.manifest.candidateId, b.manifest.candidateId);
});

test('trusted GitHub expiry timestamps accept canonical whole-second API timestamps', async (t) => {
  const a = await candidate(t);
  assert.equal(verifier.verifyCandidate(a.bundle, a.manifest, expected(a.manifest, { expiresAt: '2099-10-15T12:00:00Z' })).candidateId, a.manifest.candidateId);
});

test('verified extraction reproduces the exact site bytes in a fresh directory', async (t) => {
  const a = await candidate(t);
  const dir = path.join(a.root, 'extracted');
  const checked = verifier.verifyCandidate(a.bundle, a.manifest, expected(a.manifest));
  assert.equal(checked.candidateId, a.manifest.candidateId);
  await verifier.extractCandidate(a.bundle, a.manifest, expected(a.manifest), dir);
  assert.equal(await readFile(path.join(dir, 'article/index.html'), 'utf8'), '<h1>Reviewed text</h1>');
  await assert.rejects(verifier.extractCandidate(a.bundle, a.manifest, expected(a.manifest), dir), /exist|fresh/i);
});

test('hashing an adjacent hostile manifest cannot replace trusted API provenance', async (t) => {
  const a = await candidate(t);
  for (const changes of [
    { repositoryId: '999' }, { repository: 'hostile/fork' }, { sourceCommitSha: '9'.repeat(40) },
    { sourceTreeSha: '9'.repeat(40) }, { workflowSha: '9'.repeat(40) },
    { workflowPath: '.github/workflows/hostile.yml' }, { runId: '1002' }, { runAttempt: 2 },
    { archiveSha256: '0'.repeat(64) }, { conclusion: 'failure' }, { artifactId: '' },
    { githubArtifactDigest: '' }, { expiresAt: '2000-01-01T00:00:00.000Z' },
    { siteOrigin: 'https://other.example' }, { siteBase: '/changed/' }, { configDigest: '0'.repeat(64) },
  ]) assert.throws(() => verifier.verifyCandidate(a.bundle, a.manifest, expected(a.manifest, changes)), /./, JSON.stringify(changes));
});

test('modified, missing, duplicate, extra and noncanonical asset bytes fail closed', async (t) => {
  const a = await candidate(t);
  for (const mutation of [
    (b) => { b.files[0].base64 = Buffer.from('different').toString('base64'); },
    (b) => { b.files.pop(); },
    (b) => { b.files.push(b.files[0]); },
    (b) => { b.files[0].command = 'deploy'; },
    (b) => { b.command = 'deploy'; },
    (_b, m) => { m.extra = true; },
    (_b, m) => { m.files[0].sha256 = '0'.repeat(64); },
  ]) {
    const attack = altered(a.bundle, a.manifest, mutation);
    assert.throws(() => verifier.verifyCandidate(attack.bundle, attack.manifest, attack.expected), /./);
  }
  assert.throws(() => verifier.verifyCandidate(JSON.stringify(a.bundle, null, 2), a.manifest, expected(a.manifest)), /canonical|digest/i);
});

test('unsafe paths and platform executable/configuration filenames cannot be assets', async (t) => {
  const a = await candidate(t);
  for (const filename of ['../escape.html', '/absolute.html', 'a\\escape.html', './index.html', 'a//b.html',
    '.github/workflow.yml', 'a/.private.txt', '_worker.js', 'a/_worker.js', '_headers', 'a/_redirects',
    'wrangler.json', 'package.json', 'file:stream.html', 'con.html', 'a.html.', 'percent%2e.html', 'run.sh']) {
    const attack = altered(a.bundle, a.manifest, (b, m) => {
      b.files[0].path = filename;
      m.files[0].path = filename;
    });
    assert.throws(() => verifier.verifyCandidate(attack.bundle, attack.manifest, attack.expected), /./, filename);
  }
});

test('existing root routing bytes remain in the immutable bundle for trusted exact comparison', async (t) => {
  const f = await fixture(t);
  const redirects = '# Existing reviewed root routing\n/ /index.html 200\n';
  await writeFile(path.join(f.input, '_redirects'), redirects);
  const a = await packer.packageCandidate(f.input, f.output, metadata());
  const checked = verifier.verifyCandidate(a.bundle, a.manifest, expected(a.manifest));
  assert.equal(checked.files.find((file) => file.path === '_redirects').data.toString(), redirects);
  assert.equal(a.manifest.files.find((file) => file.path === '_redirects').sha256, sha(redirects));
});

test('case collisions, invalid base64 and file/directory collisions are rejected', async (t) => {
  const a = await candidate(t);
  for (const mutation of [
    (b) => { b.files[1].path = 'APP.JS'; },
    (b) => { b.files[0].base64 += '\n'; },
    (b) => { b.files[1].path = 'app.js/index.html'; },
  ]) {
    const attack = altered(a.bundle, a.manifest, mutation);
    assert.throws(() => verifier.verifyCandidate(attack.bundle, attack.manifest, attack.expected), /./);
  }
});

test('directory spelling collisions cannot survive on a different extraction platform', async (t) => {
  const a = await candidate(t);
  const attack = altered(a.bundle, a.manifest, (b, m) => {
    b.files[0].path = 'Article/app.js';
    m.files[0].path = 'Article/app.js';
  });
  assert.throws(() => verifier.verifyCandidate(attack.bundle, attack.manifest, attack.expected), /collision/i);
});

test('metadata rejects self-asserted preview/approval and unsafe release origins', async (t) => {
  const f = await fixture(t);
  for (const changes of [
    { approval: { approved: true } }, { preparation: { preview: 'https://private.example' } },
    { artifactClass: 'release-candidate' }, { runAttempt: 0 }, { toolchain: { ...metadata().toolchain, node: '22.1.0' } },
    { workflowPath: '.github/workflows/other.yml' }, { sourceIdentity: 'main', finalMainSha: '9'.repeat(40) },
    { build: { ...metadata().build, siteOrigin: 'http://production.example' } },
    { build: { ...metadata().build, siteOrigin: 'https://user:secret@production.example' } },
    { build: { ...metadata().build, siteOrigin: 'https://production.example/path/' } },
  ]) await assert.rejects(packer.packageCandidate(f.input, path.join(f.root, `bad-${Math.random()}`), { ...metadata(), ...changes }), /./);
});

test('packaging rejects a symbolic link rather than following it', async (t) => {
  const f = await fixture(t);
  try { await symlink(path.join(f.input, 'index.html'), path.join(f.input, 'linked.html'), 'file'); }
  catch (error) { if (error.code === 'EPERM') return t.skip('Windows account cannot create file symlinks'); throw error; }
  await assert.rejects(packer.packageCandidate(f.input, f.output, metadata()), /symlink|regular/i);
});

test('packaging rejects directory links including Windows junctions', async (t) => {
  const f = await fixture(t);
  try { await symlink(path.join(f.input, 'article'), path.join(f.input, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows sandbox cannot create directory links'); throw error; }
  await assert.rejects(packer.packageCandidate(f.input, f.output, metadata()), /symlink|regular/i);
});

test('bounded envelope, file count and declared sizes are independently enforced', async (t) => {
  const a = await candidate(t);
  for (const mutation of [
    (b) => { b.files[0].size = 100_000_000; },
    (_b, m) => { m.totalSize += 1; },
    (_b, m) => { m.fileCount += 1; },
    (b) => { b.files = new Array(10001).fill(b.files[0]); },
  ]) {
    const attack = altered(a.bundle, a.manifest, mutation);
    assert.throws(() => verifier.verifyCandidate(attack.bundle, attack.manifest, attack.expected), /./);
  }
});

test('ordinary multi-megabyte static assets verify within the declared limits', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.input, 'image.png'), Buffer.alloc(2 * 1024 * 1024, 42));
  const a = await packer.packageCandidate(f.input, f.output, metadata());
  const checked = verifier.verifyCandidate(a.bundle, a.manifest, expected(a.manifest));
  assert.equal(checked.files.find((file) => file.path === 'image.png').data.length, 2 * 1024 * 1024);
});

test('pack and verify CLIs round-trip bytes and reject extra outer artifact entries', async (t) => {
  const f = await fixture(t);
  const metadataPath = path.join(f.root, 'metadata.json');
  const expectedPath = path.join(f.root, 'expected.json');
  await writeFile(metadataPath, packer.canonicalJson(metadata()));
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const pack = spawnSync(process.execPath, ['scripts/editorial-candidate.mjs', 'pack', f.input, f.output, metadataPath], { cwd, encoding: 'utf8' });
  assert.equal(pack.status, 0, pack.stderr);
  const manifest = JSON.parse(await readFile(path.join(f.output, 'manifest.json'), 'utf8'));
  await writeFile(expectedPath, JSON.stringify(expected(manifest)));
  const verify = spawnSync(process.execPath, ['scripts/verify-editorial-candidate.mjs', f.output, expectedPath, path.join(f.root, 'extracted')], { cwd, encoding: 'utf8' });
  assert.equal(verify.status, 0, verify.stderr);
  assert.equal(JSON.parse(verify.stdout).candidateId, manifest.candidateId);
  await writeFile(path.join(f.output, 'attacker.json'), '{}');
  const hostile = spawnSync(process.execPath, ['scripts/verify-editorial-candidate.mjs', f.output, expectedPath, path.join(f.root, 'blocked')], { cwd, encoding: 'utf8' });
  assert.equal(hostile.status, 1);
  assert.match(hostile.stderr, /unexpected or missing files/);
});

export { metadata, expected };
