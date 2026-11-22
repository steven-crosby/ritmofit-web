# 08 — iOS / Web Alignment

One token set, two native-feeling expressions. The goal: a class built on web and run on iOS feels like
**the same product**, while each platform feels native rather than ported.

## Shared source of truth

[`tokens.json`](./tokens.json) generates:

- **Web:** CSS custom properties (`--rf-*`) in `mockups/theme.css`, via
  [`scripts/build-tokens.mjs`](./scripts/build-tokens.mjs), consumed by React components.
- **iOS:** Swift constants (`RFColor`/`RFColorLight`, `RFType`, `RFSpace`, `RFRadius`, `RFMotion`,
  `RFTempo`, `RFIntensity`, `RFSegment`, `RFMove`, `RFRibbon`, `RFGradient`) in
  [`ios/RFTokens.swift`](./ios/RFTokens.swift), via
  [`scripts/build-tokens-ios.mjs`](./scripts/build-tokens-ios.mjs), consumed by SwiftUI. The generated
  file expects a `Color(hex:)` initializer in the host app (it does not redefine one).

Each emitter transforms the JSON into its target. **Never hand-edit values in component code or either
generated file** — change the token and regenerate both. This keeps the two clients in lockstep as the
brand evolves.

## What stays identical

- Color roles and values (warm-black/copper/cyan channels + the reserved plasma peak).
- Type scale sizes and role intent; Bricolage Grotesque and Azeret Mono are shared. Web and Mac UI use
  Sora while iPhone UI retains native SF Pro Text.
- Radius and spacing scales.
- Intensity ramp, segment language, redundant-encoding rules, the energy ribbon's meaning.
- Motion durations/easing and the signature microinteractions' _intent_.
- **The tempo primitive:** `--rf-beat` (web) and `beatDuration` (iOS) derive identically from BPM, and
  the pulse appears in the same two places (Live HUD, playing track).

## What expresses differently (by design)

