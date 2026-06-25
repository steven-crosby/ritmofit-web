# Close-session — wrap up a work session (ritmofit-web)

> **INTERACTIVE.** Co-development prompt, not an unattended maintenance run. It works the
> checklist top-to-bottom, runs the checks itself, and pauses at the **owner-decision** points
> (commit/stash/discard, merge/close PRs, deploy).

The full close-session runbook is **canonical inside this repo** — kept there so it tracks
the actual deploy model, branch protection, and verification gates. This pointer is not the
checklist; run the repo-local file:

- `ritmofit-web/ritmofit_dev_plan/close-session-checklist.md`
  (web `main` requires PRs as of 2026-06-23 — direct push is rejected, docs included; deploys
  are manual).

Invoke by telling the agent "run the close-session checklist" from inside this repo.
(Pairs with `sessions/start-session.md` to open the session.)
