> **SUPERSEDED (v3).** Use `04-implementation-briefs-prompt.md` + `00-context.md`. See `README.md` and `LEGACY-v2.md`.

# RitmoFit Codex Redesign Agent Prompt Generator

You are creating the final Codex redesign agent prompt for implementing RitmoFit’s approved redesign.

This prompt should be generated only after the human has reviewed the isolated mockups and decided the direction is acceptable enough to begin production implementation.

## Read these files first

- `docs/audits/ritmofit-design-system-brutal-critique.md`
- `docs/audits/ritmofit-ranked-redesign-prescription.md`
- `docs/audits/ritmofit-mockup-preview-brief.md`
- `docs/audits/mockups/ritmofit-redesign-preview.html`
- `docs/audits/mockups/ritmofit-redesign-preview-notes.md`
- Existing design-system markdown files
- Existing product HTML/CSS/component files

If the human has provided approval notes or revision notes, incorporate them as the highest-priority implementation guidance.

## Your task

Create an implementation-ready Codex redesign agent prompt.

Write it to:

`docs/audits/ritmofit-codex-redesign-agent-prompt.md`

The prompt should be written as if it will be pasted into a fresh Codex session to begin actual production redesign work.

## The generated prompt must include

1. Role and mission
2. Source files to read first
3. Non-negotiable constraints
4. Human approval checkpoint
5. Implementation priorities
6. Phase-by-phase task sequence
7. File-editing rules
8. Mockup-to-production translation rules
9. QA and acceptance criteria
10. Final response format for Codex

## Required constraints inside the generated prompt

The generated Codex prompt must tell the future agent:

- Preserve the protected RitmoFit mission.
- Preserve warm orange / dark UI direction.
- Preserve Latin 90/10 restraint.
- Preserve movement-first, modality-agnostic architecture.
- Preserve Spotify/Nike/creative-tool positioning without visual imitation.
- Treat Spotify as a reference for mature music interaction patterns, not a visual target.
- Treat Logic Pro as simplified timeline precision and creative tooling.
- Treat MainStage as live-performance readiness and pressure-proof glanceability.
- Prioritize builder-mode clarity, live-mode reliability, music-native interaction maturity, and premium aesthetic distinction.
- Implement in careful phases.
- Do not blindly redesign everything at once.
- Start with the highest-ranked P0/P1 items.
- Translate the approved mockup direction into production carefully.
- Make file-aware, incremental, testable changes.
- Update design-system documentation when implementation changes the system.
- Run available checks, tests, builds, or previews before declaring completion.
- Report what changed, what was deferred, and what still needs human review.

## Required implementation phases inside the generated prompt

Include these phases:

1. Foundation / tokens / documentation alignment
2. Core navigation and persistent music interaction
3. Builder and timeline redesign
4. Live-mode redesign and pressure states
5. Explore / discovery and library patterns
6. Marketing / conversion polish
7. Accessibility and sustained-use QA
8. Final cleanup and documentation

For each phase, require:

- Goal
- Files to inspect
- Files likely to edit
- Expected output
- Checks to run
- Stop condition
- Human-review risk

## Final response format

After generating `docs/audits/ritmofit-codex-redesign-agent-prompt.md`, report:

- File created
- Main sources incorporated
- Whether mockup approval notes were found
- Any assumptions
- How to use the generated prompt
