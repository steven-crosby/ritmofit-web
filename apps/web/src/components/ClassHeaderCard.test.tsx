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
  track: { title: 'Unknown Length', durationMs: null },
} as RunPayloadTrackEntry;

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
        missingDurationTracks={[missingEntry]}
        onError={() => {}}
        onRun={onRun}
        onSelectTrack={onSelectTrack}
        onShare={() => {}}
        onClassUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    const runButton = screen.getByRole('button', { name: /run live/i });
    expect(runButton).toHaveProperty('disabled', true);
    fireEvent.click(runButton);
    expect(onRun).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Unknown Length' }));
    expect(onSelectTrack).toHaveBeenCalledWith(missingEntry.classTrackId);
    expect(screen.getByText(/duration needed before live mode/i)).toBeTruthy();
  });
});

const baseProps = {
  payload: null,
  trackCount: 0,
  canRun: false,
  missingDurationTracks: [],
  onError: () => {},
  onRun: () => {},
  onSelectTrack: () => {},
  onShare: () => {},
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
