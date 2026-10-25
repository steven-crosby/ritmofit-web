---
date: 2026-10-24
tool: Cursor (cloud)
lane: solo
branch: cursor/playlist-song-blocks-commit-87c5
head: 8bbdd731e5bf4c542289cffccf96785dfee66550
base: 15cf188870179c890e1369f5a9026959c041a7cb
prs: ['#572 (draft)']
status: open
---

# Slice A song-block commits are in a draft PR; slice B is not started

## Done

- Draft [#572](https://github.com/steven-crosby/ritmofit-web/pull/572) adds optional `songBlocks: true` on `POST /classes/:id/tracks/import`. One plan block per new occurrence, in the existing guarded batch. No migration.
- Replace of an empty recipe (warm-up / cooldown labels, one song is warm-up only). Append keeps authored blocks, tracks, cues, and notes, and deletes only empty non-playlist recipe blocks.
- Playlist-import cap is 15, including tracks already on the class. Commits without the flag stay at 100.
- OpenAPI records `songBlocks` and the 422 cap sentence. Run-payload contract parity is unchanged.
- Paste-a-link, adapter page size, and web UI are not in this PR.

## In flight

- [#572](https://github.com/steven-crosby/ritmofit-web/pull/572) is draft. Do not merge it from this session, and do not deploy.
- Slice B (picker, web import paths, paste-a-link preview, early-stop, timeout) is not started.

## Next action

Steven reviews [#572](https://github.com/steven-crosby/ritmofit-web/pull/572). Merge only with an explicit yes. Slice B starts after that merge, from `ritmofit_dev_plan/playlist-import-blocks-design.md`.

## Blockers and owner decisions

- None. Decisions 1–9 in the design stay as written. This session did not reopen them.

## Verification

- Run: full gate on `8bbdd73`, green. `pnpm format:check`; `pnpm -r typecheck`; `pnpm lint`; design-system `npm run verify`; `pnpm --filter @ritmofit/web theme-classes`; `pnpm test` (music 30, web 1310, api 510); `pnpm --filter @ritmofit/api test:integration` (37 files, 211 tests); `pnpm --filter @ritmofit/web build`; `pnpm --filter @ritmofit/api openapi` with a clean `openapi.json` diff; `pnpm --filter @ritmofit/api contract-parity` (no untracked drift; 4 allowlisted cue fields); `pnpm audit:ci` (1 low and 1 moderate, both ignored).
- Skipped: browser and deploy. No web UI changed. Paste-a-link was not modified.

## Production as observed

Not checked from this environment. `origin/main` at session start was `15cf188`. This session did not probe the Worker or the SPA.

## Shared zones touched

- `packages/shared` class and plan-block schemas (`songBlocks`, `PLAYLIST_SONG_BLOCK_CAP`, `PLAYLIST_SONG_BLOCK_KEY`).
- `apps/api/openapi/openapi.json` and `apps/api/scripts/generate-openapi.ts`.
- `apps/api/src/lib/ordered-class-import.ts`, `apps/api/src/routes/class-tracks.ts`, `apps/api/src/routes/class-plan-blocks.ts`.
- No migration. `Dashboard.tsx` was not edited.

## Notes for other lanes / iOS

No run-payload change. A future plan-block reader treats `recipeBlockKey === "playlist_song"` as structure and ignores stored guidance until an instructor edit clears the key. iOS stays halted. Web must not send `songBlocks` until slice B.
