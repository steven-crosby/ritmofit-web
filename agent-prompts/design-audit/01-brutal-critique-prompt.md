# Phase 1: active-product inventory, baseline, and critique

Read `README.md` and `00-context.md` first. This phase diagnoses current rendered truth and builds the coverage contract for the later prototype. Do not edit production code.

All outputs land in `docs/audits/[agent-id]-design-audit-[ISO-date]/`.

## Inputs

- Running local API and web app from phase 0.
- `AGENTS.md`, current D20/D21 decisions, and relevant design-system guidance.
- Current `apps/web/` entry points, active component tree, tokens, and shared components.
- Existing audit artifacts and open/recent work when available, to distinguish new findings from known work.

## Required outputs

- `docs/audits/[agent-id]-design-audit-[ISO-date]/surface-inventory.md`
- `docs/audits/[agent-id]-design-audit-[ISO-date]/critique.md`
- `docs/audits/[agent-id]-design-audit-[ISO-date]/screenshots/current/`

## 1. Build the active-surface inventory

Trace the rendered application, not filenames alone. Give each primary page/workspace, active dialog/overlay, and materially different state a stable ID such as `CLS-01`, `MUS-03`, `BLD-07`, or `LIVE-04`.

Each inventory row must include:

| Field | Requirement |
| --- | --- |
| ID | Stable surface/state ID |
| Surface/state | Human-readable name |
| Entry path | How the instructor reaches it |
| Active? | Evidence that it is currently reachable |
| Scenario(s) | Which job(s) in `00-context.md` use it |
| Current evidence | Desktop/mobile screenshot paths and relevant source files |
| State class | default, populated, empty, loading, error, disconnected, disabled, recovery, edge case |
| Preview requirement | `primary`, `must-mock-state`, `reference-only`, or `excluded-dormant` |
| Coverage | observed, code-confirmed, inferred, or not-checked |
| Notes/gap | Why evidence is incomplete, if applicable |

At the end, include counts by classification. A comprehensive preview cannot silently omit inventory rows.

## 2. Capture rendered truth

For every primary surface:

- Capture desktop and 390x844 using browser viewport emulation.
- Capture the important state variants identified in the inventory.
- Exercise 320px and 200% zoom on Builder, dialogs, and Live.
- Exercise keyboard-only navigation and visible focus.
- Emulate reduced motion on motion-bearing surfaces.
- Observe console, network, asset, and font failures.
- Use realistic populated data, a fresh account, and long/dense hostile content.

Do not manufacture a visual finding from a cropped narrow window. If a surface cannot be reached, record the exact blocker and do not pretend it was reviewed.

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

- Finding ID and status: `new`, `regression`, `known-open`, or `superseded`.
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

Review navigation, tokens, typography, spacing, depth, components, controls, music presentation, timeline language, Live treatment, motion, and state consistency. Classify each issue as app drift, canon gap, or proposed canon change.

### E. Brand and voice

Flag generic SaaS language, weak action labels, costume-Latin expression, or places where movement/music language can become more precise without becoming theatrical.

### F. Accessibility and sustained-use comfort

Report keyboard, focus, contrast, redundant encoding, target size, zoom/reflow, reduced motion, and stress-use findings. State the method used; do not award accessibility from appearance alone.

### G. Structural findings outside polish

Record meaningful shell/IA problems as `product-decision-required` even when they are not catastrophic. Explain the consequence and stop short of redesigning them.

### H. Evidence ledger

Inventory and screenshot counts; files, routes, scenarios, states, viewports, and checks completed; explicit gaps; current baseline branch and commit SHA.

## Quality gate

Before proceeding to Phase 2:

- Every active primary surface has an inventory row.
- Every primary row has desktop and mobile evidence or an explicit gap.
- Findings cite evidence and instructor consequences rather than aesthetic adjectives alone.
- Dormant community components are identified and excluded.
- Current canon violations are not confused with proposed canon changes.

Upon passing this quality gate during end-to-end execution, continue directly to Phase 2.
