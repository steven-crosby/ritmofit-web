---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/delete-class-4bc5
head: 41fa61e814590312833f5f775893ca9f50edfec1
base: e84aab7fdd11bfadf389ef5868ab688305fa8035
prs: ['#608']
status: open
---

# Class delete is open for review

## Done

- Delete is on the Recents row ⋯ menu, with confirm `Delete '<title>'? This can't be undone.`
- Confirm uses the existing `DELETE /classes/:id`. The class leaves Recents and the Live queue.
- The builder confirm, still under Class details, uses the same sentence.
- Cancel and Escape return focus to that row's ⋯ button.
- Rebased onto `main` after `#607` and `#605`. Git replayed the branch with no conflict markers. Live keeps the `#605` queue.

## In flight

- `#608` (`cursor/delete-class-4bc5`) is ready for review and is not merged. Do not deploy it from this branch.

## Next action

Review and merge `#608`. `#605` and `#607` are already on `main`. This branch is rebased on that tip.

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

- No shared contract change. iOS is unaffected. The Live queue on this branch is the `#605` rewrite.
