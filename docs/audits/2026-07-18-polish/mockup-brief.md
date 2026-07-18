# P0 direction mockup brief

Run: `2026-07-18-polish`

Gate: owner approval required before producing mockups

Mockups are recommended for four P0 direction questions only. They must preserve the current
Classes / Music / Live / Account shell and may not become a redesign program.

## Items

- **P0-01 — Select music before creating or adding**
- **P0-02 — Keep Add track in reach on mobile**
- **P0-03 — Bring selected-track scoring to the selected row on mobile**
- **P0-05 — Design an affirmative Live state for no-cue classes**

P0-02 and P0-03 should be reviewed as one continuous mobile Builder sequence, not two unrelated screens.

## Mockup set A — Music selection

Show:

1. Desktop Apple Music Likes with 200 tracks, none selected.
2. Desktop state with 4 selected, one candidate previewing, and a selection tray offering **Start class**
   and **Add selected**.
3. Mobile 390×844 state with the same 4-track selection and sticky tray.
4. Playlist detail with an unknown source count handled honestly and individual rows selectable.

Success:

- Title/artist/duration/provider lead; art stays bounded.
- Candidate preview, selection, and Add/Start actions are distinct and keyboard/touch clear.
- The instructor can understand the exact import set and total duration before committing.
- Large libraries remain searchable without turning the surface into a dense data table.

## Mockup set B — Mobile Builder loop

Show at 390×844:

1. Builder header with class identity, truthful readiness summary, and a persistent/local **Add track**
   entry without a dominant Delete action.
2. Search open with one candidate previewing and Add available.
3. Return state after Add, preserving the class/track context.
4. Track 4 selected with three alternatives for owner comparison:
   - bottom sheet Essentials editor,
   - inline expansion below the selected row,
   - focused full-screen track editor with explicit return.

Success:

- Find → audition → add → select → intensity/BPM/cue takes no memory-dependent long scroll.
- The class-shape signature remains visible or one local action away.
- Focus return and selected context are unambiguous.
- Controls meet 44px targets and long titles do not collapse the action hierarchy.

## Mockup set C — Incomplete Live

Show desktop + 390×844 for a duration-valid class with music references but no BPM, cues, or moves:

1. Live queue card using the approved readiness vocabulary.
2. Provider preflight separating **Music checked** from creative completeness.
3. Active Cue-by-Cue view where track/section/effort leads and missing choreography is secondary.

Success:

- No surface calls the class globally ready when it only passes the duration or provider gate.
- “No cue set” is never the hero.
- Active Live still feels useful and confident without inventing choreography.
- 80% glanceability/safety remains dominant; swagger comes from scale, class shape, and restraint.

## Visual constraints

- Use the current espresso/bone/copper/cyan token system. Do not solve workflow with a palette change.
- Preserve the energy ribbon as the signature planning artifact.
- Keep Builder airier and music-consumer scannable; do not introduce DAW density.
- Keep Live dark, high-contrast, and transport-stable.
- Use one depth strategy per surface; reduce resting border/shadow accumulation.
- Show desktop at 1280×800 and mobile at 390×844.

## Explicit exclusions

- No new shell navigation or destination.
- No Teams, Explore, sharing, community, public pages, marketing, pricing, or audience display.
- No full-app clone.
- No schema concepts implied by visuals.
- No cached/proxied/decoded provider audio, waveform analysis, mixer, crossfade, or Spotify BPM.
- No decorative Latin styling or generic nightclub gradients.
- No mockups for copy-only, target-size, state-consistency, Login, Account, or token cleanup items.

## Review decision required

For each set, owner records **approve**, **revise**, or **drop to smaller polish** in
`owner-decisions.md`. Mockup generation does not authorize implementation.
