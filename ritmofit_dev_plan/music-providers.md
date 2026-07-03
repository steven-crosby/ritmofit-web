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
- BPM is **our own data** — `tracks.display_bpm`, with an optional per-class override
  `class_tracks.display_bpm_override`.
- Optional tempo lookup must use a permitted third-party BPM provider or audio we are legally allowed to
  process. Never source BPM from Spotify.

> Always verify the current state of provider APIs before building against them — these terms change.

### 2. Provider-authorized playback only; no audio mixing or crossfade
RitmoFit may play music inside the web app only by controlling official provider SDKs/widgets:

- Spotify Web Playback SDK / Connect playback for an authorized Premium user.
- Apple Music MusicKit on the Web for an authorized subscriber.
- SoundCloud's official embedded Widget API / provider-approved playback surface.

That is not the same as owning a media engine. The competitor screenshots imply an app that controls
crossfade or DJ-style playback. We can't do that:

- Spotify's SDK doesn't permit DJ-style programmatic mixing/crossfading.
- SoundCloud's API terms are restrictive about full-track streaming outside approved embeds/widgets.
- "Crossfade" in other products most likely defers to provider-owned behavior rather than mixing audio
  itself.

**Our approach:** RitmoFit is a choreography + live-class surface with a single player UI. The player
adapts to provider-specific playback underneath, while provider SDKs/widgets own the audio stream,
authorization, subscription checks, and availability. RitmoFit never downloads, proxies, caches,
re-hosts, mixes, crossfades, beatmatches, decodes, or analyzes provider audio.

### 3. No caching of audio or platform-derived data
Both platforms prohibit caching track audio and most derived data.

**Our approach:** the backend stores only:
- **References** — provider track IDs / URIs (`track_provider_ids`).
- **Our own metadata** — classes, `class_tracks`, cues, moves, intensity, timeline, manual BPM.

We never store the audio or platform-derived analysis.

## Permanent non-goals (consequences of the above)

These follow directly from the three constraints and are **locked as decision D13**
([`decisions.md`](./decisions.md)) so they aren't re-proposed feature by feature:
**no RitmoFit-owned audio playback/streaming**, **no audio mixing/crossfade** (why free-placement
rejects overlaps), **no destructive audio editing** (trimming is a playback *window*, not a file edit —
not a DAW), and **no in-app audio analysis/decoding** (BPM is manual or third-party; the downbeat is
hand-marked). Decline or redesign requests that need one of these rather than scheduling them.

## What this means architecturally

- The "play" controls in the UI drive a RitmoFit class timeline and provider-specific playback adapters;
  they do not make RitmoFit a media engine or audio host.
- BPM is our own data (manual or third-party-sourced), never scraped from Spotify.
- The provider-agnostic track model (`tracks` + `track_provider_ids`) exists so a class can choose the
  best playable provider per track. Mixed-provider classes are allowed.
- SoundCloud is a core differentiator (independent/emerging artists Spotify and Apple Music cut off) —
  but its API terms still constrain us; treat its streaming rules as strict.
- Live Mode owns the class timeline. Provider adapters own track playback and must support preflight,
  clipped start/end windows, auto-advance, and explicit unavailable/auth/subscription states.

## Credentials status

Provider, auth, playback, and tempo credentials are provisioned independently. Keep all keys out of the
codebase; production values live in Cloudflare Worker secrets and local values live in ignored
`.dev.vars`. `deployment-runbook.md` is the operational source of truth for which production secrets are
currently set or intentionally deferred. Provider tokens live encrypted in `music_connections`
(`ENCRYPTION_KEY`) and are not returned to clients except for deliberately scoped, short-lived browser
playback credentials required by an official SDK. Those playback credentials must never be logged,
persisted, or used for catalog/BPM shortcuts.

Apple key material is used in two separate Worker-signed JWT flows:

- **Sign in with Apple:** `APPLE_CLIENT_ID` (web Services ID) + `APPLE_TEAM_ID` +
  `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY` produce the Better Auth client-secret JWT. Static
  `APPLE_CLIENT_SECRET` is only a fallback.
- **Apple Music API:** `APPLE_MUSIC_TEAM_ID` + `APPLE_MUSIC_KEY_ID` +
  `APPLE_MUSIC_PRIVATE_KEY` produce the MusicKit developer token. Static
  `APPLE_MUSIC_DEVELOPER_TOKEN` is only a fallback.

## Apple: two separate integrations

Keep these strictly separate in code and config:
1. **Sign in with Apple** — authentication (handled via Better Auth).
2. **Apple Music / MusicKit** — a playback provider in `track_provider_ids`.

Don't mix the Apple sign-in client/service IDs with the Apple Music developer token/key/team/key IDs.

## Workflow we're replacing

Today: build playlist in a provider app → import into a separate choreography app → choreograph →
switch to live mode. RitmoFit collapses the **planning and choreography** into one creative surface —
and now aims to collapse live playback control into that same surface through official provider
playback. "Collapse the workflow" never means "violate the provider terms": providers still own the
audio, and RitmoFit owns the class timeline.

## Current playback implementation plan

The active implementation plan lives in
[`provider-playback-implementation.md`](./provider-playback-implementation.md). Read it before changing
Live Mode, provider OAuth scopes, provider token routes, track clipping, or any player UI.
