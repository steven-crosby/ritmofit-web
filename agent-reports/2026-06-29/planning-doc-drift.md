---
prompt: planning/doc-drift # the agent-prompt that produced this (path under agent-prompts/)
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-29 # the run date, e.g. 2026-06-26
inspected_head: d2b7b4f7cd6db1522f99f960bec935509aaf9d79 # remote default-branch head inspected this run
inspected_range: full-repo # changed-code range; use "full-repo" or "n/a" if not applicable
completed: true # true ONLY if the required gate ran and the run finished in-timebox
prs: # PR URLs opened this run; leave empty if none
  []
---

# planning/doc-drift — 2026-06-29

## Summary

Swept the written record (AGENTS.md, CLAUDE.md, `README.md`, the `agent-prompts/` library, and
the `ritmofit_dev_plan/` tree) against the actual repo at `main` head `d2b7b4f`. **No new
docs-only PR was opened, by design.** The one clear, in-scope drift I found — a dead relative
link to `ios-snapshot/` in `agent-prompts/remote-prompts/technical/api-contract-parity.md` — is
**already fixed, character-for-character, in open draft PR #147** ("[codex] Clean up launch
process guidance"). That same PR also resolves the `engines.pnpm` config laxness the
**2026-06-28** doc-drift run handed off as out-of-scope. Opening anything here would duplicate
in-flight work (house-rules §7), so this run is **report-only**: confirm the open PR carries the
fix, surface one genuinely-new low-priority observation (a newly-added prompt directory not yet
in the `agent-prompts/README.md` catalog — a taxonomy judgment call for the owner), and
recommend merging #147. Everything else verified consistent.

## Commands run + results

- `git fetch origin` → default branch `main`, head `d2b7b4f7cd6db1522f99f960bec935509aaf9d79`
  (clean tree; branch at parity with `origin/main`).
- AGENTS.md **Development Commands + CI gate** cross-check vs `package.json` script tables (root
  / `apps/api` / `apps/web`) → **all resolve**: `dev:api`, `dev:web`, `build`, `typecheck`,
  `lint`, `format`/`format:check`, `test`, `audit:ci` (root); `test:integration`, `openapi`,
  `deploy`, `db:migrate:local`, `db:seed:local`, `contract-parity` (api); `build`, `tokens`
  (web). The `audit:ci` doc reference to `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`
  resolves (line 35).
- AGENTS.md **Project Structure** path check → **all 14 paths exist** (`apps/web/src/*`,
  `apps/api/src/*`, `apps/api/migrations`, `apps/api/test`, `packages/shared`, `packages/music`,
  `ritmofit_design_system`, `ritmofit_dev_plan`, `INBOX.md`, `apps/api/openapi/openapi.json`).
- **Dead relative-link sweep** across every tracked `*.md` (`grep` link targets + `realpath -m`
  existence) → exactly **1 dead link**: `agent-prompts/remote-prompts/technical/api-contract-parity.md:12`
  → `../../ios-snapshot/` (file is 3 levels deep; needs `../../../`). **Already fixed in PR
  #147.** The 8 archived-doc dead links fixed by the 2026-06-28 run were re-verified present and
  resolving on `main`.
- **Milestone/status consistency** across `DEVELOPMENT_PLAN.md`, `milestones.md`, `HISTORY.md`,
  and `web-launch-readiness.md` → **consistent**: M1–M4 uniformly ✅, "Web Launch Readiness"
  the single active phase; no "pending" item that has actually merged and no "next" item already
  done.
- `pnpm format:check` → **pass** ("All matched files use Prettier code style") — confirms the
  tree (including the prettier-ignored `agent-prompts/` edit I trialed then reverted) is clean.
- Heavier gates (typecheck/lint/test/integration/build) not run: **no code PR opened**, so there
  is no code surface to gate this run.

## Findings

- **[P3 — already in flight] Dead `ios-snapshot/` link** —
  `agent-prompts/remote-prompts/technical/api-contract-parity.md:12`

  - Evidence: the markdown link `[`ios-snapshot/`](../../ios-snapshot/)` sits in a file 3
    directories deep (`agent-prompts/remote-prompts/technical/`); `../../` resolves to the
    non-existent `agent-prompts/ios-snapshot/`. Correct depth is `../../../ios-snapshot/` (root),
    matching the working sibling link in `agent-prompts/README.md:14` (`../ios-snapshot/`, 1 level
    deep).
  - Status: **open draft PR #147** already applies the identical one-character fix
    (`../../` → `../../../`). No new PR opened — would duplicate (house-rules §7).
  - User impact: a reader following the link from the contract-parity prompt hits a broken path;
    no product impact.
  - Recommended owner: docs — **merge PR #147**.
  - Recheck next run? Only if #147 is closed unmerged.

- **[P3 — new, judgment call] New `agent-prompts/claude-design-critique/` directory is absent
  from the `agent-prompts/README.md` catalog** — `agent-prompts/README.md`

  - Evidence: Session 7 (#152, merged 2026-06-29) git-tracked three previously-untracked prompts
    (`studio-aesthetic-critique.md`, `studio-critique-invocation.md`,
    `studio-redesign-prescription.md`) under a new top-level `agent-prompts/claude-design-critique/`
    directory. `agent-prompts/README.md` — which exhaustively enumerates the library's `Folder`
    structure plus chess-piece / team / cadence tables — does not mention the new directory, and
    nothing else in the repo references it.
  - Why report, not patch: folding three "design critique" prompts into the README taxonomy is a
    classification decision (interactive vs. remote? which cadence? which chess piece?) that
    belongs to the owner — the doc-drift mandate routes judgment calls to a recommendation, not a
    docs edit. The files were tracked _today_; the owner is mid-integration.
  - User impact: the README catalog under-describes the actual prompt library; low.
  - Recommended owner: product/docs — decide where (and whether) these belong in the README
    taxonomy, then add them.
  - Recheck next run? Yes — until the README catalog and the directory agree.

- **[out-of-scope — already in flight] `engines.pnpm` `>=9` vs pinned `pnpm@11.4.0`** —
  `package.json:9`
  - Carried over from the 2026-06-28 doc-drift run as a code/config hand-off. **PR #147 already
    tightens it** to `">=11.4.0"`. Noted only so the digest reader sees it is resolved-in-flight,
    not still open.

No other drift found. AGENTS.md commands, CI-gate documentation, and structure paths are all
accurate against the code; planning-doc status markers are internally consistent.

## Blockers

None. The single in-scope correction is already covered by an open PR, so there was no
PR-worthy work left to do this run that would not duplicate in-flight changes. The new
`claude-design-critique` cataloguing is a deliberate owner hand-off (taxonomy judgment), not a
blocker.

## Next recommended action

**Review and merge open draft PR #147** ("[codex] Clean up launch process guidance") — it
carries the dead `ios-snapshot/` link fix and the `engines.pnpm >=11.4.0` tightening, alongside
its broader launch-process doc sync. Note #147 is based on the pre-Session-7 commit `67120a1`;
update its branch / re-run the gate against current `main` (`d2b7b4f`) before merge. Separately,
when convenient, decide where the new `agent-prompts/claude-design-critique/` prompts belong in
`agent-prompts/README.md` and add them to the catalog.
