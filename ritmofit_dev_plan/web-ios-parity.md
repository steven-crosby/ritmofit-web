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

- **No cross-repo drift check.** iOS vendors its *own* copies — `ritmofit-ios/design-tokens/tokens.json`
  and `ritmofit-ios/RitmoFit/RitmoFit/Core/DesignSystem/RFTokens.swift` — hand-synced from web canon.
  Nothing fails when they drift from `ritmofit-web/ritmofit_design_system/tokens.json`. (Live symptom:
  iOS lagged the v4.1 font migration.) **Wanted:** a check that compares the iOS-vendored `tokens.json`
  against web canon, and the iOS Swift DTOs against `openapi.json`.
- **iOS Swift models can silently lag additive contract fields** (e.g. `timelineMode`, `clipStartMs`,
  `beatAnchorMs`). Re-verify the iOS DTO against the current contract before integration work.

## Parity backlog (current asymmetries — these are the defects to close)

Capability-level, both directions. Track concrete slices in `milestones.md` (web) and `BUILD_ORDER.md` (iOS); this is the cross-surface ledger.

**Web has, iOS needs:**

- Full **class builder / choreography** (timeline, cues, moves, intensity, sections, trim/beat-snap)
- **Multi-provider track search** (SoundCloud / Spotify / Apple Music) + provider connect
- **Library** of saved/liked tracks
- **Explore** feed
- **Sharing / teams** UI

**iOS has, web needs:**

- Full **live-run** experience — cue prompter, HUD, interval timers, rhythm signature, virtual clock
  driving off `run-payload`. (Web answer: full live-run, **not** presenter-only — D18. A laptop/tablet
  at the front of the room, including iPad and Android tablets the iPhone-only app can't serve.)

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
