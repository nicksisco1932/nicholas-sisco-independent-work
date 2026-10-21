import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUILD_WORKFLOW, canonicalJson, invariant, sha256, validateMetadata } from './editorial-candidate.mjs';
import { digestRepositoryConfiguration } from './editorial-control.mjs';

export const FIXTURE_ORIGIN = 'https://website-v1.invalid';

export function buildSettings(policy) {
  const siteOrigin = policy.production?.origin || FIXTURE_ORIGIN;
  const url = new URL(siteOrigin);
  invariant(url.protocol === 'https:' && url.origin === siteOrigin && !url.username && !url.password && !url.port,
    'candidate origin must be an exact HTTPS origin');
  invariant(policy.enabled !== true || siteOrigin !== FIXTURE_ORIGIN, 'activation requires a permanent approved origin');
  return { siteOrigin, artifactClass: policy.enabled === true ? 'release-candidate' : 'engineering-fixture' };
}

export function createMetadata({ env, event, policy, headSha, treeSha, lockBytes, configDigest,
  now = new Date().toISOString(), nodeVersion = process.versions.node }) {
  const settings = buildSettings(policy);
  invariant(env.PUBLIC_SITE_URL === settings.siteOrigin && env.PUBLIC_SITE_BASE === '/', 'candidate build configuration differs from policy');
  invariant(event.repository?.full_name === env.GITHUB_REPOSITORY && String(event.repository?.id) === env.GITHUB_REPOSITORY_ID,
    'event repository differs from runner identity');
  invariant(env.GITHUB_WORKFLOW_REF?.split('@')[0] === `${env.GITHUB_REPOSITORY}/${BUILD_WORKFLOW}`, 'unexpected workflow identity');
  const isPr = env.GITHUB_EVENT_NAME === 'pull_request';
  invariant(isPr || (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/main'), 'unsupported candidate event');
  if (isPr) {
    invariant(String(event.pull_request?.head?.repo?.id) === env.GITHUB_REPOSITORY_ID,
      'fork candidate builds are not eligible');
    invariant(headSha === event.pull_request?.head?.sha, 'checkout is not the standalone PR head');
  } else invariant(headSha === env.GITHUB_SHA && headSha === event.after, 'checkout is not the exact main update');
  const lock = JSON.parse(lockBytes);
  const metadata = {
    repository: env.GITHUB_REPOSITORY,
    repositoryId: env.GITHUB_REPOSITORY_ID,
    sourceCommitSha: headSha,
    sourceTreeSha: treeSha,
    sourceIdentity: isPr ? 'standalone-head' : 'main',
    syntheticMergeSha: isPr ? env.GITHUB_SHA : null,
    finalMainSha: isPr ? null : headSha,
    workflowPath: BUILD_WORKFLOW,
    workflowSha: env.GITHUB_WORKFLOW_SHA,
    runId: env.GITHUB_RUN_ID,
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
    pullRequest: isPr ? event.pull_request.number : null,
    editorialVersion: `${isPr ? `pr-${event.pull_request.number}` : 'main'}-${headSha.slice(0, 12)}`,
    artifactClass: settings.artifactClass,
    createdAt: now,
    toolchain: { node: nodeVersion, packageLockSha256: sha256(lockBytes), wrangler: lock.packages?.['node_modules/wrangler']?.version },
    build: { command: 'npm run validate', siteOrigin: settings.siteOrigin, siteBase: '/', configDigest },
    validations: [
      { name: 'legacy-site-validation', result: 'passed' },
      { name: 'root-site-validation', result: 'passed' },
    ],
  };
  return validateMetadata(metadata);
}

async function main() {
  const root = process.cwd();
  const [command, ...extra] = process.argv.slice(2);
  invariant(extra.length === 0, 'usage: build-editorial-metadata.mjs [settings|summary]');
  if (command === 'summary') {
    const manifest = JSON.parse(await readFile(path.join(root, 'candidate-output/manifest.json'), 'utf8'));
    const m = manifest.metadata;
    invariant(/^[1-9][0-9]*$/.test(process.env.ARTIFACT_ID || ''), 'upload must return an exact artifact ID');
    invariant(/^(?:sha256:)?[a-f0-9]{64}$/.test(process.env.ARTIFACT_DIGEST || ''), 'upload must return its distinct GitHub digest');
    const summary = [
      '### Editorial candidate build',
      '',
      `- Candidate: \`${manifest.candidateId}\` (${manifest.artifactClass})`,
      `- Source: \`${m.sourceCommitSha}\` (${m.sourceIdentity}); tree \`${m.sourceTreeSha}\``,
      `- Synthetic merge identity: \`${m.syntheticMergeSha || 'none'}\`; workflow source: \`${m.workflowSha}\``,
      `- Build run/attempt: \`${m.runId}/${m.runAttempt}\`; artifact ID: \`${process.env.ARTIFACT_ID}\``,
      `- Payload archive SHA-256: \`${manifest.archiveSha256}\``,
      `- GitHub artifact digest (separate ZIP identity): \`${process.env.ARTIFACT_DIGEST}\``,
      `- Origin: \`${m.build.siteOrigin}\`; base: \`/\`; retention: 14 days from upload (API expiry is authoritative).`,
      '- Legacy and root validation passed. Upload, Access, browser, phone, approval and publication acceptance remain untested.',
      '- No review upload or publication is authorized by a successful build. Privileged jobs remain disabled.',
      '',
    ].join('\n');
    invariant(process.env.GITHUB_STEP_SUMMARY, 'GitHub summary file is required');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    return;
  }
  const policy = JSON.parse(await readFile(path.join(root, 'config/editorial-policy.json'), 'utf8'));
  if (command === 'settings') {
    const { siteOrigin, artifactClass } = buildSettings(policy);
    invariant(process.env.GITHUB_OUTPUT, 'GitHub step output file is required');
    await appendFile(process.env.GITHUB_OUTPUT, `site_origin=${siteOrigin}\nartifact_class=${artifactClass}\n`);
    return;
  }
  invariant(command === undefined, 'unknown metadata command');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const metadata = createMetadata({
    env: process.env,
    event: JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8')),
    policy,
    headSha: git('rev-parse', 'HEAD'),
    treeSha: git('rev-parse', 'HEAD^{tree}'),
    lockBytes: await readFile(path.join(root, 'package-lock.json')),
    configDigest: await digestRepositoryConfiguration(root),
  });
  await writeFile(path.join(root, 'metadata.json'), canonicalJson(metadata), { flag: 'wx' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
