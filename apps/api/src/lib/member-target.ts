/**
 * Pure resolution of a team-member target, after any email→id lookup.
 *
 * The shared `addTeamMemberSchema` guarantees **exactly one** of userId / email
 * was supplied; this collapses that to a single user id and enforces the one guard
 * the schema can't: an email that resolved to no user. Kept pure (throws a typed
 * `HttpError`, no DB) so the route stays thin and this is unit-tested. Mirrors
 * `share-target.ts`.
 */
import { HttpError } from './errors.js';

export interface MemberTargetInput {
  /** A user id supplied directly (`userId`), or null if the email path was used. */
  directUserId: string | null;
  /** True when the caller supplied `email`. */
  emailGiven: boolean;
  /** The user id `email` resolved to, or null when no such user exists. */
  emailUserId: string | null;
}

export function resolveMemberTarget(input: MemberTargetInput): string {
  const { directUserId, emailGiven, emailUserId } = input;

  if (emailGiven) {
    if (emailUserId === null) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'No user with that email.');
    }
    return emailUserId;
  }

  // The schema guarantees a direct id when no email was given.
  return directUserId!;
}
