# Findings — ritmofit-web @ 4e0b150

Ranked after the independent challenge in `challenge.md`. Lane IDs are kept. Two
root causes are merged: the D1 100-parameter ceiling (D-1, absorbing A-9, D-2, D-3)
and the unregistered capabilities route (A-11, absorbing D-8).

Challenge coverage: every P1 and the consequential first-pass P2s. C-21 through
C-26 were found after that pass. They are accepted from the lane's green repros
and code reading, and they did **not** get an independent challenge. P3s that the
challenge table does not mention were also not independently challenged.

No production database was queried. Historical data loss is not claimed.

## Ranked accepted findings

| Rank | ID | Sev | Status | One line |
| --- | --- | --- | --- | --- |
| 1 | B-3 | P1 | Confirmed | A text-only cue, move, or section edit rewrites the time. At 128 BPM a cue moves one beat early. |
| 2 | B-1 | P1 | Confirmed | After a free-placement timeline drag, saving notes writes the old start time back. |
| 3 | B-2 | P1 | Confirmed | After a marker drag, a text-only cue edit writes the old anchor back. Moves use the same shape. |
| 4 | C-1 | P1 | Confirmed | Spotify is treated as disconnected when the ~1 h access token expires. The server would refresh it. Live never asks. |
| 5 | D-1 | P1 | Confirmed | One SQL statement cannot bind more than 100 values. Disconnect purge never finishes past ~97 tracks. A class with 101 tracks cannot enter Live. A custom-move rename returns 500 after the name is saved. |
| 6 | A-7 | P1 | Confirmed, latent | Drizzle table-rebuild migrations cascade-delete child rows on D1. The shipped migrations are already applied. The next parent rebuild would do it again. |
| 7 | C-21 | P2 | Confirmed, not independently challenged | Same-song matching collapses different recordings, and resolve attaches the first hit. |
| 8 | C-22 | P2 | Confirmed, not independently challenged | A match accepted at a 4 s duration gap fails Live at the 1 s endpoint check. |
| 9 | C-24 | P2 | Confirmed, not independently challenged | Retrying a URL import after a lost response duplicates the playlist. |
| 10 | C-25 | P2 | Confirmed, not independently challenged | A failed library resolve is dropped and the import reports success. |
| 11 | A-8 | P2 | Confirmed | Sessions created before a password reset still work afterwards. |
| 12 | B-4 | P2 | Confirmed | Unsaved inspector text is discarded on Back, top nav, and Run live, with no leave prompt. |
| 13 | C-2 | P2 | Confirmed, narrower trigger | Once a refresh is attempted, a 5xx, 429, or network error is reported as "reconnect". |
| 14 | B-5 | P2 | Confirmed for the builder | A 401 signs the builder out and drops the open class. Live is kept mounted on purpose. |
| 15 | D-4 | P2 | Confirmed counts | Classes home and Live each refetch a full run payload per class on every visit. Latency was not measured. |
| 16 | C-3 | P2 | Probable | A Spotify state whose track URI differs from the requested one fails the class. A live relink was not observed. |
| 17 | C-7 | P2 | Probable | Explicit sign-out and Disconnect leave the Spotify and Apple sessions authorized in the browser. |

## P1 records

### B-3 — Text-only choreography edits rewrite the time

