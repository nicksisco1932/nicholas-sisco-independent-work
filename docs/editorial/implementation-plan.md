# Code-only editorial implementation plan

Baseline: bf7454aa48e69cfa7ce0828ae9c0332500db576e. Repository ID 1396449686. Public repository. FIR-34 historical unmerged checkpoint superseded by current GitHub main. No AGENTS.md tracked. Isolated fresh clone and branch codex/phone-editorial-review.

Approved specification: full phone-first editorial packet supplied in task. Preserve all src/ and public/ content and scripts/site-routes.json. No localhost retry, hosting operations, account/settings changes, credentials, DNS, merge, deployment or costs.

1. Package deterministic inert site assets with independently checked hashes, bounded safe extraction, strict provenance and release guards. Unit/adversarial tests first.
2. Secret-free same-repository PR/main candidate build; trusted preview and exact-byte production promotion workflow. Privileged jobs have literal false job guards until a separately reviewed activation PR. No old secret names. Preserve separate manual Pages operation.
3. Add phone instructions, receipt templates, redacted setup checklist and precise untested infrastructure gates.
4. Run baseline and final Node 24 validation, root and legacy builds, diff hygiene, pinned Wrangler command help. Independent fresh reviewer of whole diff, fix scoped findings with regression tests.
5. Commit/push dedicated review branch, open focused draft PR, await terminal CI, verify remote final SHA and synthetic/standalone source identity. Do not merge.

Shared interfaces: scripts/editorial-candidate.mjs exports packaging/manifest functions; scripts/verify-editorial-candidate.mjs exports independent bundle verification and safe extraction; scripts/editorial-control.mjs binds API provenance, protected-environment approval, preview availability and freshness. Workflows run packaging CLI and trusted control script using explicit environment parameters, no candidate-controlled commands.

Activation remains disabled in checked-in policy and literal workflow job guards. A later approved setup must choose exact production origin, Director identity, protected environments, scoped tokens, trusted SHA, and prove Access denial before real assets. Builds using website-v1.invalid are engineering fixtures and cannot be released.

Progress: baseline reconciled; implementation and both 102-page validation configurations pass locally. Independent full review and focused follow-up are complete; all findings are fixed, including the event-queue regression. See engineering-evidence.md. Ubuntu CI must execute the three Windows-skipped Python/symlink tests. Infrastructure/browser/actual-phone acceptance is unperformed.
