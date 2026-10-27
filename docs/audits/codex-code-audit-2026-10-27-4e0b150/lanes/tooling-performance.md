# Lane D — Tooling / performance (+ baseline gate)

Reviewer D, 2026-10-27. Audited SHA `4e0b150`. Gate record: `../verification-gate.md` (all green).
All execution happened in the disposable worktree `/tmp/wt-d`. Scratch tests were deleted afterwards, and that worktree's `git status` is clean again. Repro sources are kept under `../repro/d-*`.

## Coverage

| Area | Method | Depth | Result |
| --- | --- | --- | --- |
| AGENTS.md gate (13 steps + 2 selftests) | executed once | full | green — `verification-gate.md` |
| CI workflow `.github/workflows/ci.yml` vs AGENTS gate | read, diffed step lists | full | same steps; stale comments (D-11) |
| Root/package scripts, `pnpm test --if-present` false-green | read all `package.json`; test-file census | full | no package has tests without a `test` script (shared: 0 test files; e2e: separate runner) |
| Vitest include globs vs files on disk | compared configs to `find` | full | every `*.test.ts(x)` is matched by a config. Integration files are only `*.integration.test.ts` under `apps/api/test` |
| Skipped / only / todo tests | `rg` for `.skip/.only/.todo/xit` | full | none; Playwright `forbidOnly: true` |
| Tests that pass while the product path crashes | stderr review of the unit-test log | full log | 1 confirmed (D-7) |
| Typecheck scope | read tsconfigs; compiled `apps/api/test` + `scripts` with a throwaway tsconfig | full | `apps/api/test/**` never typechecked: 61 errors (D-6) |
| ESLint scope | read `eslint.config.js`, installed plugins | full | no React hooks rules (D-9) |
| OpenAPI drift gate strength | route-vs-spec diff script | full | 1 mounted route absent from the spec (D-8) |
| Contract-parity strength | read checker | full | field-name presence only (documented limitation; not a finding) |
| e2e smoke | ran `playwright test` locally (Chrome, port 8799) | 1 run | 2/2 pass; not wired into CI/gate (D-10) |
| Dependency exposure | `pnpm audit --prod`, `pnpm why`, GitHub advisory API | full for ignored set | no shipped exposure; one withdrawn GHSA still ignored (D-11) |
| Deploy script guards | inspect only (`scripts/deploy.sh`) | full read | guards fail closed; no new finding (PR #596 overlaps) |
| Bundle composition | sourcemap attribution of startup entry | full | zod and pre-auth pages in entry (D-5, D-13); budget blind spots latent (D-12) |
| Frontend request fan-out | jsdom count harness with mocked API | Classes ↔ Live | 30 run-payloads per destination visit (D-4) |
| Live Mode / Builder render hot spots | code read | Live Mode clock + memos | rejected (display tier throttled to 200 ms) |
| API query scaling — indexes | migrations applied to SQLite; `EXPLAIN QUERY PLAN` on 15 hot queries | full for listed queries | every hot predicate indexed |
| API query scaling — D1 100-param limit | integration repros in Miniflare D1 | 3 paths, size sweeps | 3 confirmed failures (D-1, D-2, D-3) |

## Candidate ledger

| ID | Title | Category | Sev | Status |
| --- | --- | --- | --- | --- |
| D-1 | Provider-disconnect purge cannot finish once a user has about 97 or more tracks from that provider | data-scaling / compliance duty | P1 | Confirmed |
| D-2 | Classes with more than 100 tracks cannot load the run payload or be copied (HTTP 500) | data-scaling | P2 | Confirmed |
| D-3 | Renaming a custom move used in 100+ classes returns 500 after the rename has already been saved | data-scaling / atomicity | P3 | Confirmed |
| D-4 | Classes home and Live each refetch a full run payload for every loaded class on every visit | performance (network/D1) | P2 | Confirmed (counts); latency inferred |
| D-5 | zod (~26 kB gzip, 15% of the startup entry) ships to the browser with no runtime use | performance (bundle) | P2 | Confirmed (composition); savings estimate approximate |
| D-6 | `apps/api/test/**` is never typechecked (61 latent errors) | tooling false-green | P3 | Confirmed |
| D-7 | A Dashboard test passes while Live Mode crashes into the ErrorBoundary | tooling false-green | P3 | Confirmed |
| D-8 | OpenAPI drift gate cannot see unregistered routes; `GET /auth/capabilities` is undocumented | tooling / contract | P3 | Confirmed |
| D-9 | No React hooks lint (`rules-of-hooks`, `exhaustive-deps`) | tooling | P3 | Confirmed |
| D-10 | e2e smoke (the only real-browser core-loop check) is not in CI or the AGENTS gate | tooling coverage | P3 | Confirmed |
| D-11 | Stale CI/audit-config commentary and a withdrawn GHSA still in `ignoreGhsas` | tooling hygiene | P3 | Confirmed |
| D-12 | Bundle budget counts only `<script src>`; `modulepreload` chunks and CSS are not counted | tooling (latent) | P3 | Hypothesis (not triggered today) |
| D-13 | Startup entry eagerly includes Dashboard (103 kB raw) and pre-auth/static pages | performance (bundle) | P3 | Probable |
| R-1…R-8 | see Rejected appendix | — | — | Rejected |

---

## D-1 — Provider purge cannot finish for ≳97 tracks from one provider

- **Category / severity / confidence / status:** data scaling + provider-compliance duty. **P1**, high confidence, **Confirmed** (local Miniflare D1).
- **Refs (verified):** `apps/api/src/lib/music/purge.ts` lines 130–137 (unbounded `affected` → `trackIds`), lines 163–176 (`inArray(trackProviderIds.trackId, trackIds)` and `inArray(tracks.id, trackIds)` inside one `db.batch`). Lines 86–105: `drainPurgeQueue` swallows the error, retries, and calls `markFailed` after `MAX_PURGE_ATTEMPTS = 5` (line 55). Cron entry: `apps/api/src/index.ts` line 202.
- **Trigger:** a user disconnects a provider after holding ≳97 library tracks with refs from that provider. One `/classes/:id/import-playlist` can import `MAX_PLAYLIST_IMPORT_TRACKS = 100` tracks (`packages/shared/src/entities/classes.ts` line 313), so a single maximum-size import is enough.
- **Expected:** the daily Cron deletes the provider refs and clears album art for every affected track.
- **Observed:** with 99, 100, 150, or 500 tracks, `purgeProviderMetadata` throws `D1_ERROR: too many SQL variables … SQLITE_ERROR`. Every ref survives (`remainingRefs = n`) because the batch is atomic. With 50 or 95 tracks it succeeds. Threshold: `clearArt` binds N + 2 parameters, and `deleteRefs` with a duty id binds N + 4. In production the duty fails five daily sweeps, then moves to the failed state, with no error detail logged (by design, line 96).
- **Impact:** provider-derived metadata (provider ids, URIs, provider-supplied album art) is kept indefinitely after disconnect for exactly the users with real libraries. The repo treats this purge as a launch blocker (`apps/api/test/launch-blockers.integration.test.ts`). It fails silently: the only signal is a `[purge] … moved to failed state` log line.
- **Evidence:** `../evidence/d-purge-scale.log` (12 cases); repro `../repro/d-purge-scale.integration.test.ts`. Platform limit: Cloudflare D1 limits, "Maximum bound parameters per query: 100", applies per statement inside `batch()` — <https://developers.cloudflare.com/d1/platform/limits/> (accessed 2026-10-27).
- **Test limits:** Miniflare/workerd local D1, not production D1. Both enforce the same documented limit; production was not touched. No Cron run was simulated beyond `purgeProviderMetadata`; the retry → failed path is from code reading.
- **Counterevidence:** existing purge tests seed 1–2 tracks, so they cannot see this. No chunking helper exists anywhere in `apps/api/src`.
- **Remediation:** delete and clear by subquery instead of an id list (`WHERE track_id IN (SELECT … WHERE owner_user_id = ? AND provider = ?)`), or chunk ids at ≤90 per statement while keeping the duty guard on each statement. Consider a shared `chunkedInArray` helper for D-2 and D-3.
- **Acceptance checks:** an integration test seeds ≥250 tracks for one provider and asserts zero refs remain and art is cleared; the stale-duty cancellation tests in `provider-disconnect.integration.test.ts` still pass.
- **Overlap:** none with #625 / #596. Touches lane C (provider) and lane A (data). Flag to the synthesis reviewer for cross-lane dedupe.

## D-2 — Run payload and class copy fail for classes with more than 100 tracks

- **Severity / confidence / status:** **P2**, high confidence, **Confirmed**.
- **Refs:** `apps/api/src/lib/run-payload.ts` lines 121–135 (`inArray` over `trackIds` and `ctIds`, unchunked); `apps/api/src/routes/classes.ts` line 178 (run-payload route) and lines 225–231 (copy route, same pattern).
- **Trigger:** a class with ≥101 class tracks. No per-class track cap was found in `routes/class-tracks.ts`, `routes/playlist-import.ts`, or `lib/ordered-class-import.ts`. Importing a 100-song playlist into a non-empty class, or adding one track after a 100-song import, reaches it.
- **Expected:** 200 with the payload; 201 on copy.
- **Observed:** n=100 → run-payload 200 (100 tracks), copy 201. n=101 and n=150 → run-payload **500**, copy **500** (`too many SQL variables`).
- **Impact:** the class cannot enter Live Mode; its readiness card on Classes and Live shows an error; it cannot be duplicated. Large "staging" classes built from playlists are the likely victims, which fits D21's "convert curiosity into a class" flow.
- **Evidence:** `../evidence/d-class-size.log`; repro `../repro/d-class-size.integration.test.ts`. D1 limit citation as in D-1.
- **Test limits:** local Miniflare D1; classes were seeded directly in D1, not through the import UI.
- **Counterevidence:** typical 45–60 minute classes hold about 10–20 tracks, so the reach is limited to large classes.
- **Remediation:** chunk the `IN` lists, use join or subquery forms keyed by `class_id`, or enforce and document a class-size cap in the shared contract with a 422 at write time.
- **Acceptance:** an integration test with a 150-track class gets 200 from run-payload with 150 entries and 201 from copy.
- **Overlap:** none with open PRs.

## D-3 — Renaming a move used in 100+ classes: 500 after a partial commit

- **Severity / confidence / status:** **P3**, high confidence, **Confirmed**.
- **Refs:** `apps/api/src/routes/moves.ts` lines 175–178 (update committed, then touch). `apps/api/src/lib/class-recency.ts` lines 25–43 (`inArray(classes.id, classIds)` + 1 parameter).
- **Observed:** n = 50, 97, 98, 99 → 200. n=150 → **500 `INTERNAL_ERROR`**, but the stored name is already "New name". Parent classes' `updated_at` is not bumped.
- **Impact:** the user sees a failure for a rename that already happened (and may retry or worry). Recency ordering stays stale for those classes.
- **Evidence:** `../evidence/d-move-rename-scale.log`; repro `../repro/d-move-rename-scale.integration.test.ts`.
- **Remediation:** a single `UPDATE classes … WHERE id IN (SELECT DISTINCT ct.class_id FROM class_track_moves … WHERE user_move_id = ?)`, batched atomically with the rename.
- **Acceptance:** 150-class rename returns 200, and all parents' `updated_at` advance.

## D-4 — Run-payload fan-out on Classes home and Live

- **Severity / confidence / status:** **P2** performance. **Confirmed** for request counts; latency and D1 cost are inferred.
- **Refs:** `apps/web/src/components/ClassesHome.tsx` line 23 (`DETAIL_CONCURRENCY = 2`), lines 176–222 (fetches `getClassShelfPayload` for every loaded class, plus `listClassPlanBlocks` + `listClassTracks` per scaffolded class). `apps/web/src/components/Dashboard.tsx` line 2669 (`candidates` = every loaded class with tracks) and lines 2703–2742 (concurrent `getRunPayload` per candidate; the comment says "N is small for a solo creator"). Server cost per payload: `apps/api/src/lib/run-payload.ts` lines 99–160 (3 waves, up to 9 D1 queries, plus session and authz).
- **Scenario / dataset / method / environment:** jsdom + React Testing Library with the existing Dashboard test harness and a mocked `lib/api`. 5- and 30-class libraries, each class 3 tracks. Sequence: render → Live → Classes → Live, counting calls after each step settled.
- **Observations:** 30 classes → Classes home **30** payloads, entering Live **+30**, back to Classes **+30**, Live again **+30**: **120 run-payload requests** against 1 `listClasses`. The 5-class library behaves the same way (20). State is component-local, so every destination switch refetches. Up to 30 requests fire concurrently on Live (no concurrency cap).
- **Impact (inferred):** roughly 30 × (≤9 + auth) ≈ 300 D1 queries per destination visit for a 30-class library, and more after "load more". Readiness cards flash loading on each return. The class list response already carries `trackCount`, `totalDurationMs`, and art.
- **Caveats:** no browser network timing or production latency was measured. jsdom with a mocked API proves call counts only.
- **Evidence:** `../evidence/d-runpayload-fanout.log`; repro `../repro/d-runpayload-fanout.test.tsx`.
- **Remediation:** lift the payload cache to Dashboard, shared by both destinations and keyed by class id + `updatedAt`. Alternatively add a lightweight batched readiness endpoint. Cap Live's concurrency like ClassesHome does.
- **Acceptance:** the same harness shows ≤ N payload fetches across repeated Classes ↔ Live switches with no class changes.

## D-5 — zod ships in the startup entry with no runtime use

- **Severity / confidence / status:** **P2** bundle. **Confirmed** composition; the saving is approximate.
- **Measured:** startup entry `index-B1FRgRjm.js` is 605.21 kB raw / **172.40 kB gzip** against the **180 kB** budget (`apps/web/scripts/check-bundle-budget.mjs` line 23), leaving **7.6 kB headroom**. Sourcemap attribution (`../repro/d-entry-composition.cjs`): `react-dom` 21.6% raw, `Dashboard.tsx` 17.1%, **zod 15.2% (91.8 kB raw; ~26.2 kB gzip measured in isolation)**, npm total 43.2%.
- **Why it is there:** web code imports zero `zod` and calls no schema `.parse`/`.safeParse` (`rg` over `apps/web/src` excluding tests). It only uses value exports such as `providerValues`, `cueIntensityValues`, `CURRENT_SCAFFOLD_RECIPES`, and `CLASS_LIST_DEFAULT_LIMIT` from `@ritmofit/shared`. The entry's sources include `packages/shared/src/entities/{identity,tracks,sharing,music,run-payload,…}.ts`, whose top-level `z.object(…)` calls are not tree-shakeable. No `better-auth` module in the entry imports zod.
- **Impact:** about 15% of the bytes a phone downloads before first paint do nothing at runtime, and the headroom left before the budget forces a split is small.
- **Caveats:** isolated-segment gzip overstates the marginal saving slightly (no shared dictionary). A rebuild is needed to measure the true delta.
- **Evidence:** `../evidence/d-entry-composition.txt`, `../evidence/d-09-web-build.log`.
- **Remediation:** split pure enums and constants from schemas, e.g. a `@ritmofit/shared/constants` entry or a `sideEffects`-safe module boundary, and import only that from web. Alternatively mark schema modules pure.
- **Acceptance:** rebuilt entry has no `zod/v4/core` sources in its map, and the budget log shows the new gzip size.

## D-6 — Integration tests and API scripts are never typechecked

- **P3, Confirmed.** `apps/api/tsconfig.json` line 9 has `"include": ["src"]`. `pnpm -r typecheck` therefore skips `apps/api/test/**` (42 integration files + helpers) and `apps/api/scripts/**`. Vitest strips types without checking.
- **Measured:** a throwaway tsconfig (extends the package config, adds `test`, `scripts`, `*.config.ts`, and pool-workers types) produced **61 errors across 10 test files**: 21 TS2571 and 21 TS18046 (`unknown` JSON), 8 TS2322, 7 TS2532, 1 TS2339 (`Headers.getSetCookie` missing from the workers-types version), and 1 TS7006. `scripts/` compiled clean. Full output: `../evidence/d-api-test-typecheck.txt`.
- **Impact:** a renamed DTO field or helper signature will not fail the gate in integration tests until runtime, and only if the test exercises that line. Today's errors are strictness noise, not proven wrong assertions.
- **Remediation:** add `tsconfig.test.json` covering `test/` + `scripts/` and run it from the package `typecheck` script; fix the 61 errors (mostly `as` casts on `res.json()`).
- **Acceptance:** `pnpm -r typecheck` fails when a test references a non-existent field.

## D-7 — Dashboard test passes while Live Mode crashes

- **P3, Confirmed.** `apps/web/src/components/Dashboard.test.tsx` lines 1310–1350. Its fixture `liveRunPayload` (lines 111–155) omits the required `sections` and is cast `as unknown as RunPayload`. Clicking "Preflight" mounts `LiveMode`, and `liveSectionAt` throws at `sections.length` (`LiveMode.tsx` line 388, called from line 817). The `ErrorBoundary` catches it, but the test only asserts that `getRunPayload` was called, so it passes. Stack trace: `../evidence/d-07-test.log` lines 25–70.
- **Wider pattern:** 51 `as unknown as` casts across 23 web test files. No global `console.error` or ErrorBoundary tripwire exists in the vitest setup (4 tests emit stderr in a green run).
- **Impact:** a green test proves only the fetch, not that Live Mode renders. A real regression in the Live entry path from the library would also pass. Production impact is nil today: the API always sends `sections`.
- **Remediation:** build fixtures with the shared schema (`runPayloadSchema.parse`) or a typed factory, assert the Live surface rendered, and fail tests on ErrorBoundary catches (spy on its `componentDidCatch` log).
- **Overlap:** #625 adds `LiveMode.test.tsx` cases but does not touch this fixture.

## D-8 — OpenAPI gate cannot see unregistered routes

- **P3, Confirmed.** The gate regenerates from the manual registry (`apps/api/scripts/generate-openapi.ts`) and diffs, so a route never registered produces no diff. Route-vs-spec diff (`../evidence/d-openapi-route-diff.txt`): 82 Hono handlers vs 81 OpenAPI operations. Missing: **`GET /api/v1/auth/capabilities`** (`apps/api/src/routes/auth.ts` line 20). Nothing is in the spec without a matching route.
- **Remediation:** add a unit test that enumerates mounted routes (e.g. `app.routes` from Hono) and asserts each one is in the generated document, with an explicit allowlist for `/api/auth/*` and mock routes.
- **Note:** AGENTS.md already warns about this ("regeneration with no diff does not prove the surface was registered"); this confirms a live instance.

## D-9 — No React hooks lint

- **P3, Confirmed.** `eslint.config.js` uses only `@eslint/js` + `typescript-eslint` recommended; `eslint-plugin-react-hooks` is not installed. `Dashboard.tsx` (6,424 lines) and `LiveMode.tsx` (2,334 lines) intentionally narrow effect dependencies (e.g. `[candidateKey]`, Dashboard line 2742), and nothing checks the unintentional cases or `rules-of-hooks`.
- **Remediation:** add `eslint-plugin-react-hooks` (`rules-of-hooks: error`, `exhaustive-deps: warn`) and annotate the deliberate omissions. This is a dependency addition, so it needs owner approval.

## D-10 — e2e smoke not gated

- **P3, Confirmed.** `e2e/smoke.spec.ts` (sign up → build class → cues → Live → End Class, overflow + axe WCAG 2.2 AA at 1440 and 390 widths) is the only real-browser core-loop check. It is absent from `.github/workflows/ci.yml` and from the AGENTS.md gate. It runs locally: **2/2 passed in 20.5 s** with `E2E_CHANNEL=chrome E2E_PORT=8799` (`../evidence/d-e2e-smoke.log`). `serve.mjs` uses a fresh D1 under `e2e/.state`, mock providers, and throwaway secrets, with no remote effects.
- **Remediation:** add a CI job (Playwright Chromium install + `pnpm e2e`) and list it in the AGENTS gate, or document why it is excluded.

## D-11 — Stale gate commentary and a withdrawn advisory in the ignore list

- **P3, Confirmed.**
  - `.github/workflows/ci.yml` line 4 points to `CLAUDE.md` (removed 2026-10-25 per AGENTS.md).
  - Lines 96–99 describe "the four esbuild/vite advisories ignored in the audit:ci script … documented in REVIEW.md". There are six ignores, they live in `pnpm-workspace.yaml` `auditConfig.ignoreGhsas`, and `REVIEW.md` does not exist.
  - `pnpm-workspace.yaml` line 49 still ignores **GHSA-gv7w-rqvm-qjhr**, which GitHub **withdrew 2026-06-17** (<https://github.com/advisories/GHSA-gv7w-rqvm-qjhr>, accessed 2026-10-27). Its comment also describes it wrongly ("dev server"; the advisory was about Deno binary integrity).
- **Exposure check (no finding):** `pnpm audit --prod` reports 1 low + 1 moderate, both ignored. They are esbuild 0.28.0 ([GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr), Windows dev-server file read) and esbuild 0.18.20 ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), dev-server CORS); both accessed 2026-10-27. `pnpm why --prod esbuild` shows they reach the prod graph only through `better-auth`'s peer resolution to `drizzle-kit` → `@esbuild-kit/*`/`tsx`. `better-auth/dist` contains no `drizzle-kit` reference, `apps/api/src` mentions it only in a comment, and the built SPA contains neither. Not exploitable in the shipped Worker or bundle.
- **Remediation:** fix the comments and drop the withdrawn GHSA (a withdrawn advisory no longer appears in audits, but a reinstated one would stay silently ignored).

