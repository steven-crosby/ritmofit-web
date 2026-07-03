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

**Current sequence (2026-07-02):** the web launch gate is green and deployed; the active web track is
the provider-authorized playback initiative (`provider-playback-implementation.md`), with the iOS
wrap-up queued behind it. iOS gaps remain tracked here, and web work that increases iOS debt —
including the playback initiative — must add or update a linked backlog item before merge.

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
| **Data** | Versioned **`GET /classes/:id/run-payload`** + the rest of the REST surface; shared Zod types in `packages/shared`; `apps/api/openapi/openapi.json` is generated and **drift-gated** in web CI. A vendored iOS run-payload snapshot is also checked for additive field drift. | ✅ within web; iOS type/nullability/enum review remains manual |
| **Design** | `ritmofit_design_system/tokens.json` is the platform-agnostic source of truth. Web token CSS and the in-repo generated `ritmofit_design_system/ios/RFTokens.swift` are drift-gated by the web "Design system verify" CI step. The separate iOS repo's vendored token copy is not yet cross-repo gated. | ⚠️ partial |
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
  `Move.bar`. Last verified during Session 9 on 2026-06-29: OpenAPI regenerated cleanly (`42 schemas,
  44 paths`) and `pnpm --filter @ritmofit/api contract-parity` reported no untracked drift.
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
  - Spotify per-user OAuth connect (web, 2026-06-29): web now wires the Spotify account-connect flow
    (Authorization Code + PKCE, scope `user-library-read`) behind the same `music_connections` /
    encrypted-token / disconnect-purge machinery as SoundCloud; `providerCapabilities.spotify` flips
    `userConnect`/`userLikes` to `true`, so "search my Spotify" (saved tracks via `GET /me/tracks`) goes
    live. **iOS parity follow-up:** iOS should add the Spotify connect flow via
    `ASWebAuthenticationSession` (server endpoints `POST /providers/spotify/connect` +
    `GET /providers/spotify/callback` are provider-agnostic and already serve it) and surface the
    connected provider in its Connections UI + likes search. No contract change (the connect/likes routes
    and the capability matrix are shared).
  - Apple Music per-user connect (web, 2026-06-29): web wires Apple Music account-connect via **MusicKit
    JS** (no redirect OAuth — the browser mints a Music-User-Token the SPA posts to
    `POST /providers/apple_music/connection`; `GET /providers/apple_music/config` serves the developer
    token MusicKit needs). `providerCapabilities.apple_music` flips `userConnect`/`userLikes` to `true`;
    "search my Apple Music" reads the user's library via `GET /me/library/songs` (developer token +
    Music-User-Token). With this, **all three providers are connect-capable on web.** **iOS parity
    follow-up:** iOS should connect Apple Music through **native MusicKit** (`MusicAuthorization` /
    `MusicKit` framework) rather than MusicKit JS, storing the resulting user token via the same
    `POST /providers/apple_music/connection` endpoint (shared, no contract change), and surface it in its
    Connections UI + likes search. The web MusicKit-JS browser handshake itself is verified live, not in
    CI.
- **Provider-authorized playback in Live Mode and Builder preview** (planned web feature; see
  `provider-playback-implementation.md`): web will replace provider handoff as the primary path with a
  single RitmoFit player UI backed by provider-specific adapters for SoundCloud, Spotify, and Apple
  Music. Live Mode owns the class timeline, supports mixed-provider classes, preflights every track
  before class start, auto-advances without instructor action, and uses `clipStartMs` + effective
  `track.durationMs` as each provider playback window. **iOS parity follow-up:** iOS needs equivalent
  native/provider-authorized playback control, preflight, mixed-provider track selection, auto-advance,
  and Builder range preview. Platform APIs may differ, but capability cannot be omitted without a
  tracked documented exception. Potential native paths: MusicKit for Apple Music, Spotify SDK/App Remote
  where allowed, and a SoundCloud provider-approved path. **Open question (flagged 2026-07-02):**
  SoundCloud has no native-iOS equivalent of the web Widget API; if no provider-approved native path
  exists, SoundCloud playback on iOS becomes a **Documented exception** below (handoff-only on iOS)
  rather than a silent gap — decide before the iOS playback slice starts.
