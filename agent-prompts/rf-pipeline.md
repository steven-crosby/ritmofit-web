# RF pipeline — one ticket, one builder, independent verify and review

<!-- Claude Code (Neo conductor), 2026-11-24, RF-248: written from the owner's decisions of
2026-11-24 (batch pre-approval, web work in cloud sessions, fix-or-drop findings, both repos). -->

> **The default way to work an RF ticket in ritmofit-web.** A builder implements one task on its
> own branch; agents that did not build it then verify and review it before anyone asks the
> owner. The owner approves work once per batch (`ritmofit_dev_plan/two-machine-rules.md` › 7) or
> once per PR, never twice for the same head. `AGENTS.md` wins on any conflict. For one hand-off
> without the pipeline, use [`delegate-task.md`](delegate-task.md); for broad partitioned work
> across checkouts, [`orchestrate-parallel-round.md`](orchestrate-parallel-round.md).

## Roles

| Role                 | Who                                                                      | Does                                                                                                                        | Never                                                                     |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Conductor**        | The Solo or Orchestrator session the owner works with, or a batch's named conductor | Proposes batches, dispatches builders, tracks each ticket's stage, runs the merge train, keeps the owner-check list | Writes product code; merges outside `AGENTS.md` › "Delegation And Merge Policy" or a batch |
| **Builder**          | One session per ticket, on its own branch and checkout                   | Implements the ticket, fixes findings, publishes the PR                                                                     | Merges; edits another ticket's branch; reviews its own work               |
| **Verifier**         | A fresh-context agent that did not build the change                      | Runs the gate, captures screenshots, checks each provable acceptance line                                                    | Edits product code                                                        |
| **Reviewers (two)**  | Fresh-context agents that did not build the change                       | Correctness review; acceptance audit                                                                                         | Edit anything; read the builder's notes or reasoning                      |
| **Triage**           | The conductor or an agent it starts                                      | Proposes the next batch and P3 cancellations, with evidence                                                                  | Sets Ready or cancels a task on its own                                   |

"Fresh context" means the agent starts from only the diff, the RF record and this repo's rules. It
never sees the builder's chat, plan or summary, so it cannot inherit the builder's assumptions.

## Where work runs

- **Web tickets run in cloud sessions,** one per ticket, so each has its own container, browser and
  ports. The conductor, every wrangler or production step, and all iOS work stay on the Neo
  (`two-machine-rules.md` › 1). A cloud session never runs `wrangler login`, deploys, or touches
  remote D1, secrets or production data.
