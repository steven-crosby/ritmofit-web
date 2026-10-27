# Next session — remediation after the 4e0b150 audit

Audit-only. Nothing below is authorized until Steven accepts a packet. Do not
rewrite applied migrations. Do not deploy as part of a fix unless the packet says so.

## Packet 1 — Stop the Builder from rewriting choreography

**Benefit:** the default editing path silently moves cues, and free placement
silently undoes timeline drags. This is the daily data-integrity bug.

**Scope:** B-3, B-2, B-1.

**Work:** in the cue, move, and section editors, send the time field only when
the instructor changed it. When the displayed clock still matches the stored
value, keep the stored milliseconds. Re-seed the track inspector when
`startOffsetMs` changes underneath it, and stop sending `startOffsetMs` on a
notes save unless that field was edited. Correct the comment at
`packages/shared/src/entities/classes.ts:293`.

**Relative effort:** one web PR, plus the shared comment. No migration.

**Risk:** a save that used to "heal" a clock by rounding will stop doing that.
Snap must still run when the instructor edits the clock on purpose.

**Acceptance:** `repro/b-anchor-precision.repro.test.tsx` and
`repro/b-builder-lost-update.repro.test.tsx` pass at HEAD (they currently fail
because they expect the correct values). A text save keeps 10313, 12750, and
241500. A free-placement drag to 65000 stays 65000 after a notes save. A
deliberate clock edit still snaps.

**Depends on:** nothing.

## Packet 2 — Chunk unbounded id lists

**Benefit:** disconnect purge can finish, classes over 100 tracks can enter Live
and be copied, and a custom-move rename does not return 500 after saving.

**Scope:** D-1, including former A-9, D-2, and D-3. One helper, four call sites
(`purge.ts`, `run-payload.ts`, class copy, move rename / class recency).

**Relative effort:** one API PR. No schema change if the helper only chunks
statements. `json_each` is the alternative if chunk size stays awkward.

**Risk:** chunking a purge must stay all-or-nothing, or a failed middle chunk
leaves a partial purge. The rename path must not report success while recency
failed, or must not report failure after the name is committed, unless the
response says the name was saved.

**Acceptance:** the d-purge, d-class-size, and d-move-rename repros pass at 150
tracks or classes. A 500-track purge leaves zero refs.

**Depends on:** nothing. Can run beside packet 1.

## Packet 3 — Spotify is connected when the grant is alive

**Benefit:** Spotify-only classes stay playable past the hour, and a Spotify
blip does not send the instructor through OAuth in the middle of Live.

**Scope:** C-1, then C-2 in the same PR if it stays small.

**Work:** preflight must not treat Spotify `expiresAt` as a disconnected
provider. Refresh stays on `mintSpotifyPlaybackToken`. Map `invalid_grant` to
reconnect. Map 5xx, 429, and network errors to a retryable failure. Update the
coordinator test that currently expects expired Spotify to be
`no_connected_provider`.

**Risk:** a genuinely revoked grant must still say reconnect. Do not cache the
provider token in the client.

**Acceptance:** `repro/c-web-playback-repro.test.ts` and
`repro/c-api-token-refresh-repro.test.ts`, adjusted to the new contract, pass.
SoundCloud's existing exemption stays.

**Depends on:** nothing. Real Spotify playback still needs a browser check by
the owner after the patch. This audit could not hear audio.

## Packet 4 — Guard the next migration rebuild

**Benefit:** the next drizzle-kit rebuild of `classes` or `class_tracks` cannot
silently delete cues and placed moves.

**Scope:** A-7. Do not edit 0005, 0010, 0014, 0016, or 0018.

**Work:** a local check that migrates a populated database and asserts child
counts, using the approach in `repro/x-a7-wrangler-cli-replay.sh`. Document in
the migration convention that `PRAGMA foreign_keys=OFF` does not work on D1.

**Relative effort:** small test or script, plus a short conventions note.

**Risk:** the check needs a populated fixture. An empty database will stay green
and hide the bug, which is the current state.

**Acceptance:** replaying 0018 against the fixture fails the check. Replaying
0021 passes. A new rebuild migration fails the check until children survive.

