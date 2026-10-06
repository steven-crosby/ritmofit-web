# Close-session — wrap up a Ritmo Studio work session

> **INTERACTIVE.** Use this whenever a work session in `ritmofit-web` ends — any tool, local or
> cloud, solo or lane. Work through the checklist top to bottom, run the checks yourself, and pause
> only at owner-decision points: commit scope, merge/close PRs, deploy, remote migrations, or
> production data cleanup. Pair it with [`start-session.md`](./start-session.md).

Deploys are **manual** and production-facing; merging to `main` does **not** deploy. Every change,
docs included, goes through a PR — never push straight to `main`. Run everything from the repo root.
Do not re-run work this session already finished (gates, deploy, docs record). If start-session
never ran, still do this wrap.

Steven is the sole developer and moves across Codex, Claude Code, and Cursor, local and
remote/ephemeral, on unscheduled time. `main` plus the handoff files — not any tool's session state
or chat — must let the next session answer "what's next". Hence: solo sessions **merge** their own
finished green work at close, and every session leaves a handoff when anything is owed forward.

## Close mode and depth

**Mode** (match the start-session mode):

- **Solo** — this session owns its PRs end to end; merge at close per §2.
- **Lane** — one lane of a parallel round: push, open the PR, write the lane handoff (§5), and
  **never merge** — the orchestrator runs the merge train. Skip §4 deploy decisions.
- **Orchestrator** — closing a round: follow `../orchestrate-parallel-round.md` Step 7, then §5
  here for the round handoff.

**Depth:**

- **Light (default):** git, PRs, branch hygiene, handoff, inbox/docs if anything new landed,
  secrets/blockers, summary. After a merge or deploy this session, still state main-vs-production
  align/ahead and the Worker id.
- **Full:** add verification gates (§3) and a production reconcile (§4) when this session changed
  code, contracts, schema, or deployment behavior *and* those checks have not run.

Never deploy from this prompt unless the owner grants it in this session. Deploy and smoke live in
`ritmofit_dev_plan/deployment-runbook.md`; the CI-equivalent gate lives in `AGENTS.md` ›
"Verification, PRs, And Commits". Do not fork either here.

## 1. Working tree and branch

- [ ] `git status -sb` — identify which session owns any uncommitted change. Offer to commit only
  this session's finished, in-scope work; leave everything else untouched and report it. Never
  stash, discard, reset, overwrite, or silently include unrelated work. Note branch, upstream sync,
  ahead/behind, and whether `main` is current with `origin/main`.
- [ ] Prune merged branches. Local: delete local feature branches already merged to `main` without
  asking; flag unmerged ones. Remote: list candidates (`git branch -r --merged origin/main` and/or
  PRs merged by squash) and get an explicit owner yes before deleting any remote branch.
- [ ] If the worktree is left off `main`, say so ("Left on branch X") and offer to switch back.

## 2. PR hygiene

