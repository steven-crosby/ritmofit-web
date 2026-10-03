// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type {
  ClassTrack,
  TrackSearchResult,
  ProviderPlaylistSummary,
  Provider,
  ImportClassTracks,
} from '@ritmofit/shared';
import { TrackSearch } from './TrackSearch.js';
import * as api from '../lib/api.js';
vi.mock('../lib/api.js');
const songs: TrackSearchResult[] = ['One', 'Two', 'Three'].map((title) => ({
  provider: 'apple_music',
  providerTrackId: title,
  providerUri: null,
  title,
  artist: 'QA',
  albumArtUrl: null,
  durationMs: 60000,
}));
const playlists: ProviderPlaylistSummary[] = ['Alpha', 'Beta'].map((name) => ({
  provider: 'apple_music',
  playlistId: name,
  providerUri: null,
  name,
  ownerName: 'QA',
  trackCount: 3,
  coverImageUrl: null,
}));
let rows: ClassTrack[];
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  rows = [];
  vi.mocked(api.listConnections).mockResolvedValue([]);
  vi.mocked(api.listPlaylists).mockResolvedValue(playlists);
  vi.mocked(api.listPlaylistTracks).mockResolvedValue(songs);
  vi.mocked(api.listClassTracks).mockImplementation(async () => [...rows]);
  vi.mocked(api.importTrack).mockImplementation(
    async (_provider: Provider, id: string) =>
      ({ id: `lib-${id}` }) as Awaited<ReturnType<typeof api.importTrack>>,
  );
  vi.mocked(api.importClassTracks).mockImplementation(
    async (_classId: string, body: ImportClassTracks) => {
      for (const placement of body.placements)
        if (!rows.some((r) => r.id === placement.id))
          rows.push({ ...placement, position: 0, updatedAt: 1 } as ClassTrack);
      rows = body.orderedIds.map((id, position) => ({
        ...rows.find((r) => r.id === id)!,
        position,
      }));
      return rows;
    },
  );
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
async function index() {
  render(<TrackSearch classId="c1" onAdded={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
  await screen.findByText('Alpha');
}
async function openAlpha() {
  await index();
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]!);
  await screen.findAllByText('One');
}
async function reopenAlpha() {
  fireEvent.click(screen.getByRole('button', { name: 'Back to playlists' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]!);
  await screen.findAllByText('One');
}

it('reconciles deleted placements and permits an explicit re-add', async () => {
  await openAlpha();
  fireEvent.click(screen.getByRole('button', { name: /Import all 3 tracks/ }));
  await screen.findByText('Added all 3 tracks.');
  rows = [];
  await reopenAlpha();
  expect(rows).toHaveLength(0);
  await screen.findByText(/previously added songs were removed/);
  fireEvent.click(screen.getByRole('button', { name: /Import all 3 tracks from Alpha/ }));
  await screen.findByText('Added all 3 tracks.');
  expect(rows).toHaveLength(3);
  expect(new Set(rows.map((row) => row.id)).size).toBe(3);
});

it('recovers a reordered partial import without moving or duplicating authored songs', async () => {
  vi.mocked(api.importTrack).mockImplementation(async (_provider: Provider, id: string) => {
    if (id === 'Two') throw new Error('provider failed');
    return { id: `lib-${id}` } as Awaited<ReturnType<typeof api.importTrack>>;
  });
  await openAlpha();
  fireEvent.click(screen.getByRole('button', { name: /Import all 3 tracks/ }));
  await screen.findByText(/Added 2 of 3 tracks/);
  rows = [...rows].reverse().map((row, position) => ({ ...row, position, notes: 'Keep coaching' }));
  const authoredIds = rows.map((row) => row.id);
  vi.mocked(api.importTrack).mockResolvedValue({ id: 'lib-Two' } as Awaited<
    ReturnType<typeof api.importTrack>
  >);
  fireEvent.click(screen.getByRole('button', { name: /Retry 1 remaining track/ }));
  await screen.findByText(/Previously imported songs were moved or removed/);
  await reopenAlpha();
  fireEvent.click(screen.getByRole('button', { name: 'Add remaining songs at end' }));
  await screen.findByText('Added all 3 tracks.');
  expect(rows.slice(0, 2).map((row) => row.id)).toEqual(authoredIds);
  expect(rows.slice(0, 2).map((row) => row.notes)).toEqual(['Keep coaching', 'Keep coaching']);
  expect(rows[2]?.trackId).toBe('lib-Two');
  expect(new Set(rows.map((row) => row.id)).size).toBe(3);
});

it('ignores an earlier playlist response after the instructor opens another playlist', async () => {
  let resolveAlpha!: (value: TrackSearchResult[]) => void;
  const alpha = new Promise<TrackSearchResult[]>((resolve) => {
    resolveAlpha = resolve;
  });
  vi.mocked(api.listPlaylistTracks).mockImplementation(async (_provider: Provider, id: string) =>
    id === 'Alpha' ? alpha : [{ ...songs[0]!, providerTrackId: 'Beta Song', title: 'Beta Song' }],
  );
  await index();
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]!);
  fireEvent.click(screen.getByRole('button', { name: 'Back to playlists' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[1]!);
  await screen.findAllByText('Beta Song');
  await act(async () => {
    resolveAlpha(songs);
    await alpha;
  });
  expect(screen.queryByText('One')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Import all 1 tracks from Beta/ }));
  await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
  expect(rows.map((r) => r.trackId)).toEqual(['lib-Beta Song']);
});

