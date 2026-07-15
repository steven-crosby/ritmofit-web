import type { Provider } from '@ritmofit/shared';

const SOUNDCLOUD_TRACK_URN = /^soundcloud:tracks:(\d+)$/;
const LEGACY_SOUNDCLOUD_TRACK_ID = /^\d+$/;

/**
 * Provider-track identifiers that are equivalent for exact-reference lookup.
 *
 * SoundCloud migrated numeric `id` values to `soundcloud:tracks:<digits>` URNs.
 * New imports persist the incoming URN unchanged; the numeric alias exists only
 * so those imports can still find rows written before the migration. All other
 * provider identifiers remain opaque and exact-only.
 */
export function providerTrackIdAliases(provider: Provider, providerTrackId: string): string[] {
  if (provider !== 'soundcloud') return [providerTrackId];

  const urnMatch = SOUNDCLOUD_TRACK_URN.exec(providerTrackId);
  if (urnMatch) return [providerTrackId, urnMatch[1]!];

  if (LEGACY_SOUNDCLOUD_TRACK_ID.test(providerTrackId)) {
    return [providerTrackId, `soundcloud:tracks:${providerTrackId}`];
  }

  return [providerTrackId];
}
