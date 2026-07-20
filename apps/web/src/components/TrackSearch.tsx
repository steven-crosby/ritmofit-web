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
  type ProviderPlaylistSummary,
  type Provider,
  type TrackSearchResult,
} from '@ritmofit/shared';
import {
  addTrack,
  importPlaylist,
  listPlaylistTracks,
  listPlaylists,
  importTrack,
  listConnections,
  listLikes,
  searchProvider,
  ApiError,
} from '../lib/api.js';
import { formatDuration } from '../lib/class-summary.js';
import {
  DEFAULT_PROVIDER,
  PROVIDER_ORDER,
  providerCapabilityTruth,
  providerConnectionState,
  providerHandoffHref,
  providerLabel,
  providerPlaylistHref,
} from '../lib/providers.js';

/** A stable key for a candidate (provider + provider track id). */
const candidateKey = (r: TrackSearchResult) => `${r.provider}:${r.providerTrackId}`;

type Mode = 'search' | 'likes' | 'saved_playlists' | 'playlist';

/**
 * A concise, screen-reader-only summary of the current browse outcome — mirrored
 * from the visible micro-labels plus the result *count* that sighted users read
 * straight off the list. Rendered in an always-mounted `role="status"` region so
 * `aria-live` announces each idle → searching → results / empty transition; the
 * visible labels live outside any live region, so without this the whole
 * searching→results handoff (and how many results arrived) is silent to AT.
 *
 * "No results" keys on a *settled empty array* only (never `results === null`), and
 * a new query resets `results` to null first, so a user mid-typing can't hear a
 * stale count or a premature "No results" before their fetch settles.
 */
export function browseAnnouncement(input: {
  mode: Mode;
  providerName: string;
  query: string;
  searching: boolean;
  results: TrackSearchResult[] | null;
  loadingSavedPlaylists: boolean;
  savedPlaylists: ProviderPlaylistSummary[] | null;
  selectedPlaylist: ProviderPlaylistSummary | null;
}): string {
  const {
    mode,
    providerName,
    query,
    searching,
    results,
    loadingSavedPlaylists,
    savedPlaylists,
    selectedPlaylist,
  } = input;
  const plural = (n: number) => (n === 1 ? '' : 's');

  // Playlist-URL import has no fetched result list to summarize.
  if (mode === 'playlist') return '';

  // Saved-playlists index (before a playlist is opened).
  if (mode === 'saved_playlists' && !selectedPlaylist) {
    if (loadingSavedPlaylists) return `Loading your ${providerName} playlists…`;
    if (savedPlaylists === null) return ''; // unloaded / error (error → role="alert")
    if (savedPlaylists.length === 0) return `No saved playlists found on ${providerName}.`;
    return `${savedPlaylists.length} saved playlist${plural(savedPlaylists.length)} on ${providerName}.`;
  }

  // Opened playlist still loading its tracks — named, so AT hears which one.
  if (mode === 'saved_playlists' && selectedPlaylist && searching && results === null) {
    return `Loading tracks from ${selectedPlaylist.name}…`;
  }

  // Idle search: nothing typed, nothing fetched.
  if (mode === 'search' && query === '') return '';

  // In-flight — announced before any settled empty/count (a re-fetch nulls results).
  if (searching && results === null) {
    return mode === 'likes' ? `Loading your ${providerName} likes…` : `Searching ${providerName}…`;
  }

  // Settled empty *array* only — never results === null.
  if (results && results.length === 0) {
    if (mode === 'likes') return `No liked tracks on ${providerName}.`;
    if (mode === 'saved_playlists') return `This playlist has no tracks.`;
    return `No results for "${query}" on ${providerName}.`;
  }

  // Settled with results — surface the count sighted users read from the list.
  if (results && results.length > 0) {
    const n = results.length;
    if (mode === 'likes') return `${n} liked track${plural(n)} on ${providerName}.`;
    if (mode === 'saved_playlists') return `${n} track${plural(n)} in this playlist.`;
    return `${n} result${plural(n)} for "${query}" on ${providerName}.`;
  }

  return '';
}

