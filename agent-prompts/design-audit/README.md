# Ritmo Studio design-audit pack v6

**Pack version:** 6
**Entry point:** this file. Point any capable coding agent at `agent-prompts/design-audit/` and it can
run the whole audit from here.
**Deliverable:** exactly one new folder, `docs/audits/<agent>-design-audit-<YYYY-MM-DD>/`.

This pack audits the active Ritmo Studio product, captures current rendered truth, builds one cohesive
navigable prototype covering every active surface, and produces implementation-ready prompts for later,
separately authorized product sessions.

The pack is **agent-agnostic**. It names no vendor, no CLI, no tool, and no model. It states the
capabilities a run requires and stops if they are missing. Any agent that meets the capability floor
should produce a comparably structured deliverable from the same repository state.

This pack does **not** edit production application code, run Git commands, merge, deploy, or implement
its own proposals.

## Run model

One owner authorization, one continuous run, one folder.

| Phase | File | Output |
| --- | --- | --- |
| 0. Assess and request permission | this file | Permission request; **stop until the owner agrees** |
| 0b. Boot | this file + `fixtures.md` | Local app, deterministic fixtures, recorded baseline SHA |
| 1. Inventory and critique | `01-brutal-critique-prompt.md` | `surface-inventory.md`, `critique.md`, `screenshots/current/` |
| 2. Backlog and preview spec | `02-ranked-backlog-prompt.md` | `backlog.md`, `preview-brief.md` |
| 3. Prototype | `03-mockup-preview-prompt.md` | `mockups/`, `screenshots/proposed/` |
| 4. Implementation prompts | `04-implementation-prompts.md` | `implementation-sequence.md`, `implementation-prompts/` |
| 5. Close | this file | Run folder `README.md`, `run-decisions.md`, final report to the owner |

There is exactly one stop-and-wait point: the permission request in phase 0. After the owner agrees, run
phases 0b through 5 continuously without asking for further approval, unless a hard stop fires.

**The owner gate moved to the end.** Phase 4 prompts are generated from the agent's own recommendations,
so they are *proposals*, not authorized work. Nothing in the delivered folder may be implemented until the
owner records dispositions in `run-decisions.md`. Every generated prompt must say so in its own header.

Supporting files: `00-context.md` (mission, scope, evidence rules — read before phase 1),
`surface-ids.md` (canonical surface IDs — bind to these, never renumber), `fixtures.md` (deterministic
fixture recipe), `run-decisions-template.md` (owner review ledger).

If a phase file conflicts with this README about authority, scope, stopping, the deliverable path, or Git
actions, this README wins. For craft, evidence, and output detail, the phase file wins.

## Capability floor

A run requires all of the following. Check each **before** requesting permission and report the results in
the request.

| Capability | Why it is required |
| --- | --- |
| Read/write access to this repository checkout | All inputs and the deliverable |
| Ability to run local shell commands (install, migrate, seed, dev servers) | Phase 0b |
| A controllable real browser with viewport emulation | Phases 1 and 3 rendered truth |
| Screenshot capture **written to disk as image files** | `screenshots/current/` and `screenshots/proposed/` |
| Image compression to JPEG or WebP | Deliverable size budget |
| Ability to author HTML/CSS/JS and open it locally | Phase 3 prototype |
| Long-run working context across phases 0b–5 | Single continuous run |

Test the capture path before requesting permission — do not assume it. A browser that only returns images
into the agent's own context cannot build the deliverable: `screenshots/current/` needs image **files**.
If the environment has no scriptable browser that writes files, that is a missing capability, and
installing one (a headless browser driver, for example) is an environment prerequisite to name in the
permission request rather than something to do unannounced.

Confirm the compression tooling the same way. On macOS, `sips` is present by default and `cwebp` is a
common addition; verify one of them actually runs before promising a size-budgeted deliverable.

**Missing any capability is a hard stop.** Report which capability is absent and end the run. Do not
substitute code reading for rendered evidence, do not deliver a partial folder labelled as a full audit,
and do not silently downgrade claims to `code-confirmed` to work around a missing browser. Comparability
between runs is the reason this pack exists in the repeatable form; a degraded run destroys it.

## Phase 0: assess and request permission

1. Establish the baseline. Record branch and commit SHA, and check whether the branch trails its remote
   (`git rev-list --count HEAD..origin/main`) — auditing a stale baseline produces findings that may
   already be fixed. If the working tree has uncommitted changes, list them in the permission request and
   ask whether to proceed on top of them or wait; unrelated work in progress is a reason to pause, not to
   clean up. Never discard, stash, overwrite, or silently include it. These are the only Git commands the
   run may use, and they are read-only.
