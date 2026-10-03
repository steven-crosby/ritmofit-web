# Instructor class score — product and UX blueprint

<!-- note (Codex, 2026-09-29): Records Steven's approved class-building direction and open design/contract questions. This is planning, not implementation authorization. -->

**Status:** owner-approved product direction; interaction and data contracts remain to be validated. This extends [D20/D21/D23](./decisions.md), the settled Final Cut Pro semantics in the [class scaffold contract](./class-scaffold-contract.md), and the [class-builder guidelines](../ritmofit_design_system/09-class-builder-guidelines.md).

**Current planning entry (2026-10-03):** use the
[playlist-to-class-to-Live audit and restart guide](../docs/audits/playlist-to-live-2026-10-03/NEXT_SESSION.md)
for the next development plan. The immediate scope is desktop Apple Music and
Cycle/Pilates: repair the observed natural-transition and Live reflow defects,
then plan an editable playlist-derived teaching draft and coherent creation flow.
The agreed beginner default is one song per exercise block, with first/last songs
as warm-up/cooldown and generic discipline cues/notes. This default does not change
the general zero/one/many-song plan-block grammar below or require the proposed
exercise-step entity. Existing song notes/cues already have shared and Live
contracts. HIIT, iPhone testing, and the broader precision-score roadmap remain
outside this immediate audit follow-up. No new implementation or schema decision
is authorized by this checkpoint.

## Outcome

An instructor can build a polished, precisely timed class and teach from it live without becoming a video editor or audio engineer. The ceiling should approach Final Cut Pro's **granularity, flexibility, and creative freedom for arranging a class**. The first screen should satisfy D23's **Simple. Stupid. Swift.** test: where am I, what matters now, what can I do next, and what just happened?

Steven's 20-minute Apple Fitness+ workout is a benchmark for the **instructor's run of show**: named exercises, an Easy/Hard state, a countdown, music alignment, and continuous spoken coaching. Ritmo's scope is authoring, rehearsal, and a glanceable Live teaching surface. This brief does not call for video capture, editing, distribution, or a consumer video player. The instructor supplies the coaching; Ritmo helps plan and cue it.

## Music-led authority

<!-- note (Codex, 2026-09-30): Applies approved D24 and links the phased roadmap; does not authorize implementation. -->

