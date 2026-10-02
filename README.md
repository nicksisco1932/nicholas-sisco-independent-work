# Independent Work Portfolio — Website Source of Truth

Static site for **Nicholas Sisco — Independent Research & Engineering**, built with Astro 5 and MDX. The reading experience is static HTML; JavaScript is limited to optional course self-checks and local progress controls. No image assets are published.

This repository is the permanent source for the public site. Notion remains the research system of record; the site is a curated synthesis layer, not a live mirror or news feed.

## Local development

Use Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
npm run validate # Astro check, publication tests, production build, link/fragment scan
npm run preview
```

## Content and publication

Long-form content lives in `src/content/`. Each entry requires `published: true` before routes, listings, or course exports include it. Entries marked draft cannot be published accidentally: the shared publication gate rejects contradictory metadata. Draft entries remain in source control but are excluded from the built site.

Add reviewed MDX content in `src/content/notes/` or `src/content/projects/`, follow the front-matter schema in `src/content.config.ts`, and preserve source attribution and limitations. Use `npm run validate` before proposing the change.

## URLs and hosting

The site preserves flat `.html` routes for legacy pages and uses the project base path `/nicholas-sisco-independent-work/`. Astro generates canonical links and a sitemap. The GitHub Actions workflow validates pull requests; deployment runs only for pushes or manual dispatches on `main`.

## Design and scope

The site keeps the approved warm ivory and dusty-blue direction, readable contrast, and responsive text layouts. Contact remains unpublished until a destination is supplied. The science-fiction page is a minimal route with the recovered Amazon destination; it does not make availability, licensing, or download claims.
