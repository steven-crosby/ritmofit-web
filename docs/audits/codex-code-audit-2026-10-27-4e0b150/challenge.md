# Challenge review — ritmofit-web @ 4e0b150

Independent challenge pass. The lane notes were not written here. Goal: disprove each
priority finding, then keep, narrow, or drop it. No tracked product file was edited.
No production, remote D1, secrets, or provider account was used. Browser setup was
not attempted; jsdom plus route reading stands for B-1 and B-3.

Execution: `/tmp/wt-x` at `4e0b15096995c125b3941bf374a6a580e2ff52f8`, with
`repro/b-repro-tests.patch`, `repro/c-provider-repro.patch`, and `repro/a-repro.patch`
applied only in that worktree. `/tmp/wt-c` was not touched. The A-7 wrangler replay
was not repeated (`evidence/x-a7-wrangler-cli-replay.log`).

## Verdicts

| ID | Filed | Verdict |
| --- | --- | --- |
| A-7 | P1 | **Qualified** — mechanism upheld on local wrangler D1; already-applied migrations are historical; live risk is the next parent rebuild; keep P1 as a latent landmine, not an active incident |
| B-1 | P1 | **Upheld** (free placement only; sequential default is unaffected) |
| B-2 | P1 | **Upheld** (cues re-run; moves same shape, not separately executed) |
| B-3 | P1 | **Upheld** |
| C-1 | P1 | **Upheld** |
| D-1 | P1 | **Upheld** — purge instance of the shared 100-variable ceiling |
| A-9 | P2 | **Merged into D-1** (same `inArray` ceiling; purge text duplicates D-1, run-payload/copy duplicates D-2) |
| D-2 | P2 | **Merged into D-1** |
| D-3 | P3 | **Merged into D-1** (same ceiling; partial commit is the extra fact) |
| A-2 | P2 | **Downgraded to P3** — API live, SPA UI not mounted |
| A-5 | P2 | **Downgraded to P3** — fan-out real, no functional failure |
| A-8 | P2 | **Upheld** |
| B-4 | P2 | **Upheld** |
| B-5 | P2 | **Qualified** — builder path real; Live is intentionally kept (`17a91a9`) |
| C-2 | P2 | **Qualified** — upheld only once the stored access token is already due for refresh |
| C-3 | P2 | **Qualified** — logic reproduced; no live relink observed |
| C-4 | P2 | **Downgraded to P3** — cache bug real; new `device_id` on reconnect not shown |
| C-7 | P2 | **Qualified** — explicit sign-out and Disconnect upheld; do not tear down on a 401 that keeps Live mounted |
| D-4 | P2 | **Qualified** — request counts upheld; latency not measured |
| D-5 | P2 | **Downgraded to P3** — zod is in the entry; the budget still passes |
| D-6 | P3 | **Upheld** |
| D-7 | P3 | **Upheld** (test-only; production payload includes `sections`) |
| A-11 / D-8 | P3 | **Merged** — one missing `GET /auth/capabilities`, and a gate that cannot see it |

C-9 stays **Upheld** at P3 (music repro still throws `AbortError`). C-15 was not
re-executed (no SoundCloud account) and is not disproved. C-3b's fake-SDK failure
re-ran green; it stays a P3 logic finding.

## Root-cause merges

**D1 bound parameters (100 per statement).** `inArray(ids)` over an unbounded id
list is one bug with three surfaces: disconnect purge (D-1, also filed as A-9),
run-payload and class copy above 100 tracks (D-2, also in A-9), and custom-move
rename touch of 100+ parent classes (D-3, also `class-recency.ts` in A-9). Fix
once, with a shared chunk or `json_each` helper, and test all three. Do not ship
three unrelated patches.

**OpenAPI blind spot.** A-11 and D-8 are the same gap: `GET /auth/capabilities` is
mounted and absent from `openapi.json`, and `pnpm --filter @ritmofit/api openapi`
only diffs the hand-maintained registry, so an unregistered route stays green.

## A-7 — Qualified (latent P1, not an active incident)

