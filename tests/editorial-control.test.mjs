import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertActivation, assertBuildRun, assertApproval, assertRelease, shouldAdvertise, assertPrivateRedirect, assertBrowserEvidence, assertEnvironmentProtection, assertPreviewAvailable, previewAction, withPreviewFailureStatus, configurationDigest } from '../scripts/editorial-control.mjs';

const sha = 'a'.repeat(40), tree = 'b'.repeat(40), digest = 'c'.repeat(64);
const policy = { enabled: true, repository: 'nicksisco1932/nicholas-sisco-independent-work', repositoryId: 1396449686,
  trustedCodeSha: sha, buildWorkflowId: 11, previewWorkflowId: 12, buildWorkflowPath: '.github/workflows/build-editorial-candidate.yml',
  director: 'director', production: { accountId: 'd'.repeat(32), worker: 'nicholas-sisco-independent-work', origin: 'https://example.com', environment: 'editorial-production' },
  review: { worker: 'nicholas-sisco-review', environment: 'editorial-review', accessHost: 'example.cloudflareaccess.com', hostname: 'nicholas-sisco-review.example.workers.dev', bootstrapEvidence: 'https://github.com/example/evidence', historicalUrls: [] } };
const run = { id: 100, run_attempt: 1, workflow_id: 11, path: policy.buildWorkflowPath, event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: sha,
  repository: { id: policy.repositoryId, full_name: policy.repository }, head_repository: { id: policy.repositoryId, full_name: policy.repository }, pull_requests: [{ number: 7, head: { sha, repo: { id: policy.repositoryId } } }] };
