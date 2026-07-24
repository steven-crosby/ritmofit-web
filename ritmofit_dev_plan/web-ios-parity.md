# Web ↔ iOS Surface Parity (Paused)

> **Current status (2026-07-05):** decision [`decisions.md`](./decisions.md) **D20** supersedes D18 as
> the active product gate. Web is the product-definition surface now; iOS follows later after the solo
> creator loop is proven. Keep this doc for contract/design sync context and historical backlog, but do
> not use it to block current web work or to reopen Explore/sharing/teams.

## The current principle

Ritmo Studio is solo-first and web-first for the current product-definition pass. The web app is where
the individual instructor loop is being dialed in: class idea, music selection, choreography,
organization, rehearsal, and Live Mode. The iOS app remains a future/native client of the same backend,
but parity is not a current merge gate.

## The former hard gate is paused

The old D18 rule said: no feature merges on one surface without the same capability landing on the other
or a tracked parity item. That rule is paused by D20. Current web work should document contract or design
implications when relevant, but it does **not** need an iOS parity item before merge.

**Current sequence (2026-07-05):** the web launch gate is green and deployed. The active track is solo
creator refinement plus the provider-authorized playback initiative
(`provider-playback-implementation.md`) where it improves rehearsal and Live Mode. iOS wrap-up is
deferred behind this web product-definition work.

In practice, for current web PRs:

1. State contract, schema, migration, provider, and design-system impact when relevant.
2. Do not add iOS parity bookkeeping unless the owner explicitly asks for an iOS handoff/refinement
   slice.
3. Do not build or expand deferred community surfaces: Teams, Sharing, Publish, Explore, invites,
   collaborators, public class pages, social discovery, marketplace/community browse, or share links.

## Sync points (what keeps the two honest)

| Layer | Mechanism | Enforced? |
|---|---|---|
| **Data** | Versioned **`GET /classes/:id/run-payload`** + the rest of the REST surface; shared Zod types in `packages/shared`; `apps/api/openapi/openapi.json` is generated and **drift-gated** in web CI. A vendored iOS run-payload snapshot is checked for field drift, and iOS CI compares both repositories directly. | ✅ automated field parity; type/nullability/enum review remains manual |
| **Design** | `ritmofit_design_system/tokens.json` is the platform-agnostic source of truth. Web token CSS and generated Swift are drift-gated in web CI; iOS CI compares its vendored tokens and generated Swift against current web canon. | ✅ cross-repo gated |
| **Capability** | D20 solo-first/web-first direction now controls current product planning; this doc is historical context. | Paused as a gate |

### Known seam gaps (process debt to close)

- **Run-payload DTO drift is now gated** (was: "no cross-repo drift check" for the contract). The CI
  step **"iOS contract parity (run-payload DTO drift)"** (`pnpm --filter @ritmofit/api contract-parity`,
  `apps/api/scripts/check-contract-parity.ts`) compares the field sets the OpenAPI spec advertises
  against the fields the vendored `ios-snapshot/Core/Models/RunPayload.swift` DTOs decode. A *new* drift
  in either direction fails CI; a temporary, explicitly accepted additive lag can be tracked in the script's allowlist
  (`apps/api/src/lib/contract-parity.ts` → `CONTRACT_PARITY_ALLOWLIST`). Field-name presence only —
  type/nullability/enum drift stays the job of the manual `agent-prompts/remote-prompts/technical/api-contract-parity.md`
  pass. **Currently allowlisted: none.** Phase 0 added `timelineMode`; RPM/hold and clip/beat anchors;
  move beat/bar; and stable section IDs to the iOS DTO. Verified 2026-07-24 against the current
  generated spec: **54 schemas · 55 paths**.
- **Cross-repo drift is now gated from iOS CI.** The iOS check compares its vendored OpenAPI/docs,
  design tokens, generated `RFTokens.swift`, and the web repo's vendored contract-facing Swift snapshot
  against the two checked-out repositories. Web remains authoritative; the check makes an overdue
  refresh fail visibly instead of depending on a manual reminder.

## Historical / Paused Parity Backlog

