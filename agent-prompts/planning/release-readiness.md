# Release-readiness gate (read-only checklist)

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
