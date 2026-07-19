# 04 — Implementation briefs (per-surface PRs)

**Phase 4 of the continuous pack.** Orchestrator: pack `README.md`. Context: `00-context.md`.

Generate **implementation-ready briefs** for production polish.  
This pass still **does not edit product code**. Product work happens later from these briefs.

## Preconditions

1. Pack `README.md` + `00-context.md`  
2. `critique.md`, `backlog.md`, `run-decisions.md`  
3. Phase 03 done or explicitly skipped  
4. Brief set = all **P0 + P1** items with disposition `ship` or `ship-after-mockup` in `run-decisions.md`  

If `run-decisions.md` is missing: create it now from the template using backlog dispositions, then continue. Do **not** stop for owner Gate C / implement authorization — this pack is **audit-only**; briefs prepare a *future* implement pass.

## Read first

- Agent-approved brief set and notes in `run-decisions.md`  
- Mockup files + notes if any  
- Likely files under `apps/web/` and `ritmofit_design_system/`  
- Repo `AGENTS.md` test/format expectations  

## Task

Write **one brief per surface PR bucket** under:

`docs/audits/<run-id>/implementation-briefs/`

Suggested filenames:

- `01-tokens-design-system.md` (only if needed; first if foundation blocks others)
- `02-classes.md`
- `03-music-connections.md`
- `04-builder-timeline.md`
- `05-live.md`
- `06-account-login.md`

Skip empty buckets. Only include backlog IDs from the **this-run brief set** (P0+P1 ship / ship-after-mockup). P2 and deferred/killed IDs belong in a short “not in this run” section of the final chat/PR summary, not as freelancing invites inside briefs.

## Each brief must include

1. **Role** — SPA / design-tokens polish implementer for this surface only  
2. **Authority** — implement only the backlog IDs listed for this brief; no drive-by refactors  
3. **Backlog IDs** included  
4. **User outcomes** (build speed / Live safety / premium)  
5. **Mockup refs** if any (what to match; what not to over-literalize)  
6. **Files to inspect / likely edit**  
7. **Out of scope** (other surfaces, community, schema, audience Live)  
8. **Implementation steps** (incremental)  
9. **Tests / checks** (`pnpm` filters, component tests, a11y smoke, desktop + 390×844 manual)  
10. **Acceptance criteria** (owner-tryable)  
11. **PR title suggestion** and branch name suggestion (`polish/<surface>-…`) for a **future** product PR  
12. **Handoff** — what an implement session should report when that future PR is ready  

## Global constraints to copy into every brief

- Current shell only; no IA redesign  
- Success ranking: build speed > gorgeous > Live pride  
- Builder airy; Live 80/20  
- Prefer small diffs; update design-system docs/tokens when tokens change; regen iOS tokens if package workflow requires  
- Re-check repo `AGENTS.md` music/provider rules before any playback-related code  
- Do not merge without owner  
- This audit pack did not authorize or perform production edits  

## After this phase

1. Confirm briefs exist for every non-empty surface bucket covering the brief set.  
2. Update `run-decisions.md` continuity checklist for phase 04.  
3. **Do not stop for owner implement authorization.**  
4. Continue immediately to **phase 05** in pack `README.md`: commit audit artifacts, push branch, **open one audit PR**.

## Chat checkpoint (before phase 05)

- List of brief paths  
- Suggested future implement order  
- IDs not covered (deferred/killed/P2)  
- Reminder: production work is **separate**; this session’s remaining work is the **audit PR only**  
