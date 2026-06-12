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

/** Read a Response body as JSON, raising `ProviderError` on a non-JSON body. */
export async function readJson(res: { json(): Promise<unknown> }, provider: string): Promise<unknown> {
  try {
    return await res.json();
  } catch (cause) {
    throw new ProviderError(provider, `${provider} returned a non-JSON response.`, { cause });
  }
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
