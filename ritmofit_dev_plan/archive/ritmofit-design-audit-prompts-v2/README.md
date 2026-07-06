# RitmoFit Design Audit + Mockup Preview Prompt Pack v2

This pack adds a mockup-preview stage before any production code changes.

## Recommended sequence

1. Run `01-ritmofit-design-system-brutal-critique-prompt.md`.
   - Codex output: `docs/audits/ritmofit-design-system-brutal-critique.md`
   - Optional screenshots: `docs/audits/screenshots/ritmofit-design-system-critique/`

2. Run `02-ritmofit-ranked-redesign-prescription-prompt.md`.
   - Codex output: `docs/audits/ritmofit-ranked-redesign-prescription.md`
   - Codex output: `docs/audits/ritmofit-mockup-preview-brief.md`

3. Run `03-ritmofit-redesign-mockup-preview-prompt.md`.
   - Codex output: `docs/audits/mockups/ritmofit-redesign-preview.html`
   - Optional local-only support files: `docs/audits/mockups/ritmofit-redesign-preview.css` and/or `.js`
   - Codex output: `docs/audits/mockups/ritmofit-redesign-preview-notes.md`
   - Optional screenshots: `docs/audits/screenshots/ritmofit-redesign-preview/`

4. After reviewing and approving the mockups, run `04-ritmofit-codex-redesign-agent-prompt-prompt.md`.
   - Codex output: `docs/audits/ritmofit-codex-redesign-agent-prompt.md`

## Rule

The mockup stage must not edit production app/web code. It creates isolated preview artifacts only.
