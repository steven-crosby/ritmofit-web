// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassWithAccess, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { ClassHeaderCard } from './Dashboard.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const cls = {
  id: '00000000-0000-4000-8000-000000000001',
  ownerUserId: 'owner',
  title: 'Monday Ride',
  description: null,
  template: 'cycle',
  status: 'draft',
  visibility: 'private',
  timelineMode: 'sequential',
  targetDurationMs: null,
  scaffoldRecipeId: null,
  createdAt: 1,
  updatedAt: 1,
  lastOpenedAt: null,
  accessLevel: 'owner',
  featuredCategory: null,
  coverImageUrl: null,
  tags: [],
} satisfies ClassWithAccess;

const missingEntry = {
  classTrackId: '00000000-0000-4000-8000-000000000002',
  displayBpm: null,
  cues: [],
  moves: [],
  providerRefs: [],
  track: { title: 'Unknown Length', durationMs: null },
} as unknown as RunPayloadTrackEntry;

const payload = {
  class: { totalDurationMs: 0 },
  tracks: [missingEntry],
} as RunPayload;

describe('ClassHeaderCard Live readiness', () => {
  it('disables Live mode and selects a track that needs duration', () => {
    const onRun = vi.fn();
    const onSelectTrack = vi.fn();
    render(
      <ClassHeaderCard
        cls={cls}
        payload={payload}
        trackCount={1}
        isOwner
        canEdit
        canRun={false}
        onError={() => {}}
        onRun={onRun}
        onSelectTrack={onSelectTrack}
        onStartChoreography={() => {}}
        onClassUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    const runButton = screen.getByRole('button', { name: /run live/i });
    expect(runButton).toHaveProperty('disabled', true);
    fireEvent.click(runButton);
    expect(onRun).not.toHaveBeenCalled();

    // This track is flagged by three dimensions (no duration, no BPM, no provider),
    // so it shows as a fix-chip in each ("Fix length on Unknown Length", …); any
    // chip jumps the inspector to it.
    fireEvent.click(screen.getAllByRole('button', { name: /Unknown Length/ })[0]!);
    expect(onSelectTrack).toHaveBeenCalledWith(missingEntry.classTrackId);
    // Readiness names the gap and marks it as the one thing blocking Live.
    expect(screen.getByText(/duration needed/i)).toBeTruthy();
    expect(screen.getByText(/blocks live/i)).toBeTruthy();
  });

  it('explains the disabled Run-live gate at the button itself, accessibly', () => {
    render(
      <ClassHeaderCard
        cls={cls}
        payload={payload}
        trackCount={1}
        isOwner
        canEdit
        canRun={false}
        onError={() => {}}
        onRun={() => {}}
        onSelectTrack={() => {}}
        onStartChoreography={() => {}}
        onClassUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    const runButton = screen.getByRole('button', { name: /run live/i });
    // The reason is programmatically associated, not hover-title only.
    const describedBy = runButton.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    // …and visible: a track without a length is named as the run gate.
    expect(document.getElementById(describedBy!)?.textContent).toMatch(/length to run/i);
  });

  it('guards the empty class where the readiness panel is not shown', () => {
    // payload null + zero tracks → no readiness panel, so the greyed button is
    // the only signal; it must still say why, at the button.
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);

    const runButton = screen.getByRole('button', { name: /run live/i });
    const describedBy = runButton.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toMatch(/add a track to run/i);
  });

  it('lets an unfinished plan speak at 0 tracks and quiets Run live', () => {
    render(
      <ClassHeaderCard
        {...baseProps}
        cls={cls}
        isOwner
        canEdit
        planLead="7 blocks still need music"
      />,
    );

    expect(screen.getAllByText('7 blocks still need music').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Class next step')).toBeTruthy();
    expect(screen.queryByText(/what live needs from this class/i)).toBeNull();
    const runButton = screen.getByRole('button', { name: /run live/i });
    expect(runButton.className).not.toMatch(/rf-btn-primary/);
    const describedBy = runButton.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy!)?.textContent).toMatch(/7 blocks still need music/);
  });

  it('drops the blocked-reason association once the class can run', () => {
    const runnable = {
      class: { totalDurationMs: 300_000 },
      tracks: [{ ...missingEntry, track: { title: 'Ready', durationMs: 300_000 } }],
    } as RunPayload;
    render(
      <ClassHeaderCard
        cls={cls}
        payload={runnable}
        trackCount={1}
        isOwner
        canEdit
        canRun
        onError={() => {}}
        onRun={() => {}}
        onSelectTrack={() => {}}
        onStartChoreography={() => {}}
        onClassUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    const runButton = screen.getByRole('button', { name: /run live/i });
    expect(runButton).toHaveProperty('disabled', false);
    expect(runButton.getAttribute('aria-describedby')).toBeNull();
  });

  it('sends the instructor to write the first cue from the choreography row', () => {
    const onStartChoreography = vi.fn();
    const runnable = {
      class: { totalDurationMs: 300_000 },
      tracks: [{ ...missingEntry, track: { title: 'Ready', durationMs: 300_000 } }],
    } as RunPayload;
    render(
      <ClassHeaderCard
        cls={cls}
        payload={runnable}
        trackCount={1}
        isOwner
        canEdit
        canRun
        onError={() => {}}
        onRun={() => {}}
        onSelectTrack={() => {}}
        onStartChoreography={onStartChoreography}
        onClassUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Write the first cue' }));
    expect(onStartChoreography).toHaveBeenCalledTimes(1);
  });
});

const baseProps = {
  payload: null,
  trackCount: 0,
  canRun: false,
  onError: () => {},
  onRun: () => {},
  onSelectTrack: () => {},
  onStartChoreography: () => {},
  onClassUpdated: () => {},
  onDeleted: () => {},
};

describe('ClassHeaderCard rename', () => {
  it('lets an owner rename the class inline through updateClass', async () => {
    const onClassUpdated = vi.fn();
    vi.mocked(api.updateClass).mockResolvedValue({ ...cls, title: 'Tuesday Ride' });
    render(
      <ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit onClassUpdated={onClassUpdated} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Tuesday Ride' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.updateClass).toHaveBeenCalledWith(cls.id, { title: 'Tuesday Ride' }),
    );
    expect(onClassUpdated).toHaveBeenCalled();
  });

  it('does not call updateClass when the name is unchanged or blank', () => {
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.updateClass).not.toHaveBeenCalled();
  });

  it('hides the rename affordance from non-owners', () => {
    render(
      <ClassHeaderCard
        {...baseProps}
        cls={{ ...cls, accessLevel: 'view' }}
        isOwner={false}
        canEdit={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /rename class/i })).toBeNull();
  });
});

