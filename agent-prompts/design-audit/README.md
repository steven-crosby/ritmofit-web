# Ritmo Studio UI/UX Polish Audit Pack v4

**Continuous, audit-only pack.** One kickoff → full pipeline → **one PR of audit artifacts**.  
Not a redesign program. Not a marketing or community audit. **Does not edit production app code.**

**Canonical prompt pack:** `agent-prompts/design-audit/` in this `ritmofit-web` repo.  
**All audit artifacts** go in **tracked** `docs/audits/<run-id>/` (same repo).

---

## How to run (owner)

Tell the agent something like:

> Read `agent-prompts/design-audit/README.md` and execute the full polish audit pack.

That is sufficient. Do **not** commission passes one-by-one unless you are intentionally resuming a partial run.

The agent must complete **all phases in one continuous session** (or resume from the last unfinished phase without re-asking for permission) until it has **opened a draft/open PR** for the audit branch — or reported a hard stop / PR failure with the exact recovery command.

---

## Authority

| Layer | File | Role |
| --- | --- | --- |
| **Orchestrator (entry)** | **This README** | Sequence, scope, decisions policy, hard stops, PR closeout |
| Mission / constraints | `00-context.md` | Product frame, surfaces, ranking, engineering don’ts |
| Phase specs | `01`–`04` | Deliverable structure only — no mid-run owner gates |
| Decisions template | `run-decisions-template.md` | Agent fills `run-decisions.md` (auto-disposition) |

If a phase file conflicts with this README on **stopping, gates, or PR behavior**, **this README wins**.

---

## End state (locked)

1. Run folder under `docs/audits/<run-id>/` with critique, screenshots, backlog, run decisions, mockups (if any), and P0+P1 implementation briefs.
2. **No** production UI / `apps/web` / design-system **product** changes in this run (artifacts + docs only).
3. **One audit PR** on a dedicated branch (e.g. `docs/audit-YYYY-MM-DD-polish`).
4. Briefs **prescribe later multi-surface implement PRs**; those product PRs are **not** opened in this run.
5. **Do not merge** the audit PR. Do not deploy.

---

## Continuous sequence

| Phase | Spec | Output under `docs/audits/<run-id>/` | Then |
| --- | --- | --- | --- |
| 0 | Read this README + `00-context.md` | — | Continue |
| 1 | `01-brutal-critique-prompt.md` | `critique.md` + `screenshots/` | **Continue immediately** |
| 2 | `02-ranked-backlog-prompt.md` | `backlog.md` + `mockup-brief.md` | **Continue immediately** |
| 2b | Agent auto-disposition | `run-decisions.md` (from template) | **Continue immediately** |
| 3 | `03-mockup-preview-prompt.md` | `mockups/` if any direction items; else short skip note | **Continue immediately** (self-approve) |
| 4 | `04-implementation-briefs-prompt.md` | `implementation-briefs/*` for **P0 + P1 ship** set | **Continue immediately** |
| 5 | Closeout (this README) | Commit artifacts on branch + **open PR** | **Stop** (done) |

There are **no owner gates** (no Gate A/B/C, no “wait for written signature,” no mid-run approve/kill loop).

### Mockup rule

- Mockups only for items the agent marks **P0 direction** (`yes-direction`): visual language, major component look, density system shift.
- Copy, spacing, a11y, and small hierarchy fixes → briefs without mockups.
- Agent **self-selects**, builds, **self-approves** in `run-decisions.md`, and continues. Owner review happens on the PR.

### Scope for this run’s briefs

| Priority | In backlog? | Mockups / briefs this run? |
| --- | --- | --- |
| **P0** | Yes | Yes (if disposition is `ship` / `ship-after-mockup`) |
| **P1** | Yes | Yes (same) |
| **P2** | Yes (listed) | **No** — disposition `defer` for this run’s briefs unless the agent has a rare, documented exception |

---

## Agent auto-decisions (phase 2b)

After writing `backlog.md`, the agent **must** write `run-decisions.md` using `run-decisions-template.md`.

Disposition rules (apply success ranking: build speed → gorgeous → Live pride):

| Disposition | When |
| --- | --- |
| `ship` | Clear polish; no direction mockup needed |
| `ship-after-mockup` | P0 direction change; mockup first, then brief |
| `defer` | P2, or low leverage / high effort for this run |
| `kill` | Out of scope, fights the shell, community/marketing, or pure noise |

