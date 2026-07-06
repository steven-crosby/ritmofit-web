# Code quality & simplification

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
> **BEHAVIOR-PRESERVING ONLY.**

**REPO:** `ritmofit-web`

**Use when:** behavior-preserving cleanup, simplification, dead code removal, or structure
alignment is the goal.
**Do not use when:** a bug fix, architecture decision, migration, or user-visible behavior change
is needed; report those or use the relevant specialist prompt.

Fix rot, smallest-diff-first:
- Dead code, unused exports / files, commented-out blocks, unreachable branches.
- Duplication worth a shared helper (extract ONLY if it genuinely cuts complexity).
- Over-long / deeply-nested functions or components; naming that drifts from its neighbors;
  structure that drifts from CLAUDE.md.
- **Architecture/state smell** (report, don't auto-refactor unless the fix is a trivial,
  behavior-preserving localization): global state — a new Context — introduced where local
  form state (`useState`) would suffice; blurred separation between presentation, the
  Worker/D1 persistence layer, and wire/DTO models; React components reaching straight into
  the network/database layer instead of through the documented seam.

Each PR is a pure cleanup with tests still green. If a "cleanup" changes behavior it's
out of scope → report it, don't ship it. (This is the unattended cousin of your
`/code-review` and `/simplify` skills.)
