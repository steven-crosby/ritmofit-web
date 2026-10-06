---
prompt: planning/next-slice-planner
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-29
inspected_head: d2b7b4f7cd6db1522f99f960bec935509aaf9d79
inspected_range: full-repo
completed: true
prs: []
---

# planning/next-slice-planner — 2026-06-29

## Summary

**The next logical slice is Session 8 — Launch Candidate, and it should be split in two: an
agent-runnable "verify + gate-sign the launch candidate" slice, then an owner-gated "manual
production deploy" slice.** Sessions 1–7 of `web-launch-session-plan.md` are done; the a11y/responsive
sweep (#150–#152) merged to `main` (`d2b7b4f`) but **is not yet deployed** — production is still on
Worker `b59b2de9` (Session 6). The launch candidate is therefore code-only (no pending D1 migrations;
latest migration `0018` is already at the remote head per the Session 6 deploy record). The only thing
standing between "all sessions done" and "launched" is the launch-gate verification itself — and
roadmap-sync (2026-06-28) already flagged that the auth/email and full core-workflow production passes
are **walked once but not gate-signed**. That verification _is_ the launch decision; the `wrangler
deploy` is a short, owner-confirmed step that needs Cloudflare credentials the ephemeral sandbox does
not hold. No backend work blocks iOS, so nothing pulls a feature slice ahead of the launch close.

## Commands run + results

- `git fetch origin main` / `git rev-parse origin/main` → `d2b7b4f` (remote default head; clean tree on
  `claude/next-slice-planner-agent-60pyjd`).
- `git log origin/main --oneline -25` → most recent runtime PRs are Session 7: #150 (Live Mode section
  SR announcements), #151 (class-library load-error retry), #152 (Session 7 close/docs). Latest deploy
  of record (`HISTORY.md`) is Session 6, Worker `b59b2de9` — Session 7 is **merged, not deployed**.
- Read source of truth: `DEVELOPMENT_PLAN.md`, `web-launch-readiness.md`, `web-launch-session-plan.md`,
  `deployment-runbook.md`, `HISTORY.md` (head), `INBOX.md` (empty/drained).
- Read prior planning reports: `2026-06-28/planning-roadmap-sync.md`,
  `2026-06-28/planning-doc-drift.md` (no open feature drivers; one out-of-scope `engines.pnpm` config
  note).
- `ls apps/api/migrations` → latest is `0018_overjoyed_roxanne_simpson.sql`; no un-applied migration is
  introduced by Sessions 6–7 (both web-only) → launch candidate is **code-only**.
- Brief-only run: no product code, no PR. Validation gate run on this report (see Next recommended
  action).

## Findings

Proposed next 1–2 slices. The launch gate (`web-launch-readiness.md` › Launch Gate) is the acceptance
spec; these split it into an agent-runnable verification slice and the owner-gated deploy.

### Slice A — Launch-candidate verification + gate-sign (recommended first) · size **M**

- **[P0] Goal:** Drive every unchecked item in the Launch Gate to a signed pass against a
  launch-candidate build (**exactly `main` @ `d2b7b4f`**, per Q3 — no new polish), so the go/no-go
  decision is evidence-backed rather than "walked once."
  _Why it's next:_ Sessions 1–7 closed all the build/polish work; the only remaining launch-blocker is
  that the auth/email and full core-workflow production passes are **not gate-signed** (roadmap-sync
  2026-06-28, `web-launch-readiness.md:88`). This is the launch decision itself.