Local wrangler D1 reproduces the cascade. Replaying `0005`, `0010`, `0014`, `0016`,
and `0018` through `wrangler d1 migrations apply --local` exits 0 and deletes child
rows (cues and moves 1→0; `0005` and `0016` also delete `class_tracks`). `0021`
preserves all four counts (`evidence/x-a7-wrangler-cli-replay.log`). That is the
same CLI path used for local migrations, not only the vitest Miniflare helper.
Cloudflare documents that D1 foreign-key enforcement matches `PRAGMA foreign_keys = on`
for every transaction, and that user SQL cannot turn it off inside a migration
because each query runs in an implicit transaction
(<https://developers.cloudflare.com/d1/sql-api/foreign-keys/>, accessed 2026-10-27).
`PRAGMA defer_foreign_keys` only delays constraint checks; it does not suppress
`ON DELETE CASCADE` actions. Remote D1 was not touched, so remote behaviour is the
documented one plus this local reproduction, not a new production experiment.

These files are already applied, as recorded — not re-queried — in
`ritmofit_dev_plan/HISTORY.md`. `0021_rainy_falcon.sql` was applied on 2026-10-22
(`cues` had 23 rows after; no pre-apply count). Later deploys, including
2026-10-26 `c07bba3`, report nothing pending. The repo has no migration after
`0021`, and `c07bba3..4e0b150` adds none. `0018` was applied when production
`class_tracks` had 0 rows (HISTORY, 2026-06-26), so that apply did not delete
choreography. `0021` rebuilds `cues`, which has no child tables, and the local
replay kept the cue row. Historical loss from `0005` / `0010` / `0014` / `0016`
is not assessable here and is not claimed. Do not rewrite those applied files.

The live risk is the next drizzle-kit rebuild of a referenced parent (`classes`,
`class_tracks`, and the other cascade parents in `apps/api/src/db/schema.ts:218`).
`apps/api/migrations/0018_overjoyed_roxanne_simpson.sql:1` turns foreign keys off,
`:29` drops `class_tracks`, and children use `onDelete: 'cascade'`
(`schema.ts:381`, `:418`). That future migration would exit 0 and wipe cues and
placed moves. Keep P1 for that landmine. It is not a current production outage.

## B-1 — Upheld (P1, free placement only)

The notes Save really sends the pre-drag start, and the server will store it.
`TrackInspector` is keyed only by track id (`apps/web/src/components/Dashboard.tsx:4685`),
so a payload refresh does not re-seed `startAt` (`:5644`). In free mode Save always
includes `startOffsetMs` (`:5837-5848`). `parseInspectorAnchor` (`:5568-5571`)
preserves the stored millisecond value only when the field text still matches the
*current* track's clock; after a drag that crosses a displayed second, the stale
`1:00` is parsed back to 60000. Re-run: the timeline commit calls
`updateClassTrack` with `startOffsetMs: 65000`, the field still shows `1:00`, and
the notes Save sends `60000` (`evidence/x-bc-repro-rerun.log`). The jsdom double
stores whatever body it is given. The real route accepts that field:
`updateClassTrackSchema` includes `startOffsetMs`
(`packages/shared/src/entities/classes.ts:231`, assigned at `:294`) and
`apps/api/src/routes/class-tracks.ts:421` and `:577` write it when present. The
comment at `classes.ts:293` ("`startOffsetMs` … not here") is stale and would
mislead a fix. Default `timeline_mode` is `sequential`
(`apps/api/src/db/schema.ts:131-135`), and sequential saves omit the field, so
back-to-back classes do not hit this. Free placement is opt-in and is exactly the
mode where the drag is the product. No browser pass.

## B-2 — Upheld (P1)

The cue list is loaded only when `classTrackId` changes
(`apps/web/src/components/ChoreographyEditor.tsx:512-531`). A marker drag updates
the cue and refreshes the run payload (`Dashboard.tsx:4519-4523`) and does not
reload that list. `startEdit` seeds from the stale row (`:533-540`) and `saveEdit`
always sends `anchorMs` (`:562-563`). Re-run: drag commits `11000`, the edit field
still shows `0:10`, the text Save sends `10000`. `updateCueSchema` is a partial of
fields that include `anchorMs` (`packages/shared/src/entities/choreography.ts:24`,
`:99`), and `apps/api/src/routes/cues.ts:120-134` persists `anchorMs` when it is
present. `MovesSection` uses the same load / `startEdit` / `saveEdit` shape
(`ChoreographyEditor.tsx:1151-1178`); that variant was not executed. Sections are
B-3, not this stale-list bug.

## B-3 — Upheld (P1)

Editing text, intensity, or section type rewrites an untouched anchor. The edit
clock is `formatClockFromMs`, which rounds to a whole second
(`apps/web/src/lib/duration.ts:25-29`). Save always sends `maybeSnap` of that
parsed clock (`ChoreographyEditor.tsx:94-100`, `:540`, `:563`, `:1153`, `:1178`).
Snap defaults on whenever BPM is known (`:96`). At 128 BPM a beat is 468.75 ms;
10313 ms is beat index 22, and the rounded `0:10` (10000 ms) snaps to index 21,
9844 ms — one beat earlier. Re-run: cue `10313 → 9844`, move `12750 → 13000`
(no tempo, round only), section `241500 → 242000`
(`SegmentBand.tsx:536-547` sends `startOffsetMs` with no snap). The server writes
those fields (`cues.ts:125-134`, `sections.ts:63-65`,
`packages/shared/src/entities/sections.ts:36`). The track inspector already avoids
this with `parseInspectorAnchor`; the choreography editors do not. This hits
sequential classes, not only free placement. No browser pass.

## C-1 — Upheld (P1)

Nothing on the Live or preview path refreshes a Spotify access token before
preflight. `GET /providers/connections` returns the stored `expiresAt`
(`apps/api/src/routes/provider-connections.ts:153-163`, `:410-418`) and does not
call `mintSpotifyPlaybackToken`. `providerConnectionState` maps `expiresAt <= now`
to `expired` for every account-backed provider (`apps/web/src/lib/providers.ts:117`).
`liveConnections` keeps only `connected` (`apps/web/src/lib/playback/coordinator.ts:52-61`),
and Spotify playback requires a connection (`packages/shared/src/enums.ts:86`).
`LiveMode` preflights that list (`apps/web/src/components/LiveMode.tsx:513-524`,
`:564-572`). The server refresh lives in `mintSpotifyPlaybackToken`
(`apps/api/src/lib/music/spotify-playback-token.ts:75-98`) and is reached from
`GET /providers/spotify/playback-token` (`provider-connections.ts:374`), which the
web app calls only from `getSpotifyPlayback` (`apps/web/src/lib/spotify-playback.ts:150`).
That runs after a track is selected as playable. Likes and playlist reads refresh
too (`user-likes.ts`, `user-playlists.ts`); Live does not call them. Paste-preview
reload in `TrackSearch.tsx:344-358` re-reads connections after a library call; it
is not on the Live path. SoundCloud is exempt on purpose (`coordinator.ts:73-78`,
test at `coordinator.test.ts:150`). Apple stores `expiresAt: null`
(`provider-connections.ts:404`). Re-run: expired Spotify with `streaming` is
`no_connected_provider`, whole-class preflight fails, capability label is
"Reconnect for playback". A class that also has a SoundCloud or Apple ref can
still play that other provider. Spotify-only classes cannot.

## D-1 — Upheld (P1), with A-9 / D-2 / D-3 merged

`purgeProviderMetadata` deletes refs and clears art with `inArray` over every
track id for that provider (`apps/api/src/lib/music/purge.ts:164-176`). D1 allows
100 bound parameters per statement. Lane D's local run (not repeated; seeding
hundreds of tracks again would not change the bracket) succeeds at 50 and 95 and
throws `too many SQL variables` at 99, 100, 150, and 500, with `remainingRefs = n`
(`evidence/d-purge-scale.log`). The exact cutoff between 96 and 98 was not
measured. With a queue duty id the delete binds more than the art update, so the
production cron path fails first, around the high 90s. `MAX_PLAYLIST_IMPORT_TRACKS`
is 100 (`packages/shared/src/entities/classes.ts:313`), so one max import is
enough. The batch is atomic, `drainPurgeQueue` retries then `markFailed`
(`purge.ts:86-105`), and the only signal is a log line. That is a real compliance
failure for the users with the largest libraries. The same ceiling makes
run-payload and copy return 500 above 100 tracks (`apps/api/src/lib/run-payload.ts:121-135`,
`apps/api/src/routes/classes.ts:225-231`; D-2) and makes a custom-move rename
return 500 after the name is already saved (`apps/api/src/routes/moves.ts:175-178`,
`apps/api/src/lib/class-recency.ts:39-42`; D-3). File those as one fix. D-3 stays
a P3 symptom (the rename stuck, recency did not); the purge stays the P1.

