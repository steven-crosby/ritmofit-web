# Morning Sweep — legacy full-repository triage

> **Follow the house rules first:**
> `agent-prompts/00-house-rules.md`

**Legacy fallback.** Prefer `changed-code-sentinel.md` for daily use. Run this broader
sweep only when there is no useful sentinel checkpoint, there has been no recent
development activity, or you explicitly want a repository-wide inspection instead of a
changed-code review.

**Use when:** you want a rare, broad health sweep across multiple dimensions.
**Do not use when:** recent commits can be inspected by `changed-code-sentinel.md`.

**DIMENSION:** Morning-sweep (stability + quality + design-system + security)
**REPO:** `ritmofit-web`

Do a fast TRIAGE pass across all four dimensions. Open a draft PR for at most the **1**
highest-confidence, lowest-risk win (security follows its report-first rule —
see `technical/security.md`). Put everything else in the durable agent report required by
the house rules.

Goal: I can read the report in 2 minutes on arrival and merge the PRs in 5.
