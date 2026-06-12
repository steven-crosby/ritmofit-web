/**
 * Same-song matching (M2 slice 5) — provider-ID resolution.
 *
 * The provider-agnostic track model (`tracks` + many `track_provider_ids`) exists
 * so ONE song can hand off to whichever provider app the instructor opens live.
 * That only works if importing the same song from a second provider attaches its
 * ID to the *existing* track instead of forging a duplicate. The exact
 * `(provider, providerTrackId)` ref is handled by the DB unique constraint; this
 * module owns the fuzzy case — "is the SoundCloud result I'm importing the same
 * song as a Spotify track already in my library?" — by normalized title+artist and
 * a duration tolerance.
 *
 * Pure and conservative: a wrong merge is worse than a duplicate (it silently
 * rewrites a user's library), so we only match on a strong signal and never merge
 * into a track that already carries the candidate's provider.
 */
import type { Provider } from '@ritmofit/shared';

/** A library track reduced to what matching needs. */
export interface MatchableTrack {
  id: string;
  title: string;
  artist: string;
  durationMs: number | null;
  /** Providers already attached to this track. */
  providers: Provider[];
}

/** The candidate being imported. */
export interface MatchCandidate {
  provider: Provider;
  title: string;
  artist: string;
  durationMs: number | null;
}

/** Durations within this gap count as the same recording (encodes/edits drift a little). */
export const DURATION_TOLERANCE_MS = 4000;

/**
 * Normalize a title/artist for comparison: lowercase, strip diacritics, drop
 * parenthetical/bracketed noise (`(feat. X)`, `[Remastered]`), remove a trailing
 * ` - ... remix/version/edit/remaster` tail, strip punctuation, collapse space.
 */
export function normalizeForMatch(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // (feat. …), (live), …
    .replace(/\[[^\]]*\]/g, ' ') // [remastered], …
    .replace(/\s-\s.*(remaster|remix|version|edit|mix|mono|stereo).*$/i, ' ')
    .replace(/featuring|feat\.?|ft\.?/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ') // punctuation → space
    .trim()
    .replace(/\s+/g, ' ');
}

/** Do two optional durations agree within tolerance? Unknown on either side = no objection. */
function durationsCompatible(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return true;
  return Math.abs(a - b) <= DURATION_TOLERANCE_MS;
}

/**
 * Find an existing track that is the same song as `candidate` and does NOT already
 * carry the candidate's provider (so we can safely attach the new provider ID).
 * Returns the matched track's id, or null to create a fresh track.
 *
 * `tracks` should be the importing user's own library (matching is owner-scoped).
 */
export function findSameSongMatch(
  candidate: MatchCandidate,
  tracks: MatchableTrack[],
): string | null {
  const title = normalizeForMatch(candidate.title);
  const artist = normalizeForMatch(candidate.artist);
  if (!title || !artist) return null; // too little signal to risk a merge

  for (const t of tracks) {
    if (t.providers.includes(candidate.provider)) continue; // never double-attach a provider
    if (normalizeForMatch(t.title) !== title) continue;
    if (normalizeForMatch(t.artist) !== artist) continue;
    if (!durationsCompatible(t.durationMs, candidate.durationMs)) continue;
    return t.id;
  }
  return null;
}
