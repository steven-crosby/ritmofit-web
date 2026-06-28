# House Rules — unattended background maintenance agents (ritmofit-web)

> **Remote ephemeral sandbox.** Every prompt that inherits these rules runs unattended in an
> isolated, ephemeral cloud sandbox — not the owner's machine. The repository is a fresh clone
> and the container is discarded when the session ends, so **nothing survives unless it is
> committed and pushed**: push any branch and draft PR to the remote, and commit every report
> into the git-tracked `agent-reports/`. No human is watching in real time — never block on
> interactive input; decisions that belong to the owner become written recommendations.

Every prompt in this library inherits these rules and **leaves a pushed branch** — the
deliverable never lives only in chat, because the container is discarded at the end. Change
prompts (the technical prompts and `doc-drift`) open a draft PR; brief/analysis prompts
(`command-brief` and the planning briefs) push their validated agent report on a branch with
no code PR; `pr-triage` may push rebased branches. All work here branches in **ritmofit-web**;
the iOS client is only ever read-only context (vendored as a snapshot in `ios-snapshot/`, so no
sibling iOS checkout is needed).

You are running unattended in this sandbox for at most **45 minutes**. Spend the final
5 minutes recording results and cleaning up — and because the container is discarded at the
end, push branches and commit reports before you stop, or the work is lost. Broad
investigation is allowed; autonomous changes must stay narrow.

1. **Read this repo's `AGENTS.md` first** (plus any `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
   it points to). Those conventions OVERRIDE your instincts and this prompt. On conflict,
   AGENTS.md wins — note it in your output.
2. Fetch the remote and inspect the working tree before acting. The sandbox starts from a
   fresh clone, so there should be no uncommitted user work to disturb; if the tree is
   unexpectedly dirty, stop and report rather than moving or stashing whatever is there.
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
9. Write a durable agent report from this repo's
   `agent-reports/AGENT_REPORT_TEMPLATE.md` to
   `agent-reports/YYYY-MM-DD/<prompt-slug>.md` (paths are repo-root-relative;
   `<prompt-slug>` is the prompt path **relative to `agent-prompts/remote-prompts/`** with
   `/`→`-`, e.g. `technical/security` → `technical-security.md` — report names do not carry a
   `remote-prompts-` prefix; suffix `-2`, `-3`, … if the same prompt runs twice in a day).
   Include repo, agent, the inspected default-branch head, commands and results, findings,
   PR links, blockers, and the next recommended action. Run
   `./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/<file>.md`. A run is
   incomplete until validation passes. The report is **git-tracked** and lives in this
   repo's `agent-reports/` — never in the sibling iOS repo and never mixed into a code diff
   as a `FINDINGS.md`. A run that also opens a code PR may commit its report on the same
   branch, inside `agent-reports/`, separate from the code change.
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
defined in `AGENTS.md` — run the full required list before any PR. The iOS client
(SwiftUI / SwiftData) is read-only context: its contract surface is vendored in
`ios-snapshot/` for `api-contract-parity` (see `ios-snapshot/README.md`), while
`content-consistency` compares copy against a live `ritmofit-ios` checkout only when present.
Never branch or build the iOS app from here.
