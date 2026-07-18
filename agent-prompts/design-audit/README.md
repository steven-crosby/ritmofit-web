# Ritmo Studio UI/UX Polish Audit Pack v3

Polish-first audit for the **current** creator shell. Not a redesign program. Not a marketing or community audit.

**Canonical prompt pack:** `agent-prompts/design-audit/` in this `ritmofit-web` repo.  
**All audit artifacts** go in **tracked** `docs/audits/<run-id>/` (same repo).

Read **`00-context.md`** before any pass. It is authoritative for mission, scope, success ranking, and constraints.

---

## When to use this pack

- Product is solo-first private beta; shell is Classes / Music / Live / Account.
- Goal: **faster class build** first, then premium feel, then Live pride.
- You want diagnosis → ranked backlog → optional mockups for P0 direction → **written owner decisions** → later multi-PR implement.

Do **not** use this pack to redesign IA, revive Explore/Teams, or prioritize landing pages.

---

## Sequence

| Step | Prompt | Output (under `docs/audits/<run-id>/`) | Production code? |
| --- | --- | --- | --- |
| 0 | Read `00-context.md` | — | No |
| 1 | `01-brutal-critique-prompt.md` | `critique.md` + `screenshots/` | No |
| 2 | `02-ranked-backlog-prompt.md` | `backlog.md` + optional `mockup-brief.md` | No |
| 3 | **Owner** fills `owner-decisions.md` from `owner-decision-template.md` | Written approve/cut/rank/mockup flags | No |
| 4 | `03-mockup-preview-prompt.md` **only if** owner flagged P0 direction items | `mockups/` + notes | No |
| 5 | **Owner** updates `owner-decisions.md` (mockup approve/revise) | — | No |
| 6 | `04-implementation-briefs-prompt.md` **only after** implement is authorized | `implementation-briefs/*.md` | No (briefs only) |
| 7 | Separate implement sessions / PRs by surface | Product PRs | Yes, when owner authorizes |

### Mockup rule

Mockups are **not** required for every polish item.  
Create mockups **only** for items the owner marks as **P0 direction changes** (visual language, major component look, density system shift). Copy, spacing tweaks, a11y, and small hierarchy fixes go straight to implement briefs after owner approve.

### Stop conditions

- After 02: **stop** until `owner-decisions.md` exists and is filled.
- After 03: **stop** until owner records mockup approval.
- Never implement production UI in 01–04.

---

## Setup (agent)

1. Work in a clean `ritmofit-web` checkout on current `main` (or owner-specified branch).
2. `pnpm install --frozen-lockfile` if needed; run **`pnpm dev:web`**.
3. Sign in with a beta-capable local account (seed/local auth as project docs describe).
4. Create run folder: `docs/audits/YYYY-MM-DD-polish/`.
5. Capture screenshots at **desktop** and **390×844** for reachable in-scope surfaces.

---

## Files in this pack

| File | Purpose |
| --- | --- |
| `00-context.md` | Shared mission, scope, constraints, pipeline |
| `01-brutal-critique-prompt.md` | Visual + UX critique (diagnosis) |
| `02-ranked-backlog-prompt.md` | Ranked polish backlog + mockup brief |
| `03-mockup-preview-prompt.md` | Isolated mockups for P0 direction only |
| `04-implementation-briefs-prompt.md` | Per-surface PR briefs (post-decision) |
| `owner-decision-template.md` | Copy into the run folder as `owner-decisions.md` |

Legacy v2 filenames (`01-ritmofit-design-system-…` etc.) are **superseded** by this v3 set. Prefer the files above.

---

## Owner quick path

1. Commission 01 + 02 against local SPA.  
2. Fill `owner-decisions.md` (what ships, what dies, what needs mockups).  
3. If needed, commission 03; re-decide.  
4. When ready to code: authorize implement + run 04, then execute **small PRs by surface**.
