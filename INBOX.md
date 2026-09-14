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

- [ ] (2026-09-13) Class cover placeholder is a bare 📷 emoji (`Dashboard.tsx:4258-4271`, the
      builder's 96×96 cover box, shown whenever `cls.coverImageUrl` is null) — owner dislikes it,
      wants a derived cover instead, referencing Apple Music's "Playlists Made for You" style:
      either bold title text over a gradient ("Chill", "New Music", "Heavy Rotation" — text is the
      whole cover) or a plainer abstract-gradient/art tile with the title as a caption below it
      ("Blossom", "Brain Food", "Bird Sounds" — closer to a plain swatch, no text on the art
      itself). Owner hasn't picked between the two treatments yet — that's an open decision for
      next session, not settled here.
      There's already a reusable building block for exactly this: `TrackArt.tsx`'s
      `gradientFor()`/`hashString()` — a deterministic warm-palette (copper/amber/ember only, per
      `02-color-system.md` — cyan/plasma are reserved for interaction/peak, never decoration)
      gradient keyed off BPM or a stable hash of an identity string, currently only used at 44px
      for track-row art (via `ArtCollage`, itself plain-gradient-swatch, no text overlay). The
      design-system doc (`ritmofit_design_system/05-components.md:97-103`, "Song row / track
      card") already mandates "never fall back to a bare music-note placeholder on a signature
      track surface" for tracks — the class cover is a different surface so not a strict
      violation, but the same principle isn't extended there today, which is the gap.
      Needs: (1) owner decision on text-on-gradient vs. plain-art+caption, (2) whether class covers
      should get a bigger/richer variant of `TrackArt`'s gradient (larger size, maybe a
      title-initial or icon) or reuse it as-is at 96px, (3) whether the small list-card `ArtCollage`
      tile should also change for consistency or stay as the simpler small-swatch treatment. —
      #idea

<!-- 2026-07-27: the two 2026-07-25 design-audit breadcrumbs were routed to
     docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md as F-01 (dead Tailwind
     color classes — the sweep found 12 uses across 5 files, not just AccountDialog) and F-02
     (D11 unconfirmed). -->
