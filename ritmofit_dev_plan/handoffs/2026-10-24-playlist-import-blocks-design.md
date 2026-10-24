---
date: 2026-10-24
tool: Cursor (cloud)
lane: solo
branch: cursor/playlist-import-blocks-design-7e78
head: cacd7a583dd4d64fa594bb299ee18bdbe101d489
base: a78f6f50ee379f81625b8750c28e7fdc73c8be7f
prs: ['#571 (draft)']
status: open
---

# Playlist-import block design is drafted; nothing is implemented

## Done

- Draft [#571](https://github.com/steven-crosby/ritmofit-web/pull/571) records the 2026-10-24 owner decisions in `ritmofit_dev_plan/playlist-import-blocks-design.md` and moves the DEVELOPMENT_PLAN backlog item to decided.
- Findings 1 and 2 were re-checked on `a78f6f5`. The Apple end mechanism is #484 plus #488 and #494. Live at 200% is #486. Neither is part of this design.

## In flight

- [#571](https://github.com/steven-crosby/ritmofit-web/pull/571) is draft. Docs only. Do not merge it from this session, and do not deploy.

## Next action

Steven reviews the draft, including the two open questions (playlist-import cap versus every write, and whether URL paste stays deferred). Implementation starts only after that review: slice A (shared/API `songBlocks` commit, no migration), then slice B (picker and web import paths).

## Blockers and owner decisions

- Decided 2026-10-24 and quoted in the design: blocks only, warm-up/cooldown labels, empty-template replace, 15-song picker with no silent truncate.
- Still open in the design: whether 15 also caps manual adds, and whether URL paste must join slice B.

## Verification

- Run: `pnpm exec prettier --check --ignore-path=/dev/null ritmofit_dev_plan/playlist-import-blocks-design.md` (pass). `git diff` on `DEVELOPMENT_PLAN.md` is the backlog, index, and owner-decisions clause only.
- Skipped: root `pnpm format:check` (`.prettierignore` excludes `ritmofit_dev_plan/`; formatting that file reflows the whole plan), typecheck, lint, tests, build, OpenAPI, contract parity, integration tests, browser, deploy. No code changed.

## Production as observed

Not checked from this environment. `origin/main` at session start was `a78f6f5`. [#570](https://github.com/steven-crosby/ritmofit-web/pull/570) is an open docs PR recording a deploy of that SHA. This session did not probe the Worker or the SPA.

## Shared zones touched

None. The design names a later additive field on `importClassTracksSchema` and edits to `ordered-class-import.ts`, `Dashboard.tsx`, and `TrackSearch.tsx`. Those files are not changed here.

## Notes for other lanes / iOS

No run-payload change. A future plan-block reader treats `recipeBlockKey === "playlist_song"` as structure and ignores stored guidance until an instructor edit clears the key. iOS stays halted.