## A-2 — Downgraded to P3

The route is mounted. `shareRoutes` and `teamRoutes` are registered in
`apps/api/src/index.ts:187-188`. Re-run: a stranger's share returns 201, the class
appears in the victim's `GET /classes`, the victim's DELETE returns 403, and a
team add returns 201 (`evidence/x-a-repro-rerun.log`). `listVisibleClasses` unions
direct and team shares (`apps/api/src/lib/authz.ts:220-229`), so the Library would
render the row. The product UI does not offer this. `ShareDialog` and
`TeamsDialog` are imported only by their own tests, not by `Dashboard` or any
other screen, and both files describe themselves as dormant. A beta user clicking
through the SPA cannot create a share or a team. They can if they send the JSON
themselves with a session cookie. Closed beta plus an unmounted UI is why this is
P3 until a client mounts the writes. It is not unmounted on the server, and it is
not a P2 product-path bug today.

## A-8 — Upheld (P2)

Installed Better Auth is 1.6.25. `dist/api/routes/password.mjs:172` deletes
sessions only when `emailAndPassword.revokeSessionsOnPasswordReset` is truthy
(`evidence/x-a8-better-auth-default.txt`). Ritmo's `emailAndPassword` block does
not set it (`apps/api/src/lib/auth.ts:141-160`). Re-run: the cookie minted before
`/api/auth/reset-password` still gets `GET /api/v1/auth/me` 200, and `sessions`
still has 1 row. Session lifetime bounds the window; it does not evict the
pre-reset session. The "attacker signed up first with an allowlisted email" chain
stays a hypothesis and is not required for this finding.

