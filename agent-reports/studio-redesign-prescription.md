# Studio Redesign Prescription

## The North-Star Vision

RitmoFit Studio should feel like a class-shaped instrument: the instructor starts with music, sees the
room's energy take form, edits with calm workstation precision, then enters a live surface that can be
trusted across a dark room. Spotify contributes browse pleasure and cultural polish; Logic contributes
alignment, density, and poise; MainStage contributes huge state, glanceability, and confidence under
pressure. RitmoFit's own signature is the energy arc: every major surface should make the class shape
more visible, not bury it behind generic card chrome.

## The Redesign Thesis

The highest-leverage shift is to promote the energy arc and live cue state from "components inside the
UI" to "the composition drivers." The current app has the right ingredients; the redesign should
rebalance hierarchy, scale, and surface treatment so the product reads as a creator workstation that
performs rather than a dashboard with choreography features.

## Ranked Prescription

### 1. Re-stage Live mode as the performance instrument

**Why now / rank rationale:** Live is the highest-stakes surface and the largest north-star miss. It
already has the data and accessibility model, so this is mostly composition and styling leverage.

**North star served:** MainStage first, Logic second. The goal is huge state, not more controls.

**Critique link:** Stage 1 "Live Mode" and shipped-vs-intended gap #1.

**Before -> After:** Before: a `max-w-2xl` centered cue stack floats in dark space, with modest type
and a small current cue. After: a split performance layout closer to the mockup: large current cue +
large BPM/current effort on the left, next cue and timers on the right, transport still minimal and
bottom-pinned. All-Out gets the existing plasma drop; ordinary states stay quiet.

**Scope & files:** `apps/web/src/components/LiveMode.tsx`, `apps/web/src/components/LiveTimeline.tsx`,
`apps/web/src/index.css`, `apps/web/src/components/LiveMode.test.tsx`.

**Design-system implications:** No token change required for a first pass. Use existing `data-hero`,
`display`, `bg-live`, `peak/glow`, cyan focus, and reduced-motion rules.

**UX/workflow implications:** No capability change. Keep Cue-by-Cue / Full List and provider handoff.

**Aesthetic impact / effort / confidence:** 5 / M / High.

**Parity note:** iOS follow-up required if the visual hierarchy changes materially; capability is
already shared, but live glanceability should stay aligned.

**Risk / non-negotiable check:** Live stays dark; plasma remains All-Out/drop only; reduced motion
must remove pulse/glow without removing meaning.

**Suggested validation:** Fresh desktop and 390x844 screenshots, reduced-motion screenshot, and a
LiveMode component test for the same current/next/timer semantics after layout changes.

### 2. Make the Builder's energy arc the central instrument

**Why now / rank rationale:** This is the signature move that makes RitmoFit identifiable. It also
sets up every later builder polish pass.

**North star served:** Logic for workstation hierarchy; RitmoFit synthesis for rhythm identity.

**Critique link:** Stage 1 biggest aesthetic failure and shipped-vs-intended gap #2.

**Before -> After:** Before: energy arc is a labeled card section above timeline. After: the arc and
timeline form one "class shape" workbench with stronger scale, aligned track blocks, and reduced card
fragmentation. The rail and inspector support the arc instead of competing with it.

**Scope & files:** `apps/web/src/components/Dashboard.tsx`,
`apps/web/src/components/IntensityRibbon.tsx`, `apps/web/src/components/TimelineStrip.tsx`,
`apps/web/src/components/SegmentBand.tsx`, focused component tests.

**Design-system implications:** Likely no primitive token change; may add CSS recipes for a solid
workbench surface in `apps/web/src/index.css`.

**UX/workflow implications:** No schema/API change. Keep current editing behaviors.

**Aesthetic impact / effort / confidence:** 5 / M / High.

**Parity note:** iOS builder parity item should note the class-shape workbench pattern when its builder
surface lands. No backend impact.

**Risk / non-negotiable check:** Do not add ambient animation. The ribbon stays static and accessible;
height/labels carry meaning, color reinforces.

**Suggested validation:** Desktop builder screenshot, populated and empty; mobile builder screenshot;
`IntensityRibbon`/`TimelineStrip` unit tests unchanged or extended.

### 3. Tighten the class/library rail into a music-forward creation queue

**Why now / rank rationale:** The rail is the bridge from saved music/class history into creation. It
currently feels administrative, which is the main Spotify gap.

