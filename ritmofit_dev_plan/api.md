# API

REST surface for M1, documented with OpenAPI so web and iOS share one contract. This lists the shape
and intent of endpoints; exact request/response bodies are the Zod schemas in `packages/shared`,
surfaced in the generated OpenAPI spec.

## Conventions

- **Base:** `/api/v1`
- **Auth:** every endpoint except the auth bootstrap requires a valid Better Auth session. Middleware
  validates it and resolves the canonical `users` row.
- **IDs:** UUIDs (as `TEXT`) in paths.
- **Validation:** request bodies validated against shared Zod schemas; `422` on failure.
- **Errors:** consistent JSON `{ error: { code, message, details? } }`.
  - `401` not authenticated · `403` authenticated but not authorized · `404` not found (or hidden for
    resources the user can't see) · `409` conflict · `422` validation.
  - Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`,
    `PROVIDER_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- **Authorization:** all class-scoped reads/writes go through the central `requireAccess` helper in
  `lib/authz.ts` (see `authorization.md`). Never inline ad-hoc checks — D1 has no RLS back-stop.
- **Casing:** responses map snake_case DB columns to camelCase via the shared schemas.

> **Build order:** the **bold** groups below are the M1 core (built first, behind the class builder).
> The *Teams* and *Shares* groups are M1 schema-complete but their **routes are built last** (D9).

---

## Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/session` | Validate the Better Auth session and return the canonical profile. Better Auth's adapter **creates** the `users` row; this route **reconciles our extra columns** (`display_name`, `image_url`) on first sight — it does not mint the identity. Called once after login. |

(Better Auth's own sign-in/callback routes are mounted under `/api/auth/*` by the library.)

---

## **Classes** (M1 core)

| Method | Path | Purpose |
|---|---|---|
| GET | `/classes` | List classes the user can see: owned ∪ shared-directly ∪ shared-via-team. Indicates each class's access level. |
| POST | `/classes` | Create a class (owner = caller). |
| GET | `/classes/:id` | Fetch one class (owner or any share). |
| PATCH | `/classes/:id` | Update class fields (edit access). |
| DELETE | `/classes/:id` | Delete (owner only). |
| GET | `/classes/:id/run-payload` | **Versioned single-fetch payload to run the class live** (see below). |

## **Tracks within a class** (M1 core)

| Method | Path | Purpose |
|---|---|---|
| POST | `/classes/:id/tracks` | Add a track to a class → creates a `class_track`. Body references an existing `track` or creates one. Edit access. |
| GET | `/classes/:id/tracks` | List `class_tracks` in `position` order, with cues + moves. |
| PATCH | `/class-tracks/:id` | Update intensity, bpm override, start offset, notes. |
| DELETE | `/class-tracks/:id` | Remove a track from the class. |
| POST | `/classes/:id/tracks/reorder` | Reorder `class_tracks` (accepts the new ordered list of ids). |
| POST | `/class-tracks/:id/copy` | Copy this class_track **with its cues/moves** into a target class (D7). |

## **Cues** (M1 core)

| Method | Path | Purpose |
|---|---|---|
| GET | `/class-tracks/:id/cues` | List cues for a class_track. |
| POST | `/class-tracks/:id/cues` | Create a cue (anchor_ms + optional beat/bar, text, color). |
| PATCH | `/cues/:id` | Update a cue. |
| DELETE | `/cues/:id` | Delete a cue. |

## **Moves on the timeline** (M1 core)

| Method | Path | Purpose |
|---|---|---|
| GET | `/class-tracks/:id/moves` | List placed moves (`class_track_moves`) for a class_track. |
| POST | `/class-tracks/:id/moves` | Place a move (anchor_ms; references a library move or freeform name; optional intensity). |
| PATCH | `/class-track-moves/:id` | Update a placed move. |
| DELETE | `/class-track-moves/:id` | Remove a placed move. |

## **Moves library** (M1 core)

| Method | Path | Purpose |
|---|---|---|
| GET | `/moves?template=cycle` | List global library moves (optionally by template). |
| GET | `/user-moves` | List the caller's custom moves. |
| POST | `/user-moves` | Create a custom move (optional `baseMoveId`). |
| PATCH | `/user-moves/:id` | Update a custom move. |
| DELETE | `/user-moves/:id` | Delete a custom move. |

## **Tracks & provider IDs** (M1 core — hand-entered)

In M1 these are hand-entered (no provider API calls). M2 adds search/resolution. Tracks are a
**per-user library** (D4): creation sets `owner_user_id` = caller, and update/delete/attach are
**owner-only** (a simple ownership check, *not* `requireAccess` — see `authorization.md`).

| Method | Path | Purpose |
|---|---|---|
| POST | `/tracks` | Create a provider-agnostic track (title, artist, optional manual BPM). Owner = caller. |
| GET | `/tracks/:id` | Fetch a track with its provider IDs (owner only). |
| PATCH | `/tracks/:id` | Update track fields, e.g. set/correct manual BPM (owner only). |
| POST | `/tracks/:id/provider-ids` | Attach a provider ID — provider + providerTrackId + optional uri (owner only). |
| DELETE | `/track-provider-ids/:id` | Remove a provider ID (owner of the parent track only). |

> `POST /classes/:id/tracks` may inline-create a track (per its body); the inline-create sets
> `owner_user_id` = caller and uses the **same** shared Zod shape as `POST /tracks`. Referencing an
> *existing* track in that route requires the caller to own it.

---

## Teams *(schema in M1; routes built last)*

| Method | Path | Purpose |
|---|---|---|
| GET | `/teams` | List teams the caller belongs to. |
| POST | `/teams` | Create a team (caller becomes owner). |
| GET | `/teams/:id` | Fetch a team (member only). |
| GET | `/teams/:id/members` | List members. |
| POST | `/teams/:id/members` | Add a member (owner/admin only). |
| DELETE | `/teams/:id/members/:userId` | Remove a member (owner/admin, or self-leave). |

## Shares *(schema in M1; routes built last)*

| Method | Path | Purpose |
|---|---|---|
| GET | `/classes/:id/shares` | List shares on a class (owner only). |
| POST | `/shares` | Share a class with a user OR a team, at view/edit. Exactly one target. |
| PATCH | `/shares/:id` | Change a share's permission. |
| DELETE | `/shares/:id` | Revoke a share. |

---

## The run-payload (iOS live contract) — decision D12

`GET /classes/:id/run-payload` returns everything needed to run a class in one request. Versioned via
`schemaVersion`; hardened in M3. Shape (camelCase, ms-based):

```json
{
  "schemaVersion": 1,
  "class": {
    "id": "…",
    "title": "Mon POWER 6/8",
    "template": "cycle",
    "targetDurationMs": 2700000,
    "totalDurationMs": 2640000
  },
  "tracks": [
    {
      "classTrackId": "…",
      "position": 0,
      "displayBpm": 122,
      "intensity": "mod",
      "startOffsetMs": 0,
      "notes": "Start seated, build energy",
      "track": {
        "id": "…",
        "title": "Baianá",
        "artist": "Bakermat",
        "durationMs": 180000,
        "albumArtUrl": "…"
      },
      "providerRefs": [
        { "provider": "soundcloud", "providerTrackId": "…", "providerUri": "…" }
      ],
      "cues": [
        { "anchorMs": 45000, "beat": null, "bar": null, "text": "Prepare for the drop", "color": "#3AC0D4" }
      ],
      "moves": [
        { "anchorMs": 30000, "name": "Climb", "intensity": "hard" }
      ]
    }
  ]
}
```

The granular endpoints above remain the **edit** surface; run-payload is the read-optimized **live**
contract — one fetch so the iOS app isn't composing the live view from a dozen calls on studio wifi.

**Server-side resolution (the contract the clients depend on):**
- **`displayBpm`** = `class_track.display_bpm_override ?? track.display_bpm` (the override wins; may be
  `null` if neither is set — BPM is optional/manual in M1).
- **move `name`** = `move.name ?? user_move.name ?? class_track_move.name_override` (resolve the library
  reference; fall back to the freeform name). Exactly one source is set per placement.
- **`startOffsetMs`** is **server-derived** (sequential, back-to-back from preceding `durationMs`);
  clients treat it as read-only. See `schema.md` → `class_tracks`. **M3:** the run-payload **recomputes**
  the timeline at read time (reusing the write-path sequencing), so per-track offsets are authoritative
  even if a persisted `start_offset_ms` ever drifted. Each entry runs `startOffsetMs` →
  `startOffsetMs + track.durationMs`.
- **`class.totalDurationMs`** (**M3**) is the assembled timeline length — the sum of track `durationMs`
  (null = 0), distinct from the instructor's planned `targetDurationMs`. Drives the live interval timer
  without client-side summing. `0` for an empty class.
- **`tracks`** are emitted in `position` order.

---

## Notes

- The `GET /classes` union is the one query to watch for cost — a deliberate shape, not an accident.
  See `authorization.md` for the access predicate it implements.
- Choreography endpoints (`cues`, `moves`) inherit the parent class's access level via the
  `cue/move → class_track → class` chain, resolved by the authz helper.
- **M2 adds:** `GET /search` (provider search), provider-ID resolution, optional third-party BPM
  lookup, and music-connection OAuth routes. Not in M1.
