/**
 * DELETE /classes/:id removes the class from the owner's library. Live is that
 * same list filtered to classes with tracks, so a deleted class must leave the
 * list response, including one that already has a track.
 */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { Class, ClassListItem } from '@ritmofit/shared';
import { authed, signUpUser, verifyUserEmail } from './helpers.js';

describe('DELETE /classes/:id', () => {
  it('drops the class from the owner library and hides it afterwards', async () => {
    const owner = await signUpUser();
    const api = authed(owner.cookie);

    const keepRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Evening Ride', template: 'cycle' }),
    });
    expect(keepRes.status).toBe(201);
    const keep = (await keepRes.json()) as Class;

    const dropRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Morning Climb', template: 'cycle' }),
    });
    expect(dropRes.status).toBe(201);
    const drop = (await dropRes.json()) as Class;

    const trackRes = await api('/api/v1/tracks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Climb', artist: 'Artist', durationMs: 180_000 }),
    });
    expect(trackRes.status).toBe(201);
    const trackId = ((await trackRes.json()) as { id: string }).id;

    const placed = await api(`/api/v1/classes/${drop.id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId }),
    });
    expect(placed.status).toBe(201);

    const before = (await (await api('/api/v1/classes')).json()) as ClassListItem[];
    expect(before.map((row) => row.title)).toEqual(
      expect.arrayContaining(['Morning Climb', 'Evening Ride']),
    );
    expect(before.find((row) => row.id === drop.id)?.trackCount).toBeGreaterThan(0);

    const deleted = await api(`/api/v1/classes/${drop.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);

    const after = (await (await api('/api/v1/classes')).json()) as ClassListItem[];
    expect(after.map((row) => row.id)).not.toContain(drop.id);
    expect(after.map((row) => row.id)).toContain(keep.id);

    const missing = await api(`/api/v1/classes/${drop.id}`);
    expect(missing.status).toBe(404);
    const tracks = await api(`/api/v1/classes/${drop.id}/tracks`);
    expect(tracks.status).toBe(404);
  });

  it("removes that class's shares and leaves another class's share in place", async () => {
    // shares.resource_id has no foreign key. The delete route has to remove the
    // rows itself; a cascade on classes does not.
    const owner = await signUpUser();
    const viewer = await signUpUser();
    await verifyUserEmail(viewer.userId);
    const api = authed(owner.cookie);

    const keepRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Shared keeper', template: 'cycle' }),
    });
    expect(keepRes.status).toBe(201);
    const keep = (await keepRes.json()) as Class;

    const dropRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Shared drop', template: 'cycle' }),
    });
    expect(dropRes.status).toBe(201);
    const drop = (await dropRes.json()) as Class;

    const share = async (classId: string) => {
      const res = await api('/api/v1/shares', {
        method: 'POST',
        body: JSON.stringify({
          resourceId: classId,
          targetUserId: viewer.userId,
          permission: 'view',
        }),
      });
      expect(res.status).toBe(201);
      return ((await res.json()) as { id: string }).id;
    };
    await share(drop.id);
    const keptShareId = await share(keep.id);

    const before = (await (
      await authed(viewer.cookie)('/api/v1/classes')
    ).json()) as ClassListItem[];
    expect(before.map((row) => row.id)).toEqual(expect.arrayContaining([drop.id, keep.id]));

    const deleted = await api(`/api/v1/classes/${drop.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);

    const orphan = await env.DB.prepare(
      "select id from shares where resource_type = 'class' and resource_id = ?",
    )
      .bind(drop.id)
      .first<{ id: string }>();
    expect(orphan).toBeNull();

    const keptShare = await env.DB.prepare(
      "select id from shares where resource_type = 'class' and resource_id = ?",
    )
      .bind(keep.id)
      .first<{ id: string }>();
    expect(keptShare?.id).toBe(keptShareId);

    const after = (await (
      await authed(viewer.cookie)('/api/v1/classes')
    ).json()) as ClassListItem[];
    expect(after.map((row) => row.id)).not.toContain(drop.id);
    expect(after.map((row) => row.id)).toContain(keep.id);
  });
});
