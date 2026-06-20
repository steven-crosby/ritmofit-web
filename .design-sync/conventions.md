# RitmoFit — building with this design system

RitmoFit is a **dark-first** fitness-class authoring app. Its design language is a
token layer (`--rf-*` CSS custom properties) mapped into a **Tailwind preset**, plus
a few `rf-*` recipe classes. The synced components are the app's reusable
visualizations and the modal primitive.

## Setup / wrapping
- **No provider or context is required** — every component here is presentational and
  takes plain props. Import from the bundle and render: `import { IntensityRibbon } from '<this DS>'`.
- **Dark theme is the default** (`:root` declares the dark token values; `color-scheme: dark`).
  A light theme is opt-in via `<div data-theme="light">` (or on a wrapper). Build on a dark
  surface — put content on `background: var(--rf-color-semantic-bg-base)` with
  `color: var(--rf-color-semantic-text-primary)` and `font-family: var(--rf-typography-family-ui)`,
  or the components read as light-on-white and look wrong.

## Styling idiom — use TOKENS first
Designs render against the **static** shipped stylesheet, not a live Tailwind build, so the
reliable styling vocabulary is the **`--rf-*` token variables** (all defined in the shipped
`styles.css` closure) — reference them via `var(--rf-…)` in inline styles. The Tailwind utility
classes below also ship and are safe to reuse, but a Tailwind class that the synced components
don't already use will NOT be in the stylesheet — when in doubt, use the token var.

Token families (see `tokens/` and `styles.css` for the full list):
| Family | Examples |
|---|---|
| Surfaces | `--rf-color-semantic-bg-base` / `-raised` / `-overlay` / `-sunken` / `-live` |
| Text | `--rf-color-semantic-text-primary` / `-secondary` / `-tertiary` / `-on-accent` |
| Brand (copper) | `--rf-color-semantic-brand-primary` / `-strong` / `-hover` / `-muted` |
| Intensity ramp | `--rf-color-intensity-none` / `-easy` / `-mod` / `-hard` / `-all_out` |
| Segment tints | `--rf-color-segment-warmup` / `-climb` / `-sprint` / `-recovery` / `-cooldown` |
| State | `--rf-color-semantic-state-positive` / `-caution` / `-danger` / `-info` |
| Radii | `--rf-radius-card` / `-panel` / `-sheet` / `-input` / `-control` / `-pill` |
| Type families | `--rf-typography-family-display` (Space Grotesk) / `-ui` (Inter) / `-data` (Martian Mono) |
| Motion | `--rf-motion-duration-*`, `--rf-motion-easing-*` |

Tailwind utilities that ship (mirror the tokens): `bg-bg-base` / `bg-bg-raised`,
`text-text-primary` / `-secondary` / `-tertiary`, `font-display` / `font-ui` / `font-data`,
`rounded-card` / `-panel` / `-input` / `-control` / `-pill`, `shadow-card` / `shadow-lifted`,
`text-display-lg`, `bg-interactive`, `ring-interactive`.

Recipe classes that ship (compositions of the tokens — use as-is):
`rf-btn-primary` (copper-gradient primary button), `rf-brand-mark`, `rf-eyebrow`
(Martian-Mono micro-label), `rf-topbar` (glass nav bar), `rf-hero-glow`, `rf-heat-text`
(display gradient fill, brand-front only), `rf-beat-pulse`.

**Accessibility rule baked into the components:** state/intensity is never carried by color
alone — always pair a label/icon/shape (see `IntensityReadout`, `TimelineStrip` markers).

## Where the truth lives
Read `styles.css` and its `@import`s (the inlined tokens, `@font-face`, and `_ds_bundle.css`)
before styling, and each component's `<Name>.prompt.md` / `<Name>.d.ts` for its API and the
run-payload data shape it expects.

## Idiomatic snippet
```tsx
import { IntensityRibbon, TimelineStrip } from '<this DS>';

<div
  className="font-ui text-text-primary"
  style={{ background: 'var(--rf-color-semantic-bg-base)', padding: 20, borderRadius: 'var(--rf-radius-panel)' }}
>
  <h2 className="font-display text-display-lg">Sunset Climb</h2>
  <IntensityRibbon payload={runPayload} />
  <TimelineStrip payload={runPayload} />
</div>
```
The data-driven components (`IntensityRibbon`, `TimelineStrip`, `LiveTimeline`) consume a
**run-payload** (`{ class, tracks[], sections[] }`); `IntensityReadout` takes a single
`intensity` ("none" | "easy" | "mod" | "hard" | "all_out"). See each `.d.ts`/`.prompt.md`.
