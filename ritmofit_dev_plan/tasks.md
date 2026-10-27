# Task board snapshot

This file is the repo snapshot for handoffs. The live board is the Cursor Project tracker.

Open plan links point at the Cursor Project Context, not at files in git.

## For Review

- [ ] **RF-80** Preflight verifies playback on this device before Start [Plan](/cursor/stores/bc-22530555-6204-4e0e-bf89-4a3cbeeddcf2/docs/preflight-playback-plan.md)
- [ ] **RF-32** [Classes library plan](/cursor/stores/self/docs/classes-redesign-plan.md) Final. B then A then C. Pull request B waits for Steven's go
- [ ] **RF-16** Editorial Spotify playlist 404 still shares the outage envelope
- [ ] **RF-23** [#591](https://github.com/steven-crosby/ritmofit-web/pull/591) Health check touches D1 and an authed smoke uses a gitignored token
- [ ] **RF-24** [#594](https://github.com/steven-crosby/ritmofit-web/pull/594) Ignore lists and docs no longer name a local tool directory

## In Progress

- [ ] **RF-86** Close the session with a handoff for the local agent [#639](https://github.com/steven-crosby/ritmofit-web/pull/639)
- [ ] **RF-29** iPhone Apple Music plays sound in Safari
- [ ] **RF-22** [#592](https://github.com/steven-crosby/ritmofit-web/pull/592) A dirty tree refuses even with a SHA

## Queued

- [ ] **RF-73** Classes buttons fail WCAG 2.5.3 label in name
- [ ] **RF-74** Spotify playlist dialog offers Try again where retry cannot help

## Done

- [x] **RF-85** ^RF-29 Explain the empty FairPlay probe on the latest deploy
- [x] **RF-84** ^RF-29 Deploy main after the FairPlay probe and the auth upgrade [#638](https://github.com/steven-crosby/ritmofit-web/pull/638)
- [x] **RF-82** ^RF-29 Request modern FairPlay without the old WebKit object [#636](https://github.com/steven-crosby/ritmofit-web/pull/636)
- [x] **RF-83** Upgrade better-auth past the device-login advisory [#637](https://github.com/steven-crosby/ritmofit-web/pull/637)
- [x] **RF-81** ^RF-29 Explain why the live banner skips the FairPlay probe word
- [x] **RF-79** ^RF-29 Deploy the FairPlay probe to production [#635](https://github.com/steven-crosby/ritmofit-web/pull/635)
- [x] **RF-78** ^RF-29 Suppress the MusicKit dialog and name the FairPlay refusal [#634](https://github.com/steven-crosby/ritmofit-web/pull/634)
- [x] **RF-77** ^RF-29 Root-cause the iPhone Playback Error after the FairPlay fix
- [x] **RF-76** Deploy the iPhone Apple Music fix to production [#632](https://github.com/steven-crosby/ritmofit-web/pull/632)
- [x] **RF-75** Deploy main 4e0b150 in stages, holding the iPhone Apple Music change [#631](https://github.com/steven-crosby/ritmofit-web/pull/631)

- [x] **RF-63** Live screen fixes
  - [x] **RF-64** Live Next line and queue show one countdown [#620](https://github.com/steven-crosby/ritmofit-web/pull/620)
  - [x] **RF-65** Empty Live readouts no longer print a dash [#627](https://github.com/steven-crosby/ritmofit-web/pull/627)
  - [x] **RF-66** Preflight says passed once [#628](https://github.com/steven-crosby/ritmofit-web/pull/628)
  - [x] **RF-67** Apple Music and SoundCloud failure copy, plus an Offline mark [#629](https://github.com/steven-crosby/ritmofit-web/pull/629)
  - [x] **RF-68** Live labels on design-system type tokens [#630](https://github.com/steven-crosby/ritmofit-web/pull/630)
- [x] **RF-70** Dependency patches, bundle budget, and e2e smoke
  - [x] **RF-71** Dependency patches, a bundle budget, and a flaky-test sweep [#618](https://github.com/steven-crosby/ritmofit-web/pull/618)
  - [x] **RF-72** E2E smoke for the signed-in core flow, local only [#626](https://github.com/steven-crosby/ritmofit-web/pull/626)
- [x] **RF-69** Spotify quota, capped Retry-After, and playlists you don't own [#621](https://github.com/steven-crosby/ritmofit-web/pull/621)
- [x] **RF-57** App shell hardening
  - [x] **RF-58** Losing the session mid-class keeps Live on screen [#617](https://github.com/steven-crosby/ritmofit-web/pull/617)
  - [x] **RF-59** Clear offline message and a Retry for class details [#619](https://github.com/steven-crosby/ritmofit-web/pull/619)
  - [x] **RF-60** Page-level error boundary with Back to Classes [#622](https://github.com/steven-crosby/ritmofit-web/pull/622)
  - [x] **RF-61** Account page loading and repeated disclaimer cleanup [#623](https://github.com/steven-crosby/ritmofit-web/pull/623)
  - [x] **RF-62** One loading pattern and one error card on every page [#624](https://github.com/steven-crosby/ritmofit-web/pull/624)
- [x] **RF-54** Classes and reset page fixes
  - [x] **RF-55** Long class titles widen the phone Classes page [#615](https://github.com/steven-crosby/ritmofit-web/pull/615)
  - [x] **RF-56** Reset page title over an invalid-link error [#616](https://github.com/steven-crosby/ritmofit-web/pull/616)
- [x] **RF-53** Plan Second overnight plan approved Oct 27
- [x] **RF-52** Production is Worker 60dcbb9d from c07bba3. Rollback is Worker e7104e5d [#614](https://github.com/steven-crosby/ritmofit-web/pull/614)
- [x] **RF-51** Phone Cue-by-Cue fixes, one pull request each
  - [x] **RF-28** Last cue's Next line shows track 2's first cue [#611](https://github.com/steven-crosby/ritmofit-web/pull/611)
  - [x] **RF-30** No-space titles and notes no longer push End Class off screen [#612](https://github.com/steven-crosby/ritmofit-web/pull/612)
  - [x] **RF-6** Phone first-screen checks pass at 390px with music off [#613](https://github.com/steven-crosby/ritmofit-web/pull/613)
- [x] **RF-43** Fix playback, Spotify status, and reconnect chips
- [x] **RF-50** Squash-merged FairPlay, Spotify status, Music cleanup, and class delete
  - [x] **RF-44** Add a confirmed delete on the class row and in the builder [#608](https://github.com/steven-crosby/ritmofit-web/pull/608)
- [x] **RF-46** ^RF-50 Use modern FairPlay for Safari Apple Music [#604](https://github.com/steven-crosby/ritmofit-web/pull/604)
- [x] **RF-47** ^RF-50 Name the Spotify allowlist and start SoundCloud reconnect [#606](https://github.com/steven-crosby/ritmofit-web/pull/606)
- [x] **RF-48** ^RF-50 Quiet the Music connection area and put library tabs under the chips [#609](https://github.com/steven-crosby/ritmofit-web/pull/609)
- [x] **RF-11** Update toast survives an app crash. Open-tab proof waits for the next deploy [#610](https://github.com/steven-crosby/ritmofit-web/pull/610)
- [x] **RF-49** Squash-merged Build a class navigation, then the Live cleanup. Main is e84aab7
  - [x] **RF-45** Open the builder after Build a class succeeds [#607](https://github.com/steven-crosby/ritmofit-web/pull/607)
  - [x] **RF-40** Clean the Live page against the 5–10 second test [#605](https://github.com/steven-crosby/ritmofit-web/pull/605)
- [x] **RF-31** Spotify Development Mode allowlist fixed. Spotify library works
- [x] **RF-42** Production is Worker e7104e5d from cbb8496. Rollback is Worker 4fdba2fc

- [x] **RF-41** Squash-merged #601, #602, #603, and #600. Main is cbb8496
- [x] **RF-38** Music tab: compact service chips and a library list [#602](https://github.com/steven-crosby/ritmofit-web/pull/602)
- [x] **RF-39** State the 5–10 second page test beside Principle 0 [#603](https://github.com/steven-crosby/ritmofit-web/pull/603)

- [x] **RF-37** Library shell: Cycle and Pilates templates, no hero or readiness tabs [#601](https://github.com/steven-crosby/ritmofit-web/pull/601)

- [x] **RF-36** [#600](https://github.com/steven-crosby/ritmofit-web/pull/600) Production is Worker 4fdba2fc from 7163d71. Rollback is Worker 45dd784f
- [x] **RF-34** [#598](https://github.com/steven-crosby/ritmofit-web/pull/598) Builder focus live on Worker 4fdba2fc
- [x] **RF-35** [#599](https://github.com/steven-crosby/ritmofit-web/pull/599) Look-and-feel polish live on Worker 4fdba2fc
- [x] **RF-33** Classes redesign review. Findings resolved on Oct 26
- [x] **RF-18** Empty-class picker was working as designed. The playlist had more than 15 songs
- [x] **RF-5** Live, music off: the Sex with Me 0:20 hero shows Standing climb and is not truncated. The sentence is in the note
- [x] **RF-26** [#597](https://github.com/steven-crosby/ritmofit-web/pull/597) Signed-in smoke uses the secure cookie name on https, merged as f82c3a0
- [x] **RF-25** [#595](https://github.com/steven-crosby/ritmofit-web/pull/595) Runbook covers tail watch, expand-only migrations, and a written rollback rehearsal, merged as bc84c3b
- [x] **RF-10** [#589](https://github.com/steven-crosby/ritmofit-web/pull/589) Nested class routes return JSON 404 for a non-UUID class id, merged as 6ee1454
- [x] **RF-17** [#588](https://github.com/steven-crosby/ritmofit-web/pull/588) Picker warning only after a refused 16th song, merged as 80b6f82
- [x] **RF-21** [#588](https://github.com/steven-crosby/ritmofit-web/pull/588) Malformed Spotify playlist links rejected before the request, merged as 80b6f82
- [x] **RF-15** Working Spotify paste clears Session expired and stays Connected after import
- [x] **RF-19** Apple paste auto-detect works, and a playlist over 100 songs says Playlist has more than 100 songs
- [x] **RF-14** [#579](https://github.com/steven-crosby/ritmofit-web/pull/579) Playlist preview deadline and empty song-pick tests live on Worker 9248bbdf
- [x] **RF-9** [#586](https://github.com/steven-crosby/ritmofit-web/pull/586) Spotify panel drops a stale Session expired mark after a working paste, live on Worker 9248bbdf
- [x] **RF-8** [#560](https://github.com/steven-crosby/ritmofit-web/pull/560) Zod security patch deployed on Worker 55ae3b1a
- [x] **RF-12** [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) Ordered-import recovery tests merged and in production
- [x] **RF-13** No total song limit per class. The picker pre-checks 15
- [x] **RF-7** [#559](https://github.com/steven-crosby/ritmofit-web/pull/559) Session handoff on main
- [x] **RF-1** Desktop hold, BPM, and effort recorded on the QA cycle song
- [x] **RF-2** [#558](https://github.com/steven-crosby/ritmofit-web/pull/558) Teaching-screen deploy record on main
- [x] **RF-3** [#556](https://github.com/steven-crosby/ritmofit-web/pull/556) Teaching screen live
- [x] **RF-4** [#555](https://github.com/steven-crosby/ritmofit-web/pull/555) Cue duration, BPM, intensity, and position on the run payload
