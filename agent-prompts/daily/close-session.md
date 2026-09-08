# Close-session — wrap up a Ritmo Studio work session

> **INTERACTIVE.** Use this whenever Steven is ending a personal work session in
> `ritmofit-web`, even if multiple sessions happen in one day. Work through the checklist
> top-to-bottom, run the checks yourself, and pause only at owner-decision points:
> commit scope, merge/close PRs, deploy, remote migrations, or production data cleanup.

Context for whoever runs this: deploys are **manual** and production-facing; pushing or
merging to `main` does **not** deploy. Prefer PRs for all changes, including docs, and
keep the CI-equivalent gate green before merge. Do not rely on direct pushes to `main`
unless the owner explicitly chooses that path. Run everything from `ritmofit-web/`.
Do not re-run work this session already finished (gates, deploy, docs record). If
start-session never ran, still do this wrap — do not skip hygiene because orientation
was skipped.

## Close depth

**Light close (default):** git, PRs, local + remote branch hygiene, inbox/docs if anything
new landed, secrets/blockers, final summary.

**Full close:** add verification gates and a production reconcile. Use full close when this
session changed code, contracts, schema, or deployment behavior *and* those checks have not
already been run.

Never deploy from this prompt unless the owner grants it in this session. The deploy and
smoke procedure lives in `ritmofit_dev_plan/deployment-runbook.md`; do not fork it here.
The CI-equivalent gate lives in `AGENTS.md` › "Verification, PRs, And Commits"; do not
copy a shorter list here.

## 1. Working tree and branch

- [ ] `git status -sb` — if there are uncommitted changes, identify which session owns
  them. Offer to commit only this session's finished, in-scope work; otherwise leave the files
  untouched and report them. Do not stash, discard, reset, overwrite, or silently include
  unrelated work. If ownership or recovery is unclear, stop and ask for an explicit plan.
  Note branch, upstream sync, ahead/behind state, and whether `main` is current with
  `origin/main`.
- [ ] Prune merged branches. Delete local feature branches already merged to `main`.
  Delete remote branches whose PRs are already merged (`git branch -r --merged origin/main`,
  plus remotes whose PRs show `MERGED` even if git does not see them as ancestors after a
  squash). Leave unmerged branches alone and flag them.
- [ ] If close leaves the worktree off `main`, say so ("Left on branch X") and offer
  checkout back to `main`.

## 2. PR hygiene

- [ ] `gh pr list --state open` — for each open PR decide with the owner: merge if it is
  this session's finished work and checks are green, close if stale/superseded with a reason,
  or leave if genuinely in progress. Goal: no surprise or orphaned PRs at close.

## 3. Verification gates (full close only)

Skip on a light close, or if this session already ran the matching gate.

Run and report pass/fail with real output. If only docs changed, use judgment: at minimum run
format checking or explain why heavier gates were not run. If code, contracts, schema, or
deployment behavior changed, run the full CI-equivalent gate from `AGENTS.md` ›
"Verification, PRs, And Commits" (includes `theme-classes`).

## 4. Deployment state (full close, or when production alignment is in doubt)

Skip if this session already deployed and smoked, unless a later merge put `main` ahead
of production again.

- [ ] Determine whether production appears aligned with `main`. Deploys are manual, so code
  merged to `main` this session is not live until deployed.
- [ ] Default to **not** deploying just because code merged this session. Ritmo Studio ships in
  deliberate batches, not once per merge (see `AGENTS.md` "Security And Deployment").
  Deploy now only for a batch the owner wants live, an urgent fix (prod bug / regression /
  security / live-verification finding), or a risky change (schema/migration, auth, provider,
  infra) that should ship on its own.
- [ ] If a deploy is wanted, confirm with the owner first, then follow
  `ritmofit_dev_plan/deployment-runbook.md` for pre-deploy, migrations-before-code, SPA build,
  Worker deploy, consecutive SPA-hash settle, mounted-route smoke, and Worker-version
  confirmation.
