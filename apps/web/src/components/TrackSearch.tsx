/**
 * Track search & import (design system `09`: "building the playlist *is* building
 * the class — a clear path to search/import", "stronger SoundCloud support"). Pick
 * a provider, search, and add a result in one click — the candidate is imported
 * into the caller's library (`POST /providers/track-import`) and attached to the
 * class by `trackId`. No BPM here (manual, per the music rules); album art is the
 * small 44px creative trigger, title/artist + duration carry the row.
 *
 * Backed by the live adapter or the dev mock, transparently (registry decides).
 * States: idle prompt · searching · empty · error · per-row import busy/added.
 */
import { useEffect, useRef, useState } from 'react';
import type { Provider, TrackSearchResult } from '@ritmofit/shared';
import { addTrack, importTrack, searchProvider } from '../lib/api.js';
import { formatDuration } from '../lib/class-summary.js';
import { DEFAULT_PROVIDER, PROVIDER_ORDER, providerLabel } from '../lib/providers.js';

/** A stable key for a candidate (provider + provider track id). */
const candidateKey = (r: TrackSearchResult) => `${r.provider}:${r.providerTrackId}`;

export function TrackSearch({ classId, onAdded }: { classId: string; onAdded: () => void }) {
  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-candidate import state: which key is busy, and which keys were added.
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  // Guards against a stale async search overwriting a newer one's results.
  const reqId = useRef(0);

  // Debounced live search on (query, provider); an empty query clears results.
  useEffect(() => {
    const q = query.trim();
    if (q === '') {
      setResults(null);
      setSearching(false);
      setError(null);
      return;
    }
    const id = ++reqId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchProvider(provider, q);
        if (id === reqId.current) {
          setResults(found);
          setError(null);
        }
      } catch (e) {
        if (id === reqId.current) setError((e as Error).message);
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, provider]);

  const add = async (candidate: TrackSearchResult) => {
    const key = candidateKey(candidate);
    setImportingKey(key);
    setError(null);
    try {
      const track = await importTrack(candidate.provider, candidate.providerTrackId);
      await addTrack(classId, { trackId: track.id, intensity: 'mod' });
      setAddedKeys((prev) => new Set(prev).add(key));
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImportingKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-interactive/20 pt-4">
      <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Search for a track</p>

      {/* Provider picker — SoundCloud first; cyan is the only "interactive" color. */}
      <div role="group" aria-label="Music provider" className="flex flex-wrap gap-1.5">
        {PROVIDER_ORDER.map((p) => {
          const selected = p === provider;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={selected}
              onClick={() => setProvider(p)}
              className={`rounded-pill border px-3 py-1 font-ui text-xs ${
                selected
                  ? 'border-interactive bg-interactive/15 text-text-primary'
                  : 'border-interactive/30 text-text-secondary hover:text-text-primary'
              }`}
            >
              {providerLabel(p)}
            </button>
          );
        })}
      </div>

      <label className="sr-only" htmlFor="track-search-input">
        Search {providerLabel(provider)}
      </label>
      <input
        id="track-search-input"
        type="search"
        className="rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
        placeholder={`Search ${providerLabel(provider)}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="font-ui text-sm text-intensity-all_out">{error}</p>}

      {/* States. Idle (no query) shows an invitation; the rest reflect the search. */}
      {query.trim() === '' ? (
        <p className="font-ui text-xs text-text-tertiary">
          Find a track to add — building the playlist is building the class.
        </p>
      ) : searching && results === null ? (
        <p className="font-ui text-xs text-text-tertiary">Searching {providerLabel(provider)}…</p>
      ) : results && results.length === 0 ? (
        <p className="font-ui text-xs text-text-tertiary">
          No results for “{query.trim()}” on {providerLabel(provider)}.
        </p>
      ) : (
        results && (
          <ul className="flex flex-col gap-1.5">
            {results.map((r) => {
              const key = candidateKey(r);
              const added = addedKeys.has(key);
              const busy = importingKey === key;
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 rounded-card bg-bg-base px-2 py-1.5"
                >
                  {/* 44px art — a small creative trigger, not a focal point (09). */}
                  {r.albumArtUrl ? (
                    <img src={r.albumArtUrl} alt="" className="h-11 w-11 shrink-0 rounded-card object-cover" />
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised text-text-tertiary"
                      aria-hidden
                    >
                      ♪
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-sm font-semibold text-text-primary">{r.title}</p>
                    <p className="truncate font-ui text-xs text-text-secondary">{r.artist}</p>
                  </div>
                  {r.durationMs != null && (
                    <span className="shrink-0 font-data text-xs text-text-tertiary">
                      {formatDuration(r.durationMs)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => add(r)}
                    disabled={busy || added}
                    aria-label={added ? `${r.title} added` : `Add ${r.title} by ${r.artist}`}
                    className={`shrink-0 rounded-pill px-3 py-1 font-ui text-xs font-semibold disabled:opacity-60 ${
                      added
                        ? 'bg-bg-raised text-text-tertiary'
                        : 'bg-brand text-text-on-accent'
                    }`}
                  >
                    {added ? 'Added ✓' : busy ? 'Adding…' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