2. Read `AGENTS.md`, `README.md`, `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, and D20/D21 in
   `ritmofit_dev_plan/decisions.md`. Then read the design-system canon this audit is judged against:
   `ritmofit_design_system/README.md` first, then `02-color-system.md`, `03-typography.md`,
   `04-layout-and-surfaces.md`, `05-components.md`, `06-motion.md`, `07-accessibility.md`,
   `09-class-builder-guidelines.md`, `10-rhythm-system.md`, and `11-library-guidelines.md`.
3. Read `00-context.md`, `surface-ids.md`, and `fixtures.md` in this pack.
4. Read `docs/audits/README.md` and the most recent prior run folder, if any. Prior findings that are now
   implemented are not new findings.
5. Resolve the deliverable folder name (see below).
6. Run the capability check above.
7. Present the permission request and **stop**.

The permission request must state, briefly:

- The resolved deliverable path.
- Baseline branch, commit SHA, whether it trails the remote, and any uncommitted work in the tree.
- Capability check results, including anything missing and any environment prerequisite the owner must
  approve (installing a capture driver, freeing ports 8787/5173, compression tooling).
- What the run will touch locally: creating `apps/api/.dev.vars` if absent, running local D1
  migrate/seed, starting local dev servers, and creating disposable local accounts and fixtures.
- What it will not do: no production code edits, no Git commands, no schema or migration changes, no
  deploys, no production data or secrets.
- Realistic expected duration and the approximate deliverable size.
- Which prior run it is building on, and whether the baseline has drifted from that run.

Then wait. Silence, an unanswered question, or an unrelated instruction is not permission.

### Deliverable folder name

`docs/audits/<agent>-design-audit-<YYYY-MM-DD>/`

- `<agent>`: a lowercase slug for the agent performing the run — for example `claude`, `codex`, `grok`,
  `gemini`, `cursor`. Take it from the owner's invocation. If the invocation does not state one, ask for
  it in the permission request rather than guessing; agents identify their own vendor unreliably.
- `<YYYY-MM-DD>`: ISO date the run starts, from the system clock. Do not infer it from file timestamps or
  prior run names.
- If that exact folder already exists, append `-2`, `-3`, and so on. Never write into an existing run
  folder from a new run.

## Phase 0b: boot

1. Install dependencies if needed: `pnpm install --frozen-lockfile`.
2. If `apps/api/.dev.vars` is absent, copy `apps/api/.dev.vars.example` and set a newly generated
   local-only `BETTER_AUTH_SECRET`. Keep `MOCK_PROVIDERS=true` and leave `BETA_ALLOWED_EMAILS` **blank** —
   a populated allowlist blocks new local signups and phase 0b account creation will fail. If a
   `.dev.vars` already exists, do not modify it; if its `BETA_ALLOWED_EMAILS` is set, either use an
   allowlisted address or stop and ask. Never copy, read, or inspect production secrets.
3. Apply local database state:

   ```bash
   pnpm --filter @ritmofit/api db:migrate:local
   pnpm --filter @ritmofit/api db:seed:local
   ```

4. Start both services:

   ```bash
   pnpm dev:api   # http://localhost:8787
   pnpm dev:web   # http://localhost:5173
   ```

   These ports are fixed. This checkout may sit beside sibling checkouts (see `AGENTS.md`, "Workspace
   container"): confirm the ports are free and that no other session is doing local-port QA before
   claiming them. Stop and report rather than killing another session's server.

5. Build the fixtures exactly as specified in `fixtures.md`. Fixture drift between runs makes critiques
   incomparable, so follow the recipe rather than improvising content.
6. Create `docs/audits/<agent>-design-audit-<YYYY-MM-DD>/`.

Stop and ask if boot would overwrite an existing `.dev.vars` or local data the owner may care about.
Creating disposable local fixture accounts is in scope.

## Locked scope

Include:

- Public landing/entry, login/sign-up, password recovery, privacy, not-found, invitation rejection, and
  update/recovery UI.
- Every active solo-product workspace: Classes, Music, Builder/choreography, Live, and Account.
- Every reachable active dialog, overlay, provider flow, and materially different UI state.
- Desktop and mobile treatments for every primary surface.

Exclude:

- Dormant Explore, Teams, shares/public classes, collaborators, community, and pricing/subscription flows.
- A new information architecture. Structural problems are documented as `product-decision-required`; the
  proposal stays recognizably inside the current shell.
- Production code edits, schema and migration proposals, and provider-policy changes.

Do not infer active scope from filenames. Trace current entry points and the rendered component tree;
dormant components remain in the repository.

## Repeatability rules

These are what make two runs comparable — by different agents, or by the same agent months apart.

1. **Bind to `surface-ids.md`.** Reuse the existing ID for any surface that still exists. Never renumber
   an existing surface to suit a new inventory order. New surfaces take the next free number in their
   prefix and must be appended to `surface-ids.md` as part of the run. Removed surfaces are marked
   `retired` there, not deleted.
2. **Use the `fixtures.md` recipe verbatim** so critiques describe the product, not the test data.
3. **Backlog IDs are per-run** (`P0-01`, …) and must always cite the surface IDs they touch. Cross-run
   traceability runs through surface IDs, never backlog numbers.
4. **Deduplicate against prior runs.** Every finding is labelled `new`, `regression`, `known-open`
   (still open from a prior run — cite the run and ID), or `resolved-since` (prior finding now fixed).
5. **Record the baseline SHA** in the run folder `README.md` and `surface-inventory.md`.

## Evidence rules

Every material claim carries a label: `observed` (exercised in the browser), `code-confirmed` (verified in
current source but not induced), `inferred` (clearly labelled interpretation), or `not-checked` (an
acknowledged gap). Screenshots do not prove interaction quality; source reading does not prove rendered
truth.

Required coverage:

- Browser viewport emulation at 390×844 and a representative desktop size for every primary surface.
- 320px and 200% zoom/reflow checks for Builder, dialogs, and Live.
- Keyboard-only traversal, visible focus, reduced motion, contrast, target size, and color-independent
  state.
- Populated, empty, loading, error, disconnected, disabled, long-content, and recovery states where they
  exist.
- Console, network, asset, and font errors recorded during the tour.
- Several creation entry scenarios, not one forced funnel (see `00-context.md`).
- A current screenshot and source mapping for every proposed change.

Use browser viewport emulation for narrow checks. Shrinking a window can capture a cropped wider layout
and manufacture a false finding.

## Screenshot and size budget

The deliverable is committed to the repository and every run adds permanent weight.

- Format: **JPEG or WebP**. Never PNG for screenshots.
- Width: cap desktop captures at 1440px; capture mobile at its native emulated width.
- Target ≤ 300 KB per image.
- **Total run folder budget: 15 MB.** If a run approaches it, reduce state-variant captures before
  reducing primary-surface coverage, and record what was dropped in the run folder `README.md`.
- Name every capture after the surface ID it proves: `BLD-04-timeline-desktop.jpg`,
  `BLD-04-timeline-390.jpg`.
- Report the final folder size in the closing report.

Silent truncation is worse than a documented gap. Never let a size budget produce a run that claims
coverage it does not have.

## Deliverable shape

```text
docs/audits/<agent>-design-audit-<YYYY-MM-DD>/
  README.md                       # entry point for the owner
  surface-inventory.md
  critique.md
  backlog.md
  preview-brief.md
  mockups/
    index.html
    preview.css
    preview.js
    README.md                     # craft-pass log
    assets/                       # only when genuinely needed
  screenshots/
    current/
    proposed/
  run-decisions.md                # owner ledger, dispositions left blank
  implementation-sequence.md
  implementation-prompts/
    01-<foundation-or-surface>.md
    ...
  shared-foundations-contract.md  # when phase 4 defines shared primitives
