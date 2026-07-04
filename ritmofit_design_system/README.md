# RitmoFit Design System

This folder is the **canonical** design-system reference for RitmoFit, adopted by the web app here and
bridged into iOS via `tokens.json`. Historical design snapshots may be referenced from
`ritmofit_dev_plan/HISTORY.md`, but this repo does not vendor from a sibling design-system folder.

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
2. Sora is the web UI family; iOS retains SF Pro Text for UI. Bricolage Grotesque is the shared
   display family, and Azeret Mono is the shared data family.
3. Copper is brand identity and the one primary action on a surface.
4. Cyan is interaction, focus, links, controls, and information.
5. Plasma is peak affect only: All-Out glow, the Live drop, Zone 4 in the ribbon, and marketing/share artwork derived from actual class peaks. Never generic brand atmosphere or a control.
6. Color confirms; structure, labels, numbers, icons, and shape inform.
7. The energy ribbon is a core product and brand artifact.
8. Album art is bounded. BPM, duration, sequence, cues, movement, and energy shape carry more weight.
9. Pulse is allowed only in the Live HUD and the currently playing planning indicator.
10. Reduced motion removes affect without removing meaning.
11. Foundation language is modality-neutral. Stored enum keys retain schema-honest fallback labels; discipline templates and instructor-authored names may provide scoped display language.
12. Signature surfaces are alive at rest: derived-provisional, never empty or flat by default.

## Package map

| File                             | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `ritmofit-design-system.md`        | Product and brand authority for every decision in this package |
| `tokens.json`                    | Platform-neutral token source (single source of truth)         |
| `scripts/build-tokens.mjs`       | Generates the `:root` block in `mockups/theme.css` from tokens |
| `scripts/build-tokens-ios.mjs`   | Generates `ios/RFTokens.swift` (colors dark + light, type, spacing, radius, motion, tempo, intensity, segment, move, ribbon, gradient) from tokens |
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
drifted from `tokens.json`, so `verify` is a safe read-only gate. Use `verify` as the read-only gate —
**not** `build:all -- --check`: `build:all` is `build && build:ios`, so a trailing `--check` is not
forwarded to the emitters and they run in **write** mode.

The component rules below the generated block in `theme.css` are still authored by hand. `RFTokens.swift`
expects a `Color(hex:)` initializer in the host app (the iOS repo provides one). The `ritmofit-ios` repo
vendors its own hand-synced copy of `tokens.json` + `RFTokens.swift`; that cross-repo copy is **not**
drift-gated from here and is reconciled as part of the post-launch iOS wrap-up (see
[`../ritmofit_dev_plan/web-ios-parity.md`](../ritmofit_dev_plan/web-ios-parity.md) › "Known seam gaps").

A complete **light theme** is generated too, but **opt-in**: web emits a `[data-theme="light"]` override
block, iOS an `RFColorLight` enum. Dark stays the default; set `data-theme="light"` on a root element (or
adopt `RFColorLight`) to use it. The light theme flips the full surface layer — semantic colors, glass
(fills, border, highlight, sticky header), and shadows. Live mode stays dark in both themes by design (a
performance surface for dim rooms). On iOS, glass is expressed via native materials, so `RFColorLight`
covers the semantic color layer; web's `[data-theme="light"]` block additionally carries the glass/shadow
values. Light-mode glass legibility isn't gated by `check-contrast.mjs`, so verify it in a real browser.

## Mockups

Open [`mockups/index.html`](./mockups/index.html) to browse the full set:

- Marketing
- Library
- Move library
- Builder
- Live
- Live playback (D19: preflight, player rail, runtime recovery)
- Explore (shipped in M4 as the Explore feed)
- Teams, future-facing
- Sign in
- Share card
- iOS direction
- Component reference
- Builder states
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
where known, including the current `class_sections` model and the `moves` / `user_moves` / `class_track_moves` model behind the move library. Explore shipped in M4 (publish via
`classes.visibility`, `GET /explore`, save-a-copy); Teams remains an explicitly future-facing
product concept. Do not infer schema or API requirements from visual-only labels
without checking the shared contracts.
