// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import { ClassPlanBlocks } from './ClassPlanBlocks.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const block: ClassPlanBlock = {
  id: '00000000-0000-4000-8000-0000000000b1',
  classId: '00000000-0000-4000-8000-0000000000c1',
  recipeBlockKey: 'cycle_arrive',
  position: 0,
  segmentType: 'warm_up',
  label: 'Arrive on the bike',
  targetDurationMs: 240_000,
  intensity: 'easy',
  teachingGoal: 'Establish rhythm and preview the ride shape.',
  movementFocus: 'Comfortable pedal stroke and relaxed upper body.',
  guidance: {
    kind: 'cycle',
    posture: 'seated',
    cadenceMinRpm: 80,
    cadenceMaxRpm: 95,
    rpeMin: 2,
    rpeMax: 3,
  },
  createdAt: 1,
  updatedAt: 1,
};

function assignedTrack(): ClassTrack {
  return {
    id: '00000000-0000-4000-8000-0000000000a1',
    classId: block.classId,
    trackId: '00000000-0000-4000-8000-0000000000t1',
    planBlockId: block.id,
    position: 0,
    intensity: 'mod',
    displayBpmOverride: null,
    durationMsOverride: null,
    clipStartMs: 0,
    clipEndMs: null,
    beatAnchorMs: 0,
    startOffsetMs: 0,
    notes: null,
    displayRpm: null,
    holdCount: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

afterEach(cleanup);

describe('ClassPlanBlocks', () => {
  it('shows loading, then empty-block choose music', async () => {
    const pending = deferred<ClassPlanBlock[]>();
    vi.mocked(api.listClassPlanBlocks).mockReturnValue(pending.promise);
    const onChooseMusic = vi.fn();
    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[]}
        payload={null}
        canEdit
        assigningPlanBlockId={null}
        onChooseMusic={onChooseMusic}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );
    expect(screen.getByText('Loading teaching plan')).toBeTruthy();

    pending.resolve([block]);
    expect(await screen.findByRole('heading', { name: 'Arrive on the bike' })).toBeTruthy();
    expect(screen.getByText(/Planned 4:00/)).toBeTruthy();
    expect(screen.getByText(/4:00 under/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose music for Block 1 · Arrive on the bike' }),
    );
    expect(onChooseMusic).toHaveBeenCalledWith({
      id: block.id,
      label: block.label,
      position: block.position,
    });
  });

  it('renders populated music and the planned-versus-actual difference', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    const payload = {
      tracks: [
        {
          classTrackId: assignedTrack().id,
          track: { title: 'Warmup', artist: 'Artist', durationMs: 180_000 },
        },
      ],
    } as RunPayload;

    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[assignedTrack()]}
        payload={payload}
        canEdit
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );

    expect(await screen.findByText('Warmup — Artist')).toBeTruthy();
    expect(screen.getByText(/Planned 4:00/)).toBeTruthy();
    expect(screen.getByText(/Music 3:00/)).toBeTruthy();
    expect(screen.getByText(/1:00 under/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Add another song to Block 1 · Arrive on the bike' }),
    ).toBeTruthy();
  });

  it('retries after a failed load', async () => {
    vi.mocked(api.listClassPlanBlocks)
      .mockRejectedValueOnce(new Error('plan down'))
      .mockResolvedValueOnce([block]);
    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[]}
        payload={null}
        canEdit
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );

    expect(await screen.findByText('Couldn’t load the teaching plan')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Arrive on the bike' })).toBeTruthy();
  });

  it('renders nothing when the class has no plan blocks', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
    const { container } = render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[]}
        payload={null}
        canEdit
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );
    await waitFor(() => expect(api.listClassPlanBlocks).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('moves an assigned song to another block through the existing assign endpoint', async () => {
    const second: ClassPlanBlock = {
      ...block,
      id: '00000000-0000-4000-8000-0000000000b2',
      position: 1,
      label: 'Build the base',
    };
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block, second]);
    vi.mocked(api.assignClassTrackPlanBlock).mockResolvedValue({} as ClassTrack);
    const onTracksChanged = vi.fn();
    const payload = {
      tracks: [
        {
          classTrackId: assignedTrack().id,
          track: { title: 'Warmup', artist: 'Artist', durationMs: 180_000 },
        },
      ],
    } as RunPayload;

    const props = {
      classId: block.classId,
      payload,
      canEdit: true,
      assigningPlanBlockId: null,
      onChooseMusic: () => {},
      onSelectTrack: () => {},
      onTracksChanged,
    };
    const { rerender } = render(<ClassPlanBlocks {...props} tracks={[assignedTrack()]} />);

    const select = await screen.findByRole('combobox', {
      name: 'Teaching block for Warmup — Artist',
    });
    expect((select as HTMLSelectElement).value).toBe(block.id);
    fireEvent.change(select, { target: { value: second.id } });

    await waitFor(() =>
      expect(api.assignClassTrackPlanBlock).toHaveBeenCalledWith(assignedTrack().id, {
        planBlockId: second.id,
      }),
    );
    await waitFor(() => expect(onTracksChanged).toHaveBeenCalled());
    const moved = screen.getByRole('combobox', {
      name: 'Teaching block for Warmup — Artist',
    });
    expect((moved as HTMLSelectElement).value).toBe(second.id);
    expect(document.activeElement).toBe(moved);
    rerender(
      <ClassPlanBlocks {...props} tracks={[{ ...assignedTrack(), planBlockId: second.id }]} />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Teaching block for Warmup — Artist' }),
    );
  });

  it('offers a block for an unassigned song instead of only naming the problem', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    vi.mocked(api.assignClassTrackPlanBlock).mockResolvedValue({} as ClassTrack);
    const floating: ClassTrack = { ...assignedTrack(), planBlockId: null };
    const payload = {
      tracks: [
        {
          classTrackId: floating.id,
          track: { title: 'Floating', artist: 'Fixture', durationMs: 180_000 },
        },
      ],
    } as RunPayload;

    const props = {
      classId: block.classId,
      payload,
      canEdit: true,
      assigningPlanBlockId: null,
      onChooseMusic: () => {},
      onSelectTrack: () => {},
      onTracksChanged: () => {},
    };
    const { rerender } = render(<ClassPlanBlocks {...props} tracks={[floating]} />);

    expect(await screen.findByText(/is not in a plan block yet/)).toBeTruthy();
    const select = screen.getByRole('combobox', { name: 'Teaching block for Floating — Fixture' });
    expect((select as HTMLSelectElement).value).toBe('');
    fireEvent.change(select, { target: { value: block.id } });

    await waitFor(() =>
      expect(api.assignClassTrackPlanBlock).toHaveBeenCalledWith(floating.id, {
        planBlockId: block.id,
      }),
    );
    const moved = screen.getByRole('combobox', {
      name: 'Teaching block for Floating — Fixture',
    });
    expect((moved as HTMLSelectElement).value).toBe(block.id);
    expect(document.activeElement).toBe(moved);
    rerender(<ClassPlanBlocks {...props} tracks={[{ ...floating, planBlockId: block.id }]} />);
    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Teaching block for Floating — Fixture' }),
    );
  });

  it('reports a failed move without losing the song', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    vi.mocked(api.assignClassTrackPlanBlock).mockRejectedValue(new Error('offline'));
    const floating: ClassTrack = { ...assignedTrack(), planBlockId: null };
    const payload = {
      tracks: [
        {
          classTrackId: floating.id,
          track: { title: 'Floating', artist: 'Fixture', durationMs: 180_000 },
        },
      ],
    } as RunPayload;

    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[floating]}
        payload={payload}
        canEdit
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );

    const select = await screen.findByRole('combobox', {
      name: 'Teaching block for Floating — Fixture',
    });
    fireEvent.change(select, { target: { value: block.id } });

    expect(await screen.findByText('Couldn’t move this song')).toBeTruthy();
    expect(screen.getByText('Floating — Fixture')).toBeTruthy();
  });

  it('reports the planning next step once blocks load', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    const onPlanNextStep = vi.fn();
    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[]}
        payload={null}
        canEdit
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
        onPlanNextStep={onPlanNextStep}
      />,
    );
    await waitFor(() => expect(onPlanNextStep).toHaveBeenCalledWith('Block 1 still needs music'));
  });

  it('hides the move control when the class is read-only', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    const payload = {
      tracks: [
        {
          classTrackId: assignedTrack().id,
          track: { title: 'Warmup', artist: 'Artist', durationMs: 180_000 },
        },
      ],
    } as RunPayload;

    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[assignedTrack()]}
        payload={payload}
        canEdit={false}
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );

    expect(await screen.findByText('Warmup — Artist')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('focuses the first Choose music on an empty scaffold', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    const onHasPlanBlocks = vi.fn();
    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[]}
        payload={null}
        canEdit
        assigningPlanBlockId={null}
        focusFirstChoose
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
        onHasPlanBlocks={onHasPlanBlocks}
      />,
    );

    const choose = await screen.findByRole('button', {
      name: 'Choose music for Block 1 · Arrive on the bike',
    });
    await waitFor(() => expect(document.activeElement).toBe(choose));
    expect(onHasPlanBlocks).toHaveBeenCalledWith(true);
  });
});