Do not stop for owner signature. Record rationale briefly per item or per group.  
Mockup flags = all `ship-after-mockup` IDs. Self-approve mockups in the same file after phase 3 (or note “no mockups”).

---

## Hard stops (only these)

Stop the pipeline and report clearly if:

1. **App will not run** or you **cannot sign in** enough to gather primary visual evidence — do not invent a full critique from code alone without stating the limitation and stopping if evidence is insufficient for a useful audit.
2. **PR open fails** after artifacts are ready — leave the branch pushed (if possible) and print the exact error plus the `gh pr create` (or equivalent) command. Do not fake a PR URL.

### Soft continue (document, do not halt)

- Some in-scope surfaces unreachable → continue; list gaps in critique evidence log and run-decisions.
- Ambiguous product intent → pick the ranking-aligned call; note it in `run-decisions.md`.
- Token / visual-system overhaul as P0 → self-decide; mockup if direction-level; brief it. Do not pause.
- Music / provider / “legal later” concerns → **do not hard-stop**. At most note “implement must re-check product music constraints in `AGENTS.md`” inside briefs. This is a beta single-user context for **audit pacing**; do not block the pack on legal review.

### Permanent don’ts (not “ask first”)

- Do **not** edit production app code (`apps/web` product UI, etc.) in this run.
- Do **not** merge the audit PR, deploy, force-push, rewrite published history, or commit secrets.
- Do **not** revive Explore / Teams / shares / marketing / community as in-scope polish.
- Do **not** treat IA redesign as in-scope; stay inside the current shell unless a finding is catastrophic — then **flag** in decisions/backlog as “redesign re-open required,” still without redesigning in this run.

---

## Setup (agent)

1. Work in a clean `ritmofit-web` checkout on current `main` (or owner-specified base).
2. Create branch: `docs/audit-YYYY-MM-DD-polish` (or `docs/audit-<run-id>`).
3. `pnpm install --frozen-lockfile` if needed; run **`pnpm dev:web`**.
4. Sign in with a beta-capable local account (seed/local auth as project docs describe).
5. Create run folder: `docs/audits/YYYY-MM-DD-polish/`.
6. Capture screenshots at **desktop** and **390×844** for reachable in-scope surfaces.
7. Execute phases 1 → 2 → 2b → 3 → 4 → 5 without waiting for owner.

---

## Phase 5 — Commit and open PR

After briefs exist:

1. Ensure all artifacts under `docs/audits/<run-id>/` are complete.
2. Stage **only** audit artifacts (and any intentional pack fixes if the owner asked to update prompts in the same work — default is artifacts only).
3. Commit with a Conventional Commit, e.g. `docs(audit): YYYY-MM-DD polish critique backlog briefs`.
4. Push branch to `origin`.
5. Open **one** PR (draft is fine) with:
   - Summary of polish thesis and top build-speed findings  
   - Link/paths to critique, backlog, run-decisions, mockups, briefs  
   - Explicit note: **audit-only — no production UI changes; implement via later surface PRs from briefs**  
   - Suggested later implement order (from phase 4)  
6. Final chat response: PR URL, branch name, run folder path, hard gaps, confirm no production code modified.

If `gh` is unavailable, push the branch and give the compare URL / exact commands; still treat “owner must run create” as a **reported** PR failure path, not a silent partial finish.

---

## Files in this pack

| File | Purpose |
| --- | --- |
| `README.md` | **Entry / orchestrator** — continuous run through audit PR |
| `00-context.md` | Shared mission, scope, constraints |
| `01-brutal-critique-prompt.md` | Phase 1 — diagnosis |
| `02-ranked-backlog-prompt.md` | Phase 2 — ranked backlog + mockup brief |
| `run-decisions-template.md` | Phase 2b — agent auto-disposition template |
| `03-mockup-preview-prompt.md` | Phase 3 — isolated mockups for direction items |
| `04-implementation-briefs-prompt.md` | Phase 4 — per-surface implement briefs (P0+P1) |
| `LEGACY-v2.md` | Historical note (v2 prompt files removed) |

---

## Resume policy

If a previous run left partial artifacts:

1. Detect `docs/audits/<run-id>/` and which outputs exist.
2. Resume at the first missing phase; do not redo completed phases unless evidence is wrong.
3. Still finish through open PR unless a hard stop applies.

---

## Out of scope for this pack

- Production implementation and product PRs  
- Redesigning Classes / Music / Live / Account IA  
- Explore, Teams, marketing, landing, pricing merchandising  
- Owner mid-run approval ceremonies  
