# 03 — Isolated mockup preview (P0 direction only)

Create **isolated** visual previews for polish items that need **direction approval** before code.

## Preconditions

1. `00-context.md` read  
2. `critique.md` + `backlog.md` exist  
3. **`owner-decisions.md` Gate A complete**  
4. Owner listed specific item IDs under **Mockup flags**

If Gate A is missing or mockup list is empty: **do not invent mockups**. Stop and say so.

## Non-negotiable

- **No production app/web source edits**  
- Artifacts only under `docs/audits/<run-id>/mockups/`  
- Stay inside **current shell** patterns (nav, workspaces, dark app chrome) — polish, not a new product IA  
- No Explore / Teams / marketing / audience-room product mockups  

## Read first

- `docs/audits/<run-id>/owner-decisions.md` (mockup flags and notes)  
- `backlog.md` items flagged for mockup  
- `critique.md` sections those items cite  
- Live `pnpm dev:web` for fidelity to current structure  
- `ritmofit_design_system` token names where possible (so mockups translate)

## Task

Produce a static, reviewable preview that lets the owner judge **only** the flagged direction changes.

### Required deliverables

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

1. Which owner-flagged backlog IDs this expresses  
2. What changed vs current UI direction  
3. Screens / states shown  
4. Intentionally excluded  
5. What the owner should inspect first  
6. Known limitations (static, fake data, etc.)  
7. Approval questions  
8. What must be revised before implement  

## Final chat response

- How to open the HTML file locally  
- IDs covered  
- What still needs human Gate B in `owner-decisions.md`  
- Confirm no production code modified  

**Stop after this pass** until owner completes Gate B.
