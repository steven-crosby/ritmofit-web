---
date: 2026-10-25
tool: Cursor (cloud)
lane: solo
branch: cursor/playlist-import-duplicates-b189
head: 677ffb9
base: 2cfe4c00f317bde00aeae0a31422e95618dcb5e3
prs: ['#577 (draft)', '#578 (draft)']
status: open
---

# Class-level Add a playlist and duplicate-aware picker are in draft

## Done

- Draft [#577](https://github.com/steven-crosby/ritmofit-web/pull/577) on `cursor/add-playlist-on-any-class-b189` (`eb57e6c`). One **Add a playlist** button for every editable class, paste-a-link by default, append copy when the class already has songs, dismissible hint when a Cooldown label is no longer last. Not merged. Not deployed.
- Draft [#578](https://github.com/steven-crosby/ritmofit-web/pull/578) stacked on that branch (`677ffb9`). Songs already in the class, matched by provider plus provider track id from the loaded run payload, show **Already in class**, start unchecked, and are skipped by the 15-song pre-check. A playlist of 15 or fewer opens the picker only when a duplicate is present. Not merged. Not deployed.

## In flight

- [#577](https://github.com/steven-crosby/ritmofit-web/pull/577) then [#578](https://github.com/steven-crosby/ritmofit-web/pull/578). Merge 577 first. Do not merge from this handoff unless the owner asks. Do not deploy.

## Next action

Owner review of #577, then #578. After both merge, the real-browser smoke of paste-a-link on a class that already has songs (including a Cooldown that is no longer last, and a short playlist that contains a duplicate) is still owed. This session did not drive a browser.

## Blockers and owner decisions

- None. The 2026-10-25 append decisions are applied: always append, never auto-relabel Cooldown, duplicates unchecked by default but selectable, 15 cap per import, one class-level Add a playlist button.

## Verification

- Run: full gate on `eb57e6c` (#577), green. Web 1337, API unit 526, music 30, API integration 224. OpenAPI clean. Contract parity no untracked drift. `pnpm audit:ci` 2 ignored (1 low, 1 moderate).
- Run: full gate on `677ffb9` (#578), green. Web 1344, API unit 526, music 30, API integration 224. OpenAPI clean. Contract parity no untracked drift. Same audit result.
- Skipped: real-browser smoke and a live provider playlist.

## Production as observed

- Not checked from this environment. This session did not deploy. `origin/main` at start was `2cfe4c0`.

## Shared zones touched

- `Dashboard.tsx` and the class-level TrackSearch entry. No migration, OpenAPI, or shared-schema change. Run payload unchanged; duplicate detection only reads `providerRefs` already on it.

## Notes for other lanes / iOS

- Paste-a-link and saved-playlist Import all on a class that already has songs still commit `songBlocks: true` with existing placement ids in `orderedIds`. New blocks keep song-title labels. An existing Cooldown label stays put. iOS stays halted.
