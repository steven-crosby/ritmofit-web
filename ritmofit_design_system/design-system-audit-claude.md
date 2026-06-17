Act as a senior product designer, design systems architect, frontend engineer, accessibility reviewer, and ruthless pre-launch critic.

Your mission:
Compare TWO competing RitmoFit design-system folders head-to-head, judge them against the governing brief and non-negotiable rules below, and synthesize a single merged folder that is the strongest possible RitmoFit design system. Pick the best file, token, component, and idea from each source — do not preserve either system wholesale, and do not invent a muddy compromise. Prompt me questions as needed for focus and clarity.

The two systems under comparison:
- `claude-ritmofit-design-system/` — Source A (built by Claude).
- `gemini-ritmofit-design-system/` — Source B (built by Gemini).

Each folder is expected to be a full design system in the same shape: a governing `ritmofit-design-system.md`, numbered spec docs (e.g. 01–11), `tokens.json`, CSS variables / theme files (e.g. `mockups/theme.css`), HTML surfaces (`preview.html`, branding mockup, and everything under `mockups/`), and iOS token output (e.g. `ios/`). Do not assume the two folders are structurally identical — note where one has surfaces, specs, or tokens the other lacks.

Synthesis target:
- Produce one merged winner folder: `ritmofit-design-system-claude/` (sibling to the two sources). Adjust the name if I tell you otherwise.
- For every file, token, component, and decision, the winner folder takes the stronger source — or a deliberate graft of both — and traces back to the governing brief and the non-negotiable rules.
- Do NOT write the winner folder until I approve the synthesis plan (Phase 6) and the preview patch (Phase 7).

The governing authority for BOTH systems and for the synthesis is the RitmoFit brief and non-negotiable rules below. When either folder's `ritmofit-design-system.md`, tokens, or mockups conflict with these rules, these rules win.

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

Your job is to determine which system is the stronger base, what must be grafted from the other, and how to assemble a coherent, shippable, merged RitmoFit design system for web and iOS.

Before building anything, perform the audit below. Treat the two folders even-handedly: do not favor either source by default, and do not flatter either body of work.

PHASE 1 — Discover and map both folders

Inspect `claude-ritmofit-design-system/` and `codex-ritmofit-design-system/` and build a parallel inventory. For EACH folder, identify:
1. The governing authority (`ritmofit-design-system.md`) and its scope.
2. The numbered spec docs and what each governs.
3. The token source(s) — `tokens.json` and any CSS variables / theme files (e.g. `mockups/theme.css`).
4. The HTML surfaces (`preview.html`, branding mockup, and everything under `mockups/`).
5. The iOS token output (e.g. `ios/`) and any build scripts.
6. Which files define or render:
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

Then produce a coverage map: a side-by-side table of what each folder contains. Call out:
- surfaces, specs, components, or tokens present in one folder but missing in the other
- where the two folders structure the same concept differently (different file boundaries, different token architecture, different naming)
- the maturity/completeness of each folder relative to the brief

Also surface every consistency defect WITHIN each folder (so a winner is not chosen on a broken base):
- token values that disagree between `tokens.json`, `mockups/theme.css`, and the .md specs
- duplicated or divergent token definitions
- hardcoded colors/radii/font values that should reference tokens
- conflicting surface styles across HTML mockups
- HTML that contradicts the .md spec it is supposed to demonstrate
- .md specs that describe components not present in the mockups (or vice versa)
- dead or unused styles/tokens
- inconsistent component variants across mockup pages
- places where the implementation contradicts the RitmoFit brief or the non-negotiable rules above

PHASE 2 — Interpret each system

For EACH folder separately, summarize:
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

Be blunt about both. Do not flatter either system.

PHASE 3 — Comparative scorecard

Score BOTH systems from 1–10 on each criterion below, side by side, and declare a per-row winner (A, B, or Tie). This is a head-to-head comparison, not two isolated scorecards.

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

For each row, provide:
- score A and score B
- the winner (A / B / Tie)
- evidence from specific files/components in each folder
- why the gap exists

