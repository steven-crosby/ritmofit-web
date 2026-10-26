---
date: 2026-10-26
tool: Cursor
lane: lane-d-health-smoke
branch: cursor/health-d1-authed-smoke-48c4
head: 2b2ddf86b0d1b9d3a5ceda15e6dbc3d530b1a608
base: e01e96f4fe81b985bbbd3282e179e155384b5789
prs: ['#591 (open)']
status: open
---

# Health probes D1 and an authed smoke reads a gitignored QA token

## Done

- `GET /api/v1/health` runs D1 `SELECT 1`. A missing binding or a failed probe returns HTTP 503 with `status: "unavailable"` and `database: false`. `secrets` is booleans for required-secret presence and never values. A missing secret stays `false` and does not by itself change `status`.
- `apps/api/scripts/authed-production-smoke.ts` reads `apps/api/.qa-beta-token` (gitignore entry `apps/api/.qa-beta-token`). It checks `GET /api/v1/classes` and `GET /api/v1/providers/spotify/playlists` for 200 and prints status codes only.
- `ritmofit_dev_plan/deployment-runbook.md` gained only the section "Authed production smoke".

## In flight

- [#591](https://github.com/steven-crosby/ritmofit-web/pull/591) is open for review. Do not merge from this lane. Do not deploy. Do not delete the branch.

## Next action

Review and merge the health/smoke PR when CI is green. Before the first authed production run, create `apps/api/.qa-beta-token` locally with the dedicated QA beta account's `better-auth.session_token`. That account needs a working Spotify connection. Do not commit the file.

## Blockers and owner decisions

- The QA beta session token is not in this environment. The smoke script was not run against production.

## Verification

- Run: `pnpm --filter @ritmofit/api test` — 45 files, 549 tests, passed.
- Run: `pnpm --filter @ritmofit/api test:integration` — 40 files, 233 tests, passed.
- Run: `pnpm --filter @ritmofit/api exec tsc --noEmit` — passed.
- Run: Prettier check on the touched TypeScript and the runbook — passed. ESLint on the touched TypeScript — passed.
- Run: `pnpm --filter @ritmofit/api contract-parity` — no untracked drift. `apps/api/openapi/openapi.json` unchanged.
- Run: `pnpm --filter @ritmofit/api exec tsx scripts/authed-production-smoke.ts` with no token file — exit 1, prints the gitignored path, does not print a token.
- Skipped: full root gate (web tests, web build, design-system verify, theme-classes, audit:ci). No web, schema, or OpenAPI edits. Production smoke was not run.

## Production as observed

- Not checked from this environment. Assignment states production runtime is git `6ee1454`, Worker `64bf0d19`. `origin/main` at branch time was `e01e96f` (docs record #590), which is ahead of that runtime by the deploy record only.

## Shared zones touched

- `GET /api/v1/health` response shape and status code. No migration, authz helper, OpenAPI, or playlist-import/picker/nested-404 edits.

## Notes for other lanes / iOS

- Health is still not in OpenAPI. iOS run-payload contract-parity is unchanged. Another lane owns `scripts/deploy.sh` and the deploy steps in the runbook; this lane edited only "Authed production smoke".
