/**
 * Build a Drizzle `.set()` patch from a validated partial-update body.
 *
 * The body is a Zod-parsed `updateXSchema` (`createXSchema.partial()`), so it holds
 * ONLY the fields the client actually sent — spreading it sets exactly those
 * columns, and `updatedAt` is always bumped. This replaces the per-route
 * `if ('field' in body) patch.field = body.field ?? null` ladders, which had to be
 * hand-edited (and kept in sync) for every mutable column.
 */
export function buildPatch<T extends object>(body: T): T & { updatedAt: number } {
  return { ...body, updatedAt: Date.now() };
}
