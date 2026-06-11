# RitmoFit AI Context

This folder is the persistent planning and implementation context for AI coding agents working on RitmoFit.

At the start of every session, the AI agent should read these files in order:

1. `00-session-start.md`
2. `01-product-vision.md`
3. `02-architecture.md`
4. `03-domain-model.md`
5. `04-api-contract.md`
6. `05-frontend-plan.md`
7. `06-music-provider-plan.md`
8. `07-auth-security-plan.md`
9. `08-development-milestones.md`
10. `09-ai-working-rules.md`

## Project summary

RitmoFit is a choreography and class-running platform for rhythm spin cycle instructors.

The web app is the planning workspace where instructors build classes, search/import music metadata, order tracks, choreograph moves, add timestamped cues, and prepare classes for live instruction.

The future iOS app will consume the same backend and provide live class-running mode.

The backend is the source of truth. Music providers are not the source of truth.

## Current project state

- Repo starts empty.
- Nothing is deployed yet.
- No database schema exists yet.
- No iOS app repo exists yet.
- Domain: `ritmofit.studio` through Cloudflare DNS.
- SoundCloud, Spotify, Apple Sign In, and Apple Music credentials are already available to the project owner, but should not be committed.
- SoundCloud is the first priority music provider.

## Core instruction

Before writing code for any feature, propose a brief implementation plan and wait for confirmation.

The plan must include:

- files to create or change
- schema impact
- API surface impact
- frontend impact
- risks and open questions
- test/verification steps
