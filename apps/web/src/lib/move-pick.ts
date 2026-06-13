/**
 * The move-reference selector value, encoded for a single `<select>`. A placement
 * references at most one of a global library move, the caller's custom user move,
 * or a one-off freeform name — plus an in-editor option to create a new reusable
 * user move. Global and user move ids are both UUIDs, so the source is prefixed
 * to disambiguate (`m:` library, `u:` user move). Pure so it's unit-testable and
 * `MovesSection` stays declarative.
 */
export const CUSTOM = '__custom__'; // one-off freeform nameOverride
export const NEW = '__new__'; // create a new reusable user move, then place it

export type MovePick =
  | { kind: 'custom' }
  | { kind: 'new' }
  | { kind: 'library'; id: string }
  | { kind: 'user'; id: string };

/** Encode a parsed pick back to its `<select>` value. */
export function formatMovePick(pick: MovePick): string {
  switch (pick.kind) {
    case 'custom':
      return CUSTOM;
    case 'new':
      return NEW;
    case 'library':
      return `m:${pick.id}`;
    case 'user':
      return `u:${pick.id}`;
  }
}

/** Decode a `<select>` value; an unrecognized value falls back to one-off custom. */
export function parseMovePick(value: string): MovePick {
  if (value === NEW) return { kind: 'new' };
  if (value.startsWith('m:')) return { kind: 'library', id: value.slice(2) };
  if (value.startsWith('u:')) return { kind: 'user', id: value.slice(2) };
  return { kind: 'custom' };
}

/** The selector value that represents an existing placement's reference. */
export function pickForPlacement(moveId: string | null, userMoveId: string | null): string {
  if (moveId) return `m:${moveId}`;
  if (userMoveId) return `u:${userMoveId}`;
  return CUSTOM;
}
