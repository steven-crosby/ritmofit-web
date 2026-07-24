# Ritmo Studio full-product design preview pack v5

**Review-first, implementation-later.** This prompt pack enables any AI agent or LLM (e.g. Gemini, Claude, Codex) to audit the active Ritmo Studio product, capture the current experience, build one cohesive navigable prototype covering every active surface, and generate self-contained deliverables for owner review before implementation prompts are generated.

This pack does **not** edit production application code, merge, deploy, or implement its own proposals.

**Canonical pack:** `agent-prompts/design-audit/`
**Tracked outputs:** `docs/audits/[agent-id]-design-audit-[ISO-date]/` (e.g., `docs/audits/gemini-design-audit-2026-07-24/`)
**Branch convention:** `audit/[agent-id]-[ISO-date]` (e.g., `audit/gemini-2026-07-24`)

---

## Agent-Agnostic Invocation Protocol

This audit process is fully repeatable and agent/LLM-agnostic. The execution protocol uses a clear 2-step owner handshake:

### 1. Readiness Check (Review Step)
The owner initiates the session by asking the agent to review the audit pack:

> "Review `agent-prompts/design-audit/README.md` and confirm readiness to execute the full-product design audit."

**Agent Action:** The agent reads all documentation under `agent-prompts/design-audit/`, verifies workspace and local environment prerequisites, confirms its identifier (e.g. `gemini`, `claude`, `codex`), and responds stating it has reviewed the pack and is ready to execute.

### 2. Full Execution (Permission Step)
Once the owner grants execution permission (e.g. *"Proceed"*, *"Permission granted"*, or *"Execute audit"*), the agent runs the audit **end-to-end through Phases 0, 1, 2, and 3 continuously**:

- Creates and checks out a dedicated audit branch `audit/[agent-id]-[ISO-date]`.
- Creates self-contained output directory `docs/audits/[agent-id]-design-audit-[ISO-date]/`.
- Bootstraps local test environment and baseline fixtures (Phase 0).
- Builds active surface inventory and brutal critique (Phase 1).
- Generates ranked backlog and comprehensive preview specification (Phase 2).
- Builds full navigable HTML/CSS static prototype, proposed screenshots, review guide, and pre-filled decision ledger (Phase 3).
- Commits audit artifacts, pushes the audit branch, opens a draft PR, and pauses at the Phase 3 owner decision gate.

### 3. Implementation Prompt Finalization (Phase 4 Step)
After the owner reviews the prototype and records dispositions in `run-decisions.md`:

> "Apply my decisions in run-decisions.md and execute Phase 4 to generate implementation prompts."

---

## Outcome

The pack produces three deliberately separate outcomes:

1. **Preview session:** evidence-backed critique, complete active-surface inventory, current screenshots, a coherent navigable HTML/CSS prototype, proposed screenshots, an owner decision ledger stored in `docs/audits/[agent-id]-design-audit-[ISO-date]/`, and a draft PR on branch `audit/[agent-id]-[ISO-date]`.
2. **Prompt-finalization session:** implementation prompts generated only from owner-approved directions, plus dependency order and collision notes.
3. **Future implementation sessions:** separately commissioned product changes using those generated prompts.

An audit is not complete merely because its prose is polished. The preview must let the owner inspect the proposed product visually and decide surface by surface.

---

## Authority

| Layer | File | Role |
| --- | --- | --- |
| Orchestrator | `README.md` | Sequence, authority, gates, setup, closeout |
| Mission and scope | `00-context.md` | Product frame, active surfaces, evidence and craft rules |
| Phase 1 | `01-brutal-critique-prompt.md` | Inventory, baseline capture, workflow and design critique |
| Phase 2 | `02-ranked-backlog-prompt.md` | Ranked findings and full-preview specification |
| Phase 3 | `03-mockup-preview-prompt.md` | Comprehensive navigable prototype and owner-review package |
| Owner decisions | `run-decisions-template.md` | Approve/revise/reject/defer ledger; owner is final authority |
| Phase 4 | `04-implementation-prompts.md` | Approved-only, ready-to-run implementation prompts |

If a phase file conflicts with this `README.md` regarding authority, stopping, scope, or Git actions, this `README.md` wins.

---

## Locked Scope

Include:
- Public landing/entry, login/sign-up, password recovery, privacy, not-found, and update/recovery UI.
- Every active solo-product workspace: Classes, Music, Builder/choreography, Live, and Account.
- Every reachable active dialog, overlay, provider flow, and materially different UI state.
- Desktop and mobile treatments for every primary surface.

Exclude:
- Dormant Explore, Teams, shares/public classes, collaborators, community, and pricing/subscription flows.
- A new information architecture. Structural problems may be documented as `product-decision-required`, but this preview stays recognizably inside the current shell.
- Production code edits.

Do not infer active scope from filenames alone. Trace the current app entry points and rendered component tree; dormant components may remain in the repository.

---

## Phase Sequence

| Phase | Output | Action in End-to-End Execution |
| --- | --- | --- |
| **0. Orient and boot** | Clean baseline, audit branch `audit/[agent-id]-[ISO-date]`, commit SHA, local app, realistic fixtures | Run automatically |
| **1. Inventory and critique** | `surface-inventory.md`, `critique.md`, `screenshots/current/` | Run automatically |
| **2. Backlog and specification** | `backlog.md`, `preview-brief.md` | Run automatically |
| **3. Full-product prototype** | `mockups/`, `screenshots/proposed/`, `run-decisions.md`, `review-guide.md`, draft PR | **Stop at owner review gate** |
| **4. Approved implementation prompts** | `implementation-prompts/`, `implementation-sequence.md` | Executed after owner fills decisions |

