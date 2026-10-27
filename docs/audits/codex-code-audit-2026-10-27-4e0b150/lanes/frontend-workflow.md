# Lane B — Frontend / instructor workflows

Reviewer B · audit-only · SHA `4e0b15096995c125b3941bf374a6a580e2ff52f8` · 2026-10-27 (UTC)

Status: **COMPLETE for the scope below** (browser verification not attempted; all reproductions are
jsdom/vitest in the disposable worktree `/tmp/wt-b`).

## Map (how the SPA is wired)

- No router and no query cache. `apps/web/src/App.tsx` gates on Better Auth `useSession()`.
  `apps/web/src/components/Dashboard.tsx` (6424 lines) holds every destination as component state
  (`destination`, `selected`, `live`). Nothing about the open class, track, or draft is in the URL or
  in storage.
- Builder detail: `loadDetail` (`Dashboard.tsx:396-478`) reads tracks + run-payload under a monotonic
  `detailRequestId` and a workspace-owner token. That part is well guarded.
- The builder has **several independent copies of the same rows**: the run-payload (timeline, rows,
  pulse), `TrackInspector` local field state (snapshotted at mount), and `CuesSection` /
  `MovesSection` / `SegmentBand` each fetching their own list once per mount. Most findings below are
  at the seams between those copies.
- Live: `LiveMode.tsx` + `lib/use-virtual-clock.ts` (performance.now deltas, 200 ms display
  throttle) + `lib/playback/runtime.ts` coordinator (Reviewer C seam).
- API client `lib/api.ts:96-99`: any 401 → `authClient.signOut()`.

## 1. Coverage

| Workflow / subsystem | Depth | Evidence | Gaps |
| --- | --- | --- | --- |
| Builder: track inspector save path | Traced + tested | `b-builder-lost-update` repro, `b-draft-loss` repro | Browser not run |
| Builder: timeline drag vs inspector / cue list | Traced + tested | `b-builder-lost-update` repro (B-1, B-2) | Pointer drag only proven via keyboard path (same `onCommit`) |
| Choreography edit (cues, placed moves) | Traced + tested | `b-anchor-precision` repro (B-3a/b) | Add path not re-audited beyond reading |
| Section bands (SegmentBand) | Traced + tested | `b-anchor-precision` repro (B-3c) | Drag path read only |
| Draft preservation on leave / Run / auth expiry | Traced + tested | `b-draft-loss` repro; `App.test.tsx:133` | Refresh/tab-close: code-only (no `beforeunload` anywhere in `src/`) |
| Classes library list / tag filter / paging | Traced + tested | `b-tag-filter-race` repro | — |
| Class detail out-of-order reads | Traced | `Dashboard.tsx:396-478`, existing Dashboard tests | Judged sound |
| Reorder optimistic update + rollback | Traced | `Dashboard.tsx:5307-5334` | Judged sound |
| Create class (dialog / playlist / likes) double submit | Traced | `Dashboard.tsx:1973-1987, 3644-3654, 3789`, `CreateClassDialog.tsx:66` | Judged sound |
| Ordered playlist import retry / recovery (`lib/ordered-import.ts`) | Sampled | read session storage keys + Dashboard call sites | Not traced end to end |
| Auth expiry mid-session | Traced | `lib/api.ts:96-99`, `App.tsx:63-98`, `lib/session-guard.ts`, `App.test.tsx` | Better Auth focus-refetch behaviour not verified |
| Routing / error boundaries | Traced | `App.tsx`, `Root.tsx`, `ErrorBoundary.tsx`, `Dashboard.tsx:1097-1105, 837` | — |
| PWA: prompted update, `/api/` denylist, stale-chunk recovery | Traced + built | `evidence/b-pwa-sw.log` (real `vite build` of the worktree), `vite.config.ts`, `UpdatePrompt.tsx`, `applyServiceWorkerUpdate.ts`, `lazyWithReload.ts` | Not exercised in a browser with a real deploy swap |
| Live Mode clock / countdowns / cue progression | Traced | `use-virtual-clock.ts`, `LiveMode.tsx:69-74, 600-633, 768-842` | Audible playback not verified (C) |
| Live Mode visibility / background | Traced (seam) | `LiveMode.tsx:600-633`, `runtime.ts:213-224, 321-328`, `use-wake-lock.ts` | Browser not run |
| Accessibility of core controls | Sampled | labelled sliders/buttons in `TimelineStrip.tsx`, `ChoreographyEditor.tsx`, axe in `e2e/smoke.spec.ts` | No AT run |
| Browse / music workspace (`MusicWorkspace`, shelves) | Sampled | `Dashboard.tsx:1863-2400` read for guards | Provider semantics are C's |
| Rehearsal surfaces (TrackPreview, ClassSummaryView) | Sampled | `TrackPreview.tsx:79-90` cancellation guard | Preview playback is C's |
| Explore / Teams / Share (deferred surfaces) | Not assessed | — | Out of D20/D21 focus |

