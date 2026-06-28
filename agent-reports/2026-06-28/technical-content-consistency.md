---
prompt: technical/content-consistency # the agent-prompt that produced this (path under agent-prompts/)
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-28 # the run date
inspected_head: ba6d6277ab208f29c75546aa56c5d1ad1f8fd03d # remote default-branch head inspected this run
inspected_range: full-repo # content audit, not a delta review
completed: true # the required gate ran and the run finished in-timebox
prs: # PR URLs opened this run; leave empty if none
  - https://github.com/steven-crosby/ritmofit-web/pull/new/claude/content-terminology-consistency-3zqgfd
---

# technical/content-consistency — 2026-06-28

## Summary

Ran the web-internal terminology, microcopy, and state-copy checks across `apps/web`'s
user-facing strings. Terminology for the core concepts is internally consistent — the product
says **class** everywhere (no "session"/"run" synonym leakage; "session" appears only as the
auth session), provider names come from a single `providerLabel` source of truth, and loading/
empty-state copy follows a consistent "Loading…" / "No X yet." pattern. The one concrete defect
worth fixing was a **split apostrophe style** in user-facing copy: five strings used straight
ASCII apostrophes while six others (and the design-system copy examples) use the typographic
curly apostrophe. Fixed and shipped as one small draft PR. **`cross-surface copy parity vs iOS:
not run — no iOS source vendored in this checkout`.** Nothing needs the owner's attention today
beyond reviewing the draft PR.

## Commands run + results

- `pnpm install --frozen-lockfile` → ok (pnpm 11.4.0, Node 22.22.2)
- `pnpm format:check` → pass (after Prettier reflowed the one edited test string to single quotes)
- `pnpm -r typecheck` → pass (shared, music, web, api all clean)
- `pnpm lint` → pass (eslint, no findings)
- `pnpm test` → pass (api 248 tests)
- `pnpm --filter @ritmofit/web test` → pass (33 files, 184 tests)
- `pnpm --filter @ritmofit/api test:integration` → pass (64 tests)
- `pnpm --filter @ritmofit/web build` → pass (SPA + PWA build)
- `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code apps/api/openapi/openapi.json` → unchanged
- `pnpm audit:ci` → pass (5 advisories, all documented/ignored)

Full CI-equivalent gate from `AGENTS.md` ran green.

## Findings

- **[P3] Inconsistent apostrophe style in user-facing copy** — `apps/web/src/components/`
  - Evidence: straight ASCII `'` in `Dashboard.tsx:528` ("Couldn't load your classes"),
    `TrackSearch.tsx:80` ("Couldn't load your … likes"), `ChoreographyEditor.tsx:695`
    (tooltip "Find songs you've choreographed"), `MarketingPage.tsx:178` ("it's free"),
    and `ConnectionsDialog.tsx:249` ("that provider's imported references"); curly `’`
    already used in `SongsByMoveDialog.tsx`, `CustomMovesDialog.tsx`, and `NotFound.tsx`,
    and in the design-system copy examples (`ritmofit_design_system/ritmofit-design-system.md`
    §5.4, which also use em-dash/ellipsis typographic punctuation the app already follows).
  - User impact: cosmetic; mismatched typography in error/empty/marketing copy. Notably the
    _same phrase_ ("Find songs you've choreographed with a move") rendered with a straight
    apostrophe as a tooltip but a curly one in the dialog body.
  - Recommended owner: web (shipped in this run's PR)
  - Recheck next run? no (fixed)

- **[info] No class/session/run terminology drift** — the user-facing vocabulary consistently
  uses "class"; "session" is auth-only ("Session expired"). No fix needed.

- **[info] Minor: lowercase placeholder option `intensity —`** —
  `ChoreographyEditor.tsx:766,867`. A stylized lowercase select placeholder against the
  design-system "sentence case for UI" rule (§7.3). Low value and arguably intentional as a
  muted placeholder; left alone to keep the PR to one clear concern. Recheck: optional.

Nothing else PR-worthy surfaced.

## Blockers

- Cross-surface copy parity against the iOS client could not run: no iOS source is vendored in
  this checkout (only the API contract surface lives in `ios-snapshot/`, which belongs to
  `api-contract-parity`). Recorded verbatim above per the prompt.

## Next recommended action

Review and merge draft PR `[auto/content-consistency]` on
`claude/content-terminology-consistency-3zqgfd`. If the owner wants the placeholder-casing item
(`intensity —`) standardized to sentence case, that is a separate one-line follow-up.
