# Builder refresh integrity — 2026-10-11

Round `r20261011c`, Lane 2. Base `6691c9d73adaf71bd488f3b1293146c8a9925e85`.
Original verified work is published in draft [PR #519](https://github.com/steven-crosby/ritmofit-web/pull/519)
at `7092c69164685d1d7648e3c90cdb57fbbd0d60a3`. The post-review P2 correction below is
prepared locally for the authorized follow-up commit/push and CI review. Neither phase establishes
production acceptance. Merge, deployment and cleanup remain unauthorized.

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

## Original verification at published head 7092c69

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

Draft PR #519 remains open for owner/orchestrator review. Steven authorized this P2 correction,
local verification, follow-up commit/push and CI review; root owns publication. The planning brief
remains excluded. No merge, deployment, fixture deletion or worktree cleanup is authorized.

## Post-review P2: reconcile Builder on return from Live

Review of `7092c69` reproduced a saved reorder whose follow-up read completed during actual Live
preflight: Exit remounted Builder with its old order, no warning and no new read. Five focused cases
failed before the correction: the held reorder read, intensity writes completing during Live and
after Exit, delayed return ownership, and truthful return-read recovery. `p2-before-fix.txt` preserves
both baseline attempts; an unconsumed one-shot mock was isolated before the second baseline run.

The correction separates a logical class-opening session from its current presentation owner.
Entering Live suspends the real Builder session and invalidates its old presentation. Exit creates
a fresh presentation in that session and silently reconciles authoritative detail. A legitimate write
completing after Exit can request a new read through that returning session; an old A → B → A callback
still cannot revive a different class-opening session. Read completions continue to require the exact
current presentation and latest request, including card summaries and warnings.

Three further failures were reproduced during review of the first correction: duplicate pending Run
live completions lost suspension, an obsolete A readiness result opened Live after B was selected,
and an obsolete overview request entered Live after Music navigation. Their first-correction source
hash and failure output are appended to `p2-before-fix.txt`. Live entry now belongs to a monotonic
request intent and captured presentation. Class/destination/Exit transitions invalidate old intents;
only the newest duplicate request may enter Live. OAuth-return Live entry uses the same intent check
and does not treat class data hydrated for the overview as a suspended Builder.

A collection-import retry had its own redundant read-generation guard. An import-specific baseline
reproduced the same post-Exit gap (second song absent) while its A → B → A rejection passed. That
callback now delegates logical-session validation to `loadDetail`, permitting a fresh read after a
legitimate returning-session commit while preserving unrelated-session rejection.

A failed return reconcile says **Back in Builder, but…**, while successful-mutation read failures retain
**Saved, but…**. Read retry keeps its original wording through another failure. Drafts typed after
return remain editable and survive recovery; this correction does not promise to preserve drafts
across the existing full-tree Live swap. The dashboard heading still receives Exit focus.

P2 regression coverage includes both delayed return success and rejection after switching to a distinct
class/song, a pending write superseding an older return read, same-session writes during/after Live,
duplicate readiness requests, stale different-class/overview requests, retained selection when Live
was opened from its overview, and direct OAuth Live return. Original draft/focus/error-isolation,
A → B → A and StrictMode same-workspace flush regressions remain intact.

- `p2-after-fix.txt`: final complete focused suite **134 passed** (Dashboard 125, existing reorder/
  reducer 9). Earlier first-correction and import-only runs are also retained.
- `p2-full-gate.json`: **all twelve P2 checks pass**, with unchanged source/test hashes during the
  gate. Exact root unit gate: web **1175**, API **486**, music **30**; Worker integration **184**.
  No timeout, worker-count or frozen-test substitution was needed.
- `p2-browser-checks.json`: **1440×1000 and 320×812 passed** through actual Live preflight and Exit,
  with `p2-desktop-live-return.png` and `p2-narrow-live-return.png`. One mutation, three logical reads,
  authoritative second-song/first-song order, restored heading focus, no warning/exception/overflow.
  Chrome CDP self-test passed all nine cases; screenshots were visually inspected. Dedicated browser
  and server processes were stopped before the full unit gate.
- `p2-source-sha256.json`: published baseline and candidate source/supporting identity.

The original fixture/scripts and original gate, browser and source-hash receipts are retained unchanged.
The additive `p2-capture.mjs` normalizes `sections=[]` and sequential offsets in memory, consumes the
fixture's one-shot failed-read seam, and holds a synthetic successful post-save response across Live.
No provider adapter, account, authentication, playback runtime, shared helper, style or API changed.
