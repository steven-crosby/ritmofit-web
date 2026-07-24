# Owner decisions: design audit run

Copy to `<run-folder>/run-decisions.md` at closeout. This ledger is the gate between a delivered audit and
any implementation. Until a row carries `approve` or `approve-with-notes`, the prompt that owns it may not
be executed.

**Agent fills:** run metadata, every surface ID, every backlog ID, prototype anchors, screenshot paths,
owning implementation prompt, and a concise recommendation per row.
**Owner fills:** every disposition and note.
The agent must never fill a disposition, check an owner-gate box, or infer approval from silence.

## Run metadata

| Field | Value |
| --- | --- |
| Run folder | `docs/audits/<agent>-design-audit-<YYYY-MM-DD>/` |
| Agent slug | |
| Run date | |
| Baseline branch | |
| Baseline commit | |
| Prior run compared against | |
| Pack version | 6 |
| Surface inventory | `surface-inventory.md` |
| Critique | `critique.md` |
| Backlog | `backlog.md` |
| Prototype | `mockups/index.html` |
| Implementation sequence | `implementation-sequence.md` |
| Folder size | |

## Global direction

| Question | Agent recommendation | Owner disposition (`approve` / `approve-with-notes` / `revise` / `reject` / `defer`) | Owner notes |
| --- | --- | --- | --- |
| Product-wide thesis | | | |
| Visual signature | | | |
| Navigation/shell treatment | | | |
| Typography and density | | | |
| Color/depth/token direction | | | |
| Motion posture | | | |

## Surface decisions

One row for every `primary` and `must-mock-state` canonical ID in this run.

| Surface ID | Surface/state | Prototype anchor | Current/proposed screenshots | Backlog IDs | Agent recommendation | Owner disposition | Owner notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Backlog decisions

Every P0/P1/P2 and `product-decision-required` item must appear, with the prompt that would implement it.

| ID | Title | Priority | Surface IDs | Owning prompt | Agent recommendation | Owner disposition | Owner notes/revision requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Prompt authorization

Filled by the owner after the backlog rows above. A prompt is executable only when every backlog ID it owns
is approved. Partially approved prompts must be revised before use, not run selectively.

| Prompt | Backlog IDs owned | All approved? | Authorized to execute | Owner notes |
| --- | --- | --- | --- | --- |
| `implementation-prompts/01-...` | | | | |

## Revision log

Use when an item is marked `revise`. A revised direction is not approved until the owner records a new
disposition here.

| Item/surface | Requested revision | Revision artifact | Agent summary | Final owner disposition | Final notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Excluded from implementation

| ID/surface | Disposition | Reason |
| --- | --- | --- |
| | | |

## Owner gate

- [ ] I reviewed the product-wide direction.
- [ ] I reviewed all primary surfaces or explicitly deferred them.
- [ ] Every backlog item has a disposition.
- [ ] Required revisions have a final disposition.
- [ ] The prompt authorization table reflects what I actually want built.

Implementation, commit, push, PR, merge, and deploy remain separate grants after this gate.
