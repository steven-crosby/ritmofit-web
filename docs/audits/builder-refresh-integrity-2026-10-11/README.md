# Builder refresh integrity — 2026-10-11

Round `r20261011c`, Lane 2. Base `6691c9d73adaf71bd488f3b1293146c8a9925e85`.
Local implementation and synthetic verification only; no publication or production acceptance.

## Reproduced before product edits

Seven deferred-promise Dashboard cases ran against the unchanged baseline Dashboard source.
Five failed, while failed-reorder rollback/draft/focus/retry and same-workspace intensity flush passed.
See `before-fix.txt` (two baseline runs; the first had a multiple-match assertion later tightened).

- Successful reorder followed by failed detail read had no announced recovery or in-place read retry.
- A late failed silent read appeared after switching to a distinct class or closing to All classes.
- A prior workspace's successful mutation started a fresh detail read after A → B → A.
- An older silent success replaced last-known detail after a newer silent refresh failed. Source
  inspection also found unguarded card-summary writes; added coverage exercises their ownership.

Normal class-switch reducer coverage and standalone reorder rollback coverage already existed.
No general cast sweep, provider issue, or API defect was inferred from these results.

## Local correction

`Dashboard.tsx` assigns a fresh identity for each opened workspace. Silent mutation callbacks retain
that identity; obsolete callbacks are rejected before allocating a request. Every read completion
checks both current workspace identity and the newest allocated request before changing detail,
warning, focus, or Library-card aggregates. This includes older successes while a newer silent read
is pending/failed, for which the reducer alone cannot identify the newest request.

Failed post-save reads keep the existing workspace mounted and report saved state separately from
read recovery in a polite status. **Refresh class details** performs reads only. Successful recovery
clears only that warning, preserving unrelated mutation errors. Recovery focus is restored after
commit to an authoritative surviving row, or the dashboard heading if none remains. The reorder
list's effect may still contain old DOM rows during that commit, so restoration filters by the new
payload IDs.

Same-workspace inspector unmount intensity flush still saves and refreshes; leaving/reopening the
workspace suppresses its obsolete presentation callback without canceling the legitimate write.
Leaving for Music, All classes, a different class, or actual Live entry invalidates ownership; Live
exit establishes a new selected-workspace identity.

The warning uses existing caution/text/button/focus tokens and Sora typography. At narrow widths
its text occupies its own row above the 44px retry, preserving a readable creative workbench.
No new design-system pattern or token was introduced.

## Verification

- Focused Dashboard/reorder/reducer suites: **120 tests passed**. `after-fix.txt` retains the run.
  Added coverage includes adverse completion ordering, late card-summary writes, true A → B → A,
  Music departure, rejected reorder retry, unrelated-error isolation, StrictMode intensity flush,
  and retry focus when the selected track disappears.
- Full twelve-step local gate: **all final effective checks pass** in `full-gate.json`, including
  root unit tests (web 1161 and API 486) and 184 Worker integration tests. It retains initial failures
  and explicit affected reruns. The initial typecheck found new test typing/query
  issues, subsequently corrected. The initial default parallel unit run had seven timing failures
  across five suites while synthetic browser work overlapped; an exact default rerun with browser
  and other heavy work paused passed in 27.12 seconds versus the initial 66.7-second run. This is
  consistent with resource contention; it does not establish the exact cause of each timeout. No timeout/configuration or frozen-test edits.
- Chrome CDP measurement self-test: all **nine** token/gradient cases passed.
- Synthetic browser checks: **1440×1000 and 320×812 passed**. See `browser-checks.json` and the two PNGs.
  Both preserve the unsaved draft, selected track and grip focus through a post-save read failure;
  the warning and retry are visible and unobscured, retry height is 44px, and horizontal overflow is
  zero. Native ArrowDown initiates reorder; native Enter activates read retry. Recovery returns focus
  to the selected song; request receipts show one mutation and three track reads.
- Visual inspection corrected narrow text compression and a capture-scroll defect before final
  screenshots. Earlier tool attempts needed an Enter virtual-keycode and correct Tailwind cwd;
  their incomplete/styling-deficient captures were not accepted as product evidence.

## Reproduce the synthetic browser check

Use a dedicated browser profile/port and an orchestrator browser lease. From the repo root:

```bash
pnpm --filter @ritmofit/web tokens
node docs/audits/builder-refresh-integrity-2026-10-11/serve.mjs
# Dedicated Chrome CDP process must already be available on the selected CDP_PORT.
CDP_PORT=9238 node agent-prompts/browser-verification/selftest.mjs
CDP_PORT=9238 BUILDER_PORT=5186 node docs/audits/builder-refresh-integrity-2026-10-11/capture.mjs
```

`fixture.tsx` mounts the actual Dashboard in StrictMode and intercepts local API requests with
synthetic data. It never authenticates, changes production data, or exercises audio/provider playback.
`serve.mjs` uses installed workspace Vite and the web cwd so the actual app Tailwind/token styles load.
The retained capture uses the repository CDP driver without adding dependencies.

## Limits and next action

This evidence establishes local browser layout/focus and synthetic asynchronous ownership behavior.
It does not establish production/authenticated behavior, screen-reader speech, audible playback,
actual-device behavior, or native 200% browser zoom. Those existing acceptance obligations stay open.

Source, tests, evidence and handoffs are recorded in the owner-approved local lane commit; the
untracked planning brief is excluded. The lane remains unpublished. Next action: obtain push and PR
authority before publication. Merge, deploy, fixture deletion and worktree cleanup remain separately
unauthorized.
