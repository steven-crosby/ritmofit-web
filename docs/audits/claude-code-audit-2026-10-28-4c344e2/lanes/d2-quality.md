# Lane d2-quality — verification quality, performance, dependencies, maintainability, ops

Reviewer: Claude Code subagent (lane d2-quality), 2026-10-28. Audited SHA `4c344e2`.
Execution worktree: `/tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-d2-quality`
(detached at 4c344e2, `pnpm install --frozen-lockfile`, disposable; `git status` clean apart from
copied repro files). Repro canonical copies: `../repro/d2-quality-*`. Evidence: `../evidence/d2-quality-*`.
No tracked file was edited. No network calls beyond the brief's `pnpm install` (plus one scratch
`npm install eslint-plugin-react-hooks@5.2.0` into the scratchpad, outside the repo, to measure D-9).

## 1. Scope covered

| Area | Method | Depth | Result |
| --- | --- | --- | --- |
| Test census vs vitest includes | `find` of every `*.test.*` / `*.spec.ts` vs `apps/web/vite.config.ts`, `apps/api/vitest*.config.ts`, `packages/music`, `node --test` scripts, Playwright `testMatch` | full | every test file is collected by exactly one runner; `apps/web/smoke/*.mjs` are documented on-demand smokes |
| Skipped / only / todo / vacuous tests | `rg` for `.skip/.only/.todo/xit/skipIf/runIf/.fails`; TypeScript-AST scan for `it`/`test` bodies with no assertion (`noexpect.cjs`) | full | none. 4 AST hits were helper-delegated asserts / timeout args (false positives) |
| Unawaited `expect(...).rejects` | `rg` | full | 1 hit, awaited via `Promise.all` (fine) |
| Tests green while product path crashes | stderr review of a full web unit run (97 files, 1502 tests) | full log | still only D-7 (Dashboard → LiveMode `sections`) |
| Fixture vs shared schema | census of `as unknown as RunPayload` (23 casts, 13 files; 11 files omit `sections`) | sampled | inert except D-7; no new crash |
| Integration tests vs mounted Worker | per-file check for `call`/`authed`/`worker.fetch` | full (42 files) | all but `soundcloud-identity` drive the mounted Worker; that one is an intentional lib-level D1 test |
| Mock catalog / `MOCK_PROVIDERS` divergence | read `lib/mock-catalog.ts`, `registry.ts`, mock short-circuits; checked provider integration tests use `prodEnv` | traced | known and handled (`prodEnv = { ...env, MOCK_PROVIDERS: undefined }` in the provider suites) |
| Typecheck coverage | read all tsconfigs; throwaway tsconfig over `apps/api/{src,test,scripts,*.config.ts}` | full | D-6 recount: 59 errors in 10 test files; `scripts/` and configs clean. web/e2e/packages include their own `src`/tests |
| Lint gaps | probed tsx/e2e/mjs are linted; ad hoc type-aware `no-floating-promises` + `no-misused-promises` over all `src`; ad hoc `react-hooks` rules over `apps/web/src` | full | 0 floating promises; 0 `rules-of-hooks`; 12 `exhaustive-deps` warnings, each read, all deliberate (D-9 update) |
| Dependencies | import scan vs declared deps for all 5 packages; `pnpm why --prod`, `pnpm list --prod -r`; lockfile versions vs `auditConfig.ignoreGhsas` | full | no phantom or unused deps; 4 of 6 audit ignores match nothing in the audited graph (D-11 update) |
| Bundle budget checker | read `check-bundle-budget.mjs`; rebuilt the SPA; gzip 6 vs 9 vs brotli; static imports; symlink invocation | full | measures the right thing today; D-5/D-12 updates; gzip level is not a false-green |
| API hot paths | `inArray` enumeration across `apps/api/src`; loop/await census in import, copy, run payload, class list | full for `inArray`; sampled elsewhere | 1 new D1 bound-parameter site (Q-02) |
| Web perf | nested `find`-in-`map` scan; fetch call-site census | sampled | nothing beyond D-4 |
| Observability / logging | every `console.*` in API and web; Drizzle and Better Auth error paths; scheduled handler; health | traced + tested | Q-01, Q-03 |
| Scheduled handler | read `index.ts` `scheduled`, `purge.ts` drain | traced | two independent `waitUntil`s with `.catch`; no test invokes `scheduled` (gap, not a defect) |

