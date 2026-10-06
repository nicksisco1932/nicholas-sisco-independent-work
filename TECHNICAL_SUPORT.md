# Website technical support and v1 readiness

This is the operating guide for the existing site. Keep the filename `TECHNICAL_SUPORT.md`. [README](README.md) describes the architecture and publication boundary; this document owns operating detail. The continuing review/handoff record is [PR #6](https://github.com/nicksisco1932/nicholas-sisco-independent-work/pull/6), following [issue #4](https://github.com/nicksisco1932/nicholas-sisco-independent-work/issues/4).

## Preview and validate

Use Node 24 and `npm ci` with the committed lockfile. Run the following from the repository root. These commands build locally; they do not deploy or require a chosen domain.

### Legacy project-prefix configuration

```sh
PUBLIC_SITE_BASE=/nicholas-sisco-independent-work \
PUBLIC_SITE_URL=https://nicksisco1932.github.io/nicholas-sisco-independent-work/ \
npm run validate
```

Open the matching build with `npm run preview -- --host 127.0.0.1` at the URL printed by Astro, including `/nicholas-sisco-independent-work/`. For source development, use `npm run dev -- --host 127.0.0.1`.

### Production-root configuration, local fixture only

```sh
PUBLIC_SITE_BASE=/ \
PUBLIC_SITE_URL=https://website-v1.invalid/ \
npm run validate

PUBLIC_SITE_BASE=/ \
PUBLIC_SITE_URL=https://website-v1.invalid/ \
npm run preview -- --host 127.0.0.1
```

`website-v1.invalid` is a deliberately non-live test origin, not a domain choice or deployment destination. Each build replaces `dist/`; keep the build configuration and commit with any evidence, and rebuild before previewing another configuration. Run Wrangler's existing `npm run preview:cloudflare` only in a permitted local environment when checking actual static-asset routing. Astro preview does not emulate Cloudflare `_redirects` or platform 404 behavior.

If the execution environment blocks local servers, browser sockets, or local preview URLs, stop that route. Do not expose a server, publish a preview, change browser security, or deploy to get around the limit. Record the error and hand the current-revision browser checklist below to the owner on a permitted local machine.

### What the checks establish

The existing [validate command](package.json) runs:
- Astro type/template diagnostics.
- Publication-gate and progress-import unit tests, plus metadata checks.
- Static build and every published collection route.
- Exact route/fragment inventory, metadata/canonicals, robots sitemap reference, internal links, asset-size/count limits, and the locked homepage contract.

`npm run capture:routes` is read-only without `--write`. Updating `scripts/site-routes.json` requires reviewed content/route changes. Do not use `--write` as a generic repair.

Automated passes do not prove visual appearance, focus/keyboard behavior, actual course controls, HTTP redirects, HTTPS, DNS, or successful publication. `npm run validate` also does not build or test the optional `legacy-pages/` migration output.

## Propose a change

1. Record the current full main SHA and inspect repository guidance; use a dedicated branch or the existing bounded PR for the same task.
2. Keep content and publication review separate from layout or hosting work. Preserve protected claims, maturity, rights, URLs, and fragments.
3. Make the smallest authorized repair. Escalate new requirements, navigation/copy decisions, architecture, and dependency changes.
4. Run `npm ci`, both applicable validation configurations above, and `git diff --check`. Inspect the built change and obtain an independent scope review.
5. Open/update a draft PR with scope, baseline/head, changes, commands and results, browser coverage/limits, and remaining owner decisions. Verify the remote head.
6. Check CI to a terminal result. For `pull_request`, the existing workflow checks a synthetic merge ref, not automatically the standalone branch head. Record its SHA/base/head and compare Git trees before claiming equivalence.

Approval of a PR or this guide does not by itself authorize a merge, release, domain purchase, credential change, DNS change, or Pages replacement.

## Manual release: Phase B, not authorized by readiness work

### Prerequisites and owner decisions

- Owner-selected permanent HTTPS domain and confirmed ownership.
- Appropriate Cloudflare account, active zone, and the intended Worker `nicholas-sisco-independent-work`.
- Verified custom-domain binding and any existing DNS conflicts. The checked-in [Wrangler config](wrangler.jsonc) has `workers_dev: false` and no domain/route declaration; the workflow does not create or verify the binding.
- If the Worker does not exist, pause for a separately approved first-Worker setup plan before domain binding. Do not improvise a bootstrap deployment. Creating a Worker, binding a domain, and changing DNS/security credentials are not covered by this readiness task.
- Repository variable `PUBLIC_SITE_URL`: the selected HTTPS origin with no path, query, or fragment. Configure it in GitHub Actions repository settings.
- GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: set through the appropriate secure settings. Never put values in chat, source, this guide, logs, or screenshots. Credential creation/permission changes require their own approval.

[Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) require an existing Worker and active zone; domain binding creates DNS/certificate state and may conflict with an existing CNAME. [Wrangler's source-of-truth guidance](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth) explains dashboard-managed bindings when routes are omitted. `workers_dev: false` is not proof that every preview/version URL is private or disabled; verify exposure in the approved setup.

The [production-origin guard](scripts/check-production-origin.mjs) checks URL shape and rejects `github.io`/`workers.dev` destinations. It does not prove ownership, DNS, account permissions, domain reachability, or approval. Do not use the local `.invalid` fixture for release.

### Release procedure

1. Complete code review and the current-revision browser/human gates below. Separately authorize any merge.
2. Record the exact **full 40-character main commit SHA**, intended Worker/account and HTTPS destination, successful validation evidence, and the owner's explicit release approval. Refresh evidence if source/configuration changes.
3. Verify the configured destination and secrets through their secure settings. Record no secret values.
4. On `main`, manually run [Deploy Cloudflare production](.github/workflows/deploy-cloudflare.yml) with that SHA and `confirmation: DEPLOY`. The workflow checks main ancestry, installs dependencies, requires the production origin, sets `PUBLIC_SITE_BASE=/`, validates the selected revision, and deploys its `dist/` assets.
5. Wait for the deployment result. Record the actual deployed version/commit and URL, then perform live verification. A successful build/CI run is not a successful deployment or live acceptance.

The workflow's typed choice and ancestry check do not establish the owner's destination approval or prove the live checks passed. Do not dispatch it under the Phase A readiness authorization.

### Live verification after an authorized release

Record time, exact deployed revision/version, domain/configuration, browser/version, viewport or device, evidence location, and result for each check:
- HTTPS certificate, homepage, representative long-form note/project, atlas entry, course landing/lesson/progress, and all published routes/assets.
- Navigation, legacy fragments, query/fragment-bearing links, skip link, keyboard focus and responsive layout at the widths below.
- Canonicals, sitemap/index, and robots all point to the intended root origin; no fixture or stale Pages origin leaks into production metadata.
- Root `/` serves the homepage; `/index.html` and the former project prefix follow the checked-in [_redirects](public/_redirects). Verify actual status/location, query retention, and browser fragment behavior rather than assuming it from the file.
- Unknown URL returns an actual 404, with no unintended SPA fallback. The current repository has no custom `404.html`; do not claim branded 404 handling.
- Existing course quizzes, completion/reload, storage-unavailable behavior, progress export/import, and reset/cancel function in a disposable browser profile. Progress stays local and is not sent to a server.

### Separate legacy Pages migration

Leave GitHub Pages unchanged until the Cloudflare release has passed live checks and the owner separately approves replacing Pages with migration notices for an exact revision and destination.

Only after that separate approval, dispatch [Publish GitHub Pages migration notices](.github/workflows/publish-legacy-migration.yml) from `main` with the approved full `commit_sha` and `confirmation: PUBLISH`. The workflow validates a **fresh legacy-prefix build**, then runs [build-legacy-migration.mjs](scripts/build-legacy-migration.mjs) and publishes `legacy-pages/`. `npm run prepare:legacy-migration` deletes/rebuilds that local output directory; do not run it against a production-root `dist/`, whose progress-page base/asset URLs differ. Preparation is not publishing, and the normal validation suite does not inspect this generated archive.

Before approving migration, retain the pre-migration Pages source, available deployment/artifact evidence, and an explicitly agreed restoration procedure. Inspect the generated archive and test the retained progress page, its CSS/JS/course-index dependencies, navigation and export/import between origins. Export from the old origin in the same browser/profile before moving; import on the new origin. Only known lesson IDs with matching content versions are restored, and existing target progress is kept. An origin change never transfers browser storage automatically. Each original origin must export its own data: the Pages exporter cannot read progress stored on the separate original `chatgpt.site` origin. Keep completion exports private; do not attach them to public issues.

Current migration behavior to review explicitly:
- Nested `forged-fitness/*` pages wait for a click and offer the old progress-export link. `forged-fitness/progress.html` is retained for export.
- The course landing page `forged-fitness.html` auto-redirects like other ordinary pages; it does **not** pause for export. Decide whether that is acceptable before approving migration; changing it requires a bounded repair decision.
- JavaScript preserves query strings and fragments. Without JavaScript, the static link/meta-refresh destination does not retain them.
- These Pages notices are browser navigation, not server-side HTTP 301s. They do not replace testing the Cloudflare redirects.

### Recover safely

- **Before first Cloudflare launch:** there may be no accepted Cloudflare version to restore. Keep Pages intact. If setup or first launch fails, stop and report the observed state; use only an owner-approved recovery action. Do not claim a rollback exists or move Pages traffic to an unverified target.
- **Uncertain release outcome:** after a timeout or cancellation, inspect the workflow and actual Worker deployment before retrying. A canceled run is not proof that nothing went live. Seek approval if the recovery changes revision, destination, or exposure.
- **After an accepted Cloudflare release:** record its actual version ID before the next release. A rollback requires approval of the exact prior accepted version/destination, then live checks and a record of both versions. Rollback does not automatically undo DNS changes or restore browser-local progress.
- **After Pages migration:** this repository has no full-site Pages restoration workflow. Do not invent one or claim reversing the notices is automatic. Preserve the old progress export and ask for an explicit recovery plan if needed.

## Diagnose without widening scope

- **Install/cache failure:** check Node 24, the lockfile, and writable cache. A sandbox fallback is `npm ci --cache /tmp/website-npm-cache`. Do not regenerate the lockfile or run `npm audit fix` as a generic retry.
- **Astro configuration-home error:** use a writable temporary `XDG_CONFIG_HOME` for that process. Keep source, secrets, and global settings unchanged.
- **Route/canonical failures:** check the recorded `PUBLIC_SITE_BASE`/`PUBLIC_SITE_URL` pair and rebuild. Never bless a changed inventory without reviewing why it changed.
- **Progress missing:** confirm browser/profile/origin and lesson versions; check storage availability. Export before reset or origin migration. Use disposable test data for destructive-control checks.
- **Browser blocked:** retain the exact error, failed stage, revision, and intended viewport. Static HTML/source checks are not interaction evidence; use the owner checklist rather than a public-preview workaround.
- **Dependency advisory:** on 2026-10-04, read-only npm audit reported `http-cache-semantics@4.2.0`, pulled in by `astro@7.3.5`, with [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp). An audit fix is available, but dependencies were not changed under this bounded task. Astro is used to build this static site, not deployed as an application server; that does not by itself resolve build-tool exposure. Obtain a separate dependency/security decision before release.
- **Warnings:** zero Astro-check warnings is not zero build/tool warnings. Existing MDX directive and action-runtime notices remain recorded separately from validation failures.

## Website v1 readiness record — 2026-10-04

### Revision and changes

- Main baseline: `2c66d8fd496937b98a794bf42c0b3a911ffcb829`.
- Runtime implementation under review: `1ab87f22a04b950183f74f6ef71310f3521c4ab8` in existing draft PR #6. Relative to main, only two decorative `↗` source characters change to `→`, producing five repaired spans. Labels, destinations, `aria-hidden`, routes, and all other implementation bytes are preserved.
- Readiness continuation updates this README/guide only; no new runtime feature, dependency, workflow, publication entry, or hosting setting. The PR's latest head/CI record identifies the final documentation-inclusive revision.

### Separate evidence gates

| Gate | Result / coverage |
| --- | --- |
| Automated implementation validation | Passed for the implementation head: Node 24, five unit tests, metadata for 83 entries, 101 HTML pages, route/fragment/link/homepage contract and exact five-arrow assertions. Final `npm ci` and `npm run validate` passed in both legacy-prefix and root configurations; root used the non-live `https://website-v1.invalid/` fixture. The final PR record links its documentation-inclusive head and CI. |
| CI revision precision | Prior [PR #6 run](https://github.com/nicksisco1932/nicholas-sisco-independent-work/actions/runs/37241310524) tested synthetic merge `debe209f217eba4d96a04c2c954d8d6a50329298`; tree `7dde4d6021b6b724d94e928ea1bc42e754071809` equals the implementation-head tree. See the same PR for final-head CI. |
| Historical browser coverage | Passed within observed bounds for Pages deployment `648dde9b509d968413c93292b9076bceeb570c8f`, 2026-10-04 22:35–22:44 UTC: cloud Chromium on Linux; CSS viewports 1180×757, 768×757, and 500×757 at 100% zoom; 400×606 at 125%; 320×378 at 200%; browser version not recorded. Narrow views used zoom/resizing, not phone emulation. Tested homepage no-overflow, skip/focus/CTA, five cross-page nav links, repeated CTA, Back/Forward; literature/atlas/course landing/philosophy no-overflow at CSS320. Course controls were not exercised. |
| Reuse boundary | Current legacy-prefix built stylesheet bytes and normalized main text match those historical page builds for homepage (apart from approved arrows), literature, atlas, course landing, and philosophy. This supports limited layout/design continuity only. Changed course JS/progress page, root-path browser behavior, and new arrow rendering are not covered. Public deployment attribution used GitHub deploy records/tree equality, not an HTTP asset-byte comparison. |
| Design review | Approved private reference recovered and inspected. Independent screenshot review supports conceptual editorial/archive fidelity and required safe substitutions; no additional observed visual defect beyond repaired arrows. The private clinical-image reference is not published. |
| Current browser/interaction coverage | Blocked for local builds: Chromium launch reports Unix `socket() failed: Operation not permitted`; cloud browser rejects file URLs and localhost with `net::ERR_BLOCKED_BY_CLIENT`. No bypass attempted. Historical malformed zoomed full-page exports are excluded; native viewport captures supply only upper-page CSS320 visual coverage. |
| Human acceptance | Pending explicit design acceptance and current-revision browser checks below. A past merge or issue closure is not treated as visual acceptance. |
| Production | Not authorized and not performed by this readiness work. Domain/account/zone/Worker configuration and release approval remain external owner gates; Pages is unchanged by this work. |

Evidence stays with the existing website task/support logs; PR #6 is the shared review record. Existing captures are named `live-homepage-desktop-1180.jpg`, `live-homepage-tablet-768.jpg`, `live-homepage-narrow-500.jpg`, and `live-css320-native-{top,hero,actions,collections}.jpg`. Logs, exact build configuration, and applicability comparisons are retained there; the private reference and failed-capture exports are not public attachments.

### Smallest remaining owner/browser check

On a permitted local machine, check out the PR's current full head, build each configuration above, and record browser/version, viewport, revision/configuration, screenshot/result location:
1. At approximately 1280, 768, 390, and 320 CSS pixels, inspect the full homepage plus a literature article, atlas entry, course lesson/progress page, and philosophy article. Check no horizontal overflow, usable text, the five repaired arrows, and lower-page content at narrow widths. Include a real touch device if mobile acceptance requires it.
2. Keyboard only: skip to main, visible focus, CTA, all header links from a long-form page, repeated activation, and Back/Forward. Check details/summary and course controls.
3. In a fresh disposable profile, try quiz blank/wrong/right states, complete/incomplete then reload, reset then Cancel, export progress, confirmed reset, and import it back. Try a malformed import and unavailable storage; verify graceful messages and no unintended loss. Do not reset a learner's real progress to test the UI.
4. Record explicit owner design acceptance or precise observed defects. Keep the dependency-advisory decision and later production authorization separate.

Stop when these are external owner gates. Do not expand the architecture or add infrastructure to manufacture a passing result.
