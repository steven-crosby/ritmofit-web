# Owner decisions: design audit run

This ledger is the gate between a delivered audit and any implementation. Until a row carries `approve`
or `approve-with-notes`, the prompt that owns it may not be executed.

**Agent filled:** run metadata, surface rows, backlog rows, prototype anchors, screenshot paths, owning
prompt, and a concise recommendation per row.
**Owner fills:** every disposition and note.
The agent has not filled a single disposition, has not checked an owner-gate box, and does not infer
approval from silence.

## Run metadata

| Field | Value |
| --- | --- |
| Run folder | `docs/audits/claude-design-audit-2026-07-24/` |
| Agent slug | `claude` |
| Run date | 2026-07-24 |
| Baseline branch | `main` |
| Baseline commit | `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe` |
| Prior run compared against | `2026-07-19-full-product-preview` (baseline `addaff3f`) |
| Pack version | 6 |
| Surface inventory | `surface-inventory.md` |
| Critique | `critique.md` |
| Backlog | `backlog.md` |
| Prototype | `mockups/index.html` |
| Implementation sequence | `implementation-sequence.md` |
| Folder size | 12.5 MB (budget 15 MB) |

## Global direction

| Question | Agent recommendation | Owner disposition (`approve` / `approve-with-notes` / `revise` / `reject` / `defer`) | Owner notes |
| --- | --- | --- | --- |
| Product-wide thesis | Structure is settled; fix **distribution and decisiveness** — sourcing where the nav says it lives, ranked lists that answer the real question, one committed action per surface | approve | Approved in chat, 2026-07-24. |
| Visual signature | Keep the Class Pulse and make it load-bearing on 8 surfaces; never flat, always provenance-marked | approve | Approved in chat, 2026-07-24. |
| Navigation/shell treatment | **No change.** Four destinations preserved; structural questions raised as PDRs, not redesigned | approve | Approved in chat, 2026-07-24. |
| Typography and density | No change to type roles — already correct. Density should differ intentionally: airy discovery, dense creation, sparse Live | approve | Approved in chat, 2026-07-24. |
| Color/depth/token direction | **Prefer** re-maps of existing values; a new value is allowed where a documented target cannot be met without one. Live-scoped re-maps for AAA contrast; planning surfaces untouched | approve | Approved in chat, 2026-07-24. **Amended 2026-07-25:** originally read "No new token values." The owner's position is that this is a default, not a gate — a direction row should not block a change that is otherwise correct. Implementation shipped three Live-scoped re-maps plus one new primitive (`ember-300`); see the revision log. |
| Motion posture | **No change.** Reduced motion already fully honoured (measured zero animations); pulse allowlist stays at two surfaces | approve | Approved in chat, 2026-07-24. |

## Surface decisions

One row per `primary` / `must-mock-state` canonical ID. Anchors are `mockups/index.html#<id>`.

