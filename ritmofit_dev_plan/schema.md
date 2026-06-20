# Schema (M1)

The full M1 data model, resolved into one table set for **Cloudflare D1 (SQLite)**.

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
> (`timestamp_ms`), consistent with D10.

---

## Identity & teams

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
| visibility | text enum(`private`,`unlisted`,`public`) | Default `private` |
| featured_category | text | Nullable; marks this class for curated Explore rows |
| cover_image_url | text | Nullable; custom uploaded R2 image URL |
| target_duration_ms | int | Nullable; total planned class length |
| target_duration_ms | int | Nullable; total planned class length |
| created_at / updated_at | int (ms) | |
| last_opened_at | int (ms) | Nullable |

Indexes include `(owner_user_id, updated_at, id)` for the owned arm of the ordered private-library
query.

> **Segments:** no `segment_type` on `classes`. There was no `class_sections` table in M1 (segments
> were a design concept then), but one was **added later** in the design-system builder build
> (**slice 16, migration `0006`**): a `class_sections` table with a fixed `segmentType` enum
> (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`), time-anchored by `start_offset_ms`. This M1
> schema doc does not yet detail that table — see `milestones.md` slice 16 and the Drizzle schema.

### `tracks`
The provider-agnostic song — the abstract track, not a provider's copy.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| owner_user_id | text (FK → users.id) | The user who created the track. **Per-user library in M1** (decision D4) — edits affect only the owner's classes |
| title | text | |
| artist | text | |
| album_art_url | text | Nullable |
| duration_ms | int | Nullable |
| display_bpm | int | Nullable; **manual entry in M1** (no Spotify BPM) |
| isrc | text | Nullable; aids future cross-provider matching |
| created_at / updated_at | int (ms) | |

> **Ownership (M1):** tracks are a **per-user library**, not global singletons. `owner_user_id` is set
> to the creator; only the owner may edit a track. Duplicates across users are accepted in M1 — a track
> is hand-entered, so two users typing the same song get two rows. **Cross-user track identity / ISRC
> dedup is deferred to M2**, when provider IDs give a stable matching key (decision D4).

### `track_provider_ids`
One row per provider for a track — what makes a track provider-agnostic.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| track_id | text (FK → tracks.id) | |
| provider | text enum(`spotify`,`apple_music`,`soundcloud`) | |
| provider_track_id | text | The provider's own ID |
| provider_uri | text | Nullable; Spotify URI / SoundCloud URL for deep-link playback |
| created_at / updated_at | int (ms) | |

Unique on (`provider`, `provider_track_id`).

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
| duration_ms_override | int | Nullable, positive; class-specific correction when library/provider duration is missing or wrong |
| start_offset_ms | int | Nullable; where the track sits on the class timeline. **Server-derived in M1** (see below) |
| notes | text | Nullable; instructor's free-text notes for this track |
| created_at / updated_at | int (ms) | |

`cues` and `class_track_moves` attach here, NOT to `tracks` — choreography is per-class (D7).

> **Timeline placement (M1): sequential, derived.** `position` is the authoritative ordering. Tracks
> play **back-to-back** — `start_offset_ms` is **computed by the server** from the sum of preceding
> effective durations (`class_tracks.duration_ms_override ?? tracks.duration_ms`), not freely set by
> the client; no gaps or overlaps in M1. The override lets a class editor correct timing without
> mutating another user's private library track. The column is kept so
> **free placement** (explicit offsets, silence gaps) can land in a later milestone **without a
> migration**. Clients should treat `start_offset_ms` as read-only in M1.

### `class_tags`
Simple "Google Keep" style tagging system for classes. Used to search historical classes (e.g., "Songs by Move" or thematic searches).

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| class_id | text (FK → classes.id) | |
| tag | text | Lowercase tag string |
| created_at / updated_at | int (ms) | |

Unique on (`class_id`, `tag`).

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
| beat | int | Nullable; optional beat anchor. **Forward-looking — non-functional in M1** (no downbeat phase to derive from; beat-snapping is a later milestone, like `music_connections`) |
| bar | int | Nullable; optional bar anchor. Same M1 status as `beat` |
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

## Music connections (M2 — schema placeholder)

### `music_connections`
Per-user provider OAuth connection. **Not used in M1**; defined so M2 doesn't require a migration that
touches existing tables. Tokens are **encrypted at rest** (`ENCRYPTION_KEY`); never returned to clients.

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
users 1───* tracks                      (per-user library — M1, decision D4)
users 1───* user_moves *───0..1 moves
classes 1───* class_tracks *───1 tracks
tracks 1───* track_provider_ids
class_tracks 1───* cues
class_tracks 1───* class_track_moves ──0..1──> moves | user_moves
classes (resource) 1───* shares ───> target_user OR target_team
users 1───* music_connections          (M2)
users 1───* provider_purge_queue       (M2)
```

## Delete semantics (`ON DELETE`)

Define these in the Drizzle schema (step 3); D1/SQLite enforces FKs when `PRAGMA foreign_keys=ON`.

| Parent deleted | Child behavior |
|---|---|
| `classes` | **CASCADE** → `class_tracks` → their `cues` and `class_track_moves`; and the class's `shares` and `class_tags` |
| `class_tracks` | **CASCADE** → its `cues` and `class_track_moves` |
| `tracks` | **RESTRICT** while referenced by any `class_track` (a track in use can't vanish from under a class); also cascades its `track_provider_ids` |
| `teams` | **CASCADE** → `team_memberships` and any `shares` targeting the team |
| `moves` / `user_moves` | **SET NULL** on the referencing `class_track_moves.move_id` / `user_move_id`; the placement survives via its `name_override` snapshot (see below) |
| `users` | Out of scope for M1 (no account-deletion flow yet); revisit with GDPR/delete-account work |

> **Library-delete safety:** when a placed move references a library move, the route **snapshots the
> resolved name into `name_override`** before/at delete so a deleted library move never leaves a nameless
> marker. The at-most-one-reference rule still holds (the reference becomes null; `name_override` carries
> the name).

## Notes / open items

- **Timeline model:** `class_track.start_offset_ms` positions the track on the class timeline and is
  **server-derived in M1** (sequential, back-to-back — see the `class_tracks` note); cues/moves use
  `anchor_ms` into the track. Wall-clock ms is the provider-independent default. Free placement and
  beat-grid alignment are deliberate later milestones — don't over-design first.
- **Copy with cues:** "copy a track across classes with its tags" duplicates the `class_track` plus its
  `cues` and `class_track_moves` — an explicit operation (`POST /class-tracks/:id/copy`), because
  choreography lives on `class_track`, not `track` (D7).
- **Cut from M1:** `segment_type` / `class_sections`, `class_snapshots`, `color_role`. See decisions.
