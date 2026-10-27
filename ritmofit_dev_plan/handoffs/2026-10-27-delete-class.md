---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/delete-class-4bc5
head: 62d293eaa98012c189f437d5670d7e32ef13cfc6
base: cbb849613e6928721c329f852688d5034d65b5b0
prs: ['#608']
status: open
---

# Class delete is open for review

## Done

- Delete is on the Recents row ⋯ menu, with confirm `Delete '<title>'? This can't be undone.`
- Confirm uses the existing `DELETE /classes/:id`. The class leaves Recents and the Live queue.
- The builder confirm, still under Class details, uses the same sentence.

## In flight

- `#608` (`cursor/delete-class-4bc5`) is ready for review and is not merged. Do not deploy it from this branch.

## Next action

Review and merge `#608`. It shares `Dashboard.tsx` and `Dashboard.test.tsx` with `#605`. This branch is based on `main` and does not include the Live queue rewrite from `#605`.

## Blockers and owner decisions

- None.

## Verification

- Run: web `vitest` for `ClassesHome`, `ClassHeaderCard`, and `Dashboard` — 223 passed. API integration suite — 42 files passed, including `class-delete`. Web `tsc` and eslint on the touched files — passed.
- Browser: desktop and a 390px-wide window. Cancel kept Morning Climb. Confirm removed it from Recents and Live. Evening Ride stayed. `GET /classes` afterwards returned only Evening Ride.
- Skipped: full root gate (`pnpm format:check` on the whole repo, repo-wide `pnpm lint`, root `pnpm test`, contract-parity, `pnpm audit:ci`).

## Production as observed

- `main` vs production: aligned at `cbb849613e6928721c329f852688d5034d65b5b0`, as given for this session. Live Worker version was not checked from this environment.

## Shared zones touched

- `apps/web/src/components/Dashboard.tsx` (delete callback and the builder confirm sentence). No schema, migration, OpenAPI, auth, or route change. The delete route already existed.

## Notes for other lanes / iOS

- No shared contract change. iOS is unaffected. `#605` also edits `Dashboard.tsx` and `Dashboard.test.tsx`.
