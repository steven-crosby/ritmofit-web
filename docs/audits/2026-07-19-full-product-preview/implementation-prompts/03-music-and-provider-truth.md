# Implementation prompt 03: unified music sourcing and provider truth

## Role and outcome

Own Music, shared sourcing continuity, playlists/search/likes, and provider capability presentation. The
instructor must be able to browse/listen/select, understand what each provider can do, and carry selections into
a new or existing class without losing provenance or destination context.

## Authority

Implementation only after separate owner authorization. No branch, commit, push, PR, merge, deploy, deletion,
cleanup, provider configuration, or secret change without separate permission.

## Required reads and baseline

Read current `AGENTS.md`, the music constraints, current provider code/docs, and prompt 01’s landed contract.
Reverify provider API/auth behavior before changing any integration-facing presentation. Read the audit sequence,
brief, backlog, decisions, inventory, current/proposed screenshots, and anchors. Audited baseline:
`addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`; inspect live drift first.

## Approved scope

- Owning IDs: P0-04, P0-06, P1-02, PDR-03.
- Inventory/anchors: MUS-01–MUS-07, CONN-01/02, BLD-07–10 consumers, BLD-15/LIVE-02/LIVE-09/ACC-02
  vocabulary consumers.
- Direction: one sourcing/list/selection language; separate catalog, library, and playback; failed status checks
  preserve last-known state as unverified rather than inventing disconnect.
- Playlist browse-before-import is an interaction goal only where the current provider contract supports it.

## Behavior before appearance

Preserve existing connect/auth flows, catalog search, likes/playlists, import/create/add destinations, pagination,
provider provenance, playback authorization, errors, and safe retries. Never cache/download/proxy/decode/analyze/
mix/remix provider audio. Never obtain BPM from Spotify. Sign in with Apple remains separate from Apple Music.

Do not treat search success as library or playback success. Do not label authorization-needed as disconnected.

## File ownership and collisions

Likely owned files:

- Music/provider portions of `apps/web/src/components/Dashboard.tsx` and scoped tests
- `apps/web/src/components/TrackSearch.tsx` and tests
- `apps/web/src/components/ConnectionsDialog.tsx` and tests
- `apps/web/src/components/TrackPreview.tsx` only for consuming state vocabulary, not playback behavior
- `apps/web/src/lib/providers.ts` and tests for pure capability mapping only
- surface-scoped `apps/web/src/index.css`

Read-only/frozen unless separately reopened:

- `apps/web/src/lib/playback/*`, `spotify-playback.ts`, `musickit.ts`
- `packages/music`, API/provider routes, secrets/configuration, shared contracts, schema/migrations/OpenAPI

Collision rules: prompt 01 lands first; serialize `Dashboard.tsx`, `Dashboard.test.tsx`, and `index.css` with
prompts 02/04/06. Publish one provider-state vocabulary for prompts 04/05/06.

## Implementation order

1. Map current Spotify/Apple Music/SoundCloud catalog, library, playlist, and playback capabilities from live
   code and current official provider constraints.
2. Create or refine a pure capability presentation model with explicit consequence/recovery and tests.
3. Recompose Music home for disconnected, connected/mixed, and status-unavailable states.
4. Unify rows, audition affordance, selection tray, and destination choice across search, likes, and playlists.
5. Implement browse-before-import only for capabilities proven by the current provider contract; otherwise show
   truthful provider-specific limitation and alternate starts.
6. Apply the shared vocabulary to Connections and document consumers for Builder/Live/Account.
7. Real-browser verify actual playback separately from browsing/authorization.

## Design translation

Use familiar source shelves for entry, dense shared rows for selection, explicit provider provenance, and a
sticky selection/destination tray only when selection exists. Consume canonical tokens and prompt 01 states.
Avoid a generic dashboard card grid and do not make connection status the hero when browsing remains useful.

## Responsive and hostile cases

Desktop, 390, direct 320, and 200%-equivalent reflow; no tray/row overflow. Test long multilingual titles,
provider errors, missing artwork, empty playlists, large playlists/pagination, mixed authorization, expired
connections, status fetch failure, and destination changes while items remain selected.

## Accessibility

Keyboard selection and audition, labeled provider/status icons, 44px mobile controls, focus retention when trays
appear, dialog semantics, non-color capability meaning, reduced-motion state, and concise announcements for
selection counts and playback state.

## State coverage

MUS-01 disconnected, MUS-02 connected/mixed, MUS-03 likes, MUS-04 creation confirmation, MUS-05 playlist,
MUS-06 search, MUS-07 status unavailable, CONN-01 all disconnected, CONN-02 mixed/recovery. Cover loading,
empty, pagination, authorization required, provider error, selection cleared, and destination unavailable.

## Tests and gates

Add pure mapping and focused component tests. Run provider/search/connection/preview tests, web test suite,
format, typecheck, lint, design-system verify, web build, remaining CI-equivalent gate, and `git diff --check`.
No API probe alone proves playback.

## Visual and playback verification

Real-browser compare `mockups/#MUS-01`–`#MUS-07` and `#CONN-01`/`#CONN-02` at desktop/mobile. With authorized
accounts, verify connect, browse/import, readiness, playback start, seeking/window behavior, pause/resume, stop,
clip completion, and reconnect as distinct results. Do not expose credentials or personal library content in
artifacts.

## Acceptance criteria

- P0-04: source, selection, provenance, and destination context survive across valid entry paths.
- P0-06: catalog/library/playback are distinct; failure never creates false disconnect.
- P1-02: Music feels like sourcing/listening work, and supported playlists are inspectable before import.
- PDR-03: browse-before-import ships only where feasible; unsupported providers remain honest and useful.
- Provider audio ownership and every non-negotiable music constraint remain intact.

## Failure and stop conditions

Stop for provider/legal/authorization/contract changes, playback-runtime changes, new API/schema/shared contract,
or a need to store/cache provider data beyond current behavior. If resume remains broken, isolate and report the
layer; do not fold a speculative fix into this visual slice.

## Handoff

Report capability matrix/source, changed files, tests/gates, browser/playback results per capability, screenshots,
unresolved provider seams, consumer contract for prompts 04/05/06, and unauthorized actions not taken.

Suggested branch: `codex/music-provider-truth`  
Suggested PR title: `feat(web): unify music sourcing and provider capability states`
