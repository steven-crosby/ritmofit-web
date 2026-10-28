---
# Copy to ritmofit_dev_plan/handoffs/YYYY-MM-DD-<lane-slug>.md and fill every field.
# Rules: ritmofit_dev_plan/handoffs/README.md. Only the authoring session edits this file.
date: YYYY-MM-DD # absolute date of the session close
tool: '' # e.g. Claude Code (cloud), Codex (local), Cursor
lane: '' # solo | lane-<N>-<cluster> | orchestrator
branch: ''
head: '' # SHA of the last work commit before this handoff commit (a file cannot hold its own commit's SHA), or n/a
base: '' # origin/main SHA the branch was last synced with
prs: [] # e.g. ['#491 (draft)', '#492 (merged)']
status: open # open = its restart context still matters; closed = nothing owed
---

# <one-line outcome of the session>

## Done

- What landed (PRs merged, commits, docs records). Link PRs; no narration.

## Tasks

- Relevant RF IDs and links to canonical task records. Keep mutable status, acceptance and the next
  action in the records; this handoff adds session restart context and dated observations.

## In flight

- Anything started and not finished: branch, PR, what remains, how to resume.
- "None" when nothing is in flight.

## Restart context

- The next action, owner decisions and blockers live in the RF records above, not here. Add only
  what a successor needs that a record cannot hold: unfinished branch state, a device check in
  flight, a dated observation, where you stopped and why.

## Verification

- Run: commands and results (pass/fail, counts).
- Skipped: each gate not run, and why.

## Production as observed

- `main` vs production: aligned / main ahead (name the undeployed PRs) / unknown.
- Evidence: Worker version and served SPA entry hash when checked, or "not checked from this
  environment" — never inferred from docs alone.

## Shared zones touched

- Frozen/coordinate zones edited (shared schemas, OpenAPI, route mounting, migrations,
  authz/auth/db/errors helpers, `Dashboard.tsx`, styles), or "none".

## Notes for other lanes / iOS

- Contract or design implications another lane or the iOS repo must know about, or "none".
