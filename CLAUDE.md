# RitmoFit

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors. The web app (this
repo) is the planning surface; a separate iOS app is the live surface. Both are clients of one shared
backend — the backend is the single source of truth.

## Before doing any work

Read [`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`](ritmofit_dev_plan/DEVELOPMENT_PLAN.md) and the rest of
[`ritmofit_dev_plan/`](ritmofit_dev_plan/), plus
[`ritmofit_design_system/README.md`](ritmofit_design_system/README.md). For the exact per-session
prompts and build order, see
[`ritmofit_dev_plan/session-prompts.md`](ritmofit_dev_plan/session-prompts.md).

## Working agreement

Follow [`ritmofit_dev_plan/ai-working-rules.md`](ritmofit_dev_plan/ai-working-rules.md): **propose a
plan and wait for confirmation before writing code**, then summarize when done. Work in small vertical
slices — one build-order step per session.

## Inviolable rules

- **Respect the three hard music constraints** in
  [`ritmofit_dev_plan/music-providers.md`](ritmofit_dev_plan/music-providers.md): never cache audio or
  platform-derived data, never pull BPM from Spotify (deprecated for new apps Nov 2024 — BPM is manual
  in M1), never mix/crossfade audio in-app. If a request seems to require any of these, stop and flag it.
- **The shared package is the contract.** Define entity shapes once in `packages/shared`; don't redefine
  them in `apps/api` or `apps/web`.
- **Centralize authorization.** Every class-scoped route calls `requireAccess`
  ([`authorization.md`](ritmofit_dev_plan/authorization.md)). D1 has **no row-level security** — a
  missing check is a security bug.
- **Never commit secrets.** Use `.dev.vars` (git-ignored) locally and `wrangler secret put` in prod.

## Stack (locked — see [`decisions.md`](ritmofit_dev_plan/decisions.md))

Cloudflare-native: Workers (API) + D1 (database) + Pages/static assets (web). Hono + Drizzle + Zod,
React + Vite + TypeScript, Better Auth (email/Apple/Google). Monorepo: `packages/shared`, `apps/api`,
`apps/web`.

## UI

Use the design system in [`ritmofit_design_system/`](ritmofit_design_system/) for all UI — tokens from
[`tokens.json`](ritmofit_design_system/tokens.json), the redundant-encoding accessibility rules, Martian
Mono for BPM/data, and the energy-ribbon / tempo primitives. Don't invent styling.

## Current state

**M1 complete** (all 12 build-order steps; backend feature-complete + a minimal web skeleton). The
shared contract, D1 schema/migrations/seed, Better Auth, `requireAccess`, and the full class-builder
REST surface (classes, class_tracks, cues, placed moves, moves library, tracks + provider ids, the
dev-only mock-track seam, the versioned run-payload, and teams + sharing) all exist and are verified
against local D1. OpenAPI spec is generated from the shared Zod schemas at
[`apps/api/openapi/openapi.json`](apps/api/openapi/openapi.json).

- **Run it:** `pnpm dev:api` (Worker on :8787) + `pnpm dev:web` (Vite on :5173). API health:
  `/api/v1/health`. Better Auth at `/api/auth/*`; REST under `/api/v1`.
