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
