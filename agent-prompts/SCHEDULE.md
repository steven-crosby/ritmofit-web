# Agent Prompt Schedule

**This file is the single source of truth for prompt cadence** (the README describes the prompts;
this file says when to run them). Use this schedule as the operating rhythm for `ritmofit-web`
prompts. The default is
intentionally lightweight: use `daily/start-session.md` and `daily/close-session.md` for
personal work blocks, run remote/background agents only when useful, and leave
merge/deploy decisions to the owner.

## Personal session loop

| Step | Prompt | Purpose |
|---|---|---|
| 1 | `daily/start-session.md` | Orient against git state, plans, recent work, parity impact, and likely verification before editing. |
| 2 | Work session | Implement only after the owner confirms substantial plans. |
| 3 | `daily/close-session.md` | Check git/PR/deploy/docs hygiene, run appropriate gates, and leave a clean handoff. |

Run this loop whenever a session starts or ends, even multiple times in one day.

## Remote/background commute loop

| Step | Prompt | Timebox | Purpose |
|---|---|---:|---|
| 1 | `remote-prompts/daily/changed-code-sentinel.md` | 45 min | Inspect new code since the last completed sentinel and open at most one narrow draft PR. |
| 2 | `remote-prompts/daily/command-brief.md` | 10 min | Turn the sentinel report, open PRs, CI status, and plan state into a short owner handoff. |
| 3 | Owner review | 5 min | Decide what to review, merge, defer, or re-run with a specialist prompt. |

Run only step 1 when time is tight. Add step 2 when you want a single prioritized brief
before looking at branches and PRs. These prompts are optional maintenance helpers, not the
default personal-session path.

## Weekly rotation

| Day | Primary run | Optional specialist | Use this day for |
|---|---|---|---|
| Monday | `remote-prompts/planning/roadmap-sync.md` | `remote-prompts/planning/next-slice-planner.md` | Choose the week's highest-value product slice and expose unresolved questions. |
| Tuesday | `remote-prompts/technical/stability.md` | `remote-prompts/technical/test-coverage.md` | Hunt regressions first, then add coverage around high-blast-radius paths. |
| Wednesday | `remote-prompts/technical/design-system.md` | `remote-prompts/technical/accessibility.md` | Check visual consistency, tokens, states, keyboard flow, contrast, and motion. (`design-system` is a report-only deep audit; run it in a local worktree with a browser.) |
| Thursday | `remote-prompts/technical/security.md` | `remote-prompts/technical/dependency-freshness.md` | Review auth, secrets, CVEs, and package freshness. |
| Friday | `remote-prompts/planning/pr-triage.md` | `remote-prompts/daily/command-brief.md` | Clear the maintenance queue and decide what is ready for human review. |

The weekly rotation is a menu, not a quota. If the sentinel and command brief show no
signal for a specialist, skip the specialist run.

## Monthly checks

| Prompt | Purpose |
|---|---|
| `remote-prompts/planning/doc-drift.md` | Keep `AGENTS.md`, README files, setup docs, and planning docs aligned with the repo. |
| `remote-prompts/technical/api-contract-parity.md` | Compare backend/OpenAPI/shared schemas against the iOS client read-only. |
| `remote-prompts/technical/content-consistency.md` | Check cross-surface terminology, labels, state copy, and formatting. |
| `remote-prompts/technical/observability.md` | Check logs, health endpoints, smoke coverage, error envelopes, and deploy evidence. |

## Release or milestone gate

Run these in order before a meaningful release, milestone close, or owner review batch:

1. `remote-prompts/planning/release-readiness.md`
2. `remote-prompts/planning/pr-triage.md`
3. `daily/close-session.md` when you want the full interactive repo checklist

Do not deploy from an unattended prompt. Deployment remains an explicit owner decision.

## Trigger map

| Situation | Run |
|---|---|
| You are starting a personal work session | `daily/start-session.md` |
| You are ending a personal work session | `daily/close-session.md` |
| Recent commits need regression review | `remote-prompts/daily/changed-code-sentinel.md` |
| You want a short current-state handoff | `remote-prompts/daily/command-brief.md` |
| App behavior seems broken, flaky, or crash-prone | `remote-prompts/technical/stability.md` |
| App or Worker seems slow | `remote-prompts/technical/performance.md` |
| Tests are thin around risky code | `remote-prompts/technical/test-coverage.md` |
| Code needs behavior-preserving cleanup | `remote-prompts/technical/quality.md` |
| UI implementation may have drifted from the design system | `remote-prompts/technical/design-system.md` |
| Keyboard, screen reader, contrast, or reduced-motion behavior is risky | `remote-prompts/technical/accessibility.md` |
| Web/backend contract may break iOS | `remote-prompts/technical/api-contract-parity.md` |
| Web and iOS copy or terminology may disagree | `remote-prompts/technical/content-consistency.md` |
| Auth, secrets, PII, logs, or dependency CVEs are the concern | `remote-prompts/technical/security.md` |
| Packages are stale but not necessarily vulnerable | `remote-prompts/technical/dependency-freshness.md` |
| Production issues would be hard to detect or diagnose | `remote-prompts/technical/observability.md` |
| You need to decide what to build next | `remote-prompts/planning/roadmap-sync.md` |
| You need an actionable implementation slice | `remote-prompts/planning/next-slice-planner.md` |
| Docs may no longer match reality | `remote-prompts/planning/doc-drift.md` |
| You are preparing to ship | `remote-prompts/planning/release-readiness.md` |
| You need to clear open maintenance PRs | `remote-prompts/planning/pr-triage.md` |
| You are starting interactive coding | `daily/start-session.md` |
| You are ending an interactive session | `daily/close-session.md` |

## Anti-churn rules

- Do not run specialist prompts just to keep the schedule full.
- Do not open a PR unless the prompt has concrete evidence and can meet its verification gate.
- For unattended coverage of recent changes, prefer the sentinel + command brief over ad-hoc
  specialist runs.
- Do not let unattended prompts make schema, auth, migration, visual redesign, deployment, or
  product-scope decisions. Those become report-only recommendations.
