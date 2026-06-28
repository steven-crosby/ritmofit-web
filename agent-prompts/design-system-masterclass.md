# Design System Masterclass Evaluation

> **Special read-only deep-dive pass.** This prompt is for a comprehensive, expert-level audit and critique of the RitmoFit design system.  
> **Strict rule for this run: NO code changes, NO branches for implementation, NO PRs.** Your only deliverable is the exhaustive report file(s).  
> You may run builds, token generation (in check mode), lints, tests, smoke scripts, and any inspection commands. You may describe visual/rendering observations from built output or smoke screenshots. Do not edit source, tokens, docs, or CSS.

**Context for the evaluating agent:** You are a world-class frontend design systems architect, product designer, and accessibility specialist with 2026-era expertise in token-driven systems (Design Tokens, W3C DTCG, CSS custom properties + Tailwind), React component architecture, creator tooling UX for high-stakes physical environments (low light, movement, sweat, time pressure), and cross-platform (web + native) parity. Your critique must be simultaneously rigorous, empathetic to the product's unique rhythm-first identity, and practical.

## Mandatory Pre-Work (read in this exact order)

1. Read the full repository `AGENTS.md` (root) — especially surface parity (D18), "Before Implementing", UI work rules, verification gates, and music constraints.
2. Read `ritmofit_dev_plan/overview.md`, `DEVELOPMENT_PLAN.md`, `web-launch-readiness.md`, `web-ios-parity.md`, `decisions.md`, and `conventions.md`.
3. Read the entire `ritmofit_design_system/` directory as the canonical source of truth:
   - `README.md`
   - `ritmofit-design-system.md` (the implementation brief)
   - `01-design-principles.md` through `11-library-guidelines.md` (all eleven)
   - `tokens.json` (full; treat as the single source of truth)
   - All scripts in `scripts/`
   - `mockups/README.md` and key mockups (components.html, builder.html, live.html, light.html, etc.)
   - `ios/RFTokens.swift` (generated reference)
4. Read the lighter operational prompt: `agent-prompts/remote-prompts/technical/design-system.md`.
5. Review all prior design-system-related agent reports (they live under dated subfolders following the normal pattern, e.g. `agent-reports/2026-06-26/technical-design-system.md`).
6. Inspect the actual web implementation surface:
   - `apps/web/scripts/generate-tokens.mjs`
   - `apps/web/tailwind.config.js`
   - `apps/web/src/index.css` (the `.rf-*` recipes and global rules)
   - `apps/web/src/styles/tokens.css` (generated — inspect but do not edit)
   - All components in `apps/web/src/components/` (read every `.tsx` and `.test.*` for usage patterns)
   - Key surfaces (full paths): `apps/web/src/App.tsx`, `apps/web/src/Dashboard.tsx`, `apps/web/src/components/ChoreographyEditor.tsx`, `apps/web/src/components/LiveMode.tsx`, `apps/web/src/components/LiveTimeline.tsx`, `apps/web/src/components/TimelineStrip.tsx`, `apps/web/src/components/IntensityRibbon.tsx`, `apps/web/src/components/Dialog.tsx`, `apps/web/src/components/TrackSearch.tsx`, `apps/web/src/components/LibraryRail.tsx`, `apps/web/src/components/Login.tsx`, `apps/web/src/components/MarketingPage.tsx`, etc.
   - State handling for loading/empty/error/permission/disconnected across the app.
   - Any use of raw hex/rgb, inline styles for color/spacing/type/radius, non-`font-{ui,display,data}`, or ad-hoc button patterns.
7. Examine supporting artifacts:
   - `apps/web/smoke/` + any shots
   - `ds-bundle/` (what it is, how it relates)
   - `packages/shared/` for any UI-adjacent contracts that affect presentation
   - `pnpm --filter @ritmofit/web build` output and the `dist/` shape
8. Run (read-only where possible):
   - From the design system package: `cd ritmofit_design_system && npm run verify` (the authoritative read-only gate: build-tokens --check for both emitters + lint-tokens + check-contrast)
   - The full CI-equivalent gate from AGENTS.md (format:check, -r typecheck, lint, test, web build, etc.) to establish a clean baseline. Note that `pnpm --filter @ritmofit/web build` intentionally runs the tokens generator (write mode) as part of the build.
   - `pnpm --filter @ritmofit/web build` (to inspect generated artifacts and ensure the tree builds cleanly)

## Evaluation Dimensions (masterclass depth required)

Your critique must cover **at least** these dimensions. Go deeper than token-drift greps performed in prior runs.

### 1. Fidelity to Product & Design Principles (01)
- How faithfully does the current web implementation embody the seven principles?
- Where does the "creator workstation" posture shine? Where does it slip into generic dashboard patterns?
- Evaluate "earn every element," "color confirms, structure informs," "surfaces match their job," and "contrast and tempo scale with stakes."

