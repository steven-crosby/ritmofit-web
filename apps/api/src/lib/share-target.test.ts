import { describe, it, expect } from 'vitest';
import { createShareSchema } from '@ritmofit/shared';
import { resolveShareTarget } from './share-target.js';
import { HttpError } from './errors.js';

describe('resolveShareTarget', () => {
  const self = 'me';

  it('passes a directly-supplied user id through', () => {
    expect(
      resolveShareTarget({ directUserId: 'u1', teamId: null, emailGiven: false, emailUserId: null, selfUserId: self }),
    ).toEqual({ targetUserId: 'u1', targetTeamId: null });
  });

  it('passes a team id through', () => {
    expect(
      resolveShareTarget({ directUserId: null, teamId: 't1', emailGiven: false, emailUserId: null, selfUserId: self }),
    ).toEqual({ targetUserId: null, targetTeamId: 't1' });
  });

  it('uses the email-resolved user id', () => {
    expect(
      resolveShareTarget({ directUserId: null, teamId: null, emailGiven: true, emailUserId: 'u2', selfUserId: self }),
    ).toEqual({ targetUserId: 'u2', targetTeamId: null });
  });

  it('422s when an email resolved to no user', () => {
    expect(() =>
      resolveShareTarget({ directUserId: null, teamId: null, emailGiven: true, emailUserId: null, selfUserId: self }),
    ).toThrow(HttpError);
  });

  it('422s on sharing with yourself (direct id)', () => {
    expect(() =>
      resolveShareTarget({ directUserId: self, teamId: null, emailGiven: false, emailUserId: null, selfUserId: self }),
    ).toThrow(/yourself/);
  });

  it('422s on sharing with yourself (via email)', () => {
    expect(() =>
      resolveShareTarget({ directUserId: null, teamId: null, emailGiven: true, emailUserId: self, selfUserId: self }),
    ).toThrow(/yourself/);
  });
});

describe('createShareSchema target invariant', () => {
  const base = { resourceId: '11111111-1111-4111-8111-111111111111', permission: 'view' as const };

  it('accepts exactly one target (email)', () => {
    expect(createShareSchema.safeParse({ ...base, targetEmail: 'a@b.com' }).success).toBe(true);
  });

  it('rejects zero targets', () => {
    expect(createShareSchema.safeParse({ ...base }).success).toBe(false);
  });

  it('rejects two targets (email + user id)', () => {
    expect(createShareSchema.safeParse({ ...base, targetEmail: 'a@b.com', targetUserId: 'u1' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(createShareSchema.safeParse({ ...base, targetEmail: 'not-an-email' }).success).toBe(false);
  });
});
