# 08 — iOS / Web Alignment

One token set, two native-feeling expressions. The goal: a class built on web and run on iOS feels like
**the same product**, while each platform feels native rather than ported.

## Shared source of truth

[`tokens.json`](./tokens.json) generates:

- **Web:** CSS custom properties (`--rf-*`) in `mockups/theme.css`, via
  [`scripts/build-tokens.mjs`](./scripts/build-tokens.mjs), consumed by React components.
- **iOS:** Swift constants (`RFColor`, `RFType`, `RFSpace`, `RFRadius`, `RFMotion`, `RFTempo`,
  `RFIntensity`, `RFSegment`, `RFRibbon`) in [`ios/RFTokens.swift`](./ios/RFTokens.swift), via
  [`scripts/build-tokens-ios.mjs`](./scripts/build-tokens-ios.mjs), consumed by SwiftUI. The generated
  file expects a `Color(hex:)` initializer in the host app (it does not redefine one).

Each emitter transforms the JSON into its target. **Never hand-edit values in component code or either
generated file** — change the token and regenerate both. This keeps the two clients in lockstep as the
brand evolves.

## What stays identical

- Color roles and values (warm-black/copper/cyan channels + the reserved plasma peak).
- Type scale sizes and role intent; Bricolage Grotesque and Azeret Mono are shared. Web UI uses Sora
  while iOS UI retains native SF Pro Text.
- Radius and spacing scales.
- Intensity ramp, segment language, redundant-encoding rules, the energy ribbon's meaning.
- Motion durations/easing and the signature microinteractions' _intent_.
- **The tempo primitive:** `--rf-beat` (web) and `beatDuration` (iOS) derive identically from BPM, and
  the pulse appears in the same two places (Live HUD, playing track).

## What expresses differently (by design)

| Aspect         | Web (browser)                                                       | iOS (Liquid Glass)                                               |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Glass          | `backdrop-filter: blur()` + translucent fill; opaque fallback       | Native material/blur; richer real translucency                   |
| Motion         | CSS transitions/keyframes on transform+opacity                      | SwiftUI animations; honor system spring feel                     |
| Tempo pulse    | CSS keyframe whose duration = `--rf-beat`                           | SwiftUI `withAnimation` repeating on `beatDuration`              |
| Icons          | Approved rounded web icon set                                       | SF Symbols (rounded equivalents)                                 |
| Navigation     | responsive glass top header for launch destinations                 | glass bottom tab bar + native nav                                |
| Type           | Sora UI + Bricolage Grotesque display + Azeret Mono data | bundle Bricolage Grotesque + Azeret Mono; SF Pro Text for UI; Dynamic Type |
| Reduced motion | `prefers-reduced-motion`                                            | iOS Reduce Motion                                                |
| Density        | planning view rich, side-by-side                                    | live view dominant, single-focus                                 |

## Mode emphasis differs by platform

- **Web** is the **planning** home: timeline-first builder with the energy ribbon, side detail editor,
  keyboard workflows, rich contrast. Glass for nav/overlays; dense editing stays solid; tempo is off
  except a subtle pulse on the playing track.
- **iOS** is the **live** home: glanceable HUD, maximum contrast, large `data-hero` type, glass over
  content, full on-beat pulse, the "drop" at All-Out. Its current product scope is iPhone-only,
  dark-only, with class browsing and live execution rather than web-planning parity.

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
