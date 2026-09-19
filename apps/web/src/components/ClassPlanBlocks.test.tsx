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
      />,
    );
    expect(screen.getByText('Loading teaching plan')).toBeTruthy();

    pending.resolve([block]);
    expect(await screen.findByRole('heading', { name: 'Arrive on the bike' })).toBeTruthy();
    expect(screen.getByText(/Planned 4:00/)).toBeTruthy();
    expect(screen.getByText(/4:00 under/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose music' }));
    expect(onChooseMusic).toHaveBeenCalledWith(block.id);
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
      />,
    );

    expect(await screen.findByText('Warmup — Artist')).toBeTruthy();
    expect(screen.getByText(/Planned 4:00/)).toBeTruthy();
    expect(screen.getByText(/Music 3:00/)).toBeTruthy();
    expect(screen.getByText(/1:00 under/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add another song' })).toBeTruthy();
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
      />,
    );
    await waitFor(() => expect(api.listClassPlanBlocks).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