Close Phase 3 with:
- total scores
- the per-dimension win count for each system
- a one-paragraph read on which system is the stronger overall base and why

PHASE 4 — Category-by-category resolution

For each category below, state: the current approach in Folder A, the current approach in Folder B, where they disagree, and the single canonical answer the merged system should converge on. For each, name the source of the winning decision (A, B, a graft of both, or a new value the brief demands) and justify it.

The governing brief wins ties; the non-negotiable rules override any mockup or token in either folder that contradicts them.

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
Choose the stronger approach decisively, or graft a clearly better part of one onto the other only when the result is more intentional than either original. Every resolved decision must feel opinionated and trace back to the governing brief and the non-negotiable rules.

PHASE 5 — Verdict: base and grafts

Give one clear verdict:

1. Which folder is the stronger base for the merged system (A or B), and why.
2. The specific, high-value parts that must be grafted from the other folder (name files/components/tokens).
3. The parts of BOTH folders that should be discarded outright.
4. The risk level of the synthesis (low/medium/high) and the main implementation risks.

Justify with direct reference to:
- RitmoFit’s brand truth
- Builder mode needs
- Live mode needs
- marketing needs
- token maintainability
- cross-file consistency (HTML ↔ .md ↔ tokens)
- accessibility
- implementation risk

PHASE 6 — Synthesis plan (build the winner folder)

Create a practical, staged plan to assemble the merged winner folder `ritmofit-design-system-claude/` (or the name I specified). Break it into small, reviewable commits.

The plan must include:
1. Scaffold the winner folder from the stronger base (Phase 5), file by file.
2. Token consolidation — single source of truth across `tokens.json`, `mockups/theme.css`, the specs, and iOS output, reconciling A and B token architectures into one.
3. Color-channel enforcement (copper/cyan/plasma discipline).
4. Typography / data typography unification.
5. Surface and layout system selection and cleanup.
6. Component refactors and the grafts identified in Phase 5.
7. Builder-mode hierarchy.
8. Live-mode glanceability.
9. Energy ribbon / class-shape treatment.
10. Copy/voice unification.
11. Accessibility and reduced-motion.
12. Responsive QA.
13. Reconciling the .md specs with the HTML mockups so they agree within the merged folder.
14. Final cleanup of dead/conflicting styles and tokens carried over from either source.

For each step, list:
- source(s) the content comes from (A, B, or new), and the destination file in the winner folder
- risk level
- expected visual impact
- how to verify success

Also produce a file-level synthesis manifest: a table mapping each file in the winner folder to its origin (copied from A, copied from B, merged A+B, or newly authored) with a one-line rationale.

PHASE 7 — Preview patch proposal only

Do not write the winner folder yet.

First propose the smallest coherent patch that would preview the synthesized system on one representative page or component set (e.g. one file under `mockups/` in the new winner folder).

The preview should demonstrate:
- centralized tokens
- copper/cyan/plasma discipline
- data typography
- the chosen surface system
- one primary CTA
- accessible focus states
- reduced-motion compliance
- creator-first RitmoFit copy
- at least one energy-ribbon/class-shape treatment if relevant to the page

Show, for the preview, which decisions came from A, from B, or are new.

Wait for approval before creating the winner folder or applying any changes.

Output format:

Use these headings exactly:

# Executive Summary
# Folder Discovery & Coverage Map
# System Interpretation (A vs B)
# Comparative Scorecard
# Strengths to Keep (from each system)
# Weaknesses to Avoid (from each system)
# Category-by-Category Resolution
# Verdict: Base & Grafts
# Synthesis Plan
# File-Level Synthesis Manifest
# Proposed Preview Patch
# Approval Needed Before Changes

Be direct.
Be critical.
Treat both folders even-handedly; decide on merit, not authorship.
Prefer the RitmoFit design-system brief over either implementation when there is a conflict.
The goal is not to preserve either folder.
The goal is to synthesize the strongest possible RitmoFit design system from the best of both.
