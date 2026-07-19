# Run decisions — polish audit (agent-authored)

Copy this structure into the run folder as:

`docs/audits/<run-id>/run-decisions.md`

**The agent fills this file.** No owner signature is required mid-run.  
Dispositions follow pack `README.md` + success ranking in `00-context.md`.

---

## Run metadata

| Field | Value |
| --- | --- |
| Run id | `YYYY-MM-DD-polish` |
| Critique | `critique.md` |
| Backlog | `backlog.md` |
| Date | |
| Agent | |
| Policy | Continuous audit-only v4; auto-disposition; P0+P1 briefs |

---

## Global acceptance

- [ ] Critique top diagnosis accepted as the working thesis (or dissent noted below)
- [ ] Success ranking applied: (1) faster class build (2) gorgeous (3) Live pride
- [ ] Current shell only; no community / marketing expansion
- [ ] This run produces audit artifacts + one audit PR only (no production UI edits)

### Dissent / overrides on critique

-

---

## Backlog disposition

For each backlog item id from `backlog.md`, set one disposition:

| ID | Title | Priority | Disposition (`ship` / `ship-after-mockup` / `defer` / `kill`) | Rationale (short) |
| --- | --- | --- | --- | --- |
| P0-… | | | | |
| P1-… | | | | |
| P2-… | | | | |

### Defaults to apply when unsure

- P0 build-speed or Live-safety → `ship` or `ship-after-mockup`
- P1 premium/consistency → `ship` unless weak leverage → `defer`
- P2 → `defer` for this run’s briefs
- Out of scope / shell-breaking / community → `kill`

---

## Mockup flags (agent self-select)

Item ids with disposition `ship-after-mockup` (P0 direction only):

-

After phase 03:

- [ ] Mockups built for all flagged ids **or** none flagged
- [ ] Direction **self-approved** for briefs (note revisions applied while mocking, if any)
- [ ] Rejected / dropped items (if any) re-dispositioned above

Mockup paths:

-

### Self-approval notes

-

---

## Brief set for this run (P0 + P1)

Ordered list of ids that will receive implementation briefs (all `ship` + `ship-after-mockup` at P0/P1):

1.
2.
3.

### Explicitly not briefed this run

- All `defer` / `kill` / remaining P2:

-

### Explicit non-goals this round

-

---

## Later product implement note (not this PR)

When the owner later authorizes production work, briefs recommend **multiple small PRs by surface**.  
This audit run does **not** open those PRs and does **not** edit product code.

Suggested branch prefix for a future implement pass: `polish/…`

---

## Continuity checklist

- [ ] Phase 01 complete
- [ ] Phase 02 complete
- [ ] Phase 2b (this file) complete
- [ ] Phase 03 complete or skipped with note
- [ ] Phase 04 complete for brief set above
- [ ] Phase 05: audit branch committed, pushed, PR opened (or failure reported)