```

Additional split HTML/CSS/JS files are allowed when they improve maintainability. Every link must work
when the folder is served by a simple local static server from the repository root.

The run folder `README.md` is the owner's entry point and must include:

1. One-paragraph verdict and the design thesis.
2. Baseline branch, commit SHA, agent slug, run date, and the phases completed.
3. The exact command and URL to open the prototype.
4. Recommended review order and direct anchors to every primary surface.
5. The five most consequential proposed changes.
6. How to compare current and proposed screenshots.
7. Inventory coverage counts, evidence gaps, and anything the prototype could not honestly demonstrate.
8. What the owner must decide next, and how to record it in `run-decisions.md`.
9. A plain statement that no implementation prompt is authorized until dispositions exist.
10. Final folder size.

## Git and closeout

**The agent runs no Git commands.** No branch, no commit, no push, no PR, no merge, no deploy — not even
for the deliverable folder. Leave the new folder in the working tree and tell the owner it is ready. The
owner decides how it lands.

Before reporting completion:

- Verify no file outside `docs/audits/<agent>-design-audit-<YYYY-MM-DD>/` and `surface-ids.md` changed.
  `git status --porcelain` is read-only and is the correct check.
- Confirm that no production code, schema, migration, token source, or configuration file was touched.
- Stop the local dev servers started in phase 0b.
- Report: deliverable path, prototype open command, coverage counts, evidence gaps, folder size, and the
  decisions the owner now owes.

`docs/audits/` is excluded from `pnpm format:check` and `pnpm lint`, so run artifacts cannot redden the
repository gates. That exclusion is not a licence for sloppy prototype code — phase 3's feasibility check
still applies.

## Hard stops

Stop and report precisely when:

1. A required capability is missing.
2. The app cannot run or authenticate after documented setup and bounded troubleshooting.
3. Primary product surfaces cannot be reached well enough for a truthful comprehensive preview.
4. A required decision would change product scope, information architecture, provider or legal behavior,
   schema, or another locked constraint.
5. Local setup would overwrite owner data.
6. The deliverable cannot be produced within the size budget without hiding a coverage gap.

Partial evidence can still be useful, but it must never be rounded up to a complete audit. Report what was
covered, what was not, and why.

## Resume policy

If a run is interrupted:

1. Identify the run folder and which phase outputs are complete.
2. Verify the recorded baseline SHA still matches the checkout; note drift if it does not.
3. Resume at the first unfinished phase, writing into the same folder.
4. Never treat an agent recommendation as an owner decision.
