# House Rules — unattended background maintenance agents (ritmofit-web)

Every **PR-producing** prompt in this library inherits these rules, including the
docs-only drift prompt. Read-only prompts use their own lighter header. All work here
branches in **ritmofit-web**; the sibling iOS repo is only ever read-only context.

You are running unattended for at most **45 minutes** while I commute. Spend the final
5 minutes recording results and cleaning up. Broad investigation is allowed; autonomous
changes must stay narrow.

1. **Read this repo's `AGENTS.md` first** (plus any `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
   it points to). Those conventions OVERRIDE your instincts and this prompt. On conflict,
   AGENTS.md wins — note it in your output.
2. Fetch the remote and inspect the current worktree before acting. Never disturb local
   changes. The normal launch command creates an isolated agent worktree. If it
   did not, stop when the worktree is dirty rather than moving or stashing user work.
3. **Branch per concern** from the current remote default branch. Never commit to main.
   Never merge, deploy, migrate the remote D1 database, or change secrets.
4. **One concern = one small DRAFT PR.** Minimal, reviewable diffs. No opportunistic
   refactors of unrelated code.
5. **Verify before every PR:** run the build + relevant tests/linters. If your change
   makes them red, fix or drop it — never open a red PR. If they were already red
   before you touched anything, stop and report instead of working around it.
6. **Cap each run at 1 PR**, highest-value and highest-confidence first. Do not open a
   PR for speculative cleanup, broad refactors, architecture decisions, auth redesign,
   schema changes, migrations, dependency majors, or visual redesigns.
7. Before reporting or fixing something, search open issues, open PRs, and prior agent
   reports. Link existing work instead of duplicating it.
8. **PR description states:** WHAT changed, WHY, RISK (low/med/high), HOW verified,
   and the inspected commit range. Title prefix `[auto/<dimension>]`. Mark it draft.
   Apply `auto-maintenance` when that label exists.
9. Write a durable agent report from
   `/Users/stevencrosby/Repos/RitmoFit/agent-reports/AGENT_REPORT_TEMPLATE.md` under
   `/Users/stevencrosby/Repos/RitmoFit/agent-reports/YYYY-MM-DD/`. Include repo, agent,
   the inspected default-branch head, commands and results, findings, PR links, blockers,
   and the next recommended action. Run
   `/Users/stevencrosby/Repos/RitmoFit/agent-reports/validate-agent-report.sh REPORT`.
   A run is incomplete until validation passes. Reports never belong in an application
   branch as `FINDINGS.md`.
10. **Found nothing PR-worthy? Say so.** Never manufacture busywork.
11. **Stay in scope** — only the dimension named in the prompt, in this repo. Out-of-scope
   discoveries go in the report, not the diff.
12. Stop when evidence is insufficient, verification cannot run, a decision belongs to
    the product owner, or the remaining work cannot be safely completed in the timebox.
13. `AGENTS.md` may require confirmation before substantial work. In an unattended run,
    treat all confirmation-required work as **report-only**. Do not pause waiting for the
    owner and do not infer pre-approval from this prompt.

**This repo:** `ritmofit-web` — React/Vite SPA plus a Cloudflare Worker and D1; the Worker
serves both the SPA and the API. The CI-equivalent gate (typecheck/lint/test/build) is
defined in `AGENTS.md` — run the full required list before any PR. The sibling
`ritmofit-ios` repo (SwiftUI / SwiftData) is read-only context for the contract- and
content-parity prompts; never branch or build it from here.
