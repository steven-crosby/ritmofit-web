// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassListItem, RunPayload } from '@ritmofit/shared';
import { ClassRunOfShowShelf } from './ClassRunOfShowShelf.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function cls(index: number): ClassListItem {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
    ownerUserId: 'owner',
    title: `Class ${index}`,
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
    createdAt: index,
    updatedAt: index,
    lastOpenedAt: null,
    accessLevel: 'owner',
    trackCount: 1,
    totalDurationMs: 60_000,
    albumArtUrls: [],
  };
}

function payload(title: string): RunPayload {
  return {
    class: { title, totalDurationMs: 60_000 },
    tracks: [
      {
        classTrackId: `${title}-track`,
        position: 0,
        intensity: 'hard',
        track: { durationMs: 60_000 },
        providerRefs: [],
        cues: [],
        moves: [],
        displayBpm: null,
      },
    ],
  } as unknown as RunPayload;
}

describe('ClassRunOfShowShelf', () => {
  it('limits concurrent detail requests to two', async () => {
    const releases: Array<(value: RunPayload) => void> = [];
    vi.mocked(api.getClassShelfPayload).mockImplementation(
      () =>
        new Promise<RunPayload>((resolve) => {
          releases.push(resolve);
        }),
    );
    render(
      <ClassRunOfShowShelf
        classes={[1, 2, 3, 4].map(cls)}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={() => {}}
        onOpen={() => {}}
        onPreview={() => {}}
      />,
    );

    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(2));
    releases[0]?.(payload('first'));
    releases[1]?.(payload('second'));
    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(4));
  });

  it('bounds detail enrichment to the four most recent candidates', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) => payload(id));
    render(
      <ClassRunOfShowShelf
        classes={[0, 1, 2, 3, 4, 5].map(cls)}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={() => {}}
        onOpen={() => {}}
        onPreview={() => {}}
      />,
    );
    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(4));
    expect(api.getClassShelfPayload).not.toHaveBeenCalledWith(cls(0).id);
    expect(api.getClassShelfPayload).not.toHaveBeenCalledWith(cls(1).id);
  });

  it('keeps a failed detail distinct and retries without hiding the class', async () => {
    vi.mocked(api.getClassShelfPayload).mockRejectedValueOnce(new Error('offline'));
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('Class 1'));
    render(
      <ClassRunOfShowShelf
        classes={[cls(1)]}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={() => {}}
        onOpen={() => {}}
        onPreview={() => {}}
      />,
    );
    expect(await screen.findByText('Class details unavailable')).toBeTruthy();
    expect(screen.getByText('Class 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry details' }));
    expect(await screen.findByRole('button', { name: 'Rehearsal view' })).toBeTruthy();
  });

  it('routes open, preview, and ephemeral confirmation through the owner', async () => {
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('Class 1'));
    const onOpen = vi.fn();
    const onPreview = vi.fn();
    const onToggle = vi.fn();
    render(
      <ClassRunOfShowShelf
        classes={[cls(1)]}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={onToggle}
        onOpen={onOpen}
        onPreview={onPreview}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /derived · confirm/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish refinements' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rehearsal view' }));
    expect(onToggle).toHaveBeenCalledWith(cls(1).id);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: cls(1).id }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: cls(1).id }));
  });
});
