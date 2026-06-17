# RitmoFit Design System

This folder is the consolidated design-system reference for RitmoFit. It is intentionally separate
from the production web and iOS repositories so the product language can be reviewed as a coherent
whole before adoption.

## Product truth

> RitmoFit is for instructors who are creators.

RitmoFit helps rhythm fitness instructors find, shape, and perform the class inside the music. It is
a creator workstation and studio instrument, not a generic fitness dashboard, playlist manager, or
passive music app.

The visual target is **Club Athletic + Creator Swagger + Nike restraint**:

- Builder is calm, structured, timeline-first, and mostly still.
- Library makes saved music an active starting point for class creation.
- Live earns higher contrast, larger data, and rationed beat-derived motion.
- Marketing and share artifacts carry more swagger without party-fitness cliches.

## Canonical decisions

1. `tokens.json` is the source of truth.
2. Inter is the UI family, Space Grotesk is the display family, and Martian Mono is the data family.
3. Copper is brand identity and the one primary action on a surface.
4. Cyan is interaction, focus, links, controls, and information.
5. Plasma is peak affect only: All-Out, the Live drop, class-shape peak artwork, and the brand-front campaign register (heat gradient + bloom). Never a control; never on a working surface.
6. Color confirms; structure, labels, numbers, icons, and shape inform.
7. The energy ribbon is a core product and brand artifact.
8. Album art is bounded. BPM, duration, sequence, cues, movement, and energy shape carry more weight.
9. Pulse is allowed only in the Live HUD and the currently playing planning indicator.
10. Reduced motion removes affect without removing meaning.

## Package map

| File                             | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `ritmofit-design-system.md`        | Product and brand authority for every decision in this package |
| `tokens.json`                    | Platform-neutral token source (single source of truth)         |
| `scripts/build-tokens.mjs`       | Generates the `:root` block in `mockups/theme.css` from tokens |
| `scripts/build-tokens-ios.mjs`   | Generates `ios/RFTokens.swift` (colors, type, spacing, motion) from tokens |
| `ios/RFTokens.swift`             | Generated SwiftUI constants — the iOS half of token parity      |
| `scripts/fetch-fonts.mjs`        | Self-hosts the three OFL fonts into `mockups/fonts/` + `fonts.css` |
| `scripts/lint-tokens.mjs`        | Guardrail lint: no raw hex in hand CSS/markup, no banned copy, token integrity |
| `scripts/check-contrast.mjs`     | WCAG AA gate for the semantic color layer (both themes) — text 4.5:1, graphics 3.0:1 |
| `01-design-principles.md`        | Product-level design principles                                |
| `02-color-system.md`             | Color channels, intensity, and plasma allowlist                |
| `03-typography.md`               | UI, display, and data type roles                               |
| `04-layout-and-surfaces.md`      | Spacing, geometry, glass, and solid surfaces                   |
| `05-components.md`               | Component inventory and states                                 |
| `06-motion.md`                   | Motion budget and reduced-motion rules                         |
| `07-accessibility.md`            | Contrast, keyboard, targets, and redundant encoding            |
| `08-ios-web-alignment.md`        | Shared roles with native platform expression                   |
| `09-class-builder-guidelines.md` | Builder hierarchy and timeline behavior                        |
| `10-rhythm-system.md`            | Tempo token, energy ribbon, and pulse allowlist                |
| `11-library-guidelines.md`       | Saved-music-to-class creation workflow                         |
| `mockups/`                       | Framework-free reference screens using one shared CSS layer    |

The two top-level HTML files are convenience redirects, not standalone surfaces:
`preview.html` → `mockups/components.html`, `ritmofit-branding-mockup.html` → `mockups/marketing.html`.

## Tokens

`tokens.json` is the single source of truth. Two emitters consume it; both outputs are **generated** —
do not hand-edit them. After changing tokens, regenerate both targets:

```sh
npm run build       # web: :root block in mockups/theme.css   (node scripts/build-tokens.mjs)
npm run build:ios   # iOS: ios/RFTokens.swift                  (node scripts/build-tokens-ios.mjs)
npm run build:all   # both emitters
```

Before committing or in CI, run the full guard gate — it fails non-zero on any token drift, raw hex,
banned copy, prose↔token mismatch, or contrast regression:

```sh
npm run verify      # build --check (both) + lint-tokens + check-contrast, no writes
```

Both emitters accept `--check`: they never write and exit non-zero if their generated output has
drifted from `tokens.json`, so `verify` is a safe read-only gate.

The component rules below the generated block in `theme.css` are still authored by hand. `RFTokens.swift`
expects a `Color(hex:)` initializer in the host app (the iOS repo provides one).

A complete **light theme** is generated too, but **opt-in**: web emits a `[data-theme="light"]` override
block, iOS an `RFColorLight` enum. Dark stays the default; set `data-theme="light"` on a root element (or
adopt `RFColorLight`) to use it. Live mode stays dark in both themes; glass/shadow light support is a
documented follow-up.

## Mockups

Open [`mockups/index.html`](./mockups/index.html) to browse the full set:

- Marketing
- Library
- Move library
- Builder
- Live
- Explore, future-facing
- Teams, future-facing
- Sign in
- Share card
- iOS direction
- Component reference
- Light theme (the opt-in light palette, shipped at rest)

The mockups use no remote imagery and no framework. Artwork is CSS-generated so the package remains
portable. The three approved OFL families are **self-hosted** under `mockups/fonts/` (latin + latin-ext
woff2, variable weight) and loaded via `mockups/fonts.css`, which `theme.css` imports. Regenerate them
with:

```sh
node scripts/fetch-fonts.mjs
```

System fonts remain the fallback in each `--rf-font-*` stack if a file fails to load. See
`mockups/fonts/NOTICE.md` for licensing.

## Schema honesty

These screens demonstrate product behavior, not new contracts. Existing fields and concepts are used
where known, including the current `class_sections` model and the `moves` / `user_moves` / `class_track_moves` model behind the move library. Explore and Teams remain explicitly
future-facing product concepts. Do not infer schema or API requirements from visual-only labels
without checking the shared contracts.
