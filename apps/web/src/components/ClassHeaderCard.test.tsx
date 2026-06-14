// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ClassWithAccess, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { ClassHeaderCard } from './Dashboard.js';

afterEach(cleanup);

const cls = {
  id: '00000000-0000-4000-8000-000000000001',
  ownerUserId: 'owner',
  title: 'Monday Ride',
  description: null,
  template: 'cycle',
  status: 'draft',
  visibility: 'private',
  targetDurationMs: null,
  createdAt: 1,
  updatedAt: 1,
  lastOpenedAt: null,
  accessLevel: 'owner',
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
