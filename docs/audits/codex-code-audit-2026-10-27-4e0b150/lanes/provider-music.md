# Lane C — Provider / music (+ joint playback seam with B)

Reviewer: C (provider / music). Audited SHA `4e0b15096995c125b3941bf374a6a580e2ff52f8` (`main`).
Status: **COMPLETE** for this lane (follow-up §7). Audit-only: no tracked file modified; repros ran in a disposable
worktree (`/tmp/wt-c`, `git worktree add /tmp/wt-c HEAD`, `pnpm install --frozen-lockfile --offline`).
No real provider API, credential, production system, or provider audio was touched. Audible playback
**cannot** be verified here; every playback statement below is about the adapter/coordinator logic
driven by synthetic SDK fakes, plus cited provider documentation (accessed 2026-10-27).

## Summary

| ID | Title | Sev | Status |
| --- | --- | --- | --- |
| C-1 | Spotify playback gated on the stored ~1 h **access-token** expiry, so Spotify tracks read "No connected provider" in Live/Preview although the server can refresh | **P1** | Confirmed |
| C-2 | Any token-refresh failure (5xx / 429 / network) is reported as a dead grant: `409 REAUTH_REQUIRED` | P2 | Confirmed |
| C-3 | Spotify adapter treats a relinked track (`current_track.uri` ≠ requested uri) as device loss and halts the class | P2 | Probable |
| C-4 | Spotify page-singleton device is never rebuilt: `not_ready` unhandled, stale `device_id` kept for the page lifetime | P2 | Probable |
| C-7 | Sign-out / Disconnect leave the Spotify SDK device connected and MusicKit authorized in the browser | P2 | Probable |
| C-15 | SoundCloud playlist reads import non-`playable` (preview/blocked) tracks that preflight cannot flag | P3 | Probable |
| C-9 | A `Retry-After` that crosses the preview deadline surfaces as "took too long", not rate-limited | P3 | Confirmed |
| C-3b | (seam) One transient `null` Spotify state fails the class within one 250 ms sample | P3 | Confirmed (logic) |
| C-21 | Same-song normalization collapses distinct recordings, and resolve auto-attaches the first hit | P2 | Confirmed |
| C-22 | A match accepted at the 4 s duration tolerance fails Live at the 1 s endpoint tolerance | P2 | Confirmed |
| C-23 | Resolve/manual attach stores a SoundCloud URN the legacy numeric id already owns | P3 | Confirmed |
| C-24 | URL-import retry after a lost response duplicates the playlist | P2 | Confirmed |
| C-25 | A failed library resolve is dropped and the import returns success | P2 | Confirmed |
| C-26 | Two concurrent imports of one new provider track: one 409s instead of returning the row | P3 | Confirmed |

Rejected: SoundCloud pre-play `seekTo` ignored (C-5), Spotify episodes imported as tracks (C-6),
SoundCloud numeric-id vs URN duplicates (C-8), Apple error-listener ownership (C-18), BPM/caching
compliance (C-19), f004be7 quota/Retry-After regression (C-20). Details in the Rejected appendix.

## 1. Coverage

Depth key: **traced** = read end to end incl. callers; **tested** = traced + executed a focused
harness; **sampled** = read selectively; **not assessed**.

| Area | Files | Depth |
| --- | --- | --- |
| Retry / Retry-After / QUOTA (f004be7) | `packages/music/src/retry.ts`, `errors.ts`, `spotify.ts` `authedGet`/`throwIfQuotaExceeded` | tested |
| Spotify server adapter (search/lookup/app token/playlist paging/saved reads) | `packages/music/src/spotify.ts`, `app-token.ts` | traced (+tested episode mapping) |
| Spotify user OAuth + server refresh/persist | `spotify-oauth.ts`, `apps/api/src/lib/music/{spotify-playback-token,user-likes,user-playlists}.ts` | tested |
| Connection view / expiry exposure | `apps/api/src/routes/provider-connections.ts` | traced |
| Web provider state + selection/preflight | `apps/web/src/lib/providers.ts`, `playback/coordinator.ts`, `LiveMode.tsx` preflight memo, `LivePreflight.tsx` copy | tested |
| Spotify Web Playback SDK loader/singleton + Connect start | `apps/web/src/lib/spotify-playback.ts`, `use-spotify-activation.ts` | tested |
| Spotify playback adapter | `playback/spotify-adapter.ts` | tested |
| Runtime coordinator (provider side of seam) | `playback/runtime.ts` (`enterTrack`, `sampleTransport`, `fail`) | tested (with fakes) |
| Apple MusicKit loader/config + adapter | `musickit.ts`, `playback/apple-music-adapter.ts` | traced |
| Apple server adapter (catalog playlist + library) | `packages/music/src/apple-music.ts` | sampled |
| SoundCloud server adapter + widget adapter | `packages/music/src/soundcloud.ts`, `playback/soundcloud-adapter.ts` | traced |
| Builder preview coordinator | `playback/preview.ts` | sampled (epoch guards only) |
| Sign-out path vs provider singletons | `session-guard.ts`, `api.ts` 401 handler | traced |
| BPM / caching compliance | `bpm.ts`, `bpm-lookup.ts`, storage/SW grep | sampled |
| Cross-provider resolution (`same-song`, `resolve-provider`, attach) | `same-song.ts`, `resolve-provider.ts`, `track-import.ts`, `routes/tracks.ts` | tested (C-21–C-23) |
| Ordered import (URL commit vs persisted session) | `ordered-import.ts`, `TrackSearch.tsx` `commitPreviewOccurrences`, `ordered-class-import.ts` | tested (C-24, C-25); server accepts a second append (traced, not re-run on D1) |
| SoundCloud OAuth (state/PKCE, callback user binding, refresh rotation) | `provider-connections.ts`, `pkce.ts`, `soundcloud-oauth.ts`, `refreshAndPersist` | tested (existing callback suite, 8) + traced; no new defect |
| Disconnect purge; Library UI shelves | — | not assessed (Lane A A-9 / Lane D D-1; Library UI skipped) |
| Real SDK / widget / audible behaviour | — | **cannot be assessed here** |

What existing tests prove: all provider adapters are exercised only through hand-written fakes
(`FakePlayer`, fake widgets, stubbed `fetchImpl`). They prove internal state-machine logic, not SDK
semantics. `packages/music` has only 3 test files of its own; the adapters are tested from
`apps/api/src/lib/music/*.test.ts`. One existing test **encodes C-1 as intended behaviour**:
`apps/web/src/lib/playback/coordinator.test.ts:118` ("treats an expired connection as not connected",
Spotify). Baseline targeted suites: web 262 tests / api `src/lib/music` 269 / music 32 — all green
(`evidence/c-existing-suites.log`; counts include the `c-` repro files present in the worktree).

## 2. Candidate ledger

