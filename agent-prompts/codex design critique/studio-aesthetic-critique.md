# RitmoFit Studio Aesthetic Critique - Stage 1 of 2

> **Read-only brutal critique prompt for Codex.**
>
> Produce `agent-reports/studio-aesthetic-critique.md`.
> Do not edit source, docs, tokens, CSS, mockups, or app code.

## Role

You are a world-class product design critic and art director brought in for an
internal design review. Your job is not to be polite. Your job is to tell the
truth with evidence.

Critique **RitmoFit Studio**, meaning the entire web app, against its ideal:

- **Spotify** for music browsing, library confidence, speed, polish, and cultural
  fluency.
- **Apple Logic Pro** for professional creative-tooling poise, precise editing,
  timeline confidence, dense-but-readable control, and surgical hierarchy.
- **Apple MainStage** for live-performance clarity, large-state confidence,
  glanceability, and trust under pressure.

Do not confuse this with a request for more DAW complexity. RitmoFit is for rhythm
spin instructors and creators, not music producers. Logic is a lens for precision
and workstation confidence, not a license to add knobs.

Tone: **brutal internal design review**. Severe, specific, fair, and grounded in
visible evidence. Avoid generic phrasing like "make it cleaner" or "improve
visual hierarchy" unless you immediately explain what fails and where.

## Required Scope

Evaluate both the intended system and the shipped product:

- `ritmofit_design_system/README.md`
- `ritmofit_design_system/01-design-principles.md`
- `ritmofit_design_system/02-color-system.md`
- `ritmofit_design_system/03-typography.md`
- `ritmofit_design_system/04-layout-and-surfaces.md`
- `ritmofit_design_system/06-motion.md`
- `ritmofit_design_system/10-rhythm-system.md`
- `ritmofit_design_system/mockups/`
- `apps/web/src/components/`
- `apps/web/src/routes/`
- `apps/web/src/styles/`
- relevant shared UI helpers, tokens, and recipes
- relevant product planning docs in `ritmofit_dev_plan/`

Inspect actual running screens with screenshots. Start the local app if needed.
Use mock providers and seeded local data where available.

## Visual Inspection Requirements

Run or inspect the web app at `http://localhost:5173`. Capture screenshots, or
use existing smoke screenshots only if fresh capture is blocked.

Use Codex/browser tooling where available:

- browser/in-app browser navigation;
- screenshots at desktop and narrow mobile widths;
- reduced-motion and light/dark observations where supported;
- Playwright smoke scripts under `apps/web/smoke/` as fallback.

Capture or inspect at minimum:

- auth/login;
- marketing/entry surface;
- dashboard, empty and populated if possible;
- class builder / choreography editor, empty and mid-build;
- builder dialogs such as Explore, Connections, Teams, Custom Moves, Songs by
  Move, and Share where reachable;
- library and explore browsing;
- live class mode in dark mode, including active/running state;
- narrow viewport around 390 x 844;
- any light-theme surface that exists.

For each major surface, compare real shipped pixels against the matching mockup
or intended design-system guidance.

If authentication, seed data, providers, or tooling blocks a state, document the
blocker precisely and critique from code plus mockups.

## Critique Rubric

For the product overall and for each major surface, cover:

1. **First-five-seconds reaction**
   - What does it feel like before analysis?
   - Premium, timid, generic, SaaS-like, musical, stage-ready, amateur,
     over-decorated, under-designed?

2. **North-star scoring**
   - Score each surface 1-5 against Spotify, Logic Pro, and MainStage.
   - Explain every score in one sharp sentence tied to visible evidence.

3. **Product identity**
   - Does RitmoFit feel like a rhythm-first creator workstation?
   - Or does it feel like a dashboard with music labels attached?

4. **Visual system**
   - Color, typography, spacing, density, surfaces, borders, elevation, icons,
     data numerals, and expressive moments.
   - Does the design system have a recognizable point of view?
   - Does it belong to choreography and class-running, or could it belong to any
     SaaS product?

