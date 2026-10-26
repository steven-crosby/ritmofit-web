---
date: 2026-10-26
tool: Cursor (cloud)
lane: lane-b-class-id-404
branch: cursor/malformed-class-id-404-74fb
head: 040f56afbedb0a47542845de75b4098cc62625c6
base: 38bb2d843acf6436e1f33f4fa407462661f67cf1
prs: ['#589 (open)']
status: open
---

# Nested non-UUID class ids return JSON 404; #589 is open and not merged

## Done

- [#589](https://github.com/steven-crosby/ritmofit-web/pull/589) returns the JSON `404 NOT_FOUND` envelope for a non-UUID class id on nested `/api/v1/classes/:id/...` routes (GET, POST, DELETE, with or without a session). A real UUID still goes through `requireAccess`. Other `/api` misses are JSON too, so a text/plain 404 cannot leave the Worker. No migration, no OpenAPI change.

## In flight

- #589 is open, ready for review, not merged, not deployed. Branch `cursor/malformed-class-id-404-74fb`.

## Next action

Review and squash-merge #589 when CI is green. Do not deploy in this lane.

## Blockers and owner decisions

- None.

## Verification

- Run: `pnpm --filter @ritmofit/api typecheck`; eslint on the touched TypeScript files; prettier clean; `pnpm --filter @ritmofit/api test` (532 passed); integration `malformed-class-id`, `class-route-access`, `nested-resource-access` (22 passed). The new integration test failed on 401 before the guard.
- Skipped: full CI gate, OpenAPI regen, contract-parity (no run-payload or OpenAPI change). Not deployed.

## Production as observed

- `main` vs production: main is the docs commit `38bb2d8` recording the `5b006ec` deploy. API code on that base matches production `5b006ec` plus docs. Live Worker was not re-checked from this environment (production curl received a Cloudflare challenge).

## Shared zones touched

- Route mounting in `apps/api/src/index.ts`. No schema, migration, authz rule, or provider change.

## Notes for other lanes / iOS

- No contract change. Import copy, song picker, SPA shell, and the service worker were not edited.
