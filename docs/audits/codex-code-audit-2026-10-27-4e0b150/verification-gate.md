# Baseline verification gate — 4e0b150

Owner: reviewer D (designated verifier). Run once, 2026-10-27 ~14:16–14:20 UTC.

## Environment

| Field | Value |
| --- | --- |
| Audited SHA | `4e0b15096995c125b3941bf374a6a580e2ff52f8` |
| Execution tree | disposable worktree `/tmp/wt-d` (`git worktree add /tmp/wt-d HEAD`, detached) |
| Why a worktree | `pnpm --filter @ritmofit/api openapi` writes tracked `apps/api/openapi/openapi.json`; isolating the whole gate also keeps heavy runs off `/workspace`, where reviewers A–C run targeted tests |
| Install | `pnpm install --frozen-lockfile --offline` → exit 0, 660 packages from store, 10.3 s. No network fallback needed |
| Node / pnpm | v22.23.4 / 11.4.0 (`.nvmrc` = `22`; engines `>=22.13` / `>=11.4.0`) |
| Background setup | `/tmp/cursor/async-install/` absent → no async install to wait on |
| Script runner | `repro/d-gate.sh` (sequential; per-step log + wall time). Summary TSV: `evidence/d-gate-summary.tsv` |
| Pre-run script review | Every gate script was read before running. Externally effectful commands found only in `scripts/deploy.sh` (wrangler remote/deploy, curl to production) and `apps/api` `deploy`/`db:*` scripts — none are part of the gate and none were run. `pnpm audit:ci` performs a read-only registry query (network). `generate-tokens.mjs` writes `apps/web/src/styles/tokens.css`, which is gitignored |

## Results

| # | Command | Exit | Wall (s) | Key output | Log |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm format:check` | 0 | 5.3 | "All matched files use Prettier code style!" | `evidence/d-01-format-check.log` |
| 2 | `pnpm -r typecheck` | 0 | 12.9 | 5 projects (shared, music, web, api, e2e) `tsc --noEmit` Done | `evidence/d-02-typecheck.log` |
| 3 | `pnpm lint` | 0 | 6.2 | `eslint .` — no output (0 problems) | `evidence/d-03-lint.log` |
| 4 | `(cd ritmofit_design_system && npm run verify)` | 0 | 0.6 | tokens `--check` web + iOS, token lint, contrast: "semantic pairs clear AA; Live pairs clear AAA" | `evidence/d-04-ds-verify.log` |
| 5 | `pnpm --filter @ritmofit/web theme-classes --selftest` | 0 | 0.7 | "opacity self-test passed on 5 cases" | `evidence/d-05-theme-classes-selftest.log` |
| 6 | `pnpm --filter @ritmofit/web theme-classes` | 0 | 0.6 | "no dead colour utilities (36 valid names)"; "8 declarations" | `evidence/d-06-theme-classes.log` |
| 7 | `pnpm test` | 0 | 44.6 | Scope 5 of 6 projects. web 97 files / 1479 tests; api 45 / 569; music 3 / 30. Total **145 files / 2078 tests, 0 skipped**. 4 tests emit stderr (see D-7) | `evidence/d-07-test.log` |
| 8 | `pnpm --filter @ritmofit/api test:integration` | 0 | 53.3 | **42 files / 237 tests** passed (Workers pool + Miniflare D1, migrations applied) | `evidence/d-08-test-integration.log` (test reset-link tokens redacted) |
| 9 | `pnpm --filter @ritmofit/web build` | 0 | 12.4 | tokens → `tsc --noEmit` → `vite build` → budget selftest (5 ok) → budget: `index-B1FRgRjm.js` 605.21 kB raw / **172.40 kB gzip, within 180.00 kB** (7.60 kB headroom). Vite ">500 kB chunk" warning still prints | `evidence/d-09-web-build.log` |
| 10 | `pnpm --filter @ritmofit/web bundle-budget --selftest` | 0 | 0.4 | "bundle-budget selftest: 5 cases ok." | `evidence/d-10-bundle-budget-selftest.log` |
| 11 | `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code apps/api/openapi/openapi.json` | 0 | 0.9 | "61 schemas, 61 paths"; **no diff** | `evidence/d-11-openapi.log` |
| 12 | `pnpm --filter @ritmofit/api contract-parity` | 0 | 0.5 | "No untracked contract drift"; 4 allowlisted lags (`Cue.durationMs/bpm/intensity/position` missing on iOS) | `evidence/d-12-contract-parity.log` |
| 13 | `pnpm audit:ci` (`pnpm audit --prod`) | 0 | 0.8 | "2 vulnerabilities found — 1 low (1 ignored), 1 moderate (1 ignored)"; 0 high / 0 critical unignored. Network-dependent (registry query succeeded) | `evidence/d-13-audit-ci.log` |
| 14 | `git status --porcelain` in worktree after gate | 0 | 0.0 | empty — no generator modified a tracked file | `evidence/d-14-worktree-status.log` |

**Gate verdict: GREEN — 13/13 gate steps plus both selftests exit 0. No failures to classify.**

Post-gate `git -C /workspace status --porcelain` → `?? docs/audits/codex-code-audit-2026-10-27-4e0b150/` only.

## Not run (and why)

| Check | Classification | Reason |
| --- | --- | --- |
| `pnpm e2e` (Playwright smoke, `e2e/smoke.spec.ts`) | not part of gate | Not in the AGENTS.md or CI gate. Ran separately via `playwright test` with `E2E_CHANNEL=chrome E2E_PORT=8799` (SPA already built): 2/2 pass, `evidence/d-e2e-smoke.log` (D-10) |
| `scripts/deploy.sh --self-check` | not assessed (inspect-only by mandate) | `--self-check` is local-only per code reading, but the mandate says inspect deploy scripts, never run them. PR #596 covers it |
| Remote / production smoke, `wrangler` remote commands | out of scope | Production and remote D1 forbidden |

## Caveats

- Single run; no flake rate measured. Integration suite timing (51.8 s, 12.5 s of setup) is the long pole.
- `pnpm audit` results depend on the registry's advisory DB at run time (2026-10-27 ~14:20 UTC).
- Green gate does not imply the gates are strong; see `lanes/tooling-performance.md` for false-green risks (D-6 test typecheck gap, D-7 swallowed render crash, D-8 OpenAPI blind spot, D-12 budget blind spots).
