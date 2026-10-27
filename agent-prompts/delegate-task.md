# Delegate a task — one agent, one task, one PR

<!-- Claude Code, 2026-10-27: Added for the owner's hand-off-and-review workflow. -->

> **Shortest hand-off:** move an RF task to **Ready** and tell an agent "take the top Ready task;
> follow agent-prompts/delegate-task.md". The record is the brief.

> **For the owner:** fill in the brief below and paste it to any agent (Claude Code subagent or
> background task, Cursor background agent, Codex). It is the scope confirmation, so the agent plans
> and executes without waiting. You review the PR it opens. For three or more concurrent tasks across
> sibling checkouts, use [`orchestrate-parallel-round.md`](orchestrate-parallel-round.md) instead.

## Brief (owner fills in)

```text
Task: <one observable outcome, e.g. "Live Mode shows the next cue's time on phone widths">
RF: <RF-N (set it to Ready), or "create one">
Done when: <1–3 checks a reviewer can see — test, screenshot, behavior>
Out of scope: <anything the agent must not touch or decide>
Questions: <"ask me" | "make a sensible call and flag it in the PR">

Follow agent-prompts/delegate-task.md in ritmofit-web.
```

## Agent instructions

You are a Solo session working under `AGENTS.md` › "Delegation And Merge Policy". The brief is your
scope approval. Do not wait for plan confirmation unless the work must grow beyond the brief or it
leaves a product decision open; then ask **one** focused question, with your recommended option first.

1. **Start.** Run [`daily/start-session.md`](daily/start-session.md) in Solo mode with this brief as
   the objective. Branch from current `origin/main` in your own checkout or worktree; never work on
   another session's branch or uncommitted changes. Select or create the RF task, move it to In
   progress, and open a **draft PR** as the claim, as that prompt describes. Skip a task whose draft
   PR another session already opened. Add your PR's URL to the record's evidence.
2. **Classify early.** Compare the files you expect to touch with `scripts/owner-gate.mjs`. If any
   are owner-gated, the PR stops at review; say so in your plan rather than discovering it in CI.
3. **Build in small vertical slices** with focused tests (`AGENTS.md` › "Engineering Rules"). UI
   work includes loading, empty, error and permission states at 1440 and 390 wide.
4. **Verify like the reviewer can't.** The owner will not run the app. Run the CI-equivalent gate
   locally (`AGENTS.md` › "Verification, PRs, And Commits"), including `pnpm e2e`. If you changed a
   UI surface the smoke does not visit, capture before/after screenshots yourself. If the change
   could affect real provider playback, devices or production, say exactly which check remains.
5. **Finish the PR.** Set the task's final state (usually Done, with test evidence) in this same
   PR; CI's RF-trace step fails product changes without a record citing the PR. Fill every section
   of `.github/pull_request_template.md`, even when passing the body on the command line, then mark
   the draft ready.
6. **Close.** Run [`daily/close-session.md`](daily/close-session.md) (Solo). If the PR is not
   owner-gated, wait for the required check on the final head, then squash-merge with
   `--match-head-commit`. If it is owner-gated, add `needs-owner` and stop. Never apply
   `owner-approved`, deploy, or delete branches.
7. **Report** in under ten lines: the PR link, merged or waiting on the owner, the verification that
   ran, and anything the owner must still check by hand.
