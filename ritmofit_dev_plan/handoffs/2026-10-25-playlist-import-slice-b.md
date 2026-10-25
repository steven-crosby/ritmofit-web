---
date: 2026-10-25
tool: Cursor (cloud)
lane: solo
branch: cursor/playlist-import-slice-b-3a0a
head: 58a75ce68ee8a61cae5035e5827a79e1f4900186
base: 88128effc58dccbaf1af016359f85a855e40c4d7
prs: ['#573 (draft)']
status: open
---

# Slice B playlist picker and paste-a-link preview are in draft #573

## Done

- Draft [#573](https://github.com/steven-crosby/ritmofit-web/pull/573) on `cursor/playlist-import-slice-b-3a0a`. Work commit `58a75ce`. Not merged. Not deployed.
- Slice A remains merged as [#572](https://github.com/steven-crosby/ritmofit-web/pull/572) (`88128ef`). The 15-song cap is per import and does not count tracks already on the class.
- Paste-a-link is a preview: 422 above 100 occurrences (Spotify reports the total; Apple and SoundCloud say more than 100), 504 `PROVIDER_TIMEOUT` after 8 seconds with `The playlist took too long to load. Try again.`, and no writes. OpenAPI documents 200, 422, and 504.
- The picker (up to 15, first 15 songs pre-checked in source order, 100 mounted rows) is wired into Music saved playlists, likes, class-level playlist import, and paste-a-link. The instructor can uncheck and recheck. A 16th check is refused. Confirm sends `songBlocks: true` in source order. Search, manual add, Songs-by-Move, and a single saved-playlist row add do not.
- Warm-up / cooldown labels reuse `playlistSongBlockDraft` from shared, re-exported by `apps/web/src/lib/class-scaffold.ts`. No migration.

## In flight

- [#573](https://github.com/steven-crosby/ritmofit-web/pull/573) is a draft. Resume on `cursor/playlist-import-slice-b-3a0a`. Do not merge from this handoff unless the owner asks.

## Next action

Owner review of #573. Merge only on an explicit yes. Ship the API and SPA together: the paste-a-link response is no longer 201 `{ imported }`. After merge, the design's real-browser smoke (picker on a long playlist, 422, timeout copy) is still owed; this session did not drive a browser or a live provider playlist.

## Blockers and owner decisions

- None. Decision 10 and decision 11 (pre-check the first 15 songs) are applied.

## Verification

- Run: full gate on `58a75ce`, green. `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, design-system `npm run verify`, `theme-classes`, `pnpm test` (music 30, web 1326, api 517), `pnpm --filter @ritmofit/api test:integration` (219), web build, openapi with a clean diff, contract-parity (no untracked drift), `pnpm audit:ci` (2 ignored: 1 low, 1 moderate). Picker tests assert the first 15 boxes start checked and confirm is enabled immediately.
- The 100-song stub preview returns in under 2 seconds with two Spotify page fetches. The picker mounts 100 rows with no virtualization in under 2 seconds.
- Skipped: real-browser smoke and a live provider playlist timing check.

## Production as observed

- `main` vs production: unknown from this session. Last recorded production Worker in DEVELOPMENT_PLAN is `7a505ae` (2026-10-24). This session did not deploy.
- Update 2026-10-24 10:28 PM MT: slices A+B deployed on main `c7110b4`, Worker `308a01a9-1972-4c5b-b046-f497c0c10d7e` (rollback `91e323c9-504c-4e60-8bde-47befd2ccb8c`). HTTP smoke green, including unauthenticated `POST /api/v1/classes/:id/import-playlist` 401. Real-browser smoke of playlist import is still owed. See HISTORY.
- Evidence: not checked from this environment.

## Shared zones touched

- `packages/shared` preview schema, `packages/music` playlist reads and retry deadline, `POST /classes/:id/import-playlist`, OpenAPI, `Dashboard.tsx`. No migration. Run payload unchanged.

## Notes for other lanes / iOS

- `POST /classes/:id/import-playlist` now returns 200 `{ occurrences }` and can return 422 or 504. It does not write class tracks. The ordered import body is unchanged aside from the slice A `songBlocks` flag. Contract parity for the run payload is unchanged.
