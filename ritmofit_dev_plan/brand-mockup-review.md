# Frontend ↔ Design-System Conformance Review + Brand-Mockup Integration

_Date: 2026-06-13 · Branch: `feat/web-brand-mockup-integration`_

Two-phase pass:

- **Phase 1** — audit `apps/web/src/` against the design system (`ritmofit_design_system/`,
  docs `01`–`10` + `tokens.json`) and the page mockups.
- **Phase 2** — bring the live frontend into line with the **newest visual direction**,
  `ritmofit_design_system/ritmofit-branding-mockup.html`.

---

## Headline finding (process)

**`apps/web/src/styles/tokens.css` is generated, not hand-authored.**
`apps/web/scripts/generate-tokens.mjs` regenerates it from `ritmofit_design_system/tokens.json`,
and `pnpm tokens` runs automatically on both `dev` and `build` (`apps/web/package.json`). A hand
edit to `tokens.css` is therefore **silently reverted on the next `pnpm build`** — i.e. it would
work in a watched dev session and then vanish from the deployed bundle.

Consequence for this pass:

- **Token _value_ changes** must be made in `tokens.json` (the source of truth) and regenerated.
- **Composite brand _recipes_** (gradients, tinted glows, the eyebrow, the glass top-bar) are not
  primitive tokens; they belong in `apps/web/src/index.css` (which is _not_ generated), expressed
  as CSS classes that reference the existing `--rf-*` primitives — single-source, regen-safe.

This is why Phase 2 lands its changes in `index.css` + components + `index.html`, and not by
hand-editing `tokens.css`.

---

## Phase 1 — Gap analysis

### Overall

The codebase is **unusually disciplined** about tokens. `tokens.css` matches `tokens.json`
verbatim, Tailwind maps every color/space/radius/font/shadow to a `--rf-*` var
(`tailwind.config.js`), and a repo-wide grep finds **no raw hex, rgba, or off-palette Tailwind
colors** in component logic. The only literal hex values are intentional, token-mapped data
palettes with comments (`lib/cue-colors.ts`, `components/SegmentBand.tsx`). So the gaps below are
overwhelmingly about **applying brand expression the mockup adds**, not about violations.

Severity key: **High** = visible brand/spec miss · **Med** = noticeable polish gap · **Low** =
cosmetic / nit.

### Color

| # | Finding | File:line | Spec | Sev |
|---|---|---|---|---|
| C1 | Segment tints are hardcoded hex (`#F2B838`…) instead of the generated `--rf-color-segment-*` vars that already exist for the exact same values. Token-mapped via comment, but bypasses the var. | `components/SegmentBand.tsx:18-22` | `tokens.json` "change values here, not in component code"; README single-source | Low |
| C2 | No `::selection` treatment — the mockup tints selection copper (`rgba(224,126,60,0.35)`). | `index.css` (absent) | branding-mockup `::selection`; principle 4 (copper = identity) | Low |
| C3 | No copper "hero glow" atmosphere on the auth/marketing surface; `Login` sits on flat `bg-base`. Mockup uses a single soft copper radial top-right. (NB: `04-layout` bans the two-orb AI-SaaS gradient on _planning_ surfaces — this is correctly scoped to the marketing/auth surface only.) | `components/Login.tsx:27` | branding-mockup `body` bg; `04-layout` "atmosphere derived, default none on planning" | Med |
| — | Intensity ramp, plasma rationing, cyan-only-interactive, segment track all correctly implemented (verified in `IntensityReadout`, `IntensityRibbon`, `cue-colors`, `LiveMode` drop/pulse). | — | `02`, `10` | ✅ |

### Typography

