# RitmoFit Design System

A cross-platform product language for instructors who **build** rhythm-cycle classes — not a palette,
a point of view. It is **Spotify-like** in contrast and music-first confidence, **Material-like** in
token structure and component logic, **iOS Liquid Glass–compatible** in depth and soft geometry — and,
unlike a generic dark workstation, it **keeps time**: tempo, energy, and the shape of a class are
first-class design materials.

This is the synthesized system. It takes the disciplined architecture of the Claude draft as its base
and grafts on the four things both earlier drafts were missing.

## The one-line model

> **Material's token structure and component logic, rendered with Liquid-Glass surface treatment,
> carrying Spotify's color confidence — given a pulse. Warm espresso black + copper, dark-first,
> Latin-rooted.**

When the references disagree, that sentence decides. Material is the base (tokens, states,
accessibility); Liquid Glass is the surface treatment; Spotify is the attitude; **rhythm is the soul.**

## What makes this distinct (the four primitives)

Both source drafts produced a competent dark SaaS dashboard that happened to mention music. These four
additions make it unmistakably a *rhythm* product:

1. **Tempo is a token.** `--rf-bpm` drives `--rf-beat = 60s / bpm`. The Live HUD and the currently-
   playing track *pulse on the actual beat of the track*. See [`10-rhythm-system.md`](./10-rhythm-system.md).
2. **The numbers carry the brand.** BPM and timecodes — the most-read glyphs in the app — are set in
   **Martian Mono**, a characterful tabular monospace, not a generic UI sans. See [`03-typography.md`](./03-typography.md).
3. **The class has a shape.** An **energy-arc ribbon** renders intensity over time along the timeline —
   the choreography made visible. See [`09-class-builder-guidelines.md`](./09-class-builder-guidelines.md).
4. **One reserved heat accent.** A hot **plasma** magenta, used ~1% of the time, exclusively for
   All-Out and the Live sprint — the visual "drop." See [`02-color-system.md`](./02-color-system.md).

## Brand personality

45% music-creator workstation · 45% Spotify-for-instructors · 10% premium studio tool — with a Latin,
rhythmic pulse underneath. Expressive where it counts, disciplined everywhere else. A *workspace* for
**creating** a class, not consuming a feed.

## Source of truth

- [`tokens.json`](./tokens.json) — platform-agnostic tokens. Generates CSS custom properties (web) and
  Swift constants (iOS). **Change values here, not in component code.**

## Documents

| File | Purpose |
|---|---|
| [`01-design-principles.md`](./01-design-principles.md) | Seven rules everything follows — including *the interface keeps time* |
| [`02-color-system.md`](./02-color-system.md) | Channels model, intensity ramp, segment track, the reserved plasma accent, redundant encoding |
| [`03-typography.md`](./03-typography.md) | Inter (UI) + Space Grotesk (display) + Martian Mono (data/hero numerals) |
| [`04-layout-and-surfaces.md`](./04-layout-and-surfaces.md) | Radius scale, Material+Glass surface model, elevation |
| [`05-components.md`](./05-components.md) | Component inventory with Material states; BPM hero, IntensityRibbon, TempoPulse |
| [`06-motion.md`](./06-motion.md) | Functional motion, the on-beat easing, the one "drop" moment, reduced-motion |
| [`07-accessibility.md`](./07-accessibility.md) | Redundant encoding, WCAG targets, dynamic type, keyboard, pulse safety |
| [`08-ios-web-alignment.md`](./08-ios-web-alignment.md) | One token set, two native expressions |
| [`09-class-builder-guidelines.md`](./09-class-builder-guidelines.md) | Timeline-first layout, low-noise song rows, the energy ribbon |
| [`10-rhythm-system.md`](./10-rhythm-system.md) | **The signature.** Tempo as a primitive: derivation, where it pulses, where it must not |

## Non-negotiables

1. **Color never carries meaning alone.** Every meaning-bearing color is paired with a non-color
   channel — label, number, icon, bar length, position, or weight. (Plasma is affect, not meaning: the
   bars/number/label still encode intensity underneath the glow.)
2. **Cyan is the only "interactive" color.** Copper is identity; plasma is peak energy; neither ever
   signals "tap me."
3. **Glass for nav/overlays/live; solid for dense editing.** Readability wins where people edit long.
4. **Contrast and tempo diverge by mode.** Planning is rich and mostly still; Live is maximum-contrast
   and pulses on the beat.
5. **The DB intensity enum is fixed** (`none/easy/mod/hard/all_out`). Zone labels are presentation only.
6. **Album art stays small.** It's a creative trigger; BPM and structure get the weight.
7. **The pulse is rationed.** Tempo animation appears only in Live and on the playing track, and is
   fully suppressed under reduced-motion. Never ambient.

## Status of concepts vs schema

- **Intensity** is in the schema (`class_tracks.intensity`, `moves.intensity`).
- **Segments** and the **energy ribbon's segment bands** are a **design concept only**, not yet in the
  data model. The ribbon can render from `intensity` + `anchor_ms` today; segment banding waits for a
  likely `class_sections` table. Do not silently invent it.