## A-5 — Downgraded to P3

The fan-out is real and was re-measured. Each root router calls
`requireSession` (`apps/api/src/middleware/auth.ts:13-24`), and Hono runs those
`use('*')` handlers for later routes mounted at `/` (`apps/api/src/index.ts:175-190`).
Re-run session selects: `/auth/me` 1, `/classes/:id` 1, `/classes/:id/tracks` 2,
`/user-moves` 6, `/teams` 9, `/explore` 11, unknown authed path 12, anonymous 0
(`evidence/x-a-repro-rerun.log`). One correction: `GET /providers/connections` is
1, because that router is mounted first. There is no functional mis-authorization.
Twelve extra D1 reads on a solo 404 is waste, not a P2 outage. Memoizing once
`userId` is set is still worth doing before more root routers land.

## B-4 — Upheld (P2)

Unsaved inspector text lives in component state (`Dashboard.tsx:5686-5701`).
Unmount flushes only the intensity zone (`:5751-5760`). Back (`closeBuilder`,
`:552-558`), top-nav (`:914-923`), and Run live (`:824`, which replaces the
builder tree) all drop it. Re-run: notes are `""` after Back, after Account then
Classes, and after Run live → Exit, and the inspector is closed after Exit. There
is no `beforeunload` under `apps/web/src`. The dirty line does tell the instructor
the text is unsaved, which keeps this at P2 rather than a silent rewrite of saved
choreography. Run live is still a normal "try it" step from the builder.

## B-5 — Qualified (P2)

A 401 from `apiResponse` calls `authClient.signOut()` (`apps/web/src/lib/api.ts:96-99`).
Outside Live, a null session replaces `Dashboard` with Login
(`apps/web/src/App.tsx:67-97`), which discards the open class and every in-memory
draft, including the body of the save that just failed. `17a91a9` keeps Live
mounted when `liveActive` is set (`App.tsx:67-68`, `Dashboard.tsx:264`, `:822-856`)
and shows "Signed out. Finish the class, then sign in." The builder has no
equivalent. This was not run in a browser. Frequency depends on a real 401
(expiry or revoke), which this pass did not time. Saved server state is untouched.
The finding stands for the builder; it must not be "fixed" by unmounting Live.

