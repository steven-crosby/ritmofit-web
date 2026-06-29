/**
 * Provider selection. Given a provider id and the env, return the adapter to use:
 *
 * - `MOCK_PROVIDERS=true` (local dev) → the static mock catalog for every provider,
 *   so the builder runs with zero credentials.
 * - otherwise → the live adapter when that provider's app credentials are present.
 *   Missing credentials surface as typed HTTP errors the route renders.
 *
 * Keeping selection here (not in `packages/music`) means the pure adapters stay
 * free of app env/secrets.
 */
import type { Provider, TrackSearchResult } from '@ritmofit/shared';
import {
  createSoundCloudProvider,
  createSpotifyProvider,
  createAppleMusicProvider,
  type MusicProvider,
} from '@ritmofit/music';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { boundFetch } from '../fetch.js';
import { soundcloudCreds, spotifyCreds, appleMusicCreds } from './provider-config.js';
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

  async getPlaylist(): Promise<TrackSearchResult[]> {
    return []; // fallback implementation
  }
}

/**
 * Live adapters are memoized per (provider + credential) for the lifetime of the
 * Worker isolate. Each adapter owns an `AppTokenCache`; without this, a fresh
 * adapter per request meant the app token rarely survived between requests, forcing
 * an extra Basic-auth token mint (and latency) on most search/import calls. The key
 * includes a credential fingerprint so a credential change (or a test using
 * different creds) yields a distinct adapter. Mock adapters are cheap and toggle on
 * an env flag, so they're never cached.
 */
const adapterCache = new Map<string, MusicProvider>();

function memoize(key: string, build: () => MusicProvider): MusicProvider {
  const hit = adapterCache.get(key);
  if (hit) return hit;
  const adapter = build();
  adapterCache.set(key, adapter);
  return adapter;
}

export async function getMusicProvider(provider: Provider, env: Env): Promise<MusicProvider> {
  if (env.MOCK_PROVIDERS === 'true') {
    return new MockMusicProvider(provider);
  }

  // Credential presence (and the 503-when-missing) lives in provider-config.ts so
  // the secret checks aren't duplicated between here and the OAuth/likes routes.
  // Resolve creds first (may throw 503) — only a configured provider gets cached.
  switch (provider) {
    case 'soundcloud': {
      const creds = soundcloudCreds(env);
      return memoize(`soundcloud:${creds.clientId}`, () =>
        createSoundCloudProvider({ ...creds, fetchImpl: boundFetch }),
      );
    }
    case 'spotify': {
      const creds = spotifyCreds(env);
      return memoize(`spotify:${creds.clientId}`, () =>
        createSpotifyProvider({ ...creds, fetchImpl: boundFetch }),
      );
    }
    case 'apple_music': {
      const creds = await appleMusicCreds(env);
      const cacheKey = env.APPLE_MUSIC_DEVELOPER_TOKEN
        ? `apple_music:${creds.developerToken}`
        : `apple_music:${env.APPLE_MUSIC_TEAM_ID}:${env.APPLE_MUSIC_KEY_ID}`;
      return memoize(cacheKey, () => createAppleMusicProvider({ ...creds, fetchImpl: boundFetch }));
    }
    default:
      throw new HttpError(501, 'NOT_IMPLEMENTED', `Provider '${provider}' is not yet integrated.`);
  }
}
