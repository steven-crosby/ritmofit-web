// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassTrack, ImportClassTracks, Provider, TrackSearchResult } from '@ritmofit/shared';
import { createOrderedImport, runOrderedImport } from './ordered-import.js';
import * as api from './api.js';
vi.mock('./api.js', async (original) => ({
  ...(await original<typeof import('./api.js')>()),
  importTrack: vi.fn(),
  importClassTracks: vi.fn(),
  listClassTracks: vi.fn(),
}));
const candidate = (title: string): TrackSearchResult => ({
  provider: 'apple_music',
  providerTrackId: title,
  providerUri: null,
  title,
  artist: 'QA',
  albumArtUrl: null,
  durationMs: 60000,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
let rows: ClassTrack[];
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  rows = [];
  vi.mocked(api.listClassTracks).mockImplementation(async () => [...rows]);
  vi.mocked(api.importTrack).mockImplementation(
    async (_provider: Provider, id: string) =>
      ({ id: `library-${id}` }) as Awaited<ReturnType<typeof api.importTrack>>,
  );
  vi.mocked(api.importClassTracks).mockImplementation(
    async (_classId: string, body: ImportClassTracks) => {
      for (const p of body.placements)
        if (!rows.some((r) => r.id === p.id))
          rows.push({ ...p, position: 0, updatedAt: 1 } as ClassTrack);
      rows = body.orderedIds.map((id, position) => ({
        ...rows.find((r) => r.id === id)!,
        position,
      }));
      return rows;
    },
  );
});