## D-12 — Bundle budget blind spots (latent)

- **P3, Hypothesis.** `apps/web/scripts/check-bundle-budget.mjs` line 31 sums only `<script src>` tags. Vite emits `<link rel="modulepreload">` for statically shared chunks, and those also download at startup. CSS (`index-DGcMUSRx.css`, 11.9 kB gzip) is not counted either. Today's `dist/index.html` has no `modulepreload` links, so the budget is accurate now. A future `manualChunks` vendor split would silently move bytes out of the measurement.
- **Remediation:** also count `link[rel=modulepreload]` hrefs, and add a selftest case for it.

## D-13 — Eager entry contents beyond zod

- **P3, Probable.** Entry attribution also shows `Dashboard.tsx` at 102.9 kB raw (~26.0 kB gzip, isolated) and pre-auth or rarely visited views loaded eagerly: `Login.tsx` 9.3 kB, `ResetPassword.tsx` 5.3 kB, `MarketingPage.tsx` 6.6 kB, `PrivacyPage.tsx` 4.6 kB, `TutorialVideo.tsx` 14.1 kB raw. Signed-in instructors pay for logged-out pages and the reverse. Savings are inferred and were not rebuilt or measured.

---

## Rejected / not escalated

| ID | Candidate | Why rejected |
| --- | --- | --- |
| R-1 | Live Mode re-renders every animation frame | `use-virtual-clock.ts` line 16: `DISPLAY_THROTTLE_MS = 200`, so the display tier updates at about 5 Hz. Per-render work (`trackIndexAt`, `liveSectionAt` sort) is linear in tracks/sections. Not a hot spot |
| R-2 | Missing indexes on hot predicates | `EXPLAIN QUERY PLAN` over 22 applied migrations (`../evidence/d-query-plans.txt`): class list, tag filter, card aggregates, run-payload waves, purge join, songs-by-move, user moves, purge queue, session, and shares all `SEARCH … USING INDEX`. Temp B-tree sorts only over per-class row sets |
| R-3 | `team_memberships` scan by `team_id` | Real SCAN, but Teams is a deferred surface (AGENTS.md "Product Boundaries") |
| R-4 | Ignored esbuild advisories in the prod audit graph are exploitable | Not shipped; see D-11 exposure check |
| R-5 | Copy (class or track) loads every owned provider key (`routes/classes.ts` lines 233–240, `routes/class-tracks.ts` lines 709–718) | O(library) read per copy, but on a covering index (`track_provider_ids_owner_provider_id_unique`) with no bound-parameter fan-out. Acceptable at solo-library sizes; not measured |
| R-6 | Duplicate-key warning in `ClassWorkspace` (`LeanTrackRow key={t.id}`) | Test fixture without ids; production `ClassTrack.id` is a primary key |
| R-7 | `fetchPriority` unknown-prop warning (`ClassHeaderCard`) | React 18 dev warning. The attribute still reaches the DOM (HTML attributes are case-insensitive). Lane B if anyone cares |
| R-8 | `pnpm test --if-present` hides untested packages | `packages/shared` has 0 test files; `e2e` has its own runner. No package has tests but no script |

## Hand-offs to other lanes (not D findings)

- **Lane A:** `apps/api/src/lib/email.ts` line 60 logs the full email body, including reset and verify links, when `RESEND_API_KEY` is unset. `scripts/deploy.sh` requires that secret (`scripts/required-secrets.txt`), so production is guarded by the deploy path only. A deploy that bypasses the script would log live reset tokens to Workers logs.
- **Lane C:** D-1 is a provider-compliance duty failure. Please cross-reference with your disconnect and purge review.

## Gaps (not assessed)

- No production or remote measurements of any kind (forbidden). D1 limit behaviour is confirmed against local Miniflare plus Cloudflare's documented limit.
- No real-browser network or performance trace (Lighthouse/LCP) of the SPA. D-4 and D-5 impact on load time is inferred.
- Builder render cost (`Dashboard.tsx` `ClassWorkspace`) was not profiled.
- Gate run once; no flake rate.
- `scripts/deploy.sh --self-check` not run (inspect-only mandate).
