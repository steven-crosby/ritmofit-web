---
prompt: technical/design-system
repo: ritmofit-web
agent: claude-opus
date: 2026-06-26
inspected_head: 1130438acb1692b8ffed5c258466ccd4636e78ad
inspected_range: full-repo
completed: true
prs:
  []
---

# technical/design-system — 2026-06-26

## Summary

Audited `apps/web/src` for drift from the canonical `ritmofit_design_system`
(tokens, typography, color, component states, radii/shadows). **No PR-worthy drift
found** — the web surface is strongly aligned with the design system. The only two
candidates are either an acknowledged exception (white gridline `rgba` overlay) or
would require minting a new scrim token (the modal backdrop `bg-black/60`), which is
a design decision and out of scope for an unattended narrow change. Nothing needs the
owner today; one optional, low-priority token question is logged below.

## Commands run + results

This was a read-only inspection run; no PR was opened, so the full submission gate was
not required. Searches/inspection only:

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

- **[P3] Beat/bar gridlines use hardcoded `rgba(255,255,255,…)`** —
  `apps/web/src/components/TimelineStrip.tsx:140-141`
  - Evidence: `repeating-linear-gradient(to right, rgba(255,255,255,0.16) …)` and the
    `0.06` beat variant.
  - User impact: none; these are decorative low-opacity tick overlays, not semantic
    color. This is the kind of chrome the design system tolerates outside the token set.
  - Recommended owner: web (optional) — only worth tokenizing if a gridline token is
    added for light-theme legibility.
  - Recheck next run? no.

No typography, font-family, semantic-color, success-color, radii, shadow, or
component-state (hover/focus/disabled/empty/loading) drift was found. The codebase is
disciplined and densely annotated with design-system references.

## Blockers

None for the inspection itself. The only two candidates both resolve to a product/
design decision (whether to add a scrim/gridline token), which per the house rules is
report-only in an unattended run — I did not invent tokens or open a speculative PR.

## Next recommended action

Optional, owner-gated: decide whether to add a `semantic.bg.scrim` token (dark + light)
to `ritmofit_design_system/tokens.json` and route `Dialog.tsx` through it. If approved,
that becomes a clean one-token + one-line PR with before/after screenshots. Absent that
decision, no design-system action is needed for the web surface this cycle.