**North star served:** Spotify polish and library fluency, without adding provider scope.

**Critique link:** Stage 1 "Library / Explore" and gap #3.

**Before -> After:** Before: class rows look like management records with Copy/View columns. After:
rows emphasize class shape summary, track count/runtime, album-art collage where available, and the
primary next action. Copy/View become quieter actions instead of vertical dividers dominating the row.

**Scope & files:** `apps/web/src/components/Dashboard.tsx`,
`apps/web/src/components/ClassSummaryView.tsx`, `apps/web/src/lib/class-summary.ts`,
`apps/web/src/components/LibraryRail.test.tsx`.

**Design-system implications:** Reuse bounded artwork and data-face numerals; no token change.

**UX/workflow implications:** No new backend. Better visual prioritization of existing actions.

**Aesthetic impact / effort / confidence:** 4 / M / Medium.

**Parity note:** iOS library backlog already includes card summaries and duplicate/create affordances;
record any visual pattern worth mirroring.

**Risk / non-negotiable check:** Album art stays bounded; BPM/duration/shape remain more important
than artwork.

**Suggested validation:** Library desktop/mobile screenshots and `LibraryRail` tests for actions.

### 4. Give modal loading/empty states RitmoFit-specific structure

**Why now / rank rationale:** Dialogs are repeated touchpoints. Small polish here makes the app feel
less generic without changing flows.

**North star served:** Spotify polish and Logic confidence.

**Critique link:** Stage 1 "Dialogs" and gap #4.

**Before -> After:** Before: "Loading..." in a warm panel. After: each dialog uses a compact header,
state-specific copy, and a tiny structured placeholder tied to the surface: provider rows for
Connections, class cards for Explore, member rows for Teams, move rows for Songs by Move.

**Scope & files:** `ExploreDialog.tsx`, `ConnectionsDialog.tsx`, `TeamsDialog.tsx`,
`SongsByMoveDialog.tsx`, `Dialog.tsx`, existing dialog tests.

**Design-system implications:** Possibly a reusable dialog state component; no tokens.

**UX/workflow implications:** No capability change.

**Aesthetic impact / effort / confidence:** 3 / S / High.

**Parity note:** Web-only polish unless the copy/state pattern becomes canonical.

**Risk / non-negotiable check:** Avoid skeleton shimmer or pulse; reduced-motion remains inert.

**Suggested validation:** Dialog screenshots and existing focus-trap tests.

### 5. Rebalance narrow viewport navigation and action density

**Why now / rank rationale:** Mobile is not the primary web build context, but crowded top actions make
the app feel less crafted.

**North star served:** Logic precision and MainStage clarity.

**Critique link:** Stage 1 "Mobile / Narrow" and gap #5.

**Before -> After:** Before: large pill actions dominate the first viewport. After: top actions collapse
into a tighter horizontal command rail or menu pattern, leaving the class list and selected class state
as the first real content.

**Scope & files:** `apps/web/src/components/Dashboard.tsx`, shared button classes in
`apps/web/src/index.css`, `apps/web/smoke/narrow-width.smoke.mjs` selector repair.

**Design-system implications:** Document a compact command rail if reused.

**UX/workflow implications:** No capability change; keyboard/focus order must remain clear.

**Aesthetic impact / effort / confidence:** 3 / M / Medium.

**Parity note:** Web responsive polish; no iOS parity item unless a capability is hidden.

**Risk / non-negotiable check:** Do not bury critical actions in a way that harms keyboard access.

**Suggested validation:** 390x844 smoke, 320px screenshot, tab-order spot check.

## Tiered Roadmap

| Rank | Title                                                              | Tier   | Impact | Effort | Confidence |
| ---- | ------------------------------------------------------------------ | ------ | ------ | ------ | ---------- |
| 1    | Re-stage Live mode as the performance instrument                   | Tier 0 | 5      | M      | High       |
| 2    | Make the Builder's energy arc the central instrument               | Tier 0 | 5      | M      | High       |
| 3    | Tighten the class/library rail into a music-forward creation queue | Tier 1 | 4      | M      | Medium     |
| 4    | Give modal loading/empty states RitmoFit-specific structure        | Tier 1 | 3      | S      | High       |
| 5    | Rebalance narrow viewport navigation and action density            | Tier 2 | 3      | M      | Medium     |

## Design-System Changes

