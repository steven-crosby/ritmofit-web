Act as a senior product designer, design systems architect, frontend engineer, accessibility reviewer, and ruthless pre-launch critic.

Your mission:
Audit this ritmofit-design-system-final folder to confirm internal consistency across its HTML, .md, and tokens. The final system must be coherent, brand-appropriate, accessible, maintainable, and useful for RitmoFit web and iOS. Use `ritmofit-design-system.md` as the governing authority. Prompt me questions as needed for focus and clarity.

Scope:
Audit ONLY this folder.

Core product truth:
RitmoFit is for instructors who are creators.

RitmoFit is a movement-first creative tool for rhythm fitness instructors. It helps instructors discover, shape, and perform the class hidden inside the music.

Short brand truth:
Find the class inside the music.

Brand target:
Club Athletic + Creator Swagger + Nike restraint.

The product should feel like:
If Fatboy Slim and Daddy Yankee became Pilates instructors and opened their own studio, then hired the Nike marketing team to build the brand.

But avoid:
- party-fitness clichés
- forced Spanglish
- tropical costume language
- bottle-service energy
- generic SaaS dashboard language
- LMFAO/Pitbull energy
- “turn up” copy
- generic productivity language

Allow:
- rhythm
- heat
- pulse
- control
- precision
- flow
- movement
- creator confidence
- premium studio restraint

Important product distinction:
RitmoFit is not a generic fitness planner, SaaS dashboard, playlist manager, or passive music app.

Spotify makes listening effortless.
RitmoFit makes authoring rhythm-driven classes effortless.

The instructor is a producer, choreographer, coach, performer, and movement artist.

The interface should help them:
- find the class inside the music
- shape the room
- score movement
- cue with precision
- build the beat into a physical experience
- perform without losing the beat

Design mode rules:
- Builder mode is calm, precise, structured, and mostly still.
- Live mode earns the heat: high contrast, large data, minimal chrome, glanceable across a studio.
- Marketing/share artifacts carry more swagger, but still feel premium and controlled.

Non-negotiable design-system rules:
1. Color confirms, structure informs.
   Color must never be the only carrier of meaning.

2. Copper = brand identity, warmth, and primary brand actions.
   Cyan = interaction, links, controls, focus, toggles, information.
   Plasma = peak affect only.

3. Plasma must never be used for:
   - buttons
   - links
   - form controls
   - focus rings
   - ordinary accents
   - generic badges
   - routine planning UI

4. Plasma is allowed only for:
   - All-Out intensity glow
   - Live sprint/drop pulse
   - Zone 4 peak kiss in the energy ribbon
   - marketing/share-card artwork derived from class peaks

5. Data typography matters.
   BPM, timecodes, zones, durations, and counts should use the data typography role, preferably Martian Mono or the approved fallback.

6. Album art is a creative trigger, not the center of the interface.
   In Builder workflows, BPM, structure, intensity, timeline, cues, and energy shape should carry more importance than artwork.

7. Energy ribbon / class shape is a core brand artifact.
   It should be prominent where relevant and must encode intensity using height/structure, not color alone.

8. Builder UI should prioritize:
   - energy ribbon / class shape
   - track sequence / timeline
   - BPM / duration / timecode data
   - selected cue or move editor
   - provider connection status
   - small bounded artwork

9. Live UI should prioritize:
   - current track
   - current cue
   - next cue
   - BPM
   - elapsed / remaining time
   - intensity
   - emergency clarity

10. Motion is rationed.
    Pulse only appears in:
    - Live HUD BPM/current cue card
    - currently playing track indicator in planning timeline

11. Reduced motion must remove pulse and affect without removing meaning.

12. Accessibility is central:
    - no red/green-only semantics
    - every color-coded state needs icon/label/number/shape/position/bar-count redundancy
    - visible cyan focus ring
    - minimum 44x44 targets
    - WCAG AA minimum for planning
    - target AAA where practical for Live mode
    - energy ribbon needs textual/screen-reader summary where applicable

13. Do not invent schema fields silently.
    If a desired visual depends on unavailable data, derive from current data or document a TODO.

Your job is to audit this folder for internal consistency and brand fit, then recommend the strongest path to a coherent, shippable system.

Before editing anything, perform the audit below.

PHASE 1 — Folder discovery

Inspect this folder and map it. Identify:
1. The governing authority (`ritmofit-design-system.md`) and its scope.
2. The numbered spec docs (01–11) and what each governs.
3. The token source(s) — `tokens.json` and any CSS variables / theme files (e.g. `mockups/theme.css`).
4. The HTML surfaces (`preview.html`, `ritmofit-branding-mockup.html`, and everything under `mockups/`).
5. Which files define or render:
   - global tokens
   - CSS variables
   - typography
   - color palette
   - layout primitives
   - buttons
   - cards
   - nav/header
   - hero sections
   - class builder surfaces
   - track rows/song cards
   - BPM/data readouts
   - intensity displays
   - energy ribbon/class shape
   - provider states
   - forms/inputs
   - motion/reduced-motion
   - accessibility/focus states

