# Lane b-web — apps/web instructor workflows

Auditor: Claude Code (lane b-web) · SHA `4c344e2` · 2026-10-28 · audit-only
Worktree: `$SCRATCH/wt-b-web` (detached at 4c344e2, `pnpm install --frozen-lockfile` ok, `pnpm tokens` run).
All repros are jsdom vitest files under `$A/repro/b-web-*`. To run one, copy it to
`apps/web/src/components/` in a worktree, then from `apps/web` run `npx vitest run src/components/<file>`.

Status: **COMPLETE for the scope below.** No browser or device run.

Summary: B-01 P2 confirmed · B-01b P3 confirmed · B-02 P3 confirmed · B-03 P2 confirmed by trace (extends B-7) · B-04 P3 confirmed by trace.

## 1. Scope and depth

| Area | Depth | Notes |
| --- | --- | --- |
| Music tab → saved playlist browser → Start class (`PlaylistBrowserDialog`, `handleCreateClassFromPlaylist`) | Traced + tested | B-01, B-01b |
| Music tab likes / selected-songs create (`LikesBrowserDialog`, `MusicWorkspace.startClass`) | Traced | Same post-create navigation as B-01b. Search guarded by `requestId` |
| `useProviderBrowseState` (connections/playlists/likes shelves) | Traced | Guarded by `alive` + `connectedProvidersRef`. Sound |
| Builder `TrackSearch` (search, likes, saved playlists, URL import) | Traced | Generation guards everywhere. One narrow race noted under rejected leads |
| `lib/ordered-import.ts` | Traced | C-25 still present (unresolved rows dropped, `{error:null}`). Nothing new |
| Classes home: Recents row menu (Duplicate / Delete / Rehearsal view) | Traced + tested | B-02. Delete is guarded (`ClassesHome.tsx:259-276`) |
| Builder: reorder, plan blocks, sections, inspector save/delete | Traced (sampled) | Covered by B-1..B-4. Reorder rollback sound. Plan-block reload race noted as rejected |
| Readiness (`lib/readiness.ts`, `live-readiness.ts`, `class-ordering.ts`) vs Live gates | Traced | Duration gate matches `canRunPayload` and `preflightPayload`. Music readiness is ref-only on purpose (file header) |
| Live: clock (`use-virtual-clock.ts`), host loop, coordinator seam (`runtime.ts`), end of class, track skip, reset, seek/scrub, sections, teaching hold/queue | Traced | Ended state reached in both modes. B-8 and B-9 are unchanged. B-03 is new (position recovery) |
| Live session loss (`App.tsx`, `session-guard.ts`, Dashboard `sessionLost` wrapper) | Traced | Live is not remounted on loss (stable child slots). Sound |
| OAuth return (`connection-return.ts`, Dashboard return effect) | Traced | B-03 and B-04 |
| `lib/api.ts` | Traced | 401 sign-out, envelope parsing, 204 drain, abort passes through. No timeouts (lead, not a finding) |
| Effects, timers, listeners | Grepped all `setInterval`/rAF/`addEventListener` in `src` | All cleaned up. UpdatePrompt's interval/listener is app-lifetime on purpose |
| PWA: `Root.tsx`, `UpdatePrompt`, `applyServiceWorkerUpdate`, `lazyWithReload`, `vite.config.ts` denylist | Traced | Prompt sits under Live (`z-40` vs `z-50`). Denylist is present. B-10 is unchanged and cannot loop at startup (see rejected) |
| `_headers` CSP vs Worker headers (`apps/api/src/index.ts:39-57`) | Read | Consistent for transport/frame headers. Worker CSP is `default-src 'none'` for JSON by design. Permissions-Policy differs only by `encrypted-media`, which the API does not need |
| Dialog primitive focus/inert | Traced | Backdrop mousedown closes (feeds B-01b) |
| Rehearsal: `ClassSummaryView`, `TrackPreview` | Traced | B-04 |
| Explore / Teams / Share | Not assessed | Deferred surfaces |

## 2. Candidates

