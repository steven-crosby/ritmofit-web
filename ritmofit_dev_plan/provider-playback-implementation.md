# Provider-Authorized Playback Implementation Plan

<!-- note (Codex, 2026-07-02): Created from the Ritmo Studio player planning session. -->
<!-- note (Claude, 2026-07-02): Doc audit pass — added the prod connect-exchange prerequisite and design-system playback states. -->
<!-- note (Claude, 2026-07-03): Connect prerequisite marked completed (Worker 94126954); marked the built playback-layer modules in Architecture; recorded Live Mode wiring status. -->
<!-- note (Claude, 2026-07-05): Apple Music (MusicKit JS v3) playback adapter built + registered; updated Architecture build marker and the Live Mode adapter-registry status. -->
<!-- note (Codex, 2026-07-05): Marked the Apple Music setQueue singleton guard closed after PR #211; authorize waiting-state remains open as a UI slice. -->
<!-- note (Claude, 2026-07-06): Reframed under D21 — the player is one part of a broader music-service shell; added the shell-direction section and the discovery read-surface contract impact. -->
<!-- note (Claude, 2026-07-06): Real-provider audio live-verified on prod for the two shipped adapters — SoundCloud (Worker 5072dd3b) and Apple Music (Worker cbea9f69), each after a CSP hotfix; Apple audible playback owner-confirmed. Retired the "needs live verification" markers. Spotify audio still pending its adapter. -->
<!-- note (Claude, 2026-07-06): Finalized the Spotify playback plan after owner decisions — Premium account available; expand the single connect scope to be playback-capable; no feature flag (ship after live-verify). Starting the backend slice (scope expansion + playback-token endpoint). -->

## Goal

Build one Ritmo Studio player experience for web Live Mode and Builder preview while keeping provider audio
provider-owned. Instructors should not be sent to SoundCloud, Apple Music, or Spotify as the normal
class-running path. Ritmo Studio controls the class timeline, playback windows, choreography prompts, and
provider choice; provider SDKs/widgets control the actual audio stream and authorization.

This is a product-direction update to the older "handoff-only" docs. The boundary is now:

- Allowed: official provider-authorized in-app playback control.
- Still forbidden: downloading, proxying, caching, re-hosting, remixing, mixing, crossfading,
  beatmatching, decoding, analyzing, or creating derivative provider audio.
- Still forbidden: BPM from Spotify. BPM remains manual or from a dedicated permitted tempo provider.
- Still forbidden: destructive song edits. Shortening a song means a saved playback window/cue range.

## Music-service shell direction (D21)

The player is no longer just "play this class live." Under **D21** it is one part of a broader
**music-service shell**: Ritmo is a creator workstation *shell over trusted services*, and the same
provider-authorized playback stack that runs Live Mode and Builder preview also powers **browsing and
auditioning provider libraries while building**. The arc:

- **Handoff-oriented (original):** Ritmo owned the timeline/choreography; audio meant a link out to a
  provider app. Live Mode was a prompter + class clock.
- **D19 — provider-authorized in-app playback:** official SDKs/widgets control playback windows in-app
  (MusicKit on the Web, SoundCloud Widget API, later the Spotify Web Playback SDK). The provider still owns
  the stream/authorization/availability; Ritmo owns the timeline and windows.
- **D21 — music-service shell:** browse provider libraries inside Ritmo; open liked tracks and playlists
  like a music app; **preview/listen while building**; convert curiosity into class creation; run Live
  Mode with provider playback, preflight, auto-advance, and recovery states.

Playback boundaries are unchanged (the forbidden list above still holds). What changes is *where* the
playback stack is used: the D19 preview controller (`preview.ts` / `TrackPreview.tsx`) extends from
"preview a track already in the class" to "preview a **candidate** the instructor is auditioning in the
discovery shell" — one adapter, manual, honoring the same host-clock and clip-window rules. The discovery
surface itself is specified in `../ritmofit_design_system/11-library-guidelines.md`; the product decision
is `decisions.md` D21.

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
provider queue for the whole class. Instead, Ritmo Studio is the master timeline and each track is a
provider-specific playback job.

Provider selection for each track:

1. Prefer the instructor's preferred connected provider when the track has that provider ref.
2. Otherwise choose the best connected playable provider for that track.
3. Otherwise fail preflight before class start and tell the instructor exactly which track is unplayable.

Keep the fallback deterministic. If no user-defined provider priority exists yet, use the product's
current provider order unless design/product changes it.

### Live Mode is hands-free after start

Once class starts, the instructor should not have to touch Ritmo Studio. Live Mode must:

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
- `soundcloud-adapter.ts`: official SoundCloud Widget API. **(built — live-verified 2026-07-06:
  Live Mode playback + pause/resume on prod after the `w.soundcloud.com` CSP hotfix, Worker `5072dd3b`)**
