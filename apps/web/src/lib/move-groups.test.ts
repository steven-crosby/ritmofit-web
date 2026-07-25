import { describe, expect, it } from 'vitest';
import type { Move } from '@ritmofit/shared';
import { groupMovesByTemplate, moveOptionLabel } from './move-groups.js';

function move(name: string, template: Move['template'], description: string | null = null): Move {
  return { id: `id-${name}`, name, description, template } as unknown as Move;
}

const library = [
  move('Climb', 'cycle'),
  move('Sprint', 'cycle'),
  move('Burpee', 'hiit'),
  move('Squat', 'sculpt'),
  move('Run', 'tread'),
  move('Freeform', null),
];

describe('groupMovesByTemplate', () => {
  it('leads with the open class’s discipline and keeps every other one reachable', () => {
    const groups = groupMovesByTemplate(library, 'hiit');
    expect(groups.map((g) => g.template)).toEqual(['hiit', 'cycle', 'sculpt', 'tread', null]);
    expect(groups[0]!.moves.map((m) => m.name)).toEqual(['Burpee']);
    // Demoted, never dropped: a Cycle move is still one interaction away.
    expect(groups.flatMap((g) => g.moves).map((m) => m.name)).toContain('Climb');
  });

  it('changes which group leads with the class', () => {
    expect(groupMovesByTemplate(library, 'cycle')[0]!.template).toBe('cycle');
    expect(groupMovesByTemplate(library, 'sculpt')[0]!.template).toBe('sculpt');
  });

  it('labels groups in instructor language, not the stored enum', () => {
    const groups = groupMovesByTemplate(library, 'sculpt');
    // Pilates is stored as the sculpt contract; the picker says Pilates.
    expect(groups[0]!.label).toBe('Pilates');
    expect(groups.find((g) => g.template === null)!.label).toBe('Other moves');
  });

  it('emits no group for a discipline with no moves', () => {
    const groups = groupMovesByTemplate([move('Climb', 'cycle')], 'hiit');
    expect(groups.map((g) => g.template)).toEqual(['cycle']);
  });

  it('falls back to a stable order with no class discipline', () => {
    expect(groupMovesByTemplate(library).map((g) => g.template)).toEqual([
      'cycle',
      'hiit',
      'sculpt',
      'tread',
      null,
    ]);
  });
});

describe('moveOptionLabel', () => {
  it('surfaces the description so near-duplicate seed names are distinguishable', () => {
    // The seed genuinely contains these pairs.
    expect(moveOptionLabel({ name: 'Run', description: 'Sustained tread pace' })).toBe(
      'Run — Sustained tread pace',
    );
    expect(moveOptionLabel({ name: 'Running', description: 'Standing run, out of saddle' })).toBe(
      'Running — Standing run, out of saddle',
    );
    expect(moveOptionLabel({ name: 'Sprint', description: 'Max cadence push' })).not.toBe(
      moveOptionLabel({ name: 'Sprint Hold', description: 'Sustained sprint effort' }),
    );
  });

  it('prints the bare name when a move carries no description', () => {
    expect(moveOptionLabel({ name: 'Hover Pulse', description: null })).toBe('Hover Pulse');
    expect(moveOptionLabel({ name: 'Hover Pulse', description: '  ' })).toBe('Hover Pulse');
  });
});