### B-01 — Saved-playlist browser shows (and imports) the previous playlist's songs under the newly opened playlist

- **Category:** stale async response / wrong data written. **Severity:** P2. A new class is created
  under playlist B's name with playlist A's songs, and nothing on screen says so. The instructor has
  to notice and rebuild. Not P1: it needs two playlist opens in flight at once, plus A answering after B.
- **Confidence:** high. **Status:** confirmed (repro).
- **Refs:** `apps/web/src/components/Dashboard.tsx:3617-3631` (`openPlaylist`: `setTracks(await
  listPlaylistTracks(...))` with no request or playlist guard. The `finally` clears `loadingTracks`
  for whichever request lands last). `:3776-3785` (Back to playlists resets `selectedPlaylist`/`tracks`
  but leaves the old request live). `:3643-3653`/`:3655-3665` (`handleCreate` → `submitTracks` uses
  whatever `tracks` holds). `:704-755` (`handleCreateClassFromPlaylist` titles the class from the
  selected playlist and imports the passed tracks).
- **Trigger:** Music → a provider → Open playlist A (slow provider page) → Back to playlists → Open B.
  B answers first, then A. Provider playlist reads are multi-page server-side, so a large A is slower
  than a small B.
- **Expected:** B's heading shows B's songs, and "Start class from B" imports B.
- **Observed:** B's heading lists A's songs. "Start class from B" calls `createClass({title:'Cooldown
  Flow'})` and then `importTrack('spotify','warm-1')`, which is A's song.
- **Evidence:** `repro/b-web-playlist-stale-tracks.repro.test.tsx`. Test 1 states the correct behaviour
  and fails (`Warm Song` is present under the Cooldown Flow heading). Test 2 ("OBSERVED") passes and
  shows the import of `warm-1` into the class titled Cooldown Flow. Log:
  `evidence/b-web-playlist-stale-tracks.log` (2 failed | 1 passed, including B-01b).
- **Existing coverage:** `Dashboard.test.tsx` covers a single playlist's fetch failure, Try again,
  empty playlist and builder navigation (`:545-720`). It never runs two opens at once.
- **Counterevidence:** the builder's `TrackSearch.openSavedPlaylist` has the guard
  (`playlistGeneration` + `isCurrent`, `TrackSearch.tsx:512-562`). The defect is only in the Music-tab
  dialog.
- **Remediation direction:** use a request generation (or the selected playlist id) in
  `openPlaylist`. Ignore a late reply and its `finally`. Bump the generation on Back.
- **Fix check:** repro test 1 passes. Test 2 must then fail.
- **Known status:** new. **Owner-gated paths:** no (`apps/web/src/components/Dashboard.tsx`).
  **Browser needed:** no.

### B-01b — A playlist or likes class import that the instructor walked away from navigates them into the new class when it finishes

- **Category:** lost navigation state / async work outliving its surface. **Severity:** P3.
- **Confidence:** high. **Status:** confirmed (repro).
- **Refs:** `Dashboard.tsx:3708-3716` and `:3973` (Close stays enabled while "Creating..." runs).
  `Dialog.tsx:125` (a backdrop mousedown also closes). `Dashboard.tsx:744-754` and `:778-787`. Both
  handlers finish with `setDestination('classes')` and `await openClass(...)`, and nothing checks
  that the dialog or destination is still current.
- **Trigger:** Start class from a saved playlist or likes. While the ordered import runs, which is
  one `importTrack` per song at 4 at a time plus a commit, close the dialog (or tap the backdrop) and
  go to Account or Music.
- **Expected:** the instructor stays where they went, and the finished class is announced or just
  appears in Recents.
- **Observed:** the instructor is pulled to Classes with the new class open in the builder. Closing
  the dialog also drops the "Creating..." state, so reopening the same playlist and pressing Start
  again creates a second class. That part is code-path only and was not run.
- **Evidence:** `repro/b-web-playlist-stale-tracks.repro.test.tsx` test "B-01b" fails: after the
  import resolves, Account is no longer `aria-current`.