- **Category:** data integrity, Builder. **Severity:** P1. **Confidence:** high. **Status:** Confirmed. Challenge: Upheld.
- **Where:** `apps/web/src/lib/duration.ts:25-29` rounds the clock to a whole second. `apps/web/src/components/ChoreographyEditor.tsx:94-100` snaps that clock, and snap is on whenever BPM is known. Save always sends it (`:540`, `:563`, `:1153`, `:1178`). Sections send the rounded offset from `apps/web/src/components/SegmentBand.tsx:536-547`. The server writes the fields (`apps/api/src/routes/cues.ts:125-134`, `apps/api/src/routes/sections.ts:63-65`).
- **Trigger:** edit notes, intensity, or section type on a cue, move, or section and save. Default timeline mode is sequential, and this hits sequential classes.
- **Expected:** a text edit leaves the stored millisecond anchor alone.
- **Observed:** a 128 BPM cue at 10313 ms saves at 9844 ms, one beat early. A move at 12750 ms saves at 13000 ms. A section at 241500 ms saves at 242000 ms.
- **Impact:** ordinary choreography edits silently move cues. The instructor is not told.
- **Evidence:** `repro/b-anchor-precision.repro.test.tsx`, re-run in `evidence/x-bc-repro-rerun.log`. jsdom. No browser pass.
- **Tests today:** none lock millisecond stability across a text edit. The round-and-snap behavior is what the form does on every save.
- **Remediation:** send the time only when the instructor edited the time field. Keep the stored milliseconds when the displayed clock still matches. The track inspector already has `parseInspectorAnchor` for a related case; the choreography editors do not use it.
- **Acceptance:** the repro's three saves keep 10313, 12750, and 241500. Editing the clock on purpose still snaps when snap is on.

### B-1 — Saving notes after a timeline drag restores the old start

- **Category:** data integrity, Builder. **Severity:** P1. **Confidence:** high. **Status:** Confirmed. Challenge: Upheld, free placement only.
- **Where:** the inspector is keyed only by track id (`apps/web/src/components/Dashboard.tsx:4685`), so a payload refresh does not re-seed the start field (`:5644`). Free-mode Save always includes `startOffsetMs` (`:5837-5848`). The server accepts it (`packages/shared/src/entities/classes.ts:231`, `apps/api/src/routes/class-tracks.ts:577`). The comment at `classes.ts:293` says a class-track patch does not include `startOffsetMs`. The schema does.
- **Trigger:** free placement. Open the inspector, drag the track on the timeline, then save any inspector edit.
- **Expected:** the drag's start time stays.
- **Observed:** the drag commits 65000 ms. The field still shows 1:00. The notes save sends 60000 ms.
- **Impact:** a timeline edit is undone by an unrelated save. Sequential placement is the default and does not send this field.
- **Evidence:** `repro/b-builder-lost-update.repro.test.tsx`, re-run in `evidence/x-bc-repro-rerun.log`. jsdom.
- **Remediation:** re-seed the inspector when the track's start changes, or omit `startOffsetMs` unless the instructor edited that field. Fix the stale schema comment in the same change.

### B-2 — A text cue edit restores the pre-drag anchor

- **Category:** data integrity, Builder. **Severity:** P1. **Confidence:** high for cues. Moves match the code and were not separately executed. **Status:** Confirmed. Challenge: Upheld.
- **Where:** cue rows load only when the selected track changes (`apps/web/src/components/ChoreographyEditor.tsx:512-531`). A marker drag updates the cue and refreshes the run payload (`Dashboard.tsx:4519-4523`) and does not reload that list. `saveEdit` always sends `anchorMs` (`ChoreographyEditor.tsx:562-563`). The server persists it (`apps/api/src/routes/cues.ts:120-134`). `MovesSection` uses the same load and save shape (`ChoreographyEditor.tsx:1151-1178`).
- **Trigger:** drag a cue marker, then save a text-only edit of that cue.
- **Expected:** the dragged anchor stays.
- **Observed:** the drag commits 11000 ms. The edit field still shows 0:10. The text save sends 10000 ms.
- **Remediation:** reload the cue and move lists when the run payload changes, and do not send `anchorMs` when the instructor did not edit the time. Same packet as B-3.

### C-1 — Spotify playback is gated on the access-token expiry

