/**
 * Cross-provider resolution algorithm — the pure core behind
 * `POST /tracks/:id/resolve-provider`. A track added from a provider Ritmo can't
 * play in-app (e.g. Spotify today) is a dead end in Live Mode; this searches the
 * *playable* providers for the same song so the track can gain a playable ref.
 *
 * Kept pure (aside from the injected `search`) so the auto-attach-vs-confirm
 * decision — the part that matters — is unit-testable without the DB or a live
 * provider. The route wires `search` to `getMusicProvider(...).search(...)` and
 * performs the attach; this only decides *what* to attach or offer.
 */
import type { Provider, TrackSearchResult } from '@ritmofit/shared';
import { findSameSongMatch, type MatchableTrack } from './same-song.js';

/** Search a provider's catalog. Injected so the algorithm stays testable. */
export type ProviderSearch = (provider: Provider, query: string) => Promise<TrackSearchResult[]>;

/** At most this many candidates per provider are kept for the confirm picker. */
export const MAX_CANDIDATES_PER_PROVIDER = 5;

/**
 * Either a strong same-song match to auto-attach, or the candidates to confirm.
 * `candidates` may be empty (nothing found on any requested provider).
 */
export type ResolveOutcome =
  | { kind: 'match'; provider: Provider; candidate: TrackSearchResult }
  | { kind: 'candidates'; candidates: TrackSearchResult[] };

/**
 * For each requested provider the track does NOT already carry, search its
 * catalog and return the first *strong* same-song match (the conservative
 * `findSameSongMatch` bar: normalized title+artist + duration tolerance) to
 * auto-attach. If none matches strongly, collect up to
 * `MAX_CANDIDATES_PER_PROVIDER` per provider for the caller to confirm. A
 * provider whose search throws (unconfigured / unreachable) is skipped, never
 * fatal — resolution is best-effort across providers.
 */
export async function resolveTrackProvider(
  track: MatchableTrack,
  providers: readonly Provider[],
  search: ProviderSearch,
): Promise<ResolveOutcome> {
  const have = new Set(track.providers);
  const candidates: TrackSearchResult[] = [];

  for (const provider of providers) {
    if (have.has(provider)) continue; // never re-attach a provider the track has
    let results: TrackSearchResult[];
    try {
      results = await search(provider, `${track.title} ${track.artist}`);
    } catch {
      continue;
    }
    const own = results.filter((r) => r.provider === provider);
    const match = own.find((r) => findSameSongMatch(r, [track]) === track.id);
    if (match) return { kind: 'match', provider, candidate: match };
    candidates.push(...own.slice(0, MAX_CANDIDATES_PER_PROVIDER));
  }

  return { kind: 'candidates', candidates };
}