- **Remediation direction:** block Close and backdrop while creating, or ask the instructor to
  confirm. Alternatively, make the post-create navigation conditional on the dialog still being
  mounted and the destination unchanged.
- **Known status:** new. Related to the C-24 duplicate-import theme, but this is a client-side trigger.
  **Owner-gated:** no. **Browser:** no.

### B-02 — Duplicate class fails silently, and a repeat tap makes a second copy

- **Category:** error handling / double submit. **Severity:** P3. Duplicate is a core reuse
  workflow ("teach last week's ride again"). On failure nothing happens and no message appears. While
  the copy runs there is no busy state, so a second tap copies again.
- **Confidence:** high. **Status:** confirmed (repro).
- **Refs:** `ClassesHome.tsx:796-803` (`setOpen(false); void onDuplicate(cls);`). There is no
  catch, no busy flag, and the menu item stays available. `Dashboard.tsx:1187-1192` (`copyClass` →
  `applyTagFilter` → `refreshClasses` → `openClass`, no try/catch). The repo already has
  `lib/use-async-action.ts`, whose header says it exists so "a slow network + double-click can't
  create a duplicate class" and failures don't "vanish as unhandled promise rejections". This path
  does not use it.
- **Expected:** a failure shows a message, and a second Duplicate while the first is in flight is a
  no-op.
- **Observed:** the `copyClass` rejection escapes as an unhandled rejection and the screen does not
  change. Two Duplicate taps call `copyClass` twice.
- **Evidence:** `repro/b-web-duplicate-class.repro.test.tsx`, 2/2 fail.
  `evidence/b-web-duplicate-class.log`.
- **Existing coverage:** `LibraryRail.test.tsx:313-322` asserts only that Duplicate calls the callback
  once on the happy path. `ClassesHome.test.tsx` stubs `onDuplicate`.
- **Counterevidence:** Delete on the same menu is guarded and reports errors
  (`ClassesHome.tsx:259-276`). A large class copy can 500 on the server (D-1 family), which makes the
  silent path more reachable. That was not run here.
- **Remediation direction:** run Duplicate through `useAsyncAction` (or an in-flight set per class
  id) and surface the error through the existing Dashboard `error` line.
- **Known status:** new. **Owner-gated:** no. **Browser:** no.

### B-03 — A running Live class cannot be resumed after any page navigation; the recovery panel's own reconnect path triggers one

- **Category:** Live resilience / lost state. **Severity:** P2. Mid-class with riders, the class
  position, started state and playback context are lost. The instructor lands on Live preflight (or
  Classes home) and has to find their place by scrubbing. This is a distinct, partly unavoidable
  trigger for the B-7 outcome ("re-entry starts at 0:00").
- **Confidence:** high for the code path. Browser/OS behaviour (tab discard, back gesture) not observed.
  **Status:** confirmed by code trace. No jsdom repro: the defect is the absence of state.
- **Refs:**
  - Recovery panel → `Manage music connection` (`LiveMode.tsx:1201-1206`) → `ConnectionsDialog
    beforeRedirect` (`LiveMode.tsx:1290-1300`) → `useProviderConnect` does
    `window.location.assign(authorizeUrl)` (`lib/use-provider-connect.ts:113-120`).
  - What is remembered for the return: `{userId, destination:'live', classId, provider}`
    (`Dashboard.tsx:848-855`, `lib/connection-return.ts:5-11`). There is no elapsed position and no
    started or paused state.
  - On return, `Dashboard.tsx:572-596` refetches the payload and calls `enterLive(payload, false)`.
    LiveMode mounts in `phase: 'preflight'` (`LiveMode.tsx:478-481`) with the clock at 0
    (`use-virtual-clock.ts:52-58`).
  - Nothing else persists Live: no `sessionStorage`/`localStorage` in `LiveMode.tsx`, `Dashboard.tsx`
    or `use-virtual-clock.ts`. There is no `beforeunload`/`pagehide` handler and no history entry
    (`pushState` is never called; only `replaceState`). So a refresh, an OS tab discard (iPad Safari
    discards backgrounded tabs while the instructor is in another app), or browser Back or an edge
    swipe leaves Live with no prompt and no resume.