## C-2 — Qualified (P2, narrower trigger)

When a refresh is attempted, every failure becomes `409 REAUTH_REQUIRED`.
`postToken` throws away the HTTP status (`packages/music/src/spotify-oauth.ts:119-121`).
`mintSpotifyPlaybackToken` catches that and maps it to reauth
(`apps/api/src/lib/music/spotify-playback-token.ts:88-98`). The same catch is in
`user-likes.ts:168-179` and `user-playlists.ts:420-431`. Re-run: 500, 502, 503,
429, a thrown fetch, and a SoundCloud token 503 all become 409; nothing is
persisted. A still-valid access token never reaches that catch
(`spotify-playback-token.ts:75-80`, with a 60 s skew). A Spotify 5xx during
playback of a fresh token is a different error. The bad mapping matters when the
access token is already expired or inside the skew — the state C-1 creates — and
when a library read refreshes. Mid-class, the SDK's `getOAuthToken` calls the
same mint (`spotify-playback.ts:155-162`) and swallows a failure into a reconnect
error. Keep P2 for that path. Do not describe every provider blip as a false
reconnect.

## C-3 — Qualified (P2, logic only)

`getLiveness` throws when `current_track.uri` is not the requested uri
(`apps/web/src/lib/playback/spotify-adapter.ts:291-293`), and one rejection fails
the runtime (`apps/web/src/lib/playback/runtime.ts:618-623`). Re-run with a fake
player: a different uri becomes "no longer playing the class track" and the
coordinator enters error. No live relink was played. Spotify's relinking guide
says players may substitute another market instance; the Web Playback SDK page
does not formally say `linked_from` is on `getCurrentState`. User-token library
imports can already be the owner's market. Catalog imports without `market` are
the plausible reach. Severity stays P2 only if a real SDK state uses a different
uri; otherwise this branch does not fire. Not upgraded, not rejected.

## C-4 — Downgraded to P3

