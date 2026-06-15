import { describe, it, expect } from 'vitest';
import { placeClassTrackMoveSchema } from '@ritmofit/shared';

const MOVE = '00000000-0000-4000-8000-000000000001';
const USER_MOVE = '11111111-1111-4111-8111-111111111111';

/**
 * The placement invariant (schema.md): at most one library reference, and at
 * least one of moveId / userMoveId / nameOverride. `placeClassTrackMoveSchema` is
 * also what the PATCH route re-validates the merged row against.
 */
describe('placeClassTrackMoveSchema invariant', () => {
  it('accepts a global-move reference', () => {
    expect(placeClassTrackMoveSchema.safeParse({ anchorMs: 1000, moveId: MOVE }).success).toBe(
      true,
    );
  });

  it('accepts a user-move reference', () => {
    expect(
      placeClassTrackMoveSchema.safeParse({ anchorMs: 1000, userMoveId: USER_MOVE }).success,
    ).toBe(true);
  });

  it('accepts a freeform name with no reference', () => {
    expect(
      placeClassTrackMoveSchema.safeParse({ anchorMs: 1000, nameOverride: 'Tuck Jump' }).success,
    ).toBe(true);
  });

  it('rejects referencing both a move and a user-move', () => {
    expect(
      placeClassTrackMoveSchema.safeParse({ anchorMs: 1000, moveId: MOVE, userMoveId: USER_MOVE })
        .success,
    ).toBe(false);
  });

  it('rejects no reference and no name', () => {
    expect(placeClassTrackMoveSchema.safeParse({ anchorMs: 1000 }).success).toBe(false);
  });

  it('rejects a missing anchor', () => {
    expect(placeClassTrackMoveSchema.safeParse({ moveId: MOVE }).success).toBe(false);
  });
});
