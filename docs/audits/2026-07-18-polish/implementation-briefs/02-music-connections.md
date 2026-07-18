# Implementation brief 02 — Music + Connections

## Role

Act as the SPA Music and connection-truth implementer. Build the select → audition → commit flow across
Likes, playlists, and search while keeping provider capability honest.

## Authority

Gate C authorizes `P0-01`, `P0-06`, `P0-07`, `P1-04`, `P1-09`, and `P2-02`. Consume batch 1 primitives;
do not redesign Builder, Account, provider APIs, or playback architecture. This is commit batch 2 in the
single approved draft PR.

## Backlog IDs

- `P0-01` — Select music before creating or adding
- `P0-06` — Add in-row candidate audition to discovery
- `P0-07` — Make large music collections searchable and metadata-honest
- `P1-04` — Consolidate Music provider navigation
- `P1-09` — Standardize loading, empty, expired, and retry patterns
- `P2-02` — Rationalize repeated connection summaries

## User outcomes

- Select an intentional subset without importing an entire provider library.
- Hear a candidate before committing while never confusing preview with selection.
- Search large Likes and playlist collections and trust unknown-count presentation.
- Understand provider capability once, with a direct path to the detailed connection authority.

## Mockup references

- `../mockups/polish-preview.html#music`
- `../mockups/polish-preview-notes.md`

Match nothing-selected-by-default, independent Preview/Select controls, selected count + duration, sticky
mobile tray, honest unknown counts, and unified async states. Do not clone the static table literally.

## Files to inspect / likely edit

- `apps/web/src/components/Dashboard.tsx`
  - `MusicWorkspace`
  - `PlaylistBrowserDialog`
  - `LikesBrowserDialog`
- `apps/web/src/components/TrackSearch.tsx`
- `apps/web/src/components/TrackPreview.tsx`
- `apps/web/src/components/ConnectionsDialog.tsx`
- `apps/web/src/components/DialogState.tsx`
- `apps/web/src/lib/library-state.ts`
- `apps/web/src/lib/providers.ts`
- `apps/web/src/lib/playback/coordinator.ts`
- `apps/web/src/lib/playback/preview.ts`
- Matching tests for every file above, especially `Dashboard.test.tsx`, `TrackSearch.test.tsx`,
  `TrackPreview.test.tsx`, `ConnectionsDialog.test.tsx`, and `library-state.test.ts`

## Out of scope

- New provider endpoints, scopes, schema fields, cached media, waveform analysis, or Spotify BPM.
- Builder header/Inspector work, Account restructuring, or shell navigation changes.
- Import-all as the default action.
- Community discovery, Explore, Teams, or public libraries.

## Implementation steps

1. Define one reusable client-side selection model for provider tracks: stable identity, selected set,
   known durations, unknown-duration handling, and clear reset after commit.
2. Start Likes and playlist dialogs with nothing selected. Add row selection independent from Preview.
3. Reuse the official playback coordinator so only one candidate previews and Stop/Pause remain reliable;
   do not conflate candidate playback with selected-class playback.
4. Add a selection tray with count, calculable total duration, **Start class**, and **Add selected**. Disable
   or explain actions when no destination class exists.
5. Add local title/artist filtering for loaded Likes and playlist tracks. Preserve pagination/load-more
   behavior and never show unknown upstream counts as zero.
6. Recompose Music so connected material leads and provider status appears once. Keep
   `ConnectionsDialog` as the detailed action authority.
7. Apply one loading/empty/error/expired/retry grammar while preserving surface-specific recovery actions.
8. Verify focus, screen-reader announcements, 44px targets, long titles, and sticky-tray behavior at 390px.

## Tests and checks

```bash
pnpm --filter @ritmofit/web test \
  src/components/Dashboard.test.tsx \
  src/components/TrackSearch.test.tsx \
  src/components/TrackPreview.test.tsx \
  src/components/ConnectionsDialog.test.tsx \
  src/lib/library-state.test.ts \
  src/lib/playback/coordinator.test.ts \
  src/lib/playback/preview.test.ts
pnpm --filter @ritmofit/web typecheck
pnpm --filter @ritmofit/web build
pnpm format:check
pnpm lint
```

Manual real-browser checks: Apple Music Likes, a playlist with unknown count, SoundCloud search preview,
expired-provider recovery, desktop, and 390×844. Actual provider playback must be verified in a signed-in
real browser; mocks alone do not prove it.

## Acceptance criteria

- Selecting four tracks imports/adds exactly those four and no unselected rows.
- Count and total known duration are visible before commit; partial/unknown duration is labeled honestly.
- Only one candidate previews; Preview/Pause/Stop and Select remain independent and keyboard operable.
- A 68-playlist collection and a 200-track Likes collection can be filtered without horizontal overflow.
- Unknown counts never render as zero.
- Music shows one compact provider truth and one Manage entry; the dialog owns reconnect actions.
- Loading, empty, error, expired, retry, and settled states have a next action.

## Suggested PR / branch

- Extracted PR title if needed: `feat(web): add intentional music selection flow`
- Extracted branch if needed: `polish/music-selection`
- Current approved delivery: commit batch 2 on `polishv3/design-audit-mockups`.

## Stop / handoff

Report selection-state ownership, provider playback evidence, unknown-count behavior, supported destination
actions, and any provider limitation. Do not merge or deploy.

## Global constraints

- Keep the current Classes / Music / Live / Account shell; no IA redesign.
- Success ranking: build speed > gorgeous > Live pride.
- Builder stays airy and consumer-music scannable; Live remains 80% safety/glanceability and 20% swagger.
- Never cache provider audio or provider-derived analysis; never obtain BPM from Spotify; never download,
  proxy, mix, crossfade, decode, analyze, or derive provider audio. Playback uses official provider paths.
- Prefer small diffs. When tokens change, update design-system guidance and regenerate iOS tokens when the
  package workflow requires it.
- Do not merge or deploy without separate owner authorization.
