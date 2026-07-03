# Provider-Authorized Playback Implementation Plan

<!-- note (Codex, 2026-07-02): Created from the RitmoFit player planning session. -->
<!-- note (Claude, 2026-07-02): Doc audit pass — added the prod connect-exchange prerequisite and design-system playback states. -->
<!-- note (Claude, 2026-07-03): Connect prerequisite marked completed (Worker 94126954); marked the built playback-layer modules in Architecture; recorded Live Mode wiring status. -->

## Goal

Build one RitmoFit player experience for web Live Mode and Builder preview while keeping provider audio
provider-owned. Instructors should not be sent to SoundCloud, Apple Music, or Spotify as the normal
class-running path. RitmoFit controls the class timeline, playback windows, choreography prompts, and
provider choice; provider SDKs/widgets control the actual audio stream and authorization.

This is a product-direction update to the older "handoff-only" docs. The boundary is now:

- Allowed: official provider-authorized in-app playback control.
- Still forbidden: downloading, proxying, caching, re-hosting, remixing, mixing, crossfading,
  beatmatching, decoding, analyzing, or creating derivative provider audio.
- Still forbidden: BPM from Spotify. BPM remains manual or from a dedicated permitted tempo provider.
- Still forbidden: destructive song edits. Shortening a song means a saved playback window/cue range.

## Existing Foundation

The data model already has the right non-destructive shortening primitive:

- `class_tracks.clip_start_ms`
- `class_tracks.clip_end_ms`
- `RunPayloadTrackEntry.clipStartMs`
- effective clipped `RunPayloadTrackEntry.track.durationMs`

For provider playback:

```ts
const providerStartMs = entry.clipStartMs;
const providerEndMs = entry.clipStartMs + (entry.track.durationMs ?? 0);
```

No schema migration is expected for playback windows. If a future provider requires extra per-track
playback metadata, add it deliberately to shared contracts and OpenAPI; do not overload
`provider_uri`.

## Product Behavior

### Mixed-provider classes are allowed

A class may contain tracks from SoundCloud, Apple Music, and Spotify. Live Mode must not assume one
provider queue for the whole class. Instead, RitmoFit is the master timeline and each track is a
provider-specific playback job.

Provider selection for each track:

1. Prefer the instructor's preferred connected provider when the track has that provider ref.
2. Otherwise choose the best connected playable provider for that track.
3. Otherwise fail preflight before class start and tell the instructor exactly which track is unplayable.

Keep the fallback deterministic. If no user-defined provider priority exists yet, use the product's
current provider order unless design/product changes it.

### Live Mode is hands-free after start

Once class starts, the instructor should not have to touch RitmoFit. Live Mode must:

- preflight every track before class start;
- start the first track at its playback-window start;
- stop/advance at the playback-window end;
- auto-load and auto-play the next track;
- preserve intentional free-timeline gaps as silence/countdowns;
- keep the choreography/prompter clock synchronized to provider playback;
- surface runtime playback failures as serious recoverable errors, not as normal handoff links.

Provider handoff links should not be a primary or casual fallback. If retained, they belong inside an
error/recovery menu for rare browser/session issues such as stale cookies, stale provider authorization,
or SDK load failure.

### Builder preview is manual

Builder preview should use the same adapter/coordinator stack, but should not auto-advance. It previews
the selected track/range/cue area so instructors can test a climb, sprint, drop, or transition while
choreographing.

## Architecture

Add the web playback layer under `apps/web/src/lib/playback/`:

- `types.ts`: shared adapter/coordinator contracts. **(built)**
- `coordinator.ts`: the pure decision core — provider selection, clip-window math, provider-time
  translation, and static class preflight. **(built)**
- `runtime.ts`: the runtime coordinator (`RuntimePlaybackCoordinator`) — segment resolution over the
  class timeline, auto-advance, gap handling, mid-track entry after seek, pause/resume, and
  recoverable-error surfacing. Host-clock driven: Live Mode's rAF loop calls `tick(elapsedMs)`; the
  coordinator never runs its own timer, and the class timeline stays master. **(built)**
- `soundcloud-adapter.ts`: official SoundCloud Widget API. **(built — needs live verification)**
- `apple-music-adapter.ts`: MusicKit JS playback, building on `apps/web/src/lib/musickit.ts`.
- `spotify-adapter.ts`: Spotify Web Playback SDK / Connect playback.
- focused tests for provider selection, clip-window math, preflight results, auto-advance decisions, and
  unrecoverable/recoverable error mapping.

Suggested adapter shape:

```ts
interface PlaybackAdapter {
  provider: Provider;
  prepare(entry: RunPayloadTrackEntry, window: PlaybackWindow): Promise<PlaybackReady>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(providerMs: number): Promise<void>;
  stop(): Promise<void>;
  destroy(): void;
}

interface PlaybackWindow {
  startMs: number;
  endMs: number;
}
```

The coordinator should translate class elapsed time to provider time:

```ts
const inTrackMs = classElapsedMs - (entry.startOffsetMs ?? 0);
const providerMs = entry.clipStartMs + inTrackMs;
```

## Provider Notes

### SoundCloud

