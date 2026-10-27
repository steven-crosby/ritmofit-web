// @vitest-environment jsdom
// Lane C audit repro (2026-10-27) — ordered import retry/partial failure. Not product code.
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
  provider: 'spotify',
  providerTrackId: title,
  providerUri: null,
  title,
  artist: 'QA',
  albumArtUrl: null,
  durationMs: 60000,
});
let rows: ClassTrack[];
let operations: Set<string>;
let loseNextResponse: boolean;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  rows = [];
  operations = new Set();
  loseNextResponse = false;
  vi.mocked(api.listClassTracks).mockImplementation(async () => [...rows]);
  vi.mocked(api.importTrack).mockImplementation(
    async (_provider: Provider, id: string) =>
      ({ id: `library-${id}` }) as Awaited<ReturnType<typeof api.importTrack>>,
  );
  // Server fake: receipts keyed by operationId, placements keyed by occurrence id.
  vi.mocked(api.importClassTracks).mockImplementation(
    async (_classId: string, body: ImportClassTracks) => {
      if (!operations.has(body.operationId)) {
        operations.add(body.operationId);
        for (const p of body.placements)
          if (!rows.some((r) => r.id === p.id))
            rows.push({ ...p, position: rows.length, updatedAt: 1 } as ClassTrack);
      }
      if (loseNextResponse) {
        loseNextResponse = false;
        throw new TypeError('Failed to fetch'); // write landed, response lost
      }
      return rows;
    },
  );
});

describe('C-24 ephemeral sessions cannot replay an uncertain commit', () => {
  it('URL-import style retry (fresh createOrderedImport) duplicates every song', async () => {
    const songs = [candidate('a'), candidate('b'), candidate('c')];
    loseNextResponse = true;
    // TrackSearch.commitPreviewOccurrences: new session, no storageKey, songBlocks.
    const first = await runOrderedImport('class-1', createOrderedImport(songs), undefined, null, {
      songBlocks: true,
    });
    expect(first.error).toBe('Failed to fetch');
    expect(rows).toHaveLength(3); // the write actually landed
    // The instructor resubmits the same link: a second fresh session.
    const second = await runOrderedImport('class-1', createOrderedImport(songs), undefined, null, {
      songBlocks: true,
    });
    expect(second.error).toBeNull();
    expect(rows.map((r) => r.trackId)).toEqual([
      'library-a',
      'library-b',
      'library-c',
      'library-a',
      'library-b',
      'library-c',
    ]);
  });

  it('control: a persisted session replays the same operation and adds nothing', async () => {
    const songs = [candidate('a'), candidate('b')];
    loseNextResponse = true;
    const key = 'ritmo-import:class-1:x';
    await runOrderedImport('class-1', createOrderedImport(songs, key), undefined, null, {
      songBlocks: true,
    });
    await runOrderedImport('class-1', createOrderedImport(songs, key), undefined, null, {
      songBlocks: true,
    });
    expect(rows).toHaveLength(2);
  });
});

describe('C-25 unresolved songs are dropped with a success result', () => {
  it('returns error:null when a library import is rate-limited (429)', async () => {
    vi.mocked(api.importTrack).mockImplementation(async (_p: Provider, id: string) => {
      if (id === 'b') throw new api.ApiError('Too many requests.', 'RATE_LIMITED', 429);
      return { id: `library-${id}` } as Awaited<ReturnType<typeof api.importTrack>>;
    });
    const session = createOrderedImport([candidate('a'), candidate('b'), candidate('c')]);
    const outcome = await runOrderedImport('class-1', session, undefined, null, {
      songBlocks: true,
    });
    expect(outcome).toEqual({ error: null });
    expect(rows.map((r) => r.trackId)).toEqual(['library-a', 'library-c']);
    expect(session.entries.filter((e) => !e.added)).toHaveLength(1);
  });
});