What existing tests prove: the web suite is large and careful about focus, announcements and
request ordering (`Dashboard.test.tsx` 4830 lines; `LiveMode.test.tsx` 3482). It proves the
inspector preserves an *untouched* sub-second anchor **within its own form**
(`Dashboard.test.tsx:2802-2803`), but nothing exercises two builder surfaces editing the same row, an
edit-form round-trip of a sub-second cue/move/section anchor, or leaving the builder with a dirty
draft. Targeted baseline suites are green at HEAD (`evidence/b-baseline-targeted.log`, 141 tests).
`e2e/smoke.spec.ts` (160 lines) is **not run in CI** (`.github/workflows/ci.yml` has no e2e step; it is
only `pnpm e2e`). It covers sign-up → empty class → add one song + one cue → Live prompter-only
(“Run without music”) → End Class, plus axe and overflow checks at two viewports. It proves no
provider playback, no service worker, no edit/re-edit of choreography, and no draft or session-expiry
paths.

## 2. Candidate ledger

| ID | Issue | Location | Impact | Status |
| --- | --- | --- | --- | --- |
| B-1 | Inspector Save reverts a timeline move of the same track's start | `Dashboard.tsx:5644, 5839-5848, 5868, 4527-4533` | Silent choreography/timing loss | **Confirmed** (repro) |
| B-2 | Cue/move edit reverts a timeline marker re-time (stale per-mount list) | `ChoreographyEditor.tsx:443, 512-531, 562-570, 1177-1181`; `Dashboard.tsx:4519-4525` | Silent cue timing loss | **Confirmed** (repro, cues; moves by identical code) |
| B-3 | Editing a cue/move/section re-rounds an untouched anchor to whole seconds and re-snaps it (one beat early at 128 BPM) | `ChoreographyEditor.tsx:94-100, 540, 563, 1153, 1178`; `lib/duration.ts:25-30`; `SegmentBand.tsx:536-552` | Silent choreography drift on routine edits | **Confirmed** (repro) |
| B-4 | Unsaved inspector typing is dropped on Back, top-nav, and Run live → Exit, with no prompt | `Dashboard.tsx:552-558, 914-923, 824, 5701` | Lost instructor input | **Confirmed** (repro) |
| B-5 | Session expiry mid-edit swaps Dashboard for Login; the edit whose Save hit the 401 is lost and the class is not reopened | `lib/api.ts:96-99`; `App.tsx:63-98` | Lost input + context on auth expiry | **Confirmed** (code + `App.test.tsx:133`) |
| B-6 | Tag-filter / load-more responses are unguarded; out-of-order replies show another filter's classes | `Dashboard.tsx:321-366` | Wrong list under a pressed chip | **Confirmed** (repro) |
| B-7 | “End Class” exits Live in one tap, no confirm; re-entry restarts preflight at 0:00 | `LiveMode.tsx:1151-1156`; `Dashboard.tsx:481-493`; `LiveMode.tsx:479-481, 724` | Live class interruption from a mis-tap | Confirmed (code); severity is a product call |
| B-8 | Live countdowns use `Math.round`, so “0:00” shows ~0.5 s before the event | `LiveMode.tsx:69-74, 1587, 1783, 1842, 1851` | Instructor count-ins off by half a second | Confirmed (code + arithmetic) |
| B-9 | Free-mode silence gap is advanced only by host rAF; a hidden tab does not start the next song until visible | `LiveMode.tsx:600-633`; `runtime.ts:213-224, 321-328` | Missed song start in gaps when backgrounded | Probable (code path; joint seam) |
| B-10 | `lazyWithReload` one-shot guard is re-armed by any other chunk's success, so the guard does not stop repeat reloads; header comment still says `autoUpdate` | `lib/lazyWithReload.ts:3-46` | Repeated reloads instead of the boundary (rare: all chunks precached) | Hypothesis (P3) |
| B-11 | Fonts are not in the precache manifest | `evidence/b-pwa-sw.log` (17 entries, no `fonts/`) | Offline Live may render fallback faces | Hypothesis (P3) |
| B-R1 | Sign-out on every 401 could log users out on provider auth failures | `lib/api.ts:99` | — | Rejected (server 401 is session-only: `apps/api/src/middleware/auth.ts:18`, `routes/auth.ts:42`) |
| B-R2 | SW navigation fallback swallowing `/api/` callbacks | `vite.config.ts:20`; built `dist/sw.js` | — | Rejected (denylist present in the generated SW) |
| B-R3 | Prompted update path auto-reloads / never reloads | `UpdatePrompt.tsx`, `applyServiceWorkerUpdate.ts` | — | Rejected (prompt mode, no `clientsClaim`, waits for `activated`; tested) |
| B-R4 | Stale class-detail response overwrites a newer class | `Dashboard.tsx:405-429` | — | Rejected (owner + request-id guards) |
| B-R5 | Reorder optimistic state not rolled back | `Dashboard.tsx:5307-5334` | — | Rejected |
| B-R6 | Duplicate class creation from double submit | `Dashboard.tsx:1973-1987, 3789`; `CreateClassDialog.tsx:66` | — | Rejected (busy guards) |
| B-R7 | Prompter clock drifts while the tab is backgrounded | `use-virtual-clock.ts:87-95` | — | Rejected (wall-clock delta, catches up on next frame) |

