# Design-audit runs

Deliverables produced by [`agent-prompts/design-audit/`](../../agent-prompts/design-audit/README.md).
Each run is one self-contained folder; start at that folder's own `README.md`.

Naming from pack v6 onward: `<agent>-design-audit-<YYYY-MM-DD>/`, where `<agent>` is the lowercase slug of
the agent that performed the run (`claude`, `codex`, `grok`, …). Runs are comparable because every one
binds to the canonical surface IDs in
[`agent-prompts/design-audit/surface-ids.md`](../../agent-prompts/design-audit/surface-ids.md) and builds
the same [`fixtures.md`](../../agent-prompts/design-audit/fixtures.md) data.

## Runs

| Run | Pack | Baseline | Status |
| --- | --- | --- | --- |
| [`claude-design-audit-2026-07-24`](claude-design-audit-2026-07-24/) | v6 | `9b188df` | Owner-approved 2026-07-24: all 18 backlog items `approve`, PDR-01/02/03 resolved. **All six implementation prompts landed** 2026-07-25 (PRs #370, #375, #377, #378, #379, #380) and the `implementation-sequence.md` §8 reconciliation passed, plus the reflow repair #382 (2026-07-27) for an overflow prompt 05 introduced. Not deployed — that grant is separate. **Follow-up work** is tracked in that folder's `IMPLEMENTATION-KICKOFF.md` — F-01 (color classes Tailwind never generated) fixed 2026-07-27; D11 still unconfirmed. Start there. |
| [`2026-07-19-full-product-preview`](2026-07-19-full-product-preview/) | v5 | `addaff3f` | Owner-approved; **all six implementation prompts landed** (`c6eca5f`, `c2ff378`, `a83c32c`, `5d4fe18`, `07777e4`, `de3b4f3`) plus the narrow-responsive repair `1be7d7e`; PR #358 was the closing record. P2-01 and P2-02 deferred. Pre-v6 naming, kept as the ID baseline. |

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
