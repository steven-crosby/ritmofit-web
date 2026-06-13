/**
 * Small D1-backed fixed-window rate limiter (B4) for our own routes — the
 * companion to Better Auth's built-in limiter on `/api/auth/*`. Reuses the same
 * `rate_limit` table with a namespaced key prefix and the same fixed-window
 * semantics, so the two never fight over a row.
 *
 * The decision is a pure function (`evaluateFixedWindow`) so the window math is
 * unit-tested without a DB; the middleware is the thin D1 read/upsert around it.
 */
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './types.js';

export interface RateRecord {
  count: number;
  lastRequest: number;
}

export interface RateDecision {
  allowed: boolean;
  /** Counter to persist for this key (the new window's count). */
  count: number;
  /** Window-start timestamp to persist (unchanged within an active window). */
  lastRequest: number;
  /** Ms until the window frees up (0 when allowed). */
  retryAfterMs: number;
}

/**
 * Fixed window: the first request in a window stamps `lastRequest` and starts the
 * count at 1; subsequent requests increment until `max`; once the window elapses
 * it resets. `lastRequest` marks the window start, not the latest hit — matching
 * Better Auth's table semantics.
 */
export function evaluateFixedWindow(
  rec: RateRecord | null,
  now: number,
  windowMs: number,
  max: number,
): RateDecision {
  if (!rec || now - rec.lastRequest >= windowMs) {
    return { allowed: true, count: 1, lastRequest: now, retryAfterMs: 0 };
  }
  if (rec.count >= max) {
    return {
      allowed: false,
      count: rec.count,
      lastRequest: rec.lastRequest,
      retryAfterMs: windowMs - (now - rec.lastRequest),
    };
  }
  return { allowed: true, count: rec.count + 1, lastRequest: rec.lastRequest, retryAfterMs: 0 };
}

interface RateLimitOptions {
  /** Namespaces the row key, e.g. `provider-search`. */
  keyPrefix: string;
  windowMs: number;
  max: number;
  /** Per-request key suffix (e.g. the user id). */
  key: (c: Parameters<Parameters<typeof createMiddleware<AppEnv>>[0]>[0]) => string;
}

/**
 * Hono middleware enforcing a fixed-window limit against the D1 `rate_limit`
 * table. Returns 429 + `Retry-After` (seconds) when over. Read-then-upsert is
 * mildly racy under bursts (same as Better Auth's own approach) — acceptable for
 * abuse mitigation, not accounting.
 */
export function rateLimit(opts: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = `${opts.keyPrefix}:${opts.key(c)}`;
    const db = c.env.DB;

    const row = await db
      .prepare('SELECT count, last_request AS lastRequest FROM rate_limit WHERE key = ?')
      .bind(key)
      .first<RateRecord>();

    const now = Date.now();
    const decision = evaluateFixedWindow(row, now, opts.windowMs, opts.max);

    if (!decision.allowed) {
      c.header('Retry-After', String(Math.ceil(decision.retryAfterMs / 1000)));
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
        429,
      );
    }

    await db
      .prepare(
        `INSERT INTO rate_limit (id, key, count, last_request) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET count = excluded.count, last_request = excluded.last_request`,
      )
      .bind(crypto.randomUUID(), key, decision.count, decision.lastRequest)
      .run();

    await next();
  });
}
