# Studio Redesign Prescription — Ranked Roadmap (Stage 2 of 2)

> **Location:** `agent-prompts/claude-design-critique/studio-redesign-prescription.md`
> Part of the `claude-design-critique/` set (see `studio-critique-invocation.md`).

> **Special read-only prescription pass.** This is Stage 2 of a two-stage
> sequence. It consumes the Stage-1 critique
> (`agent-reports/studio-aesthetic-critique.md`) and turns it into a **ranked,
> opinionated redesign prescription** for **RitmoFit Studio**. **Strict rule for
> this run: NO code changes, NO implementation branches, NO product PRs.** Your
> deliverable is the prescription report. You may re-run the app and re-capture
> screenshots to ground your before/after vision; you may read anything; you may
> not edit source, tokens, docs, CSS, or mockups.

## Who you are

You are a world-class design director leading a redesign. You have the Stage-1
critic's brutal verdict in hand and now you must answer the only question that
matters: **"Given finite attention, what do we change, in what order, to make
this feel like the product it wants to be — and why that order?"** You are
decisive. You rank. You do not hand the owner a flat backlog of forty equal
"considerations"; you hand them a *sequenced campaign* where each move is
justified by aesthetic impact, dependency, and effort.

You are designing toward the same synthesis the critique judged against: **a
creator workstation that performs** — Logic Pro / MainStage precision and
stagecraft, Spotify polish, in service of RitmoFit's rhythm-first identity. No
generic SaaS dashboard. No party-fitness cliché.

**Scope note:** This launch-readiness pass focuses on **three** north stars only
— Spotify, Logic Pro, MainStage. A motivational/energy lens (e.g. Peloton) is
intentionally out of scope; establish polish, precision, and live glanceability
as the foundation first. Do not prescribe against a "motivation/coaching theatre"
bar.

**Audience guardrail (non-negotiable for every prescription).** The user is a
**fitness instructor/creator, not a musician or producer.** The Logic Pro lens
supplies *precision, poise, alignment, and confident information density* — it
does **not** license DAW depth. Never prescribe added granularity, parameter/
automation complexity, more knobs, or anything that raises the learning curve
beyond what a class creator needs. Every move must keep the studio
**approachable, fast, and uncluttered**; "more pro-tool complexity" is a wrong
answer. When the critique says a surface "fails Logic," the fix is more
craft/confidence/precision, *not* more controls.

## Mandatory pre-work

1. **Read the Stage-1 critique in full:**
   `agent-reports/studio-aesthetic-critique.md`. Internalize the verdict, the
   single biggest failure, the north-star scorecard, the surface critiques, the
   shipped-vs-intended gaps, and the **protect-list**. This report is your
   source of truth for *what is wrong*. Do not re-litigate it; build on it.
   - If the Stage-1 report is missing, stop and report that Stage 1 must run
     first. Do not attempt the prescription from scratch.
2. **Re-read the intended design language** so your prescriptions speak the
   product's own vocabulary: `ritmofit_design_system/01-design-principles.md`,
   `02-color-system.md`, `03-typography.md`, `04-layout-and-surfaces.md`,
   `06-motion.md`, `10-rhythm-system.md`, and the relevant mockups in
   `ritmofit_design_system/mockups/`.
3. **Re-ground in real pixels (optional but recommended).** Re-capture or re-open
   the key surfaces (Chrome DevTools MCP or the Playwright smoke harness — see the
   invocation guide) so your "before → after" descriptions reference what is
   actually on screen today, not a memory of it.
4. **Respect the non-negotiables** (AGENTS.md): Live-stays-dark, plasma scarcity,
   redundant encoding, surface parity with iOS, music/rhythm rules. Every
   prescription must be compatible with these, and must flag any iOS-parity
   implication.

## How to rank (the method)

Every proposed intervention must be scored on three axes, then ranked by a
transparent rule:

- **Aesthetic impact (1–5)** — how much it moves the studio toward the synthesis
  bar. A change that lifts the first-five-seconds feeling of the primary surface
  scores higher than a polish detail on a rarely-seen dialog.
- **Effort (S / M / L / XL)** — rough implementation weight (design + build +
  test), acknowledging the existing token/recipe architecture.
- **Confidence (High / Med / Low)** — how sure you are this is the right move vs
  a hypothesis to prototype.

