# 07 — Auth and Security Plan

## Auth requirements

RitmoFit should support:

- email sign-in
- Google sign-in
- Apple Sign In

The backend should own sessions.

The authenticated API must derive user identity from the session, not from request body fields.

## Recommended auth approach

Use a Workers-compatible auth solution that stores users/accounts/sessions in D1.

Preferred approach:

1. Evaluate Better Auth compatibility with Cloudflare Workers and D1 in the actual repo.
2. If it fits cleanly, use it.
3. If it introduces too much friction, implement a minimal custom session system with:
   - users
   - auth_accounts
   - sessions
   - hashed session tokens
   - secure HTTP-only cookies

Do not use Firebase/Auth0/Supabase unless explicitly approved.

## Session requirements

- Use secure HTTP-only cookies.
- Store only a hashed session token in the database.
- Expire sessions.
- Protect authenticated API routes with middleware.
- Return `GET /api/auth/session` for the frontend.

## Secrets

Never commit:

- provider client secrets
- Apple private keys
- JWT/session secrets
- encryption keys
- `.env` files
- Cloudflare API tokens

Use Cloudflare secrets for deployed environments.

Local development can use `.dev.vars`, but it must be gitignored.

## Music provider tokens

Music provider access and refresh tokens must be encrypted before storage.

Required secret:

```txt
ENCRYPTION_KEY
```

Store encrypted tokens in `music_connections`.

Do not return provider tokens to the frontend.

## Apple separation

Apple Sign In and Apple Music are separate integrations.

Do not mix:

- Apple auth client ID / service ID
- Apple Music developer token/key/team ID/key ID

## Authorization model, v1

Simple rule:

```txt
A user can only access their own classes, custom moves, and music connections.
```

Teams are not part of v1.

## API security checklist

Every protected endpoint should:

- require an authenticated session
- validate request params
- validate request body with Zod
- check ownership of the resource
- return consistent errors
- avoid leaking raw provider tokens or secrets

## CORS

Keep CORS strict.

Allow the production domain:

```txt
https://ritmofit.studio
```

Allow local dev origins as needed.

## Logging

Logs should not include:

- access tokens
- refresh tokens
- authorization headers
- cookies
- provider secrets
- private Apple keys

Provider errors can be logged in sanitized form.
