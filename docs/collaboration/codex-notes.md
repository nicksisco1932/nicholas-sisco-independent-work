# Codex notes

## 2026-09-29 — Astro migration spike

- Branch: codex/astro-migration-spike
- Added typed courseWeeks and courseResources collections.
- Added reusable CoursePage.astro layout.
- Ported production Week 01 as three lesson sections.
- Ported the Baseline & weekly reflection worksheet.
- Preserved the production course URLs in Astro's file build format.
- Added a restrained homepage card and primary navigation link.
- No changes were made to the ChatGPT Sites production repository.

The port is deliberately limited. It does not claim that Astro is yet canonical and does not migrate the remaining 11 weeks, 5 worksheets, starter program, or Molecular Physiology atlas.

## 2026-09-29 — Review fixes

- Fast-forwarded Muse's review commit 9f97816.
- Corrected the baseline page's relative layout import.
- Aligned Astro collection keys with the kebab-case content directories.
- Updated the collection type and getEntry call sites.
- Added a focused print treatment for course pages: hide site chrome and provenance link, use the full printable width, and keep worksheet tables together.

### Decisions recorded from Muse's review

- Codex applies and pushes implementation fixes; Muse reviews the resulting commit and maintains the repository afterward.
- Worksheet print styling is in scope for this spike because the worksheet is one of the demonstrated deliverables.
