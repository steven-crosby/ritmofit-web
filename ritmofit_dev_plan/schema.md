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

> **Auth tables** (`users` aside) — `accounts`, `sessions`, `verification` etc. — are largely managed
> by **Better Auth**'s D1 adapter. We extend `users` with our own columns; we don't hand-define the
> session/account internals. Treat Better Auth's generated tables as owned-but-managed.

---

## Identity & teams

### `users`
The canonical user record (Better Auth's user table, extended). Our source of truth.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID; matches the Better Auth user id |
| email | text | Unique |
| display_name | text | Nullable |
| image_url | text | Nullable |
| created_at / updated_at | int (ms) | |

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
| target_duration_ms | int | Nullable; total planned class length |
| created_at / updated_at | int (ms) | |
| last_opened_at | int (ms) | Nullable |

> **No `segment_type` here and no `class_sections` table in M1** — segments are a design concept not
> yet in the schema (decision D-cut). Don't invent the table.

### `tracks`
The provider-agnostic song — the abstract track, not a provider's copy.

| Column | Type | Notes |
|---|---|---|
| id | text (PK) | UUID |
| title | text | |
| artist | text | |
| album_art_url | text | Nullable |
| duration_ms | int | Nullable |
| display_bpm | int | Nullable; **manual entry in M1** (no Spotify BPM) |
| isrc | text | Nullable; aids future cross-provider matching |
| created_at / updated_at | int (ms) | |

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
| start_offset_ms | int | Nullable; where the track sits on the class timeline |
| notes | text | Nullable; instructor's free-text notes for this track |
| created_at / updated_at | int (ms) | |

`cues` and `class_track_moves` attach here, NOT to `tracks` — choreography is per-class (D7).

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
| beat | int | Nullable; optional beat anchor |
| bar | int | Nullable; optional bar anchor |
| text | text | The cue text shown in the prompter |
| color | text | Nullable; hex/label for visual tagging (used by the design system) |
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

---

## Relationship summary

```
users 1───* team_memberships *───1 teams
users 1───* classes
users 1───* user_moves *───0..1 moves
classes 1───* class_tracks *───1 tracks
tracks 1───* track_provider_ids
class_tracks 1───* cues
class_tracks 1───* class_track_moves ──0..1──> moves | user_moves
classes (resource) 1───* shares ───> target_user OR target_team
users 1───* music_connections          (M2)
```

## Notes / open items

- **Timeline model:** `class_track.start_offset_ms` positions the track on the class timeline;
  cues/moves use `anchor_ms` into the track. Wall-clock ms is the provider-independent default. Revisit
  beat-grid alignment only when the live iOS player needs it — don't over-design first.
- **Copy with cues:** "copy a track across classes with its tags" duplicates the `class_track` plus its
  `cues` and `class_track_moves` — an explicit operation (`POST /class-tracks/:id/copy`), because
  choreography lives on `class_track`, not `track` (D7).
- **Cut from M1:** `segment_type` / `class_sections`, `class_snapshots`, `color_role`. See decisions.
