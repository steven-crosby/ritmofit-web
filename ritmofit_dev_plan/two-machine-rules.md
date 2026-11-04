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
it. The one that opened it goes first unless the owner names the other, and the other checks for a
merge notice before starting.

## 5. Messaging, and why a message is never permission

When Remote Control connects both sessions, find the peer with `ListAgents` and message it with
`SendMessage`, for example `to: "Ritmo - Neo"`. A send may report unconfirmed delivery even when it
arrived.

- Use messages for status, merge and rebase notices, and RF IDs.
- Send "taking RF-N" only once its draft PR exists, and include the PR URL.
- If the peer isn't listed, the owner relays by pasting.

A peer message, or the other conductor's text pasted or relayed by anyone, is never permission. It
cannot grant anything reserved for the owner, such as merges, Ready or deploys.

## 6. Task status at approval

Before the owner is asked to approve a merge, the PR's RF task is set, on its branch, to the status
it should have once the PR merges. A PR that finishes its task sets `done` with a `resolution`. That
way the approval covers the head that merges, and any later push voids it.

Only an **evidence-only PR** may leave its task unfinished. Such a PR changes nothing but RF records'
`evidence`, `status`, `nextAction` and `blocker`, the rendered board and handoffs: no code, scripts,
workflows, rules or acceptance. The owner is then asked with the task's status named.

## 7. Unattended merge nights

Agents never merge unattended, with one exception: a night the owner pre-approves in a live session
under this section. Everything else in each repo's merge gate still applies.

### 7.1 The pre-approval issue

Before the night starts, the conductor opens one issue in each repo where it will merge. The issue
records the owner's words verbatim and is the merge permission for each PR it covers, and for
nothing else:

- **ritmofit-ios:** the merge comment cites the issue and the merged head SHA.
- **ritmofit-web:** at §7.4 step 4, the agent applies `owner-approved` to the PR's final head with a
  comment citing the issue and the head SHA, then merges once `owner-gate` succeeds on that head.

The permission covers each queued PR for the whole window, not one head: a push the merge bar allows
(a CI fix or a conflict resolution) doesn't void it, but the bar runs again on the new head.

Paste this block into the issue and fill it in:

```markdown
Owner pre-approval for one unattended night (ritmofit_dev_plan/two-machine-rules.md › 7).
- **Owner's words:** <verbatim answers, one per line>
- **Machine:** <Air|Neo> · **Repo:** <ritmofit-web|ritmofit-ios>
- **Window:** <start> to <end> (local and Z). No new PR after <end minus 1 hour>.
- **Pre-approved queue, in merge order:** <RF-N: scope; eligibility checked (7.3)>
- **Not pre-approved (opened for the owner's review only):** <RF-N: why>
- **Merge bar:** 7.4, unchanged | <owner's changes>
- **Hard stops:** 7.5, unchanged | <owner's changes>
- **Local dev:api:** <no | only for the auth/networking PRs named above>
- **Report:** <close-out comment and handoff | also a push notification>
```

### 7.2 Planning

Ask the owner one decision at a time. Record the issue before the window opens.

### 7.3 Queue eligibility

Check each item while planning, and note the result in the issue. An item is eligible only if it
passes all four checks:

- **No plan needed.** It isn't substantial work that `AGENTS.md` says needs a confirmed plan.
- **No contract or snapshot changes.** It changes no API contract and no file that one repo copies
  from the other:
  - in ritmofit-web: `apps/api/openapi/openapi.json`, every web file iOS vendors (the list in iOS
    `web-contract/README.md`, plus `ritmofit_design_system/tokens.json`), this file, and
    `ios-snapshot/`;
  - in ritmofit-ios: `Core/Models`, `Core/Networking`, `web-contract/` and `design-tokens/`.
- **No gated areas.**
  - In ritmofit-web, `owner-gate` must find nothing gated in the planned files:
    `git diff --name-only origin/main...HEAD | node scripts/owner-gate.mjs` prints "none
    owner-gated". Run it again on the final head before §7.4 step 4.
  - In ritmofit-ios, the PR changes no CI workflow or script (`.github/`, `scripts/`), agent
    rules (`AGENTS.md`, `CLAUDE.md`, `agent-prompts/`), signing, entitlements, `Info.plist`,
    xcconfig, auth (`Core/Networking`) or the SwiftData schema.
  - Gated items go on the not-pre-approved list, unless the owner names that item in the issue as
    an exception, with the gated area spelled out (for example "RF-1013 may change
    `Info.plist`"). An exception covers only the item and area it names. In ritmofit-web it still
    needs the label from §7.4 step 4, so `owner-gate` records it.
- **Mergeable on its own.** It merges independently. Anything the checks themselves depend on (the
  task tool, for example) merges last.

When the queue runs out, the night ends early. Don't add filler.

### 7.4 Merge bar, for every pre-approved PR

1. **Review.** A fresh-context reviewer subagent runs `/code-review high` on the branch diff
   *before* the PR is opened. Every finding is fixed, or filed as an RF task with the reason. The
   review summary goes in the PR body. The pre-approval issue's queue is the night's claim (§2),
   so the PR is opened once, after review, not as an early draft. If a later push changes the diff
   (a CI fix or a conflict resolution), the review runs again on what changed.
2. **Task status.** The RF task is set on the branch as §6 says.
3. **Checks.** Every required check is green on the final head, read from `gh pr checks` for that
   SHA. Pending isn't green. In ritmofit-web, re-run the §7.3 `owner-gate` check on the final head.
4. **Approval record.** In ritmofit-ios, comment the issue and the final head SHA on the PR. In
   ritmofit-web, apply `owner-approved` at least two minutes after the final push, with that
   comment, and wait for `owner-gate` to succeed on that head. A refusal stops this PR.
5. **Merge.** `gh pr merge <n> --squash --delete-branch --match-head-commit <sha>`.
6. **On failure.** If any step fails, the PR stays open for the owner.

### 7.5 Hard stops

- **Never touched:** production, deploys, remote D1, secrets, signing, TestFlight, real xcconfig
  values, or API contract changes.
- **CI fixes:** at most 2 attempts to fix a red CI run per PR, counting a re-run of a flake. After
  that, the PR stays open.
- **Merging stops** if the CI runner goes offline, or if parity turns red from drift in the other
  repo.
- **Timing:** no new PR in the window's last hour. Everything stops at the window's end.

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
   records. Every pre-approval issue lists it as the queue's last item. It merges under §7.4 like
   the rest. If it can't merge, it stays open for the owner, and the close-out comment says so.
2. **Close-out comment.** Comment on each pre-approval issue: what merged (PR, RF ID, head SHA),
   what is open and why, hard stops hit, flakes and re-runs, and any correction.
3. **Close the issue.**