const frozen = { sourceCommitSha: sha, sourceTreeSha: tree, finalMainSha: sha, runId: 100, runAttempt: 1, artifactId: 200, archiveSha256: digest, artifactClass: 'release-candidate', siteOrigin: 'https://example.com', siteBase: '/', configDigest: digest, preview: { versionId: 'v1', url: 'https://v1-review.example.workers.dev', protection: true, browserEvidence: 'https://github.com/example/browser' }, destination: policy.production, releaseRunId: 300, releaseRunAttempt: 1 };
test('checked-in activation and privileged jobs remain inert', () => {
  const checked = JSON.parse(readFileSync(new URL('../config/editorial-policy.json', import.meta.url)));
  assert.throws(() => assertActivation(checked, sha), /disabled/);
  for (const name of ['preview-editorial-candidate', 'deploy-cloudflare']) {
    const text = readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
    assert.match(text, /if: \$\{\{ false \}\}/);
    assert.doesNotMatch(text, /pull_request_target|secrets\.CLOUDFLARE_API_TOKEN|wrangler-action|command: deploy/);
  }
});
test('activation requires exact trusted SHA, nonfixture origin, distinct workers and owner setup', () => {
  assert.doesNotThrow(() => assertActivation(policy, sha));
  for (const change of [ { director: null }, { buildWorkflowId: null }, { production: { ...policy.production, origin: 'https://website-v1.invalid' } }, { review: { ...policy.review, worker: policy.production.worker } } ])
    assert.throws(() => assertActivation({ ...policy, ...change }, sha));
  assert.throws(() => assertActivation(policy, 'main'));
});
test('provenance rejects forks, hostile workflow identity, failed or replayed attempts', () => {
  assert.doesNotThrow(() => assertBuildRun(run, policy, { runId: 100, runAttempt: 1 }));
  for (const patch of [{ head_repository: { id: 2 } }, { repository: { id: 2 } }, { path: 'hostile.yml' }, { workflow_id: 99 }, { conclusion: 'failure' }, { run_attempt: 2 }, { event: 'workflow_dispatch' }])
    assert.throws(() => assertBuildRun({ ...run, ...patch }, policy, { runId: 100, runAttempt: 1 }));
});
test('only authenticated Director environment approval for this run is accepted', () => {
  const approval = { state: 'approved', user: { login: 'director' }, environments: [{ name: 'editorial-production' }] };
  assert.doesNotThrow(() => assertApproval([approval], policy, { runId: 300, runAttempt: 1 }, frozen));
  for (const bad of [[], [{ ...approval, state: 'rejected' }], [{ ...approval, user: { login: 'writer' } }], [{ ...approval, environments: [{ name: 'github-pages' }] }]])
    assert.throws(() => assertApproval(bad, policy, { runId: 300, runAttempt: 1 }, frozen));
  assert.throws(() => assertApproval([approval], policy, { runId: 300, runAttempt: 2 }, frozen));
  assert.throws(() => assertApproval([approval], policy, { runId: 301, runAttempt: 1 }, frozen));
});
test('release binds current main, exact artifact/config/destination/preview and rejects older releases', () => {
  const current = { mainSha: sha, configDigest: digest, sourceTreeSha: tree, liveSourceSha: null, liveRunId: null };
  assert.doesNotThrow(() => assertRelease(frozen, policy, current));
  for (const patch of [{ mainSha: 'f'.repeat(40) }, { configDigest: '0'.repeat(64) }, { sourceTreeSha: sha }, { liveSourceSha: 'f'.repeat(40), liveRunId: 101 }])
    assert.throws(() => assertRelease(frozen, policy, { ...current, ...patch }));
  for (const patch of [{ artifactClass: 'engineering-fixture' }, { finalMainSha: null }, { preview: { ...frozen.preview, protection: false } }, { preview: { ...frozen.preview, browserEvidence: null } }, { destination: { ...policy.production, worker: 'other' } }, { siteOrigin: 'https://other.com' }])
    assert.throws(() => assertRelease({ ...frozen, ...patch }, policy, current));
});
test('delayed A and failed B cannot advertise the old candidate as the new revision', () => {
  assert.equal(shouldAdvertise(sha, sha, 101, 100), true);
  assert.equal(shouldAdvertise(sha, 'b'.repeat(40), 101, 100), false);
  assert.equal(shouldAdvertise(sha, sha, 99, 100), false);
  assert.equal(shouldAdvertise(sha, sha, 101, 100, 'failure'), false);
});
test('anonymous denial requires an exact Access login redirect over HTTPS', () => {
  assert.doesNotThrow(() => assertPrivateRedirect(302, 'https://example.cloudflareaccess.com/cdn-cgi/access/login/x', policy.review.accessHost));
  for (const [status, url] of [[200, null], [403, null], [302, 'https://evil.test/login'], [302, 'http://example.cloudflareaccess.com/cdn-cgi/access/login/x'], [302, 'https://example.cloudflareaccess.com/public']])
    assert.throws(() => assertPrivateRedirect(status, url, policy.review.accessHost));
});
test('configuration digest changes if origin, policy or fixed hosting config changes', () => {
  assert.equal(configurationDigest(['a', 'b']), configurationDigest(['a', 'b']));
  assert.notEqual(configurationDigest(['a', 'b']), configurationDigest(['ab', '']));
});
test('browser acceptance is a Director-authored exact-candidate snapshot, never deployment authority', () => {
  const receipt = { ...frozen, candidateId: 'candidate-A' };
  const comment = { id: 9, user: { login: 'director' }, html_url: `https://github.com/${policy.repository}/pull/7#issuecomment-9`, body: `BROWSER ACCEPTED candidate-A ${digest} v1` };
  assert.doesNotThrow(() => assertBrowserEvidence(comment, policy, receipt));
  for (const patch of [{ user: { login: 'writer' } }, { body: 'BROWSER ACCEPTED candidate-B' }, { body: `candidate-A ${digest} v1` }, { html_url: 'https://github.com/other/repo/issues/7#issuecomment-9' }])
    assert.throws(() => assertBrowserEvidence({ ...comment, ...patch }, policy, receipt));
});
test('environment settings must enforce the sole Director, no bypass, main only and solo self-initiation', () => {
  const environment = { name: 'editorial-production', can_admins_bypass: false, deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, protection_rules: [{ type: 'required_reviewers', prevent_self_review: false, reviewers: [{ type: 'User', reviewer: { login: 'director' } }] }] };
  const branches = [{ name: 'main', type: 'branch' }];
  assert.doesNotThrow(() => assertEnvironmentProtection(environment, branches, policy));
  for (const patch of [{ can_admins_bypass: true }, { protection_rules: [] }, { deployment_branch_policy: null }])
    assert.throws(() => assertEnvironmentProtection({ ...environment, ...patch }, branches, policy));
  assert.throws(() => assertEnvironmentProtection(environment, [{ name: '*', type: 'branch' }], policy));
});
test('deleted, swapped or disabled preview versions invalidate a prepared release', () => {
  const candidate = { ...frozen, candidateId: 'candidate-A' };
  const version = { id: 'v1', annotations: { 'workers/message': 'candidate-A' } };
  assert.doesNotThrow(() => assertPreviewAvailable(version, { previews_enabled: true }, candidate));
  assert.throws(() => assertPreviewAvailable({ ...version, id: 'v2' }, { previews_enabled: true }, candidate));
  assert.throws(() => assertPreviewAvailable({ ...version, annotations: {} }, { previews_enabled: true }, candidate));
  assert.throws(() => assertPreviewAvailable(version, { previews_enabled: false }, candidate));
});
test('building B marks old previews stale; a delayed pending event never replaces a completed receipt', () => {
  assert.equal(previewAction('requested', { status: 'queued' }), 'pending');
  assert.equal(previewAction('in_progress', { status: 'in_progress' }), 'pending');
  assert.equal(previewAction('requested', { status: 'completed', conclusion: 'success' }), 'none');
  assert.equal(previewAction('completed', { status: 'completed', conclusion: 'failure' }), 'build-failed');
  assert.equal(previewAction('completed', { status: 'completed', conclusion: 'success' }), 'upload');
  assert.equal(shouldAdvertise(sha, 'b'.repeat(40), 100, 101), false);
});
test('successful B build followed by failed provenance, Access, upload or receipt reports unavailable', async () => {
  for (const stage of ['provenance', 'Access', 'upload', 'receipt']) {
    const notices = [];
    await assert.rejects(withPreviewFailureStatus(async () => { throw new Error(stage); }, async () => notices.push('preview-failed')), new RegExp(stage));
    assert.deepEqual(notices, ['preview-failed']);
  }
  const notices = [];
  await withPreviewFailureStatus(async () => 'ready', async () => notices.push('preview-failed'));
  assert.deepEqual(notices, []);
});
