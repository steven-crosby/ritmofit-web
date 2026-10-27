// @vitest-environment jsdom
/**
 * Reviewer B audit repro (2026-10-27, SHA 4e0b150). Not product code.
 *
 * B-4: Unsaved inspector typing ("Unsaved typing — press Save or Enter to
 * keep it.") is held only in TrackInspector state. Leaving the builder by
 * Back to Classes, a top-nav destination, or Run live → Exit unmounts it with
 * no save, no prompt, and no draft restore. The tests assert what happens at
 * HEAD (they PASS when the draft is silently lost) so the evidence is the
 * green run plus the logged values.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ClassListItem, ClassTrack, RunPayload } from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');
vi.mock('../lib/auth-client.js', () => ({ authClient: { signOut: vi.fn() } }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const CLASS_ID = '00000000-0000-4000-8000-000000000001';
const CT = '00000000-0000-4000-8000-0000000000c1';

const ride = {
  id: CLASS_ID,
  ownerUserId: 'me',
  title: 'Draft ride',
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
  featuredCategory: null,
  coverImageUrl: null,
  tags: [],
  accessLevel: 'owner',
  trackCount: 1,
  totalDurationMs: 240000,
  albumArtUrls: [],
} as unknown as ClassListItem;

const classTrack = {
  id: CT,
  classId: CLASS_ID,
  trackId: 'track-0',
  position: 0,
  intensity: 'mod',
  displayBpmOverride: null,
  displayRpm: null,
  holdCount: null,
  durationMsOverride: null,
  clipStartMs: 0,
  clipEndMs: null,
  beatAnchorMs: null,
  startOffsetMs: null,
  notes: null,
  createdAt: 0,
  updatedAt: 0,
} as unknown as ClassTrack;

const payload = {
  schemaVersion: 1,
  class: {
    id: CLASS_ID,
    title: 'Draft ride',
    template: 'cycle',
    targetDurationMs: null,
    totalDurationMs: 240000,
    timelineMode: 'sequential',
  },
  sections: [],
  tracks: [
    {
      classTrackId: CT,
      position: 0,
      startOffsetMs: 0,
      displayBpm: 128,
      displayRpm: null,
      holdCount: null,
      intensity: 'mod',
      notes: null,
      clipStartMs: 0,
      beatAnchorMs: 0,
      providerRefs: [],
      track: {
        id: 'track-0',
        title: 'Draft Song',
        artist: 'Artist',
        durationMs: 240000,
        baseDurationMs: 240000,
        albumArtUrl: null,
        displayBpm: 128,
      },
      cues: [],
      moves: [],
    },
  ],
} as unknown as RunPayload;

beforeEach(() => {
  vi.mocked(api.listClasses).mockResolvedValue({ items: [ride], nextCursor: null });
  vi.mocked(api.listClassTracks).mockResolvedValue([classTrack]);
  vi.mocked(api.getRunPayload).mockResolvedValue(payload);
  vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
  vi.mocked(api.listConnections).mockResolvedValue([]);
  vi.mocked(api.listCues).mockResolvedValue([]);
  vi.mocked(api.listPlacedMoves).mockResolvedValue([]);
  vi.mocked(api.listMoves).mockResolvedValue([]);
  vi.mocked(api.listUserMoves).mockResolvedValue([]);
  vi.mocked(api.markClassOpened).mockResolvedValue(undefined as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage?.clear();
});

async function typeUnsavedNotes() {
  render(<Dashboard userId="me" userName="Tester" />);
  fireEvent.click(await screen.findByRole('button', { name: /^Draft ride/ }));
  await screen.findByRole('heading', { name: 'Draft ride' });
  fireEvent.click(document.querySelector<HTMLElement>(`[data-track-select-id="${CT}"]`)!);
  const inspector = within(
    await screen.findByRole('region', { name: 'Track inspector for Draft Song' }),
  );
  fireEvent.change(inspector.getByLabelText('Creator notes'), {
    target: { value: 'Seated climb, out of the saddle on the chorus' },
  });
  expect(inspector.getByText(/Unsaved typing/)).toBeTruthy();
}

async function reopenInspectorNotes(): Promise<string> {
  const back = screen.queryByRole('button', { name: 'Back to Classes' });
  if (!back) fireEvent.click(await screen.findByRole('button', { name: /^Draft ride/ }));
  await screen.findByRole('heading', { name: 'Draft ride' });
  fireEvent.click(document.querySelector<HTMLElement>(`[data-track-select-id="${CT}"]`)!);
  const inspector = within(
    await screen.findByRole('region', { name: 'Track inspector for Draft Song' }),
  );
  return (inspector.getByLabelText('Creator notes') as HTMLTextAreaElement).value;
}

describe('Reviewer B repro: unsaved inspector typing is dropped on leave', () => {
  it('B-4a: Back to Classes', async () => {
    await typeUnsavedNotes();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Classes' }));
    const notes = await reopenInspectorNotes();
    console.info('[B-4a] notes after Back + reopen:', JSON.stringify(notes));
    expect(notes).toBe('');
    expect(api.updateClassTrack).not.toHaveBeenCalled();
  });

  it('B-4b: top-nav Account then Classes', async () => {
    vi.mocked(api.getMe).mockReturnValue(new Promise(() => {}));
    await typeUnsavedNotes();
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    const notes = await reopenInspectorNotes();
    console.info('[B-4b] notes after nav away + back:', JSON.stringify(notes));
    expect(notes).toBe('');
    expect(api.updateClassTrack).not.toHaveBeenCalled();
  });

  it('B-4c: Run live → Exit returns to the builder without the draft', async () => {
    await typeUnsavedNotes();
    fireEvent.click(screen.getByRole('button', { name: /Run live/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Exit' }));
    await screen.findByRole('heading', { name: 'Draft ride' });
    const inspectorOpen = screen.queryByRole('region', { name: 'Track inspector for Draft Song' });
    const notes = await reopenInspectorNotes();
    console.info(
      '[B-4c] inspector still open after Exit:',
      inspectorOpen != null,
      '| notes after reselect:',
      JSON.stringify(notes),
    );
    expect(notes).toBe('');
    expect(api.updateClassTrack).not.toHaveBeenCalled();
  });
});
