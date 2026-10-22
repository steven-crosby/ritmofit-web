---
date: 2026-10-22
tool: Cursor (cloud)
lane: lane-2-connect-failure
branch: cursor/r20261022a-lane2-connect-failure-01b3
head: 74f479dfb13d01b77690469f7fbc8832ebc18119
base: c466994c10813c8e1d4a34a05e229f1e5eda0c31
prs: ['#548 (draft)']
status: open
---

# Connect failure copy is in draft #548; merge stays with the orchestrator

## Done

- Trim an `Error` message in `useProviderConnect` and store that trim, or **Could not connect. Try again.** when the trim is empty.
- `new Error('')` and `new Error('   ')` show that sentence. **Cancel Apple Music connection** is absent. **Connect Apple Music** is enabled. **Consent cancelled.** and **did not finish** stay. A non-Error still uses the same fallback.
- Draft [PR #548](https://github.com/steven-crosby/ritmofit-web/pull/548). Product commit `74f479d`. Evidence: [lane 2](../../docs/audits/ui-ux-r20261022a/lane2-connect-failure/README.md).

## In flight

- Draft #548 is open for the orchestrator. This lane does not merge it.

## Next action

Orchestrator merges #548 on the round's merge train after lane 1 is ready. Do not merge from this lane. Do not deploy.

## Blockers and owner decisions

- None for this lane.
- Still with Steven, and not this lane: Live finish-control wording, and NotFound/ErrorBoundary `rf-hero-glow` warmth.

## Verification

- Run: before the edit, `use-provider-connect.test.tsx` was 2 failed / 7 passed. The failures were `new Error('')` (no alert, Cancel stayed) and `new Error('   ')` (blank alert). After, the file was 9/9. CI-equivalent gate passed 2026-10-22T17:30:42Z–17:32:42Z (music 30, web 1261, api 486, integration 196, OpenAPI diff empty). Local Chrome at 1440 showed “Could not connect. Try again.” for `new Error('')`. Cancel was absent. Connect Apple Music was enabled. No page errors.
- Skipped: 390 and native 200% (`NOT_ASSESSED`). Production probe (lane mode). Deploy.

## Production as observed

- Not checked from this environment.

## Shared zones touched

- none

## Notes for other lanes / iOS

- `errors.ts`, `ProviderConnectAction.tsx`, `LiveMode.tsx`, `Dashboard.tsx`, `ConnectionsDialog.tsx`, `runtime.ts`, `preview.ts`, `use-async-action.ts`, and `ordered-import.ts` were not edited. No schema, API, or OpenAPI change. iOS is unaffected.