| Surface ID | Surface/state | Prototype anchor | Current / proposed screenshots | Backlog IDs | Agent recommendation | Owner disposition | Owner notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PUB-01 | Public entry | `#pub-entry` | `PUB-01-marketing-desktop.jpg` / same | — | Keep; minor copy tightening only | approve | Approved in chat, 2026-07-24. |
| PUB-02 | Sign in / sign up | `#pub-auth` | `PUB-02-signin-desktop.jpg` / same | P1-05 | Derive the invite-only claim from the active gate | approve | Approved in chat, 2026-07-24. |
| PUB-03 | Recovery request | `#pub-recovery` | `PUB-03-recovery-*-desktop.jpg` / `PUB-03-recovery-desktop.jpg` | — | Keep verbatim — anti-enumeration is correct | approve | Approved in chat, 2026-07-24. |
| PUB-05 | Reset completion | `#pub-recovery` | `PUB-05-reset-desktop.jpg` / — | — | Keep | approve | Approved in chat, 2026-07-24. |
| PUB-06 | Not found | `#pub-invite` | `PUB-06-notfound-desktop.jpg` / — | — | Keep | approve | Approved in chat, 2026-07-24. |
| PUB-07 | Invitation rejection | `#pub-invite` | `PUB-07-invite-rejected-desktop.jpg` / same | — | Keep as the model for recovery copy | approve | Approved in chat, 2026-07-24. |
| SYS-01 | Workspace loading | `#sys-states` | `SYS-01-workspace-loading-desktop.jpg` / `SYS-01-states-desktop.jpg` | — | Keep | approve | Approved in chat, 2026-07-24. |
| SYS-02 | Update available | `#sys-states` | code-confirmed / `SYS-01-states-desktop.jpg` | — | Keep; unverified this run | approve | Approved in chat, 2026-07-24. |
| SYS-03 | Render recovery | `#sys-states` | code-confirmed / `SYS-01-states-desktop.jpg` | — | Keep; unverified this run | approve | Approved in chat, 2026-07-24. |
| CLS-00 | First-run tutorial | `#classes-fresh` | code-confirmed / `CLS-02-fresh-desktop.jpg` | — | No change proposed; did not fire this run | approve | Approved in chat, 2026-07-24. |
| CLS-01 | Class library | `#classes-home` | `CLS-01-library-desktop.jpg` / same + `-needswork` | P0-02, P0-03, P0-07, P0-08, P1-06, P1-07, P2-02 | **Rank by teaching readiness; per-card verb from readiness** | approve | Approved in chat, 2026-07-24. |
| CLS-02 | Fresh account | `#classes-fresh` | `CLS-02-fresh-desktop.jpg` / same | P0-03, P1-05 | Keep all four entries; recommend one | approve | Approved in chat, 2026-07-24. |
| CLS-03 | Empty class | `#class-empty` | `CLS-03-empty-class-desktop.jpg` / same | P0-08, P1-05 | Fix duplicated empty copy | approve | Approved in chat, 2026-07-24. |
| CLS-04 | Rehearsal view | `#class-rehearsal` | `CLS-04-rehearsal-populated-desktop.jpg` / `CLS-04-rehearsal-desktop.jpg` | P0-07 | Keep; pulse never flat | approve | Approved in chat, 2026-07-24. |
| CLS-05 | Library unavailable | `#class-library-error` | `CLS-05-library-error-desktop.jpg` / same | P1-05 | Keep grammar; stop leaking upstream text | approve | Approved in chat, 2026-07-24. |
| MUS-01 | Music disconnected | `#music-home` | `MUS-01-music-disconnected-desktop.jpg` / same | P0-01, P0-06, P1-02, P2-01 | **Rebuild as a sourcing workspace** | approve | Approved in chat, 2026-07-24. |
| MUS-02 | Music connected/mixed | `#music-home` | `MUS-02-music-mixed-desktop.jpg` / same | P0-01, P0-06, P1-02 | Same | approve | Approved in chat, 2026-07-24. |
| MUS-03 | Liked tracks | `#music-likes` | `MUS-03-likes-desktop.jpg` / same | P0-01 | Shared source list | approve | Approved in chat, 2026-07-24. |
| MUS-04 | Class created | `#music-likes` | `MUS-04-class-created-desktop.jpg` / `MUS-03-likes-desktop.jpg` | P0-01 | Keep | approve | Approved in chat, 2026-07-24. |
| MUS-05 | Playlist detail | `#music-likes` | **none** / `MUS-03-likes-desktop.jpg` | P0-01 | Unverified locally — mock seam returns no playlists | approve | Approved in chat, 2026-07-24. |
| MUS-06 | Catalog search | `#music-home` | `MUS-06-catalog-search-desktop.jpg` / `MUS-02-music-mixed-desktop.jpg` | P0-01 | Surface it on Music, not only Builder | approve | Approved in chat, 2026-07-24. |
| MUS-07 | Status unavailable | `#music-home` | `MUS-07-status-unavailable-desktop.jpg` / same | — | Keep — correctly distinct from disconnected | approve | Approved in chat, 2026-07-24. |
| CONN-01 | All disconnected | `#connections-dialog` | `CONN-01-disconnected-desktop.jpg` / same | P0-06 | Name each provider's control | approve | Approved in chat, 2026-07-24. |
| CONN-02 | Mixed states | `#connections-dialog` | `CONN-02-mixed-desktop.jpg` / same | P0-06 | Keep ledger; fix names | approve | Approved in chat, 2026-07-24. |
| BLD-01 | Populated Builder | `#builder-workbench` | `BLD-01-builder-desktop.jpg` / same | P0-07, P1-07 | Keep hierarchy — it works | approve | Approved in chat, 2026-07-24. |
| BLD-02 | Inspector essentials | `#builder-inspector` | `BLD-02-inspector-desktop.jpg` / same | P1-01 | Canon selection treatment | approve | Approved in chat, 2026-07-24. |
| BLD-03 | Advanced fields | `#builder-inspector` | `BLD-03-advanced-desktop.jpg` / `BLD-02-inspector-desktop.jpg` | P1-01 | Keep | approve | Approved in chat, 2026-07-24. |
| BLD-04 | Free-placement timeline | `#builder-workbench` | `BLD-04-timeline-desktop.jpg` / same | P0-07 | Keep; make silence read as authored | approve | Approved in chat, 2026-07-24. |
| BLD-05/06/14 | Preview ready/playing/paused | `#builder-inspector` | `BLD-05/06/14-*.jpg` / `BLD-02-inspector-desktop.jpg` | — | Keep | approve | Approved in chat, 2026-07-24. |
| BLD-15/16 | Preview failed / clip complete | `#builder-inspector` | **not induced** / `BLD-02-inspector-desktop.jpg` | — | Unverified this run | approve | Approved in chat, 2026-07-24. |
| BLD-07 | Add music — search | `#builder-addmusic` | `BLD-07-addmusic-desktop.jpg` / same | P0-01 | Share the source list | approve | Approved in chat, 2026-07-24. |
| BLD-08 | Add music — likes | `#builder-addmusic` | `BLD-08-likes-desktop.jpg` / `BLD-07-addmusic-desktop.jpg` | P0-01 | Same | approve | Approved in chat, 2026-07-24. |
| BLD-09 | Saved playlists empty | `#builder-addmusic` | `BLD-09-playlists-empty-desktop.jpg` / `BLD-07-addmusic-desktop.jpg` | P0-08 | Message renders twice — fix | approve | Approved in chat, 2026-07-24. |
| BLD-10 | Playlist URL import | `#builder-addmusic` | `BLD-10-playlist-import-desktop.jpg` / `BLD-07-addmusic-desktop.jpg` | — | Keep | approve | Approved in chat, 2026-07-24. |
| BLD-11 | Custom moves | `#builder-moves` | `BLD-11-custom-moves-desktop.jpg` / `BLD-11-moves-desktop.jpg` | P1-04 | Own group | approve | Approved in chat, 2026-07-24. |
| BLD-12/13 | Songs by move | `#builder-moves` | `BLD-12/13-*.jpg` / `BLD-11-moves-desktop.jpg` | P1-04 | Group by template | approve | Approved in chat, 2026-07-24. |
| LIVE-01 | Live queue | `#live-queue` | `LIVE-01-queue-desktop.jpg` / same | P0-02, P0-03, P0-07, P1-03 | **Compress to a scan unit** | approve | Approved in chat, 2026-07-24. |
| LIVE-02 | Preflight | `#live-preflight` | `LIVE-02-preflight-desktop.jpg` / same | — | Keep — already correct | approve | Approved in chat, 2026-07-24. |
| LIVE-03 | Run ready | `#live-run` | `LIVE-03-run-ready-desktop.jpg` / `LIVE-04-run-active-desktop.jpg` | P0-04, P2-01 | **AAA contrast fix** | approve | Approved in chat, 2026-07-24. |
| LIVE-04 | Run active | `#live-run` | `LIVE-04-run-active-dense-desktop.jpg` / `LIVE-04-run-active-desktop.jpg` | P0-04, P2-01 | Same | approve | Approved in chat, 2026-07-24. |
| LIVE-05 | Run paused | `#live-run` | `LIVE-05-run-paused-dense-desktop.jpg` / `LIVE-05-run-paused-desktop.jpg` | P0-04 | Same | approve | Approved in chat, 2026-07-24. |
| LIVE-06 | Full run of show | `#live-run-of-show` | `LIVE-06-run-of-show-desktop.jpg` / same | P0-04 | Same | approve | Approved in chat, 2026-07-24. |
| LIVE-09 | Runtime failure | `#live-run` | **not induced** / `LIVE-09-runtime-failure-desktop.jpg` | — | Unverified this run | approve | Approved in chat, 2026-07-24. |
| ACC-01 | Account workspace | `#account` | `ACC-01-account-disconnected-desktop.jpg` / `ACC-01-account-desktop.jpg` | P1-05 | Fix the "Profile verified" claim | approve | Approved in chat, 2026-07-24. |
| ACC-02 | Account connections | `#account` | `ACC-02-connections-desktop-full.jpg` / `ACC-01-account-desktop.jpg` | P0-06 | Keep shared ledger | approve | Approved in chat, 2026-07-24. |
| ACC-03 | Account status unavailable | `#connections-dialog` | `ACC-03-status-unavailable-desktop.jpg` / — | — | Keep | approve | Approved in chat, 2026-07-24. |

