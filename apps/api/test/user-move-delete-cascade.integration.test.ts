import { describe, it, expect } from 'vitest';
import { authed, signUpUser } from './helpers.js';
import { createDb } from '../src/lib/db.js';
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { classTrackMoves } from '../src/db/schema.js';

describe('user_move delete cascade (integration)', () => {
  it('cascades ON DELETE SET NULL to a placed-move and survives via snapshot nameOverride', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    // 1. Create a class and track
    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Cascade test' }),
    });
    const classId = ((await classRes.json()) as { id: string }).id;

    const trackRes = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Song', artist: 'Artist', durationMs: 180_000 },
        intensity: 'mod',
      }),
    });
    const classTrackId = ((await trackRes.json()) as { id: string }).id;

    // 2. Create a user_move
    const userMoveRes = await api('/api/v1/user-moves', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Signature Move', template: 'cycle' }),
    });
    expect(userMoveRes.status).toBe(201);
    const userMoveId = ((await userMoveRes.json()) as { id: string }).id;

    // 3. Place the user_move (with no explicit nameOverride)
    const placeRes = await api(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: 5000,
        userMoveId: userMoveId,
      }),
    });
    expect(placeRes.status).toBe(201);
    const placementId = ((await placeRes.json()) as { id: string }).id;

    // When the user_move is deleted, the DELETE route snapshots the nameOverride immediately before issuing the delete.
    const db = createDb(env as Parameters<typeof createDb>[0]);
    let placement = await db
      .select()
      .from(classTrackMoves)
      .where(eq(classTrackMoves.id, placementId))
      .get();
    expect(placement?.userMoveId).toBe(userMoveId);
    expect(placement?.nameOverride).toBeNull();

    // 4. Delete the user_move
    const deleteRes = await api(`/api/v1/user-moves/${userMoveId}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(204);

    // 5. Assert the placement survives with a name and userMoveId is nullified by DB cascade
    placement = await db
      .select()
      .from(classTrackMoves)
      .where(eq(classTrackMoves.id, placementId))
      .get();
    expect(placement).not.toBeUndefined();
    expect(placement?.userMoveId).toBeNull();
    expect(placement?.nameOverride).toBe('My Signature Move');
  });
});
