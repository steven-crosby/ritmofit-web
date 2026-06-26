# Changed-code regression sentinel — primary commute agent (ritmofit-web)

> **Follow the house rules first:**
> `/Users/stevencrosby/Repos/RitmoFit/ritmofit-web/agent-prompts/00-house-rules.md`

**REPO:** `ritmofit-web`
**MODE:** investigate broadly; patch narrowly; draft PRs only
**TIMEBOX:** 45 minutes

Inspect changes since this sentinel last completed successfully for this repo. Find the
`inspected_head` in the newest completed matching report under
`/Users/stevencrosby/Repos/RitmoFit/agent-reports/`. If no usable report exists, inspect
the last 24 hours or at most 20 commits from the remote default branch. Record the exact
range used. The range is always:

`previous inspected_head..current remote default-branch head`

The current remote default-branch head becomes this run's `inspected_head`, even when a
fix is committed on a separate agent branch. Never use the PR head as the next checkpoint.
If the previous checkpoint is not an ancestor of the current head, report the rewritten
history and inspect from the merge base without silently advancing the checkpoint.

First establish a clean baseline:

1. Read `AGENTS.md` and the live plan/build-order material it names.
2. Fetch the remote default branch and inspect recent commits, merged PRs, open PRs, and
   CI status.
3. Run the cheapest relevant checks before changing anything. If the baseline is red,
   investigate and report the root cause; only patch it when the failure is deterministic,
   recent, isolated, and within this prompt's scope.

Before opening a PR, run this repo's complete submission gate: the full CI-equivalent
command list in `ritmofit-web/AGENTS.md` (typecheck, lint, test, build for the SPA + the
Worker/API).

If the full required gate cannot complete inside the timebox, do not open the PR. Preserve
the branch if useful and report the exact remaining verification.

Review the changed code and its immediate callers for:

- regression risk and incorrect edge-case handling;
- missing or weakened tests;
- API/OpenAPI contract drift the iOS client decodes, especially nullability and enums;
- missing authorization or hidden-resource behavior;
- swallowed errors, unsafe logging, timeout/retry mistakes, or crash paths;
- incomplete loading, empty, error, offline, permission, accessibility, or reduced-motion
  states on changed UI;
- hardcoded values that bypass the documented design-token source;
- stale plan or setup documentation directly caused by the inspected changes.

Prioritize user-facing breakage, data loss, authorization, live-class reliability, and
cross-client incompatibility. Ignore unrelated pre-existing cleanup.

You may open at most **1 draft PR**, and only when the fix is:

- supported by concrete evidence;
- small enough to review quickly;
- accompanied by a focused regression test when behavior changes;
- fully verified with the repo's required relevant gates.

Do not weaken, skip, or delete a test to get green. Do not make backend contract,
database migration, authentication architecture, dependency-major, or visual-design
decisions unattended; report those with a recommended next step.

End by writing the agent report required by the house rules. Rank unresolved findings as
P0–P3 and include `file:line`, evidence, user impact, recommended owner, and whether a
future sentinel should re-check it.
