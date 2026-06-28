# Stability & regressions

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
> Even if unavailable: read the repo's AGENTS.md, branch per concern, DRAFT PRs only,
> never merge, run build+tests before every PR, cap at 1 PR + a validated agent report.

**REPO:** `ritmofit-web`

**Use when:** production behavior may be broken, flaky, crash-prone, or silently regressing.
**Do not use when:** you only want additive coverage without changing product behavior; use
`test-coverage.md`.

For UI states, visual design drift, or accessibility behavior, defer to `design-system.md` or
`accessibility.md`. For suspected slowness, use `performance.md` first.

Hunt for what will break in prod or is silently broken now. Prefer a PR that adds a
failing regression test reproducing a real bug, THEN fixes it.

- Failing / skipped / flaky tests; tests that assert nothing; happy-paths with no coverage.
- Unhandled rejections; missing error/timeout handling on `fetch` / D1 / music-provider
  adapter calls.
- Every production provider construction path must inject
  `apps/api/src/lib/fetch.ts`'s `boundFetch` into adapters; do not push platform binding
  into the pure adapters. Preserve verified provider quirks such as Spotify search
  `limit=10`.
- D1 migrations that could fail-forward on the remote DB.
- Run-payload generation: keep the nullability contract honest — the iOS client decodes
  this, and a field that becomes optional/null without a contract update crashes that
  client.
