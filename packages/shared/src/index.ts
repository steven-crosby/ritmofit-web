/**
 * @ritmofit/shared — the contract.
 *
 * In M1 step 2 this package gains the Zod schemas + inferred types for every
 * entity in `ritmofit_dev_plan/schema.md` (the single source of truth shared
 * by `apps/api` and `apps/web`). For step 1 (scaffold) it only proves that the
 * workspace import resolves from both apps.
 */

/** API version prefix; the REST surface is mounted under `/api/${API_VERSION}`. */
export const API_VERSION = 'v1' as const;

/** Run-payload schema version (see `api.md` → run-payload, decision D12). */
export const RUN_PAYLOAD_SCHEMA_VERSION = 1 as const;
