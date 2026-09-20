# instructor-ux — the creation-journey UX pack

Two attended, local-only passes that judge the **instructor class-creation journey** against one
product principle: **Simple. Stupid. Swift.** One ships a correction; the other tries to prove the
journey still fails.

<!-- Authored by Claude Opus 5 (Claude Code), 2026-09-20. -->

| File | Run it | Deliverable |
|---|---|---|
| [`00-frame.md`](./00-frame.md) | Never on its own — both passes read it first | — |
| [`01-build-pass.md`](./01-build-pass.md) | When the creation journey needs a real look and you have a browser, local dev, and one plan gate's worth of attention | A PR for one slice + a conversation-owned findings report |
| [`02-challenge-pass.md`](./02-challenge-pass.md) | **After** the build pass's slice lands on `main`, in a fresh session — ideally a different model or tool | A conversation-owned findings report. **No code, no commits, no PR.** |

`00-frame.md` carries everything both passes share: the canonical principle, the two instructor
personas, the eight-step journey scope, the shipped baseline with verified file paths, the
`UXF-1`…`UXF-5` fixtures, and the verification floor. Keeping shared operational guidance in one file
reduces duplication between the two passes; canonical §0 remains authoritative and must be checked
before each run.

## Scope

In: class creation entry → scaffold vs empty → Builder entry → plan blocks → choosing and assigning
music → planned vs actual duration → playback windows and song details → knowing the next step.

Out: Live Mode performance, the Music workspace, Account, marketing/auth, and every deferred
community surface (D20).

## How this differs from the neighbours

| Prompt | Environment | Lens | Output |
|---|---|---|---|
| **`instructor-ux/`** (this pack) | Local dev, seeded, deterministic fixtures | One product principle, one journey, two instructor personas | PR + findings report (build); findings report only (challenge) |
| [`../live-ux-deep-dive.md`](../live-ux-deep-dive.md) | **Production** (`ritmofit.studio`) | Design canon **+** modern standards (WCAG 2.2, CWV, SaaS conventions), all surfaces | Artifact, report-only |
| [`../remote-prompts/technical/design-system.md`](../remote-prompts/technical/design-system.md) | Local, **unattended** | Canon drift only (tokens vs code vs render) | Committed report |
| [`../design-audit/`](../design-audit/) | Local, attended, hours | Full-product audit + redesign preview | A `docs/audits/` folder |

None substitutes for another. This pack is the narrow one: one journey, one principle, judged by
whether an instructor has to think about the software.

## Where the principle lives

**Simple. Stupid. Swift. is canon** (2026-09-20). Full statement:
[`../../ritmofit_design_system/01-design-principles.md`](../../ritmofit_design_system/01-design-principles.md)
§0, summarized in
[`ritmofit-design-system.md` §3.0](../../ritmofit_design_system/ritmofit-design-system.md). Decision and
trade-off: [`../../ritmofit_dev_plan/decisions.md`](../../ritmofit_dev_plan/decisions.md) **D23**.
`00-frame.md` routes both passes to canonical §0 rather than copying it.

This pack is the audit surface for that principle, not its source. It applies to the creation journey;
§0 applies everywhere.

## Cadence

Not on one. See [`../SCHEDULE.md`](../SCHEDULE.md) › Trigger map. Run the build pass when the
creation journey is genuinely the concern; run the challenge pass once after a slice lands. Do not
run either to keep a schedule full.
