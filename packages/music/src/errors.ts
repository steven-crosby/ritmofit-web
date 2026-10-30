/**
 * Provider-failure boundary. A provider returning malformed JSON, an unexpected
 * token-response shape, or an HTML error page is an UPSTREAM failure — not a
 * client request error. Adapters raise `ProviderError` for these so `apps/api` can
 * map them to a 502 (provider unavailable) instead of leaking a raw 500 or, worse,
 * a misleading 422 "request body failed validation" (a `ZodError` from `.parse()`
 * on a provider response would otherwise hit the request-validation branch).
 */
import type { z } from 'zod';

export class ProviderError extends Error {
  readonly provider: string;
  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProviderError';
    this.provider = provider;
  }
}

/**
 * A paging cursor handed back by a client is not a continuation this adapter
 * issued (wrong host, wrong path or malformed). A client request error, not an
 * upstream failure: it deliberately does not extend `ProviderError` (502), and
 * the adapter rejects it before any token is sent.
 */
export class InvalidProviderCursorError extends Error {
  readonly provider: string;
  constructor(provider: string) {
    super(`Invalid ${provider} paging cursor.`);
    this.name = 'InvalidProviderCursorError';
    this.provider = provider;
  }
}

/**
 * The provider's request quota for this app is spent (Spotify 429 with
 * `error.reason: "QUOTA_EXCEEDED"`). Retrying only spends more of the same quota,
 * so callers surface it instead of retrying.
 */
export class ProviderQuotaExceededError extends ProviderError {
  constructor(provider: string) {
    super(provider, `${provider} quota exceeded (429 QUOTA_EXCEEDED).`);
    this.name = 'ProviderQuotaExceededError';
  }
}

/** True when a provider error body carries Spotify's quota reason. */
export function isQuotaExceededBody(body: string): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body) as { error?: { reason?: unknown } } | null;
    return parsed?.error?.reason === 'QUOTA_EXCEEDED';
  } catch {
    return false;
  }
}

/** Read a Response body as JSON, raising `ProviderError` on a non-JSON body. */
export async function readJson(
  res: { json(): Promise<unknown> },
  provider: string,
): Promise<unknown> {
  try {
    return await res.json();
  } catch (cause) {
    throw new ProviderError(provider, `${provider} returned a non-JSON response.`, { cause });
  }
}

/**
 * A playlist read crossed the paste-a-link occurrence ceiling. `reportedTotal`
 * is the provider's own count when it published one (Spotify `total`); cursor
 * providers leave it null so the message says "more than" the limit.
 */
export class PlaylistOverLimitError extends Error {
  readonly reportedTotal: number | null;
  readonly limit: number;
  constructor(reportedTotal: number | null, limit: number) {
    super(
      reportedTotal == null
        ? `Playlist has more than ${limit} songs.`
        : `Playlist has ${reportedTotal} songs. The limit is ${limit}.`,
    );
    this.name = 'PlaylistOverLimitError';
    this.reportedTotal = reportedTotal;
    this.limit = limit;
  }
}

/** Preview deadline or caller abort. Not a provider outage and not retried. */
export function abortError(): Error {
  const err = new Error('The playlist preview was aborted.');
  err.name = 'AbortError';
  return err;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/** Validate a provider payload, raising `ProviderError` (not a `ZodError`) on drift. */
export function parseProvider<T>(schema: z.ZodType<T>, data: unknown, provider: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ProviderError(provider, `${provider} returned an unexpected response shape.`, {
      cause: result.error,
    });
  }
  return result.data;
}
