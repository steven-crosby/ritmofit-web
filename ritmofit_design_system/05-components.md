# 05 — Components

Component inventory with Material-style state logic. Every interactive component defines:
**default · hover · focus · pressed · disabled · loading** (where relevant), plus selected/active where
it applies. Geometry from the radius scale; color from the channels in
[`02-color-system.md`](./02-color-system.md).

## State logic (applies to all)
- **Focus** is always a visible cyan focus ring (`interactive/focus-ring`), never removed.
- **Disabled** drops opacity to ~40% and removes pointer/hover; never color-only signaling.
- **Loading** uses a calm indeterminate indicator, not a layout-shifting spinner swap.
- Touch targets ≥ 44pt.

## Buttons
| Variant | Fill | Text | Use |
|---|---|---|---|
| Primary | copper `brand/primary` | ink | The one main action per surface |
| Action (secondary) | transparent + cyan border | cyan | "Preview in Spotify", secondary actions |
| Ghost | `bg/overlay` | bone | Cancel, tertiary |
| Destructive | transparent + ember border | ember + `error` icon | Remove/delete — icon mandatory |

Radius `pill`. Hover: primary brightens; action/ghost lighten fill. Pressed: scale 0.97 + darker step.
Only one primary per surface. **Plasma is never a button fill.**

## Chips & toggles
- **Filter/selection chips:** `control`/`pill` radius, `bg/raised`; selected = copper outline (identity)
  or cyan fill (interactive). Always show selection via shape + weight, not color alone.
- **Segment tag:** pill, icon + label, small color dot. Quiet.
- **Toggle/switch:** cyan when on, with knob position carrying state.

## Inputs
`input` radius, `bg/sunken` or `bg/raised` fill, `border/default`, label above in `label` token. Focus =
cyan ring. Error = ember border + `error` icon + message (never red border alone). Numeric inputs (BPM)
use the **Martian Mono data face** with stepper affordances.

## BPM readout (the signature data component)
The product's hero value. Three sizes, all Martian Mono / tabular:
- **Inline** (`data`) — in song rows and the editor.
- **Large** (`data-lg`) — timeline header, section totals.
- **Hero** (`data-hero`) — the Live HUD. In Live (and on the playing track) this is the surface that
  **pulses on `--rf-beat`** (see [`10-rhythm-system.md`](./10-rhythm-system.md)). Everywhere else it is
  static.

## Song row / track card
The signature list item. **Low noise** (see [`09-class-builder-guidelines.md`](./09-class-builder-guidelines.md)):
- Small album art (44pt, `control` radius) — a creative trigger, not a focal point.
- Title (`body-strong`) + artist (`body`, secondary).
- **BPM** in `data` (Martian Mono), visually weighted — the planning-critical value.
- Drag grip for reorder; intensity indicator (zone bars) when assigned.
- States: default · hover (raise border) · selected (copper left-edge or outline) · dragging
  (`shadow.lifted` + slight scale) · **playing** (faint on-beat pulse on the play indicator only).

## Intensity indicator
Zone bars (0–4 filled) + zone number + name. Never bars-with-color alone. On song rows (compact = bars +
number), the detail editor (full = + name), and the ribbon. All-Out adds a plasma glow in Live / at
ribbon peaks — affect only, never the sole signal.

## IntensityRibbon (new — the energy arc)
The class's intensity over time as a slim continuous area graph along the timeline. **Height encodes
zone; gradient color reinforces** (copper → ember → plasma at peaks). Static (no per-frame animation);
recomputed on edit. Derived from `class_tracks.intensity` + `anchor_ms` — ships without new schema. The
most shareable view in the app. Full spec in [`10-rhythm-system.md`](./10-rhythm-system.md) §4.

## TempoPulse (new — behavior, not a box)
A treatment, not a standalone widget: a keyframe loop whose duration is bound to `--rf-beat`, applied to
exactly one target (the Live HUD readout, or the playing track's indicator). Suppressed under reduced
motion. See [`10-rhythm-system.md`](./10-rhythm-system.md) §2, §6. Never apply to more than one element
per screen.

## Timeline
Horizontal (web) / vertical (iOS live) track of the class. Tracks in order with duration-proportional
blocks; cues and moves render as markers anchored by `anchor_ms`. A playhead shows position. Markers are
shaped/iconed by type (cue vs move) — not color alone. The IntensityRibbon sits pinned above it.

## Cue & move markers
- **Cue marker:** small, carries cue text on hover/expand; pulse animation on add.
- **Move marker:** distinct shape/icon from a cue (separate concepts); may carry intensity.
- Both anchored to a `class_track` by `anchor_ms`; both editable in the side detail panel.

## Navigation
- **Web:** persistent side nav (Explore / Team / Library), glass top bar.
- **iOS:** glass bottom tab bar matching the three sections, plus the in-class Timeline/Playlist toggle.
- Active tab: filled icon + cyan; inactive: outline icon.

## Overlays, sheets, dialogs
Glass surfaces, `panel` radius. Action sheets use the glass recipe with clearly separated options and a
distinct Cancel. Destructive options carry icons.

## Now-playing / Live HUD
Glass over content, maximum-contrast text, `data-hero`/`display` type, current cue dominant, next cue
queued, BPM + timecode persistent **and pulsing on the beat**. The All-Out cue advance is the one "drop"
moment (plasma glow bloom, on-beat cross-fade). Minimal controls, large targets.

## Empty & error states
An empty screen is an invitation to act ("Add your first track"); an error states what happened and how
to fix it, in the interface's voice. Never vague, never an apology.

## Icons
Material Symbols (rounded) on web; SF Symbols (rounded equivalents) on iOS. **Filled = active, outline =
inactive.** Custom RitmoFit movement icons are a later addition; until then use the closest standard
symbol.

## Implementation expectations (web MVP)
Build simple custom components first; avoid heavy UI frameworks. Tailwind with CSS variables mapped from
`tokens.json`. Components accept `className` for extension; semantic HTML; Radix primitives only when
accessibility demands it.
