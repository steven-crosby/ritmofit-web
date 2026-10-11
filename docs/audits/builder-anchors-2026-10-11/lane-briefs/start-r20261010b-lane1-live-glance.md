# Round r20261010b · Lane 1 — SPA: Live portrait glance (iPhone 375×812)

**Do not implement until the batched plan is confirmed by the owner.**

Orchestrator: Claude Code (primary checkout). Builders: Claude subagents, one isolated git worktree
each. The owner cannot witness or confirm audio this session: **no provider playback is started,
and no playback-runtime behaviour changes.**

## 1. Git start state

- Checkout: an isolated worktree of `ritmofit-web` created for this lane · base `origin/main` ·
  HEAD `14c8326db9390e09dfb193e97ffa3d4c1fdf89f7`
- Relationship to `origin/main`: equal
- Start command: `git fetch origin main && git switch -c claude/r20261010b-lane1-live-glance origin/main`

## 2. Round partition

Two builders, both in the SPA, using the Builder/Live split from
`agent-prompts/orchestrate-parallel-round.md` (four-builder table, FE half only). No back-end lanes.

| Lane  | Owns                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------- |
| **1** | **FE: Live Mode presentation** — `LiveMode`, `LiveTimeline` and their tests                       |
| **2** | **FE: Builder correctness** — choreography/anchor entry, sole owner of `Dashboard.tsx`            |

## 3. Goal

Feature, presentation only. The instructor benchmark (2026-09-29) ranks a **portrait-first glance
screen** P0: the real user runs spin classes with an iPhone in portrait on the handlebars and can
only glance. Its evidence at 375×812 (`docs/audits/instructor-benchmark-2026-09-29/evidence/README.md`,
`iphone-portrait-short-cue.jpg`, `iphone-portrait-long-cue.jpg`): "Next" is cut off, a long cue
pushes Next and its countdown off screen, notes fall below the fold.

**That evidence predates #504 (`0ec1d10`, "prioritize Live timing and complete guidance") and
`eeec377` (200% zoom).** First re-establish the current state at 375×812 with a short cue and a long
cue. If the glance problem is already resolved on `main`, take the no-work exit (§11).

Otherwise propose the smallest layout change so that, at 375×812 portrait during a running class,
the current cue, the time remaining to the next cue, and the next cue are all visible without
scrolling, for both a short and a long cue. OD-02 stands: the next cue is Live's visual hero; BPM is
prominent but subordinate.

## 4. Your files

- `apps/web/src/components/LiveMode.tsx`, `apps/web/src/components/LiveMode.test.tsx`
- `apps/web/src/components/LiveTimeline.tsx`, `apps/web/src/components/LiveTimeline.test.tsx`
- `apps/web/src/components/LivePreflight.tsx`, `apps/web/src/components/LivePreflight.test.tsx`
  (only if the glance layout requires it; say so in the plan)
- New test files beside these, and evidence under `docs/audits/live-glance-2026-10-10/`

## 5. Other lanes own — do not touch

Lane 2: `apps/web/src/components/Dashboard.tsx` (+ test), `ChoreographyEditor.tsx` (+ test),
`TrackPreview.tsx` (+ test), `CuesSection.test.tsx`, `MovesSection.test.tsx`, `MovesPicker.test.tsx`,
`apps/web/src/lib/duration.ts` (+ test).

## 6. Shared / frozen zones — coordinate, never edit solo

`packages/shared`, `apps/api/**` (including `openapi/openapi.json`, `scripts/generate-openapi.ts`,
route mounting, migrations, `src/lib/{authz,auth,db,errors,types}.ts`), `packages/music/**`,
`apps/web/src/App.tsx`, `main.tsx`, `lib/api.ts`, dialog/error infrastructure,
**`apps/web/src/lib/playback/**`, `lib/use-virtual-clock.ts`, `lib/musickit.ts`,
`lib/live-readiness.ts`**, `styles/**`, `ritmofit_design_system/**`, `ritmofit_dev_plan/**` except
your own handoff. List any request in the plan; do not edit one on your own.

## 7. Out of scope

Playback runtime, adapters, clock, liveness, seek, or recovery behaviour. Beats-to-next-cue counts
(open owner question). New cue/note schema. iPad or landscape redesign beyond not regressing them.
Deferred community surfaces. Deploys. The music constraints in `AGENTS.md` › Music Constraints.

## 8. Orientation

`AGENTS.md` → `agent-prompts/daily/start-session.md` in **Lane** mode → the two open handoffs in
`ritmofit_dev_plan/handoffs/` → `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` "Now" →
`ritmofit_design_system/README.md` plus the Live/layout/motion guidance that applies → the benchmark
evidence above → `docs/audits/ux-clarity-2026-10-08/integration-audit/README.md` (how the last round
verified Live with mocked playback) → your cluster's code and tests.

## 9. Plan you must return before editing

Current-state finding at 375×812 (with how it was established), outcome, exact files, shared-zone
requests (if any), acceptance test, verification plan, risks, and any owner design call.

## 10. Acceptance criteria and verification

- At 375×812 portrait, running state: current cue, countdown to next cue, and next cue visible
  without scrolling for a short cue and a long cue; no horizontal overflow.
- No regression at 1280, 953, 680, 390, 320 widths, the `max-height:480px` compact path, or the
  200% zoom reachability fixed in `eeec377`.
- Keyboard access, visible focus, labels, and `prefers-reduced-motion` preserved; tokens only.
- Browser checks use viewport **emulation** and mocked/synthetic playback only. The browser, GUI and
  ports 5173/8787 are serialized: use them only when the orchestrator has given you the slot.
- The CI-equivalent gate from `AGENTS.md` › Verification applies to the PR. State plainly that
  provider, device, and audible acceptance are not established.

## 11. No-work exit

If the glance problem no longer reproduces, or no safe slice survives orientation, say so with
evidence, write a `status: closed` handoff, and stay idle. Idle is a correct outcome.

## 12. Close

Run `agent-prompts/daily/close-session.md` in **Lane** mode: push, open the PR (draft until green),
write `ritmofit_dev_plan/handoffs/2026-10-10-r20261010b-lane1-live-glance.md` from
`agent-prompts/templates/handoff.md` on your lane branch, and **do not merge** — the orchestrator
runs the merge train.