Then surface every consistency defect:
- token values that disagree between `tokens.json`, `mockups/theme.css`, and the .md specs
- duplicated or divergent token definitions
- hardcoded colors that should reference tokens
- hardcoded radii
- hardcoded font values
- conflicting surface styles across HTML mockups
- HTML that contradicts the .md spec it is supposed to demonstrate
- .md specs that describe components not present in the mockups (or vice versa)
- dead or unused styles/tokens
- inconsistent component variants across mockup pages
- places where the implementation contradicts the RitmoFit brief or the non-negotiable rules above

PHASE 2 — Interpret the system

Summarize the codex system as it currently stands:

1. Design intent in plain English.
2. Visual personality.
3. Strengths.
4. Weaknesses.
5. Where it aligns with RitmoFit.
6. Where it conflicts with RitmoFit.
7. Whether it currently reads more like:
   - generic SaaS
   - music app
   - fitness dashboard
   - creator workstation
   - premium studio instrument
   - campaign/marketing brand system

Be blunt. Do not flatter the existing work.

PHASE 3 — Scorecard

Score the codex system from 1–10 on each criterion below. This is a single-system scorecard, not a comparison.

- RitmoFit brand fit
- Creator-first feel
- Movement-first feel
- “Find the class inside the music” clarity
- Music/workstation energy
- Fitness/studio confidence
- Nike-like restraint
- Latin-rooted warmth without cliché
- Avoidance of generic SaaS patterns
- Avoidance of party-fitness clichés
- Color-channel discipline
- Use of copper as brand warmth
- Use of cyan as interaction/focus/info
- Plasma restraint
- Surface system quality
- Typography quality
- Data typography quality
- Builder-mode calmness
- Live-mode glanceability
- Marketing-page swagger
- Energy ribbon/class-shape treatment
- Track row/song card hierarchy
- Provider-state clarity
- Copy/voice alignment
- Accessibility
- Colorblind safety
- Reduced-motion readiness
- Responsive behavior
- Maintainability
- Token centralization
- Cross-file consistency (HTML ↔ .md ↔ tokens)
- Component scalability

For each score, provide:
- score
- evidence from specific files/components in the folder
- why the score is justified
- what would need to improve

PHASE 4 — Consistency findings & resolution

For every inconsistency found, decide the single canonical answer the system should converge on. The governing brief wins ties; the non-negotiable rules above override any mockup or token that contradicts them.

For each category below, state: the current state across files, where they disagree, and the canonical value/approach the system should standardize on.

Categories:
- color palette
- token architecture
- surface system
- glass vs solid surfaces
- typography
- data typography
- spacing scale
- radius scale
- shadows/elevation
- buttons
- chips/toggles
- forms/inputs
- nav/header
- marketing hero
- feature sections
- CTA sections
- class builder layout
- track rows/song cards
- BPM readouts
- intensity displays
- energy ribbon/class shape
- cue and move markers
- provider connection states
- empty states
- error states
- share/export cards
- motion system
- reduced-motion behavior
- responsive layout
- accessibility/focus states
- copy/voice system

Important:
Do not invent a muddy compromise.
The resolved system must feel intentional, opinionated, and disciplined — and must trace back to the governing brief and the non-negotiable rules.

PHASE 5 — Final assessment

Give one clear verdict on the system's readiness:

A. Ship-ready with minor consistency fixes.
B. Needs targeted refactors before it is coherent.
C. Needs a structural pass on tokens/specs/mockups before it can govern web and iOS.

Justify the verdict with direct reference to:
- RitmoFit’s brand truth
- Builder mode needs
- Live mode needs
- marketing needs
- token maintainability
- cross-file consistency (HTML ↔ .md ↔ tokens)
- accessibility
- implementation risk

PHASE 6 — Implementation plan

Create a practical, staged implementation plan scoped to this folder.

Break it into small reviewable commits.

Include:
1. Token consolidation (single source of truth across `tokens.json`, `mockups/theme.css`, and the specs).
2. Color-channel enforcement.
3. Typography/data typography updates.
4. Surface and layout cleanup.
5. Component refactors.
6. Builder-mode hierarchy improvements.
7. Live-mode glanceability improvements.
8. Energy ribbon/class-shape improvements.
9. Copy/voice cleanup.
10. Accessibility and reduced-motion fixes.
11. Responsive QA.
12. Reconciling .md specs with the HTML mockups so they agree.
13. Final cleanup of dead/conflicting styles and tokens.

For each step, list:
- files likely to change (within the folder)
- risk level
- expected visual impact
- how to verify success

Output format:

Use these headings exactly:

# Executive Summary
# Folder Discovery
# System Interpretation
# Scorecard
# Strengths to Keep
# Weaknesses to Avoid
# Consistency Findings & Resolution
# Final Assessment
# Implementation Plan
# Proposed Preview Patch
# Approval Needed Before Changes

Be direct.
Be critical.
Prefer the RitmoFit design-system brief over the existing implementation when there is a conflict.
The goal is not to preserve prior work.
The goal is to make this folder the strongest possible RitmoFit design system.