| # | Finding | File:line | Spec | Sev |
|---|---|---|---|---|
| T1 | **Space Grotesk weight 700 is never loaded** (only `600`), so the brand wordmark/hero can't render at the display weight the mockup uses. Inter `700` and Martian Mono `400` are also used by the mockup but not loaded. | `index.html:10` | `03-typography` display weights; branding-mockup font link | High |
| T2 | Brand wordmark renders at `font-semibold` (600); the mockup sets the wordmark at **700** with `-0.01em` tracking. | `Dashboard.tsx:107`, `Login.tsx:29` | branding-mockup `.brand .name` / `.hero h1` | Med |
| T3 | No "eyebrow" micro-label primitive (Martian Mono, 11px, `0.18em`, uppercase, copper) — a recurring brand device in the mockup. | (absent) | branding-mockup `.eyebrow` | Low |
| — | `font-data` (Martian Mono, tabular) correctly used for all BPM/timecode/zone/count readouts; `font-display` used for titles/headers; `font-ui` for prose. | — | `03` | ✅ |

### Layout / Surfaces

| # | Finding | File:line | Spec | Sev |
|---|---|---|---|---|
| L1 | The persistent top bar is a plain bottom-bordered row — **not glass, not sticky**. Spec and mockup both make the top bar a glass surface (translucent warm-ink fill + 20px backdrop blur + glass border), and the mockup makes it `sticky`. | `Dashboard.tsx:106` | `04-layout` "Glass for navigation"; `05-components` "glass top bar"; branding-mockup `.topbar` | High |
| L2 | No brand **mark** (the copper-gradient rounded chip with the ink "R") beside the wordmark anywhere in the app. | `Dashboard.tsx:107`, `Login.tsx:29` | branding-mockup `.brand .mark` | Med |
| L3 | Top-bar border uses `border-interactive/15` (a cyan tint) rather than the neutral translucent-bone glass border; cyan is reserved for "interactive", not chrome dividers. | `Dashboard.tsx:106` | `02` cyan = interactive only; `04` translucent-bone borders | Low |
| — | 3-pane workstation layout (library · workspace · sticky inspector), solid surfaces for dense editing, radius scale, spacing all conform. | `Dashboard.tsx:160` | `04`, `09` | ✅ |

### Components

| # | Finding | File:line | Spec | Sev |
|---|---|---|---|---|
| K1 | **Primary buttons are a flat copper fill** (`bg-brand`) with no gradient, no copper glow shadow, and no hover/press feedback. The mockup's primary button is a `170deg` copper gradient + a soft copper glow (`0 2px 10px rgba(200,104,42,0.32)`) + `brightness(1.06)` hover + `translateY(1px)` active. 14 call-sites. | `Login.tsx:65`, `Dashboard.tsx:258/484/906/995`, `LiveMode.tsx:386`, `TrackSearch.tsx:212`, `ConnectionsDialog.tsx:169`, `CustomMovesDialog.tsx:171`, `TeamsDialog.tsx:142/222`, `ExploreDialog.tsx:126`, `ShareDialog.tsx:170/209` | `05-components` Buttons (hover/pressed states mandatory); branding-mockup `.btn-primary` | High |
| K2 | Secondary (cyan-border) buttons have **no hover state** — the mockup's ghost button lightens its fill on hover (`rgba(58,192,212,0.10)`). `05` requires hover defined for every interactive component. | `Dashboard.tsx:111-129` (nav) etc. | `05-components` state logic; branding-mockup `.btn-ghost:hover` | Med |
| — | Focus rings, disabled (opacity-40/50 + no pointer), redundant encoding on intensity/segments/cues, distinct cue vs move marker shapes all present. | — | `05`, `07` | ✅ |

### Rhythm / Motion

| # | Finding | File:line | Spec | Sev |
|---|---|---|---|---|
| M1 | The on-beat pulse (`rf-beat-pulse`), the All-Out "drop" (`rf-drop-bloom`/`rf-drop-in`), `--rf-bpm`/`--rf-beat`, and the static energy ribbon are all implemented and correctly reduced-motion-gated. **No gaps.** Button transitions added in Phase 2 reuse the token easings/durations and are reduced-motion-safe. | `index.css:25-94`, `LiveMode.tsx`, `IntensityRibbon.tsx` | `06`, `10` | ✅ |

### Accessibility

