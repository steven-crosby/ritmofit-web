# RitmoFit Web Pre-Launch Review

_Audit date: 2026-06-14. Scope: current `main` worktree. Review only; no product fixes,
schema changes, deployments, production migrations, or secret changes were performed._

_Remediation update: the worktree now contains local fixes and regression coverage for
blockers 2-5. They are not deployed; migration `0009` and production callback smoke
verification remain release steps. Transactional email remains externally blocked on
provider/domain provisioning._

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
  `apps/api/src/db/auth-schema.ts`; ten sequential migrations (`0000` through `0009`)
  and Drizzle metadata are present in the remediation worktree.
- `packages/shared` — canonical Zod schemas, enums, API entity types, and run-payload
  contract shared by the API and clients.
- `packages/music` — SoundCloud, Spotify, Apple Music, and third-party BPM provider
  adapters. Provider audio is not served or cached by this repository.
- `.github/workflows/ci.yml` — advisory GitHub Actions checks on pushes to `main` and
  pull requests. CI installs from the frozen lockfile, then runs typecheck, lint, unit
  tests, Worker/D1 integration tests, the web build, and an OpenAPI drift check. It
  does not deploy.
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

Missing or unclear documentation:

- `README.md` contains only a two-sentence product description and does not document
  installation, local startup, required environment variables, tests, deployment, or
  troubleshooting. The detailed information exists across `AGENTS.md` and
  `ritmofit_dev_plan`, but the normal repository entry point is incomplete.
- The root `.dev.vars.example` is stale relative to `apps/api/.dev.vars.example`: it uses
  obsolete Apple Sign-in variable names, omits Resend and current provider variables, and
  still labels M2 settings as unused placeholders.
- Production Worker version `b9949950-13c3-4583-85e5-1fa3d640b33e` was inspected
  read-only. Its bindings confirm that `RESEND_API_KEY` and `WEB_ORIGIN` are absent.
  DNS/email-provider verification and a tested rollback/recovery procedure could not be
  established from committed files or read-only Worker metadata.

