# Lane c-music — provider / music / client playback

Reviewer: Claude Code lane `c-music`. Audited SHA `4c344e2` (`main`). IDs use the `CM-` prefix so they
do not collide with the prior audit's `C-1..C-26`. Audit-only: no tracked file was edited. Repros ran
in a disposable worktree (`<scratchpad>/wt-c-music`, `git worktree add --detach … 4c344e2`,
`pnpm install --frozen-lockfile --offline`). No provider API, credential, production system, browser
or provider audio was touched. Every playback statement is about adapter/coordinator logic driven by
fake SDKs. Real playback, real devices and real browser engines were not exercised.

## Summary

| ID | Sev | Status | One line |
| --- | --- | --- | --- |
| CM-01 | P2 | Confirmed (fake SDK, real adapters + real runtime) | A Live seek, skip, or quick pause/resume while a Spotify start or an Apple queue/play is still in flight fails the class with "still finishing a cancelled … request" |
| CM-02 | P2 | Confirmed logic (WebIDL receiver check emulated; jsdom shows the same brand check) | The #634/#636 FairPlay probe calls `navigator.requestMediaKeySystemAccess` unbound, so in a real engine it throws `TypeError`, never requests `com.apple.fps`, and always records `null`: the `modern-access:` diagnostic for RF-29 can never appear |
| CM-03 | P3 | Confirmed logic, provider rotation behaviour unverified (extends C-16) | Dashboard loads likes and playlists for the same provider in parallel. Inside the 60 s server skew window both refresh with the same refresh token; with a single-use token the loser returns `409 REAUTH_REQUIRED` for a healthy grant |

Rejected and not-filed leads are listed in §3. Gaps are in §4.

## 1. Scope and depth

Depth key: **traced** = read end to end with callers; **tested** = traced plus an executed repro;
**sampled** = read selectively; **not assessed**.

| Area | Files | Depth |
| --- | --- | --- |
| #634 / #636 diffs (FairPlay flag, probe, `suppressErrorDialog`) | `apps/web/src/lib/musickit.ts`, `playback/apple-music-adapter.ts` (`git show bf31706 535e61a`) | tested (CM-02) |
| Apple adapter lifecycle (queue generations, transport owner, pending plays, finish capture) | `playback/apple-music-adapter.ts` | traced; tested through CM-01 |
| Spotify adapter + SDK singleton + Connect start | `playback/spotify-adapter.ts`, `spotify-playback.ts` | traced; tested through CM-01 |
| SoundCloud widget adapter | `playback/soundcloud-adapter.ts` | traced |
| Runtime coordinator (enter/epoch, bounded, sampleTransport, endpoint tolerance, fail) | `playback/runtime.ts` | traced; tested (CM-01) |
| Selection / preflight / clip-window math | `playback/coordinator.ts`, `apps/api/src/lib/duration.ts`, `run-payload.ts` (clip fields) | traced |
| Builder preview controller | `playback/preview.ts` | traced |
| Liveness observer | `playback/liveness.ts`, `runtime.ts` `probeLiveness` | traced |
| Live seek/resume wiring | `components/LiveMode.tsx:640-760` | sampled (seek throttle, retry, start) |
| Provider connections (connect/callback/state cookie/Apple token/disconnect) | `apps/api/src/routes/provider-connections.ts`, `lib/pkce.ts`, `lib/crypto.ts` | traced |
| Token refresh/persist (likes, playlists, playback token) | `lib/music/user-likes.ts`, `user-playlists.ts`, `spotify-playback-token.ts` | traced; tested (CM-03) |
| Disconnect purge queue | `lib/music/purge.ts` | traced (D-1 known; no new defect) |
| Registry / Apple developer JWT | `lib/music/registry.ts`, `provider-config.ts`, `lib/apple-jwt.ts` | traced |
| Saved-playlist import | `lib/music/import-playlist.ts` | traced (C-24/C-25/C-26 known) |
| Playlist URL parsing, SoundCloud id aliases | `packages/music/src/playlist-url.ts`, `identity.ts` | traced |
| Provider-URL id encoding | `packages/music/src/{spotify,apple-music,soundcloud}.ts` (grep) | sampled |
| BPM compliance | `lib/music/bpm-lookup.ts`, `packages/music/src/bpm.ts` | traced |
| Music constraints (no caching / proxy / analysis / Spotify BPM) | repo grep, `apps/web/vite.config.ts` | sampled — hold |
| `retry.ts`, SoundCloud/Spotify/Apple server adapters beyond the above | — | not re-assessed (prior C-lane tested) |
| Real SDK / widget / audible behaviour, real Safari/iOS | — | **cannot be assessed here** |

