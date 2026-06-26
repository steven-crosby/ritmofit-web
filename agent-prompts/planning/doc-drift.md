# Doc drift — keep the docs honest

> **Follow the house rules first:**
> `agent-prompts/00-house-rules.md`
> **PR-PRODUCING, DOCS ONLY** — never touch product code from this prompt.

**REPO:** `ritmofit-web`

Find where the written record and the code / reality have diverged:

- AGENTS.md / CLAUDE.md instructions that no longer match the code (paths, commands,
  structure, conventions that moved).
- `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` status that's stale — slices marked pending that
  actually merged, or "next" items already done.
- README / setup steps that would fail if followed fresh.
- Dead links, renamed files, deleted modules still referenced.

Apply my doc conventions: self-label any status note with **agent + date**; archive dated
status entries into `HISTORY.md` / `REVIEW_HISTORY.md` rather than letting them pile up in
live planning docs; keep planning docs slim.

Open small docs-only PRs for clear corrections. Judgment calls (should this whole doc be
restructured?) → report with a recommendation.
