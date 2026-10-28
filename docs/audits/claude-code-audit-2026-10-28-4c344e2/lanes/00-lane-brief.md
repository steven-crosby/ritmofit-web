# Common lane brief

You are one specialist lane in an adversarial, audit-only engineering review of ritmofit-web at
commit 4c344e2 (main). Repo checkout: /home/user/ritmofit-web. Audit package:
docs/audits/claude-code-audit-2026-10-28-4c344e2/ (call it $A).

Read first: AGENTS.md, CLAUDE.md (architecture map), and $A/lanes/00-known-issues.md (findings from the
prior audit at 4e0b150 and open RF tasks — do NOT re-report these as new; only report a known item if
you find a materially new trigger, higher impact, or that it was fixed/its status is wrong, and cite its ID).
The prior audit's lane files in docs/audits/codex-code-audit-2026-10-27-4e0b150/lanes/ hold long forms and
rejected leads — check them before filing.

HARD RULES
- Do not edit any tracked file in /home/user/ritmofit-web. Write ONLY: your lane file $A/lanes/<lane>.md,
  and files under $A/repro/<lane>-* and $A/evidence/<lane>-*.
- No commits, pushes, PRs, labels, RF record changes, network calls to production or third-party APIs.
- To run code: create your own disposable worktree:
  git -C /home/user/ritmofit-web worktree add --detach /tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-<lane> 4c344e2 && cd /tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-<lane> && pnpm install --frozen-lockfile
  Copy repro tests into that worktree to run them; keep the canonical copy in $A/repro/. Do NOT run
  the Playwright e2e smoke or the full gate (the lead runs it). Targeted vitest runs are fine
  (see CLAUDE.md "Running a subset of tests"). Integration config: apps/api/vitest.integration.config.ts.
- Never print or copy secrets/tokens/env values.

EVIDENCE BAR: fewer, stronger findings. Executable code, tests, CI, data. Not doc wording. Not style.
Leads (TODOs, big files) are not findings. A missing test alone is not a defect. Prefer a runnable
reproduction (vitest test in $A/repro/) for each credible defect; otherwise a precise code-path trace
with verified file:line references.

OUTPUT: write $A/lanes/<lane>.md incrementally (save early, update as you go) containing:
1. Scope covered with depth per area (traced / tested / sampled / not assessed).
2. Candidates, each with: lane ID (e.g. A-01), title, category, proposed severity (P0-P3) with rationale,
   confidence, status (confirmed/probable/hypothesis/rejected), file:line refs, trigger/preconditions,
   expected vs observed, impact, evidence (repro path + command + result), existing test coverage and why
   it misses, counterevidence considered, smallest remediation direction (do not implement), fix check,
   known status (new / extends <ID>), whether a fix touches owner-gated paths (scripts/owner-gate.mjs),
   whether verification needs a real browser/device.
3. Rejected leads (briefly, so they are not re-filed).
4. Gaps you did not cover.
Your final message: a compact summary table of candidates (ID, sev, status, one line) and the path to
your lane file. Be thorough — do not stop after a few findings — but do not pad.
