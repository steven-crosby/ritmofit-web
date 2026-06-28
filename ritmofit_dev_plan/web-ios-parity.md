# Web ↔ iOS Surface Parity

> **Canonical process doc for the "Spotify for instructors" parity principle** (decision
> [`decisions.md`](./decisions.md) **D18**). Both repos link here. The web repo remains the source of
> truth for the API contract and the design language; this doc defines how the two *clients* stay in
> lockstep on **capabilities**, not just data and tokens.

## The principle (one line)

Web and iOS are **two complete, co-equal surfaces of one product**. Every core instructor capability
exists on **both**, in each platform's native idiom. A surface may *lean* toward a context (web at a
desk, iOS in the room) but is **never capability-limited**. Full rationale + tradeoffs: D18.

## The hard gate (effective now)

**No feature merges on one surface without the same capability landing on the other, or a tracked,
linked parity item on the other surface.** Existing asymmetries are **defects**, worked down ahead of
most net-new feature work.

**Current sequence:** web launch readiness is the active milestone. This is a sequencing choice, not a
parity exemption: iOS gaps remain tracked here, and launch-critical web changes that increase iOS debt
must add or update a linked backlog item before merge. Once the web launch gate is green, focus shifts to
the iOS wrap-up.

In practice, for any feature PR (web *or* iOS):

1. State the parity impact in the PR description: does this ship on both surfaces, or does it open a
   linked parity item on the other?
2. If it can't land on both at once, the parity item is created **before merge** and linked, and the
   gap is added to the **Parity backlog** below.
3. A genuinely platform-bound difference is allowed **only** if it's added to **Documented exceptions**
   below (not just asserted in the PR).

## Sync points (what keeps the two honest)

| Layer | Mechanism | Enforced? |
|---|---|---|
| **Data** | Versioned **`GET /classes/:id/run-payload`** + the rest of the REST surface; shared Zod types in `packages/shared`; `apps/api/openapi/openapi.json` is generated and **drift-gated** in web CI. | ✅ within web; iOS Swift models reconciled **by hand** against the spec |
| **Design** | `ritmofit_design_system/tokens.json` is the platform-agnostic source of truth → web `theme.css` + `ios/RFTokens.swift`, both **drift-gated** by the web "Design system verify" CI step. | ✅ within web |
| **Capability** | This doc + the D18 hard gate. | ⚠️ **manual** — no automated cross-repo capability check |

### Known seam gaps (process debt to close)

