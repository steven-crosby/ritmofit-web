---
date: 2026-10-11
tool: Codex (local)
lane: lane-1-live-short-viewport
branch: codex/r20261011c-live-short-viewport
head: 9702fd0299063f02890a5d82ab990e047763afc7
base: 6691c9d73adaf71bd488f3b1293146c8a9925e85
prs: ['#518 (draft)']
status: open
---

# Live PR #518: reviewed cutoff/completion corrections, renewed delivery checks owed

## Done

- Published checkpoint `9702fd0` in [draft PR #518](https://github.com/steven-crosby/ritmofit-web/pull/518).
- Reproduced review P2s before edits: four vitals failures near the 700px cutoff
  and five compact completion visibility failures. Original evidence is preserved.
- Corrected short portrait cutoff to 800px and exposed Complete in the compact
  clock slot without shrinking teaching type or redesigning finish controls.
- Fresh P2 candidate: 90/90 viewport and 68/68 state rows pass. Completion is
  measured visibly unobscured in Cue-by-Cue and Full List. 799/800/801 boundaries
  pass at 320/375 widths; 375×812 remains expanded.
- Focused LiveMode tests: 93/93 pass, including two completion regressions.
- Updated [evidence](../../docs/audits/live-short-viewport-2026-10-11/README.md)
  separates checkpoint, P2 baseline/candidate, source hashes and diagnostics.

## In flight

- P2 follow-up is locally corrected; root owns the authorized commit/push and
  renewed exact-head CI/review. Planning brief stays untracked and excluded.
- Full P2 local gate is complete: all twelve effective checks pass, including
  retained typecheck failure and passing affected reruns. Final source/test hashes
  match browser capture.
- Hosted CI passed on checkpoint `9702fd0`; CI and renewed review for the follow-up
  head remain pending at record time. Root already has commit/push authority.

## Next action

Root will commit/push the authorized follow-up to PR #518, then verify renewed CI
and review on its exact new head. The next owner decision after those checks is
separate merge approval. Merge, deploy and cleanup remain unauthorized.

## Blockers and owner decisions

- Native 200% zoom remains unverified: isolated headed Chrome was attempted, but
  native tooling targeted the active user profile and the root tab attempt met
  concurrent user activity. No zoom command was issued.
- Real-iPhone, audible/provider and screen-reader acceptance are not established
  by these synthetic checks; existing acceptance handoff retains those obligations.
- Steven approved corrective code/tests, local verification, commit/push and renewed
  CI/review. Only root performs publication; merge/deploy/cleanup are not approved.

## Verification

- P2 baseline on `9702fd0`: 90 viewport/68 state rows completed, no page exceptions;
  four viewport and five completion failures reproduced; intentional gate exit 1.
- P2 candidate: 90/90 viewport and 68/68 state checks pass. Portrait requires
  visibility; landscape/desktop allow scrolling with content reachability checks.
- Focused LiveMode 93/93 pass. Full P2 gate: all twelve effective checks pass; web
  1150, API 486, music 30 and Worker integration 184 tests. Build/OpenAPI no-diff/
  contract parity/audit also pass.
- Original full twelve-step gate remains an unchanged checkpoint, not verification
  of the P2 follow-up. New receipt preserves typecheck failure/correction/reruns.
- Actual native zoom, real device, real screen-reader and audio remain unverified.

## Production as observed

Not checked from this lane. Draft PR changes are unpublished to production; no
deployment, migration or production data operation occurred.

## Shared zones touched

None. Product ownership remains LiveMode.tsx/LiveMode.test.tsx. No shared styles,
tokens, helpers, API, schema, provider or playback-runtime changes.

## Notes for other lanes / iOS

No contract change. Native clients should preserve a visible completion state when
compacting metadata, and verify both sides of any height breakpoint.