### 2. Token Architecture & Generation (tokens.json + emitters)
- Completeness and expressiveness of the token set.
- Quality of the generator (`generate-tokens.mjs`): handling of composites, light overrides, rhythm aliases, primitive rewriting, skip lists.
- Risks around drift, regeneration, or partial emission.
- Light theme coverage and intentional "Live stays dark" contract.
- Missing or under-specified tokens (scrims, focus states beyond ring, skeleton/loading affordances, etc.).
- Versioning/governance story for tokens as the product evolves.

### 3. Color Channel Discipline (02)
- Strict separation: copper (identity/primary), cyan (interactive), plasma (peak only).
- Success = cyan + icon (never green/emerald).
- Intensity ramp, segment tints, state semantics.
- Usage on fills vs text vs graphics.
- Any violations or near-violations in real components.

### 4. Typography & Data Readability (03)
- Correct family application (Sora UI, Bricolage display, Azeret Mono data).
- Scale usage (especially data-hero, data-lg, data in Live/Builder).
- Numerals and tabular data behavior.
- Loading of self-hosted fonts and fallback strategy.
- Hierarchy and weight usage in dense builder surfaces.

### 5. Surfaces, Layout, Spacing, Depth (04)
- Glass vs solid discipline.
- Correct application of `bg-*`, `rounded-*`, `shadow-*`, spacing tokens.
- Card/panel/sheet hierarchy in practice.
- Border usage (only where it earns its place).
- Responsive and narrow-viewport behavior (reference smoke tests).
- Any hard-coded values or Tailwind arbitrary values that should be tokens.

### 6. Components, Patterns & State Coverage (05 + reality)
- Create a matrix: documented component/variant/state (05) vs actual implementation.
- Button and action patterns (primary recipe, secondary, ghost, inline, destructive). Is there a shared primitive or intentional ad-hoc?
- Song rows, cards, inputs, chips, toggles, segment tags.
- Timeline, cues, moves, markers.
- Overlays/Dialogs (focus trap, inert, backdrop, glass).
- Now-playing / Live HUD.
- Intensity readout + ribbon.
- Empty, loading, error, permission, provider-state handling (are they first-class and consistent?).
- Overall: is the "tokens + recipes + ad-hoc components" philosophy a strength or accumulating liability?

### 7. Motion, Tempo & Rhythm System (06 + 10)
- Correct pulse allowlist (Live HUD + currently-playing planning row only).
- Implementation of `rf-beat-pulse*`, `rf-drop-bloom`, etc. in `index.css`.
- Use of motion tokens (`--rf-motion-*`).
- Reduced-motion degradation (must lose only affect, never information).
- Any other animated elements; are they justified?
- The "interface keeps time" thesis — does the web surface deliver it?

### 8. Accessibility & Redundant Encoding (07)
- Contrast (planning AA, Live AAA).
- Redundant encoding everywhere meaning is carried (especially intensity ribbon, All-Out, segment types, success/error).
- Keyboard (focus rings always visible cyan; logical order; builder shortcuts if any).
- Targets (≥44pt), labels, semantics.
- Reduced motion (already partially covered).
- Any aria/live-region gaps for Live mode or dynamic timeline.
- Light theme accessibility (where shipped).

### 9. iOS-Web Alignment & Shared Model (08)
- How well do the shared tokens + documented roles support the "co-equal surfaces" mandate?
- Any web-specific patterns that would be hard or impossible to express equivalently on iOS (or vice versa).
- Documentation of intentional platform idiom differences.

### 10. Product Surface Critiques (Builder, Live, Library, Auth/Marketing/Share)
- For each major surface, evaluate against the design system + principles + launch-readiness needs.
- Specific callouts for the Class Builder (09-class-builder-guidelines.md) and Library (11).
- Marketing / share "swagger without party-fitness clichés."
- Live mode as a performance instrument (glanceability, stress conditions).

### 11. Tooling, DX, Governance & Documentation
- How easy is it for a new contributor (or future agent) to do the right thing?
- Quality and currency of the 01–11 docs vs code reality.
- Living documentation: mockups vs real app; any Storybook/component explorer?
- Guardrails (lint-tokens, check-contrast, verify flows) — are they sufficient?
- How drift is caught today vs how it should be caught at scale.
- ds-bundle/ purpose and health.
- Any opportunities for stronger automation or contracts.

### 12. Technical Quality & Future-Readiness
- Custom property hygiene, cascade, performance.
- Font loading strategy and FOIT/FOUT behavior.
- Tailwind mapping strategy (strengths/weaknesses of the current extend approach).
- Composition of brand recipes in `index.css` (good layering?).
- Scalability for future surfaces (marketing site expansion, new marketing variants, theming experiments).
- Risks for web launch and post-launch iOS wrap.