Capability-level, both directions. This ledger is **not** the current implementation queue under D20.
Keep it as historical context for later iOS refinement and contract/design sync.

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
  - Class readiness panel (web, 2026-07-03): the builder header derives a four-dimension readiness model
    from the run-payload — duration (the one hard run gate), tempo/BPM (beat pulse), cues & moves, and
    provider/music link — and surfaces it as glyph + word + severity with click-to-fix track chips
    (`apps/web/src/lib/readiness.ts`, `ClassReadinessSummary.tsx`; design system `09-class-builder-guidelines.md`
    §Readiness). No contract change — every input is already in the run-payload. iOS should show the same
    pre-Live readiness (duration/tempo/cues-moves/music) in its builder header when the surface lands.
- **Multi-provider track search** (SoundCloud / Spotify / Apple Music) + provider connect
  - Spotify per-user OAuth connect (web, 2026-06-29): web now wires the Spotify account-connect flow
    (confidential Authorization Code, scope `user-library-read`) behind the same `music_connections` /
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
- **Provider-authorized playback in Live Mode and Builder preview** (✅ **web complete as of 2026-07-06**; iOS parity follow-up still open — see below): web replaced provider handoff as the primary path with a
  single Ritmo Studio player UI backed by provider-specific adapters for SoundCloud, Spotify, and Apple
  Music. All three adapters are built, registered, and live-verified on prod (SoundCloud Worker `5072dd3b`,
  Apple Music Worker `cbea9f69`, Spotify Worker `b99ac98d`). Live Mode owns the class timeline, supports
  mixed-provider classes, preflights every track before class start, and auto-advances without instructor
  action. Builder preview is wired (`TrackPreview.tsx` — manual, single-track, clip-window, no auto-advance).
  See `provider-playback-implementation.md`.
  **iOS parity follow-up (still open):** iOS needs equivalent native/provider-authorized playback
  control, preflight, mixed-provider track selection, auto-advance, and Builder range preview. Platform
  APIs may differ, but capability cannot be omitted without a tracked documented exception. Potential
  native paths: MusicKit for Apple Music, Spotify SDK/App Remote where allowed, and a SoundCloud
  provider-approved path. **Open question (flagged 2026-07-02):** SoundCloud has no known native-iOS
  equivalent of the web Widget API; if no provider-approved native path exists, SoundCloud playback on
  iOS becomes a **Documented exception** (handoff-only on iOS) rather than a silent gap — decide before
  the iOS playback slice starts.
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
- **Explore** feed **(deferred community surface under D20)**
  - Dialog loading/empty-state polish (web — Studio redesign slice 4, see
    `agent-reports/studio-redesign-prescription.md` #4): Explore, Connections, Teams, and
    Songs-by-Move now use compact state headers, surface-specific copy, and static structured
    placeholders (class cards, provider rows, team/member rows, move rows) instead of generic
    "Loading…" text. iOS should mirror this state-language pattern when these supporting dialogs land.
    Presentation only — no schema/API/provider/deploy impact and no contract change.
- **Sharing / teams** UI **(deferred community surface under D20)**
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
**iOS has, web needs:**

- No current capability-level backlog item. The prior full **live-run** gap is closed on web:
  `LiveMode` now provides the cue prompter, virtual clock, interval timers, intensity readouts, and
  provider handoff from `run-payload`. Future web live work should be framed as enhancement
  (for example, second-screen presentation), not as closing the core parity gap.

## Documented exceptions (historical)

These were allowed divergences under D18. Under D20, web-first product definition is already allowed;
keep this list only for later iOS refinement context.

- **iOS-only:** haptics; lock-screen / Now-Playing integration; motion/ambient sensing.
- **Web-leaning enhancement:** second-screen "presentation/cast" view (laptop → external display / TV),
  layered on top of full live-run — additive, never a reason to limit web's live capability.
- **UX is platform-idiomatic, not unified:** same capabilities, native patterns per platform (iOS tab
  bar + gestures vs. web sidebar + keyboard). See `08-ios-web-alignment.md` › "expresses differently."

## Open follow-on (not gating)

**iPad as a first-class iOS target.** The principle currently leans on web to cover iPad (the iOS app is
iPhone-only). A deliberate decision later — revisit when iPad usage is evidenced.
