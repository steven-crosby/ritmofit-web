# Owner decisions — polish audit

Agents must not proceed past the matching gate without this file being completed and signed by the
owner.

## Run metadata

| Field            | Value               |
| ---------------- | ------------------- |
| Run id           | `2026-07-18-polish` |
| Critique         | `critique.md`       |
| Backlog          | `backlog.md`        |
| Date of decision | 2026-07-18          |
| Owner            | Steven              |

## Gate A — After backlog

### Global

- [x] I accept the critique’s top diagnosis (or I note dissent below).
- [x] Success ranking still: (1) faster class build (2) gorgeous (3) Live pride.

### Backlog disposition

Set one disposition for each item: `ship`, `ship-after-mockup`, `defer`, or `kill`.

| ID    | Title                                                       | Disposition       | Notes |
| ----- | ----------------------------------------------------------- | ----------------- | ----- |
| P0-01 | Select music before creating or adding                      | ship-after-mockup |       |
| P0-02 | Keep Add track in reach on mobile                           | ship-after-mockup |       |
| P0-03 | Bring selected-track scoring to the selected row on mobile  | ship-after-mockup |       |
| P0-04 | Separate “can start,” “music checked,” and “class complete” | ship-after-mockup |       |
| P0-05 | Design an affirmative Live state for no-cue classes         | ship-after-mockup |       |
| P0-06 | Add in-row candidate audition to discovery                  | ship-after-mockup |       |
| P0-07 | Make large music collections searchable and metadata-honest | ship-after-mockup |       |
| P0-08 | Enforce 44px mobile interaction targets                     | ship-after-mockup |       |
| P1-01 | Turn Classes rest into a useful continuation surface        | ship-after-mockup |       |
| P1-02 | Clarify class-card primary action and recency               | ship-after-mockup |       |
| P1-03 | Recompose the class header around building                  | ship-after-mockup |       |
| P1-04 | Consolidate Music provider navigation                       | ship-after-mockup |       |
| P1-05 | Give class shape clear compositional ownership              | ship-after-mockup |       |
| P1-06 | Turn Inspector Essentials into a scoring flow               | ship-after-mockup |       |
| P1-07 | Remove resting shadow and border drift                      | ship-after-mockup |       |
| P1-08 | Delete internal and generic product copy                    | ship-after-mockup |       |
| P1-09 | Standardize loading, empty, expired, and retry patterns     | ship-after-mockup |       |
| P1-10 | Add high-frequency desktop authoring shortcuts              | ship-after-mockup |       |
| P1-11 | Make Login trust specific without making it marketing       | ship-after-mockup |       |
| P2-01 | Separate Account facts from editable settings               | ship-after-mockup |       |
| P2-02 | Rationalize repeated connection summaries                   | ship-after-mockup |       |
| P2-03 | Spend motion only on build confirmation and the drop        | ship-after-mockup |       |
| P2-04 | Add 320px and 200% zoom visual regression gates             | ship-after-mockup |       |

### Mockup flags

Recommended direction mockups: `P0-01`, `P0-02`, `P0-03`, `P0-05`.

Final owner list: `P0-01`–`P0-08`, `P1-01`–`P1-11`, and `P2-01`–`P2-04`.

Owner override: produce reviewable mockups for the complete ranked backlog, including items the audit
prompt originally classified as implement-without-mockup polish.

Items not listed may proceed to implementation briefs after Gate A only when separate implement
authorization is later recorded.

### Explicit non-goals this round

- No production implementation before Gate B approval.
- No merge, deploy, or direct changes to `main`; Gate C may separately authorize a draft review PR.
- Preserve the existing product shell and the audit backlog's out-of-scope list.

### Dissent / overrides on critique

-

### Answers to owner questions

1. Music selection default: Nothing selected initially.
2. Mobile scoring pattern: Use the bottom sheet; the inline and full-screen treatments remain comparison
   evidence only.
3. Readiness vocabulary: “Can start,” “Music checked,” and “Class complete.”
4. No-cue Live lead state: Lead with track identity plus section/effort.

### Gate A signature

- Decision: **proceed to mockups**
- Signed: **Steven Crosby** — Date: **07/18/2026**

## Gate B — After mockups

Mockup files reviewed:

- `mockups/polish-preview.html`
- `mockups/polish-preview-notes.md`

- [x] Direction approved as-is
- [ ] Approved with revisions (list below)
- [ ] Rejected — rework mockups
- [ ] Drop mockup-driven items; fall back to smaller polish

### Revisions required

- None. For implementation, use the approved bottom-sheet scoring direction from the comparison set.

### Gate B signature

- Decision: **approve for implement briefs**
- Signed: **Steven Crosby** — Date: **07/18/2026**

## Gate C — Implement authorization

This gate is separate from A and B.

- [x] I authorize production implementation of the approved set.
- [x] PR strategy: one draft review PR from the existing branch, built as six ordered commit batches.
- [x] Token/design-system changes: allowed when required by the approved implementation.
- [x] Branch prefix preference: `polishv3/…`

### Ordered implement set

1. Foundations — `P0-08`, `P1-07`, `P2-03`, `P2-04`
2. Music + Connections — `P0-01`, `P0-06`, `P0-07`, `P1-04`, `P1-09`, `P2-02`
3. Builder + Timeline — `P0-02`, `P0-03`, `P1-03`, `P1-05`, `P1-06`, `P1-10`
4. Classes — `P1-01`, `P1-02`
5. Live — `P0-04`, `P0-05`
6. Account + Login — `P1-08`, `P1-11`, `P2-01`

Owner resolution: P0-03 uses the bottom-sheet mobile scoring pattern. Open a draft PR for review after
the authorized branch changes are committed and pushed. Do not merge or deploy without separate owner
authorization.

### Gate C signature

- Signed: **Steven Crosby** — Date: **07/18/2026**
