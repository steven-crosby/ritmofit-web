# Builder inspector zero anchors — 2026-10-11

Round `r20261010b`, lane 2. Implementation commit `23a53a2611fa0fe4ffc84db18c18d076896685b1`, based on `14c8326db9390e09dfb193e97ffa3d4c1fdf89f7`. Steven approved implementation, isolated worktree use, commit, push, and a draft PR after the review packet. Steven subsequently approved merge; #509 squash-merged as `4412c3c`. Deployment remains a separate decision.

## Behavior

The track inspector now accepts explicit `0:00` for clip start, downbeat, and free-timeline **Start at**. Edited anchors use the existing `parseClockToMs`; blank fields still reset to zero. Inputs remain `m:ss`: bare `0`, negative values, and malformed seconds remain invalid. Track length and clip end retain their positive-only parser; clip end must remain after clip start. Start offset is sent only for a free timeline.

Unchanged field text retains the exact stored milliseconds. Editing only creator notes no longer blocks on stored 1–999 ms anchors or silently floors larger non-integral-second values. Changing a field's timecode or clearing it writes the edited whole-second value. If a stored 499 ms value displays as `0:00`, leaving that text unchanged preserves 499 ms; clearing the field explicitly resets it to zero. The UI still expresses whole seconds.

Production source changes are limited to `Dashboard.tsx` (one local parsing helper, one import, and three call sites). `Dashboard.test.tsx` adds sixteen rendered-inspector tests and extends existing synthetic fixture helpers. No API, shared schema, auth, provider, playback runtime, styles, tokens, migration, or iOS contract change.

## Verification

- [Before fix](./before-fix.txt): the final candidate tests against the original Dashboard source at the base commit; **8 failures, 10 passes, 72 skipped** under the `inspector` filter. All three explicit-zero cases fail, as do precision retention and the dependent zero-save paths. Existing positive-only, malformed, blank, and window checks pass.
- [After fix](./after-fix.txt): **all 90 Dashboard tests pass**.
- [Source hashes](./source-sha256.json): baseline source, candidate source, and final test file identities.
- [Full gate](./full-gate.json): all twelve CI-equivalent steps pass, with retained command outputs. Unit totals: web **1137**, API **486**, music **30**. Worker/D1 integration: **184**. OpenAPI has no generated drift; contract parity and production dependency audit pass.

The regression cases cover each zero field, unrelated notes saves with 499 ms and 1250 ms anchors, intentional resets, blank defaults, positive-only duration/end, malformed input including bare zero, clip-end ordering, sequential-mode offset omission, and server rejection retaining the unsaved draft. Existing #506/#507 tests ran unchanged in the full web suite. The server-rejection test models a cue-preservation failure; the API integration suite separately exercises the actual route rules.

These are local component and integration results. No provider audio, authenticated production write, real-device behavior, or natural class completion is established. No deployment occurred.

Retained command transcripts remove terminal color codes and trailing whitespace and replace the machine-specific checkout prefix with `<repo-root>`; test outcomes and error text are unchanged.

## Deferred issues

The inspector error remains ordinary text rather than an alert/live region. The original lane brief's promise of an "announced error" was inaccurate; this PR retains validation behavior and explicitly defers that existing accessibility defect to the [BUILDER-A11Y findings](../studio-pulse-check-2026-09-13/run-decisions.md). Client-side upper-bound validation for downbeat/Start at, sub-second entry, and clip-end error wording also remain follow-up work. The server's bounds, overlap, plan-order, and cue/move preservation rules remain intact.

## Merge and restart point

[PR #509](https://github.com/steven-crosby/ritmofit-web/pull/509) squash-merged as `4412c3c6231e9b8bfa6dad831c6100421c3adc04` after explicit owner approval and passing [reviewed-head CI](https://github.com/steven-crosby/ritmofit-web/actions/runs/38145254535) on `1050a7a`. [Post-merge main CI](https://github.com/steven-crosby/ritmofit-web/actions/runs/38147699980) passed on `4412c3c`. The complete squash tree equals the reviewed tree. The same PR carries [lane 1's synthetic no-work closure](../live-glance-2026-10-11/README.md).

The original [Builder lane handoff](https://github.com/steven-crosby/ritmofit-web/blob/4412c3c6231e9b8bfa6dad831c6100421c3adc04/ritmofit_dev_plan/handoffs/2026-10-11-r20261010b-builder-anchors.md) is retained in Git history; its completed items are routed to HISTORY and this evidence packet. Remaining attended acceptance, real-iPhone investigation, and exact release selection are routed to [the round close handoff](../../../ritmofit_dev_plan/handoffs/2026-10-11-r20261010b-close.md). No deployment is authorized or performed in this round.

## Approved Git cleanup

The owner-approved cleanup archived this round's managed worktree, verified the recoverable closing snapshot, and removed the two exact merged local/remote branches. The [cleanup receipt](./cleanup-receipt.json) records identities, original tip/squash checks, brief hashes, and preservation results. Both original [Claude lane briefs](./lane-briefs/README.md) are retained byte-for-byte as historical evidence. The unfinished release candidate and older worktrees are preserved. No application source or production state changed during cleanup.
