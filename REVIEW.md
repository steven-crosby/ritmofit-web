# RitmoFit Web Pre-Launch Review

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

## Repo Map

RitmoFit Web is a pnpm 11 TypeScript monorepo requiring Node 22.13 or newer.

- `apps/web` — React 18 + Vite 5 single-page application styled with Tailwind and
  generated RitmoFit design tokens. The browser entry point is `apps/web/src/main.tsx`;
  `apps/web/src/App.tsx` gates the UI on a Better Auth session and handles the
  `/reset-password` path without a routing library. `apps/web/src/components/Dashboard.tsx`
  is the main planning surface. Server state and temporary form state are held in
  component-local React state; no global client-state or server-cache library is used.
- `apps/api` — Hono API and scheduled Worker running on Cloudflare Workers. The Worker
  entry point is `apps/api/src/index.ts`. Better Auth is mounted at `/api/auth/*`; the
  versioned REST surface is mounted at `/api/v1`; route modules live in
  `apps/api/src/routes`. A daily Cron drains provider-disconnect purge work and prunes
  stale rate-limit rows.
- `apps/api/src/db` and `apps/api/migrations` — Drizzle ORM over Cloudflare D1/SQLite.
  Schema definitions live in `apps/api/src/db/schema.ts` and
  `apps/api/src/db/auth-schema.ts`; migrations are present through `0012` and remote D1
  has no unapplied migrations as of the 2026-06-15 close-session verification.
- `packages/shared` — canonical Zod schemas, enums, API entity types, and run-payload
  contract shared by the API and clients.
- `packages/music` — SoundCloud, Spotify, Apple Music, and third-party BPM provider
  adapters. Provider audio is not served or cached by this repository.
- `.github/workflows/ci.yml` — advisory GitHub Actions checks on pushes to `main` and
  pull requests. CI installs from the frozen lockfile, then runs format check,
  typecheck, lint, unit tests, Worker/D1 integration tests, the web build, OpenAPI drift,
  and `audit:ci`. It does not deploy.
- `apps/api/wrangler.toml` — production runtime and deployment configuration. One Worker
  serves `/api/*` and the built SPA from `apps/web/dist`, binds the `ritmofit` D1 database
  as `DB`, exposes `ritmofit.studio` as the custom domain, retains the workers.dev URL,
  enables observability, and schedules the daily maintenance Cron.

Verified commands:

- Install: `pnpm install --frozen-lockfile`
- Build all workspaces: `pnpm build`
- Web production build: `pnpm --filter @ritmofit/web build`
- Typecheck: `pnpm -r typecheck`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- Worker/D1 integration tests: `pnpm --filter @ritmofit/api test:integration`
- Formatting check: `pnpm format:check`
- OpenAPI generation: `pnpm --filter @ritmofit/api openapi`
- Local migrations: `pnpm --filter @ritmofit/api db:migrate:local`
- Deployment: manual and production-facing; build the SPA, apply any required remote D1
  migrations, then run `pnpm --filter @ritmofit/api run deploy`.

Runtime assumptions:

- Production is single-origin at `https://ritmofit.studio`, so Better Auth uses a
  first-party session cookie and the SPA uses relative API URLs.
- Local development splits Vite on port 5173 and Wrangler on port 8787, with credentialed
  CORS configured for the web origin.
- Secrets are expected in ignored `.dev.vars` files locally and Cloudflare Worker secret
  storage in production. The D1 database identifier and non-secret canonical auth URL
  are committed in `wrangler.toml`.
- Music providers fall back to a deterministic mock catalog only when
  `MOCK_PROVIDERS=true`; production provider credentials are optional by type but required
  for the corresponding live integrations.

Tracker status:

- The original missing-documentation findings are closed: `README.md` is now the normal
  setup and operations entry point, the stale root `.dev.vars.example` was removed, and
  `apps/api/.dev.vars.example` is the canonical local env template.
- Production is Worker `768cdded-78b4-4150-a017-d8c92042c750` at 100%, with remote D1
  migrated through `0012`. Later PRs #63-#66 were test/docs/tooling only and intentionally
  not deployed.
- Rollback/recovery is documented in `ritmofit_dev_plan/deployment-runbook.md`; Worker
  rollback and D1 Time Travel availability were verified read-only. A live production
  rollback exercise remains deferred until a maintenance window.
- Owner-side GitHub branch protection still needs to be enabled for CI-required merges.
- The review's code-level SHOULD-FIX items are closed. Remaining owner/operational follow-ups are
  branch protection, Vite 6 / newer Better Auth dependency cleanup, and a live production rollback
  exercise during a maintenance window.

## Baseline Command Results

These command results are the original 2026-06-14 audit baseline. Later remediation above and the
Follow-Up Verification Checklist supersede stale failures and test counts.

- `node --version && pnpm --version && pnpm install --frozen-lockfile` — **PASS**
  - Summary: Node `v26.0.0`, pnpm `11.4.0`; all five workspace projects were already
    up to date. CI uses Node 22, so local results are not exact runtime-version parity.
  - Relevant files: `package.json`, `.nvmrc`, `pnpm-lock.yaml`.
  - Recommended fix: also run final release gates on the pinned Node 22 CI environment.
- `pnpm -r typecheck` — **PASS**
  - Summary: all four buildable packages passed strict TypeScript checks.
  - Relevant files: `tsconfig.base.json`, workspace `tsconfig.json` files.
  - Recommended fix: none.
- `pnpm lint` — **PASS**
  - Summary: ESLint completed with no findings.
  - Relevant files: `eslint.config.js`.
  - Recommended fix: none.
- `pnpm test` — **PASS**
  - Summary: 225 tests passed: 169 API unit tests and 56 web logic tests.
  - Relevant files: `apps/api/vitest.config.ts`, `apps/web/vite.config.ts`.
  - Recommended fix: retain the current suites and add the missing UI coverage listed
    below.
