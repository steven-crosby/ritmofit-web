# Standup digest — legacy ritmofit-web status

> **READ-ONLY.** Do not modify code or open PRs. Produce one short markdown brief I can
> read on the train. Self-label the output with agent + date (my doc convention).
>
> Prefer `command-brief.md`, which also consumes sentinel reports and detects
> repeated findings. Keep this prompt only for days when no sentinel ran.

**Legacy fallback.**
**Use when:** no sentinel report exists, but you still want a short repo status brief.
**Do not use when:** `command-brief.md` can consume a completed sentinel report.

For `ritmofit-web`:

- **Moved since yesterday:** recent commits + merged PRs, one line each.
- **In flight:** open PRs (including `auto-maintenance` ones) — title, draft/ready,
  age, mergeable? conflicts?
- **Where we are:** current slice / milestone from `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` —
  what does the live source of truth say is next?
- **Blocked / waiting:** anything stalled, plus any backend dependency the iOS client is
  waiting on. For Apple auth, distinguish shipped bundle-ID support from remaining secret
  provisioning.
- **My top 3 today:** your recommendation, ranked, with a one-line why each.

Keep it under ~250 words. Lead with the 3 things that matter most.

Archive the brief as an agent report: start from this repo's
`agent-reports/AGENT_REPORT_TEMPLATE.md`, write it to
`agent-reports/YYYY-MM-DD/standup-digest.md` (`completed: true`, `inspected_head` = the
remote default-branch head you read; the brief itself is the `## Summary`, your top-3 is
`## Next recommended action`), then run
`./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/standup-digest.md`.
Being read-only, you do not open PRs — but the report still belongs in `agent-reports/`.
