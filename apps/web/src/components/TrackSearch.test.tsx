// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import {
  providerCapabilities,
  providerValues,
  type MusicConnectionView,
  type Provider,
  type TrackSearchResult,
} from '@ritmofit/shared';
import {
  TrackSearch,
  browseAnnouncement,
  classifyPlaylistDrillInError,
  classifyProviderLibraryError,
} from './TrackSearch.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js', async (original) => {
  const actual = await original<typeof import('../lib/api.js')>();
  return {
    ...actual,
    addTrack: vi.fn(),
    importClassTracks: vi.fn(),
    importPlaylist: vi.fn(),
    importTrack: vi.fn(),
    listClassTracks: vi.fn(),
    listConnections: vi.fn(),
    listLikes: vi.fn(),
    listPlaylistTracks: vi.fn(),
    listPlaylists: vi.fn(),
    searchProvider: vi.fn(),
  };
});

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
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((r, fail) => {
    resolve = r;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function browseStatus(): HTMLElement {
  const status = document.querySelector<HTMLElement>('p.sr-only[role="status"]');
  if (!status) throw new Error('Browse status region was not rendered');
  return status;
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
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('TrackSearch stale-result guard', () => {
  it('retries a failed catalog search without changing the query', async () => {
    vi.mocked(api.searchProvider)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([staleResult]);

    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'house' } });

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Couldn’t search SoundCloud right now/,
    );
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(api.searchProvider).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Stale Track')).toBeTruthy();
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('house');
  });

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

    // The dedicated browse live region stays separate from connection status.
    expect(browseStatus().textContent).toBe('');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'house' } });

    // During the debounced fetch the region announces the in-flight state…
    await waitFor(() => expect(browseStatus().textContent).toMatch(/searching/i));
    // …and once it settles, the *count* — the information a sighted user reads
    // from the list but AT otherwise never hears.
    await waitFor(() =>
      expect(browseStatus().textContent).toBe('2 results for "house" on SoundCloud.'),
    );
  });

  it('announces a settled empty result set, not a premature "No results"', async () => {
    vi.mocked(api.searchProvider).mockResolvedValue([]);
    render(<TrackSearch classId="c1" onAdded={() => {}} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

    // Mid-fetch it must NOT read "No results" — that keys on a settled empty array.
    await waitFor(() => expect(browseStatus().textContent).toMatch(/searching/i));
    await waitFor(() =>
      expect(browseStatus().textContent).toBe('No results for "zzz" on SoundCloud.'),
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

describe('TrackSearch destination', () => {
  it('names the block and hides playlist import when dest is a plan block', () => {
    render(
      <TrackSearch
        classId="c1"
        planBlockId="00000000-0000-4000-8000-0000000000b1"
        destinationLabel="Block 3 · Seated climb"
        onAdded={() => {}}
      />,
    );
    expect(screen.getByLabelText('Track destination').textContent).toMatch(
      /Block 3 · Seated climb/,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    expect(screen.queryByRole('button', { name: 'Import Playlist URL' })).toBeNull();
    expect(screen.getByLabelText('Track destination').textContent).toMatch(
      /Block 3 · Seated climb/,
    );
    expect(screen.getByLabelText('Track destination').textContent).not.toMatch(/Current class/);
  });

  it('keeps Import Playlist URL when dest is the class', () => {
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
    expect(screen.getByLabelText('Track destination').textContent).toMatch(/Current class/);
  });
});

describe('TrackSearch playlist-import provider gating', () => {
  const PROVIDER_LABELS: Record<Provider, string> = {
    soundcloud: 'SoundCloud',
    spotify: 'Spotify',
    apple_music: 'Apple Music',
  };

  it('shows "Import Playlist URL" exactly for providers whose capability flag is on', () => {
    // Derived from the shared matrix, not a hardcoded provider list: the UI must
    // track `playlistImport` so a capability change lights up (or hides) the
    // control with zero web edits.
    render(<TrackSearch classId="c1" onAdded={() => {}} />);

    for (const provider of providerValues) {
      fireEvent.click(screen.getByRole('button', { name: PROVIDER_LABELS[provider] }));
      const importButton = screen.queryByRole('button', { name: 'Import Playlist URL' });
      if (providerCapabilities[provider].playlistImport) {
        expect(importButton, `${provider} should offer playlist import`).toBeTruthy();
      } else {
        expect(importButton, `${provider} should not offer playlist import`).toBeNull();
      }
    }
  });

  it('falls back to search when leaving playlist mode for a provider that cannot import', async () => {
    // Every real provider imports today, so stub the matrix (restored below) to
    // keep this defensive fallback covered: never present an import form that
    // always fails.
    const original = providerCapabilities.soundcloud.playlistImport;
    providerCapabilities.soundcloud.playlistImport = false;
    try {
      render(<TrackSearch classId="c1" onAdded={() => {}} />);

      // Enter playlist mode under Spotify.
      fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
      fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
      expect(screen.getByLabelText('Playlist URL')).toBeTruthy();

      // Switching to the import-incapable provider must drop back to search.
      fireEvent.click(screen.getByRole('button', { name: 'SoundCloud' }));
      await waitFor(() => expect(screen.queryByLabelText('Playlist URL')).toBeNull());
      expect(screen.getByRole('searchbox')).toBeTruthy();
    } finally {
      providerCapabilities.soundcloud.playlistImport = original;
    }
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

const IMPORTED_TRACK = {
  id: 't-id',
  title: '',
  artist: '',
  albumArtUrl: null,
  durationMs: null,
  displayBpm: null,
  isrc: null,
  ownerUserId: 'me',
  createdAt: 1,
  updatedAt: 1,
};

const ADDED_CLASS_TRACK = {
  id: 'ct-id',
  planBlockId: null,
  clipStartMs: 0,
  clipEndMs: null,
  beatAnchorMs: 0,
  displayRpm: null,
  holdCount: null,
  classId: 'c1',
  trackId: 't-id',
  position: 0,
  intensity: 'mod' as const,
  displayBpmOverride: null,
  durationMsOverride: null,
  startOffsetMs: 0,
  notes: null,
  createdAt: 1,
  updatedAt: 1,
};

describe('TrackSearch saved-playlists drill-in', () => {
  beforeEach(() => {
    let committed: Awaited<ReturnType<typeof api.listClassTracks>> = [];
    vi.mocked(api.listClassTracks).mockImplementation(async () => committed);
    vi.mocked(api.importClassTracks).mockImplementation(
      async (_classId: string, body: Parameters<typeof api.importClassTracks>[1]) => {
        for (const placement of body.placements)
          if (!committed.some((r) => r.id === placement.id))
            committed.push({
              ...ADDED_CLASS_TRACK,
              ...placement,
              planBlockId: body.planBlockId ?? null,
              clipStartMs: 0,
              clipEndMs: null,
              beatAnchorMs: 0,
              displayRpm: null,
              holdCount: null,
            });
        committed = body.orderedIds.map((id, position) => ({
          ...committed.find((r) => r.id === id)!,
          position,
        }));
        return committed;
      },
    );
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        providerUri: 'https://open.spotify.com/playlist/abc123',
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
    expect((await screen.findAllByText('Song One')).length).toBeGreaterThan(0);
  }

  it('opens a saved playlist and loads its track preview list', async () => {
    await openPlaylistDrillIn();
    expect(api.listPlaylistTracks).toHaveBeenCalledWith('spotify', 'pl-1');
  });

  it('attributes the saved playlist to its provider', async () => {
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));

    expect(
      (await screen.findByRole('link', { name: 'Open Warmup Ride on Spotify' })).getAttribute(
        'href',
      ),
    ).toBe('https://open.spotify.com/playlist/abc123');
  });

  it('shows "Import all N" button once tracks are loaded', async () => {
    await openPlaylistDrillIn();
    expect(
      screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }),
    ).toBeTruthy();
  });

  it('locks individual adds while a bulk import is pending', async () => {
    const pendingImport = deferred<Awaited<ReturnType<typeof api.importTrack>>>();
    vi.mocked(api.importTrack).mockImplementation(() => pendingImport.promise);
    vi.mocked(api.addTrack).mockResolvedValue(ADDED_CLASS_TRACK);
    await openPlaylistDrillIn();

    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalledTimes(2));

    const individualAdd = screen.getByRole('button', {
      name: 'Add Song One by Artist One',
    }) as HTMLButtonElement;
    expect(individualAdd.disabled).toBe(true);
    expect(screen.queryByText(/couldn’t be added/)).toBeNull();
    expect(screen.queryByText(/Added all/)).toBeNull();
    fireEvent.click(individualAdd);
    expect(api.importTrack).toHaveBeenCalledTimes(2);

    await act(async () => {
      pendingImport.resolve(IMPORTED_TRACK);
      await pendingImport.promise;
    });
    await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
  });

  it('locks bulk import while an individual add is pending', async () => {
    const pendingImport = deferred<Awaited<ReturnType<typeof api.importTrack>>>();
    vi.mocked(api.importTrack).mockImplementation(() => pendingImport.promise);
    vi.mocked(api.addTrack).mockResolvedValue(ADDED_CLASS_TRACK);
    await openPlaylistDrillIn();

    fireEvent.click(screen.getByRole('button', { name: 'Add Song One by Artist One' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalledTimes(1));

    const importAll = screen.getByRole('button', {
      name: /Import all 2 tracks from Warmup Ride/i,
    }) as HTMLButtonElement;
    expect(importAll.disabled).toBe(true);
    fireEvent.click(importAll);
    expect(api.importTrack).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingImport.resolve(IMPORTED_TRACK);
      await pendingImport.promise;
    });
    await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
  });

  it('import-all commits every source occurrence in one ordered operation and calls onAdded', async () => {
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
    expect((await screen.findAllByText('Song One')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalledTimes(2));
    expect(api.importClassTracks).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Added all 2 tracks.')).toBeTruthy();
    const complete = screen.getByRole('button', {
      name: 'All 2 tracks from Warmup Ride added',
    }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);
    expect(complete.textContent).toBe('All 2 added');
  });

  it('reports a partial import and retries only the remaining track', async () => {
    const onAdded = vi.fn();
    vi.mocked(api.importTrack).mockImplementation(
      async (_provider: Provider, providerTrackId: string) => {
        if (providerTrackId === 'track-2') throw new Error('provider import failed');
        return {
          id: `imported-${providerTrackId}`,
          title: '',
          artist: '',
          albumArtUrl: null,
          durationMs: null,
          displayBpm: null,
          ownerId: 'me',
          createdAt: 1,
          updatedAt: 1,
        };
      },
    );
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

    render(<TrackSearch classId="c1" onAdded={onAdded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
    expect(await screen.findByText('Warmup Ride')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect((await screen.findAllByText('Song One')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));

    const partial = await screen.findByText(
      'Added 1 of 2 tracks. 1 couldn’t be added — retry the remaining track.',
    );
    expect(partial.closest('[role="status"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Song One — Added' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Song Two by Artist Two' })).toBeTruthy();
    expect(onAdded).toHaveBeenCalledTimes(1);

    // The retry must spend work only on the failed row, not re-add Song One.
    vi.mocked(api.importTrack).mockResolvedValue({
      id: 'imported-track-2',
      title: '',
      artist: '',
      albumArtUrl: null,
      durationMs: null,
      displayBpm: null,
      ownerId: 'me',
      createdAt: 1,
      updatedAt: 1,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry 1 remaining track from Warmup Ride' }),
    );

    expect(await screen.findByText('Added all 2 tracks.')).toBeTruthy();
    expect(api.importTrack).toHaveBeenCalledTimes(3);
    expect(api.importTrack).toHaveBeenLastCalledWith('spotify', 'track-2');
    expect(onAdded).toHaveBeenCalledTimes(2);
    expect(
      (
        screen.getByRole('button', {
          name: 'All 2 tracks from Warmup Ride added',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('describes an ambiguous commit as unconfirmed and replays it without importing again', async () => {
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    vi.mocked(api.importClassTracks).mockRejectedValueOnce(new TypeError('response lost'));
    await openPlaylistDrillIn();
    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks/ }));
    await screen.findByText(/We couldn’t confirm whether the remaining tracks were added/);
    expect(screen.queryByText(/couldn’t be added/)).toBeNull();
    const original = vi.mocked(api.importClassTracks).mock.calls[0]![1];
    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks/ }));
    await screen.findByText('Added all 2 tracks.');
    expect(api.importTrack).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.importClassTracks).mock.calls[1]![1]).toEqual(original);
  });

  it('renders repeated playlist songs as independently added occurrences', async () => {
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([
      PLAYLIST_TRACKS[0]!,
      PLAYLIST_TRACKS[1]!,
      PLAYLIST_TRACKS[0]!,
    ]);
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    await openPlaylistDrillIn();
    const adds = screen.getAllByRole('button', { name: 'Add Song One by Artist One' });
    expect(adds.length).toBe(2);
    fireEvent.click(adds[0]!);
    await screen.findByRole('button', { name: 'Song One — Added' });
    expect(screen.getAllByRole('button', { name: 'Add Song One by Artist One' }).length).toBe(1);
    expect(screen.queryByText(/couldn’t be added/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Retry 2 remaining tracks/ }));
    await screen.findByText('Added all 3 tracks.');
    const placements = vi
      .mocked(api.importClassTracks)
      .mock.calls.flatMap((call: Parameters<typeof api.importClassTracks>) => call[1].placements);
    expect(new Set(placements.map((p: { id: string }) => p.id)).size).toBe(3);
    expect(placements.length).toBe(3);
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

    expect((await screen.findAllByText('Song One')).length).toBeGreaterThan(0);
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

  it.each([
    ['an empty Error', new Error('')],
    ['a non-Error', { reason: 'down' }],
  ] as const)(
    'shows the generic drill-in alert and Try again for %s',
    async (_label: string, thrown: Error | { reason: string }) => {
      vi.mocked(api.listPlaylistTracks).mockRejectedValue(thrown);
      await openFirstPlaylist();

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toMatch(/Something went wrong/);
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
      expect(screen.queryByText(/This playlist has no tracks/)).toBeNull();
      expect(screen.queryByText(/Loading tracks from/)).toBeNull();
    },
  );

  it('shows a sentence when an ordered import returns an empty error', async () => {
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    vi.mocked(api.importClassTracks).mockRejectedValueOnce(new Error(''));
    await openPlaylistDrillIn();
    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Something went wrong/);
  });

  it('clears the alert when an ordered import returns null', async () => {
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    await openPlaylistDrillIn();
    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));

    expect(await screen.findByText('Added all 2 tracks.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Something went wrong.')).toBeNull();
  });

  it('keeps the ordered-import recovery sentence', async () => {
    const sentence =
      'Previously imported songs were moved or removed. Add remaining songs at end to keep your current arrangement.';
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    vi.mocked(api.importClassTracks).mockRejectedValueOnce(new Error(sentence));
    await openPlaylistDrillIn();
    fireEvent.click(screen.getByRole('button', { name: /Import all 2 tracks from Warmup Ride/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(sentence);
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

  it('prefers stable API codes over message wording', () => {
    expect(
      classifyPlaylistDrillInError('Provider denied this request.', 'PROVIDER_FORBIDDEN'),
    ).toBe('forbidden');
    expect(classifyPlaylistDrillInError('Authorization changed.', 'REAUTH_REQUIRED')).toBe(
      'reauth',
    );
    expect(classifyPlaylistDrillInError('No account.', 'NOT_CONNECTED')).toBe('reauth');
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

describe('classifyProviderLibraryError (unit)', () => {
  it('uses stable authorization codes and keeps generic failures retryable', () => {
    expect(classifyProviderLibraryError('Provider denied this request.', 'REAUTH_REQUIRED')).toBe(
      'reauth',
    );
    expect(classifyProviderLibraryError('No account.', 'NOT_CONNECTED')).toBe('reauth');
    expect(classifyProviderLibraryError('SoundCloud is unavailable.')).toBe('generic');
  });
});

describe('TrackSearch result artwork', () => {
  it('lazy-loads and async-decodes non-critical album thumbnails', async () => {
    const result: TrackSearchResult = {
      provider: 'soundcloud',
      providerTrackId: 't2',
      providerUri: 'https://soundcloud.com/painter/art-track',
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
    expect(
      screen.getByRole('link', { name: 'Open Art Track on SoundCloud' }).getAttribute('href'),
    ).toBe(result.providerUri);
  });
});

describe('TrackSearch provider readiness', () => {
  it('uses the centralized caution mark and recovery action for an expired session', async () => {
    const onOpenConnections = vi.fn();
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(1)]); // expired (1970)
    render(<TrackSearch classId="c1" onAdded={() => {}} onOpenConnections={onOpenConnections} />);
    // Default provider is SoundCloud → expired, before any search is attempted.
    expect(await screen.findByText('Session expired')).toBeTruthy();
    expect(document.querySelector('[data-connection-state="expired"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Manage connections' }));
    expect(onOpenConnections).toHaveBeenCalledTimes(1);
  });

  it('confirms a connected provider', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(null)]); // no expiry
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(await screen.findByText(/SoundCloud library is available/i)).toBeTruthy();
  });

  it('shows catalog-only truth when the account is absent', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([]);
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    expect(await screen.findByText('Catalog only')).toBeTruthy();
    expect(await screen.findByText(/catalog search works without an account/i)).toBeTruthy();
  });

  it('refreshes connection truth after the centralized dialog changes it', async () => {
    vi.mocked(api.listConnections)
      .mockResolvedValueOnce([soundcloudConnection(1)])
      .mockResolvedValueOnce([soundcloudConnection(null)]);
    const { rerender } = render(
      <TrackSearch
        classId="c1"
        connectionRevision={0}
        onAdded={() => {}}
        onOpenConnections={() => {}}
      />,
    );
    expect(await screen.findByText('Session expired')).toBeTruthy();

    rerender(
      <TrackSearch
        classId="c1"
        connectionRevision={1}
        onAdded={() => {}}
        onOpenConnections={() => {}}
      />,
    );
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(api.listConnections).toHaveBeenCalledTimes(2);
  });
});

describe('TrackSearch SoundCloud library expiry', () => {
  it('surfaces an expired likes fetch as caution with a real reconnect path', async () => {
    const onOpenConnections = vi.fn();
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(null)]);
    vi.mocked(api.listLikes).mockRejectedValue(new Error('Reconnect your SoundCloud account.'));

    render(<TrackSearch classId="c1" onAdded={() => {}} onOpenConnections={onOpenConnections} />);
    fireEvent.click(screen.getByRole('button', { name: 'My likes' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Session expired/i);
    expect(alert.textContent).toMatch(/Reconnect your SoundCloud account/i);
    expect(alert.className).toContain('text-state-caution');
    fireEvent.click(screen.getByRole('button', { name: 'Manage connections' }));
    expect(onOpenConnections).toHaveBeenCalledTimes(1);
  });

  it('surfaces an expired saved-playlist fetch as caution instead of a broken panel', async () => {
    const onOpenConnections = vi.fn();
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(null)]);
    vi.mocked(api.listPlaylists).mockRejectedValue(new Error('Reconnect your SoundCloud account.'));

    render(<TrackSearch classId="c1" onAdded={() => {}} onOpenConnections={onOpenConnections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Session expired/i);
    expect(alert.className).toContain('text-state-caution');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Manage connections' }));
    expect(onOpenConnections).toHaveBeenCalledTimes(1);
  });

  it('keeps catalog search working when SoundCloud library authorization is expired', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(1)]);
    vi.mocked(api.searchProvider).mockResolvedValue([staleResult]);
    render(<TrackSearch classId="c1" onAdded={() => {}} onOpenConnections={() => {}} />);
    await screen.findByText('Session expired');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'house' } });

    expect(await screen.findByText('Stale Track')).toBeTruthy();
    expect(api.searchProvider).toHaveBeenCalledWith('soundcloud', 'house');
    expect(api.listLikes).not.toHaveBeenCalled();
  });
});

describe('TrackSearch plan-block assignment', () => {
  it('assigns a chosen song to the targeted plan block', async () => {
    const result: TrackSearchResult = {
      provider: 'soundcloud',
      providerTrackId: 'tr-1',
      providerUri: null,
      title: 'Climb',
      artist: 'Artist',
      albumArtUrl: null,
      durationMs: 180000,
    };
    vi.mocked(api.searchProvider).mockResolvedValue([result]);
    vi.mocked(api.importTrack).mockResolvedValue({ id: 'track-1' } as Awaited<
      ReturnType<typeof api.importTrack>
    >);
    vi.mocked(api.addTrack).mockResolvedValue(ADDED_CLASS_TRACK);

    render(
      <TrackSearch
        classId="c1"
        planBlockId="00000000-0000-4000-8000-0000000000b1"
        destinationLabel="Block 3 · Seated climb"
        onAdded={() => {}}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'climb' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add Climb by Artist' }));

    await waitFor(() =>
      expect(api.addTrack).toHaveBeenCalledWith('c1', {
        trackId: 'track-1',
        intensity: 'mod',
        planBlockId: '00000000-0000-4000-8000-0000000000b1',
      }),
    );
    expect(await screen.findByRole('button', { name: 'Climb — Added' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Climb — Added' }).textContent).toMatch(/Added/);
    expect(screen.queryByRole('button', { name: /In Block/ })).toBeNull();
  });
});

describe('TrackSearch submitted operation ownership', () => {
  const firstUrl = 'https://music.apple.com/us/playlist/first/pl.first';
  const nextUrl = 'https://music.apple.com/us/playlist/next/pl.next';
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.searchProvider).mockResolvedValue([staleResult]);
    vi.mocked(api.listLikes).mockResolvedValue([staleResult]);
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    vi.mocked(api.addTrack).mockResolvedValue(ADDED_CLASS_TRACK);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.importClassTracks).mockResolvedValue([ADDED_CLASS_TRACK]);
  });
  function urlInput() {
    fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
    const input = screen.getByRole('textbox', { name: 'Playlist URL' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: firstUrl } });
    return input;
  }
  async function startSong() {
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ghost' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add Stale Track by Ghost' }));
  }
  it.each(['replacement', 'edit-away-and-back', 'unchanged'] as const)(
    'clears only an unedited submitted URL draft: %s',
    async (change: string) => {
      const write = deferred<Awaited<ReturnType<typeof api.importPlaylist>>>();
      vi.mocked(api.importPlaylist).mockReturnValue(write.promise);
      const onAdded = vi.fn();
      render(<TrackSearch classId="c1" onAdded={onAdded} />);
      const input = urlInput();
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
      expect(input.disabled).toBe(false);
      if (change !== 'unchanged') fireEvent.change(input, { target: { value: nextUrl } });
      if (change === 'edit-away-and-back') fireEvent.change(input, { target: { value: firstUrl } });
      input.focus();
      await act(async () => {
        write.resolve({
          occurrences: [
            {
              index: 0,
              title: 'First',
              artist: 'QA',
              durationMs: 180000,
              provider: 'apple_music',
              providerTrackId: 'pl-song',
            },
          ],
        });
        await write.promise;
      });
      await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
      expect(input.value).toBe(
        change === 'replacement' ? nextUrl : change === 'unchanged' ? '' : firstUrl,
      );
      expect(document.activeElement).toBe(input);
      expect(api.importPlaylist).toHaveBeenCalledWith('c1', firstUrl);
      expect(api.importClassTracks).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ songBlocks: true }),
      );
    },
  );
  it('retains the replacement URL and exposes a current-context failure', async () => {
    const write = deferred<Awaited<ReturnType<typeof api.importPlaylist>>>();
    vi.mocked(api.importPlaylist).mockReturnValue(write.promise);
    render(<TrackSearch classId="c1" onAdded={vi.fn()} />);
    const input = urlInput();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    fireEvent.change(input, { target: { value: nextUrl } });
    await act(async () => {
      write.reject(new Error('Import failed'));
      await write.promise.catch(() => {});
    });
    expect(input.value).toBe(nextUrl);
    expect(screen.getByRole('alert').textContent).toBe('Import failed');
    expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
  it.each(['provider', 'mode', 'destination', 'unmount'] as const)(
    'ignores a URL import completion after leaving its %s context',
    async (change: string) => {
      const write = deferred<Awaited<ReturnType<typeof api.importPlaylist>>>();
      vi.mocked(api.importPlaylist).mockReturnValue(write.promise);
      const onAdded = vi.fn();
      const view = render(<TrackSearch classId="c1" onAdded={onAdded} />);
      const input = urlInput();
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
      fireEvent.change(input, { target: { value: nextUrl } });
      if (change === 'provider') {
        fireEvent.click(screen.getByRole('button', { name: 'SoundCloud' }));
        fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
      } else if (change === 'mode') {
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      } else if (change === 'destination') {
        view.rerender(<TrackSearch classId="c2" onAdded={onAdded} />);
        view.rerender(<TrackSearch classId="c1" onAdded={onAdded} />);
      } else view.unmount();
      if (change === 'provider' || change === 'mode')
        fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
      await act(async () => {
        write.resolve({
          occurrences: [
            {
              index: 0,
              title: 'First',
              artist: 'QA',
              durationMs: 180000,
              provider: 'apple_music',
              providerTrackId: 'pl-song',
            },
          ],
        });
        await write.promise;
      });
      expect(onAdded).not.toHaveBeenCalled();
      expect(api.importPlaylist).toHaveBeenCalledWith('c1', firstUrl);
      if (change !== 'unmount') {
        expect(
          (screen.getByRole('textbox', { name: 'Playlist URL' }) as HTMLInputElement).value,
        ).toBe(nextUrl);
        expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(
          false,
        );
      }
    },
  );
  it.each(['provider', 'mode', 'destination', 'unmount'] as const)(
    'finishes the submitted song write without a stale callback after a %s change',
    async (change: string) => {
      const write = deferred<Awaited<ReturnType<typeof api.importTrack>>>();
      vi.mocked(api.importTrack).mockReturnValue(write.promise);
      const onAdded = vi.fn();
      const view = render(<TrackSearch classId="c1" planBlockId="b1" onAdded={onAdded} />);
      await startSong();
      if (change === 'provider')
        fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
      else if (change === 'mode') fireEvent.click(screen.getByRole('button', { name: 'My likes' }));
      else if (change === 'destination')
        view.rerender(<TrackSearch classId="c2" planBlockId="b2" onAdded={onAdded} />);
      else view.unmount();
      await act(async () => {
        write.resolve(IMPORTED_TRACK);
        await write.promise;
      });
      await waitFor(() =>
        expect(api.addTrack).toHaveBeenCalledWith('c1', {
          trackId: IMPORTED_TRACK.id,
          intensity: 'mod',
          planBlockId: 'b1',
        }),
      );
      expect(onAdded).not.toHaveBeenCalled();
      if (change !== 'unmount') expect(screen.queryByText(/added this session/)).toBeNull();
    },
  );
  it.each(['song', 'URL'] as const)(
    'hides stale %s failures in a different mode',
    async (kind: string) => {
      const song = deferred<Awaited<ReturnType<typeof api.importTrack>>>();
      const list = deferred<Awaited<ReturnType<typeof api.importPlaylist>>>();
      vi.mocked(api.importTrack).mockReturnValue(song.promise);
      vi.mocked(api.importPlaylist).mockReturnValue(list.promise);
      const onAdded = vi.fn();
      render(<TrackSearch classId="c1" onAdded={onAdded} />);
      if (kind === 'song') {
        await startSong();
        fireEvent.click(screen.getByRole('button', { name: 'My likes' }));
      } else {
        urlInput();
        fireEvent.click(screen.getByRole('button', { name: 'Import' }));
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      }
      const write = kind === 'song' ? song : list;
      await act(async () => {
        write.reject(new Error('Old operation failed'));
        await write.promise.catch(() => {});
      });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(onAdded).not.toHaveBeenCalled();
    },
  );
  it('keeps different song adds concurrent and rejects a repeat click on a pending song', async () => {
    const secondSong = { ...staleResult, providerTrackId: 't2', title: 'Another Track' };
    vi.mocked(api.searchProvider).mockResolvedValue([staleResult, secondSong]);
    const first = deferred<Awaited<ReturnType<typeof api.addTrack>>>();
    const second = deferred<Awaited<ReturnType<typeof api.addTrack>>>();
    vi.mocked(api.addTrack).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const onAdded = vi.fn();
    render(<TrackSearch classId="c1" onAdded={onAdded} />);
    await startSong();
    await waitFor(() => expect(api.addTrack).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Add Another Track by Ghost' }));
    await waitFor(() => expect(api.addTrack).toHaveBeenCalledTimes(2));
    // The shared list displays one busy row; a repeat on the other pending row
    // must still be ignored without stopping the distinct song's write.
    fireEvent.click(screen.getByRole('button', { name: 'Add Stale Track by Ghost' }));
    expect(api.importTrack).toHaveBeenCalledTimes(2);
    await act(async () => {
      first.resolve(ADDED_CLASS_TRACK);
      await first.promise;
    });
    expect(
      (screen.getByRole('button', { name: 'Add Another Track by Ghost' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await act(async () => {
      second.resolve({ ...ADDED_CLASS_TRACK, id: 'ct-2' });
      await second.promise;
    });
    expect(await screen.findByRole('button', { name: 'Another Track — Added' })).toBeTruthy();
    expect(onAdded).toHaveBeenCalledTimes(2);
  });
  it('does not submit the same pending song again after a browse-context round trip', async () => {
    const write = deferred<Awaited<ReturnType<typeof api.addTrack>>>();
    vi.mocked(api.addTrack).mockReturnValue(write.promise);
    const onAdded = vi.fn();
    render(<TrackSearch classId="c1" onAdded={onAdded} />);
    await startSong();
    await waitFor(() => expect(api.addTrack).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'My likes' }));
    await screen.findByText('Stale Track');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add Stale Track by Ghost' }));
    expect(api.importTrack).toHaveBeenCalledTimes(1);
    await act(async () => {
      write.resolve(ADDED_CLASS_TRACK);
      await write.promise;
    });
    expect(onAdded).not.toHaveBeenCalled();
  });
  it('does not let an older song completion unlock a newer add of the same candidate', async () => {
    const first = deferred<Awaited<ReturnType<typeof api.addTrack>>>();
    const second = deferred<Awaited<ReturnType<typeof api.addTrack>>>();
    vi.mocked(api.addTrack).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const onAdded = vi.fn();
    const view = render(<TrackSearch classId="c1" onAdded={onAdded} />);
    await startSong();
    await waitFor(() => expect(api.addTrack).toHaveBeenCalledTimes(1));
    view.rerender(<TrackSearch classId="c2" onAdded={onAdded} />);
    fireEvent.click(screen.getByRole('button', { name: 'My likes' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add Stale Track by Ghost' }));
    await waitFor(() => expect(api.addTrack).toHaveBeenCalledTimes(2));
    await act(async () => {
      first.resolve(ADDED_CLASS_TRACK);
      await first.promise;
    });
    expect(
      (screen.getByRole('button', { name: 'Add Stale Track by Ghost' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(onAdded).not.toHaveBeenCalled();
    await act(async () => {
      second.resolve(ADDED_CLASS_TRACK);
      await second.promise;
    });
    expect(await screen.findByRole('button', { name: 'Stale Track — Added' })).toBeTruthy();
    expect(onAdded).toHaveBeenCalledTimes(1);
  });
});

const BLANK_FALLBACK = 'Something went wrong.';

function emptyReauthError(): api.ApiError {
  return new api.ApiError('', 'REAUTH_REQUIRED', 409);
}

/** The span beside the Session expired label. The label alone is still a blank. */
function messageBesideSessionExpired(alert: HTMLElement): string {
  const beside = [...alert.children].find(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && !node.hasAttribute('data-connection-state'),
  );
  return beside?.textContent?.trim() ?? '';
}

function expectSessionExpiredWithSentence(alert: HTMLElement) {
  const text = (alert.textContent ?? '').replace(/\s+/g, ' ').trim();
  expect(text).toMatch(/Session expired/);
  expect(text).not.toBe('Session expired');
  expect(messageBesideSessionExpired(alert)).toBe(BLANK_FALLBACK);
}

describe('TrackSearch blank Add-music failures', () => {
  beforeEach(() => {
    vi.mocked(api.listConnections).mockResolvedValue([soundcloudConnection(null)]);
  });

  it('shows a sentence beside Session expired when likes reauth has an empty message', async () => {
    vi.mocked(api.listLikes).mockRejectedValue(emptyReauthError());
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'My likes' }));

    const alert = await screen.findByRole('alert');
    expectSessionExpiredWithSentence(alert);
    expect(alert.textContent).not.toMatch(/Couldn’t load your SoundCloud likes/);
    expect(screen.queryByText(/Loading your SoundCloud likes/)).toBeNull();
  });

  it('shows a sentence beside Session expired when the playlist index reauth message is empty', async () => {
    vi.mocked(api.listPlaylists).mockRejectedValue(emptyReauthError());
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));

    const alert = await screen.findByRole('alert');
    expectSessionExpiredWithSentence(alert);
    expect(screen.queryByText(/Loading your SoundCloud playlists/)).toBeNull();
    expect(alert.textContent).not.toMatch(/Couldn’t load your SoundCloud playlists/);
  });

  it.each([
    ['search', 'Couldn’t search SoundCloud right now. Try again.'],
    ['likes', 'Couldn’t load your SoundCloud likes.'],
    ['playlists', 'Couldn’t load your SoundCloud playlists.'],
  ] as const)(
    'keeps the canned %s sentence for a non-empty provider failure',
    async (surface: 'search' | 'likes' | 'playlists', sentence: string) => {
      if (surface === 'search') {
        vi.mocked(api.searchProvider).mockRejectedValue(new Error('provider down'));
        render(<TrackSearch classId="c1" onAdded={() => {}} />);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'house' } });
      } else if (surface === 'likes') {
        vi.mocked(api.listLikes).mockRejectedValue(new Error('provider down'));
        render(<TrackSearch classId="c1" onAdded={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'My likes' }));
      } else {
        vi.mocked(api.listPlaylists).mockRejectedValue(new Error('provider down'));
        render(<TrackSearch classId="c1" onAdded={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
      }

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toMatch(sentence);
      expect(screen.queryByText('provider down')).toBeNull();
      expect(alert.textContent).not.toMatch(/Session expired/);
    },
  );

  it.each(['likes', 'playlists'] as const)(
    'keeps the canned %s sentence for a plain empty Error',
    async (surface: 'likes' | 'playlists') => {
      const sentence =
        surface === 'likes'
          ? 'Couldn’t load your SoundCloud likes.'
          : 'Couldn’t load your SoundCloud playlists.';
      if (surface === 'likes') {
        vi.mocked(api.listLikes).mockRejectedValue(new Error(''));
        render(<TrackSearch classId="c1" onAdded={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'My likes' }));
      } else {
        vi.mocked(api.listPlaylists).mockRejectedValue(new Error(''));
        render(<TrackSearch classId="c1" onAdded={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
      }

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toMatch(sentence);
      expect(screen.queryByText('Session expired')).toBeNull();
    },
  );

  it.each([new Error(''), { reason: 'down' }] as const)(
    'shows a sentence when adding a track throws %s',
    async (thrown: Error | { reason: string }) => {
      vi.mocked(api.searchProvider).mockResolvedValue([staleResult]);
      vi.mocked(api.importTrack).mockRejectedValue(thrown);
      render(<TrackSearch classId="c1" onAdded={() => {}} />);
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ghost' } });
      fireEvent.click(await screen.findByRole('button', { name: 'Add Stale Track by Ghost' }));

      expect((await screen.findByRole('alert')).textContent).toBe(BLANK_FALLBACK);
    },
  );

  it('keeps a provider sentence when adding a track fails', async () => {
    vi.mocked(api.searchProvider).mockResolvedValue([staleResult]);
    vi.mocked(api.importTrack).mockRejectedValue(new Error('Track is unavailable on SoundCloud.'));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ghost' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add Stale Track by Ghost' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Track is unavailable on SoundCloud.',
    );
  });

  it.each([new Error(''), { reason: 'down' }] as const)(
    'shows a sentence when playlist URL import throws %s',
    async (thrown: Error | { reason: string }) => {
      vi.mocked(api.importPlaylist).mockRejectedValue(thrown);
      render(<TrackSearch classId="c1" onAdded={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
      fireEvent.change(screen.getByLabelText('Playlist URL'), {
        target: { value: 'https://soundcloud.com/sets/demo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));

      expect((await screen.findByRole('alert')).textContent).toBe(BLANK_FALLBACK);
    },
  );

  it('keeps a provider sentence when playlist URL import fails', async () => {
    vi.mocked(api.importPlaylist).mockRejectedValue(new Error('Playlist is private.'));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
    fireEvent.change(screen.getByLabelText('Playlist URL'), {
      target: { value: 'https://soundcloud.com/sets/demo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Playlist is private.');
  });
});

describe('TrackSearch playlist song picker', () => {
  const url = 'https://music.apple.com/us/playlist/demo/pl.demo';
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.importTrack).mockResolvedValue(IMPORTED_TRACK);
    vi.mocked(api.importClassTracks).mockResolvedValue([ADDED_CLASS_TRACK]);
  });

  function preview(count: number) {
    return {
      occurrences: Array.from({ length: count }, (_, index) => ({
        index,
        title: `Song ${index + 1}`,
        artist: 'QA',
        durationMs: 180_000,
        provider: 'apple_music' as const,
        providerTrackId: `p-${index}`,
      })),
    };
  }

  function pasteUrl() {
    fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import Playlist URL' }));
    fireEvent.change(screen.getByLabelText('Playlist URL'), { target: { value: url } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
  }

  it('commits a 10-song preview with songBlocks and no picker', async () => {
    vi.mocked(api.importPlaylist).mockResolvedValue(preview(10));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    pasteUrl();
    await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
    expect(api.importPlaylist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Choose songs' })).toBeNull();
    expect(vi.mocked(api.importClassTracks).mock.calls[0]![1].songBlocks).toBe(true);
    expect(vi.mocked(api.importClassTracks).mock.calls[0]![1].placements).toHaveLength(10);
  });

  it('opens the picker with the first 15 songs checked and commits that subset', async () => {
    vi.mocked(api.importPlaylist).mockResolvedValue(preview(16));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    pasteUrl();
    const dialog = await screen.findByRole('dialog', { name: 'Choose songs' });
    expect(api.importClassTracks).not.toHaveBeenCalled();
    const boxes = dialog.querySelectorAll('input[type="checkbox"]');
    expect(
      Array.from(boxes)
        .slice(0, 15)
        .every((box) => (box as HTMLInputElement).checked),
    ).toBe(true);
    expect((boxes[15] as HTMLInputElement).checked).toBe(false);
    const confirm = screen.getByRole('button', { name: 'Import 15 songs' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.importClassTracks).mock.calls[0]![1].placements).toHaveLength(15);
    expect(vi.mocked(api.importClassTracks).mock.calls[0]![1].songBlocks).toBe(true);
  });

  it('opens 100 plain rows in under 2 seconds and does not commit until confirm', async () => {
    vi.mocked(api.importPlaylist).mockResolvedValue(preview(100));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    const started = performance.now();
    pasteUrl();
    const boxes = await screen.findAllByRole('checkbox');
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(boxes).toHaveLength(100);
    expect(api.importPlaylist).toHaveBeenCalledTimes(1);
    expect(api.importClassTracks).not.toHaveBeenCalled();
  });

  it('shows the over-100 limit and does not open the picker', async () => {
    vi.mocked(api.importPlaylist).mockRejectedValue(
      new api.ApiError('Playlist has 140 songs. The limit is 100.', 'VALIDATION_ERROR', 422),
    );
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    pasteUrl();
    expect((await screen.findByRole('alert')).textContent).toContain('140');
    expect(screen.queryByRole('dialog', { name: 'Choose songs' })).toBeNull();
    expect(api.importClassTracks).not.toHaveBeenCalled();
  });

  it('shows the try-again message on PROVIDER_TIMEOUT and keeps the URL', async () => {
    vi.mocked(api.importPlaylist).mockRejectedValue(
      new api.ApiError('upstream', 'PROVIDER_TIMEOUT', 504),
    );
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    pasteUrl();
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The playlist took too long to load. Try again.',
    );
    expect((screen.getByLabelText('Playlist URL') as HTMLInputElement).value).toBe(url);
    expect(screen.queryByRole('dialog', { name: 'Choose songs' })).toBeNull();
    expect(api.importClassTracks).not.toHaveBeenCalled();
  });

  it('writes nothing when the picker is cancelled', async () => {
    vi.mocked(api.importPlaylist).mockResolvedValue(preview(16));
    render(<TrackSearch classId="c1" onAdded={() => {}} />);
    pasteUrl();
    await screen.findByRole('dialog', { name: 'Choose songs' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Choose songs' })).toBeNull();
    expect(api.importClassTracks).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Playlist URL') as HTMLInputElement).value).toBe(url);
  });

  it('hides paste-a-link when the destination is a plan block', () => {
    render(<TrackSearch classId="c1" planBlockId="block-1" onAdded={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
    expect(screen.queryByRole('button', { name: 'Import Playlist URL' })).toBeNull();
  });
});
