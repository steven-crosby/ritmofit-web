# 09 — AI Working Rules

## Absolute rule

Before writing code for any feature, propose a plan and wait for confirmation.

The plan must include:

- files to create/change
- schema impact
- API surface impact
- frontend impact
- risks
- verification steps

## Do not overbuild

Avoid adding complex infrastructure before the product needs it.

Do not add:

- teams
- marketplace
- realtime collaboration
- complex role permissions
- AI recommendations
- embedded full music streaming
- payment systems
- analytics platforms

unless the user explicitly requests them.

## Keep the source of truth clear

The backend owns:

- classes
- class tracks
- track choreography
- cues
- moves
- user custom language
- provider references

Music providers own:

- playback
- provider-specific track availability
- provider-specific playlists

The frontend owns:

- presentation
- interaction state
- temporary unsaved form state

## Prefer shared types

If an API request or response shape is used by both frontend and backend, define it in `packages/shared`.

Do not duplicate enums or magic strings.

## Prefer small vertical slices

A good implementation slice includes:

- schema if needed
- API route
- shared schema/type
- frontend UI
- loading/error states
- basic verification

## Schema migration rules

Before changing schema:

1. Inspect current schema.
2. Inspect existing migrations.
3. Propose migration plan.
4. Explain data impact.
5. Wait for confirmation.

Never manually edit old migrations after they are considered applied, unless the project is still pre-deployment and the user approves resetting migrations.

## API rules

- Validate all params and bodies.
- Authenticate protected routes.
- Check ownership.
- Return consistent errors.
- Do not leak secrets.
- Keep provider-specific response shapes out of client-facing class APIs.

## Frontend rules

- Use accessible controls.
- Include loading, empty, and error states.
- Keep UI responsive on laptop screens.
- Use colorblind-safe patterns.
- Do not rely on color alone.
- Avoid global state unless clearly needed.

## Music provider rules

- Implement SoundCloud first.
- Keep provider logic inside `packages/music` or API services.
- Normalize provider data before storing it.
- Store raw provider metadata only for debugging.
- Do not store or serve full audio files.
- Prefer external provider open/play links for v1.

## Auth/security rules

- Never commit secrets.
- Use secure HTTP-only cookies for sessions.
- Hash session tokens in the database.
- Encrypt provider tokens before storing.
- Do not log tokens or cookies.
- Keep Apple Sign In separate from Apple Music.

## Communication style for coding sessions

When proposing a change, use this format:

```md
## Proposed plan

### Goal

### Files to create/change

### Schema impact

### API impact

### Frontend impact

### Risks/open questions

### Verification steps

Please confirm before I implement.
```

When implementation is complete, summarize:

```md
## Completed

## Files changed

## How to verify

## Known issues / next steps
```
