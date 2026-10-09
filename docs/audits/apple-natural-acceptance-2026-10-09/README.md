# Apple Music natural acceptance — 2026-10-09

Status: fixtures prepared; playback not started. Human listener availability is pending.

## Release binding

Current deployed baseline is #494, recorded source `e712274f8b0add74755bc97accff42f44405260f`, Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100%, SPA `assets/index-mZ1ypG4t.js`. The UX changes #503/#504 are merged on main but are not in this production build. Confirm live identities again before each attended run.

## Fresh fixture receipt

The owner authorized fresh production fixtures as part of the acceptance sequence. These were created through the authenticated application's Apple Music saved-playlist flow from the currently browsed **Ritmo Apple Music Test** playlist; ten tracks imported per class. Each was immediately renamed and tagged `qa-fixture` before playback. Existing instructor classes and the source playlist were preserved. This proves browse/import/setup, not playback.

| Discipline | Name                                             | Class ID                             | Displayed duration | Tag        | Run result  |
| ---------- | ------------------------------------------------ | ------------------------------------ | ------------------ | ---------- | ----------- |
| Cycle      | [QA] Apple natural acceptance 2026-10-09 Cycle   | 14849c7a-54ca-491d-8eea-c6fab47183d0 | 39:50              | qa-fixture | Not started |
| Pilates    | [QA] Apple natural acceptance 2026-10-09 Pilates | 15547331-f97b-45ce-ae2c-78fbc6d2f7e0 | 39:50              | qa-fixture | Not started |

The UI/DOM receipt is in `fixtures.json`. The displayed duration is rounded; no SDK duration or audio observation is inferred. Both classes retain source order and have no authored choreography; readiness attention for missing BPM/cues does not block the existing Run live path.

## Attended procedure and verdict

Authorize Apple Music in the actual browser through its explicit preflight control, then press Start once. Run naturally through every transition and final completion; no accelerated seeks, shortening, skip, or prompter substitution counts as natural acceptance. Retain sanitized UI/provider positions, transition timestamps, final state, and the human listening verdict. On a failure, retain the held state and recovery evidence and report the run as failed or incomplete rather than making it pass by transport input.

Human listening confirmation is required for audible acceptance. SDK progress, import success, browser indicators, and automated gates cannot provide it. Actual iPhone Safari acceptance follows desktop completion and requires its own real-device evidence.

Both fixtures remain retained. Fixture deletion is a separate owner decision under `ritmofit_dev_plan/prod-fixture-hygiene.md`.
