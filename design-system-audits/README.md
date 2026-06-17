# Design-System Audit Artifacts

Process/history artifacts for the RitmoFit design system. These are **not** part of the design system
itself — the canonical design system lives in [`../ritmofit_design_system/`](../ritmofit_design_system/)
(`tokens.json` is its source of truth). These were moved here so the canonical folder holds only the
system.

| File | What it is |
|---|---|
| `audit-prompt.md` | Reusable prompt to audit a design-system folder for internal consistency. |
| `bakeoff-synthesis-prompt.md` | The original bake-off prompt that compared two competing design-system folders (`claude-…` / `gemini-…`, since removed) and synthesized one. Historical — references source folders that no longer exist. |
| `audit-findings.md` | The findings/executive-summary output from auditing the integrated system. |

The workspace-root `ritmofit-design-system-final/` is the frozen **audit-source snapshot** (see the web
`README.md` → "Design system & tokens"); it retains its own copies of the prompt artifacts.
