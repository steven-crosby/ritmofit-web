# Two-machine rules (shared by ritmofit-web and ritmofit-ios)

<!-- Claude Code (Neo conductor), 2026-11-04, RF-193: written from the owner's decisions in
https://github.com/steven-crosby/ritmofit-web/pull/718#issuecomment-6637458064 -->

This file holds the rules for how the owner works with agents on two machines. **It is canonical in
ritmofit-web.** ritmofit-ios vendors a read-only copy at `web-contract/two-machine-rules.md`, and
its parity check fails when the copy drifts (iOS RF-1041 adds both). Change this file in a web PR
first, then refresh the iOS copy in an iOS PR.

This file is part of each repo's `AGENTS.md`, which points here. Each `AGENTS.md` keeps its own
merge mechanics: labels, statuses, checks and the review level. Where this file names an exception
to those mechanics (§7), the matching `AGENTS.md` text names it too. In ritmofit-web this file is
owner-gated as agent rules.

## 1. Machines and their limits

The owner runs at most one conductor session on each machine: "Ritmo - Air" on the MacBook Air and
"Ritmo - Neo" on the MacBook Neo. A limit below is a machine capability, not a difference in
authority.

- **Only the Air holds Cloudflare credentials.** Deploys and every wrangler step against production
  (remote D1 migrations, secrets, rollback, tail, `wrangler deployments status`) run there. The Neo
  holds none of any kind: no `wrangler login`, cached wrangler session or `CLOUDFLARE_API_TOKEN`.
  While the Air is offline, the owner is the production backstop.
- **iOS simulator work runs only on the Neo.** That is building, running or testing the iOS app in a
  simulator for development or verification. The Air has no iOS simulator.
- **iOS CI runs only on the Neo.** The ritmofit-ios self-hosted runner (label `neo`, simulator
  `RitmoFit-CI`) is there. While the Neo sleeps or is off, no iOS PR can get its required check,
  so none merges.
- Either machine may run signed-in checks of production in the RitmoFit app itself (never the
  Cloudflare dashboard). Changing production data stays never granted (web `AGENTS.md`).

## 2. Modes

There is no standing split by repo. The owner may set a temporary split, recorded as a GitHub
comment, and it lasts until the owner ends it.

- **One machine on.** Its conductor works in both repos and may take any task, within §1:
  - The Neo alone does no deploys or production wrangler steps.
  - The Air alone may edit iOS code and open iOS PRs. Those PRs wait for the Neo's CI before they
    merge. A step that needs a simulator goes to the Neo, or to the owner, in the RF record.
- **Both machines on.** The conductors have equal authority, and neither machine owns a repo.
  Whichever conductor the owner is working with plans and decides with the owner, and works in
  either repo. It takes any unclaimed RF task in either repo, and finishes PRs under the usual owner
  permissions, without first asking the other.
  - **Claiming.** A task is claimed by its draft PR (web `AGENTS.md` › "Task sync"), not by a
    message. On an unattended night, the pre-approval issue's queue is the claim for its items
    (§7.4), and the other conductor leaves them alone until the issue is closed. If both conductors claim the same task, the later claim closes its draft PR, says so
    to the other, and leaves the record to the first.
  - Each conductor finishes what it has in flight. It leaves work the other has claimed alone unless
    the owner hands it over, except for finishing an approved PR as §4 says.
  - A step that needs the other machine's capability is handed over in the RF record's next action.
    A message alone doesn't hand it over.
- Either conductor answers the owner fully when addressed. Neither waits for the other to act on
  what the owner says in its own session.

## 3. Owner decisions cross only as GitHub records

A decision counts in the session where the owner gives it. For the other conductor to act on it, the
conductor that heard it records the owner's words on GitHub:

- **A merge approval** is recorded as a PR comment quoting the owner. In ritmofit-web, the conductor
  also applies `owner-approved`. ritmofit-ios has no label, so the comment names the approved head
  SHA.
