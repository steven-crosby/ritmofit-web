---
prompt: daily/changed-code-sentinel
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-26
inspected_head: 1130438acb1692b8ffed5c258466ccd4636e78ad
inspected_range: 79f9a55..1130438
completed: true
prs:
  - https://github.com/steven-crosby/ritmofit-web/pull/116
---

# daily/changed-code-sentinel — 2026-06-26

## Summary

No prior sentinel report existed, so I inspected the default 24-hour window
(`79f9a55..1130438`) on `main`. The substantive code in range is the per-track RPM
(cadence) & hold count feature (#110, M6/D14) plus the M1 spin-zone intensity
segmented control (#106) and the P1/P2 retry-on-failed-load fix (#104). The RPM/holds
slice is solid — additive contract, correct migration, DB CHECK constraints, full
add/patch/run-payload round-trip integration tests, and web surfacing in Dashboard +
LiveMode. The full CI-equivalent gate was green on baseline. One real accessibility
regression on newly-changed UI: the intensity segmented control's `sr-only` radios
left the visible label with **no keyboard focus ring**, violating the design system's
"visible cyan focus ring at all times" rule. Fixed in draft PR #116 (CSS-only, low
risk, with a regression test). Nothing else PR-worthy found.

## Commands run + results

Full required submission gate (baseline `1130438`, all green):

- `pnpm install --frozen-lockfile` → ok
- `pnpm format:check` → clean
- `pnpm -r typecheck` → pass (4 projects)
- `pnpm lint` → clean
- `pnpm test` → web + api unit suites pass (api 234)
- `pnpm --filter @ritmofit/api test:integration` → 64 pass (14 files), incl. new `rpm-holds.integration.test.ts` (3)
- `pnpm --filter @ritmofit/web build` → built
- `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code openapi.json` → no drift
- `pnpm audit:ci` → exit 0 (5 advisories, all documented/ignored)

After the PR #116 change (web-only):

- `pnpm format:check` / `pnpm -r typecheck` / `pnpm lint` → clean/pass
- `pnpm --filter @ritmofit/web test` → 181 pass (incl. new focus-ring regression test)
- `pnpm --filter @ritmofit/web build` → built; confirmed `has-[:focus-visible]` compiled to `:has(:focus-visible)` ring rules in output CSS (ring will render)

## Findings

- **[P2] Intensity segmented control has no visible keyboard focus ring** — `apps/web/src/components/IntensitySegmentedControl.tsx:36` (before fix)
  - Evidence: radios are `sr-only` (1px clipped); the visible `<label>` carried no focus style, so arrow-key navigation through zones shows nothing focused. Design system requires a visible cyan focus ring without exception (`ritmofit_design_system/05-components.md:10`, `07-accessibility.md:63`, `04-layout-and-surfaces.md:84`).
  - User impact: keyboard and screen-magnifier users authoring track intensity can't see which zone is focused.
  - Recommended owner: web
  - **Resolved this run** in draft PR #116 (`has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-interactive`, matching `SegmentBand`'s token). Recheck next run? no (verify PR merges).

- **[P3] iOS run-payload snapshot does not decode `displayRpm`/`holdCount`** — `ios-snapshot/Core/Models/RunPayload.swift:66`
  - Evidence: the vendored snapshot's `CodingKeys` omit the two new fields added to `runPayloadTrackEntrySchema`. Decoding is forward-compatible (unknown JSON keys are ignored, no crash), so this is a surface-parity gap, not a regression.
  - User impact: iOS won't surface per-track cadence/holds until the iOS app implements D14 — a known parity item, not new breakage.
  - Recommended owner: product / ios (tracked under D14 in `ritmofit_dev_plan/web-ios-parity.md`)
  - Recheck next run? no (out of this repo's scope; `ios-snapshot/` is read-only context).

- **[P3] PATCH `/class-tracks/:id` docstring stale** — `apps/api/src/routes/class-tracks.ts:203`
  - Evidence: comment still reads "intensity / bpm override / clip window / notes"; the route now also patches `displayRpm`/`holdCount` (correctly, via `buildPatch`). Cosmetic only.
  - User impact: none (doc nit).
  - Recommended owner: api
  - Recheck next run? no.

## Blockers

None. The required gate ran in full and the run finished inside the timebox.

## Next recommended action

Review and merge draft PR #116 (the keyboard-focus-ring accessibility fix). Separately,
when the iOS app picks up D14, extend `ios-snapshot` `RunPayload` to decode
`displayRpm`/`holdCount` so `api-contract-parity` reflects the full contract.