## Required Output Structure (the report)

Produce **one primary exhaustive report** as a single well-structured Markdown file.

Because this is a special heavyweight masterclass evaluation (not a routine daily/weekly run), write the primary report directly under the agent-reports root:

`agent-reports/design-system-masterclass.md`

If re-running the masterclass on a later date, append a date or version suffix to the filename (e.g. `design-system-masterclass-2026-06-28.md` or `-v2`) to preserve history. You may optionally also emit a dated copy under `agent-reports/YYYY-MM-DD/` (following normal naming) for archive consistency, but the canonical deliverable is the one at the agent-reports root.

Do not follow the short AGENT_REPORT_TEMPLATE.md structure for the main report (this one has its own required structure defined below).

The report **must** serve two audiences without duplication:

**A. Human-Reviewable Narrative**
- Executive summary + overall health grade (e.g., A-/B+ with justification).
- Strengths (what is genuinely excellent and should be protected).
- Narrative critiques by dimension.
- Visual / experiential observations (describe what you see or would see; reference smoke shots or built output).
- Risk assessment for launch and long-term maintenance.
- Prioritized recommendation categories with clear rationale and effort/impact.

**B. Implementation-Ready Specification (for a follow-up Grok agent)**
- A clean, numbered "Implementation Backlog".
- For each item:
  - Priority (P0–P3 or Launch / Post-launch / Polish).
  - One-sentence problem + link to relevant design-system section(s).
  - Precise scope and files.
  - Concrete implementation guidance (exact token paths, class replacements, new recipe sketches, test additions, doc updates). Make it detailed enough that a capable agent can execute with minimal reinterpretation.
  - Verification steps (commands + what to look for).
  - Parity note (web-only vs must also consider iOS later).
- A final "Condensed Executive Brief" (200–400 words) that a future agent can be given as context + a pointer to the full report.
- A short "How to consume this report as an implementer" section.

Use consistent formatting:
- File references as `path/to/file:line` (or ranges).
- Quote relevant passages from design docs.
- Tables for inventories, matrices, and comparisons.
- Code blocks for before/after patterns or token examples.
- Clear "Evidence" and "Impact" bullets.

End the report with:
- Date/time of inspection and git SHA inspected.
- Commands run and their outcomes (baseline hygiene).
- Any areas where evidence was limited (e.g., "could not run full authenticated Live flow") and why.
- Clear statement: "No source changes were made during this evaluation."

## Execution Rules for This Prompt

- Stay strictly report-only. If you feel an irresistible urge to "just fix one thing," document the exact diff in the report instead.
- Be specific and evidenced. Vague "needs polish" findings are not acceptable; cite files, classes, and token paths.
- When something is excellent, say so explicitly (protect good decisions).
- Respect the product's non-negotiables (music rules, plasma scarcity, redundant encoding, tempo rationing, surface parity).
- If you identify missing capabilities that are genuinely launch-blocking vs nice-to-have, label them accurately.
- Use the full power of your tools: extensive grep, multiple targeted reads, terminal commands for build/verify, file inspection of generated output.
- If Chrome DevTools / visual inspection MCP tools are available in your environment, use them to observe rendered results (especially Live HUD, ribbon, timeline, dialogs, light theme, reduced-motion states) and describe precisely.
- Run the smoke scripts if feasible for narrow-width and dialog behavior.
- Cross-check the mockups against reality — note any deliberate or accidental divergence.

## Final Deliverable Checklist (before you stop)

- [ ] Full report written to `agent-reports/design-system-masterclass.md` (or dated-suffixed variant at the agent-reports root).
- [ ] Report validates structurally (headings, evidence, implementation specs present).
- [ ] No uncommitted source changes in the tree (confirm with status or diff).
- [ ] You have recorded the inspected commit and key verification gate results (especially the design-system `verify` and web build).
- [ ] The report contains a usable "follow-up agent" brief.

## Tone & Standards

Write with the authority of a masterclass review: precise, respectful of the existing high-quality work, ambitious for the product, and generous with concrete next steps. Avoid both hand-wavy praise and nitpicking without impact. The goal is a document the owner can read in one sitting for understanding and that a future agent can use as a roadmap without needing to re-explore the entire system.

Begin immediately by performing the mandatory pre-work reads and inspections. Then synthesize and write the report. Because this is report-only, follow house rules for non-code artifacts (push a branch containing the report if the execution context is an unattended remote run; otherwise commit cleanly into agent-reports/). The primary goal is the high-quality artifact a human and a subsequent agent can both act on.
