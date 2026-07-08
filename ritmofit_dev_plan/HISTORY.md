# Ritmo Studio Web — Status / Deploy History

Archived dated build & deploy log. The live docs ([`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md),
[`milestones.md`](./milestones.md)) keep current state + milestone definitions; this file is the
chronological record (PRs, Worker version ids, migration steps, per-slice detail).

> Append-only. Newest entries first within each section, as in the source docs.

---

## From DEVELOPMENT_PLAN.md — dated deploy log

> **Session 2026-07-08 (third parallel lane-agent round — mixed 1-polish/2-harden) — deployed (Worker
> `67f00f2b-8dd2-4bb5-be4a-cd5a868f4dd7`).** Main HEAD `645cf59` (merge of PR #250). Code-only — **no
> schema / migration** (remote D1: "No migrations to apply"). Runtime-surface slice: **PR #250** (Live
> Mode **start-focus placement** — the full-screen takeover was stranding keyboard/SR focus on `<body>`
> on entry and on the preflight→live transition, exactly as the class goes hands-free; now focuses the
> class-title heading on preflight entry and the transport's primary Play/Pause control when the class
> goes live, with the empty-class direct-to-live path made deterministic via a preflight-gated mount
> effect; FE-only `LiveMode.tsx` + 4 `document.activeElement` tests, driven live in Chrome). Production-
> code path change, **behavior-preserving but requires manual re-verification**: **PR #248** (drop dead
> PKCE `codeChallenge`/`codeVerifier` params from the Spotify **confidential-client** OAuth helpers —
> they never reached the wire, Basic-auth is the identity; SoundCloud PKCE untouched; the `ProviderOAuth`
> interface + connect route are unchanged so the registry still passes the full object and Spotify's
> slimmed functions stay structurally assignable; added a confidential-client contract test). **Manual
> Spotify connect round-trip re-verification pending** (authorize → `?connected=spotify` → "Connected to
> Spotify"; Worker log `GET /api/v1/providers/spotify/callback?... - Ok`). Also merged this round but
> **test-only / no runtime change** (not a deploy trigger, listed for the trail): **PR #249** (lock the
> run-payload **pre-downbeat beat/bar clamp** — a cue anchored before the track's first downbeat emits
> `{ beat: null, bar: null }`, not a garbage `bar: 0`; mutation-proven — neuter the `p.bar >= 1` guard
> and only the new test fails). Rollback anchor: prior live `7763f79c-662d-4aa4-a52c-8d12e78be411`.
> Remote D1: **no migrations to apply.** Pre-deploy gate (on `main`): format:check ✓ · typecheck ×4 ✓ ·
> lint ✓ · design-system verify ✓ · unit web 448 / api 352 ✓ · integration 86 ✓ · web build ✓ · OpenAPI
> no drift (48 schemas · 50 paths) ✓ · contract-parity (no untracked drift) ✓ · audit:ci ✓. Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-CCiP32t2.js` matches the
> build), `/api/v1/health` → `200`, `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`,
> security headers present (HSTS · CSP · Permissions-Policy · Referrer-Policy · X-Content-Type-Options ·
> X-Frame-Options), Spotify callback route mounted (`302`, not `404`), providers-connect · class-shares ·
> provider-search → `401`.

> **Session 2026-07-07 (web polish + hardening round — parallel lane-agents) — deployed (Worker
> `7763f79c-662d-4aa4-a52c-8d12e78be411`).** Main HEAD `f0b84cd` (merge of PR #246). Code-only —
> **no schema / migration** (remote D1: "No migrations to apply"). Deployed the two runtime-surface
> slices from a mixed 1-feature/2-harden round: **PR #242** (Classes library **search + sort**
> organization — client-side, diacritic-insensitive token-AND search over title + template with five
> stable sorts, over the loaded page set; honest "X of N loaded" framing + recoverable no-match state)
> and **PR #246** (**announce + harden keyboard track-reorder** for assistive tech — polite aria-live
> announcements for keyboard moves and already-first/last boundaries, assertive on a failed persist;
> the pre-existing ↑/↓ reorder mechanism gained a `silent` reload path in `loadDetail` that skips the
> loading mask so the workspace never unmounts, preserving grip focus + the announcement). Also merged
> this round but **test-only / no runtime change** (not a deploy trigger, listed for the trail):
> **PR #241** (lock run-payload clip-rebase × beat/bar for trimmed tracks), **PR #244** (lock class-list
> keyset pagination across a same-timestamp boundary — mutation-proven), **PR #243** (provider
> token-machinery + refresh-token rotation-omit coverage), **PR #245** (PROVIDER_UNAVAILABLE 503
> config-guard coverage incl. playback-token). Rollback anchor: prior live
> `9d0a5710-d140-4100-ad26-84aaf13ef3d9`. Remote D1: **no migrations to apply.** Pre-deploy gate (on
> `main`): format:check ✓ · typecheck ×4 ✓ · lint ✓ · design-system verify ✓ · unit web 444 / api 351 /
> music 5 ✓ · integration 85 ✓ · web build ✓ · OpenAPI no drift (48 schemas · 50 paths) ✓ ·
> contract-parity (7 tracked lag) ✓ · audit:ci ✓. Post-deploy smoke on live `https://ritmofit.studio`:
> SPA `/` → `200` (served hash `index-B_v5epWC.js` matches the build), `/api/v1/health` → `200`,
> `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`, security headers present (HSTS · CSP ·
> Permissions-Policy · Referrer-Policy · X-Content-Type-Options · X-Frame-Options).

> **Session 2026-07-07 (D21 workstation-shell consolidation + accumulated batch) — deployed (Worker
> `9d0a5710-d140-4100-ad26-84aaf13ef3d9`).** Merge commit `494aef6`. Code-only batch — **no
> schema / migration** (remote D1: "No migrations to apply"). Shipped the previously-merged-but-
> unshipped backlog in one deliberate batch: **PR #232** (D21 workstation-shell consolidation — primary
> nav unified to **Classes / Music / Live / Account**; Music is a first-class provider/source workspace
> with saved-playlist *and* liked-tracks browsing on its shelves; Live is a runnable-class queue with
> preflight readiness; Account is an in-page settings workspace), the **liked-tracks discovery shelf**
> (`9ade653` — browse likes → create class from likes, now surfaced in both the Classes resting state
> and the Music workspace via a shared `useProviderBrowseState` hook), and **PR #230** (SoundCloud
> saved-playlist read pagination fix). Also merged this session but no runtime change: **PR #233**
> (documented the two D21 saved-playlist endpoints + `ProviderPlaylistSummary` in OpenAPI — now 48
> schemas / 50 paths — and added Apple Music adapter tests) and **PR #234** (provider connection
> token-lifecycle tests; also wired a missing `test` script on `packages/music` so its first test
> actually runs, and fixed a latent mock bug it exposed). Rollback anchor: prior live
> `ded27a07-b006-411c-aa5f-ce923d3d440f` (saved-playlist browsing). Remote D1: **no migrations to
> apply.** Pre-deploy gate (on `main`): format:check ✓ · typecheck ×4 ✓ · lint ✓ · design-system verify
> ✓ · unit web 423 / api 308 / music 5 ✓ · integration 82 ✓ · web build ✓ · OpenAPI no drift (48
> schemas · 50 paths) ✓ · contract-parity ✓ · audit:ci ✓. Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-DkO1a4Yp.js` matches the build),
> `/api/v1/health` → `200`, `/api/v1/providers/spotify/playlists` (unauthenticated) → `401` (mounted,
> not `404`), `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`, security headers present
> (HSTS · CSP · Permissions-Policy · Referrer-Policy · X-Content-Type-Options · X-Frame-Options).

> **Session 2026-07-06 (saved-playlist browsing — D21 sub-slice) — deployed (Worker
> `ded27a07-b006-411c-aa5f-ce923d3d440f`).** Commit `eb229d5`. Additive API slice + frontend
> feature — **no schema / migration.** New endpoints: `GET /providers/:provider/playlists` (list
> connected user's saved playlists — Spotify OAuth, SoundCloud OAuth, Apple Music Music-User-Token)
> and `GET /providers/:provider/playlists/:playlistId/tracks` (drill-in track read for a single
> playlist). Shared `ProviderPlaylistSummary` DTO + `savedPlaylists` capability flag enabled for all
> three providers. Web: `TrackSearch` gains a **Saved playlists** mode (playlist list → per-playlist
> drill-in → per-track Add + **Import all N** bulk-import with concurrency-4 batching; `addedKeys`
> resets per playlist; empty-state copy scoped); resting provider shelf cards now load live playlist
> counts for connected providers and their summary text becomes a clickable **Browse** button;
> `PlaylistBrowserDialog` lets an instructor browse saved playlists from the resting state (no class
> open), pick a discipline template (Cycle / Pilates / HIIT), and create a new class from any playlist
> in one action (imports all tracks, then opens the class in the builder). Rollback anchor: prior live
> `b99ac98d-ea10-4efb-b42f-b068e479c550` (Spotify Web Playback SDK launch). Remote D1: **no migrations
> to apply.** Pre-deploy gate: format:check ✓ · typecheck ×4 ✓ · lint ✓ · design-system verify ✓ ·
> unit web 418 / api 285 ✓ · integration 82 ✓ · web build ✓ · OpenAPI no drift (47 schemas · 48 paths)
> ✓ · contract-parity 7 tracked lag items ✓ · audit:ci ✓. Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200` `{"status":"ok"}`,
> `/api/v1/providers/spotify/playlists` (unauthenticated) → `401` (mounted, not `404`),
> `/api/v1/classes` → `401`.

