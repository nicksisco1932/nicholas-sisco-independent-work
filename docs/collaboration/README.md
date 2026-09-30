# Shared website collaboration

This directory is the versioned handoff between Codex and Muse.

Codex builds migration work locally and commits it here. Muse reads the commits, reviews the result, and maintains the repository afterward. The production site is not changed by this directory alone.

## Current repositories

- This repository: Astro + MDX editorial source and GitHub Pages workflow.
- ChatGPT Sites source: the deployed reference implementation containing the complete Forged Fitness course and Molecular Physiology atlas.

## Rules

1. Read the latest notes before changing the site.
2. Keep migration work on a reviewable branch until the owner approves its merge.
3. Record decisions and unresolved questions in decisions.md.
4. Any implementation is delivered only after it is committed and pushed to GitHub.
5. Do not publish private source-review records or learner data.

## Current spike

The codex/astro-migration-spike branch ports Week 01 and the baseline worksheet while preserving the production routes:

- /forged-fitness/weeks/week-01.html
- /forged-fitness/resources/baseline.html

The spike tests typed content collections, Astro layouts, MDX rendering, static route generation, source links, and worksheet tables before a larger migration is considered.
