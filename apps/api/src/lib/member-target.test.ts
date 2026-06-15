import { describe, it, expect } from 'vitest';
import { addTeamMemberSchema } from '@ritmofit/shared';
import { resolveMemberTarget } from './member-target.js';
import { HttpError } from './errors.js';

describe('resolveMemberTarget', () => {
  it('passes a directly-supplied user id through', () => {
    expect(resolveMemberTarget({ directUserId: 'u1', emailGiven: false, emailUserId: null })).toBe(
      'u1',
    );
  });

  it('uses the email-resolved user id', () => {
    expect(resolveMemberTarget({ directUserId: null, emailGiven: true, emailUserId: 'u2' })).toBe(
      'u2',
    );
  });

  it('422s when an email resolved to no user', () => {
    expect(() =>
      resolveMemberTarget({ directUserId: null, emailGiven: true, emailUserId: null }),
    ).toThrow(HttpError);
  });
});

describe('addTeamMemberSchema target invariant', () => {
  it('accepts a user id alone', () => {
    expect(addTeamMemberSchema.safeParse({ userId: 'u1' }).success).toBe(true);
  });

  it('accepts an email alone', () => {
    expect(addTeamMemberSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects neither', () => {
    expect(addTeamMemberSchema.safeParse({}).success).toBe(false);
  });

  it('rejects both', () => {
    expect(addTeamMemberSchema.safeParse({ userId: 'u1', email: 'a@b.com' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(addTeamMemberSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});
