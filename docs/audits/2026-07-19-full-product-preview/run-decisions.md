# Owner decisions: full-product design preview

Only Steven fills or explicitly supplies final dispositions. Agent recommendations are not approvals.

## Run metadata

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| Run ID            | `2026-07-19-full-product-preview`          |
| Baseline branch   | `origin/main` / local `main`               |
| Baseline commit   | `addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b` |
| Review branch     | `codex/full-product-preview-audit`         |
| Surface inventory | `surface-inventory.md`                     |
| Critique          | `critique.md`                              |
| Backlog           | `backlog.md`                               |
| Prototype         | `mockups/index.html`                       |
| Review guide      | `review-guide.md`                          |
| Date              | 2026-07-19                                 |
| Preview agent     | Codex                                      |

## Global direction

| Question                    | Agent recommendation                                                                                                  | Owner disposition (`approve` / `approve-with-notes` / `revise` / `reject` / `defer`) | Owner notes                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------- |
| Product-wide thesis         | Keep the current shell; organize the product around Find → Shape → Score → Lead.                                      | approve                                                                              | Approved in chat, 2026-07-19. |
| Visual signature            | Adopt Class Pulse, track score, count strip, and Live pressure hierarchy as a restrained cross-product signature.     | approve                                                                              | Approved in chat, 2026-07-19. |
| Navigation/shell treatment  | Preserve Classes / Music / Live / Account; use a compact horizontal class chooser on mobile Builder.                  | approve                                                                              | Approved in chat, 2026-07-19. |
| Typography and density      | Bricolage for earned display, Sora for work, Azeret for time/data; compress repeated cards and readiness issues.      | approve                                                                              | Approved in chat, 2026-07-19. |
| Color/depth/token direction | Copper action, cyan control/focus/playback, amber warning, plasma only at peak; lifted depth only for overlays/rails. | approve                                                                              | Approved in chat, 2026-07-19. |
| Motion posture              | Use motion only for orientation/state; provide static labels under reduced motion.                                    | approve                                                                              | Approved in chat, 2026-07-19. |

## Surface decisions

Current/proposed captures are `screenshots/current/<current-file>` and `screenshots/proposed/<ID>-proposed-{desktop,mobile}.png`.

