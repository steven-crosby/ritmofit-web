# Apple Music natural-boundary handoff — 2026-10-04

Codex close-session handoff. **Playback acceptance failed on the deployed #488 release.**
Start with the repository's [start-session prompt](../../../agent-prompts/daily/start-session.md).
This handoff preserves evidence and proposes a fix; it does not authorize new source edits,
commit, push, PR, merge, deployment, migrations, fixture deletion, or a second work lane.

## Exact restart point

- Checkout: the existing `ritmofit-web` checkout on this Mac; discover and verify its path.
  Do not clone a replacement. At preparation, branch `main` and `origin/main` were
  `7c69786caf5631fca9d57c02e98c27e31c0345e2`, with only unrelated untracked `.claude/`.
  Preserve `.claude/launch.json`; its SHA-256 is
  `aa68ce26e1c51861e853ba12d4753f0c2e784c1154c60ed4fb65289d13007ca0`.
- [PR #488](https://github.com/steven-crosby/ritmofit-web/pull/488) was squash-merged.
  Reviewed head was `bdebd0348a2b16e6143d8b39599df9ccbacd88b1`; the merged tree
  matched it exactly. Local/remote `codex/apple-music-natural-boundary` were deleted.
  A verified Mac-local recovery bundle preserves the reviewed branch; no published
  history was rewritten. No open PRs remained when this handoff was prepared.
- Deployed source: `7c69786caf5631fca9d57c02e98c27e31c0345e2`.
  Worker `18fe76cd-5273-4cd0-beae-d01b0a307693` served 100%, SPA
  `assets/index-CFcewXzm.js`. Remote D1 had no pending migrations.
  Prior live Worker `1053f665-ebf1-4d8c-be40-16ddfdea908f` is the rollback reference;
  no rollback was performed.
- Handoff/history changes are documentation only. After their publication, `main` may
  be ahead of the deployed source by documentation alone. Recheck live GitHub and
  Worker/SPA authority; do not infer a new application deploy from a docs merge.

## First actions for the next agent

1. Read `AGENTS.md`; verify checkout, branch, status, upstream, and open PRs. Fetch
   origin. Do not stash, reset, discard, or include unrelated work.
2. Read this handoff, [evidence notes](./evidence/README.md), the newest
   [HISTORY entry](../../../ritmofit_dev_plan/HISTORY.md), and the current focus in
   [DEVELOPMENT_PLAN](../../../ritmofit_dev_plan/DEVELOPMENT_PLAN.md).
3. Inspect `apps/web/src/lib/playback/apple-music-adapter.ts`, its test file, and
   `runtime.ts`. Current line numbers are clues, not a stable contract.
4. Propose one narrow regression-backed fix for the P1 below and wait for Steven's
   approval before implementation. Expected source scope is only the Apple adapter
   and its tests. Leave `runtime.ts` and the strict finished-end tolerance unchanged.
5. After approval, add meaningful failing regressions, fix endpoint retention, run
   focused tests and the full gate, and perform an adversarial review. Publication,
   merge, deployment, and production fixture deletion remain separate approvals.
6. After an approved deploy, repeat complete natural Cycle/Pilates runs sequentially
   through all tracks and final completion, with human listening confirmation. Do not
   seek, skip, pause, retry, shorten songs, or switch to prompter-only to claim an
   uninterrupted pass. A failed run is a failed acceptance result.

## What #488 changed and what remains wrong

#488 changed only `apple-music-adapter.ts` and `apple-music-adapter.test.ts`.
It synchronously reads provider state/position, retains the actual endpoint across
MusicKit queue teardown, clears endpoint evidence on prepare/play/seek/stop/destroy,
and guards event handling by singleton ownership. It never substitutes the full
source duration for the observed playhead. The ten new regressions and full local
and remote gates passed.

**Remaining P1: a zero-position paused read overwrites the valid endpoint before ended.**
At preparation, `captureTransport` lines 309–310 assigned `lastPositionMs` for every
nonnegative playing or paused reading. MusicKit can reset time to zero and emit an
additional paused event before ended. That zero replaces the real endpoint, and
ended then latches zero. The runtime correctly rejects that zero as genuinely short
under its existing contract, holding the teaching position and exposing recovery.

The actual Pilates sequence was:

```text
paused(3): time 223, duration 223
seeking(6): time 0, duration 223
paused(3): time 0, duration 223
ended(5): time 0, duration 0
stopped(4), completed(10), stopped(4): time 0, duration 0
```

A temporary numeric getter observer preserved the original getter's return values
and captured `captureTransport` reading zero from the second paused callback in
served `registry-DGeaYbDD.js`. This is real browser evidence. The wrapper was
restored and removed after the failed run. A separate synthetic reproduction
using the unchanged merged adapter showed both a paused poll after zero reset and
this second paused callback overwrite 221000 with zero; the no-overwrite control
retained 221000. That reproduction is supporting evidence, not natural acceptance.

Suggested coverage: the observed positive-paused → zero-seeking → zero-paused →
zero-ended ordering, polling during reset, next/final track, genuinely early finish,
unknown endpoint, explicit seek-to-zero, seek-back, replay/retry, clipped windows,
singleton ownership, and exact-one-second mismatch. Do not replace the latest
endpoint with a high-water maximum or weaken the runtime guard to hide the bug.

## Verification and limits

- All 12 canonical local checks passed on exact merged source: 1,538 unit tests and
  184 API integration tests, formatting, typecheck, lint, design-system verify,
  theme classes, build, OpenAPI/no-diff, contract parity, and audit.
- [Main CI](https://github.com/steven-crosby/ritmofit-web/actions/runs/37234524900)
  passed on exact `7c69786caf5631fca9d57c02e98c27e31c0345e2`.
- Worker 100% and three consecutive cache-busted SPA responses independently
  matched the release; entry bytes matched the local build. SPA/health, protected
  and mounted routes, and six security headers passed. Beta allowlist presence was
  checked by secret name only. No schema/API/configuration/secret change or migration.
- Cycle: first three natural transitions passed; Telephone's fourth natural end
  failed at class `16:30`. SDK reached 221 seconds; saved duration was 220537 ms.
  The run held teaching time with the early-end error. Later tracks/final completion
  remain unverified. Its exact internal overwrite path was not instrumented.
- Pilates: first natural end failed at `3:43`; the second paused-at-zero callback
  and adapter read above were observed. Later tracks/final completion unverified.
- During each observed run, the only recorded button input was Start class.
  No operator pause/seek/skip/reset/retry occurred before failure.
- Audible confirmation was requested but not received. SDK progress is not a
  listening confirmation. Neither full uninterrupted discipline passed.
- Prior Live zoom release #486 passed real Chrome 200% desktop layout/recovery
  checks; #488 did not change Live UI. That prior layout evidence is separate from
  these provider acceptance failures.

## Retained production fixtures and cleanup

All three are named `[QA]` and tagged `qa-fixture`; none were deleted. Pending
fixture deletion is handed to Steven under the production fixture hygiene runbook.
Do not silently reuse these as a fresh verification pass or delete other classes.

| Fixture                                          | ID                                     | Purpose                                           |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------- |
| `[QA] Apple boundary trace 2026-10-04 Cycle`     | `8eba970c-a742-4d25-9c77-befd1744b9bc` | Earlier baseline / local-build boundary diagnosis |
| `[QA] Apple boundary release 2026-10-04 Cycle`   | `6d012025-0236-487d-94b2-1ed597ec8eab` | Deployed natural run; failed on Telephone         |
| `[QA] Apple boundary release 2026-10-04 Pilates` | `39c679c0-597f-4fbe-a18d-193a080cb76c` | Deployed natural run; first-end reset confirmed   |

The release fixtures were fresh duplicates of existing tagged, runnable QA classes
and renamed immediately. They retained ten original source songs, durations, order,
and authored teaching details. No clipping, duration override, assignment, or
readiness change was used to make playback pass. Manual QA cues are not evidence of
an automatic teaching-draft implementation.

Both observers were removed, the original MusicKit getter restored, playback
stopped, and Live exited. The local evidence server and export tab were closed.
The normal production Pilates Builder remained open. No diagnostic override or
local Live build remains mounted.

## No-go actions

- Desktop Chrome, Apple Music, Cycle/Pilates only. Spotify testing stays paused.
  Do not reopen iPhone/HIIT, SPC-09, provider error-code design, or another lane.
- Do not change teaching drafts, `planLead`, `planNextStep`, home `teachable`, the
  Run-live gate, or song assignment. Empty blocks still disable Run live.
- Do not edit LiveTimeline, LiveMode, Dashboard, provider adapters other than Apple,
  shared schemas, OpenAPI, or the design system for this follow-up.
- Never obtain, cache, download, proxy, decode, analyze, or modify provider audio.
- Never check out/merge the corrupt Cursor branch tips
  `28b18c13cd54907325a5f964e7bcbf13c5ed76c6` or
  `c60ce283d92067a34ccb40a6960e4eb8bcf8aa38`. Those remote branches were deleted.
  The Live fix already reached main via #486; do not reapply the original patch.
- No new fix or implementation approval was granted after this finding. This
  close-session request authorizes preserving the handoff, not the proposed fix.

The broader playlist-derived teaching draft and creation-policy decision remains
later work, recorded in the [original audit guide](../playlist-to-live-2026-10-03/NEXT_SESSION.md).
Do not resume its stale restart SHA or repeat completed zoom/boundary release steps.
