/**
 * Reviewer A (audit 2026-10-27 @ 4e0b150) — disposable reproductions. NOT for commit.
 */
import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, call, readResetToken, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

type Json = Record<string, unknown>;

async function createClass(u: TestUser, title = 'A-repro class'): Promise<string> {
  const res = await authed(u.cookie)('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

/** Count D1 statements whose SQL reads the Better Auth sessions table during one call. */
async function countSessionLookups(fn: () => Promise<Response>) {
  const mutable = env as unknown as { DB: D1Database };
  const original = mutable.DB;
  const seen: string[] = [];
  mutable.DB = new Proxy(original, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'prepare') {
        return (sql: string) => {
          seen.push(sql);
          return (value as D1Database['prepare']).call(target, sql);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  try {
    const res = await fn();
    return {
      status: res.status,
      sessionSelects: seen.filter((s) => /from\s+"sessions"/i.test(s)).length,
      total: seen.length,
    };
  } finally {
    mutable.DB = original;
  }
}

describe('A-repro: authz and data-path reproductions', () => {
  let owner: TestUser;
  let collaborator: TestUser;
  let stranger: TestUser;
  let victim: TestUser;

  beforeAll(async () => {
    owner = await signUpUser();
    collaborator = await signUpUser();
    stranger = await signUpUser();
    victim = await signUpUser();
    await verifyUserEmail(collaborator.userId);
    await verifyUserEmail(victim.userId);
  });

  it('A-1: an edit-share collaborator can publish the owner private class to Explore', async () => {
    const classId = await createClass(owner, 'Owner private class');
    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ resourceId: classId, targetEmail: collaborator.email, permission: 'edit' }),
    });
    expect(share.status).toBe(201);

    // Before: stranger cannot see it.
    expect((await authed(stranger.cookie)(`/api/v1/classes/${classId}`)).status).toBe(404);

    const patch = await authed(collaborator.cookie)(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'public' }),
    });
    console.log('[A-1] collaborator PATCH visibility=public ->', patch.status);
    expect(patch.status).toBe(200);
    expect(((await patch.json()) as Json).visibility).toBe('public');

    // After: any authenticated stranger can open it, read run-payload, and copy it.
    const read = await authed(stranger.cookie)(`/api/v1/classes/${classId}`);
    const payload = await authed(stranger.cookie)(`/api/v1/classes/${classId}/run-payload`);
    const copy = await authed(stranger.cookie)(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: '{}',
    });
    const explore = (await (await authed(stranger.cookie)('/api/v1/explore')).json()) as Json[];
    console.log(
      '[A-1] stranger GET class ->',
      read.status,
      'run-payload ->',
      payload.status,
      'copy ->',
      copy.status,
      'in explore ->',
      explore.some((c) => c.id === classId),
    );
    expect(read.status).toBe(200);
    expect(payload.status).toBe(200);
    expect(copy.status).toBe(201);

    // Revoking the share does not undo the publication.
    const shares = (await (
      await authed(owner.cookie)(`/api/v1/classes/${classId}/shares`)
    ).json()) as Array<{ id: string }>;
    await authed(owner.cookie)(`/api/v1/shares/${shares[0]!.id}`, { method: 'DELETE' });
    expect((await authed(stranger.cookie)(`/api/v1/classes/${classId}`)).status).toBe(200);
  });

  it('A-2: any user can push a class into a verified stranger library; victim cannot remove it', async () => {
    const spamId = await createClass(stranger, 'Unsolicited class title');
    const share = await authed(stranger.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ resourceId: spamId, targetEmail: victim.email, permission: 'view' }),
    });
    console.log('[A-2] stranger shares to victim email ->', share.status);
    expect(share.status).toBe(201);
    const shareId = ((await share.json()) as { id: string }).id;

    const lib = (await (await authed(victim.cookie)('/api/v1/classes')).json()) as Json[];
    const listed = lib.some((c) => c.id === spamId);
    console.log('[A-2] appears in victim GET /classes ->', listed);
    expect(listed).toBe(true);

    const revoke = await authed(victim.cookie)(`/api/v1/shares/${shareId}`, { method: 'DELETE' });
    console.log('[A-2] victim DELETE share ->', revoke.status);
    expect(revoke.status).toBe(403);

    // Team path: stranger adds the victim to a team without consent, and the victim's
    // email becomes visible to every member of that team.
    const team = await authed(stranger.cookie)('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Unsolicited team' }),
    });
    const teamId = ((await team.json()) as { id: string }).id;
    const add = await authed(stranger.cookie)(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: victim.email }),
    });
    console.log('[A-2] stranger adds victim to team ->', add.status);
    expect(add.status).toBe(201);
  });

  it('A-3: share/team-add responses are an account-existence and verification oracle', async () => {
    const classId = await createClass(stranger, 'Oracle class');
    const probe = async (email: string) => {
      const res = await authed(stranger.cookie)('/api/v1/shares', {
        method: 'POST',
        body: JSON.stringify({ resourceId: classId, targetEmail: email, permission: 'view' }),
      });
      const body = (await res.json()) as { error?: { code: string; message: string } };
      return `${res.status} ${body.error?.code ?? 'created'} ${body.error?.message ?? ''}`.trim();
    };
    const unknown = await probe(`nobody-${crypto.randomUUID()}@example.com`);
    const unverified = await probe(owner.email);
    console.log('[A-3] unknown email ->', unknown);
    console.log('[A-3] registered-unverified email ->', unverified);
    console.log('[A-3] registered-verified email ->', await probe(collaborator.email));
    expect(unknown).not.toBe(unverified);
  });

  it('A-4: a team admin can mint another owner-role member who can then manage the team', async () => {
    const team = await authed(owner.cookie)('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Role team' }),
    });
    const teamId = ((await team.json()) as { id: string }).id;
    // owner adds collaborator as admin
    expect(
      (
        await authed(owner.cookie)(`/api/v1/teams/${teamId}/members`, {
          method: 'POST',
          body: JSON.stringify({ email: collaborator.email, role: 'admin' }),
        })
      ).status,
    ).toBe(201);
    // admin adds victim with role 'owner'
    const addOwner = await authed(collaborator.cookie)(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: victim.email, role: 'owner' }),
    });
    console.log('[A-4] admin adds member with role=owner ->', addOwner.status);
    expect(addOwner.status).toBe(201);
    const members = (await (
      await authed(owner.cookie)(`/api/v1/teams/${teamId}/members`)
    ).json()) as Array<{ userId: string; role: string }>;
    console.log('[A-4] roles ->', JSON.stringify(members.map((m) => m.role)));
    // the minted "owner" can remove the admin who added them
    const kick = await authed(victim.cookie)(
      `/api/v1/teams/${teamId}/members/${collaborator.userId}`,
      { method: 'DELETE' },
    );
    console.log('[A-4] minted owner removes admin ->', kick.status);
    expect(kick.status).toBe(204);
  });

  it('A-5: requireSession re-runs (one session lookup each) for every root router mounted earlier', async () => {
    const me = authed(owner.cookie);
    const classId = await createClass(owner, 'Perf class');
    const probes: Array<[string, () => Promise<Response>]> = [
      ['GET /auth/me', () => me('/api/v1/auth/me')],
      ['GET /classes/:id', () => me(`/api/v1/classes/${classId}`)],
      ['GET /classes/:id/tracks', () => me(`/api/v1/classes/${classId}/tracks`)],
      ['GET /user-moves', () => me('/api/v1/user-moves')],
      ['GET /providers/connections', () => me('/api/v1/providers/connections')],
      ['GET /teams', () => me('/api/v1/teams')],
      ['GET /explore', () => me('/api/v1/explore')],
      ['GET /nope (unknown path)', () => me('/api/v1/nope')],
      ['GET /nope anonymous', () => call('/api/v1/nope')],
    ];
    const results: string[] = [];
    for (const [label, fn] of probes) {
      const r = await countSessionLookups(fn);
      results.push(`${label}: status=${r.status} sessionSelects=${r.sessionSelects} totalStatements=${r.total}`);
    }
    console.log('[A-5]\n' + results.join('\n'));
    const explore = await countSessionLookups(() => me('/api/v1/explore'));
    expect(explore.sessionSelects).toBeGreaterThan(5);
  });

  it('A-6: an edit collaborator cannot move an owner-placed user-move cue (422 on own class)', async () => {
    const classId = await createClass(owner, 'Choreo class');
    await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ resourceId: classId, targetEmail: collaborator.email, permission: 'edit' }),
    });
    await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track: { title: 'T', artist: 'A', durationMs: 180000 } }),
    });
    const cts = (await (
      await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`)
    ).json()) as Array<{ id: string }>;
    const um = await authed(owner.cookie)('/api/v1/user-moves', {
      method: 'POST',
      body: JSON.stringify({ name: 'Owner custom move' }),
    });
    const userMoveId = ((await um.json()) as { id: string }).id;
    const placed = await authed(owner.cookie)(`/api/v1/class-tracks/${cts[0]!.id}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 1000, userMoveId }),
    });
    expect(placed.status).toBe(201);
    const placementId = ((await placed.json()) as { id: string }).id;
    const move = await authed(collaborator.cookie)(`/api/v1/class-track-moves/${placementId}`, {
      method: 'PATCH',
      body: JSON.stringify({ anchorMs: 2000 }),
    });
    console.log('[A-6] collaborator PATCH anchor only ->', move.status, await move.text());
    expect(move.status).toBe(422);
  });

  it('A-8: an existing session survives a password reset', async () => {
    const user = await signUpUser(); // user.cookie = a session minted before the reset
    const post = (path: string, body: unknown) =>
      call(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect(
      (
        await post('/api/auth/request-password-reset', {
          email: user.email,
          redirectTo: 'https://test.ritmofit.studio/reset-password',
        })
      ).ok,
    ).toBe(true);
    const token = await readResetToken(user.userId);
    const reset = await post('/api/auth/reset-password', { newPassword: 'rotated-pw-123456', token });
    expect(reset.ok).toBe(true);
    const me = await authed(user.cookie)('/api/v1/auth/me');
    const sessions = await env.DB.prepare('SELECT count(*) AS n FROM sessions WHERE user_id = ?')
      .bind(user.userId)
      .first<{ n: number }>();
    console.log('[A-8] pre-reset session GET /auth/me after reset ->', me.status, 'sessions rows =', sessions?.n);
    expect(me.status).toBe(200);

    const foreign = await post('/api/auth/request-password-reset', {
      email: user.email,
      redirectTo: 'https://evil.example/steal',
    });
    console.log('[A-8] request-password-reset with foreign redirectTo ->', foreign.status);
  });
});
