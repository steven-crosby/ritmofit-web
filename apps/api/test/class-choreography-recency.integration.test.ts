import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { ClassListItem } from '@ritmofit/shared';
import { authed, signUpUser } from './helpers.js';

describe('class choreography recency (integration)', () => {
  it('moves the parent class to the recent boundary after every choreography mutation', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const createClass = async (title: string): Promise<string> => {
      const response = await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      expect(response.status).toBe(201);
      return ((await response.json()) as { id: string }).id;
    };

    const olderId = await createClass('Older choreography');
    const newerId = await createClass('Newer class');
    const trackResponse = await api(`/api/v1/classes/${olderId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Recency track', artist: 'Instructor', durationMs: 180_000 },
      }),
    });
    expect(trackResponse.status).toBe(201);
    const classTrackId = ((await trackResponse.json()) as { id: string }).id;

    const resetBoundary = async () => {
      await env.DB.batch([
        env.DB.prepare('update classes set updated_at = 100 where id = ?').bind(olderId),
        env.DB.prepare('update classes set updated_at = 200 where id = ?').bind(newerId),
      ]);
    };
    const expectTouched = async () => {
      const response = await api('/api/v1/classes?limit=2');
      expect(response.status).toBe(200);
      const rows = (await response.json()) as ClassListItem[];
      expect(rows.map((row) => row.id)).toEqual([olderId, newerId]);
      expect(rows[0]!.updatedAt).toBeGreaterThan(200);
    };
    const mutate = async (path: string, init: RequestInit, expectedStatus: number) => {
      await resetBoundary();
      const response = await api(path, init);
      expect(response.status).toBe(expectedStatus);
      await expectTouched();
      return response;
    };

    const cue = (await (
      await mutate(
        `/api/v1/class-tracks/${classTrackId}/cues`,
        { method: 'POST', body: JSON.stringify({ anchorMs: 30_000, text: 'Climb' }) },
        201,
      )
    ).json()) as { id: string };
    await mutate(
      `/api/v1/cues/${cue.id}`,
      { method: 'PATCH', body: JSON.stringify({ text: 'Sprint' }) },
      200,
    );
    await mutate(`/api/v1/cues/${cue.id}`, { method: 'DELETE' }, 204);

    const move = (await (
      await mutate(
        `/api/v1/class-tracks/${classTrackId}/moves`,
        { method: 'POST', body: JSON.stringify({ anchorMs: 60_000, nameOverride: 'Tap back' }) },
        201,
      )
    ).json()) as { id: string };
    await mutate(
      `/api/v1/class-track-moves/${move.id}`,
      { method: 'PATCH', body: JSON.stringify({ intensity: 'hard' }) },
      200,
    );
    await mutate(`/api/v1/class-track-moves/${move.id}`, { method: 'DELETE' }, 204);

    const section = (await (
      await mutate(
        `/api/v1/classes/${olderId}/sections`,
        { method: 'POST', body: JSON.stringify({ type: 'warm_up', startOffsetMs: 0 }) },
        201,
      )
    ).json()) as { id: string };
    await mutate(
      `/api/v1/sections/${section.id}`,
      { method: 'PATCH', body: JSON.stringify({ type: 'climb' }) },
      200,
    );
    await mutate(`/api/v1/sections/${section.id}`, { method: 'DELETE' }, 204);

    // Rejected choreography does not change class material, so it must not advance recency.
    await resetBoundary();
    const rejected = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 180_000, text: 'Unreachable endpoint' }),
    });
    expect(rejected.status).toBe(422);
    const unchanged = await env.DB.prepare('select updated_at from classes where id = ?')
      .bind(olderId)
      .first<{ updated_at: number }>();
    expect(unchanged?.updated_at).toBe(100);
    const afterRejected = (await (await api('/api/v1/classes?limit=2')).json()) as ClassListItem[];
    expect(afterRejected.map((row) => row.id)).toEqual([newerId, olderId]);
  });
});
