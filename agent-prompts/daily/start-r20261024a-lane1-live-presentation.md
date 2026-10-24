# Round r20261024a · Lane 1 — UI/UX presentation (Live Mode)

**The lane assignment already names the slice. This brief is that plan. Implement only what it lists.**

## 1. Git start state

- Checkout: `ritmofit-web` (this repo root) · branch `cursor/r20261024a-lane1-live-presentation-40e8` · HEAD `37ff20992169e309ade84945a79aef1b3ba6f3b0`
- Relationship to `origin/main`: equal at start (`37ff209`, detached HEAD was already that commit)
- Start command: `git fetch origin main && git switch -c cursor/r20261024a-lane1-live-presentation-40e8 origin/main`

Open drafts that also touch `LiveMode.tsx` / `LiveMode.test.tsx` and are not this lane: [#563](https://github.com/steven-crosby/ritmofit-web/pull/563) (countdown rounding, also `cue-list.ts`) and [#562](https://github.com/steven-crosby/ritmofit-web/pull/562) (cue-hold tie tests). Do not rebase onto them. Do not take their countdown-rounding or cue-list edits.

## 2. Round partition

This round's lane assignment, not the generic three-lane table:

| Lane | Owns |
| --- | --- |
| **1 (this lane)** | Live Mode presentation in `apps/web/src/components/LiveMode.tsx` and `apps/web/src/components/LiveMode.test.tsx`, plus this brief |
| **Other lanes** | Not assigned here. Treat every other product file as owned elsewhere |

## 3. Goal

Presentation-only slice on the existing Live contract. Quiet the Next-line clock, rename the choreography-queue interval, and measure whether the Cue-by-Cue view fits a 390×844 phone. Keep the 6.5rem hold countdown.

## 4. Your files

- `apps/web/src/components/LiveMode.tsx`
- `apps/web/src/components/LiveMode.test.tsx`
- `apps/web/src/components/LiveMode.preflight-header.test.tsx` only if a test there asserts the strings this slice changes (it does not today)
- This brief: `agent-prompts/daily/start-r20261024a-lane1-live-presentation.md`
- Lane handoff written at close: `ritmofit_dev_plan/handoffs/2026-10-24-r20261024a-lane1-live-presentation.md`

## 5. Other lanes own — do not touch

`apps/web/src/lib/cue-list.ts`, `apps/web/src/lib/cue-list.test.ts`, `apps/web/src/lib/ordered-import.ts`, `apps/web/src/lib/ordered-import.test.ts`, `apps/web/src/lib/playback/runtime.ts`, run-payload tests, `CuesSection` tests, and every file outside section 4.

## 6. Shared / frozen zones — coordinate, never edit solo

`packages/shared`, `apps/api/openapi/openapi.json`, migrations, design tokens, `ritmofit_dev_plan/HISTORY.md`, `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, `apps/web/src/lib/playback/runtime.ts`, the ordered-import tests, and the cue-list, run-payload, and CuesSection test files.

No shared-zone request. The Next-clock color uses the existing `text-text-secondary` utility. No token edit.

## 7. Out of scope

Countdown rounding ([#563](https://github.com/steven-crosby/ritmofit-web/pull/563)). Changing `TEACHING_COUNTDOWN_FONT_REM` (stays `6.5`). Shortening the climb cue. The long climb sentence is stored cue text, not a renderer bug. Community surfaces, music-provider behavior, schema, and deploy.

## 8. Orientation

Lane mode, 2026-10-24. `origin/main` is `37ff209`. Open PRs: #562 and #563, both draft; neither is this lane. Open handoffs that still owe something: 2026-10-11 inspector, short-viewport, and builder-refresh; 2026-10-13 Apple recovery (tabled); 2026-10-22 close; 2026-10-23 close (phone 390 frame and the stored climb sentence). None are stale (all under 14 days, or their follow-up is still open). Inbox is empty. `main` is ahead of the production commit recorded in HISTORY (`4cc4121`) by [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) and [#557](https://github.com/steven-crosby/ritmofit-web/pull/557). Production was not re-probed. No contract or iOS surface change.

## 9. Plan

Outcome: the Next-line clock uses `text-text-secondary`; the current choreography-queue interval reads `until next` with accessible name `Time until the next cue`; the 6.5rem countdown stays; `min-h-[42vh]` stays unless a real 390×844 fit check fails.

Exact files: `LiveMode.tsx`, `LiveMode.test.tsx`, this brief, the lane handoff.

Shared-zone requests: none.

Acceptance test: `LiveMode.test.tsx` expects `0:30 until next` and `Time until the next cue`, and the Next clock element carries `text-text-secondary`.

Verification: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @ritmofit/web build`. Fit check in a real browser at 390×844 (Playwright against the Live component and its CSS). One frame from the opening 15 seconds, if the browser can render it.

Risks: #562 and #563 also edit `LiveMode.test.tsx`; #563 also edits the countdown label lines in `LiveMode.tsx`. This lane stays off those lines. A later merge train has to reconcile them. The fit check is a local prompter fixture, not the production QA class.

## 10. Acceptance criteria and verification

1. Next-line clock class changes from `text-interactive` to `text-text-secondary`. The silence-gap "Time to next track" clock stays `text-interactive`.
2. The current queue interval suffix changes from `left` to `until next`. Its accessible name is `Time until the next cue`. Upcoming rows keep the `Duration` name. Tests match.
3. Real 390×844 fit check of Cue-by-Cue. Pass means, at scroll 0, the cue name, the 6.5rem countdown, and the hold bar are fully inside the viewport together, the upcoming list stacks under the hero, and the live shell has no horizontal overflow. Remove `min-h-[42vh]` only if that check fails. Record the result on the PR.
4. `TEACHING_COUNTDOWN_FONT_REM` stays `6.5`.
5. Capture a frame of the opening 15 seconds as a PR artifact when the browser can render the Live view.
6. Draft PR only. Do not merge or deploy. Do not push to `main`.

## 11. No-work exit

Not taken. The three presentation edits are safe and inside this lane's files.

## 12. Close

Lane mode: push, open one draft PR, write the handoff on this branch, do not merge.
