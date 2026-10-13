# Attended provider acceptance — 2026-10-13

Deployment: Worker `73493517-2006-4beb-bf7c-cdb1edf298fd`, application source `4fd1ecd`,
SPA `assets/index-C1EvvyLa.js`. Steven authorized the guided human audible checks and is supplying
listening observations one step at a time. This is separate from the
[technical deployment packet](../deployment-preflight-518-519-2026-10-13/README.md).

## Apple Music — in progress

Retained fixture: `[QA] Apple browse import 2026-10-12 Cycle`, class ID
`75b7af90-141f-4f56-b02b-0bdd2c1c9dfe`, ten imported tracks. Steven confirmed browser authorization
and Start enabled, then reported Abracadabra audible, the Live clock advancing and no recovery.
The saved initial DOM corroborates Now teaching / Track 1, 0:51 elapsed, Pause available and Apple
Music selected; it is not itself hearing evidence. Steven then confirmed a clean audible natural Abracadabra → Bad Romance handover.
Apple Exit silence remains pending. The owner was instructed to leave playback untouched, without
seeking or Next. No full untouched 40-minute run is required or claimed.

The owner also observed a momentary notification just before the next song began. His original
PNG `owner-apple-boundary-waiting.png` shows Waiting for music / Teaching position is held at
3:43, track 2 Bad Romance. The subsequent agent DOM observation shows Now teaching / track 2
at 4:00 without the banner; this corroborates recovery of the UI, not hearing. Banner duration
was not measured. Source inspection maps the panel to preparing/buffering/awaiting authorization
before confirmed provider progress (`LiveMode.tsx`, `musicBlocked`, line 732; panel line 949).
Record this transient waiting-panel presentation as a scoped UX follow-up while retaining the
confirmed clean audio result; no product fix is included.

![Owner-captured transient waiting panel at natural handover](./owner-apple-boundary-waiting.png)

## SoundCloud — pending

Retained fixture: `[QA] SoundCloud transport 2026-10-12 Cycle`, class ID
`91c94386-5816-48f5-91aa-61e874abb05b`, one public-widget track. Human audible start, pause,
resume and Exit silence are still pending. No account reconnection is part of this check.

## Evidence and limits

`human-observations.json` records the owner's actual text reports. DOM text and JPEGs corroborate
UI state without replacing a human listener. Provider audio is used only through the official
SDK/widget; no audio is captured, downloaded, cached, decoded, analyzed, mixed or proxied.
No class content changes or fixture deletion. Real iPhone, screen-reader and fresh Pilates playback
acceptance are not established by this desktop Cycle check. Earlier owner decisions and evidence
remain historical. Both QA fixtures are preserved for acceptance; cleanup stays separate.
