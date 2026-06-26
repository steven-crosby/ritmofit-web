# Mockup-Parity Backlog

> **Created 2026-06-24 (Claude).** Source: the mockups-vs-production gap audit (method:
> mockup-intent extraction from [`../ritmofit_design_system/mockups/`](../ritmofit_design_system/mockups/)
> → prod code read, `prod == main` → live crawl of `ritmofit.studio` → visual overlay). This is a
> **forward-looking planning doc** — when an item ships, move its dated completion line to
> [`HISTORY.md`](./HISTORY.md) and delete it here. The four scope-gating decisions were resolved
> 2026-06-24 and folded in below (see [`decisions.md`](./decisions.md) D14–D17).

## Headline

The design-system deploy (v4.1, 2026-06-23) landed cleanly — mockups and prod share the same visual
language (espresso/copper/plasma palette, card surfaces, Sora/Bricolage/Azeret fonts). The gaps below
are **features, whole surfaces, terminology, and HUD richness — not styling.**

**Not gaps (prod is *ahead* of the mockups):** the track inspector ships trim window, downbeat /
beat-snapping, BPM lookup, and free-vs-back-to-back timeline modes — none of which appear in
`builder.html`. The core builder, Live prompter, and Teams are solid.

Effort legend: **XS** ≈ <½ day · **S** ≈ ~1 day · **M** ≈ few days · **L** ≈ multi-day / backend.

## High impact

| # | Item | Gap vs mockup | Effort | Evidence |
|---|---|---|---|---|
| H1 | **Spotify + Apple Music user-connect** | Only SoundCloud has per-user OAuth; the other two are "Sign-in not yet supported" (catalog search only). Adapters exist behind the mock (M2 S6) — needs live creds + the connect flow surfaced. | L | Connections dialog; `apps/api` `packages/music` adapters |
| H2 | **Saved-tracks Library surface** | No standalone, browsable saved/liked-tracks library (provider filter, sort, "Add to class"). "My likes" exists only as a transient mode inside a class's add-track box, SoundCloud only. | L | `library.html` unbuilt; no Library nav; `TrackSearch.tsx` likes-mode |
| H3 | **Share-card export + public share link** | `ShareDialog` is access-control only (invite by email/team + permissions). No exportable visual card (energy-shape artifact) and no public "Copy share link". | M | `share-card.html` unbuilt; `ShareDialog.tsx` has no card/link |

## Medium

| # | Item | Gap vs mockup | Effort | Evidence |
|---|---|---|---|---|
| M1 | ✅ **Fixed — pending deploy.** Intensity vocabulary + segmented control | Zone vocab (D17): `INTENSITY_LABEL` relabeled None/Build/Push/Attack/All Out (display-only, no migration) — flows to the readout, energy-arc summary, Songs-by-Move, and the move dropdowns. New accessible `IntensitySegmentedControl` (radio-based; "Z_n_ · word"; bars==zone) replaces the raw-enum dropdown in the **track** inspector + manual-add. **Follow-up:** the two ChoreographyEditor **move-intensity** dropdowns stay as (relabeled) selects — they're optional/unset + sit in compact rows; converting them needs an "unset" segment. | S–M | `IntensitySegmentedControl.tsx`; `IntensityReadout.tsx`; `Dashboard.tsx` |
| M2 | **Move library surface** | Global seed + per-track picker + custom-move CRUD exist, but no standalone library with sources / template filter / sort / per-move "More options". Related to existing backlog "Songs by Move / track tagging". | M | `moves.html` unbuilt; `CustomMovesDialog.tsx` is CRUD-only |
| M3 | **Explore sort + format filter** | Explore is a modal list with no sort and no class-format filter. **Overlaps existing backlog "Explore Feed UI"** (categorized/curated lists) — fold together. | S–M | `explore.html`; `ExploreDialog.tsx` |
| M4 | **Live HUD richness** | Mockup HUD has a giant BPM numeral, zone+bars in the NOW card, current move name + "X counts to release", a "NEXT CUE IN 0:18" countdown, "Track X of N", and a prominent draggable seek slider. Prod ships a leaner version of each. | M | `live.html`; `LiveMode.tsx` |
| M5 | **Login social sign-in** | No "Continue with Apple / Google" (email/pw only). Frontend is small but **gated on backend Apple/Google enablement** (Apple deferred per iOS notes). | S (+backend) | `Login.tsx`; mockup `login.html` |
| M6 | **RPM (cadence) + Holds per track** | ✅ **Decided (D14): build it.** Manual per-track **RPM**, kept distinct from BPM; surfaced on track rows + Live HUD. **Holds** = derived count of hold-type moves *or* a manual count — settle in design first. New schema field(s) + builder/Live UI + run-payload addition. | M | `builder.html` "118 RPM · 3 Holds"; D14 |
| M7 | **Public marketing landing** | ✅ **Decided (D15): build it** at `/`, sign-in secondary. Pre-render/serve as static (don't adopt SSR/Next; cf. D3). Expands `App.tsx` routing + signed-out gate. | M | `marketing.html` unbuilt; D15 |

## Polish (cheap, high ROI)

| # | Item | Gap | Effort | Evidence |
|---|---|---|---|---|
| P3 | **Builder header polish** | No cue/move counts (mockup: "4 cues · 5 moves"), no visible energy-shape description (aria only), no inline provider-connected chips. | S | `ClassHeaderCard` in `Dashboard.tsx`; `builder.html` |
| P4 | **Save-status indicator** | ✅ **Decided (D16): keep auto-save + add a subtle saving/saved indicator** (not staged Save/Discard). Needs one global save-status signal the per-field writes feed. | S | `builder-states.html`; `Dashboard.tsx` write paths; D16 |

## Decisions — resolved 2026-06-24

The four scope-gating questions are settled; rationale in [`decisions.md`](./decisions.md):

| ID | Question | Resolution |
|---|---|---|
| D14 | RPM/cadence + Holds per track | **Build** (→ M6) |
| D15 | Public marketing landing page | **Build full page** (→ M7) |
| D16 | Save model | **Auto-save + status indicator** (→ P4) |
| D17 | Intensity vocabulary | **Zone words: Build/Push/Attack/All Out** (→ M1) |
