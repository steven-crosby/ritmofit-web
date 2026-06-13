/**
 * Pure resolution of a share's effective target, after any email→id lookup.
 *
 * The shared `createShareSchema` already guarantees **exactly one** of
 * userId / teamId / email was supplied; this collapses that to the stored
 * `(targetUserId, targetTeamId)` pair and enforces the two app-level guards the
 * schema can't: an email that resolved to no user, and self-sharing. Kept pure
 * (throws typed `HttpError`s, no DB) so the route stays thin and this is unit-tested.
 */
import { HttpError } from './errors.js';

export interface ShareTargetInput {
  /** A user id supplied directly (`targetUserId`), or null if not that path. */
  directUserId: string | null;
  /** A team id supplied (`targetTeamId`), or null if not that path. */
  teamId: string | null;
  /** True when the caller supplied `targetEmail`. */
  emailGiven: boolean;
  /** The user id `targetEmail` resolved to, or null when no such user exists. */
  emailUserId: string | null;
  /** The caller — used to reject sharing a class with yourself. */
  selfUserId: string;
}

export function resolveShareTarget(input: ShareTargetInput): {
  targetUserId: string | null;
  targetTeamId: string | null;
} {
  const { directUserId, teamId, emailGiven, emailUserId, selfUserId } = input;

  if (emailGiven && emailUserId === null) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'No user with that email.');
  }

  const targetUserId = emailGiven ? emailUserId : directUserId;
  if (targetUserId !== null && targetUserId === selfUserId) {
    throw new HttpError(422, 'VALIDATION_ERROR', "You can't share a class with yourself.");
  }

  return { targetUserId, targetTeamId: teamId };
}
