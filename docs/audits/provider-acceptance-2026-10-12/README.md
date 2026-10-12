# Provider acceptance — 2026-10-12

Status: all remaining browser/runtime checks completed; human audible acceptance remains partial.
Steven authorized unattended continuation after confirming audible Apple start. No listener was
present for the later hand-over, Exit or SoundCloud transport checks, so UI/SDK success is not
reported as audible acceptance. Production SPA observed: `assets/index-DyruxT0m.js`.

## Results

| Check | Evidence | Result |
| --- | --- | --- |
| Apple 10-track preflight and browser authorization | Owner screenshots/confirmation, enabled Start | Passed |
| Apple audible start | Steven heard Abracadabra and reported advancing clock/no recovery | Human-confirmed audible start |
| Apple current clock | Live track 8, Now teaching, advancing clock; MusicKit playing/position | Runtime passed; earlier paused screenshot timing unresolved |
| Apple natural hand-over | No transport input; SDK The Dead Dance 200/229 sec → The Edge of Glory 23/322 sec; UI track 8 → 9, no settled recovery | Runtime passed; audible quality unwitnessed |
| Apple Exit | Builder return; MusicKit item null, playing false, time 0 | Runtime passed; silence unwitnessed |
| Apple browse/import | Saved Ritmo Apple Music Test playlist; all 10 imported in source order; 201 class/import and tagged/renamed QA fixture | Passed real provider/API/UI flow |
| SoundCloud Live pause/resume | Real official widget asynchronous isPaused/getPosition/getDuration callbacks; matching Live state | Runtime passed; audible quality unwitnessed |
| SoundCloud Exit | Builder return; SoundCloud iframe count 0 | Runtime teardown passed; silence unwitnessed |

Native 200% Builder/Live evidence and the pre-existing view-tab arrow-key gap remain in
[the separate zoom packet](../native-browser-zoom-2026-10-12/README.md). Neither packet establishes
real iPhone behavior or complete accessibility conformance.

## Apple evidence and discrepancy

Original owner-provided PNG bytes and JSON receipts preserve the production Pilates preflight,
authorization and audible-start report. The first playback screenshot showed Paused/Play at 0:10,
despite Steven reporting advancing clock and audible playback. After he left, the actual session
was on track 8 and advancing normally; MusicKit agreed. No persistent frozen-clock condition was
observed and no cause is assigned to that earlier single frame. Do not delete or reinterpret it.

`apple-unattended-observations.json` records 2026-10-12T16:53:23Z (track 8, time 200 s),
16:54:18Z (track 9, time 23 s), and 16:54:38Z (Exit, empty player/time 0).
This is one observed natural runtime boundary, not a witnessed full-class natural run. Earlier
unobserved boundaries cannot be awarded acceptance merely because the session reached track 8.

`apple-import-responses.json` contains sanitized response URLs/status/request identities only;
no request credentials/headers or provider audio. `fixture-source-summary.json` preserves ordered
provider/title metadata and exact new-class identities. The Apple run-payload was captured before
rename; the separate successful rename response and final title are also recorded.

## SoundCloud evidence

The account library session was expired; catalog and public-widget playback remained available.
No reconnect/account permission change was made. The retained short audit fixture was blocked by
six empty teaching-plan blocks, so it was left unchanged and a fresh one-song QA class was created
from an actual SoundCloud catalog result.

The official widget uses asynchronous postMessage getters. Getter semantics were checked in
[SoundCloud's Widget API documentation](https://developers.soundcloud.com/docs/api/html5-widget).
No audio was downloaded, cached, analyzed or proxied, and no SDK transport methods were invoked
by diagnostic probes. Playback controls were exercised through the application's UI.

`soundcloud-observations.json` shows:

- Playing at 27.678 s with Live 0:28 and no recovery.
- Paused at 37.744647 s and again at 37.744947 s about 13.1 seconds later: 0.3 ms difference,
  Live steady at 0:38, widget paused=true.
- Resume at 39.821 s and later 78.944 s, widget paused=false, Live advancing to 1:19.
- Exit removes the iframe and returns to Builder. Apple remains stopped/empty as well.

PNG captures retain playing, paused, resumed, Exit and tagged fixture states.
`verification-summary.json` asserts the observed outcomes and boundaries; `sha256.json` hashes
this packet. Tool selector timeouts that occurred after a selection changed its accessible name
were resolved from fresh DOM state without duplicate input. One natural-boundary wait timed out
before the boundary; subsequent passive observation captured the actual hand-over.

## Production fixtures retained

| Fresh fixture | Class ID | Tracks | Marker |
| --- | --- | --- | --- |
| [QA] Apple browse import 2026-10-12 Cycle | 75b7af90-141f-4f56-b02b-0bdd2c1c9dfe | 10 | qa-fixture |
| [QA] SoundCloud transport 2026-10-12 Cycle | 91c94386-5816-48f5-91aa-61e874abb05b | 1 | qa-fixture |

The Apple fixture was created by the saved-playlist import, then immediately tagged/renamed after
the import UI settled. SoundCloud was named before creation and tagged immediately afterward.
Both are retained for owner review and later exact-authorized deletion. No original class content,
source playlist or retained fixture was edited; opening existing QA classes may update recency.

## Remaining and restart

When Steven is available, use the retained fixtures for human listening confirmation of an Apple
natural hand-over and SoundCloud pause/resume/Exit. Do not claim those audible results from SDK
state or this unattended pass. The user-owned production tab is left in Builder; both players are
stopped. Steven authorized a local commit of verification evidence and the handoff while keeping
human audible acceptance open. Push, PR, merge, deployment and cleanup remain separate.
No product-code change was performed; the original observation receipts describe the verification
pass before this separate local commit authorization.
