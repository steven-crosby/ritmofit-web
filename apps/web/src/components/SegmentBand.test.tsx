// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassSection, SegmentType } from '@ritmofit/shared';
import { SegmentBand } from './SegmentBand.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const CLASS_ID = '00000000-0000-4000-8000-0000000000c1';
const TOTAL = 240000;
const WARM_ID = '00000000-0000-4000-8000-000000000001';
const SPRINT_ID = '00000000-0000-4000-8000-000000000002';

function section(id: string, type: SegmentType, startOffsetMs: number): ClassSection {
  return { id, classId: CLASS_ID, type, startOffsetMs, createdAt: 1, updatedAt: 1 };
}

/** A 200px-wide band box so pointer x maps to a real fraction under jsdom. */
function stubRect(width = 200, left = 0) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    left,
    right: left + width,
    top: 0,
    bottom: 24,
    height: 24,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

const twoSections = () => [section(WARM_ID, 'warm_up', 0), section(SPRINT_ID, 'sprint', 120000)];

async function renderBand(canEdit: boolean) {
  vi.mocked(api.listSections).mockResolvedValue(twoSections());
  vi.mocked(api.updateSection).mockResolvedValue(section(SPRINT_ID, 'sprint', 120000));
  render(<SegmentBand classId={CLASS_ID} totalDurationMs={TOTAL} canEdit={canEdit} />);
  // Sections load asynchronously on mount.
  if (canEdit) await screen.findByRole('slider', { name: 'Sprint start' });
}

describe('SegmentBand drag-resize handles', () => {
  it('renders an accessible boundary slider per section with edit access', async () => {
    await renderBand(true);
    const warm = screen.getByRole('slider', { name: 'Warm-up start' });
    const sprint = screen.getByRole('slider', { name: 'Sprint start' });
    expect(warm.getAttribute('aria-valuenow')).toBe('0');
    expect(sprint.getAttribute('aria-valuenow')).toBe('120000');
    expect(sprint.getAttribute('aria-valuetext')).toBe('2:00');
    // Bounded by its neighbors: warm-up has no previous (min 0), sprint follows it.
    expect(warm.getAttribute('aria-valuemax')).toBe('120000');
    expect(sprint.getAttribute('aria-valuemin')).toBe('0');
  });

  it('shows no handles without edit access (stays a read-only image)', async () => {
    vi.mocked(api.listSections).mockResolvedValue(twoSections());
    render(<SegmentBand classId={CLASS_ID} totalDurationMs={TOTAL} canEdit={false} />);
    await waitFor(() => expect(screen.getByRole('img', { name: /Segments:/ })).toBeTruthy());
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });

  it('commits the dragged start (pointer up) via updateSection', async () => {
    stubRect();
    await renderBand(true);
    const sprint = screen.getByRole('slider', { name: 'Sprint start' });
    // Drag to x=50 of 200 → 25% of 240000 = 60000ms (within [1000, 240000]).
    fireEvent.pointerDown(sprint, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(sprint, { clientX: 50, pointerId: 1 });
    await waitFor(() =>
      expect(api.updateSection).toHaveBeenCalledWith(SPRINT_ID, { startOffsetMs: 60000 }),
    );
  });

  it('clamps a drag so a boundary cannot cross its neighbor', async () => {
    stubRect();
    await renderBand(true);
    const warm = screen.getByRole('slider', { name: 'Warm-up start' });
    // Drag warm-up fully right (x=200 → 240000), but it must stay 1s before sprint@120000.
    fireEvent.pointerDown(warm, { clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(warm, { clientX: 200, pointerId: 1 });
    await waitFor(() =>
      expect(api.updateSection).toHaveBeenCalledWith(WARM_ID, { startOffsetMs: 119000 }),
    );
  });

  it('nudges with the keyboard and commits on blur', async () => {
    await renderBand(true);
    const sprint = screen.getByRole('slider', { name: 'Sprint start' });
    fireEvent.keyDown(sprint, { key: 'ArrowRight' }); // +1s draft → 121000
    expect(sprint.getAttribute('aria-valuenow')).toBe('121000');
    expect(api.updateSection).not.toHaveBeenCalled(); // not committed mid-edit
    fireEvent.blur(sprint);
    await waitFor(() =>
      expect(api.updateSection).toHaveBeenCalledWith(SPRINT_ID, { startOffsetMs: 121000 }),
    );
  });
});

describe('SegmentBand track-range snapping', () => {
  // Track 2 starts at 90000 → snap targets are [0, 90000, 240000].
  async function renderWithTracks() {
    vi.mocked(api.listSections).mockResolvedValue(twoSections());
    vi.mocked(api.updateSection).mockResolvedValue(section(SPRINT_ID, 'sprint', 90000));
    render(
      <SegmentBand classId={CLASS_ID} totalDurationMs={TOTAL} canEdit trackStartsMs={[0, 90000]} />,
    );
    await screen.findByRole('slider', { name: 'Sprint start' });
  }

  it('offers a "Snap to tracks" toggle when interior track starts exist', async () => {
    await renderWithTracks();
    const toggle = screen.getByRole('checkbox', { name: 'Snap to tracks' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true); // default on
  });

  it('hides the toggle when there are no interior track starts', async () => {
    vi.mocked(api.listSections).mockResolvedValue(twoSections());
    render(<SegmentBand classId={CLASS_ID} totalDurationMs={TOTAL} canEdit trackStartsMs={[0]} />);
    await screen.findByRole('slider', { name: 'Sprint start' });
    expect(screen.queryByRole('checkbox', { name: 'Snap to tracks' })).toBeNull();
  });

  it('snaps a dragged boundary to the nearest track start', async () => {
    stubRect();
    await renderWithTracks();
    const sprint = screen.getByRole('slider', { name: 'Sprint start' });
    // Drag to x=83/200 → ~99600ms raw; nearest track edge is 90000.
    fireEvent.pointerDown(sprint, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(sprint, { clientX: 83, pointerId: 1 });
    await waitFor(() =>
      expect(api.updateSection).toHaveBeenCalledWith(SPRINT_ID, { startOffsetMs: 90000 }),
    );
  });

  it('arrow keys jump to the adjacent track boundary under snap', async () => {
    await renderWithTracks();
    const sprint = screen.getByRole('slider', { name: 'Sprint start' });
    fireEvent.keyDown(sprint, { key: 'ArrowLeft' }); // 120000 → previous edge 90000
    expect(sprint.getAttribute('aria-valuenow')).toBe('90000');
    fireEvent.blur(sprint);
    await waitFor(() =>
      expect(api.updateSection).toHaveBeenCalledWith(SPRINT_ID, { startOffsetMs: 90000 }),
    );
  });
});
