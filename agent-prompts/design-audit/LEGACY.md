# Superseded design-audit pack generations

Current pack: **v6**, entry point `README.md`. Do not recreate or run any generation below.

| Generation | Why it was superseded |
| --- | --- |
| v2 | Expanded dormant product scope, assumed one agent vendor, and mixed redesign with implementation authority. |
| v4 | Produced optional mockups for selected P0 direction items only, let the agent self-approve them, generated implementation briefs before visual decisions, and did not guarantee a complete active-product preview. |
| v5 | Comprehensive and correct, but not repeatable: no canonical surface IDs, so runs could not be compared; no fixture recipe, so critiques described improvised data; no capability floor, so a browserless agent could silently produce a degraded run; no screenshot budget, and its one run committed 64 MB; and a mandatory mid-run owner gate that made a single continuous run impossible. |

## What v6 changed

- One owner authorization at the start, one continuous run, one deliverable folder:
  `docs/audits/<agent>-design-audit-<YYYY-MM-DD>/`.
- The owner gate moved to the end. Phase 4 prompts are proposals; `run-decisions.md` unlocks them.
- Agent-agnostic: no vendor, CLI, tool, or model names, plus an explicit capability floor with a hard stop.
- Repeatability: canonical `surface-ids.md`, a deterministic `fixtures.md` recipe, and prior-run
  deduplication labels.
- Compressed screenshots and a 15 MB run budget.
- The agent runs no Git commands at all.

Git history preserves the previous prompt files when provenance is needed.