- **Category:** provider readiness. **Severity:** P1. **Confidence:** high. **Status:** Confirmed. Challenge: Upheld.
- **Where:** `providerConnectionState` maps `expiresAt <= now` to `expired` for every account-backed provider (`apps/web/src/lib/providers.ts:110-118`). Live keeps only `connected` (`apps/web/src/lib/playback/coordinator.ts:52-61`) and preflights that list (`apps/web/src/components/LiveMode.tsx:513-524`). `GET /providers/connections` returns the stored expiry and does not refresh (`apps/api/src/routes/provider-connections.ts:153-163`). The refresh lives in `mintSpotifyPlaybackToken` (`apps/api/src/lib/music/spotify-playback-token.ts:75-98`) and is reached only after a track is already considered playable.
- **Trigger:** a Spotify-only class, about an hour after the last server-side Spotify read. Spotify access tokens last about an hour.
- **Expected:** preflight treats a refreshable grant as connected. SoundCloud already does (`coordinator.ts:73-78`).
- **Observed:** every Spotify track is "No connected provider can play this" and the suggested action is reconnect. An existing test (`coordinator.test.ts`, the case the lane cites near line 118) asserts this as intended.
- **Impact:** Spotify playback in Live and Builder preview stops for the rest of the session until the instructor reconnects, which is an OAuth redirect. A class that also has Apple or SoundCloud refs can still play those.
- **Evidence:** `repro/c-web-playback-repro.test.ts`. Fake SDK. No audible playback.
- **Remediation:** do not treat Spotify `expiresAt` as loss of the grant. Refresh on the playback-token request, which already exists, and let preflight call it or ignore access-token expiry the way SoundCloud is ignored. Update the test that locks the current behavior.
- **Acceptance:** an expired access token with a refresh token still preflights as playable. A revoked grant still says reconnect.

### D-1 — D1's 100-parameter ceiling breaks purge, Live, copy, and move rename

- **Category:** data retention and core workflow. **Severity:** P1 for the purge. The Live/copy failure is the same bug on a core path. The rename is a P3 symptom of the same ceiling. **Confidence:** high. **Status:** Confirmed. Challenge: Upheld, and A-9, D-2, D-3 merged here.
- **Where:** `apps/api/src/lib/music/purge.ts:164-176` deletes every provider track id in one `inArray`. Run payload and copy do the same (`apps/api/src/lib/run-payload.ts:121-135`, `apps/api/src/routes/classes.ts:225-231`). Custom-move rename touches parent classes the same way (`apps/api/src/routes/moves.ts:175-178`, `apps/api/src/lib/class-recency.ts:39-42`). D1 allows 100 bound parameters per statement (Cloudflare D1 limits, accessed 2026-10-27).
- **Trigger:** disconnect a provider after one maximum playlist import (100 tracks, `MAX_PLAYLIST_IMPORT_TRACKS` in `packages/shared/src/entities/classes.ts:313`). Separately, open or copy a class with 101 placements, or rename a custom move used on about 150 classes.
- **Expected:** purge removes provider metadata. Large classes open and copy. A rename either fully succeeds or fully fails.
- **Observed:** local Miniflare D1: purge succeeds at 95 tracks and throws `too many SQL variables` at 99 and above (`evidence/d-purge-scale.log`). The batch is atomic, so nothing is deleted. The job retries and is then marked failed, with the error logged. Run-payload and copy return 500 above 100 tracks. A rename of a move used on 150 classes returns 500 after the new name is already saved.
- **Impact:** instructors with a real playlist cannot finish the provider-terms purge, so provider metadata remains after disconnect. A class that grew past 100 tracks cannot enter Live. This is local D1, which Cloudflare documents as the same engine limit. Remote D1 was not touched.
- **Remediation:** one chunked or `json_each` helper for every unbounded `inArray` of ids. Test purge, run-payload, copy, and move-rename together. Do not ship three unrelated patches.
- **Acceptance:** purge completes at 150 and 500 tracks with zero refs left. A 101-track class returns a run payload. A rename used on 150 classes returns 200 and the recency touch happens, or the name is unchanged.

### A-7 — The next parent-table rebuild will delete choreography

