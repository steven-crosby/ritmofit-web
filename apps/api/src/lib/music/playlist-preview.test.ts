import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrackSearchResult } from '@ritmofit/shared';
import { loadPlaylistPreview, PreviewTimeoutError } from './playlist-preview.js';

const song = (id: string): TrackSearchResult => ({
  provider: 'spotify',
  providerTrackId: id,
  providerUri: null,
  title: `Song ${id}`,
  artist: 'QA',
  albumArtUrl: null,
  durationMs: 180_000,
});

describe('loadPlaylistPreview', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the list when the read finishes inside the deadline', async () => {
    const result = await loadPlaylistPreview(async () => [song('1')]);
    expect(result.map((row) => row.providerTrackId)).toEqual(['1']);
  });

  it('fails with the try-again message when the read never settles within 8 seconds', async () => {
    vi.useFakeTimers();
    const read = vi.fn(() => new Promise<TrackSearchResult[]>(() => {}));
    const pending = loadPlaylistPreview(read);
    const assertion = expect(pending).rejects.toBeInstanceOf(PreviewTimeoutError);
    await vi.advanceTimersByTimeAsync(8_000);
    await assertion;
    await expect(pending).rejects.toThrow('The playlist took too long to load. Try again.');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('discards a page that resolves after the deadline', async () => {
    vi.useFakeTimers();
    const read = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<TrackSearchResult[]>((resolve) => {
          signal.addEventListener('abort', () => resolve([song('late')]), { once: true });
        }),
    );
    const pending = loadPlaylistPreview(read);
    const assertion = expect(pending).rejects.toBeInstanceOf(PreviewTimeoutError);
    await vi.advanceTimersByTimeAsync(8_000);
    await assertion;
  });

  it('does not ask the reader for another page after abort', async () => {
    vi.useFakeTimers();
    const pages = vi.fn();
    const read = vi.fn(({ signal }: { signal: AbortSignal }) => {
      pages();
      return new Promise<TrackSearchResult[]>((resolve) => {
        signal.addEventListener(
          'abort',
          () => {
            if (!signal.aborted) pages();
            resolve([song('1')]);
          },
          { once: true },
        );
      });
    });
    const pending = loadPlaylistPreview(read);
    const assertion = expect(pending).rejects.toBeInstanceOf(PreviewTimeoutError);
    await vi.advanceTimersByTimeAsync(8_000);
    await assertion;
    expect(pages).toHaveBeenCalledTimes(1);
  });
});
