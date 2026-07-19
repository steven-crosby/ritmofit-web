# 03 — Isolated mockup preview (P0 direction only)

**Phase 3 of the continuous pack.** Orchestrator: pack `README.md`. Context: `00-context.md`.

Create **isolated** visual previews for polish items that need **direction clarity** before implement briefs.  
The agent **self-selects** (via `run-decisions.md`) and **self-approves**. There is no owner Gate B.

## Preconditions

1. Pack `README.md` + `00-context.md` read  
2. `critique.md` + `backlog.md` exist  
3. `run-decisions.md` exists with dispositions and mockup flags  

If mockup list is empty: write a short note under `docs/audits/<run-id>/mockups/SKIPPED.md` (or update `run-decisions.md` only) stating no mockups; mark self-approved; **continue to 04**. Do not invent mockups for filler.

## Non-negotiable

- **No production app/web source edits**  
- Artifacts only under `docs/audits/<run-id>/mockups/`  
- Stay inside **current shell** patterns (nav, workspaces, dark app chrome) — polish, not a new product IA  
- No Explore / Teams / marketing / audience-room product mockups  

## Read first

- `docs/audits/<run-id>/run-decisions.md` (mockup flags)  
- `backlog.md` items flagged for mockup  
- `mockup-brief.md`  
- `critique.md` sections those items cite  
- Live `pnpm dev:web` for fidelity to current structure  
- `ritmofit_design_system` token names where possible (so mockups translate)

## Task

Produce a static, reviewable preview that expresses **only** the flagged direction changes. Owner visual review happens on the audit PR, not mid-run.

### Required deliverables (when mockups run)

| Path | Content |
| --- | --- |
| `docs/audits/<run-id>/mockups/polish-preview.html` | Main preview (single page multi-section OK) |
| `docs/audits/<run-id>/mockups/polish-preview.css` | Optional |
| `docs/audits/<run-id>/mockups/polish-preview.js` | Optional, minimal |
| `docs/audits/<run-id>/mockups/polish-preview-notes.md` | Notes (structure below) |
| `docs/audits/<run-id>/screenshots/mockups/` | Optional captures of the mockup itself |

Show **desktop-wide and ~390px** treatments for each mocked surface (tabs, sections, or side-by-side).

### What to demonstrate

Only patterns required by flagged items, drawn from this menu as applicable:

- Airier Builder hierarchy and track rows  
- Music shelves / connection truth presentation  
- Timeline / cue / move readability  
- Live glanceability (large type, calm chrome, 80/20 safety)  
- Classes library scan  
- Account connection summary clarity  
- State language (empty / loading / error / connected)  
- Token-level direction if P0 is system-wide (color, type scale, radius, elevation)

### Notes file structure (`polish-preview-notes.md`)

1. Which backlog IDs this expresses  
2. What changed vs current UI direction  
3. Screens / states shown  
4. Intentionally excluded  
5. What a PR reviewer should inspect first  
6. Known limitations (static, fake data, etc.)  
7. Self-approval: accepted as-is / accepted with in-mockup revisions (list)  
8. What implement briefs must not over-literalize  

## Self-approval (required)

Update `run-decisions.md`:

- Mark mockups complete  
- Record self-approval (and any dropped/re-dispositioned items)  
- Confirm the brief set is still accurate  

**Do not stop for owner mockup approval.**

---

## After this phase

Continue immediately to phase **04** (`04-implementation-briefs-prompt.md`).

## Chat checkpoint (optional, brief)

- How to open the HTML file locally (if any)  
- IDs covered or skip  
- Confirm self-approval recorded  
- Confirm no production code modified — then proceed to 04  