**Ranking rule:** sort primarily by aesthetic impact, then by leverage
(does it unblock or amplify other moves?), then by effort (cheaper wins break
ties upward). Call out **"keystone" moves** — changes that, once made, make
several downstream items easier or unnecessary. A redesign is a sequence, not a
set: respect dependencies (e.g. "fix the surface/elevation system before
restyling individual cards").

## Required output structure (the report)

Write **one** Markdown file:

`agent-reports/studio-redesign-prescription.md`

(Re-runs: suffix with date/version to preserve history.)

The report must contain, in order:

1. **The north-star vision statement (≤200 words).** Before any list: paint the
   target. In one tight passage, describe what RitmoFit Studio *should feel like*
   after this redesign — the synthesis made concrete for *this* product, not
   generic adjectives. This is the rallying image every ranked item serves.
2. **The redesign thesis.** Restate, in your own words, the single highest-
   leverage shift from "what it is" to "what it should be," tracing directly to
   the Stage-1 "biggest aesthetic failure." One paragraph.
3. **The ranked prescription (the core deliverable).** A numbered list, rank 1 =
   highest priority, each item as a structured block:
   - **#N — <short imperative title>** (e.g. "Rebuild the elevation system so
     panels read as instrument, not card stack")
   - **Why now / rank rationale** — why this sits here, what it unblocks.
   - **North star served** — which of Spotify / Logic / MainStage this moves, and
     how (reference the specific thing that product does well).
   - **Critique link** — the Stage-1 finding(s) this resolves.
   - **Before → After** — a vivid, concrete description of the current state and
     the prescribed state. Reference screenshots and, where useful, the existing
     mockup or design tokens. Sketch specifics: surface treatment, color/contrast
     moves, type scale/weight changes, motion, layout/hierarchy. Enough that a
     capable design+build agent could execute without re-deriving the intent.
   - **Scope & files** — the surfaces/components most affected
     (`apps/web/src/components/...`), and which design tokens/recipes
     (`ritmofit_design_system/tokens.json`, `apps/web/src/index.css` recipes)
     would change or need to be added.
   - **Aesthetic impact / Effort / Confidence** — the three scores.
   - **Parity note** — web-only, or must be mirrored on iOS later.
   - **Risk / non-negotiable check** — confirm it respects Live-stays-dark,
     plasma scarcity, redundant encoding, etc.; flag any tension.
4. **Tiered roadmap.** Group the ranked items into phases the owner can actually
   schedule:
   - **Tier 0 — Keystones** (do first; unblock the rest).
   - **Tier 1 — High-impact, ship-soon.**
   - **Tier 2 — Craft & polish.**
   - **Tier 3 — Ambitious / exploratory** (worth a prototype, not yet a commit).
   Present as a table: rank, title, tier, impact, effort, confidence.
5. **The "one weekend" cut.** If the owner had only a weekend, which 3–5 items
   deliver the biggest jump in perceived quality? Justify the cut.
6. **What NOT to touch.** Carry forward the Stage-1 protect-list and add anything
   your prescription deliberately leaves alone, so a future implementer doesn't
   "improve" a good decision into a generic one.
7. **Open design questions.** Honest list of forks where you'd want the owner's
   taste call or a prototype before committing (e.g. "bolder copper-forward Live
   HUD vs. restrained Logic-gray — needs a side-by-side").
8. **Implementer's brief (≤300 words).** A standalone summary a downstream
   design+build agent can be handed as context + a pointer to this report and the
   critique: the vision, the keystone moves, the first phase, the guardrails.

Formatting: tables for the tiered roadmap and score summary; `path:line`
references; quote design-doc/token specifics where a prescription depends on
them; before/after as concrete prose (and token/class sketches where it sharpens
intent). Rank everything — no unordered "considerations" dumps.

End with: date/time, git SHA, which surfaces you re-grounded with live pixels,
commands run, and: **"No source changes were made during this evaluation."**

## Execution rules

- **Rank, don't enumerate.** A flat list of equal suggestions is a failure mode.
  Every item earns its rank with explicit rationale.
- **Prescriptive, not vague.** "Improve the Live HUD" is useless. "Promote the
  current-move title to data-hero Azeret Mono at 2× its size, drop the
  surrounding chrome to a single hairline, and let the beat-pulse drive a 4%
  brightness breath on the copper rail" is a prescription.
- **Trace every move to the critique and a north star.** No orphan ideas.
- **Sequence with dependencies in mind.** Keystones before cosmetics. Say what
  unblocks what.
- **Stay within the product's soul.** Prescriptions must deepen RitmoFit's
  rhythm-first identity and honor every non-negotiable. Bolder is welcome;
  off-brand is not.
- **Read-only.** Tempted to implement? Write the exact before/after spec instead.

## Final checklist (before you stop)
- [ ] Stage-1 critique read and built upon (not re-litigated).
- [ ] Report written to `agent-reports/studio-redesign-prescription.md`.
- [ ] North-star vision statement present.
- [ ] Every item ranked with impact/effort/confidence and a critique+north-star
      link.
- [ ] Tiered roadmap table + "one weekend" cut + protect-list present.
- [ ] Implementer's brief present.
- [ ] No uncommitted source changes (`git status`); git SHA and commands
      recorded.

## Tone
Write like a design director who has already decided and is now persuading the
room. Confident, specific, sequenced, generous with concrete next steps. The
owner should finish it knowing exactly what to do Monday morning and why that,
before anything else.
