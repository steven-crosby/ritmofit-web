# Round r20261024a · Lane 2 — UX correctness: pause during in-flight play

**Owner message for this lane is the confirmation for this slice.** Do not widen it.

## 1. Git start state

- Checkout: this `ritmofit-web` repo root · detached HEAD · `37ff20992169e309ade84945a79aef1b3ba6f3b0`
- Relationship to `origin/main`: equal (fetched 2026-10-24)
- Start command: `git fetch origin main && git switch -c cursor/r20261024a-lane2-pause-inflight-1c4f origin/main`
- Worktree was clean. Do not push to `main`. This lane does not merge or deploy.

## 2. Round partition

Owner-specified round, not the default three-lane cluster split. Lane 2 is UX correctness for one playback race. Another lane owns `apps/web/src/components/LiveMode.tsx`.

| Lane | Owns |
| --- | --- |
| **2 (this)** | Pause while `play()` is in flight. Test in `apps/web/src/lib/playback/runtime.test.ts`. Fix only if that test fails, and only in `apps/web/src/lib/playback/runtime.ts`, plus `apps/web/src/lib/playback/apple-music-adapter.ts` if the failure requires it. |
| **Other** | `LiveMode.tsx`. Open drafts [#562](https://github.com/steven-crosby/ritmofit-web/pull/562) and [#563](https://github.com/steven-crosby/ritmofit-web/pull/563) also touch `LiveMode.tsx`, `LiveMode.test.tsx`, `cue-list.ts`, and `cue-list.test.ts`. |
| **Frozen** | `packages/shared`, `apps/api/openapi/openapi.json`, migrations, design tokens, `ritmofit_dev_plan/HISTORY.md`, `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, ordered-import tests, cue-list tests, run-payload tests, CuesSection tests. Do not touch the `sampleTransport` 10s stall. |

## 3. Goal

Hardening. Audit first. When the user pauses while a `play()` call is still in flight, the run must end up paused. Music must not start after the pause.

`runtime.test.ts` already pauses a deferred fake adapter (`pause destroys an adapter still awaiting play acknowledgement`) and asserts destroy plus `paused`. That does not model a provider whose in-flight `play()` starts audio when it later resolves. Add one test that pauses during that in-flight play. If it passes, the draft PR contains only this brief and that test. If it fails, make the minimal fix in `runtime.ts`, and in the Apple Music adapter only if the failure requires it.

## 4. Your files

- `apps/web/src/lib/playback/runtime.test.ts` — new test (always)
- `apps/web/src/lib/playback/runtime.ts` — only if the new test fails
- `apps/web/src/lib/playback/apple-music-adapter.ts` — only if the new test still needs an adapter change
- `agent-prompts/daily/start-r20261024a-lane2-pause-inflight.md` — this brief (owner asked it on the PR)

## 5. Other lanes own — do not touch

- `apps/web/src/components/LiveMode.tsx`
- `apps/web/src/components/LiveMode.test.tsx`
- `apps/web/src/lib/cue-list.ts`
- `apps/web/src/lib/cue-list.test.ts`
- Ordered-import test files, run-payload test files, and CuesSection test files

## 6. Shared / frozen zones — coordinate, never edit solo

`packages/shared`, `apps/api/openapi/openapi.json`, `apps/api/src/index.ts` route mounting, migrations, `apps/api/src/lib/{authz,auth,db,errors,types}.ts`, design tokens, `HISTORY.md`, `DEVELOPMENT_PLAN.md`. No shared-zone request for this slice. `apps/api/scripts/generate-openapi.ts` is a hand-maintained manifest; this lane does not regenerate it.

The `sampleTransport` 10-second stall (including a read that stays in flight for 10s) is frozen even though it lives in `runtime.ts`.

## 7. Out of scope

Other clusters; migrations; deferred community surfaces; music-constraint violations (no provider audio cache, download, proxy, remix, or analysis). No Live Mode UI change. No deploy.

## 8. Orientation

`AGENTS.md` → `agent-prompts/daily/start-session.md` in Lane mode → this brief.

- Open PRs at start: drafts #562 and #563 only. Neither is this lane.
- Handoffs on `origin/main`: open files dated 2026-10-11 (Live short viewport, builder refresh, inspector checks), 2026-10-13 Apple recovery (tabled; do not resume the 5:18 / 10s stall), 2026-10-22 close, 2026-10-23 close. None assign this race. 2026-10-13 session cleanup is `status: closed`. None are older than 14 days with a closed PR branch as of 2026-10-24.
- `INBOX.md`: no open `- [ ]` items.
- `DEVELOPMENT_PLAN.md` Now still describes production at `4cc4121` / Worker `7a2d5773`. `origin/main` is `37ff209` (`#546`, `#557`, `#561` are on main). Those docs are frozen for this lane. Production was not checked (lane mode).
- Cross-surface: none. Pause-during-play stays inside the web playback coordinator.

## 9. Plan you must return before editing

- **Outcome:** a pause that arrives while `play()` is in flight leaves `CoordinatorStatus` `paused` after that `play()` settles, and the provider is not left audible.
- **Files:** `runtime.test.ts` plus this brief. `runtime.ts` and `apple-music-adapter.ts` only on a red test.
- **Shared-zone requests:** none.
- **Acceptance test:** start an Apple-backed run whose MusicKit `play()` stays pending; call `pause()`; resolve `play()` so a late completion would start audio; expect `paused`, no position publish, and silence after settlement.
- **Verification:** `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @ritmofit/api test:integration`.
- **Risk:** a late `play()` resolution can still apply audio if teardown only stops before the SDK call settles. Do not edit the 10s transport stall while touching `runtime.ts`.

## 10. Acceptance criteria and verification

- New test in `runtime.test.ts` pauses during an in-flight `play()`.
- After that `play()` resolves, status is `paused` and music has not started.
- Green test → draft PR is this brief and the test only.
- Red test → minimal `runtime.ts` fix; Apple adapter only if required.
- Gates in §9 before the draft PR. Draft until the orchestrator says otherwise. Do not merge. Do not deploy.

## 11. No-work exit

Not applicable up front: the owner named the test. If the test already passes, shipping the brief and the test is the exit, not an idle lane.

## 12. Close

Lane mode: push this branch, open a **draft** PR, do not merge. The orchestrator runs the merge train.