- **Concrete steps / files likely touched (verification-first, near-zero code):**
  - Run the full CI-equivalent gate from `deployment-runbook.md` › Pre-deploy plus the launch-candidate
    extras: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test`,
    `pnpm --filter @ritmofit/api test:integration`, `pnpm --filter @ritmofit/web build`,
    `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code apps/api/openapi/openapi.json`,
    `pnpm audit:ci`, `(cd ritmofit_design_system && npm run verify)`,
    `pnpm --filter @ritmofit/api contract-parity`.
  - Gate-sign the **auth/email** matrix (sign-up, sign-in, sign-out, password reset, verification email,
    expired/invalid session → 401) and the **full core workflow** (create/edit/copy a class, add/import
    tracks, cues/moves/intensity/sections, Live Mode, Explore save-a-copy, share + team-share) — against
    a launch-candidate stack, with test data deleted afterward.
  - Confirm the mounted-route + security-header smoke and the provider-rule invariants (no audio cache,
    no Spotify BPM, no embedded playback, disconnect purge) — including the
    `apps/api/test/mock-gate-leak.integration.test.ts` coverage that proves mounted-vs-404.
  - Likely **no source changes**; if verification surfaces a launch-blocking defect, that fix is its own
    small follow-up (files unknown until found). Docs touched: this report + a gate-sign checklist.
- **Acceptance criteria (testable):**
  - Every command above exits 0; OpenAPI diff is empty; `contract-parity` and design-system `verify`
    pass.
  - Each Launch Gate bullet in `web-launch-readiness.md` is marked verified with the evidence (the
    auth/email matrix and the core-workflow pass are explicitly signed, not "walked").
  - No production test data remains after the workflow pass.
- **Risks / unknowns / iOS dependency:**
  - _Resolved (owner, 2026-06-29 — Q2):_ run the **full** auth/email + core-workflow pass against a
    **local launch-candidate stack first** (no prod data touched), then a **lighter prod smoke** against
    live `https://ritmofit.studio` (read-only / auth + the runbook smoke set) to confirm the live Worker
    behaves. This avoids creating prod test data for the heavy workflow while still touching the real
    origin.
  - _Unknown:_ whether any latent defect surfaces in the as-yet-unsigned passes; the plan assumes green
    based on Sessions 1–7, but verification can reopen a small fix.
  - _iOS dependency:_ none. The run-payload contract already advertises every allowlisted field iOS lags
    on (roadmap-sync); no endpoint or contract change is owed to iOS here.

### Slice B — Manual production launch deploy (owner-gated) · size **S**

- **[P0] Goal:** Deploy the verified launch candidate to `https://ritmofit.studio` through the manual
  runbook, run production smoke, delete any prod test data, and record the deploy. _Why it's next:_ it
  is the terminal step of `web-launch-session-plan.md` and ships Session 7's a11y work, which is on
  `main` but not yet live.
- **Concrete steps / files likely touched:**
  - `deployment-runbook.md` › Deploy: record current live version for rollback, confirm
    `wrangler d1 migrations list ritmofit --remote` shows nothing pending (expected — code-only),
    `pnpm --filter @ritmofit/web build`, `pnpm --filter @ritmofit/api run deploy`, note the new Version
    ID.
  - Post-deploy smoke (SPA 200, `/api/v1/health` 200, unauth protected routes 401, all six security
    headers, served SPA asset hash matches the build) + mounted-route smoke.
  - Update `HISTORY.md` (new dated deploy entry: PRs #150–#152, new Worker version, "No migrations to
    apply"), reconcile `web-launch-readiness.md` (gate green) and `web-launch-session-plan.md` (Session
    8 done), and write launch notes.
- **Acceptance criteria (testable):**
  - New Worker version is live; `wrangler deployments status` shows it; rollback anchor (prior version)
    recorded.
  - All post-deploy smoke checks pass; security headers present; SPA asset hash matches the build.
  - `HISTORY.md`, `web-launch-readiness.md`, and `web-launch-session-plan.md` agree that the web app is
    launched, with the deferrals list intact.
- **Risks / unknowns / iOS dependency:**
  - _Resolved (owner, 2026-06-29 — Q1):_ **no deploy action right now.** Slice B stays owner-gated and
    deferred; the owner will trigger the manual `wrangler deploy` when ready. This slice is parked, not
    cancelled — the launch candidate (Slice A output) is what feeds it.
  - _Risk:_ this is production-facing and requires owner confirmation (`AGENTS.md`) **and** Cloudflare
    credentials the ephemeral sandbox does not have — an unattended agent cannot run `wrangler deploy`
    here. The deliverable an agent can produce is a fully gate-signed, smoke-scripted handoff; the owner
    runs the deploy.
  - _Unknown:_ whether the owner wants any additional polish in the launch candidate beyond Session 7's
    a11y work (Q3), and whether the two documented deferrals stay unprovisioned at go-live (Q4).
  - _iOS dependency:_ none for the deploy itself. Post-launch, `web-launch-session-plan.md` Session 9 is
    the iOS handoff (refresh OpenAPI/run-payload expectations, reconcile `web-ios-parity.md`).

