/**
 * OAuth2 client-credentials ("app") token, cached in-isolate. Confidential clients
 * (Spotify, SoundCloud) mint a server-side app token with HTTP Basic auth and reuse
 * it until shortly before expiry. This was duplicated in both adapters — and had
 * already drifted (skew applied at different points, only one force-refreshed on a
 * 401) — so it lives here once. The adapter keeps its own request logic and calls
 * `invalidate()` to force a re-mint after a 401.
 */
import { z } from 'zod';
import type { FetchLike } from './provider.js';
import { readJson, parseProvider, ProviderError } from './errors.js';

// `btoa` is available in the Workers runtime and Node ≥18 (vitest). Declared here
// so the package needs no DOM/Workers ambient lib.
declare const btoa: (data: string) => string;

const DEFAULT_TTL_SEC = 3600;
const TOKEN_SKEW_MS = 30_000; // refresh a bit early to avoid edge-of-expiry 401s

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

export interface AppTokenConfig {
  /** Provider id, used for error labelling (`ProviderError.provider`). */
  provider: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  fetchImpl: FetchLike;
  /** Clock seam for token-expiry tests. */
  now?: () => number;
}

export class AppTokenCache {
  private cached: { value: string; expiresAtMs: number } | null = null;
  private readonly now: () => number;

  constructor(private readonly cfg: AppTokenConfig) {
    this.now = cfg.now ?? (() => Date.now());
  }

  /** Drop the cached token so the next `get()` re-mints (e.g. after a 401). */
  invalidate(): void {
    this.cached = null;
  }

  /** A valid app token, minting + caching on a miss. */
  async get(): Promise<string> {
    if (this.cached && this.now() < this.cached.expiresAtMs) return this.cached.value;

    const basic = btoa(`${this.cfg.clientId}:${this.cfg.clientSecret}`);
    const res = await this.cfg.fetchImpl(this.cfg.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      throw new ProviderError(
        this.cfg.provider,
        `${this.cfg.provider} token request failed (${res.status})`,
      );
    }
    const token = parseProvider(
      tokenResponseSchema,
      await readJson(res, this.cfg.provider),
      this.cfg.provider,
    );
    const ttlMs = (token.expires_in ?? DEFAULT_TTL_SEC) * 1000;
    this.cached = { value: token.access_token, expiresAtMs: this.now() + ttlMs - TOKEN_SKEW_MS };
    return token.access_token;
  }
}
