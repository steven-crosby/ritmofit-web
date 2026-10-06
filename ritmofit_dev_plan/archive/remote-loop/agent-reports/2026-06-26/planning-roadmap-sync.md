---
prompt: planning/roadmap-sync
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-26
inspected_head: 1130438acb1692b8ffed5c258466ccd4636e78ad
inspected_range: full-repo
completed: true
prs: []
---

# planning/roadmap-sync — 2026-06-26

## Summary

Weekly prioritization for `ritmofit-web`. **Headline: nothing in the backend is blocking iOS** — the
run-payload contract is _ahead_ of the iOS client and fully forward-compatible (Swift `Decodable` with
explicit `CodingKeys` ignores unknown keys), so the week is not about unblocking iOS. The single most
valuable web move was closing the one debt that was silently growing: the web↔iOS **contract-drift seam**
flagged in `web-ios-parity.md`. This run both produced the brief **and** implemented its top recommendation
— a CI gate that compares the vendored iOS run-payload DTOs against the OpenAPI contract — landing it on
`claude/roadmap-sync-execution-va2fkv`. The gate immediately surfaced and tracked the 7 additive fields the
iOS DTO snapshot currently lags.

## Commands run + results

- `mcp__github__list_pull_requests` (open) → **[]** — no open `auto-maintenance` PR pile.
- Diffed `packages/shared/src/entities/run-payload.ts` + generated `openapi.json` vs
  `ios-snapshot/Core/Models/RunPayload.swift` → iOS DTO lags 7 additive fields (see Findings).
- `pnpm --filter @ritmofit/api contract-parity` → **exit 0**, 7 tracked/allowlisted, "No untracked drift."
- `pnpm --filter @ritmofit/api test` → **246 passed** (28 files; +12 new `contract-parity` unit tests).
- `pnpm -r typecheck` → **green** (4 packages).
- `pnpm lint` → **green**.
- `pnpm format:check` → **All matched files use Prettier code style.**
- Not run this pass (no route/schema change): `test:integration`, `pnpm --filter @ritmofit/web build`,
  `openapi` drift, `audit:ci` — all unchanged by an api-lib + script + CI + docs change.

## Findings

- **[P2] iOS run-payload DTO lags 7 additive contract fields** — `ios-snapshot/Core/Models/RunPayload.swift`
  - Evidence: OpenAPI `RunPayload` serves them; the Swift DTOs don't decode them:
    `RunClass.timelineMode`; `RunTrack.displayRpm` / `holdCount` (M6/D14, PR #110) / `clipStartMs` /
    `beatAnchorMs`; `Move.beat` / `Move.bar`.
  - User impact: none today (forward-compatible — no live-screen blackout); **capability lag** — iOS Live
    can't surface cadence/holds, the beat-grid origin, or move beat/bar.
  - Recommended owner: **iOS** (`ritmofit-ios` DTO follow-ups). Now tracked in the allowlist + parity doc.
  - Recheck next run? yes (the new CI gate does this automatically).
- **[P3] Design-token drift for the iOS-vendored `tokens.json` is still ungated** —
  `ritmofit_dev_plan/web-ios-parity.md`
  - Evidence: iOS vendors its own `tokens.json` / `RFTokens.swift`; nothing fails when they drift from web
    canon. The new contract gate covers DTOs only (iOS `tokens.json` isn't vendored into this repo).
  - Recommended owner: web/design — close by vendoring the iOS tokens or a cross-repo check.
  - Recheck next run? no (separate, lower-priority seam).

## Changes landed this run (branch `claude/roadmap-sync-execution-va2fkv`)

- `apps/api/src/lib/contract-parity.ts` — pure drift logic + `CONTRACT_PARITY_ALLOWLIST` (the 7 tracked lags).
- `apps/api/scripts/check-contract-parity.ts` — CLI gate (OpenAPI ↔ vendored Swift DTO), exit 1 on new
  drift or a stale allowlist entry.
- `apps/api/src/lib/contract-parity.test.ts` — 12 unit tests (Swift parse, OpenAPI extract, compare/allowlist).
- `apps/api/package.json` — `contract-parity` script; `.github/workflows/ci.yml` — new gate step after OpenAPI.
- `ritmofit_dev_plan/web-ios-parity.md` — "known seam gaps" updated: DTO drift now gated; 7 lags listed.

## Blockers

None. The 7-field lag is iOS-repo work (capability follow-up), not a web defect — deliberately left as a
tracked allowlist + parity-doc entry rather than reshaping the wire contract unattended (house rule).

## Next recommended action

File the 7 allowlisted fields as linked iOS parity items in `ritmofit-ios` (esp. M6 `displayRpm`/`holdCount`)
and refresh `ios-snapshot/` so the gate compares against current iOS. After that, the only remaining
"iOS has, web needs" item is web live-run parity polish — audit the existing `LiveMode` for HUD/rhythm-
signature gaps rather than net-new build. Defer all four flagged-in-code items and featured curation.
