# Independent Work Portfolio

A public, evidence-led working archive for **Nicholas J. Sisco**, built with **Astro 7, MDX, and content collections**. The design uses a warm off-white surface, restrained near-monochrome colors, serif display headings, hairline rules, and an abstract decorative SVG. Article reading widths remain narrower than the homepage and collection pages.

## What belongs where

- **Notion:** research system of record and publication/evidence review.
- **GitHub:** canonical website source, version history, tests, and reviewable changes.
- **Astro:** static HTML, CSS, and published content collections. Existing course self-checks and browser-local progress are the limited client-side interactions.
- **Cloudflare Workers Static Assets:** intended production host, with a separately approved review Worker protected by Cloudflare Access. The site itself needs no application backend, database, payments, or SSR adapter.
- **Owner:** approves design, the permanent domain, and each release. Coordination does not grant publication permission. Commercial Systeme.io integration is deferred.

The site is read-only: no accounts, comments, public submissions, or server-side progress storage. Course controls work locally on the reader's device.

## Work locally

Use **Node 24**, as specified in `.nvmrc`, and the committed npm lockfile.

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run validate
npm run preview -- --host 127.0.0.1
```

`validate` runs Astro check, tests, a production build, and route/fragment/link/publication checks. It does not establish browser, domain, or release acceptance. The default build uses the GitHub Pages project prefix; a Cloudflare-root build needs explicit configuration. See [local preview and both validation configurations](TECHNICAL_SUPORT.md#preview-and-validate).

Use local preview only where permitted. The previously denied localhost route (`ERR_NETWORK_ACCESS_DENIED`) remains closed: do not retry it, expose a local server, change browser security, or upload a preview to bypass that restriction.

## Content and publication

Long-form content lives in `src/content/`. The shared [publication gate](src/lib/publication.mjs) only includes entries with `published: true` and rejects contradictory exact `status: draft` metadata. Existing maturity, evidence, source, and rights restrictions remain authoritative. A published specification is not an implemented result.

Preserve published `.html` routes and fragments. The [reviewed route inventory](scripts/site-routes.json) must not be regenerated simply to silence a failure. New or changed content needs source, claim, rights, and route review before publication. The collection gate does not control directly authored pages or `public/` assets; review those explicitly too. Only independent, publication-cleared work belongs here; no employer-derived, patient/clinical, or rights-uncleared material.

## Review and release

Propose changes on a branch and open a reviewable PR. Merging, production deployment, and replacing the legacy Pages site are separate decisions. Ordinary pushes and PR validation do **not** deploy.

The [editorial candidate build](.github/workflows/build-editorial-candidate.yml) validates same-repository PR heads and main commits without deployment credentials. It records the standalone source SHA/tree separately from any synthetic merge identity and packages an immutable candidate. An unresolved production origin uses a deliberately non-live engineering fixture; that bundle cannot be released.

The [preview workflow](.github/workflows/preview-editorial-candidate.yml) and [production promotion workflow](.github/workflows/deploy-cloudflare.yml) are **disabled in checked-in code**. Their privileged jobs have literal-false gates, and the [activation policy](config/editorial-policy.json) is disabled. Existing secrets, a PR push, a merge, or a manual dispatch cannot activate them. External setup and a separate reviewed activation change are required before any upload. This engineering PR creates no Worker, Access application, credential, domain, deployment, or recurring service.

After separately approved setup, the phone loop is: authenticated immutable preview → precise revision request on the PR → executor acknowledgement and branch push → new candidate and immutable preview → separate merge authorization → final current-main candidate preview → Director approval of that exact candidate in the protected production environment → promote the saved bytes → independent live verification. Comments, chat approvals, `published: true`, and PR approval do not unlock production. Failed or superseded candidates remain identifiable; an old preview must never be described as the latest revision.

Private rendering does not make this public repository's source, PR discussion, logs, or downloadable artifacts confidential. Use only public-safe, rights-cleared manuscripts. Reviewing a manuscript with release-shaped metadata does not authorize public deployment; existing publication gates are unchanged.

Start with the [phone review guide](docs/editorial/phone-review.md), [redacted setup checklist](docs/editorial/setup-checklist.md), and [exact-candidate release summary](docs/editorial/release-summary.md). The manual [Pages migration workflow](.github/workflows/publish-legacy-migration.yml) remains a separate target and approval gate, with its publish job disabled pending its own activation/security decision; preview and production automation do not invoke it.

[TECHNICAL_SUPORT.md](TECHNICAL_SUPORT.md) is the operating guide for previewing, validating, proposing, releasing, diagnosing, and recovering the site. It also records the Website v1 readiness gates and the remaining owner checks. Continue the existing [PR #6](https://github.com/nicksisco1932/nicholas-sisco-independent-work/pull/6) review record rather than creating a second readiness tracker.
