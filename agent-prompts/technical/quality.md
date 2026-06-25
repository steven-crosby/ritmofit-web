# Code quality & simplification

> **Follow the house rules first:**
> `/Users/stevencrosby/Repos/RitmoFit/ritmofit-web/agent-prompts/00-house-rules.md`
> **BEHAVIOR-PRESERVING ONLY.**

**REPO:** `ritmofit-web`

Fix rot, smallest-diff-first:
- Dead code, unused exports / files, commented-out blocks, unreachable branches.
- Duplication worth a shared helper (extract ONLY if it genuinely cuts complexity).
- Over-long / deeply-nested functions or components; naming that drifts from its neighbors;
  structure that drifts from AGENTS.md.
- **Architecture/state smell** (report, don't auto-refactor unless the fix is a trivial,
  behavior-preserving localization): global state — a new Context — introduced where local
  form state (`useState`) would suffice; blurred separation between presentation, the
  Worker/D1 persistence layer, and wire/DTO models; React components reaching straight into
  the network/database layer instead of through the documented seam.

Each PR is a pure cleanup with tests still green. If a "cleanup" changes behavior it's
out of scope → report it, don't ship it. (This is the unattended cousin of your
`/code-review` and `/simplify` skills.)
