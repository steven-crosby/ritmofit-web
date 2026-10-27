/**
 * DELETE /classes/:id removes the class from the owner's library. Live is that
 * same list filtered to classes with tracks, so a deleted class must leave the
 * list response, including one that already has a track.
 */
import { describe, expect, it } from 'vitest';
import type { Class, ClassListItem } from '@ritmofit/shared';
import { authed, signUpUser } from './helpers.js';

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
});