- **Category:** migration integrity. **Severity:** P1, latent. **Confidence:** high for the mechanism on local D1. **Status:** Confirmed as a landmine. Challenge: Qualified. Not an active incident.
- **Where:** `apps/api/migrations/0018_overjoyed_roxanne_simpson.sql:1` runs `PRAGMA foreign_keys=OFF`, then drops `class_tracks`. Children use `onDelete: 'cascade'` (`apps/api/src/db/schema.ts:381`, `:418`). Cloudflare documents that D1 foreign keys stay on for every transaction and that user SQL cannot turn them off inside a migration, because each statement is its own transaction (Cloudflare foreign-key docs, accessed 2026-10-27). `PRAGMA defer_foreign_keys` does not suppress the cascade.
- **Trigger:** a future drizzle-kit migration that rebuilds `classes`, `class_tracks`, or another parent that children reference.
- **Expected:** a table rebuild copies parent rows and leaves children in place.
- **Observed:** replaying 0005, 0010, 0014, 0016, and 0018 through `wrangler d1 migrations apply --local` on a populated database exits 0 and deletes cues and moves. 0005 and 0016 also delete `class_tracks`. Replaying 0021 preserves all four counts (`evidence/x-a7-wrangler-cli-replay.log`).
- **What this does not show:** those five migrations are already applied, per `ritmofit_dev_plan/HISTORY.md` (not re-queried here). 0018 ran when production `class_tracks` had 0 rows. No migration after 0021 exists on this SHA. Historical loss from the earlier rebuilds is not claimed. Do not rewrite applied migrations.
- **Impact:** the next parent rebuild would exit 0 and wipe cues and placed moves, and no current test can catch it, because every suite migrates an empty database.
- **Remediation:** a migration check that applies the pending SQL to a populated local D1 and asserts child counts. For the next rebuild, copy children explicitly or rebuild in a way that does not `DROP` a referenced parent while cascades are on. Review the generated SQL before applying, which the repo rules already ask for.
- **Acceptance:** a fixture with one class, one track, one cue, and one move still has all four after the new migration. The check fails if a future rebuild deletes them.

## P2 records

### C-21 — Resolve can attach a different recording

Not independently challenged. **Confirmed** against injected search, 11 unit tests in `evidence/c-followup-repro-run.log`.

`makeMatchKey` (`apps/api/src/lib/same-song.ts:63-70`) drops every parenthetical, a trailing remix/version/edit/mix, and any `feat`/`ft` without a word boundary, then deletes every non-Latin character. `resolveTrackProvider` (`apps/api/src/lib/resolve-provider.ts:55-56`) auto-attaches the first duration-compatible hit. "Levels" matches "Levels (Instrumental)", "Levels - Club Mix", and a karaoke title. "Left Behind" normalizes to the same key as "Le Behind". "東京 Love" matches "大阪 Love". The route inserts that hit (`apps/api/src/routes/tracks.ts:242-243`).

Part of the parenthetical strip is specified, and existing tests lock "Levels (Radio Edit)" to the base title. Those tests do not cover instrumental, karaoke, or club mix as a playback substitute, or the in-word `feat` strip. The module's own header says a wrong merge is worse than a duplicate. Live then plays the attached provider, and SoundCloud is preferred when both refs exist.

**Remediation:** auto-attach only a unique hit that survives a version allowlist. Anchor `feat`/`ft` on a token boundary. Do not match when non-Latin text was deleted down to a shared Latin fragment. Other hits go to the confirm list.

### C-22 — A legal same-song match fails at the end of the track

Not independently challenged. **Confirmed** with a fake adapter.

The matcher accepts a duration gap of up to 4 s (`same-song.ts:37-38`). Live treats a finish 1 s short of the saved window as a duration mismatch and fails the class (`apps/web/src/lib/playback/runtime.ts:99-105`, `:584-597`). The window uses the library row's duration, which attach does not update (`apps/api/src/lib/track-import.ts:57-66`). A SoundCloud recording 3.5 s shorter than the stored Spotify duration is attached, then Live errors with "Music ended before the saved playback window."

**Remediation:** if the playing provider reached its own reported duration and the shortfall is within 4 s, end the window cleanly. A shortfall past 4 s still fails.

### C-24 — Retrying a URL import duplicates the playlist

Not independently challenged. **Confirmed** against a fake server that follows the real receipt rule.

