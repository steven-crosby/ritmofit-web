---
prompt: simple-stupid-swift-creation-audit
repo: ritmofit-web
agent: gpt-5.6-sol
date: 2026-09-20
inspected_head: 6c2fca771fd82cdcb367f6b606b5175a79bbf61d
inspected_range: n/a
completed: true
prs:
  - https://github.com/steven-crosby/ritmofit-web/pull/441
---

# Simple. Stupid. Swift. — creation-to-Builder audit

## Summary

Recommend one slice: **make the existing `Start a class` / `Start empty` choice truthful from
Classes Home through the first Builder render**. Today both buttons invoke the same callback, so
`Start empty` opens the scaffold-first dialog and asks the instructor to escape through a second
`Start empty instead` action. The correction should carry a creation intent into the existing dialog,
show only fields relevant to that intent, submit the existing scaffold or empty request, and verify
that the instructor lands in the corresponding planned-block or empty Builder. It needs no new
generation system, API, schema, migration, OpenAPI, provider, or playback work.

This is an investigation and plan only. No product code was changed, and no implementation,
merge, migration, or deployment is authorized.

## Baseline and audit frame

- Inspected current `origin/main` at
  `6c2fca771fd82cdcb367f6b606b5175a79bbf61d` (merged
  [#440](https://github.com/steven-crosby/ritmofit-web/pull/440)).
- Accounted for the shipped Builder clarity (#434), scaffold domain/UI (#435/#436), Classes Home
  (#438), Energy Ribbon (#432), and SoundCloud picker hardening (#440).
- Used the two settled personas: a newly certified instructor who needs trustworthy structure, and
  an experienced instructor who needs fast reconstruction plus an explicit empty path.
- Preserved the deterministic scaffold contract: a scaffold creates editable teaching structure,
  not a finished class; music, BPM, playback windows, cues, and moves remain instructor work.
- Treated the Builder as a creative workspace joining planned structure to real music and
  choreography. It is not an audio editor.

### Six-question traceability note

The supplied task names “the six core questions” but does not enumerate them, and that named set
does not exist in the repository or recent PR text. To avoid inventing quotations, this report uses
the following explicit operational labels derived from the task brief and shipped Builder guidance.
The owner should correct these labels before implementation if the omitted brief used different
wording.

| ID | Operational question |
| --- | --- |
| Q1 | **What am I making?** Discipline, length, and scaffold versus empty must be unambiguous. |
| Q2 | **What will Ritmo do?** The system must distinguish generated structure from instructor-authored music and choreography. |
| Q3 | **What should I do next?** One action should lead each state. |
| Q4 | **What will this action change, and where will it go?** A button's result and music destination must be predictable. |
| Q5 | **What state is the class in?** Planned versus actual, empty versus structured, and ready versus incomplete must be honest. |
| Q6 | **Can I take the faster or freer path without losing control?** Progressive disclosure must serve both personas and preserve recovery. |

This mapping is grounded in the design system's requirements to explain “what shape have I built”
and “can I take it live” (`ritmofit_design_system/09-class-builder-guidelines.md`), name the next
action (`ritmofit_design_system/01-design-principles.md`), and make every element earn its place.

## What already satisfies the principle

Do not churn these:

- Classes Home has one copper primary and keeps `Start empty` visually subordinate
  (`apps/web/src/components/ClassesHome.tsx`).
- The create contract has exactly nine deterministic recipes with 45 minutes preselected; it does
  not pretend to generate music or choreography
  (`ritmofit_dev_plan/class-template-handoff.md`).
- Plan blocks are music-independent. Empty blocks never become fake Live tracks
  (`packages/shared/src/entities/class-plan-blocks.ts`,
  `apps/web/src/components/ClassPlanBlocks.tsx`).
- `ClassPlanBlocks` keeps planned time separate from actual effective music duration and makes
  underfill/overflow visible (`apps/web/src/lib/class-scaffold.ts`).
- Search, likes, saved-playlist drill-in, and manual add pass `planBlockId` when adding individual
  tracks. Server ordering keeps each block's tracks contiguous.
- Class Pulse, Track Preview, and choreography appear only when their underlying track data exists.
  The selected-track preview uses provider-authorized playback and the saved clip window.
- A clip is a playback window, not destructive audio editing. Effective duration is
  `min(clipEndMs ?? base, base) - clipStartMs`; preview and Live seek to and stop at that window.
- #434's readiness and first-cue handoff already simplify later Builder work. This slice should not
  reopen them.

## Observed confusion points

### C1 — `Start empty` does not start the empty path

**Evidence:** The empty Classes Home renders `Start a class` and `Start empty`, but both call the
same zero-argument `onStartClass` callback
(`apps/web/src/components/ClassesHome.tsx:154-168`). The test clicks both and merely expects the same
callback twice (`apps/web/src/components/ClassesHome.test.tsx:110-121`). Dashboard then opens one
scaffold-first dialog (`apps/web/src/components/Dashboard.tsx:689-697`).

**Impact:** Persona B makes an explicit choice and sees no resulting change. The interface presents
a fork that is not a fork, then requires the instructor to discover and repeat the choice inside
the dialog.

**Violates:** Q1, Q3, Q4, Q6.

**Browser confirmation still needed:** Confirm the visible hierarchy and focus return from each
trigger at desktop, 390 px, and 320 px. The callback equivalence itself is code-proven.

### C2 — the dialog speaks in implementation language before the instructor has a class

**Evidence:** The dialog says “Start from a teaching plan” and “Nine deterministic recipes”
(`apps/web/src/components/CreateClassDialog.tsx:68-76`), while Classes Home says “Start a class.”
“Deterministic recipe” is useful engineering language but does not answer an instructor's immediate
choice. The form also keeps a scaffold preview sentence visible while the empty action sits at the
bottom (`CreateClassDialog.tsx:159-180`).

**Impact:** Persona A must translate recipe/scaffold mechanics before acting; Persona B's chosen
empty path is visually framed as opting out of the recommended form rather than entering the path
already selected.

**Violates:** Q1, Q2, Q3.

**Browser confirmation still needed:** First-read comprehension and whether the secondary action is
discoverable without scanning the whole modal. Copy presence and hierarchy are code-proven.

### C3 — empty creation inherits a recipe-length decision it does not need

**Evidence:** The dialog uses one 30/45/60 selector for both paths. Empty submission sends
`targetDurationMs: duration * MINUTE_MS`
(`apps/web/src/components/CreateClassDialog.tsx:40-55`), although the explicit empty contract requires
only `mode`, title, and discipline; `targetDurationMs` is optional
(`packages/shared/src/entities/classes.ts:105-122`). The corresponding test locks in a 45-minute
empty class (`apps/web/src/components/CreateClassDialog.test.tsx:59-74`).

**Impact:** “Empty” still carries an unexplained scaffold-shaped constraint. It is extra work and
weakens the experienced instructor's promise of complete control.

**Violates:** Q1, Q4, Q6.

**Browser confirmation still needed:** Whether instructors interpret length as a real empty-class
constraint or merely harmless metadata. The unnecessary request field is code-proven.

### C4 — a new scaffold lands in two music-adding frames without one leading next step

**Evidence:** A scaffold lands with seven `Choose music` controls inside Teaching Plan, followed by a
separate Track Stack with `Add music` (`apps/web/src/components/ClassPlanBlocks.tsx:181-225`,
`apps/web/src/components/Dashboard.tsx:3536-3567`). The generic four-route empty state is correctly
suppressed for a scaffold, but the Track Stack shell remains. Class Pulse is absent until real tracks
exist.

**Impact:** The structure is correct, but the first Builder minute asks the instructor to choose
between block-specific and class-wide music entry. That is a real progressive-disclosure question,
not a reason to redesign the whole Builder in this slice.

**Violates:** Q3, Q4, Q5.

**Browser confirmation still needed:** Which control visually leads, the scroll distance from block 1
to the source panel, whether focus-induced scrolling is clear at 390/320 px, and whether duplicated
track rows later read as one class or two lists.

### C5 — block-targeted picking does not consistently state or preserve the destination

**Evidence:** `Choose music` sets `assigningPlanBlockId`, opens the Track Stack source panel, and moves
focus to its first focusable control (`apps/web/src/components/Dashboard.tsx:3404-3415`). The panel says
only “selected teaching block,” while TrackSearch's destination card says “Current class”
(`Dashboard.tsx:3645-3665`, `TrackSearch.tsx:670-681`). Individual and saved-playlist track adds pass
the block id, but Import Playlist URL calls `importPlaylist(classId, playlistUrl)` without one
(`TrackSearch.tsx:382-459`). A playlist imported after a block-specific action therefore produces
unassigned tracks.

**Impact:** The interface promises a destination it neither names nor always honors.

**Violates:** Q3, Q4, Q5.

**Browser confirmation still needed:** Whether the selected block highlight remains visible while the
picker is in view and whether users notice the generic destination label. The URL-import mismatch is
code-proven.

### C6 — returning to Classes describes a scaffold with no music as an empty draft

**Evidence:** `classNextStep` sees only the playback-oriented run payload. With zero real tracks it
returns `Add the first track` / `Empty draft`
(`apps/web/src/lib/class-ordering.ts:132-139`). Plan blocks intentionally stay out of the run payload,
so a structured scaffold and a truly empty class receive the same label.

**Impact:** The system forgets the structure it just created when the instructor returns home.
“Empty draft” contradicts the visible teaching plan.

**Violates:** Q2, Q3, Q5.

**Browser confirmation still needed:** Cross-surface trust after create → Classes. The derived label is
code-proven.

### C7 — the design canon still contradicts the shipped empty path

**Evidence:** The scaffold contract settles an explicit empty path and flags the contradiction as F7
(`ritmofit_dev_plan/class-scaffold-contract.md:91-93`). The design guideline still says a new class
starts from a template, “not a blank,” and “requires a pick”
(`ritmofit_design_system/09-class-builder-guidelines.md:42-49`).

**Impact:** Current code and contributor guidance disagree about a settled product path, inviting later
regressions or competing creation flows.

**Violates:** Q1, Q6.

**Browser confirmation still needed:** None. This is document drift against shipped behavior.

## Recommended one vertical slice

### Truthful creation intent: Classes Home → dialog → corresponding Builder

Make the existing choice once, preserve it, and prove the resulting workspace:

1. Change the Classes Home create callback to carry an explicit intent:
   `scaffold | empty`.
2. `Start a class` opens the existing dialog in scaffold intent. Keep discipline, 30/45/60, the
   45-minute default, and deterministic recipe submission unchanged.
3. `Start empty` opens the same dialog in empty intent. Ask for title and required discipline only;
   hide recipe length and scaffold-preview copy, omit `targetDurationMs`, and submit the existing
   `{ mode: 'empty', title, template }` contract.
4. Use instructor language. Recommended scaffold heading: `Start a class`; one short result line such
   as `Ritmo adds an editable teaching plan. You choose the music.` Remove “nine deterministic
   recipes” from the product surface. Recommended empty heading: `Start empty`; do not add a paragraph
   explaining emptiness.
5. Keep the empty route subordinate. Do not add a second form or a third creation concept. If the
   scaffold dialog retains `Start empty instead`, switching intent must change the form in place rather
   than submitting hidden recipe choices.
6. Preserve the existing post-create open behavior. Add journey coverage proving scaffold intent lands
   with a Teaching Plan and no fake tracks, while empty intent lands with no plan blocks and the current
   Empty Run of Show.
7. Amend the stale design-system sentence so discipline is required for both paths but a generated
   scaffold is recommended, not mandatory.

This deliberately stops at the honest Builder landing. C4–C6 are real follow-ups, but folding them
into this slice would mix entry semantics, Builder hierarchy, picker destination correctness, and
Classes ranking into one review.

## Why this is simpler than current

- One click has one result; no false fork and no repeated empty choice.
- Each intent shows only the fields that affect that request.
- “Scaffold” remains one deterministic system; “empty” remains absence of generated blocks, not a
  second generator.
- The instructor sees the actual result in Builder instead of reading implementation vocabulary.
- Existing APIs, recipes, plan blocks, provider adapters, playback windows, and Builder components
  remain intact.
- The slice removes a duration decision and explanatory copy from the empty path rather than adding
  onboarding.

## Likely files

| File | Planned role |
| --- | --- |
| `apps/web/src/components/ClassesHome.tsx` | Send explicit scaffold or empty intent from the two existing controls. |
| `apps/web/src/components/Dashboard.tsx` | Hold the dialog's initial intent and preserve existing post-create navigation/focus. |
| `apps/web/src/components/CreateClassDialog.tsx` | Render intent-specific fields/copy and submit the existing request shapes. |
| `apps/web/src/components/ClassesHome.test.tsx` | Prove the two controls emit different intents. |
| `apps/web/src/components/CreateClassDialog.test.tsx` | Prove scaffold defaults remain and empty omits recipe length/target duration. |
| `apps/web/src/components/Dashboard.test.tsx` | Prove each entry opens the right dialog state and lands in the corresponding Builder state. |
| `ritmofit_design_system/09-class-builder-guidelines.md` | Reconcile the explicit empty path with the settled scaffold contract. |
| `apps/web/smoke/functional.smoke.mjs` | Only if the current journey smoke can assert both landings without broad fixture churn. |

No change is recommended to `ClassPlanBlocks`, `TrackSearch`, `TrackPreview`,
`ChoreographyEditor`, or `ClassPulse` in this slice.

## API, schema, and provider implications

**Recommended impact: none.**

- API: reuse the shipped `createScaffoldClassSchema` and `createEmptyClassSchema`.
- Shared contract: no shape change. Empty already permits omission of `targetDurationMs`.
- Schema/migration/D1: none.
- OpenAPI and iOS run-payload parity: no intended diff.
- Provider catalog/library/auth/playback: none.
- Audio: no caching, download, proxying, analysis, mixing, crossfade, or destructive editing.
- Clip windows, `start_offset_ms`, cue/move anchors, and effective duration: unchanged.
- Future iOS implication: later iOS creation should preserve the same explicit intent semantics, but
  this web-first slice adds no wire-contract work.

## Verification approach for implementation

### Automated

1. Focused component tests:
   - Classes Home emits `scaffold` from `Start a class` and `empty` from `Start empty`.
   - Scaffold mode starts at 45 minutes, requires discipline, and sends only `recipeId`.
   - Empty mode requires discipline, has no length control, and omits `targetDurationMs`.
   - Escape closes and focus returns to the originating trigger.
2. Dashboard journey tests:
   - scaffold entry → create → Builder shows Teaching Plan / seven empty blocks / no fake tracks;
   - empty entry → create → Builder has no Teaching Plan and shows Empty Run of Show.
3. Preserve existing recipe, plan-block, class ordering, readiness, and provider tests unchanged.
4. Run the full `AGENTS.md` gate:
   `format:check`, workspace typecheck, lint, design-system verify, theme classes, unit tests,
   API integration, web build, OpenAPI regeneration/no diff, contract parity, and audit.

### Real browser

Run against a local authenticated Worker/Vite stack:

- Desktop (recommended 1440 × 1000): both entry intents, keyboard-only completion, resulting Builder.
- 390 × 844 and 320 × 844 using viewport emulation: no horizontal overflow, clipped dialog, hidden
  primary, or 44 px target regression.
- Keyboard: Tab order follows title → discipline → relevant controls → primary; Enter submits the
  visible intent; Escape closes; focus returns to the exact trigger.
- Accessibility: dialog name matches intent; fieldset legends remain programmatic; selected discipline
  uses `aria-pressed`; disabled state is announced; run axe plus manual screen-reader spot checks.
- Reduced motion: no new transition or scroll dependency.
- Explicit state checks: scaffold has structure but no music; empty has neither generated blocks nor
  an implied 45-minute recipe.

No live browser was run for this planning audit. The Cloud setup hook is absent and dependencies are
not installed in this checkout; more importantly, the unresolved items above require an authenticated
journey and viewport/focus observation rather than a static screenshot. Existing merged-PR browser
notes confirm #438's populated Classes list and dialog at 1280/390/320, but #438 explicitly did not
exercise the empty-library browser state.

## Explicitly not changing

- The nine Cycle, Pilates, and HIIT recipes or their block contents.
- Deterministic scaffold generation, plan-block entities, ordering, assignment, copy/remapping, or
  empty-class API contracts.
- A competing class-generation system, AI generation, custom recipes, or recipe swapping.
- The existing alternate playlist, likes, copy-class, or Songs-by-Move creation exemptions.
- Plan-block editing, ghost markers, suggested cues/moves, track-anchored zones, layered timeline,
  drag placement, or edge-drag crop gestures.
- Class Pulse/Energy Ribbon derivation or readiness logic.
- Track Preview, Live Mode, provider connection recovery, provider catalog/library behavior, or
  SoundCloud #440 handling.
- Playback windows, BPM sourcing, downbeats, choreography anchors, or provider audio.
- C4's Builder hierarchy, C5's block-targeted playlist-URL defect, or C6's Classes ranking language
  in this slice. They remain recorded follow-ups and should not be silently bundled.
- Community, sharing, Explore, Teams, publishing, or iOS implementation.
- Deployment, remote migration, secret/config changes, or production verification.

## Commands run + results

- `git fetch origin main` → local `HEAD` and `origin/main` both
  `6c2fca771fd82cdcb367f6b606b5175a79bbf61d`.
- Repository/code/doc inspection plus recent merged PR reads → completed read-only.
- Full-repository search for the named six-question set → no authoritative enumeration found.
- Runtime check → Node `v22.14.0`, pnpm `11.4.0`; dependencies absent because the Cloud install hook
  referenced a missing `.cursor/install.sh`.
- `./agent-reports/validate-agent-report.sh
  agent-reports/2026-09-20/simple-stupid-swift-creation-audit.md` → run after writing this report.

## Findings

- **[P1] The empty-path choice is not carried into creation.** Code and tests prove both Classes Home
  controls invoke one scaffold-first entry.
- **[P1] Block-targeted playlist URL import loses its promised destination.** Record separately; do
  not expand the recommended slice.
- **[P2] Scaffold landing and returning-home language do not consistently recognize generated
  structure.** Requires browser/product confirmation before a later Builder/ranking slice.
- **[P2] Design canon still says blank creation is forbidden after the empty path shipped.** Correct
  alongside the recommended intent slice.

## Blockers

- Owner confirmation is required before implementation.
- The exact wording of the referenced six-question framework was not present in the task payload or
  repository. This report exposes its operational mapping rather than pretending certainty.
- Live usability observations remain unconfirmed for the empty-library → dialog → Builder path.

## Next recommended action

Approve, reject, or narrow the **Truthful creation intent** slice. If approved, implementation should
start from current `main`, keep API/schema/provider impact at zero, and leave C4–C6 as separate
owner-ranked follow-ups.

WAITING FOR OWNER CONFIRMATION — no implementation.
