import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { RunPayload } from '@ritmofit/shared';
import { authed, signUpUser } from './helpers.js';

describe('custom-move class recency (integration)', () => {
  it('touches each affected class once only when a referenced custom-move name changes', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const createClassTrack = async (
      title: string,
    ): Promise<{ classId: string; classTrackId: string }> => {
      const classResponse = await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      expect(classResponse.status).toBe(201);
      const classId = ((await classResponse.json()) as { id: string }).id;

      const trackResponse = await api(`/api/v1/classes/${classId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          track: { title: `${title} track`, artist: 'Instructor', durationMs: 180_000 },
        }),
      });
      expect(trackResponse.status).toBe(201);
      const classTrackId = ((await trackResponse.json()) as { id: string }).id;
      return { classId, classTrackId };
    };

    const first = await createClassTrack('First affected class');
    const second = await createClassTrack('Second affected class');
    const unrelated = await createClassTrack('Unrelated class');

    const moveResponse = await api('/api/v1/user-moves', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tap back', template: 'cycle' }),
    });
    expect(moveResponse.status).toBe(201);
    const userMoveId = ((await moveResponse.json()) as { id: string }).id;

    const place = async (classTrackId: string, anchorMs: number) => {
      const response = await api(`/api/v1/class-tracks/${classTrackId}/moves`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs, userMoveId }),
      });
      expect(response.status).toBe(201);
    };
    await place(first.classTrackId, 10_000);
    await place(first.classTrackId, 20_000);
    await place(second.classTrackId, 30_000);

    const boundary = Date.now() + 60_000;
    await env.DB.batch([
      env.DB.prepare('update classes set updated_at = ? where id = ?').bind(
        boundary,
        first.classId,
      ),
      env.DB.prepare('update classes set updated_at = ? where id = ?').bind(
        boundary + 10,
        second.classId,
      ),
      env.DB.prepare('update classes set updated_at = ? where id = ?').bind(
        boundary + 20,
        unrelated.classId,
      ),
    ]);

    const renameResponse = await api(`/api/v1/user-moves/${userMoveId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Tap back plus' }),
    });
    expect(renameResponse.status).toBe(200);

    const updatedAt = async (classId: string): Promise<number | undefined> =>
      (
        await env.DB.prepare('select updated_at from classes where id = ?')
          .bind(classId)
          .first<{ updated_at: number }>()
      )?.updated_at;
    expect(await updatedAt(first.classId)).toBe(boundary + 1);
    expect(await updatedAt(second.classId)).toBe(boundary + 11);
    expect(await updatedAt(unrelated.classId)).toBe(boundary + 20);

    for (const classId of [first.classId, second.classId]) {
      const payloadResponse = await api(`/api/v1/classes/${classId}/run-payload`);
      expect(payloadResponse.status).toBe(200);
      const payload = (await payloadResponse.json()) as RunPayload;
      expect(payload.tracks.flatMap((track) => track.moves).map((move) => move.name)).toEqual(
        classId === first.classId ? ['Tap back plus', 'Tap back plus'] : ['Tap back plus'],
      );
    }

    const stableBoundary = boundary + 100;
    await env.DB.batch([
      env.DB.prepare('update classes set updated_at = ? where id = ?').bind(
        stableBoundary,
        first.classId,
      ),
      env.DB.prepare('update classes set updated_at = ? where id = ?').bind(
        stableBoundary + 10,
        second.classId,
      ),
    ]);

    const sameNameResponse = await api(`/api/v1/user-moves/${userMoveId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Tap back plus' }),
    });
    expect(sameNameResponse.status).toBe(200);
    const metadataResponse = await api(`/api/v1/user-moves/${userMoveId}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'A coaching-language note' }),
    });
    expect(metadataResponse.status).toBe(200);
    expect(await updatedAt(first.classId)).toBe(stableBoundary);
    expect(await updatedAt(second.classId)).toBe(stableBoundary + 10);
  });
});
