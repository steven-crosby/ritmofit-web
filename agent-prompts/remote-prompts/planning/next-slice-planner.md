# Next-slice planner (brief)

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing survives unless it is committed and pushed**. No human is
> watching in real time — never block on interactive input; surface decisions as written
> recommendations rather than waiting.

> **BRIEF-ONLY.** Do not write product code or open a code PR. Produce a plan I can act on —
> then write it as a validated agent report, commit it, and **push the branch** so it survives
> the sandbox.

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

**Persist it.** Archive the plan as an agent report: start from this repo's
`agent-reports/AGENT_REPORT_TEMPLATE.md`, write it to
`agent-reports/YYYY-MM-DD/planning-next-slice-planner.md` (`inspected_head` = the remote
default-branch head; the proposed slices go under `## Findings`; the recommended first slice is
`## Next recommended action`), run
`./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/planning-next-slice-planner.md`,
then commit it and push the branch. The run is incomplete until validation passes.