| Surface ID | Surface/state                 | Prototype anchor   | Backlog IDs          | Agent recommendation                                                                 | Owner disposition | Owner notes                   |
| ---------- | ----------------------------- | ------------------ | -------------------- | ------------------------------------------------------------------------------------ | ----------------- | ----------------------------- |
| PUB-01     | Public entry                  | `mockups/#PUB-01`  | P0-02, P1-06         | Use real Class Pulse product proof and private-beta/provider trust.                  | approve           | Approved in chat, 2026-07-19. |
| PUB-02     | Sign in / sign up             | `mockups/#PUB-02`  | P1-04, P1-06         | Preserve product context beside the auth task.                                       | approve           | Approved in chat, 2026-07-19. |
| PUB-03     | Password recovery request     | `mockups/#PUB-03`  | P0-08, P1-06         | Use one calm recovery grammar.                                                       | approve           | Approved in chat, 2026-07-19. |
| PUB-04     | Privacy and data              | `mockups/#PUB-04`  | P1-04, P1-06         | Explain Ritmo data versus provider audio plainly.                                    | approve           | Approved in chat, 2026-07-19. |
| PUB-05     | Set new password              | `mockups/#PUB-05`  | P0-08, P1-06         | Complete expired/success/safe-return states.                                         | approve           | Approved in chat, 2026-07-19. |
| PUB-06     | Not found                     | `mockups/#PUB-06`  | P0-08, P1-04         | Recover to active product only.                                                      | approve           | Approved in chat, 2026-07-19. |
| PUB-07     | Invitation required           | `mockups/#PUB-07`  | P0-08, P1-06         | Preserve entered intent and state the exact private-beta boundary.                   | approve           | Approved in chat, 2026-07-19. |
| SYS-01     | App loading                   | `mockups/#SYS-01`  | P0-08                | Preserve workspace shape and name what is loading.                                   | approve           | Approved in chat, 2026-07-19. |
| SYS-02     | Update available              | `mockups/#SYS-02`  | P0-08                | Keep explicit Later/Reload and stale-client escape.                                  | approve           | Approved in chat, 2026-07-19. |
| SYS-03     | Unexpected error recovery     | `mockups/#SYS-03`  | P0-08                | State what is safe and where reload returns.                                         | approve           | Approved in chat, 2026-07-19. |
| CLS-00     | First-run tutorial            | `mockups/#CLS-00`  | P1-01, P1-06         | Four-count inspectable tutorial with permanent skip.                                 | approve           | Approved in chat, 2026-07-19. |
| CLS-01     | Class library                 | `mockups/#CLS-01`  | P0-02, P1-01         | Order by class shape, readiness, recency, and next task.                             | approve           | Approved in chat, 2026-07-19. |
| CLS-02     | Fresh signed-in account       | `mockups/#CLS-02`  | P1-01, P1-06         | Show equal music/template/movement starts.                                           | approve           | Approved in chat, 2026-07-19. |
| CLS-03     | Empty class                   | `mockups/#CLS-03`  | P0-04, P1-01         | Do not force one creation funnel.                                                    | approve           | Approved in chat, 2026-07-19. |
| CLS-04     | Class summary                 | `mockups/#CLS-04`  | P0-02, P1-05         | Read-only pulse/readiness/run-of-show rehearsal view.                                | approve           | Approved in chat, 2026-07-19. |
| CLS-05     | Class library unavailable     | `mockups/#CLS-05`  | P0-08, P1-04         | Distinguish unavailable from empty; retain retry and safe new-draft actions.         | approve           | Approved in chat, 2026-07-19. |
| MUS-01     | Music disconnected            | `mockups/#MUS-01`  | P0-06, P1-02         | Keep catalog useful; name unavailable library/playback.                              | approve           | Approved in chat, 2026-07-19. |
| MUS-02     | Music connected               | `mockups/#MUS-02`  | P0-04, P1-02         | Use source shelves that route browsing into class work.                              | approve           | Approved in chat, 2026-07-19. |
| MUS-03     | Liked tracks                  | `mockups/#MUS-03`  | P0-04, P1-02         | Use shared rows and sticky selection tray.                                           | approve           | Approved in chat, 2026-07-19. |
| MUS-04     | Class created from source     | `mockups/#MUS-04`  | P0-04, P1-04         | Preserve provenance and route to shaping.                                            | approve           | Approved in chat, 2026-07-19. |
| MUS-05     | Playlist detail               | `mockups/#MUS-05`  | P0-04, P1-02, PDR-03 | Browse before import, subject to provider feasibility.                               | approve           | Approved in chat, 2026-07-19. |
| MUS-06     | Catalog search                | `mockups/#MUS-06`  | P0-04, P1-02         | Persist audition/selection/destination context.                                      | approve           | Approved in chat, 2026-07-19. |
| MUS-07     | Connection status unavailable | `mockups/#MUS-07`  | P0-06, P0-08         | Show last-known sources as unverified; never infer disconnect from a failed request. | approve           | Approved in chat, 2026-07-19. |
| CONN-01    | Connections disconnected      | `mockups/#CONN-01` | P0-06                | Show catalog/library/playback separately.                                            | approve           | Approved in chat, 2026-07-19. |
| CONN-02    | Connections mixed/recovery    | `mockups/#CONN-02` | P0-06, P0-08         | Label consequence and recovery without color dependence.                             | approve           | Approved in chat, 2026-07-19. |
| BLD-01     | Builder populated             | `mockups/#BLD-01`  | P0-01, P0-02, P1-03  | Adopt the composed workbench hierarchy.                                              | approve           | Approved in chat, 2026-07-19. |
| BLD-02     | Inspector essentials          | `mockups/#BLD-02`  | P0-03, P1-03         | Make common scoring fast and selected-track specific.                                | approve           | Approved in chat, 2026-07-19. |
| BLD-03     | Inspector advanced            | `mockups/#BLD-03`  | P0-03, P1-03         | Keep timing detail one deliberate disclosure away.                                   | approve           | Approved in chat, 2026-07-19. |
| BLD-04     | Free-placement timeline       | `mockups/#BLD-04`  | P0-01, P0-02         | Dedicated precision state; do not become a DAW.                                      | approve           | Approved in chat, 2026-07-19. |
| BLD-05     | Preview ready                 | `mockups/#BLD-05`  | P0-03, P0-04         | Persist provider/clip/selected-track context.                                        | approve           | Approved in chat, 2026-07-19. |
| BLD-06     | Preview playing               | `mockups/#BLD-06`  | P0-03, P0-04, P0-07  | Explicit playing state, safe stop, static reduced-motion label.                      | approve           | Approved in chat, 2026-07-19. |
| BLD-14     | Preview paused                | `mockups/#BLD-14`  | P0-03, P0-07, P0-08  | Preserve provider, elapsed position, and unmistakable resume/stop actions.           | approve           | Approved in chat, 2026-07-19. |
| BLD-15     | Preview resume failed         | `mockups/#BLD-15`  | P0-06, P0-08         | Keep the class edit safe and offer restart, stop, and provider-status recovery.      | approve           | Approved in chat, 2026-07-19. |
| BLD-16     | Preview complete              | `mockups/#BLD-16`  | P0-03, P0-08         | Distinguish completion from stop and make replay deliberate.                         | approve           | Approved in chat, 2026-07-19. |
| BLD-07     | Add music search              | `mockups/#BLD-07`  | P0-01, P0-04         | Task drawer with selection continuity.                                               | approve           | Approved in chat, 2026-07-19. |
| BLD-08     | Add music likes               | `mockups/#BLD-08`  | P0-04                | Reuse Music source-list language.                                                    | approve           | Approved in chat, 2026-07-19. |
| BLD-09     | Saved playlists empty         | `mockups/#BLD-09`  | P0-04, P0-06         | Explain real empty content; keep other starts available.                             | approve           | Approved in chat, 2026-07-19. |
| BLD-10     | Playlist URL import           | `mockups/#BLD-10`  | P0-06, P1-04         | Name support, validation, and destination before import.                             | approve           | Approved in chat, 2026-07-19. |
| BLD-11     | Custom moves                  | `mockups/#BLD-11`  | P0-03, P1-04         | Modality-neutral reusable movement language.                                         | approve           | Approved in chat, 2026-07-19. |
| BLD-12     | Songs by move empty           | `mockups/#BLD-12`  | P0-04, P1-04         | Teach how pairings accumulate and offer a next action.                               | approve           | Approved in chat, 2026-07-19. |
| BLD-13     | Songs by move result          | `mockups/#BLD-13`  | P0-04, P1-04         | Treat movement-led creation as a first-class on-ramp.                                | approve           | Approved in chat, 2026-07-19. |
| LIVE-01    | Live queue                    | `mockups/#LIVE-01` | P0-05, P1-05         | Lead with readiness and last-rehearsed context.                                      | approve           | Approved in chat, 2026-07-19. |
| LIVE-02    | Blocked preflight             | `mockups/#LIVE-02` | P0-05, P0-06         | Group pass/fix; keep prompter-only confident.                                        | approve           | Approved in chat, 2026-07-19. |
| LIVE-03    | Run ready                     | `mockups/#LIVE-03` | P0-02, P0-05         | Put the first action in the hero.                                                    | approve           | Approved in chat, 2026-07-19. |
| LIVE-04    | Run active                    | `mockups/#LIVE-04` | P0-05, P0-07         | Cue/count/next/transport pressure hierarchy.                                         | approve           | Approved in chat, 2026-07-19. |
| LIVE-05    | Run paused                    | `mockups/#LIVE-05` | P0-05, P0-07         | Hold context and make resume unmistakable.                                           | approve           | Approved in chat, 2026-07-19. |
| LIVE-06    | Full run list                 | `mockups/#LIVE-06` | P0-05, P1-05         | Compact score with current position and rehearsal marks.                             | approve           | Approved in chat, 2026-07-19. |
| LIVE-09    | Runtime playback recovery     | `mockups/#LIVE-09` | P0-05, P0-06, P0-08  | Preserve cue/clock; retry/reconnect/continue without music.                          | approve           | Approved in chat, 2026-07-19. |
| ACC-01     | Account workspace             | `mockups/#ACC-01`  | P1-03, P1-07         | Quiet identity/defaults/security/status ledger.                                      | approve           | Approved in chat, 2026-07-19. |
| ACC-02     | Account connections           | `mockups/#ACC-02`  | P0-06, P1-07         | Reuse the same provider capability component.                                        | approve           | Approved in chat, 2026-07-19. |
| ACC-03     | Account status unavailable    | `mockups/#ACC-03`  | P0-08, P1-07         | State that settings are safe, disable unsafe edits, and offer retry.                 | approve           | Approved in chat, 2026-07-19. |