- **On the Neo instead,** only when a ticket needs something a cloud container lacks (a signed-in
  browser, real provider playback, the owner's device). Such a ticket is not batch-eligible, and
  its browser work is serialized with any other on the Neo.
- **Concurrency:** at most four web builders at once. Merges stay one at a time.

## Stages, per ticket

1. **Eligible.** The conductor confirms the task is Ready (or in the batch's queue), its
   `dependsOn` are Done, and no open PR claims it. It lists the files the builder is expected to
   change and runs `printf '%s\n' <files> | node scripts/owner-gate.mjs`. A gated prediction is
   fine outside a batch; the PR then stops for the owner. When several builders may create RF
   records, the conductor reserves an ID range for each one first.
2. **Build.** The builder runs `daily/start-session.md` in **Builder** mode with the RF record as
   its brief, branches `<type>/rf-<n>-<slug>` from current `origin/main`, records In progress,
   and opens the draft PR as the claim (in a batch, the issue's queue is the claim and the PR
   opens at stage 6). It builds in small vertical slices with focused tests (`AGENTS.md` ›
   "Engineering Rules"), runs the tests it touched, sets the task's final state on the branch
   (`two-machine-rules.md` › 6) and pushes. It hands the conductor the head SHA.
3. **Verify.** The verifier checks out that exact head and runs the CI-equivalent gate in
   `AGENTS.md` › "Verification, PRs, And Commits", including `pnpm e2e`. For a UI change it also
   captures the changed surface at 1440 and 390 wide, with loading, empty, error and permission
   states where they apply. For each acceptance line it reports **proven** (test name or
   screenshot), **not provable here** (real playback, devices, production: an owner check), or
   **failing**. Its verdict names the head SHA.
4. **Review.** On the same head, two reviewers read `git diff origin/main...HEAD`:
   - **Correctness:** the tool's code review at high recall (`/code-review high` in Claude Code),
     reporting findings with the significance test in `AGENTS.md` › "Delegation And Merge Policy".
   - **Acceptance audit:** maps every acceptance line to the diff and the verifier's evidence;
     flags a line the change does not meet, scope beyond the ticket, a contract or design
     implication the PR does not call out, and any music-constraint or authz risk.
5. **Fix.** A significant finding, a failing gate or a failing acceptance line goes back to the
   builder. After the fix, stages 3 and 4 run again on the whole new diff. At most **two** fix
   rounds; after that the ticket **parks**: the PR stays open (draft), the record goes to For
   review with the open findings as its next action, and the conductor tells the owner.
6. **Publish.** The builder fills `.github/pull_request_template.md` plus a **Pipeline** section:
   the verifier's verdict, each reviewer's summary, the head SHA they all checked, how each
   finding was handled, and the owner checks left. It cites the PR as the record's `pr` evidence
   and marks the PR ready for review.
7. **Merge.** The conductor runs the merge train, one PR at a time. In a batch: the merge bar in
   `two-machine-rules.md` › 7.4. Otherwise: `AGENTS.md` › "Delegation And Merge Policy"; the
   stage 4 review of that head is the final review, so the owner is asked once and nothing is
   reviewed again unless the head changes.

## Findings: fix or drop

Reviews no longer grow the backlog by default. For each finding:

- **Significant** (`AGENTS.md` definition): fixed before the PR is ready, or the ticket parks.
- **Small and inside the ticket** (its files and its scope, roughly 20 changed lines or fewer):
  fixed in the same PR.
- **Worth its own task at P1 or P2:** filed as a Backlog RF task and cited in the PR's review
  comment.
- **Anything else:** added as one line to this repo's rolling polish record
  ([RF-249](../ritmofit_dev_plan/tasks/RF-249.json)) citing the PR, or dropped with a one-line
  reason in the review comment. Reviews never file a new P3 record.

The polish record is an ordinary Backlog task; triage proposes it for a batch once its lines are
worth a PR, and the next polish record starts when it closes.

## Batches — the owner's loop

1. **Triage,** weekly or when Ready runs dry. The conductor proposes up to 20 tasks that pass
   `two-machine-rules.md` › 7.3, each with its expected files and the owner-gate result, plus the
   P3 tasks it would cancel, each with evidence (superseded by a named PR, a duplicate of a named
   RF, paused by a decision, or a premise the current code contradicts).
2. **Owner approves** in a live session: the tasks named go to Ready, the cancellations are made
   with the owner's words in each record's evidence, and the pre-approval issue is created
   (`two-machine-rules.md` › 7.1–7.2).
3. **Dispatch:** the conductor starts builders from the queue in its order, within the
   concurrency above, and starts each ticket's verifier and reviewers as its builder hands over.
4. **Merge train** under 7.4, then **close-out** under 7.8.

## Owner checks

A task whose acceptance needs the owner (a device, real provider playback, production, an account
only the owner holds) is never batched. Its next action holds the exact steps. At each close-out,
and whenever the owner asks, the conductor lists every open owner check in both repos as one list:
task, what to do, where, and what result counts, so the owner can clear them in one sitting.

## Measures

Each batch close-out reports: tasks done and created in the window, product PRs vs records-only PRs
merged, how long each ticket took from Ready to merged, tickets parked and why, and any revert. The
pipeline is working when done ≥ created, most merges are product PRs, and nothing is reverted.
