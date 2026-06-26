# Agent Prompt Schedule

Use this schedule as the operating rhythm for `ritmofit-web` background agents. The
default is intentionally lightweight: run the sentinel often, run specialists only when
there is a real signal, and leave merge/deploy decisions to the owner.

## Default commute loop

| Step | Prompt | Timebox | Purpose |
|---|---|---:|---|
| 1 | `daily/changed-code-sentinel.md` | 45 min | Inspect new code since the last completed sentinel and open at most one narrow draft PR. |
| 2 | `daily/command-brief.md` | 10 min | Turn the sentinel report, open PRs, CI status, and plan state into a short owner handoff. |
| 3 | Owner review | 5 min | Decide what to review, merge, defer, or re-run with a specialist prompt. |

Run only step 1 when time is tight. Add step 2 when you want a single prioritized brief
before looking at branches and PRs.

## Weekly rotation

| Day | Primary run | Optional specialist | Use this day for |
|---|---|---|---|
| Monday | `planning/roadmap-sync.md` | `planning/next-slice-planner.md` | Choose the week's highest-value product slice and expose unresolved questions. |
| Tuesday | `technical/stability.md` | `technical/test-coverage.md` | Hunt regressions first, then add coverage around high-blast-radius paths. |
| Wednesday | `technical/design-system.md` | `technical/accessibility.md` | Check visual consistency, tokens, states, keyboard flow, contrast, and motion. |
| Thursday | `technical/security.md` | `technical/dependency-freshness.md` | Review auth, secrets, CVEs, and package freshness. |
| Friday | `planning/pr-triage.md` | `daily/command-brief.md` | Clear the maintenance queue and decide what is ready for human review. |

The weekly rotation is a menu, not a quota. If the sentinel and command brief show no
signal for a specialist, skip the specialist run.

## Monthly checks

| Prompt | Purpose |
|---|---|
| `planning/doc-drift.md` | Keep `AGENTS.md`, README files, setup docs, and planning docs aligned with the repo. |
| `technical/api-contract-parity.md` | Compare backend/OpenAPI/shared schemas against the iOS client read-only. |
| `technical/content-consistency.md` | Check cross-surface terminology, labels, state copy, and formatting. |
| `technical/observability.md` | Check logs, health endpoints, smoke coverage, error envelopes, and deploy evidence. |

## Release or milestone gate

Run these in order before a meaningful release, milestone close, or owner review batch:

1. `planning/release-readiness.md`
2. `planning/pr-triage.md`
3. `sessions/close-session.md` when you want the full interactive repo checklist

Do not deploy from an unattended prompt. Deployment remains an explicit owner decision.

## Trigger map

| Situation | Run |
|---|---|
| Recent commits need regression review | `daily/changed-code-sentinel.md` |
| You want a short current-state handoff | `daily/command-brief.md` |
| No sentinel report exists but you want broad status | `daily/standup-digest.md` |
| No checkpoint exists and you want full-repo triage | `daily/morning-sweep.md` |
| App behavior seems broken, flaky, or crash-prone | `technical/stability.md` |
| App or Worker seems slow | `technical/performance.md` |
| Tests are thin around risky code | `technical/test-coverage.md` |
| Code needs behavior-preserving cleanup | `technical/quality.md` |
| UI implementation may have drifted from the design system | `technical/design-system.md` |
| Keyboard, screen reader, contrast, or reduced-motion behavior is risky | `technical/accessibility.md` |
| Web/backend contract may break iOS | `technical/api-contract-parity.md` |
| Web and iOS copy or terminology may disagree | `technical/content-consistency.md` |
| Auth, secrets, PII, logs, or dependency CVEs are the concern | `technical/security.md` |
| Packages are stale but not necessarily vulnerable | `technical/dependency-freshness.md` |
| Production issues would be hard to detect or diagnose | `technical/observability.md` |
| You need to decide what to build next | `planning/roadmap-sync.md` |
| You need an actionable implementation slice | `planning/next-slice-planner.md` |
| Docs may no longer match reality | `planning/doc-drift.md` |
| You are preparing to ship | `planning/release-readiness.md` |
| You need to clear open maintenance PRs | `planning/pr-triage.md` |
| You are starting interactive coding | `sessions/start-session.md` |
| You are ending an interactive session | `sessions/close-session.md` |

## Anti-churn rules

- Do not run specialist prompts just to keep the schedule full.
- Do not open a PR unless the prompt has concrete evidence and can meet its verification gate.
- Do not use legacy daily prompts when the sentinel and command brief can run.
- Do not let unattended prompts make schema, auth, migration, visual redesign, deployment, or
  product-scope decisions. Those become report-only recommendations.
