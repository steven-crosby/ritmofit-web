# RitmoFit Studio Redesign Prescription - Stage 2 of 2

> **Read-only ranked redesign prompt for Codex.**
>
> Produce `agent-reports/studio-redesign-prescription.md`.
> Do not edit source, docs, tokens, CSS, mockups, or app code.

## Role

You are a world-class design director brought in after a brutal internal critique.
Your job is to convert the Stage 1 findings into a ranked, sequenced redesign
prescription for RitmoFit Studio, meaning the whole web app.

You are not implementing. You are deciding what should change, in what order, and
why that order matters.

Design toward this synthesis:

- **Spotify**: music browsing pleasure, library fluency, cultural polish.
- **Apple Logic Pro**: creative-workstation poise, timeline precision,
  dense-but-readable editing, professional alignment.
- **Apple MainStage**: live-performance confidence, glanceability, state clarity,
  and trust under pressure.

Audience guardrail: RitmoFit serves rhythm spin instructors and creators, not
sound engineers. Do not prescribe DAW complexity, parameter sprawl, or producer
workflows. When the critique says the product fails Logic Pro, the fix is more
precision, confidence, and hierarchy, not more knobs.

Tone: decisive internal design leadership. Rank ruthlessly.

## Mandatory Inputs

First read:

- `agent-reports/studio-aesthetic-critique.md`

If that report does not exist, stop and say Stage 1 must run first.

Then re-ground in:

- `ritmofit_design_system/README.md`
- `ritmofit_design_system/01-design-principles.md`
- `ritmofit_design_system/02-color-system.md`
- `ritmofit_design_system/03-typography.md`
- `ritmofit_design_system/04-layout-and-surfaces.md`
- `ritmofit_design_system/06-motion.md`
- `ritmofit_design_system/10-rhythm-system.md`
- `ritmofit_design_system/mockups/`
- the screenshots and run record from Stage 1
- relevant `apps/web` components and routes

Optionally re-run the app and capture fresh screenshots if a recommendation needs
visual confirmation. Stay read-only.

## Ranking Method

Every prescription must include:

- **Aesthetic impact**: 1-5.
- **Effort**: S, M, L, or XL.
- **Confidence**: High, Medium, or Low.
- **North star served**: Spotify, Logic Pro, MainStage, or synthesis.
- **Critique link**: specific Stage 1 finding(s).
- **Parity note**: web-only, iOS follow-up required, or shared backend/design
  implication.
- **Risk/non-negotiable check**: accessibility, live-dark contract, plasma
  scarcity, redundant encoding, music-provider rules, and launch-readiness scope.

Rank primarily by aesthetic impact, then by leverage/dependency, then by effort.
Call out keystone moves that unblock multiple downstream improvements.

## Required Report Structure

Write one Markdown file:

`agent-reports/studio-redesign-prescription.md`

Use this structure:

1. **North-Star Vision**
   - <=200 words.
   - Describe what RitmoFit Studio should feel like after redesign.
   - Make the Spotify + Logic Pro + MainStage synthesis concrete.

2. **Redesign Thesis**
   - One paragraph.
   - State the highest-leverage shift from current state to desired state.
   - Trace directly to Stage 1's central identity problem.

3. **Ranked Prescription**
   - Numbered list, rank 1 = highest priority.
   - Each item must include:
     - title as an imperative;
     - why now / rank rationale;
     - north star served;
     - critique link;
     - before -> after;
     - affected surfaces/components;
     - design-system implications;
     - UX/workflow implications;
     - aesthetic impact / effort / confidence;
     - parity note;
     - risk/non-negotiable check;
     - suggested validation method.

4. **Tiered Roadmap**
   - Tier 0: keystones.
   - Tier 1: high-impact, ship-soon.
   - Tier 2: craft and polish.
   - Tier 3: ambitious or exploratory.
   - Include a table with rank, title, tier, impact, effort, confidence.

5. **Design-System Changes**
   - Tokens.
   - Typography.
   - Color/elevation.
   - Density.
   - Controls.
   - Music/choreography-specific components.
   - Live-class components.
   - Motion/rhythm behavior.

6. **Product Surface Changes**
   - Library/search/explore.
   - Dashboard.
   - Class builder.
   - Choreography editor.
   - Dialogs.
   - Sharing/team flows.
   - Live class mode.
   - Narrow/mobile viewport.

7. **Signature Interaction Proposal**
   - Define one or two RitmoFit-specific interaction patterns that could only
     belong to this product.
   - Explain where they appear and why they deepen the rhythm-first identity.

8. **One-Weekend Cut**
   - If there were only a weekend, name the 3-5 changes that create the largest
     jump in perceived quality.
   - Justify why these beat the others.

9. **What Not to Touch**
   - Carry forward the Stage 1 protect-list.
   - Add anything deliberately left alone.

10. **Open Design Questions**
    - Questions that need owner taste, prototype comparison, or user validation.

11. **Implementation Sequence**
    - Smallest safe vertical slices.
    - What to prototype first.
    - What not to redesign yet.

12. **Implementer's Brief**
    - <=300 words.
    - A standalone handoff for a future design/build agent.

13. **Run Record**
    - Date/time.
    - Git SHA.
    - Inputs read.
    - Screenshots re-opened or re-captured.
    - Commands run.
    - End with the exact sentence:
      **No source changes were made during this evaluation.**

## Rules

- Do not implement.
- Do not flatten everything into equal priority.
- Every recommendation must trace to Stage 1 and to at least one north star.
- Be concrete enough that a future implementation agent can act without
  re-deriving the design intent.
- Keep launch-readiness in mind: avoid net-new product scope unless it is
  necessary to make the existing Studio feel credible.
- Respect AGENTS.md, including web/iOS parity, music-provider constraints,
  accessibility, live-mode dark contract, plasma scarcity, and redundant
  encoding.
