# Dependency freshness  (REPORT-FIRST)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
>
> **MODE:** investigate + RECOMMEND. The proactive cousin of `security.md`'s CVE scan —
> "what's behind, and is it safe to move?" Open a PR ONLY for a single, obviously-safe
> patch bump with green tests. Everything else → report.

**REPO:** `ritmofit-web`

**Use when:** packages may be stale and you want a ranked upgrade plan before changing them.
**Do not use when:** the immediate concern is an active CVE, secret exposure, or auth risk; use
`security.md` first.

- Inventory outdated packages with `pnpm outdated` plus the documented audit command.
  Group as patch/minor/major.
- For each notable one: current → latest, changelog-risk (breaking changes? migration
  needed?), and a recommended action.
- Call out anything pinned for a known reason — don't recommend undoing a deliberate pin
  without flagging it.
- Watch the load-bearing dependencies: Cloudflare Workers/Wrangler, D1 tooling, Vite, and
  Better Auth.

Output a ranked upgrade plan: **do now (safe)** · **schedule (needs testing)** ·
**hold (risky)**.
