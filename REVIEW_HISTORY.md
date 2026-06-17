# RitmoFit Web — Pre-Launch Remediation Log (archived)

Archived dated remediation entries from the pre-launch review. The live
[`REVIEW.md`](./REVIEW.md) keeps the current status + the findings/backlog; this file is the
chronological record of fixes (PRs, Worker versions, migration steps). For the authoritative
current deploy state see [`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`](./ritmofit_dev_plan/DEVELOPMENT_PLAN.md)
and [`ritmofit_dev_plan/HISTORY.md`](./ritmofit_dev_plan/HISTORY.md).

---

_Audit date: 2026-06-14. Scope: current `main` worktree. Review only; no product fixes,
schema changes, deployments, production migrations, or secret changes were performed._

_Remediation update (2026-06-14): PR #45 is merged and deployed. Remote D1 is migrated
through `0009`; production application code remains Worker version 46
(`aa26e286-c517-444a-952f-d5e410c9439f`), with email secrets active in version 48
(`5bcf4a47-5795-4832-b8b0-bde95d651b3d`). Health, SPA, auth enforcement, code-split
asset, queue-schema, and missing-state SoundCloud callback smokes passed. Resend is
provisioned for `ritmofit.studio`; SPF, DKIM, MX, and DMARC resolve publicly, and real
Gmail delivery, email verification, and password reset completed successfully._

_Verification pass (2026-06-14, independent re-check of current `main`): **0 launch
blockers remain open** — all 5 are deployed/complete (blocker #2's full SoundCloud
consent success/denial/token-failure round-trip is the only residual, a live smoke, not
code). Re-confirmed a representative sample of still-open items across every area and
found no regressions and no drift from the descriptions below: `pnpm format:check` still
fails (98 files); `pnpm audit --prod` still reports 1 high / 2 moderate / 1 low
(esbuild via tsx→drizzle-kit→better-auth); `.github/workflows/ci.yml` still omits
`format:check` and `pnpm audit`; and `TrackSearch.tsx` empty-query branch still returns
without bumping `reqId`. Remaining work is **SHOULD-FIX hardening + the manual Follow-Up
Verification Checklist**, none of it launch-blocking._

