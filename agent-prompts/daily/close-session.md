# Close-session — wrap up a RitmoFit work session

> **INTERACTIVE.** Use this whenever Steven is ending a personal work session in
> `ritmofit-web`, even if multiple sessions happen in one day. Work through the checklist
> top-to-bottom, run the checks yourself, and pause only at owner-decision points:
> commit/stash/discard, merge/close PRs, deploy, remote migrations, or production data cleanup.

Context for whoever runs this: deploys are **manual** and production-facing; pushing or
merging to `main` does **not** deploy. Branch protection is on, so direct
`git push origin main` is rejected. All changes, including docs, go through PRs with the
CI-equivalent gate green before merge. Run everything from `ritmofit-web/`.

## 1. Working tree and branch

- [ ] `git status --short` — if there are uncommitted changes, surface them and ask whether
  to commit, stash, or discard. Never silently commit unrelated work.
- [ ] `git status -sb` — note branch, upstream sync, ahead/behind state, and whether `main`
  is current with `origin/main`.
- [ ] `git branch` — identify merged local feature branches that can be deleted. Leave
  unmerged branches alone and flag them.

## 2. PR hygiene

- [ ] `gh pr list --state open` — for each open PR decide with the owner: merge if it is
  this session's finished work and checks are green, close if stale/superseded with a reason,
  or leave if genuinely in progress. Goal: no surprise or orphaned PRs at close.

## 3. Verification gates

Run and report pass/fail with real output. If only docs changed, use judgment: at minimum run
format checking or explain why heavier gates were not run. If code, contracts, schema, or
deployment behavior changed, run the full CI-equivalent gate:

- [ ] `pnpm format:check`
- [ ] `pnpm -r typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm --filter @ritmofit/api test:integration`
- [ ] `pnpm --filter @ritmofit/web build`
- [ ] `pnpm --filter @ritmofit/api openapi`
- [ ] `git diff --exit-code apps/api/openapi/openapi.json`
- [ ] `pnpm audit:ci`

## 4. Deployment state

- [ ] Determine whether production appears aligned with `main`. Deploys are manual, so code
  merged to `main` this session is not live until deployed.
- [ ] If a deploy is wanted, confirm with the owner first.
- [ ] If new migrations landed and deployment is confirmed, apply remote D1 migrations before
  code:

  ```bash
  pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
  ```

- [ ] Build the SPA, then deploy:

  ```bash
  pnpm --filter @ritmofit/web build
  pnpm --filter @ritmofit/api run deploy
  ```

- [ ] Smoke-test live:
  - `/` returns `200` HTML.
  - `/api/v1/health` returns `200`.
  - an unauthenticated protected route such as `/api/v1/classes` or `/api/v1/explore`
    returns `401`, not `404`.
  - relevant code-split/static assets return `200`.
  - security headers are present when deployment or Worker behavior changed.
- [ ] Note the deployed Worker version id and remote D1 migration state in the summary.

## 5. Docs and status sync

- [ ] Drain `INBOX.md`: capture any breadcrumbs that surfaced this session, then route each
  open `- [ ]` item to its real home using the routing table in `INBOX.md`
  (decision → `decisions.md`, scope → `DEVELOPMENT_PLAN.md`/`milestones.md`, parity →
  `web-ios-parity.md`, durable fact → memory, reusable prompt → `agent-prompts/`, concrete
  bug → draft PR / `spawn_task`). **Delete each line once routed**, and delete stale ones.
  Leave only genuinely unshaped ideas for next session.
- [ ] Keep `AGENTS.md` limited to durable contributor rules; update it only when workflows,
  architecture boundaries, or canonical commands change.
- [ ] Append dated deploy/build entries to `ritmofit_dev_plan/HISTORY.md` when something
  shipped, deployed, or materially changed operational state. Use absolute dates.
- [ ] Refresh the current-state summary in `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, and
  `ritmofit_dev_plan/milestones.md` if a milestone changed.
- [ ] Track forward work in `ritmofit_dev_plan/web-ios-parity.md`; do not create parallel backlog lists.
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
  `apps/api/.wrangler` are fine to leave unless they confuse the next session.

## 7. Final summary

Print a tight state report:

- **Git:** branch, clean or dirty, synced or ahead/behind.
- **PRs:** open count and disposition.
- **Verification:** commands run and results; explicitly list skipped gates.
- **Deployment:** whether production matches `main`, Worker version, and D1 migration state
  when checked.
- **Docs:** status/history/parity docs updated or intentionally unchanged.
- **Next session:** blockers first, then the highest-value follow-up.

## Quick reference

```bash
git status -sb
git status --short
git branch
gh pr list --state open

pnpm format:check
pnpm -r typecheck
pnpm lint
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm audit:ci

pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api run deploy
curl -s -o /dev/null -w '%{http_code}\n' https://ritmofit.studio/
curl -s -o /dev/null -w '%{http_code}\n' https://ritmofit.studio/api/v1/health
```
