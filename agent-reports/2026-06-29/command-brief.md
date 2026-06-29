---
prompt: daily/command-brief
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-29
inspected_head: d2b7b4f7cd6db1522f99f960bec935509aaf9d79
inspected_range: ba6d627..d2b7b4f
completed: true
prs: []
---

# command-brief — 2026-06-29

## Summary

`main` is clean and CI-**green** at `d2b7b4f` (#152, Session 7 close); **one open PR (#147,
draft).** Sessions 1–7 of Web Launch Readiness are done; the live next step is **Session 8 —
Launch Candidate (code-only deploy)**. Prior briefs' two P1 flags (CSP inline-script, auth/email)
are now **resolved and deployed** — do not re-raise. The decision: prod is behind `main` —
Session 7 code (#150, #151) is merged but **not in prod** (prod = Worker `b59b2de9`, #146), so
the deploy ships two unshipped a11y fixes.

## Findings

**1. Do next (ordered):**

- **Run a changed-code sentinel over `ba6d627..d2b7b4f`** first — closes the coverage gap on the
  two `feat(web)` PRs (#150/#151) about to ship. Cheap, de-risks the launch. _Owner: web._
- **Run Session 8 — Launch Candidate deploy** (`web-launch-session-plan.md:120`). Code-only, no
  pending migration; ships #150/#151 and clears the active milestone. _Owner: web — deploy access._
- **Triage PR #147:** update branch onto `main` (4 behind), then finish→merge or close. _Owner: web._

**2. Ready to review:** **#147** — codex docs cleanup, draft, docs-only, low risk; base `67120a1`
is behind `main`, **needs branch update**. Its `ci.yml` edit was dropped (token lacked `workflow`
scope), so it ships CI-sync doc claims without the workflow change — fine (CI already correct), but
reviewer should know. Merge after rebase.

**3. Product position:** Sessions 1–7 done; Session 8 (deploy) is the close. iOS is **not blocked**
— the run-payload contract already advertises every lagging field; iOS parity stays deferred until
after web launch.

**4. Red flags:**

- **Sentinel coverage gap:** latest valid sentinel inspected `ba6d627` (2026-06-28); range
  `ba6d627..d2b7b4f` (Session 7 code #150/#151) has **no automated sentinel** — the code shipping
  to prod next is unvetted by a delta review. _Verified._
- PR #147 is behind `main` and self-reports a dropped workflow edit. _Verified (PR body)._

**5. Defer:** iOS parity, Explore/Teams expansion, design-token automation, `engines.pnpm >=9`
laxness, the P3 `AGENTS.md` gate-list gap — all non-blocking; hand to doc-drift/quality.

## Next recommended action

Run a changed-code sentinel over `ba6d627..d2b7b4f`, then execute **Session 8 — Launch Candidate**
(full gate → build → deploy via `deployment-runbook.md` → prod smoke → delete test data → update
`HISTORY.md`). It clears the active milestone and ships #150/#151 to production.
