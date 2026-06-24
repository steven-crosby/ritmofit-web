# 06 — Motion

Mostly functional, with delight in a few key moments. Motion should feel like it has **rhythm** — this is
a music product — but never call attention to itself or slow the user down. Values in
[`tokens.json`](./tokens.json) under `motion` and `tempo`.

## Durations & easing

- `instant` 80ms · `fast` 140ms · `base` 220ms · `slow` 320ms.
- `standard` `cubic-bezier(0.2,0,0,1)` — most transitions.
- `decelerate` `cubic-bezier(0,0,0,1)` — elements entering.
- `snap` `cubic-bezier(0.3,1.3,0.5,1)` — confident overshoot for "it landed" moments.
- `onBeat` `cubic-bezier(0.4,0,0.2,1)` — the smooth, symmetric curve for tempo-synced pulses and the
  Live "drop." Distinct from the others on purpose; don't reuse `standard` for beat motion.

Keep most UI at `fast`/`base`. Reserve `snap` for signature confirmations and `onBeat` for the rhythm
system only.

## Signature microinteractions

The few deliberate delight moments. Everything else is quiet.

| Moment               | Motion                                                                           |
| -------------------- | -------------------------------------------------------------------------------- |
| Track added to class | soft slide in + `snap` settle                                                    |
| Cue added            | brief static highlight (`fast` opacity), never a pulse                           |
| Reorder track        | card lifts with `shadow.lifted` + slight scale while dragged                     |
| Save complete        | tiny confident confirmation (icon + `fast` opacity), no banner                   |
| Live progress        | subtle continuous playhead motion, no bounce                                     |
| **Tempo pulse**      | Live HUD + playing track breathe one cycle per `--rf-beat` (`onBeat`) — see `10` |
| **The drop**         | All-Out cue advance: on-beat cross-fade + plasma glow bloom. The one big spend.  |

## Principles

- **Functional first.** Motion clarifies state change; it doesn't decorate. If an animation doesn't
  explain something — or keep time — cut it.
- **Rhythmic, not busy.** One orchestrated moment beats many scattered effects. A page shouldn't shimmer.
  The pulse is the _only_ sanctioned ambient-feeling motion, and it's confined to two surfaces.
- **Transforms over layout.** Animate opacity/transform/box-shadow, never width/height/top in hot paths,
  to hold 60fps on both platforms.
- **Glass moves softly.** Overlays and the live HUD ease in with `decelerate`; they don't snap.

## Reduced motion (mandatory)

Respect `prefers-reduced-motion` (web) and iOS Reduce Motion:

- Durations collapse to ~0.01ms (effectively instant).
- Transform/scale animations become **opacity-only** crossfades.
- The cue confirmation, reorder lift, save snap **and the tempo pulse + the drop** all degrade to a static state
  change. The playing state falls back to a static "Now playing" indicator + label.
- No parallax, no ambient looping motion. The energy ribbon (a static graph) is unaffected.

## Live mode

Motion is at its most restrained _and_ its most expressive here — a deliberate paradox. Almost nothing
moves except the two things that matter: the **playhead/cue advancement** and the **on-beat pulse**.
Everything else is dead still so the instructor can glance and go.
