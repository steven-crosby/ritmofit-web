/**
 * The providers the web player can actually drive today, shared by Live Mode
 * (hands-free, `runtime.ts`) and Builder preview (manual, `preview.ts`). Grows
 * as adapter slices land (Spotify is next, after its playback-scope expansion).
 *
 * Both surfaces filter the instructor's connections to this registry, so a
 * connected-but-not-yet-playable provider reads honestly as "no connected
 * provider can play this" instead of passing selection and failing at prepare.
 * One registry, so the two surfaces never drift on which providers are playable.
 */
import { appleMusicAdapterFactory } from './apple-music-adapter.js';
import { soundcloudAdapterFactory } from './soundcloud-adapter.js';
import type { AdapterRegistry } from './types.js';

export const PLAYBACK_ADAPTERS: AdapterRegistry = {
  soundcloud: soundcloudAdapterFactory,
  apple_music: appleMusicAdapterFactory,
};
