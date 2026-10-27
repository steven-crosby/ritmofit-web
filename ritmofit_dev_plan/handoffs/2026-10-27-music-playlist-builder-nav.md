---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/music-playlist-builder-nav-e29c
head: e0f9be52208f507dae25189c7395a01918858bc1
base: cbb849613e6928721c329f852688d5034d65b5b0
prs: ['#607 (open)']
status: open
---

# Music playlist create opens the class builder

## Done

- [#607](https://github.com/steven-crosby/ritmofit-web/pull/607) switches to Classes after a saved-playlist Start class succeeds, so the builder mounts. A failed playlist load still saves nothing and offers Try again. Not merged. Not deployed.

## In flight

- #607 is ready for review on `cursor/music-playlist-builder-nav-e29c`.

## Next action

Review and merge #607 when the gate is acceptable. Do not deploy it from this session.

## Blockers and owner decisions

- None.

## Verification

- Run: `vitest` on the playlist fetch-failure, import, and builder-navigation tests in `Dashboard.test.tsx` (3 passed). eslint and prettier on the two edited files.
- Browser: local Vite plus a local mock API, Chrome viewport 1280×800 and 390×844. Failed load stays on Music with Try again and creates nothing. Successful Start class opens the Warmup Ride builder.
- Skipped: full CI gate (API integration, OpenAPI, contract parity, audit, web build). No API, schema, or OpenAPI change.

## Production as observed

- Base is `cbb849613e6928721c329f852688d5034d65b5b0`, the production SHA named for this bug. This pull request is not deployed.
- Evidence: not checked from this environment (no Worker version or SPA hash read).

## Shared zones touched

- `apps/web/src/components/Dashboard.tsx` and its test. No schema, route, auth, or migration edits.

## Notes for other lanes / iOS

- None. The builder is still an in-app destination, not a new URL.