- `pnpm --filter @ritmofit/api test:integration` — **PASS WITH WARNING**
  - Summary: 13 mounted Worker/D1 tests passed. Better Auth warned that no trusted
    client-IP header was available, so its limiter used one shared per-path bucket.
  - Relevant files: `apps/api/vitest.integration.config.ts`,
    `apps/api/test/authz.integration.test.ts`, `apps/api/src/lib/auth.ts`.
  - Recommended fix: verify and configure the trusted Cloudflare client-IP header for
    production Better Auth rate limiting.
- `pnpm --filter @ritmofit/web build` — **PASS**
  - Summary: Vite transformed 189 modules. Main JavaScript was 293.86 kB
    (87.48 kB gzip); lazy chunks included Live mode, choreography editing, and dialogs.
  - Relevant files: `apps/web/vite.config.ts`, `apps/web/src/components/Dashboard.tsx`.
  - Recommended fix: monitor the main bundle as the product grows; no immediate build
    failure.
- `pnpm build` — **PASS**
  - Summary: shared, music, web, and API builds all completed.
  - Relevant files: root and workspace `package.json` files.
  - Recommended fix: none.
- `pnpm format:check` — **FAIL**
  - Summary: Prettier reported style drift in 99 files, including source, generated
    Drizzle/OpenAPI files, design documentation, and `REVIEW.md`.
  - Relevant files: `.prettierrc`, `.prettierignore`, root `package.json`.
  - Recommended fix: decide which generated/reference files belong in the formatting
    scope, update `.prettierignore` or generators as appropriate, format the remaining
    owned files in a dedicated change, and add the corrected check to CI.
- `pnpm --filter @ritmofit/api openapi && git diff --exit-code
apps/api/openapi/openapi.json` — **PASS**
  - Summary: generation produced 39 schemas and 36 paths with no committed-spec drift.
  - Relevant files: `apps/api/scripts/generate-openapi.ts`,
    `apps/api/openapi/openapi.json`.
  - Recommended fix: none.
- `pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --local
--persist-to <disposable-directory>` — **PASS**
  - Summary: migrations `0000` through `0009` applied successfully to a fresh disposable
    local D1 database; no production or existing local database was touched.
  - Relevant files: `apps/api/migrations`, `apps/api/wrangler.toml`.
  - Recommended fix: confirm the remote migration state separately before deployment.
- `pnpm audit --prod` — **FAIL**
  - Summary: four vulnerability records: one high and one moderate `esbuild` advisory,
    one moderate Vite advisory, and one low `esbuild` advisory. `pnpm why esbuild` and
    `pnpm why vite` traced the vulnerable versions through Better Auth's bundled
    Drizzle tooling and the current Vite/Vitest toolchain. These are development/build
    paths rather than code imported by the Worker request handler, but they still leave
    the release gate red.
  - Relevant files: `pnpm-lock.yaml`, workspace `package.json` files.
  - Recommended fix: trace with `pnpm why`, upgrade direct dependencies or pin safe
    transitive versions where compatible, rerun all gates, and document any
    non-runtime exceptions rather than accepting the audit failure silently.
- `pnpm --filter @ritmofit/api exec wrangler deployments status --json` and
  `pnpm --filter @ritmofit/api exec wrangler versions view
aa26e286-c517-444a-952f-d5e410c9439f --json` — **PASS WITH FINDINGS**
  - Summary: production is 100% on Worker version 46 (`aa26e286`); the deployed bindings
    include the D1 database, provider credentials, auth secret, encryption key, and
    canonical `BETTER_AUTH_URL`/`WEB_ORIGIN`, but not `RESEND_API_KEY`.
  - Relevant files: `apps/api/wrangler.toml`, `apps/api/src/lib/email.ts`,
    `apps/api/src/routes/provider-connections.ts`.
  - Recommended fix: provision transactional email and inspect the next deployed version.
- `pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote`
  — **PASS**
  - Summary: Cloudflare reported no pending production migrations.
  - Relevant files: `apps/api/migrations`, `apps/api/wrangler.toml`.
  - Recommended fix: continue checking remote migration state before each deployment.
- Production `curl` smoke checks for `/`, `/api/v1/health`, and
  `/api/v1/classes` — **PASS WITH FINDINGS**
  - Summary: the SPA returned `200`, health returned `200`, and the protected classes
    route returned `401` unauthenticated. None of the sampled responses included CSP,
    HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or frame
    protection headers.
  - Relevant files: `apps/api/src/index.ts`, `apps/web/index.html`.
  - Recommended fix: retain these smoke checks and add the security headers listed
    below. An initial shell helper failed because the zsh special variable `path`
    shadowed `PATH`; the corrected `route` loop passed and this had no product impact.
- `curl -sS -o /dev/null -D -
https://ritmofit.studio/api/v1/providers/soundcloud/callback` — **FAIL
  (CONFIGURATION)**
  - Summary: the production callback returned `302` with
    `Location: http://localhost:5173/account?error=state_missing`.
  - Relevant files: `apps/api/src/routes/provider-connections.ts`,
    `apps/api/wrangler.toml`.
  - Recommended fix: configure the production SPA origin and add a callback redirect
    integration/smoke test.
- Common-secret-pattern scan across reachable Git history — **PASS**
  - Summary: no private-key blocks or common live-token/secret assignment patterns
    were found. This is a pattern scan, not a guarantee that every possible credential
    format is absent.
  - Relevant files: reachable Git history excluding `pnpm-lock.yaml`.
  - Recommended fix: keep secret scanning in CI and rotate immediately if a provider
    reports exposure.
