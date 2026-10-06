# Independent Work Portfolio

A public, evidence-led working archive for **Nicholas J. Sisco**, built with **Astro 7, MDX, and content collections**. The design uses a warm off-white surface, restrained near-monochrome colors, serif display headings, hairline rules, and an abstract decorative SVG. Article reading widths remain narrower than the homepage and collection pages.

## What belongs where

- **Notion:** research system of record and publication/evidence review.
- **GitHub:** canonical website source, version history, tests, and reviewable changes.
- **Astro:** static HTML, CSS, and published content collections. Existing course self-checks and browser-local progress are the limited client-side interactions.
- **Cloudflare Workers Static Assets:** intended production host. No application backend, database, authentication, payments, or SSR adapter is required.
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

## Content and publication

Long-form content lives in `src/content/`. The shared [publication gate](src/lib/publication.mjs) only includes entries with `published: true` and rejects contradictory exact `status: draft` metadata. Existing maturity, evidence, source, and rights restrictions remain authoritative. A published specification is not an implemented result.

Preserve published `.html` routes and fragments. The [reviewed route inventory](scripts/site-routes.json) must not be regenerated simply to silence a failure. New or changed content needs source, claim, rights, and route review before publication. The collection gate does not control directly authored pages or `public/` assets; review those explicitly too. Only independent, publication-cleared work belongs here; no employer-derived, patient/clinical, or rights-uncleared material.

## Review and release

Propose changes on a branch and open a reviewable PR. Merging, production deployment, and replacing the legacy Pages site are separate decisions. Ordinary pushes and PR validation do **not** deploy.

The existing [Cloudflare production workflow](.github/workflows/deploy-cloudflare.yml) and [Pages migration workflow](.github/workflows/publish-legacy-migration.yml) are manual. Each requires an exact full main-branch commit SHA, its own confirmation, and the owner's approval for that action and destination. An unresolved domain does not block local readiness work.

[TECHNICAL_SUPORT.md](TECHNICAL_SUPORT.md) is the operating guide for previewing, validating, proposing, releasing, diagnosing, and recovering the site. It also records the Website v1 readiness gates and the remaining owner checks. Continue the existing [PR #6](https://github.com/nicksisco1932/nicholas-sisco-independent-work/pull/6) review record rather than creating a second readiness tracker.
