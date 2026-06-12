/**
 * Typed HTTP errors thrown by routes/helpers and rendered to the standard
 * `{ error: { code, message } }` envelope by the app's `onError` (conventions.md).
 * Throwing keeps route handlers thin — no per-route error plumbing.
 */
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class HttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

/**
 * True when a thrown DB error is a SQLite UNIQUE-constraint violation (→ map to
 * 409). Drizzle wraps the driver error, so walk the `cause` chain — the SQLite
 * message lives several levels down, not on the top-level `.message`.
 */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current != null && depth < 10; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(message)) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}
