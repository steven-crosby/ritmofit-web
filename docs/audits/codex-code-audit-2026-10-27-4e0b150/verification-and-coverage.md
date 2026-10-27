# Verification and coverage — ritmofit-web @ 4e0b150

Audited tree: `4e0b15096995c125b3941bf374a6a580e2ff52f8` on `main`. Reviewers wrote
only under this directory. Repros ran in disposable worktrees (`/tmp/wt-a`,
`/tmp/wt-b`, `/tmp/wt-c`, `/tmp/wt-d`, `/tmp/wt-x`). Local D1 only.

Depth: **traced** means the code path was read end to end. **Tested** means a
focused repro or an existing test was executed for that behavior. **Sampled**
means selected files were read. **Not assessed** means it was left out.

## Workflows and subsystems

| Area | Depth | Reviewer | Evidence | Gap |
| --- | --- | --- | --- | --- |
| Session, password reset, OAuth callback binding | Tested | A, challenge, C follow-up | `repro/a-repro.integration.test.ts`, `evidence/x-a-repro-rerun.log`, `evidence/c-soundcloud-oauth-callback.log` (8 existing callback tests) | Production cookie flags were not probed against the deployed host. |
| Class-scoped authorization | Traced and sampled with tests | A | Lane A rejected a missing-authz candidate after tracing handlers | Not every nested route was given its own new test. The traced set was gated. |
| Dormant share and team API | Tested at the API | A, challenge | Share returns 201, victim list shows the class, victim DELETE returns 403 | SPA dialogs are not mounted. Browser was not used. |
| Migrations and foreign keys | Tested locally | A, challenge | `evidence/x-a7-wrangler-cli-replay.log` | Remote D1 was not touched. Historical loss was not queried. |
| Unbounded `inArray` (purge, run payload, copy, move rename) | Tested locally | A, D | `evidence/d-purge-scale.log`, `evidence/d-class-size.log`, `evidence/d-move-rename-scale.log` | Cutoff between 96 and 98 tracks was not bisected. Remote D1 not used. |
| OpenAPI registry versus mounted routes | Sampled | A, D | `evidence/d-openapi-route-diff.txt` | Not a schema-by-schema DTO comparison. Contract parity was run and was green, with 4 allowlisted iOS lags. |
| Builder inspector, cues, moves, sections | Tested in jsdom | B, challenge | `repro/b-*.tsx`, `evidence/x-bc-repro-rerun.log` | No real browser. Moves for B-2 were code-compared, not executed. |
| Draft loss, 401 sign-out, tag-filter race | Tested in jsdom, 401 also from existing `App.test.tsx` | B | `repro/b-draft-loss.repro.test.tsx`, `repro/b-tag-filter-race.repro.test.tsx` | Refresh and tab-close were read, not clicked. |
| Live clock, countdowns, End Class | Traced | B | Lane B | No audible playback. No background-tab measurement of the free-mode silence gap (B-9, probable, code only). |
| PWA service worker | Traced | B | `evidence/b-pwa-sw.log` | Generated worker excludes `/api/` from the navigation fallback and precaches the JS/CSS chunks. Not installed in a browser here. |
| Spotify token gate, relink, device cache | Tested with a fake SDK | C, challenge | `repro/c-web-playback-repro.test.ts`, `evidence/x-bc-repro-rerun.log` | No real Spotify SDK and no audible playback. |
| Token-refresh error mapping | Tested | C, challenge | `repro/c-api-token-refresh-repro.test.ts` | Includes a real `invalid_grant` fixture as a control. No live Spotify call. |
| Same-song resolve and duration split | Tested | C follow-up | `evidence/c-followup-repro-run.log` | Injected search results. Not independently challenged. No live catalog. |
| Ordered import retry and partial failure | Tested with fakes | C follow-up | same log | The D1 commit function was traced for C-24, not executed. Not independently challenged. |
| SoundCloud OAuth | Tested via existing callback suite | C follow-up | `evidence/c-soundcloud-oauth-callback.log` | No new defect. Connect was not clicked against SoundCloud. |
| CI gate, typecheck scope, bundle | Tested once | D | `verification-gate.md` | Single run, no flake rate. Deploy script was read and not run. |
| Request fan-out on the class shelf | Tested, mocked API | D | `evidence/d-runpayload-fanout.log` | Counts only. No browser performance trace. |
| Query plans | Sampled | D | `evidence/d-query-plans.txt` | The hot queries that were explained use an index. Not every query was explained. |

## Baseline gate

Run once in `/tmp/wt-d` on 2026-10-27, about 8:16–8:20 AM America/Denver. Full table: `verification-gate.md`.

| Check | Exit | Result |
| --- | --- | --- |
| `pnpm format:check` | 0 | clean |
| `pnpm -r typecheck` | 0 | 5 projects |
| `pnpm lint` | 0 | 0 problems |
| design-system `npm run verify` | 0 | tokens, lint, contrast |
| `theme-classes` and its selftest | 0 | no dead utilities |
| `pnpm test` | 0 | 145 files, 2,078 tests, 0 skipped |
| `pnpm --filter @ritmofit/api test:integration` | 0 | 42 files, 237 tests |
| web build and bundle budget | 0 | entry 172.40 kB gzip, budget 180 kB |
| `openapi` and `git diff` | 0 | 61 paths, no diff |
| `contract-parity` | 0 | 4 allowlisted iOS lags, no new drift |
| `pnpm audit:ci` | 0 | 1 low and 1 moderate, both ignored |

No gate failure to classify. Playwright smoke, not part of the gate, passed 2/2 on the installed Chrome (`evidence/d-e2e-smoke.log`). It covers a signed-in loop with mock providers and a no-music Live run.

The green gate does not cover the accepted P1s. See D-6, D-7, and D-8 in `findings.md`.

## Focused reproductions

| Finding | Command shape | Result |
| --- | --- | --- |
| A-2, A-5, A-8 and the API security set | `repro/a-repro.integration.test.ts` in a worktree, integration config | Pass (the tests assert the defect). Challenge re-ran them. |
| A-7 | `repro/x-a7-wrangler-cli-replay.sh` against local wrangler D1 | 0005, 0010, 0014, 0016, 0018 delete children. 0021 does not. |
| B-1, B-2, B-3, B-4, B-6 | `repro/b-repro-tests.patch` then the named vitest files | B-1, B-2, B-3 fail at HEAD because they assert the correct save. B-4 passes because it asserts the loss. Challenge re-ran the builder set. |
| C-1, C-2, C-3, C-4, C-9 | `repro/c-provider-repro.patch` | Green. Challenge re-ran. |
| C-21–C-26 | `repro/c-followup-repro.patch` | 13 + 4 + 2 passed. Not re-run by the challenge reviewer. |
| D-1, D-2, D-3, D-4 | `repro/d-*.ts` and `repro/d-runpayload-fanout.test.tsx` | Logs under `evidence/d-*`. Not repeated by the challenge reviewer. |

## Environment and integration limits

- Local SQLite via Miniflare and wrangler local D1. Not remote Cloudflare D1. The 100-parameter limit and the foreign-key behavior match Cloudflare's current docs (accessed 2026-10-27).
- Provider SDKs were fakes. Audible playback was not verified. Browser state was not verified for the Builder bugs. The challenge pass did not open a browser.
- C-21 through C-26, and the P3s absent from `challenge.md`, did not get an independent reviewer.
- `schema.md` was not reconciled column by column against Drizzle.
- Production, secrets, and provider accounts were not used.