/**
 * Classify a saved-playlist drill-in failure so an *expected limitation* reads
 * differently from a *broken load*. The API client (`../lib/api.ts`) surfaces only
 * `error.message` — it drops `error.code` — so we branch on the message text. These
 * strings are the source of truth in the backend; see
 * `apps/api/src/lib/music/user-playlists.ts`:
 *   - 403 PROVIDER_FORBIDDEN → "<Provider> only allows opening playlists you own or
 *     collaborate on."                                    → 'forbidden' (retry can't help)
 *   - 409 REAUTH_REQUIRED    → "Reconnect your <Provider> account."    ┐
 *   - 409 NOT_CONNECTED      → "Connect your <Provider> account first." ┘ → 'reauth'
 *   - anything else (e.g. 503 "<Provider> is not configured.")         → 'generic'
 *
 * The reauth match is case-insensitive so the capitalized NOT_CONNECTED string
 * ("Connect your …") classifies as reauth rather than falling through to generic.
 */
export function classifyPlaylistDrillInError(
  message: string,
  code?: string,
): 'forbidden' | 'reauth' | 'generic' {
  if (code === 'PROVIDER_FORBIDDEN') return 'forbidden';
  if (code === 'REAUTH_REQUIRED' || code === 'NOT_CONNECTED') return 'reauth';
  if (/own or collaborate on/i.test(message)) return 'forbidden';
  if (/^(re)?connect your /i.test(message)) return 'reauth';
  return 'generic';
}

