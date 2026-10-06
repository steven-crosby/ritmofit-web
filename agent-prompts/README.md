# agent-prompts (ritmofit-web)

Reusable, tool-neutral prompts for working on **ritmofit-web** with any agent (Codex, Claude Code,
Cursor), local or cloud, solo or in parallel lanes. `AGENTS.md` is canonical; on conflict it wins.
The sibling `ritmofit-ios` repo keeps its own copy of the session and orchestration prompts — the
method is shared, the partitions and gates are not.

## The workflow

Every session — whatever the tool — runs the same loop, and its durable output is `main` plus a
handoff file, never chat:

```
start-session ──► plan ──► owner confirms ──► execute ──► close-session ──► handoff
   (orient)         (substantial work only)     (PR)       (merge/record)   (owed forward)
```

| Role | Start | Execute | Close | Merge authority |
|---|---|---|---|---|
| **Solo** — one session, one objective | `daily/start-session.md` | branch + PR | `daily/close-session.md` (Solo) | merges its own green PR at close (squash, owner gets a beat to object) |
| **Lane** — one builder in a parallel round | lane brief → `daily/start-session.md` (Lane mode) | lane branch + PR, only owned files | `daily/close-session.md` (Lane) | **none** — the orchestrator merges |
| **Orchestrator** — runs a parallel round | `orchestrate-parallel-round.md` | writes briefs, reconciles plans, no product code | Step 7 + `daily/close-session.md` (Orchestrator) | runs the merge train with explicit owner authority |

Where state lives (so the next session — any tool — can answer "what's next"):

| State | Home |
|---|---|
| Owed forward: in flight, next action, open owner decisions | `ritmofit_dev_plan/handoffs/` — one file per session/lane ([rules](../ritmofit_dev_plan/handoffs/README.md)) |
| Current focus, backlog, main vs production | `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` |
| What shipped and when (deploys, verification) | `ritmofit_dev_plan/HISTORY.md` |
| Locked decisions | `ritmofit_dev_plan/decisions.md` |
| Unshaped ideas | `INBOX.md` (drained at every close) |

Nothing in this folder deploys, applies remote migrations, or changes secrets; those stay explicit
owner decisions in the session that performs them (`ritmofit_dev_plan/deployment-runbook.md`).

## Contents

| Path | What it is | Attended? | Output |
|---|---|---|---|
| [`daily/start-session.md`](daily/start-session.md) | Orientation: git, PRs, handoffs, unrecorded merges, trackers, production evidence, one recommended action | yes | chat baseline + plan |
| [`daily/close-session.md`](daily/close-session.md) | Wrap: git/PR/branch hygiene, optional gates and deploy reconcile, handoff, docs sync | yes | PR merged or handed off + handoff file |
| [`orchestrate-parallel-round.md`](orchestrate-parallel-round.md) | Run 3–4 concurrent lane-agents across sibling checkouts: map → partition → briefs → plan gate → CI gate → merge train → cleanup | yes (orchestrator) | merged lane PRs + round handoff |
| [`templates/handoff.md`](templates/handoff.md) | Handoff file template | — | — |
| [`templates/lane-brief.md`](templates/lane-brief.md) | Lane brief template (copied untracked per lane) | — | — |
| [`design-system-drift.md`](design-system-drift.md) | Report-only canon-drift audit: design-system canon vs code vs rendered browser truth | either; local + browser | `docs/audits/design-system-drift-<date>/` on a docs PR |
| [`live-ux-deep-dive.md`](live-ux-deep-dive.md) | Production UI/UX assessment vs canon + modern standards (Claude-specific mechanics, with fallbacks) | yes; production | published report, nothing committed |
| [`design-audit/`](design-audit/README.md) | Full-product design audit → ranked backlog → navigable prototype → proposed implementation prompts | yes; hours | one `docs/audits/<agent>-design-audit-<date>/` folder, no Git commands |
| [`instructor-ux/`](instructor-ux/README.md) | Creation-journey UX: build pass ships one slice; challenge pass tries to prove it still fails | yes; local only | PR + report (build), report only (challenge) |
| [`browser-verification/`](browser-verification/README.md) | Zero-dependency Chrome DevTools harness: contrast, focus rings, overflow, reduced motion. Run its self-test first | tooling | measurements |

## Decision guide

- **Starting any work block:** `daily/start-session.md`. **Ending one:** `daily/close-session.md`.
- **Several independent slices, several free checkouts:** `orchestrate-parallel-round.md` (from the
  workspace container root, not inside a checkout).
- **The UI drifted from the design system:** `design-system-drift.md`.
- **You want an outside-eye pass on the live site:** `live-ux-deep-dive.md`.
- **You want a full redesign-grade audit and prototype:** `design-audit/` (rare; hours; adds a
  permanent `docs/audits/` folder).
- **The class-creation journey feels slow or confusing:** `instructor-ux/01-build-pass.md`, then
  `02-challenge-pass.md` once in a fresh session after the slice lands.
- **"Verify in a real browser":** `browser-verification/`.

None of these run on a schedule. Run a specialist prompt only when a session baseline or handoff
names a concrete signal for it.

## Retired: the remote maintenance loop

The unattended remote/background loop — `remote-prompts/` (sentinel, command brief, weekly
technical and planning audits), `SCHEDULE.md`, and the `agent-reports/` archive with its template
and validator — produced no reports after 2026-09-15 and was archived on 2026-10-06 to
[`../ritmofit_dev_plan/archive/remote-loop/`](../ritmofit_dev_plan/archive/remote-loop/README.md).
Its one prompt still in use, the design-system audit, lives on as `design-system-drift.md`. The
archive README explains how to revive the loop if unattended runs become useful again.
