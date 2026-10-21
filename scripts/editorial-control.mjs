// Trusted control-plane code. Candidate code is never imported or executed here.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const REPOSITORY = 'nicksisco1932/nicholas-sisco-independent-work';
const REPOSITORY_ID = 1396449686;
const FIXED_FILES = ['config/editorial-policy.json', 'wrangler.review.json', 'wrangler.production.json', 'astro.config.mjs', 'package-lock.json', 'package.json', '.nvmrc', 'src/lib/publication.mjs', 'public/_redirects'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const exact = (actual, expected, name) => assert.deepEqual(actual, expected, `${name} mismatch`);
const httpsEvidence = value => { const url = new URL(value); assert.equal(url.protocol, 'https:'); assert(!url.username && !url.password); return url; };

export function configurationDigest(parts) {
  return sha256(JSON.stringify(parts.map(part => Buffer.from(part).toString('base64'))));
}
export async function digestRepositoryConfiguration(root = ROOT) {
  return configurationDigest(await Promise.all(FIXED_FILES.map(file => readFile(resolve(root, file)))));
}
export function assertActivation(policy, trustedSha) {
  assert.equal(policy.enabled, true, 'editorial activation is disabled; separately approved setup and activation PR required');
  exact(policy.repository, REPOSITORY, 'repository');
  exact(policy.repositoryId, REPOSITORY_ID, 'repository ID');
  // The immutable SHA is an owner-controlled repository variable. Embedding a
  // commit's own SHA in its policy would require an impossible self-reference.
  assert(SHA.test(trustedSha), 'trusted full SHA required');
  assert(positive(policy.buildWorkflowId) && positive(policy.previewWorkflowId), 'known workflow IDs required');
  exact(policy.buildWorkflowPath, '.github/workflows/build-editorial-candidate.yml', 'workflow path');
  assert(/^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(policy.director ?? ''), 'Director login required');
  assert(/^[a-f0-9]{32}$/.test(policy.production.accountId ?? ''), 'account identity required');
  exact(policy.production.worker, 'nicholas-sisco-independent-work', 'production Worker');
  exact(policy.review.worker, 'nicholas-sisco-review', 'review Worker');
  exact(policy.production.environment, 'editorial-production', 'production environment');
  exact(policy.review.environment, 'editorial-review', 'review environment');
  const origin = httpsEvidence(policy.production.origin);
  assert.equal(origin.origin, policy.production.origin, 'permanent origin must be normalized without trailing slash');
  assert(!origin.search && !origin.hash && origin.pathname === '/');
  assert(!/(?:\.invalid|\.localhost|\.test|\.example|\.github\.io|\.workers\.dev)$/.test(origin.hostname) && origin.hostname.includes('.') && origin.hostname !== 'localhost', 'permanent production origin required');
  assert(/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(policy.review.accessHost ?? ''), 'Access host required');
  assert(/^[a-z0-9.-]+\.workers\.dev$/.test(policy.review.hostname ?? ''), 'review hostname required');
  httpsEvidence(policy.review.bootstrapEvidence);
  assert(Array.isArray(policy.review.historicalUrls), 'historical URL inventory required');
  for (const url of policy.review.historicalUrls) httpsEvidence(url);
}
export function assertBuildRun(run, policy, selected) {
  exact(run.id, Number(selected.runId), 'run ID');
  exact(run.run_attempt, Number(selected.runAttempt), 'run attempt');
  exact(run.repository.id, policy.repositoryId, 'originating repository');
  exact(run.repository.full_name, policy.repository, 'originating repository name');
  exact(run.head_repository?.id, policy.repositoryId, 'fork rejected');
  exact(run.head_repository?.full_name, policy.repository, 'head repository');
  exact(run.workflow_id, policy.buildWorkflowId, 'workflow ID');
  exact(run.path, policy.buildWorkflowPath, 'workflow path');
  exact(run.status, 'completed', 'run status');
  exact(run.conclusion, 'success', 'run conclusion');
  assert(['pull_request', 'push'].includes(run.event), 'unsupported build event');
  assert(SHA.test(run.head_sha), 'source SHA required');
  if (run.event === 'push') exact(run.head_branch, 'main', 'main build');
  else {
    assert.equal(run.pull_requests?.length, 1, 'exact PR required');
    exact(run.pull_requests[0].head.sha, run.head_sha, 'PR source SHA');
  }
}
export function assertApproval(history, policy, current, frozen) {
  exact(Number(current.runId), frozen.releaseRunId, 'approval run');
  exact(Number(current.runAttempt), 1, 'rerun release approval is refused; start a new run');
  exact(frozen.releaseRunAttempt, 1, 'frozen attempt');
  // GitHub approval history has no attempt identity. Refuse all reruns rather
  // than treating a previous attempt's approval as fresh authorization.
  const relevant = history.filter(item => item.environments?.some(env => env.name === policy.production.environment));
  assert(relevant.length > 0, 'protected environment approval required');
  assert(relevant.every(item => item.state === 'approved' && item.user?.login === policy.director), 'only Director environment approval is accepted');
}
export function assertRelease(frozen, policy, current) {
  exact(frozen.artifactClass, 'release-candidate', 'artifact class');
  assert(SHA.test(frozen.sourceCommitSha) && SHA.test(frozen.sourceTreeSha));
  exact(frozen.finalMainSha, frozen.sourceCommitSha, 'final main candidate');
  exact(current.mainSha, frozen.sourceCommitSha, 'current main head');
  exact(current.sourceTreeSha, frozen.sourceTreeSha, 'source tree');
  exact(current.configDigest, frozen.configDigest, 'release configuration');
  exact(frozen.siteOrigin, policy.production.origin, 'production origin');
  exact(frozen.siteBase, '/', 'root build');
  exact(frozen.destination, policy.production, 'production destination');
  assert(HASH.test(frozen.archiveSha256) && positive(frozen.artifactId));
  assert(frozen.preview?.protection === true && frozen.preview.versionId, 'protected immutable preview required');
  httpsEvidence(frozen.preview.url);
  httpsEvidence(frozen.preview.browserEvidence);
  if (current.liveRunId !== null && current.liveRunId !== undefined) {
    assert(Number(frozen.runId) > Number(current.liveRunId), 'candidate is older than recorded live release or already released; explicit rollback/recovery required');
  }
  assert(!current.liveSourceSha || current.liveSourceSha !== frozen.sourceCommitSha, 'same source already released; inspect state before recovery');
}
export function shouldAdvertise(sourceSha, currentSha, runId, lastRunId = 0, conclusion = 'success') {
  return conclusion === 'success' && sourceSha === currentSha && Number(runId) >= Number(lastRunId);
}
export function previewAction(eventAction, run) {
  assert(['requested', 'in_progress', 'completed'].includes(eventAction), 'unknown preview event');
  if (eventAction !== 'completed') return run.status === 'completed' ? 'none' : 'pending';
  exact(run.status, 'completed', 'completed preview event');
  return run.conclusion === 'success' ? 'upload' : 'build-failed';
}
export async function withPreviewFailureStatus(operation, unavailable) {
  try { return await operation(); }
  catch (error) {
    try { await unavailable(); }
    catch { await summary('Preview failed; PR status update also failed. Earlier preview receipts are stale until their source SHA matches the current head and a new successful preview exists.'); }
    throw error;
  }
}
export function assertPrivateRedirect(status, location, accessHost) {
  assert([302, 303, 307].includes(status), 'anonymous request did not require Access sign-in');
  const target = httpsEvidence(location);
  exact(target.hostname, accessHost, 'Access redirect host');
  assert(target.pathname.startsWith('/cdn-cgi/access/login/'), 'Access login redirect required');
}
export function assertBrowserEvidence(comment, policy, receipt) {
  exact(comment.user?.login, policy.director, 'browser evidence author');
  assert(positive(comment.id), 'browser evidence comment identity');
  const url = httpsEvidence(comment.html_url);
  exact(url.hostname, 'github.com', 'browser evidence host');
  assert(url.pathname.startsWith(`/${policy.repository}/`), 'same repository evidence required');
  const archive = receipt.expected?.archiveSha256 ?? receipt.archiveSha256;
  for (const value of [receipt.candidateId, archive, receipt.preview.versionId]) {
    assert(typeof value === 'string' && value.length > 0 && comment.body.includes(value), 'browser evidence must name exact candidate, digest and preview version');
  }
  assert(comment.body.includes('BROWSER ACCEPTED'), 'explicit browser acceptance receipt required');
}
export function assertEnvironmentProtection(environment, branches, policy) {
  exact(environment.name, policy.production.environment, 'protected environment');
  exact(environment.can_admins_bypass, false, 'administrator bypass must be disabled');
  const rules = environment.protection_rules?.filter(rule => rule.type === 'required_reviewers');
  assert.equal(rules?.length, 1, 'required reviewer rule missing');
  exact(rules[0].prevent_self_review, false, 'solo Director self-initiation must work');
  exact(rules[0].reviewers?.map(item => ({ type: item.type, login: item.reviewer?.login })), [{ type: 'User', login: policy.director }], 'Director must be the only required reviewer');
  exact(environment.deployment_branch_policy, { protected_branches: false, custom_branch_policies: true }, 'explicit main-only environment policy required');
  exact(branches.map(item => ({ name: item.name, type: item.type })), [{ name: 'main', type: 'branch' }], 'main-only environment branches');
}
async function environmentProtection(policy) {
  const environment = await api(`environments/${policy.production.environment}`);
  const branches = await pages(`environments/${policy.production.environment}/deployment-branch-policies`, 'branch_policies');
  assertEnvironmentProtection(environment, branches, policy);
}
async function browserEvidence(policy, id, receipt) {
  assert(positive(id), 'Director browser evidence comment ID required');
  const comment = await api(`issues/comments/${id}`);
  assertBrowserEvidence(comment, policy, receipt);
  return { id: comment.id, html_url: comment.html_url, user: { login: comment.user.login }, body: comment.body, created_at: comment.created_at, updated_at: comment.updated_at };
}

async function bounded(response, maximum = 48 * 1024 * 1024) {
  assert(response.ok, `HTTP ${response.status}`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximum) throw new Error('response exceeds size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function api(path, options = {}) {
  assert(process.env.GH_TOKEN, 'ephemeral GitHub token required');
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/${path}`, {
    ...options, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GH_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  return JSON.parse((await bounded(response, 8 * 1024 * 1024)).toString('utf8'));
}
async function pages(path, field) {
  const result = [];
  for (let page = 1; page <= 100; page++) {
    const data = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    const rows = field ? data[field] : data;
    assert(Array.isArray(rows), 'unexpected API list'); result.push(...rows);
    if (rows.length < 100) return result;
  }
  throw new Error('API pagination limit');
}
async function content(path, sha) {
  assert(SHA.test(sha));
  const result = await api(`contents/${path}?ref=${sha}`);
  exact(result.type, 'file', 'trusted file');
  exact(result.encoding, 'base64', 'file encoding');
  return Buffer.from(result.content, 'base64');
}
async function verifyWorkflowFile(path, sourceSha, trustedSha) {
  exact(await content(path, sourceSha), await readFile(resolve(ROOT, path)), 'source workflow content must match trusted workflow');
  // Also bind to the actual immutable trusted source, not a branch alias.
  exact(await content(path, trustedSha), await readFile(resolve(ROOT, path)), 'trusted workflow content');
}
async function currentMain() { return (await api('git/ref/heads/main')).object.sha; }
async function assertTrustedContext(policy) {
  const actualSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assertActivation(policy, process.env.EDITORIAL_TRUSTED_SHA);
  exact(actualSha, process.env.EDITORIAL_TRUSTED_SHA, 'trusted checkout');
  exact(process.env.GITHUB_REPOSITORY, policy.repository, 'execution repository');
  exact(Number(process.env.GITHUB_REPOSITORY_ID), policy.repositoryId, 'execution repository ID');
  exact(Number(process.env.GITHUB_RUN_ATTEMPT), 1, 'privileged workflow reruns refused');
  const mainSha = await currentMain();
  // A changed control file/config on current main invalidates pending work.
  for (const path of [...FIXED_FILES, '.github/workflows/preview-editorial-candidate.yml', '.github/workflows/deploy-cloudflare.yml', 'scripts/editorial-control.mjs', 'scripts/editorial-candidate.mjs', 'scripts/verify-editorial-candidate.mjs', 'scripts/unpack-editorial-artifact.py']) {
    exact(await content(path, mainSha), await readFile(resolve(ROOT, path)), `current main control file ${path}`);
  }
  return mainSha;
}
async function artifactById(id, runId) {
  assert(positive(id));
  const artifact = await api(`actions/artifacts/${id}`);
  exact(artifact.id, Number(id), 'artifact ID');
  exact(artifact.workflow_run?.id, Number(runId), 'artifact originating run');
  exact(artifact.workflow_run?.repository_id, REPOSITORY_ID, 'artifact repository');
  exact(artifact.workflow_run?.head_repository_id, REPOSITORY_ID, 'artifact head repository');
  assert(!artifact.expired && Date.parse(artifact.expires_at) > Date.now(), 'artifact expired');
  assert(/^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? ''), 'GitHub artifact digest required');
  assert(artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 48 * 1024 * 1024, 'artifact exceeds limit');
  return artifact;
}
async function downloadArtifact(artifact, directory, allowed) {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${artifact.id}/zip`, { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  exact(response.status, 302, 'artifact download redirect');
  const location = httpsEvidence(response.headers.get('location'));
  assert(/(?:\.blob\.core\.windows\.net|\.actions\.githubusercontent\.com)$/.test(location.hostname), 'unexpected artifact storage host');
  const zip = await bounded(await fetch(location, { redirect: 'error', signal: AbortSignal.timeout(60000) }));
  exact(`sha256:${sha256(zip)}`, artifact.digest, 'GitHub ZIP digest (warnings are insufficient)');
  const zipPath = `${directory}.zip`; await writeFile(zipPath, zip, { flag: 'wx' });
  execFileSync('python3', [resolve(ROOT, 'scripts/unpack-editorial-artifact.py'), zipPath, directory, ...allowed], { stdio: 'pipe' });
}
async function selectedCandidate(policy, runId, runAttempt, directory) {
  const run = await api(`actions/runs/${runId}`);
  assertBuildRun(run, policy, { runId, runAttempt });
  await verifyWorkflowFile(policy.buildWorkflowPath, run.head_sha, process.env.EDITORIAL_TRUSTED_SHA);
  const artifacts = (await pages(`actions/runs/${runId}/artifacts`, 'artifacts')).filter(item => item.name === `editorial-${runId}-${runAttempt}`);
  exact(artifacts.length, 1, 'unique versioned candidate artifact');
  const artifact = await artifactById(artifacts[0].id, runId);
  exact(artifact.workflow_run.head_sha, run.head_sha, 'artifact source SHA');
  await downloadArtifact(artifact, directory, ['candidate.bundle.json', 'manifest.json']);
  const manifest = await json(resolve(directory, 'manifest.json'));
  const commit = await api(`git/commits/${run.head_sha}`);
  const expected = { repository: policy.repository, repositoryId: String(policy.repositoryId), workflowPath: policy.buildWorkflowPath,
    workflowSha: manifest.metadata.workflowSha, runId: String(runId), runAttempt: Number(runAttempt), sourceCommitSha: run.head_sha, sourceTreeSha: commit.tree.sha,
    artifactId: String(artifact.id), artifactName: artifact.name, githubArtifactDigest: artifact.digest, expiresAt: new Date(artifact.expires_at).toISOString(),
    archiveSha256: sha256(await readFile(resolve(directory, 'candidate.bundle.json'))), conclusion: run.conclusion,
    artifactClass: 'release-candidate', siteOrigin: policy.production.origin, siteBase: '/', configDigest: await digestRepositoryConfiguration(),
  };
  // workflowSha is a platform-created synthetic merge SHA for PR jobs. Bind its
  // workflow bytes as well as the independently identified standalone head.
  assert(SHA.test(expected.workflowSha));
  await verifyWorkflowFile(policy.buildWorkflowPath, expected.workflowSha, process.env.EDITORIAL_TRUSTED_SHA);
  if (run.event === 'push') {
    exact(expected.workflowSha, run.head_sha, 'main workflow SHA');
    exact(manifest.metadata.sourceIdentity, 'main', 'main source identity');
    exact(manifest.metadata.finalMainSha, run.head_sha, 'final main SHA');
  } else {
    exact(manifest.metadata.sourceIdentity, 'standalone-head', 'PR source identity');
    exact(manifest.metadata.syntheticMergeSha, expected.workflowSha, 'PR workflow merge identity');
    const mergeCommit = await api(`git/commits/${expected.workflowSha}`);
    assert(mergeCommit.parents?.length === 2 && mergeCommit.parents[1].sha === run.head_sha, 'workflow merge commit must include exact standalone source head');
  }
  const { verifyCandidate } = await import('./verify-editorial-candidate.mjs');
  const verified = verifyCandidate(await json(resolve(directory, 'candidate.bundle.json')), manifest, expected);
  const routing = verified.files.find(file => file.path === '_redirects');
  assert(routing, 'approved routing file required');
  exact(routing.data, await readFile(resolve(ROOT, 'public/_redirects')), 'routing bytes must match fixed trusted configuration');
  return { run, artifact, manifest, expected };
}
async function privateProbe(urls, policy) {
  const unique = [...new Set(urls)];
  for (const url of unique) {
    const parsed = httpsEvidence(url);
    assert(parsed.hostname.endsWith('.workers.dev'), 'only inventoried review Worker hosts allowed');
    const response = await fetch(parsed, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    assertPrivateRedirect(response.status, response.headers.get('location'), policy.review.accessHost);
    await response.body?.cancel();
  }
  return { testedAt: new Date().toISOString(), urls: unique, result: 'anonymous-access-login-required' };
}
async function wrangler(args, policy, tokenName) {
  assert(process.env[tokenName], `environment-scoped ${tokenName} required`);
  const output = resolve(ROOT, `.editorial/wrangler-${Date.now()}.jsonl`);
  execFileSync(process.execPath, [resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js'), ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: process.env[tokenName], CLOUDFLARE_ACCOUNT_ID: policy.production.accountId, WRANGLER_OUTPUT_FILE_PATH: output },
  });
  return (await readFile(output, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}
function uploadedVersion(records, worker) {
  const rows = records.filter(row => row.type === 'version-upload');
  exact(rows.length, 1, 'one Wrangler upload receipt');
  exact(rows[0].worker_name, worker, 'uploaded Worker');
  assert(UUID.test(rows[0].version_id), 'immutable version ID required');
  return rows[0];
}
async function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}
async function output(name, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
async function reportUnavailable(policy, runId, attempt, stage) {
  const run = await api(`actions/runs/${runId}`);
  exact(run.id, Number(runId), 'failed build run'); exact(run.run_attempt, Number(attempt), 'failed build attempt');
  exact(run.repository.id, policy.repositoryId, 'failed build repository'); exact(run.head_repository?.id, policy.repositoryId, 'fork rejected');
  exact(run.workflow_id, policy.buildWorkflowId, 'failed workflow ID'); exact(run.path, policy.buildWorkflowPath, 'failed workflow path');
  assert(['pending', 'build-failed', 'preview-failed'].includes(stage), 'known unavailable stage required');
  if (stage === 'pending' && run.status === 'completed') return;
  if (stage !== 'pending') exact(run.status, 'completed', 'completed run status');
  if (run.event !== 'pull_request' || run.pull_requests?.length !== 1) return;
  await verifyWorkflowFile(policy.buildWorkflowPath, run.head_sha, process.env.EDITORIAL_TRUSTED_SHA);
  const number = run.pull_requests[0].number;
  const pr = await api(`pulls/${number}`);
  if (pr.head.repo.id !== policy.repositoryId || pr.head.sha !== run.head_sha) return;
  const marker = '<!-- editorial-current-preview -->';
  const existing = (await pages(`issues/${number}/comments`)).filter(comment => comment.user?.login === 'github-actions[bot]' && comment.body.startsWith(marker));
  assert(existing.length <= 1, 'duplicate receipt requires reconciliation');
  const lastRunId = Number(existing[0]?.body.match(/<!-- build-run:(\d+) -->/)?.[1] ?? 0);
  if (Number(runId) < lastRunId || (await api(`pulls/${number}`)).head.sha !== run.head_sha) return;
  const previousUrl = existing[0]?.body.match(/Immutable preview: (https:\/\/[^\s]+\.workers\.dev[^\s]*)/)?.[1];
  const status = stage === 'pending' ? 'candidate is building; no current preview is ready' : stage === 'build-failed' ? `candidate build concluded ${run.conclusion}` : 'build succeeded, but preview preparation/upload/receipt failed';
  const body = `${marker}\n<!-- build-run:${run.id} -->\nPreview unavailable for current source \`${run.head_sha}\`: ${status} (run ${runId}/${attempt}). Earlier preview links are stale and do not represent this revision. Immutable earlier evidence remains in its original workflow artifacts.${previousUrl ? `\n\nEarlier immutable preview (STALE): ${previousUrl}` : ''}\n\nhttps://github.com/${REPOSITORY}/actions/runs/${runId}`;
  await api(existing[0] ? `issues/comments/${existing[0].id}` : `issues/${number}/comments`, { method: existing[0] ? 'PATCH' : 'POST', body: JSON.stringify({ body }) });
  await summary(body);
}
async function preview(policy, runId, attempt) {
  await assertTrustedContext(policy);
  const state = await api(`actions/runs/${runId}`);
  const action = previewAction(process.env.CANDIDATE_EVENT_ACTION, state);
  if (action === 'none') return;
  if (action !== 'upload') { await reportUnavailable(policy, runId, attempt, action); return; }
  return withPreviewFailureStatus(() => uploadPreview(policy, runId, attempt), () => reportUnavailable(policy, runId, attempt, 'preview-failed'));
}
async function uploadPreview(policy, runId, attempt) {
  const work = resolve(ROOT, '.editorial'); await mkdir(work, { recursive: true });
  const { run, artifact, manifest, expected } = await selectedCandidate(policy, runId, attempt, resolve(work, 'candidate'));
  // Bootstrap denial evidence must predate manuscript upload. Probe default and
  // historical endpoints now; test the new immutable version after upload.
  await privateProbe([`https://${policy.review.hostname}/`, ...policy.review.historicalUrls], policy);
  const { extractCandidate } = await import('./verify-editorial-candidate.mjs');
  await extractCandidate(await json(resolve(work, 'candidate/candidate.bundle.json')), manifest, expected, resolve(ROOT, 'candidate-assets'));
  const uploaded = uploadedVersion(await wrangler(['versions', 'upload', '--config', 'wrangler.review.json', '--name', policy.review.worker, '--message', manifest.candidateId], policy, 'REVIEW_CLOUDFLARE_API_TOKEN'), policy.review.worker);
  const url = httpsEvidence(uploaded.preview_url).href.replace(/\/$/, '');
  assert(new URL(url).hostname.endsWith(`-${policy.review.hostname}`), 'immutable review version URL must belong to review Worker');
  const paths = manifest.files.map(file => `${url}/${file.path}`);
  const protection = await privateProbe([url, `${url}/`, `https://${policy.review.hostname}/`, ...paths, ...policy.review.historicalUrls], policy);
  const receipt = { schemaVersion: 1, trustedCodeSha: process.env.EDITORIAL_TRUSTED_SHA, candidateId: manifest.candidateId, expected,
    manifest, preview: { versionId: uploaded.version_id, url, protection: true, protectionReceipt: protection, browserEvidence: null },
    destination: policy.production, previewWorkflowRunId: Number(process.env.GITHUB_RUN_ID), previewWorkflowRunAttempt: 1, createdAt: new Date().toISOString() };
  const receiptDir = resolve(work, 'preview-receipt'); await mkdir(receiptDir);
  await writeFile(resolve(receiptDir, 'receipt.json'), JSON.stringify(receipt, null, 2));
  await output('receipt_directory', receiptDir);
  const body = `Candidate \`${manifest.candidateId}\`\n\nImmutable preview: ${url}\n\nSource: \`${run.head_sha}\` · artifact ${artifact.id} · run ${runId}/${attempt}\n\nPayload SHA-256: \`${manifest.archiveSha256}\`\n\nCurrent only while this source SHA equals the PR head; a subsequent push makes this preview stale. Revision requests belong in this PR; comments do not approve publication. Source/logs/artifacts are public. Browser and actual-phone acceptance remain required.`;
  await summary(body);
  if (run.event === 'pull_request') {
    const number = run.pull_requests[0].number;
    const pr = await api(`pulls/${number}`);
    exact(pr.head.repo.id, policy.repositoryId, 'PR repository');
    const comments = await pages(`issues/${number}/comments`);
    const marker = '<!-- editorial-current-preview -->';
    const existing = comments.filter(comment => comment.user?.login === 'github-actions[bot]' && comment.body.startsWith(marker));
    assert(existing.length <= 1, 'duplicate current receipt requires manual reconciliation');
    const lastRunId = Number(existing[0]?.body.match(/<!-- build-run:(\d+) -->/)?.[1] ?? 0);
    // Per-PR serialized uploader plus last-moment head check prevents delayed A
    // replacing B. Old evidence always remains in its own immutable artifact.
    const fresh = shouldAdvertise(run.head_sha, (await api(`pulls/${number}`)).head.sha, run.id, lastRunId);
    if (fresh) {
      const commentBody = `${marker}\n<!-- build-run:${run.id} -->\n${body}`;
      await api(existing[0] ? `issues/comments/${existing[0].id}` : `issues/${number}/comments`, { method: existing[0] ? 'PATCH' : 'POST', body: JSON.stringify({ body: commentBody }) });
    } else await summary('This immutable preview is superseded and was not advertised as current.');
  }
}
async function loadPreviewReceipt(policy, id) {
  const artifact = await api(`actions/artifacts/${id}`);
  const run = await api(`actions/runs/${artifact.workflow_run?.id}`);
  exact(run.workflow_id, policy.previewWorkflowId, 'preview workflow ID');
  exact(run.path, '.github/workflows/preview-editorial-candidate.yml', 'preview workflow path');
  exact(run.repository.id, policy.repositoryId, 'preview repository');
  exact(run.head_repository.id, policy.repositoryId, 'preview head repository');
  exact(run.event, 'workflow_run', 'preview event');
  exact(run.conclusion, 'success', 'preview outcome');
  exact(run.status, 'completed', 'preview status');
  exact(run.run_attempt, 1, 'preview rerun refused');
  await verifyWorkflowFile(run.path, run.head_sha, process.env.EDITORIAL_TRUSTED_SHA);
  const checkedArtifact = await artifactById(id, run.id);
  exact(checkedArtifact.name, `preview-receipt-${run.id}-1`, 'receipt artifact identity');
  const directory = resolve(ROOT, '.editorial/selected-preview');
  await downloadArtifact(checkedArtifact, directory, ['receipt.json']);
  const receipt = await json(resolve(directory, 'receipt.json'));
  exact(receipt.previewWorkflowRunId, run.id, 'preview receipt run');
  exact(receipt.previewWorkflowRunAttempt, 1, 'preview receipt attempt');
  exact(receipt.trustedCodeSha, process.env.EDITORIAL_TRUSTED_SHA, 'receipt trusted code');
  return receipt;
}
async function prepareRelease(policy) {
  exact(process.env.GITHUB_REF, 'refs/heads/main', 'manual release branch');
  exact(process.env.CONFIRMATION, 'DEPLOY', 'explicit DEPLOY confirmation');
  const mainSha = await assertTrustedContext(policy);
  exact(process.env.COMMIT_SHA, mainSha, 'requested current main');
  await mkdir(resolve(ROOT, '.editorial'), { recursive: true });
  const receipt = await loadPreviewReceipt(policy, process.env.PREVIEW_RECEIPT_ARTIFACT_ID);
  exact(receipt.expected.runId, String(process.env.CANDIDATE_RUN_ID), 'selected candidate run');
  exact(receipt.expected.runAttempt, Number(process.env.CANDIDATE_RUN_ATTEMPT), 'selected candidate attempt');
  const candidate = await selectedCandidate(policy, receipt.expected.runId, receipt.expected.runAttempt, resolve(ROOT, '.editorial/candidate'));
  await environmentProtection(policy);
  exact(candidate.expected, receipt.expected, 'preview artifact and current candidate');
  exact(candidate.manifest, receipt.manifest, 'preview manifest');
  const evidence = await browserEvidence(policy, process.env.BROWSER_EVIDENCE_COMMENT_ID, receipt);
  receipt.preview.browserEvidence = evidence.html_url;
  await privateProbe(receipt.preview.protectionReceipt.urls, policy);
  const frozen = { ...receipt.expected, finalMainSha: receipt.manifest.metadata.finalMainSha, sourceTreeSha: receipt.manifest.metadata.sourceTreeSha,
    candidateId: receipt.candidateId, preview: receipt.preview, destination: receipt.destination, trustedCodeSha: process.env.EDITORIAL_TRUSTED_SHA, browserEvidenceSnapshot: evidence,
    releaseRunId: Number(process.env.GITHUB_RUN_ID), releaseRunAttempt: 1, previewReceiptArtifactId: Number(process.env.PREVIEW_RECEIPT_ARTIFACT_ID),
    createdAt: new Date().toISOString(), manifest: candidate.manifest };
  exact(candidate.run.event, 'push', 'release must use a final main push build');
  const commit = await api(`git/commits/${mainSha}`);
  assertRelease(frozen, policy, { mainSha, sourceTreeSha: commit.tree.sha, configDigest: await digestRepositoryConfiguration() });
  const directory = resolve(ROOT, 'frozen-release'); await mkdir(directory);
  await writeFile(resolve(directory, 'release.json'), JSON.stringify(frozen, null, 2));
  await output('frozen_directory', directory);
  await summary(`## Publication approval request\n\nCandidate: \`${frozen.candidateId}\`\n\nPreview: ${frozen.preview.url}\n\nSource: \`${mainSha}\`\n\nPayload SHA-256: \`${frozen.archiveSha256}\`\n\nArtifact: ${frozen.artifactId} · run ${frozen.runId}/${frozen.runAttempt}\n\nDestination: ${policy.production.origin} · Worker ${policy.production.worker}\n\nDirector environment approval is required for this run. Any rerun is refused.`);
}
async function cloudflare(path, policy) {
  assert(process.env.PRODUCTION_CLOUDFLARE_API_TOKEN);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${policy.production.accountId}/workers/scripts/${policy.production.worker}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.PRODUCTION_CLOUDFLARE_API_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  const result = JSON.parse((await bounded(response, 8 * 1024 * 1024)).toString('utf8'));
  assert.equal(result.success, true, 'Cloudflare read failed'); return result.result;
}
export function assertPreviewAvailable(version, routing, frozen) {
  exact(version.id, frozen.preview.versionId, 'review version still exists');
  exact(version.annotations?.['workers/message'], frozen.candidateId, 'review version candidate binding');
  exact(routing.previews_enabled, true, 'immutable review URL routing must remain enabled');
}
async function previewAvailable(policy, frozen) {
  assert(process.env.REVIEW_CLOUDFLARE_API_TOKEN, 'review-scoped token required for read-only version existence preflight');
  const read = async path => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${policy.production.accountId}/workers/scripts/${policy.review.worker}/${path}`, {
      headers: { Authorization: `Bearer ${process.env.REVIEW_CLOUDFLARE_API_TOKEN}`, 'Cloudflare-Workers-Script-Api-Date': '2025-08-01' }, redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    const result = JSON.parse((await bounded(response, 8 * 1024 * 1024)).toString('utf8'));
    assert.equal(result.success, true, 'review version availability read failed'); return result.result;
  };
  assert(UUID.test(frozen.preview.versionId), 'exact preview version UUID required');
  const version = await read(`versions/${frozen.preview.versionId}`);
  const routing = await read('subdomain');
  assertPreviewAvailable(version, routing, frozen);
}
async function release(policy) {
  const mainSha = await assertTrustedContext(policy);
  exact(process.env.GITHUB_REF, 'refs/heads/main', 'release branch');
  const artifact = await artifactById(process.env.FROZEN_ARTIFACT_ID, process.env.GITHUB_RUN_ID);
  exact(artifact.name, `frozen-release-${process.env.GITHUB_RUN_ID}-1`, 'frozen artifact name');
  await mkdir(resolve(ROOT, '.editorial'), { recursive: true });
  await downloadArtifact(artifact, resolve(ROOT, '.editorial/frozen'), ['release.json']);
  const frozen = await json(resolve(ROOT, '.editorial/frozen/release.json'));
  exact(frozen.trustedCodeSha, process.env.EDITORIAL_TRUSTED_SHA, 'frozen trusted code');
  exact(await browserEvidence(policy, frozen.browserEvidenceSnapshot.id, frozen), frozen.browserEvidenceSnapshot, 'browser evidence changed after preparation');
  const history = await api(`actions/runs/${process.env.GITHUB_RUN_ID}/approvals`);
  await environmentProtection(policy);
  assertApproval(history, policy, { runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT }, frozen);
  const receiptDirectory = resolve(ROOT, 'release-receipt'); await mkdir(receiptDirectory);
  const outcome = { frozen, authenticatedApprovals: history, approvalObservedAt: new Date().toISOString(), releaseRunId: process.env.GITHUB_RUN_ID, releaseRunAttempt: 1, phase: 'preflight', phoneLiveAcceptance: 'pending actual owner device' };
  const saveOutcome = async () => writeFile(resolve(receiptDirectory, 'receipt.json'), JSON.stringify(outcome, null, 2));
  await saveOutcome();
  const selected = await selectedCandidate(policy, frozen.runId, frozen.runAttempt, resolve(ROOT, '.editorial/candidate'));
  exact(selected.expected.artifactId, frozen.artifactId, 'frozen artifact');
  for (const key of Object.keys(selected.expected)) exact(frozen[key], selected.expected[key], `frozen ${key}`);
  exact(frozen.manifest, selected.manifest, 'frozen manifest');
  await previewAvailable(policy, frozen);
  await privateProbe(frozen.preview.protectionReceipt.urls, policy);
  const deployments = (await cloudflare('deployments', policy)).deployments;
  assert(Array.isArray(deployments), 'deployment inventory required');
  // Observe platform state before any write, including a previous uncertain run.
  // Upload receipts put immutable candidate/run identity in the version message.
  let liveRunId = null, liveSourceSha = null;
  if (deployments.length) {
    const live = deployments[0];
    assert(live.versions?.length === 1 && live.versions[0].percentage === 100, 'unrecognized split deployment; inspect before recovery');
    const version = await cloudflare(`versions/${live.versions[0].version_id}`, policy);
    const message = version.annotations?.['workers/message'];
    const match = /^editorial:(\d+):([a-f0-9]{40}):([a-f0-9]{64})$/.exec(message ?? '');
    assert(match, 'unrecognized existing production version; separately approve baseline/recovery before release');
    liveRunId = Number(match[1]); liveSourceSha = match[2];
  }
  const commit = await api(`git/commits/${mainSha}`);
  const current = { mainSha, sourceTreeSha: commit.tree.sha, configDigest: await digestRepositoryConfiguration(), liveRunId, liveSourceSha };
  assertRelease(frozen, policy, current);
  const { extractCandidate } = await import('./verify-editorial-candidate.mjs');
  await extractCandidate(await json(resolve(ROOT, '.editorial/candidate/candidate.bundle.json')), selected.manifest, selected.expected, resolve(ROOT, 'candidate-assets'));
  // Immediately before upload, after serialization lock and environment gate.
  await previewAvailable(policy, frozen);
  exact(await currentMain(), frozen.sourceCommitSha, 'last-moment current main');
  const uploaded = uploadedVersion(await wrangler(['versions', 'upload', '--config', 'wrangler.production.json', '--name', policy.production.worker, '--message', `editorial:${frozen.runId}:${frozen.sourceCommitSha}:${frozen.archiveSha256}`], policy, 'PRODUCTION_CLOUDFLARE_API_TOKEN'), policy.production.worker);
  outcome.productionVersionId = uploaded.version_id; outcome.phase = 'uploaded-not-deployed'; await saveOutcome();
  await summary(`Production version uploaded: \`${uploaded.version_id}\`. Inspect actual deployment state before any recovery if this run is interrupted.`);
  exact(await currentMain(), frozen.sourceCommitSha, 'current main before version deploy');
  outcome.phase = 'deploying-outcome-uncertain'; await saveOutcome();
  await wrangler(['versions', 'deploy', `${uploaded.version_id}@100%`, '--config', 'wrangler.production.json', '--name', policy.production.worker, '--yes'], policy, 'PRODUCTION_CLOUDFLARE_API_TOKEN');
  const live = (await cloudflare('deployments', policy)).deployments;
  assert(live[0]?.versions?.length === 1 && live[0].versions[0].version_id === uploaded.version_id && live[0].versions[0].percentage === 100, 'production version reconciliation failed');
  const liveChecks = [];
  for (const file of frozen.manifest.files) {
    // Platform routing control files are not served as site assets.
    if (file.path === '_redirects' || file.path === '_headers') continue;
    const url = `${policy.production.origin}/${file.path === 'index.html' ? '' : file.path}`;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    const bytes = await bounded(response, 16 * 1024 * 1024);
    exact(sha256(bytes), file.sha256, `live asset ${file.path}`);
    liveChecks.push({ path: file.path, sha256: file.sha256 });
  }
  outcome.liveChecks = liveChecks; outcome.verifiedAt = new Date().toISOString(); outcome.phase = 'deployed-http-verified-browser-pending'; await saveOutcome();
  await summary(`Saved bytes deployed and HTTP hashes reconciled. Version \`${uploaded.version_id}\`. Independent browser and actual-phone publication acceptance remain pending.`);
}
async function main() {
  const policy = await json(resolve(ROOT, 'config/editorial-policy.json'));
  // Disabled before token checks, network calls, extraction or any write.
  assertActivation(policy, process.env.EDITORIAL_TRUSTED_SHA);
  const [command, runId, attempt] = process.argv.slice(2);
  if (command === 'preview') await preview(policy, runId, attempt);
  else if (command === 'preview-failure') { await assertTrustedContext(policy); await reportUnavailable(policy, runId, attempt, 'preview-failed'); }
  else if (command === 'prepare-release') await prepareRelease(policy);
  else if (command === 'release') await release(policy);
  else throw new Error('expected preview, preview-failure, prepare-release or release');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
