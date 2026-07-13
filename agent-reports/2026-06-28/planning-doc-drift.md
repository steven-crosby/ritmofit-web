---
prompt: planning/doc-drift # the agent-prompt that produced this (path under agent-prompts/)
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-28 # the run date, e.g. 2026-06-26
inspected_head: ba6d6277ab208f29c75546aa56c5d1ad1f8fd03d # remote default-branch head inspected this run
inspected_range: full-repo # changed-code range; use "full-repo" or "n/a" if not applicable
completed: true # true ONLY if the required gate ran and the run finished in-timebox
prs: # PR URLs opened this run; leave empty if none
  []
---

# planning/doc-drift — 2026-06-28

## Summary

Swept the written record (AGENTS.md, AGENTS.md, `agent-prompts/`, and the
`ritmofit_dev_plan/` tree) against the actual repo. The live docs are in good shape:
every Development Command, CI-gate reference, and Project Structure path in AGENTS.md
resolves correctly, and milestone/status markers are consistent across
`DEVELOPMENT_PLAN.md`, `milestones.md`, `HISTORY.md`, and `web-launch-readiness.md` (no
stale "pending"/"next" contradictions). The one clear, in-scope drift was **8 dead
relative links in 4 archived dev-plan docs** — fixed in a docs-only draft PR. One
out-of-scope config observation (lax `engines.pnpm`) is recorded below for the owner; it
is a code/config change, not doc drift, so it was not touched.

## Commands run + results

- `git fetch origin` → default branch `main`, head `ba6d6277` (clean tree)
- Dead-link resolution sweep (`grep` + `realpath -m` per link) → 8 links in
  `ritmofit_dev_plan/archive/` resolved to non-existent paths; all 8 re-verified OK after fix
- `pnpm format:check` → **pass** ("All matched files use Prettier code style"); confirms the
  edited archive tree is `.prettierignore`-excluded and the diff has zero code/build impact
- Heavier gates (typecheck/lint/test/integration/build) not run: the diff is pure markdown
  link-target edits inside a prettier-ignored reference doc tree with no code surface — out of
  scope for this docs-only change.

## Findings

- **[P3] 8 dead relative links in archived dev-plan docs** — `ritmofit_dev_plan/archive/`
  - Evidence: links were written relative to the repo root / `ritmofit_dev_plan/` instead of
    `archive/`:
    - `archive/REVIEW.md:9-10` and `archive/REVIEW_HISTORY.md:6-7`:
      `./ritmofit_dev_plan/{DEVELOPMENT_PLAN,HISTORY}.md` → resolved to
      `archive/ritmofit_dev_plan/...` (dead). Fixed to `../{DEVELOPMENT_PLAN,HISTORY}.md`.
    - `archive/session-prompts.md:4,140`: `./milestones.md` → dead. Fixed to `../milestones.md`.
    - `archive/session-prompts.md:14`: `../AGENTS.md` → resolved to `ritmofit_dev_plan/AGENTS.md`
      (dead; AGENTS.md is at repo root). Fixed to `../../AGENTS.md`.
    - `archive/structclub-parity-audit.md:7`: `./web-ios-parity.md` → dead. Fixed to
      `../web-ios-parity.md`.
  - User impact: anyone navigating the archived pre-launch audit / session-prompt history hits
    broken links; no product impact.
  - Recommended owner: docs (handled this run)
  - Recheck next run? no — all 8 re-resolved OK post-fix.

- **[out-of-scope] `engines.pnpm` is `>=9` while the project pins `pnpm@11.4.0`** — `package.json:9`
  - Evidence: `package.json` has `"packageManager": "pnpm@11.4.0"` and AGENTS.md:80 documents
    "pnpm 11.4", but `engines.pnpm` is `">=9"`, permitting installs with an unsupported pnpm
    major. AGENTS.md itself is **accurate** (it matches the pinned `packageManager`), so this is
    not documentation drift — it is a config laxness in `package.json`.
  - User impact: a contributor on pnpm 9/10 could install without warning and hit
    lockfile/tooling incompatibility.
  - Recommended owner: web/api (tooling). Out of scope for docs-only doc-drift; left for a
    `quality`/tooling pass or owner decision. Not changed this run.

No stale status markers were found: M1–M4 are consistently ✅ across all live planning docs,
Web Launch Readiness is the consistent active phase, and deferred items (featured curation,
explore expansion, teams expansion, custom-move template editing, etc.) are tracked
identically across `DEVELOPMENT_PLAN.md`, `milestones.md`, and `web-launch-readiness.md`.

## Blockers

None. The single in-scope correction was clear and verifiable; no judgment calls required
owner input. The `engines.pnpm` item is a deliberate hand-off (code/config, outside the
docs-only mandate), not a blocker.

## Next recommended action

Review and merge the docs-only draft PR (dead-link fixes in `ritmofit_dev_plan/archive/`).
Separately, consider tightening `engines.pnpm` in `package.json` to `>=11` (or `>=11.4`) to
match the pinned `packageManager` and the documented requirement — best handled by a
`quality`/tooling pass since it touches build config, not docs.
