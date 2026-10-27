---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/library-shell-f450
head: 997eaeca0cedc5a0618f2519fe97be4a96a04d92
base: 7163d71e6b6af99e6f3cca5645ea96f6fec915cb
prs: ['#601']
status: open
---

# Classes library shell is open for review

## Done

- Library shell on `#601`. Hero line and Ready to teach / Needs work tabs are gone from Classes. Cycle and Pilates templates, Recents rows, Jump back in, and the Create menu are in.

## In flight

- `#601` (`cursor/library-shell-f450`) is ready for review and is not merged. Do not deploy it from this branch. The follow-up on this branch writes `lastOpenedAt` when a class is opened and when Live starts.

## Next action

Review and merge `#601` before starting pull request C. C is Build a class and stretch. Do not start it until this shell is on `main`.

## Blockers and owner decisions

- None. Opening a class and starting Live write the existing `last_opened_at` column. No new column and no Live screen change.

## Verification

- Run: web `vitest` for `library-shell`, `ClassesHome`, and `Dashboard` — 186 passed after the stamp. `class-opened` integration — passed. Web and API typecheck, eslint on the touched files — passed.
- Browser: desktop and 390px. Empty copy, two template tiles, no HIIT tile, no readiness tabs, Create menu, Needs music text, templates above the list, Create on screen. Opening Alpha ride and reloading put it ahead of the later-created Zebra ride.
- Skipped: full root gate (`pnpm test`, `pnpm build`, contract-parity, `pnpm audit:ci`).

## Production as observed

- `main` vs production: unknown.
- Evidence: not checked from this environment.

## Shared zones touched

- `apps/web/src/components/Dashboard.tsx` (Classes home wiring only). No schema, migration, OpenAPI, auth, or route change.

## Notes for other lanes / iOS

- No shared contract change. iOS is unaffected.
