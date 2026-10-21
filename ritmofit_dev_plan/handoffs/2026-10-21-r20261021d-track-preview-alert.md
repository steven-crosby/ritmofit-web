---
date: 2026-10-21
tool: Cursor (cloud)
lane: lane-r20261021d-track-preview-alert
branch: cursor/r20261021d-track-preview-alert
head: 6a42408d8374b14ee35fe0522bd16b5bab790f14
base: 2914253833cf28761d23d2dfa3a0b0aa02b5bd3d
prs: ['#540 (draft)']
status: open
---

# Track preview alerts show a sentence when the error message is blank

## Done

- Product commit `d6d0983` on
  [#540](https://github.com/steven-crosby/ritmofit-web/pull/540) (draft).
  `TrackPreview` sends the connections catch, the preview-interrupt line, and
  the resolve search and attach catches through existing `errMessage`.
  `new Error('')` and a non-Error show a fallback in the alert. A normal
  `Error` message stays.
- An empty string is not stored as a connections failure. The catch stores
  `errMessage`'s sentence, and the unverified chip reads that non-empty
  string. A loaded connection does not flip the chip.
- Evidence commit `6a42408`:
  `docs/audits/ui-ux-r20261021d/track-preview-alert/`.
- Did not edit `errors.ts`, `lib/playback/preview.ts`, `lib/playback/runtime.ts`,
  `Dashboard.tsx`, `ClassSummaryView.tsx`, `SegmentBand.tsx`, `TrackSearch.tsx`,
  `ordered-import.ts`, `ShareDialog.tsx`, LiveMode, styles, tokens, or
  `packages/shared`. No schema, API, or OpenAPI change. Did not merge. Did not
  deploy.

## In flight

- [#540](https://github.com/steven-crosby/ritmofit-web/pull/540) is a draft on
  `cursor/r20261021d-track-preview-alert`. It is not merged.

## Next action

Orchestrator: leave #540 open until its CI is green, then merge it in the
round train. Do not merge it from this lane. Do not deploy.

## Blockers and owner decisions

- None for this slice.
- Still owner decisions, untouched here: Live finish control wording,
  placement, style, and confirm; NotFound/ErrorBoundary warmth.

## Verification

- Run: `TrackPreview.test.tsx` passed 22/22. CI-equivalent gate passed
  2026-10-21 22:40:26Z–22:42:17Z (format, typecheck, lint, design-system
  verify, theme-classes, root tests music 30 / web 1233 / api 486,
  integration 196, web build, OpenAPI no diff, contract parity, audit:ci).
  Local Chrome at 1440 and 390 showed “Preview interrupted” and
  “Something went wrong.” for `new Error('')`, and “Could not start
  "Titanium".” for a non-Error. No `role="alert"` was blank. No page errors.
  `git grep` of `(e as Error).message` in `TrackPreview.tsx` is empty.
- Skipped: native 200% zoom (NOT_ASSESSED). Production was not checked.
  No provider audio or screen-reader acceptance.

## Production as observed

- `main` vs production: not checked from this environment.
- Evidence: not checked from this environment. Lane mode does not deploy.

## Shared zones touched

- None. No shared schema, OpenAPI, route, migration, authz, `errors.ts`,
  `Dashboard.tsx`, playback helper, or styles edit.

## Notes for other lanes / iOS

- Web preview copy only. No shared contract change. iOS is unaffected.
- Branched from `2914253`. This lane did not edit HISTORY or DEVELOPMENT_PLAN.
- `SegmentBand.tsx`, `TrackSearch.tsx`, `ordered-import.ts`, and
  `ShareDialog.tsx` were not this lane.
