# 05 — Components

Component inventory with explicit state logic. Every interactive component defines:
**default · hover · focus · pressed · disabled · loading** (where relevant), plus selected/active where
it applies. Geometry from the radius scale; color from the channels in
[`02-color-system.md`](./02-color-system.md).

## State logic (applies to all)

- **Focus** is always a visible cyan focus ring (`interactive/focus-ring`), never removed.
- **Disabled** drops opacity to ~40% and removes pointer/hover; never color-only signaling.
- **Loading** uses a calm indeterminate indicator, not a layout-shifting spinner swap.
- Touch targets ≥ 44pt.

## Buttons

| Variant            | Fill                       | Text                 | Use                                     |
| ------------------ | -------------------------- | -------------------- | --------------------------------------- |
| Primary            | copper `brand/primary`     | ink                  | The one main action per surface         |
| Secondary          | neutral border/fill        | bone or cyan         | Share, New class, secondary actions      |
| Inline action      | transparent, no border     | cyan + `+` prefix    | Add track, cue, move, or library item    |
| Ghost              | `bg/overlay`               | bone                 | Cancel, tertiary                         |
| Destructive        | transparent, no border     | ember + `error` icon | Remove/delete — icon mandatory           |

Radius `input` (12px); pills are reserved for chips and compact tags. Hover: primary brightens;
secondary/ghost controls lighten their neutral fill; destructive controls gain a subtle ember tint.
Pressed: a subtle depress
(`transform: translateY(1px)`). Disabled drops to 40% opacity and removes hover. Only one primary per
surface. **Plasma is never a button fill.**

## Chips & toggles

- **Filter/selection chips:** `pill` radius, `bg/raised`; selected = neutral structure + heavier weight.
  Cyan is appropriate when the chip is an operable control, but not as passive location decoration.
  Always show selection via shape + weight, not color alone. (`.chip[aria-pressed]`)
- **Segment tag:** pill, label-first with a small reinforcing tint dot. Schema keys retain their honest
  fallback labels (Warm-up/Climb/Sprint/Recovery/Cool-down). A reviewed discipline template or
  instructor-authored section name may override the visible label. Quiet. (`.segment-tag`)
- **Toggle/switch:** cyan when on, with knob position carrying state.

## Inputs

`input` radius, `bg/sunken` or `bg/raised` fill, `border/default`, label above in `label` token. Focus =
cyan ring. Error = ember border + `error` icon + message (never red border alone). Numeric inputs (BPM)
use the **Azeret Mono data face** with stepper affordances.

## BPM readout (the signature data component)

The product's hero value. Three sizes, all Azeret Mono / tabular:

- **Inline** (`data`) — in song rows and the editor.
- **Large** (`data-lg`) — timeline header, section totals.
- **Hero** (`data-hero`) — the Live HUD. In Live (and on the playing track) this is the surface that
  **pulses on `--rf-beat`** (see [`10-rhythm-system.md`](./10-rhythm-system.md)). Everywhere else it is
  static.

## Song row / track card

The signature list item. **Low noise** (see [`09-class-builder-guidelines.md`](./09-class-builder-guidelines.md)):

- Small album art (44pt, `control` radius) — a creative trigger, not a focal point.
- Title (`body-strong`) + artist (`body`, secondary).
- **BPM** in `data` (Azeret Mono), visually weighted — the planning-critical value.
- Drag grip for reorder; intensity indicator (zone bars) when assigned.
- States: default · hover (raise border) · selected (neutral surface/border plus the checked control or
  matching inspector heading) · dragging (`shadow.lifted` + slight scale) · **playing** (cyan dot with
  faint on-beat pulse on the play indicator only).

## Intensity indicator

Zone bars (0–4 filled) + zone number + name. Never bars-with-color alone. On song rows (compact = bars +
number), the detail editor (full = + name), and the ribbon. All-Out adds a plasma glow in Live / at
ribbon peaks — affect only, never the sole signal.

## IntensityRibbon (new — the energy arc)

The class's intensity over time as a slim continuous area graph along the timeline. **Height encodes
zone; gradient color reinforces** (copper → ember → plasma at peaks). Static (no per-frame animation);
recomputed on edit. Derived **hybrid**: a per-track baseline from `class_tracks.intensity`, refined where
placed moves carry `class_track_moves.intensity` at their `anchor_ms` — ships without new schema. (No
`class_tracks.anchor_ms` field exists; see the blend rule in
[`10-rhythm-system.md`](./10-rhythm-system.md) §4.) The most shareable view in the app.

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

- **Cue marker:** small, carries cue text on hover/expand; a brief static highlight confirms add.
- **Move marker:** distinct shape/icon from a cue (separate concepts); may carry intensity.
- Both anchored to a `class_track` by `anchor_ms`; both editable in the side detail panel.

## Navigation

