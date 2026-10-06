---
prompt: technical/design-system
repo: ritmofit-web
agent: claude-opus
date: 2026-06-26
inspected_head: 1130438acb1692b8ffed5c258466ccd4636e78ad
inspected_range: full-repo
completed: true
prs:
  - https://github.com/steven-crosby/ritmofit-web/pull/118
---

# technical/design-system — 2026-06-26

## Summary

Audited `apps/web/src` for drift from the canonical `ritmofit_design_system`
(tokens, typography, color, component states, radii/shadows). The web surface is
strongly aligned with the design system. One actionable drift was found and fixed:
the builder timeline painted its beat/bar gridlines with raw `rgba(255,255,255,…)`,
which vanish under the opt-in `[data-theme="light"]` theme — fixed in PR #118 by
routing them through the theme-aware `border.*` tokens. The remaining candidate (the
modal backdrop `bg-black/60`) would require minting a new scrim token, a design
decision left to the owner. Nothing else needs attention today.

## Commands run + results

Verification gate for the PR #118 code change:

- `pnpm format:check` → pass (after formatting this report)
- `pnpm -r typecheck` → pass (all workspaces)
- `pnpm lint` → pass
- `pnpm test` → pass (web 180, api 234)
- `pnpm --filter @ritmofit/web build` → pass
- Visual: rendered the gradient recipe against the real generated `tokens.css` for
  dark + light, before vs after — white grid vanishes on light theme; token grid
  stays legible. Live authenticated builder not stood up within the timebox.

Inspection searches:

- `grep` for hardcoded hex/rgb/hsl in `apps/web/src` → only `lib/cue-colors.ts`
  (intentional, guarded by `cue-colors.test.ts` against `tokens.json`), plus two
  `rgba(255,255,255,…)` gridline overlays and one `bg-black/60` backdrop.
- `grep` for green/emerald/lime success usage → none; success uses `state-positive`
  (cyan by design, confirmed at `tokens.json` `"Success is cyan, not green, by design"`).
- `grep` for raw `font-family` / `font-sans|mono|serif` → none; all type goes through
  `font-ui|display|data` mapped to `--rf-typography-family-*`.
- `grep` for hardcoded `border-radius` / `box-shadow` → none; all use
  `rounded-{sheet,panel,card,input,control,pill}` and `shadow-{card,lifted,…}`.
- `grep` for numerals (BPM/RPM/timecodes/counts) rendering → consistently `font-data`
  (Azeret Mono); spot-checked LiveMode, Dashboard, ChoreographyEditor, TimelineStrip.
- `grep` for `onClick` on `div/span/li` → none; all interactions are real `<button>`s,
  and focus rings use `focus-visible:ring-interactive`.

## Findings

- **[P3] Modal backdrop uses `bg-black/60` rather than a token** —
  `apps/web/src/components/Dialog.tsx:121`
  - Evidence: `className="fixed inset-0 z-50 … bg-black/60 p-4"`. Every other fill in
    the app derives from `var(--rf-color-*)`. `tokens.json` has no full-screen scrim/
    backdrop token (`semantic.bg.overlay` is the elevated-glass fill `ink.700`, not a
    modal scrim).
  - User impact: none functional; a 60% black scrim is conventional and renders
    correctly in the dark theme. Cosmetic consistency only; could read differently if a
    light-theme modal is ever shipped.
  - Recommended owner: design — decide whether to add a `semantic.bg.scrim` token
    (dark + light) and route the backdrop through it. Minting a token is a design
    decision, so not actioned here.
  - Recheck next run? no (until a scrim token exists).

- **[P2 — FIXED in PR #118] Beat/bar gridlines used hardcoded `rgba(255,255,255,…)`** —
  `apps/web/src/components/TimelineStrip.tsx:140-141`
  - Evidence: `repeating-linear-gradient(to right, rgba(255,255,255,0.16) …)` and the
    `0.06` beat variant — pure white, the only non-tokenized color in the timeline.
  - User impact: latent legibility bug — under the opt-in `[data-theme="light"]` theme
    the white lines render on a cream surface and effectively vanish (verified by
    before/after render).
  - Fix: routed through `--rf-color-semantic-border-{strong,subtle}`, which flip to ink
    under the light theme. Dark theme unchanged.
  - Recommended owner: web (done). Recheck next run? no.

No typography, font-family, semantic-color, success-color, radii, shadow, or
component-state (hover/focus/disabled/empty/loading) drift was found. The codebase is
disciplined and densely annotated with design-system references.

## Blockers

None. The gridline drift was fixed in PR #118. The remaining `Dialog.tsx` backdrop
candidate resolves to a design decision (whether to mint a scrim token), so it is left
report-only — no token invented.

## Next recommended action

Optional, owner-gated: decide whether to add a `semantic.bg.scrim` token (dark + light)
to `ritmofit_design_system/tokens.json` and route `Dialog.tsx` through it. If approved,
that becomes a clean one-token + one-line PR with before/after screenshots. Absent that
decision, no further design-system action is needed for the web surface this cycle.