URL import builds an ordered import with no stored operation (`apps/web/src/components/TrackSearch.tsx:654-667`, `apps/web/src/lib/ordered-import.ts:99-106`). Each attempt mints a new operation id (`ordered-import.ts:247-249`). Receipts are per operation id and do not dedupe the library (`apps/api/src/lib/ordered-class-import.ts:138-175`). `class_tracks` has no unique `(class_id, track_id)`. A lost response followed by a second submit appends the same songs again. A full reload would refresh the duplicate picker. The bug is the retry that does not reload. Saved-playlist import passes a storage key and is the control that does not duplicate.

**Remediation:** persist the URL session under a key derived from the class and the submitted URL, or reload class tracks after a non-API failure and skip provider ids already present.

### C-25 — A partial import reports success

Not independently challenged. **Confirmed** against a fake `importTrack`.

Any `importTrack` rejection is swallowed (`ordered-import.ts:219-234`). Placements are only the songs that received a track id (`:240-242`). The function then returns `{error:null}` (`:265`). The URL caller clears the link and reloads (`TrackSearch.tsx:666`, `:705-709`). A 429 on the middle song of three leaves that song out and tells the instructor the import finished. Combined with C-26, a raced 409 is swallowed the same way.

**Remediation:** if any wanted song has no track id, return an error and keep the session. A retry of that session imports only the missing song.

### A-8 — Password reset does not revoke existing sessions

**Confirmed.** Challenge: Upheld. Better Auth 1.6.25 deletes sessions on reset only when `revokeSessionsOnPasswordReset` is set (`evidence/x-a8-better-auth-default.txt`). Ritmo's email-and-password block does not set it (`apps/api/src/lib/auth.ts:141-160`). A cookie minted before reset still gets `GET /api/v1/auth/me` 200.

**Remediation:** set the flag. Acceptance: the pre-reset cookie receives 401, and a new sign-in works.

### B-4 — Leaving the builder drops unsaved inspector text

**Confirmed.** Challenge: Upheld. Notes live in component state (`Dashboard.tsx:5686-5701`). Unmount flushes the intensity zone only. Back, top nav, and Run live → Exit all drop the text. There is no `beforeunload` under `apps/web/src`. The dirty line does say the text is unsaved, which is why this is P2 and not another silent rewrite of saved choreography.

**Remediation:** prompt on Back, top nav, and Run live when the inspector is dirty, or flush the text the way the intensity zone is flushed.

### C-2 — A failed token refresh is always "reconnect"

**Confirmed**, with a narrower trigger. Challenge: Qualified. When a refresh runs, 500, 502, 503, 429, a thrown fetch, and a SoundCloud token 503 all become `409 REAUTH_REQUIRED` (`apps/api/src/lib/music/spotify-playback-token.ts:88-98`, and the same catch in `user-likes.ts` and `user-playlists.ts`). A still-valid access token never enters that catch. This matters once the token is inside the refresh window, which is the state C-1 creates, and on library reads. Mid-class, the Spotify SDK's token callback uses the same mint.

**Remediation:** map `invalid_grant` to reconnect. Map 5xx, 429, and network errors to a retryable failure that does not start OAuth.

### B-5 — A 401 abandons the builder

**Confirmed** for the builder. Challenge: Qualified. `apiResponse` signs out on any 401 (`apps/web/src/lib/api.ts:96-99`). Outside Live, a null session replaces the Dashboard with Login (`apps/web/src/App.tsx:67-97`), which discards the open class and the save that just failed. Commit `17a91a9` keeps Live mounted on purpose. Do not "fix" this by unmounting Live.

**Remediation:** keep the builder mounted across a 401 the way Live is, and keep the unsaved body until sign-in returns.

### D-4 — Every class is refetched in full on the way into and out of Live

**Confirmed** as a request count. Challenge: Qualified. Latency was not measured. With 30 classes, Classes home and Live each call a full run payload per class, and two round trips cost 120 requests against one class-list call (`evidence/d-runpayload-fanout.log`, jsdom, mocked API). `getClassShelfPayload` is `getRunPayload`.

**Remediation:** the shelf should use the class list, or a payload that omits cues, moves, and sections. Re-measure the request count at 30 classes.

### C-3 — A different Spotify URI fails the class

