---
prompt: planning/deploy-readiness
repo: ritmofit-web
agent: cursor-grok-4.6
date: 2026-09-15
inspected_head: 57950dd62b71d6f99bbb89580e9b8a4678b41fb0
inspected_range: 77bb20422eaa5f3abcc97f9adcbb3a99c6b750f0..57950dd62b71d6f99bbb89580e9b8a4678b41fb0
completed: true
prs: []
---

# deploy-readiness-batch-417-425 — 2026-09-15

## Summary

**Gate-GO / deploy-HOLD.** Tip of `main` is `57950dd` (full SHA
`57950dd62b71d6f99bbb89580e9b8a4678b41fb0`), five squash-merges ahead of the last
recorded production Worker `5d659102-3bff-4398-91ad-cdc1d165ccc1` (#420+#422,
HISTORY line for `dd625b5`; docs-only #423 is `77bb204`). The full AGENTS.md
CI-equivalent gate is green on this exact tree. The undeployed delta is web UI,
smoke harness, Tailwind opacity generation, and docs — **no schema, migration,
shared-contract, OpenAPI, secret, or lockfile change**. This note does **not**
authorize a deploy. Owner go-ahead is still required.

## Baseline

| Item | Value |
| --- | --- |
| Inspected tree | `57950dd` (`57950dd62b71d6f99bbb89580e9b8a4678b41fb0`) — `main` tip after #425 |
| Branch used for this note | `cursor/deploy-readiness-417-425-8f8e` (same tree as `57950dd`; docs-only commit on top) |
| Production Worker (live) | `5d659102` / `5d659102-3bff-4398-91ad-cdc1d165ccc1` (owner baseline + `HISTORY.md` 2026-09-13 batch 2) |
| Production application HEAD at that deploy | `dd625b5` (#422); docs record is #423 `77bb204` |
| Rollback anchor if this batch ships | Worker `5d659102` (code-only rollback; no D1 change in this batch) |
| Prior rollback behind current prod | `edaa62b0-8957-486c-b953-24eae2b0fd33` (#412/#414/#415) |
| Local SPA entry from this tip's production build | `assets/index-BxFscIFx.js` (CSS `assets/index-BrfkNDA3.css`) |
| Wrangler / remote D1 | **not queried** this hour (no `wrangler deploy`, no remote D1 list/apply, no secret changes) |

Production Worker ID is taken from the owner baseline and
`ritmofit_dev_plan/HISTORY.md`. This run did not call `wrangler deployments status`.

## Five undeployed PRs

Range verified: `77bb204..57950dd` (27 files, +1314/−281). Grep of that
name-list for `migrations`, `schema`, `packages/shared`, `wrangler`, `.dev.vars`,
`secret`, `openapi`, `package.json`, `pnpm-lock` returned **no hits**.

| PR | Title | One-line WHAT | Schema / migration | Shared contract | Secret / config |
| --- | --- | --- | --- | --- | --- |
| [#417](https://github.com/steven-crosby/ritmofit-web/pull/417) | `fix(web): bring class deletion onto the destructive control pattern (SPC-10)` | Dashboard class delete uses the documented Destructive control (ember + error icon, no bordered/tinted bespoke buttons). | none | none | none |
| [#418](https://github.com/steven-crosby/ritmofit-web/pull/418) | `fix(web): centralize connection-state tone and icons (SPC-06, SPC-08)` | Expired-session headers use caution tone; connection marks move to shared SVG `ConnectionStateMark`. | none | none | none |
| [#419](https://github.com/steven-crosby/ritmofit-web/pull/419) | `fix(web): repair narrow-width smoke and 390px overflow (SPC-20)` | Narrow-width smoke locators repaired; intensity zone + tag input `min-w-0` so 390/320 no longer overflow. | none | none | none |
| [#424](https://github.com/steven-crosby/ritmofit-web/pull/424) | `fix(web): restore semantic color opacity modifiers` | Semantic `var(--rf-*)` Tailwind colours now emit working `/opacity` utilities via `color-mix`. | none | none | none (Tailwind config / theme-class checker only) |
| [#425](https://github.com/steven-crosby/ritmofit-web/pull/425) | `fix(web): restore disabled Start class opacity (SPC-19)` | Blocked Live preflight **Start class** gets native `disabled` + 40% opacity; OD-02 cue/BPM hierarchy is docs/comments only. | none | none | none |

Per-PR file confirmation (squash commits on `main`):

- **#417 `bf68354`:** `ClassHeaderCard.test.tsx`, `Dashboard.tsx`, Pulse Check ledger, `DEVELOPMENT_PLAN.md`
- **#418 `860bba5`:** `ConnectionStateMark(.tsx/.test.tsx)`, `ConnectionsDialog`, `Dashboard` + tests, ledger, plan
- **#419 `d69881c`:** narrow-width smoke + README, `Dashboard` tag form, `IntensitySegmentedControl` + CSS, ledger, plan
- **#424 `38465e1`:** `tailwind.config.js`, theme-class/opacity checkers, `INBOX.md` drain
- **#425 `57950dd`:** `LivePreflight` / `LiveMode` + tests, design-system OD-02 comments, ledger, plan

Product-visible risk if this batch ships: instructors will see the new delete
treatment, connection icons/tones, tighter narrow layouts, visible semantic
opacity (e.g. Live timeline played fill), and a clearer disabled Start class.
None of that requires a remote D1 migration or a secret change.

## Gate results

Full CI-equivalent gate from `AGENTS.md` / `deployment-runbook.md` Pre-deploy
step 2, run on `57950dd` at 2026-09-15 15:56–15:59 UTC. Node `v22.14.0`,
pnpm `11.4.0`. `pnpm install --frozen-lockfile` first (652 packages).

| Step | Command | Result | Detail |
| --- | --- | --- | --- |
| 1 | `pnpm format:check` | **PASS** (6s) | All matched files Prettier-clean |
| 2 | `pnpm -r typecheck` | **PASS** (13s) | shared, music, web, api — no type errors |
| 3 | `pnpm lint` | **PASS** (6s) | `eslint .` clean |
| 4 | `(cd ritmofit_design_system && npm run verify)` | **PASS** (2s) | tokens in sync; lint-tokens clean; contrast AA + Live AAA |
| 5 | `pnpm --filter @ritmofit/web theme-classes` | **PASS** (12s) | 8 opacity declarations; 36 valid colour names |
| 6 | `pnpm test` | **PASS** (40s) | web **793**; api **431**; music **30** |
| 7 | `pnpm --filter @ritmofit/api test:integration` | **PASS** (37s) | **151** tests / 30 files |
| 8 | `pnpm --filter @ritmofit/web build` | **PASS** (14s) | Vite 5.4.21; entry `index-BxFscIFx.js`; PWA precache 17 entries / 657.54 KiB |
| 9 | `pnpm --filter @ritmofit/api openapi` | **PASS** (1s) | 54 schemas, 55 paths |
| 10 | `git diff --exit-code apps/api/openapi/openapi.json` | **PASS** (0s) | no drift |
| 11 | `pnpm --filter @ritmofit/api contract-parity` | **PASS** (2s) | no untracked iOS ↔ backend run-payload drift |
| 12 | `pnpm audit:ci` | **PASS** (2s) | 2 prod-graph findings, both ignored (`1 low` + `1 moderate`) via documented `auditConfig.ignoreGhsas` (dev/build-only esbuild/vite; not Worker/SPA runtime) |

**Overall: 12/12 PASS.** No gate was red. No speculative fix was attempted.

Full command log: `/opt/cursor/artifacts/ci-equivalent-gate.log`.

## Owner smoke checklist (post-deploy; do not run until owner deploys)

Drawn from `ritmofit_dev_plan/deployment-runbook.md` › Post-deploy smoke. This
hour did **not** hit production and did **not** run a browser.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/                      # SPA → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/health         # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/classes        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/explore        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/teams          # unauth → 401
curl -s -D - -o /dev/null https://ritmofit.studio/api/v1/health | \
  grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions'
```

**Worker version + SPA-hash evidence to capture after deploy:**

1. Note the printed **Current Version ID** from `pnpm --filter @ritmofit/api run deploy`
   (must differ from live `5d659102`). Independently confirm with
   `pnpm --filter @ritmofit/api exec wrangler deployments status` (expect 100% on the new id).
2. Capture the built SPA entry from the deploy-time `apps/web/dist/index.html`.
   This tip's local production build used `assets/index-BxFscIFx.js`. Rebuild
   immediately before deploy; do not treat this hour's hash as the ship hash if
   the tree moved.
3. Require **three consecutive** cache-busted agreements before believing the
   release (edge nodes hold mixed `index.html` during propagation):

```bash
EXPECTED=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' apps/web/dist/index.html | head -1)
until [ "$(curl -s -H 'Cache-Control: no-cache' "https://ritmofit.studio/?cb=$RANDOM" |
  grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)" = "$EXPECTED" ] &&
  [ "$(curl -s -H 'Cache-Control: no-cache' "https://ritmofit.studio/?cb=$RANDOM" |
    grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)" = "$EXPECTED" ] &&
  [ "$(curl -s -H 'Cache-Control: no-cache' "https://ritmofit.studio/?cb=$RANDOM" |
    grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)" = "$EXPECTED" ]; do sleep 10; done
```

A matching Worker version does not prove static-asset alignment, and a matching
SPA hash does not prove the API Worker is current. Capture both.

**UI / mounted-route smokes (owner, after deploy):** class delete treatment,
connection marks/tones, 390px overflow, Live timeline opacity fill, disabled
Start class. Also confirm mounted launch routes still reach JSON handlers
(401/403/validation) rather than the SPA fallback: shares, playlist import,
cover upload serving, provider search/import, class cover/tag. Browser
verification was skipped this hour by instruction.

**Pre-deploy (owner, when go-ahead is given) — runbook steps this note did not run:**

1. On `main`, clean tree, in sync with origin; the change is already merged.
2. Gate: already green on `57950dd` (re-run if `main` moved).
3. `pnpm --filter @ritmofit/api exec wrangler deployments status` — confirm live is still `5d659102`.
4. `pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote` — expect no pending apply (this batch adds none).
5. Confirm `BETA_ALLOWED_EMAILS` appears in `wrangler secret list` (name only).

Migrations-before-code: **N/A** for this batch (no new migrations). Then
`pnpm --filter @ritmofit/web build` immediately before
`pnpm --filter @ritmofit/api run deploy`.

## Rollback pointer

From `ritmofit_dev_plan/deployment-runbook.md` › Rollback / recovery.

This batch is **Worker code only**. Cloudflare keeps prior versions. If the
ship is bad:

```bash
pnpm --filter @ritmofit/api exec wrangler deployments list     # find last-good Version ID
pnpm --filter @ritmofit/api exec wrangler rollback <version-id> -m "reason"
```

Expected last-good id after a successful ship of this batch:
`5d659102-3bff-4398-91ad-cdc1d165ccc1`. Rollback re-publishes that version's
code **and bindings**; it does **not** touch D1.

D1 Time Travel is **not** indicated here (no schema change). If a future batch
includes a migration, a Worker rollback does **not** un-apply it — see the
runbook's Migration interaction section.

## Authorization

**This note does not authorize a deploy.**

- Owner go-ahead is still required (`AGENTS.md` › Security And Deployment;
  runbook: "get owner confirmation before deploying").
- No `wrangler deploy` was run.
- Remote D1 was not listed or applied.
- Secrets were not listed or changed.
- Nothing was merged.
- Pulse Check `run-decisions.md`, `DEVELOPMENT_PLAN.md`, and PROD-HYGIENE /
  SPC-21 runbook docs were not edited (Claude owns that lane).

## Commands run + results

- `git rev-parse HEAD` → `57950dd62b71d6f99bbb89580e9b8a4678b41fb0` (matches owner baseline).
- `git diff --name-only 77bb204..57950dd` → 27 files; no schema/migration/shared/secret/lockfile paths.
- GitHub PR read of #417, #418, #419, #424, #425 → titles/bodies match the squash commits on `main`.
- `pnpm install --frozen-lockfile` → OK (652 packages).
- Full 12-step AGENTS.md gate → **12/12 PASS** (table above).
- `./agent-reports/validate-agent-report.sh` on this file → run after write.

## Findings

- **[P3] Production is five merged PRs behind `main`.** Not a code defect. Gate
  is green and the delta is web-only. Ship is an owner decision, not an
  agent action.
- No ship-blocking gate failure.
- No schema/migration/shared-contract/secret risk in `77bb204..57950dd`.
- `audit:ci` still reports the documented ignored esbuild/vite GHSAs only.

## Blockers

- Deploy itself is owner-only. This hour is prep.
- Live Worker status was not re-queried (`wrangler deployments status` needs
  prod credentials and was out of this hour's "no remote D1 / no deploy" box).
  Confirm `5d659102` is still live immediately before ship.
- Browser / authenticated production UI smoke skipped by instruction.
- PROD-HYGIENE (SPC-21) is another agent's lane; this note does not touch that
  ledger or invent a hygiene runbook.

## AGENTS.md conflict notes

- Working Agreement says propose a plan and wait before substantial work. This
  unattended task explicitly authorized this docs-only deploy-prep; no product
  code was edited.
- AGENTS.md forbids deploying without owner confirmation. Followed. No deploy.
- House-rules 45-minute remote-agent cap is looser than this hour's scoped
  gate+note; the explicit user task wins for scope.

## Next recommended action

Owner: when ready to ship this batch, reconfirm live Worker is still
`5d659102`, confirm remote D1 has nothing pending, rebuild the SPA, deploy the
Worker, then run the smoke + consecutive SPA-hash checks above. Do not treat
this draft PR as a deploy ticket. Merge this docs PR only if you want the
prep note on `main`; it is not required for the ship.
