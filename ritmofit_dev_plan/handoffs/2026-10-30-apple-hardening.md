---
date: 2026-10-30
tool: Claude Code (local subagent, worktree)
lane: lane-apple-hardening
branch: fix/rf-108-apple-hardening
head: 3ea18ca
base: 5dd324a
prs: ['#668 (open, owner-gated)']
status: open
---

# Apple Music timing instrumentation and RF-147 cleanups; RF-108 lock work parked on a branch

## Done

- PR [#668](https://github.com/steven-crosby/ritmofit-web/pull/668), after four final reviews, is
  now only:
  - debug-only playback timing behind `?playback-timing=1` (RF-128);
  - the RF-147 cleanups that need no locks (plain banner, no `com.apple.fps` probe on iOS Safari,
    strict desktop Chrome test).
  - Playback behaviour equals `main` apart from console timing lines.
- The RF-108 lock work (leases, settle wait, hard caps, attempt token, and their tests) is preserved
  on branch `wip/rf-108-apple-locks` at 85442ac. No PR is open for it.
- Records:
  - RF-108 is back in Ready, with its acceptance unchanged.
  - RF-128 and RF-147 are For review.
  - RF-158 (the Spotify half) and RF-159 (late-settle detection and the once-at-load flag clear)
    are new Backlog records.
  - RF-121 and RF-158 were corrected for the revert.

## Tasks

- [RF-108](../tasks/RF-108.json), [RF-128](../tasks/RF-128.json), [RF-147](../tasks/RF-147.json),
  [RF-158](../tasks/RF-158.json), [RF-159](../tasks/RF-159.json), [RF-121](../tasks/RF-121.json).

## In flight

- #668 is waiting for the owner's `owner-approved` label. Lane sessions never merge it; a Solo or
  Orchestrator session runs the final review and merge after approval.
- `wip/rf-108-apple-locks` (85442ac) is parked until the owner's iPhone timing run.

## Restart context

- Owner decision 2026-10-30 (option 1, measure first): merge and deploy #668, have the owner time
  Start and quick taps on the iPhone, then redesign RF-108's locks in a new PR around the real
  numbers.
- The four reviews' findings (in the #668 comments) are the redesign's checklist. These review
  findings stay unmeasured until the timing run:
  - the 3 s queue supersede;
  - the settle wait and lease deadline ending together;
  - the unbounded stop() in play()'s finally;
  - the iOS gesture window;
  - a stuck play's Retry loop.
- Device run after deploy: open `?playback-timing=1` with Safari Web Inspector attached. Then:
  1. tap Start once;
  2. tap three timeline tracks within about 4 s;
  3. tap Next and let one song auto-advance;
  4. copy every `[ritmo apple-music #N] timing` line.
  The `set-queue-end` and `play-end` lines marked `(cancelled adapter)` show how long cancelled
  requests take to finish.

## Verification

- Run: see the PR body for the full local gate result, e2e included (Playwright Chromium r1248
  was installed by the owner on 2026-10-30).

## Production as observed

- Not checked from this environment.

## Shared zones touched

- None (no shared schemas, OpenAPI, routes, migrations or auth helpers).

## Notes for other lanes / iOS

- None. No API, contract or token change.