**Probable.** Challenge: Qualified. `getLiveness` throws when `current_track.uri` is not the requested URI (`apps/web/src/lib/playback/spotify-adapter.ts:291-293`), and one rejection fails the runtime (`runtime.ts:618-623`). A fake player reproduces "no longer playing the class track". No live relink was played. Keep P2 only if a real SDK state uses a different URI for the same class track.

### C-7 — Sign-out leaves the provider session in the browser

**Probable** for the cross-user consequence. Challenge: Qualified. Explicit sign-out and Disconnect do not call Spotify `disconnect()` or MusicKit `unauthorize()` (`apps/web/src/lib/session-guard.ts:42-45`, `apps/web/src/lib/musickit.ts:64-91`, `apps/web/src/lib/spotify-playback.ts:204-207`). On a shared studio computer the next Ritmo user can play through the previous user's provider session if the SDK keeps that authorization. That persistence was not observed against a real SDK. Do not tear the player down on the 401 that keeps Live mounted (`17a91a9`). Tear it down on the explicit Sign out and Disconnect actions.

## P3 (compact)

| ID | Status | Finding | Challenge |
| --- | --- | --- | --- |
| A-1 | Confirmed | An edit-share collaborator can publish the owner's class. The share UI is not mounted. | Not challenged. Same dormant surface as A-2. |
| A-2 | Confirmed | Any beta session can share a class to a verified email. The class appears in that person's Library and they cannot remove it. The share and team dialogs are not mounted in the SPA. | Downgraded from P2. The API is live for a hand-written request. |
| A-3 | Confirmed | Share or team-add by email reveals whether the address is unknown, unverified, or verified. | Not challenged. |
| A-4 | Confirmed | A team admin can add members with the owner role. | Not challenged. Teams UI is not mounted. |
| A-5 | Confirmed | Each request repeats the session lookup once per router mounted earlier. Explore does 11. An unknown authed path does 12. Anonymous does 0. No wrong authorization. | Downgraded from P2. |
| A-6 | Confirmed | An edit collaborator cannot move a placement that uses the owner's custom move (422). | Not challenged. |
| A-10 | Probable | Some read-then-write paths return 500 instead of 409 or 404 under concurrency. Not reproduced. | Not challenged. |
| A-11 / D-8 | Confirmed | `GET /auth/capabilities` is mounted and absent from OpenAPI. Regeneration diffs the hand-written registry, so an unregistered route stays green. | Merged. |
| B-6 | Confirmed | Tag-filter replies can land out of order and show the wrong filter selected. | Not challenged. |
| B-7 | Confirmed, product call | End Class leaves Live in one tap. Re-entry starts at 0:00. | Not challenged. Owner decision, not a defect until the owner wants a confirm. |
| B-8 | Confirmed | Live countdowns use `Math.round`, so they show 0:00 for about half a second before the event. | Not challenged. |
| C-3b | Confirmed logic | One transient null Spotify state fails the class within 250 ms. Apple gets a 10 s grace. | Re-ran. Stays P3. |
| C-4 | Probable | The Spotify device id is cached for the page. `not_ready` does not rebuild it. A real id change after a network drop was not shown. | Downgraded from P2. |
| C-9 | Confirmed | A `Retry-After` that would pass the preview deadline is shown as "took too long". | Upheld. |
| C-15 | Probable | SoundCloud playlist import does not filter `access=playable`. Search and likes do. | Not re-executed. |
| C-23 | Confirmed | Resolve and manual attach store a SoundCloud URN beside an existing numeric id, as two tracks. | Not independently challenged. |
| C-26 | Confirmed | Two concurrent first imports of one new provider track: one caller gets 409. A later call is idempotent. Ordered import then hides it via C-25. | Not independently challenged. |
| D-5 | Confirmed | zod is about 26 kB gzip of the startup entry and the web app does not parse with it. The entry is 172.40 kB gzip of a 180 kB budget. | Downgraded from P2. |
| D-6 | Confirmed | `apps/api` typecheck includes `src` only. Typechecking `apps/api/test` reports 61 errors. | Upheld. |
| D-7 | Confirmed | A Dashboard test passes while Live throws, because the fixture omits `sections` and the error boundary catches it. Production payloads include `sections`. | Upheld. |
| D-9 | Confirmed | No React hooks lint rule. | Not challenged. Tooling. |
| D-10 | Confirmed | The Playwright smoke is not in CI or the gate. It passed 2/2 when run separately, on a no-music Live path. | Not challenged. |
| D-11 | Confirmed | CI still ignores GHSA-gv7w, which GitHub withdrew on 2026-06-17. | Not challenged. |

