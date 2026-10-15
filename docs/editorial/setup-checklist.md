# Editorial preview and publication: redacted setup checklist

Status: **code-only; external setup and activation are not authorized by this implementation**. Privileged preview and production jobs are disabled in source and in [the activation policy](../../config/editorial-policy.json). This checklist records decisions and evidence to collect after concrete, separate approval. It is not permission to create resources, configure security, use existing credentials, upload content, deploy, bind DNS, incur cost, or merge the engineering PR.

No infrastructure screenshots or actual-phone results were produced by the engineering work. Never commit tokens, one-time PINs, session cookies, recovery codes, or unredacted settings screenshots. Configure credentials through the approved secure account/environment settings, not chat.

## Smallest owner decisions

| Decision | Record without secrets | Approval / evidence |
| --- | --- | --- |
| Source privacy | Public-safe, rights-cleared source is acceptable in this public repository, including PRs, logs, and downloadable artifacts. Confidential drafts require a separately approved private-source/storage design before upload. | Pending |
| Director identities | Exact GitHub reviewer login and exact Access email/approved identity provider. Do not infer one from the other. | Pending |
| Hosting identity | Confirm actual Cloudflare account, existing production Worker, permanent HTTPS origin, entitlement/plan, and usage budget. The config is not proof these exist. No paid change is implied. | Pending |
| Review bootstrap | Approve creation of the separate review Worker, Worker-wide Access protection, exact identity allowlist, initial eight-hour session (or approved alternative), scoped credentials, and protected environments. No review custom domain in v1. | Pending |
| Activation | Approve a separate reviewed default-branch change that pins trusted workflow code/configuration and enables the previously inert upload/release gates only after all required tests. | Pending |
| Publication | After phone review, approve the exact frozen final-main candidate and permanent destination in the protected production environment. Merge and legacy Pages migration remain separate approvals. | Pending |

## Reconcile reality before setup

