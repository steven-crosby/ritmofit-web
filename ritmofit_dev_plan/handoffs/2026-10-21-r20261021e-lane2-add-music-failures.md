---
date: 2026-10-22
tool: Cursor (cloud)
lane: lane-2-add-music-failures
branch: cursor/r20261021e-lane2-add-music-failures
head: 6b2add1736d2462791c138dc3ea1b178694f9992
base: d1236b0bd3d1623dfb01934145b33471e8fb97f9
prs: ['#544 (draft)']
status: open
---

# Blank Add-music failures show a sentence; draft #544 is not merged

## Done

- `TrackSearch` stores blank failures through `errMessage`. Likes reauth and
  playlist-index reauth use it on that arm only. Drill-in, add, and playlist
  URL import use it. `{ error: null }` from `runOrderedImport` still clears
  the alert. A returned string, including `""`, displays through `errMessage`.
- Draft [#544](https://github.com/steven-crosby/ritmofit-web/pull/544) on
  `cursor/r20261021e-lane2-add-music-failures`. Not merged. Not deployed.
- Chrome evidence:
  `docs/audits/ui-ux-r20261021e/lane2-add-music-failures/`.

## In flight

- Draft #544. The orchestrator merges. This lane does not.

## Next action

Review draft #544 and merge it with the round when the other lane is ready.
Do not deploy from this lane.

## Blockers and owner decisions

- Live finish-control wording. Open. Not this lane.
- NotFound/ErrorBoundary `rf-hero-glow` warmth. Open. Not this lane.

## Verification

- Run: focused `TrackSearch.test.tsx` (74) and `TrackSearch.recovery.test.tsx`
  (9) passed. The blank cases failed on `d1236b0` before the store change.
  CI-equivalent gate passed: format, typecheck, lint, design-system verify,
  theme-classes, unit tests (web 1251, api 486, music 30), Worker/D1
  integration 196, web build, OpenAPI no drift, contract-parity, `audit:ci`
  (1 low and 1 moderate, both ignored).
- Chrome at 1440×1000 on Add a track: idle search, and a failed search showing
  `Couldn’t search SoundCloud right now. Try again.`
- Skipped: merge, deploy, production fetch. 390 and native 200% are
  `NOT_ASSESSED`.

## Production as observed

- Not checked from this environment.

## Shared zones touched

- none

## Notes for other lanes / iOS

- `ordered-import.ts`, `Dashboard.tsx`, `errors.ts`, and line 1051 are
  untouched. No schema, API, or OpenAPI change. iOS is unaffected.
