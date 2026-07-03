# Overview

## What we're building

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors. **Two complete,
co-equal surfaces of one product** ("Spotify for instructors"), one backend:

- **Web app** — every instructor capability on a browser: audition tracks across providers, assemble
  and choreograph a class (cues, moves, intensity, timeline), *and* run it live (a laptop or tablet at
  the front of the room — including the iPad/Android tablets the iPhone-only iOS app can't serve).
- **iOS app** (separate repo) — the same complete loop in a native iPhone idiom: build/choreograph and
  run a class live (cue prompter in time with the music, interval countdowns, intensity readouts).

Both surfaces do **everything**, each in its platform's native idiom; a surface may *lean* toward a
context (web at a desk, iOS in the room) but is never capability-limited. Both read and write the same
data through the backend in this repo — a class built on web opens on iOS unchanged, and vice versa.
The parity principle is locked as **D18**; the gate + current parity backlog live in
[`web-ios-parity.md`](./web-ios-parity.md).

Current sequence (2026-07-02): the web app's launch gate is green and deployed (everything in this
folder was launch-required except Explore feature expansion and Teams feature expansion). The active
web track is the provider-authorized playback initiative
([`provider-playback-implementation.md`](./provider-playback-implementation.md)); wrapping the iOS app
against the same backend contract and parity backlog is queued behind it.

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

RitmoFit is a **planning + choreography + provider-authorized playback surface**, not an audio host or
audio editor. These are **permanent non-goals** (locked as decision **D13** in
[`decisions.md`](./decisions.md), rooted in the provider terms in
[`music-providers.md`](./music-providers.md)) — decline or redesign requests that need them rather than
scheduling them:

- **No RitmoFit-owned audio playback / streaming** — in-app playback may only use official provider
  SDKs/widgets; providers own the audio stream, authorization, subscription checks, and availability.
- **No audio mixing / crossfade** — a class is one timeline (this is why free placement rejects overlaps).
- **No destructive audio editing** — "trimming" is a per-class playback *window*, not a file edit; this
  is not a DAW.
- **No in-app audio analysis / decoding** — BPM is manual or from a third-party tempo service; the beat
  downbeat is hand-marked.

The granularity work (trim / beat-snap / free placement) deepens *choreography* control and stops
short of audio production on purpose — see [`editing-granularity-scoping.md`](./editing-granularity-scoping.md).

## Why SoundCloud matters

SoundCloud is a core differentiator: it carries independent and emerging artists that Spotify and Apple
Music don't. The provider-agnostic track model (one track, many provider IDs) is what lets a class play
back on the best available connected provider per track — including SoundCloud. It's the **first** provider
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
