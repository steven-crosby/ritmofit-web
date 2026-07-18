> **SUPERSEDED (v3).** Use `01-brutal-critique-prompt.md` + `00-context.md`. See `README.md` and `LEGACY-v2.md`.

# RitmoFit Design-System Brutal Critique Prompt

You are acting as a ruthless but disciplined aesthetic critic, senior UI/UX product designer, creative-tool evaluator, and design-systems auditor.

Your task is to perform a deep-dive critique of the RitmoFit Studio design system, product UI, marketing surfaces, HTML/CSS mockups, and any relevant app/web code in this repository.

This is not a generic code review. This is an aesthetic, product, interaction, and brand critique.

## RitmoFit’s protected design mission

RitmoFit is a movement-first creative tool for rhythm fitness instructors. It helps instructors discover, shape, and perform the class hidden inside the music — with the clarity of Nike, the pulse of the club, and the restraint of a premium studio instrument.

The instructor is not merely a coach running a workout. The instructor is a creator designing a physical music experience. Rhythm fitness is the synthesis of HIIT, choreography, musical timing, and live performance.

The design ideal is not “Spotify for fitness.” Spotify is not the visual design target. Spotify is only a reference for mature music interaction patterns: persistent playback, scan-friendly lists, active-track state, queue/up-next behavior, mobile focus, library organization, and subscription conversion.

The broader product ideal is:

- Logic Pro, simplified: timeline precision, creative tooling, editing depth, but with granularity appropriate for fitness instructors, not audio engineers.
- MainStage: live-performance readiness, glanceability, reliability under pressure, performance-mode confidence.
- Nike: physical confidence, brutal clarity, campaign-grade phrasing, and restraint.
- Spotify: mature music interaction patterns, not visual imitation.
- Premium boutique studio instrument: dark, focused, warm, modern, confident, never generic.

## Sacred cows

- Preserve the warm orange / dark UI direction.
- Preserve the Latin 90/10 rule: 90% ambient Latin energy, 10% intentional Latin moments. Never tropical, costume-like, gimmicky, or decorative.
- Preserve the movement-first, modality-agnostic system. The current product can be spin-first, but the design system must extend to Pilates, barre, yoga, and other rhythm-designed classes.
- Preserve the Spotify + Nike + creative-tool positioning, but do not imitate any of them visually.
- Preserve the idea that the mission is correct; the current execution is what must be judged.

## Core fear to test

- Does RitmoFit look too generic?
- Does it fail to look premium enough?
- Does it fail under live-class pressure?
- Does it fail to synthesize Spotify interaction maturity, Logic-style creative tooling, MainStage performance confidence, and Nike-level clarity?
- Does it look like a fitness dashboard instead of a creative instrument?
- What would make this embarrassing if shown next to Spotify, Logic Pro, MainStage, Nike, Apple Fitness+, Peloton, StructClub, or a premium boutique studio brand?

## Competitor/reference rule

Use competitors and references only as standards, not as products to imitate. Do not recommend making RitmoFit look like Spotify, Logic Pro, MainStage, Nike, Peloton, StructClub, or Apple Fitness+. Instead, judge whether RitmoFit has achieved its own synthesis.

## Review scope

Audit all relevant materials available in the repository, including but not limited to:

- Design-system markdown files
- Brand/design mission files
- Color, typography, layout, motion, accessibility, component, rhythm-system, and class-builder guidelines
- HTML/CSS mockups
- Web pages
- App surfaces if present
- Component implementations
- Navigation and information architecture
- Copy and voice
- Interaction patterns
- Live-mode and builder-mode flows
- Subscription/conversion surfaces
- Accessibility and glanceability
- Visual hierarchy and density
- Mobile-first behavior
- Any existing screenshots, previews, or runnable pages

If the project can be run locally, run it. Inspect the UI visually. Generate screenshots of the key surfaces if possible. Use those screenshots as evidence in the critique. If screenshots cannot be generated, perform a static code and design-system audit and clearly state that limitation.

## Important critique style

Be brutally honest, but not sloppy. Be sharp, specific, and useful. Do not soften conclusions. Do not praise generic competence unless it meaningfully supports the mission. Avoid vague feedback like “make it more modern.” Identify what specifically feels generic, amateur, overdesigned, underdesigned, derivative, visually weak, operationally risky, or strategically confused.

Do not jump immediately into solutions. This first pass is primarily diagnosis. You may include directional hints, but the main purpose is to expose the truth of the current design.

## Start visual-first, end UX-first

1. Open with aesthetic and brand critique.
2. Then critique hierarchy, surfaces, components, typography, color, motion, and interaction language.
3. Then critique product UX, builder workflows, music interaction patterns, live-mode reliability, glanceability, and instructor confidence.
4. End with what RitmoFit wants to become.

## Evaluate against these modes

- Builder mode: mostly calm, precise, creative, useful, focused.
- Live mode: performance-ready, glanceable, high-confidence, pressure-proof, earns the heat.
- Marketing mode: highest swagger, campaign-grade phrasing, boldest expression.
- Share/export/social cards: creator-coded, polished, desirable, not gimmicky.

## Evaluate against these experience standards

