// @vitest-environment jsdom
/**
 * RF-90 regression tests, ported from the Codex audit repro
 * `b-builder-lost-update.repro.test.tsx` (4e0b150).
 *
 * B-1: in free placement, a timeline drag of a track's start must survive a
 *      later inspector Save of an unrelated field (notes).
 * B-2: a timeline marker drag of a cue must survive a later text-only edit of
 *      that cue in the inspector.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type {
  ClassListItem,
  ClassTrack,
  Cue,
  RunPayload,
  UpdateClassTrack,
  UpdateCue,
} from '@ritmofit/shared';
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
const CUE_ID = '00000000-0000-4000-8000-0000000000e1';

type State = {
  startOffsetMs: number;
  notes: string | null;
  cueAnchorMs: number;
  cueText: string;
  /** When set, the fake server clamps a written start to this ceiling. */
  maxStartMs?: number;
};
let state: State;

function cls(): ClassListItem {
  return {
    id: CLASS_ID,
    ownerUserId: 'me',
    title: 'Free ride',
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'free',
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
    totalDurationMs: 600000,
    albumArtUrls: [],
  } as unknown as ClassListItem;
}

function classTrack(): ClassTrack {
  return {
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
    startOffsetMs: state.startOffsetMs,
    notes: state.notes,
    createdAt: 0,
    updatedAt: 0,
  } as unknown as ClassTrack;
}

function cue(): Cue {
  return {
    id: CUE_ID,
    classTrackId: CT,
    position: 0,
    anchorMs: state.cueAnchorMs,
    beat: null,
    bar: null,
    text: state.cueText,
    durationMs: null,
    bpm: null,
    intensity: null,
    note: null,
    color: null,
    createdAt: 0,
    updatedAt: 0,
  } as unknown as Cue;
}

function payload(): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: CLASS_ID,
      title: 'Free ride',
      template: 'cycle',
      targetDurationMs: null,
      totalDurationMs: 600000,
      timelineMode: 'free',
    },
    sections: [],
    tracks: [
      {
        classTrackId: CT,
        position: 0,
        startOffsetMs: state.startOffsetMs,
        // No tempo, so keyboard steps are a plain 1s (5s with Shift) and no snapping.
        displayBpm: null,
        displayRpm: null,
        holdCount: null,
        intensity: 'mod',
        notes: state.notes,
        clipStartMs: 0,
        beatAnchorMs: 0,
        providerRefs: [],
        track: {
          id: 'track-0',
          title: 'Anchor Song',
          artist: 'Artist',
          durationMs: 240000,
          baseDurationMs: 240000,
          albumArtUrl: null,
          displayBpm: null,
        },
        cues: [
          {
            id: CUE_ID,
            anchorMs: state.cueAnchorMs,
            beat: null,
            bar: null,
            text: state.cueText,
            color: null,
            durationMs: null,
            bpm: null,
            intensity: null,
            note: null,
          },
        ],
        moves: [],
      },
    ],
  } as unknown as RunPayload;
}

