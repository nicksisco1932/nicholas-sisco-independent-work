# Independent Work Portfolio — Website Source of Truth

Static site for **Nicholas Sisco — Independent Research & Engineering**, built with Astro 7 and MDX. The reading experience is static HTML; JavaScript is limited to optional course self-checks and local progress controls. No image assets are published.

This repository is the permanent source for the public site. Notion remains the research system of record; the site is a curated synthesis layer, not a live mirror or news feed.

## Local development

Use Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
npm run validate # Astro check, tests, build, route/link/fragment scan
npm run preview
```

## Content and publication

Long-form content lives in `src/content/`. Each entry requires `published: true` before routes, listings, or course exports include it. Entries marked draft cannot be published accidentally: the shared publication gate rejects contradictory metadata. Draft entries remain in source control but are excluded from the built site.

Add reviewed MDX content in `src/content/notes/` or `src/content/projects/`, follow the front-matter schema in `src/content.config.ts`, and preserve source attribution and limitations. Use `npm run validate` before proposing the change.

## URLs and hosting

Cloudflare Workers Static Assets serves the static dist build. GitHub remains the canonical repository and review layer. The build preserves .html routes and existing fragments. Wrangler disables automatic HTML URL rewrites, serves the homepage at /, and redirects the legacy project prefix to the new domain root. No Astro SSR adapter, application Worker code, or database is required.

For production, set the GitHub Actions repository variable PUBLIC_SITE_URL to the owner-controlled HTTPS domain with no path. Configure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID as GitHub Actions secrets. Configure the domain as a Worker custom domain in an active Cloudflare zone before production deployment. Wrangler serves the root base path in production; local validation defaults to the GitHub Pages project prefix.

Ordinary pushes and validation do not deploy to either host. The Cloudflare production workflow requires a full main commit SHA and an explicit deployment confirmation. The separate Pages migration workflow is manual and requires a separate confirmation. It replaces old pages with move notices and keeps the course-progress export page. Course pages wait for an explicit continue so readers can first export browser-local progress. Use it only after the Cloudflare production site passes live route checks.

The old github.io origin cannot issue server-side redirects. Its migration notices provide canonical destinations and browser redirects that retain query strings and fragments; these are not HTTP 301 responses. To roll back Cloudflare, select a previously accepted version in the Worker deployments dashboard and record both revisions in the release notes. Course progress remains in browser storage: export a local JSON file on the old origin and import it on the new origin. Only known lesson IDs with matching content versions are restored. No progress is sent to a server.
## Design and scope

The site keeps the approved warm ivory and dusty-blue direction, readable contrast, and responsive text layouts. Contact remains unpublished until a destination is supplied. The science-fiction page is a minimal route with the recovered Amazon destination; it does not make availability, licensing, or download claims.
