# Next-slice planner (read-only)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends; nothing on disk persists, so this prompt's deliverable is the brief you
> return as your final response. No human is watching in real time — never block on interactive
> input; surface decisions as written recommendations rather than waiting.

> **READ-ONLY.** Do not write code or open PRs. Produce a plan I can act on.

**REPO:** `ritmofit-web`

1. Read the live source of truth — `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` — plus recent
   merged work, to find the next logical slice.
2. Propose the next 1–2 slices. For each:
   - Goal in one sentence + why it's next.
   - Concrete steps / files likely touched.
   - Acceptance criteria (testable).
   - Risks, unknowns, and any iOS-client dependency (e.g. a backend endpoint the iOS app
     is waiting on, or a contract change that will require an iOS reconcile).
   - Rough size (S / M / L).
3. Flag anything in the plan docs that's already done but unchecked, or stale.
4. **Gap hunt before committing to a slice.** For the feature in question, surface what's
   not yet thought through:
   - **UX gaps:** missing loading / error / empty states and unhandled edge cases.
   - **API completeness:** does the `apps/api/openapi/openapi.json` contract fully support
     it (endpoints, params, error responses, pagination)? This backend is the source of
     truth for both clients, so design the contract so the iOS client can consume it
     without server-entity variants of its own.
   - **Safety/architecture:** any shared-safety-rule risk (provider audio, exposed keys).
   End with **3–5 pointed clarifying questions** for me to resolve before development —
   this is a planning prompt, so prefer surfacing the right questions over guessing.

Keep it tight enough to drop straight into the plan doc. (Pairs with the **Plan** agent
for a deeper architecture pass, and with `daily/start-session.md` to kick off the build.)