## Backlog decisions

| ID | Title | Priority | Surface IDs | Owning prompt | Agent recommendation | Owner disposition | Owner notes/revision requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Music as a sourcing workspace | P0 | MUS-01/02/03/05/06, CONN-01 | `02-music-sourcing.md` | Approve — largest single win; depends on PDR-02 | approve | Approved in chat, 2026-07-24. |
| P0-02 | Rank Classes and Live by teaching readiness | P0 | CLS-01, LIVE-01 | `03-classes-ranking.md` | Approve the switch; default depends on PDR-01 | approve | Approved in chat, 2026-07-24. |
| P0-03 | Primary action names the next step | P0 | CLS-01, LIVE-01, CLS-04 | `03-classes-ranking.md` | Approve — low cost, high clarity | approve | Approved in chat, 2026-07-24. |
| P0-04 | Live meets the AAA contrast target | P0 | LIVE-02–06 | `01-shared-foundations.md` | Approve — measured failure against the repo's own target | approve | Approved in chat, 2026-07-24. |
| P0-05 | Gate the AAA target in the verifier | P0 | LIVE-02–06 | `01-shared-foundations.md` | Approve — without it P0-04 regresses | approve | Approved in chat, 2026-07-24. |
| P0-06 | Connect actions name their provider | P0 | MUS-01/02, CONN-01/02, ACC-02 | `02-music-sourcing.md` | Approve — accessibility + honesty | approve | Approved in chat, 2026-07-24. |
| P0-07 | Class Pulse never flat | P0 | CLS-01/04, LIVE-01/03, BLD-01 | `01-shared-foundations.md` | Approve — explicit canon violation | approve | Approved in chat, 2026-07-24. |
| P0-08 | Duplicated copy + canvas error | P0 | CLS-01/03/04, BLD-09 | `01-shared-foundations.md` | Approve — defects with known source lines | approve | Approved in chat, 2026-07-24. |
| P1-01 | Canon intensity selection treatment | P1 | BLD-02, BLD-03 | `01-shared-foundations.md` | Approve — copper misused as a selection fill | approve | Approved in chat, 2026-07-24. |
| P1-02 | Provider buttons as true secondaries | P1 | MUS-01/02 | `02-music-sourcing.md` | Approve | approve | Approved in chat, 2026-07-24. |
| P1-03 | Compress the Live queue card | P1 | LIVE-01 | `04-live-pressure.md` | Approve | approve | Approved in chat, 2026-07-24. |
| P1-04 | Group the move picker by template | P1 | BLD-02, BLD-11/12/13 | `05-builder-moves.md` | Approve; shape depends on PDR-03 | approve | Approved in chat, 2026-07-24. |
| P1-05 | Replace unsupported claims | P1 | ACC-01, PUB-02, CLS-05, CLS-02/03 | `06-truthful-state-copy.md` | Approve — truthfulness | approve | Approved in chat, 2026-07-24. |
| P1-06 | Reduce the mobile preamble | P1 | CLS-01, CLS-02 | `03-classes-ranking.md` | Approve | approve | Approved in chat, 2026-07-24. |
| P1-07 | One vocabulary for opening a class | P1 | CLS-01, BLD-01 | `03-classes-ranking.md` | Approve | approve | Approved in chat, 2026-07-24. |
| P1-08 | One focus-ring treatment | P1 | all active | `01-shared-foundations.md` | Approve — cosmetic consistency, cheap | approve | Approved in chat, 2026-07-24. |
| P2-01 | Spend the empty regions | P2 | LIVE-03/04, MUS-01 | `02` (Music) + `04` (Live) | Approve as part of those slices, not standalone | approve | Approved in chat, 2026-07-24. |
| P2-02 | Schema vocabulary out of the creative path | P2 | CLS-01, CLS-02 | `03-classes-ranking.md` | Approve — trivial | approve | Approved in chat, 2026-07-24. |
| PDR-01 | Classes/Live ordering default | decision required | CLS-01, LIVE-01 | — (excluded) | Recommend teaching-readiness as the default, with a labelled switch | resolved | Default to **teaching readiness** on both Classes and Live; keep the labelled switch. Approved in chat, 2026-07-24. |
| PDR-02 | Where music discovery lives | decision required | MUS-01/02/06, BLD-07 | — (excluded) | Recommend Music owns sourcing via one shared component | resolved | **Music owns sourcing** via one shared source-list component. Approved in chat, 2026-07-24. |
| PDR-03 | Move library filtering | decision required | BLD-11/12/13 | — (excluded) | Recommend group-and-demote, never hide | resolved | **Group and demote** — current template first, others collapsed but reachable. Approved in chat, 2026-07-24. |

