# Implementation prompt 01: shared workstation UI foundations

## Role and outcome

Act as the implementation owner for Ritmo Studio’s shared web UI foundations. Establish the reusable
interaction, typography/data, accessibility, loading, status, and recovery grammar that later surface slices
consume. The instructor outcome is a workstation that remains legible, operable, and truthful under dense,
mobile, failure, and teaching-pressure conditions.

## Authority

Implementation only after the owner separately authorizes this prompt. Do not create/switch a branch, commit,
push, open a PR, merge, deploy, delete, or clean up without separate permission for each action. Do not begin
another implementation prompt.

## Required reads and baseline

1. Read the current repository `AGENTS.md` and reverify current `origin/main`.
2. Read:
   - `docs/audits/2026-07-19-full-product-preview/implementation-sequence.md`
   - `preview-brief.md`, `backlog.md`, `run-decisions.md`, and `pre-pr-audit.md`
   - prototype anchors and desktop/mobile captures named below
   - `ritmofit_design_system/README.md`, accessibility, motion, typography, layout, component, Builder, rhythm,
     and library guidance
3. Audited evidence baseline: `addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`. If current `origin/main` differs,
   inspect the drift before editing and report any contradiction.

## Approved scope

- Owning IDs: P0-07, P0-08, P1-03, P1-04.
- Representative inventory/prototype states: PUB-03/05/06/07, SYS-01/02/03, CLS-05, MUS-07, CONN-02,
  BLD-15, LIVE-09, ACC-03, plus populated views for density comparison.
- Approved direction: pressure-safe targets/focus/reduced motion, clear type/data hierarchy, one named recovery
  grammar, and task-specific state language.
- P2-01 and P2-02 are deferred. Do not implement artwork generation or beat-aware/decorative motion.

## Behavior before appearance

Preserve routing, auth behavior, update/reload recovery, error boundaries, data fetch/retry semantics, dialogs,
provider capability truth, and every existing successful workflow. A visual foundation must not change API
payloads, persistence, provider playback, authorization, or what an action does.

Recovery states must answer, in this order:

1. What happened.
2. What remains safe or unchanged.
3. The best next action.
4. A truthful secondary escape when one exists.

Loading must preserve enough workspace shape to avoid looking like an empty account. Unavailable must remain
distinct from empty, disconnected, unauthorized, and deleted.

## File ownership and collisions

Likely owned files:

- `apps/web/src/index.css`
- `apps/web/src/styles/tokens.css` only through the token generator
- `apps/web/src/components/DialogState.tsx` and its tests
- `apps/web/src/components/ErrorBoundary.tsx` and its tests
- `apps/web/src/components/UpdatePrompt.tsx` and its tests
- `apps/web/src/components/PendingList.tsx` and focused tests
- new narrowly reusable status/recovery primitives under `apps/web/src/components/` when two concrete uses exist
- `ritmofit_design_system/tokens.json` and guidance only if an existing canonical token cannot express the
  approved direction; regenerate every derived token output if changed

Collision rules:

- This prompt lands before prompts 02–06.
- Do not make surface redesigns in `Dashboard.tsx`, `LiveMode.tsx`, `ChoreographyEditor.tsx`, or public/auth
  components; later prompts own those applications.
- Record the exported primitive/token contract so downstream prompts do not fork it.

Frozen:

- `apps/api`, migrations, OpenAPI, `packages/shared`, `packages/music`, playback adapters/runtime, and iOS
  product source
- Explore, Teams, Share/community, collaborator, pricing, and subscription surfaces

## Implementation order

1. Inventory existing semantic tokens, focus styles, target sizing, status/error components, and reduced-motion
   behavior; write down which approved needs are already met.
2. Define the smallest shared contracts for status icon + label, recovery content/actions, loading skeleton/shape,
   and time/data typography.
3. Implement reusable primitives only where at least two active surfaces use them.
4. Apply them to shared system surfaces: loading, update, render/stale-chunk recovery, and generic pending/error
   presentation.
5. Add focused tests before broad visual styling.
6. Update design-system canon/tokens only for genuinely shared gaps, regenerate derived files, and verify contrast.
7. Document the downstream contract and the surface-specific acceptance checks inherited by prompts 02–06.

## Design translation

- Preserve the existing dark/light token model.
- Copper is primary authoring action; cyan is interactive/focus/playback truth; amber is warning; red is error.
- Status meaning must include icon/text, never color alone.
- Use Bricolage only for earned display moments, Sora for work, and Azeret for time/data.
- Use raised depth only for overlays, sticky trays/rails, or critical runtime recovery.
- Do not reproduce prototype CSS literally; implement the hierarchy through current React/components/tokens.

## Responsive and hostile cases

- Test 1280×800 and 1440×1000 desktop, 390×844 mobile, direct 320px, and 640 CSS-pixel 200%-equivalent
  reflow.
- No page-level horizontal overflow.
- Visible mobile targets are at least 44×44 CSS pixels unless an equivalent larger hit area is proven.
- Exercise long multilingual titles, long provider/error strings, dense status rows, missing artwork, and sparse
  data.

## Accessibility

- Keyboard-operable actions with logical focus order and persistent visible focus.
- Dialog and alert semantics remain correctly named; do not add noisy live regions.
- Reduced motion preserves state with static labels.
- Grayscale/non-color meaning survives.
- Loading and recovery announcements do not repeatedly interrupt or erase context.
- Preserve focus across retry/recovery where safe; explicitly move it only after a documented state transition.

## State coverage

At minimum cover loading, empty, unavailable, error, update available, stale-chunk/render recovery, disabled,
retrying, and recovered. Create a small state matrix in tests or handoff showing which shared primitive covers
which state and which later prompt owns its surface-specific use.

## Tests and gates

- Add focused component/helper tests for new shared contracts and regression paths.
- Run the web tests covering every changed component.
- Run `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `(cd ritmofit_design_system && npm run verify)`,
  `pnpm test`, and `pnpm --filter @ritmofit/web build` unless the owner explicitly accepts a narrower gate.
- Run the remaining CI-equivalent commands from `AGENTS.md` before a PR-ready claim.
- Run `git diff --check` and confirm generated tokens are in sync.

## Visual verification

Use a real browser. Compare representative shared states to `mockups/#SYS-01`, `#SYS-02`, `#SYS-03`,
`#PUB-07`, `#CLS-05`, `#MUS-07`, `#BLD-15`, `#LIVE-09`, and `#ACC-03` at desktop and mobile. Capture current
implementation evidence; do not reuse prototype screenshots as proof.

## Acceptance criteria

- P0-07: keyboard, focus, 44px targets, reduced motion, non-color meaning, reflow, and hostile content pass.
- P0-08: recovery language consistently identifies event, safety, and next action without conflating states.
- P1-03: one focal action survives the squint test and time/data scan distinctly from prose.
- P1-04: generic system language is replaced only where a concrete task/capability/recovery is known.
- Downstream surfaces can consume one documented status/recovery contract without copying implementation.
- No dormant surface, schema, provider behavior, or deferred P2 polish enters the change.

## Failure and stop conditions

Stop and request direction if the approved result requires schema/API/provider/legal behavior, authentication
changes, a new design-system dependency, a new persistence model, or a broad rewrite of `Dashboard.tsx`.
Report any current-source contradiction or token-generation drift; do not route around it.

## Handoff

Report changed files, shared contracts, tests/gates, browser screenshot paths, observed gaps, downstream
requirements, and every unauthorized action not taken. Do not claim prompts 02–06 are complete.

Suggested branch: `codex/shared-ui-foundations`
Suggested PR title: `feat(web): establish shared workstation UI foundations`
