---
date: 2026-10-12
updated: 2026-10-13
tool: Codex (local)
lane: orchestrator
branch: codex/deployment-preflight-518-519-20261012
head: 01991dc6f6bb43b9b86589651897ae6f67f01e4f
base: 4fd1ecd2e00967b0c14df295e28ae8fcf068b987
prs: ['#521']
status: open
---

# Builder / Live deployed; publication merge and human listening remain open

## Done

- Owner authorized deployment, Git publication, cleanup and guided human audible checks. After
  manual unlock, Chrome restarted; the local mock server/database survived and DOM inspection
  became available. Completed all remaining browser checks, including 12 surfaces × 5 exact CSS
  widths, both dialogs' root inert/aria-hidden and keyboard wrapping/return, native Chrome 200%
  confirmation, Full List, synthetic completion and Exit/Builder return. No provider audio in smoke.
- Deployed application main `4fd1ecd` (#518/#519 plus #520 evidence) on 2026-10-13 as Worker
  `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%. Three consecutive cache-busted SPA entries
  `assets/index-C1EvvyLa.js` match the fresh build and served JS SHA-256. No migrations pending
  or applied; BETA_ALLOWED_EMAILS exists by name. Previous Worker `9563d726` remains the immediate
  rollback anchor. No rollback, secret/config change or product source edit occurred.
- Eleven HTTP probes passed; all six health security headers present. Unauthenticated 401 is
  protection evidence, not handler-mount proof. Authenticated retained QA class/track loading,
  prompter-only Live Cue/List at narrow widths and Exit/Builder return passed. The production PWA
  initially served the old cached SPA; its Reload now prompt successfully activated the new SPA.
- [October 13 deployment/browser packet](../../docs/audits/deployment-preflight-518-519-2026-10-13/README.md).
  [October 12 gate/dry-run/cleanup packet](../../docs/audits/deployment-preflight-518-519-2026-10-12/README.md).
- Completed verification branch removed locally/remotely after exact head and tree equality with
  #520. Both lane archive calls were refused because their worktrees are pinned/protected; no bypass.

## In flight

- PR #521 publishes the evidence and reconciled HISTORY/DEVELOPMENT_PLAN. The technical deployment-record head
  `e68c435` passed [CI 38414448443](https://github.com/steven-crosby/ritmofit-web/actions/runs/38414448443)
  and review. Updated attended-evidence head must pass renewed CI/review. Squash merge requires
  separate explicit owner authority; Git publication authorization was used for commit/push/PR.
- Human observations: Apple authorization/start/clean natural handover/post-Exit silence confirmed;
  SoundCloud audible start/pause/resume/Exit separately confirmed. A transient Apple boundary
  waiting panel was captured and later cleared, duration unmeasured.
- A separate later Apple recovery at 5:18 held track 2. Official SDK reported not playing, Bad
  Romance time 2 s. Steven was not listening at that moment; cause/audible result are unknown.
  No agent Retry, seek or Next. Do not close Apple stability or claim an uninterrupted run.
  [Attended evidence](../../docs/audits/provider-acceptance-2026-10-13/README.md).
- Owner subsequently performed both Exits and reported silence/Builder return. Apple SDK time 0,
  not playing/no item after Exit; SoundCloud iframe absent. Production tab is left in the named
  SoundCloud QA Builder. Real iPhone and existing tab arrow-key gap remain open.

## Next action

Plan a scoped attended investigation of the later Apple stop; distinguish external/provider pause
from stale/unverifiable progress before assigning a cause or making product changes. Separately
approve squash #521 after renewed current-head CI/review, reconcile records and sync local main.

## Blockers and retained cleanup

Protected managed worktrees `live-short-viewport` and `builder-refresh-integrity`, their local/remote
lane branches and untracked briefs remain. Primary .claude, tags, original classes/source playlists,
local smoke state and both exact listening QA fixtures are preserved. Do not delete fixtures before
listening acceptance. Do not bypass the pinned-worktree restriction or retire other authors' handoffs.
The retained fixtures are Apple `75b7af90-141f-4f56-b02b-0bdd2c1c9dfe` and SoundCloud
`91c94386-5816-48f5-91aa-61e874abb05b`; earlier provider evidence is in the
[verification handoff](./2026-10-12-native-zoom-acceptance.md).

## Production as observed

Worker `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%, SPA `assets/index-C1EvvyLa.js`, application
source `4fd1ecd`. Main and production application source align; PR #521 adds records only and is
not yet merged. No production class content was edited and no fixture was deleted in post-deploy
smoke; opening the named retained QA class may update its recency.

## Shared zones / iOS

Documentation and evidence only. No API, schema, shared-contract, provider, playback-runtime,
configuration, dependency or application-source edits. Viewport emulation is not real-device or
screen-reader evidence; synthetic completion is not an untouched natural run or human hearing.
