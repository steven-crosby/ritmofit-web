// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { MusicConnectionView, TrackSearchResult } from '@ritmofit/shared';
import { TrackSearch } from './TrackSearch.js';
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
    expect(screen.getByText(/searching/i)).toBeTruthy();
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
