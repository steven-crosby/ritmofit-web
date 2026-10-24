---
date: 2026-10-24
tool: Cursor (cloud)
lane: lane-1-live-presentation
branch: cursor/r20261024a-lane1-live-presentation-40e8
head: e98c56fc781ca0720378d3e31d8d1cad9a76add6
base: 37ff20992169e309ade84945a79aef1b3ba6f3b0
prs: ['#564 (draft)']
status: open
---

# Live next clock and queue interval are quieter; 390×844 fit passed

## Done

- Draft [#564](https://github.com/steven-crosby/ritmofit-web/pull/564) on `cursor/r20261024a-lane1-live-presentation-40e8`. Product edit is `LiveMode.tsx` and `LiveMode.test.tsx`. The lane brief is on the same branch.
- Next-line clock uses `text-text-secondary`. Current queue interval reads `until next` with accessible name `Time until the next cue`. Hold countdown stays `6.5rem`.
- 390×844 Chrome fit check passed at elapsed `0:00` (name, `15s` countdown, and hold bar in the first viewport; upcoming list stacked under the hero; no horizontal overflow). `min-h-[42vh]` stays. Opening frame and queue frame are on the PR.

## In flight

- [#564](https://github.com/steven-crosby/ritmofit-web/pull/564) is draft and unmerged. Drafts [#562](https://github.com/steven-crosby/ritmofit-web/pull/562) and [#563](https://github.com/steven-crosby/ritmofit-web/pull/563) also edit `LiveMode.test.tsx`. #563 also edits the countdown label in `LiveMode.tsx` and `cue-list.ts`. This lane did not take those edits.

## Next action

The orchestrator reconciles #564 with #562 and #563, then runs the merge train. This lane does not merge or deploy.

## Blockers and owner decisions

- None new. Shortening the stored climb cue text remains Steven's decision from the 2026-10-23 close. This lane did not change that string.

## Verification

- Run: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test` (web 1300, api 496, music 30), `pnpm --filter @ritmofit/web build`. All passed.
- Fit: Chrome 390×844, local prompter fixture, scrollTop 0. Name top 206.5, countdown `15s` at 104px, bar top 418.1, upcoming top 662.1, shell overflow x 0. Pass. Pressing Play scrolled the shell 284px via existing transport focus; that sample was not the pass/fail.
- Skipped: OpenAPI, contract parity, integration tests, design-system verify, theme-classes, audit:ci, deploy, and production probes. The assigned gate was format, typecheck, lint, test, and the web build.

## Production as observed

Not checked from this environment. HISTORY still records production at main `4cc4121`. `origin/main` is `37ff209`, ahead of that record by [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) and [#557](https://github.com/steven-crosby/ritmofit-web/pull/557). No deploy from this lane.

## Shared zones touched

None.

## Notes for other lanes / iOS

No contract change. The Next-line clock is secondary text, and the current queue interval says "until next" / "Time until the next cue". The 6.5rem countdown is unchanged. Native clients that copy this presentation should check the same 390-wide first screen: name, countdown, and bar together without scrolling.
