/**
 * Team-share *detail access* through the mounted Worker. The pagination suite
 * already covers team-shared classes appearing in `GET /classes` (the listing
 * union in `listVisibleClasses`); this exercises the separate `resolveAccess`
 * path — a verified team member reading and (after escalation) editing a
 * team-shared class via the real class/track routes, and the access-level
 * enforcement between `view` and `edit`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

describe('team-share detail access (integration)', () => {
  let owner: TestUser;
  let member: TestUser;
  let classId: string;
  let classTrackId: string;
  let shareId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    member = await signUpUser();
    await verifyUserEmail(member.userId); // team members must be verified to be added

    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Team-shared class' }),
    });
    classId = ((await created.json()) as { id: string }).id;

    const track = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Track A', artist: 'Artist', durationMs: 180000 },
        intensity: 'mod',
      }),
    });
    expect(track.status).toBe(201);
    const tracks = (await (
      await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`)
    ).json()) as Array<{ id: string }>;
    classTrackId = tracks[0]!.id;

    const team = await authed(owner.cookie)('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Access team' }),
    });
    const teamId = ((await team.json()) as { id: string }).id;

    const addMember = await authed(owner.cookie)(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: member.email }),
    });
    expect(addMember.status).toBe(201);

    // Share the class to the whole team at view level.
    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ resourceId: classId, targetTeamId: teamId, permission: 'view' }),
    });
    expect(share.status).toBe(201);
    shareId = ((await share.json()) as { id: string }).id;
  });

  it('grants a verified team member view access to the class and its detail', async () => {
    const as = authed(member.cookie);

    const list = (await (await as('/api/v1/classes')).json()) as Array<{
      id: string;
      accessLevel: string;
    }>;
    const entry = list.find((c) => c.id === classId);
    expect(entry?.accessLevel).toBe('view');

    expect((await as(`/api/v1/classes/${classId}/tracks`)).status).toBe(200);
    expect((await as(`/api/v1/classes/${classId}/run-payload`)).status).toBe(200);
  });

  it('forbids a view-level team member from editing the class or its tracks', async () => {
    const as = authed(member.cookie);

    const patch = await as(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ intensity: 'hard' }),
    });
    expect(patch.status).toBe(403);

    // The class is visible (existence known), so an owner-only action is 403, not 404.
    const del = await as(`/api/v1/classes/${classId}`, { method: 'DELETE' });
    expect(del.status).toBe(403);
  });

  it('lets the member edit once the team share is escalated to edit', async () => {
    const escalate = await authed(owner.cookie)(`/api/v1/shares/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });
    expect(escalate.status).toBe(200);

    const patch = await authed(member.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ intensity: 'hard' }),
    });
    expect(patch.status).toBe(200);
    expect((await patch.json()).intensity).toBe('hard');

    // Still not the owner, so deleting the class remains forbidden.
    const del = await authed(member.cookie)(`/api/v1/classes/${classId}`, { method: 'DELETE' });
    expect(del.status).toBe(403);
  });
});
