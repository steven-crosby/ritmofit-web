---
date: 2026-10-24
tool: Cursor (cloud)
lane: solo
branch: cursor/live-end-class-copy-ec99
head: 23f8f797a9b476bb651d8f4c5aaa014610e531b2
base: d5e7b7c6ee2e78533678b953078f213e9328c8ca
prs: ['#569 (draft)']
status: open
---

# Live finish wording is End Class; glow stays on the error screens

## Done

- Draft [#569](https://github.com/steven-crosby/ritmofit-web/pull/569) on `cursor/live-end-class-copy-ec99`. Product edit is `LiveMode.tsx`. Tests are `LiveMode.test.tsx` and `apps/web/smoke/narrow-width.smoke.mjs`. The player-rail line in `ritmofit_design_system/05-components.md` matches “Last song done”.
- The live header control reads End Class before and after the class ends. Same `onExit` handler. No confirmation. Preflight still says Exit. `ErrorBoundary` `resetLabel` stays “Exit live mode”.
- Finished class (`totalDurationMs > 0` and elapsed at the end): screen reader “That's the class — great ride.”, run-state label “Class complete” with the track suffix, compact status still “Complete”, music rail “Last song done” when playback has ended.
- `DEVELOPMENT_PLAN.md`: wording decided 2026-10-24; placement, style, and confirmation stay open. Missing-page and error screens keep `rf-hero-glow`. No glow code change.

## In flight

- [#569](https://github.com/steven-crosby/ritmofit-web/pull/569) is draft and unmerged. This session does not merge or deploy.

## Next action

Review and squash-merge #569 when the owner wants it on main. Do not deploy from this handoff.

## Blockers and owner decisions

- Placement, style, and whether End Class confirms are still open. Wording is decided.
- The climb cue’s stored move name is still Steven’s decision from the 2026-10-23 close. This session did not change that string.

## Verification

- Run: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `cd ritmofit_design_system && npm run verify`, `pnpm --filter @ritmofit/web theme-classes`, `pnpm test` (web 1310, api 496, music 30), `pnpm --filter @ritmofit/api test:integration` (200), `pnpm --filter @ritmofit/web build`, `pnpm --filter @ritmofit/api openapi` with no `openapi.json` diff, `pnpm --filter @ritmofit/api contract-parity`, `pnpm audit:ci`. All passed (audit reported two ignored vulnerabilities and exited 0).
- Screenshot: Chrome 390×844, local LiveMode preview, Run without music, timeline End. Header shows `CLASS COMPLETE · TRACK 1 OF 1` and End Class. Prompter-only rail reads Music off. “Last song done” is covered by the unit test, not that frame.
- Skipped: deploy and production probes.

## Production as observed

Not checked from this environment. HISTORY records production at main `7a505ae` (Worker `9b471c26-c62f-41b2-9788-6eb49c1353fa`). The Now block in `DEVELOPMENT_PLAN.md` still describes the earlier `ff24f46` deploy. This session did not rewrite that paragraph.

## Shared zones touched

None.

## Notes for other lanes / iOS

No contract change. A native client that copies this screen should use End Class on the in-class exit control, “That's the class — great ride.” for the finish announcement, “Class complete” for the run-state label, and “Last song done” when playback has ended. Preflight can keep Exit.
