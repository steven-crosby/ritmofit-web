---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/record-staged-deploy-2f76
head: 4e0b15096995c125b3941bf374a6a580e2ff52f8
base: 4e0b15096995c125b3941bf374a6a580e2ff52f8
prs: ['#631 (open)']
status: open
---

# Production is main `4e0b150` minus #629; #629 is held

## Done

- Staged production deploy of `4e0b150` with #629 held. Final Worker `05a49728-aa41-4113-ab52-948a62a091cc`, tree `04ec72f` (byte-identical to `121f5ba`). Rollback Worker `f2526ab0-d65e-462d-9d74-d4154df039d0`.
- Stage 1 Worker `751ea170-9482-440d-b002-47ac9affadda` (`361c935`, also without #617 and #621). Stage 2 Worker `f2526ab0-d65e-462d-9d74-d4154df039d0` (`810d26c`, #617 restored). No migration applied.

## In flight

- [#631](https://github.com/steven-crosby/ritmofit-web/pull/631) records the deploys. It is not merged, and it is not in the deployed tree.
- The local deploy branch `cursor/staged-deploy-4e0b150-2f76` was not pushed.

## Next action

Steven's iPhone Apple Music check for [#629](https://github.com/steven-crosby/ritmofit-web/pull/629) (`7ab9bbb`). Do not deploy #629 until he says so.

## Blockers and owner decisions

- #629 stays out of production until that iPhone check.

## Verification

- Run: local gate on `361c935` before stage 1 (format, typecheck, lint, unit web 1460 / api 557 / music 30, integration 235, web build with bundle budget, `pnpm e2e` 2 passed). Each stage then passed `scripts/deploy.sh` smoke: `/` and `/api/v1/health` 200 with `database: true` and six security headers; `/api/v1/classes`, `/explore`, `/teams` 401. Tails had no exceptions and no 5xx.
- Skipped: deploying #629.

## Production as observed

- `main` vs production: main `4e0b150` is ahead by #629, plus this docs commit once it merges. Production code is `4e0b150` minus #629.
- Evidence: Worker `05a49728-aa41-4113-ab52-948a62a091cc` at 100%. Served SPA `assets/index-1IADUpWL.js` and CSS `assets/index-DGcMUSRx.css`. Health 200, `database: true`.

## Shared zones touched

- none in this docs change. The deployed range includes `Dashboard.tsx`. The #617 revert was resolved by hand in `Dashboard.tsx` and `Dashboard.test.tsx`.

## Notes for other lanes / iOS

- #629's Apple Music mid-class failure copy and Live Offline mark are not in production.