## 3. Accepted findings

### B-1 — Inspector Save silently reverts a timeline move of the same track

- **Category:** data integrity / lost update · **Severity:** P1 · **Confidence:** high · **Status:** Confirmed
- **Refs:** `apps/web/src/components/Dashboard.tsx:5644-5646` (`startAt` seeded once at mount);
  `:5568-5572` (`parseInspectorAnchor` compares against the *refreshed* stored value);
  `:5839-5848, 5868` (Save always sends `startOffsetMs` in free mode); `:4527-4533` (timeline
  `onMoveTrack` PATCHes `startOffsetMs` then silent-refreshes); `:4488-4545` and `:4682-4685` (timeline
  and inspector are rendered at the same time; the inspector is keyed by track id, so a refresh does
  not re-seed it).
- **Trigger:** free-placement class → select a track → Show timeline → drag (or arrow + Enter) that
  track's block → then make any inspector edit (notes, BPM, …) and Save.
- **Expected:** the notes save; the track stays where it was dragged.
- **Observed:** the inspector still shows the pre-drag “Start at”, and the Save PATCH re-sends it. The
  drag is reverted with no message. Repro log: drag commits `startOffsetMs: 65000`; inspector shows
  `1:00`; the notes Save sends `startOffsetMs: 60000`; server ends at 60000.
- **Impact:** an instructor arranging a free-mode class loses timeline placement whenever they touch
  the inspector afterwards. Since the timeline re-renders from the server value right after the save,
  the block jumps back, so it looks like the drag “didn't take”. The same snapshot pattern covers
  `clipStart`, `clipEnd`, `downbeat` and `notes`, but in this build the only other writer of those
  columns is the inspector itself.
- **Evidence:** `repro/b-builder-lost-update.repro.test.tsx` (B-1), `evidence/b-builder-lost-update.log`.
- **Test-coverage limits:** `Dashboard.test.tsx:2802-2803` covers untouched sub-second anchors inside one
  inspector session only; no test edits the same row from two surfaces.
- **Counterevidence:** `dirty` is false right after the drag (draft == savedDraft), so Save is
  disabled until another field changes. That narrows the trigger but does not remove it.