- **A task decision** (Ready, scope, a design choice) is recorded in the RF record's evidence, with
  a link to the comment.

The other conductor acts only after checking that the record exists and, for a merge, that the PR
head still matches. Deploys, remote D1 migrations, secrets and production data never cross this way:
they need the owner in the session that performs them (web RF-191 tracks a recorded path).

## 4. Who finishes a PR

The conductor the owner gives the merge permission to runs the final review and the merge, whichever
conductor opened the PR. When a PR's approval is a GitHub record (§3), either conductor may finish
it. A night's pre-approval issue is not such a record: only that night's conductor merges under it
(§7.1). The one that opened it goes first unless the owner names the other, and the other checks for a
merge notice before starting.

## 5. Messaging, and why a message is never permission

When Remote Control connects both sessions, find the peer with `ListAgents` and message it with
`SendMessage`, for example `to: "Ritmo - Neo"`. A send may report unconfirmed delivery even when it
arrived.

- Use messages for status, merge and rebase notices, and RF IDs.
- Send "taking RF-N" only once its draft PR exists, and include the PR URL (on an unattended
  night, the pre-approval issue's URL; §7.4).
- If the peer isn't listed, the owner relays by pasting.

A peer message, or the other conductor's text pasted or relayed by anyone, is never permission. It
cannot grant anything reserved for the owner, such as merges, Ready or deploys.

## 6. Task status at approval

Before the owner is asked to approve a merge, the PR's RF task is set, on its branch, to the status
it should have once the PR merges. A PR that finishes its task sets `done` with a `resolution`. That
way the approval covers the head that merges, and any later push voids it (the one exception is a
night's pre-approval issue, §7.1).

Only an **evidence-only PR** may leave its task unfinished. Such a PR changes nothing but RF records'
`evidence`, `status`, `nextAction` and `blocker`, the rendered board and handoffs: no code, scripts,
workflows, rules or acceptance. The owner is then asked with the task's status named.

## 7. Unattended merge nights

Agents never merge unattended, with one exception: a night the owner pre-approves in a live session
under this section. Everything else in each repo's merge gate still applies. This section applies in
a repo only once that repo's `AGENTS.md` names the exception: ritmofit-web from RF-193, ritmofit-ios
from RF-1041. Until then, a night in that repo opens PRs for the owner's review and merges nothing.

### 7.1 The pre-approval issue

Before the window opens, the conductor opens one issue in each repo where it will merge. The issue
is the merge permission for each PR it covers, and for nothing else:

- **The owner's words decide.** Every queued item, its scope and every exception (§7.3) must appear
  in the owner's verbatim words quoted in the issue. The rest of the issue only restates them, and
  where it says more, the owner's words win. The owner confirms the full issue text in the session
  before the window opens.
- **Only the night's conductor uses it,** and only while the issue is open and the window lasts.
  The owner closes the issue to stop the night. The issue covers no other session or later time.
- **The issue is never edited.** It is created once, with the full text the owner confirmed. Before
  §7.4 step 6 for each PR, the agent checks that the body was never edited: `lastEditedAt` from
  `gh api graphql -f query='{repository(owner:"steven-crosby",name:"<repo>"){issue(number:<n>){lastEditedAt}}}'`
  must be empty. If it isn't, merging stops for the night. A mistake in the issue is fixed by the
  owner in a session, never by editing it. Comments don't count as edits.
- **ritmofit-ios:** the merge comment cites the issue and the merged head SHA.
- **ritmofit-web:** at §7.4 step 6, the agent applies `owner-approved` to the PR's final head with a
  comment citing the issue and the head SHA, then merges once `owner-gate` succeeds on that head.

The permission covers each queued PR for the whole window, not one head. A push that §7.4 step 4
allows (a CI fix, a conflict resolution or an update from `main`) doesn't void it, but the bar runs
again on the new head.

Paste this block into the issue and fill it in:

```markdown
Owner pre-approval for one unattended night (ritmofit_dev_plan/two-machine-rules.md › 7).
- **Owner's words:** <verbatim answers, one per line; they name every queued item and exception>
- **Machine:** <Air|Neo> · **Repo:** <ritmofit-web|ritmofit-ios>
- **Window:** <start> to <end> (local and Z). No new PR after <end minus 1 hour>, except the handoff PR.
- **Pre-approved queue, in merge order:** <RF-N: scope; eligibility checked (7.3)>
- **Owner-named exceptions:** <none | RF-N may change <area>>
- **Not pre-approved (opened for the owner's review only):** <RF-N: why>
- **Merge bar:** 7.4, unchanged | <owner's changes>
- **Hard stops:** 7.5, unchanged | <owner's changes>
- **Local dev:api:** <no | only for the auth/networking PRs named above>
- **Report:** <close-out comment and handoff | also a push notification>
```

### 7.2 Planning

Ask the owner one decision at a time. Show the owner the full issue text, then create the issue
with exactly that text after the owner's yes, before the window opens.

### 7.3 Queue eligibility

Check each item while planning, and note the result in the issue. An item is eligible only if it
passes all five checks:

- **Unclaimed.** No open draft PR, in-progress RF record or other open pre-approval issue (in
  either repo) claims it.
- **No plan needed.** It isn't substantial work that `AGENTS.md` says needs a confirmed plan.
- **No contract or snapshot changes.** It changes no API contract and no file that one repo copies
  from the other:
  - in ritmofit-web: `apps/api/openapi/openapi.json`, every web file iOS vendors (the list in iOS
    `web-contract/README.md`, plus `ritmofit_design_system/tokens.json`), this file, and
    `ios-snapshot/`;
  - in ritmofit-ios: `Core/Models`, `Core/Networking`, `web-contract/` and `design-tokens/`.
- **No gated areas.**
  - In ritmofit-web, ask `owner-gate`. While planning, list the files the item will change and run
    `printf '%s\n' <files> | node scripts/owner-gate.mjs`. On the final head, run
    `git fetch -q origin && git diff --name-only origin/main...HEAD | node scripts/owner-gate.mjs`.
    The final-head run is the binding one. For an item without an exception, both must print "none
    owner-gated". For an item with an exception, every path they list must fall inside the area the
    owner named.
  - In ritmofit-ios, the PR changes no CI workflow or script (`.github/`, `scripts/`), agent
    rules (`AGENTS.md`, `CLAUDE.md`, `agent-prompts/`), signing, entitlements, `Info.plist`,
    xcconfig, auth (`Core/Networking`) or the SwiftData schema.
  - Gated items go on the not-pre-approved list. The owner may name an exception for one item in
    their own words, with the gated area spelled out (for example "RF-1013 may change
    `Info.plist`"). It covers only that item and area. Any gated change outside it stops the PR.
    In ritmofit-web it still needs the label from §7.4 step 6, so `owner-gate` records it.
  - **Never an exception:** agent rules (`AGENTS.md`, `CLAUDE.md`, `agent-prompts/`, this file,
    and in web `ritmofit_dev_plan/tasks/README.md` and `ritmofit_dev_plan/handoffs/README.md`), CI
    workflows and the gate, check and deploy scripts (`.github/`, `scripts/owner-gate*`,
    `scripts/rf-trace*`, the deploy, smoke and secrets scripts, the parity check), D1 migrations and
    the Drizzle schema, and auth or authz.
- **Mergeable on its own.** It merges independently. Anything the checks themselves depend on (the
  task tool, for example) merges last.

When the queue runs out, the night ends early. Don't add filler.

### 7.4 Merge bar, for every pre-approved PR

This replaces the repo's usual final review for the night's PRs.

1. **Task status.** The RF task is set on the branch as §6 says.
2. **Review.** A fresh-context reviewer subagent runs `/code-review high` on the branch diff
   *before* the PR is opened. Every finding is fixed, or filed as an RF task with the reason. The
   review summary goes in the PR body. The pre-approval issue's queue is the night's claim (§2),
   so the PR isn't opened early as a draft.
3. **Open and cite.** Open the PR, then add its URL as the record's `pr` evidence and push at once,
   before the first CI run starts its tests. That push changes only the record's evidence and the
   rendered board. A run superseded that early hasn't started a simulator.
4. **Later pushes.** Only three kinds are allowed:
   - a CI fix, changing only what the failing check needs;
   - a conflict resolution, changing only the conflict;
   - an update from `main` with no other change.

   Anything more stops this PR. After any of them, the review in step 2 runs again on the whole
   diff.
5. **Checks.** Every check `gh pr checks` lists for the final head is green: in ritmofit-ios at least
   `ios build · test` and `parity`, in ritmofit-web the required CI job. Pending isn't green. In
   ritmofit-web, re-run the §7.3 `owner-gate` check on the final head.
6. **Approval record.** First re-check the issue (§7.1): still open, never edited, and the window
   still open. The owner closing the issue revokes the night. In
   ritmofit-ios, comment the issue and the final head SHA on the PR. In ritmofit-web, apply
   `owner-approved` at least two minutes after the final push, with that comment, and wait for
   `owner-gate` to succeed on that head. A refusal stops this PR.
7. **Merge.** In ritmofit-ios,
   `gh pr merge <n> --squash --delete-branch --match-head-commit <sha>`. In ritmofit-web,
   `gh pr merge <n> --squash --match-head-commit <sha>` (no branch deletion; web `AGENTS.md`
   doesn't grant it).
8. **On failure or stop.** If any step fails, or the night stops for any reason (§7.5, the window
   ending, the issue closing), every PR left open stays open for the owner. On each one where the
   agent applied `owner-approved`, it removes the label and comments why, before stopping, so no
   later session mistakes it for the owner's approval.

### 7.5 Hard stops

- **Never touched:** production, deploys, remote D1, secrets, signing, TestFlight, real xcconfig
  values, or API contract changes.
- **CI fixes:** at most 2 attempts to fix a red CI run per PR, counting a re-run of a flake. After
  that, the PR stays open.
- **Merging stops** if the CI runner goes offline, or if parity turns red from drift in the other
  repo.
- **Timing:** no new PR in the window's last hour, except the handoff PR (§7.8). Everything stops
  at the window's end.

### 7.6 CI hygiene on the Neo

- **Never cancel a CI run by hand.** Both flakes on 2026-11-04 followed a cancelled run (iOS
  RF-1040). Push a branch only once it's reviewed, so that concurrency cancels are rare.
- **No local simulator runs during iOS CI.** Don't build, run or test in a local simulator while an
  iOS CI job is running.
- **Local `pnpm dev:api` only when needed.** Run it only for a PR that touches auth, networking or
  cache sync. Stop it before that PR's CI runs, and prove it stopped: `lsof -i :8787` is empty and
  no `wrangler` or `workerd` process is left.

### 7.7 Claims and hygiene

- **Check results.** State one only with its head SHA, read when you write it.
- **Absence.** Never claim something is absent from output that was cut short (`head`, a page
  limit). Count it, or search the whole output.
- **Paths.** Use absolute paths, or `cd` in the same command; the shell's directory doesn't
  persist. Keep worktrees outside the repo, or excluded from git.
- **Task IDs.** Reserve RF IDs at the start when several worktrees create tasks.
- **JSON.** Write it with non-ASCII characters kept literal.

### 7.8 Close-out

1. **Handoff PR.** Open one last docs PR that only adds the night's handoff and updates RF
   records. The pre-approval issue of the repo it lives in lists it as the queue's last item. It merges under §7.4 like
   the rest. If it can't merge, it stays open for the owner, and the close-out comment says so.
2. **Close-out comment.** Comment on each pre-approval issue: what merged (PR, RF ID, head SHA),
   what is open and why, hard stops hit, flakes and re-runs, and any correction.
3. **Close the issue.**
