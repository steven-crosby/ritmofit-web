---
date: 2026-10-28
tool: Claude Code (local subagent)
lane: lane-1-fairplay-probe
branch: fix/rf-107-fairplay-probe
head: 0e9e098
base: dc8e72a
prs: ['#649 (owner-gated, ready-to-merge requested)']
status: open
---

# The FairPlay probe now runs bound, bounded, after play(), and the error banner carries its word

## Done

- [#649](https://github.com/steven-crosby/ritmofit-web/pull/649): fixes AUD-002 in
  `apps/web/src/lib/musickit.ts` and reorders the probe in
  `apps/web/src/lib/playback/apple-music-adapter.ts` (the orchestrator approved the playback files
  for this lane).

## Tasks

- [RF-107](../tasks/RF-107.json): set Done in #649, which closes it at merge.
- [RF-29](../tasks/RF-29.json): the owner's iPhone Safari check that records `modern-access: <word>`
  after #649 is deployed.
- [RF-108](../tasks/RF-108.json): next Lane A PR in `playback/`. It will rebase over #649's adapter
  change.

## In flight

- #649 is waiting for `owner-approved` and the final review and merge. A Lane session never merges.

## Restart context

- The banner word can now be one of `ok`, a DOMException name, a built-in error name (`TypeError`
  and the others, per the owner's 2026-10-28 decision), `other`, or `timeout`. A word that arrives
  after the 2 s timeout replaces `timeout` for later banners.
- A media error that fires before the probe settles is held, for at most about 2 s, until the word
  arrives. If the adapter is destroyed in that time, the error is dropped.
- This was not checked in WebKit or on a device. Unit tests use receiver-checked stubs, matching
  the audit's Chromium evidence.

## Verification

- Run: see the #649 body (full gate, e2e on port 8798). The receiver-checked test failed on
  `dc8e72a` before the fix and passes after it.
- Skipped: nothing in the gate. The real-device check is owed under RF-29.

## Production as observed

- `main` vs production: not checked from this environment.

## Shared zones touched

- `apps/web/src/lib/playback/apple-music-adapter.ts` and its test (the orchestrator approved both).
  No other frozen zone.

## Notes for other lanes / iOS

- None. No contract, API or token change.
