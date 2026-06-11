# 00 — Session Start Checklist

Read this file at the beginning of every AI coding session.

## Required behavior

Before writing code for any feature, propose a short plan and wait for confirmation.

Do not make broad architectural changes without explaining why.

Do not introduce a new framework, database, auth provider, state manager, UI library, or deployment strategy without explicit approval.

Do not commit secrets, provider keys, client secrets, private keys, `.env` files, or generated tokens.

## Session startup steps

1. Read all files in `ai-context/`.
2. Inspect the current repo structure.
3. Identify what milestone is currently active.
4. Check existing package manager and workspace configuration.
5. Check existing migrations before changing schema.
6. Check current API routes before adding endpoints.
7. Check current shared types and Zod schemas before creating duplicates.
8. Check the current frontend route/component structure before adding UI.
9. Summarize what you found.
10. Propose a plan before coding.

## Default implementation strategy

Build the smallest complete vertical slice that advances the product without overbuilding.

Prefer:

- typed contracts over implicit shapes
- shared schemas over duplicated validation
- simple CRUD before advanced collaboration
- predictable saving over clever autosync
- one music provider fully working before three partial integrations
- accessibility and colorblind-safe design from the start

## Current priority

The first major product priority is the **Class Builder Timeline**.

The initial workflow is:

1. Instructor signs in.
2. Instructor creates a class.
3. Instructor adds tracks.
4. Instructor reorders tracks in a timeline.
5. Instructor edits track-level choreography metadata.
6. Instructor adds timestamped cues and moves.
7. Instructor saves the class.
8. Future iOS app can fetch a stable run payload.

## Product constraints

- Web planning app does not need to stream or host full audio.
- Web app may open playback in the connected provider.
- SoundCloud metadata import is a first-class differentiator.
- Spotify and Apple Music are later providers behind the same abstraction.
- Teams are out of scope for v1.
- Marketplace/explore/paid classes are out of scope for v1.
- iOS app does not exist yet, but backend must be designed for it.
