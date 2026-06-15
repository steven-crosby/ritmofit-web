/**
 * Choreography write-path authorization through the mounted Worker: cue and
 * placed-move CRUD must honor the class-track access level (view can read,
 * edit can write) and hide existence from users with no access. These routes
 * (`requireClassTrackAccess` / `requireCueAccess`) sit outside the prior
 * authz/run-payload/pagination integration suites.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

interface ClassTrack {
  id: string;
}

describe('choreography write access (integration)', () => {
  let owner: TestUser;
  let editor: TestUser;
  let viewer: TestUser;
  let stranger: TestUser;
  let classId: string;
  let classTrackId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    editor = await signUpUser();
    viewer = await signUpUser();
    stranger = await signUpUser();
    // Share targets must be verified to enter the trust graph.
    await verifyUserEmail(editor.userId);
    await verifyUserEmail(viewer.userId);

    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Choreographed class' }),
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
    ).json()) as ClassTrack[];
    classTrackId = tracks[0]!.id;

    for (const [user, permission] of [
      [editor, 'edit'],
      [viewer, 'view'],
    ] as const) {
      const share = await authed(owner.cookie)('/api/v1/shares', {
        method: 'POST',
        body: JSON.stringify({ resourceId: classId, targetUserId: user.userId, permission }),
      });
      expect(share.status).toBe(201);
    }
  });

  it('lets the owner create, read, patch, and delete a cue and place a move', async () => {
    const as = authed(owner.cookie);

    const created = await as(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 60000, text: 'Climb' }),
    });
    expect(created.status).toBe(201);
    const cue = (await created.json()) as { id: string; text: string };
    expect(cue.text).toBe('Climb');

    const listed = await as(`/api/v1/class-tracks/${classTrackId}/cues`);
    expect(listed.status).toBe(200);
    expect((await listed.json()) as unknown[]).toHaveLength(1);

    const patched = await as(`/api/v1/cues/${cue.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'Sprint' }),
    });
    expect(patched.status).toBe(200);
    expect((await patched.json()).text).toBe('Sprint');

    // A placed move needs no library reference when it carries a nameOverride.
    const move = await as(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 90000, nameOverride: 'Tap back' }),
    });
    expect(move.status).toBe(201);

    const removed = await as(`/api/v1/cues/${cue.id}`, { method: 'DELETE' });
    expect(removed.status).toBe(204);
    expect(
      (await (await as(`/api/v1/class-tracks/${classTrackId}/cues`)).json()) as unknown[],
    ).toHaveLength(0);
  });

  it('lets a view-shared user read cues but rejects writes (403)', async () => {
    const as = authed(viewer.cookie);

    const seed = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 30000, text: 'Visible to viewer' }),
    });
    expect(seed.status).toBe(201);

    const listed = await as(`/api/v1/class-tracks/${classTrackId}/cues`);
    expect(listed.status).toBe(200);
    expect(((await listed.json()) as unknown[]).length).toBeGreaterThanOrEqual(1);

    const blocked = await as(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 45000, text: 'Should not write' }),
    });
    expect(blocked.status).toBe(403);

    const blockedMove = await as(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 45000, nameOverride: 'Nope' }),
    });
    expect(blockedMove.status).toBe(403);
  });

  it('lets an edit-shared user create a cue (201)', async () => {
    const created = await authed(editor.cookie)(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 120000, text: 'Editor cue' }),
    });
    expect(created.status).toBe(201);
  });

  it('hides cue existence from a user with no access (404)', async () => {
    const listed = await authed(stranger.cookie)(`/api/v1/class-tracks/${classTrackId}/cues`);
    expect(listed.status).toBe(404);

    const write = await authed(stranger.cookie)(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 60000, text: 'Intruder' }),
    });
    expect(write.status).toBe(404);
  });
});