**Depends on:** nothing. Do this before the next schema migration, not as a
production hotfix. No data repair is proposed.

## Packet 5 — Import the recording the instructor asked for

**Benefit:** resolve stops attaching a different recording, a legal duration
match can finish in Live, a retried URL import does not double the class, and a
rate-limited song is not reported as a finished import.

**Scope:** C-21, C-22, C-24, C-25. C-23 and C-26 can ride along if they stay in
the same helpers (`attachProviderId`, `importTrackFromCandidate`).

**These four were not independently challenged.** Re-read
`lanes/provider-music.md` section 7 and re-run `repro/c-followup-repro.patch`
before coding.

**Risk:** narrowing the match key will stop auto-attaching some legitimate
"(Radio Edit)" titles that current tests lock in. That is the point of the
change. Update those tests on purpose. C-22's window change must not hide a
real early stop past 4 s.

**Acceptance:** the C-21 through C-25 repros pass under the new contract.
Instrumental, karaoke, and club mix do not auto-attach when an exact title
exists. A SoundCloud finish 3.5 s short of the stored duration advances. A
second URL submit after a lost response does not grow the class. A 429 returns
a non-null error and a retry imports only the missing song.

**Depends on:** packet 3 is independent. Do not mix them.

## Packet 6 — Sessions and leftover provider logins

**Benefit:** a password reset actually signs out the old sessions. Explicit
sign-out and Disconnect drop the Spotify and Apple sessions in the browser.

**Scope:** A-8. C-7 only for the explicit Sign out and Disconnect actions.

**Owner decision:** do not tear providers down on the 401 that keeps Live
mounted (`17a91a9`). B-5 should keep the builder mounted across that 401 rather
than unmounting Live.

**Acceptance:** pre-reset cookie gets 401. A new sign-in works. Disconnect
calls the SDK disconnect or unauthorize. A 401 during Live still leaves Live
mounted.

## Later, not in the first six

| Item | Why it waits |
| --- | --- |
| D-4 shelf refetch | Real, but a request-count problem. Measure after packet 2 if large classes are the concern. |
| D-5 zod in the entry | Budget still passes. Worth doing before the next dependency that eats the 7.6 kB headroom. |
| D-6, D-7, D-8, D-10 | Make the gate able to see the bugs above. D-6 (typecheck API tests) will produce 61 errors to classify before it can go red-on-new only. |
| A-2, A-1, A-3, A-4 | Dormant share and team API. Decide whether to unmount the routes or leave them until that product returns. Not a SPA bug today. |
| A-5 | Memoize `requireSession` before adding more root routers. |
| C-3, C-4, C-15 | Need a real SDK or a SoundCloud playlist sample. Do not fix C-3 from the fake alone. |
| B-4 | Prompt or flush. Smaller than packet 1 and easy to add there if the builder files are already open. |
| B-7 | Product call on End Class confirmation. |

## Unfinished investigations

- C-10, C-11, C-12, C-13, C-14, C-16 in `lanes/provider-music.md` section 6. C-13 needs Apple's error-code page, which did not render without JavaScript on 2026-10-27.
- B-9: free-mode silence gap does not advance in a hidden tab. Code only.
- A-10: concurrent write returning 500. Not reproduced.
- Column-level reconcile of `ritmofit_dev_plan/schema.md` against Drizzle.
- Audible playback of C-1 after a fix. Owner browser, not this environment.
- Whether any production account already has a failed purge row. Would require a read-only production query Steven authorizes. This audit did not look.

## Restart

1. Read `findings.md`, then the packet being implemented.
2. Branch from current `main`. This audit's SHA is `4e0b15096995c125b3941bf374a6a580e2ff52f8`. Re-check the finding against `main` if it has moved. Open PRs at audit time were #625 and #596, both test-only, and neither overlapped these findings.
3. Apply the matching patch under `repro/` in a worktree and confirm the test still shows the defect before changing production code.
4. Local D1 only. The A-7 script is `repro/x-a7-wrangler-cli-replay.sh`.

## Still not authorized by this audit

Product fixes, refactors, dependency upgrades, lockfile changes, migration edits,
commits of the audit directory, production access, remote D1, provider accounts,
and deploys. A remediation session needs its own owner go-ahead per packet.
