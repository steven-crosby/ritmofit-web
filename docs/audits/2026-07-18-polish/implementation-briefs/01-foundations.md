# Implementation brief 01 — foundations

## Role

Act as the SPA design-foundations implementer. Establish only the shared interaction-target, depth,
motion, and responsive-test primitives needed by the later surface batches.

## Authority

Gate C authorizes `P0-08`, `P1-07`, `P2-03`, and `P2-04`. Do not use this foundation pass to restyle
unrelated surfaces or introduce a new component library. The current approved delivery is one draft PR
from `polishv3/design-audit-mockups`, built as six ordered commits; this is commit batch 1.

## Backlog IDs

- `P0-08` — Enforce 44px mobile interaction targets
- `P1-07` — Remove resting shadow and border drift
- `P2-03` — Spend motion only on build confirmation and the drop
- `P2-04` — Add 320px and 200% zoom visual regression gates

## User outcomes

- Build speed: essential controls remain dependable one-handed and under motion.
- Premium: hierarchy comes from stepped surfaces rather than stacks of borders and shadows.
- Live pride: expressive motion is reserved for meaningful confirmation and the real drop.
- Durability: narrow-width and zoom regressions become repeatable checks instead of memory.

## Mockup references

- `../mockups/polish-preview.html#system`
- `../mockups/polish-preview-notes.md`

Match the depth roles, 44px floor, and motion rationing. Do not copy the audit-gallery chrome or fake
component arrangements into production.

## Files to inspect / likely edit

- `ritmofit_design_system/tokens.json`
- `ritmofit_design_system/04-layout-and-surfaces.md`
- `ritmofit_design_system/05-components.md`
- `ritmofit_design_system/06-motion.md`
- `ritmofit_design_system/07-accessibility.md`
- `ritmofit_design_system/scripts/build-tokens.mjs`
- `ritmofit_design_system/scripts/build-tokens-ios.mjs`
- `apps/web/src/index.css`
- High-use controls in `apps/web/src/components/Dashboard.tsx`, `TrackSearch.tsx`,
  `ConnectionsDialog.tsx`, and `TrackPreview.tsx`
- `apps/web/smoke/narrow-width.smoke.mjs`
- `apps/web/smoke/README.md`

## Out of scope

- Surface-specific rearrangement, copy, or workflow changes owned by batches 2–6.
- A palette, typography, navigation, or IA replacement.
- Schema, API, authentication, provider, or playback behavior.
- Community, sharing, audience Live, or marketing work.

## Implementation steps

1. Inventory production uses of `shadow-card`, repeated border wrappers, and essential controls below
   44px at 390px; record intentional transient elevation separately from resting surfaces.
2. Prefer existing semantic tokens. Change `tokens.json` only when no current token expresses the
   approved depth or motion role; regenerate web and iOS outputs when the package workflow requires it.
3. Remove resting shadow use from shared/high-frequency planning surfaces. Retain lifted shadow for
   dialogs, menus, dragged rows, and other genuinely elevated states.
4. Establish a reusable 44px mobile hit-area pattern without forcing every visible icon to appear 44px.
5. Keep current confirmation and Live drop motion meaningful; remove ambient or decorative motion that
   competes with them. Preserve all information under `prefers-reduced-motion`.
6. Extend the narrow-width smoke to 320px for Login, Classes, Builder + Inspector, Music dialogs, Live,
   and Account. Add a documented or automated 200% browser-zoom pass with functional assertions.
7. Update design-system guidance only for rules production now follows.

## Tests and checks

```bash
pnpm --filter @ritmofit/web test
pnpm --filter @ritmofit/web typecheck
pnpm --filter @ritmofit/web build
(cd ritmofit_design_system && npm run verify)
PLAYWRIGHT_BASE=/tmp/rf-smoke/package.json node apps/web/smoke/narrow-width.smoke.mjs
pnpm format:check
pnpm lint
```

Manual browser checks: desktop, 390×844, 320px, 200% zoom, keyboard focus, and reduced motion. If the
local Playwright scratch runtime is unavailable, report the exact skipped smoke instead of rounding up.

## Acceptance criteria

- Every essential mobile control in the approved surfaces has a 44×44 CSS-pixel hit region or wrapper.
- Resting planning surfaces use fill hierarchy and only meaningful borders; shadow remains transient.
- Reduced motion loses no status, cue, or confirmation information.
- The smoke gate covers the six named surfaces at 320px and documents or executes 200% zoom.
- Design tokens, generated outputs, and design-system guidance remain synchronized.

## Suggested PR / branch

- Extracted PR title if needed: `feat(web): harden polish foundations`
- Extracted branch if needed: `polish/foundations-accessibility`
- Current approved delivery: commit this batch on `polishv3/design-audit-mockups` inside the single draft
  review PR.

## Stop / handoff

Report changed primitives, intentional remaining shadows, token regeneration, narrow/zoom evidence, and
any component that could not reach 44px without a surface-level decision. Do not merge or deploy.

## Global constraints

- Keep the current Classes / Music / Live / Account shell; no IA redesign.
- Success ranking: build speed > gorgeous > Live pride.
- Builder stays airy and consumer-music scannable; Live remains 80% safety/glanceability and 20% swagger.
- Never cache provider audio or provider-derived analysis; never obtain BPM from Spotify; never download,
  proxy, mix, crossfade, decode, analyze, or derive provider audio. Playback uses official provider paths.
- Prefer small diffs. When tokens change, update design-system guidance and regenerate iOS tokens when the
  package workflow requires it.
- Do not merge or deploy without separate owner authorization.
