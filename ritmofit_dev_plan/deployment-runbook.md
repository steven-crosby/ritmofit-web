# Production Deployment & Recovery Runbook

Canonical operational procedure for the single Cloudflare Worker that serves `https://ritmofit.studio`
(API at `/api/*` + the built SPA from `apps/web/dist`). Deployments are **manual and production-facing** —
get owner confirmation before deploying (`CLAUDE.md`). All commands run from the repo root unless noted;
API-scoped Wrangler commands use `pnpm --filter @ritmofit/api exec wrangler …`.

Owner / deployer: `steven.crosby09@gmail.com` (Cloudflare account holder).

## Environment matrix

| Where                             | Contents                                                                                                                                                               | Notes                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/wrangler.toml` `[vars]` | `BETTER_AUTH_URL`, `WEB_ORIGIN` (both `https://ritmofit.studio`)                                                                                                       | Committed, non-secret. The session cookie binds to `BETTER_AUTH_URL`.               |
| Worker secrets (prod)             | `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SOUNDCLOUD_CLIENT_ID`/`_SECRET`, `SPOTIFY_CLIENT_ID`/`_SECRET`, Apple sign-in (`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` or static `APPLE_CLIENT_SECRET`), Apple Music (`APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY` or static `APPLE_MUSIC_DEVELOPER_TOKEN`) | `wrangler secret list` shows names only. Never echo values in terminal logs or docs. |
| D1                                | database `ritmofit`, bound as `DB`                                                                                                                                     | Forward-only Drizzle migrations under `apps/api/migrations`. For the live level, run `wrangler d1 migrations list ritmofit --remote` (don't trust a number hard-coded here). |
| Local dev                         | `apps/api/.dev.vars` (gitignored), `MOCK_PROVIDERS=true`, no `RESEND_API_KEY` (email logs to console)                                                                  | Never commit secrets.                                                               |

`MOCK_PROVIDERS` is unset in prod (live providers). **Auth target: email/password + Apple + Google
sign-in** on both web and iOS. Apple sign-in uses Better Auth plus a Worker-signed ES256 client-secret
JWT. Set `APPLE_CLIENT_ID` (the web Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and
`APPLE_PRIVATE_KEY`; the legacy/static `APPLE_CLIENT_SECRET` fallback is accepted but expires and should
not be the default. The web Apple callback must be registered in Apple as
`https://ritmofit.studio/api/auth/callback/apple`. Google remains credential-gated by
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.

Apple Music is separate from Apple sign-in. Prefer `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and
`APPLE_MUSIC_PRIVATE_KEY` so the Worker signs the developer token; `APPLE_MUSIC_DEVELOPER_TOKEN` remains
as a static fallback. Optional `APPLE_MUSIC_STOREFRONT` defaults to `us`.

SoundCloud OAuth connect uses `https://ritmofit.studio/api/v1/providers/soundcloud/callback` unless
`SOUNDCLOUD_REDIRECT_URI` overrides it. Spotify now supports **both** server-side catalog/playlist
search (the client-credentials pair) **and** a per-user OAuth connect ("search my Spotify" likes —
confidential Authorization Code, scope `user-library-read`, callback
`https://ritmofit.studio/api/v1/providers/spotify/callback` unless `SPOTIFY_REDIRECT_URI` overrides),
reusing the same `SPOTIFY_CLIENT_ID`/`_SECRET`. To enable it in production, deploy the connect code and
register that callback in the Spotify app dashboard. There is still **no Spotify BPM path** (permanent
constraint — `music-providers.md`). Apple Music per-user connect uses **MusicKit JS** in the browser (no
redirect or new secret beyond the existing Apple Music developer-token creds): the SPA mints a
Music-User-Token and `POST`s it to `/providers/apple_music/connection`, stored encrypted.

> **Connect-path state (verified 2026-07-03 on Worker
> `94126954-0e61-408e-b404-bb380c338141`):** All three per-user connect paths are **deployed**.
> **Apple Music** connect is **live and verified working** in prod (MusicKit JS → Music-User-Token →
> `/providers/apple_music/connection`). **SoundCloud** connect is also **live and verified working** in
> prod after the OAuth request-shape fix: authorization-code + PKCE exchanges send `client_id` and
> `client_secret` in the form body. **Spotify** connect is now **live and verified working** in prod
> after registering `https://ritmofit.studio/api/v1/providers/spotify/callback` in the Spotify app
> dashboard; the Worker log showed `GET /api/v1/providers/spotify/callback?... - Ok`, and the
> Connections dialog showed `Connected to Spotify.` Spotify uses confidential Authorization Code with
> Basic auth and no PKCE verifier. No `SOUNDCLOUD_REDIRECT_URI` / `SPOTIFY_REDIRECT_URI` override is
> set, so the registered dashboard redirect URI must exactly match
> `https://ritmofit.studio/api/v1/providers/<provider>/callback`.
> **Note:** redirect-OAuth callbacks are
> top-level browser navigations, so the SPA's PWA service worker must keep `/api/` in its
> `navigateFallbackDenylist` (PR #161) or the callback never reaches the Worker (it dead-ends on the
> SPA 404). Apple Music is immune — MusicKit authorizes in-page, not via a navigation.

**Optional automatic BPM lookup** (GetSongBPM) is likewise unprovisioned: `GETSONGBPM_API_KEY` is not
set in prod, so `POST /tracks/:id/bpm-lookup` returns a `503` with an instructor-facing fallback
message and manual BPM entry covers the loop. Set the key via `wrangler secret put GETSONGBPM_API_KEY`
post-launch to enable one-tap tempo fill (owner deferral, 2026-06-28). BPM and Google sign-in remain
tracked as deferrals in `web-launch-readiness.md`; Apple sign-in is enabled when the Apple secrets above
are present and the current slice is deployed.

## Pre-deploy

1. On `main`, clean tree, in sync with origin; the change is merged.
2. Run the CI-equivalent gates (also enforced by `.github/workflows/ci.yml`):
   ```bash
   pnpm format:check
   pnpm -r typecheck
   pnpm lint
   (cd ritmofit_design_system && npm run verify)
   pnpm test
   pnpm --filter @ritmofit/api test:integration
   pnpm --filter @ritmofit/web build
   pnpm --filter @ritmofit/api openapi
   git diff --exit-code apps/api/openapi/openapi.json
   pnpm --filter @ritmofit/api contract-parity
   pnpm audit:ci
   ```
3. Record the current live version for rollback (see below): `wrangler deployments status`.
4. Check remote D1 migration state: `wrangler d1 migrations list ritmofit --remote`.

## Deploy

**Migrations before code.** If the change adds migrations, apply them to remote D1 _first_ so the
new code never runs against an un-migrated database:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
```

Then build the SPA (the `deploy` script is just `wrangler deploy`; it does **not** build web) and deploy:

```bash
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api run deploy
```

Note the printed **Current Version ID** — that is the new live version.

## Post-deploy smoke

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/                      # SPA → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/health         # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/classes        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/explore        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/teams          # unauth → 401
curl -s -D - -o /dev/null https://ritmofit.studio/api/v1/health | \
  grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions'  # headers present
curl -s https://ritmofit.studio/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'          # matches the built hash
```

Also smoke mounted launch routes so accidental route regressions show up as something other than
`404 NOT_FOUND`: class shares, playlist import, cover upload serving, provider search/import, and the
class cover/tag endpoints should reach their real handlers and fail as `401`/`403`/validation/domain
errors when unauthenticated or given invalid test data.

For UI-affecting changes, also run the browser smokes against a local stack (see
`apps/web/smoke/README.md`). Confirm the new Worker version: `wrangler deployments status`.

## Rollback / recovery

Both paths are verified available for these production resources.

### Worker code rollback (no schema change)

Cloudflare retains prior Worker versions. To revert code to a known-good version:

```bash
pnpm --filter @ritmofit/api exec wrangler deployments list     # find the last-good Version ID
pnpm --filter @ritmofit/api exec wrangler rollback <version-id> -m "reason"
```

This re-publishes that version's code **and bindings**; it does **not** touch D1 data.

### D1 point-in-time restore (data recovery)

D1 Time Travel keeps ~30 days of history. To inspect or restore:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 time-travel info ritmofit          # current bookmark
pnpm --filter @ritmofit/api exec wrangler d1 time-travel restore ritmofit \
  --bookmark=<bookmark>           # or --timestamp=<ISO8601>
```

### Migration interaction (important)

Drizzle migrations are **forward-only** and are never rewritten after application. A Worker rollback
does **not** un-apply a migration. If a bad deploy included a migration:

1. Roll the **code** back to the prior version (above) if the old code is compatible with the new schema
   (additive migrations usually are), **or**
2. If the schema change is breaking, restore D1 with Time Travel to just before the migration **and**
   roll the code back — then fix forward with a corrected migration. Coordinate both so code and schema
   stay compatible.

## References

- Manual deploy + migration ordering: `CLAUDE.md` › "Security And Deployment".
- Deploy history of record: `ritmofit_dev_plan/HISTORY.md` (the archived `ritmofit_dev_plan/archive/REVIEW_HISTORY.md`
  holds the pre-launch remediation log) — one dated entry per production deploy.
- Session close hygiene: `agent-prompts/daily/close-session.md`.
