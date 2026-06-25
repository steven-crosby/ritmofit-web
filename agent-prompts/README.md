# agent-prompts (ritmofit-web)

A library of reusable, paste-and-go prompts for keeping **ritmofit-web** (the React/Vite
SPA plus its Cloudflare Worker + D1 API) healthy while I'm away from the keyboard. It is
optimized for a one-hour commute, a single 45-minute agent session on this repo, and a
Mac that remains awake. Runs leave reviewable draft PRs or short operational records under
`/Users/stevencrosby/Repos/RitmoFit/agent-runs/`.

> This is the **web-scoped** copy of the library. The cross-product original lives at the
> workspace root (`../../agent-prompts/`); the sibling **iOS** copy lives in
> `../ritmofit-ios/agent-prompts/`. Two prompts here still *read* the iOS repo read-only
> (`technical/api-contract-parity`, `technical/content-consistency`) — they branch only in
> this repo.

## How to use
1. Keep the Mac awake. Confirm GitHub authentication and Node/pnpm before leaving.
2. Launch an isolated agent worktree on this repository (the `claude` CLI shown here is the
   reference launcher). `--add-dir` grants read access to the sibling iOS repository and the
   workspace-level run records:

   ```bash
   cd /Users/stevencrosby/Repos/RitmoFit/ritmofit-web
   claude --worktree --add-dir /Users/stevencrosby/Repos/RitmoFit --permission-mode acceptEdits
   ```

   Configure the agent's permissions in advance for the required Git, GitHub CLI, build,
   test, and workspace-record commands. Do not use `--dangerously-skip-permissions` on a
   networked development machine.
3. Paste `daily/changed-code-sentinel.md` into the session.
4. After it finishes, run `daily/command-brief.md` from this repo. Its 10-minute timebox
   keeps the full workflow within one hour.
5. Review the command brief and draft PRs. Agents never merge or deploy.

Technical prompts inherit [`00-house-rules.md`](00-house-rules.md): isolated worktrees,
one draft PR maximum, deduplication, verification, a 45-minute timebox, and validated
run records. Most planning prompts are read-only; `doc-drift` is docs-PR-producing, and
`pr-triage` remains read-only unless explicitly invoked with `ACT`. `security` and
`dependency-freshness` are **report-first**.

## Folder
- `00-house-rules.md` — shared guardrails for every PR-producing prompt.
- `daily/`
  - `changed-code-sentinel` — primary daily agent; reviews only the new commit delta.
  - `command-brief` — turns the sentinel result into an actionable handoff for this repo.
  - `morning-sweep` — legacy repository-wide triage; use occasionally.
  - `standup-digest` — legacy status brief for days without a sentinel.
- `technical/` — code + design:
  - `stability`, `quality`, `design-system`, `security`, `performance`,
    `api-contract-parity`, `accessibility`, `test-coverage`, `dependency-freshness`,
    `content-consistency`.
- `planning/` — productivity / dev-planning:
  - `pr-triage`, `next-slice-planner`, `roadmap-sync`, `release-readiness`, `doc-drift`.
- `sessions/` — **interactive** co-development prompts (a human is in the loop; these do NOT
  run unattended or open draft PRs):
  - `start-session` — orient against the live plan + contract, then wait for approval.
  - `close-session` — pointer to this repo's canonical close-session checklist (kept in
    `ritmofit_dev_plan/close-session-checklist.md` so it tracks the real deploy model and gates).

## Suggested cadence
| When | Run |
|---|---|
| Every commute | `daily/changed-code-sentinel`, then the command brief |
| Mon | `planning/next-slice-planner`, then `technical/stability` (deep) |
| Tue | `technical/quality` (deep) + `technical/test-coverage` |
| Wed | `technical/design-system` (deep) + `technical/accessibility` |
| Thu | `technical/security` (deep) + `technical/dependency-freshness` |
| Fri | `planning/pr-triage` + merge the week's queue |
| Weekly | Contract parity, performance, content consistency, and roadmap sync |
| Monthly | `planning/doc-drift` |
| Before a release | `planning/release-readiness` |

The realistic daily minimum is the sentinel. Add the command brief when you want a single
prioritized handoff. Run deep prompts only when a sentinel or roadmap brief points to that
dimension; avoid routine audit churn.

## Running it "in the background while commuting"
- Disable sleep for the run or use a machine that remains awake.
- The normal run is one isolated worktree on this repository, so the source checkout stays
  untouched.
- Agents may push branches and open draft PRs. They may not merge, deploy, apply remote
  migrations, or change secrets.
- A completed run must produce a record based on
  [`../../agent-runs/RUN_RECORD_TEMPLATE.md`](../../agent-runs/RUN_RECORD_TEMPLATE.md) that
  passes `../../agent-runs/validate-run-record.sh`.