export function TrackSearch({
  classId,
  onAdded,
}: {
  classId: string;
  onAdded: (classTrackId?: string) => void;
}) {
  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistErrorCode, setPlaylistErrorCode] = useState<string | undefined>();
  // Per-candidate import state: which key is busy, and which keys were added.
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importingPlaylist, setImportingPlaylist] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<ProviderPlaylistSummary[] | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<ProviderPlaylistSummary | null>(null);
  const [loadingSavedPlaylists, setLoadingSavedPlaylists] = useState(false);
  const [importingAllFromPlaylist, setImportingAllFromPlaylist] = useState(false);
  // Once a bulk add has run, keep its outcome beside the playlist instead of
  // silently treating a partial batch as success. The counts themselves derive
  // from `addedKeys`, so a per-row retry also advances the same honest ledger.
  const [bulkImportAttempted, setBulkImportAttempted] = useState(false);
  // Bumped by the playlist-index "Try again" affordance to re-run the list fetch.
  const [reloadKey, setReloadKey] = useState(0);
  // Guards against a stale async fetch overwriting a newer one's results.
  const reqId = useRef(0);
  // Provider connection readiness — surfaced proactively so "search my Spotify"
  // reflects an expired/absent account *before* a failed likes fetch (audit #7,
  // cross-surface provider coherence). Best-effort: a failed fetch just hides it.
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const c = await listConnections();
        if (alive && c) {
          setConnections(c);
          setConnectionStatus('ready');
        }
      } catch {
        // Best-effort: readiness is a hint, not a blocker for catalog search.
        if (alive) setConnectionStatus('error');
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
  const providerTruth = providerCapabilityTruth(
    provider,
    connections?.find((c) => c.provider === provider),
    Date.now(),
    connectionStatus === 'ready'
      ? 'verified'
      : connectionStatus === 'loading'
        ? 'checking'
        : 'unverified',
  );

  // "My likes" reads the caller's connected account; only providers with a
  // per-user integration support it. Catalog search stays available for all.
  const canUseLikes = providerCapabilities[provider].userLikes;
  const canImportPlaylist = providerCapabilities[provider].playlistImport;
  const canBrowseSavedPlaylists = providerCapabilities[provider].savedPlaylists;

  // If the selected provider can't serve the current mode, fall back to catalog
  // search so we never fire a request that would 501.
  useEffect(() => {
    if (mode === 'likes' && !canUseLikes) setMode('search');
    if (mode === 'playlist' && !canImportPlaylist) setMode('search');
    if (mode === 'saved_playlists' && !canBrowseSavedPlaylists) setMode('search');
  }, [mode, canUseLikes, canImportPlaylist, canBrowseSavedPlaylists]);

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
    // Don't fire modes the provider cannot serve; reset effect switches to search.
    if (mode === 'likes' && !canUseLikes) return;
    if (mode === 'saved_playlists' && !canBrowseSavedPlaylists) return;
    if (mode === 'saved_playlists') return;
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
  }, [mode, query, provider, canUseLikes, canBrowseSavedPlaylists]);

  useEffect(() => {
    if (mode !== 'saved_playlists') return;
    if (!canBrowseSavedPlaylists) return;
    setSelectedPlaylist(null);
    setResults(null);
    setBulkImportAttempted(false);
    setLoadingSavedPlaylists(true);
    setError(null);
    let alive = true;
    void (async () => {
      try {
        const rows = await listPlaylists(provider);
        if (!alive) return;
        setSavedPlaylists(rows);
      } catch {
        if (!alive) return;
        setSavedPlaylists(null);
        setError(`Couldn’t load your ${providerLabel(provider)} playlists — reconnect if needed.`);
      } finally {
        if (alive) setLoadingSavedPlaylists(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, provider, canBrowseSavedPlaylists, reloadKey]);

  const openSavedPlaylist = async (playlist: ProviderPlaylistSummary) => {
    setSelectedPlaylist(playlist);
    setSearching(true);
    setError(null);
    setPlaylistErrorCode(undefined);
    setResults(null);
    setAddedKeys(new Set());
    setBulkImportAttempted(false);
    try {
      setResults(await listPlaylistTracks(provider, playlist.playlistId));
    } catch (e) {
      setError((e as Error).message);
      setPlaylistErrorCode(e instanceof ApiError ? e.code : undefined);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const importAll = async () => {
    if (!results || results.length === 0 || importingKey !== null || importingAllFromPlaylist)
      return;
    const remaining = results.filter((candidate) => !addedKeys.has(candidateKey(candidate)));
    if (remaining.length === 0) return;
    setImportingAllFromPlaylist(true);
    setBulkImportAttempted(true);
    setError(null);
    const CONCURRENCY = 4;
    const pending = [...remaining];
    const newAdded = new Set(addedKeys);
    let addedThisRun = 0;
    try {
      while (pending.length > 0) {
        const batch = pending.splice(0, CONCURRENCY);
        await Promise.all(
          batch.map(async (candidate) => {
            const key = candidateKey(candidate);
            if (newAdded.has(key)) return;
            try {
              const track = await importTrack(candidate.provider, candidate.providerTrackId);
              await addTrack(classId, { trackId: track.id, intensity: 'mod' });
              newAdded.add(key);
              addedThisRun += 1;
            } catch {
              // Best-effort: a single failing track doesn't abort the batch.
            }
          }),
        );
      }
      setAddedKeys(newAdded);
      if (addedThisRun > 0) onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImportingAllFromPlaylist(false);
    }
  };

  const add = async (candidate: TrackSearchResult) => {
    if (importingAllFromPlaylist) return;
    const key = candidateKey(candidate);
    setImportingKey(key);
    setError(null);
    try {
      const track = await importTrack(candidate.provider, candidate.providerTrackId);
      const classTrack = await addTrack(classId, { trackId: track.id, intensity: 'mod' });
      setAddedKeys((prev) => new Set(prev).add(key));
      onAdded(classTrack.id);
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

  // Screen-reader summary of the browse outcome — see browseAnnouncement.
  const announcement = browseAnnouncement({
    mode,
    providerName: providerLabel(provider),
    query: query.trim(),
    searching,
    results,
    loadingSavedPlaylists,
    savedPlaylists,
    selectedPlaylist,
  });
  const playlistTrackCount = results?.length ?? 0;
  const addedPlaylistTrackCount =
    results?.filter((candidate) => addedKeys.has(candidateKey(candidate))).length ?? 0;
  const remainingPlaylistTrackCount = playlistTrackCount - addedPlaylistTrackCount;

  const bulkImportOutcome =
    bulkImportAttempted && playlistTrackCount > 0
      ? remainingPlaylistTrackCount === 0
        ? `Added all ${playlistTrackCount} ${playlistTrackCount === 1 ? 'track' : 'tracks'}.`
        : `Added ${addedPlaylistTrackCount} of ${playlistTrackCount} tracks. ${remainingPlaylistTrackCount} couldn’t be added — retry the remaining ${remainingPlaylistTrackCount === 1 ? 'track' : 'tracks'}.`
      : null;

  // The importable candidate list — shared by catalog/likes search and the opened
  // saved-playlist drill-in so both render an identical row treatment.
  const renderTrackList = (list: TrackSearchResult[]) => (
    <ul className="flex flex-col gap-1.5">
      {list.map((r) => {
        const key = candidateKey(r);
        const sourceHref = providerHandoffHref(r.provider, r.providerUri);
        const added = addedKeys.has(key);
        const busy = importingKey === key;
        const bulkBusy = importingAllFromPlaylist && !added;
        return (
          <li key={key} className="flex items-center gap-3 rounded-card bg-bg-base px-2 py-1.5">
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
              <p className="truncate font-ui text-sm font-semibold text-text-primary">{r.title}</p>
              <p className="truncate font-ui text-xs text-text-secondary">{r.artist}</p>
              {sourceHref && (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex rounded-control font-ui text-[11px] font-semibold text-interactive hover:text-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
                  aria-label={`Open ${r.title} on ${providerLabel(r.provider)}`}
                >
                  Source: {providerLabel(r.provider)} ↗
                </a>
              )}
            </div>
            {r.durationMs != null && (
              <span className="shrink-0 font-data text-xs text-text-tertiary">
                {formatDuration(r.durationMs)}
              </span>
            )}
            <button
              type="button"
              onClick={() => add(r)}
              disabled={busy || bulkBusy || added}
              aria-busy={busy || bulkBusy}
              aria-label={added ? `${r.title} added` : `Add ${r.title} by ${r.artist}`}
              className={`min-h-11 shrink-0 rounded-pill px-3 font-ui text-xs font-semibold disabled:opacity-60 ${
                added ? 'bg-bg-raised text-text-tertiary' : 'rf-btn-primary text-text-on-accent'
              }`}
            >
              {added ? 'Added ✓' : busy || bulkBusy ? 'Adding…' : 'Add'}
            </button>
          </li>
        );
      })}
    </ul>
  );

  // Drill-in failure, classified so an expected limitation (you don't own this
  // playlist / must reconnect) reads as calm caution with no retry, while a genuine
  // load failure reads as danger with a retry. All keep role="alert" (announced on
  // the user's Open click). See classifyPlaylistDrillInError.
  const renderDrillInError = (selected: ProviderPlaylistSummary, message: string) => {
    const kind = classifyPlaylistDrillInError(message, playlistErrorCode);
    if (kind === 'generic') {
      return (
        <p role="alert" className="flex flex-col gap-1 font-ui text-sm text-state-danger">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => void openSavedPlaylist(selected)}
            className="min-h-11 self-start rounded-pill border border-interactive/35 px-3 font-ui text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            Try again
          </button>
        </p>
      );
    }
    return (
      <p role="alert" className="flex items-start gap-1.5 font-ui text-sm text-state-caution">
        <span aria-hidden className="pt-0.5">
          ⊘
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span>{message}</span>
          {kind === 'forbidden' && (
            <span className="text-text-tertiary">
              Open one of your own playlists, or add it under Import Playlist URL instead.
            </span>
          )}
        </span>
      </p>
    );
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
              className={`min-h-11 rounded-pill border px-3 py-1 font-ui text-xs ${
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
      {connectionStatus === 'error' ? (
        <p role="status" className="flex items-center gap-1.5 font-ui text-xs text-text-tertiary">
          <span aria-hidden>?</span>
          <span>
            {providerLabel(provider)} account status is unavailable. Catalog search still works.
          </span>
        </p>
      ) : connectionState && connectionState !== 'catalog-only' ? (
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
      ) : null}

      <div
        className="grid gap-1 rounded-card border border-interactive/10 bg-bg-base p-2 sm:grid-cols-3"
        aria-label={`${providerLabel(provider)} capability summary`}
      >
        {(
          [
            ['Catalog', providerTruth.catalog],
            ['Library', providerTruth.library],
            ['Playback', providerTruth.playback],
          ] as const
        ).map(([label, capability]) => (
          <div
            key={label}
            className="flex min-w-0 items-baseline justify-between gap-2 font-ui sm:block sm:text-center"
          >
            <p className="shrink-0 text-[10px] uppercase tracking-wide text-text-tertiary">
              {label}
            </p>
            <p
              className={`min-w-0 text-right text-[11px] sm:mt-0.5 sm:text-center ${
                capability.state === 'ready'
                  ? 'text-state-positive'
                  : capability.state === 'unverified' || capability.state === 'checking'
                    ? 'text-text-tertiary'
                    : 'text-state-caution'
              }`}
            >
              {capability.label}
            </p>
          </div>
        ))}
      </div>

      {/* Mode toggle — search the catalog, or browse the caller's own likes (S3).
          "My likes" only appears for providers with a per-user integration. */}
      <div role="group" aria-label="Source" className="flex flex-wrap gap-1.5">
        {(['search', 'likes', 'saved_playlists', 'playlist'] as Mode[])
          .filter(
            (m) =>
              (m !== 'likes' || canUseLikes) &&
              (m !== 'playlist' || canImportPlaylist) &&
              (m !== 'saved_playlists' || canBrowseSavedPlaylists),
          )
          .map((m) => {
            const selected = m === mode;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(m)}
                className={`min-h-11 rounded-pill px-3 py-1 font-ui text-xs ${
                  selected
                    ? 'bg-interactive/15 text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {m === 'search'
                  ? 'Search'
                  : m === 'playlist'
                    ? 'Import Playlist URL'
                    : m === 'saved_playlists'
                      ? 'Saved playlists'
                      : 'My likes'}
              </button>
            );
          })}
      </div>

      <aside
        className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-interactive/20 bg-interactive/5 px-3 py-2"
        aria-label="Track destination"
      >
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
          Destination
        </span>
        <span className="min-w-0 text-right font-ui text-xs text-text-secondary">
          <strong className="font-semibold text-text-primary">Current class</strong>
          {addedKeys.size > 0 && ` · ${addedKeys.size} added this session`}
        </span>
      </aside>

      {mode === 'saved_playlists' && selectedPlaylist && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedPlaylist(null);
              setResults(null);
              setBulkImportAttempted(false);
            }}
            className="min-h-11 rounded-pill border border-interactive/30 px-3 font-ui text-xs text-text-secondary hover:text-text-primary"
          >
            Back to playlists
          </button>
          <p className="min-w-0 flex-1 truncate font-ui text-xs text-text-secondary">
            {selectedPlaylist.name}
          </p>
          {results && results.length > 0 && (
            <button
              type="button"
              onClick={() => void importAll()}
              disabled={
                importingAllFromPlaylist ||
                importingKey !== null ||
                remainingPlaylistTrackCount === 0
              }
              aria-busy={importingAllFromPlaylist || importingKey !== null}
              aria-label={
                remainingPlaylistTrackCount === 0
                  ? `All ${results.length} tracks from ${selectedPlaylist.name} added`
                  : addedPlaylistTrackCount > 0
                    ? `Retry ${remainingPlaylistTrackCount} remaining ${remainingPlaylistTrackCount === 1 ? 'track' : 'tracks'} from ${selectedPlaylist.name}`
                    : `Import all ${results.length} tracks from ${selectedPlaylist.name}`
              }
              className="min-h-11 shrink-0 rounded-pill rf-btn-primary px-3 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50"
            >
              {importingAllFromPlaylist
                ? 'Importing…'
                : importingKey !== null
                  ? 'Adding track…'
                  : remainingPlaylistTrackCount === 0
                    ? `All ${results.length} added`
                    : addedPlaylistTrackCount > 0
                      ? `Retry ${remainingPlaylistTrackCount} remaining`
                      : `Import all ${results.length}`}
            </button>
          )}
        </div>
      )}

      {mode === 'saved_playlists' && selectedPlaylist && bulkImportOutcome && (
        <p
          role="status"
          aria-live="polite"
          className={`flex items-start gap-1.5 font-ui text-xs ${
            remainingPlaylistTrackCount === 0 ? 'text-state-positive' : 'text-state-caution'
          }`}
        >
          <span aria-hidden>{remainingPlaylistTrackCount === 0 ? '✓' : '!'}</span>
          <span>{bulkImportOutcome}</span>
        </p>
      )}

      {mode === 'search' && (
        <>
          <label className="sr-only" htmlFor="track-search-input">
            Search {providerLabel(provider)}
          </label>
          <input
            id="track-search-input"
            type="search"
            className="min-h-11 rounded-pill border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary"
            placeholder={`Search ${providerLabel(provider)}…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Reset to null (not []) before the next fetch so the live region
              // announces "Searching…" during the re-fetch — never a stale count or
              // a premature "No results" for a query that hasn't settled yet.
              setResults(null);
            }}
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
            className="min-h-11 flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary"
            placeholder={`Paste a ${providerLabel(provider)} playlist URL…`}
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={importList}
            disabled={importingPlaylist || !playlistUrl.trim()}
            className="min-h-11 rounded-pill rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
          >
            {importingPlaylist ? 'Importing…' : 'Import'}
          </button>
        </div>
      )}

      {/* Saved-playlists renders its own contextual error (index load vs drill-in),
          so suppress the generic alert there to avoid a duplicate announcement. */}
      {error && mode !== 'saved_playlists' && (
        <p role="alert" className="font-ui text-sm text-state-danger">
          {error}
        </p>
      )}

      {/* Always-mounted live region: mirrors the browse outcome (incl. result
          count) to assistive tech, since the visible labels below aren't live. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {/* States. Idle (search, no query) invites; the rest reflect the fetch. */}
      {mode === 'playlist' ? (
        <p className="font-ui text-xs text-text-tertiary">
          Paste the URL of a public playlist to import all its tracks at once.
        </p>
      ) : mode === 'saved_playlists' && !selectedPlaylist ? (
        // Playlist index: loading · load-failed (retryable) · list · truly-empty.
        // `savedPlaylists === null` without an error is the pre-fetch tick, not a
        // failure — treat it as loading so a failed load never flashes prematurely.
        loadingSavedPlaylists || (savedPlaylists === null && !error) ? (
          <p className="font-ui text-xs text-text-tertiary">
            Loading your {providerLabel(provider)} playlists…
          </p>
        ) : savedPlaylists === null ? (
          <p role="alert" className="flex flex-col gap-1 font-ui text-sm text-state-danger">
            <span>{error ?? `Couldn’t load your ${providerLabel(provider)} playlists.`}</span>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="min-h-11 self-start rounded-pill border border-interactive/35 px-3 font-ui text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              Try again
            </button>
          </p>
        ) : savedPlaylists.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {savedPlaylists.map((playlist) => (
              <li
                key={`${playlist.provider}:${playlist.playlistId}`}
                className="flex items-center gap-3 rounded-card bg-bg-base px-2 py-1.5"
              >
                {playlist.coverImageUrl ? (
                  <img
                    src={playlist.coverImageUrl}
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
                    ▤
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-semibold text-text-primary">
                    {playlist.name}
                  </p>
                  <p className="truncate font-ui text-xs text-text-secondary">
                    {playlist.ownerName ?? providerLabel(provider)} · {playlist.trackCount} tracks
                  </p>
                  {providerPlaylistHref(playlist.provider, playlist.providerUri) && (
                    <a
                      href={providerPlaylistHref(playlist.provider, playlist.providerUri)!}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex rounded-control font-ui text-[11px] font-semibold text-interactive hover:text-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
                      aria-label={`Open ${playlist.name} on ${providerLabel(playlist.provider)}`}
                    >
                      Source: {providerLabel(playlist.provider)} ↗
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void openSavedPlaylist(playlist)}
                  className="min-h-11 shrink-0 rounded-pill border border-interactive/35 px-3 font-ui text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-ui text-xs text-text-tertiary">
            No saved playlists found on {providerLabel(provider)}.
          </p>
        )
      ) : mode === 'saved_playlists' && selectedPlaylist ? (
        // Opened playlist: loading · error (forbidden/reauth/generic) · empty · tracks.
        searching && results === null ? (
          <p className="font-ui text-xs text-text-tertiary">
            Loading tracks from {selectedPlaylist.name}…
          </p>
        ) : error ? (
          renderDrillInError(selectedPlaylist, error)
        ) : results && results.length === 0 ? (
          <p className="font-ui text-xs text-text-tertiary">This playlist has no tracks.</p>
        ) : results ? (
          renderTrackList(results)
        ) : null
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
            : `No results for "${query.trim()}" on ${providerLabel(provider)}.`}
        </p>
      ) : (
        results && renderTrackList(results)
      )}
    </div>
  );
}