> **The iOS column is the iPhone's.** The Mac column is the web's design, rebuilt in SwiftUI
> ([D28](https://github.com/steven-crosby/ritmofit-web/blob/main/ritmofit_dev_plan/decisions.md#d28--native-parity-with-the-web-at-spotifys-bar-the-mac-matches-the-web-resolved-2026-11-19),
> 2026-11-19). Only Mac conventions may differ: the menu bar and its commands, the window frame,
> keyboard shortcuts and pointer hover. The rows marked "Mac only" spell those out, with the owner's
> 2026-11-19 decisions on them.

| Aspect | Web (browser) | iOS (iPhone, Liquid Glass) | Mac (D28) |
| --- | --- | --- | --- |
| Glass | `backdrop-filter: blur()` + translucent fill; opaque fallback. Planning headers are opaque (`surface.glass.header`) | Native material/blur; richer real translucency | The web's: the opaque top bar (`surface.glass.header` with the `surface.glass.border` hairline, emitted as `RFGlass`), and the web's glass recipe (fill `rgba(26,23,18,0.70)`, blur 20, 12% border, 6% inset highlight) on dialogs, overlays and the Live HUD. A SwiftUI material is fine if it reads as that recipe. No glass on dense editing |
| Motion | CSS transitions/keyframes on transform+opacity | SwiftUI animations; honor system spring feel | SwiftUI animations with the web's durations and easing (`RFMotion`), on the same elements; not system springs |
| Tempo pulse | CSS keyframe whose duration = `--rf-beat` | SwiftUI `withAnimation` repeating on `beatDuration` | SwiftUI repeating on `beatDuration`, in the web's two places (Live HUD, playing track) and at the web's strength |
| Icons | Approved rounded web icon set | SF Symbols (rounded equivalents) | The web's icons and glyphs, and text where the web uses text. No SF Symbols in app content |
| Navigation | responsive top header for launch destinations | glass bottom tab bar + native nav | The web's top bar: the R mark, "Ritmo Studio", the profile name, and the sections as text with the current one underlined. Back is the web's in-page link; summaries and playlists open as the web's dialogs. Live opens in its own window (window frame) |
| Type | Sora UI + Bricolage Grotesque display + Azeret Mono data | bundle Bricolage Grotesque + Azeret Mono; SF Pro Text for UI; Dynamic Type | Sora UI + Bricolage Grotesque display + Azeret Mono data, all bundled, at the web's sizes (px = pt) |
| Reduced motion | `prefers-reduced-motion` | iOS Reduce Motion | macOS Reduce Motion, with the web's reduced-motion behaviour (a browser on a Mac reads the same setting) |
| Density | planning view rich, side-by-side | live view dominant, single-focus | The web's, with the same breakpoints in points: builder and inspector side by side from 1280; Live in two columns from 1024 with a bottom transport bar |
| Colour roles | Cyan acts, copper is the primary fill | System controls take the app accent | The web's roles on every control, whatever the System Settings accent is (owner, 2026-11-19) |
| Sign in with Apple | Today a text-only "Continue with Apple" button, which falls short of Apple's custom-button rules. It becomes Apple's white button with the web's corner radius (RF-231) | Apple's system button | Apple's white button, as the system Sign in with Apple button (owner, 2026-11-19) |
| Menu bar and commands (Mac only) | — | — | File › New Class ⌘N; View › Classes ⌘1, Music ⌘2 and Refresh ⌘R; Sign Out in the app menu; Settings ⌘, for Account |
| Keyboard shortcuts (Mac only) | Focus-scoped keys today: on the Live seek strip the arrows seek 5 s, and on the view toggle they move focus between the views, where Enter or Space selects. Live's Space, ←, → and Esc come to the web too (RF-232) | Touch | May differ. Live has Space (play or pause), ← and → (previous and next track) and Esc (exit). Back is ⌘[, as in a browser. The menu keys ⌘N, ⌘R, ⌘1 and ⌘2 stay Mac only, because browsers use them. A key either side lacks is listed with its reason |
| Window frame (Mac only) | Browser chrome | Status and navigation bars | The main window has traffic lights and no title bar, with the web's top bar in its place; the Live window is its own window with a macOS title bar and title; the main window's minimum size |
| Sheets (Mac only) | Dialog in page | Native sheets | macOS's sheet presentation (it slides down from the title bar and dims the window) is window frame, and the web's dialog is drawn inside it (owner, 2026-11-19) |
| Pointer hover (Mac only) | CSS hover per 05-components | — | macOS hover, following 05-components' hover rules (primary brightens, secondary lightens, rows raise their border); tooltips allowed |
| Context menus (Mac only) | Visible controls only: "…" menus, the grip, inline Edit and Delete | Long-press menus | Right-click menus as an extra to the web's visible controls, never instead of them (owner, 2026-11-19) |

## Emphasis differs by platform — capability does not

Both surfaces carry the **full** instructor loop (build/choreograph **and** live-run); the difference is
**density and default emphasis**, expressed idiomatically — not which capabilities exist. This is a
platform-idiomatic lean, not an asymmetry of features (parity principle: `decisions.md` D18 +
[`ritmofit_dev_plan/web-ios-parity.md`](https://github.com/steven-crosby/ritmofit-web/blob/main/ritmofit_dev_plan/web-ios-parity.md)).

- **Web** *leans* desk-comfortable: timeline-first builder with the energy ribbon, side detail editor,
  keyboard workflows, rich contrast. Glass for nav/overlays; dense editing stays solid; tempo is off
  except a subtle pulse on the playing track. Web also provides the **full live-run** experience (a
  laptop/tablet at the front of the room), with an optional second-screen presentation/cast view.
- **iOS** *leans* in-the-room: glanceable HUD, maximum contrast, large `data-hero` type, glass over
  content, full on-beat pulse, the "drop" at All-Out. iOS likewise provides the **full build/choreograph**
  loop in a native idiom. Current scope is iPhone-only and dark-only; closing the builder/library/search
  parity gap is tracked iOS work (`web-ios-parity.md`), not a permanent boundary.

## Native-feel guidelines

- Don't force web chrome onto iOS or iOS gestures onto web. Same _language_, native _grammar_.
- iOS Liquid Glass favors larger soft rounded panels and real translucency — our `panel`/`card` radii and
  glass recipe are tuned so this feels native, while the same radii read clean on a desktop monitor.
- Respect each platform's safe areas, status/nav bars, and system settings (appearance, text size,
  motion).

## Consistency contract

If a component looks or behaves meaningfully different between platforms in a way **not** listed in the
"expresses differently" table, that's a bug, not a platform nuance. The shared tokens plus this table
define the allowed divergence.

## Current integration constraints

- The backend and generated OpenAPI contract are authoritative for both clients.
- iOS consumes the versioned `GET /classes/:id/run-payload` projection.
- Do not create iOS-owned server entities or silently add visual data fields.
- The current shared run payload includes `timelineMode`, `clipStartMs`, and `beatAnchorMs`; verify the
  iOS DTO against the current contract before design-system integration because its checked-in model
  may lag additive fields.
- iOS vendors `design-tokens/tokens.json` and generates
  `RitmoFit/RitmoFit/Core/DesignSystem/RFTokens.swift`; never hand-edit the generated Swift file.
