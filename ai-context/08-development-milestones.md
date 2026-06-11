# 08 — Development Milestones

## Milestone 1 — Monorepo foundation

Goal: create the empty project foundation.

Deliverables:

- package manager workspace
- `apps/web`
- `apps/api`
- `packages/db`
- `packages/shared`
- `packages/music`
- `packages/ui`
- base TypeScript config
- lint/format config
- Cloudflare Worker config
- Vite React app shell
- Hono API with `/api/health`
- D1 local setup documented

Do not implement complex product features in this milestone.

Acceptance criteria:

- web app runs locally
- API runs locally
- shared package imports work
- DB package can define schema/migrations
- `/api/health` returns a successful response

## Milestone 2 — Core schema and shared contracts

Goal: define the domain model.

Deliverables:

- Drizzle schema for v1 tables
- initial migration
- shared enums
- shared Zod schemas
- seed data for global cycle moves

Tables:

- users
- auth_accounts
- sessions
- music_connections
- tracks
- provider_tracks
- classes
- class_tracks
- moves
- user_moves
- cues

Acceptance criteria:

- migrations run locally
- schema compiles
- seed creates global moves
- shared types are usable in API and web

## Milestone 3 — Auth foundation

Goal: allow authenticated app/API access.

Deliverables:

- auth library or minimal custom session implementation
- email sign-in path
- Google sign-in path if practical
- Apple Sign In config path/placeholders
- session endpoint
- protected route middleware
- frontend authenticated shell

Acceptance criteria:

- user can sign in locally
- API can identify current user
- protected routes reject unauthenticated requests
- frontend can show signed-in user/session state

## Milestone 4 — Class CRUD and builder data APIs

Goal: create and edit classes through the API.

Deliverables:

- class CRUD endpoints
- class track endpoints
- reorder endpoint
- cue endpoints
- moves endpoints
- user moves endpoints
- run-payload endpoint, even if basic

Acceptance criteria:

- user can create a class
- user can add class tracks
- user can reorder class tracks
- user can edit BPM/segment/intensity/notes
- user can add/edit/delete cues
- user can add custom moves
- run-payload returns complete class data

## Milestone 5 — Web Class Builder Timeline MVP

Goal: build the main planning interface.

Deliverables:

- class library route
- create class route
- class builder route
- ordered timeline UI
- track cards
- selected track editor
- cue editor
- move picker
- user custom move creation
- save status

Acceptance criteria:

- instructor can create and edit a class in the web UI
- instructor can add/edit cue data
- instructor can reorder tracks
- UI handles loading, empty, error, and saved states

## Milestone 6 — Manual/mock track flow

Goal: prove class builder without being blocked by provider APIs.

Deliverables:

- add manual track form
- optional mock search provider for development
- attach manual/mock tracks to classes

Acceptance criteria:

- builder can be fully tested without SoundCloud credentials
- class data model is validated before provider integration

## Milestone 7 — SoundCloud integration

Goal: add the first real music provider.

Deliverables:

- SoundCloud provider adapter
- SoundCloud search endpoint
- import track endpoint using SoundCloud
- provider metadata normalization
- external open/play link
- music connection storage if required

Acceptance criteria:

- user can search SoundCloud metadata
- user can import a SoundCloud track
- imported track appears in class builder
- track stores provider reference and raw metadata

## Milestone 8 — Run payload hardening

Goal: prepare backend contract for future iOS app.

Deliverables:

- versioned run-payload response
- stable JSON shape
- all track/cue/provider metadata included
- class duration/order calculated correctly
- payload documented in `packages/shared`

Acceptance criteria:

- one request returns everything needed to run a class
- no frontend-only assumptions are required
- future iOS app can implement against this contract

## Milestone 9 — Spotify and Apple Music integrations

Goal: add additional providers after SoundCloud/class builder are stable.

Deliverables:

- Spotify provider adapter
- Apple Music provider adapter
- playlist import where supported
- provider connection settings UI

Acceptance criteria:

- providers use the same interface
- class model does not change significantly
- frontend search/import UI can switch providers

## Milestone 10 — Future features, not v1

Do not build until explicitly requested:

- teams
- team libraries
- public explore page
- marketplace/paid classes
- collaborative editing
- instructor analytics
- AI choreography suggestions
- advanced recommendation engine
