# Design System Masterclass — Invocation Guide

This is a **special, heavyweight, read-only evaluation pass**. It produces no code changes — only an exhaustive dual-audience report.

## Quick start (paste into a fresh agent session)

Copy everything below this line and paste it as the very first message to a new Grok (or equivalent) session that has access to this repository. The agent will receive the full detailed prompt from disk.

---

You are about to perform a frontend design-system masterclass evaluation.

First action: read the full prompt at:

`agent-prompts/design-system-masterclass.md`

Then execute it exactly as written. Produce only the report (no source edits). Follow every mandatory pre-work step, evaluation dimension, and output structure requirement in that file.

Repo root context is already available. The main prompt now directs output to the root of agent-reports/ (with optional date suffix on re-runs).

Begin.

---

## Alternative (full prompt paste)

If the target agent session cannot easily "read the file from disk," you can paste the entire content of `design-system-masterclass.md` directly as the user message. It is self-contained once the agent also has repo access for exploration.

## Expected output

The agent will write the primary report directly to:

`agent-reports/design-system-masterclass.md`

(or a dated variant such as `agent-reports/design-system-masterclass-2026-06-28.md` if re-running).

This is a deliberate exception to the normal `agent-reports/YYYY-MM-DD/` subfolder convention because this is a special heavyweight, standing masterclass deliverable.

The report is deliberately structured in two layers:
- Human narrative + critique (readable end-to-end)
- Implementation backlog with precise specs (actionable by a subsequent implementer agent)

## House rules adaptation for this run

This prompt explicitly instructs the agent to be **report-only**. It overrides the normal "leave a code PR" behavior of remote prompts. The agent should not create feature branches for fixes during the evaluation pass.

## Post-run

1. Review the generated report.
2. If you decide to implement, you (or another agent) can be given targeted slices of the "Implementation Backlog" section plus a condensed brief from the end of the report.
3. The masterclass report itself becomes a durable artifact for launch readiness reviews and future design-system work.

## Notes for future refreshes

- Re-run this full masterclass after significant component or token work, or before major parity wrap-up.
- The lighter `design-system.md` remains the weekly "drift check" tool.
- Update the date in the prompt and report paths when re-executing.
