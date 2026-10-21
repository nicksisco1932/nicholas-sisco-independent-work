import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSettings, createMetadata, FIXTURE_ORIGIN } from '../scripts/build-editorial-metadata.mjs';

const sha = 'a'.repeat(40), mergeSha = 'b'.repeat(40), tree = 'c'.repeat(40), workflowSha = 'd'.repeat(40);
const repository = 'nicksisco1932/nicholas-sisco-independent-work';
const repositoryId = '1396449686';
function inputs() {
  return {
    env: {
      GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: repositoryId,
      GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: mergeSha, GITHUB_WORKFLOW_SHA: workflowSha,
      GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', GITHUB_REF: 'refs/pull/8/merge',
      GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/build-editorial-candidate.yml@refs/pull/8/merge`,
      PUBLIC_SITE_URL: FIXTURE_ORIGIN, PUBLIC_SITE_BASE: '/',
    },
    event: { repository: { full_name: repository, id: Number(repositoryId) },
      pull_request: { number: 8, head: { sha, repo: { id: Number(repositoryId) } } } },
    policy: { enabled: false, production: { origin: null } },
    headSha: sha, treeSha: tree,
    lockBytes: Buffer.from('{"packages":{"node_modules/wrangler":{"version":"4.147.0"}}}'),
    configDigest: 'e'.repeat(64), now: '2026-10-15T12:00:00.000Z', nodeVersion: '24.19.0',
  };
}

test('disabled policy yields nonpromotable fixture even if a production origin is entered', () => {
  assert.deepEqual(buildSettings(inputs().policy), { siteOrigin: FIXTURE_ORIGIN, artifactClass: 'engineering-fixture' });
  assert.equal(buildSettings({ enabled: false, production: { origin: 'https://nick.sisco.dev' } }).artifactClass, 'engineering-fixture');
  assert.throws(() => buildSettings({ enabled: true, production: { origin: null } }), /permanent/);
  for (const origin of ['http://example.com', 'https://example.com/', 'https://u:p@example.com', 'https://example.com:444', 'https://example.com/path'])
    assert.throws(() => buildSettings({ enabled: false, production: { origin } }));
});

test('metadata distinguishes standalone PR head, synthetic merge and workflow identities', () => {
  const m = createMetadata(inputs());
  assert.equal(m.sourceCommitSha, sha);
  assert.equal(m.syntheticMergeSha, mergeSha);
  assert.equal(m.workflowSha, workflowSha);
  assert.equal(m.sourceIdentity, 'standalone-head');
  assert.equal(m.finalMainSha, null);
  assert.equal(m.pullRequest, 8);
  assert.equal(m.artifactClass, 'engineering-fixture');
  assert.equal(m.toolchain.wrangler, '4.147.0');
  assert.equal(m.runId, '123');
  assert.equal(m.runAttempt, 1);
});

test('only an exact main update obtains final main identity', () => {
  const data = inputs();
  Object.assign(data.env, { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: sha });
  data.event.after = sha;
  const m = createMetadata(data);
  assert.equal(m.sourceIdentity, 'main');
  assert.equal(m.finalMainSha, sha);
  assert.equal(m.syntheticMergeSha, null);
  assert.equal(m.pullRequest, null);
  data.env.GITHUB_REF = 'refs/heads/other';
  assert.throws(() => createMetadata(data), /unsupported/);
});

test('metadata rejects fork, checkout, origin, workflow and runner identity substitutions', () => {
  const attacks = [
    (d) => { d.event.pull_request.head.repo.id = 1; },
    (d) => { d.headSha = mergeSha; },
    (d) => { d.event.repository.id = 1; },
    (d) => { d.event.repository.full_name = 'hostile/repo'; },
    (d) => { d.env.PUBLIC_SITE_URL = 'https://other.test'; },
    (d) => { d.env.PUBLIC_SITE_BASE = '/other'; },
    (d) => { d.env.GITHUB_WORKFLOW_REF = `${repository}/hostile.yml@main`; },
    (d) => { d.env.GITHUB_WORKFLOW_SHA = 'main'; },
    (d) => { d.env.GITHUB_RUN_ATTEMPT = '0'; },
    (d) => { d.nodeVersion = '22.1.0'; },
    (d) => { d.env.GITHUB_EVENT_NAME = 'workflow_dispatch'; },
  ];
  for (const attack of attacks) {
    const data = inputs(); attack(data);
    assert.throws(() => createMetadata(data));
  }
});

const workflow = (name) => readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
test('preview reports pending and failed upload/receipt states without giving failure handler deployment credentials', () => {
  const text = workflow('preview-editorial-candidate');
  assert.match(text, /cancel-in-progress: false\n(?:      #.*\n)?      queue: max/);
  assert.match(text, /types: \[requested, in_progress, completed\]/);
  assert.match(text, /if: failure\(\)/);
  assert.match(text, /editorial-control\.mjs preview-failure/);
  const failure = text.slice(text.indexOf('      - name: Mark failed preview'));
  assert.doesNotMatch(failure, /CLOUDFLARE_API_TOKEN/);
});
test('separate disabled Pages migration retains main-only PUBLISH confirmation before candidate code', () => {
  const text = workflow('publish-legacy-migration');
  assert.match(text, /if: \$\{\{ false \}\}/);
  assert.match(text, /name: legacy-pages-migration/);
  assert.match(text, /CONFIRMATION: \$\{\{ inputs.confirmation \}\}/);
  assert.match(text, /\[\[ "\$GITHUB_REF" == 'refs\/heads\/main' \]\]/);
  assert.match(text, /\[\[ "\$CONFIRMATION" == 'PUBLISH' \]\]/);
  assert(text.indexOf('Require separate main-only Pages confirmation') < text.indexOf('uses: actions/checkout'));
});
function job(text, name) {
  const start = text.indexOf(`  ${name}:\n`);
  assert.notEqual(start, -1, `missing job ${name}`);
  const rest = text.slice(start + 3);
  const next = rest.search(/\n  [a-z][a-z_-]*:\n/);
  return next === -1 ? text.slice(start) : text.slice(start, start + next + 3);
}

test('candidate workflow is automatic, secret free, same-repository and standalone-head only', () => {
  const text = workflow('build-editorial-candidate');
  assert.match(text, /pull_request:/);
  assert.match(text, /push:\n    branches: \[main\]/);
  assert.doesNotMatch(text, /workflow_dispatch|workflow_run|pull_request_target|secrets\.|environment:|cache:/);
  assert.match(text, /head\.repo\.id == github\.event\.repository\.id/);
  assert.match(text, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(text, /persist-credentials: false/);
  assert.equal((text.match(/run: npm run validate/g) || []).length, 2);
  assert.match(text, /name: editorial-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(text, /overwrite: false/);
});

test('every privileged job remains literally disabled and executes only pinned trusted tools', () => {
  for (const [name, jobs] of [['preview-editorial-candidate', ['preview']], ['deploy-cloudflare', ['prepare', 'production']]]) {
    const text = workflow(name);
    assert.doesNotMatch(text, /pull_request_target|wrangler-action|cache:|secrets\.CLOUDFLARE_API_TOKEN|command: deploy/);
    for (const name of jobs) {
      const body = job(text, name);
      assert.match(body, /if: \$\{\{ false \}\}/);
      assert.match(body, /ref: \$\{\{ vars\.EDITORIAL_TRUSTED_SHA \}\}/);
      assert.match(body, /persist-credentials: false/);
      assert.doesNotMatch(body, /npm run (?:build|validate)|npm ci\n|inputs\.commit_sha \}\}\n          persist/);
    }
    for (const action of text.matchAll(/uses: (\S+)/g)) assert.match(action[1], /@[a-f0-9]{40}$/);
    assert.doesNotMatch(job(text, 'inactive'), /secrets\.|github\.token|uses:/);
  }
});

test('production freezes exact evidence then gates saved-byte promotion without rebuilding', () => {
  const text = workflow('deploy-cloudflare');
  assert.doesNotMatch(text, /^  (?:push|pull_request|workflow_run):/m);
  assert.match(text, /default: DO_NOT_DEPLOY/);
  assert.match(text, /group: cloudflare-production\n  cancel-in-progress: false/);
  assert.match(job(text, 'production'), /needs: prepare/);
  assert.match(job(text, 'production'), /environment: editorial-production/);
  assert.match(job(text, 'production'), /FROZEN_ARTIFACT_ID: \$\{\{ needs\.prepare\.outputs\.artifact_id \}\}/);
  assert.doesNotMatch(job(text, 'production'), /download-artifact/);
  assert.match(job(text, 'production'), /GITHUB_RUN_ATTEMPT.*== '1'/);
  assert.doesNotMatch(job(text, 'prepare'), /\$\{\{ secrets\./);
  assert.match(job(text, 'prepare'), /BROWSER_EVIDENCE_COMMENT_ID:/);
  assert.match(job(text, 'production'), /PRODUCTION_CLOUDFLARE_API_TOKEN:/);
  assert.doesNotMatch(workflow('preview-editorial-candidate'), /PRODUCTION_CLOUDFLARE/);
});
