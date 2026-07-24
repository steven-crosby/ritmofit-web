# Phase 1: active-product inventory, baseline, and critique

Read the pack `README.md` and `00-context.md` first. This phase diagnoses current rendered truth and builds
the coverage contract for the later prototype. Do not edit production code.

## Inputs

- Running local API and web app with the `fixtures.md` data from phase 0b.
- `surface-ids.md` — the canonical ID registry this phase binds to.
- `AGENTS.md`, current D20/D21 decisions, and relevant design-system guidance.
- Current `apps/web/` entry points, active component tree, tokens, and shared components.
- The most recent prior run in `docs/audits/`, to separate new findings from known and resolved work.

## Required outputs

- `<run-folder>/surface-inventory.md`
- `<run-folder>/critique.md`
- `<run-folder>/screenshots/current/`
- Appended rows in `agent-prompts/design-audit/surface-ids.md` for any newly discovered surface.

## 1. Build the active-surface inventory

Trace the rendered application, not filenames alone. Cover every primary page/workspace, active
dialog/overlay, and materially different state.

Bind IDs to `surface-ids.md`:

- A surface that already has an ID keeps it, even if your inventory order or naming differs.
- A genuinely new surface takes the next free number in its prefix and is appended to the registry, with
  its source mapping, as part of this run.
- A registry surface you cannot find in the current app is reported as `retired` with the evidence that it
  is gone — not silently dropped.
- Reserved numbers are never assigned.

Each inventory row must include:

| Field | Requirement |
| --- | --- |
| ID | Canonical ID from `surface-ids.md` |
| Surface/state | Human-readable name |
| Entry path | How the instructor reaches it |
| Active? | Evidence that it is currently reachable |
| Scenario(s) | Which job(s) in `00-context.md` use it |
| Current evidence | Desktop/mobile screenshot paths and relevant source files |
| State class | default, populated, empty, loading, error, disconnected, disabled, recovery, edge case |
| Preview requirement | `primary`, `must-mock-state`, `reference-only`, or `excluded-dormant` |
| Coverage | observed, code-confirmed, inferred, or not-checked |
| Notes/gap | Why evidence is incomplete, if applicable |

At the end, include counts by classification, plus counts of new, retired, and registry-bound rows. A
comprehensive preview cannot silently omit inventory rows.

## 2. Capture rendered truth

For every primary surface:

- Capture desktop and 390x844 using browser viewport emulation.
- Capture the important state variants identified in the inventory.
- Exercise 320px and 200% zoom on Builder, dialogs, and Live.
- Exercise keyboard-only navigation and visible focus.
- Emulate reduced motion on motion-bearing surfaces.
- Observe console, network, asset, and font failures.
- Use the `fixtures.md` populated account, the fresh account, and the specified hostile content.

Save captures to `<run-folder>/screenshots/current/` as JPEG or WebP, desktop capped at 1440px wide, named
after the surface ID and viewport: `BLD-04-timeline-desktop.jpg`, `BLD-04-timeline-390.jpg`. Never PNG.
Keep the whole run inside the size budget in the pack `README.md`.

Do not manufacture a visual finding from a cropped narrow window. If a surface cannot be reached, record
the exact blocker and do not pretend it was reviewed.

## 3. Exercise product scenarios

Walk every supported scenario in `00-context.md`. For each, record:

- Start condition and goal.
- Steps and major decisions.
- Context switches, repeated work, dead ends, unclear labels, and recovery.
- What was measured directly versus inferred.
- Candidate improvements, without yet prescribing full solutions.

Do not treat one discovery-to-Live sequence as the only valid instructor workflow.

## 4. Write `critique.md`

Use this structure:

### A. Verdict

- Strongest product asset.
- Most damaging workflow friction.
- Most generic/defaulted design behavior.
- Most important Live pressure risk.
- Whether current Ritmo Studio feels like a coherent premium creative instrument.

### B. Workflow findings

Group by scenario. For every finding provide:

- Finding ID and status: `new`, `regression`, `known-open` (cite the prior run and its ID),
  `resolved-since` (a prior run's finding that the current app has fixed), or `superseded`.
- Evidence label and surface IDs.
- Current behavior and instructor consequence.
- Frequency/severity and why it affects the success order.
- Rival explanation considered or evidence gap.

### C. Surface critique

For every primary inventory row:

- Intent and focal action.
- What works and should be preserved.
- Composition, proportion, hierarchy, density, typography, surface, and content-coherence problems.
- Interaction/state/accessibility problems.
- Desktop/mobile difference and hostile-case behavior.
- Screenshot and source references.

### D. System critique

Review navigation, tokens, typography, spacing, depth, components, controls, music presentation, timeline
language, Live treatment, motion, and state consistency. Classify each issue as app drift, canon gap, or
proposed canon change.

### E. Brand and voice

Flag generic SaaS language, weak action labels, costume-Latin expression, or places where movement/music
language can become more precise without becoming theatrical.

### F. Accessibility and sustained-use comfort

Report keyboard, focus, contrast, redundant encoding, target size, zoom/reflow, reduced motion, and stress-use
findings. State the method used; do not award accessibility from appearance alone.

### G. Structural findings outside polish

Record meaningful shell/IA problems as `product-decision-required` even when they are not catastrophic.
Explain the consequence and stop short of redesigning them.

### H. Evidence ledger

Inventory and screenshot counts; files, routes, scenarios, states, viewports, and checks completed; explicit
gaps; fixture deviations; current baseline branch and commit SHA; the prior run compared against.

## Quality gate

Before phase 2:

- Every active primary surface has an inventory row bound to a canonical ID.
- New surfaces are appended to `surface-ids.md`; missing ones are reported as retired.
- Every primary row has desktop and mobile evidence or an explicit gap.
- Findings cite evidence and instructor consequences rather than aesthetic adjectives alone.
- Prior-run findings are labelled `known-open` or `resolved-since` rather than re-reported as new.
- Dormant community components are identified and excluded.
- Current canon violations are not confused with proposed canon changes.

Then continue to phase 2. This is a single continuous run; do not pause for approval.
