/**
 * Per-request Drizzle client over the D1 binding.
 *
 * Built per request (not a module singleton): the `DB` binding only exists on
 * `env`, which Workers provides per invocation.
 */
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import type { Env } from './types.js';

export function createDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof createDb>;
