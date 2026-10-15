# Code-only engineering evidence — 15 October 2026

Baseline: `bf7454aa48e69cfa7ce0828ae9c0332500db576e`; repository ID `1396449686`; public repository. PR #7 is merged into this baseline. FIR-34's earlier unmerged checkpoint is historical, not current GitHub state. Branch: `codex/phone-editorial-review`. The review PR records its final full head and terminal CI URLs.

## Verification

- Node `24.19.0`, locked Wrangler `4.147.0`; `npm ci` completed without changing the lockfile.
- `npm run validate` passed for the legacy configuration and for `PUBLIC_SITE_BASE=/`, `PUBLIC_SITE_URL=https://website-v1.invalid/`: 102 pages, route/fragment/link/publication checks, zero Astro diagnostic errors/warnings/hints. Existing MDX build-tool warnings remain.
- Final local unit/integration suite: 45 tests, 42 passed, three skipped. Windows prevented file/directory symlink creation, and Python is unavailable locally. Ubuntu CI must run both link tests and the Python outer-ZIP adversarial suite (six Python cases inside one Node test) before accepting CI evidence. These are not counted as local passes.
- A real built-directory bundle/extraction round-trip preserved 113 files and 1,004,093 bytes, including the exact existing root `_redirects`. Payload identity changes with the build configuration; the engineering fixture is never releasable.
- Five workflow YAML files parsed; `git diff --check` passed. No changes to `src/`, `public/`, the reviewed route inventory or dependency lockfile. Direct pages/public assets remain subject to explicit editorial review.
- Locked Wrangler's version-upload/deploy help and output schema were inspected; no upload/deploy command was executed. Release uses structured upload UUID output and saved assets, with no site rebuild in the privileged jobs.

## Independent review

A separate fresh-context code-review agent examined the initial complete 28-file diff and the focused fix wave. Initial review patch SHA-256: `2a44f01d1aa3ab56a01f3e5ca5d3fb26973c1460f38d89766f991ba103346713`. Full reports are retained with this task; this is the public-safe result.

| Finding | Resolution |
| --- | --- |
| Access denial alone cannot prove the immutable preview still exists | Protected release reads the exact review UUID and candidate annotation using the separately review-scoped token, checks enabled version routing, and repeats Access probes before production writes. Secure duplicate placement of this same token in production is a later setup decision; token scope is never broadened. |
| Pending or failed preview stages can leave an old current receipt | Pending/completed events and trusted failure handling mark the current revision unavailable and prior links stale. Exact head/run checks prevent delayed older events from replacing the new receipt. |
| Dormant Pages workflow lost its independent main/PUBLISH guard | Restored explicit guards before candidate checkout/build, retained a distinct environment and literal-false activation gate. |
| Status events can replace a queued completion job | Added bounded `queue: max` with serialized, non-canceling execution; watched the regression assertion fail and then pass. |

The reviewer independently reran 22 changed control/workflow tests with no failures or skips and verified diff hygiene. Terminal verdict: all findings addressed, no unresolved concrete defects within the reviewed scope; suitable for a code-only review PR while all privileged gates remain disabled. This was an independent agent review, not a human Director approval or a GitHub approval of publication.

## Explicit limits and next setup decisions

No merge, deployment, preview upload, Worker creation, Access/environment configuration, credential use/change, DNS change, paid service, recurring charge or localhost bypass occurred. Policy is disabled; preview, production and legacy Pages jobs have independent literal-false guards. Existing repository-level Cloudflare secret names are not consumed by the new privileged paths.

No infrastructure screenshots, live/browser acceptance or actual-phone results exist for this implementation. Actual GitHub environment API fields/plan/reviewer settings, attempt/rerun behavior, raw Actions artifact download digest reconciliation, scoped Worker credentials, Access on every hostname/path, deleted-preview integration, platform deployment/version reconciliation and transport/live body hashes remain integration proof points. GitHub approval history lacks an approval timestamp/attempt field: receipts record observation time; owner evidence must retain the actual approval screen/time and job identity. Release reruns are conservatively refused.

The read-only audit on 15 October reports four high-severity package findings across two advisories (`http-cache-semantics`; `sharp`, propagating through `miniflare` and `wrangler`). Dependencies remain unchanged; resolve the security decision before activation. An existing production version without a recognized editorial receipt blocks ordinary promotion and needs an explicitly approved baseline/recovery decision.

The smallest next choices are public-safe source acceptance, exact Director GitHub/Access identities, actual account/Worker/permanent origin and budget, separately approved protected setup/activation, and then the owner-phone pilot. See [setup checklist](setup-checklist.md) and [phone review](phone-review.md). None of these choices is inferred from a green build or this PR.
