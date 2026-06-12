/**
 * Static mock provider catalog — backs the **dev-only** mock-track seam (step 9),
 * so the full builder flow is exercisable with zero provider credentials. This is
 * the interface M2's real provider adapters replace; nothing here calls a network
 * and no BPM is supplied (manual in M1, per the music rules).
 */
import type { TrackSearchResult } from '@ritmofit/shared';

const CATALOG: readonly TrackSearchResult[] = [
  { provider: 'soundcloud', providerTrackId: 'sc-baiana', providerUri: 'https://soundcloud.com/bakermat/baiana', title: 'Baianá', artist: 'Bakermat', albumArtUrl: null, durationMs: 180000 },
  { provider: 'soundcloud', providerTrackId: 'sc-instinct', providerUri: 'https://soundcloud.com/x/instinct', title: 'Instinct', artist: 'Lane 8', albumArtUrl: null, durationMs: 240000 },
  { provider: 'spotify', providerTrackId: 'sp-titanium', providerUri: 'spotify:track:titanium', title: 'Titanium', artist: 'David Guetta', albumArtUrl: null, durationMs: 245000 },
  { provider: 'spotify', providerTrackId: 'sp-levels', providerUri: 'spotify:track:levels', title: 'Levels', artist: 'Avicii', albumArtUrl: null, durationMs: 203000 },
  { provider: 'apple_music', providerTrackId: 'am-wakeme', providerUri: 'https://music.apple.com/wakemeup', title: 'Wake Me Up', artist: 'Avicii', albumArtUrl: null, durationMs: 247000 },
  { provider: 'apple_music', providerTrackId: 'am-clarity', providerUri: 'https://music.apple.com/clarity', title: 'Clarity', artist: 'Zedd', albumArtUrl: null, durationMs: 271000 },
];

/** Case-insensitive substring match on title/artist, optionally filtered by provider. */
export function searchMockCatalog(query: string, provider?: string): TrackSearchResult[] {
  const q = query.trim().toLowerCase();
  return CATALOG.filter((t) => {
    if (provider && t.provider !== provider) return false;
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });
}

/** Find a single catalog candidate by its provider reference. */
export function findMockCandidate(
  provider: string,
  providerTrackId: string,
): TrackSearchResult | undefined {
  return CATALOG.find((t) => t.provider === provider && t.providerTrackId === providerTrackId);
}