---

## Phase 0: Safe Local Setup & Branch Creation

1. Confirm a clean, current `ritmofit-web` checkout and record the current branch and commit SHA. Do not discard, stash, overwrite, or include unrelated work.
2. Create and checkout a dedicated audit branch:
   ```bash
   git checkout -b audit/[agent-id]-[ISO-date]
   ```
3. Read `AGENTS.md`, `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, D20/D21 in `decisions.md`, and relevant `ritmofit_design_system/` guidance.
4. Install with `pnpm install --frozen-lockfile` if needed.
5. If `apps/api/.dev.vars` is absent, create it from `.dev.vars.example` with a newly generated local-only `BETTER_AUTH_SECRET` and `MOCK_PROVIDERS=true`. Never copy or inspect production secrets.
6. Run local migrations and seed:
   ```bash
   pnpm --filter @ritmofit/api db:migrate:local
   pnpm --filter @ritmofit/api db:seed:local
   ```
7. Start both services:
   ```bash
   pnpm dev:api
   pnpm dev:web
   ```
8. Create two local accounts: one populated with realistic classes/tracks/cues/moves and one fresh for empty states. Add at least one pathological fixture with long names and a dense class.
9. Create directory `docs/audits/[agent-id]-design-audit-[ISO-date]/`.

If local setup would overwrite an existing `.dev.vars` or local data the owner may care about, stop and ask. Otherwise, local disposable fixture creation is in scope.

---

## Evidence Minimum

The preview must distinguish `observed`, `code-confirmed`, `inferred`, and `not-checked` claims. Required:

- Browser viewport emulation at 390x844 and a representative desktop size for every primary surface.
- 320px and 200% zoom/reflow checks for fragile Builder, dialog, and Live surfaces.
- Keyboard-only traversal, visible focus, reduced motion, contrast, target size, and color-independent state.
- Populated, empty, loading, error, disconnected, disabled, long-content, and recovery states where relevant.
- Console/network/font errors recorded during the tour.
- Several creation entry scenarios, not one forced funnel: start from a class/template, provider playlist, specific track, movement/choreography idea where supported, and an existing class/rehearsal need.
- Current screenshot and source/component mapping for every proposed change.

---

## Prototype Standard

Phase 3 produces one self-contained navigable static prototype under `docs/audits/[agent-id]-design-audit-[ISO-date]/mockups/`; it is not a loose mood board or a few hero screens. It must:

- Cover every inventory row marked `primary` and every materially different state marked `must-mock`.
- Use shared prototype tokens/components so the proposal reads as one product.
- Include a persistent index for navigating surfaces and switching desktop/mobile and important states.
- Include a review-layer current/proposed comparison for every primary surface, using the captured baseline rather than attempting to rebuild the old UI inside the prototype.
- Use realistic, coherent product content rather than lorem ipsum or unrelated fake data.
- Preserve the current shell and functional information requirements.
- Explain deviations from current design-system canon as explicit proposed canon changes, not accidental drift.
- Pass the swap, squint, signature, token, content-coherence, responsive, and accessibility checks before review.

---

## Phase 3 Owner Gate & Draft PR

At the end of phase 3:

1. Stage only `docs/audits/[agent-id]-design-audit-[ISO-date]/` (and intentional prompt-pack updates).
2. Commit with a docs-scoped Conventional Commit:
   ```bash
   git commit -m "docs(audit): add [agent-id] design preview ([ISO-date])"
   ```
3. Push the audit branch and open a draft PR for review:
   ```bash
   git push -u origin audit/[agent-id]-[ISO-date]
   gh pr create --draft --title "docs(audit): [agent-id] design preview ([ISO-date])" --body "Comprehensive design preview and static prototype for Ritmo Studio."
   ```
4. Provide exact instructions to open the static prototype locally.
5. Provide `review-guide.md` with the recommended inspection order and the link to the draft PR.
6. Populate `run-decisions.md` with every backlog ID and surface, leaving owner disposition fields open.
7. Report evidence gaps and anything the prototype could not honestly demonstrate.
8. Stop. Do not generate final implementation prompts until the owner supplies decisions.

Owner dispositions are `approve`, `approve-with-notes`, `revise`, `reject`, or `defer`.

---

## Phase 4 Rules

Phase 4 begins only after owner decisions exist in `run-decisions.md`. It must:

- Exclude rejected and deferred directions.
- Incorporate all approval notes and resolve revisions before prompt generation.
- Produce ready-to-paste agent prompts, not vague briefs.
- Order prompts by shared foundations and dependencies while keeping product PRs small.
- Identify files likely to collide so concurrent agents are not assigned overlapping ownership.
- Keep implementation, commit, push, PR, merge, and deploy as separate future permissions.

---

## Hard Stops

Stop and report precisely when:

1. The app cannot run or authenticate after the documented local setup and bounded troubleshooting.
2. Primary product surfaces cannot be reached well enough for a truthful comprehensive preview.
3. A required decision changes product scope, information architecture, provider/legal behavior, schema, or another locked product constraint.
4. Phase 4 is requested without owner dispositions.

---

## Git and Closeout

- Dedicated audit branches (`audit/[agent-id]-[ISO-date]`) are created in Phase 0 to isolate audit artifacts from protected `main`.
- Audit branches open draft PRs for owner review; they are never merged into `main` directly.
- Product implementation belongs to later, separately authorized feature branches/PRs generated from approved Phase 4 prompt slices.
