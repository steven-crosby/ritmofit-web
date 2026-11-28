---
date: 2026-11-27
tool: 'Codex (local)'
lane: 'solo'
branch: 'docs/rf-111-codex-takeover'
head: 'n/a'
base: '8acd048'
prs: ['#811 (draft)']
status: open
---

# Codex takeover of the November web batch

## Done

- Reconciled Claude's November 24, 26 and 27 sessions with GitHub and both task boards. Web
  [#806](https://github.com/steven-crosby/ritmofit-web/pull/806) and
  [#807](https://github.com/steven-crosby/ritmofit-web/pull/807) landed before the conductor change.
  [#809](https://github.com/steven-crosby/ritmofit-web/pull/809) and
  [#810](https://github.com/steven-crosby/ritmofit-web/pull/810) landed afterward.
- iOS batch [#255](https://github.com/steven-crosby/ritmofit-ios/issues/255) closed after the parity
  refresh, RF-1136 and close-out records landed. See iOS BUILD_ORDER and RF-1121, RF-1004 and RF-1244.

## Tasks

- [RF-111](../tasks/RF-111.json) holds the Creating decision, the three unresolved findings and the
  owner decision needed on the draft. [RF-249](../tasks/RF-249.json) holds the merged web PRs' polish.
- [RF-237](../tasks/RF-237.json) holds the still-relevant button review items from #786.
  [RF-254](../tasks/RF-254.json) holds RF-235's device checks. [RF-238](../tasks/RF-238.json) tracks
  the earlier live Apple redirect check.

## In flight

- Draft [#811](https://github.com/steven-crosby/ritmofit-web/pull/811),
  `fix/rf-111-stale-hidden-requests` at `d69c0f6`, is the only open product PR observed. Its body
  describes round two, while its branch RF-111 record says Done and has no next action. The final
  review still found three open issues. Before asking for approval, reconcile RF-111.json and the
  generated board against main if this import lands first, then confirm the exact final head.
  RF-257 was proposed in the transcript, contingent on the owner's disposition.

## Restart context

- [#805](https://github.com/steven-crosby/ritmofit-web/issues/805) is closed and
  [#808](https://github.com/steven-crosby/ritmofit-web/issues/808) is open. The latter names the
  outgoing Claude session as conductor. The issue's recorded window ends November 28 at
  19:30 MST. Any new batch needs its own owner pre-approval and named conductor.
- The outgoing plan queued [RF-119](../tasks/RF-119.json), [RF-210](../tasks/RF-210.json), then
  [RF-209](../tasks/RF-209.json), which share Dashboard. RF-119 first checks whether another
  surface can change its two fields while the inspector is open. The outgoing plan would cancel
  RF-119 with evidence if that premise fails.
- Batch #255 and web #805 record the shared Neo scheduling constraints. Serialize iOS builds,
  iOS CI and local verification. Treat parity copy warnings as a stop in a pre-approved batch.
- The November 24 release-marker decisions already live in [RF-244](../tasks/RF-244.json) and
  iOS RF-1241. Web [RF-245](../tasks/RF-245.json) tracks the first subsequent real deploy with the
  new guard and tag. The November 24 production checks are tracked in RF-130 and RF-149, and the
  older web handoff triage in [RF-96](../tasks/RF-96.json). The native November 24 handoff already
  records the Mac button and field decisions.

## Verification

- Checked remote main, open PRs, batch issues and task records. GitHub CI succeeded on the
  observed #811 head. The RF-111 findings are attributed to Claude's verifier and reviewers.
- No application, device or provider tests were rerun during the import.

## Production as observed

- Latest deploy tag observed was `deploy/2026-11-24T0237Z-1eed288`. Web main `8acd048` is ahead
  of that recorded deployment. The live Worker was not checked.

## Shared zones touched

- None. Task records, generated board and this handoff only.

## Notes for other lanes / iOS

- No contract or token changes. The latest recorded native uploads are iPhone 1.0 (8) and
  Mac 1.0 (10) at iOS `0590e86`. Later native work is on main, and each upload needs owner approval.
