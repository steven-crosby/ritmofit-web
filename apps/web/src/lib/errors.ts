/**
 * Normalize an unknown thrown value into a user-facing message. The `api.ts` layer
 * always throws real `Error`s, so this mainly guards the rare non-Error throw (or an
 * `Error` with an empty message) from rendering as an empty or `undefined` string in
 * a danger paragraph. Shared so every hand-rolled `catch` reports consistently.
 */
export function errMessage(e: unknown, fallback = 'Something went wrong.'): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e.trim() !== '') return e;
  return fallback;
}
