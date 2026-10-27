---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/music-tab-rework-eabc
head: 9774117f488b3de64494597147a7151db6722003
base: 7163d71e6b6af99e6f3cca5645ea96f6fec915cb
prs: ['#602 (open)']
status: open
---

# Music tab is a compact library on its own pull request

## Done

- [#602](https://github.com/steven-crosby/ritmofit-web/pull/602) replaces the Music source cards with service chips and a library for the selected service. No schema change. Not merged. Not deployed.

## In flight

- #602 is ready for review on `cursor/music-tab-rework-eabc`. Album shelves are omitted because no existing API lists albums. Recents keeps the service's returned order. `data-build-class-slot` on playlist and song rows is reserved for pull request C.

## Next action

Review #602. Do not merge it from this session, and do not start Build a class on this branch.

## Blockers and owner decisions

- None for this pull request. Pull request C still owns Build a class.

## Verification

- Run: web vitest for `music-library.test.ts` and `Dashboard.test.tsx` (174 passed), web typecheck, theme-classes, eslint, prettier. Phone and desktop screenshots are in the pull request.
- Skipped: full CI gate (API integration, OpenAPI, contract parity, audit). This change does not touch the API, schema, or OpenAPI.

## Production as observed

- Not deployed. Screenshots are local mock data.
