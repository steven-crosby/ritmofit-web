# 01 — Product Vision

## What RitmoFit is

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors.

It helps instructors synthesize the creative process of:

- discovering music
- building a playlist
- ordering tracks into a class arc
- choreographing moves
- writing coaching cues
- marking beat drops and transitions
- preparing a live mode that can be followed while teaching

## Primary user

The primary user is a rhythm spin cycle instructor who carefully plans 45–60 minute classes.

They currently use music apps such as Spotify, SoundCloud, or Apple Music to build playlists, then import those playlists into a separate app to choreograph and run classes.

That workflow is disjointed. RitmoFit should reduce interruptions to the instructor’s creative flow.

## Competitive inspiration

StructClub is a useful reference point for feature coverage:

- import playlists
- build classes
- associate songs with BPM
- add moves and cues
- track intensity
- reorder songs
- run classes live
- support class templates and team libraries later

RitmoFit should not blindly clone StructClub. RitmoFit should improve the creative workflow by combining playlist assembly, choreography, and live-readiness in one place.

## Product principle

RitmoFit is not only a playlist import tool.

RitmoFit is a class programming workspace.

The backend owns the class. Music providers supply metadata and playback links.

## Web app role

The web app is the planning environment.

It should be optimized for:

- laptop and desktop use
- larger screens
- fast editing
- multiple panels
- drag-and-drop ordering
- search and import workflows
- detailed cue editing
- longer creative planning sessions

## Future iOS app role

The iOS app will be the live class-running environment.

It should be optimized for:

- glanceable information
- low eye strain
- quick navigation during class
- displaying current/next track
- displaying cues at the right time
- reliable offline/cache-ready class payloads

## Initial MVP definition

An instructor can:

1. Sign in.
2. Create a class.
3. Search/import SoundCloud metadata or add a manual/mock track.
4. Add tracks to an ordered timeline.
5. Reorder tracks.
6. Set display BPM, segment, intensity, and notes per track.
7. Add timestamped cues and moves.
8. Save the class.
9. Fetch the class through a stable run-payload API for future iOS use.

## Out of scope for v1

- Team libraries
- Marketplace
- Paid featured classes
- Collaborative editing
- Embedded full music streaming
- Audio hosting
- Complex AI recommendations
- Public creator profiles