Existing suites stayed green in the worktree for the touched modules (repros are additive files).

## 2. Candidates

### CM-01 — A seek during an in-flight Spotify start or Apple queue/play fails the Live class

- **Category:** playback seam / concurrency (seeking, pause/resume). **Severity:** P2 — a common
  instructor gesture halts Live music with an error banner on two of three providers; recoverable by
  Retry once the old SDK call settles, no data loss. **Confidence:** high for the logic; the timing
  depends on real start latency (token fetch + `PUT /me/player/play`, or MusicKit `setQueue`), which
  is routinely hundreds of ms. **Status:** Confirmed with real adapters and the real runtime over
  fake SDKs.
- **Refs:**
  - Runtime: every seek/resume/skip re-enters and builds a fresh adapter —
    `apps/web/src/lib/playback/runtime.ts:246-260` (`resume`, `seek` → `enter`), `:298-302`, `:473-484`
    (`destroyTransitioningAdapter` aborts the in-flight one), `:437-450` (any `prepare` rejection in
    the current epoch → `fail({phase:'prepare'})`).
  - Spotify lease: `apps/web/src/lib/playback/spotify-adapter.ts:170-173` (`prepare` throws
    "Spotify is still finishing a cancelled start request. Retry after it finishes, or reload." while
    `pendingStarts` holds the player), `:200-228` (lease held until the Connect command settles,
    even after `destroy`). The command is `startSpotifyTrack`
    (`apps/web/src/lib/spotify-playback.ts:218-243`): a `GET /providers/spotify/playback-token`
    round trip, then `PUT /me/player/play`.
  - Apple leases: `apps/web/src/lib/playback/apple-music-adapter.ts:200-203` (`pendingPlays`),
    `:468-472` (`pendingQueueGenerations` → "still finishing a previous queue request").
  - Live wiring: `apps/web/src/components/LiveMode.tsx:648-657` (drag commits a seek at most every
    200 ms; taps/keys flush immediately), `:727-741` (play/pause toggle → `pause()`/`resume()`), `:743-752` (Retry).
- **Trigger:** Live, current track is Spotify (or Apple Music). The instructor drags the timeline,
  taps a row/skip twice, or toggles pause/play while the provider start for the current position is
  still in flight.
- **Expected:** the newer intent wins. The runtime waits for (or queues behind) the superseded SDK
  call and then starts the new position. The design comment at `runtime.ts:138-142` says "A pending
  old SDK call cannot block a new epoch".
- **Observed:** the new epoch's `prepare` hits the lease and rejects; the runtime treats that as a
  prepare failure and enters `error` with "Spotify is still finishing a cancelled start request.
  Retry after it finishes, or reload." (Apple: "… still finishing a previous queue request …"). When
  the old call later settles nothing resumes; status stays `error`.
- **Impact:** Live music stops on an ordinary scrub. The banner tells the instructor to retry or
  reload mid-class. A drag across the timeline on a Spotify track is close to guaranteed to trip it,
  because commits arrive every 200 ms and a start takes longer. Retry works only after the old call
  settles (`retryPlayback` builds a new coordinator that hits the same lease if tapped too soon).
