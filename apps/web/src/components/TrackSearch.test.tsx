// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { TrackSearchResult } from '@ritmofit/shared';
import { TrackSearch } from './TrackSearch.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

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
