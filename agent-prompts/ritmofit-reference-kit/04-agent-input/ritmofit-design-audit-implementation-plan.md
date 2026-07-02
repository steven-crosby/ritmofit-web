# RitmoFit Design Audit Implementation Plan

## Purpose

This is a continuation plan for implementing the recommendations from
`ritmofit-pattern-based-design-evaluation.md`. It is written for a future agent that may pick up the
work without the original audit context.

The work is a design-system/mockup refinement pass, not a product feature. Keep scope limited to the
framework-free reference screens under `ritmofit_design_system/mockups/` and related design-system
documentation only when a rule needs to be clarified.

## Source Material To Read First

1. `AGENTS.md`
2. `ritmofit_design_system/README.md`
3. `ritmofit_design_system/01-design-principles.md`
4. `ritmofit_design_system/04-layout-and-surfaces.md`
5. `ritmofit_design_system/05-components.md`
6. `ritmofit_design_system/06-motion.md`
7. `ritmofit_design_system/07-accessibility.md`
8. `ritmofit_design_system/09-class-builder-guidelines.md`
9. `ritmofit_design_system/10-rhythm-system.md`
10. `agent-prompts/ritmofit-reference-kit/04-agent-input/ritmofit-pattern-based-design-evaluation.md`

## Goal

Bring the RitmoFit mockups into alignment with the completed pattern audit by fixing the highest-risk
responsive and state-clarity issues while preserving the current visual direction: Club Athletic +
Creator Swagger + Nike restraint.

The finished pass should make Builder and Live reliable at narrow widths, make current/playing states
readable without motion or color alone, restore button geometry to the component rules, and reserve
plasma for true peak affect.

## Files Expected To Change

Primary files:

- `ritmofit_design_system/mockups/theme.css`
- `ritmofit_design_system/mockups/builder.html`
- `ritmofit_design_system/mockups/live.html`
- `ritmofit_design_system/mockups/login.html`

Possible documentation files, only if implementation clarifies a rule:

- `ritmofit_design_system/05-components.md`
- `ritmofit_design_system/09-class-builder-guidelines.md`
- `ritmofit_design_system/10-rhythm-system.md`

Do not edit generated token outputs unless `tokens.json` changes. This plan should not require token
changes.

## Schema, API, And Parity Impact

- Schema impact: none.
- Migration impact: none.
- API contract impact: none.
- Auth/permission impact: none.
- Music-provider impact: none.
- iOS parity impact: design guidance only. If docs are updated with a shared component rule, note the
  corresponding iOS consideration in the final handoff, but do not edit the iOS repo from this task.

## Implementation Slices

### Slice 1: Fix Mobile Live Clipping

Files:

- `ritmofit_design_system/mockups/theme.css`
- `ritmofit_design_system/mockups/live.html`, only if markup hooks are needed

Current problem:

- At a 390px viewport, the giant `138 BPM` readout clips horizontally.
- The tempo pulse may scale a layout container beyond the viewport.

Implementation direction:

- Keep the mobile Live first screen focused on current cue, BPM, next cue countdown, and Pause.
- Ensure `.live-hud`, `.current-cue`, `.current-cue-meta`, and `.live-bpm` can shrink with
  `min-width: 0` where needed.
- Move pulse scale to a contained inner element or use a non-layout-affecting visual treatment.
- At mobile widths, stack or wrap BPM metadata so the number and label never exceed the viewport.
- Use `clamp()` with a measured lower bound that works at 320px.
- Keep reduced-motion behavior meaningful: when animation is removed, current cue and BPM should still
  be visually dominant.

Acceptance criteria:

- No horizontal scroll or clipped BPM at 320px, 390px, or 480px.
- Current cue, BPM, next cue countdown, and Pause are visible without depending on hover.
- `prefers-reduced-motion` still removes pulse affect without removing state meaning.

### Slice 2: Fix Mobile Builder Overflow

Files:

- `ritmofit_design_system/mockups/theme.css`
- `ritmofit_design_system/mockups/builder.html`, only if structure needs small hooks

Current problem:

- At a 390px viewport, Builder clips class metrics, ribbon copy, controls, and track-row content.

Implementation direction:

- Treat narrow Builder as a real single-column workbench, not a squeezed desktop grid.
- Audit the full Builder layout for width pressure:
  - main Builder grid
  - class header/actions
  - class metrics
  - energy ribbon labels
  - segment controls
  - track rows
  - inspector controls
- Add `min-width: 0` to grid/flex children that contain truncating text.
- Convert dense class metrics into wrapping chips or a compact two-column metadata stack.
- Collapse track rows into a mobile sequence:
  - index or current-state marker
  - title
  - provider/duration
  - BPM
  - intensity
- Hide or de-emphasize alternate modality metrics on mobile unless they are the selected modality.
- Keep row controls accessible with visible focus and usable touch target size.

Acceptance criteria:

- No horizontal scroll or clipped controls at 320px, 390px, or 480px.
- Track rows remain scannable and do not become anonymous stacked text.
- BPM and intensity are still available without opening the inspector.
- Keyboard focus rings remain visible.

### Slice 3: Strengthen Builder Current/Playing State

Files:

- `ritmofit_design_system/mockups/builder.html`
- `ritmofit_design_system/mockups/theme.css`
- `ritmofit_design_system/05-components.md`, only if documenting the shared state pattern

Current problem:

- The playing row depends on a small cyan dot and pulse. That is not enough for reduced-motion-safe or
  color-independent scanning.

Implementation direction:

- Add a compact visible label such as `Now` or `Playing` near the current-row marker.
- Keep the pulse/dot as reinforcement, not the only visual signal.
- Ensure the selected row and playing row can coexist without ambiguity.
- Use structure, label, weight, and icon/shape before relying on color.
- Ensure the label works on mobile without causing row overflow.

Acceptance criteria:

- The current/playing row remains obvious with reduced motion enabled.
- The state is visible without relying on color alone.
- Selected and playing states are visually distinct.

### Slice 4: Restore Button Geometry

Files:

- `ritmofit_design_system/mockups/theme.css`
- `ritmofit_design_system/05-components.md`, only if current docs need a clarifying note

Current problem:

- `.button` uses `--rf-radius-pill`, but component guidance says ordinary buttons should use input
  radius. Pill geometry should be reserved for chips, tags, compact filters, nav pills, and status.

Implementation direction:

- Change ordinary `.button` radius to `--rf-radius-input`.
- Preserve pill radius for components that are intentionally pill-shaped:
  - chips
  - tags
  - status pills
  - compact filters
  - nav pills
- Check all mockups after the global button change for awkward fit or text clipping.

Acceptance criteria:

- Ordinary buttons feel slightly more architectural and less Spotify-adjacent.
- Pills remain pills where the component type calls for them.
- Button text and icons remain centered at desktop and mobile widths.

### Slice 5: Cool Down Login Plasma

Files:

- `ritmofit_design_system/mockups/login.html`
- `ritmofit_design_system/mockups/theme.css`, only if reusable styling is needed

Current problem:

- Login spends `.rf-bg-peak` in a decorative class-shape preview. Plasma should be scarce and reserved
  for All-Out, Live drops, Zone 4 in the ribbon, and marketing/share artwork derived from real peaks.

Implementation direction:

- Replace decorative peak/plasma in login with a quieter copper/ember or non-peak class-shape segment.
- Preserve a small RitmoFit identity cue near sign-in, especially for mobile where the story panel is
  hidden.
- Keep sign-in focused, calm, and low-motion.

Acceptance criteria:

- Login no longer uses plasma as decoration.
- Mobile login still has a subtle music/class-shape identity signal.
- Sign-in remains task-first and accessible.

### Slice 6: Tighten Builder Row Scan Hierarchy

Files:

- `ritmofit_design_system/mockups/theme.css`
- `ritmofit_design_system/mockups/builder.html`, only if markup needs a clearer data grouping

Current problem:

- Desktop track rows are useful but crowded when title/provider, intensity, BPM, alternate metrics, and
  grip all compete in the same row.

Implementation direction:

- Keep the left side focused on sequence, current/selected state, artwork, title, and provider/duration.
- Give BPM a stable right-side lane.
- Keep intensity visible but compact.
- Hide alternate modality metrics unless the current modality needs them.
- Avoid making rows taller than necessary; Builder should remain a dense planning surface.

Acceptance criteria:

- Rows scan faster on desktop without losing required data.
- Mobile and desktop use the same information hierarchy expressed at different densities.
- Reordering, selection, and current state remain clear.

## Verification Plan

Run the design-system gate:

```sh
(cd ritmofit_design_system && npm run verify)
```

Generate screenshots for at least these pages:

- `builder.html`
- `live.html`
- `login.html`
- `marketing.html`

Use at least these viewport widths:

- 320px
- 390px
- 480px
- 1440px

Recommended local screenshot command pattern:

```sh
mkdir -p /tmp/ritmofit-design-implementation-shots
for page in builder live login marketing; do
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --screenshot=/tmp/ritmofit-design-implementation-shots/${page}-390.png \
    --window-size=390,1000 \
    "file:///Users/stevencrosby/Repos/RitmoFit/ritmofit-web/ritmofit_design_system/mockups/${page}.html"
done
```

Also verify manually or by screenshot:

- No horizontal clipping at 320px, 390px, and 480px.
- `prefers-reduced-motion` keeps Live and Builder state legible.
- Focus states remain visible on changed controls.
- Ordinary buttons changed shape, while chips/tags/status pills did not regress.
- Login has no decorative plasma usage.

## Risks And Watchouts

- Do not accidentally weaken the desktop Builder and Live surfaces while fixing mobile.
- Do not solve overflow by making everything tiny. Prioritize hierarchy and responsive structure.
- Do not turn Live into a generic dashboard. It should remain a performance surface.
- Do not use color as the only state indicator.
- Do not introduce new tokens unless the existing system cannot express the needed change.
- Do not broaden the task into app implementation, backend work, pricing design, or new product
  surfaces.

## Suggested Order Of Work

1. Create a small screenshot baseline for Builder, Live, Login, and Marketing.
2. Fix Live mobile clipping.
3. Fix Builder mobile overflow.
4. Add Builder current/playing label.
5. Change ordinary button radius and check all affected pages.
6. Remove decorative login plasma and preserve a quiet identity cue.
7. Tighten Builder track-row density if time remains.
8. Run `npm run verify` from `ritmofit_design_system`.
9. Regenerate final screenshots and compare against baseline.
10. Report changed files, verification, remaining risks, and any iOS parity notes.

## Definition Of Done

The implementation is complete when:

- Builder, Live, Login, and Marketing render without horizontal overflow at 320px, 390px, and 480px.
- Live BPM is never clipped.
- Builder current/playing state has a visible text label.
- Ordinary buttons use input radius; pill components remain pill-shaped.
- Login no longer uses decorative plasma.
- `ritmofit_design_system` verification passes.
- Final report includes screenshots or screenshot paths and notes any residual design-system or iOS
  follow-up.
