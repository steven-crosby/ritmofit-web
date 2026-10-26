---
date: 2026-10-26
tool: Cursor
lane: solo
branch: cursor/secure-session-cookie-smoke-7a9f
head: 8ff8ef6fcc50e38100d29fed024f459845afbb2f
base: bc84c3b22f3a82066813bf05d28f96091add850d
prs: ['#597 (open)']
status: open
---

# Authed smoke sends the https session cookie name

## Done

- `sessionCookieHeader` sends `__Secure-better-auth.session_token` when the smoke base URL is https, and `better-auth.session_token` for http and localhost.
- `ritmofit_dev_plan/deployment-runbook.md` names both cookie names in Authed production smoke.

## In flight

- [#597](https://github.com/steven-crosby/ritmofit-web/pull/597) is open for review. Do not merge from this session. Do not deploy. Do not delete the branch.

## Next action

Review and merge #597 when CI is green. The next authed production smoke against `https://ritmofit.studio` needs this cookie name. Do not print `apps/api/.qa-beta-token`.

## Blockers and owner decisions

- None. The production 401-vs-200 cookie check was already done on Steven's Mac. This session did not read the token file and did not call production.

## Verification

- Run: `pnpm --filter @ritmofit/api exec vitest run src/lib/authed-smoke.test.ts` — 1 file, 12 tests, passed.
- Run: `pnpm --filter @ritmofit/api typecheck` — passed.
- Run: Prettier check on the touched TypeScript, the smoke script, and the runbook — passed. ESLint on the touched TypeScript and the smoke script — passed.
- Skipped: full root gate (web tests, web build, integration, OpenAPI, contract-parity, audit). No web, schema, or OpenAPI edits. Production smoke was not run.

## Production as observed

- `main` vs production: unknown.
- Evidence: not checked from this environment.

## Shared zones touched

- none

## Notes for other lanes / iOS

- none. The smoke client cookie name changed. Auth cookie issuance is unchanged.
