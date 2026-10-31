---
date: 2026-10-13
tool: Codex (local)
lane: solo
branch: codex/apple-recovery-investigation-20261013
head: 26158c4a924bd34ac36a8e562567458d5bf0b2b0
base: 26158c4a924bd34ac36a8e562567458d5bf0b2b0
prs: ['#522']
status: open
---

# Controlled visible-browser run normal through 6:34; original Apple recovery unresolved

## Done

Owner approved scoped attended investigation, with code changes/deployment/cleanup separate.
After interruption and Chrome closure, reopened Chrome and the exact retained Apple QA fixture.
Existing authorization checked; agent Start announced, owner confirmed audible start and left
playback untouched. SDK state/error and visibility/focus listeners plus periodic SDK/DOM reads
captured natural track 1 → 2 and the original 5:18 window. No sampled recovery or media error.
Owner confirmed normal audio through 6:34 and silence after intentional Exit. Planned 6:00 stop
overshot by 34 seconds; timing and sampling gaps are explicit. All five temporary listeners removed.
[Evidence/limits](../../docs/audits/apple-recovery-investigation-2026-10-13/README.md).

Source confirms recovery destroys the Apple adapter and stops MusicKit. The original post-alert
SDK state cannot identify what first caused loss of progress. It does not prove Apple stopped first.
No application/source change, deployment or fixture/branch/worktree cleanup occurred.

## Next action

Steven tabled this debugging on 2026-10-13. No investigation is active; resume only on an explicit
owner instruction. Retain this open handoff, the exact Apple fixture and all evidence while the
5:18 initiating cause remains unresolved. The following diagnostic is a deferred proposal.

If Steven wants the next diagnostic condition, run a short attended background-tab comparison
within one browser/SDK session using event-only recording plus before/after samples. Test visibility
and transport before recovery; do not assume background caused the original stop or weaken the
10-second progress guard. Code fixes require their own evidence-backed proposal/approval.

## Delivery / retained state

[PR #522](https://github.com/steven-crosby/ritmofit-web/pull/522) merged as `9625ef9`; full
[post-main CI](https://github.com/steven-crosby/ritmofit-web/actions/runs/38444410636) passed.
#521 is merged as `26158c4`. The two publication branches and three approved temporary files
were removed in the first cleanup pass; their evidence remains on main.

Second cleanup pass: the three superseded root-authored deployment, native-zoom and orchestrator
handoffs are retired locally. SoundCloud QA `91c94386-5816-48f5-91aa-61e874abb05b` was deleted
after final browser confirmation; authenticated re-read returned 404. Apple content fingerprint
matched before/after deletion. Cleanup [PR #523](https://github.com/steven-crosby/ritmofit-web/pull/523) merged as `973db61`;
full post-main CI `38460359795` passed. Its publication branch was removed locally/remotely at close.
[Completed cleanup record](https://github.com/steven-crosby/ritmofit-web/blob/0a77110ad9cd206410c3ccd6121a02ab4bc7ff2c/ritmofit_dev_plan/handoffs/2026-10-13-session-cleanup.md).
Apple fixture `[QA] Apple browse import 2026-10-12 Cycle`
(`75b7af90-141f-4f56-b02b-0bdd2c1c9dfe`, ten tracks) is retained for the unresolved 5:18 recovery.
Protected managed lane worktrees/branches/briefs, tags, original classes and playlists remain.

Original later-stop alert and transient boundary-panel presentation remain open. Real iPhone Safari
and Live view-tab Right Arrow behavior remain unverified/unresolved in DEVELOPMENT_PLAN.
Native Chrome 200% and bounded SoundCloud desktop hearing checks are complete; their limits and
immutable observations remain in the audit packets. No full-class, screen-reader, reconnect or
general provider stability acceptance is implied. Live finish wording/location/style is routed to DEVELOPMENT_PLAN’s open owner decisions.

## Production as observed

Worker `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%, loaded SPA `index-C1EvvyLa.js`, application
source `4fd1ecd`. Main differs by evidence/status docs only; application content aligns. Browser
left in the named Apple QA Builder, SDK not playing/position 0/no item. No teardown listener remains.

## Verification

243 periodic observations / 18 SDK events; 35 observations at 5:05–5:40, all playing, max gap 1.027 s.
Entire-run max sampling gap 105.104 s; event recorder continuous. Fresh visible session, Chrome 155
reported by reduced UA. No original-run pre-error timing/focus data exists. No full-class, background,
lock/device interruption, iPhone or general stability acceptance. Receipt/links/credentials and docs
checks run before publication; hosted CI and review verified against final PR head.