- **Run-payload DTO drift is now gated** (was: "no cross-repo drift check" for the contract). The CI
  step **"iOS contract parity (run-payload DTO drift)"** (`pnpm --filter @ritmofit/api contract-parity`,
  `apps/api/scripts/check-contract-parity.ts`) compares the field sets the OpenAPI spec advertises
  against the fields the vendored `ios-snapshot/Core/Models/RunPayload.swift` DTOs decode. A *new* drift
  in either direction fails CI; known, accepted additive lag is tracked in the script's allowlist
  (`apps/api/src/lib/contract-parity.ts` → `CONTRACT_PARITY_ALLOWLIST`). Field-name presence only —
  type/nullability/enum drift stays the job of the manual `agent-prompts/remote-prompts/technical/api-contract-parity.md`
  pass. **Currently allowlisted (iOS DTO follow-ups owned in `ritmofit-ios`):** `RunClass.timelineMode`;
  `RunTrack.displayRpm` / `holdCount` (D14, PR #110) / `clipStartMs` / `beatAnchorMs`; `Move.beat` /
  `Move.bar`.
- **Still open: no design-token drift check for the iOS-vendored copy.** iOS vendors its own
  `ritmofit-ios/design-tokens/tokens.json` and `…/Core/DesignSystem/RFTokens.swift`, hand-synced from web
  canon; nothing fails when they drift from `ritmofit-web/ritmofit_design_system/tokens.json` (live
  symptom: iOS lagged the v4.1 font migration). The contract-parity gate above doesn't cover tokens
  because the iOS `tokens.json` isn't vendored into this repo — closing it needs either vendoring it or a
  cross-repo check.
- **iOS Swift models can silently lag additive contract fields** — now caught by the gate above for the
  run-payload surface. Re-verify the iOS DTO against the current contract before integration work; refresh
  `ios-snapshot/` so the gate compares against current iOS.

## Post-Web-Launch Parity Backlog

Capability-level, both directions. During web launch readiness, this ledger is a controlled deferral
list; after the launch gate is green, it becomes the next implementation queue. Track concrete slices in
`milestones.md` (web) and `BUILD_ORDER.md` (iOS).

**Web has, iOS needs:**

- Full **class builder / choreography** (timeline, cues, moves, intensity, sections, trim/beat-snap)
  - Segment-band track-range snapping (web Session 5): a "Snap to tracks" toggle snaps a dragged/keyed
    section boundary to the nearest track edge (authoring affordance; sections still store a free
    `startOffsetMs`, so no contract change). iOS should offer the same snap when its segment editor lands.
  - Custom-move discipline + base-move editing (web Session 5): the custom-move manager edit form now
    sets a move's `template` (discipline) and `baseMoveId` (link to a global library move); both already
    existed in the contract/API. iOS should expose the same two fields when its custom-move manager
    lands. No contract change.
  - Planning-timeline tempo pulse (web Session 5): the active track's block in the builder timeline
    carries the design system's second sanctioned pulse (`10-rhythm-system.md` §2) — a subtle
    `scale 1.0→1.03` + faint border-luminance breath retimed by the track's BPM, suppressed under reduce
    motion. iOS should add the equivalent SwiftUI `beatDuration` pulse on its builder play indicator when
    its choreography surface lands (`08-ios-web-alignment.md` already specifies "same two places"). No
    contract change (BPM is already in the run-payload via `displayBpm`).
- **Multi-provider track search** (SoundCloud / Spotify / Apple Music) + provider connect
- **Library** of saved/liked tracks
  - Library-card summary (web Session 3): `GET /classes` now returns additive per-class card
    aggregates (`trackCount`, `totalDurationMs`, `albumArtUrls`) via the new `ClassListItem` shape, and
    the web rail renders a track-art collage, track count, total runtime, last-opened date, a duplicate
    ("save a copy") action, and a create-class template chooser. iOS should surface the same card
    summary + duplicate/create affordances when its Library lands. Contract change is additive (existing
    iOS decoding is unaffected).
  - Class-detail read mode (web Session 4): a read-only class view (songs + placed moves + cues + section
    bands, from the run-payload) reachable from a Library card "View" action, with "Open in builder".
    iOS should offer the same at-a-glance read view. No contract change (reuses `GET /run-payload`).
  - Songs-by-Move "Start a class" (web Session 4): a Songs-by-Move result can seed a new class from a
    choreographed song via the existing copy-class-track route. iOS should add the same class-starting
    action when Songs-by-Move lands. No contract change.
- **Explore** feed
- **Sharing / teams** UI
- Run-payload DTO catch-up for currently allowlisted additive fields: `RunClass.timelineMode`;
  `RunTrack.displayRpm` / `holdCount` / `clipStartMs` / `beatAnchorMs`; `Move.beat` / `Move.bar`

**iOS has, web needs:**

- No current capability-level backlog item. The prior full **live-run** gap is closed on web:
  `LiveMode` now provides the cue prompter, virtual clock, interval timers, intensity readouts, and
  provider handoff from `run-payload`. Future web live work should be framed as enhancement
  (for example, second-screen presentation), not as closing the core parity gap.

## Documented exceptions (allowed divergence)

Only genuinely platform-bound affordances. Anything not listed here that differs meaningfully between
surfaces is a **bug**, not a nuance (cf. `08-ios-web-alignment.md` › "Consistency contract").

- **iOS-only:** haptics; lock-screen / Now-Playing integration; motion/ambient sensing.
- **Web-leaning enhancement:** second-screen "presentation/cast" view (laptop → external display / TV),
  layered on top of full live-run — additive, never a reason to limit web's live capability.
- **UX is platform-idiomatic, not unified:** same capabilities, native patterns per platform (iOS tab
  bar + gestures vs. web sidebar + keyboard). See `08-ios-web-alignment.md` › "expresses differently."

## Open follow-on (not gating)

**iPad as a first-class iOS target.** The principle currently leans on web to cover iPad (the iOS app is
iPhone-only). A deliberate decision later — revisit when iPad usage is evidenced.
