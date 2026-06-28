---
prompt: daily/changed-code-sentinel
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-28
inspected_head: ba6d6277ab208f29c75546aa56c5d1ad1f8fd03d
inspected_range: 1130438..ba6d627
completed: true
prs: []
---

# daily/changed-code-sentinel — 2026-06-28

## Summary

Inspected `1130438..ba6d627` on `main` (checkpoint from the 2026-06-26 sentinel
report; previous head is a clean ancestor of the current head, no history
rewrite). The substantive code in range is six PRs: the post-deploy stale-shell
reload fix (#124), the prod `sendEmail` boundFetch fix (#115), the new web↔iOS
run-payload contract-parity CI gate (#117), the marketing landing page + signed-out
routing change (#120), the timeline gridline token swap (#118), and the intensity
focus-ring fix (#116). I reviewed each change and its immediate callers for
regression risk against the priorities in this prompt (user-facing breakage, data
loss, authorization, live-class reliability, cross-client contract drift). **No
PR-worthy regression found** — the changes are narrow, well-tested, and the full
CI-equivalent submission gate is green on the current head. One P3 doc-drift item:
the new CI `contract-parity` step (ci.yml:80–81, added by #117) was never added to
the documented CI-equivalent gate list in `AGENTS.md`, so a contributor running the
documented local gate before a PR would not catch DTO drift. That belongs to the
`doc-drift` specialist, not a changed-code PR.

## Commands run + results

Full required submission gate on baseline `ba6d627`, all green:

- `pnpm install --frozen-lockfile` → ok
- `pnpm format:check` → clean (Prettier)
- `pnpm -r typecheck` → pass (4 projects)
- `pnpm lint` → clean (ESLint)
- `pnpm test` → web 184 + api 248 unit tests pass (incl. new `lazyWithReload.test.ts` (3) and `contract-parity.test.ts` (13))
- `pnpm --filter @ritmofit/api test:integration` → 64 pass (14 files)
- `pnpm --filter @ritmofit/web build` → built (index JS 335.33 kB / gzip 98.48 kB)
- `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code openapi.json` → no drift
- `pnpm --filter @ritmofit/api contract-parity` → 7 allowlisted lags, "No untracked contract drift", exit 0
- `pnpm audit:ci` → exit 0 (5 advisories, all documented/ignored: 1 low, 3 moderate, 1 high)

## Findings

- **[P3] Documented CI-equivalent gate list omits the new `contract-parity` step** — `AGENTS.md:144-151` (gate block) vs `.github/workflows/ci.yml:80-81`
  - Evidence: PR #117 wired `pnpm --filter @ritmofit/api contract-parity` into CI (ci.yml:80–81) and added the npm script (`apps/api/package.json`), but the "Before submitting code, run the CI-equivalent gates" block in `AGENTS.md` (ending at `pnpm audit:ci`) was not updated to include it. CI also runs a "Design system verify" step (ci.yml:50) that is likewise absent from the documented list, but that one predates this range.
  - User impact: none directly; process gap — an agent/contributor running the documented gate locally before opening a PR would not run the iOS DTO drift check and could push drift that only fails in CI.
  - Recommended owner: doc-drift (web)
  - Recheck next run? no (tracked for the doc-drift specialist).

- **[P3 → tracked/resolved] iOS run-payload DTO lag is now CI-gated** — `apps/api/src/lib/contract-parity.ts:217`
  - Evidence: the 2026-06-26 sentinel flagged that the vendored iOS snapshot does not decode `displayRpm`/`holdCount`. PR #117 introduced a CI gate that compares the OpenAPI run-payload field set against `ios-snapshot/Core/Models/RunPayload.swift` and now formally tracks 7 forward-compatible lags (`displayRpm`, `holdCount`, `clipStartMs`, `beatAnchorMs`, `timelineMode`, `Move.beat`, `Move.bar`) in `CONTRACT_PARITY_ALLOWLIST`, with a stale-allowlist guard that fails CI once iOS catches up. I reviewed the gate logic and CLI (correct direction handling: `unknown-to-server` is never allowlisted; Swift comments stripped; `CodingKeys` authoritative over stored `let`s). The earlier P3 is therefore tracked, not an open risk.
  - User impact: none new (additive, forward-compatible; live screen still renders).
  - Recommended owner: product / ios (iOS parity follow-up, out of this repo's scope)
  - Recheck next run? no.

Reviewed and cleared (no regression):

- **#124 stale-shell reload** (`apps/web/src/lib/lazyWithReload.ts`) — `loadChunkWithReload` is injectable and unit-tested for success/reload/rethrow; the one-shot `sessionStorage` guard prevents reload loops (second failure rethrows to the existing ErrorBoundary), and the success path re-arms the guard. Strictly better than the prior straight-to-ErrorBoundary crash, including for transient import failures. All 9 Dashboard lazy boundaries swapped 1:1.
- **#115 sendEmail boundFetch** (`apps/api/src/lib/email.ts:55`) — correct prod fix (detached global `fetch` throws `Illegal invocation` in the Workers runtime); regression test pins the default network seam through `boundFetch`.
- **#120 marketing + routing** (`apps/web/src/App.tsx`) — the Better Auth session gate is preserved: Dashboard still renders only with a session; signed-out default is MarketingPage, CTA flips a local `showLogin` state to Login (no URL/router change). Reset-password and 404 paths render before the session gate, unchanged. MarketingPage ships its own skip link and all five in-page anchors (`#product`, `#method`, `#studios`, `#class-shape`, `#marketing-main`) resolve to real ids.
- **#118 timeline gridlines** (`apps/web/src/components/TimelineStrip.tsx:140`) and **#116 intensity focus ring** — token/CSS-only; dark-theme appearance unchanged. Surfaced for design-system, not regression risk.

## Blockers

None. The full required gate ran in full and the run finished inside the timebox.
No open PRs exist to dedupe against.

## Next recommended action

Hand the P3 doc gap to the `doc-drift` specialist: add the `contract-parity` step
(and, while there, the pre-existing "Design system verify" step) to the
CI-equivalent gate block in `AGENTS.md:144-151` so the documented local gate matches
what CI actually enforces. No changed-code regression PR is warranted this run.
