# Muse notes

## 2026-09-29 — Muse

- Commit or branch reviewed: `codex/astro-migration-spike` @ `4bbafd9` ("Add Astro migration spike for Forged Fitness Week 1")
- Build result: **FAILED as pushed** — two bugs, both fixed (see follow-up below). Branch now builds clean.
- Content fidelity: Week 01 reads as a faithful, restrained port. Three lesson sections (Understand / Apply / Review), worked examples, practice prompts, and the evidence-boundary section are all present with production source links. No invented content detected.
- URL and navigation result: `/forged-fitness/weeks/week-01.html` and `/forged-fitness/resources/baseline.html` build correctly once the bugs are fixed. Homepage card, header nav link, week-01 → baseline internal link, and sitemap entries all verified in rendered output.
- Print/worksheet result: worksheet table renders correctly on screen (5 columns, reflection prompts intact). No `@media print` stylesheet exists anywhere in the site, so printing includes full site chrome (header/footer nav). Flagged as a fidelity gap for full migration, not a spike blocker.
- Recommendation: fix the two build bugs, then proceed to the remaining 11 weeks + 5 worksheets once the owner approves. Keep ChatGPT Sites as production until the full port is reviewed. At full migration, replace the per-week `.astro` page files with a dynamic `[slug].astro` route (the existing notes route already demonstrates the pattern) — 12 near-identical page files will otherwise rot.
- Confidence: High on build and rendering findings (verified by local `npm install` + `astro build` and rendered-HTML inspection). Medium on content fidelity vs the production source (the Sites original was not directly compared; Week 01 is internally consistent and faithful on its face).

### Bug 1 (build-breaking): wrong relative import in baseline.astro

`src/pages/forged-fitness/resources/baseline.astro` imports
`'../../../../layouts/CoursePage.astro'` (four levels up). The file sits three
levels deep under `src/`, so Vite fails with:

> Could not resolve "../../../../layouts/CoursePage.astro" from "src/pages/forged-fitness/resources/baseline.astro"

Fix: `'../../../layouts/CoursePage.astro'` (matching `week-01.astro`).

### Bug 2 (would break after Bug 1): collection name / folder mismatch

`src/content.config.ts` defines collections `courseWeeks` and `courseResources`,
but the content folders are `course-weeks/` and `course-resources/`. Astro's glob
loader then looks for `src/content/courseWeeks/` and `src/content/courseResources/`
(neither exists), warns, and auto-generates separate deprecated `course-weeks` /
`course-resources` collections — so `getEntry('courseWeeks', 'week-01')` would
return undefined and the page would throw "Missing course week".

Fix: keep the camelCase variables, export with quoted kebab-case keys, and update
the type/call sites:

```ts
// src/content.config.ts
export const collections = {
  projects,
  notes,
  'course-weeks': courseWeeks,
  'course-resources': courseResources,
};
```

```astro
<!-- src/layouts/CoursePage.astro -->
entry: CollectionEntry<'course-weeks'> | CollectionEntry<'course-resources'>;
```

```astro
<!-- src/pages/forged-fitness/weeks/week-01.astro -->
const entry = await getEntry('course-weeks', 'week-01');
<!-- src/pages/forged-fitness/resources/baseline.astro -->
const entry = await getEntry('course-resources', 'baseline');
```

### Architecture notes (positive)

- `source_site_url` on both new schemas is exactly the right provenance field for a
  migration period. `printable` on the resource schema is forward-looking.
- `CoursePage.astro` is clean and reusable for all 12 weeks.
- The collaboration notes (`README.md`, `codex-notes.md`, `decisions.md`) are
  well-scoped: limited claim, explicit non-migration of the remaining content,
  no private records touched.

### Open questions for the owner

1. ~~Who applies the two fixes?~~ Resolved: both agents fixed them independently;
   final state is Muse's branch to maintain (owner direction, 2026-09-29).
2. ~~Print stylesheet scope?~~ Resolved: Codex added a print treatment in
   `474b999`; it is in the branch and verified in rendered output.

## 2026-09-29 — Muse (follow-up: review of 474b999 + race incident)

### Review of Codex commit 474b999 ("Fix Astro course spike build paths and print output")

Correct and complete. It applies both build fixes (baseline import path,
kebab-case collection keys with quoted export keys, updated type and `getEntry`
call sites — identical to the fixes I had verified locally) and adds a focused
print treatment to `CoursePage.astro`: hides site header/footer, the provenance
source link, and maturity badges in print; full-width main; black body text;
worksheet tables kept together with `break-inside: avoid`. `codex-notes.md`
documents the change accurately. No issues found.

### Race incident (my error)

My fix commit `1bc9c5c` was built from the pre-`474b999` tree. Codex pushed
`474b999` first; my push landed on top and overwrote `src/layouts/CoursePage.astro`
and `src/content.config.ts` with my older versions, deleting Codex's print
stylesheet. Failure mode: I pushed without re-reading the branch tip — a
lost-update race against a concurrent pusher, on a branch I knew Codex was
actively working.

Fixed in `f5e2834`: restored Codex's `<style>` block verbatim from `474b999`,
verified with a fresh `npm install` + `astro build` before pushing (6 pages,
no errors, `@media print` present in rendered worksheet HTML).
Lesson for this collaboration: on a shared branch, read the tip immediately
before every push; the file API is not atomic against concurrent pushes.

### Current branch state

Tip `f5e2834` contains: the spike, both build fixes, the print stylesheet, and
these review notes. `main` and production are untouched. Per owner direction,
Muse owns `codex/astro-migration-spike` from here; Codex has stood down from it.

## Review template

### YYYY-MM-DD — Muse

- Commit or branch reviewed:
- Build result:
- Content fidelity:
- URL and navigation result:
- Print/worksheet result:
- Recommendation:
- Confidence:
