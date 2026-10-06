# Lane brief template (parallel round)

The orchestrator (`../orchestrate-parallel-round.md`) copies this once per selected checkout to
`agent-prompts/daily/start-r<round>-lane<N>-<role>.md` in **that checkout**, fills every section
from the live tree, and leaves the copy **untracked** (never commit a brief; the lane's durable
after-action record is its handoff file). Delete the copy at round close once the handoff has
landed. Never overwrite an existing untracked brief.

---

# Round <R> · Lane <N> — <role, e.g. "SPA: Live Mode hardening">

**Do not implement until the batched plan is confirmed by the owner.**

## 1. Git start state

- Checkout: `<path relative to the workspace container>` · branch `<branch>` · HEAD `<sha>`
- Relationship to `origin/main`: `<equal | ahead N | behind N>`
- Start command: `git fetch origin main && git switch -c <lane-branch> origin/main`
  (or, for continuing work: the exact sync plan — never a silent rebase of a published branch).

## 2. Round partition

<paste the selected three- or four-lane ownership table from orchestrate-parallel-round.md>

## 3. Goal

- Hardening: audit first, then propose the smallest useful fix/coverage slice.
- Feature: propose one self-contained, demoable slice on the existing contract.

## 4. Your files

<concrete current paths from the live tree — not copied from an older brief>

## 5. Other lanes own — do not touch

<per-lane cluster list>

## 6. Shared / frozen zones — coordinate, never edit solo

`packages/shared` (except your owned entities), `apps/api/openapi/openapi.json`,
`apps/api/src/index.ts` route mounting, migrations, `apps/api/src/lib/{authz,auth,db,errors,types}.ts`,
and (four-lane rounds) `Dashboard.tsx`, `App.tsx`, `main.tsx`, `lib/api.ts`, dialog/error infra,
playback helpers, `styles/**`. `apps/api/scripts/generate-openapi.ts` is a hand-maintained manifest:
a no-diff regeneration does not prove a route or DTO was registered.

## 7. Out of scope

Other clusters; migrations without owner approval; deferred community surfaces (AGENTS.md ›
Product Boundaries); the music constraints in AGENTS.md › Music Constraints for any music work.

## 8. Orientation

`AGENTS.md` → `agent-prompts/daily/start-session.md` in **Lane** mode (reads this brief and the
open handoffs) → `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` current focus → your cluster's code and tests.

## 9. Plan you must return before editing

Outcome, exact files, shared-zone requests (if any), acceptance test, verification plan, risks.

## 10. Acceptance criteria and verification

<lane-specific criteria; the CI-equivalent gate from AGENTS.md › Verification applies to the PR>

## 11. No-work exit

If no safe, useful slice survives orientation, say so with evidence, write a `status: closed`
handoff, and stay idle. Idle is a correct outcome.

## 12. Close

Run `agent-prompts/daily/close-session.md` in **Lane** mode: push, open the PR (draft until green),
write `ritmofit_dev_plan/handoffs/YYYY-MM-DD-r<R>-lane<N>-<role>.md` from
`agent-prompts/templates/handoff.md` on your lane branch, and **do not merge** — the orchestrator
runs the merge train.
