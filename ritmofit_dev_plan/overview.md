# Overview

## What we're building

Ritmo Studio helps **individual rhythm fitness instructors** build, choreograph, organize, rehearse, and
run their own classes in one continuous creative flow. The current core disciplines are rhythm cycle,
Pilates, and HIIT.

The current product is **solo-first**. We perfect the individual creator experience until instructors
naturally want to share, publish, and collaborate. Community comes later because the solo workflow has
earned it, not because the app assumes it.

- **Web app** — the product-definition surface for the individual instructor loop: choose or shape a
  class idea, audition tracks across providers, assemble and choreograph the class, keep a personal
  library, rehearse, and run Live Mode from a browser.
- **Backend** — the source of truth for accounts, classes, choreography, tracks, moves, provider
  references, and run payloads. The later iOS refinement should consume the same backend after the web
  loop is proven.

The web app is a **creator workstation shell over trusted music services (D21)**: Spotify, Apple Music,
and SoundCloud are the reliable substrate, and provider libraries are the raw material a class is built
from. The instructor should be able to **browse provider libraries, open liked tracks and playlists like a
music app, and preview/listen while building**, then convert that curiosity into a class — *familiar before
specialized*, with no single forced creation flow. Ritmo's durable value is the instructor layer on top:
class structure, choreography, rehearsal, playback windows, readiness, and Live Mode.

Current sequence (2026-07-06): the web app's launch gate is green and deployed. The active track is solo
creator refinement — currently the **creator-workstation-shell slice (D21)**: Cycle/Pilates/HIIT
templates, a music-discovery resting state, provider shelves with liked/saved cards, and playlist detail
views — plus the provider-authorized playback initiative
([`provider-playback-implementation.md`](./provider-playback-implementation.md)) where it improves
rehearsal and Live Mode. Teams, Sharing, Publish, and Explore are dormant/deferred.

## Who the user is

A rhythm fitness instructor who:

- Programs classes around music — track order, energy arc, and the moves/cues that ride on top of
  specific moments in each song ("tag a cue to the beat-drop").
- Teaches formats such as cycle, Pilates, and HIIT, each with its own class formats, durations, energy
  arcs, and movement language.
- Needs a personal, synced class workspace that feels as direct as using Apple Notes on a phone or
  desktop: accounts and cloud sync matter, but multi-user collaboration does not define the current
  product.
- Uses Spotify, Apple Music, or SoundCloud for actual playback, possibly different services at
  different studios.

## The problem we're solving

The status-quo workflow is disjointed:

1. Build a playlist in Spotify / Apple Music / SoundCloud.
2. Import it into a separate choreography app (e.g. StructClub).
3. Choreograph cues and moves there.
4. Switch to a "live" mode to lead the class.

Each handoff interrupts creative flow. Ritmo Studio's goal is to **synthesize playlist-building,
choreography, rehearsal, and live performance into one continuous creative process** — not three apps
stapled together.

Do not make that creative process too stringent. One instructor may begin with "I have a standard
45-minute class on Monday"; another may begin with "I need a Burn 30-minute ride"; another may start
from a song, a move, a climb, or a target energy arc. The product should help them find the right songs,
choreograph, rehearse, and run the class without forcing one canonical order.

The design consequence: we do **not** model "an imported playlist" as a separate thing from "a class."
The class *is* the ordered set of tracks plus the choreography layered on them. A track inside a class
(`class_track`) is a first-class item carrying its own cues, moves, and intensity — it points at a
provider track, but it isn't merely "a row imported from Spotify."

## What we're explicitly NOT building

Ritmo Studio is a **planning + choreography + provider-authorized playback surface**, not an audio host or
audio editor. These are **permanent non-goals** (locked as decision **D13** in
[`decisions.md`](./decisions.md), rooted in the provider terms in
[`music-providers.md`](./music-providers.md)) — decline or redesign requests that need them rather than
scheduling them:

- **No Ritmo Studio-owned audio playback / streaming** — in-app playback may only use official provider
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

**Where we improve on it now:** solo creative continuity. Ritmo Studio's current job is to make class
planning, song choice, choreography, rehearsal, and live prompting feel like one personal workspace. The
*energy-arc* view of a class (see the design system) makes the shape of a class legible in a way a flat
track list isn't. Sharing, teams, publishing, and Explore remain observed competitor capabilities and
retained scaffolding, but they are not current product surfaces.
