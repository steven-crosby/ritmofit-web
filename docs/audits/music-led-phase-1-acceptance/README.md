# Music-led Phase 1 — real-iPhone acceptance record

<!-- note (Claude, 2026-10-02): Checklist drafted from the 1A/1B/1C acceptance text in the workflow plan. No scenario has been run. -->

Acceptance record for Phase 1 of the
[music-led instructor workflow plan](../../../ritmofit_dev_plan/music-led-instructor-workflow-plan.md)
(D24). Code landed on `main` as `48bfd11` (#478) on 2026-10-02. **Nothing below has been run.**
Until it is, no claim about iPhone playback is supported, and `main` should not deploy to production
without the owner's explicit go.

Keep this record sanitized: no tokens, cookies, headers, authentication codes, raw recordings, or
personal screens. Recordings stay outside git.

## Run header

Fill once per test session.

| Field | Value |
| --- | --- |
| Date | |
| Application revision (`git rev-parse --short HEAD` at build) | |
| Worker version id and environment (test or production) | |
| Served SPA entry (`assets/index-….js`) | |
| Device and iOS version | |
| Safari tab or installed PWA | |
| Audio output (speaker, Bluetooth device) | |
| Provider subscriptions in use | |

## Verdicts

`pass`, `fail`, or `blocked` (could not be attempted — say why). A `fail` blocks the matching
playback claim; it does not need a fix before the remaining scenarios run.

## 1A — Connections

Run each row per provider where it applies (Apple Music, Spotify, SoundCloud).

| # | Scenario | Expected | Observed | Verdict |
| --- | --- | --- | --- | --- |
| A1 | Connect from the service card on Music | Stage text appears at once; ends connected, card offers Manage | | |
| A2 | Reconnect an expired or revoked connection from the card | Explicit Reconnect action; ends connected | | |
| A3 | Cancel during consent | Returns to the starting surface; no connection stored; controls usable | | |
| A4 | Slow operation (poor network) | After 10 s, slow-operation guidance with Cancel/Retry | | |
| A5 | Retry after a failure | New attempt runs; no stale result from the earlier attempt lands | | |
| A6 | Redirect return (Spotify, SoundCloud) from Music, Builder, and Live preflight | Lands back on the originating surface; success or failure shown once | | |
| A7 | Repeated taps on Connect | One operation; no duplicate consent sheets | | |
| A8 | Library request fails while connected | Its own Retry; likes/playlists not labelled ready | | |
| A9 | Layout at the phone's width with keyboard and Safari chrome showing | No right-edge overflow | | |

## 1B — Clock authority and recovery

Record teaching position (mm:ss) at the start and end of each hold.

| # | Scenario | Expected | Position at hold start / end | Audible result | Verdict |
| --- | --- | --- | --- | --- | --- |
| B1 | Start a class; first song prepares | Teaching position, cue, and countdown do not advance until music is audible | | | |
| B2 | Mid-song stall (airplane mode on, then off) | Holds at last confirmed position; recovery controls after 10 s; no jump ahead on return | | | |
| B3 | Retry from recovery | Resumes at the held position, only once playback is confirmed | | | |
| B4 | Skip track from recovery | Jumps to next song's start; holds until that song plays | | | |
| B5 | Continue without music | Prompter clock resumes from the held position; no late music starts | | | |
| B6 | Run without music from preflight | Class progresses with no provider playback | | | |
| B7 | Instructor Pause, then Resume | Music and teaching position stop and restart together | | | |
| B8 | Pause during recovery | No automatic resume | | | |
| B9 | Seek to another song or cue | Position follows the new song once it plays; nothing from the old song moves it | | | |
| B10 | Declared gap between songs | Scheduled silence with countdown; next song holds at its boundary until it plays | | | |
| B11 | Background the browser, then return | Position reconciles to the provider; no wall-clock time added | | | |
| B12 | Waiting or error state | Screen does not show Now teaching or an active Pause; screen stays awake | | | |

## 1C — Preflight and full-class runs

| # | Scenario | Expected | Observed | Verdict |
| --- | --- | --- | --- | --- |
| C1 | Preflight for an Apple Music class without browser authorization | Start is gated; authorization opens from a fresh tap; no song plays as a probe | | |
| C2 | Preflight for a mixed class with a later Apple Music track | Start is gated on Apple authorization before class begins | | |
| C3 | Preflight for a class needing Spotify | Start is gated on device preparation, then explicit activation tap | | |
| C4 | Spotify autoplay refused | Activation invalidated; Enable Spotify playback offered in recovery before Retry | | |
| C5 | Apple authorization expires mid-class | Recovery shown at the transition; no consent sheet opens unprompted | | |

Full-class runs. Note every hold, its position, what was audible, and how it recovered.

| # | Scenario | Notes | Verdict |
| --- | --- | --- | --- |
| C6 | Full Apple Music class over Bluetooth, screen unlocked throughout | | |
| C7 | Same class with lock/unlock mid-song and at a transition | | |
| C8 | Same class with one notification arriving during playback | | |
| C9 | Mixed SoundCloud → Apple Music class, transition unattended | | |
| C10 | Mixed class with Retry, Skip, and Continue without music each exercised once | | |
| C11 | Full Spotify class | | |

## Outcome

| Question | Answer |
| --- | --- |
| Does a full class finish hands-free on web Live on this iPhone? | |
| Which scenarios failed, and is each a code defect or a platform limit? | |
| Is the phone surface web Live, or does this need a native iOS playback plan? | |
| Cleared for production deploy? (owner) | |
