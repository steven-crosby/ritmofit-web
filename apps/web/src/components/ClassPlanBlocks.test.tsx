// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type {
  ClassPlanBlock,
  ClassTrack,
  RunPayload,
  UpdateClassPlanBlock,
} from '@ritmofit/shared';
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
    expect(screen.getByText('Planned 4:00')).toBeTruthy();
    expect(screen.getByText('No music yet')).toBeTruthy();
    expect(screen.queryByText(/under|over|Music 0:00/)).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose music for Block 1 · Arrive on the bike' }),
    );
    expect(onChooseMusic).toHaveBeenCalledWith({
      id: block.id,
      label: block.label,
      position: block.position,
    });
  });

  it('waits for the current music time before comparing an assigned track with the plan', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    const props = {
      classId: block.classId,
      tracks: [assignedTrack()],
      payload: null as RunPayload | null,
      canEdit: true,
      assigningPlanBlockId: null,
      onChooseMusic: () => {},
      onSelectTrack: () => {},
      onTracksChanged: () => {},
    };
    const { rerender } = render(<ClassPlanBlocks {...props} />);

    expect(await screen.findByText('Planned 4:00')).toBeTruthy();
    expect(screen.queryByText(/under|over|Music 0:00/)).toBeNull();

    rerender(<ClassPlanBlocks {...props} payload={{ tracks: [] } as unknown as RunPayload} />);
    expect(screen.getByText('Planned 4:00')).toBeTruthy();
    expect(screen.queryByText(/under|over|Music 0:00/)).toBeNull();

    const payload = {
      tracks: [
        {
          classTrackId: assignedTrack().id,
          track: { title: 'Warmup', artist: 'Artist', durationMs: 180_000 },
        },
      ],
    } as RunPayload;
    rerender(<ClassPlanBlocks {...props} payload={payload} />);
    expect(screen.getByText(/Music 3:00/)).toBeTruthy();
    expect(screen.getByText(/1:00 under/)).toBeTruthy();
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

  it('keeps dest on the same block when adding another song', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    const onChooseMusic = vi.fn();
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
        onChooseMusic={onChooseMusic}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Add another song to Block 1 · Arrive on the bike',
      }),
    );
    expect(onChooseMusic).toHaveBeenCalledWith(
      { id: block.id, label: block.label, position: block.position },
      { stay: true },
    );
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

  it('hosts the open picker on the dest card and turns Choose music into Close', async () => {
    const second: ClassPlanBlock = {
      ...block,
      id: '00000000-0000-4000-8000-0000000000b2',
      position: 1,
      label: 'Climb',
    };
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block, second]);
    const onCloseMusic = vi.fn();
    render(
      <ClassPlanBlocks
        classId={block.classId}
        tracks={[]}
        payload={null}
        canEdit
        assigningPlanBlockId={block.id}
        musicPicker={<div>Picker for dest</div>}
        onChooseMusic={() => {}}
        onCloseMusic={onCloseMusic}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );

    const destCard = await waitFor(() => {
      const card = document.getElementById(`plan-block-card-${block.id}`);
      expect(card?.textContent).toMatch(/Picker for dest/);
      return card!;
    });
    expect(document.getElementById(`plan-block-card-${second.id}`)?.textContent).not.toMatch(
      /Picker for dest/,
    );
    fireEvent.click(within(destCard).getByRole('button', { name: 'Close music' }));
    expect(onCloseMusic).toHaveBeenCalled();
  });
});

