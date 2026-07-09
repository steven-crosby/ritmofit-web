// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { MusicConnectionView, TrackSearchResult } from '@ritmofit/shared';
import { TrackSearch, browseAnnouncement, classifyPlaylistDrillInError } from './TrackSearch.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

/** A SoundCloud connection view; `expiresAt` decides connected vs expired. */
function soundcloudConnection(expiresAt: number | null): MusicConnectionView {
  return {
    id: 'conn-1',
    userId: 'u1',
    provider: 'soundcloud',
    providerUserId: null,
    scope: null,
    expiresAt,
    createdAt: 1,
    updatedAt: 1,
  };
}

/** A promise whose resolution we control, to model a slow in-flight request. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const staleResult: TrackSearchResult = {
  provider: 'soundcloud',
  providerTrackId: 't1',
  providerUri: null,
  title: 'Stale Track',
  artist: 'Ghost',
  albumArtUrl: null,
  durationMs: 1000,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TrackSearch stale-result guard', () => {
  it('does not let a search cleared mid-flight flash stale results under a new query', async () => {
    const first = deferred<TrackSearchResult[]>();
    const second = deferred<TrackSearchResult[]>(); // intentionally never resolves
    let calls = 0;
    vi.mocked(api.searchProvider).mockImplementation(() => {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    });

    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    const input = screen.getByRole('searchbox');

    // 1) Search "house" and wait for the debounced request to fire.
    fireEvent.change(input, { target: { value: 'house' } });
    await waitFor(() => expect(api.searchProvider).toHaveBeenCalledTimes(1));

    // 2) Clear the field, then let the original request resolve late. The cleared
    //    request's generation must be invalidated so it can't store its results.
    fireEvent.change(input, { target: { value: '' } });
    await act(async () => {
      first.resolve([staleResult]);
      await first.promise;
    });

    // 3) Start a new (pending) search. If the stale request had repopulated
    //    results, they would now flash under the new query before it resolves.
    fireEvent.change(input, { target: { value: 'techno' } });
    await waitFor(() => expect(api.searchProvider).toHaveBeenCalledTimes(2));

    expect(screen.queryByText('Stale Track')).toBeNull();
    // "Searching…" now appears twice — the visible label and the sr-only live
    // region — so assert on presence rather than a single unique node.
    expect(screen.getAllByText(/searching/i).length).toBeGreaterThan(0);
  });
});

describe('TrackSearch browse announcement (aria-live)', () => {
  const houseResults: TrackSearchResult[] = [
    {
      provider: 'soundcloud',
      providerTrackId: 'h1',
      providerUri: null,
      title: 'House One',
      artist: 'DJ A',
      albumArtUrl: null,
      durationMs: 200000,
    },
    {
      provider: 'soundcloud',
      providerTrackId: 'h2',
      providerUri: null,
      title: 'House Two',
      artist: 'DJ B',
      albumArtUrl: null,
      durationMs: 210000,
    },
  ];

  it('announces the settled result count in the live region', async () => {
    vi.mocked(api.searchProvider).mockResolvedValue(houseResults);
    render(<TrackSearch classId="c1" onAdded={() => {}} />);

    // No provider connection is mocked, so the only role="status" is the browse
    // summary. Idle → nothing announced.
    expect(screen.getByRole('status').textContent).toBe('');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'house' } });

    // During the debounced fetch the region announces the in-flight state…
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/searching/i));
    // …and once it settles, the *count* — the information a sighted user reads
    // from the list but AT otherwise never hears.
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('2 results for "house" on SoundCloud.'),
    );
  });

  it('announces a settled empty result set, not a premature "No results"', async () => {
    vi.mocked(api.searchProvider).mockResolvedValue([]);
    render(<TrackSearch classId="c1" onAdded={() => {}} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

    // Mid-fetch it must NOT read "No results" — that keys on a settled empty array.
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/searching/i));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('No results for "zzz" on SoundCloud.'),
    );
  });
});

describe('browseAnnouncement (unit)', () => {
  const base = {
    mode: 'search' as const,
    providerName: 'Spotify',
    query: '',
    searching: false,
    results: null,
    loadingSavedPlaylists: false,
    savedPlaylists: null,
    selectedPlaylist: null,
  };
  const oneResult: TrackSearchResult[] = [
    {
      provider: 'spotify',
      providerTrackId: 'x',
      providerUri: null,
      title: 'T',
      artist: 'A',
      albumArtUrl: null,
      durationMs: 1000,
    },
  ];

  it('stays silent while idle or mid-fetch with no settled results', () => {
    expect(browseAnnouncement(base)).toBe('');
    // results === null while searching → "Searching…", never "No results".
    expect(browseAnnouncement({ ...base, query: 'x', searching: true })).toBe('Searching Spotify…');
  });

  it('distinguishes a settled empty array from a pending null', () => {
    expect(browseAnnouncement({ ...base, query: 'x', results: [] })).toBe(
      'No results for "x" on Spotify.',
    );
    expect(browseAnnouncement({ ...base, query: 'x', results: null })).toBe('');
  });

  it('singularizes the result count', () => {
    expect(browseAnnouncement({ ...base, query: 'x', results: oneResult })).toBe(
      '1 result for "x" on Spotify.',
    );
  });
});

describe('TrackSearch playlist-import provider gating', () => {
  it('hides "Import Playlist URL" for the default provider (SoundCloud) and shows it only for Spotify', () => {
    render(<TrackSearch classId="c1" onAdded={() => {}} />);

    // Default provider is SoundCloud, which cannot import playlists (501).
    expect(screen.queryByRole('button', { name: 'Import Playlist URL' })).toBeNull();

    // Spotify is the only provider with a wired playlist-import path.
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    expect(screen.getByRole('button', { name: 'Import Playlist URL' })).toBeTruthy();

    // Apple Music has no playlist-import path either.
    fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
    expect(screen.queryByRole('button', { name: 'Import Playlist URL' })).toBeNull();
  });

  it('falls back to search when leaving playlist mode for a provider that cannot import', async () => {
    render(<TrackSearch classId="c1" onAdded={() => {}} />);

    // Enter playlist mode under Spotify.
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
    expect(screen.getByLabelText('Playlist URL')).toBeTruthy();

    // Switching to SoundCloud (no playlist import) must drop back to search so we
    // never present an import form that always fails.
    fireEvent.click(screen.getByRole('button', { name: 'SoundCloud' }));
    await waitFor(() => expect(screen.queryByLabelText('Playlist URL')).toBeNull());
    expect(screen.getByRole('searchbox')).toBeTruthy();
  });
});

const PLAYLIST_TRACKS: TrackSearchResult[] = [
  {
    provider: 'spotify',
    providerTrackId: 'track-1',
    providerUri: null,
    title: 'Song One',
    artist: 'Artist One',
    albumArtUrl: null,
    durationMs: 120000,
  },
  {
    provider: 'spotify',
    providerTrackId: 'track-2',
    providerUri: null,
    title: 'Song Two',
    artist: 'Artist Two',
    albumArtUrl: null,
    durationMs: 180000,
  },
];

describe('TrackSearch saved-playlists drill-in', () => {
  beforeEach(() => {
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Warmup Ride',
        ownerName: 'Coach',
        trackCount: 2,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue(PLAYLIST_TRACKS);
  });

  async function openPlaylistDrillIn() {
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
    expect(await screen.findByText('Warmup Ride')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Song One')).toBeTruthy();
  }

  it('opens a saved playlist and loads its track preview list', async () => {
    await openPlaylistDrillIn();
    expect(api.listPlaylistTracks).toHaveBeenCalledWith('spotify', 'pl-1');
  });

  it('shows "Import all N" button once tracks are loaded', async () => {
    await openPlaylistDrillIn();
    expect(
      screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }),
    ).toBeTruthy();
  });

  it('import-all calls importTrack + addTrack for every track and calls onAdded', async () => {
    const onAdded = vi.fn();
    render(<TrackSearch classId="c1" onAdded={onAdded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
    expect(await screen.findByText('Warmup Ride')).toBeTruthy();
    vi.mocked(api.importTrack).mockResolvedValue({
      id: 't-id',
      title: '',
      artist: '',
      albumArtUrl: null,
      durationMs: null,
      displayBpm: null,
      ownerId: 'me',
      createdAt: 1,
      updatedAt: 1,
    });
    vi.mocked(api.addTrack).mockResolvedValue({
      id: 'ct-id',
      classId: 'c1',
      trackId: 't-id',
      position: 0,
      intensity: 'mod',
      displayBpmOverride: null,
      durationMsOverride: null,
      startOffsetMs: 0,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Song One')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalledTimes(2));
    expect(api.addTrack).toHaveBeenCalledTimes(2);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it('navigating back clears the drill-in track list', async () => {
    await openPlaylistDrillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Back to playlists' }));
    await waitFor(() => expect(screen.queryByText('Song One')).toBeNull());
    expect(screen.getByText('Warmup Ride')).toBeTruthy();
  });

  async function openFirstPlaylist() {
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
    expect(await screen.findByText('Warmup Ride')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  }

  it('surfaces a 403 forbidden drill-in as calm guidance, not a retryable error', async () => {
    // Backend PROVIDER_FORBIDDEN message (see user-playlists.ts) — an expected
    // limitation: reconnecting/retrying can't grant access to someone else's playlist.
    vi.mocked(api.listPlaylistTracks).mockRejectedValue(
      new Error('Spotify only allows opening playlists you own or collaborate on.'),
    );
    await openFirstPlaylist();

    expect(
      await screen.findByText(/only allows opening playlists you own or collaborate on/i),
    ).toBeTruthy();
    // Points to the URL-import escape hatch…
    expect(screen.getByText(/add it under Import Playlist URL instead/i)).toBeTruthy();
    // …and offers no retry, since a retry would just repeat the 403.
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    // Still announced (kept as role="alert").
    expect(screen.getByRole('alert').textContent).toMatch(/own or collaborate on/i);
  });

  it('surfaces a generic drill-in failure as a retryable error and re-fetches on retry', async () => {
    // First open fails (503 PROVIDER_UNAVAILABLE); retry falls back to the base
    // resolved mock (PLAYLIST_TRACKS) from beforeEach.
    vi.mocked(api.listPlaylistTracks).mockRejectedValueOnce(
      new Error('Spotify is not configured.'),
    );
    await openFirstPlaylist();

    expect(await screen.findByText('Spotify is not configured.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Song One')).toBeTruthy();
    expect(api.listPlaylistTracks).toHaveBeenCalledTimes(2);
  });

  it('reads a truly empty opened playlist distinctly from a failed load', async () => {
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([]);
    await openFirstPlaylist();

    // Appears twice — the visible label and the sr-only live region that mirrors it.
    expect((await screen.findAllByText('This playlist has no tracks.')).length).toBeGreaterThan(0);
    // Empty is a calm success state, not an error — nothing is announced as an alert.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('distinguishes a failed playlist-index load from an empty library, with a retry', async () => {
    // First index load rejects; the retry falls back to the base resolved mock.
    vi.mocked(api.listPlaylists).mockRejectedValueOnce(new Error('boom'));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));

    expect(await screen.findByText(/load your Spotify playlists/i)).toBeTruthy();
    // A failed load must NOT masquerade as an empty library.
    expect(screen.queryByText(/No saved playlists found/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Warmup Ride')).toBeTruthy();
  });
});

describe('classifyPlaylistDrillInError (unit)', () => {
  it('classifies the 403 ownership limitation as forbidden', () => {
    expect(
      classifyPlaylistDrillInError(
        'Spotify only allows opening playlists you own or collaborate on.',
      ),
    ).toBe('forbidden');
  });

  it('classifies REAUTH_REQUIRED and the capitalized NOT_CONNECTED string as reauth', () => {
    expect(classifyPlaylistDrillInError('Reconnect your Spotify account.')).toBe('reauth');
    // NOT_CONNECTED starts with a capital C — the case-insensitive match must still
    // land it on reauth rather than falling through to generic.
    expect(classifyPlaylistDrillInError('Connect your Spotify account first.')).toBe('reauth');
  });

  it('falls back to generic for any other message', () => {
    expect(classifyPlaylistDrillInError('Spotify is not configured.')).toBe('generic');
    expect(classifyPlaylistDrillInError('Request failed (500)')).toBe('generic');
  });
});

describe('TrackSearch result artwork', () => {
  it('lazy-loads and async-decodes non-critical album thumbnails', async () => {
    const result: TrackSearchResult = {
      provider: 'soundcloud',
      providerTrackId: 't2',
      providerUri: null,
      title: 'Art Track',
      artist: 'Painter',
      albumArtUrl: 'https://art.example/cover.jpg',
      durationMs: 1000,
    };
    vi.mocked(api.searchProvider).mockResolvedValue([result]);

    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'house' } });

    const img = (await screen.findByRole('presentation')) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(result.albumArtUrl);
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });
});

describe('TrackSearch provider readiness', () => {
  it('warns proactively when the selected provider session is expired', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(1)]); // expired (1970)
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    // Default provider is SoundCloud → expired, before any search is attempted.
    expect(
      await screen.findByText(/SoundCloud session expired — reconnect in Connections/i),
    ).toBeTruthy();
  });

  it('confirms a connected provider', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(null)]); // no expiry
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    expect(await screen.findByText(/SoundCloud connected/i)).toBeTruthy();
  });

  it('shows a neutral not-connected hint when the account is absent', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([]);
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    expect(await screen.findByText(/SoundCloud not connected — connect it/i)).toBeTruthy();
  });
});
