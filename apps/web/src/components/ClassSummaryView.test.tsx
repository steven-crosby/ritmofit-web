// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RunPayload } from '@ritmofit/shared';
import { ClassSummaryView } from './ClassSummaryView.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

/** A run-payload with one section and one track carrying a move + a cue. */
function payload(): RunPayload {
  return {
    class: { title: 'Climb Night', totalDurationMs: 180000 },
    sections: [{ type: 'warm_up', startOffsetMs: 0 }],
    tracks: [
      {
        classTrackId: '00000000-0000-4000-8000-0000000000d1',
        displayBpm: 128,
        track: {
          title: 'Opener',
          artist: 'DJ Test',
          albumArtUrl: null,
          durationMs: 180000,
        },
        moves: [{ id: 'm1', name: 'Standing Climb', anchorMs: 30000, intensity: 'hard' }],
        cues: [{ id: 'c1', text: 'Lift the pace', anchorMs: 45000, color: '#ff0000' }],
      },
    ],
  } as unknown as RunPayload;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClassSummaryView', () => {
  it('renders songs, placed moves, cues, and section bands from the run-payload', async () => {
    vi.mocked(api.getRunPayload).mockResolvedValue(payload());

    render(<ClassSummaryView classId="c1" onClose={() => {}} onCopied={() => {}} />);

    expect(await screen.findByText('Opener')).toBeTruthy();
    expect(screen.getByText('Standing Climb')).toBeTruthy(); // a placed move
    expect(screen.getByText('Lift the pace')).toBeTruthy(); // a cue
    expect(screen.getByText('Warm-up')).toBeTruthy(); // a section band label
  });

  it('public preview offers "Save a copy" and copies on click', async () => {
    vi.mocked(api.getRunPayload).mockResolvedValue(payload());
    vi.mocked(api.copyClass).mockResolvedValue({ id: 'copy1' } as never);
    const onCopied = vi.fn();

    render(<ClassSummaryView classId="c1" onClose={() => {}} onCopied={onCopied} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save a copy' }));

    await waitFor(() => expect(api.copyClass).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(onCopied).toHaveBeenCalled());
  });

  it('owned preview offers "Open in builder" instead of copy', async () => {
    vi.mocked(api.getRunPayload).mockResolvedValue(payload());
    const onOpenInBuilder = vi.fn();

    render(<ClassSummaryView classId="c1" onClose={() => {}} onOpenInBuilder={onOpenInBuilder} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open in builder' }));
    expect(onOpenInBuilder).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Save a copy' })).toBeNull();
  });
});
