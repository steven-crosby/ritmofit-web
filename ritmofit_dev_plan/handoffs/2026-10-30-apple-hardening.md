---
date: 2026-10-30
tool: Claude Code (local subagent, worktree)
lane: lane-apple-hardening
branch: n/a (#668 and #669 merged)
head: 0a77110
base: 5dd324a
prs: ['#668 (merged 97f4454)', '#669 (merged 0a77110)']
status: open
---

<!-- Claude Code, 2026-10-31: Updated by the 2026-10-31 docs catch-up (#671) on the owner's brief: timing run done, #669 merged and deployed, next step is the owner's device check. -->

# Apple Music hardening: timing run done, RF-108 queue wait live; owner device check owed

## Done

- [#668](https://github.com/steven-crosby/ritmofit-web/pull/668) merged as `97f4454` and deployed
  2026-10-31 (Worker `ffcf858d`): debug-only playback timing behind `?playback-timing=1` (RF-128)
  and the RF-147 cleanups that need no locks.
- The owner's iPhone Safari timing run on `97f4454` (2026-10-31) is done. Its numbers are in
  HISTORY and RF-108's evidence. It found one timeline tap started two adapters about 60 ms apart.
- [#669](https://github.com/steven-crosby/ritmofit-web/pull/669) merged as `0a77110` and deployed
  2026-10-31 (Worker `61cdeb33`, SPA `assets/index-DTaSHnmL.js`): the double start is fixed at its
  source, a new start waits for a previous queue (bounded 2 s), a pending play is superseded, and
  `play()` is capped at 5 s.
- `wip/rf-108-apple-locks` (`85442ac`) was the pre-redesign lock work. #669 replaced it; it is not
  for merge.

## Tasks

- [RF-108](../tasks/RF-108.json), [RF-128](../tasks/RF-128.json), [RF-147](../tasks/RF-147.json),
  [RF-158](../tasks/RF-158.json), [RF-159](../tasks/RF-159.json), [RF-160](../tasks/RF-160.json),
  [RF-161](../tasks/RF-161.json).

## In flight

- No PR. The owner's device check on production `0a77110` is the next step.

## Restart context

- Owner's 7-step iPhone Safari check from the #669 PR body, with `?playback-timing=1` and Safari
  Web Inspector attached:
  1. Start class once. Audio plays; the log shows `started first-playing-state` at about 0.5–1.2 s.
  2. One timeline tap to track 3, then to track 5. Each tap shows one new `#N prepare` and no
     banner. Hold the timeline about 2 s before lifting: the playhead must not jump back.
  3. Three quick timeline taps within about 4 s end playing the last tapped track, with neither
     "still finishing" message.
  4. Next right after a start (within about 1 s), then Next again later: both switch with no
     banner, and the old song does not resume.
  5. Let one track auto-advance: the next track plays with no banner.
  6. Scrub, pause and resume during a start, and Pause within about 1 s of a start: Pause stays
     paused.
  7. If a banner shows, tap Retry once: it plays within about 2 s with no reload.
  Share the console lines for steps 2–6, then load `?playback-timing=0` to switch the log off.
- Device risk the check covers: overlapping a pending MusicKit `play()` with a new
  `setQueue`/`play` (steps 3–4), and whether WebKit keeps the gesture across the up-to-2 s wait.
- Results go to RF-108 (criteria 3–5), RF-128 (criterion 0 needs a timed Start on 5G) and RF-147.

## Verification

- #669: see its PR body for the local gate. Mock MusicKit only; not audible playback.

## Production as observed

- 2026-10-31: SPA `assets/index-DTaSHnmL.js` on three cache-busted fetches, matching the `0a77110`
  deploy (HISTORY). Worker version not checked from this environment.

## Shared zones touched

- None (no shared schemas, OpenAPI, routes, migrations or auth helpers).

## Notes for other lanes / iOS

- None. No API, contract or token change.