- [ ] Note the live Worker version id and remote D1 migration state in the summary when checked.

## 5. Docs and status sync

Skip rewriting a `HISTORY.md` / `DEVELOPMENT_PLAN.md` record this session already wrote.

- [ ] After a production deploy this session: ensure `HISTORY.md` and the current-focus /
  main-vs-production lines in `DEVELOPMENT_PLAN.md` are updated on a docs PR (or already on
  `main`). Do not declare the session closed while that record is only local or only an
  unmerged PR unless the owner explicitly parks it. Prefer Conventional Commit
  `docs: record the #<pr-or-change> deploy (Worker <id>)`.
- [ ] Drain `INBOX.md`: capture any breadcrumbs that surfaced this session, then route each
  open `- [ ]` item to its real home using the routing table in `INBOX.md`
  (decision → `decisions.md`, scope → `DEVELOPMENT_PLAN.md`/`milestones.md`,
  cross-surface contract/design impact → `web-ios-parity.md` only when the owner asks for
  iOS handoff/refinement, durable fact → the most specific doc, reusable prompt →
  `agent-prompts/`, concrete bug → draft PR / focused follow-up). **Delete each line once routed**,
  and delete stale ones.
  Leave only genuinely unshaped ideas for next session.
- [ ] Keep `AGENTS.md` limited to durable contributor rules; update it only when workflows,
  architecture boundaries, or canonical commands change.
- [ ] Append dated deploy/build entries to `ritmofit_dev_plan/HISTORY.md` when something
  shipped, deployed, or materially changed operational state. Use absolute dates. Do this
  first in the deploy-record sequence.
- [ ] Then refresh current-focus / main-vs-production (and backlog if needed) in
  `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, and `ritmofit_dev_plan/milestones.md` if a
  milestone changed.
- [ ] Open (or confirm) the docs PR with those updates, then pause for merge before calling
  the session closed — unless the owner explicitly parks the PR.
- [ ] Track forward work in the most specific current-status doc. Use
  `ritmofit_dev_plan/web-ios-parity.md` only for owner-requested iOS handoff/refinement or explicit
  cross-surface contract/design notes; do not create parallel backlog lists.
- [ ] Update focused docs such as `conventions.md`, `authorization.md`, or
  `deployment-runbook.md` when their subject changes.
- [ ] Do not revive archived launch trackers in `ritmofit_dev_plan/archive/`.

## 6. Secrets, blockers, and data hygiene

- [ ] Restate any known blockers still open.
- [ ] Confirm no secrets were committed. Local secrets belong in ignored files; production
  secrets are managed with `wrangler secret put`.
- [ ] If this session created test data in production or remote D1, confirm it was purged with
  tightly scoped deletes and verified counts.
- [ ] Temp files under `/tmp` and ignored build artifacts such as `apps/web/dist` and
  `apps/api/.wrangler` are fine to leave unless they confuse the next session. Report
  unexpected untracked junk (for example a local `.pnpm-store/`) and do not commit it.

## 7. Final summary

Print a tight state report:

- **Close:** light or full, and what was skipped because it already ran.
- **Git:** branch, clean or dirty, synced or ahead/behind.
- **PRs:** open count and disposition.
- **Verification:** commands run and results; explicitly list skipped gates.
- **Deployment:** whether production matches `main`, Worker version, and D1 migration state
  when checked.
- **Docs:** status/history/parity docs updated or intentionally unchanged; if a production
  deploy happened, note whether the deploy-record PR is open, merged, or explicitly parked.
- **Next session:** blockers first, then the highest-value follow-up.

## Quick reference

```bash
git status -sb
git branch -vv
git branch -r --merged origin/main
gh pr list --state open
```

Gates: `AGENTS.md` › "Verification, PRs, And Commits".
Deploy and smoke: `ritmofit_dev_plan/deployment-runbook.md`. Do not run deploy commands
from this cheat sheet.