it('confirms a saved operation after reload without fetching an unavailable provider playlist', async () => {
  vi.mocked(api.importClassTracks).mockRejectedValueOnce(new TypeError('response lost'));
  await openAlpha();
  fireEvent.click(screen.getByRole('button', { name: /Import all 3 tracks/ }));
  await screen.findByText(/We couldn’t confirm/);
  const original = structuredClone(vi.mocked(api.importClassTracks).mock.calls[0]![1]);
  cleanup();
  vi.mocked(api.listPlaylistTracks).mockRejectedValue(new Error('playlist unavailable'));
  await index();
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]!);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm previous import' }));
  await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.importClassTracks).mock.calls[1]![1]).toEqual(original);
  expect(api.listPlaylistTracks).toHaveBeenCalledTimes(1);
  expect(api.importTrack).toHaveBeenCalledTimes(3);
  expect(rows).toHaveLength(3);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Confirm previous import' })).toBeNull(),
  );
});

it('exposes pending confirmation when the provider playlist index is unavailable', async () => {
  vi.mocked(api.importClassTracks).mockRejectedValueOnce(new TypeError('response lost'));
  await openAlpha();
  fireEvent.click(screen.getByRole('button', { name: /Import all 3 tracks/ }));
  await screen.findByText(/We couldn’t confirm/);
  const original = structuredClone(vi.mocked(api.importClassTracks).mock.calls[0]![1]);
  cleanup();
  vi.mocked(api.listPlaylists).mockRejectedValue(new Error('provider unavailable'));
  vi.mocked(api.listPlaylistTracks).mockRejectedValue(new Error('playlist deleted'));
  render(<TrackSearch classId="c1" onAdded={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Review unconfirmed import from Alpha' }),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm previous import' }));
  await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.importClassTracks).mock.calls[1]![1]).toEqual(original);
  expect(api.listPlaylistTracks).toHaveBeenCalledTimes(1);
});

it('does not show a previous playlist import error under a newer playlist', async () => {
  let rejectCommit!: (error: Error) => void;
  const pending = new Promise<Awaited<ReturnType<typeof api.importClassTracks>>>(
    (_resolve, reject) => {
      rejectCommit = reject;
    },
  );
  vi.mocked(api.importClassTracks).mockImplementationOnce(() => pending);
  await openAlpha();
  fireEvent.click(screen.getByRole('button', { name: /Import all 3 tracks/ }));
  await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Back to playlists' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[1]!);
  await screen.findAllByText('One');
  await act(async () => {
    rejectCommit(new Error('Alpha response failed'));
    await pending.catch(() => {});
  });
  expect(screen.queryByText('Alpha response failed')).toBeNull();
  expect(
    (screen.getByRole('button', { name: /Import all 3 tracks from Beta/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  expect(screen.queryByText(/Added all/)).toBeNull();
});

it('discards a playlist response after the destination class changes', async () => {
  let resolveSongs!: (value: TrackSearchResult[]) => void;
  const pending = new Promise<TrackSearchResult[]>((resolve) => {
    resolveSongs = resolve;
  });
  vi.mocked(api.listPlaylistTracks).mockReturnValue(pending);
  const view = render(<TrackSearch classId="c1" onAdded={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apple Music' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved playlists' }));
  await screen.findByText('Alpha');
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]!);
  view.rerender(<TrackSearch classId="c2" onAdded={() => {}} />);
  await act(async () => {
    resolveSongs(songs);
    await pending;
  });
  expect(screen.queryByText('One')).toBeNull();
  expect(screen.queryByRole('button', { name: /Import all/ })).toBeNull();
  expect(api.importClassTracks).not.toHaveBeenCalled();
});