- **Library** of saved/liked tracks
  - Library-card summary (web Session 3): `GET /classes` now returns additive per-class card
    aggregates (`trackCount`, `totalDurationMs`, `albumArtUrls`) via the new `ClassListItem` shape, and
    the web rail renders a track-art collage, track count, total runtime, last-opened date, a duplicate
    ("save a copy") action, and a create-class template chooser. iOS should surface the same card
    summary + duplicate/create affordances when its Library lands. Contract change is additive (existing
    iOS decoding is unaffected).
    - Visual tightening (Studio redesign slice 3): rail cards now lead with class-shape summary
      (template first) + track count/runtime, bounded collage; Copy/View demoted to quiet footer
      actions (primary affordance remains opening the row). Presentation only. iOS library cards
      should adopt equivalent music-forward hierarchy + action quieting when the surface lands.
      See `agent-reports/studio-redesign-prescription.md` #3. No contract change.
  - Class-detail read mode (web Session 4): a read-only class view (songs + placed moves + cues + section
    bands, from the run-payload) reachable from a Library card "View" action, with "Open in builder".
    iOS should offer the same at-a-glance read view. No contract change (reuses `GET /run-payload`).
  - Songs-by-Move "Start a class" (web Session 4): a Songs-by-Move result can seed a new class from a
    choreographed song via the existing copy-class-track route. iOS should add the same class-starting
    action when Songs-by-Move lands. No contract change.
- **Explore** feed
  - Dialog loading/empty-state polish (web — Studio redesign slice 4, see
    `agent-reports/studio-redesign-prescription.md` #4): Explore, Connections, Teams, and
    Songs-by-Move now use compact state headers, surface-specific copy, and static structured
    placeholders (class cards, provider rows, team/member rows, move rows) instead of generic
    "Loading…" text. iOS should mirror this state-language pattern when these supporting dialogs land.
    Presentation only — no schema/API/provider/deploy impact and no contract change.
- **Sharing / teams** UI
- **Account/profile settings** (web Session 5 follow-up): web now has an Account dialog backed by
  `GET /auth/me` + additive `PATCH /auth/me` for `displayName` and `imageUrl`, with sign-out still
  available. iOS should add the same profile-view/edit surface when its account/settings surface lands.
- **Live Mode energy-arc indicator** (web Session 6): the live prompter now shows a compact
  current-section band under the header (icon + tint + label, never color alone) with a muted countdown
  to the next section, derived from the run-payload `sections[]`. It is view-independent (Cue-by-Cue and
  Full List) and hidden when a class has no sections. iOS live mode should surface the same
  current-section indicator. No contract change (reuses `GET /run-payload` `sections`).
- **Live Mode performance re-stage** (web — Studio redesign slice 1, see
  `agent-reports/studio-redesign-prescription.md` #1): the Cue-by-Cue prompter moved from a small
  centered card to a split performance layout — a large focal current cue on the left, with next cue,
  BPM/effort, track/class timers, and provider handoff as a right-side instrument rail (stacked on
  narrow widths, current cue first and large). The single sanctioned beat-pulse now rides the BPM
  numeral; the All-Out drop and reduced-motion contract are unchanged. iOS live mode should mirror this
  glanceable hierarchy (huge current cue + BPM/effort/timers as the instrument). Presentation only — no
  contract change (same `GET /run-payload`).
- **Builder energy-arc workbench** (web — Studio redesign slice 2, see
  `agent-reports/studio-redesign-prescription.md` #2): the energy arc, timeline, and segment band were
  three stacked strips; they now form one "Class shape" workbench — the arc scaled up (~64→~128px) as
  the hero, with the timeline blocks/markers riding directly beneath it on one shared time axis (each
  block under its crest) and reduced card fragmentation. The arc stays static (no animation), height +
  label + grayscale encoding intact, plasma only at the all-out crest. iOS builder should mirror the
  class-shape workbench (arc as the central instrument) when its builder surface lands. Presentation
  only — derived from the existing run-payload, no contract change.
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
