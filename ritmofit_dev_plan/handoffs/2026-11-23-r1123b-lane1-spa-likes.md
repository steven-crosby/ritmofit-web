---
date: 2026-11-23
tool: Claude Code (desktop, Neo), round 1123b web Lane 1
lane: lane-1-spa-likes
branch: test/rf-157-spotify-likes-pick-mode
head: 7bd6454
base: 891b1ca
prs: ['#792 (ready, RF-241)', '#793 (this PR, RF-157)']
status: open
---

# Round 1123b web Lane 1: TrackSearch ignores a late My likes page in Saved playlists (RF-241, #792); Spotify likes in Songs pick mode proven at 390 and 1440 (RF-157, #793)

## Done

- [#792](https://github.com/steven-crosby/ritmofit-web/pull/792) (`fix/rf-241-tracksearch-late-likes`,
  head `4b83ae9`): TrackSearch's fetch effect now bumps `reqId` and clears `searching` when Saved
  playlists opens, so a late My likes first page cannot replace an open playlist's rows or clear the
  playlists view's error, loading or reconnect state. Three new tests failed on the unfixed code and
  pass with the fix. Marked ready after CI went green on `4b83ae9`. Not merged.
- [#793](https://github.com/steven-crosby/ritmofit-web/pull/793) (this branch): tests and the record
  only, no app code. An e2e test runs Spotify likes in pick mode at 1440 and on the emulated 390
  phone, and a Dashboard test covers the 15-song cap with Spotify likes.

## Tasks

- [RF-241](../tasks/RF-241.json) (in #792) and [RF-157](../tasks/RF-157.json) (in #793). The owner
  set both Ready in the Neo session
  ([record](https://github.com/steven-crosby/ritmofit-ios/issues/113#issuecomment-7115094547)).
- [RF-242](../tasks/RF-242.json) (TrackSearch Load more notes) was not needed for RF-241 and is
  unchanged.

## In flight

- #792 and #793 wait for the conductor's merge train and the owner's per-PR merge approval. They
  touch different files (#792: `TrackSearch.tsx` and its test; #793: `e2e/smoke.spec.ts` and
  `Dashboard.test.tsx`). Both change `ritmofit_dev_plan/tasks.md`, so the second to merge needs
  `main` merged in and `pnpm tasks:render` rerun before its CI goes green again.

## Restart context

- RF-157's 390 px evidence started as a scratch Playwright probe run before any test was written
  (recorded in the RF-157 evidence). The committed e2e test is the lasting proof.
- The mock catalog has only two Spotify songs (`apps/api/src/lib/mock-catalog.ts`), so the e2e test
  cannot reach the 15-song cap. By the conductor's ruling the cap stays in the component test, with
  no `page.route` stubbing.

## Verification

- #792 (RF-241): the three new tests ran red on the unfixed code (two showed liked songs in the open
  playlist, one lost its reconnect alert). With the fix, `TrackSearch.test.tsx` passed 111 of 111.
  The full AGENTS.md gate on `4b83ae9` passed every step (web 1836, api 698, music 30, integration
  277, e2e 2 of 2), and CI's required job was green on `4b83ae9`.
- #793 (RF-157): `vitest run src/components/Dashboard.test.tsx -t 'RF-151|RF-157'` passed 3 of 3.
  A local mutation (SongPicks rows never disabled) made the cap test fail; it was reverted and
  never committed. `pnpm e2e` passed 4 of 4 (1440 and 390). The full AGENTS.md gate ran on the
  tree committed with this handoff. Every step passed except the first `pnpm test`, which failed
  3 tests while the Neo's load average was 117 to 183: two Dashboard Apple-search tests timed out
  (5 s and 15 s), and the LiveMode RF-185 timing test took 316 ms against 200 ms. None of them is
  new or touched here. The one rerun, at load 84 falling to 39, passed (web 1834, api 698,
  music 30). Integration 277 and e2e 4 of 4 also passed. This is RF-243's pattern under load.
- Skipped: none.

## Production as observed

- Not checked from this environment (Lane mode). Per the round 1123 close, `main` was already
  ahead of production by #789 and #790; #792 and #793 add to that once merged.

## Shared zones touched

- None. No `packages/`, `apps/api/`, OpenAPI, migration, shared FE infrastructure or vendored-for-iOS
  file changed. `Dashboard.test.tsx` gained one test; `Dashboard.tsx` is unchanged.

## Notes for other lanes / iOS

- None. Web client behaviour and tests only, with no contract or design change.