- **Evidence:** `repro/c-music-playback-repro.test.ts` › "CM-01" (2 tests green):
  `pnpm --filter @ritmofit/web exec vitest run src/lib/playback/c-music-playback-repro.test.ts`
  after copying the file into `apps/web/src/lib/playback/`. Spotify case: `start(0)` with a pending
  `startTrack`, then `seek(60_000)` → status `error`, message matches `still finishing a cancelled
  start request`; resolving the old start leaves `error`. Apple case: `start(0)` with a pending first
  `setQueue`, then `pause()` + `resume(0)` → status `error`, message matches `still finishing a
  previous queue request`. Log: `evidence/c-music-repro-run.log`.
- **Existing coverage and why it misses:** `spotify-adapter.test.ts:403-431` and
  `apple-music-adapter.test.ts:387,961` assert the adapter-level refusal as intended. The runtime
  suite's supersession tests (`runtime.test.ts:408-600`) use `FakeAdapter`, which has no shared
  lease, so they never see a refusal. The one runtime test with a real Apple adapter
  (`runtime.test.ts:1270`) covers pause-only, not a following resume/seek.
- **Counterevidence considered:** the lease itself is correct and needed (it stops a late
  Connect/MusicKit call from starting stale audio over a newer one). SoundCloud has no shared
  singleton, so it is unaffected. Spotify work is tabled by the owner (RF-92), which lowers priority
  for the Spotify half but not for Apple.
- **Remediation direction (not implemented):** in the runtime (or the adapters), treat a held lease
  as "wait", not "fail": await the superseded command's settle promise (bounded) before the new
  `prepare`, then re-check the epoch. Alternatively expose a `whenIdle()` from each singleton
  adapter module that `enterTrack` awaits.
- **Fix check:** both CM-01 repro tests should end in `playing`/`buffering` at the new position,
  with exactly one live transport owner and the stale start paused.
- **Known status:** new. Not C-3/C-3b/C-4 (those are device/relink/null-state). Seam with the
  front-end lane.
- **Owner-gated paths:** yes — provider and playback code (`apps/web/src/lib/playback/**`) is
  owner-gated per `scripts/owner-gate.mjs`.
- **Needs real browser/device:** to confirm real start latency against the 200 ms commit cadence,
  yes; the logic does not.

### CM-02 — The FairPlay probe never actually calls `requestMediaKeySystemAccess`

