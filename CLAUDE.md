# RitmoFit

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors. The web app (this
repo) is the planning surface; a separate iOS app is the live surface. Both are clients of one shared
backend — the backend is the single source of truth.

## Before doing any work

Read [`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`](ritmofit_dev_plan/DEVELOPMENT_PLAN.md) and the rest of
[`ritmofit_dev_plan/`](ritmofit_dev_plan/), plus
[`ritmofit_design_system/README.md`](ritmofit_design_system/README.md). For the exact per-session
prompts and build order, see
[`ritmofit_dev_plan/session-prompts.md`](ritmofit_dev_plan/session-prompts.md).

## Working agreement

Follow [`ritmofit_dev_plan/ai-working-rules.md`](ritmofit_dev_plan/ai-working-rules.md): **propose a
plan and wait for confirmation before writing code**, then summarize when done. Work in small vertical
slices — one build-order step per session.

## Inviolable rules

- **Respect the three hard music constraints** in
  [`ritmofit_dev_plan/music-providers.md`](ritmofit_dev_plan/music-providers.md): never cache audio or
  platform-derived data, never pull BPM from Spotify (deprecated for new apps Nov 2024 — BPM is manual
  in M1), never mix/crossfade audio in-app. If a request seems to require any of these, stop and flag it.
- **The shared package is the contract.** Define entity shapes once in `packages/shared`; don't redefine
  them in `apps/api` or `apps/web`.
- **Centralize authorization.** Every class-scoped route calls `requireAccess`
  ([`authorization.md`](ritmofit_dev_plan/authorization.md)). D1 has **no row-level security** — a
  missing check is a security bug.
- **Never commit secrets.** Use `.dev.vars` (git-ignored) locally and `wrangler secret put` in prod.

## Stack (locked — see [`decisions.md`](ritmofit_dev_plan/decisions.md))

Cloudflare-native: Workers (API) + D1 (database) + Pages/static assets (web). Hono + Drizzle + Zod,
React + Vite + TypeScript, Better Auth (email/Apple/Google). Monorepo: `packages/shared`, `apps/api`,
`apps/web`.

## UI

Use the design system in [`ritmofit_design_system/`](ritmofit_design_system/) for all UI — tokens from
[`tokens.json`](ritmofit_design_system/tokens.json), the redundant-encoding accessibility rules, Martian
Mono for BPM/data, and the energy-ribbon / tempo primitives. Don't invent styling.

## Current state

**M1 complete** (all 12 build-order steps; backend feature-complete + a minimal web skeleton). The
shared contract, D1 schema/migrations/seed, Better Auth, `requireAccess`, and the full class-builder
REST surface (classes, class_tracks, cues, placed moves, moves library, tracks + provider ids, the
dev-only mock-track seam, the versioned run-payload, and teams + sharing) all exist and are verified
against local D1. OpenAPI spec is generated from the shared Zod schemas at
[`apps/api/openapi/openapi.json`](apps/api/openapi/openapi.json).

- **Run it:** `pnpm dev:api` (Worker on :8787) + `pnpm dev:web` (Vite on :5173). API health:
  `/api/v1/health`. Better Auth at `/api/auth/*`; REST under `/api/v1`.
