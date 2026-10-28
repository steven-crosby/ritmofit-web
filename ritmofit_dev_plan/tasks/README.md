# Repository task system

<!-- Codex, 2026-10-27: Established repository-owned tasks and replaced tool snapshots. -->

The canonical actionable backlog is this directory's `RF-<number>.json` records. The
[board](../tasks.md) is generated from them. Every tool and human works from the same git records;
no external board, account, project store, plugin, database, or hosted service is required.

## Everyday use

From the repository root (Node 22; no additional dependencies):

```bash
pnpm tasks list                    # all tasks
pnpm tasks list blocked            # one status
pnpm tasks show RF-29               # full acceptance, blocker and evidence
pnpm tasks create "Describe an observable outcome"
pnpm tasks update RF-97 patch.json  # shallow JSON object; arrays replace whole arrays
pnpm tasks:render                   # regenerate the Markdown board
pnpm tasks:check                    # validate records, evidence paths and board drift
pnpm tasks:test                     # isolated fixtures; never edits the real board
```

You can also edit a record directly in any editor. For a new task, refine the generated acceptance
and next action before starting it. `create` starts in Backlog; it does not authorize execution.
`update` rejects ID changes, validates the resulting graph, refuses stale reads, and uses an
exclusive lock for competing command updates to the same record. The record is authoritative;
rendering is explicit so a failed renderer never loses a task update. Commands never execute
evidence text, contact providers, stage, commit, push, merge, deploy, or change task status implicitly.

Task changes follow the normal branch and PR workflow, including docs-only updates. Approval for
implementation does not imply authorization to publish those changes.

## Record format

All fields below are required except `imported`. Unknown fields fail validation.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `id` | Stable `RF-N`, matching the filename. Never reuse or renumber it. |
| `title` | One line describing the task's bounded outcome. |
| `kind` | `task`, `plan`, `investigation`, `verification`, `release`, `documentation`, `group` |
| `status` | Lifecycle state from the table below. |
| `priority` | `P0`–`P3` or `untriaged`; numbering and board order are not priority. |
| `parent` | Grouping only, or `null`. It does not grant execution authority or imply a dependency. |
| `dependsOn` | Prerequisite RF IDs. Ready, In progress, Review and Done require these tasks Done. |
| `acceptance` | Nonempty list of observable checks for this task's scope. |
| `nextAction` | Required on open tasks; `null` on Done/Cancelled. |
| `blocker` | Required only for Blocked; names the missing input, decision or external condition. |
| `evidence` | Entries with `kind`, `ref`, `summary`, `checkedOn`. See below. |
| `resolution` | Required for Done/Cancelled; `null` otherwise. Explains the actual result. |
| `followUps` | IDs retaining remaining work outside this task's bounded acceptance. |
| `imported` | Original snapshot status and title; provenance, never current authority. |

Evidence kinds are `source`, `pr`, `test`, `observation`, `document`. A `ref` is an HTTPS link or an
existing repo-relative file, optionally with a fragment. Tool-local and absolute filesystem paths
are rejected. `checkedOn` is an absolute `YYYY-MM-DD`, or `null` for carried-forward evidence.
A dated entry must say exactly what was checked: a PR merge check proves the merge, not audible
playback, product acceptance, a deploy, or a production migration. A source claim stays **recorded**
until its claimed behavior is actually verified. Never date a copied claim as fresh verification.

## Lifecycle and completion

| State | Meaning / exit condition |
| --- | --- |
| Backlog | Captured; scope, priority or approval may still be missing. |
| Ready | The owner's queue. Scope and acceptance are clear and prerequisites Done; the owner (or an agent at the owner's explicit request) set it, so any agent may execute it. An agent never promotes its own task. |
| In progress | A session is executing it, claimed by an open draft PR. State the session/branch and restart action. |
| Blocked | Waiting for a device check, document, account, decision or other condition; state who/what unblocks it. |
| For review | A plan, change or bounded result awaits review. This is not approval. |
| Done | This task's acceptance is met, evidence and resolution are present, all children are closed, and prerequisites are Done. |
| Cancelled | Scope was rejected, superseded or duplicated; explain why and link the replacement where applicable. Cancellation does not satisfy a prerequisite. |

The validator checks structure and relationships; reviewers must assess the truth and adequacy of
acceptance and evidence. It cannot infer human approval or validate an audible result. A PR merge,
deployment, investigation, and product acceptance can each be separate tasks with different
completion bars. Never close a playback outcome just because a proposed fix shipped. If scoped
implementation is done while acceptance remains, name a verification follow-up and keep the
product acceptance task open. Reopen a task by clearing its resolution and supplying a next action.

**Status is not authorization.** Task records never replace Steven's permissions for commit, push,
PR, merge, release, deploy, send, delete, or production access. The standing grant in `AGENTS.md` ›
"Delegation And Merge Policy" is where commit, push and PR come from; merging also needs the owner's permission for that PR. Ready is the only status that
grants anything (execution of that scope); a Ready label an agent set for itself grants nothing. Record the boundary in the next action.

