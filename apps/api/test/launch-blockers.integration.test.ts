import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { createD1PurgeStore } from '../src/lib/music/purge.js';
import { providerPurgeQueue, trackProviderIds, tracks } from '../src/db/schema.js';
import { authed, call, signUpUser, verifyUserEmail } from './helpers.js';

describe('launch blocker regressions (integration)', () => {
  it('returns OAuth callback failures to the canonical app origin', async () => {
    const res = await call('/api/v1/providers/soundcloud/callback');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://test.ritmofit.studio/account?error=state_missing',
    );
  });

  it('rejects an unverified share target, then permits the verified user', async () => {
    const owner = await signUpUser();
    const target = await signUpUser();
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Verified share target' }),
    });
    const classId = ((await created.json()) as { id: string }).id;

    const rejectedById = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: classId,
        targetUserId: target.userId,
        permission: 'view',
      }),
    });
    expect(rejectedById.status).toBe(422);
    expect((await rejectedById.json()).error.code).toBe('EMAIL_NOT_VERIFIED');

    const rejectedByEmail = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: classId,
        targetEmail: target.email,
        permission: 'view',
      }),
    });
    expect(rejectedByEmail.status).toBe(422);
    expect((await rejectedByEmail.json()).error.code).toBe('EMAIL_NOT_VERIFIED');

    await verifyUserEmail(target.userId);
    const accepted = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: classId,
        targetEmail: target.email,
        permission: 'view',
      }),
    });
    expect(accepted.status).toBe(201);
  });

  it('rejects an unverified team member, then permits the verified user', async () => {
    const owner = await signUpUser();
    const target = await signUpUser();
    const created = await authed(owner.cookie)('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Verified team' }),
    });
    const teamId = ((await created.json()) as { id: string }).id;

    const rejectedById = await authed(owner.cookie)(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId: target.userId }),
    });
    expect(rejectedById.status).toBe(422);
    expect((await rejectedById.json()).error.code).toBe('EMAIL_NOT_VERIFIED');

    const rejectedByEmail = await authed(owner.cookie)(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: target.email }),
    });
    expect(rejectedByEmail.status).toBe(422);
    expect((await rejectedByEmail.json()).error.code).toBe('EMAIL_NOT_VERIFIED');

    await verifyUserEmail(target.userId);
    const accepted = await authed(owner.cookie)(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: target.email }),
    });
    expect(accepted.status).toBe(201);
  });

  it('clears artwork even when a disconnected track keeps another provider ref', async () => {
    const owner = await signUpUser();
    const db = createDb(env);
    const now = Date.now();
    const trackId = crypto.randomUUID();
    await db.batch([
      db.insert(tracks).values({
        id: trackId,
        ownerUserId: owner.userId,
        title: 'Shared provider song',
        artist: 'Artist',
        albumArtUrl: 'https://example.com/provider-art.jpg',
        durationMs: 180000,
        displayBpm: null,
        isrc: null,
        matchKey: 'shared provider song::artist',
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(trackProviderIds).values({
        id: crypto.randomUUID(),
        trackId,
        ownerUserId: owner.userId,
        provider: 'soundcloud',
        providerTrackId: 'soundcloud-1',
        providerUri: 'https://soundcloud.com/example/song',
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(trackProviderIds).values({
        id: crypto.randomUUID(),
        trackId,
        ownerUserId: owner.userId,
        provider: 'spotify',
        providerTrackId: 'spotify-1',
        providerUri: 'spotify:track:spotify-1',
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    const counts = await createD1PurgeStore(db).purgeProviderMetadata(owner.userId, 'soundcloud');
    expect(counts).toEqual({ tracksCleared: 1, refsDeleted: 1 });

    const track = await db.select().from(tracks).where(eq(tracks.id, trackId)).get();
    const refs = await db
      .select()
      .from(trackProviderIds)
      .where(eq(trackProviderIds.trackId, trackId))
      .all();
    expect(track?.albumArtUrl).toBeNull();
    expect(refs.map((ref) => ref.provider)).toEqual(['spotify']);
  });

  it('retains exhausted purge duties while excluding them from active work', async () => {
    const owner = await signUpUser();
    const db = createDb(env);
    const store = createD1PurgeStore(db);
    const id = crypto.randomUUID();
    await db.insert(providerPurgeQueue).values({
      id,
      userId: owner.userId,
      provider: 'soundcloud',
      requestedAt: Date.now(),
      attempts: 4,
      failedAt: null,
    });

    await store.markFailed(id);

    expect(await store.listQueue(100)).toEqual([]);
    const retained = await db
      .select()
      .from(providerPurgeQueue)
      .where(eq(providerPurgeQueue.id, id))
      .get();
    expect(retained?.attempts).toBe(5);
    expect(retained?.failedAt).toEqual(expect.any(Number));
  });
});
