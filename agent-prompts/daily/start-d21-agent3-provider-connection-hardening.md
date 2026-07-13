# Start D21 parallel lane — provider connection & token-lifecycle hardening

> **INTERACTIVE.** Use this after `daily/start-session.md` in the
> `ritmostudio-agent3/ritmofit-web` worktree. This is the **third** parallel D21
> session. It intentionally avoids both the saved-playlist contract/adapter/test work
> (agent1) and the responsive shell / navigation / Account presentation (agent2).
>
> Do not implement until the plan is confirmed.

## Goal

Improve confidence and robustness in the **provider connection lifecycle** that the
whole D21 music-service shell rests on — OAuth connect/callback, token
refresh/retry, the Spotify Web Playback token, disconnect/purge, per-user rate
limiting, and token-at-rest crypto — without touching the saved-playlist read
surfaces or the shell UI.

Your lane is **provider-auth / token-lifecycle audit + focused non-UI backend
hardening**. Prefer an audit-first pass, then the smallest useful test/hardening
slice.

## What the other two sessions own (do not overlap)

### agent1 — saved-playlist contract/readiness (this lane just finished a session)

Working tree: `/Users/stevencrosby/Repos/RitmoStudio/ritmostudio-agent1/ritmofit-web`

**Completed this session (uncommitted in agent1's clone — NOT yet on `main`):**

- **Slice A — OpenAPI contract-truth.** Registered the response schema
  `ProviderPlaylistSummary` and the two shipped D21 endpoints
  `GET /providers/{provider}/playlists` and
  `GET /providers/{provider}/playlists/{playlistId}/tracks` in
  `apps/api/scripts/generate-openapi.ts`; regenerated
  `apps/api/openapi/openapi.json` (now 48 schemas / 50 paths); documented the
  previously-undocumented `savedPlaylists` capability in the `ProviderCapabilities`
  JSDoc in `packages/shared/src/enums.ts`. Verified: `pnpm -r typecheck`, `pnpm lint`,
  `pnpm format:check`, `contract-parity` ("No untracked contract drift").
- **Slice B — Apple Music saved-playlist adapter tests.** Added coverage in
  `apps/api/src/lib/music/apple-music.test.ts` for `fetchAppleMusicLibraryPlaylists`
  and `fetchAppleMusicLibraryPlaylistTracks` (mapping, attribute defaults, `next`
  pagination, 404→`[]`, 401/403→reconnect). 17 tests pass.
- **Durable finding:** `generate-openapi.ts` is a **hand-maintained manifest** — the
  CI gate `pnpm --filter @ritmofit/api openapi && git diff --exit-code openapi.json`
  is blind to a new route/schema that was never added to the manifest. When adding a
  route/DTO, register it manually; do not trust the green diff-gate as proof of
  coverage.

**agent1's remaining backlog (leave for agent1 — do not take):**

- Adapter-level test for `fetchSpotifyPlaylistTracks` (`spotify.test.ts`) — today only
  covered indirectly via a mocked orchestration test.
- Orchestration coverage in `apps/api/src/lib/music/user-playlists.test.ts` for the
  Apple Music and SoundCloud branches (only the Spotify path is tested).
- The saved-playlist read files generally: `apps/api/src/lib/music/user-playlists.ts`,
  `packages/shared/src/entities/music.ts`, and the `fetch*Playlists*` /
  `fetch*PlaylistTracks` adapter functions.

### agent2 — responsive shell / navigation / Account

Working tree: `/Users/stevencrosby/Repos/RitmoStudio/ritmostudio-agent2/ritmofit-web`

- `apps/web/src/components/Dashboard.tsx`
- Account page/dialog surfaces
- provider shelf / Music workspace presentation
- tests covering Dashboard navigation, Account page layout, Music destination behavior

## Parallel Work Boundary

- All three clones are on `main` @ `9ade653`. agent1's and agent2's edits are
  **uncommitted in their own worktrees**, so they will NOT appear in this clone's
  `git status`. Check for cross-clone collisions before any broad edit.
- Do **not** edit the files listed under agent1 or agent2 above without an explicit
  redirect from the owner.
- In particular: do **not** regenerate `openapi.json` or edit `generate-openapi.ts` /
  `packages/shared/src/enums.ts` (agent1 has pending changes there), and do **not**
  edit `apps/api/src/routes/providers.ts` route/contract wiring without coordinating —
  the provider route contract is agent1's.

## Preferred Non-Overlapping Scope

Pick one after orientation (audit first, then the smallest slice):

1. **Provider-auth / token-lifecycle audit only** — a findings report with file/line
   references and a prioritized, non-overlapping follow-up list.
2. **Focused backend test/hardening** — close the highest-risk gap you find in the
   connection lifecycle (see candidate files), staying out of the saved-playlist and
   shell lanes.

Candidate files to inspect (this is your cluster):

- `packages/music/src/spotify-oauth.ts`, `packages/music/src/soundcloud-oauth.ts`
  (Authorization Code + PKCE exchange/refresh, error mapping)
- `packages/music/src/app-token.ts`, `packages/music/src/retry.ts` (app-token cache;
  transient 429/5xx retry)
- `apps/api/src/lib/music/spotify-playback-token.ts` (short-lived Web Playback SDK
  token: `streaming` scope gating, reconnect signaling, TTL, no refresh-token leakage)
- `apps/api/src/lib/music/purge.ts` (token forget on disconnect — completeness,
  idempotency)
- `apps/api/src/lib/music/rate-limit.ts` (per-user upstream-quota guards across the
  provider proxy routes)
- `apps/api/src/lib/crypto.ts` (AES-GCM token-at-rest)
- existing tests: `spotify-oauth.test.ts`, `soundcloud-oauth.test.ts`, `retry.test.ts`,
  `purge.test.ts`, `registry.test.ts`

Themes worth checking: 401→reauth mapping and single-retry semantics; expiry-skew and
refresh-token rotation persistence; playback-token scope gating and TTL; disconnect
purge completeness; rate-limit windows/keys per route; and **secret hygiene** — never
log tokens, refresh tokens, `Authorization`/`Music-User-Token` headers, or provider
secrets (AGENTS.md → Music Constraints).

## Explicitly Out Of Scope

- The saved-playlist read surfaces, adapters, orchestration, OpenAPI, and their tests
  (agent1).
- The responsive shell, navigation, Account page/dialog, provider-shelf cards, and
  Music workspace presentation (agent2).
- Provider-audio caching, Spotify BPM, audio analysis, mixing, crossfade, unofficial
  playback, or provider audio proxying.
- Reviving Teams, Sharing, Publish, Explore, public class pages, or community discovery.
- New migrations, unless the owner explicitly confirms a schema change.
- Changing OAuth request shapes or provider endpoints without re-verifying current
  provider API terms first.

## Required Orientation

Read, in order:

- `AGENTS.md`
- `agent-prompts/daily/start-session.md`
- `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
- `ritmofit_dev_plan/decisions.md` sections D19, D20, D21
- `ritmofit_dev_plan/music-providers.md` (hard constraints) and
  `ritmofit_dev_plan/provider-playback-implementation.md`
- `packages/shared/src/enums.ts` (provider capability matrix)
- the candidate files above and their existing tests

Also inspect git state and surface existing worktree changes before proposing edits.
Preserve all existing changes. Remember agent1/agent2 edits live in sibling clones and
won't show here.

## Planning Requirements

Before code, report:

- what the connection-lifecycle audit found;
- whether OAuth/refresh/playback-token/purge/rate-limit behavior matches the documented
  contract and provider auth models (Spotify + SoundCloud redirect OAuth; Apple Music
  Music-User-Token, no server refresh);
- likely files for any proposed focused edits;
- API/shared-contract/OpenAPI impact, if any (expected: none — coordinate with agent1
  if a contract change is unavoidable);
- risks and out-of-scope boundaries;
- verification commands.

Ask only focused questions that block the lane. Otherwise recommend the smallest
non-overlapping slice and wait for owner confirmation.

## Acceptance Criteria

For an audit-only session:

- findings grounded in specific files/lines;
- no overlap with the saved-playlist or shell lanes;
- follow-ups prioritized by product/security risk.

For an implementation session:

- changes stay outside the saved-playlist and shell lanes;
- provider auth behavior stays honest to each provider's real model and the hard music
  constraints;
- no tokens/secrets are logged;
- focused tests pass;
- OpenAPI is regenerated only if a contract/API change is unavoidable, and only after
  coordinating with agent1 (who has pending `openapi.json` changes);
- docs updated only when stale.

## Required Output Before Editing

End orientation with:

- **Recommended non-overlapping slice**
- **Files likely touched**
- **Contract/API impact**
- **Out of scope**
- **Risks/open questions**
- **Verification plan**
- **Confirmation needed**
