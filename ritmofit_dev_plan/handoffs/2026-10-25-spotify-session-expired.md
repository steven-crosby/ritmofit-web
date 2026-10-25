---
date: 2026-10-25
tool: Cursor (cloud)
lane: solo
branch: cursor/spotify-session-expired-paste-a809
head: 3225f4d3a30af4fe29af13cdf35b7a7ed90201b2
base: 29145a9d8c99f85f55e544b761a394551cdf799a
prs: ['#586']
status: open
---

# Spotify paste no longer leaves a stale Session expired mark

## Done

- Root cause: the add-track panel's "Session expired" mark is the connection snapshot's access-token `expiresAt`. A working Spotify paste (`POST /classes/:id/import-playlist` → `fetchSpotifyPlaylistPreview` → `readWithConnectedPlaylistToken`) refreshes a still-valid grant and writes a new expiry. The panel never reread that snapshot, so the mark stayed. The retired #575 handoff is the user-token preview path; it does not explain this stale mark.
- `TrackSearch` rereads connections after a Spotify preview succeeds, and ignores an older in-flight snapshot. A failed paste does not reread. Apple Music and SoundCloud pastes do not. Playback, seeking, and the Apple Music path are unchanged. No new copy.

## In flight

- [#586](https://github.com/steven-crosby/ritmofit-web/pull/586) on `cursor/spotify-session-expired-paste-a809`. Not merged. Not deployed.

## Next action

Owner review. Merge only on an explicit yes. Do not deploy from this handoff.

## Blockers and owner decisions

- None.

## Verification

- Run: `pnpm --filter @ritmofit/web test` — 1364 passed, including the new paste snapshot cases. `pnpm --filter @ritmofit/web typecheck` passed. `pnpm format:check` passed. `pnpm lint` passed.
- The new case fails on the old panel: after a working Spotify paste, "Session expired" is still on screen. It passes once the reread replaces that snapshot.
- Skipped: design-system verify, theme-classes, api/music tests, integration, web build, openapi, contract-parity, audit. No API, schema, OpenAPI, style-token, or dependency change.

## Production as observed

- Not checked from this environment.
- Branch base is `origin/main` `29145a9`. This fix is not on that commit.

## Shared zones touched

- none

## Notes for other lanes / iOS

- Web only. The Playback ledger still follows the existing capability truth for whatever snapshot comes back. No playback or seek code changed. iOS is halted.
