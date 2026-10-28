# Challenge 1: skeptical pass over CM-01..03 and B-01..04

Challenger: Claude Code (independent challenger 1). SHA `4c344e2`. Audit-only: no tracked file was
edited. I tried to disprove or downgrade each candidate first.

Worktree: `<scratchpad>/wt-chal1` (`git worktree add --detach … 4c344e2`,
`pnpm install --frozen-lockfile --offline` exit 0, `pnpm tokens`). Repros were copied in from
`$A/repro/`. `c-music-playback-repro.test.ts` went to `apps/web/src/lib/playback/`,
`c-music-refresh-race-repro.test.ts` to `apps/api/src/lib/music/`, and `b-web-*.repro.test.tsx` to
`apps/web/src/components/`.

## Verdicts

| ID | Lane sev | Verdict | Final sev |
| --- | --- | --- | --- |
| CM-01 | P2 | Upheld-qualified | P2 (Apple is the live half; the Spotify half is tabled by RF-92) |
| CM-02 | P2 | Upheld-qualified | P2 as a P1-investigation blocker; P3 as product impact |
| CM-03 | P3 | Upheld-qualified | P3 |
| B-01 | P2 | Downgraded | P3 |
| B-01b | P3 | Upheld | P3 |
| B-02 | P3 | Upheld-qualified | P3 |
| B-03 | P2 | Downgraded and split | P3 for the reconnect trigger (P2 when Spotify reopens); reload, discard and Back merge into B-7 as a product call |
| B-04 | P3 | Upheld | P3 |

## Re-runs

| Command (in wt-chal1) | Result |
| --- | --- |
| `apps/web: npx vitest run src/lib/playback/c-music-playback-repro.test.ts` | 4 passed: CM-01 ×2, CM-02 ×2 (as the lane reports) |
| `apps/api: npx vitest run src/lib/music/c-music-refresh-race-repro.test.ts` | 1 passed (CM-03) |
| `apps/web: npx vitest run src/components/b-web-playlist-stale-tracks.repro.test.tsx src/components/b-web-duplicate-class.repro.test.tsx` | 4 failed and 1 passed, which is the expected defect signature: B-01 expected-fails, B-01 OBSERVED passes, B-01b fails, B-02 fails ×2 |

---

## CM-01: seek, skip or pause/resume during an in-flight Spotify start or Apple queue/play fails the class

**Verdict: Upheld-qualified, P2.**

**I tried to disprove it in these ways:**

- **Is the timeline disabled while preparing?** No. `<LiveTimeline>` (`LiveMode.tsx:2324-2329`) has
  no disabled prop, and `LiveTimeline.tsx` has no `disabled`. Seek, the toggle and row taps all stay
  live during `preparing` or `buffering`.
- **Is the lease window long enough in the real app?** Spotify `play()` holds `pendingStarts` across
  `startSpotifyTrack` (`spotify-playback.ts:218-243`). That is an uncached
  `GET /api/v1/providers/spotify/playback-token` to our Worker, which can refresh upstream, followed by
  `PUT api.spotify.com/me/player/play`. Two serial network round trips cannot reliably finish inside
  LiveMode's 200 ms drag-commit window (`LiveMode.tsx:648-657`). On Apple, every `enter` runs one or
  two `setQueue` calls (the prepare-time cue, then a re-cue in `play()` when `cueDirty`). Each holds
  `pendingQueueGenerations` until MusicKit's own promise settles (`apple-music-adapter.ts:466-490`).
  The fakes do not overstate the window.
- **Real-device corroboration.** `docs/audits/music-led-phase-1-acceptance/README.md:24` and
  `music-led-instructor-workflow-plan.md:78` record an owner iPhone run in which "Retry and Skip hung
  on 'still finishing a previous queue request'". That exact lease message reached the UI on real
  hardware. The trigger there was a stuck queue, not a seek, but it proves the lease can surface to the
  instructor.
