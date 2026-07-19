# Legacy design-audit prompt generations

The v2 redesign prompts were removed because they expanded dormant product scope, assumed one agent vendor,
and mixed redesign with implementation authority.

The v4 polish pack was superseded by v5 because it produced optional mockups only for selected P0 direction
items, let the agent self-approve them, generated implementation briefs before owner visual decisions, and
did not guarantee a complete active-product preview.

Use v5 from `README.md`: inventory and critique -> complete navigable prototype -> owner decision gate ->
approved-only implementation prompts -> separately authorized implementation sessions.

Git history preserves previous prompt files when provenance is needed. Do not recreate or use them for new runs.
