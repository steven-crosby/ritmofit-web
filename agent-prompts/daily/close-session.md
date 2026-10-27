# Close-session — wrap up a Ritmo Studio work session

<!-- Codex, 2026-10-27: Ordered RF reconciliation and final validation before publication; made permissions explicit. -->
<!-- Claude Code, 2026-10-27: Pointed permissions at the AGENTS.md standing delegation grant and owner gate. -->
<!-- Claude Code, 2026-10-27: Done lands in the work PR with its PR link; handoffs are restart notes only. -->

> **INTERACTIVE.** Use whenever a work session ends — any tool, local or cloud, solo or lane.
> Pair with [`start-session.md`](./start-session.md). Complete the pre-publication steps before
> committing, pushing or merging. Permissions already granted include the standing grant in
> `AGENTS.md` › "Delegation And Merge Policy"; ask only for a missing permission needed for the next
> action. Do not reopen settled approvals.

The durable state is the canonical RF records on `main`, plus tracked plans, evidence and session
handoffs. An external board and chat are not authority. Every change, including docs and task
records, goes through a PR; never push straight to `main`. Merging does not deploy.

## Mode, depth and order

- **Solo:** owns its work and PR; squash-merges under the standing grant when final-head checks pass
  and the PR is not owner-gated.
- **Lane:** prepares its assigned work and handoff; never merges. The orchestrator runs the merge train.
- **Orchestrator:** follow `../orchestrate-parallel-round.md` for the round and apply these RF,
  evidence and permission rules before its authorized merge train. No product code.

**Light:** baseline, RF reconciliation, handoff/docs, final task validation, authorized publication
and summary. **Full:** also run any outstanding CI-equivalent gates for code, contracts, schema or
deployment behavior and production reconciliation when relevant. Do not repeat checks on unchanged
content merely to close; material edits invalidate the affected checks. Task validation is mandatory
in every mode/depth after the final record, evidence, handoff and documentation edits.

**Order:** inspect → reconcile tasks and finish files → verify final content → publish if authorized
→ reconcile any deployment/post-publication observations → summarize. Any subsequent file edit
returns to final validation before that edit is published. If start-session never ran, still close
from verified sources and state what orientation evidence is missing.

## 1. Baseline and authority

- [ ] Confirm branch/HEAD, `git status -sb`, upstream sync and fetched `origin/main` as needed. Own
  only this session's changes; never stash, discard, overwrite or include unrelated work. Leave
  out-of-scope local files alone. If current task records differ from upstream or relevant open PR
  heads, reconcile the revision boundary before changing shared task state.
- [ ] Identify the session's RF IDs, PRs and handoff, and the permissions already granted for
  commit, push, PR creation, merge, deploy and deletion. The standing grant covers commit, push, PR
  and merge of non-owner-gated work; deploy and deletion are never in it. None implies another. Task state, a green
  gate, this prompt and the Solo role do not grant a missing permission. Continue authorized local
  preparation; put any missing publication permission in an open publication/follow-up RF task's
  next action. A completed implementation task can stay Done with that follow-up link; do not add
  a next action to a Done record or misclassify completed implementation as unfinished.
- [ ] Read the task workflow at `ritmofit_dev_plan/tasks/README.md`. If task validation fails,
  distinguish board-only drift from invalid records/paths as in start-session. Repair only within
  authorized scope. Do not publish invalid records or use an external board as a fallback.

## 2. Reconcile RF records and finish all files

- [ ] For each selected task, compare its actual acceptance with results and live sources. Update
  bounded evidence (`checkedOn`, environment, exactly what passed), then choose the truthful state:
  - **Done:** this task's acceptance is met, evidence and resolution are present, prerequisites are
    Done and children are closed; `nextAction` and `blocker` are null. Set Done **inside the work
    PR**, with that PR's URL as `pr` evidence: merging the PR publishes Done, and a closed PR never
    reaches `main`. Acceptance never lists "merged" itself. Deployment and audible acceptance remain
    separate claims; do not imply either occurred merely because implementation passed.
  - **For review:** a scoped plan/result awaits review; record the concrete review action.
  - **Blocked:** record the missing input/condition, who or what unblocks it and the restart action.
  - **Backlog/Ready:** work is deliberately parked and no longer actively executing. Ready requires
    fulfilled prerequisites and established scope authority. Do not leave an idle session's task
    In progress; retain that state only when a named session is actually continuing it.
  - **Cancelled:** explain the approved reject/supersede/duplicate disposition and link the replacement.
- [ ] Give remaining acceptance or verification a follow-up RF ID when outside the completed task's
  bounded scope. Keep the product acceptance task open when the outcome is unverified. Capture new
  work or explicit defer/reject/duplicate dispositions in RF records, not parallel backlog lists.
  If acceptance requires a deploy or another event after merge, keep that acceptance in a follow-up
  task; only such post-merge facts go on a follow-up PR, never the merge itself.
- [ ] Write a handoff from `agent-prompts/templates/handoff.md` only when a successor needs context
  the RF record cannot hold (unfinished branch state, dated observations, a device check in flight);
  lanes and orchestrators always leave one. The next action, owner decisions and evidence go in the
  RF record, never only in the handoff. Do not write a handoff just to record a merge or `main` vs
  production. Describe expected merge state conditionally; do not report a future merge as fact.
- [ ] Retire a handoff once every obligation is completed or routed; the standing grant covers
  deleting the file in a PR.
  Never edit another active lane's handoff. Before removing a file cited by task evidence, preserve
  the evidence in a durable repo document or immutable commit link and update the references without
  upgrading the claim's verification status. If deletion is not authorized, retain it and route cleanup.
