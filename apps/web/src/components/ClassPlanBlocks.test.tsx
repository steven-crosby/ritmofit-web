// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type {
  ClassPlanBlock,
  ClassTrack,
  CreateClassPlanBlock,
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

describe('scaffold block management', () => {
  const second: ClassPlanBlock = {
    ...block,
    id: '00000000-0000-4000-8000-0000000000b2',
    position: 1,
    label: 'Build the base',
  };

  const renderScaffold = (
    recipeId: 'cycle_45_v1' | 'pilates_45_v1' | 'hiit_45_v1',
    options: { tracks?: ClassTrack[]; canEdit?: boolean; onTracksChanged?: () => void } = {},
  ) =>
    render(
      <ClassPlanBlocks
        classId={block.classId}
        scaffoldRecipeId={recipeId}
        targetDurationMs={600_000}
        tracks={options.tracks ?? []}
        payload={null}
        canEdit={options.canEdit ?? true}
        assigningPlanBlockId={null}
        onChooseMusic={() => {}}
        onSelectTrack={() => {}}
        onTracksChanged={options.onTracksChanged ?? (() => {})}
      />,
    );

  const fillCommon = (name: string) => {
    fireEvent.change(screen.getByLabelText('Block name'), { target: { value: name } });
    fireEvent.change(screen.getByLabelText('Teaching goal'), {
      target: { value: 'Teach the next movement.' },
    });
    fireEvent.change(screen.getByLabelText('Movement focus'), {
      target: { value: 'Strong posture.' },
    });
    fireEvent.change(screen.getByLabelText('Planned time (m:ss)'), {
      target: { value: '5:00' },
    });
  };

  afterEach(() => vi.clearAllMocks());

  it('authors a Cycle block, validates its ranges, and keeps the class target fixed', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    vi.mocked(api.createClassPlanBlock).mockImplementation(
      async (_classId: string, body: CreateClassPlanBlock) => ({
        ...block,
        ...body,
        id: second.id,
        position: 1,
        recipeBlockKey: null,
      }),
    );
    renderScaffold('cycle_45_v1');
    fireEvent.click(await screen.findByRole('button', { name: 'Add block' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Block name'));
    expect((screen.getByLabelText('Posture') as HTMLSelectElement).value).toBe('seated');
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(screen.getByLabelText('Block name').getAttribute('aria-invalid')).toBe('true');
    expect(api.createClassPlanBlock).not.toHaveBeenCalled();

    fillCommon('Peak climb');
    fireEvent.change(screen.getByLabelText('Posture'), { target: { value: 'standing' } });
    fireEvent.change(screen.getByLabelText('Cadence min (RPM)'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Cadence max (RPM)'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Effort min (RPE)'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Effort max (RPE)'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Cadence max (RPM)'));
    expect(api.createClassPlanBlock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Cadence max (RPM)'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(api.createClassPlanBlock).toHaveBeenCalledWith(block.classId, {
      segmentType: null,
      label: 'Peak climb',
      targetDurationMs: 300_000,
      intensity: 'mod',
      teachingGoal: 'Teach the next movement.',
      movementFocus: 'Strong posture.',
      guidance: {
        kind: 'cycle',
        posture: 'standing',
        cadenceMinRpm: 90,
        cadenceMaxRpm: 100,
        rpeMin: 7,
        rpeMax: 8,
      },
    });
    const edit = await screen.findByRole('button', { name: 'Edit Block 2 · Peak climb' });
    await waitFor(() => expect(document.activeElement).toBe(edit));
    expect(screen.getByText('Class target 10:00')).toBeTruthy();
    expect(screen.getByText('Blocks total 9:00')).toBeTruthy();
  });

  it('recovers an empty Pilates scaffold and lets the authored equipment be edited', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
    let saved: ClassPlanBlock | null = null;
    vi.mocked(api.createClassPlanBlock).mockImplementation(
      async (_classId: string, body: CreateClassPlanBlock) => {
        saved = { ...block, ...body, recipeBlockKey: null };
        return saved;
      },
    );
    vi.mocked(api.updateClassPlanBlock).mockImplementation(
      async (_id: string, body: UpdateClassPlanBlock) => {
        saved = { ...saved!, ...body };
        return saved;
      },
    );
    renderScaffold('pilates_45_v1');
    expect(await screen.findByText('No teaching blocks yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fillCommon('Core balance');
    fireEvent.click(screen.getByLabelText('Band'));
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(api.createClassPlanBlock).toHaveBeenCalledWith(block.classId, {
      segmentType: null,
      label: 'Core balance',
      targetDurationMs: 300_000,
      intensity: 'mod',
      teachingGoal: 'Teach the next movement.',
      movementFocus: 'Strong posture.',
      guidance: { kind: 'pilates', optionalEquipment: ['band'] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Block 1 · Core balance' }));
    fireEvent.click(screen.getByLabelText('Mat'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(block.id, {
      guidance: { kind: 'pilates', optionalEquipment: ['band', 'mat'] },
    });
  });

  it('adds a continuous HIIT block and can edit it into timed rounds without changing planned time', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
    let saved: ClassPlanBlock | null = null;
    vi.mocked(api.createClassPlanBlock).mockImplementation(
      async (_classId: string, body: CreateClassPlanBlock) => {
        saved = { ...block, ...body, recipeBlockKey: null };
        return saved;
      },
    );
    vi.mocked(api.updateClassPlanBlock).mockImplementation(
      async (_id: string, body: UpdateClassPlanBlock) => {
        saved = { ...saved!, ...body };
        return saved;
      },
    );
    renderScaffold('hiit_45_v1');
    fireEvent.click(await screen.findByRole('button', { name: 'Add block' }));
    fillCommon('Circuit');
    expect((screen.getByLabelText('Timed rounds') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(api.createClassPlanBlock).toHaveBeenCalledWith(block.classId, {
      segmentType: null,
      label: 'Circuit',
      targetDurationMs: 300_000,
      intensity: 'mod',
      teachingGoal: 'Teach the next movement.',
      movementFocus: 'Strong posture.',
      guidance: {
        kind: 'hiit',
        rounds: null,
        workMs: null,
        recoveryMs: null,
        sequenceFocus: 'Strong posture.',
        equipment: 'bodyweight',
      },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Block 1 · Circuit' }));
    fireEvent.click(screen.getByLabelText('Timed rounds'));
    fireEvent.change(screen.getByLabelText('Rounds'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Work (s)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Recovery (s)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Equipment'), {
      target: { value: 'dumbbells_optional' },
    });
    expect(screen.getByText('Intervals 6:00 · Planned 5:00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(block.id, {
      guidance: {
        kind: 'hiit',
        rounds: 6,
        workMs: 30_000,
        recoveryMs: 30_000,
        sequenceFocus: 'Strong posture.',
        equipment: 'dumbbells_optional',
      },
    });
    expect(await screen.findByText('Intervals 6:00 · Planned 5:00')).toBeTruthy();
    expect(screen.getByText('Planned 5:00')).toBeTruthy();
  });

  it('keeps the add draft after a failed save', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
    vi.mocked(api.createClassPlanBlock).mockRejectedValue(new Error('Network down'));
    renderScaffold('pilates_45_v1');
    fireEvent.click(await screen.findByRole('button', { name: 'Add block' }));
    fillCommon('Balance');
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(await screen.findByText('Couldn’t add the block')).toBeTruthy();
    expect((screen.getByLabelText('Block name') as HTMLInputElement).value).toBe('Balance');
    expect((screen.getByRole('button', { name: 'Add block' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('reorders with keyboard-usable buttons and refreshes tracks after the server confirms', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block, second]);
    const pending = deferred<ClassPlanBlock[]>();
    vi.mocked(api.reorderClassPlanBlocks).mockReturnValue(pending.promise);
    const onTracksChanged = vi.fn();
    renderScaffold('cycle_45_v1', { onTracksChanged });
    const move = await screen.findByRole('button', {
      name: 'Move Block 1 · Arrive on the bike later',
    });
    expect(
      (
        screen.getByRole('button', {
          name: 'Move Block 1 · Arrive on the bike earlier',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    move.focus();
    fireEvent.click(move);
    expect(api.reorderClassPlanBlocks).toHaveBeenCalledWith(block.classId, {
      planBlockIds: [second.id, block.id],
    });
    expect(document.querySelector('ol')?.textContent?.indexOf('Build the base')).toBeLessThan(
      document.querySelector('ol')?.textContent?.indexOf('Arrive on the bike') ?? 0,
    );
    expect(onTracksChanged).not.toHaveBeenCalled();
    pending.resolve([
      { ...second, position: 0 },
      { ...block, position: 1 },
    ]);
    await waitFor(() => expect(onTracksChanged).toHaveBeenCalledOnce());
    expect(screen.getByRole('status').textContent).toContain('moved to block 2');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Edit Block 2 · Arrive on the bike' }),
    );
  });

  it('restores block order and explains a free-timeline conflict', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block, second]);
    vi.mocked(api.reorderClassPlanBlocks).mockRejectedValue(
      Object.assign(new Error('conflict'), { status: 409 }),
    );
    renderScaffold('cycle_45_v1');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Move Block 1 · Arrive on the bike later' }),
    );
    expect(await screen.findByText(/current music order prevents that move/)).toBeTruthy();
    expect(screen.getByText('Block 1')).toBeTruthy();
    expect(document.querySelector('ol')?.textContent?.indexOf('Arrive on the bike')).toBeLessThan(
      document.querySelector('ol')?.textContent?.indexOf('Build the base') ?? 0,
    );
  });

  it('requires song relocation before deleting an occupied block', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    renderScaffold('cycle_45_v1', { tracks: [assignedTrack()] });
    expect(await screen.findByText(/move each song with its Teaching block selector/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Delete Block 1 · Arrive on the bike' }),
    ).toBeNull();
  });

  it('confirms empty deletion, reloads positions, and restores focus to the next block', async () => {
    vi.mocked(api.listClassPlanBlocks)
      .mockResolvedValueOnce([block, second])
      .mockResolvedValueOnce([{ ...second, position: 0 }]);
    vi.mocked(api.deleteClassPlanBlock).mockResolvedValue();
    renderScaffold('cycle_45_v1');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Block 1 · Arrive on the bike' }),
    );
    const group = screen.getByRole('group', { name: 'Delete Block 1 · Arrive on the bike' });
    expect(document.activeElement).toBe(
      within(group).getByRole('button', { name: 'Delete block' }),
    );
    fireEvent.click(within(group).getByRole('button', { name: 'Delete block' }));
    expect(api.deleteClassPlanBlock).toHaveBeenCalledWith(block.id);
    const edit = await screen.findByRole('button', { name: 'Edit Block 1 · Build the base' });
    await waitFor(() => expect(document.activeElement).toBe(edit));
  });

  it('keeps Add block available after the last empty block is deleted', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValueOnce([block]).mockResolvedValueOnce([]);
    vi.mocked(api.deleteClassPlanBlock).mockResolvedValue();
    renderScaffold('cycle_45_v1');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Block 1 · Arrive on the bike' }),
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Delete Block 1 · Arrive on the bike' })).getByRole(
        'button',
        { name: 'Delete block' },
      ),
    );
    expect(await screen.findByText('No teaching blocks yet')).toBeTruthy();
    const add = screen.getByRole('button', { name: 'Add block' });
    await waitFor(() => expect(document.activeElement).toBe(add));
  });

  it('holds other plan changes while a delete is pending', async () => {
    vi.mocked(api.listClassPlanBlocks)
      .mockResolvedValueOnce([block, second])
      .mockResolvedValueOnce([{ ...second, position: 0 }]);
    const pending = deferred<void>();
    vi.mocked(api.deleteClassPlanBlock).mockReturnValue(pending.promise);
    renderScaffold('cycle_45_v1');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Block 1 · Arrive on the bike' }),
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Delete Block 1 · Arrive on the bike' })).getByRole(
        'button',
        { name: 'Delete block' },
      ),
    );
    expect((screen.getByRole('button', { name: 'Add block' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'Move Block 2 · Build the base earlier',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    pending.resolve();
    expect(
      await screen.findByRole('button', { name: 'Edit Block 1 · Build the base' }),
    ).toBeTruthy();
  });

  it('keeps the block when a concurrent song assignment makes deletion conflict', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block]);
    vi.mocked(api.deleteClassPlanBlock).mockRejectedValue(
      Object.assign(new Error('occupied'), { status: 409 }),
    );
    const onTracksChanged = vi.fn();
    renderScaffold('cycle_45_v1', { onTracksChanged });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Block 1 · Arrive on the bike' }),
    );
    fireEvent.click(
      screen
        .getByRole('group', { name: 'Delete Block 1 · Arrive on the bike' })
        .querySelector('button')!,
    );
    expect(await screen.findByText(/Music was assigned to this block/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Arrive on the bike' })).toBeTruthy();
    expect(onTracksChanged).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Edit Block 1 · Arrive on the bike' }),
    );
  });

  it('hides management controls without edit access', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([block, second]);
    renderScaffold('cycle_45_v1', { canEdit: false });
    expect(await screen.findByRole('heading', { name: 'Arrive on the bike' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add block' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move Block/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete Block/ })).toBeNull();
  });

  it('shows an accurate empty state to a read-only scaffold viewer', async () => {
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
    renderScaffold('cycle_45_v1', { canEdit: false });
    expect(await screen.findByText('This class has no teaching blocks.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add block' })).toBeNull();
  });
});

describe('ClassPlanBlocks block editor', () => {
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
    expect(screen.queryByRole('button', { name: /^Edit Block/ })).toBeNull();
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
      name: 'Edit Block 1 · Arrive on the bike',
    });
    expect(screen.getByText('On target')).toBeTruthy();
    fireEvent.click(edit);

    // The editor opens on the first field, the block name.
    expect(document.activeElement).toBe(screen.getByLabelText('Block name'));
    const input = screen.getByLabelText('Planned time (m:ss)') as HTMLInputElement;
    expect(input.value).toBe('4:00');
    fireEvent.click(screen.getByRole('button', { name: 'One minute more' }));
    expect(input.value).toBe('5:00');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(block.id, { targetDurationMs: 300_000 });
    const saving = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    expect(input.disabled).toBe(true);
    const intensity = screen.getByRole('group', {
      name: 'Intensity for Block 1 · Arrive on the bike',
    });
    expect(within(intensity).getByRole('button', { name: 'All Out' })).toHaveProperty(
      'disabled',
      true,
    );

    pending.resolve({ ...block, targetDurationMs: 300_000 });
    const reopened = await screen.findByRole('button', {
      name: 'Edit Block 1 · Arrive on the bike',
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
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Block 1 · Circuit A' }));
    expect(screen.queryByText('Intervals don’t match planned time')).toBeNull();
    fireEvent.change(screen.getByLabelText('Rounds'), { target: { value: '10' } });
    expect(screen.getByText('Intervals 10:00 · Planned 9:00')).toBeTruthy();
    fireEvent.submit(screen.getByRole('form', { name: 'Editing Block 1 · Circuit A' }));

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
    fireEvent.click(await screen.findByRole('button', { name: /^Edit Block/ }));
    const input = screen.getByLabelText('Planned time (m:ss)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '6:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Couldn’t save the block/);
    expect(alert.textContent).toMatch(/Network down/);
    expect(input.value).toBe('6:30');
    expect(input.disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('rejects an invalid duration without calling the API', async () => {
    renderBlocks([block]);
    fireEvent.click(await screen.findByRole('button', { name: /^Edit Block/ }));
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
    const edit = await screen.findByRole('button', { name: /^Edit Block/ });
    fireEvent.click(edit);
    const input = screen.getByLabelText('Planned time (m:ss)');
    fireEvent.change(input, { target: { value: '9:00' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('form')).toBeNull();
    const reopened = screen.getByRole('button', { name: /^Edit Block/ });
    expect(document.activeElement).toBe(reopened);
    expect(screen.getByText('Planned 4:00')).toBeTruthy();

    fireEvent.click(reopened);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(api.updateClassPlanBlock).not.toHaveBeenCalled();
  });

  it('saves each teaching field alone, trimmed, and only when it changed', async () => {
    vi.mocked(api.updateClassPlanBlock).mockImplementation(
      async (_id: string, body: UpdateClassPlanBlock) => ({ ...block, ...body }) as ClassPlanBlock,
    );
    renderBlocks([block]);
    const open = async () =>
      fireEvent.click(await screen.findByRole('button', { name: /^Edit Block 1 · / }));

    await open();
    fireEvent.change(screen.getByLabelText('Block name'), { target: { value: '  Easy spin ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.updateClassPlanBlock).toHaveBeenLastCalledWith(block.id, { label: 'Easy spin' });
    expect(await screen.findByRole('heading', { name: 'Easy spin' })).toBeTruthy();

    await open();
    fireEvent.change(screen.getByLabelText('Teaching goal'), {
      target: { value: 'Settle in and set the ride.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.updateClassPlanBlock).toHaveBeenLastCalledWith(block.id, {
      teachingGoal: 'Settle in and set the ride.',
    });
    expect(await screen.findByText('Settle in and set the ride.')).toBeTruthy();

    await open();
    fireEvent.change(screen.getByLabelText('Movement focus'), {
      target: { value: 'Light legs.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    // Cycle guidance has no focus copy, so no guidance is sent.
    expect(api.updateClassPlanBlock).toHaveBeenLastCalledWith(block.id, {
      movementFocus: 'Light legs.',
    });
    expect(api.updateClassPlanBlock).toHaveBeenCalledTimes(3);
  });

  it('raises a block to All Out, which starter recipes never prefill', async () => {
    vi.mocked(api.updateClassPlanBlock).mockResolvedValue({ ...hiitBlock, intensity: 'all_out' });
    renderBlocks([hiitBlock]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Block 1 · Circuit A' }));
    const group = screen.getByRole('group', { name: 'Intensity for Block 1 · Circuit A' });
    fireEvent.click(within(group).getByRole('button', { name: 'All Out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(hiitBlock.id, { intensity: 'all_out' });
    expect(await screen.findByLabelText('Intensity All Out')).toBeTruthy();
  });

  it('keeps the HIIT focus copy in step with an edited movement focus', async () => {
    vi.mocked(api.updateClassPlanBlock).mockResolvedValue(hiitBlock);
    renderBlocks([hiitBlock]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Block 1 · Circuit A' }));
    fireEvent.change(screen.getByLabelText('Movement focus'), {
      target: { value: 'Squat, push, trunk.' },
    });
    fireEvent.change(screen.getByLabelText('Rounds'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // One request: the focus, and guidance carrying both the interval edit and
    // the synced focus copy.
    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(hiitBlock.id, {
      movementFocus: 'Squat, push, trunk.',
      guidance: { ...hiitBlock.guidance, rounds: 8, sequenceFocus: 'Squat, push, trunk.' },
    });
  });

  it('blocks a blank name or goal and focuses the first one', async () => {
    renderBlocks([block]);
    fireEvent.click(await screen.findByRole('button', { name: /^Edit Block/ }));
    const name = screen.getByLabelText('Block name');
    const goal = screen.getByLabelText('Teaching goal');
    fireEvent.change(goal, { target: { value: '   ' } });
    fireEvent.change(name, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateClassPlanBlock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(goal.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/Name the block/)).toBeTruthy();

    fireEvent.change(name, { target: { value: 'Arrive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.updateClassPlanBlock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(goal);
  });

  it('keeps focus on Edit block after a save on an empty scaffold that auto-focused Choose music', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /^Edit Block/ }));
    fireEvent.change(screen.getByLabelText('Planned time (m:ss)'), { target: { value: '5:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Planned 5:00')).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Edit Block/ })),
    );
  });
});
