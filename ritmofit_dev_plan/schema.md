# Schema

The current Ritmo Studio data model, resolved into one table set for **Cloudflare D1 (SQLite)**.

**D1 conventions (because SQLite has no native UUID/timestamp/enum types):**
- **`id`** = `TEXT` holding a UUIDv4, primary key.
- **Timestamps** = `INTEGER` epoch **milliseconds**: `created_at`, `updated_at` on every table unless
  noted.
- **Enums** = `TEXT` with a `CHECK` constraint (Drizzle `text({ enum: [...] })`).
- DB names are snake_case; the shared package exposes camelCase types.
- **Time-into-track / offsets are milliseconds everywhere** (decision D10).

This file is the human source of truth. The Drizzle definitions in `apps/api/src/db/schema.ts` must
match it; if they diverge, reconcile here first.

> **Auth tables** (`users` aside) — `sessions`, `accounts`, `verifications` — are **managed by Better
> Auth**'s D1 adapter (step 4). Their Drizzle definitions live in `apps/api/src/db/auth-schema.ts`,
> matching Better Auth 1.6.x's canonical models; treat them as owned-but-managed. We extend `users` with
> our own columns and map Better Auth's `name` / `image` fields onto `display_name` / `image_url`, so the
> shared `userSchema` contract is unchanged. Better Auth date columns are stored as epoch ms
> (`timestamp_ms`), consistent with D10. The Better-Auth rate-limit counter table (`rate_limit`, in
> `apps/api/src/db/schema.ts`) is likewise owned-but-managed infrastructure and is not modeled in detail here.

---

## Identity & teams

> **D20 solo-first note:** teams and team memberships remain in the schema as dormant scaffolding. Do not
> surface or expand team workflows in the current product unless the owner explicitly reopens community
> work.

