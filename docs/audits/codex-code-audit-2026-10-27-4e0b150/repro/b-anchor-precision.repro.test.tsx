// @vitest-environment jsdom
/**
 * Reviewer B audit repro (2026-10-27, SHA 4e0b150). Not product code.
 *
 * B-3: The cue / placed-move inline editors seed the anchor field with
 * `formatClockFromMs` (whole-second rounding) and always send `anchorMs`
 * back on Save, re-snapped when "Snap to beat" is on (the default whenever a
 * tempo is known). Editing only the text / intensity therefore rewrites an
 * untouched sub-second anchor — at 128 BPM a beat-snapped cue moves a whole
 * beat earlier.
 *
 * Each test asserts the CORRECT behaviour (anchor unchanged) and is expected to
 * FAIL at HEAD; the failure is the evidence.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CuesSection, MovesSection } from './ChoreographyEditor.js';
import { SegmentBand } from './SegmentBand.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function editRow() {
  return within(
    screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: 'Save' }))!,
  );
}

describe('Reviewer B repro: untouched anchors drift on edit', () => {
  it('B-3a: a text-only cue edit keeps a beat-snapped anchor (128 BPM, snap on by default)', async () => {
    // Beat 22 at 128 BPM from a 0 downbeat = 22 * 468.75 = 10312.5 → stored 10313.
    vi.mocked(api.listCues).mockResolvedValue([
      {
        id: 'cue-1',
        text: 'Climb',
        anchorMs: 10313,
        beat: 3,
        bar: 6,
        color: null,
        durationMs: null,
        bpm: null,
        intensity: null,
        note: null,
        position: 0,
      } as never,
    ]);
    vi.mocked(api.updateCue).mockResolvedValue({} as never);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} bpm={128} beatAnchorMs={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Climb' }));
    const row = editRow();
    console.info(
      '[B-3a] edit field seeded with:',
      (row.getByLabelText('Cue time (m:ss)') as HTMLInputElement).value,
    );
    fireEvent.change(row.getByLabelText('Move name'), { target: { value: 'Climb, sit tall' } });
    await act(async () => {
      fireEvent.click(row.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updateCue).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(api.updateCue).mock.calls[0]![1].anchorMs;
    console.info('[B-3a] stored anchorMs 10313 → PATCH anchorMs', sent);
    expect(sent).toBe(10313);
  });

  it('B-3b: an intensity-only placed-move edit keeps a sub-second anchor (no tempo)', async () => {
    vi.mocked(api.listPlacedMoves).mockResolvedValue([
      {
        id: 'pm-1',
        nameOverride: 'Sprint',
        moveId: null,
        userMoveId: null,
        anchorMs: 12750,
        intensity: null,
      } as never,
    ]);
    vi.mocked(api.listMoves).mockResolvedValue([]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.updatePlacedMove).mockResolvedValue({} as never);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit move Sprint' }));
    await act(async () => {
      fireEvent.click(editRow().getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updatePlacedMove).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(api.updatePlacedMove).mock.calls[0]![1].anchorMs;
    console.info('[B-3b] stored anchorMs 12750 → PATCH anchorMs', sent);
    expect(sent).toBe(12750);
  });

  it('B-3c: a type-only segment edit keeps a sub-second section start', async () => {
    vi.mocked(api.listSections).mockResolvedValue([
      { id: 'sec-1', classId: 'c-1', type: 'climb', startOffsetMs: 241500 } as never,
    ]);
    vi.mocked(api.updateSection).mockResolvedValue({} as never);
    render(
      <SegmentBand
        classId="c-1"
        totalDurationMs={1800000}
        canEdit
        trackStartsMs={[0, 241500]}
        onChanged={() => {}}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Edit .* segment$/ }));
    fireEvent.change(screen.getByLabelText('Segment type'), { target: { value: 'sprint' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(api.updateSection).mock.calls[0]![1].startOffsetMs;
    console.info('[B-3c] stored startOffsetMs 241500 → PATCH startOffsetMs', sent);
    expect(sent).toBe(241500);
  });
});