| # | Finding | File:line | Spec | Sev |
|---|---|---|---|---|
| A1 | No regressions found. Redundant encoding is honored throughout (intensity = zone# + bars + label + color; segments = icon/label + tint; cues vs moves = distinct shapes). `prefers-reduced-motion` fully suppresses pulse + drop. Phase 2 keeps all of this and adds reduced-motion guards to the new button micro-feedback. | `IntensityReadout.tsx`, `TimelineStrip.tsx`, `index.css:42-46,86-94` | `07`, `10 §6` | ✅ |
| A2 | Marketing-page nav links (`Product`/`Pricing`) in the mockup are **not** ported — they have no app destination. App's top-bar actions (Explore/Teams/…) correctly stay cyan interactive controls. | — | `01` "earn every element" | ✅ (intentional) |

### Token drift (tokens.css vs tokens.json vs mockup)

- `tokens.css` ↔ `tokens.json`: **exact match**, no drift.
- Mockup vs tokens: the mockup is ~99% token-faithful. The **only** numeric divergence is
  `--glass-fill` `rgba(26,23,18,0.72)` in the mockup vs `0.70` in `tokens.json`. This is an
  incidental 2% nudge (the mockup comment says tokens were "pulled verbatim from theme.css", which
  uses `0.70`), invisible in practice. **Decision: keep the canonical `0.70`** and reference the
  token in the new glass top-bar rather than introduce drift for a rounding difference.

---

## Phase 2 — Integration plan (what was changed)

All changes are **styling only** — no schema / API-contract / `packages/shared` / behavior changes.
Every value traces to the mockup or an existing `--rf-*` primitive.

- **`apps/web/index.html`** — load the font weights the mockup/design-scale need: Space Grotesk
  `500;600;700`, Inter `400;500;600;700`, Martian Mono `400;500;600;700`. (T1)
- **`apps/web/src/index.css`** — add regen-safe brand recipes as `@layer components` classes, each
  built from existing `--rf-*` primitives:
  - `.rf-btn-primary` — copper `170deg` gradient + copper glow + `brightness` hover + `translateY`
    active; transitions use token durations/easings and collapse under reduced motion. (K1)
  - `.rf-brand-mark` — the copper-gradient rounded chip + ink glyph + soft copper shadow. (L2)
  - `.rf-topbar` — glass fill + 20px backdrop blur + glass border + `sticky`. (L1, L3)
  - `.rf-eyebrow` — Martian Mono uppercase copper micro-label. (T3)
  - `.rf-hero-glow` — single soft copper radial over `bg-base`, for the auth surface only. (C3)
  - `@layer base { ::selection }` — copper-tinted selection. (C2)
- **`components/Dashboard.tsx`** — top bar → `.rf-topbar` + `.rf-brand-mark` + wordmark at 700;
  nav buttons get `hover:bg-interactive/10`; primary buttons → `.rf-btn-primary`. (L1, L2, T2, K1, K2)
- **`components/Login.tsx`** — `.rf-hero-glow` surface, brand mark + wordmark(700) + eyebrow,
  primary → `.rf-btn-primary`. (C3, L2, T2, T3, K1)
- **`components/LiveMode.tsx`**, **`TrackSearch.tsx`**, **`ConnectionsDialog.tsx`**,
  **`CustomMovesDialog.tsx`**, **`TeamsDialog.tsx`**, **`ExploreDialog.tsx`**, **`ShareDialog.tsx`**
  — primary `bg-brand` buttons → `.rf-btn-primary` for one consistent primary treatment. (K1)
- **`components/SegmentBand.tsx`** — segment tints switched from hardcoded hex to the existing
  `--rf-color-segment-*` vars (no value change; removes the bypass). (C1)

### Deliberately deferred (not in this styling pass)

- Porting the marketing landing page itself (hero/phrase-kit/boutique-strip) — out of scope; the
  app's surfaces are the auth screen + the workstation, not a marketing site. (A2)
- Self-hosting fonts (`03` recommends self-host + preload). Still on the Google Fonts CDN; a
  hosting change, not a styling change. Flagged.
- `--glass-fill` `0.70 → 0.72` — declined as incidental drift (see Token drift).
