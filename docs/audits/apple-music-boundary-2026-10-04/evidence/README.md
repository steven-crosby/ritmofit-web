# Evidence — Apple Music boundary release, 2026-10-04

This folder preserves public release identity, QA metadata, numeric SDK observations,
visible UI screenshots, and synthetic reproduction output. It contains no audio,
cookies, auth headers, provider/user tokens, secret values, or local credentials.

| File                       | Evidence and limits                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `release.json`             | Exact release source/Worker/SPA, D1 state, cleanup, and failed acceptance. Release snapshot; recheck GitHub for handoff publication at restart.                                                              |
| `local-gate.json`          | All 12 local gate exit codes on exact release source.                                                                                                                                                        |
| `main-ci.json`             | Exact-main CI result and authoritative run URL.                                                                                                                                                              |
| `smoke.json`               | Three consecutive entry matches, served entry byte hash, route statuses, six security headers. Missing-cover 404 reached the real Image not found handler.                                                   |
| `natural-runs.json`        | Fresh Cycle/Pilates class IDs, preserved song order/durations, Start-only actions, UI transitions, final failure UI, and Pilates numeric getter call stacks.                                                 |
| `cycle-transport.jsonl`    | Complete captured SDK state/time/duration series for the failed Cycle run, one-second samples plus state events.                                                                                             |
| `pilates-transport.jsonl`  | Complete captured SDK series for the failed Pilates run.                                                                                                                                                     |
| `cycle-failure.jpg`        | Actual Cycle held teaching position and early-end recovery at 16:30.                                                                                                                                         |
| `pilates-failure.jpg`      | Actual Pilates held teaching position and early-end recovery at 3:43.                                                                                                                                        |
| `endpoint-regression.json` | Synthetic reproduction with the unchanged deployed adapter: control retains endpoint, paused poll and second paused callback overwrite it with zero. Supporting mechanism evidence, not provider acceptance. |
| `SHA256SUMS`               | Exact artifact digests for the handoff and evidence files, excluding this manifest.                                                                                                                          |

`atMs` in transport rows and UI transitions is relative to each run's `startedAt`.
`endpointReads.atMs` is relative to the later wrapper installation; those reads
must not be joined directly to transport rows using the same offset. The getter
wrapper returned the original value unchanged and was removed after diagnosis.

The fourth-end Cycle failure showed a valid endpoint and reset but did not capture
adapter getter calls. The second paused callback is confirmed in the independent
Pilates run; do not overstate Cycle's exact internal event/poll timing.

The run payload excerpts are QA metadata. No song duration, clip, source order,
readiness gate, or assignment was altered. Neither full natural class passed;
no audible confirmation was received. Do not turn green local/CI/deploy evidence
into a successful provider acceptance claim.

Publication is docs-only. No executable reproduction harness, generated build,
Git recovery bundle, temporary server, or local path is part of this folder.
