# Deterministic class scaffolds — implementation handoff

<!-- note (Codex, 2026-09-19): Captured the approved template-lane decisions, adversarial corrections, recipe review gate, and proposed expand-only data model before implementation. -->

> **Status:** scaffold-domain implementation complete and locally verified on 2026-09-19. The owner
> approved the plan, adversarial corrections, recipe content, and data model before application code and
> migration work began. No push, PR, merge, remote migration, or deployment has been performed.
>
> **Branch:** `cursor/class-template-planning-0756`
>
> **Baseline:** `main` at `d7df815`
>
> **Dependencies:** builder PR
> [#434](https://github.com/steven-crosby/ritmofit-web/pull/434) and Classes-home contract PR
> [#433](https://github.com/steven-crosby/ritmofit-web/pull/433).

This file is the tracked continuation point for deterministic class scaffolds. It replaces the prior
chat-only handoff. Where the earlier planning conversation conflicts with the newer cross-lane contract
in #433, the contract wins.

## 1. Product frame

Two instructors set the bar:

- A newly certified instructor needs a trustworthy starting structure and clear teaching intent.
- An experienced instructor needs a last-minute starting point that is faster to adapt than recreating a
  class elsewhere, plus an explicitly empty path for complete control.

The first release uses deterministic recipes, not AI. A recipe creates an editable scaffold while music
remains unselected. The scaffold is a creation-time recipe: later recipe improvements affect only newly
created classes and never rewrite existing work.

The current `classes.template` field remains the discipline (`cycle`, `sculpt`, or `hiit`); it is not
renamed or overloaded with recipe identity. Pilates continues to display as Pilates while storing
`sculpt`.

## 2. Settled behavior

1. Ship nine immutable recipes: Cycle, mat Pilates, and calisthenics-first HIIT at 30, 45, and 60
   minutes. Forty-five minutes is preselected in the creation UI.
2. Persist the scaffold's block order, labels, target durations, intensity, teaching goals, movement
   focus, and discipline-specific structural guidance.
3. Do not persist example cues, ghost markers, or suggested moves as real choreography.
4. Music, provider references, BPM, crop windows, downbeats, cues, and placed moves remain empty until
   the instructor adds or confirms them.
5. A plan block can contain zero, one, or many real songs.
6. Planned block duration and actual assembled music duration remain separate. Underfill and overflow
   are visible; neither silently rewrites the other.
7. The explicitly empty path remains available. Existing copy-class and Songs-by-Move flows remain
   exempt from scaffold creation.
8. A scaffold is fully editable after creation, but applying a different recipe wholesale is not
   allowed after creation.
9. Class duplication is the first-release reuse mechanism; custom recipe management is deferred.
10. Provider audio rules do not change. Cropping continues to adjust only the authorized playback
    window; Ritmo never alters provider audio.

## 3. Cross-lane boundaries

This lane owns:

- Versioned recipe definitions and deterministic generation.
- The scaffold domain model and migration.
- Atomic scaffold creation.
- Plan-block CRUD, ordering, and music assignment contracts.
- Copy/remapping behavior.
- The isolated scaffold creation and basic block-assignment UI after #434 is on `main`.

This lane does not own:

- The Classes-home redesign in #433.
- #434's readiness copy, inspector behavior, first-cue handoff, or broad `Dashboard.tsx` changes.
- The final layered timeline, drag-to-place, edge-drag cropping, or ripple animation.
- Ghost-marker rendering or authored ghost content.
- AI generation or custom recipe management.

The UI lane must be rebased onto #434 after #434 merges. The Classes-home implementation begins only
after the scaffold creation contract is on `main`.

## 4. Adversarial corrections to the chat-only plan

### No placeholder tracks

Scaffolds do not create synthetic rows in `tracks` or `class_tracks`. Placeholder tracks would leak into
library/search/matching/copy/purge surfaces and could make an empty scaffold look runnable in Live.

Instead, plan blocks exist independently of music. Adding music creates or reuses a normal owned track,
then creates a normal `class_track` assigned to the chosen block. This supports multiple songs per block
without replacing `class_tracks.track_id`.

### Expand-only migration

The first migration must remain compatible with the currently deployed Worker:

- Add a new `class_plan_blocks` table.
- Add nullable `classes.scaffold_recipe_id`.
- Add nullable `class_tracks.plan_block_id`.
- Do not rebuild or reinterpret existing `class_sections`.
- Do not make existing columns stricter.

This keeps Worker rollback viable after the remote migration. The generated SQL must still receive a
manual column/FK/index audit before local application.

### Planned time and playback time are distinct

`class_plan_blocks.target_duration_ms` defines the intended plan. Existing class-track duration and clip
window fields define actual playback. The builder may compare them, but neither value overwrites the
other implicitly.

### Keep scaffold-only data out of Live initially

The v1 run payload remains playback-oriented. Empty blocks and ghost guidance do not belong in it. The
granular plan-block endpoints serve Builder authoring. A later additive run-payload change requires a
concrete Live use case plus OpenAPI/iOS parity review.

## 5. Proposed domain contract

### Recipe identity

Recipe IDs are immutable strings:

```text
cycle_30_v1       cycle_45_v1       cycle_60_v1
pilates_30_v1     pilates_45_v1     pilates_60_v1
hiit_30_v1        hiit_45_v1        hiit_60_v1
```

Creation is a discriminated contract:

- Empty: `{ mode: "empty", title, template }`
- Scaffold: `{ mode: "scaffold", title, recipeId }`

For scaffold creation the server derives the stored discipline and target duration from the recipe.
Callers cannot submit a contradictory template or duration.

The existing `POST /classes` body remains accepted for compatibility and behaves as empty creation.

### `class_plan_blocks`

Recommended fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable UUID. |
| `class_id` | Owning class; cascade on class deletion. |
| `recipe_block_key` | Stable source key within a recipe snapshot, such as `cycle_climb_1`. |
| `position` | Complete zero-based order within the class. Unique with `class_id`. |
| `segment_type` | Optional existing band type when one is semantically honest; null otherwise. |
| `label` | Instructor-facing block name. |
| `target_duration_ms` | Planned duration; positive and independent of actual music. |
| `intensity` | Existing intensity enum. |
| `teaching_goal` | Short structural purpose. |
| `movement_focus` | Short movement category/focus, not a persisted placed move. |
| `guidance_kind` | `cycle`, `pilates`, or `hiit`; must agree with the class discipline. |
| `guidance_json` | Versioned, shared-schema-validated discipline guidance. |
| timestamps | Standard creation/update timestamps. |

The JSON field is not an untyped escape hatch. Shared Zod schemas define a discriminated union and the
API parses on every read/write:

- Cycle: posture, cadence range, and RPE range. No resistance number.
- Pilates: body region/skill focus and optional equipment; mat-based, never reformer-specific.
- HIIT: work interval, recovery/transition interval, rounds, sequence focus, and optional equipment.

The database also enforces positive target duration and unique `(class_id, position)`. Application
validation enforces ordered ranges and discipline agreement.

### `class_tracks.plan_block_id`

- Nullable so every existing class and non-scaffold creation flow remains valid.
- References a block with `ON DELETE SET NULL` as a defensive database behavior.
- The API normally rejects deletion of a non-empty block unless the request explicitly moves or detaches
  its tracks first.
- Assignment verifies the block and class-track belong to the same class.
- Track order remains the authoritative playback order. Block membership groups adjacent tracks for
  planning; the API rejects an ordering that interleaves blocks.

### Derived block state

For Builder display:

- Planned start = sum of preceding block target durations.
- Planned end = planned start + target duration.
- Actual duration = sum of effective durations for real tracks assigned to the block.
- Difference = actual duration - target duration.
- The block's actual playback start is the first assigned track's existing timeline offset.

An empty block has planned geometry but no playback geometry. It never enters Live as a fake track.

## 6. Recipe rules

- Every recipe's block targets sum exactly to its advertised duration.
- `targetDurationMs` on the class equals that same sum.
- Recipe data uses the existing intensity enum; color remains presentation-only.
- Starter recipes do not prefill `all_out`; the instructor may deliberately raise a block to it.
- Teaching goals describe the planning job, not medical or safety guarantees.
- Movement focus is structural guidance, not a real move-library placement.
- Cycle cadence is manual template guidance and never sourced from Spotify or another provider.
- Cycle uses RPE rather than absolute resistance because bikes differ.
- Pilates is mat-based with optional bands or light weights.
- HIIT is bodyweight-first; dumbbells are optional substitutions.
- HIIT work blocks use one beginner-readable 30-second work / 30-second recovery-transition pattern in
  v1. Instructors may edit it after creation.
- Cool-down/release blocks do not use `all_out` intensity.

## 7. Cycle recipes

Cadence values are planning ranges, not provider-derived BPM. RPE uses a 1–10 scale.

### `cycle_30_v1`

| # | Block | Min | Type | Intensity | Posture | Cadence | RPE | Teaching goal | Movement focus |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Arrive on the bike | 4 | `warm_up` | `easy` | Seated | 80–95 rpm | 2–3 | Establish rhythm and preview the ride shape. | Comfortable pedal stroke and relaxed upper body. |
| 2 | Build the base | 4 | `climb` | `mod` | Seated/mixed | 75–90 rpm | 4–5 | Add sustainable work without spending the peak. | Smooth pressure through the full pedal stroke. |
| 3 | Seated climb | 5 | `climb` | `mod` | Seated | 60–75 rpm | 5–6 | Hold controlled climbing effort. | Stable hips and consistent cadence. |
| 4 | Speed control | 4 | `sprint` | `hard` | Seated | 95–110 rpm | 6–7 | Practice faster cadence while keeping control. | Quick, even turnover. |
| 5 | Standing climb | 5 | `climb` | `hard` | Standing | 60–75 rpm | 7–8 | Build the main sustained challenge. | Balanced standing posture and steady rhythm. |
| 6 | Peak effort | 4 | `sprint` | `hard` | Mixed | 85–105 rpm | 8–9 | Deliver one clear peak with recoverable form. | Strong acceleration followed by control. |
| 7 | Return and release | 4 | `cool_down` | `easy` | Seated | 70–90 rpm | 1–3 | Bring effort down and close the ride. | Easy cadence and relaxed breathing. |

Total: **30 minutes**.

### `cycle_45_v1`

Uses the same seven blocks and guidance as `cycle_30_v1`, with target minutes:

| Block | Minutes |
| --- | ---: |
| Arrive on the bike | 6 |
| Build the base | 6 |
| Seated climb | 7 |
| Speed control | 6 |
| Standing climb | 7 |
| Peak effort | 7 |
| Return and release | 6 |

Total: **45 minutes**.

### `cycle_60_v1`

Uses the same seven blocks and guidance as `cycle_30_v1`, with target minutes:

| Block | Minutes |
| --- | ---: |
| Arrive on the bike | 8 |
| Build the base | 8 |
| Seated climb | 10 |
| Speed control | 8 |
| Standing climb | 10 |
| Peak effort | 8 |
| Return and release | 8 |

Total: **60 minutes**.

## 8. Pilates recipes

Pilates recipes are mat-based. A band or light weights may be suggested as optional equipment; no block
requires a reformer.

### `pilates_30_v1`

| # | Block | Min | Type | Intensity | Optional equipment | Teaching goal | Movement focus |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| 1 | Arrive and breathe | 4 | `warm_up` | `easy` | Mat | Establish breath, alignment, and control. | Breath with neutral alignment. |
| 2 | Mobilize | 4 | `warm_up` | `easy` | Mat | Prepare the spine and major joints for loaded movement. | Articulation and controlled mobility. |
| 3 | Center and stabilize | 5 | — | `mod` | Mat | Build trunk organization before larger ranges. | Deep core stability and pelvic control. |
| 4 | Lower-body strength | 5 | — | `mod` | Optional band | Develop controlled hip and leg strength. | Glutes, hips, and unilateral control. |
| 5 | Upper-body posture | 4 | — | `mod` | Optional light weights | Support shoulder stability and upright posture. | Scapular control and upper-back strength. |
| 6 | Integrated flow | 4 | — | `hard` | Mat | Connect familiar patterns into one controlled sequence. | Whole-body coordination without rushing. |
| 7 | Release | 4 | `cool_down` | `easy` | Mat | Reduce effort and restore comfortable range. | Gentle mobility and breath. |

Total: **30 minutes**.

### `pilates_45_v1`

Uses the same seven blocks and guidance as `pilates_30_v1`, with target minutes:

| Block | Minutes |
| --- | ---: |
| Arrive and breathe | 6 |
| Mobilize | 6 |
| Center and stabilize | 7 |
| Lower-body strength | 7 |
| Upper-body posture | 6 |
| Integrated flow | 7 |
| Release | 6 |

Total: **45 minutes**.

### `pilates_60_v1`

Uses the same seven blocks and guidance as `pilates_30_v1`, with target minutes:

| Block | Minutes |
| --- | ---: |
| Arrive and breathe | 8 |
| Mobilize | 8 |
| Center and stabilize | 10 |
| Lower-body strength | 10 |
| Upper-body posture | 8 |
| Integrated flow | 8 |
| Release | 8 |

Total: **60 minutes**.

## 9. HIIT recipes

HIIT recipes are bodyweight-first. Work blocks use 30 seconds of work followed by 30 seconds of
recovery/transition. A “round” is one work/recovery minute; movement categories rotate rather than
prescribing one mandatory exercise.

### `hiit_30_v1`

| # | Block | Min | Type | Intensity | Pattern | Rounds | Teaching goal | Movement focus |
| --- | --- | ---: | --- | --- | --- | ---: | --- | --- |
| 1 | Movement prep | 4 | `warm_up` | `easy` | Continuous | — | Prepare joints and rehearse the movement vocabulary. | Mobility, bracing, and low-impact locomotion. |
| 2 | Pattern practice | 4 | — | `mod` | 30/30 | 4 | Practice the interval rhythm before intensity rises. | Squat, hinge, push, and trunk patterns. |
| 3 | Circuit A | 6 | — | `hard` | 30/30 | 6 | Build repeatable work across major movement patterns. | Lower body, upper body, locomotion, trunk. |
| 4 | Reset | 2 | `recovery` | `easy` | Continuous | — | Bring breathing down and prepare the second circuit. | Walk, breathe, and review the next sequence. |
| 5 | Circuit B | 6 | — | `hard` | 30/30 | 6 | Repeat the structure with new movement emphasis. | Unilateral legs, push/pull substitute, trunk, locomotion. |
| 6 | Finisher | 4 | `sprint` | `hard` | 30/30 | 4 | Create one short, clearly bounded peak. | Simple whole-body patterns with low-complexity options. |
| 7 | Cool down | 4 | `cool_down` | `easy` | Continuous | — | Reduce effort gradually and close the session. | Easy locomotion, mobility, and breathing. |

Total: **30 minutes**.

### `hiit_45_v1`

Uses the same seven blocks, pattern, and guidance as `hiit_30_v1`:

| Block | Minutes | Timed rounds when applicable |
| --- | ---: | ---: |
| Movement prep | 6 | — |
| Pattern practice | 5 | 5 |
| Circuit A | 9 | 9 |
| Reset | 3 | — |
| Circuit B | 9 | 9 |
| Finisher | 7 | 7 |
| Cool down | 6 | — |

Total: **45 minutes**.

### `hiit_60_v1`

Uses the same seven blocks, pattern, and guidance as `hiit_30_v1`:

| Block | Minutes | Timed rounds when applicable |
| --- | ---: | ---: |
| Movement prep | 8 | — |
| Pattern practice | 7 | 7 |
| Circuit A | 12 | 12 |
| Reset | 4 | — |
| Circuit B | 12 | 12 |
| Finisher | 9 | 9 |
| Cool down | 8 | — |

Total: **60 minutes**.

Optional dumbbells may substitute for a compatible bodyweight strength pattern, but the generated class
does not require them.

## 10. Ghost guidance boundary

Ghost markers are deliberately excluded from the first domain PR. Before a later builder slice, the
owner must settle:

1. Structural prompts versus coaching lines. Recommendation: structural prompts.
2. The number and placement rule per block. Recommendation: start with one text-equivalent structural
   suggestion at the block midpoint, then validate in the real builder before increasing density.

Any future ghost implementation must be derived, non-persisted, keyboard/screen-reader equivalent, absent
from Live, and invisible to readiness counts.

## 11. Required invariants

- A recipe produces its advertised total exactly.
- Block positions are a complete unique permutation within a class.
- A class-track and its assigned block always belong to the same class.
- Tracks assigned to one block remain contiguous in playback order.
- Deleting an empty block is allowed; deleting a non-empty block requires an explicit detach/move act.
- Deleting the first song in a block makes the next song its actual playback anchor.
- Deleting the last song leaves the plan block intact and empty.
- Moving a song between blocks preserves its crop, cues, moves, and provider references.
- Resizing a block changes planned time only.
- Cropping a song changes actual time only.
- Empty blocks never appear as synthetic tracks in Live.
- Class copy creates new block IDs and remaps copied class-tracks to them.
- Single-track copy has no implicit block destination; the caller must name one or leave it unassigned.
- Existing classes without recipes or plan blocks remain unchanged.

## 12. Delivery slices

### PR A — scaffold domain

- This handoff and approved recipe tables.
- Shared recipe/block schemas and pure generator.
- Expand-only migration.
- Atomic scaffold creation.
- Plan-block list/create/update/delete/reorder routes.
- Add/assign/move track-to-block behavior.
- Class-copy remapping.
- OpenAPI and focused unit/integration tests.
- No broad web UI and no run-payload change without a demonstrated Live requirement.

### PR B — scaffold UI

Begins only after #434 merges and this lane rebases onto the resulting `main`:

- Isolated create-class dialog with discipline, 30/45/60 duration, scaffold primary, and quiet empty
  path.
- Basic empty/populated block rendering.
- “Choose music” using the existing sourcing grammar.
- Planned-versus-actual duration difference.
- Loading, empty, error, retry, focus, keyboard, reduced-motion, 390px, and 320px states.
- No final layered timeline, drag/crop UI, or ghost markers.

## 13. Integration and release order

1. Approve this recipe and model review gate.
2. Build and verify PR A; open it as a draft.
3. Merge #434 separately when authorized.
4. Rebase PR A or its continuation onto the post-#434 `main` as needed.
5. Merge PR A separately after a green full gate.
6. Build PR B from current `main`.
7. Rebase #433's docs onto the integrated behavior before its eventual merge.
8. Treat merge, remote migration, and deployment as separate approvals. Apply the compatible remote D1
   migration before deploying code that depends on it.

## 14. Verification contract

- Pure tests for all nine recipe IDs, block contents, immutable IDs, and exact totals.
- Schema rejection for contradictory recipe/template/duration inputs.
- Atomic create success and rollback.
- Class/block authorization and hidden-resource 404 behavior.
- Block ordering and non-interleaving track validation.
- Block deletion, detachment, and cross-class assignment rejection.
- Class copy and single-track copy behavior.
- Existing empty/create/copy/import paths unchanged.
- Readiness remains blocked with zero real tracks and unchanged by non-persisted guidance.
- OpenAPI regeneration with a clean diff after committing the intended artifact.
- Contract parity remains green unless a separately justified run-payload change is approved.
- Full CI-equivalent gate before submission.
- PR B browser verification at desktop, 390px, and 320px, including keyboard and reduced motion.

## 15. Local implementation closeout

PR A is implemented in the working tree with migration `0019_keen_matthew_murdock.sql`. The migration
was manually audited after generation: it creates `class_plan_blocks`, adds only nullable columns to the
two existing tables, adds the new indexes, and preserves `ON DELETE SET NULL` for track assignments. It
does not rebuild an existing table.

The complete local gate passed: formatting, workspace typechecks, lint, design-system verification,
theme-class validation, unit tests, 31 Worker/D1 integration files, production web build, run-payload
contract parity, and the production dependency audit. Because the intended OpenAPI artifact is an
uncommitted diff, the submission-only `git diff --exit-code` check was replaced locally with two
regenerations and an unchanged SHA-256 hash; regeneration is idempotent.

Remaining authority gates are separate: push/open PR A, merge, remote D1 migration, and deploy.
