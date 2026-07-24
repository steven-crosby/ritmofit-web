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
| [`2026-07-19-full-product-preview`](2026-07-19-full-product-preview/) | v5 | `addaff3f` | Owner-approved; prompts 01–02 and the reconciliation pass implemented (PR #358). P2-01 and P2-02 deferred. Pre-v6 naming, kept as the ID baseline. |

Add a row when a run is delivered, and record the disposition outcome once the owner has filled that run's
`run-decisions.md`.

## Notes

- `docs/audits/` is excluded from `pnpm format:check` and `pnpm lint` so agent-authored artifacts cannot
  break the repository gates.
- From v6, screenshots are committed as JPEG/WebP with a 15 MB per-run budget. The 2026-07-19 run predates
  that rule and carries 64 MB of PNGs; do not use it as a size precedent.
- Audit runs never edit production code. Implementation happens in separate, separately authorized
  sessions driven by an approved run's `implementation-prompts/`.
