# Milestones

Each step follows the working agreement: **plan → confirm → code → summarize** (see
`../AGENTS.md` → "Working Agreement").

> **Status: M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ · Web Launch Readiness ✅ · Provider-authorized playback ✅ — all done, merged to `main`, and
> deployed** (API + web at `https://ritmofit.studio`). The active focus (2026-07-07) is solo creator
> refinement and web-first product definition. The **provider-authorized playback initiative is
> complete** — all three adapters (SoundCloud Widget API, Apple Music MusicKit JS, Spotify Web Playback
> SDK) are built and live-verified on prod as of 2026-07-06 (see `provider-playback-implementation.md`).
> Teams, Sharing, Publish, and Explore shipped historically in M4 but are now hidden/dormant. For the
> live Worker version and the current remote D1 migration
> level (well past these milestones — `HISTORY.md` is the source of truth, not this block), see
> [`HISTORY.md`](./HISTORY.md). The launch gate lives in
> [`web-launch-readiness.md`](./web-launch-readiness.md); the old parity record lives in
> [`web-ios-parity.md`](./web-ios-parity.md) but is paused by D20.
>
> **Surface scope:** per the solo-first reset (`decisions.md` D20), the web app is the current
> product-definition surface. iOS parity is not a merge gate. (The prior `REVIEW.md`
> launch-readiness log is archived in `archive/`.)

## M1 — Auth + class/cue data model ✅ done

**Schema-complete, routes-lean** (decision D9). The part fully under our control. **No music-provider
API calls.** BPM and provider IDs are hand-entered.

**Definition of done:** a logged-in user can create a class, add track references (typed in or via the
mock-track seam), tag them with cues/moves/intensity, place them on a timeline, and fetch the whole
thing as a versioned **run-payload**. Teams/sharing exist in the schema and had working routes by end of
M1, built *after* the core builder; under D20 they are preserved as dormant scaffolding.

### Build order

Core builder first (these validate the product), teams/sharing last.

1. **Monorepo scaffold** — pnpm workspace root, `tsconfig.base.json`, three packages
   (`packages/shared`, `apps/api`, `apps/web`), shared lint/format config, `wrangler.toml` with a D1
   binding, a Hono Worker with `GET /api/v1/health`.
   - *Acceptance:* web runs via Vite locally; API runs via `wrangler dev`; `/health` returns ok; shared
     package imports resolve.
2. **`packages/shared`** — Zod schemas + inferred types for every entity in `schema.md`. The contract;
   everything depends on it, so it's first.
   - *Acceptance:* types import cleanly in both api and web; enums defined once.
3. **Drizzle schema + first migration** (`apps/api/src/db/schema.ts`) — matches `schema.md`, including
   the `shares` one-target CHECK, the `class_track_moves` at-most-one-reference rule, and unique
   constraints. Seed the global `moves` library.
   - *Acceptance:* `wrangler d1 migrations apply` runs locally; schema compiles; seed creates global
     moves.
4. **Better Auth wiring** — email/Apple/Google; `POST /auth/session` upserts the canonical `users` row
   on first sight; session middleware resolves the user.
   - *Acceptance:* a user can sign in locally; API identifies the current user; unauthenticated
     requests are rejected.
5. **Authorization helper** (`lib/authz.ts`) — `requireAccess` per `authorization.md`, **before** any
   protected route. Unit-tested (including the union predicate).
   - *Acceptance:* owner/edit/view/none resolve correctly in tests.
6. **Class + class_track routes** — CRUD, reorder, copy-with-cues. Run through `requireAccess`.
   - *Acceptance:* create a class; add/edit/remove class_tracks; reorder persists; copy duplicates cues
     + moves.
7. **Cue + move routes** — CRUD for `cues` and `class_track_moves`, anchored to class_track; moves
   library + user-moves routes.
   - *Acceptance:* add/edit/delete cues and placed moves; create a custom user move; picker can list
     global + user moves.
8. **Track + provider-id routes** — hand-entered track creation; attach/remove provider IDs.
   - *Acceptance:* create a provider-agnostic track with manual BPM; attach a provider ID.
9. **Mock-track seam** — a dev-only mock "search/import" path that creates tracks without any provider
   API, so the builder is fully exercisable without credentials.
   - *Acceptance:* the entire builder flow works end-to-end with zero provider keys present.
10. **Run-payload endpoint** — `GET /classes/:id/run-payload`, versioned, assembled from the resolved
    schema (class + ordered tracks + provider refs + cues + moves).
    - *Acceptance:* one request returns everything to run a class; no client-only assumptions.
11. **Team + membership + share routes** *(built last)* — many-to-many teams; share to user-or-team;
    wire shares into the `GET /classes` union.
    - *Acceptance:* create a team, add a member, share a class to a user and to a team; shared classes
      appear in the recipient's `GET /classes`.
