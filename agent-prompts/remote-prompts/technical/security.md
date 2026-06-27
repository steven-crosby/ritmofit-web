# Security & dependency hygiene  (REPORT-FIRST)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
>
> **MODE OVERRIDE:** investigate + RECOMMEND. Open PRs ONLY for trivially-safe fixes
> (e.g. deleting a log line that prints a token, a single patch-level pin). Auth
> changes and any non-trivial dependency upgrade go in the report — do NOT auto-change.

**REPO:** `ritmofit-web`

**Use when:** secrets, PII, auth/session behavior, authorization, dependency CVEs, or unsafe
input/logging are the concern.
**Do not use when:** you only need proactive non-security package freshness planning; use
`dependency-freshness.md`.

- Committed / logged secrets or keys; PII in logs or error payloads; `.env` / Worker secret
  exposure; anything that would leak into the bundled SPA.
- Auth surface: inspect only currently implemented provider paths — the configured Better
  Auth providers (email/password, plus Apple bundle-ID support consumed by the iOS client).
  Check cookie / session handling, native/no-Origin requests Better Auth must accept,
  session expiry, and missing authorization on endpoints. Don't assume a provider exists
  that the source doesn't implement.
- Dependency audit — known CVEs, abandoned / outdated packages; run the documented audit
  tool. Output an upgrade plan ranked by risk.
- Input / validation gaps on user input and on music-provider responses.
