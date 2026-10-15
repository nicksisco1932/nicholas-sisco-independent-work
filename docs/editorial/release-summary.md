# Exact-candidate release summary template

Complete this from trusted evidence before requesting an environment approval. Missing, expired, mismatched, fixture-origin, or superseded evidence blocks publication. This template and chat/PR comments do not authorize release. The production workflow remains disabled until separately approved setup and activation.

## Frozen identity

| Field | Exact value / evidence link |
| --- | --- |
| Schema / candidate ID / artifact class | `release-candidate` required for production |
| Originating repository ID / full name | |
| PR / editorial version / manuscript route | |
| Full standalone source SHA / tree SHA | |
| Synthetic merge SHA / base / head / tree, if applicable | Record separately; not the standalone source |
| Final main SHA / observed current-main SHA and check time | Must be equal for an ordinary release |
| Trusted workflow full SHA / workflow identity / config digest | |
| Build run ID / attempt / successful conclusion | |
| Exact Actions artifact ID / name / creation / expiry | Name alone is insufficient |
| Independent archive SHA-256 / sorted file manifest digest | |
| GitHub artifact digest | Record separately from payload/archive digest |
| Node / lockfile digest / locked toolchain versions / build command | |
| Build base / permanent production origin | `/` and approved HTTPS origin; no fixture |
| Validation and adversarial receipts | |

## Preview and destination

| Field | Exact value / evidence link |
| --- | --- |
| Review account/Worker / version ID | |
| Immutable HTTPS preview URL | Moving alias cannot be the approval identity |
| Access protection receipt / checked hostnames / time | Include anonymous and wrong-identity denial |
| Current-revision browser / actual-phone receipt | Device/browser/version, candidate ID, widths/results |
| Director acceptance comment ID / frozen body digest | Same-repository PR/issue; literal `BROWSER ACCEPTED`; exact candidate/archive/version UUID; unchanged snapshot |
| Preview availability preflight | Exact version UUID / `workers/message` candidate / remote `previews_enabled`; rechecked before write |
| Production account / Worker / exact approved origin | No secret values |
| Approved routing/configuration identity | |
| Previously accepted live candidate/version and timestamp | Prevent out-of-order ordinary releases |
| Artifact/bundle preservation location and expiry | Owner-approved storage only |

## Pending protected approval

Release run ID / attempt / job / environment:

Required Director identity / environment-settings evidence:

Frozen manifest location and digest:

Freshness, provenance, exact-main, destination, protection, and required-human-check results:

Known limitations or incomplete acceptance gates:

The Director reviews the immutable preview and this exact destination before approving the pending protected environment job. `DEPLOY` is an additional dispatch guard, not authenticated Director approval. A source/configuration/origin/target/artifact/attempt change or edited/deleted acceptance-comment snapshot invalidates this request. Deleted/swapped/disabled preview versions block publication; an Access redirect alone does not establish availability. A rerun requires a fresh separately approved release run; do not replay old approval.

## Publication receipt — complete only after observation

Authenticated approval identity / time / run / attempt / job / candidate:

Final current-main/configuration recheck under the production lock:

Production upload version / 100% deployment ID / actual observed platform state:

Approved-bundle versus deployed-asset and live response-body hash results:

Independent verifier / time / actual-phone and public-route results / verified URL:

Outcome: `deployed, unverified`, `published, verified`, or precise failed/uncertain stage:

Existing Notion publication-history / FIR-34 receipt links:

A timeout or canceled job can still have changed production. Observe actual state before recovery. Any rollback needs exact accepted artifact/version/destination approval and fresh live verification. Merge and Pages migration are separate decisions.
