// @vitest-environment jsdom
//
// The move picker's grouping (P1-04). Deliberately its own file: the moves
// library is cached in a module-level promise, so the first successful
// `listMoves()` in a file is the library every later test in it sees.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Move, UserMove } from '@ritmofit/shared';
import { MovesSection } from './ChoreographyEditor.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function move(name: string, template: Move['template'], description: string | null = null): Move {
  return { id: `m-${name}`, name, description, template } as unknown as Move;
}

const LIBRARY = [
  move('Climb', 'cycle', 'Heavy resistance, out of saddle'),
  move('Sprint', 'cycle', 'Max cadence push'),
  move('Sprint Hold', 'cycle', 'Sustained sprint effort'),
  move('Burpee', 'hiit', 'Full-body floor move'),
  move('Squat', 'sculpt', 'Lower-body strength'),
  move('Run', 'tread', 'Sustained tread pace'),
];

function mockLibrary(userMoves: UserMove[] = []) {
  vi.mocked(api.listPlacedMoves).mockResolvedValue([]);
  vi.mocked(api.listMoves).mockResolvedValue(LIBRARY);
  vi.mocked(api.listUserMoves).mockResolvedValue(userMoves);
}

/** The add-row picker (the edit picker only exists once a move is placed). */
async function addPicker() {
  const selects = await screen.findAllByRole('combobox', { name: 'Move' });
  return selects[selects.length - 1] as HTMLSelectElement;
}

const groupsOf = (select: HTMLSelectElement) =>
  [...select.querySelectorAll('optgroup')].map((g) => g.getAttribute('label'));

describe('move picker grouping', () => {
  it('leads with the open class’s discipline and collapses the rest behind one control', async () => {
    mockLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={180000} template="cycle" />);

    const select = await addPicker();
    // Only this class's discipline is offered at rest…
    expect(groupsOf(select)).toEqual(['Cycle']);
    expect(within(select).getByRole('option', { name: /^Climb/ })).toBeTruthy();
    expect(within(select).queryByRole('option', { name: /^Burpee/ })).toBeNull();

    // …and every other discipline is exactly one interaction away, never hidden.
    fireEvent.click(screen.getByLabelText('Show every discipline'));
    expect(groupsOf(await addPicker())).toEqual(['Cycle', 'HIIT', 'Pilates', 'Tread']);
    expect(within(await addPicker()).getByRole('option', { name: /^Burpee/ })).toBeTruthy();
  });

  it('leads with a different discipline for a different class', async () => {
    mockLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={180000} template="hiit" />);
    const select = await addPicker();
    expect(groupsOf(select)).toEqual(['HIIT']);
    expect(within(select).getByRole('option', { name: /^Burpee/ })).toBeTruthy();
  });

  it('keeps custom moves in their own group, always visible', async () => {
    mockLibrary([{ id: 'u-1', name: 'Hover Pulse' } as unknown as UserMove]);
    render(<MovesSection classTrackId="ct-1" durationMs={180000} template="cycle" />);
    const select = await addPicker();
    expect(groupsOf(select)).toEqual(['Cycle', 'Your moves']);
    expect(within(select).getByRole('option', { name: 'Hover Pulse' })).toBeTruthy();
  });

  it('distinguishes near-duplicate seed names at the point of choice', async () => {
    mockLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={180000} template="cycle" />);
    const select = await addPicker();
    // "Sprint" and "Sprint Hold" are told apart without leaving the picker and
    // without hovering anything.
    expect(within(select).getByRole('option', { name: 'Sprint — Max cadence push' })).toBeTruthy();
    expect(
      within(select).getByRole('option', { name: 'Sprint Hold — Sustained sprint effort' }),
    ).toBeTruthy();
  });

  it('keeps the picker shrinkable so long option labels cannot widen the page', async () => {
    mockLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={180000} template="cycle" />);
    const select = await addPicker();

    // A native select sizes itself to its widest <option>, so carrying each move's
    // description in the label made this control 392px wide and pushed the whole
    // page into horizontal scroll at a 320px viewport — WCAG 1.4.10. `min-w-0` is
    // what allows a flex item to shrink below its content width.
    //
    // jsdom has no layout engine, so this asserts the affordance rather than the
    // measurement; the real number comes from `agent-prompts/browser-verification`
    // (`horizontalOverflow()` must report `overflows: false` at 320 and 390).
    expect(select.className).toContain('min-w-0');
    // And the descriptions must survive — they are what tells "Sprint" from
    // "Sprint Hold" at the point of choice.
    expect([...select.querySelectorAll('option')].some((o) => o.textContent?.includes(' — '))).toBe(
      true,
    );
  });

  it('offers every discipline when the class has no template at all', async () => {
    mockLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={180000} />);
    expect(groupsOf(await addPicker())).toEqual(['Cycle', 'HIIT', 'Pilates', 'Tread']);
    // Nothing to demote, so no toggle is offered.
    expect(screen.queryByLabelText('Show every discipline')).toBeNull();
  });
});