- [ ] Drain authorized INBOX breadcrumbs into RF records, decisions or other owning docs. Keep
  `DEVELOPMENT_PLAN.md` focused on direction/current production state; `HISTORY.md` owns deployment
  evidence. Update focused conventions/runbooks when their subject changed. No unrelated cleanup.

## 3. Final validation — before every publication

- [ ] After **all** task, evidence, handoff, retirement and documentation edits, run:

  ```bash
  pnpm tasks:render
  pnpm tasks:check
  git diff --check
  ```

  Run these in Light, Full, Solo, Lane and Orchestrator closes alike. Fix invalid records/paths
  before rendering; a stale board alone is regenerated from the records. Never hand-edit the board.
- [ ] Docs/task-only changes: run `pnpm format:check` and check touched local links/paths. Planning,
  agent-prompt and audit directories are Prettier-ignored; a format pass does not check their links
  or prose. Run `pnpm tasks:test` when task tooling changes. Code/contracts/schema/deployment
  behavior: run the outstanding CI-equivalent gate in `AGENTS.md`; do not duplicate that gate here.
- [ ] Review the complete in-scope diff, including new files. Preserve evidence limits, check for
  secrets and unintended scope, and verify the generated board belongs to the final records.
  Any later file edit requires the affected checks and final task validation again before publication.

## 4. Authorized publication and PR hygiene

- [ ] List open PRs; identify this session's work (normally the draft PR opened as the claim). Commit,
  push and update it, then mark it ready, within permissions already granted. Product changes need a
  changed RF record citing the PR or CI's RF-trace step fails. Fill every section of `.github/pull_request_template.md` (RF IDs,
  verification, screenshots or the `e2e-screenshots` artifact, what CI cannot prove), including when
  the body is passed on the command line. If publication is
  not authorized, leave a concrete local diff and restart action; do not call it published or on main.
- [ ] Before merge, all RF/handoff/docs changes must be on the PR branch. Wait for checks on the
  **final PR head**, record that SHA, and ensure merge eligibility. An earlier green revision is
  insufficient after task or documentation edits. Use an expected-head guard when merging.
- **Own finished PR, Solo:** squash-merge when merge permission is granted and final-head checks
  pass. Announce the action. If the owner-gate step lists owner-gated paths, add `needs-owner`, name
  the manual check left in the PR, and stop: the owner reviews, adds `owner-approved` and merges.
  Never apply `owner-approved` yourself. Delete the branch only if deletion is also authorized; do not append
  `--delete-branch` automatically. Missing merge/deletion permission is an explicit next action.
- **Lane:** leave its PR open for the orchestrator with RF records/handoff complete; report CI state.
- **Genuinely unfinished:** leave open/draft with the actual remaining acceptance in its RF record.
- **Another session's PR:** leave it alone unless explicitly assigned for review or disposition.
- **Stale/superseded PR:** close only with owner authorization and a recorded reason.
- [ ] After merge, verify merged SHA and outcome and sync the local checkout only when safe. A squash
  does not inherently delete the branch. Local/remote branch deletion requires authorization and
  verification that no needed work is lost. State the branch left active.

Goal: no unrecorded publication outcome, missing next action or orphaned task. Authorized finished
work should reach main; ungranted publication actions remain explicit rather than inferred.

## 5. Production and post-publication facts

- [ ] Merging is not deploying. Deploy only with the owner's applicable explicit permission, using
  `ritmofit_dev_plan/deployment-runbook.md` end to end. Do not infer deploy authority from urgency,
  task priority, an implementation approval or this prompt. Remote migrations, secrets and data
  cleanup keep their separate permission boundaries.
- [ ] When production state matters after merge/deploy, read the Worker version and apply the runbook's
  served-asset evidence bar. State actual main-vs-production observations and runtime vs docs/tooling
  differences. If unreachable, say "not checked from this environment"; do not infer from docs.
- [ ] After a production deploy, record HISTORY first, then DEVELOPMENT_PLAN and the related RF
  acceptance/evidence. Facts only knowable after merge/deploy go on a follow-up docs PR within
  applicable permissions; repeat §2–§4, including final task validation, before publishing it.
  Do not call that record published while local/unmerged unless the owner deliberately parks it.
- [ ] Production fixtures follow `ritmofit_dev_plan/prod-fixture-hygiene.md`. Record retained fixtures
  without changing remote data unless authorized. Do not commit secrets or production data dumps.

## 6. Final summary

Print a concise state report that matches the RF records and handoff:

- **Close:** mode/depth; verification already completed vs run or skipped now.
- **Git/PRs:** branch, revision/sync, this session's publication outcome and other relevant open PRs.
- **RF:** selected IDs, acceptance outcome/state, remaining follow-ups/blockers and next action;
  record/board validation result and revision. Separate implementation completion from publication.
- **Verification:** actual results and material limits, including final-head CI when merged.
- **Production:** when relevant, observed Worker/main/runtime status or explicitly not checked;
  D1 migration state only when verified. No deploy implication from a merge.
- **Handoff/docs:** paths written or retained, authorized retirements and any unpublished records.
- **Next:** one highest-value action, with any missing permission identified. Do not ask again for
  permission already granted for that scope.

## Quick reference

```bash
pnpm tasks show RF-N
pnpm tasks:render
pnpm tasks:check
pnpm format:check
git diff --check
gh pr list --state open
gh pr checks <n>                         # verify final head as described above
gh pr merge <n> --squash --match-head-commit <sha>  # standing grant; never owner-gated PRs
gh pr edit <n> --add-label needs-owner              # owner-gated: stop here
```

Canonical gates: `AGENTS.md` › "Verification, PRs, And Commits". Task semantics:
`ritmofit_dev_plan/tasks/README.md`. Deploy/runbook authority is unchanged.
