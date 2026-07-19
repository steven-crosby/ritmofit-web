# Owner decisions: full-product design preview

Copy to `docs/audits/<run-id>/run-decisions.md`. The preview agent pre-fills evidence, links, and
recommendations. Only the owner fills or explicitly supplies the final dispositions.

## Run metadata

| Field | Value |
| --- | --- |
| Run ID | |
| Baseline branch | |
| Baseline commit | |
| Surface inventory | `surface-inventory.md` |
| Critique | `critique.md` |
| Backlog | `backlog.md` |
| Prototype | `mockups/index.html` |
| Review guide | `review-guide.md` |
| Date | |
| Preview agent | |

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

One row for every `primary` and `must-mock-state` inventory ID.

| Surface ID | Surface/state | Prototype anchor | Current/proposed screenshots | Backlog IDs | Agent recommendation | Owner disposition | Owner notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Backlog decisions

Every P0/P1/P2 and `product-decision-required` item must appear.

| ID | Title | Priority | Surfaces | Agent recommendation | Owner disposition | Owner notes/revision requirement |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## Revision log

Use this when an item is marked `revise`. A revised direction is not approved until the owner records a new
disposition.

| Item/surface | Requested revision | Revision artifact | Agent summary | Final owner disposition | Final notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Approved implementation set

Filled during phase 4 from final owner decisions only.

| Approved ID | Owner notes incorporated | Owning implementation prompt |
| --- | --- | --- |
| | | |

## Explicitly excluded from implementation prompts

| ID/surface | Disposition | Reason |
| --- | --- | --- |
| | | |

## Owner gate

- [ ] I reviewed the product-wide direction.
- [ ] I reviewed all primary surfaces or explicitly deferred them.
- [ ] Every backlog item has a disposition.
- [ ] Required revisions have a final disposition.
- [ ] Phase 4 may generate implementation prompts from approved items only.

The agent must not check these boxes or infer authorization on the owner's behalf.
