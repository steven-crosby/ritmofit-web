# 04 — Implementation briefs (per-surface PRs)

Generate **implementation-ready briefs** for production polish.  
This pass still **does not edit product code**.

## Preconditions

1. `00-context.md`  
2. `critique.md`, `backlog.md`  
3. `owner-decisions.md` with:
   - Gate A complete  
   - Gate B complete if any mockups were required  
   - **Gate C implement authorization** signed  
4. Approved item list from Gate C  

If Gate C is missing: **stop**. Do not generate “provisional” implement prompts that invite freelancing.

## Read first

- Owner-approved IDs and notes  
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

Skip empty buckets.

## Each brief must include

1. **Role** — SPA / design-tokens polish implementer for this surface only  
2. **Authority** — implement only what Gate C lists for this brief; no drive-by refactors  
3. **Backlog IDs** included  
4. **User outcomes** (build speed / Live safety / premium)  
5. **Mockup refs** if any (what to match; what not to over-literalize)  
6. **Files to inspect / likely edit**  
7. **Out of scope** (other surfaces, community, schema, audience Live)  
8. **Implementation steps** (incremental)  
9. **Tests / checks** (`pnpm` filters, component tests, a11y smoke, desktop + 390×844 manual)  
10. **Acceptance criteria** (owner-tryable)  
11. **PR title suggestion** and branch name suggestion (`polish/<surface>-…`)  
12. **Stop / handoff** — what to report when PR is ready  

## Global constraints to copy into every brief

- Current shell only; no IA redesign  
- Success ranking: build speed > gorgeous > Live pride  
- Builder airy; Live 80/20  
- Music hard constraints from `00-context.md`  
- Prefer small diffs; update design-system docs/tokens when tokens change; regen iOS tokens if package workflow requires  
- Do not merge without owner (unless owner granted merge in a later session)  

## Final chat response

- List of brief paths  
- Suggested implement order  
- IDs not covered (deferred/killed)  
- Reminder: production work happens in **separate** implement sessions using these briefs
