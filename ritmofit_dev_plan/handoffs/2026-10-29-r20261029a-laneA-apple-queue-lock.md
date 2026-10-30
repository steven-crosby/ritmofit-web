---
date: 2026-10-29
tool: Claude Code (local)
lane: lane-A-apple-queue-lock
branch: fix/rf-123-apple-queue-lock
head: 145b2b9
base: 4206c8c
prs: ['#664 (open, ready, owner-gated)']
status: open
---

# Lane A: Apple Music queue lock released on setQueue timeout (RF-123), PR #664 awaiting the owner

## Done

- [#664](https://github.com/steven-crosby/ritmofit-web/pull/664): `setQueue()` in
  `apps/web/src/lib/playback/apple-music-adapter.ts` releases this generation's
  `pendingQueueGenerations` entry when its timeout fires, plus the regression test in
  `apple-music-adapter.test.ts`. The test commit (23ae109) precedes the fix commit (145b2b9).

## Tasks

- [RF-123](../tasks/RF-123.json): final state is set in #664.

## In flight

- #664 is open with `ready-to-merge` and `needs-owner`. It needs `owner-approved` from the owner and
  the orchestrator's merge train. The lane does not merge it.
- #656 (`fix/rf-124-resume-in-place`) was not touched. By owner decision on 2026-10-29, the
  orchestrator closes it as superseded by #664.

## Restart context

- Owner decision on 2026-10-29: new branch and PR instead of force-pushing #656. It is recorded as
  RF-123 evidence.
- `destroy()` was left unchanged on purpose. The timeout timer still fires after `destroy()`, so the
  lock is released within `prepareTimeoutMs`. Clearing it in `destroy()` would let queue requests
  overlap and would break the existing test "rejects an overlapping queue request while an older one
  is still pending".
- Late-settle trade-off: a hung `setQueue` that settles after the retry's can leave MusicKit's own
  queue holding the late request (the same song for Retry). The generation guard rejects its
  result. A `nowPlayingItem` check before play would belong to RF-147/RF-108, not here.
- Owed after deploy: the owner's iPhone Safari check. Make `setQueue` hang, Retry playback without a
  reload, and confirm no "still finishing a previous queue request".

## Verification

- Targeted test: failed without the fix (1 failed | 60 passed, "still finishing a previous queue
  request"), passed with it (61 passed).
- Local CI-equivalent gate, run under the shared gate lock: format, owner-gate/rf-trace/tasks tests,
  tasks:check, `-r typecheck`, lint, design-system verify, theme-classes (selftest and check), `pnpm test`
  (web 1535, api 572, music 30), api integration (239), web build, openapi diff, contract-parity
  and `audit:ci` all passed.
- Skipped locally: e2e. Playwright's Chromium headless shell (build 1248) is not installed on this
  machine, and installing it needs a download approval. The required CI e2e step covers it.

## Production as observed

- Not checked from this environment.

## Shared zones touched

- None.

## Notes for other lanes / iOS

- None. Web SPA only, with no contract change.
