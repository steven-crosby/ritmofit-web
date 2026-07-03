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
import {
  providerCapabilities,
  type MusicConnectionView,
  type Provider,
  type TrackSearchResult,
} from '@ritmofit/shared';
import {
  addTrack,
  importPlaylist,
  importTrack,
  listConnections,
  listLikes,
  searchProvider,
} from '../lib/api.js';
import { formatDuration } from '../lib/class-summary.js';
import {
  DEFAULT_PROVIDER,
  PROVIDER_ORDER,
  providerConnectionState,
  providerLabel,
} from '../lib/providers.js';

/** A stable key for a candidate (provider + provider track id). */
const candidateKey = (r: TrackSearchResult) => `${r.provider}:${r.providerTrackId}`;

type Mode = 'search' | 'likes' | 'playlist';

export function TrackSearch({ classId, onAdded }: { classId: string; onAdded: () => void }) {
  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-candidate import state: which key is busy, and which keys were added.
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importingPlaylist, setImportingPlaylist] = useState(false);
  // Guards against a stale async fetch overwriting a newer one's results.
  const reqId = useRef(0);
  // Provider connection readiness — surfaced proactively so "search my Spotify"
  // reflects an expired/absent account *before* a failed likes fetch (audit #7,
  // cross-surface provider coherence). Best-effort: a failed fetch just hides it.
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const c = await listConnections();
        if (alive && c) setConnections(c);
      } catch {
        // Best-effort: readiness is a hint, not a blocker for catalog search.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const connectionState = connections
    ? providerConnectionState(
        provider,
        connections.find((c) => c.provider === provider),
        Date.now(),
      )
    : null;

  // "My likes" reads the caller's connected account; only providers with a
  // per-user integration support it. Catalog search stays available for all.
  const canUseLikes = providerCapabilities[provider].userLikes;
  // Playlist import is Spotify-only today (SoundCloud 501s, Apple Music has no
  // path); gate the mode so the UI never offers an import that always fails.
  const canImportPlaylist = providerCapabilities[provider].playlistImport;

  // If the selected provider can't serve the current mode, fall back to catalog
  // search so we never fire a request that would 501.
  useEffect(() => {
    if (mode === 'likes' && !canUseLikes) setMode('search');
    if (mode === 'playlist' && !canImportPlaylist) setMode('search');
  }, [mode, canUseLikes, canImportPlaylist]);

  // Fetch results on (mode, provider, query). Search debounces and clears on an
  // empty query; "My likes" fetches the caller's liked tracks (spends their token).
  useEffect(() => {
    const q = query.trim();
    if (mode === 'search' && q === '') {
      // Invalidate any in-flight request: bumping the generation makes a late
      // response fail its `id === reqId.current` guard, so a search that resolves
      // after the field was cleared can't repopulate stale results.
      reqId.current++;
      setResults(null);
      setSearching(false);
      setError(null);
      return;
    }
    // Don't fire a likes request for a provider that can't serve them; the reset
    // effect switches us back to search.
    if (mode === 'likes' && !canUseLikes) return;
    const id = ++reqId.current;
    setSearching(true);
    const run = async () => {
      try {
        const found =
          mode === 'likes' ? await listLikes(provider) : await searchProvider(provider, q);
        if (id === reqId.current) {
          setResults(found);
          setError(null);
        }
      } catch (e) {
        if (id === reqId.current) {
          setResults(null);
          setError(
            mode === 'likes'
              ? `Couldn’t load your ${providerLabel(provider)} likes — connect the account first (Connections).`
              : (e as Error).message,
          );
        }
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    };
    // Likes need no debounce; search waits for typing to settle.
    if (mode === 'likes') {
      void run();
      return;
    }
    if (mode === 'search') {
      const t = setTimeout(run, 300);
      return () => clearTimeout(t);
    }
  }, [mode, query, provider, canUseLikes]);

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

  const importList = async () => {
    if (!playlistUrl.trim()) return;
    setImportingPlaylist(true);
    setError(null);
    try {
      await importPlaylist(classId, playlistUrl);
      setPlaylistUrl('');
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImportingPlaylist(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-interactive/20 pt-4">
      <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Add a track</p>

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

      {/* Provider readiness — glyph + label, never color alone (05/11). A quiet
          positive when connected; the caution channel when the session expired
          (the one that needs action); a neutral hint when simply not connected,
          since catalog search still works without an account. */}
      {connectionState && connectionState !== 'catalog-only' && (
        <p role="status" className="flex items-center gap-1.5 font-ui text-xs">
          {connectionState === 'connected' ? (
            <>
              <span aria-hidden className="text-state-positive">
                ✓
              </span>
              <span className="text-text-tertiary">
                {providerLabel(provider)} connected — your likes are searchable
              </span>
            </>
          ) : connectionState === 'expired' ? (
            <>
              <span aria-hidden className="text-state-caution">
                ⊘
              </span>
              <span className="text-state-caution">
                {providerLabel(provider)} session expired — reconnect in Connections to search your
                library
              </span>
            </>
          ) : (
            <>
              <span aria-hidden className="text-text-tertiary">
                ○
              </span>
              <span className="text-text-tertiary">
                {providerLabel(provider)} not connected — connect it to search your likes
              </span>
            </>
          )}
        </p>
      )}

      {/* Mode toggle — search the catalog, or browse the caller's own likes (S3).
          "My likes" only appears for providers with a per-user integration. */}
      <div role="group" aria-label="Source" className="flex gap-1.5">
        {(['search', 'likes', 'playlist'] as Mode[])
          .filter((m) => (m !== 'likes' || canUseLikes) && (m !== 'playlist' || canImportPlaylist))
          .map((m) => {
            const selected = m === mode;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(m)}
                className={`rounded-pill px-3 py-1 font-ui text-xs ${
                  selected
                    ? 'bg-interactive/15 text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {m === 'search' ? 'Search' : m === 'playlist' ? 'Import Playlist' : 'My likes'}
              </button>
            );
          })}
      </div>

      {mode === 'search' && (
        <>
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
        </>
      )}

      {mode === 'playlist' && (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="playlist-url-input">
            Playlist URL
          </label>
          <input
            id="playlist-url-input"
            type="url"
            className="rounded-pill flex-1 border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
            placeholder={`Paste a ${providerLabel(provider)} playlist URL…`}
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={importList}
            disabled={importingPlaylist || !playlistUrl.trim()}
            className="rounded-pill rf-btn-primary px-3 py-1 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
          >
            {importingPlaylist ? 'Importing…' : 'Import'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-ui text-sm text-state-danger">
          {error}
        </p>
      )}

      {/* States. Idle (search, no query) invites; the rest reflect the fetch. */}
      {mode === 'playlist' ? (
        <p className="font-ui text-xs text-text-tertiary">
          Paste the URL of a public playlist to import all its tracks at once.
        </p>
      ) : mode === 'search' && query.trim() === '' ? (
        <p className="font-ui text-xs text-text-tertiary">
          Find a track to add — building the playlist is building the class.
        </p>
      ) : searching && results === null ? (
        <p className="font-ui text-xs text-text-tertiary">
          {mode === 'likes'
            ? `Loading your ${providerLabel(provider)} likes…`
            : `Searching ${providerLabel(provider)}…`}
        </p>
      ) : results && results.length === 0 ? (
        <p className="font-ui text-xs text-text-tertiary">
          {mode === 'likes'
            ? `No liked tracks on ${providerLabel(provider)}.`
            : `No results for “${query.trim()}” on ${providerLabel(provider)}.`}
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
                    <img
                      src={r.albumArtUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-11 w-11 shrink-0 rounded-card object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised text-text-tertiary"
                      aria-hidden
                    >
                      ♪
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-sm font-semibold text-text-primary">
                      {r.title}
                    </p>
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
                        : 'rf-btn-primary text-text-on-accent'
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
