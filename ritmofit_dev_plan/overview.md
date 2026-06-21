# Overview

## What we're building

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors. Two clients,
one backend:

- **Web app** — the planning surface. Instructors sit at a laptop, audition tracks across providers,
  assemble a class, and choreograph it (cues, moves, intensity, timeline).
- **iOS app** — the live surface (separate repo). Instructors run the class in front of a room: a cue
  prompter in time with the music, interval countdowns, intensity readouts.

Both read and write the same data through the backend in this repo. A class built on web opens on iOS
unchanged, and vice versa.

## Who the user is

A rhythm spin instructor who:

- Programs classes around music — track order, energy arc, and the moves/cues that ride on top of
  specific moments in each song ("tag a cue to the beat-drop").
- May freelance across multiple studios (hence many-to-many teams).
- Wants to share a class with a colleague or a whole studio — the way you share a Google Drive folder —
  without giving up ownership.
- Uses Spotify, Apple Music, or SoundCloud for actual playback, possibly different services at
  different studios.

## The problem we're solving

The status-quo workflow is disjointed:

1. Build a playlist in Spotify / Apple Music / SoundCloud.
2. Import it into a separate choreography app (e.g. StructClub).
3. Choreograph cues and moves there.
4. Switch to a "live" mode to lead the class.

Each handoff interrupts creative flow. RitmoFit's goal is to **synthesize playlist-building,
choreography, and live performance into one continuous creative process** — not three apps stapled
together.

The design consequence: we do **not** model "an imported playlist" as a separate thing from "a class."
The class *is* the ordered set of tracks plus the choreography layered on them. A track inside a class
(`class_track`) is a first-class item carrying its own cues, moves, and intensity — it points at a
provider track, but it isn't merely "a row imported from Spotify."

## What we're explicitly NOT building

RitmoFit is a **planning + choreography surface**, not a player or an audio editor. These are
**permanent non-goals** (locked as decision **D13** in [`decisions.md`](./decisions.md), rooted in the
provider terms in [`music-providers.md`](./music-providers.md)) — decline or redesign requests that need
them rather than scheduling them:

- **No in-app audio playback / streaming** — playback hands off to the instructor's provider app.
- **No audio mixing / crossfade** — a class is one stream (this is why free placement rejects overlaps).
- **No destructive audio editing** — "trimming" is a per-class playback *window*, not a file edit; this
  is not a DAW.
- **No in-app audio analysis / decoding** — BPM is manual or from a third-party tempo service; the beat
  downbeat is hand-marked.

The granularity work (trim / beat-snap / free placement) deepens *choreography* control and stops
short of audio production on purpose — see [`editing-granularity-scoping.md`](./editing-granularity-scoping.md).

## Why SoundCloud matters

SoundCloud is a core differentiator: it carries independent and emerging artists that Spotify and Apple
Music don't. The provider-agnostic track model (one track, many provider IDs) is what lets a class play
back on whichever service the instructor opens live — including SoundCloud. It's the **first** provider
in M2, ahead of Spotify/Apple Music.

## Reference point: StructClub

The competitor whose capabilities we match and improve on. Observed features:

- Class templates (cycle, HIIT, sculpt, tread).
- Song tagging with exercises, cues, intensity, colors.
- Cues tagged to the beat-drop.
- BPM readout (their source is unverified; **we cannot replicate Spotify BPM** — see
  [`music-providers.md`](./music-providers.md)).
- Cue prompter in time with music; interval countdown timer.
- "Crossfade (using Spotify settings)" — i.e. defers to the Spotify app's own crossfade, does **not**
  mix audio itself.
- Share classes; team libraries; copy/paste tracks across classes *with* their cue tags.
- Reorder playlists; add tracks to existing classes.
- Explore feed where classes can be featured.

**Where we improve on it:** the sharing model. Ownership stays with one user; sharing is layered on top
(Google Drive style) rather than classes living inside team libraries. And the *energy-arc* view of a
class (see the design system) makes the shape of a class legible in a way a flat track list isn't.
