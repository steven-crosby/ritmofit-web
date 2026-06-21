# Music Providers

**The most important file to read before building any music feature.** These are platform/legal
realities, not preferences. If a feature seems to require breaking one, **stop and flag it** rather
than designing around it. (These constraints are also summarized in the entry-point
`DEVELOPMENT_PLAN.md` because they shape everything.)

## The three hard constraints

### 1. No BPM from Spotify
Spotify deprecated the audio-features endpoint (which included tempo/BPM) for new applications in
**November 2024**. A backend built now cannot get BPM from Spotify's API. Competitors showing Spotify
BPM were likely grandfathered in or source it elsewhere — we cannot replicate that.

**Our approach:**
- **M1:** BPM is **manual entry** — `tracks.display_bpm`, with an optional per-class override
  `class_tracks.display_bpm_override`.
- **M2 (optional):** integrate a **third-party BPM provider**, or run analysis only on audio we're
  legally permitted to process. None assumed yet; to be chosen and verified.

> Always verify the current state of provider APIs before building against them — these terms change.

### 2. No in-app audio mixing or crossfade
The competitor screenshots imply an app that plays music and controls crossfade. We can't do that:
- Spotify's SDK doesn't permit DJ-style programmatic mixing/crossfading.
- SoundCloud's API terms are restrictive about full-track streaming in third-party apps.
- A web client especially cannot stream full Spotify tracks the way the native SDK can.
- "Crossfade (using Spotify settings)" in competitors most likely just **defers to the Spotify app's
  own crossfade setting** rather than mixing audio itself.

**Our approach:** RitmoFit is a **planning surface**. Actual audio plays through the user's own
Spotify / Apple Music / SoundCloud app. We deep-link / hand off to those apps for playback (via
`track_provider_ids.provider_uri`) and never stream or mix audio ourselves.

### 3. No caching of audio or platform-derived data
Both platforms prohibit caching track audio and most derived data.

**Our approach:** the backend stores only:
- **References** — provider track IDs / URIs (`track_provider_ids`).
- **Our own metadata** — classes, `class_tracks`, cues, moves, intensity, timeline, manual BPM.

We never store the audio or platform-derived analysis.

## Permanent non-goals (consequences of the above)

These follow directly from the three constraints and are **locked as decision D13**
([`decisions.md`](./decisions.md)) so they aren't re-proposed feature by feature:
**no in-app audio playback/streaming**, **no audio mixing/crossfade** (why free-placement rejects
overlaps), **no destructive audio editing** (trimming is a playback *window*, not a file edit — not a
DAW), and **no in-app audio analysis/decoding** (BPM is manual or third-party; the downbeat is
hand-marked). Decline or redesign requests that need one of these rather than scheduling them.

## What this means architecturally

- The "play" controls in the UI are **planning/preview affordances and hand-offs**, not a media engine
  we own.
- BPM is our own data (manual or third-party-sourced), never scraped from Spotify.
- The provider-agnostic track model (`tracks` + `track_provider_ids`) exists precisely so a class can
  hand off to whichever provider app the instructor opens live.
- SoundCloud is a core differentiator (independent/emerging artists Spotify and Apple Music cut off) —
  but its API terms still constrain us; treat its streaming rules as strict. It's the **first**
  provider integrated in M2.

## Credentials status

Client IDs/secrets exist for Spotify and SoundCloud, plus Apple sign-in and Apple Music keys. These are
**not used in M1** — provider integration is M2. Keep keys out of the codebase until then; document
required env vars as placeholders in `conventions.md`. When stored (M2), provider tokens live encrypted
in `music_connections` (`ENCRYPTION_KEY`) and are never returned to clients.

## Apple: two separate integrations

Keep these strictly separate in code and config:
1. **Sign in with Apple** — authentication (handled via Better Auth in M1).
2. **Apple Music / MusicKit** — a playback provider in `track_provider_ids` (M2).

Don't mix the Apple sign-in client/service IDs with the Apple Music developer token/key/team/key IDs.

## Workflow we're replacing

Today: build playlist in a provider app → import into a separate choreography app → choreograph →
switch to live mode. RitmoFit collapses the **planning and choreography** into one creative surface —
but "collapse the workflow" never means "violate the provider terms." **Playback remains with the
provider apps.**