| ID | Issue | Location | Impact | Status |
| --- | --- | --- | --- | --- |
| C-1 | Access-token `expiresAt` used as connection liveness for Spotify playback | `apps/web/src/lib/providers.ts:117`, `playback/coordinator.ts:52-62,96-101` | Spotify tracks unplayable in Live/Preview ≥1 h after last server refresh | Confirmed |
| C-2 | Refresh catch-all → `REAUTH_REQUIRED` | `apps/api/src/lib/music/spotify-playback-token.ts:88-99`, `user-likes.ts:168-179`, `user-playlists.ts:420-431` | Transient Spotify/SoundCloud outage tells user to reconnect (mid-class too) | Confirmed |
| C-3 | Strict uri equality vs Spotify relinking | `apps/web/src/lib/playback/spotify-adapter.ts:96-99,291-293` | Class halts on market-relinked tracks | Probable |
| C-3b | Null Spotify state → immediate failure | `spotify-adapter.ts:288-290`, `runtime.ts:618-623` | Brief SDK hiccup halts class | Confirmed (logic) |
| C-4 | Singleton device never rebuilt / `not_ready` ignored | `apps/web/src/lib/spotify-playback.ts:139-207` | Stale `device_id` until reload | Probable |
| C-7 | No provider teardown on sign-out/disconnect | `session-guard.ts:42-45`, `musickit.ts:64-91`, `spotify-playback.ts:204-207` | Cross-user residue on shared browser | Probable |
| C-9 | Deadline vs Retry-After → AbortError | `packages/music/src/retry.ts:145-151`, `apps/api/src/lib/music/playlist-preview.ts:49` | Misleading timeout copy | Confirmed |
| C-10 | SDK `getOAuthToken` failure swallowed; SDK never called back | `spotify-playback.ts:155-163` | Mid-session token failure behaviour undefined | Hypothesis |
| C-11 | `expiresAt: null` after refresh → token never refreshed again | `spotify-playback-token.ts:75,110`; `user-likes.ts:121,190`; `user-playlists.ts:306,441` | Stale token served indefinitely if provider omits `expires_in` | Hypothesis (P3) |
| C-12 | SoundCloud follows provider `next_href` verbatim with the bearer token; user-token reads have no retry | `packages/music/src/soundcloud.ts:266,476-479,499` (contrast `spotify.ts:48-50`) | Hardening / transient 429 → 502 | Probable (P3) |
| C-13 | Apple 401/403 always → user `REAUTH_REQUIRED` | `apple-music.ts:378,424,495`; `user-likes.ts:226-228`; `user-playlists.ts:366-368,400-402` | Expired/invalid **developer** token tells every user to reconnect | Hypothesis (P3) |
| C-14 | Apple library fallback to library id (`i.…`) used as catalog id in `setQueue` | `apple-music.ts:335`, `apple-music-adapter.ts:213` | Uploaded/non-catalog songs pass preflight, fail at prepare | Hypothesis (P3) |
| C-15 | SoundCloud playlist reads lack `access=playable` | `soundcloud.ts:225-227,435`, schema `:69-77` | Preview/blocked tracks fail mid-class | Probable |
| C-16 | Concurrent refreshes with rotating refresh tokens | `user-likes.ts:120-125,181-193`; `user-playlists.ts:306-310,433-444` | Second request sees `invalid_grant` → spurious reconnect | Hypothesis |
| C-5 | SoundCloud widget ignores pre-play `seekTo` | `soundcloud-adapter.ts:261,376-378` | — | Rejected |
| C-6 | Spotify episodes imported as tracks | `spotify.ts:249-268` | — | Rejected |
| C-8 | SoundCloud numeric id vs URN duplicates | `soundcloud.ts:549` | — | Rejected |
| C-18 | Apple `onPlaybackError` lacks transport-owner guard | `apple-music-adapter.ts:136-142` | — | Rejected |
| C-19 | BPM from Spotify / caching provider data | `bpm.ts`, `spotify.ts`, `vite.config.ts:20` | — | Rejected |
| C-20 | f004be7 regressions (QUOTA retry, body re-read, Retry-After cap) | `retry.ts:137-152`, `spotify.ts:214-245,550-558` | — | Rejected |
| C-21 | Variant titles, script-fold, and in-word `feat`/`ft` share one match key; resolve attaches the first hit | `same-song.ts:38,63-70`, `resolve-provider.ts:55-56` | Wrong recording auto-attached | Confirmed |
| C-22 | Matcher tolerance 4 s vs runtime endpoint tolerance 1 s | `same-song.ts:38`, `runtime.ts:105,584-597` | Live halts on an accepted cross-provider attach | Confirmed |
| C-23 | `attachProviderId` / provider-id POST skip SoundCloud aliases | `track-import.ts:57-66`, `routes/tracks.ts:199-204,242-243` | URN and legacy numeric id split across two tracks | Confirmed |
| C-24 | URL import has no stored operation, so a lost response retries as a new commit | `ordered-import.ts:99-106,247-249`, `TrackSearch.tsx:664-666` | Playlist duplicated on retry | Confirmed |
| C-25 | `importTrack` failures are swallowed; result is `{error:null}` | `ordered-import.ts:230-242,265` | Songs omitted under a success result | Confirmed |
| C-26 | Unique-violation race returns 409 instead of the existing row | `track-import.ts:151-159,199-201` | Concurrent import of a new ref fails one caller | Confirmed |

## 3. Accepted findings

### C-1 — Spotify playback is gated on the ~1 h access-token expiry, not on the grant

- **Category:** provider auth / readiness. **Severity:** P1. **Confidence:** high (code + repro);
  prevalence depends only on Spotify's documented 60-minute access tokens. **Status:** Confirmed.
- **Refs:** `apps/api/src/routes/provider-connections.ts:153-163` (`toConnectionView` returns
  `row.expiresAt`), `:329` (`expiresAt = now + expires_in`), `apps/api/src/lib/music/spotify-playback-token.ts:75-81,101-113`
  (the server refreshes an expired access token on demand), `apps/web/src/lib/providers.ts:110-119`
  (`expiresAt <= now` ⇒ `'expired'`), `apps/web/src/lib/playback/coordinator.ts:52-62,96-101,119-133`
  (only `'connected'` is usable ⇒ `no_connected_provider`), `apps/web/src/components/LiveMode.tsx:564-572`,
  `apps/web/src/components/LivePreflight.tsx:22-25` ("No connected provider can play this / Connect a
  music provider"), `apps/web/src/lib/providers.ts:228-229` ("Reconnect for playback"),
  `apps/web/src/components/TrackPreview.tsx:193-194` (same gate in Builder preview).
- **Trigger:** instructor connected Spotify (with `streaming`) and nothing server-side has refreshed
  the token in the last hour (no likes/playlist/paste read, no prior playback token mint). Open Live for
  a class with Spotify-only refs.
- **Expected:** Spotify is a live grant (refresh token present); preflight passes; the first
  `GET /providers/spotify/playback-token` refreshes server-side, exactly as `mintSpotifyPlaybackToken` is built to do.
- **Observed:** preflight returns `{status:'unplayable', reason:'no_connected_provider'}`; Live
  refuses to start; the capability view says "Reconnect for playback"; the remedy offered is a full
  OAuth reconnect (which leaves Live). The server refresh path is unreachable from Live because
  selection gates before any token request.
- **Impact:** one of three providers' in-app playback is blocked for most real Live sessions (any
  started >1 h after the last Spotify server read). The project already fixed the identical class of
  bug for SoundCloud on 2026-07-06 (`ritmofit_dev_plan/provider-playback-implementation.md:332-339`)
  but kept the gate for connection-requiring providers. Apple is unaffected (`expiresAt: null`,
  `provider-connections.ts:404`).
