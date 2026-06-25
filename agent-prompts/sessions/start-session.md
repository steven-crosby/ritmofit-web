# Start-session — orient before writing code (ritmofit-web)

> **INTERACTIVE.** Unlike the `daily/` and `technical/` maintenance prompts, this is a
> co-development prompt: it expects a person in the loop. It plans and asks; it does not
> open unattended draft PRs. Wait for explicit approval before modifying code.

**REPO:** `ritmofit-web`

I'm starting a work session on the web app. Before writing any code:

1. Read this repo's `AGENTS.md` and the live source of truth —
   `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` — to establish current state and the next
   logical slice.
2. Read the relevant schema, API contract (`apps/api/openapi/openapi.json`), and design
   tokens (`ritmofit_design_system/tokens.json`) for the feature we're about to build.
   This backend is the source of truth for both the web and iOS clients, so contract
   changes here ripple to the iOS app.
3. Formulate a concise implementation plan (goal, files likely touched, acceptance
   criteria, any iOS-client impact, rough size) and ask any clarifying questions.

Wait for my explicit approval before writing or modifying code. (Pairs with
`planning/next-slice-planner.md` for the deeper "what's next and what's missing" pass, and
with `sessions/close-session.md` to wrap up.)