Lane files hold the long form for each P3.

## Probable findings kept out of the confirmed list

C-3 and C-7 are in the ranked table because the code path is real and the unverified condition is a specific SDK behavior. C-4 and C-15 are in the P3 table for the same reason. A-10 was not reproduced.

## Hypotheses not promoted

From Lane C, still open: C-10 (Spotify `getOAuthToken` failure swallowed), C-11 (`expiresAt: null` after refresh never refreshes again), C-12 (SoundCloud follows `next_href` with the user bearer and does not retry), C-13 (Apple 401/403 always becomes user reconnect; Apple's error-code page could not be retrieved), C-14 (Apple library id used as a catalog id), C-16 (concurrent refresh with a rotating refresh token). D-12: the bundle budget does not see `modulepreload` or CSS. Nothing escapes it on this SHA.

## What the challenge changed

| ID | Filed | Verdict |
| --- | --- | --- |
| A-7 | P1 | Qualified. Latent. Not an active incident. |
| B-1, B-2, B-3, C-1, D-1 | P1 | Upheld. B-1 is free placement only. |
| A-9, D-2, D-3 | P2 / P2 / P3 | Merged into D-1. |
| A-2, A-5, C-4, D-5 | P2 | Downgraded to P3. |
| A-8, B-4 | P2 | Upheld. |
| B-5, C-2, C-3, C-7, D-4 | P2 | Qualified, kept. |
| A-11 / D-8 | P3 | Merged. |

The challenge re-ran the API repro, the builder repros, and the provider repro in `/tmp/wt-x`. It did not repeat the A-7 wrangler replay or the purge scale run. It did not open a browser. Details are in `challenge.md`.

## Rejected leads

Recorded so they are not re-filed. Full writeups are in the lane appendices.

- Class-scoped handlers are gated. A missing `requireAccess` was not found on the routes Lane A traced.
- Account linking does not pre-hijack a verified email under the installed Better Auth defaults.
- Password-reset return target does not open-redirect (403).
- No exploitable OAuth callback swap. SoundCloud's callback suite (8 tests) still requires the encrypted state cookie. Refresh persistence keeps a rotated refresh token and does not wipe it when the provider omits a new one.
- SoundCloud ignoring a seek before play. The owner confirmed resume-from-pause by ear on 2026-10-13, and resume uses that path.
- Spotify episodes imported as tracks. They fail the shared schema and are dropped.
- SoundCloud numeric id versus URN on the import path. Fixed earlier. C-23 is the attach path, which still bypasses that fix.
- Apple playback errors are filtered to the active adapter.
- Music constraints hold on the paths reviewed. No Spotify BPM or audio-analysis call. Nothing caches provider audio or provider-derived analysis.
- The service worker does not use the offline shell for `/api/`, and the prompted-update path is present.
- Out-of-order class-detail loads, reorder rollback, and duplicate class creation are guarded.
- The no-music Live clock is wall-clock based.
- Hot queries that were explained use an index (`evidence/d-query-plans.txt`).
- Ignored esbuild advisories are in the production audit graph and do not ship in the Worker or the browser bundle.

## Systemic

- The gate is green (2,078 unit tests, 237 integration tests) and did not catch any P1. The tests that exist lock one of the bugs in: Spotify expiry is asserted as "not connected".
- Migration tests start from an empty database, so a rebuild that deletes child rows cannot fail CI.
- OpenAPI drift is a diff of the hand-maintained registry. A route that was never registered is invisible.
- API integration tests are not typechecked. Sixty-one errors are currently latent.
- One Dashboard fixture omits `sections`, the Live tree throws, the error boundary swallows it, and the test passes.
