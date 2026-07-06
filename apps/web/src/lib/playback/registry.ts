/**
 * The providers the web player can actually drive today, shared by Live Mode
 * (hands-free, `runtime.ts`) and Builder preview (manual, `preview.ts`). Grows
 * as adapter slices land (Spotify is next, after its playback-scope expansion).
 *
 * Both surfaces pass these as selection's `availableProviders`, so a
 * ref'd-but-not-yet-playable provider reads honestly as "no connected provider
 * can play this" instead of passing selection and failing at prepare. One
 * registry, so the two surfaces never drift on which providers are playable.
 */
import type { Provider } from '@ritmofit/shared';
import { appleMusicAdapterFactory } from './apple-music-adapter.js';
import { soundcloudAdapterFactory } from './soundcloud-adapter.js';
import type { AdapterRegistry } from './types.js';

export const PLAYBACK_ADAPTERS: AdapterRegistry = {
  soundcloud: soundcloudAdapterFactory,
  apple_music: appleMusicAdapterFactory,
};

/**
 * The registered providers as a list — the `availableProviders` selection gate.
 * Derived from `PLAYBACK_ADAPTERS` so the two never drift: a provider is a
 * playback candidate iff it has an adapter here.
 */
export const PLAYBACK_ADAPTER_PROVIDERS = Object.keys(PLAYBACK_ADAPTERS) as Provider[];
