import { describe, it, expect } from 'vitest';
import type { SharePermission } from '@ritmofit/shared';
import {
  AccessError,
  assertAccess,
  resolveAccess,
  type AuthzStore,
  type MinAccessLevel,
} from './authz.js';

const ME = 'user_me';
const OWNER = 'user_owner';
const CLASS = 'class_1';

/** A store whose two lookups return fixed values — for composition tests. */
function stubStore(owner: string | null, share: SharePermission | null): AuthzStore {
  return {
    async getClassOwner() {
      return owner;
    },
    async getEffectiveShare() {
      return share;
    },
  };
}

/**
 * An in-memory store that mirrors the real union semantics (direct or via team
 * membership, highest permission wins) — so resolveAccess is exercised against the
 * same rules the Drizzle store implements, without a live D1.
 */
interface FakeShare {
  classId: string;
  targetUserId?: string;
  targetTeamId?: string;
  permission: SharePermission;
}
function memoryStore(opts: {
  owners?: Record<string, string>;
  shares?: FakeShare[];
  memberships?: Array<{ teamId: string; userId: string }>;
}): AuthzStore {
  const owners = opts.owners ?? {};
  const shares = opts.shares ?? [];
  const memberships = opts.memberships ?? [];
  return {
    async getClassOwner(classId) {
      return owners[classId] ?? null;
    },
    async getEffectiveShare(classId, userId) {
      const myTeams = new Set(
        memberships.filter((m) => m.userId === userId).map((m) => m.teamId),
      );
      const applicable = shares.filter(
        (s) =>
          s.classId === classId &&
          (s.targetUserId === userId || (s.targetTeamId !== undefined && myTeams.has(s.targetTeamId))),
      );
      if (applicable.some((s) => s.permission === 'edit')) return 'edit';
      if (applicable.some((s) => s.permission === 'view')) return 'view';
      return null;
    },
  };
}

/** Assert a call throws an AccessError with the expected status + code. */
function expectAccessError(fn: () => unknown, status: 403 | 404, code: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(AccessError);
    expect((err as AccessError).status).toBe(status);
    expect((err as AccessError).code).toBe(code);
    return;
  }
  throw new Error('expected AccessError to be thrown, but nothing was thrown');
}

describe('resolveAccess — composition', () => {
  it('owner of the class → owner', async () => {
    expect(await resolveAccess(stubStore(ME, null), ME, CLASS)).toBe('owner');
  });

  it('owner beats any share', async () => {
    expect(await resolveAccess(stubStore(ME, 'view'), ME, CLASS)).toBe('owner');
  });

  it('missing class → none (existence hidden)', async () => {
    expect(await resolveAccess(stubStore(null, null), ME, CLASS)).toBe('none');
  });

  it('non-owner with edit share → edit', async () => {
    expect(await resolveAccess(stubStore(OWNER, 'edit'), ME, CLASS)).toBe('edit');
  });

  it('non-owner with view share → view', async () => {
    expect(await resolveAccess(stubStore(OWNER, 'view'), ME, CLASS)).toBe('view');
  });

  it('non-owner with no share → none', async () => {
    expect(await resolveAccess(stubStore(OWNER, null), ME, CLASS)).toBe('none');
  });
});

describe('resolveAccess — owned ∪ shared-direct ∪ shared-team union', () => {
  it('direct edit share → edit', async () => {
    const store = memoryStore({
      owners: { [CLASS]: OWNER },
      shares: [{ classId: CLASS, targetUserId: ME, permission: 'edit' }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('edit');
  });

  it('direct view share → view', async () => {
    const store = memoryStore({
      owners: { [CLASS]: OWNER },
      shares: [{ classId: CLASS, targetUserId: ME, permission: 'view' }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('view');
  });

  it('team edit share, user is a member → edit', async () => {
    const store = memoryStore({
      owners: { [CLASS]: OWNER },
      shares: [{ classId: CLASS, targetTeamId: 'team_1', permission: 'edit' }],
      memberships: [{ teamId: 'team_1', userId: ME }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('edit');
  });

  it('team view share, user is a member → view', async () => {
    const store = memoryStore({
      owners: { [CLASS]: OWNER },
      shares: [{ classId: CLASS, targetTeamId: 'team_1', permission: 'view' }],
      memberships: [{ teamId: 'team_1', userId: ME }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('view');
  });

  it('team share but user is NOT a member → none', async () => {
    const store = memoryStore({
      owners: { [CLASS]: OWNER },
      shares: [{ classId: CLASS, targetTeamId: 'team_1', permission: 'edit' }],
      memberships: [{ teamId: 'team_1', userId: 'someone_else' }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('none');
  });

  it('highest wins — direct view + team edit → edit', async () => {
    const store = memoryStore({
      owners: { [CLASS]: OWNER },
      shares: [
        { classId: CLASS, targetUserId: ME, permission: 'view' },
        { classId: CLASS, targetTeamId: 'team_1', permission: 'edit' },
      ],
      memberships: [{ teamId: 'team_1', userId: ME }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('edit');
  });

  it('owner beats a share granted to the owner', async () => {
    const store = memoryStore({
      owners: { [CLASS]: ME },
      shares: [{ classId: CLASS, targetUserId: ME, permission: 'view' }],
    });
    expect(await resolveAccess(store, ME, CLASS)).toBe('owner');
  });
});

describe('assertAccess — enforcement', () => {
  const ok: Array<[Parameters<typeof assertAccess>[0], MinAccessLevel]> = [
    ['owner', 'owner'],
    ['owner', 'edit'],
    ['owner', 'view'],
    ['edit', 'edit'],
    ['edit', 'view'],
    ['view', 'view'],
  ];
  it.each(ok)('%s satisfies min %s', (level, min) => {
    expect(assertAccess(level, min)).toBe(level);
  });

  it('visible but insufficient → 403 FORBIDDEN', () => {
    expectAccessError(() => assertAccess('view', 'edit'), 403, 'FORBIDDEN');
    expectAccessError(() => assertAccess('edit', 'owner'), 403, 'FORBIDDEN');
    expectAccessError(() => assertAccess('view', 'owner'), 403, 'FORBIDDEN');
  });

  it('no access at all → 404 NOT_FOUND (existence hidden)', () => {
    expectAccessError(() => assertAccess('none', 'view'), 404, 'NOT_FOUND');
    expectAccessError(() => assertAccess('none', 'edit'), 404, 'NOT_FOUND');
    expectAccessError(() => assertAccess('none', 'owner'), 404, 'NOT_FOUND');
  });
});
