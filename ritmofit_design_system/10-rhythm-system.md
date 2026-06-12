# 10 — The Rhythm System (signature)

This is the document that makes RitmoFit *RitmoFit*. Everything else is a well-built dark workstation;
this is the soul. The thesis from [`01-design-principles.md`](./01-design-principles.md): **the interface
keeps time.** Tempo is not a theme or a decoration — it is a design material with its own token, used
deliberately and rationed hard.

## 1. Tempo as a token

A class is a sequence of tracks, each with a BPM. We expose the *current* BPM as a runtime CSS variable
and derive a beat duration from it:

```css
/* Set per playing track, updated when the track changes */
:root { --rf-bpm: 122; }

/* Derived once, used everywhere a pulse syncs */
--rf-beat: calc(60s / var(--rf-bpm, 120));   /* 122 BPM -> ~0.4918s per beat */
```

On iOS the equivalent is a `beatDuration = 60.0 / bpm` published to the view tree. Same concept, native
grammar.

## 2. Where it pulses (the entire allowlist)

The pulse is **scarce on purpose.** It appears in exactly two places:

| Surface | Treatment | Intensity |
|---|---|---|
| **Live HUD** — the big `data-hero` BPM + the current-cue card | scale `1.0 → 1.06` + a soft luminance breath, one cycle per `--rf-beat`, `onBeat` easing | pronounced |
| **The currently-playing track** in the planning timeline | scale `1.0 → 1.03` + a faint border-luminance breath on the play indicator | subtle |

That's it. Two surfaces. The pulse is a *focus* device — it marks "this is happening now, at this tempo"
— not an ambient mood.

## 3. Where it must never appear

- Not on dense planning surfaces, lists, forms, or the track editor at rest.
- Not as an ambient background animation, parallax, or looping shimmer.
- Not on more than one element per screen at a time.
- Not in Search or Edit mode at all (`mode.*.tempo: off`).
- Not when `prefers-reduced-motion` / iOS Reduce Motion is set (see §6).

If a reviewer can find a second pulsing thing on screen, one of them is wrong.

## 4. The energy arc (the class has a shape)

The other half of the rhythm system is structural, not animated: the **intensity ribbon**. A class is
not just an ordered list — it's an *energy curve*, warm-up valley → climbs → sprint peaks → cool-down
descent. We render that curve as a slim continuous area graph pinned along the top of the timeline.

- **Height encodes zone** (`none`→`all_out`); color rides on top from the ribbon gradient (copper → ember
  → a plasma kiss at peaks). Read it in grayscale and the shape still reads — the height carries it.
- It is the single most *shareable* and most *RitmoFit* view in the product. An instructor can see — and
  screenshot — the shape of their class at a glance.
- It is **derived from data you already have**: `class_tracks.intensity` + `anchor_ms`. No new schema
  required to ship a first version. (Segment *banding* under the ribbon waits for `class_sections`.)
- Editing a track's intensity reshapes the ribbon live. The ribbon *is* the choreography summary.

## 5. The one "drop"

Motion budget is mostly spent on nothing — the system is quiet. The single exception, the place we
deliberately spend it, is the **All-Out cue advance in Live mode**: a cross-fade timed to land *on the
beat*, with a brief plasma glow bloom (`shadow.peak-glow`) behind the cue card. This is the design
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
- **Audio-reactive** anything (real waveform analysis) is explicitly *out* — the pulse comes from the
  known BPM, not from listening to audio. Cheaper, deterministic, and reduced-motion-safe.