- **Evidence:** `repro/c-web-playback-repro.test.ts` › "C-1 …" (3 tests green: selection,
  whole-class preflight, capability label). Existing test `coordinator.test.ts:118-128` asserts this
  behaviour for Spotify. `evidence/c-grep-evidence.txt`.
- **Test limits:** pure functions; did not exercise the UI. Did not verify that the music library
  tab is likewise labelled "Session expired" (`Dashboard.tsx:2014-2028`, `music-library.ts:81-88,138`
  read the same state — likely the same symptom, sampled only).
- **Counterevidence considered:** `TrackSearch.tsx:344-357` re-reads connections after a paste
  preview "refreshes a still-valid Spotify grant", showing awareness that `expiresAt` moves on refresh,
  but nothing on the Live/Preview path triggers that refresh. No code found that refreshes before
  preflight.
- **Remediation direction:** separate "grant alive" from "access token fresh". Options: (a) expose a
  grant-level field (e.g. `hasRefreshToken`/`reauthRequired`) in `MusicConnectionView` and gate on
  it; (b) treat `expired` as connected for providers with server refresh and let the token mint decide;
  (c) have Live/Preview call a cheap refresh endpoint before preflight. Contract change ⇒ shared
  schema + OpenAPI + iOS implication.
- **Acceptance checks:** Spotify connection with `expiresAt < now` and a refresh token selects
  `playable`; a connection whose refresh fails maps to a distinct reconnect reason; update
  `coordinator.test.ts:118` intent; Live preflight UI test with stale `expiresAt`.