## Baseline Command Results

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
b9949950-13c3-4583-85e5-1fa3d640b33e --json` — **PASS WITH FINDINGS**
  - Summary: production is 100% on Worker version `b9949950`; the deployed bindings
    include the D1 database, provider credentials, auth secret, encryption key, and
    `BETTER_AUTH_URL`, but not `RESEND_API_KEY` or `WEB_ORIGIN`.
  - Relevant files: `apps/api/wrangler.toml`, `apps/api/src/lib/email.ts`,
    `apps/api/src/routes/provider-connections.ts`.
  - Recommended fix: provision transactional email and commit the canonical
    non-secret web origin to `[vars]`, then inspect the newly deployed version.
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

- [ ] **[SHOULD-FIX] Distinguish loading, failure, and valid empty states, and clear
      recovered errors** — `apps/web/src/components/Dashboard.tsx:58-81`,
      `apps/web/src/components/Dashboard.tsx:86-101`,
      `apps/web/src/components/Dashboard.tsx:209-210`,
      `apps/web/src/components/Dashboard.tsx:275-277` — The class list starts as `[]`, so
      "No classes yet" renders before the initial request resolves, and successful retries
      never clear the top-level error. The browser pass left "Failed to fetch" visible
      after a later class reload succeeded. Why it matters: instructors cannot tell whether
      data is absent, still loading, or recovered, which undermines save/reopen confidence.
      Recommended fix: model list/detail status explicitly, clear stale errors at the start
      or success of a request, and preserve the last valid detail behind a retry state.
      Evidence: verified and code inspection. Confidence: high.
- [ ] **[SHOULD-FIX] Make the workstation usable at narrow widths** —
      `apps/web/src/components/Dashboard.tsx:153-185`,
      `apps/web/src/components/Dashboard.tsx:209-216`,
      `apps/web/src/components/Dashboard.tsx:781-844` — At a 390 x 844 viewport, the page
      measured 566 px wide; Connections, Sign out, Run live, the track row, reorder grip,
      and manual form extended beyond the viewport. Why it matters: a private-beta user on
      a small laptop split view, tablet, or phone cannot reliably reach core controls.
      Recommended fix: wrap/collapse the top navigation, reduce page padding at small
      breakpoints, make track rows stack or elide secondary fields, and make manual fields
      a responsive grid. Evidence: verified. Confidence: high.
- [ ] **[SHOULD-FIX] Add real form labels and complete modal focus management** —
      `apps/web/src/components/Login.tsx:72-101`,
      `apps/web/src/components/Dashboard.tsx:310-327`,
      `apps/web/src/components/ConnectionsDialog.tsx:83-105` — Several forms use
      placeholders as their only labels. Opening Music connections leaves focus on the
      background trigger, and the 29 enabled controls behind the modal remain focusable;
      the dialog has Escape handling but no initial focus, focus trap/inert background, or
      focus return. Why it matters: keyboard and assistive-technology users can lose
      context or interact with obscured controls. Recommended fix: associate visible or
      screen-reader labels with every input and adopt a reusable accessible dialog
      primitive that manages focus and background inertness. Evidence: verified and code
      inspection. Confidence: high.
- [ ] **[SHOULD-FIX] Invalidate an in-flight search when the query is cleared** —
      `apps/web/src/components/TrackSearch.tsx:33-75` — The empty-query branch clears
      results but does not increment `reqId`; a request that already started can still
      satisfy `id === reqId.current` and repopulate stale results after the field is empty.
      Why it matters: users can add a result that no longer matches the visible search
      state. Recommended fix: increment the request generation or abort the request before
      returning from the empty-query branch, and add a fake-timer/component test. Evidence:
      code inspection. Confidence: high.
- [ ] **[NICE-TO-HAVE] Add a class rename affordance** —
      `apps/web/src/components/Dashboard.tsx:500-545` — The API already accepts title
      updates, but the class header only exposes publish, share, delete, and run actions.
      Why it matters: correcting a typo requires recreating or using the API directly.
      Recommended fix: add a small owner-only inline title editor using the existing
      `updateClass` path. Evidence: code inspection. Confidence: high.
- [ ] **[NICE-TO-HAVE] Render a not-found state for unknown SPA paths** —
      `apps/web/src/App.tsx:14-27`, `apps/api/wrangler.toml:29-32` — Only
      `/reset-password` is special-cased, while Cloudflare serves `index.html` for every
      unknown path; an arbitrary URL therefore becomes Login or Dashboard rather than a
      404-like view. Why it matters: bad links fail ambiguously. Recommended fix: add a
      minimal route table and not-found branch. Evidence: code inspection. Confidence:
      high.

## API / Backend Logic

- [x] **[BLOCKER - CODE COMPLETE, DEPLOY VERIFICATION PENDING] Fix the production
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
      high. Remediation: production `WEB_ORIGIN` is committed, the fallback now uses the
      canonical auth origin, and an integration test covers the missing-state callback.
      A deployed success/denial/token-failure smoke pass is still required.
- [x] **[BLOCKER - CODE COMPLETE] Do not grant shares or team membership to unverified email
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
- [ ] **[SHOULD-FIX] Expose only provider capabilities that production actually
      supports** — `apps/web/src/components/ConnectionsDialog.tsx:117-173`,
      `apps/web/src/components/TrackSearch.tsx:97-136`,
      `apps/api/src/routes/provider-connections.ts:127-145`,
      `apps/api/src/lib/music/user-likes.ts:42-48` — The UI offers Connect and My likes
      for SoundCloud, Spotify, and Apple Music. Outside the mock seam, OAuth connection and
      user likes reject every provider except SoundCloud with `501`, although public
      catalog search/import is implemented for all three. Why it matters: prominent
      production buttons lead to known dead ends. Recommended fix: define a shared
      capability matrix and hide/disable unsupported per-user actions with explanatory
      copy while retaining catalog search. Evidence: verified UI and code inspection.
      Confidence: high.

## Data Layer & State Management

- [x] **[BLOCKER - CODE COMPLETE] Tie class-detail state to the selected class and discard stale
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
- [x] **[BLOCKER - CODE COMPLETE, MIGRATION PENDING] Make provider disconnect purges provenance-correct and
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
      unit/D1 integration tests cover both cases. Migration `0009` must be applied before
      deploying this Worker.
- [ ] **[SHOULD-FIX] Copy class sections along with tracks, cues, and moves** —
      `apps/api/src/routes/classes.ts:99-139`,
      `apps/api/src/routes/classes.ts:163-245`,
      `apps/api/test/authz.integration.test.ts:109-133` — Whole-class copy fetches and
      inserts tracks, provider refs, cues, and moves but never reads or recreates
      `class_sections`; the integration test only asserts the copied track. Why it matters:
      Save a copy silently loses the instructor's segment/energy plan. Recommended fix:
      include ordered sections in the same batch transaction and assert exact section
      preservation in integration tests. Evidence: code inspection and missing coverage.
      Confidence: high.
- [ ] **[SHOULD-FIX] Paginate and order the private class library in D1** —
      `apps/api/src/routes/classes.ts:64-85` — `GET /classes` resolves every visible id,
      fetches every class, and sorts the full result in Worker memory. Why it matters: a
      long-lived instructor or team account increases D1 reads, response size, and Worker
      CPU on every dashboard load. Recommended fix: define cursor/limit semantics and push
      ordering plus limits into SQL while preserving effective access calculation.
      Evidence: code inspection. Confidence: medium.
- [ ] **[SHOULD-FIX] Add indexes for the remaining recurring lookup and cleanup
      paths** — `apps/api/src/db/schema.ts:158-186`,
      `apps/api/src/db/schema.ts:331-361`,
      `apps/api/src/db/schema.ts:397-426`,
      `apps/api/src/lib/music/purge.ts:110-116`,
      `apps/api/src/lib/rate-limit.ts:120-125` — There is no standalone
      `track_provider_ids.track_id` index despite repeated track-to-ref lookups, no
      `provider_purge_queue.requested_at` index for the oldest-first daily batch, no
      target-first share index for visible-class unions, and no `rate_limit.last_request`
      index for daily pruning. Why it matters: these scans grow with provider imports,
      sharing, and authentication traffic. Recommended fix: capture D1 query plans with
      representative data, add only the indexes proven useful, and validate the migration
      on a disposable database. Evidence: code inspection. Confidence: medium.

## Testing & CI/CD

- [ ] **[SHOULD-FIX] Add component and browser coverage for the actual instructor
      UI** — `apps/web/vite.config.ts:9-15`, `apps/web/src/components/Dashboard.tsx:58-109`,
      `apps/web/src/components/LiveMode.tsx:65-168` — The 56 web tests exercise pure
      helpers; Vitest runs in Node with no DOM, and there are no render tests for Login,
      Dashboard, dialogs, class switching, provider search, or Live mode. Why it matters:
      the confirmed stale-state, responsive, and focus bugs all pass CI. Recommended fix:
      add Testing Library/jsdom component tests and a small browser suite covering sign-up,
      create/import/edit/reopen/run, network failure, and rapid class switching. Evidence:
      missing coverage. Confidence: high.
- [ ] **[SHOULD-FIX] Expand Worker/D1 integration tests across launch-critical
      routes** — `apps/api/test/authz.integration.test.ts:1-134` — The single eight-test
      suite covers basic class authz, run payload, sharing, Explore, and a track copy, but
      not provider callback configuration, disconnect purge SQL behavior, section copying,
      unverified share targets, teams, password-reset delivery, cue/move writes, or invalid
      duration handling. Why it matters: the most consequential API findings are outside
      the mounted-Worker test boundary. Recommended fix: prioritize one regression test per
      blocker and then broaden the route matrix. Evidence: missing coverage. Confidence:
      high.
- [ ] **[SHOULD-FIX] Make release gates enforce formatting, dependency policy, and
      protected merges** — `.github/workflows/ci.yml:16-60`, `AGENTS.md:115-122`,
      `ritmofit_dev_plan/close-session-checklist.md:8-10` — CI omits
      `format:check` and dependency auditing; both commands currently fail. Repository
      guidance also records that CI is advisory and branch protection is off. Why it
      matters: a direct merge can ship with known red gates, and manual deployments do not
      add a second automated barrier. Recommended fix: clean the current failures, add the
      checks with a documented vulnerability-exception process, and require the CI job
      before merge when repository plan/account capability allows. Evidence: command
      failure, code inspection, and needs confirmation for current GitHub settings.
      Confidence: high for CI contents; medium for live branch settings.
- [ ] **[NICE-TO-HAVE] Define and enforce the repository's formatting boundary** —
      `.prettierrc`, `.prettierignore`, `package.json` — `format:check` reports 99 files,
      including generated OpenAPI/Drizzle artifacts and long-form reference documents.
      Why it matters: the check is too noisy to be trusted as a release signal. Recommended
      fix: decide which generated/reference files are formatter-owned, update ignore or
      generation behavior, and format the remaining owned files in a dedicated change.
      Evidence: command failure. Confidence: high.

## Performance

- [ ] **[NICE-TO-HAVE] Avoid rebuilding the active event list on every animation
      frame** — `apps/web/src/components/LiveMode.tsx:104-114` — `trackAt` creates a new
      live wrapper as elapsed time changes, so `eventsFor(live.entry)` maps and sorts the
      same cues/moves again on each `requestAnimationFrame`; current/next scans then run on
      the rebuilt array. Why it matters: dense choreography can create avoidable work
      during the most timing-sensitive view. Recommended fix: memoize events by stable
      `classTrackId`/payload and use an index or binary search for current/next events.
      Evidence: code inspection. Confidence: high.
- [ ] **[NICE-TO-HAVE] Lazy-decode album artwork outside the live viewport** —
      `apps/web/src/components/Dashboard.tsx:793-800`,
      `apps/web/src/components/TrackSearch.tsx:180-203` — Track-list and search-result
      images omit `loading="lazy"` and `decoding="async"`. Why it matters: long result or
      class lists eagerly request and decode every thumbnail. Recommended fix: lazy-load
      noncritical artwork, keep explicit dimensions, and verify that the current track's
      art remains eager where needed. Evidence: code inspection. Confidence: high.

## Security & Production Readiness

- [ ] **[BLOCKER] Provision and verify production transactional email** —
      `apps/api/src/lib/email.ts:44-70`, `apps/api/src/lib/auth.ts:51-80`,
      `apps/web/src/components/Login.tsx:22-29` — Without `RESEND_API_KEY`, reset and
      verification messages are printed to Worker logs and the UI still reports that a
      reset link is on its way. The deployed version's bindings confirm the key is absent.
      Why it matters: locked-out beta users cannot recover their accounts, and verification
      cannot establish email ownership. Recommended fix: verify the sending domain and
      SPF/DKIM/DMARC, add `RESEND_API_KEY` and an approved `EMAIL_FROM`, send real reset and
      verification messages, and monitor delivery failures. Evidence: verified and code
      inspection. Confidence: high.
- [ ] **[SHOULD-FIX] Set baseline browser security headers at the Worker/edge** —
      `apps/api/src/index.ts:29-82`, `apps/web/index.html:7-12` — Production responses
      lacked CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
      `Permissions-Policy`, and frame protection. Google Fonts are an external origin that
      must be represented in CSP or self-hosted. Why it matters: the app lacks inexpensive
      defense-in-depth against framing, MIME confusion, referrer leakage, and script/style
      injection. Recommended fix: add and smoke-test a restrictive CSP with
      `frame-ancestors`, HSTS, nosniff, referrer, and permissions policies, accounting for
      Cloudflare-managed scripts and the chosen font strategy. Evidence: verified.
      Confidence: high.
- [ ] **[SHOULD-FIX] Upgrade or explicitly disposition the four dependency audit
      findings** — `pnpm-lock.yaml`, `apps/api/package.json`,
      `apps/web/package.json` — `pnpm audit --prod` exits nonzero with one high, two
      moderate, and one low vulnerability record affecting `esbuild` and Vite through
      Better Auth/Drizzle and Vite/Vitest tool paths. Why it matters: compromised build
      tooling or exposed development servers can affect developer and CI environments even
      when the packages are not in the Worker request bundle. Recommended fix: upgrade
      Better Auth, Vite/Vitest, Drizzle tooling, and direct build dependencies to versions
      that resolve the paths; rerun all gates and document narrowly scoped exceptions if an
      upstream fix is unavailable. Evidence: command failure. Confidence: high.
- [ ] **[SHOULD-FIX] Create a production configuration, deployment, and recovery
      runbook** — `README.md:1-2`, `.dev.vars.example:1-29`,
      `apps/api/.dev.vars.example:1-53`, `AGENTS.md:131-148` — The root README does not
      explain setup or release operations, the root environment example is obsolete, and
      deployment guidance covers migration-before-code and smoke tests but not environment
      validation, Worker rollback, D1 backup/restore, failed migration recovery, or
      compatibility sequencing. Why it matters: private-beta incidents depend on memory
      and scattered planning notes. Recommended fix: consolidate the canonical environment
      matrix, pre-deploy checks, rollback steps, D1 recovery expectations, owner/contact,
      and post-deploy smoke procedure; remove or update the stale root example. Evidence:
      code inspection and needs confirmation for actual Cloudflare backup settings.
      Confidence: high for documentation gaps; medium for platform recovery state.

## RitmoFit Core Instructor Workflow

- [ ] **[SHOULD-FIX] Block Live mode until every track has a usable duration** —
      `packages/shared/src/entities/tracks.ts:12-19`,
      `apps/api/src/lib/run-payload.ts:41-54`,
      `apps/web/src/components/Dashboard.tsx:403-409`,
      `apps/web/src/components/LiveMode.tsx:286-289` — Provider tracks may have
      `durationMs = null`; timeline assembly treats each as zero, while Run live is enabled
      solely by track count. Multiple zero-duration entries share offsets, can be skipped
      immediately, and an all-null class has a total of zero even though it contains songs.
      Why it matters: the instructor's live sequence and countdown become unreliable.
      Recommended fix: surface missing duration in the builder, accept a human-friendly
      `m:ss` correction, and disable Run with an actionable validation summary until every
      track has a positive duration. Evidence: code inspection and existing unit behavior.
      Confidence: high.
- [ ] **[SHOULD-FIX] Add provider handoff links to the current track in Live mode** —
      `packages/shared/src/entities/run-payload.ts:39-43`,
      `packages/shared/src/entities/run-payload.ts:65-81`,
      `apps/web/src/components/LiveMode.tsx:250-289`,
      `apps/web/src/components/LiveMode.tsx:294-365` — The run payload carries
      `providerUri`, but neither Cue-by-Cue nor Full List exposes it. Why it matters:
      RitmoFit correctly avoids embedded playback, but the web live surface gives the
      instructor no supported way to open the current song in its provider app. Recommended
      fix: render explicit "Open in SoundCloud/Spotify/Apple Music" actions for available
      refs with safe URI handling and no autoplay/mixing behavior. Evidence: code
      inspection. Confidence: high.

## Launch Blockers — Do First

1. Provision Resend, verify the sending domain, and prove password-reset and
   verification delivery on `ritmofit.studio`. **Open: external provisioning required.**
2. Set the production web origin and verify every SoundCloud OAuth callback path returns
   to `https://ritmofit.studio`. **Code complete; deploy and smoke verification pending.**