describe('ClassPlanBlocks planned-time editor', () => {
  const hiitBlock: ClassPlanBlock = {
    ...block,
    id: '00000000-0000-4000-8000-0000000000b3',
    recipeBlockKey: 'hiit_circuit_a',
    segmentType: null,
    label: 'Circuit A',
    targetDurationMs: 540_000,
    intensity: 'hard',
    guidance: {
      kind: 'hiit',
      workMs: 30_000,
      recoveryMs: 30_000,
      rounds: 9,
      sequenceFocus: 'Lower body, upper body, locomotion, trunk.',
      equipment: 'bodyweight',
    },
  };

  const renderBlocks = (
    blocks: ClassPlanBlock[],
    props: { canEdit?: boolean; targetDurationMs?: number | null } = {},
  ) => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue(blocks);
    return render(
      <ClassPlanBlocks
        classId={block.classId}
        targetDurationMs={props.targetDurationMs ?? null}
        tracks={[]}
        payload={null}
        canEdit={props.canEdit ?? true}
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={() => {}}
      />,
    );
  };

  afterEach(() => vi.mocked(api.updateClassPlanBlock).mockReset());

  it('is read-only without edit access but still shows the target gap and HIIT mismatch', async () => {
    renderBlocks([{ ...hiitBlock, targetDurationMs: 600_000 }], {
      canEdit: false,
      targetDurationMs: 540_000,
    });
    expect(await screen.findByText('Class target 9:00')).toBeTruthy();
    expect(screen.getByText('Blocks total 10:00')).toBeTruthy();
    expect(screen.getByText('1:00 over target')).toBeTruthy();
    expect(screen.getByText('Intervals don’t match planned time')).toBeTruthy();
    expect(screen.getByText('Intervals 9:00 · Planned 10:00')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Edit planned time/ })).toBeNull();
  });

  it('omits the gap when the class has no target', async () => {
    renderBlocks([block]);
    expect(await screen.findByText('Blocks total 4:00')).toBeTruthy();
    expect(screen.queryByText(/Class target|target$/)).toBeNull();
  });

  it('saves only planned time, keeps the class target, and returns focus', async () => {
    const pending = deferred<ClassPlanBlock>();
    vi.mocked(api.updateClassPlanBlock).mockReturnValue(pending.promise);
    renderBlocks([block], { targetDurationMs: 240_000 });
    const edit = await screen.findByRole('button', {
      name: 'Edit planned time for Block 1 · Arrive on the bike',
    });
    expect(screen.getByText('On target')).toBeTruthy();
    fireEvent.click(edit);

    const input = screen.getByLabelText('Planned time (m:ss)') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('4:00');
    fireEvent.click(screen.getByRole('button', { name: 'One minute more' }));
    expect(input.value).toBe('5:00');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(block.id, { targetDurationMs: 300_000 });
    const saving = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    expect(input.disabled).toBe(true);

    pending.resolve({ ...block, targetDurationMs: 300_000 });
    const reopened = await screen.findByRole('button', {
      name: 'Edit planned time for Block 1 · Arrive on the bike',
    });
    await waitFor(() => expect(document.activeElement).toBe(reopened));
    expect(screen.getByText('Planned 5:00')).toBeTruthy();
    expect(screen.getByText('Class target 4:00')).toBeTruthy();
    expect(screen.getByText('1:00 over target')).toBeTruthy();
  });

  it('saves merged HIIT guidance without touching planned time, warning on the draft mismatch', async () => {
    vi.mocked(api.updateClassPlanBlock).mockImplementation(
      async (_id: string, body: UpdateClassPlanBlock) => ({
        ...hiitBlock,
        ...(body.guidance ? { guidance: body.guidance } : {}),
      }),
    );
    renderBlocks([hiitBlock]);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit planned time for Block 1 · Circuit A' }),
    );
    expect(screen.queryByText('Intervals don’t match planned time')).toBeNull();
    fireEvent.change(screen.getByLabelText('Rounds'), { target: { value: '10' } });
    expect(screen.getByText('Intervals 10:00 · Planned 9:00')).toBeTruthy();
    fireEvent.submit(screen.getByRole('form', { name: 'Planned time for Block 1 · Circuit A' }));

    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(hiitBlock.id, {
      guidance: { ...hiitBlock.guidance, rounds: 10 },
    });
    expect(await screen.findByText('Intervals 10:00 · Planned 9:00')).toBeTruthy();
    expect(screen.getByText('Planned 9:00')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('keeps the draft and announces a failed save', async () => {
    vi.mocked(api.updateClassPlanBlock).mockRejectedValue(new Error('Network down'));
    renderBlocks([block]);
    fireEvent.click(await screen.findByRole('button', { name: /Edit planned time/ }));
    const input = screen.getByLabelText('Planned time (m:ss)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '6:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Couldn’t save planned time/);
    expect(alert.textContent).toMatch(/Network down/);
    expect(input.value).toBe('6:30');
    expect(input.disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('rejects an invalid duration without calling the API', async () => {
    renderBlocks([block]);
    fireEvent.click(await screen.findByRole('button', { name: /Edit planned time/ }));
    const input = screen.getByLabelText('Planned time (m:ss)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateClassPlanBlock).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/Use minutes and seconds/)).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it('cancels on Escape or an unchanged save without calling the API', async () => {
    renderBlocks([block]);
    const edit = await screen.findByRole('button', { name: /Edit planned time/ });
    fireEvent.click(edit);
    const input = screen.getByLabelText('Planned time (m:ss)');
    fireEvent.change(input, { target: { value: '9:00' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('form')).toBeNull();
    const reopened = screen.getByRole('button', { name: /Edit planned time/ });
    expect(document.activeElement).toBe(reopened);
    expect(screen.getByText('Planned 4:00')).toBeTruthy();

    fireEvent.click(reopened);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(api.updateClassPlanBlock).not.toHaveBeenCalled();
  });

  it('keeps focus on Edit time after a save on an empty scaffold that auto-focused Choose music', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    vi.mocked(api.updateClassPlanBlock).mockResolvedValue({ ...block, targetDurationMs: 300_000 });
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
      />,
    );
    const choose = await screen.findByRole('button', { name: /Choose music for Block 1/ });
    await waitFor(() => expect(document.activeElement).toBe(choose));

    fireEvent.click(screen.getByRole('button', { name: /Edit planned time/ }));
    fireEvent.change(screen.getByLabelText('Planned time (m:ss)'), { target: { value: '5:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Planned 5:00')).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /Edit planned time/ }),
      ),
    );
  });
});