[D24](./decisions.md#d24--music-drives-creation-and-instruction-until-the-instructor-chooses-otherwise-resolved-2026-09-30)
sets the authority: music drives creation and instruction until the instructor explicitly chooses
otherwise. In music-backed rehearsal/Live, preparation, authorization waits, stalls, and failures hold
teaching position; Continue without music explicitly selects the prompter clock. Intentional timeline
gaps remain scheduled silence. See the [phased implementation plan](./music-led-instructor-workflow-plan.md)
for connection/playback reliability first, mobile clarity next, then rehearsal and timed-step contracts.

## The editing grammar

| Class element | Instructor meaning | Precision when needed |
| --- | --- | --- |
| **Music timeline** | The actual playback order and time axis. | Choose songs, clip authorized playback windows, place gaps, and inspect timing. The playback timeline positions teaching events. |
| **Plan block** | A teaching chapter with intent, intensity, and target length. | Reorder and resize the plan independently of song lengths; show planned versus assembled time. A block may contain zero, one, or many songs. |
| **Exercise step** | A named, bounded movement or interval the instructor will teach. | Author a sequence such as “Squat pulses · Hard · 40s” then “March · Easy · 20s”; surface current, next, and time remaining in rehearsal and Live. This is a proposed concept, not a shipped entity. |
| **Cue** | A point-in-time prompt for what to say or do. | Place it at a precise point on the music timeline, optionally using the existing beat grid. A cue is distinct from an exercise span. |

The instructor should first see a **run of show**: chapters, songs, exercise steps, and the next useful action. “Show timeline” reveals aligned music, exercise, and cue lanes with the energy arc and a selection-driven inspector. The full timeline is an option, not the price of entry. Selection should answer what an item is, where it occurs, and what changing it will affect. Dragging, trimming, and snapping need keyboard and numeric equivalents, visible focus, and responsive layouts at 390px and 320px.

Borrow Final Cut Pro's understandable editing behaviors: connected items, predictable movement, edge-based duration adjustment, and a precise playhead. The reference image is a vocabulary for these behaviors, not a four-region layout mandate. The unresolved viewer-slot question in the scaffold contract becomes a test: a compact **rehearsal monitor** earns space only if scrubbing to a moment shows the instructor exactly what Live would show there. Otherwise use the simpler three-region workbench.

Borrow from Spotify and Apple Music the ease of browsing familiar libraries, inspecting songs and playlists, and moving from listening to class creation. Keep Ritmo's own visual identity and make the class score the distinctive layer. Provider artwork, controls, and branding must stay within each service's rules; this is an interaction synthesis, not a visual clone or provider feature promise.

## Timing and edit behavior

The assembled music timeline is the placement clock for exercise steps and cues. A plan block's target length remains a separate teaching intention. Show underfill, overflow, and gaps; never silently retime the plan, songs, or steps to make the numbers agree. The instructor decides whether to trim a playback window, change a step, add music, leave a gap, or adjust the plan.

Edits should preserve intent: moving a chapter should explain what happens to its assigned songs and steps; moving or trimming a song should explain what happens to song-attached cues and moves. Existing track-anchor constraints must be honored. The exact attachment, ripple, and conflict-resolution rules for **exercise steps** are open; prototype them before choosing storage or migration. Undo and a clear before/after timing result are part of a credible precision workflow.

Rehearsal should let an instructor scrub the score and see the corresponding Live view: current song, current named step, effort label, countdown, next step, and next spoken cue. Live should remain readable from teaching distance and in low light. Pauses, seeks, free-mode gaps, provider disconnects, and the existing prompter-only path need explicit clock/recovery behavior. This blueprint does **not** add a new Live eligibility gate; any such change needs a separate decision based on the run contract.

## Current foundation and gap

As read on 2026-09-29, Builder already has editable plan blocks and song assignment, an optional precision timeline, track inspector, cue/move markers, clipping, free placement, and beat snapping. Live already has a rolling cue/move queue and interval timing. These are foundations to unify, not features to rebuild. The [as-built granularity record](./editing-granularity-scoping.md) describes the shipped timing controls.

The missing concept is an authored **ordered sequence of named, bounded exercise steps** that can drive the Easy/Hard countdown. Current plan blocks describe teaching intent and HIIT structure but do not hold that sequence. The current [run payload](../packages/shared/src/entities/run-payload.ts) projects music, cues, moves, and sections, not plan blocks or exercise steps. The existing [scaffold handoff](./class-template-handoff.md) deliberately kept scaffold-only data out of Live until a concrete use case exists; the rehearsal/Live step display above is that proposed use case, subject to contract design and review.

## First design slice and acceptance test

Prototype **one 20-minute HIIT class** in the simple Builder view, expanded timeline, rehearsal, and Live. Twenty minutes is a stress test inspired by Steven's workout, **not** an approved change to the current 30/45/60-minute recipe catalog. Use two or more songs, multiple chapters, named Hard/Easy steps, precise cue points, one deliberate plan/music length mismatch, and one gap or clip adjustment.

The prototype passes when a newly certified instructor can start from a scaffold and understand the next action without learning timeline terminology, while an experienced instructor can start empty and make precise changes without hitting a simplified ceiling. Both should be able to predict the result of moving a chapter, trimming a song, and changing a step before committing the edit. Scrubbing should show the same teaching information Live would show at that point. Test desktop and phone widths, keyboard operation, low-light glanceability, timing mismatch, and provider-unavailable/prompter-only states with real instructors before locking the interaction contract.

## Decisions before implementation

1. Decide whether an exercise step is plan-block-relative, track-relative, or a projection with both anchors. Reuse existing moves where appropriate, but do not equate a point marker with a timed step.
2. Specify duration edits, chapter movement, song movement/cropping, free-mode gaps, copy behavior, conflicts, and undo. Keep plan target time separate from assembled playback time.
3. Define rehearsal and Live clock behavior for seek, pause, gap, missing provider playback, and prompter-only use. Decide whether steps are optional and what, if anything, affects Live readiness.
4. If the prototype validates the need, plan the shared schema, API/authz, migration, additive run-payload projection, OpenAPI, and future iOS-consumer review as a separate implementation slice.
5. Recheck current provider policies before changing integration. Preserve the [music constraints](./music-providers.md): official authorized playback only; no cached, downloaded, decoded, analyzed, mixed, or derivative provider audio, and no BPM from Spotify.

The next proposed work item is the interaction prototype and contract proposal. Code, migration, and release scope follow only after that proposal is reviewed.