- **Web:** responsive top header for launch surfaces: Library, Moves, and Builder.
- **iOS:** native bottom navigation for launch destinations, plus the in-class Timeline/Playlist toggle.
- Active tab: stronger label plus a quiet neutral underline/filled icon; inactive: quieter label/outline
  icon. Cyan is reserved for focus and controls, not persistent location.

## Overlays, sheets, dialogs

Glass surfaces, `panel` radius. Action sheets use the glass recipe with clearly separated options and a
distinct Cancel. Destructive options carry icons.

## Now-playing / Live HUD

Structured solid/glass surfaces over the dark Live ground, maximum-contrast text, `data-hero`/`display` type, current cue dominant, next cue
queued, BPM + timecode persistent **and pulsing on the beat**. The All-Out cue advance is the one "drop"
moment (plasma glow bloom, on-beat cross-fade). Minimal controls, large targets.

## Empty & error states

An empty screen is an invitation to act ("Add your first track"); an error states what happened and how
to fix it, in the interface's voice. Never vague, never an apology.

## Provider connection states

Music providers are core to trust. Catalog availability and user-account connection are different
capabilities and must not be conflated. Today, Spotify and Apple Music are catalog sources;
SoundCloud supports user connection and likes. For providers with a user-account integration,
connection state is always explicit — six states, never a silent failure (see brief §9.8). The label
and glyph carry meaning; color only reinforces (`.provider-state`):

| State          | Glyph | Color channel | Note                                    |
| -------------- | :---: | ------------- | --------------------------------------- |
| Connected      |   ✓   | cyan          | healthy link                            |
| Reconnecting   |   ↻   | cyan          | transient, in progress                  |
| Disconnected   |   !   | caution/amber | "Your music link dropped. Reconnect…"   |
| Session expired |  ⧖   | caution/amber | re-auth needed                          |
| Permission     |   ⊘   | danger/ember  | scope/permission missing                |
| Provider error |   ×   | danger/ember  | provider-side failure                   |

Every failure state pairs with an inline recovery action.

Catalog-only providers use an explicit `catalog available` label rather than a connected state.

Connected and reconnecting states are borderless icon + text. Warning and error states may opt into a
bordered container because the boundary helps communicate an actionable problem.

## Playback states (Live Mode & Builder preview)

<!-- note (Claude, 2026-07-03): Added with the first player UI slice, per the provider-playback plan. -->

Provider-authorized playback (D19) adds per-track playback verdicts on top of connection state. Same
rules: glyph + label carry meaning, color only reinforces, and every failure pairs with an inline
recovery action.

| State                                | Glyph | Color channel | Note                                          |
| ------------------------------------ | :---: | ------------- | --------------------------------------------- |
| Playback eligible                    |   ✓   | cyan          | "Plays on {provider}"                         |
| Premium required                     |   ⊘   | caution/amber | Spotify: connected ≠ playable                 |
| Subscriber authorization required    |   ⊘   | caution/amber | Apple Music: MusicKit re-authorize            |
| Playback unavailable                 |   ⊘   | caution/amber | no provider link / no connected provider / no duration — named, with the fix |
| Playback failure (runtime)           |   ⚠   | danger/ember  | mid-class stream/SDK failure — recoverable alert |

Preflight verdicts are pre-class and fixable, so they sit on the **caution** channel with the recovery
hint inline. A **runtime** playback failure mid-class is the danger channel: a `role="alert"` surface
offering retry / reconnect / provider handoff / continue-without-music. Provider handoff links exist
*only* inside that recovery surface — never as a primary or casual action.

### Player rail

Live Mode has a single RitmoFit control surface (transport: play/pause, reset, scrubber) plus a compact
playback rail chip that always states what the music is doing: `♪ {provider}` while playing,
`♪ Preparing {provider}…`, `♪ Silence` (intentional gaps), `♪ Paused`, `♪ Playback ended`,
`⚠ Playback error`, and `♪ Music off` in prompter-only mode. Silence must read as a choice, not a
mystery. No provider branding walls, no marketing player: this is a performance tool for an instructor
on stage. All transport controls stay keyboard accessible and visibly focused.

### Preflight screen

Shown before class start: each track resolves to a named connected provider (✓) or an unplayable
verdict with its fix. The primary action (`Start class`) enables only when every track passes;
`Run without music` (the prompter-only path) is always available and is a capability, not a fallback
to provider handoff.

## Icons

Use a consistent rounded icon family on web and SF Symbols on iOS. **Filled = active, outline =
inactive.** Custom RitmoFit movement icons are a later addition; until then use the closest standard
symbol.

## Implementation expectations (web MVP)

Build simple custom components first; avoid heavy UI frameworks. Tailwind with CSS variables mapped from
`tokens.json`. Components accept `className` for extension; semantic HTML; Radix primitives only when
accessibility demands it.