describe('ordered import orchestration', () => {
  it('waits for out-of-order resolutions and retains repeated occurrences', async () => {
    const slow = deferred<Awaited<ReturnType<typeof api.importTrack>>>();
    vi.mocked(api.importTrack).mockImplementation(async (_provider: Provider, id: string) =>
      id === 'A'
        ? slow.promise
        : ({ id: 'library-B' } as Awaited<ReturnType<typeof api.importTrack>>),
    );
    const session = createOrderedImport([candidate('A'), candidate('B'), candidate('A')]);
    const pending = runOrderedImport('class', session);
    await vi.waitFor(() => expect(api.importTrack).toHaveBeenCalledTimes(2));
    expect(api.importClassTracks).not.toHaveBeenCalled();
    slow.resolve({ id: 'library-A' } as Awaited<ReturnType<typeof api.importTrack>>);
    expect((await pending).error).toBeNull();
    expect(rows.map((r) => r.trackId)).toEqual(['library-A', 'library-B', 'library-A']);
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
  });
  it('preserves a ten-song playlist across all resolver batches', async () => {
    const titles = Array.from({ length: 10 }, (_value, i) => `Song ${i + 1}`);
    const requests = new Map(
      titles.map((title) => [title, deferred<Awaited<ReturnType<typeof api.importTrack>>>()]),
    );
    vi.mocked(api.importTrack).mockImplementation(
      async (_provider: Provider, id: string) => requests.get(id)!.promise,
    );
    const session = createOrderedImport(titles.map(candidate));
    const importing = runOrderedImport('class', session);
    for (const batch of [titles.slice(0, 4), titles.slice(4, 8), titles.slice(8)]) {
      await vi.waitFor(() =>
        expect(api.importTrack).toHaveBeenCalledWith('apple_music', batch[batch.length - 1]),
      );
      expect(api.importClassTracks).not.toHaveBeenCalled();
      for (const title of [...batch].reverse())
        requests
          .get(title)!
          .resolve({ id: `library-${title}` } as Awaited<ReturnType<typeof api.importTrack>>);
    }
    expect((await importing).error).toBeNull();
    expect(rows.map((r) => r.trackId)).toEqual(titles.map((title) => `library-${title}`));
    expect(api.importClassTracks).toHaveBeenCalledTimes(1);
  });

  it('recovers the middle failure in place and spends provider work only on it', async () => {
    vi.mocked(api.importTrack).mockImplementation(async (_provider: Provider, id: string) => {
      if (id === 'B') throw new Error('provider');
      return { id: `library-${id}` } as Awaited<ReturnType<typeof api.importTrack>>;
    });
    const session = createOrderedImport([candidate('A'), candidate('B'), candidate('C')]);
    await runOrderedImport('class', session);
    expect(rows.map((r) => r.trackId)).toEqual(['library-A', 'library-C']);
    vi.mocked(api.importTrack).mockResolvedValue({ id: 'library-B' } as Awaited<
      ReturnType<typeof api.importTrack>
    >);
    await runOrderedImport('class', session);
    expect(rows.map((r) => r.trackId)).toEqual(['library-A', 'library-B', 'library-C']);
    expect(api.importTrack).toHaveBeenCalledTimes(4);
    expect(api.importClassTracks).toHaveBeenCalledTimes(2);
  });
  it('replays the exact uncertain commit after reload, without resolving or appending again', async () => {
    const server = vi.mocked(api.importClassTracks).getMockImplementation()!;
    let receipt: ClassTrack[] | undefined;
    vi.mocked(api.importClassTracks).mockImplementationOnce(
      async (id: string, body: ImportClassTracks) => {
        receipt = await server(id, body);
        throw new TypeError('response lost');
      },
    );
    const session = createOrderedImport([candidate('A'), candidate('B')], 'reload-test');
    expect((await runOrderedImport('class', session)).error).toBe('response lost');
    const exact = structuredClone(session.pending!);
    const resumed = createOrderedImport([candidate('A'), candidate('B')], 'reload-test');
    vi.mocked(api.importClassTracks).mockImplementationOnce(
      async (_id: string, body: ImportClassTracks) => {
        expect(body).toEqual(exact);
        return receipt!;
      },
    );
    expect((await runOrderedImport('class', resumed)).error).toBeNull();
    expect(rows.length).toBe(2);
    expect(api.importTrack).toHaveBeenCalledTimes(2);
    expect(api.importClassTracks).toHaveBeenCalledTimes(2);
    expect(resumed.entries.every((e) => e.added)).toBe(true);
  });
  it('refreshes the snapshot after a definitive conflict while retaining occurrence IDs', async () => {
    vi.mocked(api.importClassTracks).mockRejectedValueOnce(
      new api.ApiError('changed', 'CONFLICT', 409),
    );
    const session = createOrderedImport([candidate('A')]);
    await runOrderedImport('class', session);
    const first = vi.mocked(api.importClassTracks).mock.calls[0][1];
    expect(session.pending).toBeUndefined();
    await runOrderedImport('class', session);
    const second = vi.mocked(api.importClassTracks).mock.calls[1][1];
    expect(second.operationId).not.toBe(first.operationId);
    expect(second.placements).toEqual(first.placements);
    expect(api.importTrack).toHaveBeenCalledTimes(1);
  });
  it('adds individual playlist rows in source order even when selected in reverse', async () => {
    const session = createOrderedImport([candidate('A'), candidate('B')]);
    await runOrderedImport('class', session, new Set([session.entries[1]!.id]));
    await runOrderedImport('class', session, new Set([session.entries[0]!.id]));
    expect(rows.map((r) => r.trackId)).toEqual(['library-A', 'library-B']);
  });
  it('does not undo an instructor reorder on retry', async () => {
    const session = createOrderedImport([candidate('A'), candidate('B'), candidate('C')]);
    await runOrderedImport(
      'class',
      session,
      new Set([session.entries[0]!.id, session.entries[2]!.id]),
    );
    rows = rows.reverse().map((r, position) => ({ ...r, position }));
    const outcome = await runOrderedImport('class', session);
    expect(outcome.error).toMatch(/moved or removed/);
    expect(api.importClassTracks).toHaveBeenCalledTimes(1);
    expect(rows.map((r) => r.trackId)).toEqual(['library-C', 'library-A']);
  });
  it('retains the original source snapshot if the playlist changes during an unresolved commit', async () => {
    const server = vi.mocked(api.importClassTracks).getMockImplementation()!;
    vi.mocked(api.importClassTracks).mockImplementationOnce(
      async (id: string, body: ImportClassTracks) => {
        await server(id, body);
        throw new TypeError('lost');
      },
    );
    const session = createOrderedImport([candidate('A'), candidate('B')], 'changed-playlist');
    await runOrderedImport('class', session);
    const original = session.pending!;
    const restored = createOrderedImport(
      [candidate('B'), candidate('A'), candidate('C')],
      'changed-playlist',
    );
    expect(restored.sourceChanged).toBe(true);
    expect(restored.entries.map((e) => e.candidate.title)).toEqual(['A', 'B']);
    expect(restored.pending).toEqual(original);
    vi.mocked(api.importClassTracks).mockResolvedValueOnce(rows);
    expect((await runOrderedImport('class', restored)).error).toBeNull();
    expect(api.importTrack).toHaveBeenCalledTimes(2);
    expect(rows.map((r) => r.trackId)).toEqual(['library-A', 'library-B']);
  });
});