- **Trigger (most likely):** a Spotify class passes the ~1 h token expiry (C-1) or a playback reauth
  mid-class. The recovery panel offers Manage music connection → Reconnect Spotify. That redirect to
  Spotify returns to Live preflight at 0:00.
- **Expected:** after a reconnect or reload, Live offers to resume at the held teaching position (at
  least within a short window for the same class).
- **Observed (by trace):** preflight at 0:00. The instructor must Start, then scrub to the right
  place, while music restarts from track 1 until they do.
- **Existing coverage:** `Dashboard.test.tsx` covers the OAuth return re-entering Live. No test
  asserts the position.
- **Counterevidence:** SoundCloud plays with no connection, and Apple uses MusicKit's in-page
  consent (no redirect). So the redirect trigger is mainly Spotify, whose work the owner has tabled
  (RF-92). The tab-discard and Back triggers apply to every provider and to prompter-only runs.
- **Remediation direction:** add `elapsedMs` and `classId` (plus a timestamp) to the connection-return
  record. More generally, write a small per-tab Live checkpoint (class id, payload `updatedAt` or a
  hash, elapsed, started) on pause, track change and `pagehide`, and offer "Resume at m:ss" in
  preflight. Optionally add a `beforeunload` prompt while Live is playing.
- **Known status:** extends B-7 (new trigger, higher impact) and interacts with C-1.
  **Owner-gated:** yes. `scripts/owner-gate.mjs:49` gates `apps/web/src/components/LiveMode*`, and
  `lib/playback/*` is gated too. `Dashboard.tsx` and `connection-return.ts` alone are not gated. **Browser/device:** yes, to verify discard and Back behaviour and an audible
  resume.

### B-04 — Builder preview "Reconnect" redirects without a return record, so the open class and any draft are dropped

- **Category:** lost navigation state / unhandled rejection. **Severity:** P3.
- **Confidence:** high (trace). **Status:** confirmed by code trace.
- **Refs:** `TrackPreview.tsx:182-189` (`reconnectProvider`: `connectProvider(provider)` →
  `window.location.href = authorizeUrl`, with no `rememberConnectionReturn`). Used at `:281`
  (UnplayableVerdict → `ReconnectSpotifyAction`, `:405`, which does catch) and `:328-333` (preview
  error "Reconnect <provider>" does `void reconnectProvider(...)` with no catch, so a failed
  `connectProvider` is an unhandled rejection with no message). Compare the builder's
  ConnectionsDialog, which records `{destination, classId}` (`Dashboard.tsx:942-949`) so the return
  effect (`Dashboard.tsx:560-600`) reopens the class.
- **Observed (trace):** after OAuth the browser lands on `/?connected=spotify`. `consumeConnectionReturn`
  finds no record and returns null, so the instructor lands on Classes home with the connections
  dialog open. The class that was being previewed is closed, and the unsaved inspector text is lost
  (the B-4 consequence, by a new trigger).
- **Remediation direction:** pass a `beforeRedirect` that calls `rememberConnectionReturn({userId,
  destination:'classes', classId, provider})`, or route through `useProviderConnect`. Catch the
  error on the button path.
