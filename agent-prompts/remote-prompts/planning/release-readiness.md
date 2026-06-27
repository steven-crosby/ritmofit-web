# Release-readiness gate (read-only checklist)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends; nothing on disk persists, so this prompt's deliverable is the brief you
> return as your final response. No human is watching in real time — never block on interactive
> input; surface decisions as written recommendations rather than waiting.

> **READ-ONLY.** Run before cutting a slice / release. Produce a go / no-go checklist
> with evidence — don't fix anything here, just report what's blocking.

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
