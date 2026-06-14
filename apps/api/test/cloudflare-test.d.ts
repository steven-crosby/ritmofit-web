/**
 * Types for the `cloudflare:test` module's provided env in the integration suite.
 * Extends the Worker `Env` with the migrations binding the setup file consumes.
 */
import type { D1Migration } from 'cloudflare:test';
import type { Env } from '../src/lib/types.js';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}
