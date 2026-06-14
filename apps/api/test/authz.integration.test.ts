/**
 * Route-level authorization tests — the layer the unit suite can't reach. These
 * assert that the *mounted* routes actually enforce `requireAccess` end-to-end
 * against a real D1: a non-owner is hidden (404) until shared, a viewer can read
 * but not edit (403), the public VIEW floor lets anyone copy from Explore, and the
 * `copy` batch produces a private owned clone. D1 has no row-level security, so a
 * dropped gate is a security bug — this is the regression net for it.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { call, signUpUser, verifyUserEmail, authed, type TestUser } from './helpers.js';

describe('class authorization (integration)', () => {
  let owner: TestUser;
  let other: TestUser;
  let classId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    other = await signUpUser();
    await verifyUserEmail(other.userId);
    const res = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Owner class' }),
    });
    expect(res.status).toBe(201);
    classId = ((await res.json()) as { id: string }).id;
  });

  it('owner can read their own class', async () => {
    const res = await authed(owner.cookie)(`/api/v1/classes/${classId}`);
    expect(res.status).toBe(200);
    expect((await res.json()).accessLevel).toBe('owner');
  });

  it('an unauthenticated request is rejected (401)', async () => {
    const res = await call(`/api/v1/classes/${classId}`);
    expect(res.status).toBe(401);
  });

  it('a non-owner with no share cannot see the class (404 hides existence)', async () => {
    const res = await authed(other.cookie)(`/api/v1/classes/${classId}`);
    expect(res.status).toBe(404);
  });

  it('a non-owner cannot edit the class (404 before any share)', async () => {
    const res = await authed(other.cookie)(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'hijacked' }),
    });
    expect(res.status).toBe(404);
  });

  it('a view-shared user can read but not edit (403)', async () => {
    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ resourceId: classId, targetEmail: other.email, permission: 'view' }),
    });
    expect(share.ok).toBe(true);

    const read = await authed(other.cookie)(`/api/v1/classes/${classId}`);
    expect(read.status).toBe(200);
    expect((await read.json()).accessLevel).toBe('view');

    const edit = await authed(other.cookie)(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'still no' }),
    });
    expect(edit.status).toBe(403);
  });
});

describe('run-payload + copy (integration)', () => {
  let owner: TestUser;
  let other: TestUser;
  let classId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    other = await signUpUser();
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Copyable class' }),
    });
    classId = ((await created.json()) as { id: string }).id;
    // Inline-create a track on the class (server assigns position/offset).
    const track = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Track A', artist: 'Artist', durationMs: 180000 },
        intensity: 'mod',
      }),
    });
    expect(track.status).toBe(201);
    // Two segment bands so the copy can be asserted to carry the energy plan.
    for (const section of [
      { type: 'warm_up', startOffsetMs: 0 },
      { type: 'sprint', startOffsetMs: 60000 },
    ]) {
      const res = await authed(owner.cookie)(`/api/v1/classes/${classId}/sections`, {
        method: 'POST',
        body: JSON.stringify(section),
      });
      expect(res.status).toBe(201);
    }
  });

  it('owner run-payload reflects the assembled total duration', async () => {
    const res = await authed(owner.cookie)(`/api/v1/classes/${classId}/run-payload`);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.class.totalDurationMs).toBe(180000);
    expect(payload.tracks).toHaveLength(1);
    expect(payload.tracks[0].startOffsetMs).toBe(0);
  });

  it('uses a class-specific duration override and rejects truncating choreography', async () => {
    const tracks = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`);
    const [classTrack] = (await tracks.json()) as Array<{ id: string }>;

    const updated = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrack!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 210000 }),
    });
    expect(updated.status).toBe(200);
    expect((await updated.json()).durationMsOverride).toBe(210000);

    const payloadRes = await authed(owner.cookie)(`/api/v1/classes/${classId}/run-payload`);
    const payload = await payloadRes.json();
    expect(payload.class.totalDurationMs).toBe(210000);
    expect(payload.tracks[0].track.durationMs).toBe(210000);

    const cue = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrack!.id}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 200000, text: 'Late cue' }),
    });
    expect(cue.status).toBe(201);

    const tooShort = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrack!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 180000 }),
    });
    expect(tooShort.status).toBe(422);
    expect((await tooShort.json()).error.message).toContain('200000ms');
  });

  it('a non-owner cannot fetch the run-payload (404)', async () => {
    const res = await authed(other.cookie)(`/api/v1/classes/${classId}/run-payload`);
    expect(res.status).toBe(404);
  });

  it('publishing exposes the class in Explore and lets another user save a private copy', async () => {
    const publish = await authed(owner.cookie)(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'public' }),
    });
    expect(publish.status).toBe(200);

    const explore = await authed(other.cookie)('/api/v1/explore');
    expect(explore.status).toBe(200);
    const feed = (await explore.json()) as Array<{ id: string }>;
    expect(feed.some((c) => c.id === classId)).toBe(true);

    const copy = await authed(other.cookie)(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(copy.status).toBe(201);
    const copied = await copy.json();
    expect(copied.id).not.toBe(classId);
    expect(copied.visibility).toBe('private');

    // The copy is owned by the copier and carries the cloned track.
    const tracks = await authed(other.cookie)(`/api/v1/classes/${copied.id}/tracks`);
    expect(tracks.status).toBe(200);
    expect((await tracks.json()) as unknown[]).toHaveLength(1);
  });

  it('saving a copy preserves the class sections (segment/energy plan)', async () => {
    // Isolated storage rolls each test back to the post-beforeAll state, so publish
    // here (don't rely on a prior test) to give `other` the public VIEW floor to copy.
    const publish = await authed(owner.cookie)(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'public' }),
    });
    expect(publish.status).toBe(200);

    const copy = await authed(other.cookie)(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(copy.status).toBe(201);
    const copied = (await copy.json()) as { id: string };

    const res = await authed(other.cookie)(`/api/v1/classes/${copied.id}/sections`);
    expect(res.status).toBe(200);
    const sections = (await res.json()) as Array<{ type: string; startOffsetMs: number }>;
    // Both bands carried over, in start order, with type + anchor intact.
    expect(sections.map((s) => [s.type, s.startOffsetMs])).toEqual([
      ['warm_up', 0],
      ['sprint', 60000],
    ]);
  });

  it('saving a copy preserves class-specific duration overrides', async () => {
    const sourceTracks = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`);
    const [sourceTrack] = (await sourceTracks.json()) as Array<{ id: string }>;
    const duration = await authed(owner.cookie)(`/api/v1/class-tracks/${sourceTrack!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 195000 }),
    });
    expect(duration.status).toBe(200);

    const publish = await authed(owner.cookie)(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'public' }),
    });
    expect(publish.status).toBe(200);

    const copy = await authed(other.cookie)(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const copied = (await copy.json()) as { id: string };
    const copiedTracks = await authed(other.cookie)(`/api/v1/classes/${copied.id}/tracks`);
    const [copiedTrack] = (await copiedTracks.json()) as Array<{
      durationMsOverride: number | null;
    }>;
    expect(copiedTrack!.durationMsOverride).toBe(195000);

    const payloadRes = await authed(other.cookie)(`/api/v1/classes/${copied.id}/run-payload`);
    const payload = await payloadRes.json();
    expect(payload.class.totalDurationMs).toBe(195000);
    expect(payload.tracks[0].track.durationMs).toBe(195000);
  });
});
