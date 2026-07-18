# Full polish direction preview notes

Run: `2026-07-18-polish`

Branch: `polishv3/design-audit-mockups`

Gate: stop for owner Gate B after this preview is committed and pushed

## 1. Owner-flagged backlog IDs expressed

Owner override covers the complete ranked backlog:

- P0: `P0-01` through `P0-08`
- P1: `P1-01` through `P1-11`
- P2: `P2-01` through `P2-04`

The HTML groups those items into six product suites rather than presenting 23 disconnected component
cards: Music, Builder, Classes, Live, Trust/Account, and System polish. A coverage map at the bottom of
the preview makes every backlog ID auditable.

## 2. What changed versus the current UI direction

- Music selection happens before import. Nothing is preselected; preview and selection are distinct;
  selected count and total duration are visible before committing.
- Add track remains local on mobile, and scoring remains attached to the selected track rather than the
  bottom of the full Builder document.
- Class shape visually owns Builder composition. Resting chrome is quieter, destructive actions recede,
  and essential scoring fields lead.
- Readiness separates **Can start**, **Music checked**, and **Class complete**.
- No-cue Live leads with track identity, section, and effort. Missing choreography is secondary truth,
  not the hero instruction.
- Classes opens on continuation and music-first entry rather than an empty resting canvas.
- Music connection truth appears once per context, with the detailed management surface remaining the
  action authority.
- Login uses specific invite/provider trust language. Account facts no longer masquerade as preferences.
- Resting depth uses stepped fills and selective borders. Motion confirms meaningful work; expressive
  glow remains reserved for the drop.
- Essential mobile controls demonstrate a 44px floor, plus explicit 320px and 200% zoom directions.

## 3. Screens and states shown

1. Apple Music Likes at desktop and 390px with four selected tracks and one candidate previewing.
2. Playlist detail with an unknown upstream track count represented honestly.
3. Loading, empty, retry, and reconnect state grammar.
4. Desktop Builder with class shape, layered readiness, local Add track, track list, Essentials, and
   keyboard shortcuts.
5. Mobile Builder with persistent/local Add track and selected-track context.
6. Three mobile scoring alternatives: bottom sheet, inline expansion, and focused full-screen editor.
7. Classes continuation surface and revised class cards at desktop and 390px.
8. Live queue, provider preflight, and active no-cue run at desktop and 390px.
9. Login trust state at desktop and 390px.
10. Account facts/settings and compact connection summary at desktop and 390px.
11. Depth roles, meaningful motion roles, 44px target direction, 320px layout, and 200% zoom reflow.

## 4. Intentionally excluded

- No production React, API, shared-contract, schema, migration, or design-token source changes.
- No shell destination or IA replacement.
- No Explore, Teams, sharing, community, public pages, audience-room mode, pricing, or marketing redesign.
- No provider audio caching, proxying, decoding, analysis, mixing, crossfade, or Spotify-derived BPM.
- No decorative Latin styling, tropical palette, nightclub gradient system, or dense DAW treatment.
- No implication that cues, BPM, or moves become hard Live gates.

## 5. What the owner should inspect first

1. Whether the Music selection tray makes the exact import set obvious without adding table density.
2. Which mobile scoring alternative best balances local context and room to choreograph.
3. Whether the three readiness terms are distinct and natural across Builder, preflight, and Live.
4. Whether the no-cue Live state feels useful and confident without inventing choreography.
5. Whether the quieter depth model and stronger class-shape hierarchy still feel like Ritmo Studio.

## 6. Known limitations

- This is a static HTML/CSS direction artifact with fake data, not production behavior.
- Preview buttons and selection rows are illustrative; only row selection and the scoring comparison tabs
  have minimal interaction.
- Provider playback, focus return, keyboard shortcuts, state transitions, motion timing, responsive
  regression tests, and reduced-motion behavior require production implementation and tests after Gate B.
- The desktop frames are composition targets shown inside the audit gallery, not pixel-for-pixel 1280px
  production screenshots.
- The 200% example demonstrates reflow intent; it is not a substitute for a real browser zoom audit.

## 7. Approval questions

1. Music selection: approve nothing-selected-by-default plus the sticky selection tray?
2. Mobile scoring: approve bottom sheet, inline expansion, focused full-screen editor, or request a hybrid?
3. Readiness: approve **Can start**, **Music checked**, and **Class complete** as the product vocabulary?
4. Incomplete Live: approve track + section/effort as the lead state and creative incompleteness as
   secondary?
5. Builder hierarchy: approve class shape above the repeated track/scoring loop?
6. Classes: approve continuation + start-from-music as the resting surface?
7. Music/Account: approve one compact status summary plus one detailed connection authority?
8. System: approve no resting shadows, the 44px floor, and expressive motion reserved for meaningful
   build confirmation and the drop?

## 8. What must be revised before implementation

Record Gate B in `../owner-decisions.md`, including:

- approve/revise/drop for each of the six suites;
- the selected mobile scoring pattern;
- any copy changes to readiness or Live;
- any backlog items dropped or narrowed;
- the ordered implementation set and token-change allowance only at Gate C.

No implementation begins, and no PR is opened, until the matching owner gate is complete. Per owner
instruction, later approved implementation will remain on this branch and may be committed and pushed,
but it will still stop before PR creation.
