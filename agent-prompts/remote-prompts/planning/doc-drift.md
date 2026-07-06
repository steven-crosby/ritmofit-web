# Doc drift — keep the docs honest

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
> **PR-PRODUCING, DOCS ONLY** — never touch product code from this prompt.

You have full autonomy within this scope to find drift, make small docs-only corrections, or report larger judgment calls.

**REPO:** `ritmofit-web`

Find where the written record and the code / reality have diverged:

- CLAUDE.md (canonical) / AGENTS.md (pointer stub) instructions that no longer match the code (paths, commands,
  structure, conventions that moved).
- `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` status that's stale — slices marked pending that
  actually merged, or "next" items already done.
- README / setup steps that would fail if followed fresh.
- Dead links, renamed files, deleted modules still referenced.

Apply my doc conventions: self-label any status note with **agent + date**; archive dated
status entries into `HISTORY.md` rather than letting them pile up in
live planning docs; keep planning docs slim.

Open small docs-only PRs for clear corrections. Judgment calls (should this whole doc be
restructured?) → report with a recommendation.
