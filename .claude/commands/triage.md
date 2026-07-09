---
description: Ritmo Studio PR triage — read-only review of open auto-maintenance PRs on this repo (add ACT to rebase trivially-stale green ones)
argument-hint: "[ACT] (optional — rebase trivially-stale green PRs)"
---

Operate on this repository (`ritmofit-web`). Read and follow the pr-triage prompt, resolved relative
to the repo root:
`agent-prompts/remote-prompts/planning/pr-triage.md`.

Triage the open PRs on this repository. Default to read-only (review + recommendations, no merging).
Honor the file's `ACT` rule only if my input includes it: $ARGUMENTS