- Local browser smoke using disposable D1 state, Wrangler, and Vite — **PASS WITH
  FINDINGS**
  - Summary: sign-up, class creation, manual track entry, save/reopen, provider mock
    connection, live play/reset/replay, and narrow-viewport inspection were exercised.
    The pass reproduced stale class-detail/error state after a failed switch, missing
    dialog focus management, and horizontal overflow at 390 px. Live reset itself
    behaved correctly.
  - Relevant files: `apps/web/src/components/Dashboard.tsx`,
    `apps/web/src/components/ConnectionsDialog.tsx`,
    `apps/web/src/components/LiveMode.tsx`.
  - Recommended fix: address the specific browser findings below and convert the smoke
    flow into automated UI coverage.

## Frontend / UI & UX

- [x] **[SHOULD-FIX - FIXED] Distinguish loading, failure, and valid empty states, and clear
      recovered errors** — `apps/web/src/components/Dashboard.tsx`,
      `apps/web/src/lib/library-state.ts` — The class list started as `[]`, so
      "No classes yet" rendered before the initial request resolved, and a failed load was
      indistinguishable from an empty library. Remediation (PR #48, deployed 2026-06-14): a
      `listStatus` (`loading` | `ready` | `error`) drives a pure `libraryView(status, count)`
      helper so the rail shows distinct loading / empty / error states and never blanks loaded
      classes during a background refresh; `refreshClasses` already clears the top-level error
      on success (keyed class detail shipped earlier in #45). Pure unit tests cover
      `libraryView`. Evidence: code change + green tests. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Make the workstation usable at narrow widths** —
      `apps/web/src/components/Dashboard.tsx` — At a 390 x 844 viewport, the page
      measured 566 px wide; Connections, Sign out, Run live, the track row, reorder grip,
      and manual form extended beyond the viewport. Why it matters: a private-beta user on
      a small laptop split view, tablet, or phone cannot reliably reach core controls.
      Remediation (PR #51, deployed 2026-06-15): the top nav wraps into a `<nav>` cluster,
      the class-header actions stack below the title and wrap on narrow screens, the manual
      add-track fields wrap, and page padding shrinks below `sm`. A committed Playwright
      narrow-width smoke (`apps/web/smoke/narrow-width.smoke.mjs`) asserts 0 px horizontal
      overflow on login, the empty dashboard, the dashboard with a track, and with each
      dialog open; it caught and verified the fix for a residual 9 px class-header overflow.
      Evidence: 18/18 browser-smoke checks pass at 390 px. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Add real form labels and complete modal focus management** —
      `apps/web/src/components/Login.tsx`, `apps/web/src/components/Dashboard.tsx`,
      `apps/web/src/components/Dialog.tsx`, + all five dialog components — Several forms used
      placeholders as their only labels. Opening Music connections left focus on the
      background trigger, and the enabled controls behind the modal remained focusable;
      the dialogs had Escape handling but no initial focus, focus trap/inert background, or
      focus return. Remediation (PR #51, deployed 2026-06-15): a new reusable `Dialog`
      primitive portals to `document.body`, moves focus inside on open, traps Tab/Shift+Tab,
      closes on Escape, marks `#root` `inert` + `aria-hidden`, locks scroll, and returns
      focus to the trigger on close; it is adopted in Connections, Explore, Share,
      CustomMoves, and Teams. `sr-only`/`aria-label` labels were associated with the Login
      name/email/password and the create-class + manual add-track inputs. Coverage: a
      `Dialog.test.tsx` (focus management) and `Login.test.tsx` (label associations) jsdom
      suite, plus the narrow-width browser smoke which confirms focus-in, inert background,
      Tab trap, and focus-return live across all three nav dialogs. Evidence: code change +
      green tests (256) + 18/18 browser-smoke checks. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Invalidate an in-flight search when the query is cleared** —
      `apps/web/src/components/TrackSearch.tsx` — The empty-query branch cleared results but
      did not increment `reqId`; a request already started could still satisfy
      `id === reqId.current` and repopulate stale results, flashing them under a newly typed
      query. Remediation (PR #48, deployed 2026-06-14): the empty-query branch now bumps
      `reqId.current`, invalidating any in-flight generation. A jsdom component test
      (the project's first) reproduces the cleared-mid-flight race and was confirmed to fail
      without the fix. Evidence: code change + green component test. Confidence: high.
- [x] **[NICE-TO-HAVE - FIXED] Add a class rename affordance** —
      `apps/web/src/components/Dashboard.tsx`, `apps/web/src/components/ClassHeaderCard.tsx` — The API
      already accepts title updates, but the class header only exposed publish, share, delete, and run
      actions. Remediation (PR #60, deployed 2026-06-15): an owner-only inline title editor in the class
      header uses the existing `updateClass` path; a `ClassHeaderCard.test.tsx` suite covers it.
      Evidence: code change + green tests. Confidence: high.
- [x] **[NICE-TO-HAVE - FIXED] Render a not-found state for unknown SPA paths** —
      `apps/web/src/App.tsx`, `apps/web/src/components/NotFound.tsx` — Only `/reset-password` was
      special-cased, while Cloudflare serves `index.html` for every unknown path, so an arbitrary URL
      became Login or Dashboard rather than a 404-like view. Remediation (PR #58, deployed 2026-06-15):
      a minimal route table renders a dedicated `NotFound` view for unknown paths; `App.test.tsx`
      covers the branch. Evidence: code change + green tests. Confidence: high.

## API / Backend Logic

- [x] **[BLOCKER - DEPLOYED] Fix the production
      SoundCloud OAuth return origin** —
      `apps/api/src/routes/provider-connections.ts:58-64`,
      `apps/api/src/routes/provider-connections.ts:173-176`,
      `apps/api/src/routes/provider-connections.ts:218-222`,
      `apps/api/wrangler.toml:19-23` — `spaUrl` falls back to
      `http://localhost:5173`, and the deployed Worker has no `WEB_ORIGIN` binding.
      A read-only production callback request returned that localhost Location header.
      Why it matters: both successful and failed SoundCloud consent callbacks send beta
      users away from RitmoFit to an unreachable local address. Recommended fix: commit
      `WEB_ORIGIN = "https://ritmofit.studio"` or derive the same-origin return URL from the
      canonical auth origin/request, then test success, denial, missing state, and token
      exchange failure in a deployed smoke environment. Evidence: verified. Confidence:
      high. Remediation: production `WEB_ORIGIN` is live, the fallback uses the canonical
      auth origin, and the deployed missing-state callback returns to
      `https://ritmofit.studio/account?error=state_missing`. A full provider consent
      success/denial/token-failure round-trip remains a follow-up smoke.
- [x] **[BLOCKER - DEPLOYED] Do not grant shares or team membership to unverified email
      identities** — `apps/api/src/lib/auth.ts:66-80`,
      `apps/api/src/routes/shares.ts:32-53`,
      `apps/api/src/routes/teams.ts:103-124`,
      `apps/api/src/db/schema.ts:66-79` — Sign-up sends verification but explicitly does
      not require it; share and team-add routes resolve a target solely by `users.email`
      without checking `emailVerified`. Why it matters: someone can pre-register another
      instructor's address and receive classes or team access intended for that person.
      The missing production email service makes that takeover harder to remediate.
      Recommended fix: require a verified target for email-based grants, and either require
      verification before normal use or keep unverified accounts out of the trust graph.
      Add integration tests for the pre-registration case. Evidence: code inspection and
      verified production email configuration. Confidence: high. Remediation: both email
      and direct-user-id grant paths now reject unverified users with
      `EMAIL_NOT_VERIFIED`; integration tests cover shares and team membership.
- [x] **[SHOULD-FIX - FIXED] Expose only provider capabilities that production actually
      supports** — `packages/shared/src/enums.ts`,
      `apps/web/src/components/ConnectionsDialog.tsx`,
      `apps/web/src/components/TrackSearch.tsx`,
      `apps/api/src/routes/provider-connections.ts`,
      `apps/api/src/lib/music/user-likes.ts` — The UI offered Connect and My likes for all
      three providers, but outside the mock seam OAuth connection and user likes reject every
      provider except SoundCloud with `501`. Remediation (PR #48, deployed 2026-06-14): a
      shared `providerCapabilities` matrix (+ `supportsUserAccount()`) is the single source of
      truth — SoundCloud = catalog + connect + likes, Spotify/Apple Music = catalog only. The
      Connections dialog shows a muted "Catalog search only" state instead of a dead-end
      Connect button, TrackSearch hides "My likes" for catalog-only providers (and won't fire
      a `501` likes request), and the API connect/callback/likes gates read the matrix.
      Catalog search/import stays available for all three. Unit tests assert the matrix
      invariants. Evidence: code change + green tests. Confidence: high.

## Data Layer & State Management

- [x] **[BLOCKER - DEPLOYED] Tie class-detail state to the selected class and discard stale
      responses** — `apps/web/src/components/Dashboard.tsx:58-69`,
      `apps/web/src/components/Dashboard.tsx:83-109`,
      `apps/web/src/components/Dashboard.tsx:228-239`,
      `apps/web/src/components/Dashboard.tsx:443-487` — `openClass` changes the class header
      before clearing or loading its tracks/payload, while concurrent responses write to
      one global state with no request token or abort. A failed request returns without
      clearing the prior detail. The browser pass reproduced a failed class switch that
      showed the newly selected class with the previous empty detail state. With the
      opposite ordering, an instructor can select and edit/delete a prior class's track
      while another class title is displayed; item mutations authorize by the track's
      actual id. Why it matters: this can silently modify the wrong class. Recommended fix:
      store detail as `{classId, status, tracks, payload}`, clear or mask it during a switch,
      ignore out-of-order responses, and add rapid-switch plus failure component tests.
      Evidence: verified and code inspection. Confidence: high. Remediation: detail state
      is keyed by class and request id, masks prior data during loading/failure, and has
      reducer regressions for stale success and failure responses.
- [x] **[BLOCKER - DEPLOYED] Make provider disconnect purges provenance-correct and
      non-lossy** — `apps/api/src/lib/track-import.ts:115-144`,
      `apps/api/src/lib/track-import.ts:186-196`,
      `apps/api/src/lib/music/purge.ts:52-55`,
      `apps/api/src/lib/music/purge.ts:83-102`,
      `apps/api/src/lib/music/purge.ts:125-168` — A same-song import attaches another
      provider reference but does not record which provider supplied the single
      `albumArtUrl`. Purge keeps artwork whenever any provider reference remains, so art
      sourced from the disconnected provider can survive. Separately, a duty is deleted
      after five failed sweeps, permanently abandoning the documented purge requirement.
      Why it matters: derived provider metadata can remain indefinitely after disconnect,
      violating RitmoFit's explicit provider-data rules. Recommended fix: track artwork
      provenance or conservatively clear provider artwork, move exhausted work to an
      observable dead-letter state instead of deleting it, alert on overdue duties, and
      add D1 integration tests for multi-provider tracks and repeated failures. Evidence:
      code inspection. Confidence: high. Remediation: affected artwork is cleared
      conservatively, exhausted rows receive `failed_at` instead of being deleted, and
      unit/D1 integration tests cover both cases. Migration `0009` and its active-queue
      index are live; a read-only production check found zero active and zero failed duties.
- [x] **[SHOULD-FIX - FIXED] Copy class sections along with tracks, cues, and moves** —
      `apps/api/src/routes/classes.ts:99-139`,
      `apps/api/src/routes/classes.ts:163-245`,
      `apps/api/test/authz.integration.test.ts:109-133` — Whole-class copy fetched and
      inserted tracks, provider refs, cues, and moves but never read or recreated
      `class_sections`; the integration test only asserted the copied track. Why it matters:
      Save a copy silently loses the instructor's segment/energy plan. Remediation
      (2026-06-14): `POST /classes/:id/copy` now fetches the source `class_sections` in
      start order within the same up-front batch and recreates them (fresh ids, new class
      id, same `type` + `startOffsetMs`) in the batched transaction. A new integration
      test seeds two bands on the source and asserts the copy carries both in order.
      Evidence: code change + green Worker/D1 integration test. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Paginate and order the private class library in D1** —
      `apps/api/src/routes/classes.ts:64-85` — `GET /classes` resolves every visible id,
      fetches every class, and sorts the full result in Worker memory. Why it matters: a
      long-lived instructor or team account increases D1 reads, response size, and Worker
      CPU on every dashboard load. Remediation (2026-06-15): the ownership/direct-share/
      team-share union, duplicate-path maximum access, deterministic
      `(updated_at DESC, id DESC)` ordering, cursor predicate, and limit now execute in D1.
      The web loads 30 rows at a time and appends with an accessible continuation control.
      Unparameterized requests retain the full-array contract for the current iOS cache.
      Migration `0011` adds owner/share lookup indexes; mounted Worker/D1 tests cover
      ordering, equal timestamps, hidden rows, pagination boundaries, and highest access.
      A representative 300-class `EXPLAIN QUERY PLAN` pass confirms all three candidate
      arms use their intended indexes. Evidence: implementation + focused
      unit/component/integration tests + disposable-D1 migration/query plan. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Add indexes for the remaining recurring lookup and cleanup
      paths** — `apps/api/src/db/schema.ts`, `apps/api/migrations/0012_small_ink.sql`,
      `apps/api/src/lib/music/purge.ts`, `apps/api/src/lib/rate-limit.ts` — There was no standalone
      `track_provider_ids.track_id` index despite repeated track-to-ref lookups, and no
      `rate_limit.last_request` index for daily pruning. The active purge queue index shipped in
      `0009` and target-first direct/team share indexes in `0011`. Remediation (PR #57, deployed
      2026-06-15): migration `0012` adds the `track_provider_ids.track_id` lookup index and the
      `rate_limit.last_request` pruning index (index-only, no data change). Remote D1 migrated through
      `0012` before deploy. Evidence: implementation + disposable-D1 migration validation. Confidence:
      high.

## Testing & CI/CD

- [x] **[SHOULD-FIX - FIXED] Add component and browser coverage for the actual instructor
      UI** — `apps/web/vite.config.ts`, `apps/web/src/components/*.test.tsx`,
      `apps/web/smoke/` — The original 56 web tests exercised pure helpers only, with no DOM
      render tests for the instructor surfaces. Remediation: jsdom + Testing Library component
      tests now cover Login, the `Dialog` primitive, `TrackSearch` (provider search), `LiveMode`,
      `LibraryRail`, `ClassHeaderCard`, and `App` routing (PRs #48/#51/#54/#58/#60), and the
      committed Playwright smokes (`apps/web/smoke/`: narrow-width 18/18, functional 16/16, PRs
      #51/#52) drive sign-up, the full class lifecycle, provider connect/search/import/disconnect,
      rapid class switching, and network failure in a real browser. The remaining named gaps now
      have focused component coverage: `Dashboard.test.tsx` (rail loading/empty/error states,
      open-class workspace, the keyed-detail rapid-switch guard, and detail-failure retry),
      `ConnectionsDialog.test.tsx` (capability gating + confirmed disconnect), `ShareDialog.test.tsx`
      and `TeamsDialog.test.tsx` (the verified-identity sharing surfaces), and `ErrorBoundary.test.tsx`.
      Evidence: code change + green component suites + the browser smokes. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Expand Worker/D1 integration tests across launch-critical
      routes** — `apps/api/test/*.integration.test.ts` — The original eight-test suite covered basic
      class authz, run payload, sharing, Explore, and a track copy, but not provider callback
      configuration, disconnect purge SQL behavior, section copying, unverified share targets, teams,
      password-reset delivery, cue/move writes, or invalid duration handling. Progress (PRs #55 + #61,
      deployed 2026-06-15): the mounted Worker/D1 suite grew from 21 to 28 tests with dedicated
      `choreography-access.integration.test.ts` (cue/move write-path authorization) and
      `team-access.integration.test.ts` (team-share detail access + level enforcement). Remediation
      (PR #63, merged 2026-06-15): the last three named gaps now run against the mounted worker —
      `provider-callback.integration.test.ts` mints the encrypted `rf_oauth_state` cookie to drive
      every callback failure branch (`state_invalid`/`access_denied`/`state_mismatch`/`state_expired`/
      `unsupported_provider`/`connect_failed`, each redirecting to the canonical origin);
      `provider-disconnect.integration.test.ts` proves `DELETE …/connection` enqueues exactly one purge
      duty on a real disconnect and none on a no-op/repeated disconnect; and
      `password-reset.integration.test.ts` runs request → reset → sign-in (new password works, old
      fails) through the real Better Auth routes, plus no-enumeration and invalid-token cases. Suite
      28 → 41. Test-only — no schema/migration/route/contract/OpenAPI change, so **not a deploy**.
      Evidence: code change + green integration suite (41) + full CI gates. Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Configure Better Auth's trusted client-IP header for production
      rate limiting** — `apps/api/src/lib/auth.ts`, `apps/api/test/helpers.ts`,
      `apps/api/test/password-reset.integration.test.ts` — Better Auth's limiter warned when it could
      not determine a client IP and originally allowed `X-Forwarded-For` as a fallback. Cloudflare
      documents `CF-Connecting-IP` as the single visitor-IP header to prefer over `X-Forwarded-For`, and
      Better Auth documents `advanced.ipAddress.ipAddressHeaders` for trusted proxy IP detection.
      Remediation (2026-06-15): auth rate limits now read only `cf-connecting-ip`; the mounted
      Worker/D1 integration helper supplies a production-shaped Cloudflare IP header by default; and the
      password-reset integration suite proves a fixed `CF-Connecting-IP` with rotating spoofed
      `X-Forwarded-For` values still hits one rate-limit bucket and returns `429` on the sixth request.
      Suite 41 → 42. No schema, migration, API route/contract, shared-contract, or OpenAPI change.
      Evidence: code change + green integration suite (42). Confidence: high.
- [x] **[SHOULD-FIX - MOSTLY FIXED] Make release gates enforce formatting, dependency policy, and
      protected merges** — `.github/workflows/ci.yml`, `package.json` — CI omitted
      `format:check` and dependency auditing; both commands failed. Remediation (PR #53):
      both failures are cleaned (see below) and CI now runs **Format check** (`pnpm
format:check`) and **Dependency audit** (`pnpm audit:ci`) in addition to typecheck /
      lint / test / integration / build / OpenAPI-drift. The audit step ignores the four
      documented dev-tooling advisories via explicit `--ignore <GHSA>` flags, so any **new**
      advisory fails the build. Residual: **branch protection** (requiring the CI job before
      merge) is a GitHub repo setting, not code — still to be enabled by the owner.
      Evidence: green gates locally. Confidence: high for CI contents; the protected-merge
      setting remains an owner action.
- [x] **[NICE-TO-HAVE - FIXED] Define and enforce the repository's formatting boundary** —
      `.prettierignore`, `package.json` — `format:check` reported 91+ files, including
      generated OpenAPI/Drizzle artifacts and long-form reference docs. Remediation (PR #53):
      `.prettierignore` now excludes the generators' outputs (`apps/api/openapi/`,
      `apps/api/migrations/`, `tokens.css`) and the long-form reference doc trees
      (`ritmofit_dev_plan/`, `ritmofit_design_system/`); the ~51 owned source + top-level
      doc files were formatted in one pass. `format:check` is green and wired into CI.
      Evidence: green `format:check` + unchanged `openapi.json` (drift gate still passes).
      Confidence: high.
- [ ] **[DEFERRED 2026-06-15] PR preview environments** — `.github/workflows/ci.yml` — Considered
      whether to add per-PR preview deployments (and, separately, whether to link the GitHub repo to
      Cloudflare's Workers Builds). Decision: **defer.** Rationale: (1) GitHub Actions already runs the
      full quality gate including the mounted Worker/D1 integration suite, so most runtime-parity value
      is already covered; (2) linking the repo to Cloudflare is rejected outright — it duplicates CI and
      pushes toward auto-deploy on push, which conflicts with the intentional manual, human-confirmed
      prod-deploy guardrail (AGENTS.md §Security/Deployment); (3) the remaining genuine gap (a
      browser-clickable instance of each PR on the real runtime) has modest value for a solo,
      pre-launch operator, and realizing it requires resolving the D1-for-previews question (share prod
      D1 = footgun; separate seeded preview D1 = real setup). **Revisit when** a second person starts
      reviewing UI, or at launch. **If/when we do it**, the chosen path is a `pull_request` job running
      `wrangler versions upload` (a _version_, not a deploy — keeps the manual prod guardrail intact)
      rather than Cloudflare's repo link; needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo
      secrets and a preview-D1 decision. Confidence: high (decision), not a code change.

## Performance

- [x] **[NICE-TO-HAVE - FIXED] Avoid rebuilding the active event list on every animation
      frame** — `apps/web/src/components/LiveMode.tsx` — `trackAt` created a new live wrapper as
      elapsed time changed, so `eventsFor(live.entry)` mapped and sorted the same cues/moves again on
      each `requestAnimationFrame`; current/next scans then ran on the rebuilt array, and `FullList`
      re-ran `eventsFor(t)` for every track every frame. Why it matters: dense choreography created
      avoidable work during the most timing-sensitive view. Remediation (2026-06-15): each track's
      events are flattened/sorted once per payload (`eventsByTrack = payload.tracks.map(eventsFor)`),
      `trackAt` is replaced by a primitive-returning `trackIndexAt` so frame-rate memos only
      invalidate when the live track changes, current/next come from a single O(log n)
      `lastAtOrBefore` binary search over the stable pre-sorted array (preserving the prior
      last-of-ties / `find(atMs > t)` semantics), and `FullList` reuses `eventsByTrack`. Coverage:
      8 new unit tests for `trackIndexAt` and `lastAtOrBefore` (LiveMode suite 3 → 11). Web-only:
      no schema, migration, API, shared-contract, or OpenAPI change. Evidence: code change + green
      tests (web 103) + typecheck/lint/build/format-check. Confidence: high.
- [x] **[NICE-TO-HAVE - FIXED] Lazy-decode album artwork outside the live viewport** —
      `apps/web/src/components/Dashboard.tsx`, `apps/web/src/components/TrackSearch.tsx` — Track-list
      and search-result images omitted `loading="lazy"` and `decoding="async"`, so long result or
      class lists eagerly requested and decoded every thumbnail. Remediation (PR #56, deployed
      2026-06-15): non-critical artwork is lazy-loaded and async-decoded with explicit dimensions
      retained; a `TrackSearch.test.tsx` case covers it. Evidence: code change + green tests.
      Confidence: high.

## Security & Production Readiness

- [x] **[BLOCKER - REMEDIATED] Provision and verify production transactional email** —
      `apps/api/src/lib/email.ts:44-70`, `apps/api/src/lib/auth.ts:51-80`,
      `apps/web/src/components/Login.tsx:22-29` — Resend now verifies
      `ritmofit.studio`; public DNS resolves SPF, DKIM, sending MX, and DMARC. Worker
      secret-only version 48 carries a sending-only, domain-restricted `RESEND_API_KEY`
      and explicit `EMAIL_FROM`. A real Gmail-alias signup received the verification
      message from `noreply@ritmofit.studio`; Gmail reported
      `mailed-by: send.ritmofit.studio` and `signed-by: ritmofit.studio`. The verification
      link set `email_verified = 1`, and a real password-reset message reached the same
      inbox, opened the valid reset form, and completed the password change. The temporary
      production account and its cascaded auth rows were deleted after verification.
      Remaining operational work: monitor Resend delivery failures and reputation.
      Evidence: production DNS, Worker metadata, Gmail, browser flow, and remote D1.
      Confidence: high.
- [x] **[SHOULD-FIX - FIXED] Set baseline browser security headers at the Worker/edge** —
      `apps/api/src/index.ts:29-82`, `apps/web/index.html:7-12` — Production responses
      lacked CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
      `Permissions-Policy`, and frame protection. Remediation (2026-06-14): a Hono
      `app.use('*')` middleware in `index.ts` now sets HSTS, nosniff, `X-Frame-Options:
DENY`, `Referrer-Policy`, `Permissions-Policy`, and a locked `default-src 'none'`
      CSP on all API/health responses; the SPA + static assets (served by the `[assets]`
      handler, which the Worker does not run for) carry the same transport/frame headers
      plus a page CSP via a new `apps/web/public/_headers` (→ `dist/_headers`). The page
      CSP keeps Google Fonts (`style-src`/`font-src` whitelisted, per the chosen
      CSP-allow strategy), allows the Cloudflare insights beacon, and permits provider
      album art (`img-src https:`). An integration test asserts the API headers on
      `/health`. Remaining: a live post-deploy smoke of the SPA response headers (in the
      Follow-Up checklist). Evidence: code change + green integration test + verified
      `dist/_headers` emission. Confidence: high for the API path; medium for the SPA
      path until a deployed smoke confirms it.
- [x] **[SHOULD-FIX - DISPOSITIONED] Upgrade or explicitly disposition the dependency audit
      findings** — `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`), `package.json` (`audit:ci`
      script) — `pnpm audit --prod` exited nonzero with `esbuild`/Vite records reached only through
      Better Auth/Drizzle (`drizzle-kit → tsx → esbuild`) and Vitest/Vite tool paths.
      Disposition (PR #53): all are **dev/build-server-only** advisories (esbuild & vite
      dev servers) — none reach the deployed Worker request handler or the browser bundle —
      and the esbuild ones (`<0.28.1`) are unfixable without a **vite 5 → 6 major
      upgrade** (vite 5 pins `esbuild ^0.21`). They are explicitly accepted via
      `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`, which `audit:ci` runs in CI and which
      still fails on any **new** advisory. Update (PR #64, merged 2026-06-15): two newly-published
      vite advisories of the same dev/build-only class (`GHSA-fx2h-pf6j-xcff` high `server.fs.deny`
      bypass, `GHSA-v6wh-96g9-6wx3` moderate launch-editor disclosure; both `<=6.4.2`, via vitest)
      began failing the gate and were added to the ignore list — six GHSAs now accepted
      (`GHSA-67mh-4wv8-2f99`, `GHSA-4w7w-66w2-5vf9`, `GHSA-gv7w-rqvm-qjhr`, `GHSA-g7r4-m6w7-qqqr`,
      `GHSA-fx2h-pf6j-xcff`, `GHSA-v6wh-96g9-6wx3`). Follow-up: revisit when upgrading to vite 6 /
      newer Better Auth. Evidence: `audit:ci` exits 0; new advisories still gate. Confidence:
      high.
- [x] **[SHOULD-FIX - MOSTLY FIXED] Create a production configuration, deployment, and recovery
      runbook** — `README.md`, `apps/api/.dev.vars.example`, `ritmofit_dev_plan/deployment-runbook.md`,
      `AGENTS.md:131-148` — The root README did not explain setup or release operations and the root
      environment example was obsolete. Remediation: the deploy + Worker-rollback + D1 Time-Travel
      recovery runbook landed in `ritmofit_dev_plan/deployment-runbook.md` (PR #52), and PR #59
      (deployed 2026-06-15) rewrites the README as a real entry point (install, local startup, env,
      tests, deployment, troubleshooting) and removes the stale root `.dev.vars.example` in favor of
      the canonical `apps/api/.dev.vars.example`. Remaining: a live prod-rollback exercise (deferred,
      needs a maintenance window). Evidence: code change + the verified-available rollback/recovery
      runbook. Confidence: high.

## RitmoFit Core Instructor Workflow

- [x] **[SHOULD-FIX - DEPLOYED] Block Live mode until every track has a usable duration** —
      `packages/shared/src/entities/tracks.ts:12-19`,
      `apps/api/src/lib/run-payload.ts:41-54`,
      `apps/web/src/components/Dashboard.tsx:403-409`,
      `apps/web/src/components/LiveMode.tsx:286-289` — Provider tracks may have
      `durationMs = null`; timeline assembly treats each as zero, while Run live is enabled
      solely by track count. Multiple zero-duration entries share offsets, can be skipped
      immediately, and an all-null class has a total of zero even though it contains songs.
      Why it matters: the instructor's live sequence and countdown become unreliable.
      Remediation (PR #49, deployed 2026-06-14): migration `0010` adds a positive nullable
      `class_tracks.duration_ms_override`; sequencing, run-payload assembly, anchor validation,
      and copies resolve `override ?? track.duration_ms`. The builder labels missing-duration
      rows, links an actionable header summary to the inspector, accepts `m:ss`, and disables
      Live mode until every track has a positive effective duration. The API rejects a duration
      shorter than the latest cue/move anchor. Evidence: unit/component coverage, mounted
      Worker/D1 integration coverage, fresh disposable migration validation, and production smoke.
      Confidence: high.
- [x] **[SHOULD-FIX - PR #50, DEPLOYED] Add provider handoff links to the current track in Live mode** —
      `packages/shared/src/entities/run-payload.ts:39-43`,
      `packages/shared/src/entities/run-payload.ts:65-81`,
      `apps/web/src/components/LiveMode.tsx:250-289`,
      `apps/web/src/components/LiveMode.tsx:294-365` — The run payload carries
      `providerUri`, but neither Cue-by-Cue nor Full List exposes it. Why it matters:
      RitmoFit correctly avoids embedded playback, but the web live surface gives the
      instructor no supported way to open the current song in its provider app. Recommended
      fix: render explicit "Open in SoundCloud/Spotify/Apple Music" actions for available
      refs with safe URI handling and no autoplay/mixing behavior. Remediation: both Live
      views now render large external handoff links for the active track, ordered
      SoundCloud/Spotify/Apple Music. `providerHandoffHref` accepts Spotify track URIs plus
      provider-owned HTTPS links and rejects missing, malformed, cross-provider, or unsafe
      values; component tests cover both views and suppression. Evidence: code change +
      full gates + local browser verification. Confidence: high.

## Launch Blockers — Do First

1. Provision Resend, verify the sending domain, and prove password-reset and
   verification delivery on `ritmofit.studio`. **Complete: production Gmail delivery and
   both action flows passed on 2026-06-14.**
2. Set the production web origin and verify every SoundCloud OAuth callback path returns
   to `https://ritmofit.studio`. **Deployed; missing-state live smoke passed, full provider
   consent round-trip remains.**
3. Make email-based sharing/team membership require a verified identity. **Deployed.**
4. Key Dashboard detail state by class/request so stale or failed responses cannot expose
   another class's tracks under the selected header. **Deployed.**
5. Make provider disconnect purge work provenance-aware, durable after repeated failures,
   and observable until completed. **Deployed; migration and queue schema verified.**

## Follow-Up Verification Checklist

- [x] Run dependency install/check with the frozen lockfile.
- [x] Run build.
- [x] Run typecheck.
- [x] Run lint.
- [x] Run unit tests.
- [x] Run Worker/D1 integration tests.
- [x] Run formatting check. _(2026-06-15: green — PR #53 defined the formatting boundary
      (`.prettierignore` excludes generated OpenAPI/Drizzle artifacts + the long-form doc
      trees) and formatted the owned source/docs; `pnpm format:check` now reports "All matched
      files use Prettier code style!" and runs in CI.)_
- [x] Regenerate OpenAPI and confirm no drift.
- [x] Validate migrations against a disposable local D1 database.
- [x] Smoke-test production sign-up, password reset, and email verification with real
      inbox delivery; remove the temporary account afterward.
- [x] Smoke-test sign-in, sign-out, and session expiry. _(PR #52
      `apps/web/smoke/functional.smoke.mjs`: sign-up/out/in pass; sign-out clears the session
      and returns to Login — the same end state as expiry. True TTL expiry isn't
      time-travelable in a browser smoke.)_
- [x] Smoke-test provider connection, search, import, disconnect, and required purge
      behavior. _(Functional smoke covers connect/search/import/disconnect against the mock
      provider seam. The 7-day purge is the disconnect-scheduled cron/queue path, covered by
      D1 integration tests, not browser-exercised.)_
- [x] Smoke-test class creation, editing, saving, reopening, sharing, copying, deleting,
      and live mode. _(Functional smoke covers create / add-track / reopen / publish / share /
      copy / delete / run-live. Cue/move choreography authoring is covered by the
      `ChoreographyEditor`/component unit tests rather than the browser smoke.)_
- [x] Verify required production environment variables and provider redirect URIs.
      _(2026-06-15: all required Worker secrets present; `BETTER_AUTH_URL`/`WEB_ORIGIN`
      = `https://ritmofit.studio`; SoundCloud callback returns to the prod origin.)_
- [x] Check the production smoke target without changing data.
- [x] Scan reachable Git history for common secret patterns.
- [x] Confirm remote migration state.
- [x] Confirm and exercise a documented rollback/recovery path. _(Documented in
      `ritmofit_dev_plan/deployment-runbook.md` (PR #52): Worker version `wrangler rollback` + D1 `wrangler d1 time-travel restore`, both **verified available** against the live
      resources read-only — version history retained, current D1 bookmark returned. A live
      prod rollback was deliberately **not** triggered (disruptive; needs a maintenance
      window + confirmation).)_
- [x] Re-run `pnpm audit --prod` with no unexplained high/moderate findings. _(2026-06-15:
      same documented set — 1 high / 2 moderate / 1 low, all `esbuild`/`vite` via
      `better-auth → drizzle-kit/tsx` and `vitest → vite-node`. Dev/build paths, not in the
      Worker request bundle. The upgrade/disposition remains an open SHOULD-FIX.)_
- [x] Verify security headers on the SPA, health endpoint, and authenticated API
      responses. _(2026-06-15: SPA page CSP + transport/frame headers, `/health`, and the
      `/api/v1/classes` response all carry the full set. The header middleware is global
      (`app.use('*')`), so authenticated responses are identical.)_
- [x] Run rapid class-switch, network-failure, narrow-viewport, and keyboard-dialog
      browser tests. _(narrow-viewport + keyboard-dialog: `narrow-width.smoke.mjs` (18/18,
      PR #51); rapid class-switch + network-failure: `functional.smoke.mjs` (PR #52).)_
