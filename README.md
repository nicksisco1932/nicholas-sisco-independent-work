# Independent Work Portfolio — Website Source of Truth

Static site for **Nicholas Sisco — Independent Research & Engineering**.
Built with [Astro](https://astro.build) 5 + MDX. Text-only, no images, no client-side JS.

This repository is the **permanent source of truth** for the public site.
Notion is the research system of record; this repo is the curated synthesis layer.
The site is not a live mirror of Notion and not a news feed — new public pieces
ship only when the underlying research is mature enough to justify a synthesis.

## Repository structure

```
├── src/
│   ├── content/
│   │   ├── projects/        # MDX case studies → /literature.html, /odgs.html
│   │   └── notes/           # MDX research/methods notes (published + draft stubs)
│   ├── pages/
│   │   ├── index.astro      # Homepage (positioning + project/note summaries)
│   │   └── [slug].astro     # Dynamic route rendering projects + notes
│   ├── layouts/
│   │   ├── BaseLayout.astro # <head>/SEO, header, footer, global styles
│   │   ├── ProjectPage.astro# Project case-study layout (status + maturity badge)
│   │   └── NoteArticle.astro# Research-note layout (status/maturity block)
│   ├── components/
│   │   ├── SiteHeader.astro # Header + primary nav
│   │   ├── SiteFooter.astro # Footer
│   │   └── MaturityBadge.astro # Concept → Prototype → Internally Validated → Stable → Archived
│   └── styles/
│       ├── tokens.css       # Design tokens (soft-pastel palette — adjust here)
│       └── global.css       # Base typography + layout
├── public/
│   └── robots.txt           # Allow-all + sitemap reference
├── .github/workflows/
│   └── deploy.yml           # Build + deploy to GitHub Pages on push to main
├── SYNTHESIS_QUEUE.md       # Internal (not in public nav): candidate topics → publication
├── astro.config.mjs         # site URL, build.format='file' (legacy .html URLs), MDX, sitemap
└── src/content.config.ts    # Content-collection schemas / front-matter contract
```

## URL preservation

The previous site used flat `.html` URLs (`/literature.html`, `/odgs.html`,
`/publication-maturity.html`). `build.format: 'file'` in `astro.config.mjs`
emits pages as literal files, so those URLs are preserved exactly — no redirects
needed. If a URL ever changes, add an explicit redirect (e.g. a static HTML
refresh page or hosting-level redirect) and note it here.

## Local development

Requires Node 18.17+ (20 recommended).

```bash
npm install   # first time only
npm run dev   # local dev server with hot reload
npm run build # production build → ./dist (verifies before pushing)
npm run preview # serve the production build locally
```

## Adding a new article (MDX)

1. **Check the queue first.** New public pieces come from `SYNTHESIS_QUEUE.md`
   and only when the research is mature. Run the publication gate: ownership,
   independence, defensibility, evidence, clarity, maturity, professional test,
   privacy/IP.
2. **Create the file** in `src/content/notes/` (research/methods notes) or
   `src/content/projects/` (project case studies):
   `src/content/notes/my-new-note.mdx`
3. **Write the front matter** (schema enforced by `src/content.config.ts`):
   ```yaml
   ---
   title: My new note
   description: One-paragraph summary for SEO and listings.
   status: Published research note        # e.g. "Published methods note", "Active development", "draft"
   maturity: Concept / protocol proposal  # Concept → Prototype → Internally Validated → Stable → Archived
   date: 2026-11-15
   last_updated: 2026-11-15
   source_notion_pages:
     - https://app.notion.com/p/<notion-page-id>
   evidence_reviewed_through: 2026-11-15
   unresolved_questions:
     - What remains open or caveated
   tags:
     - methods-note
   ---
   ```
4. **Write the body** in Markdown/MDX following the house patterns:
   - Notes: status/maturity block (rendered by the layout) → Question →
     Evidence → Analysis → Limitations → Takeaway → Sources.
   - Projects: Problem → Why It Matters → Approach → Current State →
     Evidence → Limitations → Development History → Artifacts.
   - Copy must be transcribed from the Notion public layer, not invented.
5. **Drafts:** use `status: draft` for work-in-progress. Drafts are excluded
   from the build and from all listings automatically (see `src/pages/[slug].astro`).
   Flip the status when the piece passes the gate.
6. **Verify:** `npm run build` must succeed with no errors. Check the emitted
   `dist/<slug>.html`.
7. **Publish:** merge to `main`. The GitHub Actions workflow deploys automatically.

## How the synthesis queue feeds publication

`SYNTHESIS_QUEUE.md` (repo root, not linked in public nav) holds candidate
topics with: why it may now be mature, relevant Notion sources / mechanism
chains, evidence added since the previous review, unresolved caveats, and
publication readiness. Review roughly every two months. When a candidate is
mature, prepare its MDX per the steps above so it lands ready to publish —
then merge to `main`.

## Deployment

- Workflow: `.github/workflows/deploy.yml` (official `actions/deploy-pages` pattern).
- Trigger: push to `main` (or manual dispatch). Build → upload `./dist` → deploy.
- One-time setup: repo Settings → Pages → Source = **GitHub Actions**.
- `site` URL in `astro.config.mjs` must match the final Pages URL (update the
  TODO there); it feeds the sitemap, robots.txt, and canonical/OG tags.

## Design

Soft-pastel, text-only, responsive. No images anywhere on the site (confirmed
for the original). All visual choices derive from `src/styles/tokens.css` —
palette, fonts, and spacing are trivially adjustable there.

### TODO — provisional choices (review before finalizing)

The old site was unreachable during migration, so visual parity was not
attempted; this v1 is a clean rebuild. **Every inferred choice is provisional
until Nick reviews the first deploy.** The full ledger is
[`PROVISIONAL.md`](./PROVISIONAL.md); highlights:

- Palette, fonts, spacing, nav labels/order, footer content, homepage section
  order — all reconstructions, each marked with comments in the source.
- `site` URL in `astro.config.mjs` (and the robots.txt sitemap host) is a
  placeholder — set the real GitHub Pages URL once the repo exists.
- Decide whether an About/CV page is wanted (may have existed on the old site).
- The two draft note stubs need verbatim bodies from Notion before publishing.