- `apple-music-adapter.ts`: MusicKit JS (v3) playback on the shared page instance, building on
  `apps/web/src/lib/musickit.ts` (now extended from connect-only into the queue/transport surface).
  Cues the clip start via `setQueue.startTime` (seconds) and converts the ms playback contract at the
  boundary; a pre-play mid-track seek re-cues rather than calling `seekToTime` (no now-playing item
  until playback starts). **(built — live-verified 2026-07-06: Builder preview plays audible subscriber
  audio on prod after the `*.itunes.apple.com` + `media-src 'self' blob:` CSP fix, Worker `cbea9f69`)**
- `registry.ts`: `PLAYBACK_ADAPTERS` — the single source of truth for which providers the web player can
  drive (SoundCloud + Apple Music today), shared by Live Mode and Builder preview so the two surfaces
  never drift on playability. **(built)**
- `preview.ts`: the Builder preview controller (`PreviewPlaybackController`) — drives ONE adapter for the
  selected track, manual only. Deliberately not the runtime coordinator: single-track, no whole-class
  preflight, and no auto-advance (structurally — there is no next track). Same host-clock model as Live
  Mode (`tick(previewElapsedMs)`), stopping at the clip-window end so preview honors the saved range.
  **(built)**
- `spotify-adapter.ts`: Spotify Web Playback SDK / Connect playback.
- focused tests for provider selection, clip-window math, preflight results, auto-advance decisions,
  preview lifecycle (prepare/play/stop, window-end stop, superseded-prepare teardown), and
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

Spotify playback requires a connected **Premium** user and playback-capable OAuth scopes, played only
through the official **Web Playback SDK** (`https://sdk.scdn.co/spotify-player.js`; re-verified against
Spotify docs 2026-07-06 — SDK still requires Premium). Slots into the existing `PlaybackAdapter`
interface; registering `spotify` in `PLAYBACK_ADAPTERS` is what flips Spotify-only tracks from
`provider_not_playable` to playable in both Live Mode and Builder preview. Owner decisions (2026-07-06):
a Premium account is available for live verification; **expand the single connect scope** to be
playback-capable (every Spotify connect grants playback — no separate opt-in); **no feature flag** — ship
to all users once live-verified.

**Prerequisite (completed 2026-07-03):** Apple Music, SoundCloud, and Spotify production connect are
verified working on Worker `94126954-0e61-408e-b404-bb380c338141`. Existing Spotify connections hold only
`user-library-read`, so the scope expansion needs a reconnection path.

**Scopes** — expand `SPOTIFY_CONNECT_SCOPE` (currently `user-library-read`) to add:

- `streaming` — required for the Web Playback SDK to stream.
- `user-read-email`, `user-read-private` — the SDK verifies Premium at init via these (it raises
  `authentication_error` / `account_error` without them).
- `user-modify-playback-state` — start a specific `spotify:track:…` URI on our SDK device and seek/pause
  via the Connect Web API (`PUT /me/player/play|seek|pause`).
- `user-read-playback-state` — read device/player state.
- keep `user-library-read` (existing likes search). **Never** an audio-features/BPM scope (forbidden).

**Backend slice (deploy on its own — auth/provider change):**

- Expand the connect scope + a `spotifyScopeHasPlayback(scope)` helper (stored `scope` includes
  `streaming`).
- `GET /providers/spotify/playback-token` (authed, rate-limited) — mirrors `GET
  /providers/apple_music/config`. Loads the connection, verifies playback scope, refreshes the access
  token server-side if near expiry (`refreshSpotifyToken`), returns `{ accessToken, expiresInMs }`.
  Distinct failures: no connection → 401; connected-but-missing-playback-scope → a specific
  reconnect-for-playback code; not configured → 503. This is the documented exception to "never return
  provider tokens": short-lived, scope-limited, **never logged, never in localStorage, never for
  catalog/BPM**.
- Shared Zod schema for the token response; OpenAPI regen + contract-parity.

**Web slice (feature-flag-free):**

- `lib/spotify-playback.ts` — loads the SDK, constructs `Spotify.Player` with `getOAuthToken` →
  `GET /providers/spotify/playback-token`, connects, tracks `device_id`, maps SDK events
  (`ready`/`not_ready`/`player_state_changed`/`authentication_error`/`account_error`/`initialization_error`).
  Analogous to `musickit.ts`.
- `playback/spotify-adapter.ts` implementing `PlaybackAdapter` — `prepare` (SDK ready + device, cue the
  track), `play` (Connect API `PUT /me/player/play` with `uris` + `position_ms` + `device_id`),
  `pause`/`seek`/`stop`/`destroy`, events → `onFinish`/`onError`/`onAwaitingAuthorization`.