## 2. Candidates

| ID | Title | Sev | Status |
| --- | --- | --- | --- |
| Q-01 | Drizzle query errors embed every bound parameter in `err.message`; Better Auth and the Worker log them, so a D1 failure writes live reset tokens (and emails, ciphertext) to Workers Logs | P3 | Confirmed (Worker-level repro) |
| Q-02 | Unpaginated `GET /api/v1/classes` returns 500 once the caller can see 101+ classes | P3 | Confirmed |
| Q-03 | A response-side ZodError is answered as 422 "Request body failed validation." and never logged | P3 | Confirmed mechanism; no live trigger found |

---

### Q-01 — D1 failures write raw secrets and PII to the Worker log

- **Category:** observability / secret logging. **Severity:** P3 (proposed). Rationale: needs a D1
  query failure on a secret-bearing statement, and the reader needs Cloudflare account access to
  Workers Logs (`[observability] enabled = true`, `apps/api/wrangler.toml:54-55`). It breaks the
  non-negotiable rule "Never log tokens…" (AGENTS.md › Music Constraints) and contradicts two code
  comments that claim sanitization. Raise to P2 if logs are ever shipped off-account (Logpush/tail).
- **Confidence:** high. **Status:** confirmed.
- **Mechanism (verified):**
  - `drizzle-orm@0.45.2` `sqlite-core/session.js:38-63` wraps every failing query as
    `DrizzleQueryError` whose **message** is `Failed query: <sql>\nparams: <all bound values>`
    (`node_modules/drizzle-orm/errors.js:10-19`). The D1 driver goes through this path.
  - Better Auth `dist/api/index.mjs:196-219` (`router.onError`) logs any non-API error with
    `ctx.logger.error(name, e)`; `apps/api/src/lib/auth.ts` sets no `logger` / `onAPIError`.
    Better Auth stores reset tokens unhashed (`verification.storeIdentifier` unset →
    `identifier = reset-password:<token>`, `better-auth/dist/api/routes/password.mjs:77,125`).
  - `apps/api/src/index.ts:118` logs `console.error('Unhandled error:', err)` (full object).
  - `apps/api/src/routes/provider-connections.ts:139-141,334` logs `${err.name}: ${err.message}`
    on any callback failure, including a failing `upsertConnection` (lines 167-193), under a
    comment (lines 332-333) saying logs hold "no tokens/codes/secrets".
- **Trigger:** any D1 error (transient "Network connection lost", storage reset, overload, D-1
  family "too many SQL variables") on a statement that binds a secret or PII. Examples:
  reset-token lookup (`/api/auth/reset-password`), session-token lookup on every authed request
  (session tokens need the HMAC secret to replay, so lower impact), sign-up insert (email +
  password hash), share/team-by-email lookups (email), provider-connection upsert (token ciphertext).
