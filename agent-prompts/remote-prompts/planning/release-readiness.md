# Release-readiness gate (checklist)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing survives unless it is committed and pushed**. No human is
> watching in real time — never block on interactive input; surface decisions as written
> recommendations rather than waiting.

> **BRIEF-ONLY.** Run before cutting a slice / release. Don't fix anything here — produce a
> go / no-go checklist with evidence, then write it as a validated agent report, commit it, and
> **push the branch** so it survives the sandbox.

**REPO:** `ritmofit-web`

Check and mark ✅ / ❌ / ⚠️ with a one-line note + pointer each:

- **Tests:** full suite green? any skipped / flaky?
- **Build / CI** clean; no type errors (the full `AGENTS.md` gate, SPA + Worker).
- **Design:** on-spec against the canonical `ritmofit_design_system`; no hardcoded tokens
  in the changed surface; states covered.
- **Security:** no secrets / PII in the diff, logs, or bundled SPA; auth paths unchanged or
  reviewed.
- **Migrations (D1):** forward-safe on the remote DB? rollback thought through?
- **Contract:** if `openapi.json` moved, is the change intentional and the iOS-client
  impact noted?
- **Docs:** AGENTS.md / `ritmofit_dev_plan` / changelog updated to match what's shipping.
- **Open questions / known issues** called out.

End with a clear **GO** or **NO-GO** and the shortest path to GO if blocked.

**Persist it.** Archive the checklist as an agent report: start from this repo's
`agent-reports/AGENT_REPORT_TEMPLATE.md`, write it to
`agent-reports/YYYY-MM-DD/planning-release-readiness.md` (`inspected_head` = the remote
default-branch head; the ✅/❌/⚠️ items go under `## Findings`; the GO/NO-GO call and shortest
path are `## Next recommended action`), run
`./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/planning-release-readiness.md`,
then commit it and push the branch. The run is incomplete until validation passes.
