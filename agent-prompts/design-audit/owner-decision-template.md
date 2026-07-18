# Owner decisions — polish audit

Copy this file into the run folder as:

`docs/audits/<run-id>/owner-decisions.md`

Fill it in writing. Agents must not proceed past the matching gate without this file.

---

## Run metadata

| Field | Value |
| --- | --- |
| Run id | `YYYY-MM-DD-polish` |
| Critique | `critique.md` |
| Backlog | `backlog.md` |
| Date of decision | |
| Owner | |

---

## Gate A — After backlog (required before mockups or implement)

### Global

- [ ] I accept the critique’s top diagnosis (or I note dissent below).
- [ ] Success ranking still: (1) faster class build (2) gorgeous (3) Live pride.

### Backlog disposition

For each backlog item id from `backlog.md`, set one disposition:

| ID | Title | Disposition (`ship` / `ship-after-mockup` / `defer` / `kill`) | Notes |
| --- | --- | --- | --- |
| P0-… | | | |
| P1-… | | | |

### Mockup flags

List item ids that **require mockups** before implement (P0 direction only):

-

Items **not** listed may go to implementation briefs after Gate A without mockups (still no code until implement is authorized).

### Explicit non-goals this round

-

### Dissent / overrides on critique

-

### Gate A signature

- Decision: **proceed to mockups** / **skip mockups → wait for implement auth** / **stop audit**
- Signed: _______________ Date: _______________

---

## Gate B — After mockups (only if mockups were required)

Mockup files reviewed:

-

- [ ] Direction approved as-is
- [ ] Approved with revisions (list below)
- [ ] Rejected — rework mockups
- [ ] Drop mockup-driven items; fall back to smaller polish

### Revisions required

-

### Gate B signature

- Decision: **approve for implement briefs** / **rework** / **stop**
- Signed: _______________ Date: _______________

---

## Gate C — Implement authorization (separate from audit)

This gate is **not** implied by A or B.

- [ ] I authorize production implementation of the approved set
- [ ] PR strategy: **multiple small PRs by surface** (Classes / Music / Builder|Timeline / Live / Account|Login / tokens)
- [ ] Token / design-system changes: allowed / limited to: _______________
- [ ] Branch prefix preference: e.g. `polish/…`

### Ordered implement set (final)

1.
2.
3.

### Gate C signature

- Signed: _______________ Date: _______________
