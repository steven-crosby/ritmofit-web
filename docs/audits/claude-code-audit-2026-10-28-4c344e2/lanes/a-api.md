# Lane a-api — API / auth / authz / data (apps/api + packages/shared)

Status: IN PROGRESS. Audited SHA `4c344e2`. Audit-only. Runs used the disposable worktree
`$SCRATCH/wt-a-api` (detached at 4c344e2) against local Miniflare D1 only.

## Interim notes (will be replaced by the final write-up)

- Prior A-1..A-8 repro (`codex-code-audit-2026-10-27-4e0b150/repro/a-repro.integration.test.ts`)
  re-run on 4c344e2 with better-auth 1.7.14: 7/7 pass, so A-1, A-2, A-3, A-4, A-5, A-6, A-8 all
  still reproduce after #637.
- `drizzle-kit generate` against the committed migrations: "No schema changes".
- New probes: `repro/a-api-probes.integration.test.ts` (3 tests, green = defect reproduces).
