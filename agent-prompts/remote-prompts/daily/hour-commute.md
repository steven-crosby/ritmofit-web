# Hour commute — 60-minute unattended session (ritmofit-web)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`

**REPO:** `ritmofit-web`
**MODE:** run the standard commute pair, then continue only on evidence
**TIMEBOX:** 60 minutes total, hard stop

This is the "I have closer to an hour, not just enough for one run" variant of the
[remote/background commute loop](../../SCHEDULE.md#remote-background-commute-loop). Any
capable unattended coding agent with push access to this repo can run it — it was written for
a **remote background agent** (for example, a Cursor Background Agent) with a longer window
than the standard 45-minute sentinel pass.

## Run in order

1. `agent-prompts/remote-prompts/daily/changed-code-sentinel.md` — run exactly as written
   (its own 45-minute timebox).
2. `agent-prompts/remote-prompts/daily/command-brief.md` — run exactly as written (its own
   10-minute timebox).

That's ~55 of your 60 minutes. Reserve the final 5 minutes of the *entire* session to finish
committing/pushing whatever is in flight — never start something new inside that last window.

## If you finish steps 1–2 with time still on the clock

Only continue if the command-brief you just wrote names a **concrete, evidence-backed** next
dimension in its "Do next" or "Red flags" section — something from this table:

| Signal in the brief | Run |
|---|---|
| Regressions, flakiness, crash paths | `remote-prompts/technical/stability.md` |
| Slowness / bundle / D1 / caching | `remote-prompts/technical/performance.md` |
| Thin tests around risky code | `remote-prompts/technical/test-coverage.md` |
| Rot / dead code / duplication | `remote-prompts/technical/quality.md` |
| Keyboard / screen-reader / contrast / motion | `remote-prompts/technical/accessibility.md` |
| Backend contract vs. iOS decode risk | `remote-prompts/technical/api-contract-parity.md` |
| Web/iOS copy or terminology mismatch | `remote-prompts/technical/content-consistency.md` |
| Auth, secrets, PII, CVEs | `remote-prompts/technical/security.md` |
| Stale but not vulnerable packages | `remote-prompts/technical/dependency-freshness.md` |
| Weak logs/health/smoke coverage | `remote-prompts/technical/observability.md` |
| Docs no longer match reality | `remote-prompts/planning/doc-drift.md` |

Pick **at most one**, run it exactly as written (it has its own timebox and 1-PR cap — do not
exceed either even if the clock allows it), and stop.

Do **not** run a specialist prompt speculatively "to fill the hour" if the brief found nothing
pointing at a dimension — the anti-churn rule in `agent-prompts/SCHEDULE.md` is explicit that
idle time with no signal means you stop, not that you manufacture a PR. Say so in your final
report instead. A quiet baseline (no open PRs, empty `INBOX.md`, production matching `main`)
can legitimately mean the sentinel and brief finish with nothing to hand off — that is a
correct, complete outcome, not a failed run.

Skip `remote-prompts/technical/design-system.md` regardless of signal — it's written for a
local worktree with a real browser, not this sandbox.

## Deliverables (all required, per house-rules §9)

- Pushed branch(es) for every prompt that opened a PR.
- Draft PR(s), title-prefixed `[auto/<dimension>]`, only if the verification gate was fully
  green.
- A validated, git-tracked agent report per prompt run under
  `agent-reports/YYYY-MM-DD/<prompt-slug>.md`, each passing
  `./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/<file>.md`.
- If nothing PR-worthy turned up anywhere: say so plainly in the reports. That is a valid,
  complete outcome.
