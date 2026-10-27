# Session and lane handoffs

The durable "where things stand" record between sessions, tools, and parallel lanes. Chat is
scratch; a handoff that only exists in a transcript does not exist. Introduced 2026-10-06.

## What goes here

One file per session or lane: `YYYY-MM-DD-<lane-slug>.md` (for example
`2026-10-06-docs-workflow.md`, `2026-10-07-r3-lane2-class-api.md`). Start from
[`../../agent-prompts/templates/handoff.md`](../../agent-prompts/templates/handoff.md).

<!-- Claude Code, 2026-10-27: Handoffs are restart notes; RF records own next actions and decisions. -->

A handoff is a **restart note**: context a successor needs that an RF record cannot hold, such as
unfinished branch state, dated observations, or a device check in flight. The RF record owns the next
action, owner decisions and evidence; `DEVELOPMENT_PLAN.md` owns `main` vs production. Write one only
when that context exists (lanes and orchestrators always write one); never just to record a merge. It is not a log —
shipped facts go to [`../HISTORY.md`](../HISTORY.md), current focus to
[`../DEVELOPMENT_PLAN.md`](../DEVELOPMENT_PLAN.md), decisions to [`../decisions.md`](../decisions.md).

Not to be confused with [`../class-template-handoff.md`](../class-template-handoff.md), which is a
product spec, or `NEXT_SESSION.md` files inside `docs/audits/` runs, which are evidence for that
run and superseded by handoffs here.

Current actionable state lives in [`../tasks/`](../tasks/README.md), with the generated
[`RF board`](../tasks.md) as its view. Handoffs link RF IDs and add session restart context and dated
observations. Reconcile old handoff next actions with canonical records and live sources; do not
copy mutable task statuses into new handoffs or infer approval from a task label.

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
5. **Evidence references.** Before an authorized retirement, preserve any evidence cited by RF
   records in a durable repo document or immutable commit link and update those references without
   claiming new verification. Final task rendering/validation follows all handoff and docs edits.
6. **Status.** `status: open` while its restart context still matters; `status: closed` when nothing
   is owed (an idle lane, a finished session whose facts already live in RF records/HISTORY).
7. **Retiring.** Under the standing grant (`AGENTS.md` › "Delegation And Merge Policy"), a later
   `close-session` deletes a handoff in a PR once every item in it is done or routed
   to its real home (an RF record, HISTORY, DEVELOPMENT_PLAN, decisions, INBOX). `start-session` flags any
   handoff older than 14 days whose PR or branch is closed as **stale**; the next close routes and
   deletes it. Git history keeps every deleted handoff.
8. **Facts, not inference.** Production state is "as observed" with evidence (Worker version,
   served SPA hash) or explicitly "not checked from this environment". Absolute dates only.
9. **No secrets.** Never paste tokens, cookies, provider credentials, or production user data.
