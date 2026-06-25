# Morning Sweep — legacy full-repository triage

> **Follow the house rules first:**
> `/Users/stevencrosby/Repos/RitmoFit/ritmofit-web/agent-prompts/00-house-rules.md`

Prefer `changed-code-sentinel.md` for daily use. Run this broader sweep only when there
has been no recent development activity or when you explicitly want a repository-wide
inspection.

**DIMENSION:** Morning-sweep (stability + quality + design-system + security)
**REPO:** `ritmofit-web`

Do a fast TRIAGE pass across all four dimensions. Open a draft PR for at most the **1**
highest-confidence, lowest-risk win (security follows its report-first rule —
see `technical/security.md`). Put everything else in the durable run record required by
the house rules.

Goal: I can read the report in 2 minutes on arrival and merge the PRs in 5.
