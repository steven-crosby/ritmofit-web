# Design System Masterclass — Implementation Prompt

This is a **special, one-off implementation prompt** (sibling to `design-system-masterclass.md`).

It is designed to be pasted into a fresh agent session to execute refinements from the masterclass report. It is **not** part of the regular scheduled agent-prompt library in `remote-prompts/` or `daily/`.

**REPO:** `ritmofit-web`

**How to invoke:**
Paste this entire file as the first message, then immediately follow with a target such as:

"Implement backlog item 1 from the masterclass report at agent-reports/design-system-masterclass.md."

or

"Implement the highest-priority item."

## Quick Start Checklist (for efficiency)

1. Read the full masterclass report.
2. Read AGENTS.md ("Before Implementing" + gates) + relevant design-system docs.
3. Internalize the Condensed Executive Brief.
4. Identify the target item and quote its exact guidance.
5. Inspect current code state.
6. Output a clear plan.
7. (Interactive) Wait for confirmation before editing.
8. Execute the smallest vertical slice.
9. Run full verification gates.
10. Update docs as required. Summarize what was done.

## Mandatory Pre-Work (read in this exact order)

1. Read the full current masterclass report at:
   `agent-reports/design-system-masterclass.md`

   Note the inspection date and commit. Use the live file for the current backlog wording and details.

2. Read `AGENTS.md` (root) — focus on:
   - "Before Implementing" (inspect → propose plan → wait for confirmation on substantial work).
   - Surface parity (D18) and `ritmofit_dev_plan/web-ios-parity.md`.
   - UI work rules and music constraints.
   - The full CI-equivalent verification gate.

3. Read the design system sources relevant to the target item:
   - `ritmofit_design_system/README.md`
   - The specific docs referenced by the backlog item (e.g. `02-color-system.md`, `04-layout-and-surfaces.md`, `05-components.md`, `07-accessibility.md`, `10-rhythm-system.md`).
   - `tokens.json` (single source of truth).

4. Read the **Condensed Executive Brief** from the masterclass report and treat it as the north star for all decisions:

   > RitmoFit's design system is token-driven, dark-first, rhythm-aware, and deliberately restrained. `ritmofit_design_system/tokens.json` + verify gate + dual emitters are the single source of truth and are currently green. ... Do not invent new tokens or components without updating the 01–11 docs and running `npm run verify` in the design-system package. Protect the pulse rationing and redundant-encoding rules at all costs. When implementing backlog items, prefer the smallest vertical slice that updates the token or recipe layer + one consuming site + verification.

5. Fresh inspection of the target area:
   - `git status -sb && git log --oneline -5`
   - Read the exact files and lines cited in the chosen backlog item.
   - Run targeted searches for related patterns.
   - Check open PRs and any recent related reports.

## Core Rules

- **Protect what is excellent.** Do not modify pulse logic (`.rf-beat-pulse*`, `.rf-drop-bloom`, `--rf-beat`), the copper/cyan/plasma channel discipline, redundant encoding patterns, or the core rhythm system unless the specific backlog item explicitly requires it.
- **Plan first, then act.** Before any code change, produce a plan that covers:
  - Goal and files affected
  - Schema / contract / parity impact
  - Frontend impact, risks, and open questions
  - Exact verification steps
- For interactive sessions: output the plan and **stop**. Do not edit until you receive explicit confirmation.
- One backlog item (or one clearly bounded sub-task) per focused effort.
- Tokens are the source of truth. Edit `tokens.json` when appropriate. Never hand-edit generated files (`tokens.css`, `RFTokens.swift`, `mockups/theme.css`).
- Always run the required gates before considering work complete (see Verification section below).
- Update the corresponding design system documentation (`01-11*.md`) or dev-plan trackers when a decision is made.
- Stay strictly inside the masterclass backlog. Unrelated findings go in your summary only.

## Backlog Items

The masterclass report contains a numbered Implementation Backlog. Always quote the full relevant item (problem + scope + guidance + verification + parity note) at the beginning of your plan.

Current items (re-read the live report for precise current text):

1. P0/Launch — Add semantic scrim token and route the Dialog backdrop through it (see `Dialog.tsx:121` and tokens guidance).
2. P1/Launch — Standardize empty & loading states across core surfaces with a consistent pattern.
3. P2/Post-launch — Expand the documented component state matrix (05) with a reality audit and tests.
4. P2/Polish — Perform light theme glass + Live visual + contrast spot-check.
5. P3/Polish — Decide on (or document the absence of) a first-class loading skeleton affordance.
6. P3/Polish — Strengthen aria live regions for Live cue advancement and timeline.

If the item requires an owner-level design decision (e.g. the exact scrim token value), surface the decision clearly.

## Execution Workflow

1. Confirm the target item from the user.
2. Quote the item's full guidance from the masterclass report.
3. Produce a plan using the structure required by AGENTS.md "Before Implementing".
4. (Interactive) Pause and wait for confirmation.
5. Implement the smallest effective vertical slice:
   - Prefer changes to `tokens.json` + recipes + one or two consuming components + tests + documentation.
   - For token changes: edit `ritmofit_design_system/tokens.json`, then regenerate with `cd ritmofit_design_system && npm run build:all` (mockups) **and** `pnpm --filter @ritmofit/web tokens` (or full web build).
6. Run verification (capture output):
   ```bash
   cd ritmofit_design_system && npm run verify
   pnpm format:check
   pnpm -r typecheck
   pnpm lint
   pnpm test
   pnpm --filter @ritmofit/api test:integration
   pnpm --filter @ritmofit/web build
   pnpm --filter @ritmofit/api openapi
   git diff --exit-code apps/api/openapi/openapi.json
   pnpm audit:ci
   ```
   Plus any item-specific checks called for in the backlog item.
7. Summarize what was changed, why, risks, and verification performed. If remote, produce a clear report artifact.

## Verification & Quality Gates (mandatory)

- Design system `verify` must pass cleanly for both themes.
- The complete AGENTS.md CI-equivalent gate listed above.
- Visual / rendered confirmation for UI changes (at least via build output or dev server; smoke scripts where relevant).
- Explicit parity note.
- No failing gates.

## Scope & Efficiency Controls

- One item per session.
- Use the smallest change that fully satisfies the item.
- Use `todo_write` (or equivalent structured tracking) for the steps of this task.
- Document any evidence gaps honestly.
- If the item requires a decision the owner has not yet made, stop and report the exact question.

## How to Know the Item Is Complete

- The exact problem described in the backlog item is resolved in the code and docs.
- All verification steps for that item pass.
- Relevant `ritmofit_design_system/` documentation has been updated where needed.
- A clean summary exists (and a narrow diff if changes were made).

**Start by reading the full masterclass report.**

Protect the strengths of the existing A- design system. Improve only what the report identifies as needing refinement.