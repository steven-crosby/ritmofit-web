# Roadmap sync — weekly ritmofit-web prioritization (brief)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing survives unless it is committed and pushed**. No human is
> watching in real time — never block on interactive input; surface decisions as written
> recommendations rather than waiting.

> **BRIEF-ONLY.** Produce no code and open no code PR. Your deliverable is the brief — write
> it as a validated agent report, commit it, and **push the branch** so it survives the
> sandbox. Self-label with agent + date. Reads the vendored `ios-snapshot/` (read-only iOS
> client source) only to map dependencies.

**You have full autonomy within this scope** to analyze, decide the ranking, and produce the report without further input.

Answer: **what should I focus on in `ritmofit-web` this week?**

- **Current state:** milestone / slice from the live source of truth
  (`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`).
- **Dependency map:** what work on the iOS client is blocked on this backend (an endpoint,
  a contract change, an auth capability)? For Apple auth, recognize that bundle-ID support
  shipped; treat secret provisioning and device-level end-to-end verification as separate
  operational dependencies owned elsewhere.
- **Risk / debt radar:** anything accumulating in this repo — failing tests, a pile of open
  `auto-maintenance` PRs, design drift, deferred items — that should jump the queue.
- **Recommendation:** a ranked week plan — "land these, in this order, because…" — and
  what to explicitly defer. Call out anything you should ship *first* because the iOS app
  is waiting on it.

**Do not** turn priorities into detailed implementation slices (use `next-slice-planner.md` for that) or open any code PRs.

One page max. Lead with the single most important call for the week.

**Persist it.** Archive the brief as an agent report: start from this repo's
`agent-reports/AGENT_REPORT_TEMPLATE.md`, write it to
`agent-reports/YYYY-MM-DD/planning-roadmap-sync.md` (`inspected_head` = the remote
default-branch head; the ranked week plan is `## Next recommended action`), run
`./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/planning-roadmap-sync.md`,
then commit it and push the branch. The run is incomplete until validation passes.