describe('ClassHeaderCard delete', () => {
  it('uses the canonical destructive treatment for the initial and confirm controls', () => {
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);

    const initial = screen.getByRole('button', { name: 'Delete this class' });
    expect(initial.className).toContain('bg-transparent');
    expect(initial.className).toContain('text-state-danger');
    expect(initial.className).toContain('hover:bg-state-danger/10');
    expect(initial.className).not.toMatch(/(?:^|\s)border-state-danger/);
    expect(initial.className).not.toMatch(/(?:^|\s)bg-state-danger\//);
    expect(initial.querySelector('svg[aria-hidden]')).toBeTruthy();

    fireEvent.click(initial);

    const confirm = screen.getByRole('button', { name: 'Delete class' });
    expect(confirm.className).toContain('bg-transparent');
    expect(confirm.className).toContain('text-state-danger');
    expect(confirm.className).toContain('hover:bg-state-danger/10');
    expect(confirm.className).not.toMatch(/(?:^|\s)border-state-danger/);
    expect(confirm.className).not.toMatch(/(?:^|\s)bg-state-danger\//);
    expect(confirm.querySelector('svg[aria-hidden]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('cancels confirmation without deleting', () => {
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete this class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Delete this class' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete class' })).toBeNull();
    expect(api.deleteClass).not.toHaveBeenCalled();
  });

  it('deletes through deleteClass and reports busy plus failure', async () => {
    const onDeleted = vi.fn();
    const onError = vi.fn();
    let resolveDelete!: (value: void) => void;
    const inFlight = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    vi.mocked(api.deleteClass).mockReturnValueOnce(inFlight);

    render(
      <ClassHeaderCard
        {...baseProps}
        cls={cls}
        isOwner
        canEdit
        onDeleted={onDeleted}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete this class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));

    expect(api.deleteClass).toHaveBeenCalledWith(cls.id);
    const busyConfirm = screen.getByRole('button', { name: 'Delete class' });
    expect(busyConfirm).toHaveProperty('disabled', true);
    expect(busyConfirm.textContent).toContain('…');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true);

    resolveDelete();
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(null);
  });

  it('keeps confirmation open and reports the error when delete fails', async () => {
    const onDeleted = vi.fn();
    const onError = vi.fn();
    vi.mocked(api.deleteClass).mockRejectedValueOnce(new Error('still in a live set'));

    render(
      <ClassHeaderCard
        {...baseProps}
        cls={cls}
        isOwner
        canEdit
        onDeleted={onDeleted}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete this class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('still in a live set'));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete class' })).toBeTruthy();
  });

  it('hides delete from non-owners', () => {
    render(
      <ClassHeaderCard
        {...baseProps}
        cls={{ ...cls, accessLevel: 'view' }}
        isOwner={false}
        canEdit={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});
