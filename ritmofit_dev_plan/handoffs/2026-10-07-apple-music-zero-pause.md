---
date: 2026-10-07
tool: Cursor (cloud)
lane: solo
branch: cursor/apple-music-zero-pause-endpoint-0d91
head: a1a00c6fb2ceed45fbff150a7eb3709a938efda0
base: 4ff8a7661a32f920d2bbaa6f60d4b1b56e010ff6
prs: ['#494 (draft)']
status: open
---

# Apple Music zero-pause endpoint cache; draft PR, not merged

## Done

- Confirmed the P1 in `captureTransport`: a paused or playing reading of `0` replaced `lastPositionMs`, so `ended` latched 0. Fix caches only `positionMs > 0`.
- Draft [PR #494](https://github.com/steven-crosby/ritmofit-web/pull/494). Adapter and its test file only. `runtime.ts` is untouched, including `ENDPOINT_TOLERANCE_MS`.
- New regressions failed on `4ff8a76` and passed after `a1a00c6`. Full local gate passed (see Verification).

## In flight

- #494 is a draft for owner review. Not merged, not deployed, not marked ready.

## Next action

Steven reviews #494. Merge, deploy, and natural Cycle/Pilates acceptance stay separate approvals. After an approved release, repeat uninterrupted desktop Chrome Cycle and Pilates runs with listening confirmation. Do not seek, skip, pause, or shorten songs to claim a pass.

On merge, update `DEVELOPMENT_PLAN.md` "Now" and `docs/audits/README.md` (that index still says the fix is not yet proposed). Do not retire `2026-10-06-docs-workflow.md`; its iOS handoff port is still open and only its author edits it.

## Blockers and owner decisions

- Owner review of #494 before merge or deploy.
- Playlist-derived teaching-draft policy, playback-liveness alerting, and `[QA]` fixture cleanup stay as already recorded. The three 2026-10-04 Apple boundary fixtures were not deleted.

## Verification

- Before the fix, focused Vitest (`apple-music-adapter.test.ts`): 5 failed, 36 passed. The five failures were the production pause-at-zero event (ended at 0, not 223000), the paused-at-zero poll (same), a 30s playhead through that same reset (ended at 0, not 30000), and the coordinator cases for next track (`error` vs `buffering`) and final track (`error` vs `ended`).
- After the fix, that file: 41 passed.
- Full local gate on `a1a00c6`, all passed: format, typecheck, lint, design-system verify, theme-classes, unit tests (music 30, web 1047, api 466), API integration 184, web build, OpenAPI regenerate with no diff, contract parity, `pnpm audit:ci` (2 ignored advisories: 1 low, 1 moderate).

## Production as observed

- Not checked from this environment. No deploy. Last recorded production remains the #488 release (Worker `18fe76cd-5273-4cd0-beae-d01b0a307693`, SPA `assets/index-CFcewXzm.js`). This branch is not on `main`.

## Shared zones touched

- None. No schema, OpenAPI, route, migration, authz, or Live UI edits.

## Notes for other lanes / iOS

- The finished position is still the last positive observed playhead, never catalog duration. A genuine short end still reports that short position, and the runtime's early-end guard is unchanged.
- A live poll while paused at 0 still returns `0`. Only the endpoint cache ignores it. Explicit seek to zero, stop, and replay still clear the cache.
- `transportState` already maps MusicKit `stopped` to `paused`, so a zero stopped reading before `ended` uses the same rule. Production `stopped` events were after `ended` and stay behind the finished latch.