## Prompt authorization

Filled by the owner after the backlog rows above. A prompt is executable only when **every** backlog ID it
owns is approved. Partially approved prompts must be revised before use, not run selectively.

| Prompt | Backlog IDs owned | All approved? | Authorized to execute | Owner notes |
| --- | --- | --- | --- | --- |
| `implementation-prompts/01-shared-foundations.md` | P0-04, P0-05, P0-07, P0-08, P1-01, P1-08 | Yes | **Yes** | Approved in chat, 2026-07-24. |
| `implementation-prompts/02-music-sourcing.md` | P0-01, P0-06, P1-02, P2-01 (Music) | Yes | **Yes** | Approved in chat, 2026-07-24. |
| `implementation-prompts/03-classes-ranking.md` | P0-02, P0-03, P1-06, P1-07, P2-02 | Yes | **Yes** | Approved in chat, 2026-07-24. |
| `implementation-prompts/04-live-pressure.md` | P1-03, P2-01 (Live) | Yes | **Yes** | Approved in chat, 2026-07-24. |
| `implementation-prompts/05-builder-moves.md` | P1-04 | Yes | **Yes** | Approved in chat, 2026-07-24. |
| `implementation-prompts/06-truthful-state-copy.md` | P1-05 | Yes | **Yes** | Approved in chat, 2026-07-24. |