- **Tokens:** avoid primitive changes for the first slice; existing tokens already support the work.
- **Typography:** spend Azeret Mono harder in Live for BPM, timers, and countdowns; keep Sora for
  controls and Bricolage for display labels.
- **Color/elevation:** keep planning surfaces solid; reduce card fragmentation by introducing a
  workbench composition using existing `bg/base`, `bg/raised`, `bg/overlay`, and border tokens.
- **Density:** make Builder denser through alignment and hierarchy, not smaller touch targets.
- **Controls:** keep cyan as the sole interactive language; primary copper remains one action per
  surface.
- **Rhythm behavior:** keep the pulse allowlist exactly intact: Live HUD and current planning track.

## Product Surface Changes

- **Library/search/explore:** improve existing visual hierarchy before adding product scope.
- **Dashboard:** reduce class-management feel by making the selected class shape the central object.
- **Class builder / choreography editor:** make energy arc + timeline the workbench; inspector remains
  support.
- **Dialogs:** replace generic loading/empty states with surface-specific structure.
- **Sharing/team flows:** leave capability alone; only inherit dialog polish if touched.
- **Live class mode:** first implementation target; re-stage for distance and stress.
- **Narrow/mobile viewport:** tighten command density after the Live/Builder keystones.

## Signature Interaction Proposal

The signature interaction should be **shape-first editing**: changing intensity or track order should
visibly reshape the class arc as the primary feedback, while the selected row/inspector acts as the
editing tool. In Live, the signature becomes **state-first performance**: the current cue and class
energy state are the large, unmistakable objects, with the existing beat pulse/drop used only where the
rhythm system allows.

## The One-Weekend Cut

Do #1, #2, and #4. Live mode creates the biggest perceived-quality jump; the builder energy-arc pass
makes the product uniquely RitmoFit; dialog state polish is small, visible, and lowers generic SaaS
odor across the app. Defer the rail rewrite until after those keystones unless the implementation is
already touching `Dashboard.tsx` heavily.

## What Not To Touch

- Do not change provider playback rules or imply in-app playback.
- Do not add new schema/API surface for this redesign slice.
- Do not broaden plasma usage beyond real peaks and the Live drop.
- Do not make Builder more DAW-like by adding controls; make it more precise with hierarchy.
- Do not undo marketing's current restraint.
- Do not replace the existing accessible redundant encodings with color-only signals.

## Open Design Questions

- Should Live mode's large performance layout be one-column on tablets/narrow widths or retain a
  compact right rail?
- Should the builder energy arc become visually taller at all times, or only once a class has multiple
  tracks/intensity variation?
- How much class rail action density is acceptable before Copy/View need a compact actions menu?
- Should auth inherit a tiny class-shape artifact, or stay intentionally plain?

## Implementation Sequence

1. Repair the stale smoke selectors enough to get fresh visual evidence (`Need an account? Sign up`
   text drift is currently blocking narrow smoke).
2. Implement Live mode re-staging as an isolated UI slice. No data changes.
3. Implement Builder class-shape workbench refinement. Keep `IntensityRibbon` semantics intact.
4. Add dialog state polish while touching no API contracts.
5. Re-run visual checks, then decide whether the class/library rail should be next.

## Implementer's Brief

Make RitmoFit feel like a class-shaped instrument, not a dashboard. First, re-stage Live mode so the
current cue, BPM/intensity, next cue, and timers dominate the room while preserving the existing clock,
provider handoff, reduced-motion, and accessibility logic. Second, make the Builder's energy arc and
timeline read as the central workbench rather than a card section. Third, replace generic dialog
loading/empty states with compact product-specific structures. Do not add backend scope, new music
provider behavior, extra DAW controls, or decorative plasma. Every change should strengthen existing
design-system rules: copper identity, cyan interaction, plasma scarcity, data-face numerals, and
redundant encoding.

## Run Record

- Date/time: 2026-06-29 21:43 MDT.
- Inputs read: `agent-reports/studio-aesthetic-critique.md`,
  `ritmofit_design_system/README.md`, `01-design-principles.md`, `02-color-system.md`,
  `03-typography.md`, `04-layout-and-surfaces.md`, `10-rhythm-system.md`, mockups, and relevant
  `apps/web/src/components` files.
- Git SHA inspected: `f78ef66196325913edaae583e93776bbf8b5984f`.
- Commands run: same visual/runtime commands recorded in Stage 1.

No app source changes were made during this evaluation.
