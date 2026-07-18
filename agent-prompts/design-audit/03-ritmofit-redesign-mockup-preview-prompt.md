> **SUPERSEDED (v3).** Use `03-mockup-preview-prompt.md` + `00-context.md`. See `README.md` and `LEGACY-v2.md`.

# RitmoFit Isolated Redesign Mockup Preview Prompt

You are creating isolated redesign preview mockups for RitmoFit Studio before any production code is changed.

This is a visual and UX exploration pass, not a production implementation pass.

## Read these files first

- `docs/audits/ritmofit-design-system-brutal-critique.md`
- `docs/audits/ritmofit-ranked-redesign-prescription.md`
- `docs/audits/ritmofit-mockup-preview-brief.md`
- The RitmoFit design mission file if present
- Existing design-system markdown files
- Existing HTML/CSS mockups and product surfaces

## Non-negotiable rule

Do not modify production app/web source files.

Create isolated mockup files only inside:

`docs/audits/mockups/`

If you need CSS or JavaScript for the mockup, place it only inside:

`docs/audits/mockups/`

Do not edit existing app routes, existing production components, existing product CSS, or existing design-system files in this pass.

## Protected mission

RitmoFit is a movement-first creative tool for rhythm fitness instructors. It helps instructors discover, shape, and perform the class hidden inside the music — with the clarity of Nike, the pulse of the club, and the restraint of a premium studio instrument.

The instructor is a creator designing a physical music experience, not just a coach running a workout.

## Sacred cows

- Preserve the warm orange / dark UI direction.
- Preserve the Latin 90/10 rule: 90% ambient Latin energy, 10% intentional Latin moments. Never tropical, costume-like, gimmicky, or decorative.
- Preserve the movement-first, modality-agnostic system.
- Preserve the Spotify + Nike + creative-tool positioning, while avoiding direct visual imitation.
- Preserve the builder/live/marketing energy gradient: builder calm, live pressure-proof, marketing swagger.

## Reference interpretation

- Spotify is not the design target. Use Spotify only for mature music interaction patterns: persistent playback, scan-friendly lists, active-track state, queue/up-next behavior, mobile focus, library organization, and subscription conversion.
- Logic Pro means timeline precision, creative tooling, and editing depth, simplified for fitness instructors rather than audio engineers.
- MainStage means live-performance readiness, glanceability, reliability under pressure, and confidence during a class.
- Nike means physical confidence, brutal clarity, and campaign-grade phrasing, not visual imitation.

## Your task

Create a static, reviewable redesign mockup preview that lets a human judge the updated RitmoFit design direction before implementation.

The mockup should be polished enough to evaluate:

- Aesthetic direction
- Surface hierarchy
- Typography
- Warm dark/orange system
- Music-native interaction model
- Builder mode layout
- Timeline/choreography model
- Live mode glanceability
- Marketing/conversion direction
- Component language
- State language
- Accessibility/glanceability

## Required mockup surfaces

Create a single linked static preview or multi-section single-page prototype covering:

1. Marketing / landing hero
2. Explore / music discovery
3. Builder / class creation
4. Timeline / choreography editing
5. Live mode
6. Teams / collaboration
7. Login / onboarding
8. Pricing / subscription conversion if relevant

If that is too much for one coherent preview, prioritize:

1. Builder / class creation
2. Timeline / choreography editing
3. Live mode
4. Explore / music discovery
5. Marketing / landing hero

## Required visible patterns

The mockups must visibly demonstrate:

- Persistent active-track/player behavior
- Active-track state
- Queue/up-next behavior
- Scan-friendly track rows
- Track metadata hierarchy
- Class timeline structure
- Segment and cue hierarchy
- BPM/cadence indicators
- Movement/choreography chips
- Builder-mode calm and precision
- Live-mode glanceability from 3–6 feet away
- Music disconnect or recovery state if feasible
- Warm orange/dark premium surface system
- Restraint in builder mode
- Earned heat in live mode
- Full swagger in marketing mode
- Colorblind-safe state encoding
- Accessible tap target sizing
- Reduced cognitive overload

## Required deliverables

Write the main mockup to:

`docs/audits/mockups/ritmofit-redesign-preview.html`

If separate CSS is useful, write it to:

`docs/audits/mockups/ritmofit-redesign-preview.css`

If separate JS is useful, write it to:

`docs/audits/mockups/ritmofit-redesign-preview.js`

Write notes to:

`docs/audits/mockups/ritmofit-redesign-preview-notes.md`

If screenshots can be generated, save them to:

`docs/audits/screenshots/ritmofit-redesign-preview/`

## Required notes file structure

In `ritmofit-redesign-preview-notes.md`, include:

1. What changed from the current design direction
2. Which critique findings this mockup responds to
3. Which prescription items this mockup expresses
4. Which screens are represented
5. Which states are represented
6. Which areas are intentionally not implemented
7. What a human reviewer should inspect first
8. Known limitations
9. Recommended approval questions
10. What should be revised before production implementation

## Final response format

After creating the mockups, report:

- Files created
- Screens represented
- Key design decisions
- What was intentionally excluded
- How to preview the mockup locally
- What still needs human review

Do not edit production source files.
Do not claim the redesign is implemented.
This pass creates isolated preview mockups only.