- **Known status:** new (another trigger for B-4's draft loss). **Owner-gated:** no. `TrackPreview.tsx` is not in
  `scripts/owner-gate.mjs`. It would be gated if the fix moved to `lib/use-provider-connect`. **Browser:** a real Spotify reconnect round trip is needed to confirm
  the landing.

## 3. Known items re-checked at 4c344e2

- **B-8:** `LiveMode.tsx:69-74` still uses `Math.round` for countdowns. Unchanged.
- **B-9** (prior Probable; not listed in 00-known-issues): unchanged. The music-mode silence gap
  is still advanced only by the rAF host loop (`LiveMode.tsx:600-633`). `RuntimePlaybackCoordinator`
  has no gap timer (`runtime.ts:213-224`). In a hidden tab the next song does not start until the
  page is visible again. Not re-run here. It still needs a tablet app-switch check during a 10 s gap.
- **B-10:** `lazyWithReload.ts:29-44` still re-arms on any chunk's success. All lazy chunks
  (`Dashboard.tsx:169-192`) mount on user action, and the OAuth return strips its query before any
  reload, so it cannot loop at startup. It stays a P3 hypothesis. The header comment still says
  `autoUpdate` (the config is `prompt`).
- **C-25:** `ordered-import.ts:240-265` still filters unresolved rows and returns `{error:null}`.
- **B-5:** the Live branch is intact. The Dashboard wrapper keeps stable child slots, so LiveMode is
  not remounted when `sessionLost` flips (`Dashboard.tsx:802-860`).

## 4. Rejected leads (do not re-file)

- **Stale track reply in builder TrackSearch saved playlists:** guarded by `playlistGeneration`.
  The only residue: a catalog search fired just before switching to Saved playlists can land in
  `results` while `openSavedPlaylist` is pending. That window ends when the playlist tracks arrive,
  and Import all is a no-op until then because `playlistImport.current` is null. Too narrow to file.
- **Plan-block reorder vs reload race** (`ClassPlanBlocks.tsx:206-231` vs `:276-307`): a load that
  started before a reorder could land after it. The move is blocked during assignment, so the window
  is about one request. Not reproduced. Too narrow.
- **LiveMode Start double-click building two coordinators:** the first click flips the phase and the
  Start button unmounts. React flushes discrete events, so a second click cannot reach it.
- **Session loss remounting Live:** rejected. See B-5 above.
- **UpdatePrompt reloading mid-Live:** the prompt is `z-40` under Live's `z-50`, and nothing reloads
  without a tap.
- **`window.sessionStorage` throwing in `lazyWithReload`/`UpdatePrompt`:** only when site storage
  is blocked, which also blocks the session cookie, so the instructor can never reach Dashboard.
- **Wrong-class after switch in Classes shelf/Live queue enrichment:** guarded by `active`/`alive`
  plus keyed workspaces (`ClassWorkspace key={selected.id}`, `SegmentBand` inside it).
- **Free-mode overlap making the prompter and the audio disagree:** `PATCH /tracks/:id` lengthening
  a library duration does not re-check free-mode overlap (`apps/api/src/routes/tracks.ts:98-151`).
  `segmentAt` (first containing window) and `trackIndexAt` (last start reached) would then disagree.
  The web app never calls `PATCH /tracks/:id`, so this is API/iOS only. Handed to the API lane as a
  hypothesis.
- **Scrubber tap issues two provider re-prepares** (`LiveTimeline.tsx:84-100`: pointerdown flushes a
  preview seek, then pointerup commits the same position). Wasteful, not wrong. It is C's seam if it
  ever matters audibly.
- **Rehearsal view leaves `document.title` as "Preview: …" after close** (`ClassSummaryView.tsx:62-66`).
  Cosmetic.
- **Captive-portal 200 HTML makes `api()` throw a raw `SyntaxError` message** (`api.ts:125`). Display
  only.

## 5. Gaps

- No real browser or device. So: no hidden-tab gap timing (B-9), no tab discard or Back gesture
  (B-03), no real OAuth round trip (B-03, B-04), no audible playback.
- `TimelineStrip.tsx`, `SegmentBand.tsx` drag paths, `ChoreographyEditor.tsx` beyond B-1..B-3, and
  `CreateClassDialog`/`class-scaffold` were sampled, not traced end to end.
- Login, ResetPassword and the Account page were not assessed beyond the 401 path.
- No accessibility tooling run. RF-73 is known. No functional keyboard failure was found in the
  Live controls read.

## 6. Commands

| Command (cwd `wt-b-web/apps/web`) | Exit | Result |
| --- | --- | --- |
| `npx vitest run src/components/b-web-playlist-stale-tracks.repro.test.tsx` | 1 | 2 failed (B-01, B-01b), 1 passed (B-01 observed) |
| `npx vitest run src/components/b-web-duplicate-class.repro.test.tsx` | 1 | 2 failed (B-02 both) |