List open PRs (`gh pr list --state open` or the session's GitHub integration). **Before merging
anything, finish §5's handoff and docs updates on the same branch** — a squash merge deletes the
branch, so there is nowhere to commit them afterwards. State that only arises after the merge (a
deploy, a post-merge production check) goes in a follow-up `docs:` PR. For each PR:

- **This session's PR, finished, gate green — Solo mode:** default to merge — **squash**, delete
  the branch (`gh pr ready <n>` if draft, then `gh pr merge <n> --squash --delete-branch`). State
  that you are merging and give the owner a beat to object; this is not a silent auto-merge.
- **This session's PR — Lane mode:** leave it open for the orchestrator; make sure it is pushed,
  CI is running or green, and the lane handoff is on the branch.
- **This session's PR, genuinely unfinished:** leave it open/draft and say so in the handoff.
- **Another session's or lane's PR:** leave it alone.
- **Stale/superseded:** close with a reason (owner confirmation).

Goal: no orphaned PRs, and none of this session's finished solo work left dangling.

## 3. Verification gates (full close only)

Run and report pass/fail with real output. Docs-only: at minimum `pnpm format:check` (note that
`ritmofit_dev_plan/`, `agent-prompts/`, and `docs/audits/` are Prettier-ignored, so also check
links/paths you touched). Code, contracts, schema, or deployment behavior: the full CI-equivalent
gate from `AGENTS.md` (includes `theme-classes`).

## 4. Deployment state (Solo and Orchestrator)

- [ ] After a merge or deploy this session, state whether production is aligned with `main` and the
  Worker id — briefly on a light close; full evidence (three-hash SPA settle, mounted-route smoke)
  on a full close, the deploy path, or when alignment is in doubt. If this environment cannot reach
  production or Cloudflare, say "not checked from this environment" — never infer from docs.
- [ ] Default to **not** deploying just because code merged. Deploy now only for a batch the owner
  wants live, an urgent fix (prod bug / regression / security / live-verification finding), or a
  risky change (schema/migration, auth, provider, infra) that ships on its own.
- [ ] If a deploy is wanted, confirm with the owner, then follow the runbook end to end.

## 5. Handoff, docs, and status sync

- [ ] **Handoff.** Write `ritmofit_dev_plan/handoffs/YYYY-MM-DD-<lane-slug>.md` from
  `agent-prompts/templates/handoff.md` and commit it on this session's branch/PR **before** §2's
  merge (describe the state the merge will produce, for example "`main` ahead of production by
  #N once merged"):
  - Lane and Orchestrator: always (an idle lane writes `status: closed` with its evidence).
  - Solo: whenever anything is in flight, a next action is owed, an owner decision is open, or
    `main` is ahead of production. Skip only when HISTORY/DEVELOPMENT_PLAN already say everything.
  - Rules: `ritmofit_dev_plan/handoffs/README.md`. Production is "as observed", never inferred.
- [ ] **Retire handoffs.** Delete handoff files whose items this session completed or routed to a
  real home, and stale ones flagged at start-session once routed. Never edit another open lane's
  handoff.
- [ ] After a production deploy: append the dated entry to `ritmofit_dev_plan/HISTORY.md` first,
  then refresh the current-focus / main-vs-production block in `DEVELOPMENT_PLAN.md`, on a docs PR
  (`docs: record the #<pr> deploy (Worker <id>)`). Do not call the session closed while that
  record is only local or unmerged unless the owner parks it.
- [ ] Drain `INBOX.md`: capture breadcrumbs that surfaced this session, route each open `- [ ]`
  item via its routing table, **delete each line once routed**, and delete stale ones.
- [ ] Track forward work in the most specific current doc; do not create parallel backlog lists.
  Use `web-ios-parity.md` only for owner-requested iOS handoff or explicit cross-surface notes.
- [ ] Update focused docs (`conventions.md`, `authorization.md`, `deployment-runbook.md`, …) when
  their subject changed; update `AGENTS.md` only when durable workflows, boundaries, or canonical
  commands changed. Do not revive files in `ritmofit_dev_plan/archive/`.

## 6. Secrets, blockers, and data hygiene

- [ ] Restate known blockers still open (they belong in the handoff too).
- [ ] Confirm no secrets were committed; production secrets are managed with `wrangler secret put`.
- [ ] Production test data: follow `ritmofit_dev_plan/prod-fixture-hygiene.md`; record any fixture
  left for owner review in the handoff and HISTORY.
- [ ] Report unexpected untracked junk (for example a local `.pnpm-store/`); do not commit it.

## 7. Final summary

Print a tight state report that matches the handoff:

- **Close:** mode, depth, and what was skipped because it already ran.
- **Git:** branch, clean or dirty, synced or ahead/behind.
- **PRs:** open count and disposition.
- **Verification:** commands run and results; skipped gates listed.
- **Deployment:** production vs `main`, Worker version, D1 migration state when checked.
- **Handoff:** path written (or why none), handoffs retired.
- **Docs:** status/history docs updated or intentionally unchanged; deploy-record PR state.
- **Next session:** blockers first, then the single highest-value follow-up.

## Quick reference

```bash
git status -sb
git branch -vv
git branch -r --merged origin/main
gh pr list --state open
gh pr ready <n>                              # undraft before merging
gh pr merge <n> --squash --delete-branch     # Solo: this session's own finished + green PR
```

Gates: `AGENTS.md` › "Verification, PRs, And Commits". Deploy and smoke:
`ritmofit_dev_plan/deployment-runbook.md`. Do not run deploy commands from this cheat sheet.
