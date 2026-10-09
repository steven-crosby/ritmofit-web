# Audits and verification records

Every folder here is one self-contained audit, benchmark, or acceptance record; start at the entry point
the tables below name for it. Two kinds live here:

- **Design-audit runs** produced by [`agent-prompts/design-audit/`](../../agent-prompts/design-audit/README.md)
  (and, from 2026-10-06, `design-system-drift-<date>/` reports from
  [`agent-prompts/design-system-drift.md`](../../agent-prompts/design-system-drift.md)).
- **Other audits and acceptance records** written during sessions — evidence, not plans. Current
  work is tracked in `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, never here.

Naming from pack v6 onward: `<agent>-design-audit-<YYYY-MM-DD>/`, where `<agent>` is the lowercase slug of
the agent that performed the run (`claude`, `codex`, `grok`, …). Runs are comparable because every one
binds to the canonical surface IDs in
[`agent-prompts/design-audit/surface-ids.md`](../../agent-prompts/design-audit/surface-ids.md) and builds
the same [`fixtures.md`](../../agent-prompts/design-audit/fixtures.md) data.

## Design-audit runs

| Run | Pack | Baseline | Status |
| --- | --- | --- | --- |
| [`claude-design-audit-2026-07-24`](claude-design-audit-2026-07-24/) | v6 | `9b188df` | Entry point: `README.md`. Owner-approved 2026-07-24: all 18 backlog items `approve`, PDR-01/02/03 resolved. **All six implementation prompts landed** 2026-07-25 (PRs #370, #375, #377, #378, #379, #380) and the `implementation-sequence.md` §8 reconciliation passed, plus the reflow repair #382 (2026-07-27) for an overflow prompt 05 introduced. Deployed 2026-07-27 (see `HISTORY.md`). **Follow-up work** is tracked in that folder's `IMPLEMENTATION-KICKOFF.md` — F-01 (color classes Tailwind never generated) fixed 2026-07-27; F-05 (Apple Music "0 tracks") fixed and deployed #390; LIVE-09 induced and F-06 (Live danger below AAA on the playback-failure alert) fixed #392, both 2026-07-29, recorded in that folder's `playback-liveness-investigation.md`; D11/F-02 still unconfirmed. Start there. |
| [`2026-07-19-full-product-preview`](2026-07-19-full-product-preview/) | v5 | `addaff3f` | Entry point: `review-guide.md` (no README). Owner-approved; **all six implementation prompts landed** (`c6eca5f`, `c2ff378`, `a83c32c`, `5d4fe18`, `07777e4`, `de3b4f3`) plus the narrow-responsive repair `1be7d7e`; PR #358 was the closing record. P2-01 and P2-02 deferred. Pre-v6 naming, kept as the ID baseline. |

## Other audits and records

| Folder | Kind | Entry point | Status |
| --- | --- | --- | --- |
| [`studio-pulse-check-2026-09-13`](studio-pulse-check-2026-09-13/) | Live UX audit dispositions | `run-decisions.md` | Authoritative ledger for the 21 non-P0 findings; batches 1–3 shipped; SPC-09 still open. |
| [`instructor-benchmark-2026-09-29`](instructor-benchmark-2026-09-29/) | Instructor workflow benchmark | `evidence/README.md` | Findings only; ranked gaps carried in the plan backlog. |
| [`ux-clarity-2026-10-08`](ux-clarity-2026-10-08/integration-audit/)           | Builder/Live UI verification                   | `integration-audit/README.md` | #503/#504 merged and undeployed; immutable CI and source hashes retained. Synthetic UI checks passed; natural Apple Music acceptance remains separate.                                                                                                                                                                                                                 |
| [`apple-natural-acceptance-2026-10-09`](apple-natural-acceptance-2026-10-09/) | Fresh production acceptance preparation        | `README.md`                   | Cycle/Pilates fixtures created and tagged; playback not started; listener availability pending.                                                                                                                                                                                                                                                                        |
| [`music-led-phase-1-acceptance`](music-led-phase-1-acceptance/) | Acceptance checklist + results | `README.md` | Phase 1 real-device acceptance; open. |
| [`playlist-import-release-2026-10-02`](playlist-import-release-2026-10-02/) | Release smoke evidence | `uncertain-import.jpg` | Evidence for the #481/#482 playlist-import release record in `HISTORY.md`. |
| [`playlist-to-live-2026-10-03`](playlist-to-live-2026-10-03/) | Desktop playlist→class→Live audit | `coverage.md` | Findings and QA fixture IDs; `NEXT_SESSION.md` is a superseded restart point. |
| [`apple-music-boundary-2026-10-04`](apple-music-boundary-2026-10-04/) | Release + natural-playback acceptance evidence | `NEXT_SESSION.md` | #488 release record and the failed Cycle/Pilates natural-boundary acceptance (P1); evidence in `evidence/README.md`. The zero-pause fix is implemented in [#494](https://github.com/steven-crosby/ritmofit-web/pull/494) and deployed 2026-10-07 (Worker `5f67d242-8956-42b7-9318-67b2797d3454`, SPA `assets/index-mZ1ypG4t.js`); natural acceptance is still pending. |

Add a row when a run is delivered, and record the disposition outcome once the owner has filled that run's
`run-decisions.md`.

## Notes

- `docs/audits/` is excluded from `pnpm format:check` and `pnpm lint` so agent-authored artifacts cannot
  break the repository gates.
- From v6, screenshots are committed as JPEG/WebP with a 15 MB per-run budget. The 2026-07-19 run predates
  that rule and carries 64 MB of PNGs; do not use it as a size precedent. The 2026-07-24 run is the first
  under the budget at 12.6 MB.
- Audit runs never edit production code. Implementation happens in separate, separately authorized
  sessions driven by an approved run's `implementation-prompts/`.
