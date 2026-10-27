---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/library-shell-f450
head: 567997b2ea118acaa3cdf164f2922f662397563f
base: 7163d71e6b6af99e6f3cca5645ea96f6fec915cb
prs: ['#601']
status: open
---

# Classes library shell is open for review

## Done

- Library shell on `#601`. Hero line and Ready to teach / Needs work tabs are gone from Classes. Cycle and Pilates templates, Recents rows, Jump back in, and the Create menu are in.

## In flight

- `#601` (`cursor/library-shell-f450`) is ready for review and is not merged. Do not deploy it from this branch.

## Next action

Review and merge `#601` before starting pull request C. C is Build a class and stretch. Do not start it until this shell is on `main`.

## Blockers and owner decisions

- `lastOpenedAt` is the Recents and Jump back in clock, and it is not written when a class is opened or when Live starts. Classes with a null timestamp sort by title. Recording that clock, including starting Live, needs a follow-up. This pull request does not add a schema or a Live change.

## Verification

- Run: web `vitest` for `library-shell`, `ClassesHome`, `CreateClassDialog`, and `Dashboard` — 195 passed. `pnpm --filter @ritmofit/web typecheck`, `theme-classes`, eslint on the touched web files, and prettier check on the touched files — passed.
- Skipped: full root gate (`pnpm test`, integration, `pnpm build`, OpenAPI, contract-parity, `pnpm audit:ci`) and browser smoke. The change is web-only and those suites were not required for this slice.

## Production as observed

- `main` vs production: unknown.
- Evidence: not checked from this environment.

## Shared zones touched

- `apps/web/src/components/Dashboard.tsx` (Classes home wiring only). No schema, migration, OpenAPI, auth, or route change.

## Notes for other lanes / iOS

- No shared contract change. iOS is unaffected.
