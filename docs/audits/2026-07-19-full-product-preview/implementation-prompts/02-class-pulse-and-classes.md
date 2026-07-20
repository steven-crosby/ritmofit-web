# Implementation prompt 02: Class Pulse and run-of-show Classes

## Role and outcome

Own the Classes and Class Pulse slice. Make a class immediately readable as an authored run-of-show, carry
the same energy shape into rehearsal and later consumers, and preserve several legitimate ways to begin.

## Authority

Implementation only after separate owner authorization. Do not branch, commit, push, open a PR, merge,
deploy, delete, clean up, or start another prompt without separate permission.

## Required reads and baseline

Read current `AGENTS.md`, reverify `origin/main`, and inspect prompt 01’s landed contract before editing. Read
the audit’s `implementation-sequence.md`, `preview-brief.md`, `backlog.md`, `run-decisions.md`, inventory,
current/proposed screenshots, and prototype anchors below. Audited baseline:
`addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`; live source wins if it has moved.

## Approved scope

- Owning IDs: P0-02, P1-01, P1-05, PDR-02.
- Inventory/anchors: CLS-00–CLS-05, CLS-04 summary, PUB-01 product proof, BLD-01/04 consumers,
  LIVE-01/03/04 consumers.
- Direction: one derived Class Pulse from track order, duration, and instructor-entered effort; visibly label it
  `derived · confirm`; do not claim persistence or canonical ownership.
- Classes becomes a run-of-show shelf ordered by creative next step, readiness, class shape, and recency.
- Summary becomes genuine read-only rehearsal, not an edit-mode duplicate.

## Behavior before appearance

Preserve class creation, selection, deletion, ordering, readiness computation, run-payload loading, summary,
Builder launch, Live launch, onboarding, and all current API semantics. Keep music/template/movement/manual
starts as peers. A failed library request must not look like a new or empty account.

Class Pulse must never analyze provider audio or derive BPM from Spotify. Sparse data must degrade honestly.
Confirmation may be ephemeral/presentational in this slice; if persistence is required, stop.

## File ownership and collisions

Likely owned files:

- Classes/library portions of `apps/web/src/components/Dashboard.tsx` and scoped tests
- `apps/web/src/components/ClassSummaryView.tsx` and tests
- `apps/web/src/components/ClassReadinessSummary.tsx` and tests
- `apps/web/src/components/IntensityRibbon.tsx` or a new narrowly named Class Pulse component/helper and tests
- `apps/web/src/components/OnboardingVideoDialog.tsx`, `TutorialVideo.tsx`, or library helpers only as required
- `apps/web/src/lib/class-summary.ts`, `library-state.ts`, `readiness.ts`, or a pure client-side pulse helper
- surface-scoped additions to `apps/web/src/index.css`

Collision rules:

- Prompt 01 must land first.
- `Dashboard.tsx`, `Dashboard.test.tsx`, and `index.css` are serialized with prompts 03, 04, and 06.
- Publish the pulse component/helper contract for prompts 04 and 05; they consume it without forking.

Frozen: API/schema/migrations/OpenAPI/shared contracts, provider playback, dormant community surfaces, and P2
artwork/motion.

## Implementation order

1. Re-derive current library/summary data flow and identify the smallest client-only Class Pulse input.
2. Write pure tests for derivation, sparse data, invalid durations, unscored effort, and deterministic output.
3. Implement the shared pulse presentation with visible derivation/confirmation status and reduced-motion-safe
   semantics.
4. Recompose populated, fresh, empty, loading/unavailable, and onboarding Classes states.
5. Recompose summary as read-only pulse + readiness + compact run-of-show + rehearsal marks.
6. Route existing Builder/Live actions without changing their contracts.
7. Validate downstream component API with prompts 04/05 ownership documented.

## Design translation

Use the prototype hierarchy, not literal markup. Class shape is the signature; readiness and next action are
supporting information. Keep card count/borders restrained. Use existing canonical tokens and prompt 01’s
shared primitives. Do not add derived artwork.

## Responsive and hostile cases

Verify desktop, 390, direct 320, and 200%-equivalent reflow. On mobile, class choice and next action must precede
secondary metadata without producing a long card wall. Test long class/track/instructor names, 0/1/10/large
track counts, missing BPM/effort/duration, and mixed provider provenance.

## Accessibility

Keyboard reachability and visible focus for shelves, templates, summary actions, and dialogs; 44px mobile
targets; correctly named dialog/alert/status semantics; reduced-motion-static pulse status; no meaning by color
alone; stable reading order between pulse, readiness, and actions.

## State coverage

CLS-00 tutorial, CLS-01 populated library, CLS-02 fresh account, CLS-03 empty/new class, CLS-04 summary, CLS-05
unavailable. Also verify loading and successful retry using prompt 01’s grammar.

## Tests and gates

Add focused pure/component tests and update `Dashboard.test.tsx` only for Classes behavior. Run affected web tests,
typecheck, lint, format, design-system verify, web build, full tests, remaining CI-equivalent gate, and
`git diff --check`.

## Visual verification

Real-browser compare `mockups/#CLS-00` through `#CLS-05`, plus `#PUB-01`, at desktop and mobile. Capture the
implemented states. Confirm pulse identity is consistent in Classes/summary and ready for Builder/Live reuse.

## Acceptance criteria

- P0-02: the same deterministic pulse reads consistently and never implies audio analysis.
- P1-01: a library scan answers “what am I teaching and what is next?”
- P1-05: rehearsal/summary is useful without entering edit mode.
- PDR-02: the pulse is visibly derived and confirmable; no persistence/schema claim is introduced.
- Fresh, empty, loading, and unavailable remain distinct.
- Existing class workflows and D20/D21 boundaries remain intact.

## Failure and stop conditions

Stop if pulse confirmation requires persistence, schema/API/iOS contract work, if existing data cannot support a
truthful derivation, or if current product canon contradicts the approved shelf. Do not invent provider analysis.

## Handoff

Report changed files, pulse input/output contract, behavior preserved, tests/gates, browser evidence, sparse-data
gaps, downstream integration notes, and unauthorized actions not taken.

Suggested branch: `codex/class-pulse-classes`
Suggested PR title: `feat(web): add class pulse and run-of-show classes`