- register `spotify` in `registry.ts`; reconnect UX for connections lacking `streaming` (mirror the
  SoundCloud "session expired — reconnect" chip / unplayable-verdict copy in `TrackPreview.tsx`).
- CSP/`Permissions-Policy` in `apps/web/public/_headers`: `script-src` + `frame-src` += `sdk.scdn.co`;
  `connect-src` += `api.spotify.com` / `*.spotify.com` (and likely `wss://*.spotify.com`); `media-src
  'self' blob:` already present; the SDK's cross-origin DRM (Widevine) iframe needs `encrypted-media`, so
  expect a `Permissions-Policy: encrypted-media=(self "https://sdk.scdn.co")` addition. **Tune this with
  the same empirical live pass used for Apple Music** (drive a real browser, watch `securitypolicyviolation`
  + SDK error events, add hosts until it plays).

**Verification & compliance:** live-verify with the Premium account through a real browser (audible
playback + CSP/Permissions-Policy tuning). Official SDK only; no cache/proxy/decode/BPM. Document a
public-launch Spotify compliance checkpoint. Because there is **no feature flag**, the adapter is
registered only after live verification passes, so Spotify-only tracks keep reporting
`provider_not_playable` until then.

## API And Contract Impact

Expected backend changes:

- shared schema for playback client config/token responses if needed;
- provider capability matrix fields for playback readiness;
- Spotify OAuth scope expansion and reconnection handling;
- an authenticated playback-token/config route where an official SDK requires browser credentials;
- OpenAPI regeneration after route/schema additions.

Discovery read-surfaces (D21), sequenced as their own sub-slice — distinct from playback tokens/scopes:

- list a connected user's **saved playlists** per provider (new adapter method + route + shared contract);
- **browse a playlist's tracks without importing** (reuse the adapter `getPlaylist`; Spotify works today,
  SoundCloud needs permalink `/resolve`, Apple Music has no path yet);
- keep the provider **capability matrix** honest for both (a provider that can't list playlists or can't
  browse must not offer a dead-end action);
- OpenAPI regeneration after the route/schema additions.

No expected D1 migration for playback windows. A migration may be needed only if preferred provider or
provider priority becomes persisted user preference rather than local/session preference.

## UI Impact

Live Mode:

- replace `ProviderHandoffLinks` as the primary action in `LiveMode.tsx`;
- add a single Ritmo Studio player rail/control surface;
- add a preflight screen before class start;
- add provider/account/subscription/unavailable states;
- keep play/pause/reset/seek keyboard accessible and visibly focused;
- preserve wake lock behavior while the class is running;
- treat playback failure as a serious recoverable state with retry/reconnect/switch-provider options.

Builder **(built 2026-07-05)**:

- range/track preview controls using the same adapter stack (`TrackPreview.tsx` in the builder
  inspector, driven by `PreviewPlaybackController`);
- preview is manual and local to the selected track's clip window;
- no auto-advance in Builder — structurally, not by a flag (the preview controller drives one adapter
  and has no notion of a next track).

Use `ritmofit_design_system` tokens and existing Live Mode layout patterns. Do not add a marketing-style
player surface; this is a performance tool for an instructor on stage.

Design-system follow-up **(done 2026-07-03)**: `ritmofit_design_system/05-components.md` now has the
playback-states table (playback-eligible, Premium required, subscriber authorization required,
playback unavailable, runtime playback failure) under the same icon+label rules — never color alone —
plus component guidance for the player rail and preflight screen.

**Live Mode wiring status (2026-07-03):** built — preflight screen (`LivePreflight.tsx`) gating class
start, `RuntimePlaybackCoordinator` driven from the existing rAF clock, player rail in the transport,
recoverable playback-failure alert (retry / continue-without-music / handoff links moved there as the
recovery-only surface), wake lock preserved. "Run without music" keeps the prompter-only path.

**Adapter registry (updated 2026-07-05):** SoundCloud and **Apple Music** adapters are registered in the
shared `playback/registry.ts` (`PLAYBACK_ADAPTERS`), consumed by both Live Mode and Builder preview;
each surface passes the registry keys (`PLAYBACK_ADAPTER_PROVIDERS`) as selection's `availableProviders`,
so only Spotify-only tracks still read as unplayable until the Spotify adapter lands (it needs the
playback-scope expansion first).

