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
  // The chosen ordering is session state, so it genuinely survives a re-render —
  // clear it between tests or one test's switch becomes the next test's default.
  window.sessionStorage.clear();
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

/** A class with nothing outstanding: duration, BPM, choreography, and a provider. */
function readyPayload(): RunPayload {
  return {
    class: { title: 'Finished class', totalDurationMs: 60_000 },
    tracks: [
      {
        classTrackId: 'ready-track',
        position: 0,
        intensity: 'hard',
        track: { durationMs: 60_000 },
        providerRefs: [{ provider: 'spotify' }],
        cues: [{ id: 'cue-1' }],
        moves: [{ id: 'move-1' }],
        displayBpm: 128,
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

  it('bounds detail enrichment to the twelve most recent candidates', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) => payload(id));
    const many = Array.from({ length: 14 }, (_, index) => cls(index));
    render(
      <ClassRunOfShowShelf
        classes={many}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={() => {}}
        onOpen={() => {}}
        onPreview={() => {}}
      />,
    );
    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(12));
    // Ranking reads a wider pool than it shows so a finished class that has not been
    // opened lately can still reach the top, but the pool is bounded: the two oldest
    // of fourteen are never read.
    expect(api.getClassShelfPayload).not.toHaveBeenCalledWith(many[0]!.id);
    expect(api.getClassShelfPayload).not.toHaveBeenCalledWith(many[1]!.id);
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
    fireEvent.click(screen.getByRole('button', { name: 'Retry details — Class 1' }));
    expect(await screen.findByRole('button', { name: 'Rehearsal view — Class 1' })).toBeTruthy();
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
    // The primary names this class's actual gap — the fixture payload carries no
    // BPM — rather than a generic "continue" (P0-03).
    fireEvent.click(screen.getByRole('button', { name: 'Add the missing tempo — Class 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rehearsal view — Class 1' }));
    expect(onToggle).toHaveBeenCalledWith(cls(1).id);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: cls(1).id }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: cls(1).id }));
  });

  it('names the active ordering, defaults to ready to teach, and switches', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) => payload(id));
    render(
      <ClassRunOfShowShelf
        classes={[1, 2].map(cls)}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={() => {}}
        onOpen={() => {}}
        onPreview={() => {}}
      />,
    );

    expect(await screen.findByText(/Ordered by ready to teach/)).toBeTruthy();
    const readyToTeach = screen.getByRole('button', { name: 'Ready to teach' });
    const needsWork = screen.getByRole('button', { name: 'Needs work' });
    expect(readyToTeach.getAttribute('aria-pressed')).toBe('true');
    expect(needsWork.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(needsWork);
    expect(await screen.findByText(/Ordered by the next creative step/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Needs work' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('ranks the finished class above the unfinished one under each ordering', async () => {
    const finished = { ...cls(1), title: 'Finished class' };
    const unfinished = { ...cls(2), title: 'Unfinished class' };
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) =>
      id === finished.id ? readyPayload() : payload('unfinished'),
    );
    render(
      <ClassRunOfShowShelf
        classes={[finished, unfinished]}
        confirmedPulseIds={new Set()}
        onTogglePulseConfirmation={() => {}}
        onOpen={() => {}}
        onPreview={() => {}}
      />,
    );

    // Two cards, two different next steps — never one repeated primary (P0-03).
    expect(await screen.findByRole('button', { name: 'Open class — Finished class' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Add the missing tempo — Unfinished class' }),
    ).toBeTruthy();

    const titles = () =>
      screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    await waitFor(() => expect(titles()).toEqual(['Finished class', 'Unfinished class']));

    fireEvent.click(screen.getByRole('button', { name: 'Needs work' }));
    await waitFor(() => expect(titles()).toEqual(['Unfinished class', 'Finished class']));
  });
});
