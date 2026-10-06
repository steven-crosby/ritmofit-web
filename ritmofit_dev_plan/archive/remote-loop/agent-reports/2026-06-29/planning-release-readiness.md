---
prompt: planning/release-readiness
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-29
inspected_head: d2b7b4f7cd6db1522f99f960bec935509aaf9d79
inspected_range: 67120a1..d2b7b4f # commits on main since the last recorded prod deploy (Session 6, Worker b59b2de9)
completed: true
prs: []
---

# planning/release-readiness — 2026-06-29

## Summary

**Verdict: NO-GO — but there are no code blockers.** The full CI-equivalent gate is green at
`main` head `d2b7b4f` (format, typecheck, lint, 257 api + 237 web unit, 69 integration, web
build, OpenAPI no-drift, audit:ci all pass), `main` is clean and synced, there are zero open
PRs, no pending D1 migrations, and the OpenAPI contract is unchanged. The single thing standing
between here and GO is the **human launch step (Session 8): `main` is two undeployed runtime web
commits ahead of production** (#150 Live Mode section a11y, #151 library load-error retry; last
recorded deploy is Session 6 Worker `b59b2de9`), and the launch gate's **live smoke + production
core-workflow verification have not been run/gate-signed for this head.** Agents cannot deploy,
so this is the owner's move. Shortest path to GO is below.

## Commands run + results

Full `AGENTS.md` / `web-launch-readiness.md` CI-equivalent gate, run this session on `d2b7b4f`:

- `pnpm install --frozen-lockfile` → OK (Node v22.22.2, pnpm 11.4.0; matches AGENTS.md floor).
- `pnpm format:check` → **pass** (all matched files Prettier-clean).
- `pnpm -r typecheck` → **pass** (shared, music, web, api — 4 projects, no type errors).
- `pnpm lint` → **pass** (eslint, clean).
- `pnpm test` → **pass** (api **257** tests / 29 files; web **237** tests / 38 files; no skips/flakes observed).
- `pnpm --filter @ritmofit/api test:integration` → **pass** (Miniflare D1, **69** tests / 15 files).
- `pnpm --filter @ritmofit/web build` + `pnpm build` → **pass** (SPA built, PWA precache 20 entries / 439.78 KiB; api `tsc --noEmit` clean).
- `pnpm --filter @ritmofit/api openapi` → regenerated (42 schemas, 44 paths).
- `git diff --exit-code apps/api/openapi/openapi.json` → **clean (no drift)**.
- `pnpm audit:ci` → **pass** (5 advisories, all on the documented `auditConfig.ignoreGhsas` allowlist; all dev/build-only esbuild/vite dev-server CVEs, none in the prod runtime path).
- `git fetch origin main` / `rev-parse` → `main` = `d2b7b4f`, tree clean, branch synced.
- Secrets scan: no key patterns in `apps/web/dist`; no `.env`/`.dev.vars` tracked (only `.dev.vars.example`); no token literals in the tree.

## Findings

Go/no-go checklist for the launch candidate at `d2b7b4f`:

- ✅ **Tests** — full suite green (257 + 237 unit, 69 integration). No skipped or flaky tests
  surfaced across the run.
- ✅ **Build / CI** — the entire `AGENTS.md` gate (SPA + Worker) passes, including
  `format:check`, OpenAPI no-drift, and `audit:ci`. No type errors.
- ✅ **Design** — the only surface changed since the last deploy (`67120a1..d2b7b4f`:
  `LiveMode.tsx`, `Dashboard.tsx`, `LibraryRail.tsx`) adds **no** raw hex/rgb/px literals; the
  retry reuses the existing `PendingList`/`role="alert"` pattern and the Live a11y change is a
  polite live region. Session 7 (`web-launch-session-plan.md:95`) recorded a real-browser
  screen-reader + responsive walk at 320/768/1280 with the two launch-blockers closed. ⚠️ Minor:
  a manual visual pass of the richer Library card at 320px/desktop is still noted as recommended
  (`web-launch-readiness.md:69`) — not gate-signed for this head.
- ✅ **Security** — no secrets/PII in the diff, bundled SPA, or tree; the undeployed delta is
  a11y + an error-state retry only, so **auth paths are unchanged**. Auth/email + provider paths
  were verified green in prod in Session 2 (`web-launch-readiness.md:134`). `audit:ci` advisories
  are all documented dev/build-only.
- ✅ **Migrations (D1)** — no migration delta in the launch candidate (latest is `0018`;
  #150/#151 are web-only). Session 6 deploy reported "No migrations to apply"; remote D1 is at
  head. Forward-safe: nothing to apply, nothing to roll back.
- ✅ **Contract** — `openapi.json` did not move; the undeployed changes are client-only off the
  existing run-payload. No iOS-client impact.
- ✅ **Docs** — `DEVELOPMENT_PLAN.md`, `web-launch-readiness.md`, `web-launch-session-plan.md`,
  `milestones.md`, and `HISTORY.md` agree: Session 7 done, Session 8 (Launch Candidate) is the
  next step. INBOX drained at Session 7 close (#152).
- ❌ **Production deploy / live smoke** — _the_ blocker. `main` is ahead of production by two
  runtime commits (#150 `31cdd4c`, #151 `f332ca7`); the last recorded deploy is Session 6 Worker
  `b59b2de9`. The launch gate requires the launch-candidate runtime deployed via
  `deployment-runbook.md` plus a passing live smoke (`/` 200, `/api/v1/health` 200, protected
  routes 401, security headers) and a manual production core-workflow pass
  (`web-launch-readiness.md:165` Launch Gate). None of these are signed for `d2b7b4f`. This is
  Session 8 and is an **owner action** — agents do not deploy.

**Open questions / known issues (non-blocking, documented deferrals):**

- Automatic BPM lookup (`GETSONGBPM_API_KEY` unprovisioned) returns a friendly `503`; manual BPM
  covers the launch loop — post-launch deferral (owner, 2026-06-28).
- Apple/Google social sign-in unprovisioned; web Login is email/password only with no broken
  buttons (D2a) — post-launch deferral.
- iOS parity backlog is explicitly out of scope until after web launch (`web-ios-parity.md`).

## Blockers

- **Deploy + live verification is the owner's call and cannot run in this sandbox.** Per house
  rules and `AGENTS.md`, agents never deploy, migrate remote D1, or change secrets, and
  deploy-time confirmation work is report-only. The repo is gate-green; the remaining launch-gate
  rows (production deploy, live smoke, mounted-route smoke, manual core-workflow pass) require a
  human running Session 8.

## Next recommended action

**Run Session 8 (Launch Candidate) to convert this NO-GO into GO** — shortest path:

1. Re-run the gate (already green here) and `pnpm --filter @ritmofit/web build`.
2. Confirm remote D1 has no pending migrations (expected: none — web-only delta), then deploy
   `d2b7b4f` manually through `deployment-runbook.md` (SPA build + `wrangler deploy`).
3. Run the live smoke: `/` → 200 HTML, `/api/v1/health` → 200, an unauth protected route → 401,
   built assets → 200, security headers present.
4. Do the manual production core-workflow pass (create/edit/copy class, add/import tracks,
   cues/moves/sections, Live Mode, Explore save, share/team-share), then delete any prod test
   data.
5. Record the deploy (Worker version + remote migration state) in `DEVELOPMENT_PLAN.md` /
   `HISTORY.md` and check off the launch-gate rows.

There is nothing to fix in the code first — once the deploy + live verification land, this is a GO.
