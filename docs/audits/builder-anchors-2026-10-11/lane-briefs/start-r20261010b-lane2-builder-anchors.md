# Round r20261010b · Lane 2 — SPA: Builder anchor-entry correctness

**Do not implement until the batched plan is confirmed by the owner.**

Orchestrator: Claude Code (primary checkout). Builders: Claude subagents, one isolated git worktree
each. The owner cannot witness or confirm audio this session: **no provider playback is started,
and no playback-runtime behaviour changes.**

## 1. Git start state

- Checkout: an isolated worktree of `ritmofit-web` created for this lane · base `origin/main` ·
  HEAD `14c8326db9390e09dfb193e97ffa3d4c1fdf89f7`
- Relationship to `origin/main`: equal
- Start command: `git fetch origin main && git switch -c claude/r20261010b-lane2-builder-anchors origin/main`

## 2. Round partition

Two builders, both in the SPA, using the Builder/Live split from
`agent-prompts/orchestrate-parallel-round.md` (four-builder table, FE half only). No back-end lanes.

| Lane  | Owns                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------- |
| **1** | **FE: Live Mode presentation** — `LiveMode`, `LiveTimeline` and their tests                       |
| **2** | **FE: Builder correctness** — choreography/anchor entry, sole owner of `Dashboard.tsx`            |

## 3. Goal

Hardening, audit first. The playlist-to-Live audit
(`docs/audits/playlist-to-live-2026-10-03/coverage.md`, ranked finding 5, P2) reports:
"Explicit zero anchors rejected. Use existing `parseClockToMs` for anchors; retain positive-duration
and cue-preservation checks. Verify clip start, downbeat, and free-placement separately. Only
clip-start rejection reproduced."

**This is an unverified lead.** The orchestrator found no commit that mentions a fix but did not
reproduce it. First establish, from the current code and tests, whether an explicit `0:00` / `0`
anchor is still rejected for (a) clip start, (b) downbeat, (c) free cue/move placement. Then propose
the smallest fix plus regression coverage. If nothing reproduces, take the no-work exit (§11) —
do not invent a replacement slice; you may list other concrete defects you found for a later round.

## 4. Your files

- `apps/web/src/components/Dashboard.tsx`, `apps/web/src/components/Dashboard.test.tsx`
- `apps/web/src/components/ChoreographyEditor.tsx`, `ChoreographyEditor.test.ts`
- `apps/web/src/components/TrackPreview.tsx`, `TrackPreview.test.tsx`
- `apps/web/src/components/CuesSection.test.tsx`, `MovesSection.test.tsx`, `MovesPicker.test.tsx`
- `apps/web/src/lib/duration.ts`, `apps/web/src/lib/duration.test.ts`
- New test files beside these, and evidence under `docs/audits/builder-anchors-2026-10-10/`

`Dashboard.tsx`, `ChoreographyEditor.tsx` and the song picker carry the undeployed request/draft
integrity work from #506 (`b11f9f2`) and #507 (`fd3d16a`). Keep the diff minimal and do not disturb
draft ownership, request ordering, or focus restoration.

## 5. Other lanes own — do not touch

Lane 1: `apps/web/src/components/LiveMode.tsx`, `LiveTimeline.tsx`, `LivePreflight.tsx` and their
tests.

## 6. Shared / frozen zones — coordinate, never edit solo

`packages/shared`, `apps/api/**` (including `openapi/openapi.json`, `scripts/generate-openapi.ts`,
route mounting, migrations, `src/lib/{authz,auth,db,errors,types}.ts`), `packages/music/**`,
`apps/web/src/App.tsx`, `main.tsx`, `lib/api.ts`, dialog/error infrastructure,
`apps/web/src/lib/playback/**`, `lib/use-virtual-clock.ts`, `lib/musickit.ts`, `styles/**`,
`ritmofit_design_system/**`, `ritmofit_dev_plan/**` except your own handoff. If the rejection turns
out to live in a shared Zod schema or an API route, **stop and report it as a shared-zone request**
rather than editing it.

## 7. Out of scope

Routine copy, cue-at-playhead, teaching drafts, template/Run Live gating, the 15-song cap, any
schema/API/contract change, playback preview behaviour, deferred community surfaces, deploys. The
music constraints in `AGENTS.md` › Music Constraints.

## 8. Orientation

`AGENTS.md` → `agent-prompts/daily/start-session.md` in **Lane** mode → the two open handoffs in
`ritmofit_dev_plan/handoffs/` → `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` "Now" → the audit finding
above → `docs/audits/request-draft-integrity-2026-10-10/` (what #506/#507 protect) → your cluster's
code and tests, plus (read-only) the shared cue/placed-move/class-track schemas and the API routes
that validate anchors.

## 9. Plan you must return before editing

Reproduction finding per anchor kind (file:line evidence), outcome, exact files, shared-zone
requests (if any), acceptance test, verification plan, risks.

## 10. Acceptance criteria and verification

- An explicit zero anchor is accepted wherever the API contract accepts it; positive-duration and
  cue-preservation checks are retained; invalid input still shows the established, announced error.
- A regression test fails before the fix and passes after, per anchor kind that reproduced.
- No change to #506/#507 behaviour; their tests pass untouched.
- No browser or dev-server use during planning. During implementation the browser, GUI and ports
  5173/8787 are serialized: use them only when the orchestrator has given you the slot.
- The CI-equivalent gate from `AGENTS.md` › Verification applies to the PR.

## 11. No-work exit

If nothing reproduces, or no safe slice survives orientation, say so with evidence, write a
`status: closed` handoff, and stay idle. Idle is a correct outcome.

## 12. Close

Run `agent-prompts/daily/close-session.md` in **Lane** mode: push, open the PR (draft until green),
write `ritmofit_dev_plan/handoffs/2026-10-10-r20261010b-lane2-builder-anchors.md` from
`agent-prompts/templates/handoff.md` on your lane branch, and **do not merge** — the orchestrator
runs the merge train.
