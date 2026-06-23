# Close-Session Checklist

A reusable end-of-session runbook. **Invoke by telling Claude:** _"run the close-session checklist"_
(or point it at this file). Claude works through the steps top-to-bottom, runs the checks itself, and
**pauses only at the decision points marked 🙋 (your call)** — everything else it does or reports
automatically. At the end it prints a concise state summary.

> Context for whoever runs this: deploys are **manual** (push to `main` does NOT deploy), and
> **branch protection is ON** (since 2026-06-23) — direct `git push origin main` is **rejected**, so
> **all changes (including docs) go via a PR** with the `format · typecheck · lint · test · build · audit`
> check green before merge (`gh pr merge <n> --squash --delete-branch`; auto-merge is not enabled).
> Run everything from `ritmofit-web/`.

---

## 1. Working tree & branch
- [ ] `git status --short` — working tree clean? If there are uncommitted changes, **surface them** and 🙋 ask whether to commit, stash, or discard. Never silently commit unrelated work.
- [ ] `git status -sb` — on `main` and in sync with `origin/main`? If ahead, plan to push; if behind, `git pull --ff-only`.
- [ ] `git branch` — delete merged local feature branches (`git branch -d <name>`). Leave anything unmerged and flag it.

## 2. PR hygiene
- [ ] `gh pr list --state open` — for each open PR decide 🙋: **merge** (if it's this session's finished work), **close** (stale/superseded — say why in the close comment + `--delete-branch`), or **leave** (genuinely in progress). Goal: no surprise/orphaned PRs at close.

## 3. Gates (only if code changed this session)
Run and report pass/fail with real output — don't assume:
- [ ] `pnpm -r typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test` (unit: api + web)
- [ ] `pnpm --filter @ritmofit/api test:integration` (route-level, Workers pool + D1)
- [ ] `pnpm --filter @ritmofit/web build`
- [ ] OpenAPI no-drift: `pnpm --filter @ritmofit/api openapi && git diff --exit-code apps/api/openapi/openapi.json`

## 4. Deployment state
- [ ] Determine whether **prod == `main`**. Deploys are manual, so code merged to `main` this session is **not live** until deployed.
- [ ] If a deploy is wanted 🙋 **(confirm — it's outward-facing/prod):**
  - [ ] If new migrations landed: apply to remote **first** — `pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote`.
  - [ ] Build the SPA, then deploy: `pnpm --filter @ritmofit/web build && pnpm --filter @ritmofit/api run deploy` (note `run` — `pnpm deploy` is a builtin).
  - [ ] Smoke-test live: `/api/v1/health` → 200, `/` → 200 html, a protected route (`/api/v1/explore`) → 401 unauthed, and (if relevant) a code-split asset → 200.
- [ ] Note the deployed **Worker version id** and remote **D1 migration number** in the summary.

## 5. Docs / status sync (the part that makes the next session cheap)
- [ ] Keep **`AGENTS.md`** limited to durable contributor rules; update it only when workflows,
  architecture boundaries, or canonical commands change.
- [ ] **Append** the dated deploy/build entry (what shipped, PR numbers, Worker version, migration
  number) to **`ritmofit_dev_plan/HISTORY.md`** — the chronological log. Convert relative dates to
  absolute. Then **update the current-state summary** at the top of **`DEVELOPMENT_PLAN.md`** (and the
  status header / milestone roll-up in **`milestones.md`** if a milestone changed). Keep those two as
  *current state + pointers* — the per-PR log lives in `HISTORY.md`, not inline, so they stay readable.
- [ ] For launch/deploy status and any new findings/blockers: append a dated entry to **`HISTORY.md`**
  and refresh the current-state summary in **`DEVELOPMENT_PLAN.md`**. (The pre-launch `REVIEW.md`/
  `REVIEW_HISTORY.md` trackers are archived in `archive/`; do not revive them.) Update other focused
  docs such as `conventions.md` when their subject changes. `CLAUDE.md` is only a compatibility pointer
  to `AGENTS.md`; do not append session history to it.
- [ ] Commit docs (`docs:` prefix) on a branch and open a PR (branch protection blocks direct pushes to `main`); merge once CI is green. Docs don't deploy, so no redeploy needed.

## 6. Secrets, blockers, data hygiene
- [ ] Restate any **known blockers** still open (e.g. ⚠️ email: `RESEND_API_KEY`/`EMAIL_FROM` unset → reset/verification on console fallback).
- [ ] Confirm **no secrets committed** (`.dev.vars` is git-ignored; secrets live in `wrangler secret put`).
- [ ] If this session created **test data in prod / remote D1** (throwaway sign-ups, test classes), confirm it was **purged** — scope deletes tightly (e.g. by a test-only email domain) and verify with a count query.
- [ ] Temp files (`/tmp/...`) and ignored build artifacts (`apps/web/dist`, `apps/api/.wrangler`) are fine to leave.

## 7. Final summary
Print a tight state report:
- Git: branch, clean?, synced?
- PRs: open count + disposition
- Deployment: prod == main? Worker version, D1 migration
- Open threads for next session (blockers first)

---

### Quick reference — the commands

```bash
# state
git status -sb && git status --short && git branch
gh pr list --state open

# gates
pnpm -r typecheck && pnpm lint && pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi && git diff --exit-code apps/api/openapi/openapi.json

# deploy (manual, confirm first)
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote   # only if new migrations
pnpm --filter @ritmofit/web build && pnpm --filter @ritmofit/api run deploy
curl -s -o /dev/null -w '%{http_code}\n' https://ritmofit.studio/api/v1/health
```