12. **OpenAPI generation + web skeleton** — emit the spec from shared schemas; Vite/React + Better Auth
    login + a thin typed API client; minimal UI proving login → create class → add a tagged track.
    - *Acceptance:* OpenAPI spec generates; the end-to-end flow works in the browser.

### Explicitly out of scope for M1
- Any call to Spotify / Apple Music / SoundCloud APIs.
- Third-party BPM lookup.
- Live mode / cue-prompter playback.
- Explore / featured feed.
- Rich planning UI (drag-drop timeline, energy ribbon, waveform) — that's the design-system build,
  layered on after the data flow works.
- Segments / `class_sections` (design concept in M1; **added later** in the design-system build —
  slice 16, migration `0006`).

---

## M2 — Music-provider integration ✅ done

> **Historical build slices:**
> - ✅ **Slice 1** — SoundCloud search → track creation. `packages/music` `MusicProvider` abstraction +
>   `client_credentials` adapter behind a mock-fallback registry. `GET /providers/:provider/search`,
>   `POST /providers/track-import`. (PR #1, **merged to `main`**)
> - ✅ **Slice 2** — per-user OAuth + encrypted `music_connections` (Auth Code + PKCE; AES-GCM at rest;
>   connect/callback/list/disconnect). No migration (table pre-existed). (PR #2, **merged to `main`**)
> - ✅ **Slice 3** — consume the per-user token: `GET /providers/:provider/likes` ("search my
>   SoundCloud") spends the stored `music_connections` token with on-demand **refresh** (proactive on
>   expiry + reactive on a 401, rotated tokens re-encrypted and persisted). Pure `fetchSoundCloudLikes`
>   adapter raises `SoundCloudUnauthorizedError` as the refresh signal; app owns decrypt/refresh/persist.
> - ✅ **Slice 4** — **7-day metadata-purge-on-disconnect**: disconnect forgets tokens immediately *and*
>   enqueues a `provider_purge_queue` row (migration `0002`); a daily Cloudflare **Cron Trigger** drains
>   it (`scheduled()` → `drainPurgeQueue`, `lib/music/purge.ts`), stripping that provider's
>   `track_provider_ids` + nulling album art on the **disconnecting user's** tracks only — never other
>   users, other providers, or our own metadata. Retry-with-give-up; drain unit-tested via a fake store,
>   SQL scoping verified against local D1. Cloudflare D1 + Worker now **provisioned** (remote D1
>   migrated/seeded; Worker deployed with the cron).
> - ✅ **Slice 5** — **provider-ID resolution / same-song matching**: import resolves a candidate against
>   the caller's library before forging a track — exact `(provider, providerTrackId)` is idempotent;
>   the same song from a different provider attaches its ID to the existing track (`lib/same-song.ts`,
>   conservative normalized title+artist + duration tolerance, never double-attaches a provider).
> - ✅ **Slice 6** — **Spotify + Apple Music behind the same `MusicProvider`**: client-credentials
>   (Spotify, never BPM) and developer-token (Apple Music) adapters in `packages/music`, wired into the
>   registry's mock fallback; `SPOTIFY_*` / `APPLE_MUSIC_*` env documented. Pure and unit-tested; production
>   uses live adapters when the relevant credentials are present.
> - ✅ **Slice 7** — *(optional)* third-party **BPM** provider for `display_bpm`: a pluggable `BpmProvider`
>   (GetSongBPM adapter, `normalizeBpm`) fills BPM from a dedicated tempo service — **never Spotify**.
>   `POST /tracks/:id/bpm-lookup` (owner-only) persists a confident match. In local mock mode it returns a
>   deterministic spin-band BPM; in production it requires `GETSONGBPM_API_KEY`, so BPM stays manual until
>   that optional secret is provisioned.
>
> **M2 complete** — all three providers (SoundCloud/Spotify/Apple Music) behind one interface, per-user
> OAuth + refresh, likes, metadata-purge-on-disconnect, same-song resolution, and the optional BPM
> provider. Live Spotify and Apple Music search/import now run from server-side production credentials;
> Apple Music can use either a static developer token or Worker-signed developer tokens from Apple key
> secrets. The mock remains a local/dev seam; production runs with `MOCK_PROVIDERS` unset.

- **SoundCloud first** (the differentiator): provider search feeding track creation; provider-ID
  resolution and the same-song matching problem; provider refs via `provider_uri` for handoff-era links
  and the planned provider-authorized playback adapters.
- Spotify and Apple Music behind the same provider interface (add `packages/music` here).
- Optional third-party BPM provider to populate `display_bpm`.
- Music-connection OAuth + encrypted token storage (`music_connections`, `ENCRYPTION_KEY`).
- Re-verify each provider's current API terms before building (constraints in `music-providers.md`).

## M3 — Live mode + iOS parity polish ✅ done

> **Web-repo portion (the live *contract*) is done:**
> - ✅ **Harden the run-payload** — `class.totalDurationMs` (server-derived assembled length, distinct
>   from the planned `targetDurationMs`); the timeline (per-track `startOffsetMs` + total) is **recomputed
>   at read time** (`computeClassTimeline`, reusing the write-path `computeSequence`) so it is authoritative
>   even if a persisted `start_offset_ms` drifts; frozen v1 shape + timeline semantics documented in
>   `packages/shared` and `api.md`. Verified live (deployed Worker + remote D1): a 2-track class returned
>   `totalDurationMs=380000` with offsets `0`/`180000`.

> **Live-mode UI shipped in the web app** (`apps/web/src/components/LiveMode.tsx`), consuming the hardened
> run-payload:
> - ✅ **Cue prompter** — Cue-by-Cue (big current cue + next cue with countdown) and Full List (whole
>   timeline, live track highlighted, past events struck through, tap-to-seek) views.
> - ✅ **Interval countdown timer** — a virtual clock (play/pause/seek/reset) drives current-track and
>   class "ends in" countdowns and the time-to-next-cue.
> - ✅ **Intensity readouts** — redundant encoding (color + 0–4 filled bars + label), never color alone.
> - Live transport originally drove only the virtual prompter clock; provider handoff links shipped as
>   the handoff-era fallback. The next player initiative replaces this primary path with official
>   provider-authorized playback (see `provider-playback-implementation.md`).
>
> **M3 complete for the web repo.** The native **iOS** live surface (Phase 2 / `ritmofit-ios`) will
> reimplement the prompter against the same run-payload, plus a Landscape view and device-specific polish.

## M4 — Explore / sharing UX ✅ done historically, now dormant

> **Current status (2026-07-05):** these backend/schema/API pieces remain in place, but Teams, Sharing,
> Publish, and Explore are deferred community surfaces under D20. Preserve the scaffolding; do not expose
> or expand it in the current web product unless the owner explicitly reopens the work.

- ✅ **Slice 1 — sharing UX (share-by-email):** the web Dashboard now has a `ShareDialog` (owner-only)
  to share a class with another user by email at view/edit, list current shares with their target's
  display name/email, change a permission, and revoke. Backend gains `targetEmail` resolution on
  `POST /shares` (no user-search endpoint — privacy) + self-share/unknown-email `422`s, and
  `GET /classes/:id/shares` now returns the enriched `ShareView` (target email/name/team-name). No
  migration — the M1 `shares` model was already complete. Recipients see shared classes via the existing
  `GET /classes` union.
- ✅ **Explore feed** — *decisions settled 2026-06-12; slices 3a + 3b built*:
  - ✅ **Slice 3a — publish + public feed + preview:** migration `0005` adds `classes.visibility`
    (`private` default / `public`) + a CHECK + index; the **public VIEW floor** is wired into the central
    `resolveAccess` (unit-tested, doesn't touch `listVisibleClasses`); `GET /explore` lists public
    classes newest-first with owner label + track count (`ExploreClass`); the web app gains an **Explore**
    browser (preview a public class via its run-payload) and an owner-only **Publish / Make private**
    toggle with a visibility indicator (icon+label, not color alone). `typecheck`/`lint`/`test` (156)
    green; local D1 migrated. This slice later deployed with the rest of M4.
  - ✅ **Slice 3b — save a copy:** `POST /classes/:id/copy` (VIEW access, so public classes qualify)
    clones a whole class into the caller's library as a fresh `draft`/`private` owned class — every
    class_track with its cues + placed moves — reusing the M1 `copy-class-track` cross-user safety
    (foreign tracks + provider ids cloned, private `user_move` refs snapshotted to `name_override`, a
    shared foreign track cloned once via the new `resolveTrackForClassCopy`). "Save a copy" button in the
    Explore feed. Verified live end-to-end (2-track class + cue → copy has both tracks, offsets
    `0`/`180000`, cue preserved). `typecheck`/`lint`/`test` (159) green.

  **M4 status:** sharing UX (3 slices: share-by-email, team-sharing, Explore) is complete, green, and
  **deployed (2026-06-12)**. Remote D1 migrated through `0005` (visibility column live, classes table
  empty so nothing to backfill); `ritmofit-api` redeployed (version `dc2eeb45`), health `200`, `/explore`
  + `/classes/:id/copy` live and session-gated, purge Cron intact. Featured curation remains a
  deliberately deferred future slice.

  **Web app deployed (2026-06-12):** the SPA is now served by the **same `ritmofit-api` Worker** (Workers
  static assets — `[assets]` in `wrangler.toml`, `run_worker_first=["/api/*"]`, SPA fallback), so the whole
  app is live at the branded apex **`https://ritmofit.studio`** (canonical) and `*.workers.dev` (fallback).
  Single origin ⇒ first-party session cookie, no CORS. Custom domain wired via `[[routes]]
  custom_domain = true` + `BETTER_AUTH_URL = https://ritmofit.studio`. Verified in prod end-to-end (SPA +
  deep links serve index.html over HTTPS; `/api/*` hits Hono; authed first-party-cookie flow worked, test
  data then deleted). Deploy = build web (`pnpm --filter @ritmofit/web build`) then `pnpm --filter
  @ritmofit/api run deploy`. Current launch/deploy status is tracked in `DEVELOPMENT_PLAN.md` and
  `HISTORY.md`.
  - **Publish/visibility model:** a new `classes.visibility` enum, `private` (default) | `public`.
    The owner explicitly publishes via `PATCH /classes/:id`; Explore lists `public` classes. This is
    **orthogonal** to the existing `status` (draft/ready/archived = private lifecycle). Migration `0005`
    adds the column (default `private`, so all existing classes stay private).
  - **Access for public classes:** a `public` class grants **VIEW** to any authenticated user — added
    as a floor inside the central `requireAccess` (owner/shares still win for higher levels). It does
    **not** enter anyone's `GET /classes` union (that stays owned ∪ shared); discovery is its own
    `GET /explore` path. Update `authorization.md`.
  - **Featured: deferred.** Explore v1 is the public feed (published classes, newest first), **no**
    admin/featured concept yet (avoid building an admin system before there's volume to curate).
    Featured becomes its own later slice.
  - **Discoverer rights:** view a public class read-only **and** "save a copy" into your own library as
    an owned, editable class (clones tracks + cues + moves, reusing the M1 `copy-class-track` helpers).
- ✅ **Slice 2 — team-sharing UX:** the Dashboard now has a `TeamsDialog` (create a team, view members,
  add a member by email, remove/leave with owner/admin gating) and the `ShareDialog` gained a
  **share-to-team** picker (the caller's own teams) alongside share-by-email. Backend gains `email`
  resolution on `POST /teams/:id/members` (mirrors the share fix — no user-search endpoint) +
  unknown-email `422`. No migration — the M1 team + team-target-share model was already complete.

---

## Builder UI, music frontend & launch hardening — shipped

The web design-system **builder UI** (energy ribbon, song rows, track inspector, choreography editor,
timeline strip, segment band, Live HUD pulse/drop), the music-provider **frontend**
(search/import/connections/likes/BPM — all three providers live in prod), and the **post-launch
hardening** backlog all shipped and deployed. The full per-slice log (builder slices 1–18, music
frontend S1–S4, hardening PRs — with Worker versions, migrations, and test counts) is archived in
[`HISTORY.md`](./HISTORY.md).

**Launch-readiness follow-ups from shipped code — all shipped + deployed (Session 5, 2026-06-28,
PRs #137–#140):** custom-move `baseMoveId`/`template` editing (#139); the playing-track pulse in the
*planning* timeline, driven by the active/selected track since the builder has no "playing" state (#137);
segment-band track-range binding via "snap to track starts" (#140); and the rhythm-cycle move-vocabulary
expansion (#138). The Session 5 follow-up also shipped the account/profile dialog. See `HISTORY.md`.
Remaining launch-readiness work is tracked only in `web-launch-readiness.md`.

**Post-launch parity follow-up:** a run-payload `id` on `sections[]` remains optional unless iOS wants
that symmetry.

## Web Launch Readiness ✅ done

The deployed web app has passed the launch gate. Treat this section as the completed gate record; new
web work should be production support, launch-critical fixes, or explicitly approved follow-up slices.

**Definition of done:** [`web-launch-readiness.md`](./web-launch-readiness.md) is fully checked: CI gate
green, launch-candidate production deploy complete, Apple Sign In/provider credentials deployed, live
smoke passing, auth/email/provider/core workflow paths verified, launch-blocking
accessibility/responsive issues closed, and non-blocking deferrals recorded.

**Next focus (updated 2026-07-05):** solo creator refinement is the active web product track, alongside
the provider-authorized playback initiative
([`provider-playback-implementation.md`](./provider-playback-implementation.md)) where it improves
rehearsal and Live Mode. iOS parity wrap is deferred behind web product-definition work.

## Cross-cutting reminders
- Plan before code on every feature; wait for confirmation.
- The three music constraints (`music-providers.md`) are inviolable across all milestones.
- The shared package stays the single contract; don't fork entity shapes.
- Every class-scoped route calls `requireAccess` — D1 has no RLS back-stop.
