# 02 — Ranked polish backlog + mockup brief

You convert the critique into an **actionable polish backlog**. This is not a redesign bible.

## Read first

1. `00-context.md`  
2. `docs/audits/<run-id>/critique.md`  
3. Screenshot folder from 01  
4. Skim live UI only if needed to verify file/surface mapping  

Do **not** restart the full critique. Do **not** edit production code.

## Outputs

Write:

1. `docs/audits/<run-id>/backlog.md`  
2. `docs/audits/<run-id>/mockup-brief.md` — only if any items likely need P0 direction mockups; otherwise write a short file stating **“No mockups recommended; all items are implement-without-mockup polish.”**

---

# Deliverable 1 — `backlog.md`

## 1. Polish thesis (one line)

Use: “Ritmo Studio should move from ______ to ______ by ______.”  
Must serve **faster class build** first.

## 2. Ranking rules (state them)

Restate owner ranking:

1. Faster class build  
2. Pitch-deck gorgeous  
3. Live pride  

Builder: airier Spotify-ish. Live: 80/20 safety/swagger.  
Shell supports the build factory; Builder path is P0 factory.

## 3. Ranked backlog table

Each item **must** include:

| Field | Requirement |
| --- | --- |
| **ID** | `P0-01`, `P1-02`, … |
| **Title** | Specific |
| **Type** | `token` \| `component` \| `copy` \| `layout-within-shell` \| `interaction` \| `a11y` \| `motion` \| `state` |
| **Surface(s)** | From in-scope list only |
| **User outcome** | Especially time-to-build or Live safety |
| **Evidence** | Critique section + screenshot if any |
| **Likely files** | Under `apps/web/` and/or `ritmofit_design_system/` — best effort |
| **Effort** | S / M / L |
| **Risk** | low / med / high |
| **Priority** | P0 / P1 / P2 |
| **Mockup?** | `yes-direction` \| `no` |
| **Acceptance** | One sentence test the owner can try |

### Priority definitions

- **P0:** Clear build-speed or Live-safety win; do soon  
- **P1:** Premium / consistency / secondary speed  
- **P2:** Nice-to-have; defer freely  

### Hard rules

- No Explore / Teams / shares / marketing items.  
- No audience/room Live implement items (critique may have noted future only).  
- No “redesign the shell IA” items unless critique proved a critical failure **and** you flag **owner redesign re-open required**.  
- Prefer many small items over epic refactors.  
- Mark `Mockup? = yes-direction` sparingly (visual language / major density system / new component look). Most polish is `no`.

## 4. Build-path map

One short subsection: ordered list of P0/P1 items that sit on  
**Classes/Music → search → place → timeline/choreography → preview → ready**.

## 5. Suggested PR grouping (by surface)

Group IDs into future PR buckets (do not implement):

- Classes  
- Music + Connections  
- Builder / timeline / choreography / search / preview  
- Live preflight + run  
- Account + Login  
- Tokens / design-system (if any)

## 6. Out of scope / kill list

Things the critique mentioned that this program will **not** do.

## 7. Open questions for owner

Only decisions that change ranking or mockup need.

---

# Deliverable 2 — `mockup-brief.md`

If any item is `Mockup? = yes-direction`:

- Which items (IDs)  
- Which screens/states to show (desktop + 390×844)  
- What “success” looks like for the mockup review  
- What to **exclude** from mockups (no Teams, no marketing, no full app clone)  
- How mockups should reflect **current shell** (not a new IA)

If none: one paragraph stating no mockups.

---

## Final chat response

- Paths written  
- Count of P0 / P1 / P2  
- Items needing mockups  
- Top 5 build-speed recommendations  
- Reminder: **stop for written `owner-decisions.md`** (use `owner-decision-template.md`)
