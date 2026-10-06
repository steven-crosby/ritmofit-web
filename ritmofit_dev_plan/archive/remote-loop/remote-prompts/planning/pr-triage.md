# PR triage — process the maintenance queue

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **TRIAGE + SAFE REBASE.** Review and recommend, and **push rebased branches** to keep the
> queue mergeable — but never merge. The technical prompts OPEN draft PRs; this one helps me
> CLEAR them fast. Read this repo's `AGENTS.md` and fetch first.

You have full autonomy within this scope to triage, rebase trivially-stale green auto branches (with --force-with-lease), and produce the report without further input.

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
`./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/planning-pr-triage.md`,
then commit it and push the branch. Record any rebased branches in the report and set
`completed: true` only after the rebases verify green.

> **Safe rebase (default):** rebase only **trivially stale** `auto-maintenance` branches that
> have green checks, and push them with `--force-with-lease`. Do not modify source, resolve
> non-trivial conflicts, merge, or touch non-agent branches — those stay verdicts in the
> report. If you want a pure read-only pass with no branch pushes, invoke with **REPORT-ONLY**.