3. Make email-based sharing/team membership require a verified identity. **Code complete.**
4. Key Dashboard detail state by class/request so stale or failed responses cannot expose
   another class's tracks under the selected header. **Code complete.**
5. Make provider disconnect purge work provenance-aware, durable after repeated failures,
   and observable until completed. **Code complete; migration/deploy pending.**

## Follow-Up Verification Checklist

- [x] Run dependency install/check with the frozen lockfile.
- [x] Run build.
- [x] Run typecheck.
- [x] Run lint.
- [x] Run unit tests.
- [x] Run Worker/D1 integration tests.
- [ ] Run formatting check.
- [x] Regenerate OpenAPI and confirm no drift.
- [x] Validate migrations against a disposable local D1 database.
- [ ] Smoke-test sign-up, sign-in, sign-out, session expiry, password reset, and email
      verification.
- [ ] Smoke-test provider connection, search, import, disconnect, and required purge
      behavior.
- [ ] Smoke-test class creation, editing, choreography authoring, saving, reopening,
      sharing, copying, deleting, and live mode.
- [ ] Verify required production environment variables and provider redirect URIs.
- [x] Check the production smoke target without changing data.
- [x] Scan reachable Git history for common secret patterns.
- [x] Confirm remote migration state.
- [ ] Confirm and exercise a documented rollback/recovery path.
- [ ] Re-run `pnpm audit --prod` with no unexplained high/moderate findings.
- [ ] Verify security headers on the SPA, health endpoint, and authenticated API
      responses.
- [ ] Run rapid class-switch, network-failure, narrow-viewport, and keyboard-dialog
      browser tests.
