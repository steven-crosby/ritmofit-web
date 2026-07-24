# Phase 2: ranked backlog and comprehensive preview specification

Read `README.md`, `00-context.md`, Phase 1 inventory, critique, and current screenshots. Convert the diagnosis into a complete, traceable proposal specification. Do not edit production code.

All outputs land in `docs/audits/[agent-id]-design-audit-[ISO-date]/`.

## Outputs

- `docs/audits/[agent-id]-design-audit-[ISO-date]/backlog.md`
- `docs/audits/[agent-id]-design-audit-[ISO-date]/preview-brief.md`

## `backlog.md`

### Polish thesis

Write one sentence describing how Ritmo Studio should change and why it improves creation speed first.

### Ranked findings

Each item must include:

| Field | Requirement |
| --- | --- |
| ID | `P0-01`, `P1-02`, etc. |
| Title | Specific behavior or design change |
| Source status | new, regression, known-open, superseded |
| Type | workflow, navigation-within-shell, layout, component, token, copy, interaction, state, a11y, motion |
| Surface IDs | Exact inventory rows affected |
| Scenario outcome | Faster build, clearer recovery, Live safety, or premium craft |
| Evidence | Critique section and current screenshots |
| Current canon relationship | app drift, canon gap, proposed canon change, or none |
| Likely files | Best-effort source and design-system mapping |
| Effort/risk | S/M/L and low/medium/high |
| Priority | P0/P1/P2 or `product-decision-required` |
| Prototype coverage | Exact proposed screens/states that must demonstrate it |
| Acceptance | Owner-tryable, visually and behaviorally testable outcome |

Priorities:

- **P0:** material class-creation speed, blocked comprehension, accessibility, or Live-safety improvement.
- **P1:** cross-surface coherence, premium craft, state quality, or secondary speed improvement.
- **P2:** worthwhile but lower-leverage refinement.
- **Product decision required:** structural change outside the locked preview scope.

The prototype still shows P0, P1, and any P2 change needed to make the proposed product coherent. It may annotate a product-decision-required item without inventing the redesign.

### Scenario map

Map backlog IDs onto every supported scenario from `00-context.md`. Surface polish that helps only one assumed funnel must not erase alternative creation entry points.

### Dependency and collision map

Identify shared foundations, downstream surfaces, and likely file collisions. This will later drive efficient implementation prompts; it does not authorize implementation now.

### Kill/defer list

Record ideas intentionally excluded because they revive dormant scope, add decorative noise, conflict with provider constraints, over-specialize one discipline, or cost more than their outcome justifies.

## `preview-brief.md`

This file is the binding specification for phase 3.

### 1. Product-specific direction

Document:

- Domain concepts (minimum five).
- Natural color/material world (minimum five).
- One Ritmo-specific signature.
- Three or more rejected generic defaults and their replacements.
- Depth strategy, surface hierarchy, typography roles, spacing basis, radius behavior, navigation treatment, and motion posture.

Every decision must explain why it serves this instructor and task. “Clean,” “modern,” and “premium” are not sufficient explanations.

### 2. Coverage contract

Copy every `primary` and `must-mock-state` row from `surface-inventory.md`. For each specify:

- Proposed prototype view ID.
- Desktop and mobile requirement.
- Content fixture and meaningful state.
- Backlog IDs demonstrated.
- Interaction needed to understand the direction.
- Current screenshot used for comparison.

No primary row may be silently dropped. When several rows share an identical treatment, they may share a prototype component but must remain individually navigable and traceable.

### 3. Prototype information architecture

Specify a persistent review index with:

- Surface/workflow navigation.
- Desktop/mobile switch.
- State and fixture switch where relevant.
- Backlog annotations that can be shown without obscuring the UI.
- Direct links or stable anchors for owner review.

### 4. Shared component and token plan

List the prototype primitives that guarantee one coherent product: shell, navigation, headings, controls, buttons, rows/cards, dialogs, state panels, playback language, timeline marks, Live data, and annotations.

### 5. Before/after evidence plan

For each primary surface identify the current screenshot and required proposed screenshot. Proposed captures are mandatory, not optional.

### 6. Hostile and accessibility plan

Identify which prototype views demonstrate long text, dense content, empty/error/disconnected state, focus, reduced motion, narrow reflow, color-independent meaning, and Live pressure hierarchy.

## Quality gate

Before proceeding to Phase 3, verify that inventory rows, backlog IDs, prototype views, and screenshots form a closed traceability chain. Upon passing this quality gate during end-to-end execution, continue directly to Phase 3.
