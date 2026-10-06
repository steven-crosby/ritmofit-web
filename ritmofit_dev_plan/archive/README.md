# Archive

Obsolete AI session prompts and dated launch/audit artifacts, kept for provenance but no longer
maintained. Their internal links may be stale. Live guidance is in `../../AGENTS.md`, the active
`ritmofit_dev_plan/` docs, and `HISTORY.md`.

Archived 2026-06-19 (Claude) — the web app is launched and deployed (0 launch blockers), so these
pre-launch and M1-era materials are superseded.

| File | What it was | Superseded by |
|---|---|---|
| `REVIEW.md` | Launch-readiness pre-launch review (findings of record, 0 blockers at close) | `DEVELOPMENT_PLAN.md`, `HISTORY.md` |
| `REVIEW_HISTORY.md` | Dated pre-launch remediation log | `HISTORY.md` |
| `pre_launch_audit_report.md` | Staff-QA audit output (2026-06-18, verdict PASS) | — |
| `ritmofitweb-prelaunch-audit.md` | The Staff-QA audit *prompt* that emitted the report above | — |
| `codex-prompts/` | OpenAI Codex session/audit/hardening prompt sequence | `../../AGENTS.md` + `../../agent-prompts/daily/close-session.md` |
| `session-prompts.md` | M1 build-order copy-paste implementation prompts | M1–M4 shipped |
| `ai-working-rules.md` | M1-era plan→confirm working agreement | `../../AGENTS.md` → "Working Agreement" |
| `brand-mockup-review.md` | One-off frontend ↔ design-system conformance review (2026-06-13) | — |
| `structclub-parity-audit.md` | Point-in-time competitive audit vs. StructClub (2026-06-24) | `web-launch-readiness.md` (archived), `../DEVELOPMENT_PLAN.md` |
| `security.md` | Pasted generic "Web Security" platform guide (not Ritmo Studio-specific) | — |
| `web-launch-session-plan.md` | Session-by-session execution log for the (completed) Web Launch Readiness milestone — every session 0–9 done | `web-launch-readiness.md` (archived gate), `../HISTORY.md` (deploy log) |
| `web-live-test-report-2026-06-29.md` | Point-in-time production live-test report (2026-06-29, 0 blockers) | `../HISTORY.md` |
| `cues-vs-notes-decision.md` | Resolved + shipped decision record: do **not** split cues/notes; Live now renders `class_tracks.notes` | `../DEVELOPMENT_PLAN.md` backlog pointer |
| `ritmofit-design-audit-prompts-v2/` | Design critique → redesign-prescription prompt pack (RitmoFit-era naming; wrote to a since-removed `docs/audits/`). Archived 2026-07-06 | `remote-loop/agent-reports/studio-aesthetic-critique.md`, `remote-loop/agent-reports/studio-redesign-prescription.md` |
| `solo-first-reset-implementation.md` | One-off implementation prompt for the D20 solo-first reset (shipped, PRs #203/#206). Archived 2026-07-06 | `../decisions.md` → D20 |

Archived 2026-10-06 (Claude Code, docs-workflow session) — superseded planning docs and the retired
remote maintenance loop:

| File | What it was | Superseded by |
|---|---|---|
| `remote-loop/` | Unattended remote prompts, `SCHEDULE.md`, and the `agent-reports/` archive + validator — see [`remote-loop/README.md`](./remote-loop/README.md) | `../../agent-prompts/README.md` (session/lane workflow), `../handoffs/` |
| `milestones.md` | Milestone roadmap + definitions of done; "active focus" frozen at 2026-07-07; its dated log already moved to `HISTORY.md` | `../DEVELOPMENT_PLAN.md` (Milestones headline, current focus), `../HISTORY.md` |
| `overview.md` | Product overview, near-duplicate of the plan's "What Ritmo Studio is" | `../DEVELOPMENT_PLAN.md` |
| `web-launch-readiness.md` | Web launch gate and post-launch deferrals (self-declared historical) | `../DEVELOPMENT_PLAN.md` backlog |
| `classes-home-redesign.md`, `classes-home-redesign-mockup.html` | Unauthorized-at-the-time Classes home redesign proposal + mockup; the Classes home shipped in #438 | `../class-scaffold-contract.md`, `../HISTORY.md` |
