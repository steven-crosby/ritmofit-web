# Implementation prompt 04: composed Builder workbench

## Role and outcome

Own the class-authoring workbench. An instructor must be able to orient to the class, select/reorder a track,
complete common scoring, disclose advanced timing, source music, use the timeline, and audition the authored
clip without reconstructing context after each task.

## Authority

Implementation only after separate owner authorization. Do not branch, commit, push, open a PR, merge, deploy,
delete, clean up, or execute another prompt without separate permission.

## Required reads and baseline

Read current `AGENTS.md`, audit sequence/brief/backlog/decisions/inventory, prototype Builder anchors and captures,
and the landed contracts from prompts 01–03. Reverify current `origin/main`. Audited baseline:
`addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`; current source wins after drift review.

## Approved scope

- Owning IDs: P0-01, P0-03, PDR-01.
- Inventory/anchors: BLD-01, BLD-02, BLD-03, BLD-04, BLD-05, BLD-06, BLD-07, BLD-08, BLD-09, BLD-10,
  BLD-11, BLD-12, BLD-13, BLD-14, BLD-15, and BLD-16.
- Direction: stable class orientation, compact readiness, shared Class Pulse, composed track stack, selected-track
  essentials inspector, deliberate advanced timing, persistent preview, and compact horizontal mobile chooser.
- Inherited acceptance: prompt 01 accessibility/recovery/type/copy, prompt 02 pulse contract, prompt 03
  sourcing/provider vocabulary.

## Behavior before appearance

Preserve autosave/update semantics, track selection, reorder, free placement, cues/moves/custom moves, readiness,
search/import, run-payload creation, clip windows, and official provider playback. Do not convert Builder into a
DAW. Do not add audio analysis, mixing, crossfade, or provider-derived BPM.

Selected class, selected track, unsaved/pending state, and destination must not silently reset when opening a
drawer, timeline, inspector disclosure, or preview state.

## File ownership and collisions

Likely owned files:

- Builder portions of `apps/web/src/components/Dashboard.tsx` and scoped tests
- `apps/web/src/components/ChoreographyEditor.tsx` and focused tests
- `apps/web/src/components/ClassReadinessSummary.tsx` only as a consumer adjustment
- `apps/web/src/components/TimelineStrip.tsx` and tests
- `apps/web/src/components/TrackPreview.tsx` and tests for presentation/state detection only
- `apps/web/src/components/TrackSearch.tsx`, `CustomMovesDialog.tsx`, `SongsByMoveDialog.tsx` only for Builder
  integration, not their shared contracts
- pure local helpers/tests for selection or layout state; surface-scoped `index.css`

Collision rules: prompts 01–03 land first. Serialize `Dashboard.tsx`, `Dashboard.test.tsx`, `TrackSearch.tsx`,
`ClassReadinessSummary.tsx`, and `index.css` with their primary owners. Reuse, do not fork, pulse/provider/state
contracts.

Frozen: API/schema/migrations/OpenAPI/shared contracts, playback adapters/runtime unless a separately authorized
bug slice exists, dormant community surfaces, and both deferred P2 items.

## Implementation order

1. Map current Builder state ownership and write regression tests for context that must survive task changes.
2. Compose stable class orientation, pulse, compact readiness, and track stack without changing data flow.
3. Reframe common scoring as the selected-track essentials inspector; move existing advanced timing behind one
   deliberate disclosure without hiding required data.
4. Integrate Music source/list/selection language inside class context.
5. Preserve timeline/free-placement precision as a dedicated state.
6. Implement the five-state preview model with explicit provider/clip/elapsed/selected-track context.
7. Implement compact horizontal class chooser at 390/320; do not hide cross-class orientation.
8. Exercise save/reorder/selection concurrency and error paths before visual polish.

## Design translation

Builder is a workbench, not a card dashboard. Class Pulse/readiness orient; the track score is the primary work
surface; the inspector/drawer owns the current task; preview is persistent but subordinate until playing or in
recovery. Use canonical tokens and existing components. Avoid decorative P2 motion/artwork.

## Responsive and hostile cases

Desktop 1280/1440, mobile 390, direct 320, 640 CSS-pixel reflow. Test long multilingual titles/artists, ten and
large track counts, missing provider refs/artwork/duration/BPM, gaps/free placement, slow saves, reorder while a
row is selected, and preview errors. Nested horizontal timeline scrolling is allowed only when the page itself
does not overflow.

## Accessibility

Keyboard selection/reorder alternatives, labeled drawers/dialogs, visible focus, 44px mobile targets, focus
return on close, non-color readiness/preview state, reduced-motion static `Now playing`, concise playback/status
announcements, and no focus loss when inspector or preview state changes.

## State coverage

BLD-01 populated, BLD-02 essentials, BLD-03 advanced, BLD-04 timeline, BLD-05 ready, BLD-06 playing,
BLD-14 paused, BLD-15 resume failed, BLD-16 complete, BLD-07 search, BLD-08 likes, BLD-09 playlist empty,
BLD-10 URL import, BLD-11 custom moves, BLD-12 songs-by-move empty, and BLD-13 songs-by-move result. Also
loading, save pending/failure, empty class, disabled actions, and provider disconnect/reconnect.

## Tests and gates

Add focused state/helper/component tests, including preview lifecycle and preserved selection. Run all affected
Builder/timeline/preview/search tests, web suite, format, typecheck, lint, design-system verify, web build,
remaining CI-equivalent gate, and `git diff --check`.

## Visual and playback verification

Real-browser compare every BLD anchor at desktop/mobile. Capture common top-of-workbench and preview-rail states.
Verify official playback start, clip seeking/window, pause, resume, stop, completion, reconnect, and failure
separately. The audit’s SoundCloud resume failure is a required adversarial check, not permission for a
speculative runtime change.

## Acceptance criteria

- P0-01: reorder, score, preview, and add music without losing class/track context at required viewports.
- P0-03: common edits are immediate; advanced detail is deliberate; all preview states are unmistakable.
- PDR-01: mobile retains a compact horizontal class chooser and a single usable work column.
- Inherited pulse/provider/recovery/accessibility contracts are reused consistently.
- Current workflows, provider rules, and solo-first boundaries remain intact.

## Failure and stop conditions

Stop if the hierarchy requires rewriting persistence, schema/API/shared contracts, provider runtime, or adding a
new navigation model. Stop on unresolved overlapping edits to shared files. Preserve and report surprising
existing behavior rather than normalizing it silently.

## Handoff

Report changed files, preserved state invariants, tests/gates, screenshots, playback results, responsive/a11y
results, unresolved runtime/provider gaps, downstream Live notes, and unauthorized actions not taken.

Suggested branch: `codex/builder-workbench`
Suggested PR title: `feat(web): compose the builder workbench`