## Backlog decisions

| ID     | Title                         | Priority          | Surfaces                                                           | Agent recommendation                                              | Owner disposition | Owner notes/revision requirement                                                   |
| ------ | ----------------------------- | ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| P0-01  | Builder task hierarchy        | P0                | Builder                                                            | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P0-02  | Shared Class Pulse            | P0                | Public, Classes, Builder, Live                                     | approve direction subject to PDR-02                               | approve           | Approved in chat, 2026-07-19; ownership remains PDR-02.                            |
| P0-03  | Essentials/advanced inspector | P0                | Builder                                                            | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P0-04  | Unified discovery/selection   | P0                | Classes, Music, Builder                                            | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P0-05  | Live pressure hierarchy       | P0                | Live                                                               | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P0-06  | Provider capability truth     | P0                | Music, Builder preview, Account, Live                              | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P0-07  | Pressure-safe accessibility   | P0                | All                                                                | approve as non-negotiable quality bar                             | approve           | Approved in chat, 2026-07-19.                                                      |
| P0-08  | Recovery-state grammar        | P0                | Public, system, Classes, providers, Builder preview, Live, Account | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-01  | Run-of-show class shelf       | P1                | Classes                                                            | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-02  | Music sourcing workspace      | P1                | Music                                                              | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-03  | Type/data/density hierarchy   | P1                | All                                                                | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-04  | Product-specific state copy   | P1                | All                                                                | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-05  | Rehearsal/summary view        | P1                | Classes, Live                                                      | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-06  | Public/auth trust coherence   | P1                | Public, first use                                                  | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P1-07  | Account status consolidation  | P1                | Account                                                            | approve direction                                                 | approve           | Approved in chat, 2026-07-19.                                                      |
| P2-01  | Derived class artwork         | P2                | Classes, Builder                                                   | defer until Class Pulse direction proves useful                   | defer             | Deferred in chat, 2026-07-19.                                                      |
| P2-02  | Beat-aware microinteraction   | P2                | Public, Builder, Live                                              | defer until hierarchy ships                                       | defer             | Deferred in chat, 2026-07-19.                                                      |
| PDR-01 | Mobile Builder rail treatment | decision required | Builder mobile                                                     | approve compact horizontal chooser over hiding rail               | approve           | Approved in chat, 2026-07-19.                                                      |
| PDR-02 | Class Pulse ownership         | decision required | Cross-product                                                      | start derived + visibly confirm; do not assume persistence/schema | approve           | Approved in chat, 2026-07-19.                                                      |
| PDR-03 | Playlist browse-before-import | decision required | Music, Builder                                                     | approve interaction goal after provider feasibility check         | approve           | Approved in chat, 2026-07-19; provider feasibility required before implementation. |

