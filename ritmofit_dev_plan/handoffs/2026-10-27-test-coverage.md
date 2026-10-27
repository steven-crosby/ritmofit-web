---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/missing-test-coverage-1ea2
head: ad8cc82c7fe46870cd8f437a8e5f384c98c483a0
base: 10bea01cb65e75e546e01acb228a5a277e494db8
prs: ['#625']
status: open
---

# Regression tests for delete shares, view-open, and live sign-out

## Done

- Added tests only. No production behavior change.
- `#625` covers class-delete share cleanup, a view share stamping `lastOpenedAt`, Sign out during Live, the next-cue offset, readiness labels, Spotify allowlist precedence, and an unreadable Spotify 403 body.

## In flight

- `#625` (`cursor/missing-test-coverage-1ea2`) is open for review and is not merged.

## Next action

Review and merge `#625` if CI is green. Nothing else is owed on this branch.

## Blockers and owner decisions

- None.

## Verification

- Run: web vitest for `App`, `LiveMode`, `library-shell`, and `music-library` — 162 passed. API `spotify.test.ts` — 41 passed. API integration `class-delete` and `class-opened` — 4 passed. `tsc --noEmit` for web and api — passed.
- Skipped: full root gate (repo-wide format, lint, root `pnpm test`, web build, OpenAPI, contract-parity, `pnpm audit:ci`). Edits are tests only.

## Production as observed

- `main` vs production: not checked from this environment.
- Evidence: not checked from this environment.

## Shared zones touched

- none

## Notes for other lanes / iOS

- none
