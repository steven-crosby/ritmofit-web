# Ritmo Studio full-product design preview pack v5

**Review-first, implementation-later.** This pack audits the active Ritmo Studio product, captures the
current experience, builds one cohesive navigable mockup covering every active surface, and pauses for
owner decisions. Only after those decisions does it generate implementation-ready agent prompts for a
separately authorized product session.

This pack does **not** edit production application code, merge, deploy, or implement its own proposals.

**Canonical pack:** `agent-prompts/design-audit/`
**Tracked outputs:** `docs/audits/<run-id>/`

## Owner invocation

Start the preview session with:

> Read `agent-prompts/design-audit/README.md` and execute phases 0-3 of the full-product design preview.

That invocation authorizes audit-artifact edits only. It does not authorize branch creation, commit, push,
PR creation, product implementation, merge, or deploy. Ask separately before each external Git action unless
the owner explicitly included it.

After reviewing the preview and recording approve/revise/reject/defer decisions, resume with:

> Apply my decisions to the current design-preview run and execute phase 4 to generate the implementation prompts.

## Outcome

The pack has three deliberately separate outcomes:

1. **Preview session:** evidence-backed critique, complete active-surface inventory, current screenshots,
   a coherent navigable HTML/CSS prototype, proposed screenshots, and an owner decision ledger.
2. **Prompt-finalization session:** implementation prompts generated only from owner-approved directions,
   plus dependency order and collision notes.
3. **Future implementation sessions:** separately commissioned product changes using those prompts.

An audit is not complete merely because its prose is polished. The preview must let the owner inspect the
proposed product visually and decide surface by surface.

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

If a phase file conflicts with this README about authority, stopping, scope, or Git actions, this README wins.

## Locked scope

Include:

- Public landing/entry, login/sign-up, password recovery, privacy, not-found, and update/recovery UI.
- Every active solo-product workspace: Classes, Music, Builder/choreography, Live, and Account.
- Every reachable active dialog, overlay, provider flow, and materially different UI state.
- Desktop and mobile treatments for every primary surface.

Exclude:

- Dormant Explore, Teams, shares/public classes, collaborators, community, and pricing/subscription flows.
- A new information architecture. Structural problems may be documented as `product-decision-required`,
  but this preview stays recognizably inside the current shell.
- Production code edits.

Do not infer active scope from filenames alone. Trace the current app entry points and rendered component
tree; dormant components may remain in the repository.

## Two-session sequence

| Phase | Output | Continue? |
| --- | --- | --- |
| 0. Orient and boot | Clean baseline, commit SHA, local app, realistic fixtures | Continue |
| 1. Inventory and critique | `surface-inventory.md`, `critique.md`, `screenshots/current/` | Continue |
| 2. Backlog and preview specification | `backlog.md`, `preview-brief.md` | Continue |
| 3. Full-product prototype | `mockups/`, `screenshots/proposed/`, `run-decisions.md`, `review-guide.md` | **Stop for owner review** |
| 4. Approved implementation prompts | `implementation-prompts/`, `implementation-sequence.md` | Stop; implementation remains separate |

There is exactly one mandatory owner gate: after phase 3 and before phase 4. The preview agent may revise
its own draft during phase 3, but it may not approve directions on the owner's behalf.

## Phase 0: safe local setup

1. Confirm a clean, current `ritmofit-web` checkout and record the branch and commit SHA. Do not discard,
   stash, overwrite, or include unrelated work.
