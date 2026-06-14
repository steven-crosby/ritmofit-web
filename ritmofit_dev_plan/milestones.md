# Milestones

Each step follows the working agreement: **plan → confirm → code → summarize** (see
`ai-working-rules.md`).

> **Status (2026-06-12): M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ — all done, merged to `main`, and deployed**
> (API + web at `https://ritmofit.studio`, remote D1 through `0005`). On top of the data-flow milestones,
> the **web design-system build (builder UI)** is now underway — slices 1–4 merged (PR #8) and deployed;
> see the new section below. **Next major milestone: iOS Phase 2.** See `DEVELOPMENT_PLAN.md` for the rollup.

## M1 — Auth + class/cue data model ✅ done

**Schema-complete, routes-lean** (decision D9). The part fully under our control. **No music-provider
API calls.** BPM and provider IDs are hand-entered.

**Definition of done:** a logged-in user can create a class, add track references (typed in or via the
mock-track seam), tag them with cues/moves/intensity, place them on a timeline, and fetch the whole
thing as a versioned **run-payload** — all persisted through the backend so the same data would open on
iOS. Teams/sharing exist in the schema and have working routes by end of M1, built *after* the core
builder.

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
- Segments / `class_sections` (design concept, not yet schema).

---

## M2 — Music-provider integration ✅ done

> **Progress (behind the mock until live SoundCloud creds + a registered redirect URI land):**
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
>   registry's mock fallback; `SPOTIFY_*` / `APPLE_MUSIC_*` env documented. Pure, unit-tested, behind the
>   mock until creds land.
> - ✅ **Slice 7** — *(optional)* third-party **BPM** provider for `display_bpm`: a pluggable `BpmProvider`
>   (GetSongBPM adapter, `normalizeBpm`) fills BPM from a dedicated tempo service — **never Spotify**.
>   `POST /tracks/:id/bpm-lookup` (owner-only) persists a confident match; behind the mock
>   (deterministic spin-band BPM) until `GETSONGBPM_API_KEY` lands, so BPM stays manual otherwise.
>
> **M2 complete** — all three providers (SoundCloud/Spotify/Apple Music) behind one interface, per-user
> OAuth + refresh, likes, metadata-purge-on-disconnect, same-song resolution, and the optional BPM
> provider. Live provider calls are behind the mock until real creds land.

- **SoundCloud first** (the differentiator): provider search feeding track creation; provider-ID
  resolution and the same-song matching problem; deep-link/hand-off playback via `provider_uri`.
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
> - No in-app audio — playback stays in the provider apps (the three music rules).
>
> **M3 complete for the web repo.** The native **iOS** live surface (Phase 2 / `ritmofit-ios`) will
> reimplement the prompter against the same run-payload, plus a Landscape view and device-specific polish.

## M4 — Explore / featured / sharing UX (current)
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
    toggle with a visibility indicator (icon+label, not color alone). `typecheck`/`lint`/`test` (156) green;
    local D1 migrated. *Not yet deployed; remote D1 not yet migrated.*
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
  @ritmofit/api run deploy`. Current launch/deploy status is tracked in `REVIEW.md` and
  `DEVELOPMENT_PLAN.md`.
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

## Web design-system build (builder UI) — in progress

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

**Deferred (flagged in code):** custom-move **`baseMoveId`/`template`** editing, the **playing-track pulse
in the planning timeline** (no "playing" state in the builder), the timeline **playhead** / tap-to-seek (a
Live concern), and segment-band **icons / drag-resize / track-range binding**. The run-payload's
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

## Cross-cutting reminders
- Plan before code on every feature; wait for confirmation.
- The three music constraints (`music-providers.md`) are inviolable across all milestones.
- The shared package stays the single contract; don't fork entity shapes.
- Every class-scoped route calls `requireAccess` — D1 has no RLS back-stop.