- **Mitigation I found.** During a continuous drag, LiveMode's throttle callback calls
  `coordinator.resume(ms)` when the status is `error` (`LiveMode.tsx:650-656`). A long drag can
  therefore self-heal on a later commit once the old lease clears. The final release, however, is a
  `flush`, and it usually lands within 200 ms of the previous commit's start, so it hits the lease and
  stays in `error`. Pause/resume and skip have no such retry.
- **Impact is understated, not overstated.** On `error`, `onStatus` calls `setPlaying(false)`
  (`LiveMode.tsx:697-700`). That stop is intentional under D24 ("playback failure hold[s] the teaching
  position"), so the prompter clock stops too. The instructor gets a banner, silence and a frozen
  prompter until Retry.
- **Intentional?** The adapter-level refusal is intentional and tested. The runtime's turning it into
  a class failure contradicts the runtime's own comment, "A pending old SDK call cannot block a new
  epoch" (`runtime.ts:138-142`). No RF or decision accepts this outcome.

**Qualifications:**

1. The Spotify half is tabled (RF-92, status `blocked`: "Spotify work remains tabled by the owner").
   The live priority is Apple.
2. The Apple repro uses a pause/resume during the first `setQueue`. A seek during an Apple drag is
   the more common real gesture. Same lease, same code path.
3. **Regression risk in the proposed fix.** The Apple lease clears only when MusicKit's `setQueue`
   settles. Our `withTimeout` bounds our wait, not the SDK promise (`apple-music-adapter.ts:477-489`).
   The iPhone run shows that promise can stay pending. If the fix waits on the lease without a bound,
   today's immediate error becomes an indefinite hang. The wait must be bounded (around 2-3 s) and
   then fall back to the current error.

---

## CM-02: unbound `navigator.requestMediaKeySystemAccess`, so the probe always records null

**Verdict: Upheld-qualified.** Severity depends on the axis. Product and playback impact are P3.
Impact on the P1 RF-29 investigation is P2. I would keep it at P2 because of the next point.

**Is the probe purely diagnostic?** Yes.

- `probeSafariModernFairPlayAccess()` feeds only `modernAccessWord`. That word is read only by
  `appleMusicPlaybackFailedMessage(…, safariModernAccessWord())` (`apple-music-adapter.ts:150-157`),
  which only adds the `modern-access: <word>` suffix to the error banner.
- The adapter awaits the probe before `instance.play()` (`:267-274`), but its result gates nothing.
- The behavioural half of #634/#636, `selectSafariModernFairPlay()` writing `mk-safari-modern-eme=1`,
  does not depend on the probe and still runs.
- MusicKit's own EME call is inside the SDK and correctly bound.

Nothing gates playback on the probe.

**Does RF-29 depend on it?** Yes, materially, and this is why I keep P2.

- `handoffs/2026-10-27-iphone-fairplay.md` records the real iPhone iOS 27.0.1 result on `535e61a`
  (bundle `index-CClNobxY.js`): the banner shows "No `modern-access` word".
- The handoff interprets that as "most likely … the phone is still executing the previous precached
  bundle".
- RF-29's `nextAction` is built on that reading: "Leave Live, use Reload now, confirm
  assets/index-CClNobxY.js, and retry Break Stuff once".
- CM-02 predicts the observed bare banner exactly on the new bundle, so the stale-bundle hypothesis is
  not needed to explain it. The owner's next device check will show the same bare banner after a
  confirmed reload, and it will be read as evidence for the wrong branch.
- The handoff's fallback, "remember `skipped` / `no-api` / the rejection name", would surface
  `TypeError` and expose this bug. Fixing the call makes that fallback unnecessary.

**Counterevidence checked:**

- The lead's Chromium run confirms "Illegal invocation".
- For WebKit, receiver checks on `Navigator` operations are WebIDL-mandated and enforced by JSC
  bindings. ES-module code is strict, so `this` is `undefined`, not `navigator`.
- Not run in Safari.

**Fix risk the lane under-weights.** Today the probe throws synchronously, so the `await accessProbe`
before `instance.play()` costs only microtasks. A fixed probe makes a real `requestMediaKeySystemAccess`
round trip on iOS before `play()`. That can consume or expire WebKit's transient user activation and
turn a playback attempt into an autoplay rejection. It can also hold `pendingPlays` if the promise
never settles; the lane notes this.

The lane's timeout remedy covers the hang, not the activation risk. Safer options:

- run the probe after `play()` resolves or rejects, or
- start the probe without awaiting it before `play()`.

Note also that RF-29 says "Do not implement or deploy another probe from this task". A fix needs an
explicit owner go-ahead and is owner-gated (Apple playback code).

---

## CM-03: parallel likes and playlists loads replay one refresh token

**Verdict: Upheld-qualified, P3.**

**Checked:**

- **The two loads really run in parallel.** Both effects in `useProviderBrowseState`
  (`Dashboard.tsx:1739-1803`) key on `[connections]` and fire per connected provider in the same
  commit.
- **The client and server windows disagree.** The web "connected" gate is `expiresAt > now`
  (`providers.ts:110-118`). The server refreshes at `now > expiresAt − 60 s` (`user-likes.ts:120-125`).
- **No guard on the refresh.** `refreshAndPersist` refreshes with the row it read, and its UPDATE has
  no compare-and-swap (`user-likes.ts:156-193`).
- **The failure is real but transient.** A refresh failure maps to `409 REAUTH_REQUIRED`, and the
  shelf shows that error until reload. The next load uses the winner's persisted pair.

**Downward pressure:**

- The window is 60 s per token lifetime.
- Spotify, which is tabled, normally keeps the old refresh token valid, so a replay is harmless.
- SoundCloud's single-use rotation was not verified (no network).

**Upward pressure:** if the provider applies reuse detection, the grant dies. That is unverified
either way.

The verdict stays P3 with the lane's own confidence caveat. The fix (compare-and-swap, plus a re-read
on loss) carries no obvious regression risk.