- **Expected:** log the error class and D1 cause only. **Observed:** the raw reset token is logged.
- **Evidence:**
  - Worker-level: `../repro/d2-quality-q01-reset-token-log.integration.test.ts` — requests a reset,
    then calls the mounted Worker with a D1 proxy that fails only verification reads. Result:
    `reset status=500 logLines=2 tokenInLog=true`; the log line is
    `ERROR [Better Auth]: Error Failed query: select … from "verifications" where … = ? … params: reset-password:<TOKEN>,1`
    (`../evidence/d2-quality-q01-reset-run.log`, token redacted by the test).
  - Library-level: `../repro/d2-quality-q01-drizzle-error-params.test.ts` (node unit, 2/2 pass,
    `../evidence/d2-quality-q01-unit-run.log`): a failing `musicConnections` upsert puts both
    ciphertext sentinels into the exact string `describeOAuthConnectFailure` logs.
  - Live instance of the same plumbing: Q-02's 500 logs `Unhandled error: DrizzleQueryError: Failed query: … params: <101 class ids>`
    (`../evidence/d2-quality-q02-run.log` lines 34-35).
  - Commands: `pnpm --filter @ritmofit/api exec vitest run --config vitest.integration.config.ts test/d2-quality-q01-reset-token-log.integration.test.ts`;
    `pnpm --filter @ritmofit/api exec vitest run src/lib/d2-quality-q01-drizzle-error-params.test.ts`.
- **Existing coverage and why it misses:** no test fails a D1 statement; `email.test.ts` and the
  purge comment ("Don't log the error object", `purge.ts:96`) show intent, but the generic
  handlers were never exercised with a wrapped Drizzle error.
- **Counterevidence:** the purge drain deliberately swallows detail; provider errors log
  sanitized messages only (`packages/music/src/*` ProviderError strings checked). Local proof
  only; production D1 error rates unknown. Session tokens alone are not replayable without
  `BETTER_AUTH_SECRET` (signed cookie).
- **Remediation direction:** one log sanitizer: for `DrizzleQueryError` log `name` + `cause.message`
  (never `.message`/`.params`); use it in `app.onError`, `describeOAuthConnectFailure`, and a
  Better Auth `logger`/`onAPIError.onError`. Defense in depth: `verification.storeIdentifier:
  'hashed'` so a logged identifier is not a usable token.
- **Fix check:** the Q-01 integration repro flips to `tokenInLog=false` and still returns 500.
- **Known status:** new. Related prior hand-off (lane A): `lib/email.ts:60` logs reset links in the
  no-`RESEND_API_KEY` fallback — still present, separate trigger.
- **Owner-gated:** yes (`apps/api/src/index.ts`, `lib/auth.ts`, `routes/provider*`).
- **Real browser/device:** no.

### Q-02 — Unpaginated class list 500s above 100 visible classes

- **Category:** data scaling (D1 100-bound-parameter limit). **Severity:** P3. Rationale: the web
  client always sends `?limit=` (`apps/web/src/lib/api.ts:149-161`), so today's product is
  unaffected; the unpaginated path is the documented "legacy full-array response used by the
  current iOS cache" (`apps/api/src/routes/classes.ts:127-146`) and any API client.
- **Confidence:** high. **Status:** confirmed.
- **Refs:** `routes/classes.ts:136-141` (no limit unless `limit`/`cursor` present);
  `lib/authz.ts:210` (`limitClause` empty when `limit == null`), `273-291`
  (`inArray(classTracks.classId, classIds)` over the whole unbounded page).
- **Trigger:** `GET /api/v1/classes` (optionally `?tag=`) with ≥101 owned ∪ shared ∪ team classes.
  Classes need no tracks.
- **Expected:** 200 with the full array. **Observed:** n=100 → 200; n=101 → **500**
  (`D1_ERROR: too many SQL variables`); `?limit=50` → 200 at both sizes.
- **Evidence:** `../repro/d2-quality-q02-class-list-unpaginated.integration.test.ts`, run via the
  integration config; `../evidence/d2-quality-q02-run.log` (`Q-02 n=101 unpaginated=500 paginated=200`).
- **Existing coverage:** `class-list.integration.test.ts` uses small libraries; prior D-1 sweep
  covered purge, run payload, copy and move rename, not this site.
- **Remediation direction:** aggregate with a join/subquery keyed on the same visibility CTE, or
  chunk `classIds` (≤90). Or retire the unpaginated mode and cap it server-side.
- **Fix check:** the repro at n=150 returns 200 with 150 items.
- **Known status:** extends D-1 (new call site, same root cause; include it in any shared
  `chunkedInArray` fix).
