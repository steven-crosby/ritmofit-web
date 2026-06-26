# PR triage — process the maintenance queue (read-only by default)

> **READ-ONLY** review + recommendations. Don't merge. The technical prompts OPEN draft
> PRs; this one helps me CLEAR them fast.

For `ritmofit-web`, list every open PR (focus on `auto-maintenance`) and for each give:

- **Verdict:** ✅ ready to merge / 🔧 needs a tweak / ⏸ hold / ❌ close — one-line why.
- **Risk** (low/med/high) and **review effort** (S/M/L).
- **Conflicts / stale:** flag anything behind the base branch or colliding with another
  open PR.
- **Merge order:** a suggested sequence that minimises rebasing.

End with a clean "merge these N now, look harder at these M, close these K" summary.

Archive the triage as an agent report: start from this repo's
`agent-reports/AGENT_REPORT_TEMPLATE.md`, write it to
`agent-reports/YYYY-MM-DD/planning-pr-triage.md` (`inspected_head` = the remote
default-branch head; per-PR verdicts go under `## Findings`; the merge-order summary is
`## Next recommended action`), then run
`./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/planning-pr-triage.md`.
In default read-only mode you open no PRs; if invoked with **ACT**, record any rebased
branches and set `completed: true` only after the rebases verify green.

> Optional: if I include the word **ACT**, read this repo's `AGENTS.md`, fetch first, and
> rebase only trivially stale `auto-maintenance` branches with green checks. Use
> `--force-with-lease` if updating a rebased remote branch. Do not modify source, resolve
> non-trivial conflicts, merge, or act on non-agent branches.
