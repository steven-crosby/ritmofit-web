---
date: 2026-10-28
tool: Claude Code (local)
lane: lane-2-builder-save-times
branch: fix/rf-90-builder-save-times
head: HEADSHA
base: 9166826
prs: ['#650 (open, review round 2 fixes pushed, needs fresh merge permission)']
status: open
---

# Builder saves keep stored cue, move and section times (RF-90, Codex packet 1)

## Done

- [#650](https://github.com/steven-crosby/ritmofit-web/pull/650): the Codex B-1, B-2 and B-3 repros were
  ported as regression tests and committed red first (`906885c`). The fix landed in `d8241dd`.
- Cue, placed-move and section inline edits omit the time field unless the instructor changed the
  clock text. A deliberate edit still snaps.
- The track inspector re-seeds an untouched "Start at" when `startOffsetMs` changes underneath it,
  and sends `startOffsetMs` only when that field was edited.
- `CuesSection` / `MovesSection` take a `syncKey` (the run payload's cues/moves for the track) and
  reload when it changes.
- The `updateClassTrackSchema` JSDoc in `packages/shared/src/entities/classes.ts` was corrected
  (comment only, approved by the orchestrator).
- The orchestrator's final review at `4a173d2` found two correctness bugs, and it is not merged.
  The fixes have red-first tests (`495df74`):
  - **Start at:** the inspector now sends and keeps the field only while it holds unsaved typed
    text. A successful save hands the field back to the stored start, so `01:05` and a
    server-clamped start re-seed instead of reviving B-1.
  - **Cue and move rows:** an edit row kept open across a save moves its seed to the saved clock,
    so typing the pre-save value back is sent.
  - **syncKey:** it now also reloads on undefined → defined.
- A second review at `9589b61` found a third variant of the same bug: stored 3:20, type `3:2` then
  `3:20`, drag to 4:10, and a notes save reverted the drag. The Start at keystroke flag was replaced
  by one value rule (tests red first in `88779a3`):
  - The field re-seeds while it parses to the previous stored start.
  - Only a value that differs from the current stored start is sent.
  - After a save, the field shows the start the server stored, including one clamped back to the
    unchanged value.
  - An explicit `0:00` over a stored 0 is therefore no longer sent. The existing `Dashboard.test.tsx`
    "accepts explicit 0:00" case now asserts that for Start at.

## Tasks

- [RF-90](../tasks/RF-90.json): Done in #650.
- [RF-119](../tasks/RF-119.json): new Backlog follow-up. The inspector's Clip start and Downbeat
  fields have the same seed-once shape that caused B-1, but nothing outside the inspector is known
  to move them, so this was not reproduced.
- [RF-120](../tasks/RF-120.json): new Backlog task for the review's non-significant findings:
  near-end rounded validation, the double reload, `JSON.stringify` on render, and one shared
  untouched-field helper.

## In flight

- #650 is open for the orchestrator's merge train. It needs a fresh merge permission on the new
  head. A Lane never merges.

## Restart context

- On `dc8e72a` both Codex repros ran unmodified and failed 5 of 5, with PATCH values 9844, 13000,
  242000, 60000 and 10000.
- Two existing `Dashboard.test.tsx` cases pinned the old behaviour, where a notes-only save re-sent
  `startOffsetMs`. Both now assert that the field is absent:
  - "preserves untouched … inspector anchors"
  - "keeps blank inspector anchors at zero"
- Lane 1 also regenerates `ritmofit_dev_plan/tasks.md`. Whichever PR merges second rebases and
  re-runs `pnpm tasks:render`. Never hand-merge the board.

## Verification

- Run: the full CI-equivalent gate from `AGENTS.md`, with e2e on `E2E_PORT=8799`. Results are in
  #650's body.
- The changed paths were checked against `GATES` in `scripts/owner-gate.mjs`, and none is gated.
- Skipped: a manual browser pass. CI's `e2e-screenshots` covers the builder surface. The repros
  run in jsdom.

## Production as observed

- Not checked from this environment. #650 is not deployed.

## Shared zones touched

- `packages/shared/src/entities/classes.ts`: one JSDoc comment, no schema change. OpenAPI
  regeneration showed no diff.
- `Dashboard.tsx`: only the track inspector and its CuesSection/MovesSection call sites.

## Notes for other lanes / iOS

- No contract change. The web client now omits unchanged time fields on PATCH, which the
  `.partial()` update schemas already allowed.
- If the iOS builder re-sends rounded clock values on unrelated edits, it has the same bug.