- **Checks:** `pnpm -r typecheck` · `pnpm test` (Vitest, in `apps/api`) · `pnpm --filter @ritmofit/api openapi` regenerates the spec.
- **Cloudflare (provisioned):** remote D1 `ritmofit` (id `5bf15d82-…` in `wrangler.toml`, **not** a
  secret) is migrated (through `0004`) + seeded; the `ritmofit-api` Worker is deployed at
  `https://ritmofit-api.steven-crosby09.workers.dev` with a daily Cron Trigger (`17 3 * * *`) for the
  purge sweep. Secrets (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`) set via `wrangler secret put`. Local dev
  still uses local D1: `pnpm --filter @ritmofit/api db:migrate:local` + `db:seed:local`; deploy with
  `pnpm --filter @ritmofit/api deploy` and `db:migrate` against `--remote`.
- **Deploys are manual (by design):** the Cloudflare **Workers Builds** git integration was
  **disconnected (2026-06-12)** so a push to `main` does **not** auto-deploy. Ship with
  `pnpm --filter @ritmofit/api deploy`. Don't reconnect Workers Builds without deciding you want
  push-to-deploy CI/CD (and gating it on `pnpm -r typecheck` + `pnpm test`).
- **CI (2026-06-12):** `.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile` →
  `pnpm -r typecheck` → `pnpm lint` → `pnpm test` on every push to `main` and every PR (pnpm pinned via
  `packageManager`, **Node 22** via `.nvmrc` — pnpm 11.4 needs ≥22.13). It is a **checks-only gate; it
  never deploys** (deploys stay manual by design). Not gated: `format:check` (the plan-doc markdown was
  never prettier-formatted — 80 files) and OpenAPI-spec drift.
- **Branch protection is NOT enforced (intentional, plan-limited).** CI is **advisory** — it reports
  pass/fail but does not block merges, and direct pushes to `main` are allowed. Enforced protection
  (classic rules *and* Rulesets with `active` enforcement) is gated by GitHub behind **Pro or a public
  repo**; this repo is **private on Free**, so the API 403s. Don't re-attempt enabling it without first
  changing that (upgrade to Pro, or make the repo public after a secrets-in-history audit). Decision
  2026-06-12: stay private/free, keep CI advisory until there's a collaborator or a reason to pay.
- **Known tech debt:** no automated *integration* tests yet — the route/SQL layer is verified by manual
  flows + unit tests (purge SQL scoping verified against local D1). The app-level authz is the only
  access gate.

**M2 complete** (music providers, SoundCloud first) — see `ritmofit_dev_plan/milestones.md` and
`music-providers.md`. New package `packages/music` holds the provider adapters.

- **Slice 1 — provider search → track creation** (PR #1, merged): a `MusicProvider` abstraction +
  server-side SoundCloud `client_credentials` adapter behind a registry that falls back to the mock
  catalog. Routes: `GET /providers/:provider/search`, `POST /providers/track-import`.
- **Slice 2 — per-user OAuth + encrypted `music_connections`** (PR #2, merged): Authorization Code +
  PKCE connect/callback/list/disconnect; AES-GCM token encryption (`lib/crypto.ts`); PKCE
  (`lib/pkce.ts`). No migration (table pre-existed).
- **Slice 3 — consume the per-user token**: `GET /providers/:provider/likes` ("search my SoundCloud")
  spends the stored `music_connections` token, with **token refresh** wired in — proactive on expiry,
  reactive on a 401, rotated tokens re-encrypted and persisted. Pure `fetchSoundCloudLikes` adapter +
  `SoundCloudUnauthorizedError` refresh signal in `packages/music`; orchestration in
  `lib/music/user-likes.ts`; shared creds guards in `lib/music/provider-config.ts`.
- **Slice 4 — 7-day metadata-purge-on-disconnect**: disconnect forgets tokens immediately *and*
  enqueues a `provider_purge_queue` row (migration `0002`); a daily Cron Trigger drains it via
  `scheduled()` → `drainPurgeQueue` (`lib/music/purge.ts`), stripping that provider's `track_provider_ids`
  + nulling `albumArtUrl` on the user's tracks — never touching other users, other providers, or our own
  metadata (title/artist/BPM/classes). Retry-with-give-up; orchestration unit-tested via a fake store,
  SQL scoping verified against local D1.
- **Slice 5 — provider-ID resolution / same-song matching**: import resolves a candidate against the
  caller's library before forging a track (`lib/same-song.ts`) — exact `(provider, providerTrackId)` is
  idempotent; the same song from a different provider attaches its ID to the existing track. Conservative
  fuzzy match (normalized title+artist + duration tolerance, never double-attaches a provider).
- **Slice 6 — Spotify + Apple Music behind the same `MusicProvider`**: `packages/music/spotify.ts`
  (client-credentials, **never** BPM) + `apple-music.ts` (developer-token catalog search) drop in behind
  the registry's mock fallback; `SPOTIFY_*` / `APPLE_MUSIC_*` env documented. Pure, network-injectable,
  unit-tested.
- **Slice 7 — third-party BPM provider** *(optional)*: pluggable `BpmProvider` (GetSongBPM adapter,
  `normalizeBpm`) fills `display_bpm` from a dedicated tempo service — **never Spotify**.
  `POST /tracks/:id/bpm-lookup` (owner-only); behind the deterministic mock until `GETSONGBPM_API_KEY`.
- **M2 complete.** `typecheck` (4 pkgs) + `lint` + `test` (116) green. Live provider calls
  (SoundCloud/Spotify/Apple Music/BPM) are **behind the mock** until real creds land — re-verify each
  provider's endpoints/auth-header scheme then.

**M3 (live mode) — complete.** Two parts, both done:
- **Run-payload hardening** (the live contract): `class.totalDurationMs` (server-derived assembled
  length), read-time timeline recompute (`computeClassTimeline`) so per-track offsets are authoritative,
  frozen v1 shape documented in `packages/shared` + `api.md`. **Verified live** end-to-end on the deployed
  Worker + remote D1 (sign-up → 2-track class → `totalDurationMs=380000`, offsets `0`/`180000`).
- **Live-mode cue prompter UI** (`apps/web/src/components/LiveMode.tsx`): Cue-by-Cue + Full List views, a
  virtual-clock interval timer (play/pause/seek/reset, track/class countdowns), and intensity readouts
  with redundant encoding (color + bars + label). No in-app audio — playback stays in the provider apps.
  The native iOS live surface (Phase 2) reimplements this against the same run-payload (+ Landscape view).

**All of M1–M3 is merged to `main` and deployed.** (The earlier "on a working branch" note is obsolete.)

**M1–M3 code-review pass (2026-06-12) — merged + deployed (PR #6).** A full review landed 10 bug
fixes + 4 cleanups. Highlights:
- **Owner-scoped provider-id uniqueness** — the one schema change: `track_provider_ids` gains
  `owner_user_id`, and the unique index is now `(owner_user_id, provider, provider_track_id)` so the
  same provider track can live in multiple users' libraries (was a global unique that 409'd the second
  importer of any song). **Migration `0004_grey_iron_patriot.sql`** rebuilds the table and backfills
  owner from `tracks`.
- Other fixes: `copy` no longer leaks cross-user `track`/`user_move` refs (it clones foreign tracks into
  the caller's library and snapshots foreign move names); inline-created tracks set `matchKey`; the
  purge album-art clear is a single atomic `db.batch`; provider failures map to `502` via a typed
  `ProviderError`; BPM lookup matches the requested title/artist; reactive-401 token refresh hardened
  (409 not 500, no stale-conn replay); cue/placed-move `anchorMs` is bounded to the track duration; the
  same-song remix-stripping regex is non-greedy.
- Cleanups: `buildPatch` helper (replaces the PATCH field ladders), shared `AppTokenCache` (Spotify +
  SoundCloud client-credentials flow), parallelized run-payload + `listVisibleClasses` queries, and
  centralized provider creds in `provider-config.ts`.
- Copy-clone resolution extracted to pure, unit-tested helpers (`lib/copy-class-track.ts`).
  `typecheck` (4 pkgs) · `lint` · `test` (**132**) green.

**Deployed to prod (2026-06-12):** migration `0004` applied to remote D1 (verified: `owner_user_id`
present, owner-scoped unique index live); `ritmofit-api` redeployed (version `06a942a4`), health `200`,
purge Cron intact. The **web app is still not deployed** — `ritmofit.studio` is DNS-only (404) and
`apps/web` has no Pages/deploy config yet; only the API backend is live.

**M4 (Explore / sharing UX) — complete + deployed (2026-06-12).** Three slices, all on the M1 `shares`
model (backend was already complete; M4 was UX + small ergonomic fills):
- **Slice 1 — share-by-email:** `ShareDialog` (owner-only) shares a class with a user at view/edit,
  lists/edits/revokes shares. `POST /shares` resolves `targetEmail` server-side (no user-search
  endpoint — privacy) + self/unknown-email `422`; `GET /classes/:id/shares` returns the enriched
  `ShareView` (target email/name/team-name). No migration.
- **Slice 2 — team-sharing:** `TeamsDialog` (create team, members by email, remove/leave with
  owner/admin gating) + a share-to-team picker in `ShareDialog`. `POST /teams/:id/members` resolves
  `email` (mirrors the share fix). No migration.
- **Slice 3 — Explore feed:** new `classes.visibility` enum (`private` default / `public`), **migration
  `0005_worried_harpoon.sql`** (rebuild + backfill `private`; the drizzle-generated INSERT was
  hand-fixed — it sourced the new column from the old table). A **public VIEW floor** is wired into the
  central `resolveAccess` (public class ⇒ anyone-authenticated VIEW; does **not** enter the `GET /classes`
  union). `GET /explore` lists public classes newest-first (`ExploreClass` = class + owner label + track
  count). `POST /classes/:id/copy` "saves a copy" of a class into the caller's library (fresh
  `draft`/`private` owned class, cloning class_tracks + cues + moves, reusing the cross-user-safe
  copy helpers; a shared foreign track cloned once via `resolveTrackForClassCopy`). Web: **Explore**
  browser (preview + save-a-copy) and an owner-only **Publish / Make private** toggle. **Featured
  curation is deliberately deferred** (no admin concept yet). `typecheck` (4 pkgs) · `lint` · `test`
  (**159**) green; copy verified live end-to-end against local D1.
- **Deployed to prod (2026-06-12):** migration `0005` applied to remote D1 (classes table empty, so no
  backfill; `visibility` column live); `ritmofit-api` redeployed, health `200`, `/explore` +
  `/classes/:id/copy` live and session-gated, purge Cron intact.

**Web app deployed — single-origin, on `ritmofit.studio` (2026-06-12).** The SPA is served by the **same
`ritmofit-api` Worker** as the API (Cloudflare Workers static assets). The whole app is live at the
branded apex **`https://ritmofit.studio`** (the canonical origin) and also at
`https://ritmofit-api.steven-crosby09.workers.dev` (kept as a fallback via `workers_dev = true`). This
was a deliberate hosting choice: one origin ⇒ the Better Auth session cookie is **first-party** (no
`SameSite=None`, immune to third-party-cookie blocking) and there's **no CORS**. Mechanics:
- `apps/api/wrangler.toml` has an `[assets]` block: `directory = "../web/dist"`,
  `not_found_handling = "single-page-application"`, `run_worker_first = ["/api/*"]`. The Worker (Hono)
  runs first for `/api/*` (REST + Better Auth); every other path is served from the built SPA, with an
  index.html fallback for client-side routes.
- `apps/web/src/lib/auth-client.ts`: `API_BASE_URL` is **relative (`''`) in prod** (same origin),
  `http://localhost:8787` in dev (cross-port). The bundle has no hardcoded origin, so the **same build
  serves both `ritmofit.studio` and `*.workers.dev`** with no rebuild.
- **Custom domain:** `apps/api/wrangler.toml` declares `[[routes]] pattern = "ritmofit.studio",
  custom_domain = true` (the `ritmofit.studio` zone is on this Cloudflare account; deploy provisions the
  proxied DNS record + edge cert). `BETTER_AUTH_URL = "https://ritmofit.studio"` is the canonical origin
  the session cookie/callbacks bind to. `workers_dev = true` keeps the `*.workers.dev` URL alive (auth
  only fully works on the canonical origin). To add `www`, add another `custom_domain` route.
- **Deploy is two steps, in order:** `pnpm --filter @ritmofit/web build` (→ `apps/web/dist`) then
  `pnpm --filter @ritmofit/api run deploy` (note `run` — `pnpm deploy` is a pnpm builtin). Remote D1
  migrations (`db:migrate --remote`, i.e. `wrangler d1 migrations apply ritmofit --remote`) must run
  **before** deploying code that uses the new columns.
- **Verified in prod (2026-06-12):** on **`ritmofit.studio`** — HTTPS root + SPA deep links serve
  index.html (200), `/api/v1/health` 200 JSON, `/api/v1/explore` 401 unauthed, and a first-party-cookie
  sign-up → authed call succeeded; on the workers.dev URL a full authed flow (sign-up → create → publish
  → `/explore` → copy) succeeded against remote D1. All test data deleted afterward.

**Web design-system build (builder UI) — slices 1–4 shipped + deployed (2026-06-12).** Supersedes the
"minimal web skeleton" framing above: the builder is now being grown into the surface in
[`ritmofit_design_system/`](ritmofit_design_system/), in vertical slices on top of the existing
backend/run-payload (**no schema/API-contract/shared change**). Merged via **PR #8**, deployed at
`https://ritmofit.studio` (Worker version `4afed022`):
- **Energy-arc ribbon** (`IntensityRibbon`, height-encoded staircase, plasma kiss at all-out, static);
  **low-noise song rows** (`SongRow`); the **track inspector** (`TrackInspector` — intensity/BPM/notes +
  remove); **cue + placed-move authoring** (`ChoreographyEditor`). Shared `IntensityReadout` extracted
  from `LiveMode`. **Vitest now runs in `apps/web`** too (geometry test) — `pnpm test` = api 159 + web 5 = **164**.
- **Slice 5 — drag + keyboard reorder of the track list** (merged, PR #9): the song rows reorder by a
  dedicated drag grip (off the selection button) and by ↑/↓ on the focused grip; persists via the existing
  `POST /classes/:id/tracks/reorder` (edit access) and reloads so the ribbon/offsets recompute; optimistic
  with rollback, view-only shows no grip. Pure `moveItem` (`apps/web/src/lib/reorder.ts`, unit-tested) +
  `reorderTracks` client fn. No schema/API/shared change.
- **Slice 6 — inline-edit existing cues & placed moves** (merged, PR #10): the `ChoreographyEditor`
  cue/move rows gain an Edit affordance (one row at a time, Save/Cancel)
  on top of slice 4's add/list/delete; cues edit anchor+text, moves edit anchor + library-pick/custom-name
  + intensity. Backed by the existing `PATCH /cues/:id` + `PATCH /class-track-moves/:id` (edit access; move
  route re-checks the at-most-one-reference invariant). `updateCue` + `updatePlacedMove` client fns; no
  schema/API/shared change. `pnpm test` = api 159 + web 11 = **170**.
- **Slice 7 — the full 3-pane `09` layout** (merged PR #13, **deployed 2026-06-12**, Worker version
  `810f25d3`): replaced the 2-column inline-inspector builder in `Dashboard.tsx` with the spec'd
  workstation — a persistent **top bar**, then `xl:grid-cols-[266px_1fr_340px]` (collapses to one stacked
  column below `xl`): a sticky **class library** rail, the **class workspace** center (new
  `ClassHeaderCard` = title + visibility + derived summary → energy ribbon → track list → add-track), and a
  **sticky right-hand inspector** (`TrackInspector` + nested cue/move authoring, own scroll, "select a
  track" placeholder). Header summary (**track count · assembled total · avg BPM**, label+number not color
  alone) derives from the run-payload via pure unit-tested `lib/class-summary.ts` (`avgBpm` +
  `formatDuration`) — no new data. Components re-parented untouched; the workspace is keyed by class id so
  switching classes clears the track selection. No schema/API/shared change. `pnpm test` = api 159 + web 17
  = **176**; `pnpm --filter @ritmofit/web build` green.
- **Slice 8 — cue color picker** (merged PR #15, **deployed 2026-06-12**, Worker version `74a94ec5`):
  cues gain a color tag in the
  inspector `CuesSection` (add + inline-edit), persisted to the existing `cues.color` (no schema/API/shared
  change — column/route/run-payload were already wired). New accessible `CueColorPicker` (radio-group,
  text-labelled swatches, cyan selected-ring): a **None** option + the rationed copper/cyan/amber/ember/bone
  palette, **never plasma** (`02-color-system.md`); a stored color outside the palette shows as a trailing
  "current" swatch so editing never drops it. Cue rows show a decorative color dot (time + text still carry
  meaning). Palette + `tagLabel` in pure unit-tested `lib/cue-colors.ts`. `pnpm test` = api 159 + web 22 =
  **181**; build green. Merged PR #15, deployed (Worker `74a94ec5`).
- **Slice 9 — custom user-moves** (merged PR #17, **deployed 2026-06-12**, Worker version `511af62c`):
  create reusable custom moves and
  place them from the inspector `MovesSection`. Web-only — the backend (`GET/POST /user-moves` owner-scoped,
  placed-move routes validate an owned `userMoveId`, run-payload resolves user-move names) already existed.
  New `listUserMoves`/`createUserMove` client fns; `MovesSection` shows a "Your moves" `<optgroup>` beside
  "Library" and a **"＋ New custom move…"** option (create-and-place, then selects it). Picker values are
  source-prefixed (`m:`/`u:`) via pure unit-tested `lib/move-pick.ts`; `nameOf` resolves user-move names.
  Also retired the `KEEP` sentinel and fixed the PR #10 `TODO(select-fallback)`. No schema/API/shared
  change. `pnpm test` = api 159 + web 30 = **189**; build green. Merged PR #17, deployed (Worker
  `511af62c`). Deferred: managing custom moves (rename/delete/description/`baseMoveId`).
- **Slice 10 — timeline-marker strip** (merged PR #19, **deployed 2026-06-12**, Worker version
  `ca91c8c5`): a thin timeline band beneath
  the energy ribbon sharing its time axis — proportional numbered track blocks with cue (▲) / placed-move
  (◆) markers at `trackStart + clamp(anchorMs, 0, trackDuration)`. Distinct shapes (not color alone); cue
  markers carry the cue color tag, move markers the intensity color (decorative; shape + position + a
  `time — text/name` title/aria carry meaning). New `TimelineStrip` + pure unit-tested `computeTimeline`
  (same duration-share math as `computeRibbonSegments` so it aligns under the ribbon; null/zero-duration
  tracks drop block + markers). Rendered in the ribbon card. Static (no playhead — a Live concern),
  read-only. No schema/API/shared change. `pnpm test` = api 159 + web 37 = **196**; build green. Merged
  PR #19, deployed (Worker `ca91c8c5`).
- **Slice 11 — timeline selection** (merged PR #21, **deployed 2026-06-13**, Worker version `755e3489`):
  the timeline blocks + cue/move
  markers are clickable + keyboard-operable — selecting one opens that track in the inspector and
  cross-highlights its `SongRow` (open track's block ringed, `aria-pressed`). `computeTimeline` carries
  `classTrackId` + `position` per block/marker; `TimelineStrip` gained optional `selectedTrackId` +
  `onSelectTrack` (plain select, not toggle; non-interactive fallback kept); `Dashboard` wires
  `onSelectTrack={setSelectedTrackId}`. No schema/API/shared change. `pnpm test` = api 159 + web 39 =
  **198**; build green. Merged PR #21, deployed (Worker `755e3489`).
- **Slice 12 — focus a cue/move from its marker** (merged PR #23, **deployed 2026-06-13**, Worker version
  `802ebe48`): a timeline
  cue (▲) / move (◆) marker click selects the track *and* scrolls the matching inspector row into view with
  a brief flash (block clicks still just select). Markers carry in-track `anchorMs`; `onSelectTrack` gained
  optional `{ kind, anchorMs }`; `Dashboard` holds `markerFocus` (+ `nonce` to re-flash on repeat click) and
  threads it through `TrackInspector` → `CuesSection`/`MovesSection`; a shared `useFlashFocus` hook
  scrolls + transiently rings the row whose `anchorMs` matches (run-payload cues/moves have no id, so
  correlation is by `anchorMs` — duplicate anchors flash the first match). No schema/API/shared change.
  `pnpm test` = api 159 + web 39 = **198**; build green. Merged PR #23, deployed (Worker `802ebe48`).
- **Slice 13 — manage custom moves** (merged PR #25, **deployed 2026-06-13**, Worker version `cc437560`):
  a `CustomMovesDialog` (opened
  via a **Manage…** button in a track's Moves section) lists the caller's custom moves with rename, edit
  description, and delete (inline confirm; a referenced move's name is snapshotted into placements by the
  server on delete). Web-only: added `updateUserMove`/`deleteUserMove` over the existing owner-scoped
  `PATCH`/`DELETE /user-moves/:id`. On change, `MovesSection` refreshes the picker + this track's placements
  and bubbles `onChanged` (wired to the class-detail reload so ribbon/timeline move names refresh). Creation
  stays in the picker; `baseMoveId`/`template` editing deferred. No schema/API/shared change. `pnpm test` =
  api 159 + web 39 = **198**; build green.
- **Slice 14 — on-beat pulse (Live HUD)** (merged PR #27, **deployed 2026-06-13**, Worker version
  `9a298d21`): the focal "Now" cue card in
  Live mode breathes one cycle per beat (`--rf-beat = 60s / --rf-bpm`, `onBeat` easing) while playing — the
  signature tempo cue (`10-rhythm-system.md`). CSS-only (`rf-beat-pulse` keyframes in `index.css`,
  transform + box-shadow); `LiveMode` toggles the class + inline `--rf-bpm` when `playing && displayBpm`.
  Exactly one pulsing element; **fully removed under `prefers-reduced-motion`**. No schema/API/shared
  change. `pnpm test` = api 159 + web 39 = **198**; build green.
- **Slice 15 — the All-Out "drop"** (merged PR #29, **deployed 2026-06-13**, Worker version `c3a502c0`):
  in Live mode, while the live track's
  intensity is `all_out`, each cue advance blooms a one-shot plasma glow (`peak-glow` token) behind the
  "Now" card and the cue text cross-fades in (`10 §5`, the one big motion spend). CSS-only (`rf-drop-bloom`
  + `rf-drop-in` keyframes, re-triggered by remounting the bloom/text on the current cue); degrades to an
  instant, glow-free swap under `prefers-reduced-motion`. Layers with slice 14's beat pulse. No
  schema/API/shared change. `pnpm test` = api 159 + web 39 = **198**; build green.
- **Slice 16 — segment band (fixed enum)** (merged PR #31, **deployed 2026-06-13**, Worker version
  `14d363cf`; **remote D1 migrated to `0006`**): **the first design-system-build slice that changes schema +
  contract.** New `class_sections` table (**migration `0006`**, classes CASCADE,
  type CHECK, class index) + fixed `segmentType` enum (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`).
  Shared `classSection` schemas; CRUD routes (`GET/POST /classes/:id/sections`, `PATCH`/`DELETE
  /sections/:id`) class-scoped via new `requireSectionAccess`; run-payload gains an **additive** `sections[]`
  (schemaVersion stays 1); OpenAPI regenerated. Web `SegmentBand` under the timeline (pure unit-tested
  `computeSegmentBands` tiles bands by start; label+tint, never color alone) + edit-gated add/retime/retype/
  delete. **Free start anchor** (no duration bound). `pnpm test` = api 159 + web 44 = **203**; build green.
  Remote D1 was migrated to `0006` before the deploy (additive `class_sections` table).
- Deferred (flagged in code + `ritmofit_dev_plan/milestones.md`): the planning-timeline playing-track
  pulse, the timeline playhead / tap-to-seek, segment-band icons / drag-resize / track-range binding, and
  custom-move `baseMoveId`/`template` editing.
- Status tracker: [`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`](ritmofit_dev_plan/DEVELOPMENT_PLAN.md) +
  `milestones.md`. **Next major milestone remains iOS Phase 2.**

**Pre-launch hardening — B1–B4 + S1/S2/S4 shipped + deployed (2026-06-13, PR #40, Worker version
`fc071e5b`; remote D1 migrated to `0008`).** Driven by a pre-launch review (`REVIEW.md`, untracked at repo
root). No `packages/shared`/OpenAPI contract change. `pnpm test` = api 169 + web 53 = **222**; typecheck
(4 pkgs) · lint · build · OpenAPI no-drift green.
- **B1/B2 — transactional email (Resend):** `apps/api/src/lib/email.ts` (`sendEmail` via Resend REST,
  network-injectable; `actionEmail` HTML/text; dev fallback **logs to the Worker console when
  `RESEND_API_KEY` is unset**). Wired into Better Auth: `emailAndPassword.sendResetPassword` (B1) +
  `emailVerification.sendOnSignUp` (B2, **send-but-don't-block** — no `requireEmailVerification`). Web:
  "Forgot password?" flow in `Login.tsx` + new `ResetPassword.tsx` rendered on `/reset-password` (no
  router — `App.tsx` switches on `pathname`). Verified against Better Auth 1.6.17: reset link →
  `/api/auth/reset-password/:token` → redirects to `redirectTo?token=`; verify link defaults `callbackURL`
  to `/`.
- **B3 — error boundaries:** `apps/web/src/components/ErrorBoundary.tsx` around `<App/>` (global → Reload)
  and around `LiveMode` (`resetLabel="Exit live mode"` → `setLive(null)`).
- **B4 — D1-backed rate limiting:** new `rate_limit` table (**migration `0007`**). Better Auth
  `rateLimit: storage:'database'` on `/api/auth/*` (sign-in 5/min, sign-up/reset 10/hr, etc.), enabled on
  the https origin (Better Auth's `process.env.NODE_ENV` prod-detection doesn't fire on Workers), keyed by
  `cf-connecting-ip`. Reusable fixed-window limiter `apps/api/src/lib/rate-limit.ts` on `GET
  /providers/:provider/search` (**30/min/user**, clamps `q` to 200 chars — also closes G1). The daily Cron
  (`scheduled()`) now also prunes stale `rate_limit` rows (D1 has no TTL).
- **S1 — silent form failures:** `apps/web/src/lib/use-async-action.ts` (`useAsyncAction` = in-flight flag
  + error capture + re-entry guard) routes Dashboard create-class / add-track / publish / `loadDetail`
  through the `error` state and disables buttons in-flight (no more duplicate class/track on double-click).
- **S2 — FK indexes (migration `0008`):** `class_tracks.class_id`, `cues.class_track_id`,
  `class_track_moves.class_track_id`, `classes.owner_user_id`, `user_moves.user_id` — the per-class
  run-payload/detail hot path.
- **S4 — CI:** `.github/workflows/ci.yml` now also runs `pnpm --filter @ritmofit/web build` + an
  OpenAPI-drift check; fixed the stale Node-20 comment (`.nvmrc` is 22). Still advisory (never deploys,
  doesn't block).
- **⚠️ Email not yet live in prod:** `RESEND_API_KEY`/`EMAIL_FROM` are **not set** as Worker secrets (only
  `BETTER_AUTH_SECRET` + `ENCRYPTION_KEY` are), so reset/verification emails currently hit the
  console-log fallback — **password recovery doesn't reach users yet**. To finish B1: create a Resend
  account, verify `ritmofit.studio` + add SPF/DKIM/DMARC to the Cloudflare DNS zone, then `wrangler secret
  put RESEND_API_KEY` (+ `EMAIL_FROM`).
- **Deferred (not launch-blocking):** S3 (route-level/integration tests), S5 (live-OAuth connect
  success/failure UX, latent until provider creds ship), S6 (code-splitting — bundle is still one ~326 KB
  / 94 KB-gzip chunk).
