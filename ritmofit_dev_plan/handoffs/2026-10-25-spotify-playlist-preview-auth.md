---
date: 2026-10-25
tool: Cursor (cloud)
lane: solo
branch: cursor/spotify-playlist-preview-user-token-71fe
head: 028186dc9547f15d2969c46a800b0521b3604589
base: 990c12a45dcc32dc5eec0392ef0013c3ad0715d5
prs: ['#575 (draft)']
status: open
---

# Spotify paste-a-link preview uses the instructor's user token

## Done

- Draft [#575](https://github.com/steven-crosby/ritmofit-web/pull/575) on `cursor/spotify-playlist-preview-user-token-71fe`. Work commit `028186d`. Not merged. Not deployed.
- Root cause: `POST /classes/:id/import-playlist` called `SpotifyProvider.getPlaylist`, which sends the client-credentials app token. Spotify playlist items return 401 "Valid user authentication required". `onError` maps that `ProviderError` to 502 `PROVIDER_UNAVAILABLE` ("A music provider is temporarily unavailable.").
- Spotify preview now uses `fetchSpotifyPlaylistPreview`: the saved-playlist refresh path and `fetchSpotifyPlaylistTracks` with the user bearer. No app-token fallback.
- No connection: 409 `NOT_CONNECTED`, "Connect Spotify to import this playlist." Dead grant or a scope/auth 403: 409 `REAUTH_REQUIRED`, "Reconnect Spotify to import this playlist." A non-auth 403 stays `PROVIDER_FORBIDDEN`.
- The paste-a-link panel shows that copy, plus Manage connections when the shell passes `onOpenConnections`.
- `PROVIDER_RECONNECT_REQUIRED` does not exist. HTTP 401 would sign the instructor out of Ritmo, so these stay 409.

## In flight

- [#575](https://github.com/steven-crosby/ritmofit-web/pull/575) is a draft. Do not merge or deploy from this handoff unless the owner asks.

## Next action

Owner review of #575. Merge only on an explicit yes. Ship the API and SPA together. After merge, a live Spotify public-playlist paste is still owed; this session stubbed Spotify and did not drive a browser against a real playlist.

## Blockers and owner decisions

- None.

## Verification

- Run: full gate on `028186d`, green. `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, design-system `npm run verify`, `theme-classes`, `pnpm test` (music 30, web 1328, api 526), `pnpm --filter @ritmofit/api test:integration` (223), web build, openapi with a clean diff, contract-parity (no untracked drift), `pnpm audit:ci` (2 ignored: 1 low, 1 moderate).
- Skipped: real-browser smoke and a live Spotify playlist.

## Production as observed

- Not checked from this environment. `curl https://ritmofit.studio/api/v1/health` returned 403, and `wrangler deployments status` has no `CLOUDFLARE_API_TOKEN`.
- `DEVELOPMENT_PLAN` on `main` `990c12a` records production Worker `308a01a9-1972-4c5b-b046-f497c0c10d7e` at `c7110b4`. This fix is not in that tree.

## Shared zones touched

- `POST /classes/:id/import-playlist`, OpenAPI, `packages/music` Spotify playlist-item reads, the user-playlist token helper's message overrides, `TrackSearch.tsx`. No migration. Run payload unchanged.

## Notes for other lanes / iOS

- The preview route now documents 409 `NOT_CONNECTED` / `REAUTH_REQUIRED` and 403 `PROVIDER_FORBIDDEN`. 200, 422, and 504 are unchanged. Run payload is unchanged.
- Apple catalog paste-a-link still uses the developer token. Library links are still rejected before the fetch.
- SoundCloud public paste-a-link still uses the client-credentials app token and remints once on 401. That is the same fallback shape, and it was not changed: SoundCloud's public playlist API still documents client credentials, and there is no production 401 of this kind.
- A playlist-items 403 whose body matches insufficient scope or authentication required is now `SpotifyForbiddenError` (reconnect), including saved-playlist drill-in. Other 403s stay access-denied.
