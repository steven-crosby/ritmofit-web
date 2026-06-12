/**
 * @ritmofit/shared — the contract.
 *
 * Zod schemas + inferred types for every entity in `ritmofit_dev_plan/schema.md`
 * (the single source of truth shared by `apps/api` and `apps/web`). Enums live
 * once in `enums.ts`; common primitives in `common.ts`.
 *
 * Request/response variant schemas (Create/Update) and the run-payload
 * composition shape are intentionally deferred to the steps that introduce their
 * routes (6–11) and step 10 respectively.
 */

/** API version prefix; the REST surface is mounted under `/api/${API_VERSION}`. */
export const API_VERSION = 'v1' as const;

/** Run-payload schema version (see `api.md` → run-payload, decision D12). */
export const RUN_PAYLOAD_SCHEMA_VERSION = 1 as const;

export * from './enums.js';
export * from './common.js';
export * from './entities/identity.js';
export * from './entities/classes.js';
export * from './entities/tracks.js';
export * from './entities/moves.js';
export * from './entities/choreography.js';
export * from './entities/sharing.js';
export * from './entities/music.js';