## Revision log

| Item/surface | Requested revision | Revision artifact | Agent summary | Final owner disposition | Final notes |
| --- | --- | --- | --- | --- | --- |
| Color/depth/token direction (P0-04, P0-05) | Permit a new token value where a re-map cannot reach the target | PR #370 | Live's `state/danger` measured 6.33:1 on `bg/live` as 12px semibold text — below the 7:1 AAA target, and unreachable by re-map because `ember-400` was already the lightest step in that ramp. The three alternatives were: a new primitive; a component-level change in `LiveMode.tsx` (which the contrast gate cannot enforce, defeating P0-05); or re-mapping danger to amber (which conflates danger with caution). Shipped `ember-300` `#EE7A66` at 7.52:1, Live-scoped — planning surfaces keep `ember-400`. | approve | Approved in chat, 2026-07-25, with the note that treating "no new token values" as a hard gate is an inflexibility the owner does not agree with. The global-direction row above was amended to match. |

## Excluded from implementation

| ID/surface | Disposition | Reason |
| --- | --- | --- |
| PDR-01 | (owner decides) | Ordering default is a product-model decision; prompt 03 builds the switch but not the default |
| PDR-02 | (owner decides) | Whether Music owns search changes what the destination means; prompt 02 assumes yes |
| PDR-03 | (owner decides) | Hide vs demote other disciplines; prompt 05 assumes demote |
| MUS-05, BLD-15, BLD-16, LIVE-09 | — | Current behaviour not verifiable in this environment; no proposal rests on observed evidence |

## Owner gate

- [x] I reviewed the product-wide direction.
- [x] I reviewed all primary surfaces or explicitly deferred them.
- [x] Every backlog item has a disposition.
- [x] Required revisions have a final disposition.
- [x] The prompt authorization table reflects what I actually want built.

> **Provenance.** Every disposition above was given by the owner (Steven) in chat on **2026-07-24**
> (“I want to approve everything I’ve reviewed”), and the three product decisions were answered
> explicitly in the same exchange. The agent transcribed them; it did not self-approve. Correct any row
> directly if this does not match your intent — the ledger, not the transcript, is the authority.

Implementation, branch, commit, push, PR, and merge were granted by the owner on **2026-07-24**.
**Deploy remains a separate grant** and has not been given — merging to `main` does not deploy.
