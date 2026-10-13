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

If Steven wants the next diagnostic condition, run a short attended background-tab comparison
within one browser/SDK session using event-only recording plus before/after samples. Test visibility
and transport before recovery; do not assume background caused the original stop or weaken the
10-second progress guard. Code fixes require their own evidence-backed proposal/approval.

## Delivery / retained state

This docs-only follow-up uses existing evidence-publication authority. [PR #522](https://github.com/steven-crosby/ritmofit-web/pull/522)'s final head, CI and
merge fields establish delivery identity; merge is separate. #521 is already merged as `26158c4`.
The old handoff's pre-merge wording is superseded by verified GitHub delivery, not a new merge owed.
Both QA fixtures, protected managed lane worktrees/branches/briefs, tags and .claude are preserved.
Original later-stop alert, transient boundary panel, real iPhone and tab-arrow UX gap remain routed.

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