> **Session 2026-07-06 (Spotify Web Playback SDK launch — registered + live-verified) — deployed
> (Worker `b99ac98d-ea10-4efb-b42f-b068e479c550`).** Deployed the stacked Spotify playback branch
> (`feat/spotify-playback-web`, on the backend playback-token/scope branch and the SoundCloud/Apple CSP
> hotfix stack) after the final registry switch (`spotifyAdapterFactory` added to the shared playback
> registry) and an `index.html` comment byte change to force static-asset/header metadata upload. This
> makes Spotify in-app playback live for all users. Scope/contract/API changes from the stack: expanded
> Spotify OAuth connect scope for the Web Playback SDK, `GET /providers/spotify/playback-token` for
> short-lived memory-only access tokens, shared `SpotifyPlaybackToken`, reconnect UX for legacy
> library-only Spotify grants, and the web SDK/Connect playback adapter. **No schema / migration.**
> Rollback anchor: prior live `cbea9f69-98fd-441f-915f-7820be24c58b` (Apple Music CSP playback hosts).
> Remote D1: **no migrations to apply.** Full CI-equivalent gate passed twice: once after reconnect UX,
> then again after the registry launch switch (format / typecheck ×4 workspaces / lint / design-system
> verify / web **413** + api **283** unit / api integration **82** / web build / OpenAPI no drift
> `47 schemas · 48 paths` / contract-parity clean with the 7 tracked iOS lag items / audit:ci exit 0
> with the existing ignored advisory set). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/`
> → `200`, `/api/v1/health` → `200`, protected `classes`/`explore`/`teams` → `401`, served bundle
> `index-CKR7uylR.js`, deployment status 100% on `b99ac98d`, and remote D1 still no pending migrations.
> **Spotify live verification:** in Chrome with the owner's Premium account, Connections showed Spotify
> connected; Builder preview for `Gemini Test Class` / *Uptown Funk (feat. Bruno Mars)* showed
> `Preview on Spotify`, entered `Preview: Spotify`, and play/pause/resume/stop all worked. Live Mode
> preflight reported `Plays on Spotify`; starting Live Mode advanced the class clock and showed
> `Playback: Spotify`. The owner confirmed audible Spotify audio. Chrome captured no relevant Spotify
> SDK, CSP, Permissions-Policy, authentication, account, or playback errors, so the initial Spotify CSP /
> Permissions-Policy host set needed no hotfix.

> **Session 2026-07-06 (Apple Music web playback CSP — connect-src + media-src) — deployed (Worker
> `cbea9f69-98fd-441f-915f-7820be24c58b`).** Continuation of the SoundCloud CSP pass, on branch
> `fix/apple-music-csp-playback-hosts` (stacked on the SoundCloud branch so the deploy keeps
> `w.soundcloud.com`). Live Apple Music preview verification (Pilates One → track 2 *A'oga O Samoana*,
> Builder "Preview on Apple Music") surfaced **two enforced `connect-src` blocks**, each halting playback
> before any audio (each captured via a `securitypolicyviolation` listener; MusicKit `playbackState`
> stayed `none`): (1) **"Failed to fetch"** — the web-playback handshake to
> `https://play.itunes.apple.com/WebObjects/MZPlay.woa/wa/webPlayback`; (2) **"Could not fetch manifest"**
> — the HLS audio manifest at `https://aod-ssl.itunes.apple.com/.../mzaf_*.aac.wa.m3u8`. Root cause — CSP
> `connect-src` allowed `*.music.apple.com` / `*.mzstatic.com` but **not** the `itunes.apple.com` audio
> hosts. Fix in `apps/web/public/_headers`: `connect-src` **+ `https://*.itunes.apple.com`** (covers the
> handshake/license host and the `aod-ssl` audio manifest/segment hosts, matching the file's existing
> wildcard style) and **`media-src 'self' blob:`** (MusicKit plays via Media Source Extensions, so the
> `<audio>` source is a `blob:` MediaSource URL — confirmed live). **Two deploys this session:**
> `10c1bfde-1894-4985-868f-c4ad779904bf` first added `play.itunes.apple.com` + `media-src` (cleared block
> #1, which then surfaced #2), then `cbea9f69` broadened to `*.itunes.apple.com` (cleared #2).
> **Frontend/static-header only — no schema / migration / API.** Rollback anchor: prior live
> `5072dd3b-ff09-412b-bcad-9cef7086719b` (the SoundCloud deploy). Remote D1: **no migrations to apply.**
> Full pre-deploy gate green on the `play.itunes` commit (format / typecheck ×3 / lint / design verify /
> unit / integration / web build / openapi no-drift `46 schemas · 47 paths` / contract-parity 7-allowlisted
> clean / audit:ci); the wildcard-broaden delta is a single host in a static header, re-checked via
> `format:check` + web build (the heavy gate is unaffected by a header string change). Post-deploy smoke on
> live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected `classes` → `401`,
> and the CSP response header now includes `https://*.itunes.apple.com` in `connect-src` plus `media-src
> 'self' blob:`. **Provider-playback verification (Apple Music, partial-but-strong):** on a fresh document
> carrying the new CSP (the browser's stale-precache service worker had to be unregistered first — see
> caveat), the Apple preview now **authorizes, loads the track (`nowPlayingItem` set, full `246s`
> duration), fetches the HLS manifest, and builds the MSE `blob:` `<audio>` element with ZERO CSP
> violations and no errors** — the exact pipeline that failed twice before. In the hidden automation tab
> the buffer stalled at `readyState 0` (`document.visibilityState === 'hidden'` → Chrome background-media
> throttling), so **the owner confirmed audible playback in a foreground tab** — Apple Music real-provider
> audio is now **verified** (alongside SoundCloud). **Stale-SW caveat (again):** an
> already-open PWA client keeps serving the OLD precached CSP until the "New version — Refresh" prompt is
> taken (or the SW re-fetches); a hard header change like this only reaches such clients after that refresh.

> **Session 2026-07-06 (SoundCloud Widget CSP hotfix — unblocks real-provider playback) — deployed
> (Worker `5072dd3b-ff09-412b-bcad-9cef7086719b`).** Landed via PR
> [#225](https://github.com/steven-crosby/ritmofit-web/pull/225) (`0429d34`). This was **deployed from
> the working tree during the first real-provider playback verification pass**, then committed to `main`
> afterward, so the entry records a live-verification hotfix rather than a merge-then-deploy. Root cause —
> the production SPA CSP `script-src`/`frame-src` did not allow the official SoundCloud Widget origin
> `https://w.soundcloud.com`, so Live Mode SoundCloud playback failed with a CSP violation
> (`w.soundcloud.com/player/api.js` blocked by `script-src`) and correctly fell into the playback-error
> recovery state ("The SoundCloud player failed to load"). Fix: add `https://w.soundcloud.com` to
> `script-src` (Widget API JS) and `frame-src` (the hidden player iframe) in `apps/web/public/_headers`
> plus its CSP comment block. **Two deploys were needed:** the first (Worker
> `cde2cb9e-b8a2-42fb-9e0d-f8d69da7206f`) uploaded no static-asset files, so Wrangler left the old header
> metadata attached and the live CSP was unchanged; forcing a byte change (a no-op comment in
> `apps/web/index.html`) + rebuild produced the second deploy (`5072dd3b`) which actually carried the new
> header. **Frontend/static-header only — no schema / migration / API.** Rollback anchor: prior live
> `be7c9425-5733-4783-89af-93ab3f823ae0`. Remote D1: **no migrations to apply**. Full pre-deploy gate ran
> green on these exact bytes before deploy (format / typecheck ×3 / lint / design-system verify / unit /
> integration / web build / openapi no-drift / contract-parity / audit:ci). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `classes`/`explore`/`teams` → `401`, served bundle `index-B79dxbYI.js`, and the CSP response header now
> includes `w.soundcloud.com` in `script-src` and `frame-src`. **Provider-playback verification (partial):
> SoundCloud is now verified on live** — in a clean isolated-context browser on the current bundle, Live
> Mode (Burn Ride 🔥) preflight resolves both tracks as "Plays on SoundCloud", the Widget loads from
> `w.soundcloud.com`, the player rail shows `Playback: SoundCloud`, the timer advances, and pause/resume is
> stable (the Widget emits its own noisy third-party `encrypted-media` / CORS console warnings, which are
> cosmetic and do not affect our playback state). **Apple Music playback is still unverified** — the
> Builder preview loads MusicKit and reaches "Waiting for Apple Music authorization…" (opens a real Apple
> sign-in tab); full clip playback was not confirmed and remains the open follow-up. Watch for a possible
> second CSP gap there: the current CSP has no `media-src`, so `default-src 'self'` governs media and may
> block Apple CDN audio — tune `_headers` against violation reports during the Apple pass.

> **Session 2026-07-06 (PWA refresh-on-deploy prompt — fixes update lag) — deployed (Worker
> `be7c9425-5733-4783-89af-93ab3f823ae0`).** Shipped `main` (`8d98c7e`, PR
> [#222](https://github.com/steven-crosby/ritmofit-web/pull/222)). Verifying the D21 shell on live
> surfaced update lag: already-open clients kept serving the old precached bundle until a manual reload.
> Root cause — `registerType: 'autoUpdate'` with only the bare inline `registerSW.js` (no
> update-and-reload wiring), so a new deploy's service worker silently took over the precache while open
> tabs stayed stale. Fix: switch to `registerType: 'prompt'` and wire the app via `useRegisterSW`
> (`virtual:pwa-register/react`) in a new `UpdatePrompt` component — a non-intrusive "New version
> available — Refresh" toast (`role="status"`/`aria-live="polite"`); **Refresh** calls
> `updateServiceWorker()` (skip-waiting + reload), **Later** dismisses. Nothing reloads on its own, so
> **Live Mode and in-progress edits are never interrupted**; the worker is re-checked hourly and on tab
> focus. Adds `workbox-window` as a direct dep (the react register hook imports it). **Frontend-only, no
> schema / migration.** Rollback anchor: prior live `fc7f8cfe-ab31-44d9-bbc6-82ecac97d6d5`. Remote D1:
> **no migrations to apply**. Pre-deploy gate green on `main` (format / typecheck ×3 / lint / design
> verify / unit **web 398 · api 278** / integration **76** / web build / openapi no-drift `46 schemas ·
> 47 paths` / contract-parity clean / audit:ci). Post-deploy smoke on live: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes`/`explore` → `401`, `/app` → `200`, served bundle
> `index-B79dxbYI.js` matches the build, the separate auto-register script is gone (prompt-mode
> registration is bundled), security headers present; a clean isolated-context browser load rendered the
> marketing page with **zero console errors/warnings**. **Caveat:** clients still on the previous
> `autoUpdate` bundle get no prompt for *this* deploy (they have no prompt code) — they pick it up one
> last time via the old silent path; the prompt governs every deploy *after* this one.

> **Session 2026-07-06 (D21 workstation resting shell) — deployed (Worker
> `fc7f8cfe-ab31-44d9-bbc6-82ecac97d6d5`).** Squash-merged to `main` as
> [#219](https://github.com/steven-crosby/ritmofit-web/pull/219) (`01fd955`), then shipped.
> Frontend-only D21 slice. `CreateClassForm` now **requires a template** before
> creating a new blank class, with create options narrowed to **Cycle / Pilates / HIIT** (Pilates maps
> to the stored `sculpt` enum — **no schema / API migration**; `formatTemplateLabel('sculpt')` now
> renders "Pilates"). The Dashboard no-class-open state renders an **alive-at-rest workstation shell**
> with class-readiness tiles and **provider shelves** (SoundCloud / Spotify / Apple Music liked/saved
> source cards plus honest playlist-read-surface placeholders). Touches five files (`Dashboard.tsx`,
> `Dashboard.test.tsx`, `LibraryRail.test.tsx`, `class-summary.ts`, `class-summary.test.ts`). Verified:
> focused vitest (Dashboard / LibraryRail / class-summary), web typecheck, lint, `format:check`, and
> `git diff --check` all green; browser QA (Playwright + intercepted auth/API on system Chrome) covered
> desktop-empty, desktop-populated, and mobile-empty states — the mobile "Template first" tile value was
> changed to "Required" to fix an overflow. Saved-playlist browsing still needs new read endpoints (its
> own sub-slice). Rollback anchor: prior live `4cb1e13e-9c19-4a6b-b06c-89f0f6f6d935`. **No schema /
> migration** (`wrangler d1 migrations list ritmofit --remote` → none to apply). Pre-deploy gate green on
> `main` (format / typecheck ×3 workspaces / lint / design-system verify / unit **api 278** / integration
> **76** / web build / openapi no-drift `46 schemas · 47 paths` / contract-parity no untracked drift /
> audit:ci). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `/api/v1/classes` + `/api/v1/explore` + `/api/v1/teams` → `401`, SPA fallback `/app` →
> `200`, served bundle hash `index-Dg36zIiQ.js` matches the build (the bare-`/` first read was a stale CF
> edge HIT; cache-busted fetch and the new asset both serve the new hash), security headers present
> (HSTS/CSP/X-Frame/X-Content-Type/Referrer/Permissions).

> **Session 2026-07-06 (batch deploy: playback usability — provider-selection fixes + cross-provider
> resolution) — deployed (Worker `4cb1e13e-9c19-4a6b-b06c-89f0f6f6d935`).** Shipped `main` (`359db07`)
> batching everything merged since the run-live-gate deploy — the "web player not usable for instructors"
> arc: **#213** (Apple Music `authorize()` recovery — cancellable `awaiting_authorization` state + 60s
> consent timeout), the earlier **Apple Music `setQueue` generation guard** (`b1fe198`, PR #211),
> **#214** (**fix**: play SoundCloud without a live connection — the public Widget needs no token, so an
> expired likes-only OAuth token no longer takes SoundCloud tracks dark), and **#216** (cross-provider
> resolution — `provider_not_playable` reason + `POST /tracks/:id/resolve-provider` + Builder "Find on a
> supported provider"). **First API change in this batch:** the additive, auth-gated `resolve-provider`
> route — **no schema / migration** (refs use the existing `track_provider_ids`; catalog search spends
> the app-level token, never provider audio). #215 (D21 shell-frame docs) also rode along.
>
> Rollback anchor: prior live `d4954a2e-6b33-4fc3-87f8-b792411f4906` (the run-live-gate deploy). Remote
> D1: **no migrations to apply** (`wrangler d1 migrations list ritmofit --remote` → none). Pre-deploy
> gate green on `main` (format / typecheck ×4 workspaces / lint / design-system verify / **392 web + 278
> api** unit / **76** integration / web build / openapi no-drift `46 schemas · 47 paths` / contract-parity
> no untracked drift / audit:ci exit 0). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` →
> `200`, `/api/v1/health` → `200`, protected `/api/v1/classes` + `/api/v1/explore` → `401`, SPA fallback
> `/app` → `200`, the **new** `POST /api/v1/tracks/:id/resolve-provider` (unauth) → `401` (mounted, not
> `404`), served bundle hash `index-n3saxiPG.js` matches the build, security headers present (HSTS/CSP/
> X-Frame/X-Content-Type/Referrer/Permissions). **Still pending:** real-provider **audio** verification
> (SoundCloud Widget + Apple Music) with a live subscriber account — the last un-verified step.

> **Session 2026-07-05 (checkpoint deploy: run-live gate accessibility) — deployed (Worker
> `d4954a2e-6b33-4fc3-87f8-b792411f4906`).** Shipped `main` (`a3ea61a`) taking **#207** (run-live gate
> explains itself at the button, accessibly) live — presentation/a11y only, **no schema / migration /
> API / provider change** (#208 deploy-log docs also on this `main`). Brings production back level with
> `main`. Rollback anchor: prior live `a08f6b59-0207-4535-8bcf-8acf657974e0`. Remote D1: **no migrations
> to apply** (none since `4c4aa35`). Pre-deploy gate green on `main` (format / typecheck ×4 workspaces /
> lint / design-system verify / **373 web + 271 api** unit / **76** integration / web build / openapi
> no-drift `44 schemas · 46 paths` / contract-parity no untracked drift / audit:ci exit 0). Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `/api/v1/classes` → `401`, SPA fallback `/app` → `200`, served bundle hash `index-4ISGEun_.js` matches
> the build. (Deployed from the `ritmo-studio-agent1` worktree after the local `ritmo-studio-claude`
> checkout was reorganized away.)

> **Session 2026-07-05 (checkpoint deploy: Builder preview + front-door polish) — deployed (Worker
> `a08f6b59-0207-4535-8bcf-8acf657974e0`).** Shipped `main` (`4c4aa35`) batching everything merged since
> the solo-first reset deploy — all presentation-only, **no schema / migration / API / provider
> change**: **#206** (solo-first front-door polish — first-run workspace, owner-chip removed) and
> **#204** (manual **Builder clip-window preview** — `TrackPreview.tsx` + `PreviewPlaybackController`
> over the shared adapter registry; single-track, manual, no auto-advance; four review-found
> correctness fixes applied pre-merge — the rAF-clock/`preparing` bug, the `endActive`/`pause`/`resume`/
> `stop` epoch-recheck races, and the frozen-`now` clock). **#205** (deploy-log docs) also rode along.
>
> Rollback anchor: prior live `fa385d71-d9fd-4e86-bfc5-f390475f1692` (the solo-first reset deploy).
> Remote D1: **no migrations to apply** (verified `git diff` shows none since `23f5481`). Pre-deploy
> gate green on `main` (format / typecheck ×4 workspaces / lint / design-system verify / **370 web +
> 271 api** unit / **76** integration / web build / openapi no-drift `44 schemas · 46 paths` /
> contract-parity no untracked drift / audit:ci exit 0). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200` (`{"status":"ok"}`), protected
> `/api/v1/classes` → `401`, SPA fallback `/app` → `200`, served bundle hash `index-BiKiO4wT.js` matches
> the build. Real-provider **audio** verification of the Builder preview and the SoundCloud/Apple Music
> Live Mode adapters remains a pending manual pass with a live subscriber account.

> **Session 2026-07-05 (checkpoint deploy: solo-first reset · D20) — deployed (Worker
> `fa385d71-d9fd-4e86-bfc5-f390475f1692`).** Shipped `main` (`23f5481`) taking the **solo-first reset**
> (PR #203, decision **D20**) live — presentation only, **no schema / migration / API / provider
> change**: the web product now hides the deferred community surfaces (top-bar Explore + Teams, the
> class-header Share + Publish/visibility controls, the Explore public-preview branch) and filters the
> library to the current user's own classes. Backend/API/schema scaffolding for teams, shares,
> visibility, and Explore is **preserved but dormant** (hide-not-delete) — verified live: `/api/v1/explore`
> still answers `401` (auth-gated), not `404`. D18's hard parity gate is paused under D20; web is the
> product-definition surface.
>
> Rollback anchor: prior live `c6829c8e-583b-475d-81fa-d3fcf34bbd2e` (the 2026-07-05 Apple Music +
> rename checkpoint, below). Remote D1: **no migrations to apply**. Pre-deploy gate green on `main`
> (format / typecheck ×4 workspaces / lint / design-system verify / **353 web + 271 api** unit / **76**
> integration / web build / openapi no-drift `44 schemas · 46 paths` / contract-parity no untracked
> drift / audit:ci exit 0). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `/api/v1/classes` → `401`, SPA fallback `/app` → `200`, served
> bundle hash `index-CHIz1kGn.js` matches the build, `<title>Ritmo Studio</title>`.

> **Session 2026-07-05 (checkpoint deploy: Apple Music playback adapter + Ritmo Studio rename) —
> deployed (Worker `c6829c8e-583b-475d-81fa-d3fcf34bbd2e`).** Shipped `main` (`33455ea`) batching
> everything merged since the 2026-07-04 "alive at rest" deploy — **no schema / migration / token
> change**: **#201** (Apple Music playback adapter for Live Mode, D19 — `apps/web/src/lib/playback/
> apple-music-adapter.ts` + MusicKit-on-the-Web helper extension, registered in the Live Mode adapter
> registry alongside SoundCloud; 15 focused adapter tests), the **Ritmo Studio product rename**
> (`cd1cd3b` — human-facing brand renamed from RitmoFit across app copy, generated OpenAPI docs,
> design-system references, prompts, and tests; internal package/worker names stay `@ritmofit/*` /
> `ritmofit-api`), and docs/prompt cleanup **#199**/**#200**. Rollback anchor: prior live
> `190bc83e-c6c7-4ed4-a441-465a8d72981f`. Remote D1: **no migrations to apply**. Post-deploy smoke on
> live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `/api/v1/classes` → `401`, `<title>Ritmo Studio</title>` confirmed the rename live, CSP allow-lists
> `js-cdn.music.apple.com` + Apple Music frame/connect origins. Real-account playback verification
> (Apple Music subscriber audio, mixed-provider auto-advance, clipped windows, failure drills) remains
> a pending manual pass.

> **Session 2026-07-04 ("alive at rest" implementation — DS doctrine + 5 web slices) — deployed
> (Worker `190bc83e-c6c7-4ed4-a441-465a8d72981f`).** Shipped `main` (`2bb08be`) bringing the full
> "alive at rest" set live together — all presentation-only, **no schema / token / API / provider
> change**: **#193** (design-system doctrine — 8th principle "alive at rest" + the provisional-state
> contract *caution channel + glyph + `auto` label + underlying value, never plasma, no new token*;
> canonical docs + reference mockups), **#194** (derived provisional class-shape ribbon: a warm-up →
> peak → release arc for an unshaped class, marked `auto shape`, capped below plasma), **#195** (missing
> BPM named in place — "BPM needed" chip + "add BPM · pulse off" header; **no fabricated `~132 · auto`**
> — the data model has no BPM provenance, so a real provisional BPM would need a schema feature),
> **#196** (Essentials-first inspector — intensity/BPM/duration/notes lead, the long tail under an
> "Advanced" `<details>`), **#197** (affirmative Live-at-rest "Press play to start" hero + class-shape
> mini-map, and the builder all-clear "Class shape ready · take it live"), **#198** (auto-banded
> provisional segment structure — warm-up → cool-down bands derived from the class length, marked
> `auto`, builder-only).
>
> Rollback anchor: prior live `1fcdee96-e1a9-4535-9870-2219d0c68e9a` (the 2026-07-03 v1-redesign deploy,
> PRs #187–#192). Remote D1: **No migrations to apply** (verified `--remote`). Pre-deploy gate green
> (format / typecheck / lint / design-system verify / **337 web + 271 api** unit tests / **76**
> integration / web build / openapi no-drift / contract-parity / audit). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected `/api/v1/classes` →
> `401`. Each of the five web slices was driven end-to-end pre-merge by the 390px narrow-width browser
> smoke (grown to **31 checks** covering every phase). Presentation-only; iOS parity notes are recorded
> on the merged PRs (no new parity debt).

> **Session 2026-07-03 (out-of-band deploy: provider connect fixes) — deployed (Worker
> `94126954-0e61-408e-b404-bb380c338141`).** Provider-change deploy shipped on its own per the deploy
> cadence: SoundCloud OAuth token-exchange request-shape fix and Spotify connect verification
> (`packages/music` + `apps/api` provider-connections route). Live verification: Apple Music,
> SoundCloud, and Spotify production connect all round-trip successfully — the connect prerequisite
> for the provider-authorized playback initiative (D19) is done. Spotify additionally required
> registering `https://ritmofit.studio/api/v1/providers/spotify/callback` in the Spotify app
> dashboard (dashboard config, no code). Remote D1: no migrations in this slice (a `wrangler d1
> migrations list --remote` check failed with Cloudflare auth code `7403` — auth to re-verify next
> remote-migration session). Pre-deploy gate green; post-deploy smoke passed. Rollback anchor: prior
> live `3ee0a8c3-1ce7-488e-b708-e521ad03bc1b`. Same-day follow-on work (not deployed): the web
> playback layer — `apps/web/src/lib/playback/` (selection/preflight core, runtime coordinator,
> SoundCloud Widget adapter) + Live Mode wiring (preflight screen, player rail, recoverable playback
> failure) — landing via PR after this session.

> **Session 2026-07-02 (checkpoint deploy: design-audit batch + builder/dialog polish) — deployed
> (Worker `3ee0a8c3-1ce7-488e-b708-e521ad03bc1b`).** Shipped `main` (`0f52a04`) bringing the
> accumulated presentation checkpoint live — everything merged since the 2026-06-30 deploy, all
> presentation- or docs-only, no schema / API / provider change: **#168** (dialog loading-state
> polish), **#170** (class/library rail re-staged as the music-forward creation queue), **#171**
> (narrow-viewport action density), the design-audit slices **#172–#176** (mockup refinements, builder
> row hierarchy, compact builder mobile composition, Live next-cue anchored on the countdown, mobile
> sign-in music identity), **#177** (builder mockup: duplicate `builder-layout` grid dropped from the
> page wrapper), **#178** (ESLint now ignores git-ignored `.claude/` local state so local `pnpm lint`
> matches CI when agent worktrees exist), and docs **#167** / **#169** (deploy-cadence policy).
>
> Rollback anchor: prior live `e8b83edf-e2f0-474f-9b66-ab827998a371`. Remote D1: **No migrations to
> apply**. Pre-deploy gate green (format / typecheck / lint / design-system verify / 249 web + 271 api
> unit tests / 76 integration / web build / openapi no-drift / contract-parity / audit). Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `/api/v1/classes` / `/explore` / `/teams` → `401`, SPA fallback `/app` → `200`, security headers
> present, served asset hash matches the build (`index-BU64c-uM.js`; the first hash read was a CF
> edge-cache `HIT` of the prior HTML — it revalidates immediately under `max-age=0, must-revalidate`).
> No new parity debt: the batch is presentation-only and its iOS parity notes were recorded on the
> merged PRs.

