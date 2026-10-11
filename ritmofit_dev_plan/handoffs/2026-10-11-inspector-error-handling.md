---
date: 2026-10-11
tool: Claude Code (local, desktop app)
lane: solo
branch: claude/owner-decisions-20261011
head: 0eeddc5f7f528880aafe0436bac8834ab8caa10e
base: 0eeddc5f7f528880aafe0436bac8834ab8caa10e
prs: ['#512 (merged, f8f2fdd)', '#513 (merged, 3003656)', '#514 (merged, 0eeddc5)', '#515 (merged, 6eeccc0)', 'deploy record PR']
status: open
---

# Main deployed as one batch (Worker 9563d726); attended checks on the new build are owed

This handoff replaces three retired Codex handoffs (2026-10-09 UX close, 2026-10-10 integrity round, 2026-10-11 r20261010b close), retired with Steven's explicit approval on 2026-10-11. Their text is preserved at [`0eeddc5`](https://github.com/steven-crosby/ritmofit-web/tree/0eeddc5f7f528880aafe0436bac8834ab8caa10e/ritmofit_dev_plan/handoffs); everything still owed from them is listed here.

## Done

- [#512](https://github.com/steven-crosby/ritmofit-web/pull/512): inspector validation errors are announced on the offending field; four inspector failure paths use `errMessage`.
- [#513](https://github.com/steven-crosby/ritmofit-web/pull/513): Live connections refresh and Connections dialog failures use `errMessage`; an empty-message rejection no longer hides the Live preflight error.
- [#514](https://github.com/steven-crosby/ritmofit-web/pull/514): attended Cycle transition spot-check on production recorded in the [acceptance packet](../../docs/audits/apple-natural-acceptance-2026-10-09/README.md).
- Owner decisions, 2026-10-11 (asked one at a time):
  - Desktop Cycle acceptance accepted on the spot-check; no untouched natural run.
  - Pilates covered by the Cycle result.
  - Release: preflight all of main as one batch, not the two-batch proposal.
  - OD-02: the current cue is the Live hero ([ledger](../../docs/audits/studio-pulse-check-2026-09-13/run-decisions.md)).
  - Live finish control: decide later (INBOX).
  - Retire the three Codex handoffs.
- Read-only release preflight for current main (below), then **deployed `main` `6eeccc0`** on Steven's explicit go: Worker `9563d726-bc4d-44f7-834a-d7dbcc388d19`, SPA `assets/index-DyruxT0m.js`. Recorded in HISTORY.

## In flight

None.

## Next action

With Steven present, on the new production build: start an Apple Music class in Live and confirm audible playback and at least one natural end-of-song hand-over; run one Apple browse/import; run one real SoundCloud Preview or Live pause/resume for #501. If any of these fail, roll back with `wrangler rollback 5f67d242-8956-42b7-9318-67b2797d3454` per the runbook.

## Blockers and owner decisions

- The deployed batch mixes provider code (#495/#499) and playback runtime (#501) with web changes, by owner choice against the runbook default. Nothing audible or authenticated has been verified on the new build yet.
- Post-deploy checks still owed: authenticated Apple browse/import, a real asynchronous SoundCloud transport check for #501, audible Apple playback, and the local browser smokes.
- Real-iPhone Safari investigation (Bluetooth, lock/unlock, notification) is still open and needs the device.
- Live finish control wording, location and style (INBOX breadcrumb; Exit works).
- Disposition of preserved Codex state: provider candidate worktree and local/remote branch `codex/release-apple-guards-20261009` at `0afa5c8` (superseded now that main shipped as one batch); worktrees `status-release-reconcile`, `ux-builder-clarity`, `ux-live-clarity` and their local branches; local unpushed tag `verification/request-draft-integrity-20261010`. Nothing was removed.
- Production QA fixtures are all retained; deletion is unauthorized.
- Song-to-song routine copy is not authorized; it needs a product decision and probably a server endpoint.
- Carried, unverified: actual native 200% browser zoom on the Builder (only a compact-viewport approximation was tested on 2026-10-10); inspector upper bounds, sub-second entry and clip-end wording; thirteen other raw error casts in `Dashboard.tsx`; the `[rf-liveness]` console lines re-printing at each track start.
- Later, separate repo: iOS handoff-model port. Spotify stays tabled.

Now unparked by OD-02: Live at short viewports. Next cue and countdown fall behind the transport at 375×635 and 320×568 per the [live-glance packet](../../docs/audits/live-glance-2026-10-11/README.md); with the current cue confirmed as hero this is a synthetic-testable lane. The release batch has shipped, so this is the strongest next code lane.

## Verification

- #512/#513: full twelve-step local gate on each code commit, all pass (final: web 1148, API 486, music 30, Worker integration 184). Hosted CI passed on every PR head and on `main` after each merge. #512 was also checked in a local browser.
- Spot-check: see the acceptance packet for the boundary table and limits.
- Deploy: full twelve-step gate on `6eeccc0` passed before deploy; remote D1 nothing to apply; post-deploy unauthenticated smoke passed (SPA entry on three consecutive fetches, status codes, security headers).
- Skipped: untouched natural run (declined by owner); real screen reader; real device.

## Production as observed

- Aligned for application code. Checked 2026-10-11 after deploy: Worker `9563d726-bc4d-44f7-834a-d7dbcc388d19` at 100% (created 2026-10-11T22:01:47Z); SPA `assets/index-DyruxT0m.js` on three consecutive cache-busted fetches, matching the local build of `main` `6eeccc0`.
- Rollback anchor: Worker `5f67d242-8956-42b7-9318-67b2797d3454` (#494, SPA `assets/index-mZ1ypG4t.js`).
- Remote D1: nothing to apply, checked immediately before deploy. No migration, config, dependency or secret change in the batch.
- Smoke: `/` 200; health 200; classes/explore/teams 401 unauthenticated; security headers present. Unauthenticated 401s on provider and class routes do not by themselves prove mounting.

## Shared zones touched

`Dashboard.tsx` (TrackInspector) in #512; `LiveMode.tsx` connections-status fetch in #513. No shared schema, OpenAPI, route, migration, auth, provider, playback-coordinator, or style change this session.

## Notes for other lanes / iOS

No contract change. A native Live screen should follow the clarified OD-02: current cue as hero, next cue queued.