The page singleton is cached for the life of a successful connect
(`apps/web/src/lib/spotify-playback.ts:139-202`). The `ready` listener resolves
once (`:173-178`). There is no `not_ready` listener. `resetSpotifyPlayback`
(`:204-207`) has no production caller. Re-run: after `not_ready(A)` and `ready(B)`,
`getSpotifyPlayback()` still returns device A. `destroy` intentionally does not
disconnect that device ("Never disconnect the singleton device; the next track
reuses it", `spotify-adapter.ts:329-330`), which is correct for track changes and
is why a later `ready` with a new id would stick. Whether the real SDK changes
`device_id` after a gym Wi-Fi drop was not shown. Until that is shown, this is a
missing rebuild, not a demonstrated class-halting bug. P3.

## C-7 — Qualified (P2 for explicit sign-out and Disconnect)

`signOutByUser` is `authClient.signOut()` only (`apps/web/src/lib/session-guard.ts:42-45`).
Explicit sign-out clears `lastUser` even if Live was active (`App.tsx:46-48`), so
Dashboard unmounts. `SpotifyAdapter.destroy` pauses and does not call
`player.disconnect` or `resetSpotifyPlayback` (`spotify-adapter.ts:322-336`).
Nothing in `apps/web/src` calls MusicKit `unauthorize`. Disconnect deletes server
tokens only (`provider-connections.ts:427-440`). That residue is real for a second
person in the same tab. It is not verified against Apple's or Spotify's actual
storage. `17a91a9` keeps Live mounted on an automatic session loss so the class
can finish (`App.tsx:67-68`, `Dashboard.tsx:827-832`). Destroying the Spotify
device or unauthorizing MusicKit on that 401 path would fight the shipped
behaviour. Teardown belongs on explicit Sign out and on Disconnect, not on the
mid-class 401.

## D-4 — Qualified (P2 on counts, not on measured latency)

`getClassShelfPayload` is `getRunPayload` (`apps/web/src/lib/api.ts:268`).
`ClassesHome` fetches one payload per loaded class on `candidateKey`
(`apps/web/src/components/ClassesHome.tsx:176-227`). The Live queue does the same
for every class with tracks, with no concurrency cap (`Dashboard.tsx:2669-2742`),
and both pieces of state die when the destination unmounts. Lane D's jsdom count
(not re-spliced this pass; the harness is a cut of `Dashboard.test.tsx`) is 120
`getRunPayload` calls for 30 classes across Classes → Live → Classes → Live
(`evidence/d-runpayload-fanout.log`). The code still matches that shape. No
network timing was taken. Keep P2 for the refetch on the core loop. Do not cite a
stall that was not measured.

## D-5 — Downgraded to P3

`apps/web/src` does not import `zod`. The startup entry still attributes 91.8 kB
raw, 15.2%, to zod (`evidence/d-entry-composition.txt`), from shared modules whose
top-level `z.object` calls are not shaken out. The built entry is 172.40 kB gzip
against a 180 kB budget (`evidence/d-09-web-build.log`). The isolated ~26 kB gzip
figure overstates the marginal win. This is real waste and a thin budget, and it
does not break a current page. P3 until a rebuild shows the entry over the limit
or a split actually removes zod.

## D-6 — Upheld (P3)

`apps/api/tsconfig.json:9` includes only `src`. `pnpm -r typecheck` does not see
`apps/api/test/**` or `apps/api/scripts/**`. Vitest strips types. Lane D's
throwaway tsconfig reported 61 errors in 10 test files
(`evidence/d-api-test-typecheck.txt`); that count was not re-run. The gap is
enough to uphold. Those errors are described as strictness noise, not as failing
assertions, and nothing here contradicts that.

## D-7 — Upheld (P3, test-only)

`liveRunPayload` in `apps/web/src/components/Dashboard.test.tsx:111-155` omits
`sections` and is cast `as unknown as RunPayload`. Clicking Preflight mounts
`LiveMode`, and `liveSectionAt` reads `sections.length`
(`apps/web/src/components/LiveMode.tsx:388`, called from `:817`). The gate log
shows that `TypeError` caught by `ErrorBoundary` during the test that still
passes (`evidence/d-07-test.log:25-70`). The assertion is only that
`getRunPayload` was called (`Dashboard.test.tsx:1346-1349`). The API run payload
always includes `sections` (`apps/api/src/lib/run-payload.ts:107-112`). Production
impact is nil. The green test does not prove Live rendered.

## A-11 / D-8 — Merged (P3)

Both lanes found the same missing operation, `GET /auth/capabilities`
(`apps/api/src/routes/auth.ts:20-29`), and nothing in the spec without a route.
D-8's extra point holds: regenerating `openapi.json` from the manual registry
cannot fail on a route that was never registered. One finding, two sentences.

## Not re-run, and why

| Item | Why |
| --- | --- |
| `repro/x-a7-wrangler-cli-replay.sh` | Already established. Judgment only. |
| D-1 / D-2 / D-3 scale seeds | Existing Miniflare logs plus the `inArray` call sites. Another 500-track seed would not move the verdict. |
| D-4 fan-out harness | Requires splicing `Dashboard.test.tsx`. Call sites re-read; counts taken from `evidence/d-runpayload-fanout.log`. |
| D-6 `tsc` | The include gap is the finding. The 61-error tally was not recounted. |
| Browser for B-1 / B-3 | Not started. jsdom failures plus the PATCH schemas are the evidence. |
| Remote D1, production row counts, real Spotify relink, real SDK `device_id` | Out of bounds. |

## Newly noticed while challenging

`packages/shared/src/entities/classes.ts:293` says a class-track patch does not
carry `startOffsetMs`. The schema on the next line does. A remediation that
trusts the comment will not stop B-1.

`GET /providers/connections` does not share the A-5 fan-out (1 session select).
Live's connection read is the cheap route; `/user-moves`, `/teams`, and `/explore`
are the expensive ones.

`SpotifyAdapter.destroy` documents that the singleton device is reused across
tracks. C-4 and C-7 are the absence of a rebuild on `not_ready` and on explicit
sign-out, not an accident inside `destroy`.
