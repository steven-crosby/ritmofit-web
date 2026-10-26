---
date: 2026-10-26
tool: Cursor (cloud)
lane: lane-c-deploy-script
branch: cursor/deploy-script-a030
head: ebeec3ffce69da882eaf75d45dfffc95ba515f38
base: e01e96f4fe81b985bbbd3282e179e155384b5789
prs: ['#592 (open)']
status: open
---

# Production deploy procedure is `scripts/deploy.sh`; not deployed

## Done

- [#592](https://github.com/steven-crosby/ritmofit-web/pull/592) adds `scripts/deploy.sh`, `scripts/required-secrets.txt`, and `scripts/production-smoke.txt`, and points the runbook pre-deploy, deploy, and post-deploy sections at the script.
- The script always refuses a dirty tree, including when a SHA is passed. A SHA only allows a clean tree whose `HEAD` is not `origin/main`. It checks the Node major against `.nvmrc`, compares secret names only, then builds from a detached `/tmp/ritmofit-deploy.*` worktree.
- Rollback is unchanged. No "Authed production smoke" section was added or removed.

## In flight

- [#592](https://github.com/steven-crosby/ritmofit-web/pull/592) is open for review. Do not merge from this lane. Do not deploy from this PR.

## Next action

Review and squash-merge #592 after CI is green. A live deploy is a separate owner confirmation; this script has not been run against production.

## Blockers and owner decisions

- None for the PR. Deploying still needs an explicit owner go-ahead. Node 24 or 26 will fail the new `.nvmrc` major check.

## Verification

- Run: `bash -n scripts/deploy.sh` — passed.
- Run: `scripts/deploy.sh --self-check` — passed (node major, secret names without values, dirty tree refused with and without a SHA, clean non-`origin/main` SHA allowed, `/tmp` worktree create/remove, 30-try hash failure, status-only smoke).
- Run: on this dirty branch, `scripts/deploy.sh` exited 1 (`git status --porcelain is not empty`) and created no worktree. `scripts/deploy.sh --not-a-deploy` exited 2.
- Run: full CI-equivalent gate on the worktree before commit — passed (format, typecheck, lint, design-system verify, theme-classes, unit tests, API integration, web build, OpenAPI no drift, contract-parity, audit:ci).
- Skipped: `wrangler deploy`, remote migrations, and secret list against production.

## Production as observed

- Not confirmed from this environment. `GET /` and `GET /api/v1/health` returned 403 with `Cf-Mitigated: challenge`.

## Shared zones touched

- `ritmofit_dev_plan/deployment-runbook.md` deploy procedure only (Pre-deploy, Deploy, Post-deploy smoke). Health route, playlist import, and class-id routing were not edited.

## Notes for other lanes / iOS

- Leave any "Authed production smoke" section intact. This lane did not create one.
- `ritmofit_design_system` has no lockfile and no `npm ci`. The gate remains `npm run verify`.