- **Open-PR overlap:** none (#625 touches Spotify 403 body handling only; #596 deploy guards).

### C-2 — Transient refresh failures are reported as "Reconnect your account"

- **Category:** scope/auth vs transport failure classification. **Severity:** P2.
  **Confidence:** high. **Status:** Confirmed.
- **Refs:** `packages/music/src/spotify-oauth.ts:119-121` (any non-ok ⇒ `ProviderError`, status not
  preserved); `apps/api/src/lib/music/spotify-playback-token.ts:88-99`; `user-likes.ts:168-179`;
  `user-playlists.ts:420-431` (all `catch {}` ⇒ `409 REAUTH_REQUIRED`); web consumer
  `apps/web/src/lib/playback/spotify-adapter.ts:235-239` (only `PLAYBACK_REAUTH_REQUIRED` is mapped;
  a `REAUTH_REQUIRED` from `startSpotifyTrack`'s token fetch propagates as "Reconnect your Spotify
  account." into a runtime `prepare` failure); `spotify-playback.ts:155-163` (SDK refresh failure swallowed).
- **Trigger:** stored access token expired; `accounts.spotify.com/api/token` (or SoundCloud's token
  endpoint) answers 5xx/429 or the fetch throws. No retry is attempted.
- **Expected:** only `400 invalid_grant` (dead/revoked grant) ⇒ reconnect; transient ⇒ 502/503
  "provider unavailable, try again" with the grant left intact.
- **Observed:** 500/502/503/429/network all ⇒ `409 REAUTH_REQUIRED`; nothing persisted.
- **Impact:** a provider blip mid-class surfaces as "reconnect", an OAuth redirect that exits Live;
  library shelves show reconnect prompts for a healthy grant. Diagnoses provider outage as auth
  failure (the AGENTS.md rule "diagnose API-shape drift separately from authorization/scope failures").
- **Evidence:** `repro/c-api-token-refresh-repro.test.ts` (7 tests green, incl. control for
  `invalid_grant`). Run log `evidence/c-repro-run.log`.
- **Test limits:** stubbed global `fetch`; real Spotify token-endpoint error bodies not observed.
- **Counterevidence:** comments state intent "A failed refresh means the grant is dead"; no test
  covers transient token-endpoint statuses.
- **Remediation direction:** carry status/`error` code out of `postToken` (typed error), map
  `invalid_grant`/401 ⇒ reauth, everything else ⇒ `PROVIDER_UNAVAILABLE`; optionally one bounded retry.
  Web: map `REAUTH_REQUIRED` vs transient distinctly in the Spotify adapter.
- **Acceptance checks:** unit tests per status for all three refresh sites; adapter test that a 503
  token mint yields retryable copy, not reconnect.
- **Open-PR overlap:** none.

### C-3 — Spotify relinked tracks read as "no longer playing the class track"

- **Category:** provider event translation. **Severity:** P2. **Confidence:** medium (logic confirmed;
  SDK relink reporting documented by Spotify's relinking guide and observed by third-party SDK
  wrappers, not verified live). **Status:** Probable.
- **Refs:** `apps/web/src/lib/playback/spotify-adapter.ts:96-99` (`onStateChange` ⇒ `'unknown'`),
  `:291-293` (`getLiveness` throws on uri mismatch), `:58-62` (uri built from stored ref),
  `apps/web/src/lib/playback/runtime.ts:618-623` (rejection ⇒ `transportFailure`), import paths without
  `market`: `packages/music/src/spotify.ts:137,147-150,349,476-478`.
- **Trigger:** stored `spotify:track:X` is not available in the listener's market but has a linked
  instance Y; `PUT /me/player/play {uris:[X]}` plays Y; SDK reports `current_track.uri = Y`
  (`linked_from.uri = X`).
- **Expected:** treat `current_track.uri === this.uri || current_track.linked_from?.uri === this.uri`
  (or compare by id/linked id) as the class track.
- **Observed:** first 250 ms transport sample rejects; class enters `error` with "Spotify Web Playback
  SDK is no longer playing the class track."
- **Evidence:** `repro/c-web-playback-repro.test.ts` › "C-3 …" (adapter + runtime, 2 tests green).
  Docs: <https://developer.spotify.com/documentation/web-api/concepts/track-relinking> ("the Spotify
  mobile, desktop, and web players try to play another instance of the track"); SDK reference
  <https://developer.spotify.com/documentation/web-playback-sdk/reference> (WebPlaybackTrack is "Spotify
  Web API compatible"); third-party note that SDK state carries `linked_from`:
  <https://github.com/brim-borium/spotify_sdk/pull/122>. All accessed 2026-10-27.
- **Test limits:** fake player; no real relinked playback observed. The SDK-reported shape for a
  relinked track is not formally documented on the SDK page.
- **Counterevidence:** imports via user-token library reads may already return market-playable
  instances for the owner's market; risk concentrates on catalog-search imports (app token, no market)
  and on traveling instructors / changed account country.
- **Remediation direction:** accept `linked_from` match; optionally import with `market=from_token`
  on user-token reads. Related: Spotify autoplay after a single-uri context ends would also hit this
  path instead of `onFinish` (Hypothesis, not separately filed).
- **Acceptance checks:** adapter test with `linked_from`; runtime test that relinked playback advances.
- **Open-PR overlap:** none.

### C-4 — The Spotify device singleton is never rebuilt after it goes offline

- **Category:** reconnect / device loss. **Severity:** P2. **Confidence:** medium-low on real impact
  (depends on whether the SDK re-registers with a new `device_id`). **Status:** Probable.
- **Refs:** `apps/web/src/lib/spotify-playback.ts:139-202` (`playbackPromise` cached forever after
  first success; reset only on initial failure, `:198-200`), `:173-178` (`ready` resolves once, later
  `ready` payloads ignored), `:204-207` (`resetSpotifyPlayback` has no production caller —
  `evidence/c-grep-evidence.txt`), no `not_ready` listener anywhere; consumer
  `spotify-adapter.ts:168,177` reuses the cached `deviceId` for every `PUT /me/player/play`.
- **Trigger:** gym Wi-Fi drop ⇒ SDK `not_ready` ("typically due to no internet connection", SDK
  reference) ⇒ SDK reconnects / emits `ready` with a different id, or the player is disconnected server-side.
- **Expected:** `not_ready` invalidates the cached device; next prepare awaits a fresh `ready` (or
  rebuilds the player).
- **Observed (fake SDK):** after `not_ready(A)` + `ready(B)`, `getSpotifyPlayback()` still returns
  `device-A`; there is zero `not_ready` listener.
- **Impact:** if the id changes, every subsequent Spotify track start fails (`Spotify could not start
  the track (404)`) until a full page reload; Retry in Live cannot recover.
- **Evidence:** `repro/c-web-playback-repro.test.ts` › "C-4 …" (green). SDK reference URL as in C-3.
- **Test limits:** whether the real SDK changes `device_id` on reconnect is unverified here.
- **Remediation direction:** listen for `not_ready`/`authentication_error`/`account_error` on the
  singleton, drop `playbackPromise`, disconnect the old player; expose a rebuild on Retry.
- **Acceptance checks:** fake-SDK test: `not_ready` then prepare ⇒ waits for/uses the new id; Retry
  after a 404 start rebuilds.
- **Open-PR overlap:** none.

### C-7 — Sign-out / Disconnect leave provider sessions alive in the browser

- **Category:** session residue / privacy. **Severity:** P2. **Confidence:** medium.
  **Status:** Probable (code fact confirmed; SDK persistence behaviour not verified here).
- **Refs:** `apps/web/src/lib/session-guard.ts:42-45` (sign-out = `authClient.signOut()` only, no
  reload), `apps/web/src/lib/api.ts:99,335` (401 auto sign-out), `apps/web/src/lib/musickit.ts:64-91`
  (Ritmo's MusicKit surface has no `unauthorize`; no call anywhere), `apps/web/src/lib/spotify-playback.ts:204-207`
  (no production reset; no `disconnect()` call), `apps/api/src/routes/provider-connections.ts:427-440`
  (Disconnect deletes server tokens only), `apple-music-adapter.ts:183,194` (reuses `getInstance()`
  and trusts `isAuthorized`).
- **Trigger:** user A plays Apple/Spotify, signs out (or clicks Disconnect) in the same tab; user B
  signs in on the same browser (shared studio PC) or A expects disconnect to revoke browser playback.
- **Expected:** sign-out/disconnect tears down the Spotify player and calls MusicKit `unauthorize()`.
- **Observed:** Spotify device + cached `device_id` persist for the page; MusicKit stays authorized
  (MusicKit persists its user token in browser storage across reloads — per Apple's MusicKit JS
  design; not re-verified here). B's Live Apple preflight passes `isAuthorized` with A's Apple account;
  B's Spotify starts target A's `device_id` with B's token.
- **Impact:** cross-account playback/subscription use on shared devices; disconnect does not do what
  the UI implies in the browser.
- **Evidence:** `evidence/c-grep-evidence.txt` (no `unauthorize`/`resetSpotifyPlayback`/`disconnect`
  production callers). No runtime repro (would need real SDKs).
- **Remediation direction:** a provider-session teardown hook on explicit sign-out, 401 sign-out and
  provider Disconnect (Spotify `disconnect()` + reset; MusicKit `unauthorize()`).
- **Acceptance checks:** unit test that sign-out invokes the teardown; Disconnect Apple ⇒ MusicKit
  unauthorized.
- **Open-PR overlap:** #625 adds a "Sign out during Live" test (session guard keeps Live mounted); it
  does not cover provider teardown. Note the tension: tearing down mid-Live conflicts with the
  "keep Live mounted when the session ends" behaviour (`17a91a9`, #617) — owner decision needed for
  the automatic 401 sign-out case.

### C-15 — SoundCloud playlist reads import tracks that the widget cannot fully play

- **Category:** unavailable tracks / readiness. **Severity:** P3. **Confidence:** medium.
  **Status:** Probable.
- **Refs:** search `packages/music/src/soundcloud.ts:171-173` and likes `:365` filter
  `access=playable`; playlist paste `:225-227` and saved playlist tracks `:435` do not; `scTrackSchema`
  `:69-77` ignores `access`, so preflight has no signal.
- **Trigger:** playlist containing Go+ `preview` (30 s) or region-`blocked` tracks.
- **Expected:** filter or flag non-playable rows at import.
- **Observed (by reading):** rows map to normal candidates; in Live a preview track hits FINISH at
  ~30 s ⇒ runtime "Music ended before the saved playback window" (`runtime.ts:592-597`); a blocked
  track ⇒ widget ERROR ⇒ `prepare` failure.
- **Test limits:** not executed; SoundCloud `access` semantics from SoundCloud API docs (not
  re-fetched). **Remediation:** add `access=playable` (or map `access` and surface it in readiness).
- **Open-PR overlap:** none.

### C-9 — Retry-After past the preview deadline reads as a timeout

- **Category:** rate limiting UX. **Severity:** P3. **Confidence:** high. **Status:** Confirmed.
- **Refs:** `packages/music/src/retry.ts:145-151` (wait would pass `deadlineAt` ⇒ `abortError()`),
  `apps/api/src/lib/music/playlist-preview.ts:49` (AbortError ⇒ `PreviewTimeoutError` "The playlist
  took too long to load"). A `Retry-After` > 5 s returns the 429 instead ⇒ generic 502 (`retry.ts:146`).
- **Evidence:** `repro/c-music-adapter-repro.test.ts` › "C-9" (green).
- **Remediation:** return the 429 (or a typed rate-limited error) when the deadline, not the signal,
  blocks the wait; map to a "Spotify is busy, try again shortly" message.

## 4. Joint seam (adapter → frontend playback contract) — for Reviewer B

Contract as implemented (`apps/web/src/lib/playback/types.ts:39-100`): adapters emit `onFinish`,
`onError`, `onAwaitingAuthorization`, `onTransportState`, and answer `getTransport()`/`getLiveness()`.
The runtime (`runtime.ts:363-398,547-628`) is music-led: it advances only on increasing provider
position, treats any non-`playing`/`ended` transport event as `buffering` (+ revision bump), and
converts **any rejection** of `getTransport` into an immediate `transportFailure`.

| Guarantee | Spotify | Apple | SoundCloud |
| --- | --- | --- | --- |
| `onTransportState` states | `playing`/`paused`/`unknown` (`spotify-adapter.ts:90-121`) | full set incl. `buffering`/`ended` (`apple-music-adapter.ts:125-134,299-313`) | `playing`/`paused` only; no `buffering`/`ended` events (`soundcloud-adapter.ts:227-232`) |
| End-of-track evidence | inferred: playing → paused@0 with last poll ≥ duration−1 s (`:110-120`) | `ended` state + retained playhead | FINISH ⇒ `getDuration` as endpoint (`:317-328`) |
| `getTransport` rejection cases | `null` state, uri mismatch (`:288-293`) | never rejects (returns `unknown`) | 1 s postMessage timeout (`:345-374`) |
| Stall budget actually applied by runtime | **0** (one rejection fails) | 10 s (`runtime.ts:616-617`) | **0** after a 1 s timeout |
| Pre-play seek | re-cues via Connect `position_ms` | re-cues `setQueue.startTime` | direct `seekTo` (owner-verified resume works) |

Seam observations:
1. **C-3b (P3, Confirmed logic):** a single transient `null` from Spotify `getCurrentState` (SDK
   reconnecting) or one slow SoundCloud postMessage (>1 s, e.g. backgrounded tab) fails the class
   within one 250 ms sample, while Apple gets the 10 s budget. Repro: `repro/c-web-playback-repro.test.ts`
   › "C-3b". Whether "rejection = death" is right is B's call; from the provider side, `null` state is
   documented as "not connected" and can be transient.
2. Spotify finish inference depends on polling cadence; it works at the runtime's 250 ms poll but
   would silently miss FINISH if polling slowed below ~1 s (the `lastPlayingPosition >= duration-1000`
   test). Coupling worth documenting in the contract.
3. C-3/C-4 produce `onError`/rejections with copy that blames the device; B's recovery UI offers
   Retry, which cannot fix C-4 (cached device) — Retry and reload behave differently.
4. `onAwaitingAuthorization` is only emitted by Apple; Live uses `requirePreauthorization`, so it is
   effectively Preview-only.

## 5. Commands and exit codes

| Command | Exit |
| --- | --- |
| `git -C /workspace rev-parse HEAD` / `git status --porcelain` (start: only audit dir untracked) | 0 |
| `git -C /workspace worktree add /tmp/wt-c HEAD` | 0 |
| `cd /tmp/wt-c && pnpm install --frozen-lockfile --offline` | 0 |
| `cd /tmp/wt-c/apps/web && pnpm exec vitest run src/lib/playback/c-provider-repro.test.ts` (8 tests) | 0 |
| `cd /tmp/wt-c/apps/api && pnpm exec vitest run src/lib/music/c-provider-repro.test.ts` (7 tests) | 0 |
| `cd /tmp/wt-c/packages/music && pnpm exec vitest run src/c-provider-repro.test.ts` (2 tests; first draft of C-6 failed ⇒ lead rejected, test inverted) | 1 then 0 |
| `apps/web vitest run src/lib/playback src/lib/musickit.test.ts src/lib/providers.test.ts src/lib/use-spotify-activation.test.tsx` (262 tests) | 0 |
| `apps/api vitest run src/lib/music` (269 tests) | 0 |
| `packages/music vitest run` (32 tests) | 0 |
| `gh pr view 625/596 --json files,title`, `gh pr diff 625` (read-only overlap check) | 0 |
| WebFetch: SoundCloud Widget API, Spotify Web Playback SDK reference, Spotify Track Relinking (2026-10-27); Apple "Handling Requests and Responses" page returned no content (JS-rendered) | — |

Artifacts: `repro/c-provider-repro.patch` (apply to a clean checkout with `git apply`; adds the three
`c-provider-repro.test.ts` files), `repro/c-web-playback-repro.test.ts`,
`repro/c-api-token-refresh-repro.test.ts`, `repro/c-music-adapter-repro.test.ts`,
`evidence/c-repro-run.log`, `evidence/c-existing-suites.log`, `evidence/c-grep-evidence.txt`.
Full CI gate intentionally not run (Reviewer D). Browser/ports 5173/8787 not used.

## 6. Hypotheses not promoted (P3, need live or doc confirmation)

- **C-10:** `getOAuthToken` swallows token-fetch errors (`spotify-playback.ts:155-163`) and never
  calls `cb`. The comment assumes the SDK then emits `authentication_error`; the SDK reference only
  says it is emitted when the provided token fails, so a never-answered callback may hang silently
  until a transport sample fails. Combine with C-2.
- **C-11:** if a refresh response omits `expires_in`, `expiresAt` is stored `null` and
  `expired` is never true again (`spotify-playback-token.ts:75,110`), serving a dead token forever.
  Spotify documents `expires_in`, so low likelihood.
- **C-12:** SoundCloud `next_href` is followed verbatim with `Authorization: OAuth <user token>`
  (`soundcloud.ts:266,476-479,499`) — the Spotify adapter deliberately builds page URLs from its own
  base (`spotify.ts:48-50`). Also SoundCloud user-token pagination has no `fetchWithRetry`, so a 429
  becomes a 502 where Spotify's equivalent retries once.
- **C-13:** Apple Music API 401 is commonly a developer-token problem; mapping 401/403 to user
  `REAUTH_REQUIRED` would ask every user to reconnect when a static `APPLE_MUSIC_DEVELOPER_TOKEN`
  expires (`provider-config.ts:49-56`). Apple doc page not retrievable to cite.
- **C-14:** library songs without `playParams.catalogId` keep the library id (`apple-music.ts:335`),
  which MusicKit `setQueue({songs})` treats as a catalog id.
- **C-16:** two concurrent requests that both find the token expired both refresh with the same
  refresh token; with a rotating provider (SoundCloud OAuth 2.1) the loser gets `invalid_grant` ⇒ C-2
  path ⇒ spurious reconnect. Live Spotify start can race the SDK `getOAuthToken` and
  `startSpotifyTrack` token fetches the same way.

## Rejected appendix

- **C-5 SoundCloud pre-play `seekTo` ignored.** Community reports say the widget ignores `seekTo`
  before play (<https://stackoverflow.com/questions/21683466>, accessed 2026-10-27; official doc
  <https://developers.soundcloud.com/docs/api/html5-widget> is silent). Rejected: the owner-attended
  2026-10-13 acceptance confirmed "resume from paused position with clock progress"
  (`ritmofit_dev_plan/HISTORY.md:890-892`), and resume uses exactly this path (fresh adapter,
  pre-play `seek`, then `play`, `runtime.ts:415-424`).
- **C-6 Spotify podcast episodes imported as tracks.** Repro showed episodes are dropped: no
  `artists` ⇒ empty artist fails `trackSearchResultSchema` (`repro/c-music-adapter-repro.test.ts`).
  First repro draft (expecting import) failed, exit 1.
- **C-8 SoundCloud numeric id vs URN duplicates.** Already handled on the import lookup: PR #308
  treats legacy numeric ids and decimal URNs as the same identity (`HISTORY.md:2811-2812`).
  Follow-up C-23 is the attach path, which does not call that helper.
- **C-18 Apple `onPlaybackError` without ownership guard.** Runtime filters non-active adapters'
  errors (`runtime.ts:388-390`) and holds one adapter at a time; preview has equivalent epoch guards.
- **C-19 Music-constraint compliance.** No audio-features/analysis calls or scopes
  (`spotify-oauth.ts:48-49`); BPM only from GetSongBPM or manual (`bpm-lookup.ts:32-50`); no SW runtime
  caching of provider hosts (`apps/web/vite.config.ts:20` only sets the `/api/` denylist); browser
  storage holds UI/session state, no provider-derived analysis. Spotify token is in memory only.
- **C-20 f004be7 regressions.** Verified: `QUOTA_EXCEEDED` 429 is not retried and its body is
  buffered so `throwIfQuotaExceeded` can re-read it (`retry.ts:139-143,102-110`); Retry-After capped at
  5 s; 401 path reads the unbuffered original body only once (`spotify.ts:226-241`). No defect beyond C-9.

## 7. Follow-up — resolution, ordered import, SoundCloud OAuth

Second pass, same SHA, same disposable worktree (`/tmp/wt-c`, dependencies already installed).
The drafted repros were executed here; titles were not treated as findings until the assertion
passed and the production path was read. No provider API, production system, secret, or provider
account was touched. Disconnect purge (Lane A A-9 / Lane D D-1) and Library UI were not reviewed.
No new finding was rejected: every drafted assertion passed.

Prewritten tests, all green (`evidence/c-followup-repro-run.log`):

| Command | Exit | Result |
| --- | --- | --- |
| `apps/api` vitest (unit config) `src/lib/c-resolution-repro.test.ts` | 0 | 13 passed |
| `apps/web` vitest `src/lib/playback/c-resolution-repro.test.ts` `src/lib/c-ordered-import-repro.test.ts` | 0 | 4 passed |
| `apps/api` vitest `--config vitest.integration.config.ts` `test/c-library-import-repro.integration.test.ts` | 0 | 2 passed |
| same config, existing `test/provider-callback.integration.test.ts` | 0 | 8 passed (`evidence/c-soundcloud-oauth-callback.log`) |

`git apply --check` of `repro/c-followup-repro.patch` against this checkout succeeded (check only;
the patch was not applied). Copies: `repro/c-api-resolution-repro.test.ts`,
`repro/c-web-resolution-repro.test.ts`, `repro/c-ordered-import-repro.test.ts`,
`repro/c-library-import-repro.integration.test.ts`.

### C-21 — Distinct recordings share one match key, and resolve attaches the first hit

- **Category:** cross-provider identity. **Severity:** P2. **Confidence:** high (the code does
  this; part of the parenthetical strip is specified, see counterevidence). **Status:** Confirmed.
- **Refs:** `apps/api/src/lib/same-song.ts:38` (`DURATION_TOLERANCE_MS = 4000`), `:63-70`
  (every parenthetical and bracket dropped; trailing remix/version/edit/mix tail dropped;
  `featuring|feat\.?|ft\.?` with no word boundary; then `[^a-z0-9]` deletes every other script),
  `:94-108` (first duration-compatible track wins), `apps/api/src/lib/resolve-provider.ts:55-56`
  (`own.find(...)` returns on the first strong hit — no uniqueness check), route
  `apps/api/src/routes/tracks.ts:242-243` (that hit is inserted).
- **Trigger:** a Spotify library row "Levels" / Avicii / ~203 s, then
  `POST /tracks/:id/resolve-provider` for SoundCloud. Search returns "Levels (Instrumental)"
  (or Live, Acoustic, Karaoke, "Levels - Club Mix") within 4 s, possibly ahead of the exact title.
- **Expected:** a different recording stays a confirm candidate. Auto-attach only when one
  candidate is the same recording. `feat`/`ft` do not edit the inside of unrelated words.
  Titles that differ only by non-Latin characters do not collapse.
- **Observed:** `makeMatchKey` is identical for "Levels" and for Instrumental / Live / Acoustic /
  Karaoke / Acoustic Version / Live Edit / Club Mix. `resolveTrackProvider` returns
  `{kind:'match'}` for an instrumental 1 s shorter, and when both a live version and the exact
  title match it returns the live row because it was first. `normalizeForMatch('東京 Love') ===
  normalizeForMatch('大阪 Love')` (`love`), and `findSameSongMatch` merges them.
  `normalizeForMatch('Left Behind') === 'le behind'`; `normalizeForMatch('Defeated') === 'de ed'`.
- **Impact:** resolution silently writes a provider id for the wrong recording onto the library
  track. Live then plays that recording (`PROVIDER_ORDER` prefers SoundCloud). The module header
  says a wrong merge is worse than a duplicate.
- **Evidence:** API unit repro, 11 C-21 tests green. `evidence/c-followup-repro-run.log`.
- **Test limits:** injected search, no live catalog. Did not measure how often provider search
  ranks a variant first.
- **Counterevidence:** stripping parentheticals is specified. The normalizer comment cites
  `(live)` as noise (`same-song.ts:63`), and `same-song.test.ts:30-38,64-66` locks
  "Levels (Radio Edit)" and "[Remastered]" to the base title. `findSameSongMatch` "picks the
  first matching track" (`same-song.test.ts:107-110`). Those tests do not cover Instrumental /
  Karaoke / Club Mix as a *playback* substitute, do not cover an unanchored `feat`/`ft`, and do
  not cover non-Latin residue. The harmful part is the combination: an empty version allowlist,
  a script-deleting fold, an in-word `feat`/`ft` strip, and auto-attach of whichever hit is first.
- **Remediation direction:** auto-attach only a unique hit whose normalized title still matches
  after a version allowlist (feat/remaster, not every parenthesis). Anchor `feat`/`ft` at a
  token boundary. Do not match when normalization deletes a non-Latin title down to a shared
  Latin fragment. Several remaining hits go to the confirm list.
- **Acceptance checks:** instrumental/karaoke/club-mix does not auto-attach when an exact-title
  hit exists; "Left Behind" does not equal "Le Behind"; "東京 Love" does not match "大阪 Love";
  two same-key search hits return `kind:'candidates'`.
- **Open-PR overlap:** none.

### C-22 — A 4 s same-song match fails Live at the 1 s endpoint tolerance

- **Category:** cross-provider duration / playback window. **Severity:** P2. **Confidence:** high.
  **Status:** Confirmed.
- **Refs:** `same-song.ts:37-38,82-84` ("encodes/edits drift a little", accept ≤ 4 s),
  `apps/web/src/lib/playback/runtime.ts:99-105,584-597` (a finished position ≥ 1 s short of the
  saved window is "a real duration mismatch" and calls `transportFailure`),
  `coordinator.ts:147-149` (window end is `clipStartMs + track.durationMs`),
  `apps/api/src/lib/run-payload.ts:203-206` (that duration is the library row, not the playing
  provider), `track-import.ts:57-66` (attach does not update `tracks.duration_ms`),
  `apps/web/src/lib/providers.ts:22` (`PROVIDER_ORDER` is soundcloud, spotify, apple_music),
  `soundcloud-adapter.ts:316-327` (after FINISH, transport position is the widget's
  `getDuration()`, the SoundCloud recording's length).
- **Trigger:** Spotify import stored 203.000 s. Resolve attaches a SoundCloud recording at
  199.500 s (inside 4 s). Both connections are usable. Start Live.
- **Expected:** a recording the matcher called the same song can finish. The 1 s budget exists
  for whole-second MusicKit reporting (`runtime.ts:99-104`), not for a second provider's encode.
- **Observed:** selection prepares SoundCloud. The adapter reports ended at 199.500 s. The
  shortfall is 3.5 s, so the class enters `error` with "Music ended before the saved playback
  window." The same split fails `findSameSongMatch` only past 4 s, so every attach in the open
  interval (1 s, 4 s] is playable at match time and unplayable at runtime.
- **Impact:** the cross-provider ref Live prefers is the one most likely to trip the endpoint
  check. The instructor is told to check the duration or skip.
- **Evidence:** API unit test (matcher accepts 199.500 vs 203.000) and web runtime test (fake
  adapter reports that endpoint; status `error`). Both green.
- **Test limits:** fake adapter, not a widget. The production SoundCloud path does use
  `getDuration()` as the finished position, which is what the fake supplied. Did not measure
  real Spotify-vs-SoundCloud duration deltas.
- **Counterevidence:** an attach whose durations differ by < 1 s passes both checks. Spotify
  playback of the original import uses the duration the row was stored from, so this is specific
  to playing the other provider's ref.
- **Remediation direction:** treat a finished provider that reached its own reported duration as
  the window end when the shortfall is within `DURATION_TOLERANCE_MS`, or lower the matcher
  tolerance to the runtime's 1 s. Don't key the teaching window on a different provider's
  metadata once another ref is selected.
- **Acceptance checks:** a SoundCloud finish 3.5 s short of the stored Spotify duration, and
  within 4 s, advances or ends the class instead of `transportFailure`. A shortfall past 4 s
  still fails. Update is covered by the web repro.
- **Open-PR overlap:** none.

### C-23 — Attach bypasses the SoundCloud alias identity C-8 fixed for import

- **Category:** provider-id identity. **Severity:** P3. **Confidence:** high. **Status:** Confirmed.
  Does not reopen C-8: `importTrackFromCandidate` still queries `providerTrackIdAliases`
  (`track-import.ts:176-198`, `packages/music/src/identity.ts:14-24`).
- **Refs:** `attachProviderId` inserts `candidate.providerTrackId` verbatim
  (`track-import.ts:57-66`) and on unique violation throws 409 without an alias lookup.
  `POST /tracks/:id/resolve-provider` calls that helper (`routes/tracks.ts:242-243`).
  `POST /tracks/:id/provider-ids` does the same insert (`routes/tracks.ts:189-204`). The unique
  index is exact `(owner, provider, provider_track_id)` (`schema.ts:197-201`), so `4242` and
  `soundcloud:tracks:4242` are different keys.
- **Trigger:** a pre-URN library row holds SoundCloud `4242`. Resolve (or a manual provider-id
  post) attaches `soundcloud:tracks:4242` to a different track.
- **Expected:** the alias helper used on import: the URN is the same ref as `4242`, so the
  attach is a no-op on that row or a 409 if it already belongs to another track.
- **Observed (local D1):** the attach succeeds on the other track. A later
  `importTrackFromCandidate` of the URN prefers the literal row (`track-import.ts:194-198`) and
  returns the other track, not the legacy one. Importing the numeric form still prefers the
  legacy row. One SoundCloud recording, two library tracks, and which one you get depends on
  the id spelling.
- **Impact:** new imports and playback refs bind to the track that received the URN. The legacy
  row keeps a second spelling of the same id. Needs a leftover numeric id plus an attach onto
  some other track, so this is narrower than C-21.
- **Evidence:** integration test green (both rows exist; URN import returns the attached track).
  The unit assertion only shows the two alias strings are distinct; it does not prove the
  bypass. The D1 test does.
- **Test limits:** calls `attachProviderId` directly, which is what the resolve route calls. Did
  not drive the HTTP route. No live SoundCloud id.
- **Counterevidence:** a fresh URN import with no pre-existing numeric row is idempotent and
  hits one track. C-8's import-lookup fix holds when attach is not involved.
- **Remediation direction:** resolve aliases inside `attachProviderId` and the provider-id
  route. If any alias already exists on another track, 409 (or return that track). If it exists
  on this track, return the track unchanged.
- **Acceptance checks:** the integration repro's second track stays without a SoundCloud row;
  importing the URN returns the legacy track.
- **Open-PR overlap:** none.

### C-24 — A lost URL-import response retries as a new commit and duplicates the playlist

- **Category:** ordered import / uncertain commit. **Severity:** P2. **Confidence:** high.
  **Status:** Confirmed.
- **Refs:** `TrackSearch.tsx:654-667` (`commitPreviewOccurrences` builds
  `createOrderedImport(candidates)` with no `storageKey`, then `songBlocks: true`).
  `ordered-import.ts:99-106` (`persist` returns immediately without a key). `:193-198` keeps
  `session.pending` on a network error (only `ApiError` with status < 500 clears it), but that
  object is discarded with the call. `:247-249` mints a new `operationId` per commit.
  `importList` (`TrackSearch.tsx:689-709`) calls `onAdded` only after the commit resolves, and
  `onAdded` is what reloads the class (`Dashboard.tsx:4358-4371`). The duplicate guard reads
  `providerTrackKeysFromRun(payload?.tracks)` (`Dashboard.tsx:4177`), so a failed attempt leaves
  it stale. Server: receipts are per `operationId` (`ordered-class-import.ts:138-175`); the
  comment at `:140-141` says this layer does no library dedup; `class_tracks` has no
  `(class_id, track_id)` unique (`schema.ts:279-295`). A second song-block commit is `append`
  once the class has songs (`class-plan-blocks.ts:196-206`). `layoutSongBlockCommit`
  (`ordered-class-import.ts:39-55`) accepts the append when `orderedIds` lists the existing
  placement ids in position order — `GET /classes/:id/tracks` is
  `orderBy(position)` (`routes/class-tracks.ts:326-335`) and `mergeImportOrder` preserves that order.
- **Trigger:** paste a playlist URL, the commit lands, the response is a network failure. The
  instructor submits the same link again without reloading.
- **Expected:** the retry replays the same operation (the persisted-session control) or sees the
  songs already in the class and does not append them.
- **Observed:** the first call leaves three class rows and surfaces the fetch error. The second
  fresh session has new placement ids and a new operation id, so the fake (and the real receipt
  table) treats it as a new commit. Rows become a, b, c, a, b, c. The control with one
  `storageKey` replays the operation and stays at two rows.
- **Impact:** the in-session retry that the error asks for doubles the class. A full reload
  would refresh `existingProviderTrackKeys` and take the duplicate-picker branch instead
  (`TrackSearch.tsx:698-703`); the bug is the retry that does not reload.
- **Evidence:** web unit repro, both C-24 tests green.
- **Test limits:** the server is a fake keyed by `operationId`, matching the receipt rule. The
  D1 commit function was traced, not executed in this pass. Saved-playlist import passes a
  `storageKey` (`TrackSearch.tsx:515-537`) and is the control, not the bug.
- **Counterevidence:** a retry that keeps the same session object replays `session.pending`
  (`ordered-import.ts:202`). URL import never keeps that object.
- **Remediation direction:** persist the URL session under a key derived from class + submitted
  URL, or after any non-`ApiError` reload class tracks and mark provider ids already present as
  added before creating new placement ids.
- **Acceptance checks:** the C-24 repro's second fresh attempt does not grow the class; the
  persisted-key control still adds nothing. A D1 test that commits twice with different
  operation ids and the same library track ids either no-ops or 409s.
- **Open-PR overlap:** none.

### C-25 — Unresolved songs are omitted and the import reports success

- **Category:** ordered import / partial failure. **Severity:** P2. **Confidence:** high.
  **Status:** Confirmed.
- **Refs:** `ordered-import.ts:219-234` (any `importTrack` rejection is swallowed; comment says
  retry later), `:240-242` (placements are only entries that received a `trackId`), `:265`
  (`return {error:null}` when the commit loop finishes). An empty placement list skips the
  commit (`i < placements.length`) and still returns success. URL caller
  `TrackSearch.tsx:666` throws only when `outcome.error` is set, then `importList` clears the
  URL and calls `onAdded` (`:705-709`).
- **Trigger:** URL import of three songs; the middle `importTrack` returns 429 `RATE_LIMITED`
  (or any other rejection: 409 from C-26, 5xx, network).
- **Expected:** the result says the playlist is incomplete and the failed song stays in the
  draft so a retry can send it. A total failure is not success.
- **Observed:** `{error:null}`, class rows are only the songs that resolved (`library-a`,
  `library-c`), and one session entry stays `added: false`. The URL caller treats that as a
  finished import. With no `storageKey`, the unadded entry is discarded with the session.
- **Impact:** a rate limit or a raced 409 drops songs while the UI clears the link and reloads
  as if the playlist landed. A persisted playlist session keeps the entry (`added: false`) and
  clears the error string (`TrackSearch.tsx:584`), so the row can be retried but nothing says
  why it was skipped.
- **Evidence:** web unit repro green.
- **Test limits:** fake `importTrack` / `importClassTracks`. The swallow is the production
  `catch` with an empty body; the URL success path was read, not clicked.
- **Counterevidence:** a commit that throws (network error on `importClassTracks`, or the
  reorder guard) does return `outcome.error` (`ordered-import.ts:266-269`). Library-resolve
  failures never enter that path.
- **Remediation direction:** if any wanted entry has no `trackId`, return an error (or a
  partial count the URL caller refuses to treat as done) and keep the session. Surface 429 as
  rate-limited, not as a skipped song.
- **Acceptance checks:** the C-25 repro returns a non-null error and does not clear a URL
  draft; a later retry of the same session imports only the missing song.
- **Open-PR overlap:** none.

### C-26 — Concurrent first imports of one provider track: one caller gets 409

- **Category:** library import idempotency. **Severity:** P3. **Confidence:** high.
  **Status:** Confirmed.
- **Refs:** `importTrackFromCandidate` returns an existing ref when the lookup sees it
  (`track-import.ts:199-201`). Two callers that both miss that lookup both `createNewTrack`;
  the unique index makes the loser throw 409 (`:151-159`, message "That provider track is
  already in a library.") instead of re-reading the winner. A sequential third call is
  idempotent (`created: false`).
- **Trigger:** two overlapping imports of a provider track that is not in the library yet
  (two tabs, or an import racing another). Ordered import dedupes inside one session
  (`ordered-import.ts:221-229`), so this is cross-request. Inside ordered import the 409 is
  then swallowed by C-25, and that song is left out of the class even though the library row
  exists.
- **Expected:** the loser observes the same idempotent result as the sequential call.
- **Observed (local D1):** settled statuses are `ok` and `409`. The retry after the race
  returns the existing track.
- **Impact:** a spurious conflict on a row that was just created. Recoverable by retry on the
  single-song button (`TrackSearch.tsx` `add` sets the error). Not recoverable without a retry
  on the ordered-import path, because that path reports success (C-25).
- **Evidence:** integration test green.
- **Test limits:** calls the library helper, not the HTTP route. One user, one new Spotify id.
- **Counterevidence:** the unique index prevents a duplicate library row. The race does not
  corrupt the winner.
- **Remediation direction:** on unique violation, select the caller's existing ref and return
  it the way the pre-insert branch does.
- **Acceptance checks:** the repro's two concurrent calls both fulfill with the same track id;
  a different owner importing the same provider id still succeeds (per-user libraries).
- **Open-PR overlap:** none.

### SoundCloud OAuth — assessed, no new accepted finding

Traced the connect flow and re-ran the existing callback suite. Agrees with Lane A R-7.

- **State / PKCE.** `POST /providers/:provider/connect` is `requireSession`. It mints a 32-byte
  verifier and an S256 challenge (`pkce.ts:13-26`), puts `{state, verifier, provider, userId, exp}`
  in an encrypted httpOnly `SameSite=Lax` cookie (`provider-connections.ts:255-268`, TTL 10 min),
  and returns `buildSoundCloudAuthorizeUrl` (`soundcloud-oauth.ts:37-50`: `response_type=code`,
  `code_challenge_method=S256`). The SPA posts with `credentials: 'include'`
  (`apps/web/src/lib/api.ts:84-85`).
- **Callback binding.** `GET /providers/:provider/callback` has no session, by design (a JSON 401
  would break the redirect). It deletes the cookie, decrypts it, and requires query `state` and
  path provider to match (`provider-connections.ts:286-305`). The code is exchanged with the
  cookie's verifier (`:312-318`). The row is upserted for `payload.userId` — the user who called
  connect — not whoever is logged in when SoundCloud redirects (`:320-322`). A callback swap
  needs that cookie. The victim's browser does not have the attacker's cookie. Re-ran
  `provider-callback.integration.test.ts`: garbage cookie, consent `error`, state mismatch,
  provider mismatch, expired cookie, unsupported provider, and a SoundCloud exchange with no
  credentials all 302 to `/?error=…` (8 passed). The exchange failure log line is
  `SoundCloud is not configured.` No code or token is logged (`:331-335`).
- **Refresh rotation.** `refreshSoundCloudToken` posts `grant_type=refresh_token`
  (`soundcloud-oauth.ts:98-111`). Both persist sites write a returned refresh token and, when
  the response omits one, keep the previous ciphertext (`user-likes.ts:185-188`,
  `user-playlists.ts:437-439`). A successful rotation is not dropped. A failed refresh is still
  the C-2 `409 REAUTH_REQUIRED` (`user-likes.ts:176-178`). C-16 is unchanged and stays a
  Hypothesis: two callers can spend one rotating refresh token, and the loser does not re-read
  the winner's new ciphertext. This pass did not stub that race.

Not filed:

- **`providerUserId` is always null** on the redirect upsert (`provider-connections.ts:327`), so
  a later reconnect cannot tell two SoundCloud accounts apart. Not reproduced; the column is
  unused by every redirect provider, not only SoundCloud.
- **One `rf_oauth_state` cookie.** A second connect overwrites an in-flight one. The first
  callback then fails closed (`state_mismatch` / `state_missing`). Not a swap.
- **No `scope` on the authorize URL.** The helper and `soundcloud-oauth.test.ts` ship that
  shape. No in-repo evidence that SoundCloud rejects it. Not called live.

### Follow-up commands

| Command | Exit |
| --- | --- |
| API unit `c-resolution-repro.test.ts` | 0 |
| Web unit `c-resolution-repro.test.ts` + `c-ordered-import-repro.test.ts` | 0 |
| API integration `c-library-import-repro.integration.test.ts` | 0 |
| API integration `provider-callback.integration.test.ts` | 0 |
| `git -C /workspace apply --check` `repro/c-followup-repro.patch` | 0 |
| Full CI gate, browser, ports 5173/8787, real provider APIs | not run |