---

## B-01: stale playlist reply in the Music-tab saved-playlist dialog

**Verdict: Downgraded to P3.** The defect is real; the severity was the part I challenged.

**Reachable from the UI?** Yes.

- While tracks load, the dialog shows "Loading playlist tracks…", and **Back to playlists stays
  enabled** (`Dashboard.tsx:3776-3785`, no `disabled`).
- Back resets `selectedPlaylist` and `tracks` but does not cancel the request.
- The list then re-renders, so B can be opened while A is in flight.
- "Opened the wrong playlist, went back" is a natural gesture, and large playlists are multi-page
  server-side.

**Does Start class use `tracks` state?** Yes. `handleCreate` calls `submitTracks(playlist, tracks)`
(`:3655-3665`), and the >cap picker also indexes `tracks`. `handleCreateClassFromPlaylist` titles the
class from the selected playlist and imports the tracks it is passed (`:713-755`).

**There is a second ordering the lane missed.** If A lands *before* B, `tracks` becomes A and
`loadingTracks` goes false while B is still loading. Start class is enabled on A's songs under B's
heading until B overwrites them. That window is transient, but it is the same defect.

**Why it is downgraded:**

- The claim "nothing on screen says so" is overstated. The dialog renders the song list, which shows
  A's titles, under B's heading before the instructor presses Start class. After create, the builder
  opens on the new class with A's songs.
- The result is a *new* wrong class, deletable, with no existing data corrupted.
- It needs a specific user sequence plus out-of-order replies.

That is a P3 annoyance, not P2 data loss. The fix (a request generation or a selected-id guard,
bumped on Back) carries no regression risk. The builder's `TrackSearch` already uses this pattern.

---

## B-01b: an abandoned import later navigates the instructor into the new class

**Verdict: Upheld, P3.**

- Close and backdrop dismissal stay available while "Creating…" runs.
- Both create handlers end in `setDestination('classes'); await openClass(…)` with no check that the
  instructor is still there (`Dashboard.tsx:750-754`, `:784-786`).
