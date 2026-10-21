# Builder failure copy — round r20261021b, lane 1

`Dashboard.tsx` now sends the 15 `(e|err|error) as Error).message` assignments through existing `errMessage`. `loadDetail` uses `errMessage(reason, 'Could not load this class.')`. A normal `Error` message stays. An empty `Error` or other non-message throw renders a fallback instead of a blank alert. Playlist and likes shelves still show “Playlists unavailable” and “Likes unavailable”. Account profile and connection failures still show the canned sentence and an `ACC-` / `CONN-` code. Reorder changes only the `setError` string; the assertive sentence stays fixed.

`apps/web/src/lib/errors.ts` was not edited. No schema, API, migration, or OpenAPI change.

## Verification

[Verification receipt](./verification.json) records the focused before/after runs and the CI-equivalent gate. On the previous `Dashboard.tsx`, 7 of the new tests failed and 6 passed. After the change, those 13 passed. The gate passed on 2026-10-21 from 17:07:47Z to 17:09:40Z: format, typecheck, lint, design-system verify, theme classes, root tests (music 30, web 1214, api 486), Worker/D1 integration (196), web build, OpenAPI with no diff, contract parity, and `pnpm audit:ci`.

[Browser receipt](./browser.json): local Chrome, signed-in Account save. Page fetch threw `new Error('')` on `PATCH /api/v1/auth/me`. The alert read “Profile was not changed” and “Something went wrong.” at 1440 and 390. It was not blank and did not say “undefined”. No page errors. `documentElement.scrollWidth` matched the viewport at both widths. Screenshots: [desktop](./save-1440.png), [390px](./save-390.png).

Native 200% zoom is **NOT_ASSESSED**. This lane did not zoom an isolated window. No provider audio, screen-reader, or device acceptance is claimed. Production was not checked. #533 was not resynced or merged. #532 was not deployed.

## Ownership

Product edits: `apps/web/src/components/Dashboard.tsx` and `Dashboard.test.tsx` only. The 2026-10-11 inspector handoff was not edited or deleted. Lane 2 files were not touched.
