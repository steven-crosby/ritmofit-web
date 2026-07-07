# INBOX — breadcrumb catcher

One frictionless place to drop a raw idea before it's shaped. The rule that makes this
work: **an idea isn't "saved" until it's a line in a tracked file.** Chat transcripts
(Claude.ai Projects) are scratch; this repo is canon. Capture here from either surface,
then drain into a real home.

This file is the only place that is allowed to be messy. Everything else (`decisions.md`,
`DEVELOPMENT_PLAN.md`, parity trackers, runbooks, and agent prompts) stays curated because this catches
the noise first.

## How to capture

- **From Claude Code (in the repo):** "add a breadcrumb: …" → a line gets appended below.
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

- [ ] (2026-07-07) provider read helpers: PROVIDER_UNAVAILABLE branch has no unit coverage
      in user-playlists.ts / user-likes.ts — add cases. #test
- [ ] (2026-07-07) Spotify confidential-client OAuth path carries dead codeVerifier/
      codeChallenge (PKCE) params — confidential clients don't use PKCE; remove or document intent. #cleanup