_Fixes landed + DEPLOYED (2026-06-14, after the pass above): **browser security headers**
(PR #47 — Worker middleware + `apps/web/public/_headers`) and **copy `class_sections` on
class duplication** (PR #46), both merged to `main` with regression tests and shipped to
production as Worker version `0444283a-75e2-4549-bba7-4c47f759814c` (supersedes v46; no
migration — remote D1 unchanged at `0009`; secrets persisted). Post-deploy smoke confirmed
the security headers live on both the API (`/health`: locked `default-src 'none'` CSP +
HSTS/nosniff/`X-Frame-Options: DENY`/Referrer-Policy/Permissions-Policy) and the SPA + static
assets (full page CSP allowing Google Fonts + the app's own assets). Residual: a real-browser
CSP-violation check (does anything get blocked at runtime) remains a recommended manual smoke._

_Fixes landed + DEPLOYED (2026-06-14, after the above): **provider capability matrix** plus
two **frontend state/correctness** fixes (PR #48), merged to `main` with tests and shipped to
production as Worker version `fecdf611-f6ec-42f6-80e0-f1fc32eb0545` (supersedes `0444283a`; no
migration — remote D1 unchanged at `0009`; secrets persisted). A shared `providerCapabilities`
matrix (`packages/shared/src/enums.ts`) is now the single source of truth: the UI hides the
per-user **Connect** and **My likes** actions for Spotify/Apple Music (catalog-only providers)
instead of leading to a `501`, and the API connect/callback/likes gates read the matrix. The
**TrackSearch** cleared-query branch now invalidates the in-flight request generation, and the
**Dashboard** library rail distinguishes loading / empty / error (pure `libraryView()` helper).
First web component-test infra landed (jsdom + Testing Library); `pnpm test` = api 169 + web 65.
Post-deploy smoke: SPA `200` serving the new `index-dEjg_vwi.js` bundle, `/health` `200` with
security headers intact, `/classes` `401` unauthenticated. Residual: a real-browser pass of the
capability-gated Connections/Track-search UI remains a recommended manual smoke._

_Fix deployed (2026-06-14): PR #49 closes the core Live-duration finding with a class-specific
`duration_ms_override` (migration `0010`), effective-duration sequencing/anchor validation/copy
behavior, an `m:ss` inspector correction, and a hard Live-mode readiness guard. Unit/component tests
(241), Worker/D1 integration tests (17), CI, and a fresh disposable migration pass are green. Remote
D1 was migrated through `0010` before Worker `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` deployed at
100%. Health, SPA, auth enforcement, security-header, main-bundle, and Live-mode chunk smokes passed._

_Deployed (2026-06-14): PR #50 closes the Live provider-handoff finding in both Cue-by-Cue and Full
List views. The active track exposes explicit provider-app/site links from its existing run-payload
references; a provider-specific validator suppresses missing, malformed, cross-provider, and unsafe
stored values. Playback remains external. This is web-only with no schema, migration, API,
shared-contract, or OpenAPI change. Typecheck, lint, 246 unit/component tests, 17 Worker/D1 integration
tests, the production web build, OpenAPI drift verification, and CI passed. Worker
`babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` is live at 100%; remote D1 remains through `0010`. Production
health, SPA, auth enforcement, security headers, exact main/Live asset hashes, and browser runtime/CSP
smokes passed._

_Deployed (2026-06-15): PR #51 closes the two open frontend SHOULD-FIX UI findings — narrow-width
usability and form labels + complete modal focus management. A new accessible `Dialog` primitive
(portal, initial focus, Tab trap, Escape, `inert`/`aria-hidden` background, focus return) is adopted in
all five dialogs; Login and the create-class / manual-track inputs gained real labels; the top nav and
class-header actions wrap instead of overflowing at 390 px. Added jsdom component tests (Dialog + Login,
+10) and a committed Playwright narrow-width browser smoke (`apps/web/smoke/`, Playwright kept out of repo
deps) that asserts 0 px overflow and live focus management — it caught a 9 px class-header overflow that
jsdom can't see, now fixed (18/18 smoke checks pass). Web-only: no schema, migration, API, shared-contract,
or OpenAPI change. Typecheck, lint, 256 unit/component tests, the production web build, and CI passed.
Worker `7daa067b-1ef0-4842-beff-b36951bdebbd` is live at 100% (supersedes `babcb3fe`); remote D1 remains
through `0010`. Production health, SPA, auth enforcement, API + SPA security headers, the exact main bundle
(`index-CH9gB9Bm.js`), and the new `Dialog` chunk all smoked clean._

_Deployed (2026-06-15): PR #52 adds a `Dialog` focus guard — when an in-dialog action removes the
focused control (e.g. Connect → Disconnect), focus is pulled back into the panel so Tab/Escape keep
working (completes modal focus management; new unit test). Found by a new functional browser smoke
(`apps/web/smoke/functional.smoke.mjs`) that exercises auth, the full class lifecycle, provider
connect/search/import/disconnect, rapid class-switch, and network-failure (16/16; narrow-width still
18/18). Also adds `ritmofit_dev_plan/deployment-runbook.md` (deploy + Worker-rollback + D1 Time-Travel
recovery, both verified available). Web-only: no schema, migration, API, shared-contract, or OpenAPI
change. Typecheck, lint, 257 unit/component tests, the production web build, and CI passed. Worker
`1eb04d11-b676-43b5-a7be-7b62ffe83f6a` is live at 100% (supersedes `7daa067b`); remote D1 remains
through `0010`. Post-deploy smoke: SPA `200` serving `index-OaatR5Qd.js`, `/health` `200`, `/classes`
`401`, and 6/6 security headers present. This closes the remaining Follow-Up Verification Checklist
items below except the formatting-boundary and dependency-audit dispositions (tracked SHOULD-FIX) and a
live prod-rollback exercise (deferred)._

_Landed — not deployed (2026-06-15): PR #53 hardens the release gates (no runtime change, so no
deploy). Defines the Prettier boundary (`.prettierignore` excludes generated OpenAPI/Drizzle outputs +
the long-form `ritmofit_dev_plan`/`ritmofit_design_system` doc trees; ~51 owned source/doc files
formatted in one pass) so `format:check` is green and trustworthy; dispositions the four dev/build-only
`esbuild`/`vite` audit advisories via explicit `--ignore` flags in a new `audit:ci` script; and wires
both **Format check** and **Dependency audit** into `.github/workflows/ci.yml` alongside the existing
typecheck / lint / test / integration / build / OpenAPI-drift gates. `openapi.json` is untouched (drift
gate still green). Remaining: GitHub branch protection (require CI before merge) is an owner setting, and
a vite 5 → 6 upgrade would clear the ignored advisories outright._

_Deployed (2026-06-15): PR #54 closes the "Paginate and order the private class library in D1"
SHOULD-FIX. `GET /classes` now resolves ownership ∪ direct-share ∪ team-share, reduces duplicate paths
to the highest access level, and applies deterministic `(updated_at DESC, id DESC)` ordering and optional
keyset pagination inside D1 (single CTE; opaque base64url cursor via `X-RitmoFit-Next-Cursor`). The web
rail loads 30 at a time with an accessible continuation control; unparameterized requests keep the legacy
full-array contract for the current iOS cache. Migration `0011` replaces the owner index with a composite
`(owner_user_id, updated_at, id)` index and adds target-first direct/team share indexes. Remote D1 was
migrated through `0011` before Worker `86c996ff-4b75-4ea0-bf8e-0ed59910c125` deployed at 100% (supersedes
`1eb04d11`). Typecheck, lint, unit tests (api 175 + web), 21 Worker/D1 integration tests (incl. a new
4-test class-list suite), the production web build, OpenAPI drift verification, format check, and
`audit:ci` all passed. Post-deploy smoke: SPA `200`, `/health` `200`, `/classes` `401` (incl. `?limit=5`),
6/6 security headers present, and remote D1 reports no pending migrations._

_Deployed (2026-06-15): PRs #55–#61 (the overnight backlog) merged to `main` (`28eb5bf`) and the
runtime/schema changes shipped in one batch. **#57** adds the standalone `track_provider_ids.track_id`
lookup index and the `rate_limit.last_request` pruning index via migration `0012` (index-only, no data
change); **#56** lazy-loads/async-decodes non-critical album artwork; **#58** renders a 404 view for
unknown SPA paths; **#60** adds an owner-only inline class-rename affordance. **#55** and **#61** add
choreography write-path and team-share detail-access Worker/D1 integration tests (integration suite
21 → 28); **#59** rewrites the README as a real entry point and removes the stale root
`.dev.vars.example`. The full CI-equivalent gate suite ran green on the merged tree: format check,
`-r typecheck`, lint, unit tests (api 175 + web), 28 Worker/D1 integration tests, the production web
build, OpenAPI drift verification, and `audit:ci`. Migration `0012` was applied to remote D1 (no
pending migrations remain) before Worker `7505f9aa-3655-4bef-b6b3-1b2085d627eb` deployed at 100%
(supersedes `86c996ff`). Post-deploy smoke: SPA `200` serving `index-CMFEcIls.js`, `/health` `200`,
`/classes` `401`, and 6/6 security headers present._

_Landed — not deployed (2026-06-15): two test/tooling PRs, no runtime change. **#63** closes the last
"Expand Worker/D1 integration tests" gaps — `provider-callback`, `provider-disconnect`, and
`password-reset` integration suites drive the mounted worker against Miniflare D1 (suite 28 → 41),
covering every OAuth-callback failure branch, the disconnect → purge-enqueue side effect, and the full
Better Auth reset flow. **#64** dispositions two newly-published dev/build-only vite advisories
(`GHSA-fx2h-pf6j-xcff`, `GHSA-v6wh-96g9-6wx3`) that had started failing the `audit:ci` gate on `main`.
Both merged to `main` after green CI; production stays on Worker `768cdded` / remote D1 `0012`._

