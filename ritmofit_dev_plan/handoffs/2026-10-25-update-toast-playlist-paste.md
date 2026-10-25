---
date: 2026-10-25
tool: Cursor (cloud)
lane: solo
branch: cursor/fix-update-toast-and-playlist-paste-f8d6
head: 368be6d
base: 2b3a79c9fb966dd6b72093e9005ef40f4fb2c10c
prs: ['#582']
status: open
---

# Update toast reload and provider-agnostic playlist paste are ready for review

## Done

- `368be6d` on `cursor/fix-update-toast-and-playlist-paste-f8d6`. Reload now waits until the waiting service worker is activated, then reloads, and suppresses one resurrected "A fresh build is ready" prompt. The toast is pinned to the top at `z-40`. Paste-a-link uses a provider-agnostic placeholder and selects the chip from the pasted host. Not merged. Not deployed.

## In flight

- [#582](https://github.com/steven-crosby/ritmofit-web/pull/582), base `main`. Do not merge from this handoff unless the owner asks. Do not deploy.

## Next action

Owner review and squash-merge of [#582](https://github.com/steven-crosby/ritmofit-web/pull/582). A real-browser check after the next production deploy should confirm Reload now leaves the new shell without the toast, and that the toast does not cover Import.

## Blockers and owner decisions

- None.

## Verification

- Run: `pnpm --filter @ritmofit/web typecheck` pass. `eslint` on the touched files pass. `pnpm --filter @ritmofit/web test` pass, 1361 tests.
- Skipped: root format/lint, API unit, music, integration, web build, OpenAPI, contract parity, `audit:ci`. Web-only change; the owner asked for lint, typecheck, and tests. No browser pass — the toast needs a real service-worker update cycle.

## Production as observed

- Not checked from this environment. This session did not deploy. `origin/main` is `2b3a79c`.

## Shared zones touched

- `TrackSearch.tsx` paste field and `UpdatePrompt.tsx`. No migration, OpenAPI, or shared-schema change.

## Notes for other lanes / iOS

- Catalog search still opens on SoundCloud. Import still posts the raw playlist URL. iOS stays halted.
