---
prompt: technical/stability # the agent-prompt that produced this (path under agent-prompts/)
repo: ritmofit-web
agent: <model or agent id>
date: YYYY-MM-DD # the run date, e.g. 2026-06-26
inspected_head: <40-char sha> # remote default-branch head inspected this run
inspected_range: <base>..<head> # changed-code range; use "full-repo" or "n/a" if not applicable
completed: false # true ONLY if the required gate ran and the run finished in-timebox
prs: # PR URLs opened this run; leave empty if none
  []
---

# <prompt> — <YYYY-MM-DD>

## Summary

One short paragraph: what was inspected, the headline outcome, and whether anything needs
the owner's attention today. Lead with the decision.

## Commands run + results

- `<command>` → <pass/fail + key numbers, e.g. "web 180 unit tests pass">
- ...
  Record the full required submission gate when a PR was opened. If the gate could not finish
  in the timebox, say so and list exactly what remains.

## Findings

Rank P0 (ship-blocking / data-loss / auth / live-class) → P3 (minor). For each:

- **[P?] <title>** — `path/to/file.ts:line`
  - Evidence: <what proves it>
  - User impact: <who/what breaks>
  - Recommended owner: <web / api / design / product>
  - Recheck next run? <yes/no>

If nothing PR-worthy or report-worthy was found, say so plainly. Never manufacture findings.

## Blockers

Anything that stopped the run: insufficient evidence, a gate that could not run, a decision
that belongs to the product owner, or work that did not fit the timebox.

## Next recommended action

The single highest-value next step, with enough context to act on it.
