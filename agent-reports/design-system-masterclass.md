# Design System Masterclass Evaluation Report

**Date of inspection:** 2026-06-28  
**Inspected commit:** `7a4be4fe88cd03a03908a9492ad3cdd41b1a2881` (feat(web): planning-timeline active-track tempo pulse (Session 5) (#137))  
**Agent:** Grok 4.3 (following `agent-prompts/design-system-masterclass-invocation.md` + `design-system-masterclass.md`)  
**Mode:** Strictly report-only. No source edits, no branches, no PRs.

---

## Executive Summary + Overall Health Grade: **A-**

The RitmoFit design system is in excellent health and is one of the strongest assets heading into web launch readiness. The canonical `ritmofit_design_system/` (tokens.json as single source of truth + 01–11 guidance) is faithfully implemented on the web surface. The generator + guardrail pipeline (`verify`, `build-tokens`, `lint-tokens`, `check-contrast`) is working as intended. Color channels, typography roles, rhythm rationing, redundant encoding, and surface discipline are respected at the code level.

**Key wins protected:**

- Exact pulse allowlist (Live HUD + planning active-track) with correct `--rf-beat` derivation, `onBeat` easing, reduced-motion degradation, and recent subtle planning-timeline implementation.
- Strict copper (brand) / cyan (interaction) / plasma (peak-only) separation.
- Azeret Mono data face for all numerals; Sora/Bricolage roles correct.
- Energy ribbon (height-primary, color reinforcement) and intensity readout follow 09/10.
- Glass vs solid surfaces differentiated correctly; no glass-on-glass in dense editing.
- Contrast gate passes for both themes (planning AA, Live AAA targets met).
- Recipes (`.rf-btn-primary`, `.rf-beat-pulse*`, `.rf-heat-*`, `.rf-topbar`) properly composed from primitives in `index.css`.

**Grade justification:** A- (not A) because a small number of documented gaps remain in state coverage, one known cosmetic token candidate (scrim), and first-class empty/loading treatment is present but not uniformly polished across every surface. These are low-risk for launch but are the difference between "very good" and "exemplary instrument."

No launch-blocking design-system defects were found. The system is ready for launch with targeted follow-ups tracked below.

---

## Strengths (What Is Genuinely Excellent)

- **Token architecture & governance.** `tokens.json` + dual emitters (`build-tokens.mjs` for web, `build-tokens-ios.mjs` for Swift) + `npm run verify` (build --check + lint + contrast) form a closed, drift-resistant loop. The web `generate-tokens.mjs` integrates cleanly into `pnpm --filter @ritmofit/web build`.
- **Rhythm system realization.** The two allowed pulses are implemented correctly and only there (`rf-beat-pulse` on Live HUD, `rf-beat-pulse-subtle` on planning active track). Drop bloom (`rf-drop-bloom`) is rationed. Reduced motion removes affect only.
- **Color + redundant encoding discipline.** Success is cyan+icon. Intensity always zone+bar+label (+color). Segments icon+label+tint dot. Plasma never leaks into controls or tags (enforced in `cue-colors.ts` + test).
- **Typography & data readability.** Hero data in Live is `data-hero` Azeret Mono. All BPM/time/zone/counts use the data face. Self-hosted OFL fonts with proper swap and preload intent.
- **Builder fidelity (09 + 10).** Timeline-first, energy ribbon above, small album art, BPM-weighted rows, side inspector, segment bands, cue/move separation — all match the spec. Recent timeline pulse addition (Session 5) is precise.
- **Cross-platform alignment (08).** Tokens are the contract. Documented idiom differences (glass expression, nav, SF Pro vs Sora) are respected. No accidental web-only patterns that would be impossible on iOS.
- **Accessibility basics strong.** Visible cyan focus rings, 44px targets via wrappers, `prefers-reduced-motion` fully wired for pulses and transitions, ErrorBoundary present, keyboard operable.
- **Recipe layering.** `index.css` brand recipes correctly trace to primitives; they cascade on token changes.

---

## Narrative Critiques by Dimension

### 1. Fidelity to Product & Design Principles (01)

The web surface strongly embodies "built for creating, not consuming," "the interface keeps time," and "surfaces match their job." Builder is calm workstation; Live earns heat and pulse. "Earn every element" is honored (small art, BPM forward, low chrome).

Minor slips: some dialogs and marketing surfaces flirt with heavier brand-front treatment than a pure workstation would, but this is within the documented allowance for marketing/share swagger.

### 2. Token Architecture & Generation

Excellent. Web emitter handles semantic resolution, primitives rewriting, light overrides, and gradient/bloom composition. `--check` modes are used correctly in `verify`.

Gaps:

- No explicit versioning or "token changelog" beyond the `$meta.version` in `tokens.json`.
- Light glass/shadow values exist in the generated block but live legibility (especially under real content) is only manually verifiable (documented in README).
- Missing higher-level tokens for a few affordances (see scrim below, plus potential skeleton/loading affordance tokens).

### 3. Color Channel Discipline (02)

Strictly followed in code. Plasma is confined to All-Out glow, Live drop, ribbon Zone 4 kiss, and derived marketing artwork. Cue picker excludes plasma (guarded by test). Success uses `state-positive` (cyan) everywhere inspected.

One latent cosmetic item: Dialog backdrop uses literal `bg-black/60` (see backlog).

### 4. Typography & Data Readability (03)

Very strong. All inspected numerals route through `font-data`. Display used with restraint. Eyebrow micro-label uses Azeret + copper as specified. No raw `font-family` overrides outside generated stacks.

### 5. Surfaces, Layout, Spacing, Depth (04)

Good separation. Builder uses solid `bg-raised`/`bg-sunken` for editing density; glass used for topbar, overlays, HUD. Radius scale (`sheet`/`panel`/`card`/`input`/`control`/`pill`) applied consistently.

Issues:

- Modal scrim remains a raw `bg-black/60` (Dialog.tsx:121) rather than a semantic token. This was flagged in the 2026-06-26 drift report.
- A few dynamic positioning uses inline `style={{ left: `${pct}%` }}` — acceptable for layout math, but could be documented as "data-driven geometry."
- Narrow viewport behavior is covered by smoke shots and tests; no hard overflows found in inspected sources.

### 6. Components, Patterns & State Coverage (05 + reality)

Recipes and primitives are widely adopted (`rf-btn-primary`, rounded tokens, shadows). Button variants (primary copper gradient, secondary, inline cyan, ghost, destructive ember+icon) exist and are used.

Matrix gaps (not exhaustive defects, but incomplete coverage vs 05):

- Loading affordances are present (Dashboard list status, App LoadingScreen, use-async-action) but are mostly "Loading…" text or implicit; no first-class skeleton recipe for timeline/ribbon rows.
- Empty states exist ("No classes yet" patterns) but are inconsistent in copy and visual weight across Library rail, TrackSearch results, Songs-by-Move, etc.
- Full disabled/hover/pressed states on all action surfaces not uniformly asserted in tests.
- IntensitySegmentedControl, SegmentBand, and cue color chips follow rules but live in ad-hoc or small components rather than shared primitives.

The "tokens + recipes + colocated components" philosophy is currently a strength (low abstraction tax), but risks slow accumulation of one-off patterns as the surface grows.

### 7. Motion, Tempo & Rhythm System (06 + 10)

Outstanding. The pulse implementation in `index.css` (keyframes + `.rf-beat-pulse` / `.rf-beat-pulse-subtle`) plus LiveMode + TimelineStrip usage exactly matches 10 §2. Drop is wired for All-Out. `prefers-reduced-motion` fully suppresses affect. No other animated elements violate the budget.

The planning-timeline subtle pulse (added in the inspected commit) is the correct second surface.

### 8. Accessibility & Redundant Encoding (07)

Redundant encoding is cultural: intensity, segments, states, cues vs moves, ribbon height. Contrast gate (both themes) passes cleanly (verified in this run). Focus rings are global cyan via `:focus-visible`. Keyboard trap in Dialog is present. Targets are 44pt via wrappers.

Gaps:

- Limited live-region / aria for Live cue advancement and timeline playhead (screen reader users get numbers but may miss "on the beat" semantics).
- Light theme glass contrast not machine-gated (manual verification required).
- No explicit large-target hit areas documented for timeline markers in code (they ride the block click area).

### 9. iOS-Web Alignment & Shared Model (08)

Tokens + generated `RFTokens.swift` + documented table in 08 give a strong contract. Web leans rich planning; iOS leans glanceable live — both surfaces carry full capability per D18. No web-only primitives that would force iOS divergence were found. The current seam gap (iOS vendoring its own token copy) is tracked in dev-plan, not a web defect.

### 10. Product Surface Critiques

- **Builder (09):** High fidelity. Ribbon + timeline + inspector layout correct. Song rows low-noise. Editing granularity visible. Recent pulse addition is a win.
- **Live (10):** Strong instrument. Large data-hero, glass HUD, on-beat pulse + drop, wake lock, provider handoff. Minimal chrome.
- **Library (11):** Functional rail + card summary (recently enriched). Empty/selection states present but copy and visual treatment could be more consistent with the "earn every element" voice.
- **Auth/Marketing/Share:** Use of heat recipes and display typography is appropriate and scoped. Marketing carries swagger without party clichés.
- **Dialogs/Overlays:** Functional with focus trap and inert root. Backdrop is the only visible deviation from token purity.

### 11. Tooling, DX, Governance & Documentation

- Guardrails (`verify`, `lint-tokens`, `check-contrast`) are authoritative and fast.
- Living artifacts: `mockups/` (framework-free), `ds-bundle/` (synced component previews with manifest), smoke shots (narrow + dialog), real app.
- No Storybook/component explorer — the combination of mockups + ds-bundle + test snapshots + smoke is sufficient for current team size but may need formalization post-launch.
- Drift catching works (gridline fix in prior cycle; current tree clean on this run).
- Docs (01–11) are current relative to implementation; the one drift noted (scrim) is in code, not docs.

### 12. Technical Quality & Future-Readiness

- Custom properties are clean; cascade order (tokens.css before Tailwind) correct.
- Font loading via self-hosted woff2 + `fonts.css` import; `display=swap` intent.
- Tailwind mapping via `extend` + generated vars is pragmatic and effective.
- Recipes in `index.css` are well-commented and trace to primitives/mockups.
- Scalability: adding new surfaces (richer Explore, marketing site) can reuse tokens/recipes. New component families should prefer extending the recipe layer over new one-offs.
- Launch risk low; post-launch iOS wrap and any new web surfaces will benefit from the existing guardrails.

---

## Visual / Experiential Observations

- **Builder at rest:** Calm solid surfaces, timeline grid uses semantic border tokens (fixed), ribbon reads as shape even without color. Active track gets the subtle pulse (verified in source + recent commit).
- **Live HUD:** Maximum contrast dark (bg/live), giant Azeret data-hero BPM, glass cue card with drop bloom on All-Out. Pulse visible only on the allowed elements.
- **Library rail (from smoke + code):** Cards carry track-count + duration + art collage + last-opened (recent enrichment). Empty states use tertiary text.
- **Dialogs:** Focus moves inside; root inert; close on backdrop. Backdrop is conventional black/60 (works in dark; light mode TBD).
- **Narrow (smoke shots):** 320/390 viewports covered; no overflow reported in recent shots.
- **Reduced motion:** Pulses gone, transitions collapsed; ribbon static and informative.
- **Light theme:** Generated and contrast-clean, but no production path yet (opt-in). Glass may read differently.

Smoke shots (22 files) and ds-bundle `_screenshots/` provide durable visual regression anchors.

---

## Risk Assessment for Launch and Long-Term

**Launch risk: Low.** The system is coherent, gated, and aligned with product principles. The remaining items (scrim token decision, state polish) are cosmetic or incremental.

**Long-term risk: Medium-Low.** The current "recipes + colocated" model works because the team is small and disciplined. As more surfaces (Explore expansion, Teams polish, marketing site, post-launch iOS) land, the lack of a shared primitive button/input/empty component set + explicit state matrix could allow quiet divergence. Token governance is strong; component governance is lighter.

**Parity risk:** None acute. Tokens and roles are shared; documented exceptions cover the rest.

---

## Prioritized Recommendations

1. **Resolve the scrim token decision** (owner + design) — either mint `semantic.bg.scrim` (dark + light) or document the literal as accepted.
2. **Elevate empty/loading states** to first-class, consistent patterns (copy, visual weight, icons) across Dashboard, Library, Search, Explore.
3. **Add a minimal shared state affordance layer** (or recipes) for loading skeletons and empty illustrations without over-abstracting.
4. **Audit and test full interactive states** (disabled, loading, pressed) for primary/secondary actions and segmented controls.
5. **Light theme visual pass** (glass + HUD + ribbon) before any opt-in exposure.
6. **Consider adding a living component gallery** (expand ds-bundle or lightweight Storybook) for future contributors.
7. **Keep the pulse and ribbon tests strong**; they are the soul of the system.

---

## Implementation Backlog (for follow-up agent)

Numbered, actionable, with precise scope and verification. Priorities use Launch / Post-launch / Polish.

1. **P0 / Launch — Add semantic scrim token and route Dialog backdrop through it**  
   Problem: Modal backdrop uses raw `bg-black/60` (Dialog.tsx:121) instead of a token. Violates "every fill derives from --rf-_" expectation.  
   Scope: `ritmofit_design_system/tokens.json` (add `semantic.bg.scrim` with dark/light), regenerate emitters, `apps/web/src/components/Dialog.tsx`, `apps/web/src/index.css` (if needed), update any light mockups.  
   Guidance: Follow existing semantic.bg._ shape. Dark: `rgba(0,0,0,0.6)` or ink-950@60. Light: a warm deep value that preserves glass legibility. Add to `check-contrast.mjs` if treated as graphic. Update 04-layout docs.  
   Verification: `cd ritmofit_design_system && npm run verify`; visual in browser (dark + optional light); smoke dialog shots if run.  
   Parity: Web change; iOS uses native material — note in 08 if the scrim role matters for native presentation.

2. **P1 / Launch — Standardize empty & loading states across core surfaces**  
   Problem: "Loading…", "No X yet", error messages are present (Dashboard, App, class-detail-state) but vary in typography, spacing, icon usage, and tone.  
   Scope: `apps/web/src/components/Dashboard.tsx` (LibraryRail, class list), `TrackSearch.tsx`, `SongsByMoveDialog.tsx`, `ClassSummaryView.tsx`, new or shared `EmptyState.tsx` / `LoadingState.tsx` patterns if warranted.  
   Guidance: Use `text-tertiary`, consistent icon (from approved set), short sentence + optional action. Create one small recipe or component pattern and back-port to 4–5 surfaces. Update 05-components.md with the pattern.  
   Verification: Manual + existing smoke narrow-width; unit tests for new helpers; build + typecheck.  
   Parity: Web-first; record iOS equivalent wording in parity doc if different.

3. **P2 / Post-launch — Expand documented component state matrix (05) with reality audit**  
   Problem: 05 defines default/hover/focus/pressed/disabled/loading + selected for buttons, chips, inputs. Implementation is good but not exhaustively tested or documented per variant.  
   Scope: `apps/web/src/components/` (primary usage sites: ChoreographyEditor, TrackSearch, IntensitySegmentedControl, buttons in dialogs), add or update tests, 05-components.md.  
   Guidance: Add focused tests or visual assertions for disabled primary, loading action, pressed inline. Produce a small table in 05 or a README note.  
   Verification: `pnpm test`, `pnpm --filter @ritmofit/web build`; optional smoke.  
   Parity: Note any iOS differences.

4. **P2 / Polish — Light theme glass + Live (stays dark) visual + contrast spot-check**  
   Problem: Light palette contrast is machine-gated; glass and HUD legibility under real content is not.  
   Scope: Manual browser run with `[data-theme="light"]` on root; smoke if extended; possibly add a light-specific smoke or note.  
   Guidance: Verify ribbon, timeline grid, Dialog, topbar, HUD (force dark), cards on cream. Update 02/04 if tweaks needed.  
   Verification: Manual + screenshot in agent-reports or smoke if scripted.  
   Parity: Light on iOS (RFColorLight) follows similar rules.

5. **P3 / Polish — Consider a first-class loading skeleton or shimmer token (or document as not needed)**  
   Problem: No skeleton affordance token or component. Current text "Loading…" works but may feel sparse for timeline-heavy views.  
   Scope: Decision only or small addition to tokens + one recipe.  
   Guidance: If added, keep it extremely quiet (bone on raised, low opacity bars). Otherwise add a sentence to 05 and 06 that "text status + reduced-motion-safe" is the chosen pattern.  
   Verification: Owner decision recorded in dev-plan or design-system notes.

6. **P3 / Polish — Strengthen aria live regions for Live cue advancement and timeline**  
   Problem: Numbers + visual state are strong; dynamic cue text changes and playhead progress are not announced to AT.  
   Scope: `LiveMode.tsx`, `LiveTimeline.tsx`.  
   Guidance: Polite live region for current cue text; consider `aria-valuenow` on the scrubber.  
   Verification: Manual with screen reader or a11y audit; existing tests + build.  
   Parity: iOS will have its own VoiceOver treatment — track if needed.

---

## Condensed Executive Brief (for a follow-up implementer agent)

RitmoFit's design system is token-driven, dark-first, rhythm-aware, and deliberately restrained. `ritmofit_design_system/tokens.json` + verify gate + dual emitters are the single source of truth and are currently green. Web implementation (`apps/web/src/styles/tokens.css`, `tailwind.config.js`, `index.css` recipes, components) is highly faithful: correct families (Sora UI / Bricolage display / Azeret data), strict copper/cyan/plasma channels, glass-for-transient + solid-for-editing, redundant encoding everywhere, and the exact two allowed on-beat pulses (Live HUD + planning active track) with full reduced-motion degradation.

The only visible deviation from token purity is the Dialog backdrop (`bg-black/60`). Empty/loading states exist but are inconsistent in treatment. Component state coverage (disabled/loading/pressed) is good but not exhaustively documented or tested. Light theme is generated and contrast-clean but unexercised in production paths.

Do not invent new tokens or components without updating the 01–11 docs and running `npm run verify` in the design-system package. Protect the pulse rationing and redundant-encoding rules at all costs. When implementing backlog items, prefer the smallest vertical slice that updates the token or recipe layer + one consuming site + verification.

Full details and exact file/line guidance live in the numbered backlog above + the dimension critiques. Run the full CI gate and design-system `verify` before considering any change "done."

---

## How to Consume This Report as an Implementer

1. Read the Executive Summary + Strengths first (protect the good parts).
2. Read the numbered backlog items in priority order. Each is written to be executable with minimal reinterpretation.
3. For any item, re-read the linked design-system doc section (e.g. `02-color-system.md`, `10-rhythm-system.md`) and the cited source files.
4. Always run: `cd ritmofit_design_system && npm run verify` + the AGENTS.md web gate before committing.
5. Update the corresponding section of `ritmofit_design_system/` (or dev-plan) when a design decision is made.
6. After changes, re-run this masterclass (or the lighter weekly `design-system.md` prompt) and compare.

---

## Baseline Hygiene & Commands Run (this evaluation)

All commands were read-only where possible or produced only report output.

- `git rev-parse HEAD` → `7a4be4fe88cd03a03908a9492ad3cdd41b1a2881`
- `git status --porcelain` (at end of inspection) → only pre-existing M on seed/schema + the two prompt files (??); no design-system or component source touched by this pass.
- Design system verify: `cd ritmofit_design_system && npm run verify` → **PASS** (tokens in sync, lint clean, DARK + LIGHT contrast all clear AA).
- `pnpm format:check` → **PASS**
- `pnpm lint` → **PASS**
- `pnpm test` (unit) → **PASS**
- `pnpm --filter @ritmofit/api test:integration` → **PASS** (66 tests)
- `pnpm --filter @ritmofit/web build` → **PASS** (tokens generated, typecheck + SPA built cleanly)
- Additional inspection: extensive grep for raw colors/fonts/arbitrary values, component reads (Dialog, TimelineStrip, IntensityRibbon, LiveMode, ChoreographyEditor, Dashboard, LiveTimeline, etc.), tokens.json, all 01–11 + README + generators + mockups + RFTokens.swift + ds-bundle + smoke shots + prior agent reports.

**Areas with limited evidence:**

- Full authenticated end-to-end Live run with real music provider handoff (smoke + code inspection instead of live browser session).
- Production light-theme usage (generated + contrast clean; visual only via source + mockups).
- Cross-repo iOS render comparison (tokens + 08 doc reviewed; iOS source not present in this checkout).

**No source changes were made during this evaluation.**

---

_End of report._