### `users`
The canonical user record (Better Auth's user table, extended). Our source of truth.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | **The id Better Auth issues** (its D1 adapter creates the row); we do not re-key it. Don't assume UUIDv4 — use whatever Better Auth's config produces |
| email | text | Unique |
| display_name | text | Nullable; Better Auth's `name` field maps here |
| image_url | text | Nullable; Better Auth's `image` field maps here |
| email_verified | int (bool) | Better Auth-managed; `0`/`1`, default `0` |
| created_at / updated_at | int (ms) | |

> **Who creates this row:** Better Auth's D1 adapter **creates** the `users` row on first sign-in.
> `POST /auth/session` does **not** create the identity — it **reconciles our extra columns**
> (`display_name`, `image_url`) on first sight and returns the canonical profile (see step 4 / `api.md`).

### `teams`
A studio or group.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| name | text | |
| owner_user_id | text (FK → users.id) | Creator/owner of the team |
| created_at / updated_at | int (ms) | |

### `team_memberships`
Many-to-many join between users and teams.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| user_id | text (FK → users.id) | |
| team_id | text (FK → teams.id) | |
| role | text enum(`owner`,`admin`,`member`) | Governs *membership management*, not class access |
| joined_at | int (ms) | |

Unique on (`user_id`, `team_id`).

> **Ownership source of truth:** `teams.owner_user_id` is **authoritative** for owner-only operations.
> On team create, the server **also** inserts a `team_memberships` row with `role='owner'` for the
> creator so membership lists are complete — but permission checks read `teams.owner_user_id`, not the
> membership role, to avoid drift.

---

## Classes & music

### `classes`
Owned by exactly one user. No `team_id` — ownership is always a user; others get access via `shares`.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| owner_user_id | text (FK → users.id) | |
| title | text | e.g. "Mon POWER 6/8" |
| description | text | Nullable |
| template | text enum(`cycle`,`hiit`,`sculpt`,`tread`) | Nullable; class template type |
| status | text enum(`draft`,`ready`,`archived`) | Default `draft` |
| visibility | text enum(`private`,`public`) | Default `private` |
| timeline_mode | text enum(`sequential`,`free`) | Default `sequential`. `sequential` = back-to-back, server-derived offsets; `free` = author offsets with gaps (overlaps rejected), positions derived from offset order |
| featured_category | text | Nullable; **reserved** — column exists in code but is currently unused: featured/admin Explore curation is a deliberately deferred slice (see `decisions.md` → Explore, `web-launch-readiness.md`). Intended to mark a class for curated Explore rows once that ships |
| cover_image_url | text | Nullable; custom uploaded R2 image URL |
| target_duration_ms | int | Nullable; total planned class length |
| created_at / updated_at | int (ms) | |
| last_opened_at | int (ms) | Nullable |

Indexes include `(owner_user_id, updated_at, id)` for the owned arm of the ordered private-library
query.

> **D20 solo-first note:** `visibility='public'` and `featured_category` are retained for the dormant
> Publish/Explore scaffolding. The current web product should keep classes private by default and should
> not expose publishing or public discovery.

> **Segments:** no `segment_type` on `classes`. Section bands live in `class_sections` so a class can
> carry multiple time-anchored segments without overloading the class record.

### `tracks`
The provider-agnostic song — the abstract track, not a provider's copy.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| owner_user_id | text (FK → users.id) | The user who created the track. Per-user library (decision D4) — edits affect only the owner's classes |
| title | text | |
| artist | text | |
| album_art_url | text | Nullable |
| duration_ms | int | Nullable |
| display_bpm | int | Nullable; manual entry or permitted tempo-provider lookup (never Spotify BPM) |
| isrc | text | Nullable; aids future cross-provider matching |
| match_key | text | Nullable; normalized same-song matching key used during provider import |
| created_at / updated_at | int (ms) | |

> **Ownership:** tracks are a **per-user library**, not global singletons. `owner_user_id` is set to the
> creator; only the owner may edit a track. Same-song matching can reuse an existing track in that user's
> library during provider import, but cross-user dedup remains intentionally out of scope.

### `track_provider_ids`
One row per provider for a track — what makes a track provider-agnostic.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| owner_user_id | text (FK → users.id) | Owner namespace for provider refs |
| track_id | text (FK → tracks.id) | |
| provider | text enum(`spotify`,`apple_music`,`soundcloud`) | |
| provider_track_id | text | The provider's own ID |
| provider_uri | text | Nullable; Spotify URI / SoundCloud URL — feeds provider playback adapters and handoff links |
| created_at / updated_at | int (ms) | |

Unique on (`owner_user_id`, `provider`, `provider_track_id`).

### `class_tracks`
A track's place *within* a class — a first-class item carrying choreography. Points at a `track` but
holds the per-class context.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| class_id | text (FK → classes.id) | |
| track_id | text (FK → tracks.id) | |
| position | int | Order within the class playlist |
| intensity | text enum(`none`,`easy`,`mod`,`hard`,`all_out`) | Default `none` |
| display_bpm_override | int | Nullable; class may show a different BPM than the track default |
| display_rpm | int | Nullable; instructor-facing cadence target for spin classes |
| hold_count | int | Nullable; optional count/hold cue for repeated movement patterns |
| duration_ms_override | int | Nullable, positive; class-specific correction when library/provider duration is missing or wrong |
| clip_start_ms | int | NOT NULL default 0; play this track from this offset — trim the intro. Track-relative ms. |
| clip_end_ms | int | Nullable; play this track until this offset — trim the tail; null = to the effective end. CHECK `clip_end_ms > clip_start_ms`. |
| beat_anchor_ms | int | NOT NULL default 0; downbeat offset for beat-snapping — track-relative ms where beat 1 of bar 1 lands. With the resolved BPM (and 4/4) it defines the beat grid. |
| start_offset_ms | int | Nullable; where the track sits on the class timeline. Server-derived in `sequential`, user-authored in `free` |
| notes | text | Nullable; instructor's free-text notes for this track |
| created_at / updated_at | int (ms) | |

`cues` and `class_track_moves` attach here, NOT to `tracks` — choreography is per-class (D7).

> **Per-class trimming.** A class_track plays the window `[clip_start_ms, clip_end_ms)` of its track
> (defaults `0 .. effective end`, i.e. the whole track). The **effective duration** a track contributes
> to the timeline is therefore `min(clip_end_ms ?? base, base) − clip_start_ms`, where
> `base = duration_ms_override ?? tracks.duration_ms`. Trimming is purely a playback-window choice — it
> does **not** edit the audio file (the three music constraints stand). Cue/move `anchor_ms` stay
> **track-relative** (unchanged on trim); the clip window must contain every anchor (the edit route
> rejects a window that would orphan one). The run-payload re-bases anchors to the clip start so the
> live timeline lines up (see `api.md`).

> **Timeline placement — two modes (`classes.timeline_mode`).**
> - **sequential** (default): `position` is authoritative and tracks play **back-to-back** —
>   `start_offset_ms` is **server-derived** from the sum of preceding effective durations
>   (`min(clip_end_ms ?? base, base) − clip_start_ms`, `base = duration_ms_override ?? tracks.duration_ms`),
>   not set by the client; no gaps or overlaps. Clients treat `start_offset_ms` as read-only.
> - **free**: `start_offset_ms` is **user-authored** (gaps/silence allowed, overlaps rejected by the
>   edit route); `position` is **derived** by ranking tracks on their offset. The run-payload total is the
>   latest track end (`max(start + duration)`), so a trailing gap doesn't extend the class. Switching into
>   free seeds offsets from the current sequential layout; switching back re-packs them back-to-back.
>
> The `duration_ms_override` lets a class editor correct timing without mutating another user's private
> library track.

### `class_tags`
Simple "Google Keep" style tagging system for classes. Used to search historical classes (e.g., "Songs by Move" or thematic searches).

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| class_id | text (FK → classes.id) | |
| tag | text | Lowercase tag string |
| created_at / updated_at | int (ms) | |

Unique on (`class_id`, `tag`).

### `class_sections`
Time-anchored segment bands for the class overview and Live Mode.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| class_id | text (FK → classes.id) | |
| type | text enum(`warm_up`,`climb`,`sprint`,`recovery`,`cool_down`) | Segment vocabulary |
| start_offset_ms | int | Segment start on the class timeline |
| created_at / updated_at | int (ms) | |

Sections are class-level markers, not track children. The current run-payload emits sections without a
section `id`; adding that id remains an additive contract follow-up if iOS wants perfect DTO symmetry.

---

## Moves library (reusable) — decision D8

### `moves`
Global, seeded movement library (Climb, Sprint, Jog, Tap Back, Push, Recovery, …).

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| name | text | |
| description | text | Nullable |
| template | text enum(`cycle`,`hiit`,`sculpt`,`tread`) | Nullable; which class type it suits |
| created_at / updated_at | int (ms) | |

**M1 seed (deterministic — step 3 acceptance).** Seed these global moves with stable UUIDs so re-running
the seed is idempotent:

| Name | Template | Note |
|---|---|---|
| Climb | cycle | Heavy resistance, out of saddle |
| Sprint | cycle | Max cadence push |
| Jog | cycle | Steady seated base |
| Tap Back | cycle | Out-of-saddle tap to the beat |
| Push | cycle | Standing climb attack |
| Recovery | cycle | Active rest / cool-down |
| Jumps | cycle | In/out of saddle on count |
| Sprint Hold | cycle | Sustained sprint effort |
| Running | cycle | Standing run, out of saddle |
| Hovers | cycle | Held hover over the saddle |
| Press-Ups | cycle | Push-ups on the bars to the beat |
| Crunches | cycle | Standing core crunch on the beat |
| Oblique Twists | cycle | Side-core twist on the bike |
| Pyramid | cycle | Progressive resistance build |
| Sprint on a Hill | cycle | Sprint under heavy resistance |
| Burpee | hiit | Full-body floor move |
| Mountain Climber | hiit | Core/cardio |
| Squat | sculpt | Lower-body strength |
| Bicep Curl | sculpt | Weighted arm move |
| Run | tread | Sustained tread pace |
| Incline Walk | tread | Walking climb |

`template` is non-null for these seeds (each suits a class type); `description` optional. Extend the list
later without a migration — it's data, not schema.

### `user_moves`
A user's custom moves / personal coaching language. Ships from v1.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| user_id | text (FK → users.id) | |
| name | text | |
| description | text | Nullable |
| base_move_id | text (FK → moves.id) | Nullable; optional link to a global move |
| template | text enum(`cycle`,`hiit`,`sculpt`,`tread`) | Nullable |
| created_at / updated_at | int (ms) | |

---

## Choreography (anchored to a class_track) — decision D7

### `cues`
A coaching prompt tied to a moment in the track. Separate concept from a move; shown in the live
prompter.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| class_track_id | text (FK → class_tracks.id) | |
| anchor_ms | int | Timestamp into the track, in milliseconds |
| beat | int | Nullable; optional stored beat anchor. Beat-snapping now derives beat/bar at read from `anchor_ms` + the track's BPM + `beat_anchor_ms` (the run-payload populates them); these columns remain reserved and are not written by the snapping flow. |
| bar | int | Nullable; optional stored bar anchor. Same status as `beat`. |
| text | text | The cue text shown in the prompter |
| color | text | Nullable; free hex for visual tagging. The design system's cue-color picker **excludes the plasma range** (rationing is enforced in the UI, not the column) |
| created_at / updated_at | int (ms) | |

### `class_track_moves`
A *placement* of a movement on the timeline. References a library move or carries a freeform name.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| class_track_id | text (FK → class_tracks.id) | |
| anchor_ms | int | Timestamp into the track, in milliseconds |
| move_id | text (FK → moves.id) | Nullable; global library reference |
| user_move_id | text (FK → user_moves.id) | Nullable; user library reference |
| name_override | text | Nullable; freeform name if not referencing the library |
| intensity | text enum(`none`,`easy`,`mod`,`hard`,`all_out`) | Nullable; per-move intensity |
| created_at / updated_at | int (ms) | |

> A placement should reference **at most one** of `move_id` / `user_move_id`; if neither is set,
> `name_override` must be. Enforce in the Zod schema (and a CHECK where practical).

---

## Sharing (Google Drive model) — decision D6

> **D20 solo-first note:** shares remain in the schema for now, but sharing is dormant/deferred in the
> current product. Preserve the table and constraints; do not add new sharing UX or collaboration
> behavior unless the owner explicitly reopens the work.

### `shares`
Generic sharing record. Ownership is untouched; access is additive and revocable.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| resource_type | text enum(`class`) | Extensible to other resource types later |
| resource_id | text | The shared resource's id (a class id in M1) |
| shared_by_user_id | text (FK → users.id) | |
| target_user_id | text (FK → users.id) | Nullable; set when sharing to one user |
| target_team_id | text (FK → teams.id) | Nullable; set when sharing to a team |
| permission | text enum(`view`,`edit`) | |
| created_at / updated_at | int (ms) | |

**Constraint:** exactly one of `target_user_id` / `target_team_id` is set (enforce with a CHECK).
Sharing to a team grants access to all current members via `team_memberships`; sharing to a user grants
direct access.

**Uniqueness:** at most one share per (resource, target). Enforce two partial-unique constraints:
`(resource_type, resource_id, target_user_id)` and `(resource_type, resource_id, target_team_id)`.
Re-sharing to the same target updates the existing row's `permission` rather than inserting a duplicate
(`PATCH /shares/:id`).

Target-first indexes on `(resource_type, target_user_id, resource_id)` and
`(resource_type, target_team_id, resource_id)` support the direct/team arms of `GET /classes`.

---

## Music connections

### `music_connections`
Per-user provider OAuth connection. Tokens are **encrypted at rest** (`ENCRYPTION_KEY`); never returned
to clients.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| user_id | text (FK → users.id) | |
| provider | text enum(`spotify`,`apple_music`,`soundcloud`) | |
| access_token_encrypted | text | Encrypted blob |
| refresh_token_encrypted | text | Nullable; encrypted blob |
| provider_user_id | text | Nullable |
| scope | text | Nullable |
| expires_at | int (ms) | Nullable |
| created_at / updated_at | int (ms) | |

Unique on (`user_id`, `provider`).

### `provider_purge_queue`
Durable provider-metadata deletion duty created when a user disconnects a provider. Tokens are deleted
immediately; a daily Worker Cron removes that provider's IDs/URIs and conservatively clears artwork from
affected tracks. Successful rows are deleted. Exhausted rows remain with `failed_at` set for operator
recovery instead of silently abandoning the duty.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| user_id | text (FK → users.id) | User whose derived provider metadata must be removed |
| provider | text enum(`spotify`,`apple_music`,`soundcloud`) | Disconnected provider |
| requested_at | int (ms) | Queue ordering and compliance-age timestamp |
| attempts | int | Failed sweep count; defaults to `0` |
| failed_at | int (ms) | Nullable; set after the retry limit is exhausted |

Index active oldest-first work on (`failed_at`, `requested_at`).

---

## Relationship summary

```
users 1───* team_memberships *───1 teams
users 1───* classes
classes 1───* class_tags
classes 1───* class_sections
users 1───* tracks                      (per-user library — decision D4)
users 1───* user_moves *───0..1 moves
classes 1───* class_tracks *───1 tracks
tracks 1───* track_provider_ids
class_tracks 1───* cues
class_tracks 1───* class_track_moves ──0..1──> moves | user_moves
classes (resource) 1───* shares ───> target_user OR target_team
users 1───* music_connections
users 1───* provider_purge_queue
```

## Delete semantics (`ON DELETE`)

Define these in the Drizzle schema (step 3); D1/SQLite enforces FKs when `PRAGMA foreign_keys=ON`.

| Parent deleted | Child behavior |
|---|---|
| `classes` | **CASCADE** → `class_tracks` → their `cues` and `class_track_moves`; and the class's `shares`, `class_tags`, and `class_sections` |
| `class_tracks` | **CASCADE** → its `cues` and `class_track_moves` |
| `tracks` | **RESTRICT** while referenced by any `class_track` (a track in use can't vanish from under a class); also cascades its `track_provider_ids` |
| `teams` | **CASCADE** → `team_memberships` and any `shares` targeting the team |
| `moves` / `user_moves` | **SET NULL** on the referencing `class_track_moves.move_id` / `user_move_id`; the placement survives via its `name_override` snapshot (see below) |
| `users` | Account deletion is not yet a product flow; revisit with GDPR/delete-account work |

> **Library-delete safety:** when a placed move references a library move, the route **snapshots the
> resolved name into `name_override`** before/at delete so a deleted library move never leaves a nameless
> marker. The at-most-one-reference rule still holds (the reference becomes null; `name_override` carries
> the name).

## Notes / open items

- **Timeline model:** `class_track.start_offset_ms` positions the track on the class timeline. It is
  server-derived in `sequential` mode and user-authored in `free` mode; cues/moves use `anchor_ms` into
  the track. Wall-clock ms is the provider-independent default.
- **Copy with cues:** "copy a track across classes with its tags" duplicates the `class_track` plus its
  `cues` and `class_track_moves` — an explicit operation (`POST /class-tracks/:id/copy`), because
  choreography lives on `class_track`, not `track` (D7).
- **Still not modeled:** `class_snapshots` and `color_role`. See decisions for the rationale.
