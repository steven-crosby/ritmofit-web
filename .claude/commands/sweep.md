---
description: Ritmo Studio morning sweep — light triage on this repo; opens at most 1 draft PR + a ranked report
---

Operate on this repository (`ritmofit-web`). The prompt library lives under
`agent-prompts/remote-prompts/`; resolve every path below relative to the repo root.

Read and follow these, then run the sweep:

1. `agent-prompts/remote-prompts/00-house-rules.md` — guardrails (isolated worktree, branch per
   concern, **at most 1 draft PR per run**, never merge/deploy, verify before the PR, write a
   validated agent report).
2. Web retired the broad all-dimension sweep in favor of the commit-delta pass:
   - Follow `agent-prompts/remote-prompts/daily/changed-code-sentinel.md` — inspect new code since
     the last completed sentinel.
   - Then `agent-prompts/remote-prompts/daily/command-brief.md` for the owner handoff.

Open a draft PR for at most the **1** highest-confidence, lowest-risk win (security follows its
report-first rule). Everything else goes in the durable agent report required by the house rules,
not the diff. Goal: a report readable in 2 minutes and a PR mergeable in 5.