- **Remediation direction:** send only the fields the instructor changed (diff against the mount
  snapshot), or re-seed the untouched fields when `track` changes underneath a clean field. Longer
  term, keep one client-side source for class-track rows instead of per-component copies.
- **Acceptance checks:** the B-1 repro passes; a drag followed by a notes save keeps the new start; a
  dirty “Start at” still wins over a concurrent drag (decide and test which wins).
- **Overlap #625/#596:** none.

### B-2 — Cue / placed-move edit silently reverts a timeline marker re-time

- **Category:** data integrity / stale cache · **Severity:** P1 · **Confidence:** high · **Status:** Confirmed
- **Refs:** `apps/web/src/components/ChoreographyEditor.tsx:443` (`cues` local state),
  `:512-531` (load effect depends only on `classTrackId`), `:533-543` (`startEdit` seeds from that
  list), `:562-570` (`saveEdit` always sends `anchorMs`); moves: `:929, 985-993, 1151-1153, 1177-1181`;
  `apps/web/src/components/Dashboard.tsx:4519-4525` (marker drag → `updateCue`/`updatePlacedMove` →
  `onTrackChanged`, which refreshes the run-payload only); `:6236-6262` (sections get no refresh signal).
- **Trigger:** select a track → Show timeline → drag a cue marker → in the inspector, Edit that cue
  and change only its text → Save.
- **Expected:** the text changes; the cue stays at its dragged time.
- **Observed:** the inspector list still shows the old time (`0:10`), and the text-only Save sends
  `anchorMs: 10000`. The drag to 11000 is reverted.
- **Impact:** same as B-1, for the choreography itself. The inspector cue list also shows wrong times
  after any timeline drag until the track is reselected.
- **Evidence:** `repro/b-builder-lost-update.repro.test.tsx` (B-2), `evidence/b-builder-lost-update.log`.
  Moves were not separately executed; `MovesSection` has the identical load/startEdit/saveEdit shape.
- **Test-coverage limits:** `CuesSection.test.tsx` / `MovesSection.test.tsx` render the section in
  isolation; nothing combines them with `TimelineStrip`.
- **Counterevidence:** none found. `onChanged` flows only inspector → Dashboard, never back down.
- **Remediation direction:** re-read the section list when the parent payload changes (a revision
  prop), or derive the list from the run-payload; send `anchorMs` only when the field was edited.
- **Acceptance checks:** B-2 repro passes; the inspector list reflects a marker drag without
  reselecting; a moves variant of the repro passes.
- **Overlap #625/#596:** none.

### B-3 — Editing a cue, move, or section moves its untouched anchor (second rounding + re-snap)

- **Category:** time-unit precision / data integrity · **Severity:** P1 · **Confidence:** high · **Status:** Confirmed
- **Refs:** `apps/web/src/lib/duration.ts:25-30` (`formatClockFromMs` rounds to whole seconds);
  `apps/web/src/components/ChoreographyEditor.tsx:540` / `:1153` (edit field seeded with that string);
  `:94-100` (`useBeatSnap` defaults **on** whenever a BPM is known); `:563` / `:1178` (Save always sends
  `maybeSnap(parsedField)`); `apps/web/src/components/SegmentBand.tsx:536-552` (same for sections, no
  snap).
- **Trigger:** open Edit on an existing cue/move/section whose stored time is not a whole second (any
  beat-snapped anchor, any marker drag, any track-edge-snapped section), change only the
  text/intensity/type, Save.