## Authority, sync and concurrent work

- Tasks own actionable scope, dependencies, acceptance, evidence and current next action.
- `DEVELOPMENT_PLAN.md` owns product direction and a compact current-focus/production statement;
  link task IDs instead of maintaining a second actionable backlog.
- Handoffs own session restart details and observations. Reference task IDs instead of copying
  their mutable statuses. Historical observations keep their dates and are not live authority.
- `HISTORY.md` owns deployment and shipped-event evidence. Plans and decisions keep the detailed
  rationale; tasks point to tracked plans instead of embedding divergent copies.
- [Start-session](../../agent-prompts/daily/start-session.md) reads relevant records in every mode,
  names their revision and compares upstream/in-flight changes. Orientation is read-only. A stale
  generated board can be bypassed using valid JSON records read-only; invalid records/paths block
  dependent work. Neither case makes an external view authoritative.
- After scope approval, select/create the task, confirm prerequisites, and record In progress with
  the session/branch and restart action, then render, validate and open a draft PR as the visible
  claim. Add its URL as `pr` evidence. New tasks start in Backlog; only the owner sets Ready.
- [Close-session](../../agent-prompts/daily/close-session.md) reconciles acceptance and remaining work,
  finishes evidence/handoff/docs edits and authorized retirements, then renders and validates the
  final records before any publication. A later file edit repeats final validation. The final state
  (usually Done) lands in the work PR itself, so merging publishes it; CI's RF-trace step requires a
  product PR to change a record citing it. Merging follows the standing grant and final-head checks.
- Before retiring a document used as task evidence, preserve its evidence in a durable repo file
  or immutable commit link and update the reference without upgrading its verification status.
  Final validation must run after retirement, not just before it.
- External views may be generated from these records. They must not introduce their own
  authoritative states or require a snapshot to resume work. No two-way remote sync is included.

Each task has its own file, reducing conflicts between concurrent sessions. `create` allocates
above the largest known ID with a floor of RF-86, and exclusive creation prevents an overwrite in
one checkout. Across checkouts, allocate on current main before parallel work, or coordinate ID
ranges. If two unpublished branches choose the same new ID, resolve explicitly before merge and
update all references. Published IDs never change. Concurrent edits to the same task require
reconciliation; do not resolve by blindly taking one side. Board conflicts are resolved by
re-rendering only after the records are reconciled. CI rejects stale output.

## Migration and review, 2026-10-27

Baseline: `f35d5d5992035c3895b948b3dc90e96ea6eaffa1`. Imported all **84** unique records through
RF-86. RF-20 and RF-27 were absent; they remain reserved gaps, not invented or recycled tasks.
Each imported record links to its immutable original line and preserves the original status/title.
Existing Done claims are historical, not freshly certified. Untriaged priority is deliberate.

The adversarial review found these operational failures and dispositions:

| Finding | Correction / retained work |
| --- | --- |
| Canon said repo/main was authoritative but the snapshot named an external live board; start/close never read or updated it. | Repo JSON records are now canonical; session prompts and CI own the sync path. |
| RF-22 remained In progress though #592 merged; RF-24 remained For review though #594 merged; RF-86 described a handoff already merged as #639. | Closed their bounded implementation/documentation scopes using checked PR state. RF-88 retains open deploy guard tests. |
| RF-32 still waited for B though B and A shipped. | Replaced its next action with explicit B/A/C acceptance reconciliation. Do not infer full C completion from the builder-navigation fix. |
| RF-80's plan and root-cause document exist only in a project store. | Marked Blocked. Recover the actual documents into git; no invented replacement plan or implementation approval. |
| RF-11 was Done but deferred open-tab deployment proof. | Scoped RF-11 to implementation and created RF-87 for verification. No deployment authorized. |
| FairPlay investigations/fix deploys accumulated Done labels while the iPhone outcome failed. | RF-29 is explicitly Blocked with audible acceptance and the exact owner retry; investigation tasks retain RF-29 as follow-up without claiming proved root cause. |
| Open #596 and #625 had no RF entries; six P1 audit findings had no RF intake. | RF-88/89 track PR review. RF-90–93 capture four proposed packets covering six P1s; RF-94 retains the remaining audit intake. Fixes are not approved by intake. |
| Development Plan still awaited an iPhone check that the latest handoff said failed. | Current focus now points to the task outcome and dated handoff. |
| Parent links were a mix of indentation and caret text. | Explicit parent fields, graph checks and terminal-parent checks. No dependency inferred merely from numbering. |

RF-96 retains the outstanding legacy backlog/handoff reconciliation. RF-95 tracks this local implementation and its publication boundary. These are task-system
findings, not a new certification of application behavior. The engineering audit's reproductions
were read, not rerun. Old handoffs remain dated historical records; current tasks supersede their
mutable next-action statements. No handoff was silently rewritten or deleted.