- The comment "Closing the dialog is not navigation" explains why it navigates (the builder only
  mounts on Classes). It does not intend to override a later navigation.
- The repro fails as stated.
- The duplicate-on-reopen sub-claim is code-path only and was not run. I agree it should stay labelled
  that way.

---

## B-02: Duplicate fails silently, and a repeat tap makes a second copy

**Verdict: Upheld-qualified, P3.**

- **Silent failure confirmed.** `ClassesHome.tsx:796-803` uses `void onDuplicate(cls)`. The Dashboard
  handler (`:1187-1192`) has no try/catch. There is no `unhandledrejection` listener anywhere in
  `apps/web/src` (grep), so nothing surfaces the error. A 401 still signs out via `api.ts`, so only
  non-auth failures go silent.
- **Qualification on the double copy.** The menu closes on the first tap (`setOpen(false)`). A
  second copy needs the instructor to reopen the row menu and tap Duplicate again before the first
  `copyClass` + `refreshClasses` + `openClass` chain finishes. That takes two gestures, not a
  double-click, so it is less likely than "double submit" implies. It is still reachable on a slow
  network, because no busy state is shown.

The repro fails as stated (2/2).

---

## B-03: Live position is not persisted; the recovery panel's reconnect restarts at 0:00

**Verdict: Downgraded and split.**

**Is this an intentional product decision?** Partly.

- Prior audit B-7 (`codex-code-audit-2026-10-27-4e0b150/findings.md:193`) was classified "Confirmed,
  product call … Re-entry starts at 0:00", and the owner has not dispositioned it
  (`NEXT_SESSION.md:151`).
- No decision in `decisions.md` asks for Live state to survive a reload, tab discard or Back.
- **For those triggers, this is a feature gap and a product call.** Merge them into B-7. They are not
  a new defect.

**The reconnect-from-recovery trigger is different.** It is a defect against canon.

- D24 (`decisions.md`, "Truth and recovery") says "Preserve position and expose recovery where the
  instructor can act".
- The Live recovery panel's own **Manage music connection** action (`LiveMode.tsx:1201-1206`, then
  `ConnectionsDialog beforeRedirect`) leaves the page. The return record carries `destination:'live'`
  and `classId` but no position (`connection-return.ts:5-11`), and the return re-enters preflight
  (`Dashboard.tsx:572-596`).
- So the action D24 offers for recovery discards the position D24 says to preserve, and nothing warns
  the instructor first.

**Why that trigger is still downgraded to P3 today:**

- Apple connects in-page through MusicKit, with no redirect (`use-provider-connect.ts:82-109`).
- SoundCloud Live playback does not need a connection, so reconnecting SoundCloud mid-class is
  unlikely.
- The redirect path that matters is therefore Spotify, which is tabled (RF-92).

Re-rate it to P2 when Spotify work reopens; it interacts with C-1, the roughly one-hour token expiry.

**Fix scope.** The smallest correct fix is to add `elapsedMs` to the return record and seek on
re-entry, or at least warn before the redirect. A general per-tab checkpoint is a product feature and
should wait for the B-7 disposition. It is owner-gated (LiveMode).

---

## B-04: builder preview Reconnect redirects without a return record

**Verdict: Upheld, P3.**

- `TrackPreview.reconnectProvider` (`TrackPreview.tsx:182-189`) sets `window.location.href` with no
  `rememberConnectionReturn`.
- The OAuth return effect (`Dashboard.tsx:560-600`) needs that record to reopen the class. Without it
  the instructor lands on the default view with the connections dialog open.
- The error-row button uses `void reconnectProvider(...)` with no catch (`:328-333`). The
  `ReconnectSpotifyAction` path does catch.
- In practice the redirecting providers are Spotify (tabled) and SoundCloud, so the incidence is low.

P3 stands, and the fix carries no regression risk.