- **Checks:** `pnpm -r typecheck` · `pnpm test` (Vitest, in `apps/api`) · `pnpm --filter @ritmofit/api openapi` regenerates the spec.
- **Cloudflare (provisioned):** remote D1 `ritmofit` (id `5bf15d82-…` in `wrangler.toml`, **not** a
  secret) is migrated + seeded; the `ritmofit-api` Worker is deployed at
  `https://ritmofit-api.steven-crosby09.workers.dev` with a daily Cron Trigger (`17 3 * * *`) for the
  purge sweep. Secrets (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`) set via `wrangler secret put`. Local dev
  still uses local D1: `pnpm --filter @ritmofit/api db:migrate:local` + `db:seed:local`; deploy with
  `pnpm --filter @ritmofit/api deploy` and `db:migrate` against `--remote`.
- **Deploys are manual (by design):** the Cloudflare **Workers Builds** git integration was
  **disconnected (2026-06-12)** so a push to `main` does **not** auto-deploy. Ship with
  `pnpm --filter @ritmofit/api deploy`. Don't reconnect Workers Builds without deciding you want
  push-to-deploy CI/CD (and gating it on `pnpm -r typecheck` + `pnpm test`).
- **Known tech debt:** no automated integration tests yet — the route/SQL layer is verified by manual
  flows + unit tests (purge SQL scoping verified against local D1), not CI. The app-level authz is the
  only access gate. No CI pipeline (lint/typecheck/test) runs on push yet.

**M2 in progress** (music providers, SoundCloud first) — see `ritmofit_dev_plan/milestones.md` and
`music-providers.md`. New package `packages/music` holds the provider adapters.

- **Slice 1 — provider search → track creation** (PR #1, merged): a `MusicProvider` abstraction +
  server-side SoundCloud `client_credentials` adapter behind a registry that falls back to the mock
  catalog. Routes: `GET /providers/:provider/search`, `POST /providers/track-import`.
- **Slice 2 — per-user OAuth + encrypted `music_connections`** (PR #2, merged): Authorization Code +
  PKCE connect/callback/list/disconnect; AES-GCM token encryption (`lib/crypto.ts`); PKCE
  (`lib/pkce.ts`). No migration (table pre-existed).
- **Slice 3 — consume the per-user token**: `GET /providers/:provider/likes` ("search my SoundCloud")
  spends the stored `music_connections` token, with **token refresh** wired in — proactive on expiry,
  reactive on a 401, rotated tokens re-encrypted and persisted. Pure `fetchSoundCloudLikes` adapter +
  `SoundCloudUnauthorizedError` refresh signal in `packages/music`; orchestration in
  `lib/music/user-likes.ts`; shared creds guards in `lib/music/provider-config.ts`.
- **Slice 4 — 7-day metadata-purge-on-disconnect**: disconnect forgets tokens immediately *and*
  enqueues a `provider_purge_queue` row (migration `0002`); a daily Cron Trigger drains it via
  `scheduled()` → `drainPurgeQueue` (`lib/music/purge.ts`), stripping that provider's `track_provider_ids`
  + nulling `albumArtUrl` on the user's tracks — never touching other users, other providers, or our own
  metadata (title/artist/BPM/classes). Retry-with-give-up; orchestration unit-tested via a fake store,
  SQL scoping verified against local D1.
- **Slice 5 — provider-ID resolution / same-song matching**: import resolves a candidate against the
  caller's library before forging a track (`lib/same-song.ts`) — exact `(provider, providerTrackId)` is
  idempotent; the same song from a different provider attaches its ID to the existing track. Conservative
  fuzzy match (normalized title+artist + duration tolerance, never double-attaches a provider).
- **Slice 6 — Spotify + Apple Music behind the same `MusicProvider`**: `packages/music/spotify.ts`
  (client-credentials, **never** BPM) + `apple-music.ts` (developer-token catalog search) drop in behind
  the registry's mock fallback; `SPOTIFY_*` / `APPLE_MUSIC_*` env documented. Pure, network-injectable,
  unit-tested.
- **Slice 7 — third-party BPM provider** *(optional)*: pluggable `BpmProvider` (GetSongBPM adapter,
  `normalizeBpm`) fills `display_bpm` from a dedicated tempo service — **never Spotify**.
  `POST /tracks/:id/bpm-lookup` (owner-only); behind the deterministic mock until `GETSONGBPM_API_KEY`.
- **M2 complete.** `typecheck` (4 pkgs) + `lint` + `test` (116) green. Live provider calls
  (SoundCloud/Spotify/Apple Music/BPM) are **behind the mock** until real creds land — re-verify each
  provider's endpoints/auth-header scheme then.

**M3 (live mode) — complete.** Two parts, both done:
- **Run-payload hardening** (the live contract): `class.totalDurationMs` (server-derived assembled
  length), read-time timeline recompute (`computeClassTimeline`) so per-track offsets are authoritative,
  frozen v1 shape documented in `packages/shared` + `api.md`. **Verified live** end-to-end on the deployed
  Worker + remote D1 (sign-up → 2-track class → `totalDurationMs=380000`, offsets `0`/`180000`).
- **Live-mode cue prompter UI** (`apps/web/src/components/LiveMode.tsx`): Cue-by-Cue + Full List views, a
  virtual-clock interval timer (play/pause/seek/reset, track/class countdowns), and intensity readouts
  with redundant encoding (color + bars + label). No in-app audio — playback stays in the provider apps.
  The native iOS live surface (Phase 2) reimplements this against the same run-payload (+ Landscape view).

M1's per-step branches and `main` are on GitHub; M2 slices 1–3 are merged to `main`. Cloudflare
provisioning + M2 slices 4–7 + all M3 work are on a working branch (not yet merged).
