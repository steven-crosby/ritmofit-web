# Approved implementation sequence

## Authority and baseline

This sequence converts the owner-approved Phase 3 direction into six ready-to-run implementation prompts.
It does not authorize implementation, branch creation, commit, push, PR, merge, deploy, schema work, provider
policy expansion, or cleanup.

- Audit run: `2026-07-19-full-product-preview`
- Audited baseline: `addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`
- Product boundary: D20/D21 solo-first, web-first creator workstation
- Approved: P0-01–P0-08, P1-01–P1-07, PDR-01–PDR-03, all 51 surface directions
- Deferred and excluded: P2-01 derived class artwork, P2-02 beat-aware microinteraction
- Phase 4 output authority: prompt generation only

Every implementation session must inspect current `origin/main` before editing. The baseline above is evidence,
not permission to implement from stale source.

## Ordered slices

| Order | Prompt                           | Owning IDs                  | Outcome                                                                           | Primary ownership                                                             |
| ----: | -------------------------------- | --------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
|     1 | `01-shared-ui-foundations.md`    | P0-07, P0-08, P1-03, P1-04  | Shared interaction, type/data hierarchy, accessibility, and recovery grammar      | design tokens/guidance, shared state primitives, global web styles            |
|     2 | `02-class-pulse-and-classes.md`  | P0-02, P1-01, P1-05, PDR-02 | Derived-and-confirmable Class Pulse, run-of-show Classes shelf, rehearsal summary | Classes portions of `Dashboard.tsx`, class summary/readiness/pulse components |
|     3 | `03-music-and-provider-truth.md` | P0-04, P0-06, P1-02, PDR-03 | Unified sourcing and provider capability truth                                    | Music portions of `Dashboard.tsx`, `TrackSearch`, `ConnectionsDialog`         |
|     4 | `04-builder-workbench.md`        | P0-01, P0-03, PDR-01        | Stable Builder hierarchy, essentials/advanced inspector, compact mobile chooser   | Builder portions of `Dashboard.tsx`, choreography/timeline/preview components |
|     5 | `05-live-pressure-hierarchy.md`  | P0-05                       | Pressure-safe preflight, ready, active, paused, list, and recovery hierarchy      | `LiveMode`, `LivePreflight`, `LiveTimeline`                                   |
|     6 | `06-public-auth-and-account.md`  | P1-06, P1-07                | Coherent public/auth trust and quiet Account status workspace                     | public/auth components and Account portions of `Dashboard.tsx`                |

The shared foundation prompt owns P0-07/P0-08/P1-03/P1-04 once. Prompts 02–06 inherit its acceptance
contract and must apply it to their surfaces without claiming duplicate ownership.

## Dependency graph

```text
01 shared foundations
  ├─> 02 Class Pulse + Classes
  └─> 03 Music + provider truth

02 + 03
  ├─> 04 Builder
  ├─> 05 Live
  └─> 06 Public/auth + Account

02 + 03 + 04 + 05 + 06
  └─> combined full-product visual/accessibility reconciliation
```

Prompt 04 depends on the shared Class Pulse contract from prompt 02 and provider vocabulary from prompt 03.
Prompt 05 depends on prompt 02’s pulse presentation and prompt 03’s provider-state language. Prompt 06 needs
both contracts for public product proof and Account capability truth; its `Dashboard.tsx` work must also
serialize with prompts 02–04.

## Ownership and collision map

