# Codex Studio Design Critique & Redesign - Invocation Guide

> **Location:** `agent-prompts/codex design critique/`

This prompt set runs a two-stage, read-only design evaluation of **RitmoFit Studio**,
defined here as the **whole web app**: auth, marketing, dashboard, builder,
choreography editor, library, explore, sharing, dialogs, and live class mode.

It evaluates both:

- the design system docs, tokens, recipes, components, and mockups; and
- the actual shipped Studio screens in the running web app, using screenshots and
  visual inspection.

The north star is a synthesis of:

- **Spotify** - music-library polish, speed, cultural fluency, browsing pleasure.
- **Apple Logic Pro** - professional creative-workstation poise, density,
  precision, and timeline confidence without DAW-level complexity.
- **Apple MainStage** - live-performance confidence, glanceability, state clarity,
  and stage-readiness under pressure.

The intended tone is **brutal internal design review**: candid, specific, and
evidence-backed. Do not soften findings for diplomacy.

## The two stages

1. `studio-aesthetic-critique.md`
   - Produces `agent-reports/studio-aesthetic-critique.md`.
   - Performs the high-level brutal critique.
   - Must inspect docs, tokens, components, mockups, and real running screens.
   - Must capture or reference screenshots.
   - Must not prescribe a ranked redesign yet.

2. `studio-redesign-prescription.md`
   - Produces `agent-reports/studio-redesign-prescription.md`.
   - Consumes the Stage 1 report.
   - Produces a ranked redesign prescription.
   - Must rank ruthlessly and sequence work by leverage.
   - Must not implement.

Run them in order. Stage 2 depends on Stage 1.

## Recommended local setup for real pixels

From `/Users/stevencrosby/Repos/RitmoFit/ritmofit-web`:

```bash
pnpm install --frozen-lockfile
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
MOCK_PROVIDERS=true pnpm dev:api
pnpm dev:web
```

Expected URLs:

- API Worker: `http://localhost:8787`
- Web app: `http://localhost:5173`

Use Codex browser tooling when available:

- in-app browser / browser control for navigation and screenshots;
- Chrome tooling if the task depends on an existing Chrome state;
- Playwright smoke scripts under `apps/web/smoke/` as a fallback.

If a state cannot be reached, the agent must say exactly what blocked it and
critique that surface from mockups plus code instead.

## Deliverables

Reports go under `agent-reports/`, not in this prompt folder.

Both stages are read-only:

- no source edits;
- no token edits;
- no design-doc edits;
- no CSS edits;
- no implementation branches;
- no product PRs.

The only durable output should be the report file for the stage.
