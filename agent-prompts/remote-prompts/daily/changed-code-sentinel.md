# Changed-code regression sentinel — primary commute agent (ritmofit-web)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`

**REPO:** `ritmofit-web`
**MODE:** investigate broadly; patch narrowly; draft PRs only
**TIMEBOX:** 45 minutes

Inspect changes since this sentinel last completed successfully for this repo. Find the
`inspected_head` in the newest completed matching report under this repo's
`agent-reports/` (repo-root-relative). If no usable report exists, inspect
the last 24 hours or at most 20 commits from the remote default branch. Record the exact
range used. The range is always:

`previous inspected_head..current remote default-branch head`

The current remote default-branch head becomes this run's `inspected_head`, even when a
fix is committed on a separate agent branch. Never use the PR head as the next checkpoint.
If the previous checkpoint is not an ancestor of the current head, report the rewritten
history and inspect from the merge base without silently advancing the checkpoint.

First establish a clean baseline:

1. Read `CLAUDE.md` and the live plan/build-order material it names.
2. Fetch the remote default branch and inspect recent commits, merged PRs, open PRs, and
   CI status.
3. Run the cheapest relevant checks before changing anything. If the baseline is red,
   investigate and report the root cause; only patch it when the failure is deterministic,
   recent, isolated, and within this prompt's scope.

Before opening a PR, run this repo's complete submission gate: the full CI-equivalent
command list in `ritmofit-web/CLAUDE.md` (typecheck, lint, test, build for the SPA + the
Worker/API).

If the full required gate cannot complete inside the timebox, do not open the PR. Preserve
the branch if useful and report the exact remaining verification.

Review the changed code and its immediate callers for regression risk:

- failing / skipped / flaky tests or tests that assert nothing;
- incorrect edge-case handling, swallowed errors, unsafe logging, timeout/retry mistakes, or crash paths;
- missing or weakened authorization / hidden-resource behavior;
- run-payload nullability/enum contract drift that the iOS client decodes;
- D1 migrations that could fail forward.

For UI states, design tokens, performance, accessibility, or content/copy issues, **surface them briefly for the relevant specialist prompt** (design-system.md, accessibility.md, performance.md, content-consistency.md, etc.) rather than investigating deeply yourself.

Prioritize user-facing breakage, data loss, authorization, live-class reliability, and
cross-client incompatibility. Ignore unrelated pre-existing cleanup.

You have full authority within this scope to autonomously decide and execute **at most one** small draft PR, but only when **all** of the following are true:

- you have concrete evidence of a recent regression;
- the fix is narrow and small enough for quick review;
- you add a focused regression test (when behavior changes);
- you can complete the full relevant verification gate inside the timebox.

If the fix belongs primarily to another specialist dimension (UI, performance, design tokens, etc.), report it instead of opening a PR.

End by writing the agent report required by the house rules. Rank unresolved findings as
P0–P3 and include `file:line`, evidence, user impact, recommended owner, and whether a
future sentinel should re-check it.
