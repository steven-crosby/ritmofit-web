# RitmoFit — Web mockups

High-fidelity, **static HTML mockups** of the RitmoFit web app (the planning surface). Every value
traces to [`ritmofit_design_system/tokens.json`](../ritmofit_design_system/tokens.json) and the design
docs — these are visual design references, not the production React app in [`apps/web`](../apps/web).

## View them

Open [`index.html`](./index.html) in a browser (no build step). A floating bar at the bottom of every
page links across all screens. Best in a Chromium/WebKit browser for `backdrop-filter` glass and
Material Symbols.

## Screens

| File | Screen | Notes |
|---|---|---|
| `index.html` | Gallery | Entry point + design-channel legend |
| `login.html` | Sign in | Email / Apple / Google (Better Auth); brand showcase |
| `dashboard.html` | Your classes | Class library w/ energy-ribbon thumbnails, filters, empty state |
| `class-builder.html` | **Class builder** | The heart: energy ribbon → timeline → track list → selected-track detail editor |
| `search.html` | Add track | SoundCloud provider search, manual entry, mock-catalog fallback |
| `connections.html` | Music providers | Connected / action-needed / not-connected OAuth states |
| `live.html` | Live mode HUD | M3 preview — on-beat pulse + the All-Out "drop" (interactive) |

## Design-system fidelity

- **Channels, not hues:** copper = identity, cyan = the only "tap me", plasma = peak energy (~1%), ember = hot/destructive.
- **Numbers carry the brand:** BPM and timecodes are set in Martian Mono (tabular).
- **The class has a shape:** the energy-arc ribbon is derived from `class_tracks.intensity` + position — no new schema.
- **The pulse is rationed:** the on-beat `--rf-beat` animation appears only on the Live HUD and the
  currently-playing track, and is suppressed under `prefers-reduced-motion` (toggle on the Live page).
- **Redundant encoding:** intensity always shows zone number + bar count + label, never color alone.

Interactive bits (vanilla JS, no dependencies): Live tempo slider, the All-Out drop, reduce-motion
toggle, the builder's save-confirm and zone picker.