- **Expected:** anchor unchanged.
- **Observed (repro):** a 128 BPM cue at 10313 ms (bar 6, beat 3, created by the app's own snapping)
  is saved at **9844 ms, one beat earlier**. A move at 12750 ms becomes 13000. A section at 241500 ms
  (aligned to a track start) becomes 242000, so it stops lining up with the track edge.
- **Impact:** with snapping on by default, most stored anchors are sub-second. A routine text fix moves
  the cue on screen and in Live, where it is announced a beat early or late. Nothing tells the
  instructor this happened. The inspector already guards against this for track fields
  (`parseInspectorAnchor`, `Dashboard.tsx:5568-5572`); the choreography editors do not.
- **Evidence:** `repro/b-anchor-precision.repro.test.tsx`, `evidence/b-anchor-precision.log`.
- **Test-coverage limits:** existing CuesSection/MovesSection/SegmentBand tests create anchors from
  whole-second `m:ss` input only.
- **Counterevidence:** none. Snapping a value the instructor actually typed is intended; re-snapping an
  untouched one is not.
- **Remediation direction:** keep the stored ms in edit state and send `anchorMs`/`startOffsetMs` only
  when the field text differs from its seeded value (the `parseInspectorAnchor` pattern); snap only
  edited values.
- **Acceptance checks:** all three B-3 repro tests pass; editing the time field still parses and snaps
  as today.
- **Overlap #625/#596:** none.

### B-4 — Unsaved inspector typing is dropped when leaving the builder

- **Category:** draft preservation · **Severity:** P2 · **Confidence:** high · **Status:** Confirmed
- **Refs:** `Dashboard.tsx:5686-5701` (draft/dirty is component-local), `:5751-5761` (only the
  intensity zone is flushed on unmount), `:552-558` (`closeBuilder`), `:914-923` (top-nav), `:824`
  (`if (live) return` swaps the whole tree, so `ClassWorkspace` unmounts on Run live). No
  `beforeunload` handler exists anywhere in `apps/web/src`.
- **Trigger:** type into Creator notes (or BPM/RPM/duration/clip fields) → Back to Classes, or any
  top-nav destination, or Run live → Exit; also refresh or tab close.
- **Expected:** keep the draft, save it, or at least ask first. The UI itself says “Unsaved typing —
  press Save or Enter to keep it.”
- **Observed:** all three leave paths drop the text without saving or prompting
  (`[B-4a/b/c] notes … ""`, `updateClassTrack` never called). After Exit from Live, the inspector is
  closed as well.
- **Impact:** lost instructor work in the main creative loop. Run live from the builder is a very
  natural “try it” step.
- **Evidence:** `repro/b-draft-loss.repro.test.tsx` (asserts the observed loss; green = defect
  present), `evidence/b-draft-loss.log`. Refresh/tab-close: code-only.
- **Test-coverage limits:** `Dashboard.test.tsx:3074` proves the draft survives in-workbench toggles
  only.
- **Counterevidence:** the dirty indicator is visible and keyboard Save exists. The ErrorBoundary copy
  admits unsaved changes may be lost, but that copy is for crashes.
- **Remediation direction:** flush or confirm on unmount when `dirty` (the zone path already flushes);
  guard Run live and nav on dirty; add `beforeunload` while dirty; optionally keep drafts in
  `sessionStorage` keyed by class-track id.
- **Acceptance checks:** B-4 tests flip to “draft kept or prompted”; a refresh with a dirty inspector
  prompts.
- **Overlap #625/#596:** none.

### B-5 — Session expiry mid-edit discards the edit and the open class

- **Category:** auth expiry / data loss · **Severity:** P2 · **Confidence:** high (code), medium (frequency) · **Status:** Confirmed
- **Refs:** `apps/web/src/lib/api.ts:96-99` (401 → `authClient.signOut()`); `apps/web/src/App.tsx:63-98`
  (outside Live a null session renders `<Login statusNotice="Your session ended…">` in place of
  `Dashboard`); `apps/web/src/App.test.tsx:133` asserts that swap.
- **Trigger:** cookie expires or is revoked while the instructor has typed edits. Their next Save (or
  any background request) gets a 401.
- **Expected:** keep the draft and ask the instructor to sign in again, then retry, or reopen the
  class after sign-in.
- **Observed (code):** the 401 response triggers sign-out, the Dashboard unmounts with every local
  draft (including the payload of the Save that failed), and after signing in the instructor lands on
  the Classes home.
- **Impact:** worst-case version of B-4, in a long editing session. Live is protected (`session-guard`);
  the builder is not.
- **Evidence:** code path above; App-level test proves the unmount. Not run in a browser.
- **Remediation direction:** treat the builder like Live: keep the Dashboard mounted with a
  re-auth overlay, or persist dirty drafts and the open class id before signing out.
- **Acceptance checks:** a 401 on inspector Save leaves the typed text recoverable after sign-in.
- **Overlap:** #625 adds an App test for explicit Sign out during Live; it does not cover this path.

### B-6 — Out-of-order class-list responses show the wrong filter

- **Category:** stale / out-of-order responses · **Severity:** P3 · **Confidence:** high · **Status:** Confirmed
- **Refs:** `Dashboard.tsx:321-334` (`refreshClasses` has no generation), `:337-345` (`applyTagFilter`),
  `:347-366` (`loadMoreClasses` appends a page and cursor even if the filter changed meanwhile).
- **Trigger:** click `#hiit` then `#yoga`, and the `hiit` response arrives last.
- **Observed:** `#yoga` is pressed and the list shows “Hiit ride”.
- **Evidence:** `repro/b-tag-filter-race.repro.test.tsx`, `evidence/b-tag-filter-race.log`.
- **Remediation direction:** a request id like `detailRequestId`; drop load-more results whose tag no
  longer matches.
- **Acceptance checks:** repro passes. **Overlap:** none.

### B-7 — End Class exits Live in one tap

- **Category:** Live Mode safety / UX · **Severity:** P2 (product call) · **Confidence:** high · **Status:** Confirmed (code)
- **Refs:** `LiveMode.tsx:1151-1156` (`onClick={onExit}`), `Dashboard.tsx:481-493` (`exitLive` tears
  down Live), `LiveMode.tsx:479-481, 711-725` (re-entry starts in preflight and `coordinator.start(0)`).
- **Trigger:** a mis-tap on the 44 px header button mid-class.
- **Observed:** music stops, provider SDKs are destroyed, and the position is lost; getting back means
  Run live → preflight → Start → seek.
- **Remediation direction:** confirm when the class has started and is not ended, or offer a timed
  “Resume class” that restores the clock position.
- **Overlap:** none. The e2e smoke clicks End Class and expects the builder immediately, so any confirm
  needs that test updated.

### B-8 — Live countdowns reach 0:00 about half a second early

- **Category:** time-unit presentation · **Severity:** P3 · **Confidence:** high · **Status:** Confirmed (code)
- **Refs:** `LiveMode.tsx:69-74` (`fmt` uses `Math.round`) used for Next/gap/track/class remaining at
  `:1587, :1783, :1842, :1851`; display tier throttled at 200 ms (`use-virtual-clock.ts:16, 76-83`).
- **Observed:** remaining 0.49 s renders “0:00” while the current cue is still showing; each second
  digit flips 0.5 s early. Count-ins read off the screen are early by up to half a second.
- **Remediation direction:** `Math.ceil` for remaining-time countdowns (keep rounding/floor for
  elapsed), plus a boundary test.

### B-9 (Probable, joint seam) — silence gaps are only advanced by rAF

- See the joint-seam section. Severity P2 if confirmed in a browser (free-mode classes only).

## 4. Joint seam (frontend clock ↔ playback coordinator) — notes for Reviewer C

- **Silence gaps depend on rAF (B-9).** In music mode the host loop runs only when
  `playback.kind === 'silence'` (`LiveMode.tsx:600-633`). `RuntimePlaybackCoordinator.tick`
  (`runtime.ts:213-224`) is the only thing that leaves a silence segment (`:321-328`). rAF stops in a
  hidden tab, so a free-mode gap does not end while the tab is backgrounded. On return the clock jumps
  (wall-clock delta) and the next song starts late, partway in. Song→song transitions use
  `sampleTransport` timers instead and are not affected. Browser check needed: tablet app switch
  during a 10 s gap.
- **Position source split.** Inside songs the clock follows provider `onPosition` (`syncPosition`), and
  `seek`/pause bank `clockStore.getSnapshot()`. On every `paused/ended/idle/silence/error` status the
  clock is re-seeked to the raw snapshot (`LiveMode.tsx:695-707`). That looks consistent. I did not
  check how often adapters emit position (C's side).
- **Session loss during Live.** Live stays mounted (`session-guard`), but the Spotify playback-token
  fetch also signs out on 401 (`api.ts:335`). After a lost session, the next token refresh fails, so
  Spotify playback stops at token expiry even though Live UI stays up. The adapter's reaction to that
  error belongs to C.
- **Display throttle vs cue switch.** Cue/teaching selection reads the 200 ms throttled `elapsedMs`,
  so a cue becomes current up to ~200 ms after its anchor. Combined with B-8 the visible count-in and
  cue change can disagree by ~0.7 s in the worst case. Acceptable for teaching, but it should be
  documented.
- **Prompter-only mode** is wall-clock based and does not drift in the background (B-R7).

## 5. Commands and exit codes

| # | Command (cwd) | Exit | Notes |
| --- | --- | --- | --- |
| 1 | `git -C /workspace worktree add /tmp/wt-b HEAD` | 0 | detached at 4e0b150 |
| 2 | `pnpm install --frozen-lockfile --offline` (`/tmp/wt-b`) | 0 | `/tmp/wt-b-install.log` |
| 3 | `pnpm tokens` (`/tmp/wt-b/apps/web`) | not captured | output discarded; later vitest/vite runs succeeded |
| 4 | `npx vitest run src/components/b-builder-lost-update.repro.test.tsx` | 1 | 2/2 fail = B-1, B-2 confirmed |
| 5 | `npx vitest run src/components/b-anchor-precision.repro.test.tsx` | 1 | 3/3 fail = B-3 confirmed |
| 6 | `npx vitest run src/components/b-draft-loss.repro.test.tsx` | 0 | asserts observed loss (B-4) |
| 7 | `npx vitest run src/components/b-tag-filter-race.repro.test.tsx` | 1 | 1/1 fail = B-6 confirmed |
| 8 | all four repro files together | 1 | 6 failed, 3 passed (`evidence/b-repro-all.log`) |
| 9 | targeted baseline: CuesSection, MovesSection, SegmentBand ×2, TimelineStrip ×2, use-virtual-clock, lazyWithReload, pwa-config, applyServiceWorkerUpdate | 0 | 10 files, 141 tests (`evidence/b-baseline-targeted.log`) |
| 10 | `npx vite build` (`/tmp/wt-b/apps/web`) | 0 | SW inspection only (`evidence/b-pwa-sw.log`); not the gate build |
| 11 | `gh pr view 625/596`, `gh pr diff 625` | 0 | overlap check |
| 12 | `git -C /workspace status --porcelain` | 0 | only the audit dir untracked |

The repro files are copied to `repro/b-*.repro.test.tsx`. The exact patch that adds them under
`apps/web/src/components/` is `repro/b-repro-tests.patch` (apply in a worktree, then run
`npx vitest run src/components/b-*.repro.test.tsx` from `apps/web`).

## 6. Rejected / downgraded appendix

- **B-R1 401 → sign-out over-broad:** the API returns 401 only from the session middleware
  (`apps/api/src/middleware/auth.ts:18`, `apps/api/src/routes/auth.ts:42`); provider auth failures use
  `REAUTH_REQUIRED` codes. Rejected.
- **B-R2 `/api/` navigation fallback:** the generated `dist/sw.js` contains `denylist:[/^\/api\//]` on
  the `NavigationRoute`. `wrangler` also has `run_worker_first = ["/api/*"]`. Rejected.
- **B-R3 prompted update:** `registerType: 'prompt'`, one SKIP_WAITING listener, no `clientsClaim`;
  `applyServiceWorkerUpdate` waits for `activated` before reloading, and `UpdatePrompt` sits outside
  the ErrorBoundary. Rejected. Stale-chunk risk is low because all 13 JS/CSS chunks are precached.
- **B-R4 class detail out-of-order:** owner session + `detailRequestId` guard every presentation
  effect. Rejected.
- **B-R5 reorder rollback:** busy-guarded, restores `prev` on failure, and an assertive announcement
  covers keyboard reorders. Rejected.
- **B-R6 duplicate create:** all three create paths gate on in-flight state. Rejected.
- **B-R7 background drift (prompter-only):** `tick` uses `performance.now()` deltas from the segment
  start, so it catches up on the first visible frame. Rejected (see B-9 for the music-mode gap).
- **B-10 / B-11** stay as P3 hypotheses. They were not reproduced because precaching makes the
  stale-chunk path rare, and fonts are likely in the HTTP cache.
