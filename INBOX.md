# INBOX — breadcrumb catcher

One frictionless place to drop a raw idea before it's shaped. The rule that makes this
work: **an idea isn't "saved" until it's a line in a tracked file.** Chat transcripts
(Claude.ai Projects) are scratch; this repo is canon. Capture here from either surface,
then drain into a real home.

This file is the only place that is allowed to be messy. Everything else (`decisions.md`,
`DEVELOPMENT_PLAN.md`, parity trackers, runbooks, and agent prompts) stays curated because this catches
the noise first.

## How to capture

- **From a coding agent (in the repo):** "add a breadcrumb: …" → a line gets appended below.
- **From Claude.ai Projects (no repo):** ask for a paste-ready line in the format below,
  then drop it in here next time you're in the repo. Keep the Project's custom
  instructions pointed at this format so what comes back is already shaped to land.
- **By hand:** just add a `- [ ]` line. No ceremony required.

## Format

```
- [ ] (YYYY-MM-DD) <the idea, in one or two lines> — #tag
```

Tags are optional hints for routing, not a taxonomy: `#decision` `#plan` `#fact`
`#prompt` `#bug` `#idea`. Date so a stale breadcrumb is obvious.

## Draining (where each item goes)

Drained automatically at the **start of every work session** (surfaced) and routed during
**close-session** — see `agent-prompts/daily/start-session.md` and
`agent-prompts/daily/close-session.md`. When a breadcrumb is routed, **delete its line
here** — an inbox you drain is the difference between capture and hoarding.

| Breadcrumb is…                          | Route it to                                                  | Then                 |
| --------------------------------------- | ------------------------------------------------------------ | -------------------- |
| A decision or locked principle          | `ritmofit_dev_plan/decisions.md` (D-number, the D18 pattern) | delete the line      |
| "Build / fix this next", scope          | `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` / `milestones.md`    | delete the line      |
| Forward parity work                     | `ritmofit_dev_plan/web-ios-parity.md`                        | delete the line      |
| A non-obvious fact to outlive this work | the most specific durable doc in `ritmofit_dev_plan/`        | delete the line      |
| A reusable workflow/prompt              | `agent-prompts/` (web) or the iOS copy                       | delete the line      |
| A concrete bug/cleanup                  | a draft PR or focused follow-up                              | delete the line      |
| Stale / no longer wanted                | —                                                            | just delete the line |

If a breadcrumb doesn't fit any home, it probably isn't worth keeping — delete it.

---

## Breadcrumbs

<!-- newest at top; one per line -->

- [ ] (2026-07-15) **Apple Music library-song `maxTracks` page overrun** —
      `fetchAppleMusicLibrarySongs` checks the cap between pages but does not stop while appending a
      page, so a response can exceed the requested cap by the remainder of its final page. Add an
      in-page cap and regression without changing provider identity or caching behavior. — #bug
- [ ] (2026-07-15) **Post-deploy real SoundCloud audio verification** — after the Round 15–16 batch is
      deployed and the PWA refresh is accepted, owner-verify that a real public SoundCloud track is
      audibly heard in both Builder Preview and Live Mode, including pause/resume. The headed browser
      harness proved official widget acknowledgements and state transitions, not heard audio. — #plan
- [ ] (2026-07-11) **Round 9+10 owner-pending live checks** (deployed: R9 Worker `209a2a13`, R10
      Worker `b0d0fe54`; both logged in `HISTORY.md`). Manual browser checks mocks can't cover, on
      the live site: (a) import a **real public SoundCloud playlist URL** and a **real Apple Music
      catalog playlist URL** (`music.apple.com/…/playlist/…/pl.…`) via Import Playlist URL — first
      live exercise of SoundCloud `/resolve` + Apple catalog paging; (b) an Apple **library** `p.…`
      link → friendly 400 pointing at saved-playlist browsing; (c) Import Playlist URL shows for
      **all three providers**; (d) drag a track start in a **free-mode** class with "Snap to beat" on
      (snaps to the preceding track's grid) and confirm the new **m:ss** cue/move/segment entry
      (#280) round-trips; (e) duplicate a free-mode class → copy keeps `timelineMode`, offsets, gaps;
      (f) Live Mode shows the **wake-lock status chip** (#281). Delete this line once verified. — #plan
- [ ] (2026-07-12) **Apple `getPlaylist` may emit a duplicate `limit` query param**
      (`packages/music/src/apple-music.ts` ~L154) if Apple's `next` cursor already carries one —
      provider-tolerant, cosmetic (Round 11 Lane-3 minor). — #bug
- [ ] (2026-07-12) **In-Live "Manage connections" overlay** — open `ConnectionsDialog` from Live
      preflight so fixing a failing track's provider doesn't require exiting Live; composes on
      #285's now-honest playback-reconnect state. Note: Spotify/SoundCloud connect is a full-page
      redirect that ejects Live, so solve that UX wrinkle deliberately (Round 11 Lane-4 runner-up). — #idea
