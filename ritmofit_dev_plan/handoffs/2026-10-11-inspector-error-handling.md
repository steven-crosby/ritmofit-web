---
date: 2026-10-11
tool: Claude Code (local, desktop app)
lane: solo
branch: claude/live-connections-errmessage-20261011
head: 314ea523e576cbf77e7766fc31a7a01a619d4436
base: f8f2fdd5a635c3b8583f35c2ccc73c40a68cd154
prs: ['#512 (merged, f8f2fdd)', '#513 (merged at close)']
status: open
---

# Inspector errors announced on the field; Live/Account audit found no unblocked second lane

## Done

- [#512](https://github.com/steven-crosby/ritmofit-web/pull/512): track inspector validation errors render as an alert, mark the offending field `aria-invalid`, join its `aria-describedby`, and take focus; a rejected Downbeat or Start at opens the collapsed Advanced group first. The four inspector failure paths (zone save, BPM lookup, save, remove) use `errMessage` with per-action fallbacks. Only `Dashboard.tsx` and `Dashboard.test.tsx` changed.
- [#513](https://github.com/steven-crosby/ritmofit-web/pull/513): the Live connections refresh and the Connections dialog load/disconnect failures use `errMessage`. A rejection with an empty message no longer leaves Live preflight with no error notice or Retry. Four files: `LiveMode.tsx`, `ConnectionsDialog.tsx`, and their tests.
- Start-session baseline plus a read-only Live/Account audit for a second lane. Result: none worth running without an owner decision (table below).

## In flight

None. #512 squash-merged as `f8f2fdd`; [post-merge main CI](https://github.com/steven-crosby/ritmofit-web/actions/runs/38169381971) passed. Steven approved merging #513 once CI is green; this handoff describes the state after that squash merge.

## Next action

Unchanged from the open acceptance handoffs: attended natural desktop Cycle/Pilates acceptance when Steven can listen ([acceptance handoff](./2026-10-09-ux-close-acceptance.md)), then iPhone, then the exact release decision. For a no-audio session, the quickest unblock is the OD-02 decision below.

## Blockers and owner decisions

- Listener availability (Steven was not available for audio on 2026-10-11); no playback started.
- OD-02: next cue or current cue as the Live hero. Deciding it turns the short-viewport Live issue into a synthetic-testable lane.
- Song-to-song routine copy inside one class is not authorized (benchmark gaps are findings only). It needs a product decision on overwrite/append and re-timing, a track list passed from `TrackInspector` in `Dashboard.tsx`, and probably a server endpoint — the existing `POST /class-tracks/:id/copy` copies a track with its choreography into another class only.
- Exact release batch and deployment remain separate decisions.

Live/Account audit (2026-10-11, code read only):

| Candidate | Finding | Verdict |
| --- | --- | --- |
| Raw error casts | `LiveMode.tsx` connections refresh and two sites in `ConnectionsDialog.tsx` | Done in #513 |
| Login / ResetPassword | Errors already announced | Nothing to do |
| Account surface | `AccountWorkspace` lives in `Dashboard.tsx` | Not disjoint from Builder work |
| Live at short viewports | Next cue and countdown fall behind the transport at 375×635 and 320×568 per the [live-glance packet](../../docs/audits/live-glance-2026-10-11/README.md); not re-run | Parked on OD-02 and a real iPhone measurement |
| Hands-free finish after a playback error | `LiveMode` documents failures as never a silent skip; a playback change needs attended verification | Owner decision; blocked on listening |

Not done from the #509 follow-up list: client-side upper bounds (the only schema bound is the 24-hour `MAX_DURATION_MS`), sub-second entry, and clip-end wording (no concrete defect identified). Thirteen other `(e as Error).message` casts remain elsewhere in `Dashboard.tsx`.

## Verification

- Run (#512): full twelve-step local gate on the work commit, all pass — web 1145 (8 new inspector tests), API 486, music 30, Worker integration 184; OpenAPI no drift; contract parity and audit pass. Hosted CI passed on the work commit.
- Run (#513): full twelve-step local gate, all pass — web 1148 (3 new), API 486, music 30, Worker integration 184. The new Live test fails against the old line. Not browser-verified; the changed paths run only on a failed request.
- Run: local browser check on dev servers with a throwaway local account — invalid Downbeat with Advanced collapsed opened the group, focused and marked the field, showed the alert; a valid value cleared it and saved.
- Skipped: real screen reader (the alert plus field description may be read twice, the same trade-off as the cue/move editors); provider playback; real device; production.
- Local only: pending migration `0020` was applied to the local dev D1, and one local account plus a test class ("Inspector QA ride") were created there. Nothing remote.

## Production as observed

- `main` ahead. Checked 2026-10-11 at session start: Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100%, SPA `assets/index-mZ1ypG4t.js` on three consecutive cache-busted fetches. The #494 / `e712274` source label comes from HISTORY, not re-derived.
- Rechecked after the #512 merge: same Worker and SPA entry on three fetches.
- Undeployed after this merge: #495/#499, #501, #503/#504, #506/#507, #509, #512, #513. Remote migration state not checked.

## Shared zones touched

`Dashboard.tsx` (TrackInspector only) in #512; `LiveMode.tsx` connections-status fetch only in #513 (not the playback coordinator). No shared schema, OpenAPI, route, migration, auth, provider, playback, or style change.

## Notes for other lanes / iOS

None. No contract change. The other three open handoffs belong to their Codex authors and were not edited.
