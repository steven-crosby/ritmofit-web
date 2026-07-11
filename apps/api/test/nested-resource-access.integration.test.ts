/**
 * By-id nested-resource authorization through the mounted Worker. The direct-by-id
 * mutation routes — `PATCH`/`DELETE /sections/:id`, `PATCH`/`DELETE /cues/:id`, and
 * `PATCH`/`DELETE /class-track-moves/:id` — resolve the resource's parent class and
 * enforce its access level via the parent-chain resolvers (`requireSectionAccess`,
 * `requireCueAccess`, `requireClassTrackMoveAccess`). **D1 has no row-level
 * security**, so these routes are exactly where a dropped/weakened parent gate
 * becomes a cross-tenant edit or delete of another instructor's segment bands,
 * cues, or placed moves by id.
 *
 * The invariant pinned here (the same shape for all three resolvers): on a resource
 * that *actually exists* under another user's class, a caller with **no access**
 * gets **404 NOT_FOUND** (existence hidden) and a **view-only** caller gets **403
 * FORBIDDEN** (visible but insufficient). An owner-200 control proves the resource
 * is real, so the 404 is authz-hiding — not a genuine miss. The prior authz /
 * choreography suites only reach the by-id path as the owner (happy path); nothing
 * drove these resolvers cross-user until this suite (cues were the remaining gap
 * after sections + placed-moves).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

interface WithId {
  id: string;
}

/** Assert a response is the standard error envelope with the expected status + code. */
async function expectEnvelope(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe(code);
}

describe('by-id nested-resource access (integration)', () => {
  let owner: TestUser;
  let viewer: TestUser; // shared VIEW — below the EDIT threshold these routes require
  let stranger: TestUser; // no share — must not even learn the resource exists
  let sectionId: string;
  let cueId: string;
  let moveId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    viewer = await signUpUser();
    stranger = await signUpUser();
    // Share targets must be verified to enter the trust graph.
    await verifyUserEmail(viewer.userId);

    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Class with nested resources' }),
    });
    expect(created.status).toBe(201);
    const classId = ((await created.json()) as WithId).id;

    // A track to hang a cue / placed move on (server assigns position/offset).
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
    ).json()) as WithId[];
    const classTrackId = tracks[0]!.id;

    // Seed one real section, cue, and placed move, owned by `owner`.
    const section = await authed(owner.cookie)(`/api/v1/classes/${classId}/sections`, {
      method: 'POST',
      body: JSON.stringify({ type: 'warm_up', startOffsetMs: 0 }),
    });
    expect(section.status).toBe(201);
    sectionId = ((await section.json()) as WithId).id;

    const cue = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 60000, text: 'Climb' }),
    });
    expect(cue.status).toBe(201);
    cueId = ((await cue.json()) as WithId).id;

    // A placed move needs no library reference when it carries a nameOverride.
    const move = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 90000, nameOverride: 'Tap back' }),
    });
    expect(move.status).toBe(201);
    moveId = ((await move.json()) as WithId).id;

    // Grant the viewer VIEW on the class — enough to see it, not to mutate.
    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: classId,
        targetUserId: viewer.userId,
        permission: 'view',
      }),
    });
    expect(share.status).toBe(201);
  });

  it('owner can PATCH the section (positive control: the resource really exists)', async () => {
    const res = await authed(owner.cookie)(`/api/v1/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ startOffsetMs: 30000 }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).startOffsetMs).toBe(30000);
  });

  it('hides the section from a no-access user: PATCH -> 404, DELETE -> 404', async () => {
    const patch = await authed(stranger.cookie)(`/api/v1/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ startOffsetMs: 999000 }),
    });
    await expectEnvelope(patch, 404, 'NOT_FOUND');

    const del = await authed(stranger.cookie)(`/api/v1/sections/${sectionId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(del, 404, 'NOT_FOUND');
  });

  it('blocks a view-only user from mutating the section: PATCH -> 403, DELETE -> 403', async () => {
    const patch = await authed(viewer.cookie)(`/api/v1/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ startOffsetMs: 999000 }),
    });
    await expectEnvelope(patch, 403, 'FORBIDDEN');

    const del = await authed(viewer.cookie)(`/api/v1/sections/${sectionId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(del, 403, 'FORBIDDEN');
  });

  it('owner can PATCH the cue (positive control: the resource really exists)', async () => {
    const res = await authed(owner.cookie)(`/api/v1/cues/${cueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'Sprint' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe('Sprint');
  });

  it('hides the cue from a no-access user: PATCH -> 404, DELETE -> 404', async () => {
    const patch = await authed(stranger.cookie)(`/api/v1/cues/${cueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'Hijacked' }),
    });
    await expectEnvelope(patch, 404, 'NOT_FOUND');

    const del = await authed(stranger.cookie)(`/api/v1/cues/${cueId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(del, 404, 'NOT_FOUND');
  });

  it('blocks a view-only user from mutating the cue: PATCH -> 403, DELETE -> 403', async () => {
    const patch = await authed(viewer.cookie)(`/api/v1/cues/${cueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'Nope' }),
    });
    await expectEnvelope(patch, 403, 'FORBIDDEN');

    const del = await authed(viewer.cookie)(`/api/v1/cues/${cueId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(del, 403, 'FORBIDDEN');
  });

  it('hides the placed move from a no-access user: PATCH -> 404, DELETE -> 404', async () => {
    const patch = await authed(stranger.cookie)(`/api/v1/class-track-moves/${moveId}`, {
      method: 'PATCH',
      body: JSON.stringify({ nameOverride: 'Hijacked' }),
    });
    await expectEnvelope(patch, 404, 'NOT_FOUND');

    const del = await authed(stranger.cookie)(`/api/v1/class-track-moves/${moveId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(del, 404, 'NOT_FOUND');
  });

  it('blocks a view-only user from mutating the placed move: PATCH -> 403, DELETE -> 403', async () => {
    const patch = await authed(viewer.cookie)(`/api/v1/class-track-moves/${moveId}`, {
      method: 'PATCH',
      body: JSON.stringify({ nameOverride: 'Nope' }),
    });
    await expectEnvelope(patch, 403, 'FORBIDDEN');

    const del = await authed(viewer.cookie)(`/api/v1/class-track-moves/${moveId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(del, 403, 'FORBIDDEN');
  });
});
