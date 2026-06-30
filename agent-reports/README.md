# agent-reports (ritmofit-web)

The durable, **repo-local** archive of after-action reports written by the autonomous
prompts in [`../agent-prompts/`](../agent-prompts/). Everything pertaining to
**ritmofit-web** stays in this repo; the sibling **ritmofit-ios** keeps its own
`agent-reports/` archive. There is no longer a shared workspace-level report folder.

## Why this exists

The audit/triage/sentinel prompts are deliberately exhaustive — more detail than anyone
wants to read in full every day. Reports land here so that:

1. each run leaves a durable, validated record (durable across clones **and**
   cloud/ephemeral agents, because the archive is git-tracked and travels with the repo);
2. a later **reviewer/digest agent** can read the day's reports and hand the owner a short
   "what actually matters" summary, instead of the owner reading each one; and
3. follow-up runs (e.g. `changed-code-sentinel`) can find the previous `inspected_head`
   to compute the next changed-code delta.

## Structure

```
agent-reports/
  README.md                     # this file
  AGENT_REPORT_TEMPLATE.md      # copy this to start a report
  validate-agent-report.sh      # a run is incomplete until this passes
  studio-aesthetic-critique.md  # special Studio design critique output
  studio-redesign-prescription.md # special ranked redesign prescription output
  YYYY-MM-DD/
    <prompt-slug>.md            # e.g. 2026-06-26/changed-code-sentinel.md
    <prompt-slug>.md            # e.g. 2026-06-26/technical-security.md
```

- One file per prompt run, under a dated folder. `<prompt-slug>` mirrors the prompt path
  **relative to `agent-prompts/remote-prompts/`** with `/` replaced by `-` (e.g.
  `technical/security` → `technical-security.md` — no `remote-prompts-` prefix).
- If the same prompt runs twice in one day, suffix the second `-2`, `-3`, ….
- The repo is implied by the location, so filenames don't repeat `-web`.
- Exception: the two-stage Studio design critique writes root-level reports
  (`studio-aesthetic-critique.md` and `studio-redesign-prescription.md`) by design, because
  those reports are handoff artifacts for owner-led redesign planning rather than recurring
  maintenance audit records. Re-runs should use a date/version suffix at the root.

## Which prompts write here

Autonomous passes that produce findings archive a report; interactive live decision-aids
do not. The authoritative list lives in [`../agent-prompts/README.md`](../agent-prompts/README.md);
in short:

- **Archive:** `remote-prompts/daily/changed-code-sentinel`,
  `remote-prompts/daily/command-brief`, every `remote-prompts/technical/*` audit,
  all `remote-prompts/planning/*` (`pr-triage`, `doc-drift`, `next-slice-planner`,
  `roadmap-sync`, `release-readiness`).
- **Root-level special reports:** `claude-design-critique/studio-aesthetic-critique` and
  `claude-design-critique/studio-redesign-prescription`.
- **No report:** `daily/start-session`, `daily/close-session` (interactive).

## Rules (from [`../agent-prompts/remote-prompts/00-house-rules.md`](../agent-prompts/remote-prompts/00-house-rules.md))

- Start from `AGENT_REPORT_TEMPLATE.md`. Fill every required frontmatter field.
- Run `./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/<file>.md`. A run
  is **incomplete** until validation passes.
- A report is never mixed into a code diff as a `FINDINGS.md`. It lives here, under
  `agent-reports/`. A run that also opens a code PR may commit its report on the same
  branch (in this folder) — separate from the code change, never inside it.
