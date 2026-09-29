# PROVISIONAL — choices needing Nick's review

The previous site was unreachable during migration, so every item below is a
reconstruction or a fresh choice, **not** verified visual parity. All public
copy itself is verbatim from the Notion public layer (see report section (a));
only the items listed here are provisional. Review against the first deploy
and correct or confirm each one.

## Visual identity (all inferred)

- **Palette** — a soft-pastel reconstruction (warm ivory background, dusty-blue
  accent, pastel chips). The original palette was never recovered. Tokens live
  in `src/styles/tokens.css`; adjust freely.
- **Fonts** — Georgia serif headings + system sans body. Original fonts unknown.
- **Spacing / layout** — single-column, max-width ~46rem, card-style project
  summaries on the homepage. Original layout unknown.
- **Top pastel gradient bar**, card borders, maturity-badge chips — invented
  for this v1; none are confirmed from the original.

## Structure / copy scaffolding (inferred, marked in source)

- **Nav labels and order** (`src/components/SiteHeader.astro`): Home,
  Literature Agent, ODGS, Research Notes (→ publication-maturity.html).
  Original nav unknown. Marked with an HTML comment in the component.
- **Footer content** (`src/components/SiteFooter.astro`): identity line +
  read-only notice. Original footer unknown. Marked with a comment.
- **Homepage positioning paragraph and section order**
  (`src/pages/index.astro`): built only from confirmed facts (hub's
  positioning intent, flagship list, maturity labels). Homepage copy beyond
  that intent is UNKNOWN. Marked with comments.
- **"Public case study" opening sections** on `/literature.html` and
  `/odgs.html`: one-sentence pointers, flagged as reconstructed in MDX
  comments (inventory §3.2/3.3 confirm the section exists and links to the
  canonical case-study concept; exact wording unknown).
- **Computational Photography homepage summary**: Problem + Why-It-Matters
  paragraphs are verbatim from Notion; its placement as a homepage card and
  the "bounded text summary" framing note are editorial choices. Marked.
- **Note slug choices** for the two draft stubs (`who-disappears-from-a-
  historical-panel`, `when-nmr-peak-height-supports-a-thermodynamic-
  inference`): original slugs unknown (inventory §8). Provisional.
- **Contact route**: the hub requires "one professional contact route"; its
  concrete form (mailto vs. page) is UNKNOWN and is **not** on this v1.

## Deployment placeholders

- **`site` URL** in `astro.config.mjs` is a placeholder
  (`https://nicksisco1932.github.io/independent-work/`). Set the real Pages
  URL (or custom domain) once the repo exists; it feeds sitemap, robots.txt,
  canonical and OG tags. Also decide whether a `base` path is needed
  (project Pages site vs. user site vs. custom domain).
- **robots.txt** sitemap host mirrors the placeholder above — update together.

## Deliberately not reconstructed

- About/CV page: may or may not have existed among the original six pages
  (inventory §8). Not built; confirm whether one is wanted.
- The two missing note bodies: draft stubs only, per direction. Bodies must
  be transcribed verbatim from Notion (page IDs are in the stub files) and
  pass the publication gate before `status: draft` is flipped.
