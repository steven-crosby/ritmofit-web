# Archived: the remote maintenance loop

Archived 2026-10-06 (Claude Code, docs-workflow session). Owner decision: archive the whole loop.

## What is here

| Path | What it was |
|---|---|
| `remote-prompts/` | Unattended prompts for a remote ephemeral sandbox: `00-house-rules.md`, `daily/` (changed-code sentinel, command brief, hour-commute), `technical/` (stability, quality, security, performance, accessibility, api-contract-parity, test-coverage, dependency-freshness, content-consistency, observability), `planning/` (pr-triage, next-slice-planner, roadmap-sync, release-readiness, doc-drift) |
| `SCHEDULE.md` | The cadence for those prompts: commute loop, weekly rotation, monthly checks, trigger map |
| `agent-reports/` | The after-action report archive (2026-06-26 → 2026-09-15), `AGENT_REPORT_TEMPLATE.md`, and `validate-agent-report.sh`, plus the two root-level Studio critique reports cited by `../../web-ios-parity.md` |

## Why it was retired

The loop was designed for daily and weekly unattended runs, but the archive shows it unused: the
last report is 2026-09-15, and only two runs happened after mid-July. Its prompts duplicated rules
from `AGENTS.md` (the sandbox banner was copied into 18 files) and drifted from the interactive
workflow. Day-to-day work now runs through the session/lane workflow in
[`../../../agent-prompts/README.md`](../../../agent-prompts/README.md), with durable state in
[`../../handoffs/`](../../handoffs/README.md).

Kept live elsewhere: the design-system audit became
[`agent-prompts/design-system-drift.md`](../../../agent-prompts/design-system-drift.md) (its old copy
is not in this archive).

## Reviving it

Links and paths inside these files are frozen as of 2026-10-06 and assume their old locations
(`agent-prompts/remote-prompts/…`, `agent-reports/…`). The validator's usage line
(`./agent-reports/validate-agent-report.sh`) is stale for the same reason. To revive a prompt:
`git mv` it back under `agent-prompts/`, restore `agent-reports/` (template + validator) at the
repo root if it writes reports, re-check every path it references against the current tree, and
reconcile it with `AGENTS.md` › Session Workflow (handoffs, lane rules) before the first run.
