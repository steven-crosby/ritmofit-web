# 10 — The Rhythm System (signature)

This is the document that makes RitmoFit _RitmoFit_. Everything else is a well-built dark workstation;
this is the soul. The thesis from [`01-design-principles.md`](./01-design-principles.md): **the interface
keeps time.** Tempo is not a theme or a decoration — it is a design material with its own token, used
deliberately and rationed hard.

## 1. Tempo as a token

A class is a sequence of tracks, each with a BPM. We expose the _current_ BPM as a runtime CSS variable
and derive a beat duration from it:

```css
/* Set per playing track, updated when the track changes */
:root {
  --rf-bpm: 122;
}

/* Derived once, used everywhere a pulse syncs */
--rf-beat: calc(60s / var(--rf-bpm, 120)); /* 122 BPM -> ~0.4918s per beat */
```

On iOS the equivalent is a `beatDuration = 60.0 / bpm` published to the view tree. Same concept, native
grammar.

### 1a. Missing tempo is a readiness state, not quiet metadata

A track without a confirmed BPM still has a tempo state. If a manual value or approved tempo-provider
result exists, show it as confirmed. If the system can only make an existing-data estimate, show a
**provisional BPM** with `~`, an icon, and an `auto` label on the **caution channel**. The pulse may use
confirmed BPM; a provisional BPM can populate rows, averages, and the Live at-rest display, but it must
be visibly refinable before the instructor relies on it.

If no tempo value exists at all, the pulse is simply off (exactly as under reduced motion, §6), timers
and cues stay fully legible, and the fix ("Add BPM so the class keeps time") is one tap away. Missing or
provisional tempo is **surfaced as readiness**, never buried as small print — in the builder as the tempo
dimension of the readiness panel, and in Live as supporting status under an affirmative ready state.
Tempo warnings never block a run on their own; only missing durations do that. Never obtain BPM from
Spotify: manual BPM or the dedicated tempo-provider path only.

## 2. Where it pulses (the entire allowlist)

The pulse is **scarce on purpose.** It appears in exactly two places:

| Surface                                                       | Treatment                                                                                | Intensity  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| **Live HUD** — the big `data-hero` BPM + the current-cue card | scale `1.0 → 1.06` + a soft luminance breath, one cycle per `--rf-beat`, `onBeat` easing | pronounced |
| **The currently-playing track** in the planning timeline      | scale `1.0 → 1.03` + a faint border-luminance breath on the play indicator               | subtle     |

That's it. Two surfaces. The pulse is a _focus_ device — it marks "this is happening now, at this tempo"
— not an ambient mood.

## 3. Where it must never appear

- Not on dense planning surfaces, lists, forms, or the track editor at rest.
- Not as an ambient background animation, parallax, or looping shimmer.
- Not on more than one element per screen at a time.
- Not in Search or Edit mode at all (`mode.*.tempo: off`).
- Not when `prefers-reduced-motion` / iOS Reduce Motion is set (see §6).
- Not on marketing/share/sign-in surfaces. Their composition is static; the pulse allowlist stays
  exactly two surfaces.

If a reviewer can find a second pulsing thing on screen, one of them is wrong.

## 4. The energy arc (the class has a shape)

The other half of the rhythm system is structural, not animated: the **intensity ribbon**. A class is
not just an ordered list — it's an _energy curve_ with a beginning, build, peak, recovery, and release.
Those words describe the arc, not persisted segment enums. We render the curve as a slim continuous area
graph pinned along the top of the timeline.

- **Height encodes zone** (`none`→`all_out`); color rides on top from the ribbon gradient (copper → ember
  → a plasma kiss at peaks). Read it in grayscale and the shape still reads — the height carries it.
- It is the single most _shareable_ and most _RitmoFit_ view in the product. An instructor can see — and
  screenshot — the shape of their class at a glance.
- It is **derived from data you already have** — no new schema to ship a first version. (Segment
  _banding_ under the ribbon builds on the `class_sections` model.) See the blend rule below.
- Editing a track's intensity (or a placed move's) reshapes the ribbon live. The ribbon _is_ the
  choreography summary.
- It is **alive at rest**. A class with tracks but no hand-authored shaping still renders a provisional
  non-flat shape: derive a baseline from `class_track.intensity`, `position` / derived
  `start_offset_ms`, and `duration_ms`; when every track carries the same stored intensity, use
  documented position/section/duration assumptions to produce a warm-up → build → peak → release draft.
  Mark the draft provisional with caution + icon + label and provide an Auto-shape / refine affordance.

**The blend rule (hybrid).** The ribbon has two inputs, both already in the schema:

1. **Baseline** — each `class_track.intensity` gives one zone for the whole track, laid out along the
   timeline by `position` (and the M1-derived `start_offset_ms`). A class with only per-track intensity
   set renders as a clean **staircase**.
2. **Refinement** — where a track has **placed moves** carrying intensity (`class_track_moves.intensity`
   at `anchor_ms`), those points shape the curve _within_ that track's span, so a single track can rise
   and fall. Tracks with no placed-move intensity keep the flat baseline.

Important: `anchor_ms` lives on **cues/placed-moves**, never on `class_tracks` — so the baseline is the
per-track value and the intra-track detail comes from placements. Don't reach for a `class_tracks.anchor_ms`
field; it doesn't exist. The ribbon is a path computed per edit, not per frame (see §7).

**Derivation discipline.** Provisionals come only from fields already present in the class payload:
`class_track.intensity`, order, `position` / derived `start_offset_ms`, `duration_ms`, `class_sections`,
placed-move intensity, and manual or approved tempo-provider BPM. Do not infer BPM from Spotify and do
not invent hidden fields. Where a better persisted field is missing, leave a TODO in implementation notes
instead of pretending the data exists.

## 5. The one "drop"

Motion budget is mostly spent on nothing — the system is quiet. The single exception, the place we
deliberately spend it, is the **All-Out cue advance in Live mode**: a cross-fade timed to land _on the
beat_, with a brief plasma glow bloom (`shadow.peak-glow`) behind the cue card. This is the design
equivalent of the drop in a track. It happens a handful of times per class and it should feel earned.

## 6. Reduced motion (mandatory, non-negotiable)

Tempo is motion, and motion is optional for the user — never the other way around.

- Under `prefers-reduced-motion: reduce` (web) or iOS Reduce Motion: **the pulse is removed entirely.**
- The playing state falls back to a **static filled indicator + label** ("Now playing") — fully legible,
  no animation.
- The energy ribbon is **unaffected** — it's a static graph, not motion, and remains the accessible way
  to read class shape.
- The "drop" cross-fade degrades to an instant, glow-free state change.

A user who turns off motion loses zero information. They lose only affect. That is the correct trade.

## 7. Performance

- Animate **transform and box-shadow/opacity only** — never width/height/top — to hold 60fps on both
  platforms while a class runs.
- The pulse is a single keyframe loop whose `animation-duration` is the `--rf-beat` variable; changing
  tracks updates `--rf-bpm` and the loop retimes. No JS rAF loop required on web.
- The ribbon is an SVG/Canvas path computed once per edit, not per frame.

## 8. Future (flagged, not built)

- **Beat-grid snapping** for cue placement (snap `anchor_ms` to the nearest beat at the track's BPM) is a
  natural extension of the tempo token — but it touches editing logic, so it's a later milestone, not a
  v1 visual.
- **Audio-reactive** anything (real waveform analysis) is explicitly _out_ — the pulse comes from the
  known BPM, not from listening to audio. Cheaper, deterministic, and reduced-motion-safe.
