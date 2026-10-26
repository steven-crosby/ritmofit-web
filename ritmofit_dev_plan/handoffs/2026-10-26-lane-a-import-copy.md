---
date: 2026-10-26
tool: Cursor
lane: lane-a-import-copy
branch: cursor/import-error-copy-2761
head: ecf7c34b4d5e2321bc1dd1df3ee448dbf9d23be9
base: 38bb2d843acf6436e1f33f4fa407462661f67cf1
prs: ['#588 (open)']
status: open
---

# Picker cap copy and malformed Spotify links are fixed; editorial vs outage is an API gap

## Done

- Web-only copy on `cursor/import-error-copy-2761`. The playlist picker shows "Choose at most 15 songs." only after a refused 16th check. Fifteen selected stays quiet.
- A Spotify playlist URL whose id is not a 22-character base62 value that fits in 128 bits is rejected in the paste field before `POST /classes/:id/import-playlist`. The alert reuses "Unsupported playlist URL. Paste a public Spotify, SoundCloud, or Apple Music playlist link." `https://open.spotify.com/playlist/invalid000000000000000` is that case (22 alphanumeric characters, value does not fit in 128 bits).
- A `403 PROVIDER_FORBIDDEN` paste still shows "Spotify only allows opening playlists you own or collaborate on." A `502 PROVIDER_UNAVAILABLE` paste still shows "A music provider is temporarily unavailable."

## In flight

- [#588](https://github.com/steven-crosby/ritmofit-web/pull/588) is open for review. Do not merge from this lane.

## Next action

An API lane should split an editorial Spotify playlist failure from a provider outage before the web can label it. Today `fetchSpotifyPlaylistTracks` maps only a non-auth `403` to `SpotifyPlaylistAccessDeniedError` (`403 PROVIDER_FORBIDDEN` and the ownership sentence). Every other non-ok status, including a `404`, becomes `ProviderError` and the client sees `502 PROVIDER_UNAVAILABLE` with "A music provider is temporarily unavailable." That envelope matches a real outage, so this lane did not relabel it. Do not change the web to treat `PROVIDER_UNAVAILABLE` as an ownership error.

## Blockers and owner decisions

- None. The stop was the instruction not to edit API files to invent the editorial distinction.

## Verification

- Run: `pnpm --filter @ritmofit/web exec vitest run src/components/PlaylistSongPicker.test.tsx src/lib/playlist-link.test.ts src/components/TrackSearch.test.tsx` — 3 files, 109 tests, passed.
- Run: `pnpm --filter @ritmofit/web typecheck` — passed.
- Run: Prettier check and ESLint on the six touched web files — passed.
- Skipped: full CI gate (API, integration, OpenAPI, contract-parity, audit). No API, schema, or OpenAPI edits.

## Production as observed

- Not checked from this environment.
- Branch base is `origin/main` `38bb2d843acf6436e1f33f4fa407462661f67cf1`, the docs commit after `5b006ec`.

## Shared zones touched

- none

## Notes for other lanes / iOS

- Nested class-id routing was not touched.
- The 15-song figure is only this picker's pre-check. There is still no total song cap on a class.
- iOS impact: none until a client copies this paste behavior. The ownership sentence already exists on the API for `PROVIDER_FORBIDDEN`.