> **Session 2026-06-30 (Studio redesign slices 1–3: Live re-stage + builder title fix + energy-arc
> workbench) — deployed (Worker `e8b83edf-e2f0-474f-9b66-ab827998a371`).** Shipped `main` (`83204ed`)
> bringing **#164**, **#165**, and **#166** live together — all presentation-only, no schema / API /
> provider change:
>
> - **#164** re-stages **Live mode** as a split performance instrument (large focal current cue + a
>   BPM/effort/timer instrument rail; the single sanctioned beat-pulse moved onto the BPM numeral; the
>   All-Out drop and reduced-motion contract intact). Also repaired the stale browser smokes
>   (marketing→login entry via `openLogin`, post-signup onboarding dismissal, drifted class-row/duration/
>   connected-state selectors, sign-out via the Account dialog): functional **16/16**, narrow **19/19**.
> - **#165** fixes the builder **class-detail title collapsing to 0 width** — the non-shrinking actions
>   row consumed the flex row, so `truncate` clipped the title to nothing (present in the DOM but
>   invisible to users and absent from the a11y tree, which broke `getByRole('heading')`). The header now
>   wraps and the title block keeps a readable `min-w` floor at `sm+`.
> - **#166** makes the builder **energy arc the central "class shape" workbench** (arc ~64→~128px,
>   frameless, sharing one time axis with the timeline so each block sits under its crest; reduced card
>   fragmentation). Static, grayscale-readable, plasma only at the all-out crest.
>
> Rollback anchor: prior live `57b20736-3f15-40fd-8877-f35f9ac3eb7d`. Remote D1: **No migrations to
> apply** (no schema change in any of the three). Pre-deploy gate green (246 web tests / `tsc --noEmit` /
> eslint / `format:check` / web build; functional smoke 16/16, narrow 19/19). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` (serves `<title>Ritmo Studio</title>`), `/api/v1/health` →
> `200`, protected `/api/v1/classes` → `401`, SPA fallback `/app` → `200`. iOS parity items recorded in
> `web-ios-parity.md` for the Live re-stage and the energy-arc workbench (both presentation-only).

> **Session 2026-06-29 (Apple Music connect + PWA navigation fix) — two deploys.**
>
> **Deploy 1 — Worker `c3f0add1-0836-4ecb-a6d3-da469401a9bb`.** Shipped `main` (`6135339`) bringing
> **#157** live (Apple Music per-user connect via **MusicKit JS**, Slice B of 2 — the SPA mints a
> Music-User-Token and `POST`s it to `/providers/apple_music/connection`, stored encrypted; no redirect
> OAuth, no refresh). The PR landed with three review-driven fixes: the two new `apple_music` routes
> (`GET /config`, `POST /connection`) + their `AppleMusicClientConfig`/`ConnectAppleMusic` schemas were
> added to the OpenAPI spec (the generator hardcodes paths, so the no-drift gate could not catch the
> omission — iOS consumes this contract); an empty-page guard on `fetchAppleMusicLibrarySongs` so a
> non-advancing `next` cursor can't spin the pagination loop forever (mirrors the Spotify adapter, +
> regression test); and an integration test proving the real (non-mock) Apple Music likes path returns
> `409 NOT_CONNECTED` (the `userLikes` capability flip routes to the real path, not a `501`). Rollback
> anchor recorded: prior live `26930c2a`. Remote D1: **No migrations to apply**. Full pre-deploy gate
> green (271 unit / 76 integration / web build / openapi no-drift / contract-parity / design-system AA).
> Post-deploy smoke green (SPA `200`, health `200`, protected routes `401`, served asset hash matched the
> build); the SPA CSP now serves the MusicKit allowances (`js-cdn.music.apple.com`, `*.music.apple.com`,
> `*.mzstatic.com`, Apple auth frames). **Live-verified: Apple Music connect → "✓ Connected" in prod.**
>
> **Deploy 2 — Worker `57b20736-3f15-40fd-8877-f35f9ac3eb7d`.** Shipped `main` (`bc13cd5`) = **#161**
> (PWA navigation-fallback denylist). Surfaced during live verification: connecting **SoundCloud**
> dead-ended on the SPA **404**. Root cause was the service worker, not the API — the generated `sw.js`
> registered `NavigationRoute(createHandlerBoundToURL("index.html"))` with **no denylist**, so it served
> the cached app shell for *every* top-level navigation, including the same-origin OAuth redirect
> callbacks (`/api/v1/providers/:provider/callback`) and Better Auth social callbacks
> (`/api/auth/callback/*`). The provider's `?code` never reached the Worker (`curl` — which bypasses the
> SW — correctly returned the `302 → /?error=…`). Fix: `navigateFallbackDenylist: [/^\/api\//]` in the
> VitePWA workbox config. Rollback anchor: `c3f0add1`. No migrations. Gate green. Post-deploy: the
> deployed `/sw.js` carries `{denylist:[/^\/api\//]}`, and the SoundCloud callback now reaches the Worker.
> Apple Music connect was unaffected throughout (MusicKit authorizes **in-page**, so it is not a
> navigation the SW can intercept).
>
> **Open follow-up (SoundCloud/Spotify connect — token exchange):** with the SW fix in place, SoundCloud
> per-user connect now reaches the Worker but the **token exchange itself fails** (`connect_failed` —
> `secure.soundcloud.com/oauth/token` returns non-2xx; the callback's `catch` swallows the reason with no
> log). This was the first real end-to-end test of the SoundCloud exchange (Spotify shares the same
> redirect-OAuth machinery and is likewise unverified end-to-end). No `SOUNDCLOUD_REDIRECT_URI` /
> `SPOTIFY_REDIRECT_URI` override is set, so the `redirect_uri` defaults — in both authorize and exchange
> — to `https://ritmofit.studio/api/v1/providers/<provider>/callback`. Most likely cause: the registered
> redirect URI in the provider dashboard not matching that string, or a stale client secret. Tracked as a
> follow-up: add server-side logging to the callback failure path to capture the provider status, then
> verify the dashboard registration. **Apple Music connect is unaffected and verified working.**
>
> **Session 2026-06-29 (Spotify connect + onboarding tutorial + dev-plan docs) — deployed (Worker
> `26930c2a-684c-40c6-8839-56e0383d769b`).** Shipped current `main` (`76bda7b`) to production, bringing
> three merged PRs live: **#156** (Spotify per-user OAuth connect + likes — Authorization Code + PKCE,
> scope `user-library-read`; the "Connect Spotify" capability flips on, redirect URI registered in the
> Spotify dashboard by the owner), **#159** (in-app onboarding tutorial video — frontend-only: animated
> `TutorialVideo`, shown once after email sign-up via SSR-safe `localStorage` state, and embedded on the
> marketing landing page in place of the static energy-arc SVG), and **#158** (dev-plan docs audit +
> consolidation — archived the completed launch session-plan / live-test-report / cues-vs-notes records,
> reconciled the runbook + schema, fixed the index and stale framing).
>
> Each PR passed the full CI gate; #159 was branched off `main` after #156, so the two were CI-tested
> together. Remote D1 reported **"No migrations to apply"** before deploy (no schema change in any of the
> three). Pre-deploy: tree clean and `== origin/main`, prior live Worker `e60e5138-3248-4c0f-a926-997955016199`
> recorded as the rollback anchor. Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`;
> `/api/v1/health` → `200`; unauthenticated `/api/v1/classes`, `/explore`, `/teams`, class `shares`,
> `import-playlist`, provider `search`, and `providers/spotify/connect` all returned `401` from real
> protected handlers (not `404`); `/api/v1/auth/capabilities` reported Apple enabled; security headers
> present; live HTML had no `__CF$cv$params` injection marker; served asset `index-CvZxZwnG.js` matched
> the local build; purge cron (`17 3 * * *`) and D1/R2 bindings intact. No production test data was
> created. **#157** (Apple Music per-user connect via MusicKit JS) remained a draft, intentionally **not**
> deployed.
>
> **Session 2026-06-29 (Apple Sign In + provider credential deploy) — deployed (Worker
> `e60e5138-3248-4c0f-a926-997955016199`).** Shipped the credential-backed Apple Sign In slice plus
> dynamic Apple Music developer-token support on branch `codex/apple-signin-provider-config`. The Worker
> now generates the Apple Sign In client-secret JWT from `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and
> `APPLE_PRIVATE_KEY`; exposes `/api/v1/auth/capabilities`; shows the web "Continue with Apple" entry
> point only when Apple config is present; and can generate Apple Music developer tokens from
> `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and `APPLE_MUSIC_PRIVATE_KEY` while preserving the
> existing `APPLE_MUSIC_DEVELOPER_TOKEN` fallback. Spotify and SoundCloud credentials remained
> server-side secrets.
>
> Remote D1 reported **"No migrations to apply"** before and after deploy. Production smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`; `/api/v1/health` → `200`; `/api/v1/auth/capabilities`
> returned `{"socialProviders":{"apple":true}}`; unauthenticated `/api/v1/classes` and provider search
> routes returned `401`; served SPA asset `index-DiUG_dBK.js` matched the build; security headers were
> present; and `POST /api/auth/sign-in/social` for provider `apple` returned an Apple authorization URL
> with callback `https://ritmofit.studio/api/auth/callback/apple`. A Session 9 read-only check later the
> same day confirmed Wrangler's live deployment status at 100% on Worker
> `e60e5138-3248-4c0f-a926-997955016199`, remote D1 still reporting **"No migrations to apply"**, health
> `200`, and Apple auth capability enabled. No production test data was created.
>
> **Session 2026-06-29 (Session 8, Launch Candidate) — deployed (Worker
> `e3f17b56-b3bc-4684-bfad-eadf260e9195`).** Shipped current `main` (`d2b7b4f`) to production, bringing
> the Web Launch Readiness **Session 7** accessibility/responsive fixes live: Live Mode section-change
> screen-reader announcements (#150), the class-library load-error retry state (#151), and the Session 7
> close docs/prompt additions (#152).
>
> Remote D1 reported **"No migrations to apply"** before and after deploy. Pre-deploy launch gate was
> green: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test` (web 237 / api 257),
> `pnpm --filter @ritmofit/api test:integration` (69), `pnpm --filter @ritmofit/web build`,
> `pnpm --filter @ritmofit/api openapi`, OpenAPI no-drift, `pnpm audit:ci`, design-system
> `npm run verify` (AA contrast), and `pnpm --filter @ritmofit/api contract-parity` (only tracked iOS
> allowlisted lag). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`;
> `/api/v1/health` → `200`; unauthenticated `/api/v1/classes`, `/explore`, `/teams`, `/shares`,
> playlist import, provider search/import, cover upload serving, and class tags all returned `401` from
> real protected handlers; security headers were present; SPA `Cache-Control` retained `no-transform`;
> live HTML contained no `__CF$cv$params` injection marker; and the served asset
> `index-72oZbOhu.js` matched the local build. No production test data was created, so no cleanup was
> required. Prior Worker `b59b2de9-f253-4b84-8e8e-4a089e7f6d3f` is the rollback anchor.
>
> **Session 2026-06-28 (Session 6, Live Mode & StructClub parity) — deployed (Worker
> `b59b2de9-f253-4b84-8e8e-4a089e7f6d3f`).** Shipped **#146** (`f5fec5f`) — the Web Launch Readiness
> **Session 6** Live Mode / StructClub parity pass. The pass was mostly verification (cue prompter,
> virtual interval timer, intensity, notes, trim/clip, beat pulse, cue colors, wake lock, and the
> no-in-app-playback constraint all confirmed via a browser walk at desktop and 320px); one gap was
> found and closed.
>
> - **Live Mode current-section indicator (web):** the live prompter dropped the energy-arc **sections**
>   the run-payload already carries (the builder and class-detail read view show them, Live did not). #146
>   adds a compact, view-independent section band under the Live header — current section as icon + tint +
>   label (never color alone) plus a muted countdown to the next section — computed from run-payload
>   `sections[]` via a new `liveSectionAt` helper, reusing the `SegmentBand` icon/tint language
>   (`SegmentIcon` now exported). A code-review follow-up (`9f98b68`, squashed into #146) made the bar
>   fully screen-reader accessible (sr-only "Current section:" / "Next:" framing instead of a
>   name-replacing container `aria-label`). **Client-only off the run-payload — no shared-contract, API,
>   OpenAPI, or migration change.** iOS parity follow-up tracked in `web-ios-parity.md`.
>
> Remote D1 reported **"No migrations to apply"** before deploy (web-only change). CI for #146 was green
> (`format · typecheck · lint · test · build · audit`). Local pre-deploy gate also covered Prettier,
> `pnpm -r typecheck`, `pnpm lint`, `pnpm test` (api 257 / web 233), API integration (69), web build,
> OpenAPI no-drift, `audit:ci`, design-system `npm run verify` (AA contrast), and `contract-parity`
> (no untracked drift). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`;
> `/api/v1/health` → `200`; unauthenticated `/api/v1/classes`, `/explore`, `/teams`, `/shares` → `401`;
> all six security headers present (HSTS, CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
> X-Frame-Options); served SPA asset hash `index-NNdJRVHx.js` matches the build. Prior Worker
> `92d3904e-733a-4f39-8f3d-6fa156616757` is the rollback anchor.
>
> **Session 2026-06-28 (Session 5 follow-up) — deployed (Worker
> `92d3904e-733a-4f39-8f3d-6fa156616757`).** Shipped **#143** (`9427d07`, merge
> `0b1517c`) to close the remaining Session 5 launch-listed follow-ups:
> **manual visual verification + 320px overflow fix** and **settings/profile beyond sign-out**.
>
> - **Visual verification / 320px fix:** manually verified planning timeline tempo pulse cadence, the
>   source-level `prefers-reduced-motion` fallback, segment "Snap to tracks" drag/keyboard behavior, and
>   320px + desktop layouts. The check found a 320px track-list overflow in `Dashboard` song rows; #143
>   fixed it by letting the row and metadata wrap inside the available width instead of forcing
>   horizontal scroll.
> - **Account/profile surface:** the signed-in top nav now opens an Account dialog that fetches
>   `/auth/me`, shows the signed-in email, edits `displayName` + `imageUrl` through the new protected
>   `PATCH /auth/me`, and keeps sign-out reachable inside the dialog. Additive shared/API/OpenAPI change;
>   **no migration** (uses existing `users.display_name` / `users.image_url` columns). iOS parity follow-up
>   tracked in `web-ios-parity.md`.
>
> Remote D1 reported **"No migrations to apply"** before and after deploy. CI for #143 was green
> (`format · typecheck · lint · test · build · audit`). Local verification also covered tracked-files
> Prettier, `pnpm -r typecheck`, `pnpm lint`, `pnpm test`, API integration, web build, OpenAPI no-drift,
> audit, `git diff --check`, and local 320px/desktop browser checks. Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` with `Cache-Control: ... no-transform` and no
> `__CF$cv$params` injection marker; `/api/v1/health` → `200`; unauthenticated `/api/v1/auth/me` → `401`
> standard envelope; remote D1 still no pending migrations. Prior Worker
> `c34515d1-39a2-4069-aed5-a00d2844953a` is the rollback anchor.
>
> **Session 2026-06-28 (Session 5, Builder Polish) — deployed across four steps; live Worker
> `c34515d1-39a2-4069-aed5-a00d2844953a`.** Closed all four Web Launch Readiness **Session 5** items
> (PRs #137–#140, each CI-green and squash-merged to `main`), plus the **#136** design-system/dev-plan
> docs reconciliation (`d6802e5`). Deploy chain: prior live `9519447a` → **`4eab08f3`** (#137 pulse) →
> **`431d5c6b`** (#138 + #139) → **`c34515d1`** (#140). **No migration** at any step — remote D1 reported
> "No migrations to apply" before each deploy.
>
> - **#137 — planning-timeline tempo pulse (web):** the active track's block in the planning
>   `TimelineStrip` carries the design system's *second* sanctioned tempo pulse (10 §2) — subtle
>   `scale 1.0→1.03` + a faint cyan border-luminance breath retimed per the track's BPM via `--rf-bpm`
>   (new `.rf-beat-pulse-subtle` keyframe). One pulse per screen, gated to a known tempo, removed under
>   `prefers-reduced-motion` (the static selection ring alone marks the active track). Client-only.
> - **#138 — rhythm-cycle seed vocabulary (api):** +7 cycle moves (Running, Hovers, Press-Ups, Crunches,
>   Oblique Twists, Pyramid, Sprint on a Hill) in `seed.sql` (stable UUIDs `…015`–`…01b`, idempotent
>   `INSERT OR IGNORE`); `schema.md` M1 seed table extended to match. Data, not schema — **no migration**.
>   Because `seed.sql` is not auto-applied on deploy, the **remote seed was re-run**
>   (`wrangler d1 execute ritmofit --remote --file=./src/db/seed.sql`); remote `moves` now **21 total /
>   15 cycle**.
> - **#139 — custom-move discipline + base-move editing (web):** the custom-move manager
>   (`CustomMovesDialog`) edit form now sets a move's `template` (discipline) and `baseMoveId` (link to a
>   global library move) via the existing `updateUserMove`, with both shown on the read row. UI-only — the
>   contract/API already supported both fields. The fast inline builder creation stays name-only.
> - **#140 — segment-band track-range snapping (web):** a "Snap to tracks" toggle (default on, edit-only)
>   snaps a dragged or arrow-keyed segment boundary to the nearest track edge (class start, each track's
>   `startOffsetMs`, class end); arrow keys jump between boundaries under snap for keyboard parity, and the
>   numeric editor stays exact. Authoring affordance, **no contract change** (sections still store a free
>   `startOffsetMs`).
>
> Pre-deploy gates green each step (web unit grew 206 → **224**, api integration 66, typecheck, lint,
> web build, format:check, audit). Post-deploy smoke on live `https://ritmofit.studio` at the final
> Worker `c34515d1`: SPA `/` → `200`, `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` +
> `/explore` + `/teams` → `401`, all six security headers present, and served asset `index-DlGE-dL9.js`
> matches the local build. iOS parity follow-ups for all four web slices tracked in `web-ios-parity.md`.
> Prior Worker `431d5c6b-910a-4987-a6d1-76e595cc45fb` is the rollback anchor. Manual visual passes (pulse
> cadence + reduced motion, segment snap, 320px/desktop) remain recommended before the launch gate.
>
> **Session 2026-06-28 deployed (Worker `9519447a-dc0b-4b27-9f74-13783f1cf3f2`).**
> **Web Launch Readiness Sessions 2–4** landed to production (PRs #130, #131, #132, #134, squash-merged
> to `main`). **Session 2 (#130):** softened the unconfigured BPM lookup `503` to instructor-facing copy
> and gated TrackSearch's "Import Playlist" to Spotify via a new `playlistImport` capability flag.
> **Session 3 (#131):** `GET /classes` now returns additive Library-card aggregates (`trackCount`,
> `totalDurationMs`, `albumArtUrls`) via a new `ClassListItem` shape, and the Library rail renders a
> track-art collage, count + runtime, last-opened date, a duplicate action, and a create-class template
> chooser. **#132:** fixed the class-header title overflowing into the actions row (`min-w-0`).
> **Session 4 (#134):** read-only class detail (songs + placed moves + cues + section bands) reachable
> from a Library-card "View"; Songs-by-Move results gain "Start a class" (copies the choreographed
> class_track into a new class).
>
> **No migration** — remote D1 reported "No migrations to apply" before deploy (the list aggregates are
> computed at query time, no schema change). Pre-deploy gates green: format, typecheck, lint, unit
> (web 206 + api 257), integration 66, web build, OpenAPI no-drift, audit, design-system verify, and
> contract-parity. Post-deploy smoke (live `https://ritmofit.studio`): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` + `/explore` + `/teams` +
> `POST /classes/x/import-playlist` → `401`, all six security headers present, SPA `Cache-Control`
> includes `no-transform`, live HTML contains no `__CF$cv$params` injection, and the served asset
> `index-BHeK3sAC.js` matches the local build. Prior Worker
> `dafa2638-4383-4145-8f50-531fcfb235ec` is the rollback anchor.
>
> **Session 2026-06-28 deployed (Worker `dafa2638-4383-4145-8f50-531fcfb235ec`).**
> Closed the remaining Web Launch Readiness Session 1 production-audit polish items from the `e6fb7c1a`
> deploy. **`d694b02`** — **web**: manual "Add track" duration now uses the same positive `m:ss`
> parser as the track inspector (`4:05` → `245000` ms for the API), with Dashboard regression coverage.
> **static assets/security headers**: `_headers` now adds
> `Cache-Control: public, max-age=0, must-revalidate, no-transform` on the SPA/static surface so
> Cloudflare JavaScript Detections do not inject the CSP-blocked inline `__CF$cv$params` challenge
> script into `index.html`. Updated `web-launch-readiness.md` with the confirmed Cloudflare JSD cause
> and deploy verification.
>
> No migration. Remote D1 reported "No migrations to apply" before and after deploy. Pre-deploy gates
> green: format, typecheck, lint, unit (web 185 + api 248), integration 64, web build, OpenAPI no-drift,
> audit, design-system verify, and contract-parity (tracked iOS lag only). Post-deploy smoke (live):
> SPA `/` → `200`, `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` + `/explore` + `/teams`
> → `401`, mounted route probes for shares / playlist import / uploads / provider connections/search /
> class tags all reached auth (`401`, not `404`), all six security headers present, served asset
> `index-s2OQZ8O-.js` matches the local build, live HTML includes `no-transform`, and live HTML contains
> no `__CF` / `__CF$cv$params` injection. Prior Worker `e6fb7c1a-a208-4ba6-9ba7-39bc19be136d` is the
> rollback anchor.
>
> **Session 2026-06-27 deployed (Worker `e6fb7c1a-a208-4ba6-9ba7-39bc19be136d`).**
> **Web Launch Readiness Session 1 (Production Truth Audit) + the fix it surfaced.**
> Ran the full local CI-equivalent gate (green: format, typecheck, lint, 248 api + web unit, 64
> integration, web build, OpenAPI no-drift, audit) and production smoke on `https://ritmofit.studio`.
> Walked the full authenticated core instructor loop live (create class → manual tracks →
> intensity/cues/colors/moves/segments → Live Mode play+tabs → Share dialog → Explore); production test
> data created and purged (test class deleted, verified 0 classes). **Found and fixed one bug:** PWA
> stale-shell crash — a returning tab on an older service-worker-cached shell hard-crashes when it
> lazy-imports a chunk hash the new deploy removed (reproduced live: cached `index-CoC1rBbD.js` shell
> failing to fetch a gone `ChoreographyEditor-CoYYs4OY.js`). **#124** (`c0f5037`, squash-merged) —
> **web**: `lazyWithReload` drop-in for `React.lazy` that reloads once into the fresh shell on a
> dynamic-import failure (one-shot `sessionStorage` guard, 3 unit tests), swapped across all 9 Dashboard
> lazy boundaries. Web-only; no migration, no API/schema/OpenAPI/parity impact (remote D1 "No migrations
> to apply").
>
> Pre-deploy gates green (format, typecheck, lint, web 184 + api 248 unit, 64 integration, web build,
> OpenAPI no-drift, audit, contract-parity). Post-deploy smoke (live): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` + `/explore` + `/teams` → `401`, all six
> security headers present, served asset `index-yWIThSNv.js` matches the local build, current
> `ChoreographyEditor-DfSufLw2.js` chunk serves as `text/javascript` (not the HTML fallback). Prior
> Worker `2d9e0830-9662-49ef-9c8e-0c45a946f16b` (session 2026-06-27, D15 #120 batch) is the rollback
> anchor. Open audit follow-ups (not deployed-blocking): CSP-blocked inline script (likely a Cloudflare
> zone setting) and the ms-duration manual-add field; see `web-launch-readiness.md`.
>
> **Session 2026-06-27 deployed (Worker `2d9e0830-9662-49ef-9c8e-0c45a946f16b`).**
> Shipped a five-PR batch (all squash-merged to `main`, each rebased onto the advancing tip and
> CI-green before merge), no migration (remote D1 already at head — "No migrations to apply"):
> **#120** (`129b7ae`) — **D15** public marketing landing page (`MarketingPage`: glass nav,
> heat-bloom hero with energy-arc SVG, feature cards, CTA strip; signed-out `/` renders it, CTAs flip
> to Login via state with a `← Back to home` link; documented web-leaning exception, no API/parity
> impact). **#117** (`c8fe89a`) — **api**: CI gate for web↔iOS run-payload DTO contract drift
> (`check-contract-parity.ts` + `contract-parity.ts`, wired into `.github/workflows/ci.yml`).
> **#115** (`7e5462e`) — **api**: default `sendEmail` to `boundFetch` so prod reset/verify email uses
> the Worker-bound fetch. **#116** (`79564cc`) — **web**: restore the keyboard focus ring on the
> intensity segmented control (accessibility). **#118** (`7e5f979`) — **web**: token-drive the
> timeline beat/bar gridlines in `TimelineStrip`.
>
> Pre-deploy gates green (typecheck, lint, unit web + api, integration, web build, OpenAPI no-drift).
> Post-deploy smoke (live): SPA `/` → `200`, `/api/v1/health` → `200`, unauthenticated
> `/api/v1/classes` → `401`, all six security headers present, served asset `index-yOu-ndqj.js`
> matches the local build. Prior Worker `23b27a25-00d1-4cc3-89c9-7e300a72f4a8` (session 2026-06-26,
> D14 #110) is the rollback anchor.
>
> **Session 2026-06-26 deployed (Worker `23b27a25-00d1-4cc3-89c9-7e300a72f4a8`).**
> Shipped **#110** (`a12cc55`, squash) — **decision D14**: per-track **RPM (cadence)** and
> **hold count**, authored independently of music tempo (RPM is *not* derived from BPM; a hold count of
> `0` is meaningful and distinct from unset/`null`). `displayRpm`/`holdCount` (nullable; `rpm > 0`,
> `holds >= 0`) added to the shared `classTrackSchema`, the class-track input contract, and the
> run-payload track entry; D1 columns + CHECK constraints; run-payload assembly passthrough; add/patch
> route wiring; regenerated OpenAPI. Web surfaces them on song rows, the builder track inspector (with
> editable RPM/Holds inputs), and the Live Mode NOW card / full-list rows.
>
> **Migration `0018` (applied to remote D1 first, before code).** drizzle-kit's generated table-rebuild
> copied the brand-new `display_rpm`/`hold_count` columns *from the old table* in its `INSERT…SELECT`;
> via SQLite's double-quoted-identifier fallback that would backfill every existing row with the literal
> strings `"display_rpm"`/`"hold_count"` instead of `NULL` (slipping past the `rpm > 0` CHECK on
> text/int comparison), and empty-DB integration tests never caught it. Hand-fixed to omit the new
> columns from the copy so they default to `NULL`. Remote D1 was at `0017` pre-deploy; prod
> `class_tracks` had **0 rows**, so no data was at risk — post-migration the columns exist with clean
> types. New `rpm-holds.integration.test.ts` covers add/patch round-trip, the `0`-vs-`null` hold
> distinction, and the constraints.
>
> Pre-deploy gates green (typecheck, lint, unit web + api 234, integration **64**, web build, OpenAPI
> no-drift); PR #110 CI green (format/typecheck/lint/test/build/audit). Post-deploy smoke (live): SPA
> `/` → `200`, `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` → `401`, all six security
> headers present, served asset `index-CmOHEOQ_.js` matches the local build. Prior Worker
> `efa56513-d81d-4d9b-98d0-a6be2d18d8e6` (session 2026-06-26, M1 #106) is the rollback anchor.
>
> **Session 2026-06-25 deployed (Worker `efa56513-d81d-4d9b-98d0-a6be2d18d8e6`).**
> Shipped **#106** (`754569e`, squash) — backlog **M1** (intensity spin-zone vocabulary + segmented
> control, decision D17), frontend-only, no migration. `INTENSITY_LABEL` relabeled to the canonical
> zone words **None / Build / Push / Attack / All Out** (display-only; enum `none/easy/mod/hard/all_out`
> and the DB unchanged) — flows to the readout, the energy-arc summary, Songs-by-Move, and the
> move-intensity dropdowns. New accessible `IntensitySegmentedControl` (native radio inputs → free
> keyboard nav + screen-reader semantics; each segment shows "Z*n* · word"; the bar count doubles as
> the zone number per design-system `02-color-system.md`) replaces the raw-enum `<select>` in the
> **track** inspector + manual-add form. Deliberate follow-up: the two ChoreographyEditor
> **move-intensity** dropdowns stay as relabeled selects — they're optional/unset and sit in compact
> rows, so converting them needs an "unset" segment.
>
> Pre-deploy gates green: PR #106 CI (format/typecheck/lint/test/build/audit), plus local typecheck +
> web build pre-deploy (web 180 unit tests). Post-deploy smoke (live): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` → `401`, all six security headers present,
> served asset `index-BQ0pRDiH.js` matches the local build. Prior Worker
> `d4e828c5-c50e-4515-bcc5-f569d6c95c02` (session 2026-06-25, P1/P2) is the rollback anchor.
>
> **Session 2026-06-25 deployed (Worker `d4e828c5-c50e-4515-bcc5-f569d6c95c02`).**
> Shipped **#104** (`3113ad0`, squash) — two mockup-parity **Polish** items, frontend-only, no migration.
> **P1 (empty-state-as-error, systemic):** the 2026-06-24 crawl's "Not found in danger-red + lingering
> Loading…" was the **failed-load** path — a list fetch error set the red alert while the list state
> stayed `null`, so the dialog showed "Loading…" forever with no retry. (The crawl most likely *hit* the
> error via the #100 prod-404, fixed the prior session.) New shared `PendingList` component renders
> "Loading…" only while genuinely pending, else a "Try again" retry; `error` is cleared at the start of
> each refresh. Wired into Explore / Teams (+ nested TeamMembers, given a local load-error for
> independent retry) / Share **and** Connections / CustomMoves (same conflation, beyond the audit's named
> three). **P2 (raw intensity enum):** the intensity `<select>`s now render `INTENSITY_LABEL[v]`
> (none/easy/moderate/hard/all-out) instead of the raw enum, across all **4** selects (`Dashboard.tsx` ×2,
> `ChoreographyEditor.tsx` ×2) — label text only; M1's segmented control + D17 zone vocab stay separate.
>
> Pre-deploy gates green: typecheck, lint, unit (web 177 + api 234), OpenAPI no-drift, web build; PR #104
> CI green (format/typecheck/lint/test/build/audit). Post-deploy smoke (live): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` / `/explore` / `/teams` → `401` (handlers
> reached, **not** the pre-#100 `404`), all six security headers present, served asset
> `index-DKVcAK9r.js` matches the local build. Prior Worker `c269837d-3c24-4b87-886e-4f24df11c0ba`
> (session 2026-06-25) is the rollback anchor. Known minor follow-up (non-blocking): a TeamMembers
> retry that succeeds leaves the parent's prior red error banner up until the next action clears it —
> fold into a later Teams touch.
>
> **Session 2026-06-25 deployed (Worker `c269837d-3c24-4b87-886e-4f24df11c0ba`).**
> Shipped two merged PRs from `main` (`2c27da2`). **#99** (`585f134`, feat: "Songs by Move" reverse
> search — owner-scoped `GET /moves/:id/songs` + `/user-moves/:id/songs`, grouped by track; **plus**
> server-side class **tag/theme search** `GET /classes?tag=` as an EXISTS filter composing with the
> visibility CTE + keyset cursor; plus an in-builder entry point) and **#100** (`2c27da2`, fix: scope
> the dev-only mock-seam gate to `/mock/*`). **Migration `0017`** (additive indexes on
> `class_track_moves(move_id)` / `(user_move_id)`) applied to remote D1 **before** the code deploy;
> remote D1 now at `0017`. Prior Worker `c6b91a31-d981-4ece-9cd4-2e985e4fb424` (session 2026-06-24) is
> the rollback anchor.
>
> **#100 fixed a latent prod-404 bug on `main`** that the next deploy would have detonated: `mockRoutes`
> mounts at the api root (`api.route('/', mockRoutes)`) and gated itself with `mockRoutes.use('*', …)`,
> which returns `404 NOT_FOUND` in prod (`MOCK_PROVIDERS !== 'true'`). Because `*` matches every path and
> mock is registered **before** teams/shares/explore/uploads/playlist-import, the gate shadowed all of
> those siblings → `404` in production. **CI never caught it** — the integration suite runs with
> `MOCK_PROVIDERS='true'`, which makes the gate transparent. Production was healthy only because the live
> Worker predated the regression. Fix scopes both middlewares to `/mock/*`; added a plain-Hono unit test
> (`mock.test.ts`) and a real-worker integration test (`mock-gate-leak.integration.test.ts`), both run
> with `MOCK_PROVIDERS` unset to reproduce prod. Verified the regression: the unit test fails against the
> pre-fix `mock.ts`, passes with the fix.
>
> Pre-deploy gates green (both PRs): format, typecheck, lint, unit (api 234 + web 175), Worker/D1
> integration 61, web build, OpenAPI no-drift. Post-deploy smoke (live): SPA `/` → `200`, `/api/v1/health`
> → `200`, unauthenticated `/api/v1/classes` / `/api/v1/explore` / `/api/v1/teams` → `401` (handlers
> reached, **not** the pre-fix `404`), `/api/v1/mock/track-search` → `401` (seam not exposed), built asset
> `index-CZ9jMwA7.js` served, all six security headers present. Bindings confirmed: D1 `ritmofit`, R2
> `ritmofit-images`, `BETTER_AUTH_URL`/`WEB_ORIGIN` = `https://ritmofit.studio`.

> **Session 2026-06-23 deployed (Worker `d183ee42-eba4-40ae-9def-fc0bd313223e`).**
> Caught up the long undeployed delta (**PRs #85–#93**, ~28 commits) in one code-only deploy. PRs merged
> this session: **#91** (`44e7b6b`, chore: ESLint-ignore git-ignored DesignSync artifacts so local
> `pnpm lint` matches CI), **#92** (`3c3f1fd`, docs: sweep housekeeping — backlog section,
> self-contained `AGENTS.md`, removed obsolete `design-system-audits/`), **#93** (`8c70a6b`, feat:
> surface track `notes` in Live mode + the Cues-vs-Notes decision doc;
> [`archive/cues-vs-notes-decision.md`](./archive/cues-vs-notes-decision.md)), and **#94** (close-session docs).
> Deployed from `main` (`69dcdcd`); prior Worker `e3528c85` (PR #84) is the rollback anchor.
> **No migrations applied — remote D1 was already current at `0016`** (clip-window `0014`, `beat_anchor_ms`
> `0015`, free-timeline `0016` had been applied previously; the earlier "remote at `0013`" note was
> stale, not a pending-migration gap — `wrangler d1 migrations list ritmofit --remote` → "No migrations
> to apply"). Pre-deploy gates green: typecheck, lint, unit (api 231 + web 166), integration 49, web
> build, OpenAPI no-drift. Post-deploy smoke (live): `/api/v1/health` → `200` (`{"status":"ok"}`),
> `/` → `200` html, unauthenticated `/api/v1/explore` → `401`. Bindings confirmed: D1 `ritmofit`,
> R2 `ritmofit-images`, `BETTER_AUTH_URL`/`WEB_ORIGIN` = `https://ritmofit.studio`.

> **PR #81 follow-up hardening deployed (2026-06-21, PR #84, Worker `e3528c85`).**
> PR #84 merged to `main` as `51c5b9e` and deployed from a clean worktree. Browser pinch zoom is
> restored; class-cover uploads now enforce a shared 5 MiB limit, return a documented `413`, serve with
> `nosniff`, and best-effort delete replaced/deleted R2 objects; Spotify playlist import now paginates
> the provider's 50-item pages instead of silently truncating and rejects malformed later pages rather
> than returning a partial import. No schema or migration change; remote D1 remains through `0013` with
> no pending migrations. Pre-deploy gates: format, typecheck, lint, unit 330, Worker/D1/R2 integration
> 44, web build, OpenAPI no-drift, and `audit:ci` all green. Post-deploy smoke: SPA `200`, health `200`,
> unauthenticated `/classes` `401`, all six security headers present, built asset
> `index-BhYgwUet.js` served `200`, and production viewport metadata is
> `width=device-width, initial-scale=1.0`. Prior Worker `d625bc50` is the rollback anchor.
>
> **Class covers, tags, playlist import + PWA deployed (2026-06-20, PR #81, Worker `d625bc50`).**
> PR #81 (feat: class covers, tags, playlist import, and PWA assets) merged to `main` (merge commit
> `0aad7a4`) and deployed. Adds: per-class custom cover images stored in a **new R2 bucket**
> (`ritmofit-images`, bound as `IMAGES_BUCKET`) and served by the Worker at `/api/v1/uploads/covers/*`;
> a `class_tags` table with add/remove/clone-on-copy; Spotify playlist URL import (bounded concurrency,
> same-song dedup; SoundCloud import deliberately 501 pending `/resolve`); and PWA manifest + service
> worker + icon/favicon/OG assets. Two review fixes landed on the branch first: tags serialize via
> `json_group_array` (a comma in a tag no longer splits it in the list view), and `coverImageUrl`/`tags`
> were dropped from the create/update JSON contract (written only by their dedicated endpoints — `tags`
> isn't a `classes` column, so a PATCH carrying it would have broken), with `featuredCategory` now
> honored on create. **New infra prerequisite:** R2 had to be enabled on the Cloudflare account (owner
> dashboard opt-in) and the `ritmofit-images` bucket created before deploy — the runbook's environment
> matrix predates R2. **Migration `0013`** (`class_tags` + `classes.featured_category` /
> `classes.cover_image_url`, additive/non-breaking) applied to remote D1 before code; remote D1 now at
> `0013`. Migrations-before-code order followed. Pre-deploy gates green: typecheck, lint (repo source;
> untracked local `.ds-sync`/`.design-sync` tooling lints dirty but isn't in git or CI), unit 175 +
> web 150, integration 42, web build (PWA SW generated), OpenAPI no-drift. Post-deploy smoke: SPA 200,
> health 200, unauth `/classes` + `/explore` 401, security headers present, served asset hash
> `index-DPf04y_D.js` matches the build, `IMAGES_BUCKET` binding resolves in prod. The cover-serving
> route is session-gated (consistent with the fully-authenticated app — Explore itself requires auth);
> logged-in same-origin `<img>` requests carry the cookie, so covers render. Prior live version
> `12aa76f9` (2026-06-17) is the rollback anchor. Five non-blocking review follow-ups left as a PR
> comment (Spotify 100-track truncation, orphaned-cover cleanup, upload size limit, image `nosniff`,
> `user-scalable=no` a11y).
>
> **Web UI coverage closed + PR-preview decision deferred (2026-06-15, PRs #65–#66, not deployed).**
> PR #66 closes the last REVIEW.md "web UI coverage" SHOULD-FIX with jsdom + Testing Library component
> tests for Dashboard (incl. the keyed rapid-switch guard), the Connections/Share/Teams dialogs, and
> ErrorBoundary (web unit suite 103 → 118; total api 175 + web 118, integration 41). PR #65 recorded the
> integration-test matrix + audit disposition. Separately, evaluated linking the GitHub repo to Cloudflare
> for CI/preview deploys and **deferred PR preview environments** (recorded as a DEFERRED decision in
> REVIEW.md): the repo-link is rejected outright (duplicates CI + pushes toward auto-deploy, conflicting
> with the manual-deploy guardrail); previews revisited when a second reviewer joins or at launch, via a
> `wrangler versions upload` PR job (a version, not a deploy) if pursued. All test/docs-only — no schema,
> migration, API, shared-contract, or OpenAPI change, so **not a deploy**; production stays on Worker
> `768cdded` / remote D1 `0012`. Close-session gates green (typecheck, lint, unit 293, integration 41,
> web build, OpenAPI no-drift).
>
> **LiveMode timeline perf deployed (2026-06-15).** PR #62 closes the REVIEW.md NICE-TO-HAVE
> "avoid rebuilding the active event list on every animation frame": each track's cues/moves are now
> flattened/sorted once per payload, a primitive-returning `trackIndexAt` keeps frame-rate memos from
> invalidating unless the live track changes, and current/next come from a single O(log n) binary search
> over the stable pre-sorted array (`FullList` reuses the same precomputed events). Web-only — no schema,
> migration, API, shared-contract, or OpenAPI change; +8 LiveMode unit tests (suite 3 → 11). All
> CI-equivalent gates green (typecheck, lint, unit api 175 + web 103, 28 Worker/D1 integration, web
> build, OpenAPI no-drift). Worker `768cdded-78b4-4150-a017-d8c92042c750` is live at 100% (supersedes
> `7505f9aa`); remote D1 unchanged (no pending migrations, through `0012`). Post-deploy smoke: SPA `200`,
> `/health` `200`, `/explore` + `/classes` `401`, and the new `LiveMode-Bu73mx7n.js` chunk `200`.
>
> **Integration-test matrix completed + audit gate kept green (2026-06-15, PRs #63–#64, not deployed).**
> PR #63 closes the last REVIEW.md "Expand Worker/D1 integration tests" gaps: new `provider-callback`,
> `provider-disconnect`, and `password-reset` suites drive the mounted worker against Miniflare D1
> (integration suite 28 → 41), covering every OAuth-callback failure branch (state minted via the test
> `ENCRYPTION_KEY`), the disconnect → purge-enqueue side effect, and the full Better Auth reset flow
> (request → reset → sign-in, plus no-enumeration + invalid-token). PR #64 dispositions two
> newly-published dev/build-only vite advisories (`GHSA-fx2h-pf6j-xcff`, `GHSA-v6wh-96g9-6wx3`) that had
> started failing `audit:ci` on `main`. Both are test/tooling-only — no schema, migration, API,
> shared-contract, or OpenAPI change — so **neither is a deploy**; production stays on Worker `768cdded`
> / remote D1 `0012`. Merged after green CI. The integration-test matrix item is closed; at that point,
> the remaining code-level SHOULD-FIX from the review was the Better Auth trusted client-IP header.
>
> **Better Auth trusted client-IP hardening completed and deployed (PR #67, 2026-06-15).** Better Auth now
> keys auth rate limits only from Cloudflare's trusted `CF-Connecting-IP` header, removing
> `X-Forwarded-For` as a fallback because clients can supply values before Cloudflare appends to it. The
> Worker/D1 integration helper now supplies a production-shaped `cf-connecting-ip` header by default, and
> the password-reset suite proves spoofed `X-Forwarded-For` values do not create separate rate-limit
> buckets. No schema, migration, API contract, shared-contract, or OpenAPI change. Merged after green CI
> and deployed to production as Worker `035f196c-e11b-4507-81d7-b5320b42ff2b` (remote D1 unchanged at
> `0012`); smoke-tested SPA, `/api/v1/health`, and a protected route (401 without auth).
>
> **Web design-system reconciliation completed and deployed (PRs #69 + #70, 2026-06-16).** The web app
> now fully adopts the consolidated design system: `tokens.json` re-vendored from the source of truth
> (new primitives, `bg/live`, `radius.sheet`, corrected state colors, default BPM 120→122), Tailwind
> mappings for the `state.*`/`segment.*` channels, the danger channel corrected across 11 components (was
> borrowing the intensity ramp), the three OFL fonts self-hosted (Google Fonts CDN removed, CSP tightened
> to `font-src 'self'`, full per-family `*-OFL.txt` bundled), explicit provider connection states, Live on
> the `bg/live` surface, and an opt-in `[data-theme="light"]` token block. A high-effort code-review pass
> also fixed four pre-existing broken `--rf-*` token references. No schema, migration, API contract,
> shared-contract, or OpenAPI change. PR #69 (the reconciliation) shipped first as Worker `ce1b41e9`, then
> PR #70 (the OFL license bundle) as Worker `d4613501-c176-49cf-ad44-2e3f166bf3c8` (remote D1 unchanged at
> `0012`); both smoke-tested — SPA, `/api/v1/health`, a protected route (401), the self-hosted font assets,
> and the three OFL license texts (`200 text/plain`).
>
> **Standalone design-system synthesis completed (2026-06-15).** A reviewable reference package now
> lives at the workspace root in `ritmofit-design-system-final/`. It consolidates canonical tokens and
> guidance, adds a first-class Library-to-Builder creation flow, and includes framework-free mockups for
> marketing, Library, Builder, Live, share cards, iOS direction, sign-in, and explicitly future-facing
> Explore/Teams surfaces. This does not alter production components, API contracts, schema, migrations,
> or deployment state. Production adoption remains a separate reviewable implementation phase. **The
> canonical design system is still the in-repo [`../ritmofit_design_system/`](../ritmofit_design_system/);**
> the workspace-root `ritmofit-design-system-*` directories and HTML mockups are exploration artifacts,
> not the source of truth.
>
> **Pre-launch blocker remediation deployed (2026-06-14).** PR #45 shipped four audited launch fixes:
> production OAuth callbacks use the canonical web origin; shares and team grants require a verified
> target identity; Dashboard class detail is keyed by class/request and rejects stale responses; and
> provider disconnect purges clear unprovenanced artwork while retaining exhausted duties in a durable
> failed state. Remote D1 is migrated through `0009` (`failed_at` plus the active-queue index), and Worker
> version 46 (`aa26e286-c517-444a-952f-d5e410c9439f`) is live at 100%. Health, SPA, protected-route,
> code-split asset, and missing-state SoundCloud callback smokes passed; the callback now returns to
> `https://ritmofit.studio`.
>
> **Production transactional email verified (2026-06-14).** Resend verifies
> `ritmofit.studio`; public DNS resolves the sending MX/SPF/DKIM records and DMARC policy.
> Worker secret-only version 48 (`5bcf4a47-5795-4832-b8b0-bde95d651b3d`) supplies a
> sending-only, domain-restricted `RESEND_API_KEY` and explicit `EMAIL_FROM`. A real
> Gmail-alias signup received and completed email verification (`email_verified = 1`);
> the password-reset email also arrived, opened the valid reset form, and completed the
> password change. The temporary production account and its cascaded auth rows were
> removed after the test. The transactional-email launch blocker is closed.
>
> **Pre-launch hardening + verification (2026-06-15).** Three web-focused PRs: **#51** an accessible
> `Dialog` primitive (focus trap/return, `inert` background) adopted across all five dialogs, real form
> labels, and narrow-width (390 px) layout fixes; **#52** a dialog focus guard (keep focus inside when an
> in-dialog control is removed) plus committed Playwright browser smokes (`apps/web/smoke/`: narrow-width
> 18/18, functional 16/16) and a deploy/rollback runbook (`deployment-runbook.md`); **#53** release-gate
> hardening — Prettier boundary so `format:check` is green, the four dev/build-only `esbuild`/`vite` audit
> advisories dispositioned via `pnpm-workspace.yaml`, and both wired into CI (no deploy — tooling only).
> #51/#52 are live; Worker `1eb04d11-b676-43b5-a7be-7b62ffe83f6a` at 100%, remote D1 through `0010`.
> **0 launch blockers remain**; the Follow-Up Verification Checklist in `../REVIEW.md` is now green except
> a vite 5→6 upgrade (to clear the ignored advisories) and owner-only GitHub branch protection. Remaining
> SHOULD-FIX backend items: add the remaining lookup/cleanup indexes and broaden Worker/D1 integration
> tests.
>
> **Web hardening — class-library pagination deployed (2026-06-15, PR #54).** `GET /classes` now resolves
> ownership, direct/team shares, duplicate-path access rank, deterministic ordering, and optional
> keyset pagination inside D1. The web library loads 30 classes at a time; the unparameterized full-array
> response remains compatible with the current iOS client. Migration `0011` adds owner/share lookup
> indexes. Remote D1 migrated through `0011`; Worker `86c996ff-4b75-4ea0-bf8e-0ed59910c125` is live at
> 100% (supersedes `1eb04d11`). Post-deploy smoke: SPA `200`, `/health` `200`, `/classes` `401` (incl.
> `?limit=5`), 6/6 security headers present.
>
> **Backlog batch deployed (2026-06-15, PRs #55–#61).** The overnight hardening backlog merged to `main`
> and the runtime/schema changes shipped together. **#57** adds the `track_provider_ids.track_id` lookup
> index and the `rate_limit.last_request` pruning index via migration `0012` (index-only); **#56**
> lazy-loads/async-decodes non-critical album art; **#58** renders a 404 view for unknown SPA paths;
> **#60** adds owner-only inline class rename. **#55**/**#61** add choreography write-path and team-share
> detail-access Worker/D1 integration tests (suite 21 → 28); **#59** rewrites the README as a real entry
> point and drops the stale root `.dev.vars.example`. Remote D1 migrated through `0012`; Worker
> `7505f9aa-3655-4bef-b6b3-1b2085d627eb` is live at 100% (supersedes `86c996ff`). Gates green (api 175 +
> web 95 unit, 28 integration, build, OpenAPI no-drift, audit:ci). Post-deploy smoke: SPA `200`
> (`index-CMFEcIls.js`), `/health` `200`, `/classes` `401`, 6/6 security headers present. Remaining
> SHOULD-FIX: broaden the integration matrix (provider callback config, disconnect purge SQL, password
> reset) and the deferred LiveMode RAF memoization + Better Auth trusted client-IP header.
>
> **Web design-system build (builder UI) underway (2026-06-12).** The rich planning UI M1 deferred is
> now being built in vertical slices — the difference between the data-flow skeleton and the designed
> surface in [`../ritmofit_design_system/`](../ritmofit_design_system/). Slices 1–4 are merged (PR #8)
> and **deployed** (Worker version `4afed022`, no schema change): (1) the energy-arc **intensity ribbon**,
> (2) low-noise **song rows** (44px art, Martian-Mono BPM, intensity bars), (3) the **track inspector**
> (edit intensity/BPM/notes, remove), (4) **cue + placed-move authoring**. Also wired **vitest into
> `apps/web`** (geometry unit test). Slices 5–6 added drag/keyboard reorder and inline-edit of cues/moves
> (PRs #9–#10). **Slice 7** assembles it all into the spec'd **full 3-pane `09` layout** (library · class
> workspace · sticky inspector, with a class-header summary) — purely presentational, no schema/API/shared
> change; `pnpm test` = api 159 + web 17 = **176** *(merged PR #13, **deployed** 2026-06-12, Worker
> version `810f25d3`)*. **Slice 8** adds the **cue color picker** (rationed palette, no plasma; tags the
> existing `cues.color`; deployed, Worker `74a94ec5`). **Slice 9** adds **custom user-moves** (create +
> place reusable moves from the inspector; web-only — the `/user-moves` routes + run-payload name
> resolution already existed; *merged PR #17, **deployed 2026-06-12**, Worker `511af62c`*). **Slice 10**
> adds the **timeline-marker strip** beneath the ribbon (proportional track blocks + ▲ cue / ◆ move markers
> on a shared time axis; *merged PR #19, **deployed 2026-06-12**, Worker `ca91c8c5`*). **Slice 11** makes
> the timeline's blocks + markers **clickable/keyboard-selectable** (open a track in the inspector,
> cross-highlight its row; *merged PR #21, **deployed 2026-06-13**, Worker `755e3489`*). **Slice 12** makes
> a cue/move **marker click focus its row** in the inspector (*merged PR #23, deployed, Worker `802ebe48`*).
> **Slice 13** adds a **custom-moves manager** (rename / description / delete via a dialog from the Moves
> section; web-only over the existing `/user-moves` routes; *merged PR #25, **deployed 2026-06-13**, Worker
> `cc437560`*). **Slice 14** adds the signature **on-beat pulse** — the Live "Now" cue card breathes on the
> track's beat (CSS, reduced-motion-safe; *merged PR #27, **deployed 2026-06-13**, Worker `9a298d21`*).
> **Slice 15** adds the All-Out **"drop"** — a plasma glow bloom + cue crossfade on all-out cue advances in
> Live (CSS, reduced-motion-safe; *merged PR #29, **deployed 2026-06-13**, Worker `c3a502c0`*). **Slice 16**
> adds the **segment band** — a new `class_sections` table (**migration `0006`**) + fixed `segmentType` enum,
> full-stack (shared + CRUD routes + additive run-payload `sections[]` + a `SegmentBand` under the timeline);
> this is the first builder slice that **does** change schema + contract (*merged PR #31, **deployed
> 2026-06-13**, Worker `14d363cf`; remote D1 migrated to `0006`*). Slices 7–15 were no schema/API/shared change.
> **Slice 17** adds **stable cue/move `id`s to the run-payload** — an **additive** contract change (no
> schema/migration; `schemaVersion` stays 1) so the timeline marker→row focus correlates by id and two
> cues/moves at the same `anchorMs` disambiguate (closes the slice-12/16 caveat) — and hardens the
> contract iOS Phase 2 consumes; `pnpm test` = api 159 + web 49 = **208** (*merged PR #33, **deployed
> 2026-06-13**, Worker `7edfda8a`, no schema/migration*).
> Deferred: the planning-timeline pulse, the playhead/tap-to-seek, segment icons/drag-resize, custom-move
> `baseMoveId`/`template` editing, and a run-payload `id` on `sections[]` (symmetry, if iOS wants it). See
> `milestones.md` for the full slice log.
>
> **Music frontend (the "M2 frontend") complete + deployed (2026-06-13).** M2's provider backend had
> shipped with **no UI** (tracks were hand-typed as Title/Artist/ms); that gap is now closed. **S1**
> track search → import → add (provider-picked, debounced, 44px song cards); **S2** provider-connection
> settings (connect/disconnect, clear states); **S3** "search my likes" (token-spending); **S4** a BPM
> lookup button. Then, when real credentials were first set, two **prod-only** bugs surfaced (the mock
> path never exercised live `fetch`/limits) and were fixed: a Workers `Illegal invocation` from passing
> the **bare global `fetch`** to adapters (→ a bound `fetch` wrapper) and **Spotify rejecting `limit=25`**
> with 400 "Invalid limit" (→ 10); provider failures now also map to **502** (typed `ProviderError`), not
> 500. **All three providers verified live in prod** (SoundCloud / Spotify / Apple Music — real search +
> import + album art; secrets set via `wrangler secret`, Apple developer-token minted by the new
> `apps/api/scripts/apple-dev-token.mjs`). `pnpm test` = api 159 + web 53 = **212**. PRs #35–#37; latest
> Worker after the error-mapping fix. **Open:** SoundCloud per-user *Connect* OAuth round-trip needs the
> redirect URI registered + a browser login to confirm (provider *search* via app-token is verified).
>
> **iOS Phase 2 underway — near complete (2026-06-15).** The native live surface in `ritmofit-ios`
> (built against this same backend/run-payload) has merged slices **1–10 plus slice 11 partials** to
> `main` (PRs #5–#13); only VoiceOver, error-boundary review, and a launch screen remain. iOS status is
> tracked in `ritmofit-ios/ritmofit_dev_plan/BUILD_ORDER.md`, the source of truth for that repo — this
> plan does not re-track iOS slices. The web *backend* build order is done; the web *UI* design-system
> build continues.
>
> **Web hardening — track-duration Live guard deployed (2026-06-14).** PR #49 adds
> class-specific `class_tracks.duration_ms_override` (migration `0010`), letting owners/editors repair an
> unknown or incorrect provider/library duration without mutating another user's private track.
> Sequencing, anchor validation, copies, and the run-payload use the effective duration
> (`override ?? track.duration_ms`). The builder labels missing durations, offers an `m:ss` correction
> in the inspector, and blocks Live mode until every track has a positive duration. Unit/component
> tests (241), Worker/D1 integration tests (17), CI, and fresh-D1 migration verification passed.
> Remote D1 was migrated through `0010` before Worker
> `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` deployed at 100%. Health, SPA, auth enforcement,
> security-header, main-bundle, and Live-mode chunk smokes passed.
>
> **Web hardening — Live provider handoff deployed (2026-06-14).** PR #50 adds explicit
> provider-app/site handoff links for the active track in Cue-by-Cue and Full List views, using the
> run-payload's existing `providerRefs`. A web-only validator accepts Spotify
> track URIs and provider-owned HTTPS links for Spotify, Apple Music, and SoundCloud while suppressing
> null, malformed, cross-provider, and unsafe stored values. This does not embed, mix, or control
> playback and does not change schema, migrations, API behavior, shared contracts, or OpenAPI.
> Typecheck, lint, 246 unit/component tests, 17 Worker/D1 integration tests, the production web build,
> and OpenAPI drift verification passed. A local browser pass confirmed both Live views, 44px handoff
> targets, provider order/labels, external-link attributes, and suppression when no trusted URI remains.
> CI passed; merged `main` deployed as Worker `babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` at 100%.
> Remote D1 remains through `0010`. Production health, SPA, auth enforcement, security headers, exact
> main/Live asset hashes, and browser runtime/CSP smokes passed.
>
> **Design system — audited final package integrated + deployed (2026-06-17).** PR #74 reconciled the
> in-repo `ritmofit_design_system` with the audited `ritmofit-design-system-final` as a union merge:
> `tokens.json` gains an oklch heat gradient and a light-theme sticky-header token (`headerLight`), now
> wired through the app emitter so `[data-theme="light"]` overrides the topbar; `build-tokens.mjs` /
> `lint-tokens.mjs` gain spacing-scale emission + a guard while keeping the web copy's `--check` / prose
> lint tooling; specs + README reconciled. No schema/API/migration change. `npm run verify`, typecheck,
> lint, **322** unit (web 147 + api 175) + **42** Worker/D1 integration tests, the web build, and OpenAPI
> no-drift passed; merged `main` deployed as Worker `12aa76f9-3a3f-4fc3-8950-f8096434dd31` at 100% (remote
> D1 unchanged through `0012`). Prod CSS verified SHA-256-identical to a fresh build; a live browser render
> confirmed the heat gradient, oklch bloom, and warm-white light header. A post-merge **integration audit**
> (9 dimensions + live render) found the token pipeline, emitters, tooling, and prod artifact clean, and
> surfaced three doc-accuracy issues fixed in PR #75 (docs-only, no redeploy): stale `light.html`
> "no light variant" copy, the brief's class-naming convention (the app uses an `rf-` component namespace,
> the mockups bare names), and a "web uses fluid `clamp()`" type claim true only of the mockups.

---

## From milestones.md — builder-UI / music-frontend / post-launch hardening log

## Web design-system build (builder UI) — shipped & deployed

Not a numbered milestone: this is the **rich planning UI M1 deferred** ("layered on after the data flow
works"), turning the functional-but-skeleton builder into the surface specified in
[`../ritmofit_design_system/`](../ritmofit_design_system/). Built in small vertical slices on top of the
existing backend/run-payload — **no schema, API-contract, or shared-package change**. Slices 1–4 merged in
**PR #8** and **deployed** (2026-06-12, Worker version `4afed022`):

- ✅ **Slice 1 — energy-arc ribbon** (`IntensityRibbon`): the signature staircase area graph; height
  encodes each track's intensity zone (grayscale-safe, color is reinforcement), plasma kiss at all-out,
  static (reduced-motion-safe). Pure `computeRibbonSegments` helper. Also **wired vitest into `apps/web`**
  + a geometry unit test (root `pnpm test` now runs api 159 + web 5 = **164**).
- ✅ **Slice 2 — low-noise song rows** (`SongRow`): 44px album art, title/artist, BPM in Martian Mono,
  intensity as bars+label. Extracted the shared `IntensityReadout` out of `LiveMode` (one definition of
  the redundant-encoding rule).
- ✅ **Slice 3 — track inspector / detail editor** (`TrackInspector`): select a row → edit intensity,
  display-BPM override, notes; remove the track. Edits reshape the ribbon + rows live. Gated on
  owner/edit access. Added `updateClassTrack` / `deleteClassTrack` (existing `PATCH`/`DELETE
  /class-tracks/:id`).
- ✅ **Slice 4 — cue + placed-move authoring** (`ChoreographyEditor`): add/list/delete cues (anchor +
  text) and placed moves (a `GET /moves` library move or freeform `nameOverride`, anchored, optional
  intensity; honors the at-most-one-reference invariant). Added the cue/move/library client fns.
- ✅ **Slice 5 — drag + keyboard reorder of the track list** (merged, PR #9): the ordered song rows
  reorder by dragging a dedicated grip handle (kept off the selection button so click-to-select and drag
  never collide) and by keyboard (↑/↓ on the focused grip — native DnD isn't keyboard-operable). Persists
  via the existing `POST /classes/:id/tracks/reorder` (edit access) and reloads the detail so the ribbon +
  per-track offsets recompute; optimistic order with rollback on failure; view-only shows no grip. New
  pure `moveItem` helper (`lib/reorder.ts`, unit-tested) + `reorderTracks` client fn. No
  schema/API-contract/shared change.
- ✅ **Slice 6 — inline-edit existing cues & placed moves** (merged, PR #10): the `ChoreographyEditor`
  cue/move rows gain an **Edit** affordance (one row editable at a
  time, seeded from the persisted row, Save/Cancel) on top of slice 4's add/list/delete. Cues edit
  anchor + text; placed moves edit anchor + library-pick/custom-name + optional intensity. Backed by the
  existing `PATCH /cues/:id` + `PATCH /class-track-moves/:id` (edit access; the move route re-validates
  the at-most-one-reference invariant on the merged result). Switching a move's reference nulls the
  others; a "Keep current move" sentinel preserves a non-listable `userMoveId` untouched. `updateCue` +
  `updatePlacedMove` client fns; no schema/API-contract/shared change. `pnpm test` = api 159 + web 11 = **170**.
- ✅ **Slice 7 — the full 3-pane `09` layout**: replaced the 2-column inline-inspector builder with the
  spec'd workstation — a **persistent top bar**, then a `xl:grid-cols-[266px_1fr_340px]` grid (collapses
  to one stacked column below `xl`): a sticky **class library** rail (left), the **class workspace**
  center column (a new `ClassHeaderCard` with title + visibility + derived summary stats → energy ribbon
  → track list → add-track), and a **sticky right-hand inspector** (the `TrackInspector` + its nested
  cue/move authoring, with its own scroll and a "select a track" placeholder). The header summary
  (**track count · assembled total · avg BPM**, label+number not color alone) is derived from the
  existing run-payload via a pure, unit-tested `lib/class-summary.ts` (`avgBpm` + `formatDuration`) — no
  new data. Existing components were re-parented untouched; the workspace is keyed by class id so opening
  another class clears the track selection. No schema/API-contract/shared change. `pnpm test` = api 159 +
  web 17 = **176**.
- ✅ **Slice 8 — cue color picker**: cues can be tagged with a color in the inspector's `CuesSection`
  (add + inline-edit), persisted to the existing `cues.color` (no schema/API/shared change — the column,
  route, and run-payload were already wired). A new accessible `CueColorPicker` (radio-group, text-labelled
  swatches, cyan selected-ring) offers a **None** option + the rationed copper/cyan/amber/ember/bone
  palette and **never plasma** (`02-color-system.md`); rationing is enforced in the picker. A stored color
  outside the palette renders as a trailing "current" swatch so editing never silently drops it. Cue rows
  show a small color dot (decorative — time + text still carry the meaning). Palette + `tagLabel` live in
  pure, unit-tested `lib/cue-colors.ts`. A PR-review pass swapped the picker's `radiogroup`/`radio` roles
  for an `aria-pressed` toggle `group` (no arrow-key pattern to honor). `pnpm test` = api 159 + web 22 =
  **181**. **Merged PR #15, deployed 2026-06-12** (Worker version `74a94ec5`; no schema/migration).
- ✅ **Slice 9 — custom user-moves**: instructors can create reusable custom moves and place them from the
  inspector's `MovesSection`. The backend (`GET/POST /user-moves` owner-scoped; placed-move routes already
  validate an owned `userMoveId`; run-payload already resolves user-move names) needed **no change** — this
  is web-only: new `listUserMoves` / `createUserMove` client fns; `MovesSection` loads the caller's user
  moves, lists them as a "Your moves" `<optgroup>` beside the global "Library", and a **"＋ New custom
  move…"** option creates-and-places in one Add (then selects the new move so a repeat Add re-uses it).
  Picker values are source-prefixed (`m:`/`u:`) to disambiguate the two UUID spaces — a pure, unit-tested
  `lib/move-pick.ts` (`parseMovePick`/`pickForPlacement`). `nameOf` now resolves user-move names (was
  `(move)`). This also **retired the `KEEP` sentinel** (user moves are listable now) and **fixed the
  `TODO(select-fallback)`** (a fallback `<option>` for an unresolved id when the library/user-moves fetch
  fails). No schema/API-contract/shared change. `pnpm test` = api 159 + web 30 = **189**. **Merged PR #17,
  deployed 2026-06-12** (Worker version `511af62c`; no schema/migration).
- ✅ **Slice 10 — timeline-marker strip**: a thin **timeline** band beneath the energy ribbon that shares
  its time axis — proportional numbered **track blocks** with **cue (▲)** and **placed-move (◆)** markers at
  their absolute time (`trackStart + clamp(anchorMs, 0, trackDuration)`). Cues/moves are **distinct shapes**
  (not color alone, 09); cue markers carry the cue's color tag, move markers the intensity color — both
  decorative, with shape + position + a `time — text/name` title/aria carrying the meaning. New
  `TimelineStrip` component + a pure, unit-tested `computeTimeline` (same duration-share math as
  `computeRibbonSegments`, so the strip lines up under the ribbon; null/zero-duration tracks drop their
  block + markers). Rendered inside the ribbon card in `Dashboard`. **Static — no playhead** (a Live /
  on-beat concern, deferred); read-only this slice. No schema/API-contract/shared change. `pnpm test` =
  api 159 + web 37 = **196**. **Merged PR #19, deployed 2026-06-12** (Worker version `ca91c8c5`; no
  schema/migration).
- ✅ **Slice 11 — timeline selection**: the timeline strip's track blocks and cue/move markers are now
  **clickable + keyboard-operable** — selecting one opens that track in the inspector and cross-highlights
  its `SongRow` (the open track's block is ringed, `aria-pressed`). `computeTimeline` carries each
  block/marker's `classTrackId` + `position`; `TimelineStrip` gained optional `selectedTrackId` +
  `onSelectTrack` (a plain select, not toggle), with a non-interactive fallback preserved. `Dashboard`
  wires `onSelectTrack={setSelectedTrackId}`. Marker hit areas are padded around the glyph. No
  schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #21, deployed
  2026-06-13** (Worker version `755e3489`; no schema/migration).
- ✅ **Slice 12 — focus a cue/move from its marker**: clicking a timeline **cue (▲) / move (◆)** marker now
  selects the track *and* scrolls the matching inspector row into view with a brief highlight flash (clicking
  a track block still just selects). Markers carry the in-track `anchorMs`; `onSelectTrack` gained an optional
  `{ kind, anchorMs }`; `Dashboard` holds a `markerFocus` (`+ nonce` so re-clicking re-flashes) and threads it
  through `TrackInspector` to `CuesSection`/`MovesSection`. A shared `useFlashFocus` hook scrolls + transiently
  rings the row whose `anchorMs` matches (correlated by `anchorMs` since run-payload cues/moves carry **no
  id**). No schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #23,
  deployed 2026-06-13** (Worker version `802ebe48`; no schema/migration).
- ✅ **Slice 13 — manage custom moves**: a `CustomMovesDialog` (opened via a **Manage…** button in a track's
  Moves section) lists the caller's custom moves and lets them **rename**, edit the **description**, and
  **delete** (inline two-step confirm; deleting a referenced move is safe — the server snapshots its name
  into placements' `nameOverride`). Web-only: added `updateUserMove`/`deleteUserMove` client fns over the
  existing owner-scoped `PATCH`/`DELETE /user-moves/:id`. On a change, `MovesSection` refreshes the picker
  + this track's placements and bubbles `onChanged` (`TrackInspector` wires it to the class-detail reload,
  so the ribbon/timeline move names stay current). Creation stays in the picker; **`baseMoveId`/`template`
  editing deferred**. No schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**.
  **Merged PR #25, deployed 2026-06-13** (Worker version `cc437560`; no schema/migration).

- ✅ **Slice 14 — on-beat pulse (Live HUD)**: the focal **"Now" cue card** in Live mode breathes one cycle
  per beat (`--rf-beat = 60s / --rf-bpm`, `onBeat` easing `cubic-bezier(0.4,0,0.2,1)`) while playing — the
  design system's signature tempo cue (`10-rhythm-system.md`). CSS-driven (`rf-beat-pulse` keyframes in
  `index.css`, transform + box-shadow only); `LiveMode` adds the class + inline `--rf-bpm` to the Now card
  when `playing && displayBpm != null`. **Exactly one pulsing element**, and **fully removed under
  `prefers-reduced-motion`** (a user loses affect, not information — the cue stays legible). No
  schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #27, deployed
  2026-06-13** (Worker version `9a298d21`; no schema/migration).

- ✅ **Slice 15 — the All-Out "drop"** (10 §5, the one big motion spend): in Live mode, while the **live
  track's intensity is `all_out`**, each cue advance blooms a one-shot **plasma glow** (the `peak-glow`
  token) behind the "Now" card and the cue text **cross-fades in**. Rationed to all-out tracks (a handful
  of times per class); layers with the slice-14 beat pulse. CSS-driven (`rf-drop-bloom` + `rf-drop-in`
  keyframes, re-triggered by remounting the bloom/text on the current cue); **degrades to an instant,
  glow-free swap under `prefers-reduced-motion`**. No schema/API-contract/shared change. `pnpm test` =
  api 159 + web 39 = **198**. **Merged PR #29, deployed 2026-06-13** (Worker version `c3a502c0`; no
  schema/migration).
- ✅ **Slice 16 — segment band (fixed enum)** — *the first design-system-build slice that changes schema +
  the contract.* A new **`class_sections`** table (**migration `0006`**) holds time-anchored segment bands;
  a fixed `segmentType` enum (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`, lower_snake; labels/tints
  presentation-only). Full stack: shared `classSection` schemas + enum; CRUD routes (`GET/POST
  /classes/:id/sections`, `PATCH`/`DELETE /sections/:id`) class-scoped via a new `requireSectionAccess`
  (view reads, edit writes); the run-payload gains an **additive** `sections[]` (`schemaVersion` stays 1);
  OpenAPI regenerated. Web: a `SegmentBand` under the timeline tiles bands by start (pure, unit-tested
  `computeSegmentBands`; each band is **label + tint dot**, never color alone) + an edit-gated add/retime/
  retype/delete editor. **Start is a free anchor** (no bound to the assembled duration — it shifts as
  tracks change; render clamps + tiles). Deferred: Material-Symbol icons, drag-resize, track-range binding.
  `pnpm test` = api 159 + web 44 = **203**. **Merged PR #31, deployed 2026-06-13** (Worker version
  `14d363cf`; **remote D1 migrated to `0006` first** — additive `class_sections` table).
- ✅ **Slice 17 — stable cue/move ids in the run-payload** — *an additive contract change (no schema/
  migration).* The run-payload's cues and placed moves now carry a stable **`id`** (the existing
  `cues.id` / `class_track_moves.id` PKs, already selected during assembly — no new queries);
  `schemaVersion` stays **1**. Shared `runPayloadCue`/`runPayloadMove` schemas gain `id: uuidSchema`;
  OpenAPI regenerated (+two `id` fields only). Web: the timeline **marker→inspector-row focus** now
  correlates by **id** (pure, unit-tested `resolveFlashRowId`: exact id match → first-row-at-same-anchor
  fallback for legacy/changed ids), so **two cues/moves sharing an `anchorMs` disambiguate** — closing the
  slice-12/16 caveat. `id` threads through `TimelineMarker`/`computeTimeline` → `onSelectTrack` →
  `Dashboard` `markerFocus` → `Cues`/`MovesSection`. This also hardens the contract iOS Phase 2 consumes.
  `pnpm test` = api 159 + web 49 = **208**; typecheck (4 pkgs) · lint · web build green. **Merged PR #33,
  deployed 2026-06-13** (Worker version `7edfda8a`; **no schema/migration** — additive contract).

- ✅ **Slice 18 — Live timeline playhead/seek + segment drag-resize** (PR #73, deployed 2026-06-16):
  closes three of the deferred-backlog items below. The builder's static `TimelineStrip` is brought into
  Live mode as the transport **scrubber** — a new `LiveTimeline` reuses `computeTimeline()` for the
  proportional track blocks + cue (▲) / move (◆) markers, fills the played portion, and draws a moving
  **playhead** at the current class time; it replaces the plain `<input type=range>` with an accessible
  `role="slider"` (aria value text; pointer click/drag + ←/→ · PageUp/Dn · Home/End), seeking the existing
  virtual prompter clock only (no audio — the three music rules hold). Each segment boundary becomes a
  **drag-resize handle** (accessible slider) that re-times `startOffsetMs` via the existing
  `PATCH /sections/:id`, clamped between neighbors (1s min gap) so a drag can't reorder/collapse bands,
  committing on pointer-up/Enter/blur and reverting on failure; the numeric `SegmentEditor` stays the
  precise/secondary path. Adds a per-type inline-SVG **energy-arc icon** (label + icon + tint, never color
  alone; no font/CDN, so `font-src 'self'` is unaffected). Web-only: no schema, migration, API,
  shared-contract, or OpenAPI change. `pnpm test` = api 175 + web 147; CI green. **Deployed** in Worker
  `db6265f2-4ed0-48f0-8b8b-4c03801c0247` (alongside the additive API PR #72); remote D1 unchanged at `0012`.

**Deferred (flagged in code):** custom-move **`baseMoveId`/`template`** editing, the **playing-track pulse
in the planning timeline** (no "playing" state in the builder), and segment-band **track-range binding**
(snapping boundaries to track starts). *(Slice 18 closed the timeline **playhead** / tap-to-seek and the
segment-band **icons** + **drag-resize** items.)* The run-payload's
`sections[]` still carries **no id** (sections aren't part of marker→row focus; a symmetry follow-up if
iOS wants it). *(The slice-12/16 **marker→row `anchorMs` disambiguation caveat** was **resolved in slice
17** — cues/moves now carry ids; the PR #10 `TODO(select-fallback)` was resolved in slice 9.)*

---

## Music frontend ("M2 frontend") — built + deployed, all providers live (2026-06-13)

M2 shipped the provider **backend** with no UI — tracks were hand-entered (Title/Artist/ms). This wired
the music layer into the builder and took it to **real catalogs in prod**.

- ✅ **S1 — track search & import** (PR #35): provider-picked, debounced search → low-noise **44px song
  cards** → one-click import-and-add (`GET /providers/:p/search` → `POST /providers/track-import` → add by
  `trackId`). Manual entry kept as a de-emphasized fallback. `lib/providers.ts` (labels/order — SoundCloud
  first — + enum-drift guard); `TrackSearch.tsx`.
- ✅ **S2 — provider connections** (PR #36): `ConnectionsDialog` (top-bar **Connections**) — connect /
  disconnect with clear connected/disconnected state; mock seam links inline, live flow redirects to the
  authorize URL; disconnect is confirmed (triggers the 7-day metadata purge).
- ✅ **S3 — "my likes"** (PR #36): a **Search / My-likes** toggle in `TrackSearch` (`GET /providers/:p/likes`,
  spends the user token).
- ✅ **S4 — BPM lookup** (PR #36): a **Look up BPM** button in the inspector (`POST /tracks/:id/bpm-lookup`,
  never Spotify). S5 (album art on rows, empty/disconnected states) was already satisfied by existing code.
- ✅ **Prod hardening** (PR #37) — two bugs the mock path never exercised, found once **real creds** were
  set and fixed live: (1) **`TypeError: Illegal invocation`** on every provider — the **bare global `fetch`**
  passed to adapters loses its `this` in the Workers runtime (miniflare tolerated it); fixed with
  `lib/fetch.ts` `boundFetch` at all 8 call sites. (2) **Spotify search 400 "Invalid limit"** — Spotify's
  client-credentials search now rejects `limit=25` despite the documented 0–50; lowered to **10**. Also:
  adapters now throw typed **`ProviderError`** so provider failures map to **502** (logged), not an opaque
  500; the Apple developer token is minted by the new **`apps/api/scripts/apple-dev-token.mjs`** (ES256 JWT
  from the untracked `.p8`).
- **Verified live in prod** (`ritmofit.studio`): **SoundCloud**, **Spotify**, and **Apple Music** all return
  real search results and import with album art; throwaway test accounts deleted after each check. Secrets
  set via `wrangler secret put`. `pnpm test` = api 159 + web 53 = **212**; typecheck (4) · lint · build green.
- **Open:** the SoundCloud **per-user Connect** OAuth round-trip needs its **redirect URI registered**
  (`https://ritmofit.studio/api/v1/providers/soundcloud/callback`) + a browser login to confirm end-to-end
  (provider *search* via the app token is verified). Spotify/Apple are **search-only** by design.

---

## Post-launch web hardening

- ✅ **D1-ordered class-library pagination**: `GET /classes` now resolves ownership, direct shares,
  team shares, duplicate-path access rank, deterministic `(updated_at DESC, id DESC)` ordering, and
  optional keyset pagination inside D1. The web library loads 30 at a time with an accessible
  continuation control; unparameterized requests keep the legacy full-array contract for iOS.
  Migration `0011` adds owner/share lookup indexes.
- ✅ **Track-duration Live guard** (PR #49, deployed 2026-06-14): migration `0010` adds
  `class_tracks.duration_ms_override`; sequencing, anchor validation, copies, and the run-payload use
  the class-specific override before the library duration. The builder accepts `m:ss`, flags missing
  durations, and blocks Live mode until every track is timed. Remote D1 is through `0010`; Worker
  `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` is live at 100%.
- ✅ **Live provider handoff** (PR #50, deployed 2026-06-14): Cue-by-Cue and Full List
  expose large, keyboard-accessible "Open in Provider" links for the active track. The links use the
  existing run-payload `providerRefs`; a provider-specific web validator accepts Spotify track URIs
  and trusted Spotify/Apple Music/SoundCloud HTTPS hosts, suppressing malformed or untrusted values.
  Playback remains wholly in provider applications/sites. Web-only; no schema, migration, API,
  shared-contract, or OpenAPI change. Typecheck, lint, 246 unit/component tests, 17 Worker/D1
  integration tests, web build, and OpenAPI drift verification passed; a local browser pass covered
  both Live views plus trusted and suppressed-link states. CI passed; Worker
  `babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` is live at 100%, with remote D1 unchanged through `0010`.

---