| Shared file or area                                                  | Owners / consumers                            | Collision rule                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/components/Dashboard.tsx`                              | prompts 02, 03, 04, 06                        | Never edit concurrently. Land/rebase one slice at a time in this order.                                      |
| `apps/web/src/components/Dashboard.test.tsx`                         | prompts 02, 03, 04, 06                        | Same serialization as `Dashboard.tsx`; keep assertions surface-scoped.                                       |
| `apps/web/src/index.css`                                             | prompt 01 primary; prompts 02–06 consumers    | Prompt 01 lands first. Later prompts add only surface-scoped rules and must rebase before editing.           |
| `ritmofit_design_system/tokens.json` and generated tokens            | prompt 01 only unless reopened                | Freeze after prompt 01; downstream prompts consume tokens rather than inventing palettes.                    |
| Class Pulse component/derivation                                     | prompt 02 primary; prompts 04/05/06 consumers | Prompt 02 defines the contract. Consumers do not fork the computation or visual grammar.                     |
| Provider capability vocabulary                                       | prompt 03 primary; prompts 04/05/06 consumers | Prompt 03 defines terms and state mapping. Consumers reuse it.                                               |
| Playback adapters/runtime                                            | read-only for prompts 03–05                   | Presentation work must not silently become provider integration work. Stop if behavior changes are required. |
| `apps/api`, migrations, OpenAPI, `packages/shared`, `packages/music` | frozen for every prompt                       | Any required contract/schema/provider change is a scope stop and new owner decision.                         |
| Explore, Teams, Share/community components                           | frozen for every prompt                       | Dormant D20/D21-excluded surfaces must not be exposed, polished, or removed.                                 |

## Parallelization recommendation

Use one implementation lane by default. The 4,349-line `Dashboard.tsx` and shared `index.css` create real
collision risk across four slices, so four-way parallel work is not justified.

At most two lanes are safe after prompt 01 lands:

- Lane A: prompt 02, then prompt 03, then prompt 04, serialized around `Dashboard.tsx`.
- Lane B: the non-Account portion of prompt 06, or prompt 05 after prompt 02/03 contracts land.

Before opening a second lane, confirm exact file ownership in the live checkout. Never run two agents against
the same clone, browser profile, local ports, `Dashboard.tsx`, or `index.css`.

## Integration gates

### Gate after prompt 01

- Canonical token generation/verification passes.
- Shared focus, target, reduced-motion, status, loading, and recovery patterns have focused tests.
- No surface-specific redesign or dormant feature exposure entered the foundation PR.

### Gate after prompt 02

- Class Pulse derives only from order, duration, and instructor-entered effort.
- `derived · confirm` is visible; confirmation does not claim persistence.
- Classes and summary remain usable with sparse or missing scoring data.

### Gate after prompt 03

- Catalog, library, and playback are separate capability states everywhere changed.
- A failed status request does not become a false disconnect.
- Playlist pre-browse is implemented only where the current provider contract supports it; unsupported cases
  stay truthful and recoverable.

### Gate after prompt 04

- Builder preserves selected class/track and edit context through scoring, discovery, timeline, and preview.
- Preview ready/playing/paused/failure/complete are distinct and keyboard-accessible.
- Mobile 390/320 and 200%-equivalent reflow pass without hiding cross-class orientation.

### Gate after prompt 05

- Current cue/count, next cue, transport, time, and effort survive ready, active, paused, list, and playback
  failure.
- Prompter-only remains confident and usable; errors never displace the active clock/cue.

### Gate after prompt 06

- Public/auth communicate the private solo creator product without dormant community claims.
- Account reuses the provider vocabulary and never implies data loss on load failure.
- Authentication provider and music provider responsibilities remain distinct.

## Final combined gate

Run the repository CI-equivalent gate from `AGENTS.md`, then perform a real-browser full-product pass against
the approved prototype:

- Desktop 1280×800 minimum and 1440×1000 evidence capture.
- 390×844 mobile treatment, direct 320px reflow, and 640 CSS-pixel 200%-equivalent reflow.
- Keyboard traversal, visible focus, dialogs, alerts, reduced motion, grayscale/non-color status meaning, and
  long multilingual content.
- Populated, fresh, empty, loading, unavailable, disconnected, mixed authorization, preview lifecycle, Live
  lifecycle, and recovery states.
- Current-versus-approved screenshots with deviations explained rather than hidden.

Real SoundCloud playback must be rechecked in a real browser for start, seek/window behavior, pause, resume,
stop, reconnect, and clip completion. The audit observed a resume failure; do not claim it fixed without
isolating provider/widget versus application responsibility.

## Explicit exclusions and stops

- P2-01 and P2-02 are deferred and must not appear as implementation scope.
- No Explore, Teams, sharing, public/community, collaborator, pricing, or subscription work.
- No audio caching, download, proxying, decoding, analysis, mixing, crossfade, remix, or derivative provider
  audio.
- No BPM from Spotify or provider audio analysis.
- No schema, migration, API, OpenAPI, shared contract, iOS contract, provider/legal, or infrastructure change
  without a new owner decision.
- No implementation prompt grants commit, push, PR, merge, deploy, branch deletion, or cleanup authority.

## Suggested implementation PR sequence

1. `feat(web): establish shared workstation UI foundations`
2. `feat(web): add class pulse and run-of-show classes`
3. `feat(web): unify music sourcing and provider capability states`
4. `feat(web): compose the builder workbench`
5. `feat(web): refine live pressure hierarchy`
6. `feat(web): align public auth and account trust`

These are suggestions only. Each action and each PR still requires separate owner authority.
