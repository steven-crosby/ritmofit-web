# Observability & smoke evidence

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
>
> **PR-PRODUCING.** Open a draft PR for a low-risk, fully-verified improvement (a missing
> non-secret log field, a corrected smoke-test doc, an extended smoke checklist). External
> monitoring vendors, telemetry pipelines, production cron jobs, alerting thresholds, retention
> or privacy tradeoffs, and any new infrastructure stay **report-only** — never stand them up
> unattended.

**REPO:** `ritmofit-web`

**Use when:** logs, health checks, error envelopes, smoke-test coverage, or deploy evidence may be
insufficient to diagnose production issues.
**Do not use when:** the primary concern is a known correctness bug; use `stability.md` first.

Audit whether a production issue could be detected, diagnosed, and verified without guessing:

- **Health and smoke coverage:** `/api/v1/health`, SPA shell, protected endpoints returning 401,
  code-split assets, and any feature-specific smoke paths named in
  `ritmofit_dev_plan/deployment-runbook.md` and `agent-prompts/daily/close-session.md`.
- **Error envelopes:** routes and middleware preserve the standard
  `{ error: { code, message, details? } }` shape and do not leak secrets, tokens, provider
  payloads, or private user data.
- **Logs:** failures have enough sanitized context to debug Worker, D1, auth, provider, and email
  issues; logs do not include credentials, cookies, authorization headers, private keys, or provider
  tokens.
- **Operational records:** recent entries in `ritmofit_dev_plan/HISTORY.md`, agent reports, and PR
  descriptions include the Worker version, remote migration state, verification commands, and smoke
  evidence when relevant.
- **Blind spots:** repeated production smokes that only check `/health`, missing protected-route
  checks, missing provider callback failure checks, or deploy docs that no longer match reality.

Output a ranked observability report:

- **Detect:** would this issue show up in checks, smokes, logs, or records?
- **Diagnose:** is the evidence specific enough to identify the failing layer?
- **Verify:** is there a documented smoke or test proving the fix after deployment?

Open a draft PR only for small, low-risk improvements such as correcting stale smoke-test docs,
adding a missing non-secret log field, or extending an existing smoke checklist. Anything involving
new infrastructure, retention policy, production monitoring, alerting thresholds, or privacy tradeoffs
is report-only with a recommended owner decision.