- Record current main SHA/tree, repository ID/visibility, latest accepted manuscript/merge facts, FIR-34, and existing Notion publication history. Historical PR checkpoints do not override current GitHub facts. A merge SHA is not proof of deployment.
- Inventory actual Workers, deployed versions, routes, version/default hostnames, custom domains, Access applications/bypass policies, tokens, Git integrations, build triggers, deploy hooks, and GitHub workflows/environments. Record uncertainty without using credentials to mutate anything.
- Identify every production deployment path. Separately approve removal or restriction of repository-level production credentials, old broad tokens, deploy hooks, and automatic Cloudflare builds before activation; code guards cannot constrain dashboard administrators or external deploy routes.
- Recheck current dependency advisories and obtain the required security/dependency decision. Keep the historical advisory in [TECHNICAL_SUPORT.md](../../TECHNICAL_SUPORT.md#diagnose-without-widening-scope); a static output model does not settle build-tool risk.

## Bootstrap without manuscript exposure

1. Confirm existing/free entitlements meet the design. Stop for an owner decision if per-Worker token roles, Access, required GitHub reviewers, retention, or budget cannot support it. Never silently broaden credentials or buy a service.
2. Use only harmless placeholder content during separately approved bootstrap, with exposure disabled where possible. Establish Worker-level Access before any manuscript upload. Do not allow an unprotected interval with real content.
3. Protect all review Worker traffic, including default hostname, immutable version URLs, aliases, direct assets, historical versions, and any future domain. Inspect overlapping Access applications and bypass rules. `noindex`, robots exclusions, and obscure URLs are supplementary, not authentication.
4. Configure an exact identity allowlist, initially only the Director. Whole-domain membership needs explicit approval. Use the approved provider or exact-email PIN policy; no credentials in links, HTML, JavaScript, receipts, or artifacts.
5. Test anonymous denial outside authenticated sessions/cache for root, deep pages, CSS/JS/images, sitemap, alias, default hostname, and historical/version URLs. Approved identity must succeed; wrong identity, expiry, and revocation must deny. Record HTTP results and redacted screenshots.

Cloudflare documents [Worker Access protection](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [per-Worker roles](https://developers.cloudflare.com/workers/authorization/workers/), and [version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). These are setup proof points, not claimed account test results.

## Credentials, environments, and trusted execution

- Use two separate tokens. `REVIEW_CLOUDFLARE_API_TOKEN` receives Editor on the review Worker only; configure the same token in `editorial-review` and, after separate secure-settings approval, in protected `editorial-production` solely for read-only preview-version preflight. `PRODUCTION_CLOUDFLARE_API_TOKEN` belongs only in `editorial-production` and receives Editor on production only. Preview jobs never receive the production token. Mirroring the review secret does not broaden its Worker scope or create a third token; no secret placement is changed by this PR. Neither token receives DNS/Routes Write, Access administration, or token-management rights. Do not use the broad default template unchanged.
- Prove the review credential cannot read or mutate production, Access, or DNS using a harmless isolated test. If actual per-Worker scope is unavailable, stop for a separately approved account-isolation decision.
- Pre-create a protected production environment with the Director as its **only required reviewer**, administrator bypass disabled, main-only branch restrictions, and reviewed protected workflow/configuration paths. Leave “Prevent self-review” off so the solo Director can initiate and approve a release. Verify these settings against the actual repository visibility/plan.
- Keep Worker credential scopes independent and deployment credentials out of build jobs. Branch-controlled MDX/npm runs only in the secret-free, read-only, ephemeral candidate build with checkout credential persistence disabled. Privileged jobs execute trusted default-branch code pinned to approved full `vars.EDITORIAL_TRUSTED_SHA`, selected after the separately reviewed activation change; they do not execute candidate npm scripts or use candidate config/caches. Current-main control-file byte equality prevents silent changes to trusted settings/configuration. Populate repository/workflow IDs, Director and target identities, hostname/Access/evidence fields only from approved observations; null placeholders remain a blocking condition.
- Preserve Pages migration as a manual, independently approved target with its own `legacy-pages-migration` environment, credentials/permissions and confirmation. Its literal-false publish gate requires a separate activation/security decision. A production approval must not authorize Pages. Preview, candidate, and promotion automation must not call it.
- Protect relevant workflow/config/policy changes with explicit owner review and repository rules. Only release attempt 1 is eligible; test that reruns/new attempts are refused and require a fresh separately approved release run even if GitHub can reuse an environment approval.

GitHub's [environment rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) and [review process](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments) describe available controls. Verify them in the actual repository; this checklist does not configure them.

## Candidate and release evidence

- Select the permanent production origin before making a releasable candidate; build at `PUBLIC_SITE_BASE=/`. The default fixture-origin engineering artifact is non-promotable. An origin change requires a new build, preview, and approval.
- Freeze repository ID, known build workflow identity, successful run/attempt, standalone source SHA/tree, synthetic merge identity where present, exact immutable artifact ID, candidate ID, artifact class, lockfile/toolchain, trusted workflow/configuration digest, archive SHA-256, sorted file path/size/SHA-256 entries, and GitHub's separately recorded artifact digest.
- Validate provenance against the GitHub API and independently recompute archive/files. Reject unexpected/missing files, oversized payloads, traversal, and symlinks. An adjacent candidate-controlled manifest is not provenance. A download digest warning is not a passing check.
- Bind preview Worker/version/immutable URL plus protection and browser receipts, production account/Worker/origin, validation results, creation time, and retention/expiry to the frozen release record. Preview banners/status UI remain outside promotable bytes.
- Record exact-candidate browser/phone acceptance in a Director-authored same-repository PR/issue comment containing literal `BROWSER ACCEPTED`, candidate ID, archive SHA-256 and preview version UUID. Supply its `browser_evidence_comment_id` to preparation; freeze the snapshot and recheck it unchanged immediately before publication. Editing/deleting the comment invalidates the snapshot. This human-check receipt is not deployment authority; the protected environment still supplies that approval.
- Before production writes, read the exact review version with the mirrored review-scoped token: require its UUID, `workers/message` candidate annotation and remote `previews_enabled` to match the frozen receipt. Recheck immediately before writing. Anonymous Access denial is necessary but does not prove the version still exists; a deleted, swapped or disabled preview blocks release. Test those cases against the approved harmless target.
- Before requesting approval, require the source to equal current main, not merely be an ancestor. Recheck immediately before the production critical section while holding serialization. Reject out-of-order ordinary releases against the recorded live release. Historic release/rollback uses a separate exact-artifact approval.
- Promote the saved validated bytes only. No npm/build hooks run after approval. Capture the production version ID, deploy that version at 100%, and reconcile platform/assets and live response-body hashes with the approved bundle. Compression may differ; asset content and approved routing configuration must match.
- Record artifact expiry and owner-approved preservation location before deletion. An expired artifact or deleted preview cannot be recreated under an old approval; build, preview, and approve a new candidate. No storage service is created by this code-only packet.

## Redacted evidence register

Keep screenshots/results with the existing review/publication record. Fill these rows only after observation; a checked box without an evidence link is not acceptance.

| Gate | Evidence to retain | Current result |
| --- | --- | --- |
| Worker/Access bootstrap | Approved setup record; redacted all-hostname denial/success HTTP matrix and screenshots; session tests | Not performed |
| Preview availability | Read-only exact UUID/candidate annotation/routing checks; deleted/swapped/disabled negative cases | Not performed |
| Credential isolation | Reviewed roles/targets; redacted harmless negative-permission results | Not performed |
| Workflow/environment protection | Redacted reviewer/bypass/self-review/branch/rules settings; rerun/new-attempt test | Not performed |
| Provenance and artifact integrity | Exact IDs/digests; accepted and adversarial test receipts; retention/expiry | Local/CI engineering evidence only; see PR |
| Browser acceptance | HTTPS/status/redirect/404/metadata, keyboard/focus, 320/390/768/1280 CSS widths, course controls | Current-revision browser acceptance pending |
| Actual-phone pilot | Device/OS/browser/version, cellular/private tab, A→B revision, stale/reject/approval tests against harmless target | Not performed |
| Production publication | Authenticated exact-candidate approval; actual version/assets; independent live verification | Not authorized or performed |
| Legacy Pages | Separate exact-revision migration authorization and results, if later requested | No migration performed by this work |

Use the [phone guide](phone-review.md) for the owner pilot and the [release summary](release-summary.md) for each frozen release. Do not retry the denied localhost route, weaken security, or expose a local server to complete these rows.
