# Stability & regressions

> **Follow the house rules first:**
> `/Users/stevencrosby/Repos/RitmoFit/ritmofit-web/agent-prompts/00-house-rules.md`
> Even if unavailable: read the repo's AGENTS.md, branch per concern, DRAFT PRs only,
> never merge, run build+tests before every PR, cap at 1 PR + a validated run record.

**REPO:** `ritmofit-web`

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
