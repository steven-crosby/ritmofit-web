# 04 — API Contract

## API design principles

- The backend is the source of truth.
- The web app and future iOS app consume the same API.
- Validate request bodies with shared Zod schemas.
- Return predictable JSON shapes.
- Keep provider-specific music details behind provider abstractions.
- Do not expose access tokens or secrets to the client.
- Prefer explicit endpoints over overloaded catch-all endpoints.

## Initial API surface

### Health

```txt
GET /api/health
```

Returns API health and version information.

### Auth/session

```txt
GET  /api/auth/session
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/google
GET  /api/auth/google/callback
GET  /api/auth/apple
GET  /api/auth/apple/callback
```

Exact auth endpoints may change based on final auth library, but the app must provide a stable way for the frontend to identify the current session.

### Music provider connections

```txt
GET    /api/music/providers
GET    /api/music/connections
POST   /api/music/soundcloud/connect
GET    /api/music/soundcloud/callback
DELETE /api/music/connections/:provider
```

### Music search/import

```txt
GET  /api/music/search?provider=soundcloud&q=...
GET  /api/music/tracks/:provider/:providerTrackId
POST /api/music/import-track
POST /api/music/import-playlist
```

`import-track` should normalize metadata, create/update `tracks`, create/update `provider_tracks`, and optionally attach the track to a class.

Suggested request:

```json
{
  "provider": "soundcloud",
  "providerTrackId": "...",
  "classId": "optional-class-id"
}
```

### Classes

```txt
GET    /api/classes
POST   /api/classes
GET    /api/classes/:classId
PATCH  /api/classes/:classId
DELETE /api/classes/:classId
```

### Class tracks

```txt
POST   /api/classes/:classId/tracks
PATCH  /api/class-tracks/:classTrackId
DELETE /api/class-tracks/:classTrackId
POST   /api/classes/:classId/reorder-tracks
```

Suggested `POST /api/classes/:classId/tracks` body:

```json
{
  "trackId": "...",
  "orderIndex": 0,
  "displayBpm": 122,
  "segmentType": "warmup",
  "intensity": "mod"
}
```

Suggested reorder body:

```json
{
  "orderedClassTrackIds": ["...", "...", "..."]
}
```

### Cues

```txt
POST   /api/class-tracks/:classTrackId/cues
PATCH  /api/cues/:cueId
DELETE /api/cues/:cueId
```

Suggested cue body:

```json
{
  "timestampMs": 45000,
  "cueType": "move",
  "moveId": "optional-global-move-id",
  "userMoveId": "optional-user-move-id",
  "text": "Add resistance and prepare for the drop",
  "intensity": "hard"
}
```

### Moves

```txt
GET    /api/moves?classType=cycle
GET    /api/user-moves
POST   /api/user-moves
PATCH  /api/user-moves/:userMoveId
DELETE /api/user-moves/:userMoveId
```

### Future iOS/live-mode payload

```txt
GET /api/classes/:classId/run-payload
```

This endpoint should return a versioned payload containing all data required to run a class.

## Error response pattern

Use a consistent error response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Display BPM must be a positive number.",
    "details": {}
  }
}
```

Recommended error codes:

```txt
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
PROVIDER_ERROR
RATE_LIMITED
INTERNAL_ERROR
```

## API implementation notes

- All authenticated endpoints must derive `userId` from the session, not from the request body.
- A user can only access their own classes in v1.
- Do not add team permission logic in v1.
- Provider raw metadata may be stored for debugging, but do not rely on raw metadata shape in frontend code.
- API responses should map DB column names to client-friendly camelCase where practical.