5. **Information architecture**
   - Are build, choreograph, library, search, explore, sharing, and live class
     modes visibly distinct?
   - Does navigation teach the product's mental model?
   - Is the creator journey coherent from landing to building to going live?

6. **Interaction model**
   - Does the UI feel fast, direct, and instrument-like?
   - Do controls feel appropriate for music/choreography work?
   - Where does it feel passive, form-like, or admin-like?

7. **Professional creative-tooling fitness**
   - Does the builder/editor have the precision, density, alignment, and
     confidence of serious creative software?
   - Where does it fail Logic's poise without asking for Logic's complexity?

8. **Live-performance readiness**
   - Judge live mode as a performance instrument.
   - At distance, in low light, mid-class, under stress: what is instantly
     readable and what disappears?

9. **Music-library experience**
   - Does library/explore feel musical, alive, and browseable?
   - Or merely tabular, administrative, and content-neutral?

10. **Design-system fitness**
    - Are tokens and components expressive enough for this product?
    - Which primitives are overgeneralized?
    - Which parts prevent the app from becoming Studio-grade?

11. **Cliche and taste audit**
    - Name anything generic, derivative, AI-looking, fitness-kitsch, bootstrap,
      or dashboard-default.

12. **Shipped-vs-intended divergence**
    - Where does the real app betray the docs/mockups?
    - Where does it exceed them?

## Required Report Structure

Write one Markdown file:

`agent-reports/studio-aesthetic-critique.md`

Use this structure:

1. **Verdict**
   - One brutal paragraph plus a letter grade.
   - Say what RitmoFit Studio aesthetically is right now.

2. **Central Identity Problem**
   - One sentence naming the core failure.
   - Then explain why that failure caps the product.

3. **Single Biggest Aesthetic Failure**
   - Name it.
   - Reference screenshot(s), mockup(s), and/or file locations.
   - Explain why it matters more than the other problems.

4. **North-Star Scorecard**
   - Table with surfaces as rows and Spotify / Logic Pro / MainStage / Overall as
     columns.
   - Use 1-5 scores with short justifications.

5. **Surface-by-Surface Critique**
   - Auth/Login
   - Marketing/entry
   - Dashboard
   - Builder/choreography editor
   - Dialogs
   - Library/Explore
   - Live mode
   - Sharing/team surfaces where reachable
   - Mobile/narrow viewport

6. **Design-System Critique**
   - Tokens
   - Typography
   - Color/elevation
   - Density/spacing
   - Components
   - Motion/rhythm system
   - Mockups vs implementation

7. **Shipped-vs-Intended Gap Report**
   - Ranked by damage.

8. **Five Most Damaging Weaknesses**
   - Brutal, ranked, and specific.

9. **Three Strongest Foundations to Protect**
   - Only include things that are genuinely worth preserving.

10. **Emotional Arc**
    - Describe how the product feels across the main journey:
      land -> browse/build -> choreograph -> go live.

11. **Stage 2 Handoff Brief**
    - 150-250 words for the redesign-prescription agent.
    - Include the thesis, top failures, protect-list, and most important
      north-star gaps.

12. **Run Record**
    - Date/time.
    - Git SHA.
    - Commands run.
    - Screenshots captured and where they live.
    - Surfaces reached with real pixels vs critiqued from code/mockups.
    - End with the exact sentence:
      **No source changes were made during this evaluation.**

## Rules

- Do not implement.
- Do not rank redesign prescriptions yet.
- Do not turn the critique into a solution backlog.
- Be brutal, but every harsh claim must have a visible reason.
- Respect RitmoFit's AGENTS.md rules, including web/iOS parity, music-provider
  constraints, live-mode dark contract, plasma scarcity, redundant encoding, and
  accessibility obligations.
- If you use screenshots, reference their paths.
- Use `path:line` references where file evidence matters.