2. Read `AGENTS.md`, `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, D20/D21 in `decisions.md`, and the relevant
   `ritmofit_design_system/` guidance.
3. Install with `pnpm install --frozen-lockfile` if needed.
4. If `apps/api/.dev.vars` is absent, create it from `.dev.vars.example` with a newly generated local-only
   `BETTER_AUTH_SECRET` and `MOCK_PROVIDERS=true`. Never copy or inspect production secrets.
5. Run local migrations and seed:

   ```bash
   pnpm --filter @ritmofit/api db:migrate:local
   pnpm --filter @ritmofit/api db:seed:local
   ```

6. Start both services:

   ```bash
   pnpm dev:api
   pnpm dev:web
   ```

7. Create two local accounts: one populated with realistic classes/tracks/cues/moves and one fresh for
   empty states. Add at least one pathological fixture with long names and a dense class.
8. Create `docs/audits/YYYY-MM-DD-full-product-preview/`.

If local setup would overwrite an existing `.dev.vars` or local data the owner may care about, stop and
ask. Otherwise, local disposable fixture creation is in scope.

## Evidence minimum

The preview must distinguish `observed`, `code-confirmed`, `inferred`, and `not-checked` claims. Required:

- Browser viewport emulation at 390x844 and a representative desktop size for every primary surface.
- 320px and 200% zoom/reflow checks for fragile Builder, dialog, and Live surfaces.
- Keyboard-only traversal, visible focus, reduced motion, contrast, target size, and color-independent state.
- Populated, empty, loading, error, disconnected, disabled, long-content, and recovery states where relevant.
- Console/network/font errors recorded during the tour.
- Several creation entry scenarios, not one forced funnel: start from a class/template, provider playlist,
  specific track, movement/choreography idea where supported, and an existing class/rehearsal need.
- Current screenshot and source/component mapping for every proposed change.

## Prototype standard

Phase 3 produces one navigable static prototype under `mockups/`; it is not a loose mood board or a few
hero screens. It must:

- Cover every inventory row marked `primary` and every materially different state marked `must-mock`.
- Use shared prototype tokens/components so the proposal reads as one product.
- Include a persistent index for navigating surfaces and switching desktop/mobile and important states.
- Include a review-layer current/proposed comparison for every primary surface, using the captured baseline
  rather than attempting to rebuild the old UI inside the prototype.
- Use realistic, coherent product content rather than lorem ipsum or unrelated fake data.
- Preserve the current shell and functional information requirements.
- Explain deviations from current design-system canon as explicit proposed canon changes, not accidental drift.
- Pass the swap, squint, signature, token, content-coherence, responsive, and accessibility checks before review.

Image generation may support direction exploration when available, but generated images are references only.
The final review artifact must be inspectable HTML/CSS/JS with real text and feasible component structure.

## Phase 3 owner gate

At the end of phase 3:

1. Provide exact instructions to open the prototype.
2. Provide `review-guide.md` with the recommended inspection order.
3. Populate `run-decisions.md` with every backlog ID and surface, leaving owner disposition fields open.
4. Report evidence gaps and anything the prototype could not honestly demonstrate.
5. Stop. Do not generate final implementation prompts until the owner supplies decisions.

Owner dispositions are `approve`, `approve-with-notes`, `revise`, `reject`, or `defer`.

## Phase 4 rules

Phase 4 begins only after owner decisions exist. It must:

- Exclude rejected and deferred directions.
- Incorporate all approval notes and resolve revisions before prompt generation.
- Produce ready-to-paste agent prompts, not vague briefs.
- Order prompts by shared foundations and dependencies while keeping product PRs small.
- Identify files likely to collide so concurrent agents are not assigned overlapping ownership.
- Keep implementation, commit, push, PR, merge, and deploy as separate future permissions.

## Hard stops

Stop and report precisely when:

1. The app cannot run or authenticate after the documented local setup and bounded troubleshooting.
2. Primary product surfaces cannot be reached well enough for a truthful comprehensive preview.
3. A required decision changes product scope, information architecture, provider/legal behavior, schema, or
   another locked product constraint.
4. Phase 4 is requested without owner dispositions.

Partial evidence may still be useful, but it must never be rounded up to a complete full-product preview.

## Git and closeout

Artifact creation does not automatically authorize branch creation, commit, push, or PR creation. When
separately authorized:

- Stage only `docs/audits/<run-id>/` and intentional prompt-pack changes requested by the owner.
- Use a docs-scoped Conventional Commit.
- Open one audit/preview PR for review; never merge it.
- Product implementation belongs to later branches/PRs generated from approved prompt slices.

## Resume policy

1. Identify the latest run folder and completed phase outputs.
2. Verify its recorded commit still matches the intended baseline; note drift if not.
3. Resume at the first unfinished phase.
4. Never treat an agent-filled draft as owner approval.
