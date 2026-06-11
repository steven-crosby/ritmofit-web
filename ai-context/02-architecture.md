# 02 — Architecture

## Recommended stack

Use a Cloudflare-native full-stack TypeScript architecture.

Recommended technologies:

- Monorepo workspace
- React + Vite + TypeScript for the web app
- TanStack Router for frontend routing
- TanStack Query for server state
- Tailwind CSS with RitmoFit design tokens for styling
- Cloudflare Workers for the API
- Hono for API routing
- Cloudflare D1 for relational data
- Drizzle ORM for schema and migrations
- Zod for shared validation
- Shared TypeScript packages for domain contracts

## Recommended repo structure

```txt
ritmofit/
  apps/
    web/
      src/
        app/
        components/
        features/
        routes/
        styles/
      index.html
      vite.config.ts
      package.json

    api/
      src/
        index.ts
        routes/
        middleware/
        services/
      wrangler.toml
      package.json

  packages/
    db/
      src/
        schema.ts
        migrations/
        client.ts
        seed.ts
      drizzle.config.ts
      package.json

    shared/
      src/
        domain/
        schemas/
        api/
        constants/
      package.json

    music/
      src/
        providers/
          soundcloud.ts
          spotify.ts
          apple-music.ts
        types.ts
        index.ts
      package.json

    ui/
      src/
        components/
        tokens/
        index.ts
      package.json

  ai-context/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
```

## Why this architecture

This project will eventually have multiple clients:

- web planning app
- future iOS app
- possible admin/marketing surfaces

The backend must be the shared source of truth. The web app and iOS app should consume the same API contracts.

Using shared TypeScript/Zod packages reduces drift between the frontend, backend, and future iOS API documentation.

## Backend deployment model

The API should be implemented as a Cloudflare Worker.

Static frontend hosting can be handled through Cloudflare Workers static assets or Cloudflare Pages. Keep the boundary clear:

- `apps/web` builds the static frontend.
- `apps/api` serves API routes.
- Shared packages provide contracts and business types.

Do not couple the frontend directly to database logic.

## Database model

Use Cloudflare D1 with Drizzle migrations.

The database is the source of truth for:

- users
- sessions
- music connections
- normalized tracks
- provider track references
- classes
- class tracks
- cues
- global moves
- user custom moves

Do not store provider secrets in plain text.

## Provider abstraction

All music providers should be behind a shared provider interface.

SoundCloud is implemented first.

Spotify and Apple Music should be added later without rewriting class or track logic.

## Future iOS readiness

Create a stable endpoint:

```txt
GET /api/classes/:classId/run-payload
```

The run payload should be versioned and optimized for a future iOS live mode.

Do not design the backend as a web-only API.
