# 09 — Class Builder Guidelines

The class builder is the heart of the web app and the place the design system earns its keep. It's where
"playlist building + choreography as one act" becomes real.

## Layout: timeline-first, energy ribbon on top, detail on the side

```
┌───────────────────────────────────────────────┬─────────────────────┐
│  CLASS HEADER  (title · template · duration)   │   DETAIL EDITOR      │
├───────────────────────────────────────────────┤   (selected track)   │
│  ENERGY RIBBON  ╱‾‾╲      ╱‾‾‾╲   ╱╲           │                      │
│                ╱    ╲____╱     ╲_╱  ╲___        │   Intensity (zones)  │
│  TIMELINE  ── playhead ──────────────────────  │   Moves              │
│  [ block ][ block ][block][ block ]            │   Cues (anchored)    │
│   cue▲   move◆      cue▲                        │   Display BPM (mono) │
├───────────────────────────────────────────────┤   Duration           │
│  TRACK LIST                                     │                      │
│  ▤ Baianá        Bakermat        122 BPM  ⋮⋮    │   [Preview in …]     │
│  ▤ Shake It      TroyBoi         155 BPM  ⋮⋮    │                      │
│  ▤ Con Calma     Daddy Yankee     94 BPM  ⋮⋮    │                      │
└───────────────────────────────────────────────┴─────────────────────┘
```

Main column = energy ribbon + timeline + ordered track list. Right = the selected track's editor. Keep it
a **creative workstation, not a DAW** — no Adobe-Premiere density yet. A dense mode can come later.

The class title is an unboxed workbench heading: title + actions, then operational metrics, then a quiet
save/provider line. The ribbon is the first contained product artifact. At 1180px and below, the class
archive collapses into a compact toolbar with count, active-class select, and inline “+ Add from Library”
action; it must not become a large preamble before the work.

## The energy ribbon (the signature planning view)

Pinned above the timeline: the class's **intensity over time** as a continuous area graph. This is the
view that makes RitmoFit feel like a rhythm tool instead of a track list.

- **Height encodes zone**; gradient color (copper → ember → plasma at peaks) reinforces. Reads in
  grayscale (see [`07-accessibility.md`](./07-accessibility.md)).
- **Derived (hybrid), no new schema:** the **baseline** is each track's `class_tracks.intensity`,
  positioned along the timeline by `position` / derived `start_offset_ms`; where **placed moves** carry
  their own intensity (`class_track_moves.intensity` at `anchor_ms`), the curve is **refined** within
  that track. (Note: `anchor_ms` lives on cues/placed-moves, _not_ on `class_tracks` — the baseline
  comes from the per-track value, the detail from the placements.) Editing either reshapes the ribbon
  immediately.
- It's the most shareable artifact in the product: an instructor can see and screenshot the _shape_ of
  their class. Full spec: [`10-rhythm-system.md`](./10-rhythm-system.md) §4.

## Song row — eliminate noise (the explicit brief)

StructClub's album art is too large and tells the instructor little about _how to use_ a track. So:

- **Album art is small** (44pt) — a creative trigger, not a focal point.
- **BPM is visually weighted**, in the **Azeret Mono data face** — the value instructors plan against.
- Title (`body-strong`) + artist (`body` secondary), truncated cleanly.
- Intensity shown as **zone bars + number** once assigned (not color alone).
- Drag grip for reorder; whole row is the selection target.
- The currently-playing row's indicator carries the **subtle on-beat pulse** — nothing else in the row
  moves.
- No redundant metadata, no oversized artwork, no decorative chrome. Every element earns its place.
- Default rows are transparent with subtle separators; selected rows use a neutral raised fill. Cyan is
  reserved for playback and focus, not a full selection enclosure.

## What to preserve from StructClub

Song cards, BPM visibility, class sections, movement/cue language, live-class readability, playlist import
workflow, overall simplicity — all kept.

## What to clearly improve

- **Less disjointed playlist building** — building the playlist _is_ building the class; no separate
  import step in the mental model.
- **Better desktop planning** — side-by-side ribbon + timeline + editor, keyboard workflows, room to
  audition.
- **Stronger SoundCloud support** — a first-class provider, not an afterthought.
- **Better visual hierarchy** — BPM/structure/energy-shape forward, artwork quiet.
- **Less fragile provider connection** — clear connected/disconnected states, never a dead end.
- **Cleaner, more alive live mode** — maximum-contrast, glanceable, minimal chrome, on the beat.

## Cues vs moves (separate concepts)

Reflect the schema: **cues** and **moves** are distinct, both anchored to a `class_track` by `anchor_ms`
(+ optional beat/bar). On the timeline they get **distinct shapes/icons**, not just colors. The detail
editor edits them in separate sections. (Beat-snapping of `anchor_ms` is a flagged future extension of the
tempo system — not v1.) The cue-color picker draws from the tag palette and **excludes the plasma range**
(see [`02-color-system.md`](./02-color-system.md)) — plasma stays rationed to peak affect.

**Moves come from a library.** A placed move (`class_track_moves`) references a reusable move from the
**move library** (`moves`, grouped by the `template` enum: cycle / hiit / sculpt / tread), a personal
**user move** (`user_moves`), or a one-off `name_override` — see [`mockups/moves.html`](./mockups/moves.html).
The inspector **types each placed move by its template** and shows its own intensity; moves stay **icon +
label led and color-neutral** (token `color.move.tint`), so a move never competes with the copper cue
channel or the intensity ramp. This is where the product's _movement-first_ claim becomes concrete instead
of one generic marker.

## Intensity in context

Zone display (Zone 1–4 + None; Build/Push/Attack/All Out) backed by the fixed enum. Zone number + bars +
name in the editor; number + bars on compact rows. The selected editor option uses a neutral fill plus a
3px cyan bottom indicator, while `aria-pressed` and the textual summary carry state. All-Out shows the
plasma glow in Live and at ribbon peaks.

## Segments

Segments band the timeline with icon + label and a quiet tint, _under_ the energy ribbon. Existing
`segmentType` keys retain their schema-honest fallbacks (Warm-up, Climb, Sprint, Recovery, Cool-down).
A reviewed discipline template or instructor-authored section name may override the visible label. The
band supports class structure and must not compete with the intensity ribbon.

## States that matter here

- **Empty class:** "Start with a track. Shape the room from there." — an invitation with a clear path
  to Library, search, or import.
- **Provider disconnected:** explain what broke and how to reconnect; never a silent failure.
- **Unsaved/unsynced:** caution state (amber + icon), with the save confirmation microinteraction on
  resolve.
- **Reordering:** lifted card; positions settle with `snap`.
- **Playing:** subtle on-beat pulse on the row indicator; ribbon playhead tracks position.

## Avoid

Huge album art in the timeline · dense spreadsheet-only design · unnecessary decoration · the two-orb
background gradient · plasma at rest outside the Zone 4 ribbon peak · red/green-only state meanings · complex collaboration UI
in v1 · marketplace/team features in v1.