## Revision log

| Item/surface | Requested revision | Revision artifact | Agent summary | Final owner disposition | Final notes |
| ------------ | ------------------ | ----------------- | ------------- | ----------------------- | ----------- |
|              |                    |                   |               |                         |             |

## Approved implementation set

Filled during phase 4 from the owner-approved dispositions above.

| Approved ID | Owner notes incorporated                                              | Owning implementation prompt                            |
| ----------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| P0-01       | Approved without additional notes                                     | `implementation-prompts/04-builder-workbench.md`        |
| P0-02       | Approved; apply PDR-02 derived-and-confirmed boundary                 | `implementation-prompts/02-class-pulse-and-classes.md`  |
| P0-03       | Approved without additional notes                                     | `implementation-prompts/04-builder-workbench.md`        |
| P0-04       | Approved without additional notes                                     | `implementation-prompts/03-music-and-provider-truth.md` |
| P0-05       | Approved without additional notes                                     | `implementation-prompts/05-live-pressure-hierarchy.md`  |
| P0-06       | Approved without additional notes                                     | `implementation-prompts/03-music-and-provider-truth.md` |
| P0-07       | Approved as a non-negotiable quality bar                              | `implementation-prompts/01-shared-ui-foundations.md`    |
| P0-08       | Approved without additional notes                                     | `implementation-prompts/01-shared-ui-foundations.md`    |
| P1-01       | Approved without additional notes                                     | `implementation-prompts/02-class-pulse-and-classes.md`  |
| P1-02       | Approved without additional notes                                     | `implementation-prompts/03-music-and-provider-truth.md` |
| P1-03       | Approved without additional notes                                     | `implementation-prompts/01-shared-ui-foundations.md`    |
| P1-04       | Approved without additional notes                                     | `implementation-prompts/01-shared-ui-foundations.md`    |
| P1-05       | Approved without additional notes                                     | `implementation-prompts/02-class-pulse-and-classes.md`  |
| P1-06       | Approved without additional notes                                     | `implementation-prompts/06-public-auth-and-account.md`  |
| P1-07       | Approved without additional notes                                     | `implementation-prompts/06-public-auth-and-account.md`  |
| PDR-01      | Approved compact horizontal mobile class chooser                      | `implementation-prompts/04-builder-workbench.md`        |
| PDR-02      | Approved derived and visibly confirmable; no persistence/schema claim | `implementation-prompts/02-class-pulse-and-classes.md`  |
| PDR-03      | Approved interaction goal with provider feasibility required          | `implementation-prompts/03-music-and-provider-truth.md` |

## Explicitly excluded from implementation prompts

| ID/surface | Disposition | Reason                                                                              |
| ---------- | ----------- | ----------------------------------------------------------------------------------- |
| P2-01      | defer       | Derived class artwork waits until Class Pulse proves useful.                        |
| P2-02      | defer       | Beat-aware microinteraction waits until hierarchy and reduced-motion behavior ship. |

## Owner gate

- [x] I reviewed the product-wide direction.
- [x] I reviewed all primary surfaces or explicitly deferred them.
- [x] Every backlog item has a disposition.
- [x] Required revisions have a final disposition.
- [x] Phase 4 may generate implementation prompts from approved items only.

The preview agent must not check these boxes or infer authorization.
