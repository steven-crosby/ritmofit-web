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

  it('keeps Run live disabled when the payload can run but the plan is unfinished', () => {
    const onRun = vi.fn();
    const runnable = {
      class: { totalDurationMs: 180_000 },
      tracks: [{ ...missingEntry, track: { title: 'Baianá', durationMs: 180_000 } }],
    } as RunPayload;
    render(
      <ClassHeaderCard
        {...baseProps}
        cls={cls}
        payload={runnable}
        trackCount={1}
        isOwner
        canEdit
        canRun
        planLead="6 blocks still need music"
        onRun={onRun}
      />,
    );

    const runButton = screen.getByRole('button', { name: /run live/i });
    expect(runButton).toHaveProperty('disabled', true);
    expect(runButton.className).not.toMatch(/rf-btn-primary/);
    fireEvent.click(runButton);
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getAllByText('6 blocks still need music').length).toBeGreaterThanOrEqual(1);
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

function setClassDetailsOpen(open = true) {
  const summary = screen.getByText('Class details');
  const details = summary.closest('details')!;
  details.open = open;
  fireEvent(details, new Event('toggle'));
  return { summary, details };
}

function modelChromeDisabledControlBlur() {
  // jsdom's blur() is a no-op on a disabled focused control. Model the observed
  // browser fallback explicitly, without visiting an unrelated focus target.
  const previousTabIndex = document.body.getAttribute('tabindex');
  document.body.tabIndex = -1;
  document.body.focus();
  if (previousTabIndex == null) document.body.removeAttribute('tabindex');
  else document.body.setAttribute('tabindex', previousTabIndex);
  expect(document.activeElement).toBe(document.body);
}

describe('ClassHeaderCard rename', () => {
  it('lets an owner rename the class inline through updateClass', async () => {
    const onClassUpdated = vi.fn();
    vi.mocked(api.updateClass).mockResolvedValue({ ...cls, title: 'Tuesday Ride' });
    render(
      <ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit onClassUpdated={onClassUpdated} />,
    );

    setClassDetailsOpen();
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Tuesday Ride' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.updateClass).toHaveBeenCalledWith(cls.id, { title: 'Tuesday Ride' }),
    );
    expect(onClassUpdated).toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /rename class/i }));
  });

  it('does not call updateClass when the name is unchanged or blank', () => {
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
    setClassDetailsOpen();
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

    setClassDetailsOpen();
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
    setClassDetailsOpen();
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
    setClassDetailsOpen();
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
    setClassDetailsOpen();
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

describe('ClassHeaderCard cover', () => {
  const renderHeader = (overrides: Partial<ClassWithAccess> = {}) =>
    render(
      <ClassHeaderCard
        cls={{ ...cls, ...overrides }}
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

  it('derives a titled art tile instead of a placeholder glyph when there is no cover', () => {
    const { container } = renderHeader();
    expect(container.textContent).not.toContain('📷');
    expect(screen.queryByAltText('Class Cover')).toBeNull();
    const tile = container.querySelector<HTMLElement>('span[aria-hidden][style*="gradient"]');
    expect(tile?.textContent).toBe('Monday Ride');
    // Stable per class, not per title: a rename keeps the same gradient, new text.
    const before = tile?.getAttribute('style');
    cleanup();
    const renamed = renderHeader({ title: 'Renamed Ride' }).container.querySelector(
      'span[aria-hidden][style*="gradient"]',
    );
    expect(renamed?.getAttribute('style')).toBe(before);
    expect(renamed?.textContent).toBe('Renamed Ride');
  });

  it('real cover art wins over the derived tile', () => {
    const { container } = renderHeader({ coverImageUrl: 'https://example.com/c.jpg' });
    expect(screen.getByAltText('Class Cover').getAttribute('src')).toBe(
      'https://example.com/c.jpg',
    );
    expect(container.querySelector('span[aria-hidden][style*="gradient"]')).toBeNull();
  });
});

describe('ClassHeaderCard class details', () => {
  it('starts closed while identity, metrics, readiness, and Run live stay outside', () => {
    render(
      <ClassHeaderCard {...baseProps} cls={cls} payload={payload} trackCount={1} isOwner canEdit />,
    );
    const details = screen.getByText('Class details').closest('details')!;
    expect(details.open).toBe(false);
    expect(details.contains(screen.getByRole('heading', { name: cls.title }))).toBe(false);
    expect(details.contains(screen.getByRole('button', { name: /run live/i }))).toBe(false);
    expect(details.contains(screen.getByText('1 track'))).toBe(false);
    expect(details.contains(screen.getByText(/length to run/i))).toBe(false);
    expect(details.contains(screen.getByText(/duration needed/i))).toBe(false);
    setClassDetailsOpen();
    expect(details.contains(screen.getByRole('button', { name: /rename class/i }))).toBe(true);
    expect(details.contains(screen.getByRole('button', { name: 'Upload cover' }))).toBe(true);
    expect(details.contains(screen.getByRole('textbox', { name: 'Add tag' }))).toBe(true);
    expect(details.contains(screen.getByRole('button', { name: 'Delete this class' }))).toBe(true);
  });

  it('preserves rename and tag drafts through closing and returns focus from Cancel and Escape', () => {
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
    setClassDetailsOpen();
    fireEvent.change(screen.getByRole('textbox', { name: 'Add tag' }), {
      target: { value: 'summer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    const name = screen.getByLabelText('Class name');
    fireEvent.change(name, { target: { value: 'Draft ride' } });
    name.focus();
    const { summary } = setClassDetailsOpen(false);
    expect(document.activeElement).toBe(summary);
    setClassDetailsOpen();
    expect(screen.getByLabelText('Class name')).toBe(name);
    expect(name).toHaveProperty('value', 'Draft ride');
    expect(screen.getByRole('textbox', { name: 'Add tag' })).toHaveProperty('value', 'summer');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    fireEvent.click(cancel);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.keyDown(screen.getByLabelText('Class name'), { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /rename class/i }));
  });

  it('returns a rename completed while closed to the summary without reopening', async () => {
    let resolveRename!: (value: ClassWithAccess) => void;
    vi.mocked(api.updateClass).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRename = resolve;
      }),
    );
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
    setClassDetailsOpen();
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Saved ride' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const { summary, details } = setClassDetailsOpen(false);
    resolveRename({ ...cls, title: 'Saved ride' });
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(details.open).toBe(false);
  });

  it.each([true, false])(
    'preserves unrelated focus after deferred rename success with details open=%s',
    async (open: boolean) => {
      let resolveRename!: (value: ClassWithAccess) => void;
      vi.mocked(api.updateClass).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRename = resolve;
        }),
      );
      const onClassUpdated = vi.fn();
      render(
        <ClassHeaderCard
          {...baseProps}
          cls={cls}
          isOwner
          canEdit
          canRun
          onClassUpdated={onClassUpdated}
        />,
      );
      setClassDetailsOpen();
      fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
      fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Saved ride' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      if (!open) setClassDetailsOpen(false);
      const unrelated = open
        ? screen.getByRole('textbox', { name: 'Add tag' })
        : screen.getByRole('button', { name: /run live/i });
      unrelated.focus();
      expect(document.activeElement).toBe(unrelated);
      resolveRename({ ...cls, title: 'Saved ride' });
      await waitFor(() => expect(onClassUpdated).toHaveBeenCalled());
      expect(screen.queryByLabelText('Class name')).toBeNull();
      expect(document.activeElement).toBe(unrelated);
      expect(screen.getByText('Class details').closest('details')!.open).toBe(open);
    },
  );

  it.each(['Enter', 'Save'] as const)(
    'restores originating %s focus after Chrome blurs a disabled pending control to body',
    async (submission: 'Enter' | 'Save') => {
      let resolveRename!: (value: ClassWithAccess) => void;
      vi.mocked(api.updateClass).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRename = resolve;
        }),
      );
      render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
      setClassDetailsOpen();
      fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
      const input = screen.getByLabelText('Class name');
      fireEvent.change(input, { target: { value: 'Saved ride' } });
      const submittedControl =
        submission === 'Enter' ? input : screen.getByRole('button', { name: 'Save' });
      submittedControl.focus();
      if (submission === 'Enter') {
        // jsdom does not implement Enter's native form submission.
        fireEvent.submit(input.closest('form')!);
      } else {
        fireEvent.click(submittedControl);
      }
      expect(submittedControl).toHaveProperty('disabled', true);
      // jsdom retains disabled-control focus; model Chrome's observed blur.
      modelChromeDisabledControlBlur();
      resolveRename({ ...cls, title: 'Saved ride' });
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /rename class/i })),
      );
    },
  );

  it('relinquishes submission ownership after unrelated focus even if that control later blurs', async () => {
    let resolveRename!: (value: ClassWithAccess) => void;
    vi.mocked(api.updateClass).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRename = resolve;
      }),
    );
    const onClassUpdated = vi.fn();
    render(
      <ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit onClassUpdated={onClassUpdated} />,
    );
    setClassDetailsOpen();
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    const input = screen.getByLabelText('Class name');
    fireEvent.change(input, { target: { value: 'Saved ride' } });
    input.focus();
    fireEvent.submit(input.closest('form')!);
    modelChromeDisabledControlBlur();
    const tag = screen.getByRole('textbox', { name: 'Add tag' });
    tag.focus();
    tag.blur();
    expect(document.activeElement).toBe(document.body);
    resolveRename({ ...cls, title: 'Saved ride' });
    await waitFor(() => expect(onClassUpdated).toHaveBeenCalled());
    expect(screen.queryByLabelText('Class name')).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it.each([true, false])(
    'restores owned keyboard focus after deferred rename rejection with details open=%s',
    async (open: boolean) => {
      let rejectRename!: (reason: Error) => void;
      vi.mocked(api.updateClass).mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectRename = reject;
        }),
      );
      const onError = vi.fn();
      render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit onError={onError} />);
      setClassDetailsOpen();
      fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
      const input = screen.getByLabelText('Class name');
      fireEvent.change(input, { target: { value: 'Retry ride' } });
      input.focus();
      fireEvent.submit(input.closest('form')!);
      modelChromeDisabledControlBlur();
      if (!open) setClassDetailsOpen(false);
      rejectRename(new Error('Rename unavailable'));
      await waitFor(() => expect(onError).toHaveBeenCalledWith('Rename unavailable'));
      expect(input).toHaveProperty('disabled', false);
      expect(input).toHaveProperty('value', 'Retry ride');
      expect(document.activeElement).toBe(open ? input : screen.getByText('Class details'));
      expect(screen.getByText('Class details').closest('details')!.open).toBe(open);
    },
  );

  it.each(['focused', 'then blurred'] as const)(
    'preserves unrelated focus %s after deferred rename rejection',
    async (destination: 'focused' | 'then blurred') => {
      let rejectRename!: (reason: Error) => void;
      vi.mocked(api.updateClass).mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectRename = reject;
        }),
      );
      const onError = vi.fn();
      render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit canRun onError={onError} />);
      setClassDetailsOpen();
      fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
      const input = screen.getByLabelText('Class name');
      fireEvent.change(input, { target: { value: 'Retry ride' } });
      input.focus();
      fireEvent.submit(input.closest('form')!);
      modelChromeDisabledControlBlur();
      const unrelated = screen.getByRole('button', { name: /run live/i });
      unrelated.focus();
      if (destination === 'then blurred') unrelated.blur();
      const expected = destination === 'then blurred' ? document.body : unrelated;
      rejectRename(new Error('Rename unavailable'));
      await waitFor(() => expect(onError).toHaveBeenCalledWith('Rename unavailable'));
      expect(input).toHaveProperty('disabled', false);
      expect(document.activeElement).toBe(expected);
    },
  );

  it('keeps failed rename drafts editable and reports failures outside the disclosure', async () => {
    const onError = vi.fn();
    vi.mocked(api.updateClass).mockRejectedValueOnce(new Error('Rename unavailable'));
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit onError={onError} />);
    setClassDetailsOpen();
    fireEvent.click(screen.getByRole('button', { name: /rename class/i }));
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Retry ride' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Rename unavailable'));
    expect(screen.getByLabelText('Class name')).toHaveProperty('value', 'Retry ride');
    expect(screen.getByLabelText('Class name')).toHaveProperty('disabled', false);
  });

  it('requires fresh delete confirmation after closing, but preserves pending protection', async () => {
    let resolveDelete!: () => void;
    vi.mocked(api.deleteClass).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    render(<ClassHeaderCard {...baseProps} cls={cls} isOwner canEdit />);
    setClassDetailsOpen();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this class' }));
    setClassDetailsOpen(false);
    setClassDetailsOpen();
    expect(screen.queryByRole('button', { name: 'Delete class' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));
    setClassDetailsOpen(false);
    setClassDetailsOpen();
    expect(screen.getByRole('button', { name: 'Delete class' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));
    expect(api.deleteClass).toHaveBeenCalledTimes(1);
    resolveDelete();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete class' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
  });

  it('allows editor tag controls while reserving owner actions and gives viewers read-only tags', () => {
    const { rerender } = render(
      <ClassHeaderCard
        {...baseProps}
        cls={{ ...cls, accessLevel: 'edit', tags: ['cycle'] }}
        isOwner={false}
        canEdit
      />,
    );
    setClassDetailsOpen();
    expect(screen.getByRole('textbox', { name: 'Add tag' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove tag cycle' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /rename|cover|delete/i })).toBeNull();
    rerender(
      <ClassHeaderCard
        {...baseProps}
        cls={{ ...cls, accessLevel: 'view', tags: ['cycle'] }}
        isOwner={false}
        canEdit={false}
      />,
    );
    expect(screen.getByText('#cycle')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Add tag' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove tag cycle' })).toBeNull();
    rerender(
      <ClassHeaderCard
        {...baseProps}
        cls={{ ...cls, accessLevel: 'view' }}
        isOwner={false}
        canEdit={false}
      />,
    );
    expect(screen.queryByText('Class details')).toBeNull();
  });

  it('lets an owner retry the same cover file after an upload failure', async () => {
    const onError = vi.fn();
    const onClassUpdated = vi.fn();
    vi.mocked(api.uploadClassCover)
      .mockRejectedValueOnce(new Error('Cover unavailable'))
      .mockResolvedValueOnce({ ...cls, coverImageUrl: 'https://example.com/new.jpg' });
    const { container } = render(
      <ClassHeaderCard
        {...baseProps}
        cls={cls}
        isOwner
        canEdit
        onError={onError}
        onClassUpdated={onClassUpdated}
      />,
    );
    setClassDetailsOpen();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['cover'], 'cover.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Cover unavailable'));
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(onClassUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ coverImageUrl: 'https://example.com/new.jpg' }),
      ),
    );
    expect(api.uploadClassCover).toHaveBeenCalledTimes(2);
  });
});
