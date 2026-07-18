# Implementation brief 03 — Builder + Timeline

## Role

Act as the SPA Builder and track-scoring implementer. Make repeated add/select/score work local while
preserving the airy workstation and the class-shape signature.

## Authority

Gate C authorizes `P0-02`, `P0-03`, `P1-03`, `P1-05`, `P1-06`, and `P1-10`. P0-03 is explicitly the
bottom-sheet mobile direction. Consume foundation and Music work; do not alter readiness vocabulary or
Live behavior owned by batch 5. This is commit batch 3 in the single draft PR.

## Backlog IDs

- `P0-02` — Keep Add track in reach on mobile
- `P0-03` — Bring selected-track scoring to the selected row on mobile
- `P1-03` — Recompose the class header around building
- `P1-05` — Give class shape clear compositional ownership
- `P1-06` — Turn Inspector Essentials into a scoring flow
- `P1-10` — Add high-frequency desktop authoring shortcuts

## User outcomes

- Add another track without scrolling past the full class document.
- Select Track 4 and immediately edit intensity, BPM, clip, cue, or move without losing context.
- Read the class shape first, while administration and destruction recede.
- Author common actions from the keyboard without stealing focus from form fields.

## Mockup references

- `../mockups/polish-preview.html#builder`
- P0-03 comparison in the same section; implement **A · Bottom sheet** only.
- `../mockups/polish-preview-notes.md`

Match the local loop, selected-row context, class-shape hierarchy, and Essentials order. Do not copy the
audit frame, invent a DAW, or implement the rejected inline/full-screen variants.

## Files to inspect / likely edit

- `apps/web/src/components/Dashboard.tsx`
  - `ClassWorkspace`
  - `ClassHeaderCard`
  - `TrackInspector`
- `apps/web/src/components/ClassReadinessSummary.tsx` only for layout integration, not vocabulary changes
- `apps/web/src/components/ReorderableTrackList.test.tsx` and the list implementation in `Dashboard.tsx`
- `apps/web/src/components/IntensityRibbon.tsx`
- `apps/web/src/components/TimelineStrip.tsx`
- `apps/web/src/components/SegmentBand.tsx`
- `apps/web/src/components/ChoreographyEditor.tsx`
- `apps/web/src/components/CuesSection.tsx`
- `apps/web/src/components/MovesSection.tsx`
- `apps/web/src/components/TrackPreview.tsx`
- `apps/web/src/lib/reorder.ts`
- Corresponding component and render tests

## Out of scope

- Readiness semantics and no-cue Live behavior (batch 5).
- Provider selection internals (batch 2), class library (batch 4), Account/Login (batch 6).
- Dense DAW layout, waveform, mixer, crossfade, or audio manipulation.
- Schema, API, migration, shell, community, or audience Live work.

## Implementation steps

1. Recompose `ClassHeaderCard` so class identity, template/summary, class shape, Add track, and Live action
   lead; move Delete into a confirmed overflow/settings path.
2. Add a persistent/local mobile Add track entry that opens the existing discovery flow and returns to the
   previous class/track decision point after Add.
3. Make selected track state explicit and stable across add/reorder/edit operations.
4. Present the selected track's Essentials in a mobile bottom sheet with track identity visible, explicit
   Close/Done, focus trap, Escape support, and focus return to the selected row.
5. Order Essentials as intensity, BPM, clip, one-tap cue, then moves; place long-tail fields under Advanced
   and separate Remove track.
6. Strengthen class-shape composition through spacing/fill hierarchy; preserve honest auto/provisional
   labels and readable segment names.
7. Add documented shortcuts for previous/next track, preview play/pause, cue at current time, and Add track.
   Ignore shortcuts while focus is in text entry, select, dialog-conflicting, or content-editable contexts.
8. Verify long titles, reorder, sheet dismissal, unsaved edits, focus return, and 390×844 scroll position.

## Tests and checks

```bash
pnpm --filter @ritmofit/web test \
  src/components/Dashboard.test.tsx \
  src/components/ClassHeaderCard.test.tsx \
  src/components/ReorderableTrackList.test.tsx \
  src/components/IntensityRibbon.render.test.tsx \
  src/components/TimelineStrip.test.tsx \
  src/components/SegmentBand.test.tsx \
  src/components/TrackPreview.test.tsx \
  src/components/CuesSection.test.tsx \
  src/components/MovesSection.test.tsx
pnpm --filter @ritmofit/web typecheck
pnpm --filter @ritmofit/web build
pnpm format:check
pnpm lint
```

Manual: desktop authoring shortcuts, 390×844 add → return → select Track 4 → open bottom sheet → edit →
close, 320px, 200% zoom, keyboard-only, and reduced motion.

## Acceptance criteria

- At 390×844, Add track is available from the Builder header/local sticky control without a long scroll.
- After Add, the instructor returns to the same class context with the added row identifiable.
- Selecting Track 4 reaches Essentials with one local action; closing returns focus to Track 4.
- Bottom sheet traps focus, supports Escape/Close/Done, and does not obscure the selected identity.
- Class shape wins the squint test; auto state remains labeled; segment text stays legible.
- Intensity, BPM, clip, and cue are first; Remove track is not a peer action.
- Shortcuts work outside form fields and never fire while typing.

## Suggested PR / branch

- Extracted PR title if needed: `feat(web): localize the Builder scoring loop`
- Extracted branch if needed: `polish/builder-scoring-loop`
- Current approved delivery: commit batch 3 on `polishv3/design-audit-mockups`.

## Stop / handoff

Report the selected-track state owner, sheet focus contract, Add-return behavior, shortcut map, and visual
evidence at desktop/390/320. Do not merge or deploy.

## Global constraints

- Keep the current Classes / Music / Live / Account shell; no IA redesign.
- Success ranking: build speed > gorgeous > Live pride.
- Builder stays airy and consumer-music scannable; Live remains 80% safety/glanceability and 20% swagger.
- Never cache provider audio or provider-derived analysis; never obtain BPM from Spotify; never download,
  proxy, mix, crossfade, decode, analyze, or derive provider audio. Playback uses official provider paths.
- Prefer small diffs. When tokens change, update design-system guidance and regenerate iOS tokens when the
  package workflow requires it.
- Do not merge or deploy without separate owner authorization.