- **Owner-gated:** yes (`lib/authz.ts`). **Browser:** no.

### Q-03 — Response-side ZodError: misleading 422 and no log line

- **Category:** observability / error mapping. **Severity:** P3. **Confidence:** high for the
  mechanism. **Status:** confirmed mechanism; no production trigger found (write and read schemas
  were compared for tracks, cues, moves, classes, users and are consistent; DB CHECKs back the
  placed-move refine).
- **Refs:** every response is re-validated with the shared schema (`apps/api/src/lib/serialize.ts:71-209`,
  `lib/run-payload.ts:279`, `routes/provider-connections.ts:154`). `apps/api/src/index.ts:106-117`
  maps **any** `ZodError` to 422 `VALIDATION_ERROR` "Request body failed validation." and does not log.
- **Trigger:** any stored row (legacy data, a tightened schema, a migration slip) that the read
  schema rejects.
- **Observed:** a planted track with `artist = ''` → `GET /tracks/:id` → 422 "Request body failed
  validation." on a GET with no body; `console.error`/`warn` never called.
  `../repro/d2-quality-q03-response-zod-422.integration.test.ts`, `../evidence/d2-quality-q03-run.log`.
- **Impact:** a server data bug looks like a client bug, the web shows a validation message, and
  Workers Logs has nothing to find it by. Run payload is the sharpest case: one bad row blocks
  Live for that class with no trace.
- **Remediation direction:** distinguish request parsing (keep 422) from response serialization
  (500 + a sanitized log naming the schema path), e.g. a `ResponseShapeError` thrown by the
  serializers, or log every 422 whose method is GET.
- **Known status:** new. **Owner-gated:** yes (`apps/api/src/index.ts`). **Browser:** no.

---

## 3. Known-item status updates (not new findings)

| ID | Update at 4c344e2 |
| --- | --- |
| D-5 | Still true: entry `index-CClNobxY.js` 609.62 kB raw / **174.08 kB gzip** (was 172.40), headroom **5.92 kB**; `$ZodType` still in the entry. Build tail: `../evidence/d2-quality-web-build-tail.log`. |
| D-6 | Recount **59 errors in 10 test files** (was 61); `apps/api/scripts/` and `*.config.ts` compile clean (`../evidence/d2-quality-d6-recount.txt`). |
| D-7 | Unchanged. It is still the only render crash in a green 1502-test web run. 11 of 13 files that cast `as unknown as RunPayload` omit `sections`; only D-7's path reads it. |
| D-9 | Measured with `eslint-plugin-react-hooks@5.2.0` (scratch install): **0** `rules-of-hooks` errors, **12** `exhaustive-deps` warnings (ChoreographyEditor 189, ClassPlanBlocks 1120, ClassesHome 227, Dashboard 1927/2742, Dialog 83, LiveMode 559/625/628/895, TrackPreview 156, TrackSearch 306). Each was read; all are commented mount-only or identity-keyed effects. Adding the rule costs ~12 annotations and finds no current bug. |
| D-10 | **Fixed** by #643: `.github/workflows/ci.yml` installs Chromium and runs `pnpm --filter @ritmofit/e2e e2e`; AGENTS gate lists it. Config is sound (`retries: 0`, `forbidOnly`, `reuseExistingServer: false`, fresh D1). |
| D-11 | Still open, and wider: `pnpm list --prod -r` has **no vite/vitest**, so the three vite ignores (GHSA-4w7w, -fx2h, -v6wh) can never match `pnpm audit --prod`; with withdrawn GHSA-gv7w that is **4 of 6 ignores dead**. Only GHSA-67mh (esbuild 0.18.20 via drizzle-kit → @esbuild-kit) and GHSA-g7r4 (esbuild 0.28.0 via tsx) are live, both through better-auth's `drizzle-kit` peer. ci.yml "Dependency audit" comment still says "four … in the audit:ci script … REVIEW.md". A dead ignore silently suppresses a future hit if vite enters the prod graph (e.g. a new better-auth peer). |
| D-12 | Unchanged: `dist/index.html` has no `modulepreload`; CSS (12.07 kB gzip) not counted. gzip level 9 vs 6 differs by 0.45 kB, so the level is not a false-green. |

