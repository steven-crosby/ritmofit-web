---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/upgrade-better-auth-ghsa-5a94
head: 6f0afd0f006ca2c4621c9aab36c00eb27c50a33e
base: 7c627eb8158fe4b9865d654f0c8445e57b89b774
prs: ['#637 (open)']
status: open
---

# better-auth 1.7.14 clears GHSA-q84f-53jg-9ppm; not deployed

## Done

- [#637](https://github.com/steven-crosby/ritmofit-web/pull/637) upgrades `better-auth` 1.6.25 → 1.7.14 in the API and the web app. Core auth tables are unchanged (1.7.3 restored the 1.6 account key). No migration, no auth-config change, no OpenAPI diff.

## In flight

- None after #637 is squash-merged. This file rides on that PR.

## Next action

Leave the bump undeployed until a deliberate deploy. Last recorded production is Worker `df90f169-a51d-4476-bb9a-d4fbf6ab3663`, tree `bf31706`. This session did not re-check production and did not deploy.

## Blockers and owner decisions

- None. Steven approved the upgrade on 2026-10-27.

## Verification

- Run: local CI-equivalent gate passed — format, typecheck, lint, design-system verify, theme-classes, unit tests (web 1493, api 569, music 30), integration 237, web build (entry 173.90 kB gzip), OpenAPI unchanged, contract-parity, `pnpm audit:ci` (GHSA-q84f-53jg-9ppm gone; two ignored esbuild advisories remain).
- Skipped: deploy.

## Production as observed

- `main` vs production: after #637 merges, main is ahead of the last recorded production tree `bf31706`.
- Evidence: not checked from this environment.

## Shared zones touched

- Auth dependency only. Drizzle auth tables, routes, OpenAPI, and authz helpers are unchanged.

## Notes for other lanes / iOS

- none
