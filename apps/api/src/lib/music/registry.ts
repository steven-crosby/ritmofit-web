/**
 * Provider selection. Given a provider id and the env, return the adapter to use:
 *
 * - `MOCK_PROVIDERS=true` (local dev) → the static mock catalog for every provider,
 *   so the builder runs with zero credentials.
 * - otherwise → the live adapter when its credentials are present; SoundCloud is
 *   the only one integrated so far. Missing creds / not-yet-integrated providers
 *   surface as typed HTTP errors the route renders.
 *
 * Keeping selection here (not in `packages/music`) means the pure adapters stay
 * free of app env/secrets.
 */
import type { Provider, TrackSearchResult } from '@ritmofit/shared';
import { createSoundCloudProvider, type MusicProvider } from '@ritmofit/music';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { searchMockCatalog, findMockCandidate } from '../mock-catalog.js';

/** Adapter that serves the dev mock catalog through the `MusicProvider` interface. */
class MockMusicProvider implements MusicProvider {
  constructor(readonly provider: Provider) {}

  async search(query: string): Promise<TrackSearchResult[]> {
    return searchMockCatalog(query, this.provider);
  }

  async lookup(providerTrackId: string): Promise<TrackSearchResult | null> {
    return findMockCandidate(this.provider, providerTrackId) ?? null;
  }
}

export function getMusicProvider(provider: Provider, env: Env): MusicProvider {
  if (env.MOCK_PROVIDERS === 'true') {
    return new MockMusicProvider(provider);
  }

  if (provider === 'soundcloud') {
    if (!env.SOUNDCLOUD_CLIENT_ID || !env.SOUNDCLOUD_CLIENT_SECRET) {
      throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'SoundCloud is not configured.');
    }
    return createSoundCloudProvider({
      clientId: env.SOUNDCLOUD_CLIENT_ID,
      clientSecret: env.SOUNDCLOUD_CLIENT_SECRET,
      fetchImpl: fetch,
    });
  }

  throw new HttpError(501, 'NOT_IMPLEMENTED', `Provider '${provider}' is not yet integrated.`);
}
