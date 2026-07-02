# Codex Agent Prompt: RitmoFit Pattern-Based Design Evaluation

You are evaluating the RitmoFit web app design system and rendered HTML outputs.

Your job is not to redesign the product from scratch. Your job is to perform a structured design evaluation using Spotify and adjacent apps as pattern references, not visual targets.

## Core Principle

Spotify is not the design target.

Spotify is a mature reference for music interaction patterns: persistent playback, track-list density, active item state, queue/up-next behavior, mobile now-playing focus, library organization, and subscription conversion.

RitmoFit must remain its own product: a rhythm-fitness authoring and live-teaching tool for instructors. It should feel music-first, rhythmic, polished, warm, athletic, instructor-focused, and creation-oriented.

Do not recommend copying Spotify’s visual identity.

Do not copy:
- Spotify green
- exact Spotify card styling
- exact spacing
- exact navigation layout
- exact player controls
- exact consumer-discovery hierarchy
- brand-specific visual identity

Extract principles only.

## Files to Inspect

Inspect the current project files, especially:

- `README.md`
- `01-design-principles.md`
- `02-color-system.md`
- `03-typography.md`
- `04-layout-and-surfaces.md`
- `05-components.md`
- `06-motion.md`
- `07-accessibility.md`
- `08-ios-web-alignment.md`
- `09-class-builder-guidelines.md`
- `10-rhythm-system.md`
- `theme.css`
- `builder.html`
- `live.html`
- `index.html`
- `explore.html`
- `login.html`
- `teams.html`

Also inspect any provided reference screenshots and annotations in the design-reference-kit folder.

## Evaluation Method

Evaluate RitmoFit against these pattern categories:

1. Persistent playback / class controls
2. Dense playlist and choreography scanning
3. Current / next / completed state clarity
4. Queue, up-next, and upcoming cue visibility
5. Builder mode versus live mode separation
6. Mobile glanceability and thumb navigation
7. Library / template / class organization
8. Pricing, onboarding, and marketing conversion
9. Rhythm-fitness identity
10. Accessibility, redundant encoding, and low-fatigue dark mode

## Required Report Format

Create a markdown report with these sections:

# RitmoFit Pattern-Based Design Evaluation

## Executive Summary

Summarize whether RitmoFit currently feels like a premium rhythm-fitness authoring tool, where it is strong, and where it needs refinement.

## What RitmoFit Should Borrow as Principles

List useful interaction principles from Spotify and adjacent references.

## What RitmoFit Must Avoid Copying

List visual or product assumptions that would make RitmoFit too derivative or less useful.

## Builder Mode Evaluation

Evaluate `builder.html` as a planning and choreography-authoring surface.

Cover:
- playlist density
- segment structure
- cue hierarchy
- track metadata
- editing affordances
- rhythm timeline clarity
- complexity ceiling
- scan speed
- instructor workflow

## Live Mode Evaluation

Evaluate `live.html` as an instructor-facing performance surface.

Cover:
- current state clarity
- next cue visibility
- persistent controls
- timing / countdown hierarchy
- low cognitive load
- glanceability
- color discipline
- motion discipline
- accessibility

## Marketing / Website Evaluation

Evaluate `index.html`, `explore.html`, `login.html`, and `teams.html` where relevant.

Cover:
- brand confidence
- conversion clarity
- premium polish
- music-first positioning
- instructor-specific messaging
- visual consistency with the product UI

## Design System Alignment

Evaluate whether implementation aligns with the RitmoFit design system.

Pay special attention to:
- dark-mode surfaces
- reserved color channels
- cyan / copper / plasma usage
- redundant encoding
- typography scale
- spacing and surface rhythm
- motion principles
- accessibility requirements
- iOS/web alignment

## Specific Findings

Create a table with:

| Area | Finding | Severity | Why it matters | Recommended action |
|---|---|---|---|---|

Use severity:
- Critical
- High
- Medium
- Low
- Polish

## Concrete Recommendations

Provide specific changes to improve the current implementation. Separate recommendations into:

1. Immediate fixes
2. Next iteration improvements
3. Larger design-system opportunities

## Do Not Do List

List recommendations that should explicitly not be pursued because they would violate RitmoFit’s identity or design system.

## Final Verdict

Answer:

- Does RitmoFit feel premium?
- Does it feel music-first?
- Does it feel instructor-specific?
- Does it avoid becoming a Spotify clone?
- What are the top 3 changes that would most improve the product?

## Constraints

Be specific. Reference actual files and UI areas.

Do not give vague design advice.

Do not recommend copying Spotify’s colors or brand style.

Do not assume hue alone can carry meaning.

Preserve RitmoFit’s design identity: creating, not consuming; rhythmic, not generic; instructor-first, not listener-first.
