# Lane d2-quality — verification quality, performance, dependencies, maintainability, ops

Reviewer: Claude Code subagent (lane d2-quality), 2026-10-28. Audited SHA `4c344e2`.
Execution worktree: `/tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-d2-quality` (detached at 4c344e2, disposable).
Repro canonical copies: `../repro/d2-quality-*`. Evidence: `../evidence/d2-quality-*`.

STATUS: in progress (draft saved early).

## Candidates (draft)

- Q-01 Drizzle query errors carry every bound parameter; three Worker log sites print them.
- Q-02 Unpaginated `GET /classes` returns 500 above 100 visible classes (new D-1 call site).
