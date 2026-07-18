> **SUPERSEDED (v3).** Use `02-ranked-backlog-prompt.md` + `00-context.md`. See `README.md` and `LEGACY-v2.md`.

# RitmoFit Ranked Redesign Prescription Prompt

You previously performed a ruthless aesthetic criticism and UI/UX evaluation of RitmoFit Studio.

Now produce a ranked redesign prescription and a mockup-preview brief.

First, read and use this prior critique as source evidence:

`docs/audits/ritmofit-design-system-brutal-critique.md`

Do not restart the critique from scratch. Convert that diagnosis into a ranked redesign prescription.

## Protected mission

RitmoFit is a movement-first creative tool for rhythm fitness instructors. It helps instructors discover, shape, and perform the class hidden inside the music — with the clarity of Nike, the pulse of the club, and the restraint of a premium studio instrument.

The mission is protected. The current execution is not.

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

# Required deliverable 1

Write the human-readable redesign prescription to:

`docs/audits/ritmofit-ranked-redesign-prescription.md`

The prescription must include:

1. Redesign thesis using: “RitmoFit should move from ______ to ______ by ______.”
2. Ranked redesign backlog with brand impact, UX impact, implementation effort, risk, confidence, priority, affected files, and expected outcome.
3. Revised operational design principles.
4. Screen-by-screen redesign prescription.
5. Component-level refactor plan.
6. Music interaction pattern prescription.
7. Builder mode prescription.
8. Live mode prescription.
9. Brand, copy, and voice prescription with at least 10 before/after UI copy examples.
10. Visual system prescription.
11. Accessibility and sustained-use prescription.
12. Specific file edit plan.
13. Implementation sequence.
14. Acceptance criteria.
15. Final top-10 ranked recommendations.

Do not give generic advice. Every major recommendation should be connected to file, screen, component, workflow, or design-system impact.

# Required deliverable 2

Also create a mockup-preview brief.

Write it to:

`docs/audits/ritmofit-mockup-preview-brief.md`

This brief is for a future Codex pass that will create isolated redesign mockups before any production code changes.

The mockup-preview brief must include:

- Which screens should be mocked first.
- Which screens are lower priority.
- Which screens should not be mocked yet.
- Which design-system changes should be visible in the mockups.
- Which interaction states should be represented statically.
- Which music-native patterns must be visible.
- Which builder-mode improvements must be visible.
- Which live-mode improvements must be visible.
- Which marketing/conversion improvements must be visible.
- What should be intentionally excluded from the mockup stage.
- How to judge whether the mockups are successful.

Do not implement redesign changes in this pass.
Do not edit production source files in this pass.
