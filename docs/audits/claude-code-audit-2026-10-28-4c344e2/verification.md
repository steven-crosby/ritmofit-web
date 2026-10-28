# Verification — ritmofit-web @ 4c344e2

## Baseline gate (CI-equivalent list from AGENTS.md › "Verification, PRs, And Commits")

The gate ran in a disposable detached worktree at `4c344e2` after `pnpm install --frozen-lockfile`
(18 s). The main checkout was not touched. Runner: `scratchpad/gate.sh`. Logs are tail-trimmed into
`evidence/gate/` with test-run verify-email tokens redacted. Ran 2026-10-28 ~05:35–05:45Z, Linux
cloud container, Node 22.22.0, pnpm 11.4.0.

| # | Command | Exit | Time | Result | Class |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm format:check` | 0 | 11s | pass | — |
| 2 | `pnpm owner-gate:test` | 0 | 1s | pass | — |
| 3 | `pnpm rf-trace:test` | 0 | 2s | pass | — |
| 4 | `pnpm tasks:test` | 0 | 1s | pass | — |
| 5 | `pnpm tasks:check` | 0 | 1s | pass | — |
| 6 | `pnpm -r typecheck` | 0 | 22s | pass | — |
| 7 | `pnpm lint` | 0 | 14s | pass | — |
| 8 | `(cd ritmofit_design_system && npm run verify)` | 0 | 0s | pass | — |
| 9 | `theme-classes --selftest` | 0 | 2s | pass | — |
| 10 | `theme-classes` | 0 | 1s | pass | — |
| 11 | `pnpm test` | 0 | 119s | web 1502, api 572, music 30 = **2,104 passed** | — |
| 12 | `api test:integration` | 0 | 101s | **42 files / 239 passed** | — |
| 13 | `web build` (+ bundle budget) | 0 | 29s | entry **174.08 kB gzip** of 180 kB; selftest 5/5 | — |
| 14 | `playwright install chromium` | 1 | 5s | CDN host blocked by proxy (403) | environment limitation |
| 15 | `pnpm --filter @ritmofit/e2e e2e` | 1 | 23s | no browser binary at the expected revision | environment limitation |
| 15b | same, with `launchOptions.executablePath` override (patch below) | 0 | 44s | **2/2 passed** (desktop-1440, phone-390) | — |
| 16 | `api openapi` + `git diff --exit-code openapi.json` | 0 | 2s | no drift | — |
| 17 | `api contract-parity` | 0 | 1s | "No untracked contract drift" | — |
| 18 | `pnpm audit:ci` | 0 | 2s | 2 advisories, both on the ignore list (1 low, 1 moderate) | — |
| 19 | `git status --short` in the gate worktree | 0 | — | clean after build/e2e/openapi | — |

15b patch (disposable worktree only, reverted afterwards; `evidence/gate/e2e-env-patch.diff`):
the container ships Chromium build 1243 at `/opt/pw-browsers/chromium`, and the locked Playwright
wants headless-shell 1248. Downloads are blocked. The override points `launchOptions.executablePath`
at the preinstalled binary. It changes the browser build, not the test.

Headroom note: the startup entry is 174.08 kB gzip, 5.9 kB under budget. It was 172.40 kB at the
prior audit (D-5), so it grew 1.7 kB in 15 commits.

Known-item status change: prior P3 **D-10** ("the Playwright smoke is not in CI or the gate") is
**resolved** at this baseline. `ci.yml` now runs `pnpm --filter @ritmofit/e2e e2e` (#643), and the
AGENTS.md gate list includes it.

## What the gate does not prove

- Local Miniflare D1 is not Cloudflare D1 (parameter limits, batch atomicity, latency).
- Mock providers are not proof of real Spotify, Apple Music or SoundCloud behavior or audible playback.
- Playwright on Chromium 1243 is not real Safari, iOS or assistive-technology acceptance.
- Production alignment: **not checked**.

## Audit reproductions

See the per-lane sections below, filled in as lanes report.