**Playback selection is per-provider on connection (fixed 2026-07-06):** a track is playable when its
provider's adapter is registered **and** either playback needs no user connection **or** a live one
exists. The shared capability `playbackRequiresConnection` encodes this: **SoundCloud is `false`** (the
public Widget plays with no token), Apple Music / Spotify are `true` (MusicKit / the Web Playback SDK
authorize the user). This fixes a production bug where SoundCloud tracks — the default provider — went
unplayable once the *likes-only* OAuth token expired (~hourly), even though the Widget never uses it;
preflight/selection had gated all providers uniformly on a live connection. See `selectProvider` /
`SelectionOptions.availableProviders` in `playback/coordinator.ts`.

**Cross-provider resolution (built 2026-07-06):** a track added only from a provider Ritmo can't play
in-app (Spotify today — no adapter) now reports the distinct `provider_not_playable` selection reason
(vs. `no_connected_provider`), and can be *resolved* to a playable provider instead of being a dead end.
`POST /tracks/:id/resolve-provider` searches the requested playable providers' catalogs for the same
song and **auto-attaches a strong same-song match** (the conservative `findSameSongMatch` bar:
normalized title+artist + duration tolerance — a wrong auto-attach would rewrite the library), else
returns candidates to confirm; the confirm path reuses `POST /tracks/:id/provider-ids`. The algorithm is
the pure `lib/resolve-provider.ts` (injected search, unit-tested); the Builder preview surfaces it as a
"Find on {SoundCloud/Apple Music}" action on the unplayable verdict (`TrackPreview.tsx`), overlaying the
resolved ref locally so the verdict flips to playable at once. No schema change — refs live in the
existing `track_provider_ids`; catalog search spends the app-level token, never provider audio.

**Builder preview wiring status (2026-07-05):** built — `TrackPreview.tsx` in the builder inspector
(`Dashboard.tsx`, gated on the selected track's run-payload entry), driven by `PreviewPlaybackController`
over one adapter. Manual transport (preview / pause / resume / stop), a status chip mirroring the Live
Mode player-rail vocabulary, an unplayable verdict that names the fix (no ref / connect a provider), and
a recoverable `role="alert"` on a runtime failure (retry / dismiss — no handoff link). Host-clock driven
like Live Mode; stops at the clip-window end. Real-provider audio is **live-verified on prod (2026-07-06)**
for the two shipped adapters — audible subscriber Apple Music preview and SoundCloud Live Mode playback,
each after its CSP hotfix (Workers `cbea9f69` / `5072dd3b`); Spotify audio remains unverified until its
adapter lands. Not yet wired: an inline reconnect action from the preview error (the connect flow
lives in the top-level Connections dialog).

**Apple Music shared-transport follow-ups (updated 2026-07-05):** MusicKit is a page-level singleton, so
the adapter guards teardown with a per-instance ownership token (only the adapter that started the
transport may `stop()` it — prevents a superseded adapter silencing the live track under rapid seeks).
Both narrower shared-singleton tails are now closed (each needed a stuck-SDK / abandoned-consent
condition — acceptable for private beta, worth closing before broad Apple Music rollout). Real-provider
audio is **live-verified on prod (2026-07-06)** for both shipped adapters (audible Apple Music preview +
SoundCloud Live Mode, each after its CSP hotfix); only Spotify audio remains unverified pending its adapter.

Closed:

- **Un-timed `authorize()`** (waiting-for-authorization slice, 2026-07-05) — a blocked/abandoned Apple
  consent sheet used to leave `prepare()` pending and the coordinator frozen in `preparing` with no
  recovery, and (because `prepare()` never settled) the orphaned adapter was never torn down. The adapter
  now emits an `onAwaitingAuthorization` lifecycle signal — surfaced as a cancellable
  `awaiting_authorization` state in both Live Mode and Builder preview, with a new `ritmofit_design_system`
  playback-state (⏳, distinct from the "subscriber authorization required" reconnect verdict) — and
  bounds consent with a generous, separate `authorizeTimeoutMs` (default 60s) that fails to the
  recoverable-error path and lets the coordinator destroy the orphan. `authorize()` still stays out of the
  tight queue-load timeout, which continues to bound only `setQueue`.
- **Orphaned `setQueue` after a timeout** (PR #211) — the adapter keeps per-MusicKit-instance queue
  generation state, blocks overlapping non-cancellable `setQueue()` requests while an older one is
  pending, and rejects superseded queue completions before they can proceed as valid cues.

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

## Later iOS Refinement

Under D20, this is no longer parity-gated before web merge. Build the web playback experience because it
improves the solo creator's rehearsal and Live Mode loop. When iOS refinement resumes, native/provider-
specific APIs should provide the same instructor capability where provider terms allow:

- provider-authorized playback;
- mixed-provider classes;
- preflight before class start;
- auto-advance in Live Mode;
- manual Builder preview;
- playback-window support from `clipStartMs` + effective duration.