- **Category:** correctness of new diagnostic code (#634/#636). **Severity:** P2 as proposed, because
  this probe is the evidence the open P1 RF-29 iPhone check is meant to collect, and it will always
  read "no result". Downgrade to P3 if the lead treats it as diagnostic-only, since playback itself
  is not gated by it. **Confidence:** high. WebIDL operations require a `Navigator` receiver; an
  unbound call throws `TypeError` in Blink ("Illegal invocation") and WebKit ("Can only call
  Navigator.requestMediaKeySystemAccess on instances of Navigator"). **Status:** Confirmed logic.
  jsdom (webidl2js) enforces the same receiver check on its own `Navigator` methods, and the repro
  emulates it for `requestMediaKeySystemAccess`. Not run in Safari.
- **Refs:** `apps/web/src/lib/musickit.ts:140-152`:
  ```ts
  const request = navigator.requestMediaKeySystemAccess;
  if (typeof request !== 'function') return null;
  try {
    await request(FAIRPLAY_KEY_SYSTEM, [audioOnlyFairPlayConfiguration()]);
  ```
  `:124-127` (`domExceptionName` returns null for a `TypeError`), `:162-175` (result cached for the
  page), `apple-music-adapter.ts:150-157` (banner adds `modern-access: <word>` only when non-null),
  `:267-274` (awaited before `instance.play()` on iOS Safari / WebKitMediaKeys).
- **Trigger:** any browser where the probe path is selected (iOS Safari, or any engine exposing
  `WebKitMediaKeys` such as desktop Safari).
- **Expected:** `com.apple.fps` access is requested once. The banner reads `modern-access: ok` or
  the DOMException name (e.g. `NotSupportedError`), which is what the PR descriptions say it records.
- **Observed:** the call throws `TypeError` synchronously inside the async function, the catch maps
  it to `null`, and `modernAccessProbe` caches `null` for the page. The key system is never
  requested, the banner never carries `modern-access:`, and the only remaining output is the
  `mk-safari-modern-eme` console line.
- **Impact:** the RF-29 device check cannot tell "modern EME access granted" from "denied" from
  "probe skipped". A missing word is easy to read as "probe skipped", which misleads the next
  FairPlay decision. No playback behaviour changes, because MusicKit's own call is bound correctly
  inside the SDK.
- **Evidence:** `repro/c-music-playback-repro.test.ts` › "CM-02" (2 tests green). (1) jsdom: calling
  the unbound `navigator.javaEnabled` throws "… not a valid instance of Navigator". (2) With an iOS
  Safari UA and a receiver-checked `requestMediaKeySystemAccess` stub, the probe resolves `null` and
  the stub is called 0 times. The control call with the right receiver resolves. Log:
  `evidence/c-music-repro-run.log`.
- **Existing coverage and why it misses:** `musickit.test.ts:252-300` and
  `apple-music-adapter.test.ts:470-520` install `vi.fn()` as `navigator.requestMediaKeySystemAccess`.
  A mock does not check its receiver, so `request(...)` succeeds in tests and the suite asserts
  `'ok'`.
- **Counterevidence considered:** some engines tolerate an undefined `this` for operations on the
  global object (`Window`), but `requestMediaKeySystemAccess` is on `Navigator`, so this does not
  apply. No polyfill re-binds it in the app (grep: only `musickit.ts:142` reads it).
- **Remediation direction:** call it as a method
  (`navigator.requestMediaKeySystemAccess(...)` or `request.call(navigator, …)`). When it becomes a
  real call, bound it with a short timeout. A never-settling access promise would otherwise hold
  `pendingPlays` and wedge every later Apple play until reload. Make the test double reject an
  unbound receiver.
- **Fix check:** the CM-02 repro's probe resolves `'ok'` with one call. In a real iPhone Safari, the
  banner shows `modern-access: …` on a forced playback error.
- **Known status:** new. It bears on RF-29 (open P1 verification) and does not re-file it.
- **Owner-gated paths:** yes (Apple playback code).
- **Needs real browser/device:** only to observe the real word (`ok`/DOMException name) after the
  fix; the defect itself is engine-independent.

### CM-03 — Parallel shelf loads spend one refresh token twice (extends C-16)

- **Category:** token refresh race. **Severity:** P3 — a spurious "reconnect" on one shelf, in a
  60 s window per hour. It rises to P2 only if the provider revokes the whole grant on refresh-token
  reuse (OAuth 2.1 reuse detection), which was not verified. **Confidence:** high for the logic,
  unverified for provider rotation. **Status:** Confirmed logic. This promotes C-16 from Hypothesis
  with a concrete in-app trigger.
- **Refs:** `apps/web/src/components/Dashboard.tsx:1739-1803` (two effects fire `listPlaylists` and
  `listLikes` for every connected provider on the same `connections` change). Web treats a
  connection as connected while `expiresAt > now` (`apps/web/src/lib/providers.ts:110` `providerConnectionState`),
  but the server refreshes when `now > expiresAt − 60 s` (`user-likes.ts:120-125`,
  `user-playlists.ts:306-310`). Both paths read the row, then call `refreshAndPersist` with the same
  stored refresh token (`user-likes.ts:156-193`, `user-playlists.ts:407-444`). A failed refresh maps
  to `409 REAUTH_REQUIRED` (`user-likes.ts:176-179`), and nothing re-reads the row the winner just
  updated.
- **Trigger:** open the library (or reload) during the last minute of a SoundCloud or Spotify
  access token's life.
- **Expected:** one refresh per grant. Concurrent callers share it, or the loser re-reads the
  persisted pair and retries once.
- **Observed (repro):** two refresh calls with `refresh-1`. Single-use semantics fulfil one and
  reject the other with `REAUTH_REQUIRED`, although the row now holds a valid rotated pair
  (`enc:refresh-2`).
- **Impact:** one shelf shows "Reconnect" for a healthy grant until the next reload. If the
  provider applies reuse detection, the winner's new token is revoked too and the user must
  genuinely reconnect.
- **Evidence:** `repro/c-music-refresh-race-repro.test.ts` (1 test green):
  `pnpm --filter @ritmofit/api exec vitest run src/lib/music/c-music-refresh-race-repro.test.ts`
  after copying into `apps/api/src/lib/music/`. Log: `evidence/c-music-repro-run.log`.
- **Existing coverage and why it misses:** `user-likes.test.ts` / `user-playlists.test.ts` test one
  request at a time against a static mock row.
- **Counterevidence considered:** outside the 60 s window the web gates shelves off entirely (C-1
  symptom), so the race window is narrow. Spotify usually returns no new refresh token, which makes
  a replay harmless. Whether SoundCloud invalidates the old refresh token on use was not verified
  (no network).
- **Remediation direction:** a per-connection refresh guard. Either a conditional update
  (`WHERE refresh_token_encrypted = <old>`) with a re-read and retry on loss, or on
  `invalid_grant` re-select the row and use a newer access token if `updatedAt` moved. Optionally
  align the web "connected" check with the server skew.
- **Known status:** extends C-16 (hypothesis → confirmed logic, new trigger). Overlaps C-2's
  catch-all mapping.
- **Owner-gated paths:** provider code — yes.
- **Needs real browser/device:** no. Provider rotation behaviour needs a real SoundCloud account.

## 3. Rejected / not-filed leads

- **#636 gating blocks desktop playback.** Rejected. Desktop Chrome/Firefox/Edge return null from
  `probeSafariModernFairPlayAccess` without yielding and never write the flag (`musickit.ts:81,163`).
  Desktop Safari exposes `WebKitMediaKeys` and was already on this path in #634.
- **Probe promise never settles.** Not reachable today. Because of CM-02 the probe rejects
  synchronously. It becomes a real risk once CM-02 is fixed without a timeout (noted in the CM-02
  remediation).
- **`suppressErrorDialog` hides errors.** No. The adapter's `mediaPlaybackError` listener still
  surfaces the banner (`apple-music-adapter.ts:150-157`).
- **`isIosSafari` false positives.** CriOS/FxiOS/EdgiOS/OPiOS excluded. iPad desktop UA is detected
  via `maxTouchPoints > 1`, and Macs report 0. iOS in-app WKWebViews (no `Safari/` token) fall to
  the legacy path; see Gaps.
- **Clip-window math.** `playbackWindowFor` = `[clipStartMs, clipStartMs + effective duration)`. The
  server clamps clip end to the base and rejects a start at or past the base
  (`duration.ts:22-33,66-78`). `startMs=0` skips the pre-play seek for SoundCloud/Apple/Spotify
  correctly. MusicKit seconds conversion is confined to `msToSeconds` and `currentPlaybackTime*1000`.
  No ms/s mix was found. Endpoint shortfall beyond 1 s is C-22 (known).
- **Stale callbacks after an adapter switch.** Apple and Spotify guard by `transportOwners` and
  `started`. SoundCloud gets a fresh iframe per track, and `teardownWidget` unbinds
  READY/PLAY/ERROR/FINISH before removing the iframe (PAUSE stays bound, but on a removed iframe).
  The runtime filters `onError`/`onFinish`/`onTransportState` by epoch and adapter identity. No
  defect.
- **Liveness false positives.** The observer is recording-only and cannot fail a class. The
  comparison basis resets on `trackIndex` only, so a backward seek within the same track records one
  `not_advancing` miss. Diagnostic noise only, not filed.
- **Preview controller.** Epoch and identity guards hold on play/pause/resume/stop/ended. A
  transitioning adapter's errors are ignored until promotion, but `prepare`/`play` rejections still
  surface. No defect.
- **OAuth state / PKCE.** 32-byte verifier, S256, 24-byte state, AES-GCM state cookie bound to
  `userId`/provider/exp, deleted before validation. This matches the prior lane's verdict and was
  not re-run.
- **Token encryption.** AES-256-GCM with a random 12-byte IV and the key = SHA-256(`ENCRYPTION_KEY`).
  Tamper fails closed. There is no AAD, but transplanting ciphertext needs DB write access. Not filed.
- **Purge queue.** Each duty binds both writes to the active queue row through `EXISTS`, so a
  reconnect that cancels it wins atomically. The no-op disconnect does not enqueue. Retry/fail
  bookkeeping is correct. The only defect is D-1 (bind limit, known). The purge strips refs
  regardless of how they were imported (catalog search vs user token): a policy choice, not filed.
- **Registry memoization.** Adapters are keyed by client id. An Apple JWT minted per isolate has a
  180-day expiry, longer than an isolate lives. Secret rotation under the same client id would keep
  the old secret until isolate recycle. That is ops, not filed.
- **Playlist URL / id injection.** Provider ids are `encodeURIComponent`-ed in every path segment
  sampled. The SoundCloud permalink goes only to `/resolve?url=` (encoded). Not filed.
- **Music constraints.** No audio-features/analysis calls or scopes. BPM comes only from GetSongBPM
  or the mock (`bpm-lookup.ts:32-50`). No `AudioContext`/`decodeAudioData`/`caches.open`/Workbox
  runtime caching. The Spotify token stays in memory. Hold.

## 4. Gaps

- No real Safari, iOS device or Chromium was available, so CM-02 rests on WebIDL semantics plus
  jsdom's equivalent check, not a Safari console. Whether awaiting the (fixed) probe before
  `instance.play()` consumes iOS transient activation is untested (RF-29 device check).
- iOS in-app browsers (WKWebView without `Safari/`) and a future macOS Safari without
  `WebKitMediaKeys` would take neither the flag nor the probe. This is a hypothesis about engines
  not available here.
- Real start latency for Spotify/MusicKit versus the 200 ms Live seek-commit cadence (CM-01
  likelihood) was not measured.
- SoundCloud refresh-token rotation and reuse-detection semantics (CM-03 severity) were not verified.
- `retry.ts`, SoundCloud pagination (C-12), Apple 401 mapping (C-13) and library ids (C-14) were not
  re-examined beyond the prior lane.
- The front-end Live UI around the error banner and Retry timing was sampled only.

## 5. Commands

| Command | Exit |
| --- | --- |
| `git worktree add --detach <scratchpad>/wt-c-music 4c344e2` + `pnpm install --frozen-lockfile --offline` | 0 |
| web: `pnpm exec vitest run src/lib/playback/c-music-playback-repro.test.ts` (first draft: 1 assertion used a cross-realm `TypeError` instanceof and failed; fixed to match the message) | 1 then 0 (4 passed) |
| api: `pnpm exec vitest run src/lib/music/c-music-refresh-race-repro.test.ts` | 0 (1 passed) |
| web: `pnpm exec vitest run src/lib/playback src/lib/musickit.test.ts` (existing suites + repro) | 0 (9 files, 251 passed) |
| api: `pnpm exec vitest run src/lib/music` (existing suites + repro) | 0 (15 files, 265 passed) |

Artifacts: `repro/c-music-playback-repro.test.ts` (CM-01, CM-02), `repro/c-music-refresh-race-repro.test.ts`
(CM-03), `evidence/c-music-repro-run.log`. The worktree was left in place for re-runs
(`/tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-c-music`). Full gate, e2e,
browser and provider network were not run.
