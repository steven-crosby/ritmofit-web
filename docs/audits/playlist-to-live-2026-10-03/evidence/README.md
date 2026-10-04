# Evidence notes

This folder supports the [desktop audit](../coverage.md) and
[next-session plan](../NEXT_SESSION.md). Captures describe the October 3 production
release. Files prefixed `prior-` retain October 2 released-build import/recovery
and prompter evidence; they are not newly repeated provider race tests.

The source is the ten-song `Ritmo Apple Music Test` playlist. Class summaries cover
only tagged audit fixtures. Full API run payloads and automation dumps were
reduced to selected evidence fields during full close, after a hash-verified
local backup. Publication copies contain placement order/IDs, duration values,
cue anchors/counts, note lengths, block summaries, and selected transport/error
observations. They omit provider references/art URLs, full authored notes, account
objects, extension stack traces, and full raw production API responses. Local
backup location is not a portable restart dependency.

| Evidence                                                                                             | Use and limit                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `release-identity.json`, `close-reconcile.json`                                                      | Separate Worker and served SPA identity, plus read-only close routes/headers/D1. Application source association comes from the release record and a docs-only source-to-main comparison. |
| `prior-source-playlist.jpg`, `prior-confirmed-source.jpg`, order screenshots, fixture JSON summaries | Source membership/order and retained placements. The real source has no repeated songs; repetition/race guarantees rely on separately recorded release regressions.                      |
| `prior-unconfirmed-import.jpg`, `prior-reload-confirmed.jpg`                                         | Retained committed-response-loss recovery. A direct replay network-body comparison was not retained.                                                                                     |
| `cycle-*checkpoints.jsonl`, `pilates-checkpoints.jsonl`, transport/duration JSON                     | Timestamped selected clock/error and official SDK state/duration evidence. Stale automation transport names are excluded. SDK progress is not listening confirmation.                    |
| `clip-contract.json`, `clip-zero-rejected.jpg`, persistence screenshots                              | Saved playback-window projection and explicit zero rejection; full source window was restored afterward.                                                                                 |
| Template, current/next, long-text, and zoom screenshots                                              | Product behavior, reflow, focus, and manual teaching content. Manual content does not prove automatic generation.                                                                        |
| Completion screenshots and `music-pilates-complete.txt`                                              | Accelerated completion and prompter recovery. No full natural provider completion passed.                                                                                                |
| `console-summary.json`, `console-sanitized.json`                                                     | Bounded capture: 48 extension-context errors, no app/provider console errors in that set. Playback UI errors are still defects.                                                          |
| `creation-timing.json`                                                                               | Agent-paced timing including inspection/QA tagging, not a human usability benchmark.                                                                                                     |
| `SHA256SUMS`                                                                                         | Hashes of publication evidence files, including this note; excludes itself. Check from this directory with `shasum -a 256 -c SHA256SUMS`.                                                |

No provider audio was downloaded or analyzed. Audible success, full uninterrupted
classes, real-provider repeats/concurrent-import failure injection, iPhone,
Spotify, and HIIT are not established by these files. Six tagged QA classes are
retained; deletion remains separately authorized.
