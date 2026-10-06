# Session and lane handoffs

The durable "where things stand" record between sessions, tools, and parallel lanes. Chat is
scratch; a handoff that only exists in a transcript does not exist. Introduced 2026-10-06.

## What goes here

One file per session or lane: `YYYY-MM-DD-<lane-slug>.md` (for example
`2026-10-06-docs-workflow.md`, `2026-10-07-r3-lane2-class-api.md`). Start from
[`../../agent-prompts/templates/handoff.md`](../../agent-prompts/templates/handoff.md).

A handoff records **state owed forward**: what is in flight, the one next action, open owner
decisions, verification run or skipped, and `main` vs production as observed. It is not a log —
shipped facts go to [`../HISTORY.md`](../HISTORY.md), current focus to
[`../DEVELOPMENT_PLAN.md`](../DEVELOPMENT_PLAN.md), decisions to [`../decisions.md`](../decisions.md).

Not to be confused with [`../class-template-handoff.md`](../class-template-handoff.md), which is a
product spec, or `NEXT_SESSION.md` files inside `docs/audits/` runs, which are evidence for that
run and superseded by handoffs here.

## Rules

1. **One author.** Only the session that wrote a handoff edits it. Lanes never edit each other's
   files, so parallel lanes cannot conflict here. Use a unique slug; add `-2` if a slug repeats.
2. **Committed with the work.** The handoff is committed on the session's own branch and PR, so it
   reaches `main` with the change it describes. Lanes commit theirs on the lane branch.
3. **Sessions without a PR** (a local deploy, an investigation, a QA pass): a deploy or QA result
   goes to `HISTORY.md` on a `docs:` PR as before; write a handoff in that same PR only if something
   is still owed forward. Do not push a handoff straight to `main`.
4. **Reading.** `start-session` reads every handoff on `origin/main` **and** every handoff file in
   the head of an open PR (in-flight lanes are visible before they merge).
5. **Status.** `status: open` while anything is in flight or a next action is owed;
   `status: closed` when nothing is owed (an idle lane, a finished session whose facts already live
   in HISTORY/DEVELOPMENT_PLAN).
6. **Retiring.** A later `close-session` deletes a handoff once every item in it is done or routed
   to its real home (HISTORY, DEVELOPMENT_PLAN, decisions, INBOX, a PR). `start-session` flags any
   handoff older than 14 days whose PR or branch is closed as **stale**; the next close routes and
   deletes it. Git history keeps every deleted handoff.
7. **Facts, not inference.** Production state is "as observed" with evidence (Worker version,
   served SPA hash) or explicitly "not checked from this environment". Absolute dates only.
8. **No secrets.** Never paste tokens, cookies, provider credentials, or production user data.