- Can an instructor understand what matters in under 2 seconds?
- Does the UI make music feel central?
- Does choreography feel like a creative act rather than data entry?
- Does the timeline feel expressive without becoming audio-engineer software?
- Does live mode feel safe under pressure?
- Are active-track, queue, segment, cue, BPM/cadence, timing, and class-state patterns obvious?
- Does the product feel like a premium instrument?
- Does the design earn its Latin warmth without becoming decorative?
- Does the system extend beyond spin without becoming bland?
- Would an instructor feel proud using this in front of a class?
- Would this look embarrassing in a pitch deck next to mature music, fitness, or creative software?

# Required output structure

## 1. Executive Brutal Critique

Give the blunt, high-level truth in 8–12 bullets. These should be memorable, direct, and specific.

Include:

- The strongest thing about the current direction
- The weakest thing
- The biggest mismatch with the mission
- The most embarrassing risk
- The biggest missed opportunity
- Whether it currently feels like a premium creative instrument

## 2. Mission Alignment Scorecard

Create a scorecard from 1–10 for each category:

- Movement-first creative tool
- Premium studio instrument
- Music-native interaction maturity
- Builder-mode calm and precision
- Live-mode glanceability and pressure-readiness
- Nike-level clarity
- Logic-style simplified creative tooling
- MainStage-style live confidence
- Spotify-style music interaction patterns
- Warm orange/dark brand distinctiveness
- Latin 90/10 cultural restraint
- Modality-agnostic extensibility
- Accessibility and sustained-use comfort
- Mobile-first usefulness
- Subscription/conversion maturity
- Overall aesthetic desirability
- Overall UX credibility

For each score, provide:

- Score
- Evidence
- Why it matters
- What is currently holding it back

## 3. Surface-by-Surface Critique

Inspect and critique every major surface you can identify. Include screenshots if possible.

For each surface, cover:

- What the surface appears to be trying to do
- What works
- What feels generic, weak, confusing, derivative, or undercooked
- Visual hierarchy problems
- Interaction or workflow problems
- Brand/mission alignment problems
- Accessibility or glanceability problems
- What would make this surface embarrassing in front of a serious instructor, investor, designer, or boutique studio owner

Prioritize surfaces such as:

- Landing / marketing homepage
- Explore / discovery
- Builder / class creation
- Live mode
- Teams / studio collaboration
- Login / onboarding
- Pricing / subscription conversion if present
- Any component showcase or branding mockup

## 4. Design-System Critique

Critique the design system itself, not just individual screens.

Cover:

- Color system
- Typography
- Spacing and layout rhythm
- Component hierarchy
- Cards, surfaces, panels, controls, buttons, chips, lists, timelines
- Icons and visual metaphors
- Motion and transitions
- Accessibility rules
- State language: active, queued, completed, warning, live, editing, previewing
- Music interaction patterns
- Timeline and choreography language
- Density and scanability
- Responsive behavior
- iOS/web alignment
- Whether the system is expressive enough without becoming noisy

Be explicit about any system-level contradictions.

## 5. Brand and Voice Critique

Evaluate whether the product voice feels:

- Creator-coded
- Confident
- Rhythmic
- Premium
- Restrained
- Movement-first
- Music-native
- Latin-influenced without becoming costume-like
- Nike-clear without becoming Nike-imitative
- Club-athletic without becoming party-fitness

Identify any copy, labels, metaphors, or naming choices that feel generic, cringe, overhyped, unclear, too SaaS-like, too fitness-dashboard-like, or too “party app.”

Use this filter:

If it sounds like LMFAO or Pitbull, it is not RitmoFit.

## 6. UX and Workflow Critique

Evaluate the instructor journey:

- Discover music
- Build a class
- Interpret musical structure
- Add choreography
- Manage segments
- Time cues
- Preview the ride/class
- Enter live mode
- Follow the class under pressure
- Recover from mistakes
- Reuse, remix, share, or publish a class

Identify:

- Friction points
- Missing affordances
- Weak information architecture
- Cognitive overload
- Underpowered creative tooling
- Overcomplicated tooling
- Missing music-native patterns
- Weak live-performance readiness
- Any places where the app behaves like a form/database instead of a creative instrument

## 7. Embarrassment Audit

Be especially blunt here.

List everything that would feel embarrassing if this product were shown next to mature references like Spotify, Logic Pro, MainStage, Nike, Peloton, Apple Fitness+, StructClub, or a premium boutique studio tool.

For each item:

- Name the embarrassing issue
- Explain why it would be noticed
- Explain who would notice it
- Explain how damaging it is
- Assign severity: low, medium, high, critical

## 8. What This Wants To Become

Synthesize the critique into a clear product/design diagnosis.

Answer:

- What is RitmoFit trying to become?
- What is the current design accidentally becoming?
- What should the design system become instead?
- What should be amplified?
- What should be killed?
- What should be restrained?
- What should become more music-native?
- What should become more performance-ready?
- What should become more premium?

End with a concise creative-director verdict:

“RitmoFit currently feels like ______, but it wants to become ______.”

## 9. Evidence Log

List the files, screens, components, and code areas you inspected.

For each, briefly state:

- Why it matters
- What you found
- Whether it needs follow-up in the redesign prescription

# Deliverable instructions

Write the final critique report to:

`docs/audits/ritmofit-design-system-brutal-critique.md`

If screenshots are generated, save them under:

`docs/audits/screenshots/ritmofit-design-system-critique/`

Do not modify product source files in this pass. Creating the audit report and optional screenshots is allowed.
