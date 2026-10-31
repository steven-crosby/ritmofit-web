---
date: 2026-10-30
tool: Claude Code (local subagent, worktree)
lane: lane-apple-hardening
branch: fix/rf-108-apple-hardening
head: 62042da
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
  created in Backlog for the Spotify half, RF-159 created in Backlog for late-settle detection,
  RF-121 cites #668 for criterion 0.

## Tasks

- [RF-108](../tasks/RF-108.json), [RF-128](../tasks/RF-128.json), [RF-147](../tasks/RF-147.json),
  [RF-158](../tasks/RF-158.json), [RF-159](../tasks/RF-159.json), [RF-121](../tasks/RF-121.json).

## In flight

- #668 is waiting for the owner's `owner-approved` label. Lane sessions never merge it; a Solo or
  Orchestrator session runs the final review and merge after approval.

## Restart context

- Device check owed after merge and deploy (the steps are in RF-108's next action and the PR body).
  It is the only proof of the change: CI uses fake MusicKit.
- Judgment calls flagged in the PR: once the 3 s bound passes, a cancelled setQueue is superseded
  and the new start goes ahead. A cancelled play() keeps its lease until MusicKit settles it. The
  first request past the bound fails with "did not finish a cancelled play request". Each Retry
  stops the play and waits one more bound; if it is still pending, Retry fails with "still finishing
  the previous song". The `com.apple.fps` probe stays on legacy desktop WebKit as a console
  diagnostic only. The adversarial test "refuses a replacement until it settles" now expects the
  replacement to wait instead.
- 2026-10-30: three final review rounds (01dc417, 6595d3f, d78067c). After the third, the owner
  chose option 1 and narrowed the PR (62042da). Late-settle detection is removed, as is the
  once-per-page FairPlay clear (the per-call clear the passing iPhone runs used is back). Both moved
  to RF-159. The owner accepted the strict desktop Chrome test for RF-147.

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