## Gap hunt (before committing to the slice)

- **UX gaps:** The launch surface is well covered — Session 7 audited empty/error/loading/permission
  states and closed the one blocker (class-library load-error retry, #151) plus Live Mode section SR
  announcements (#150); the centralized `Dialog` focus-trap, `PendingList` loading→retry primitive, and
  global 401→sign-out are in place. _Remaining gap:_ none of these are yet verified **on the deployed
  launch candidate** (they're verified on `main`, which is one deploy behind prod). The one concrete UX
  hygiene item left is **production test-data cleanup** — a Launch Gate requirement, not yet signed.
- **API completeness (`apps/api/openapi/openapi.json`):** No new endpoint, param, error response, or
  pagination is needed for launch — the launch candidate is code-only and the contract already supports
  the full instructor loop and advertises every iOS-allowlisted run-payload field. The only contract
  obligation is the **OpenAPI no-drift check** in the gate (`openapi` regen + empty `git diff`). No
  server-entity variant is owed to iOS.
- **Safety / architecture:** Hard music constraints must be re-confirmed live post-deploy — no provider
  audio cache, no Spotify BPM (manual `displayBpm` only), no embedded/mixed playback, disconnect purge
  intact. Secrets are already provisioned (do **not** re-provision); the CSP inline-script defect is
  fixed (`no-transform`, Worker `dafa2638`). No exposed-key or provider-audio risk is introduced by this
  slice. **Update (owner, 2026-06-29 — Q4):** the two previously-deferred items — GetSongBPM
  (`GETSONGBPM_API_KEY`) and Apple/Google social sign-in (`APPLE_CLIENT_ID/SECRET`,
  `GOOGLE_CLIENT_ID/SECRET`) — are now **launch-required and to be provisioned before go-live** (see
  "Provisioning" above). Until the secrets are set, the friendly-503 BPM fallback and the
  email/password-only Login (D2a, no broken buttons) remain the correct safe states; provisioning flips
  both on and adds a prod verification step.

## Done-but-unchecked / stale scan

- No stale status markers found. M1–M4 are consistently ✅ across the live docs; Sessions 1–7 are
  consistently marked done in `web-launch-session-plan.md`; deferrals (Explore/Teams expansion,
  GetSongBPM, Apple/Google, iOS parity) are tracked identically across `DEVELOPMENT_PLAN.md`,
  `web-launch-readiness.md`, and the runbook. `doc-drift` (2026-06-28) already swept and fixed the
  archived dead links. `INBOX.md` is drained (empty).
- **Not stale — expected lag:** `HISTORY.md`'s newest deploy entry is Session 6 (`b59b2de9`) while
  `main` carries Session 7 code (#150–#152). That is correct (Session 7 is merged but not deployed);
  Slice B is exactly the step that closes the gap and records it. Do not "fix" it before the deploy.

## Blockers

- **Owner-gated deploy.** Slice B cannot be executed by an unattended sandbox agent: it is
  production-facing (requires owner confirmation per `AGENTS.md`) and needs Cloudflare credentials not
  present here. An agent can take the launch candidate all the way to gate-signed + smoke-scripted, then
  hand off.
- **Production vs. local verification choice — resolved (Q2):** local launch-candidate stack first,
  then a lighter prod smoke against the live Worker.
- **Owner-supplied credentials for provisioning (Q4).** Provisioning both deferrals before launch needs
  the owner to register the Apple/Google OAuth apps and obtain a GetSongBPM API key, then
  `wrangler secret put` them — none of which the sandbox can do. Until those are set, the Apple/Google
  round-trip and real BPM-lookup verification cannot be completed.

## Next recommended action

**Start Slice A — Launch-candidate verification + gate-sign.** Run the full CI-equivalent + launch
extras gate, then sign the two unsigned Launch Gate passes (auth/email matrix and the full core
workflow), delete any test data, and mark each Launch Gate bullet verified in
`web-launch-readiness.md`. That produces a green, evidence-backed go/no-go and a deploy-ready candidate.
Then hand Slice B (the owner-confirmed `wrangler deploy` + smoke + `HISTORY.md` entry) to the owner.
Validate this report:
`./agent-reports/validate-agent-report.sh agent-reports/2026-06-29/planning-next-slice-planner.md`.

## Clarifying questions (resolve before development)

1. **Deploy execution — RESOLVED (owner, 2026-06-29):** no deploy action right now. Slice B (manual
   `wrangler deploy`) stays owner-gated and deferred; the owner triggers it when ready. An agent should
   take work only as far as a gate-signed launch candidate (Slice A) and stop.
2. **Verification target — RESOLVED (owner, 2026-06-29):** **both** — run the full auth/email +
   core-workflow pass against a **local launch-candidate stack first** (no prod data touched), then a
   **lighter prod smoke** against live `https://ritmofit.studio` to confirm the live Worker behaves.
3. **Launch-candidate contents — RESOLVED (owner, 2026-06-29):** the launch candidate is **exactly
   `main` @ `d2b7b4f`** (Session 7 a11y work #150–#152 + everything prior). No new polish folded in —
   verify and gate-sign what is already merged.
4. **Deferrals at go-live — RESOLVED (owner, 2026-06-29): provision BOTH before launch.** GetSongBPM
   (`GETSONGBPM_API_KEY`) **and** Apple/Google social sign-in (`APPLE_CLIENT_ID/SECRET`,
   `GOOGLE_CLIENT_ID/SECRET`) move **out of deferral and into launch scope**. See "Provisioning" below
   for what this adds. (No code/migration change — these are runtime secrets — but the live surface and
   the verification matrix both grow.)
5. **Launch comms — RESOLVED (owner, 2026-06-29):** `HISTORY.md` dated deploy entry + launch notes
   **only**. No external announcement, status page, or new monitoring/alerting at go-live.

## Provisioning (added by Q4 — both deferrals now launch-required)

The owner's Q4 decision changes the slice shape: the launch is no longer "code-only." Two secret sets
must be provisioned in prod and then verified. This is **owner-gated** (needs Cloudflare creds +
`wrangler secret put`) and depends on the owner supplying real credentials, so it sits with Slice B,
not the agent-runnable Slice A. Key interactions to flag:

- **Owner must supply credentials first.** Apple/Google require registered OAuth apps (client IDs +
  secrets, redirect URIs pointing at `https://ritmofit.studio`); GetSongBPM requires an API key. The
  agent cannot create these. Provision via `wrangler secret put GETSONGBPM_API_KEY`,
  `APPLE_CLIENT_ID/APPLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET`.
- **D2a means the UI auto-enables.** Per decision D2a, social providers render only when _both_ halves
  of a credential pair are set — so the moment the secrets exist the Login shows Apple + Google buttons.
  Verification must confirm the buttons **work end-to-end** (full OAuth round-trip, account
  link/create), not merely that they appear.
- **These flows can't be fully gate-signed on the local stack (interacts with Q2).** Social sign-in and
  real BPM lookup depend on prod secrets, so the Q2 "local-first" pass can't cover them — they need a
  **prod verification pass after the secrets are set**. Net: the prod smoke step grows from "lighter
  read-only/auth smoke" to "auth incl. Apple/Google round-trip + one real `bpm-lookup` returning a
  tempo."
- **Docs to reconcile at launch (Slice B):** `web-launch-readiness.md` Current Deferrals and
  `deployment-runbook.md` both currently document GetSongBPM and Apple/Google as **post-launch
  deferrals** — both must be rewritten to "provisioned at launch" when this lands. This is a doc-state
  flip, tracked here so it isn't missed.
