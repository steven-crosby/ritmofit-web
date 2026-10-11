# Lane 2 — submitted song and playlist URL integrity

Author: Codex, 2026-10-10. Base: `ba92ceaf25a7b470eec23c33766df2658be287fb`.
The original frozen implementation was published in [PR #507](https://github.com/steven-crosby/ritmofit-web/pull/507) on `codex/r20261010-lane2-song-picker`, at implementation commit `53d2149ed9e52c0cd9d5d4d3498c1ab209f431ba`. That identity precedes subsequent documentation and base updates. PR #507 squash-merged as `fd3d16ac71c5dda2f71600146eab54b4343113bf`. The full gate passed on combined committed tree `09a43d662ee814e04d110432f72826ac00b883e1`, assembled by disjoint lane cherry-picks. [Updated-base CI 38107642198](https://github.com/steven-crosby/ritmofit-web/actions/runs/38107642198) and [final-main CI 38107826711](https://github.com/steven-crosby/ritmofit-web/actions/runs/38107826711) both succeeded and were reverified live by the orchestrator. No deployment or playback occurred for these lane changes.

## Reproduced behavior

- A successful URL import cleared a replacement URL, including an edit away and back to the submitted text.
- URL and single-song operations called the original completion callback after provider, mode, destination, or unmount changes. That callback could focus a stale class-song placement.
- Old URL/song failures surfaced in a different mode.
- An initial exploratory row-lock test expected another same-song submission after changing mode. Review superseded that expectation: the pending write must keep ownership of its song/destination across browse changes. The final older-completion regression uses a different class destination, where a new submission is valid.
- During review, a generation-keyed pending-write guard allowed another write of the same song to the same destination after leaving and returning to the browse context. The final guard keys the pending write by destination plus provider candidate, independently of presentation generation.

[Initial failing regressions](./baseline-regressions.log): 13 failures, 2 positive controls, 39 existing tests skipped; source unchanged. Twelve failures exercise retained draft/callback/error expectations. The thirteenth row-lock probe used the subsequently superseded same-destination policy described above.
[Pending-write review regression](./pending-write-review.log): 1 failure before the final destination-keyed guard; 55 other tests skipped.

Retained logs use presentation normalization: machine paths and timing were sanitized, trailing whitespace was removed, and each log ends with one newline. Evidence text and test outcomes are preserved.

## Change and boundaries

`TrackSearch.tsx` captures the submitting context generation for success, error, and callback presentation. Remote writes retain their captured class/block and finish even when the component's browse context changes or unmounts. Current busy markers release without an older operation unlocking a newer marker.

Every playlist URL input edit increments a revision. Completion clears the field only when both context and submitted draft revision remain current. No focus transfer was added. The input stays editable, and the focused replacement draft keeps focus.

Single-song pending writes are tracked by class/block plus provider candidate. Distinct songs and distinct destinations can still import concurrently. A same pending song/destination cannot be submitted again after a browse-context round trip. This is an in-memory pending guard, not response-loss recovery or remote idempotency.

No saved-playlist import, provider integration, backend, playback, contract, migration, style, or shared-list behavior was changed. Existing saved-playlist and ordered-import suites passed unchanged. URL imports retain the existing backend count/deduplication semantics.

## Verification

- Original focused baseline: 56 passed (TrackSearch 39, recovery 9, ordered-import 8).
- [Final focused result](./focused-tests.log): 73 passed (TrackSearch 56, recovery 9, ordered-import 8), including 17 added regression/control cases.
- Web TypeScript check, owned-file Prettier check, and `git diff --check`: passed.
- Runner: existing Vitest 3.2.6 via the dependency symlink; direct CLI used when the ordinary pnpm command attempted a dependency freshness install and aborted. No dependency mutation or package install occurred. The orchestrator verified `pnpm --config.verify-deps-before-run=false` as an equivalent safe invocation.
- [Full repository gate receipt](./full-gate-receipt.json): the orchestrator independently passed all 12 required steps on frozen lane-2 source with `pnpm_config_verify_deps_before_run=false`. Unit counts: web 1095, API 486, music 30; Worker integration 184. OpenAPI remained unchanged; contract parity passed. Audit exited 0 with the existing ignored low and moderate advisories.
- Serialized Chrome component harness: the orchestrator paired unchanged main with the two lane source candidates, reproducing the original three failures and passing 12 candidate behavioral cases across the round. Song-picker cases covered URL draft retention, rejection, context changes, and unmount; choreography cases covered cue/move draft, read ordering, and focus behavior. This exercised imported components with controlled API responses, rather than a combined Git tree or the integrated application.
- Five viewport overflow checks passed across the round. Actual native 200% browser zoom could not be set because native app controls timed out. A 600×304 compact viewport was checked as an approximation; actual 200% zoom acceptance remains incomplete.
- [Combined committed-tree receipt](../integration-audit/combined-gate.json): all 12 gate steps passed at `09a43d662ee814e04d110432f72826ac00b883e1`; web 1121/API 486/music 30 unit tests and Worker integration 184. All five product-source/test hashes match the verified lane candidates. [Updated-base CI 38107642198](https://github.com/steven-crosby/ritmofit-web/actions/runs/38107642198) and [final-main CI 38107826711](https://github.com/steven-crosby/ritmofit-web/actions/runs/38107826711) succeeded; the orchestrator reverified both runs live after merge.

This evidence uses controlled asynchronous API mocks in jsdom and the orchestrator's actual Chrome component harness. It does not establish real provider response, production, device, or audio acceptance. No playback started.