## 4. Rejected leads

| Lead | Why rejected |
| --- | --- |
| Tests outside every vitest include | None. API unit `src/**/*.test.ts`, integration `{src,test}/**/*.integration.test.ts`, web `src/**/*.test.{ts,tsx}`, music `vitest run`, root `node --test` for `scripts/*.test.mjs`, Playwright `*.spec.ts`. |
| `pnpm test --if-present` hides a package | `packages/shared` has 0 tests; `e2e` has its own runner (R-8 holds). |
| Vacuous / skipped tests | AST scan found none (helper-delegated asserts only). |
| Floating promises in Worker/web code | Type-aware `no-floating-promises` + `no-misused-promises` over all `src`: 0. Code uses `void` consistently. |
| Phantom / unused dependencies | Import scan of all packages: none undeclared; "unused" entries are peers/types/CLIs (`workbox-window`, `@testing-library/dom`, `autoprefixer` via postcss string key). `apps/web/smoke` resolves `playwright` via `PLAYWRIGHT_BASE` by design. |
| ESLint skips tsx / e2e / mjs | Probe files in each were flagged. |
| Bundle checker false-green via gzip level or static imports | Entry has no static chunk imports; level difference 0.45 kB. |
| Bundle checker main-guard (`process.argv[1] === fileURLToPath(...)`, `check-bundle-budget.mjs:140`) skips under a symlinked path | Reproduced only for an **absolute symlinked** invocation (`exit 0`, nothing checked); `pnpm build`/CI invoke it relatively, which resolves through the real cwd and works (exit 1 on an over-budget fixture). Hygiene only: the repo's other gate scripts use `realpathSync` for exactly this. |
| Playlist import exceeds D1 queries-per-invocation | ~3-5 queries × ≤100 tracks; account is Workers Paid (HISTORY.md:1913), limit 1000. |
| Copy/run-payload O(T×C) in-memory filters | Bounded by class size; negligible. |
| Purge drain "one failure aborts the rest" | Each item is in its own try; only a second failure inside the catch (`bumpAttempts`/`markFailed`) escapes and ends that sweep early. Needs a double D1 failure; the queue is durable. |
| Scheduled handler | Purge and rate-limit prune are separate `waitUntil`s with `.catch`. Untested, but correct by reading. |
| Health secret list drift | `REQUIRED_SECRET_NAMES` matches `scripts/required-secrets.txt`. Public presence booleans are a lane-A/RF-23 question, handed off. |
| `deploy-script-node.d.ts` ambient `node:child_process` in the Worker program | Would let Worker code typecheck a `child_process` import that fails at runtime; contrived, no such import exists. |
| Integration config duplicates wrangler compat date/flags | Equal today (`2024-11-06`, `nodejs_compat`); drift risk only. |
| Provider tests under suite-wide `MOCK_PROVIDERS=true` | Provider suites override with `prodEnv`; caveats are documented in each file. |

## 5. Gaps (not assessed)

- No production measurements; D1 failure rates and Workers Logs retention/readers not checked.
- Better Auth session-token logging on a failed `getSession` was traced, not run.
- Web render cost of the builder not profiled (unchanged from prior gap).
- OpenAPI/route parity and contract-parity were not re-diffed (no route changes since 4e0b150).
- CI governance scripts (`owner-gate.mjs`, `rf-trace.mjs`, `tasks.mjs`) only read; their open
  issues are tracked in RF-100…RF-105.
- `scripts/deploy.sh --self-check` not run (it runs inside the API unit suite via
  `deploy-script.test.ts`; not executed separately here).
