---
date: 2026-10-30
tool: Claude Code (local subagent, worktree)
lane: lane-apple-hardening
branch: fix/rf-108-apple-hardening
head: fe6a1d1
base: 5dd324a
prs: ['#668 (open, owner-gated)']
status: open
---

# Apple Music Live waits out cancelled starts; Start timing is instrumented

## Done

- PR [#668](https://github.com/steven-crosby/ritmofit-web/pull/668): SDK leases and the bounded
  settle wait in `apps/web/src/lib/playback/`, the held-error attempt token, RF-147's FairPlay
  cleanup in `apps/web/src/lib/musickit.ts`, and debug-only Start timing
  (`apps/web/src/lib/playback/start-timing.ts`).
- Records: RF-108 and RF-128 set to For review, RF-147 Blocked (now depends on RF-108), RF-158
  created in Backlog for the Spotify half, RF-121 cites #668 for criterion 0.

## Tasks

- [RF-108](../tasks/RF-108.json), [RF-128](../tasks/RF-128.json), [RF-147](../tasks/RF-147.json),
  [RF-158](../tasks/RF-158.json), [RF-121](../tasks/RF-121.json).

## In flight

- #668 is waiting for the owner's `owner-approved` label. Lane sessions never merge it; a Solo or
  Orchestrator session runs the final review and merge after approval.

## Restart context

- Device check owed after merge and deploy (the steps are in RF-108's next action and the PR body).
  It is the only proof of the change: CI uses fake MusicKit.
- Judgment calls flagged in the PR: when the bound passes, a cancelled setQueue is superseded (the
  new start goes ahead) but a cancelled play() fails with a clear error and releases its lock. The
  `com.apple.fps` probe stays on legacy desktop WebKit as a console diagnostic only. The adversarial
  test "refuses a replacement until it settles" now expects the replacement to wait instead.
- The nowPlayingItem check treats an item with no id as unknown and does not re-cue. If iPhone
  timing lines show `re-cue-before-play` on every play, MusicKit's item ids differ from Ritmo's
  catalog ids and the comparison needs another look.
- 2026-10-30: the final review of 01dc417 found ten items (five significant). All were fixed in
  05ad7ea on the same PR, with tests that fail on 01dc417. Finding 10 conflicts with RF-147
  criterion 3's wording; it is an owner decision in RF-147.
- 2026-10-30: the second final review (6595d3f) rejected the automatic mid-track re-cue. Owner
  decision (option 1): a late settle after start shows Retry (`late-settle-error` in the timing
  lines) and never auto-plays; while paused it is recorded and the next play re-cues. Fixed with
  the other second-review items in fe6a1d1. The device run should note whether a "switched away
  from" banner ever appears.

## Verification

- Run: see the PR body for the full local gate result, e2e included (Playwright Chromium r1248
  was installed by the owner on 2026-10-30).

## Production as observed

- Not checked from this environment.

## Shared zones touched

- None (no shared schemas, OpenAPI, routes, migrations or auth helpers). The optional
  `whenIdle()` was added to the web-only `PlaybackAdapter` contract in `playback/types.ts`.

## Notes for other lanes / iOS

- None. No API, contract or token change.