Use the official embedded Widget API. The adapter should hide the widget visually but keep it alive and
accessible enough for browser autoplay/user-gesture constraints. Required capabilities: load/ready,
play, pause, seek, progress, finish, and error handling. Treat SoundCloud terms as strict; do not attempt
direct audio streaming.

### Apple Music

Extend the existing MusicKit JS helper from connect-only into playback. Keep Sign in with Apple separate
from Apple Music. Use the server-provided developer token and the user's Music-User-Token. Required
capabilities: configure, authorize/re-authorize when needed, set/play a catalog song, seek, pause, and
track playback-state errors.

### Spotify

Spotify playback requires a connected Premium user and playback-capable OAuth scopes. The current
Spotify connect scope is intentionally only `user-library-read`; adding playback requires a deliberate
scope update and reconnection path.

**Prerequisite (completed 2026-07-03):** Apple Music, SoundCloud, and Spotify production connect are
verified working on Worker `94126954-0e61-408e-b404-bb380c338141` (see `deployment-runbook.md` and the
recently closed item in `DEVELOPMENT_PLAN.md`). The next Spotify-specific prerequisite is the playback
scope expansion and reconnection path; sequence that deliberately because existing Spotify connections
only have `user-library-read`.

Likely scopes to review against current Spotify docs before implementation:

- `streaming`
- `user-read-playback-state`
- `user-modify-playback-state`

The backend currently treats provider tokens as never returned to the client. Preserve that rule for
stored tokens generally, but add a narrowly documented endpoint for short-lived browser playback
credentials when required by the official SDK. Playback tokens must never be logged, stored in local
storage, or used for catalog/BPM shortcuts.

Document a public-launch Spotify compliance checkpoint before broad rollout. Private beta can proceed
with the feature flagged if product accepts the risk.

## API And Contract Impact

Expected backend changes:

- shared schema for playback client config/token responses if needed;
- provider capability matrix fields for playback readiness;
- Spotify OAuth scope expansion and reconnection handling;
- an authenticated playback-token/config route where an official SDK requires browser credentials;
- OpenAPI regeneration after route/schema additions.

No expected D1 migration for playback windows. A migration may be needed only if preferred provider or
provider priority becomes persisted user preference rather than local/session preference.

## UI Impact

Live Mode:

- replace `ProviderHandoffLinks` as the primary action in `LiveMode.tsx`;
- add a single RitmoFit player rail/control surface;
- add a preflight screen before class start;
- add provider/account/subscription/unavailable states;
- keep play/pause/reset/seek keyboard accessible and visibly focused;
- preserve wake lock behavior while the class is running;
- treat playback failure as a serious recoverable state with retry/reconnect/switch-provider options.

Builder:

- add range/track preview controls using the same coordinator;
- keep preview manual and local to the selected track/range;
- do not introduce auto-advance in Builder.

Use `ritmofit_design_system` tokens and existing Live Mode layout patterns. Do not add a marketing-style
player surface; this is a performance tool for an instructor on stage.

Design-system follow-up **(done 2026-07-03)**: `ritmofit_design_system/05-components.md` now has the
playback-states table (playback-eligible, Premium required, subscriber authorization required,
playback unavailable, runtime playback failure) under the same icon+label rules — never color alone —
plus component guidance for the player rail and preflight screen.

**Live Mode wiring status (2026-07-03):** built — preflight screen (`LivePreflight.tsx`) gating class
start, `RuntimePlaybackCoordinator` driven from the existing rAF clock, player rail in the transport,
recoverable playback-failure alert (retry / continue-without-music / handoff links moved there as the
recovery-only surface), wake lock preserved. "Run without music" keeps the prompter-only path. Only
SoundCloud is registered in the adapter registry so far; preflight filters connections to registered
adapters, so Apple-Music/Spotify-only tracks read as unplayable until their adapters land. Builder
preview is not wired yet.

## Verification

Fast automated coverage:

```bash
pnpm --filter @ritmofit/web test
pnpm --filter @ritmofit/api test
pnpm -r typecheck
pnpm lint
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
pnpm --filter @ritmofit/api contract-parity
```

Full gate before merge:

```bash
pnpm format:check
pnpm -r typecheck
pnpm lint
(cd ritmofit_design_system && npm run verify)
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm --filter @ritmofit/api contract-parity
pnpm audit:ci
```

Live verification must use real provider accounts:

- SoundCloud account with approved playback/API credentials.
- Apple Music subscriber authorized through MusicKit.
- Spotify Premium account authorized with playback scopes.
- A mixed-provider class that auto-advances SoundCloud -> Apple Music -> Spotify -> SoundCloud.
- A clipped track that starts mid-song and stops at the playback-window end.
- A free-timeline class with an intentional silence gap.
- Failure drills: disconnected provider, expired provider authorization, missing provider ref, SDK load
  failure, and browser refresh/session recovery.

## Parity

This is a parity-gated capability. If web lands first, iOS must have a linked parity item before merge.
iOS can use native/provider-specific APIs, but must provide the same instructor capability:

- provider-authorized playback;
- mixed-provider classes;
- preflight before class start;
- auto-advance in Live Mode;
- manual Builder preview;
- playback-window support from `clipStartMs` + effective duration.
