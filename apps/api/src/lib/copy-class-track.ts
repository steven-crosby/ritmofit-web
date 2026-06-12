/**
 * Pure helpers for `POST /class-tracks/:id/copy` (the cross-user reference safety).
 *
 * A copy must never carry a reference into ANOTHER user's private library: a
 * foreign `track_id` / `user_move_id` would survive the source class being
 * unshared, letting the copier keep reading the owner's private metadata. These
 * functions encode the resolution rules; the route does the DB orchestration.
 * Pure (ids/timestamps injected) so they're unit-tested without a database,
 * mirroring how the authz + purge logic is split from its store.
 */
import type { Provider } from '@ritmofit/shared';

/** Stable key for a provider ref (provider + providerTrackId). */
export function providerRefKey(provider: Provider, providerTrackId: string): string {
  return `${provider} ${providerTrackId}`;
}

/**
 * The track a copied class_track should point at. A track the caller doesn't own
 * is cloned into their library under `newTrackId`; their own track is reused.
 * A missing source owner (`null`) reuses the id (defensive — the FK insert fails
 * loudly rather than silently cloning a ghost).
 */
export function resolveCopiedTrack(opts: {
  sourceTrackId: string;
  sourceTrackOwnerId: string | null;
  callerId: string;
  newTrackId: string;
}): { trackId: string; cloneTrack: boolean } {
  if (opts.sourceTrackOwnerId != null && opts.sourceTrackOwnerId !== opts.callerId) {
    return { trackId: opts.newTrackId, cloneTrack: true };
  }
  return { trackId: opts.sourceTrackId, cloneTrack: false };
}

/**
 * The source provider refs worth cloning onto the caller's new track: those the
 * caller doesn't already own (the owner-scoped unique index would reject a dup,
 * and they already have that song).
 */
export function refsToClone<T extends { provider: Provider; providerTrackId: string }>(
  sourceRefs: readonly T[],
  callerOwnedRefKeys: ReadonlySet<string>,
): T[] {
  return sourceRefs.filter(
    (r) => !callerOwnedRefKeys.has(providerRefKey(r.provider, r.providerTrackId)),
  );
}

/**
 * Resolve a copied placement's move refs for the caller. A `user_move` the caller
 * doesn't own is private to its owner, so drop the ref and snapshot its name into
 * `nameOverride` (preserving the at-least-one-of (move|user_move|name) invariant
 * — a placement keeps a name when it loses its library ref). An existing
 * `nameOverride` wins; the caller's own `user_move`s and global moves pass through.
 */
export function remapPlacedMoveForCaller(
  move: { userMoveId: string | null; nameOverride: string | null },
  callerId: string,
  userMoveOwnerById: ReadonlyMap<string, { userId: string; name: string }>,
): { userMoveId: string | null; nameOverride: string | null } {
  if (move.userMoveId == null) {
    return { userMoveId: null, nameOverride: move.nameOverride };
  }
  const um = userMoveOwnerById.get(move.userMoveId);
  if (um && um.userId === callerId) {
    return { userMoveId: move.userMoveId, nameOverride: move.nameOverride };
  }
  return { userMoveId: null, nameOverride: move.nameOverride ?? um?.name ?? null };
}
