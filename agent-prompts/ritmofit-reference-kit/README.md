# RitmoFit Design Reference Kit

## Purpose

This kit is meant to help evaluate RitmoFit’s design using Spotify as a mature interaction-pattern reference, not as a visual target to copy.

The goal is not to make RitmoFit look like Spotify. The goal is to extract useful design principles from a world-class music product and compare those principles against RitmoFit’s own builder and live-class experiences.

## Core Position

Spotify is not the design target.

Spotify is a reference for mature music interaction patterns: persistent playback, scan-friendly lists, active-track state, queue/up-next behavior, mobile focus, library organization, and subscription conversion.

RitmoFit must remain its own product: a rhythm-fitness authoring and live-teaching tool for instructors. It should feel music-first, rhythmic, polished, warm, athletic, and instructor-focused — not like a consumer music-discovery clone.

## How to Use This Kit

1. Capture the recommended pattern screenshots yourself from Spotify web and mobile.
2. Rename each screenshot using the filenames in `02-reference-manifest.csv`.
3. Drop Spotify screenshots into `01-spotify-pattern-references/`.
4. Drop adjacent-category screenshots into `02-adjacent-category-references/`.
5. Add RitmoFit rendered screenshots of `builder.html` and `live.html` into `03-ritmofit-current-screens/`.
6. Fill in the annotation fields in `03-annotation-template.md` or use the examples in `04-agent-input/reference-index.md`.
7. Give the full folder to Codex or another design agent with `04-agent-input/codex-agent-prompt.md`.

## Important Guardrail

Do not ask the agent to imitate Spotify’s visual identity.

Specifically, do not copy:
- Spotify green
- exact card styling
- exact spacing system
- exact navigation layout
- consumer discovery-first hierarchy
- brand-specific iconography
- promotional visual language

Instead, ask the agent to evaluate RitmoFit against functional patterns:
- Is the current state obvious?
- Is the next action clear?
- Is dense information scannable?
- Does live mode reduce cognitive load?
- Does builder mode support creation without becoming overly complex?
- Are color channels reserved and meaningful?
- Is meaning redundantly encoded beyond hue alone?
