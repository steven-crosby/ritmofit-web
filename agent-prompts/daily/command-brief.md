# Command brief — ritmofit-web handoff

> **READ-ONLY.** Do not modify the repository, push branches, or open PRs.
> **TIMEBOX:** 10 minutes.

Read **ritmofit-web**, its canonical `AGENTS.md`, the live planning sources
(`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`), the newest records under
`/Users/stevencrosby/Repos/RitmoFit/agent-runs/`, recent commits, open PRs, and CI/check
status. You may glance at the sibling `ritmofit-ios` repo read-only only to note a
cross-repo dependency.

Validate each candidate sentinel record with `agent-runs/validate-run-record.sh` before
using it. Treat an invalid record or `completed: false` as an incomplete sentinel run;
do not use its `inspected_head` as confirmed coverage.

Produce a single brief under:

`/Users/stevencrosby/Repos/RitmoFit/agent-runs/YYYY-MM-DD/command-brief-web.md`

Keep it under 350 words and lead with decisions:

1. **Do next:** the three highest-value actions in this repo, ordered, with reason.
2. **Ready to review:** new or updated agent PRs, risk, verification state, and suggested
   merge order.
3. **Product position:** the current web slice, plus the next dependency the iOS client
   is waiting on from this backend (if any).
4. **Red flags:** failing checks, contract drift, security/data-loss risk, stale branches,
   or findings repeated across runs.
5. **Defer:** noisy or low-value findings that should not consume today.

Distinguish verified facts from inference. Link PRs and include file pointers where they
matter. If the sentinel did not run or produced an incomplete record, state that directly.
