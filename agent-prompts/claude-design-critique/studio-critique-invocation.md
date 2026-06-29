# Studio Critique & Redesign — Invocation Guide

> **Location:** `agent-prompts/claude-design-critique/` — this guide plus the two
> stage prompts (`studio-aesthetic-critique.md`, `studio-redesign-prescription.md`).

A two-stage, read-only design evaluation of **RitmoFit Studio** (the whole
creator app: Builder + Live + Library + Dashboard, with Auth/Marketing/Share as
supporting surfaces). It judges the studio against its stated ideal — a synthesis
of three north stars: **Spotify** (consumer polish), **Logic Pro** (pro
precision/poise, *not* DAW granularity), and **MainStage** (live-performance
instrument). A motivational/energy lens (e.g. Peloton) is intentionally out of
scope for this launch-readiness pass — establish these three first.

Companion to `design-system-masterclass.md`, but a different job: the masterclass
audits compliance and engineering hygiene; this pair audits **taste, craft, and
experiential quality** and prescribes a ranked redesign.

## The two stages

1. **`studio-aesthetic-critique.md`** → emits
   `agent-reports/studio-aesthetic-critique.md`.
   A brutal, evidenced aesthetic/UX critique grounded in real screenshots
   (shipped) compared against the mockups/docs (intended). Ends with a handoff
   brief for Stage 2.
2. **`studio-redesign-prescription.md`** → emits
   `agent-reports/studio-redesign-prescription.md`.
   Consumes Stage 1 and produces a ranked, sequenced redesign roadmap.

**Run them in order.** Stage 2 depends on Stage 1's report existing. Review the
Stage-1 report yourself before launching Stage 2 — your reaction to the critique
is useful steering input.

## Prereqs for real pixels (Stage 1, and optionally Stage 2)

The critique is only as good as what the agent can see, so give it a running app:

```bash
# Two terminals, mock providers on, local DB migrated + seeded:
MOCK_PROVIDERS=true pnpm dev:api          # Worker → http://localhost:8787
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
pnpm dev:web                              # Vite → http://localhost:5173
```

Then the agent captures screenshots via one of:

- **Chrome DevTools MCP** (preferred): `navigate_page`, `take_screenshot`,
  `take_snapshot`, `resize_page`, `emulate` (reduced-motion / color-scheme),
  `click`/`fill` to reach populated states.
- **Playwright smoke harness** (fallback): the scripts under `apps/web/smoke/`
  already sign up a throwaway user, build a class, and open dialogs; shots land
  in `apps/web/smoke/shots/`. Playwright is intentionally not a repo dep — install
  once and point at it:
  ```bash
  mkdir -p /tmp/rf-smoke && (cd /tmp/rf-smoke && npm i playwright && npx playwright install chromium)
  PLAYWRIGHT_BASE=/tmp/rf-smoke/package.json node apps/web/smoke/functional.smoke.mjs
  ```

If the agent cannot reach a state, it must say so and critique from the mockup +
code for that surface.

## How to launch

Spawn each stage as its own agent (a strong general-purpose / design-capable
agent with browser + bash + read tools; Chrome DevTools MCP available if you want
live pixels). Paste the contents of the stage prompt as the task. Stage 1 first;
when its report lands and you've read it, launch Stage 2.

## Reports & house rules

- Both stages are **read-only**: no source/token/doc/CSS/mockup edits, no product
  PRs.
- Reports land at the `agent-reports/` root (not under a dated subfolder),
  matching the `design-system-masterclass` precedent. Re-runs get a date/version
  suffix to preserve history.
- On an unattended remote run, push a branch containing only the report(s);
  locally, commit the report cleanly into `agent-reports/`.

## Files in this set

- `studio-aesthetic-critique.md` — Stage 1 prompt (brutal critique).
- `studio-redesign-prescription.md` — Stage 2 prompt (ranked redesign).
- `studio-critique-invocation.md` — this guide.

The reports the agents produce go to `agent-reports/` (root), **not** here.