beforeEach(() => {
  state = { startOffsetMs: 60000, notes: null, cueAnchorMs: 10000, cueText: 'Climb' };
  vi.mocked(api.listClasses).mockResolvedValue({ items: [cls()], nextCursor: null });
  vi.mocked(api.listClassTracks).mockImplementation(async () => [classTrack()]);
  vi.mocked(api.getRunPayload).mockImplementation(async () => payload());
  vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
  vi.mocked(api.listConnections).mockResolvedValue([]);
  vi.mocked(api.listCues).mockImplementation(async () => [cue()]);
  vi.mocked(api.listPlacedMoves).mockResolvedValue([]);
  vi.mocked(api.listMoves).mockResolvedValue([]);
  vi.mocked(api.listUserMoves).mockResolvedValue([]);
  vi.mocked(api.listSections).mockResolvedValue([]);
  vi.mocked(api.markClassOpened).mockResolvedValue(undefined as never);
  // The fake server applies every PATCH it receives, like the real one.
  vi.mocked(api.updateClassTrack).mockImplementation(
    async (_id: string, body: UpdateClassTrack) => {
      if (body.startOffsetMs != null) {
        state.startOffsetMs = Math.min(body.startOffsetMs, state.maxStartMs ?? Infinity);
      }
      if (body.notes !== undefined) state.notes = body.notes;
      return classTrack();
    },
  );
  vi.mocked(api.updateCue).mockImplementation(async (_id: string, body: UpdateCue) => {
    if (body.anchorMs !== undefined) state.cueAnchorMs = body.anchorMs;
    if (body.text !== undefined) state.cueText = body.text;
    return cue();
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage?.clear();
});

async function openInspectorWithTimeline() {
  render(<Dashboard userId="me" userName="Tester" />);
  fireEvent.click(await screen.findByRole('button', { name: /^Free ride/ }));
  await screen.findByRole('heading', { name: 'Free ride' });
  fireEvent.click(document.querySelector<HTMLElement>(`[data-track-select-id="${CT}"]`)!);
  const inspector = within(
    await screen.findByRole('region', { name: 'Track inspector for Anchor Song' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));
  return inspector;
}

describe('Builder saves keep timeline edits (RF-90)', () => {
  it('B-1: saving inspector notes keeps a start the timeline just moved', async () => {
    const inspector = await openInspectorWithTimeline();
    fireEvent.click(inspector.getByText('Advanced timing and placement'));
    expect((inspector.getByLabelText(/^Start at/) as HTMLInputElement).value).toBe('1:00');

    // Move track 1 from 1:00 to 1:05 on the timeline (Shift+→ = 5s), then commit.
    const handle = screen.getByRole('slider', { name: /^Track 1 start at/ });
    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    await act(async () => {
      fireEvent.keyDown(handle, { key: 'Enter' });
    });
    await waitFor(() =>
      expect(api.updateClassTrack).toHaveBeenCalledWith(CT, { startOffsetMs: 65000 }),
    );
    await waitFor(() => expect(api.getRunPayload).toHaveBeenCalledTimes(2));
    expect(state.startOffsetMs).toBe(65000);

    // The inspector re-seeds the untouched field from the moved start.
    await waitFor(() =>
      expect((inspector.getByLabelText(/^Start at/) as HTMLInputElement).value).toBe('1:05'),
    );

    // Now an unrelated edit: notes, then Save.
    fireEvent.change(inspector.getByLabelText('Creator notes'), { target: { value: 'Push' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await inspector.findByText('Saved.');

    expect(vi.mocked(api.updateClassTrack).mock.calls.at(-1)![1].notes).toBe('Push');
    expect(state.startOffsetMs).toBe(65000);
  });

  it('B-2: editing a cue text keeps an anchor the timeline marker just moved', async () => {
    const inspector = await openInspectorWithTimeline();
    await inspector.findByRole('button', { name: 'Edit cue Climb' });

    // Re-time the cue marker from 0:10 to 0:11 (no tempo → 1s step), commit.
    const marker = screen.getByRole('slider', { name: /^cue at .*Climb/ });
    fireEvent.keyDown(marker, { key: 'ArrowRight' });
    await act(async () => {
      fireEvent.keyDown(marker, { key: 'Enter' });
    });
    await waitFor(() => expect(api.updateCue).toHaveBeenCalledWith(CUE_ID, { anchorMs: 11000 }));
    await waitFor(() => expect(api.getRunPayload).toHaveBeenCalledTimes(2));
    expect(state.cueAnchorMs).toBe(11000);

    // Edit only the cue text in the inspector and save.
    fireEvent.click(inspector.getByRole('button', { name: 'Edit cue Climb' }));
    // The inline edit row is the first list item holding a Save button.
    const row = within(
      inspector
        .getAllByRole('listitem')
        .find((li) => within(li).queryByRole('button', { name: 'Save' }))!,
    );
    fireEvent.change(row.getByLabelText('Move name'), { target: { value: 'Climb hard' } });
    await act(async () => {
      fireEvent.click(row.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updateCue).toHaveBeenCalledTimes(2));

    expect(vi.mocked(api.updateCue).mock.calls.at(-1)![1].text).toBe('Climb hard');
    expect(state.cueAnchorMs).toBe(11000);
  });

  async function dragStartRight(steps: number) {
    const handle = screen.getByRole('slider', { name: /^Track 1 start at/ });
    for (let i = 0; i < steps; i += 1) {
      fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    }
    await act(async () => {
      fireEvent.keyDown(handle, { key: 'Enter' });
    });
  }

  async function saveInspector(inspector: ReturnType<typeof within>) {
    const calls = vi.mocked(api.updateClassTrack).mock.calls.length;
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.updateClassTrack).toHaveBeenCalledTimes(calls + 1));
    await inspector.findByText('Saved.');
    return vi.mocked(api.updateClassTrack).mock.calls.at(-1)![1];
  }

  it('B-1: a non-canonical typed start (01:05) does not revert a later drag', async () => {
    const inspector = await openInspectorWithTimeline();
    fireEvent.click(inspector.getByText('Advanced timing and placement'));
    const startAt = () => inspector.getByLabelText(/^Start at/) as HTMLInputElement;

    fireEvent.change(startAt(), { target: { value: '01:05' } });
    expect((await saveInspector(inspector)).startOffsetMs).toBe(65000);
    await waitFor(() => expect(startAt().value).toBe('1:05'));

    // Timeline drag 1:05 → 1:20 (three Shift+→ steps of 5 s).
    await dragStartRight(3);
    await waitFor(() =>
      expect(api.updateClassTrack).toHaveBeenLastCalledWith(CT, { startOffsetMs: 80000 }),
    );
    await waitFor(() => expect(startAt().value).toBe('1:20'));

    fireEvent.change(inspector.getByLabelText('Creator notes'), { target: { value: 'Push' } });
    expect(await saveInspector(inspector)).not.toHaveProperty('startOffsetMs');
    expect(state.startOffsetMs).toBe(80000);
  });

  it('B-1: a start the server clamps re-seeds the field and is not re-sent', async () => {
    state.maxStartMs = 70000;
    const inspector = await openInspectorWithTimeline();
    fireEvent.click(inspector.getByText('Advanced timing and placement'));
    const startAt = () => inspector.getByLabelText(/^Start at/) as HTMLInputElement;

    fireEvent.change(startAt(), { target: { value: '1:30' } });
    expect((await saveInspector(inspector)).startOffsetMs).toBe(90000);
    expect(state.startOffsetMs).toBe(70000);
    await waitFor(() => expect(startAt().value).toBe('1:10'));

    // A later drag back to 1:05, then a notes-only save, keeps the drag.
    state.maxStartMs = undefined;
    const handle = screen.getByRole('slider', { name: /^Track 1 start at/ });
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    await act(async () => {
      fireEvent.keyDown(handle, { key: 'Enter' });
    });
    await waitFor(() => expect(state.startOffsetMs).toBe(65000));
    await waitFor(() => expect(startAt().value).toBe('1:05'));

    fireEvent.change(inspector.getByLabelText('Creator notes'), { target: { value: 'Push' } });
    expect(await saveInspector(inspector)).not.toHaveProperty('startOffsetMs');
    expect(state.startOffsetMs).toBe(65000);
  });

  it('B-1: a start typed away and back to the stored value is untouched for a later drag', async () => {
    state.startOffsetMs = 200000;
    const inspector = await openInspectorWithTimeline();
    fireEvent.click(inspector.getByText('Advanced timing and placement'));
    const startAt = () => inspector.getByLabelText(/^Start at/) as HTMLInputElement;
    expect(startAt().value).toBe('3:20');

    fireEvent.change(startAt(), { target: { value: '3:2' } });
    fireEvent.change(startAt(), { target: { value: '3:20' } });

    // Timeline drag 3:20 → 4:10 (ten Shift+→ steps of 5 s).
    await dragStartRight(10);
    await waitFor(() =>
      expect(api.updateClassTrack).toHaveBeenLastCalledWith(CT, { startOffsetMs: 250000 }),
    );
    await waitFor(() => expect(startAt().value).toBe('4:10'));

    fireEvent.change(inspector.getByLabelText('Creator notes'), { target: { value: 'Push' } });
    expect(await saveInspector(inspector)).not.toHaveProperty('startOffsetMs');
    expect(state.startOffsetMs).toBe(250000);
  });

  it('B-1: a save the server clamps to the unchanged start shows the stored text', async () => {
    state.maxStartMs = 60000;
    const inspector = await openInspectorWithTimeline();
    fireEvent.click(inspector.getByText('Advanced timing and placement'));
    const startAt = () => inspector.getByLabelText(/^Start at/) as HTMLInputElement;

    fireEvent.change(startAt(), { target: { value: '1:30' } });
    expect((await saveInspector(inspector)).startOffsetMs).toBe(90000);
    expect(state.startOffsetMs).toBe(60000);
    await waitFor(() => expect(startAt().value).toBe('1:00'));

    fireEvent.change(inspector.getByLabelText('Creator notes'), { target: { value: 'Push' } });
    expect(await saveInspector(inspector)).not.toHaveProperty('startOffsetMs');
  });
});
