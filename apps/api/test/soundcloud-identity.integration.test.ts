import { env } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { trackProviderIds, tracks } from '../src/db/schema.js';
import { createDb } from '../src/lib/db.js';
import { importTrackFromCandidate } from '../src/lib/track-import.js';
import { makeMatchKey } from '../src/lib/same-song.js';
import { signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

describe('SoundCloud provider identity migration (integration)', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await signUpUser();
    await verifyUserEmail(user.userId);
  });

  it('resolves a canonical URN to a legacy numeric ref without rewriting or duplicating rows', async () => {
    const db = createDb(env);
    const trackId = crypto.randomUUID();
    const providerId = crypto.randomUUID();
    const now = Date.now();

    await db.batch([
      db.insert(tracks).values({
        id: trackId,
        ownerUserId: user.userId,
        title: 'Baianá',
        artist: 'Bakermat',
        albumArtUrl: null,
        durationMs: 180_000,
        displayBpm: null,
        isrc: null,
        matchKey: makeMatchKey('Baianá', 'Bakermat'),
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(trackProviderIds).values({
        id: providerId,
        trackId,
        ownerUserId: user.userId,
        provider: 'soundcloud',
        providerTrackId: '12345',
        providerUri: 'https://soundcloud.com/bakermat/baiana',
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    const result = await importTrackFromCandidate(db, user.userId, {
      provider: 'soundcloud',
      providerTrackId: 'soundcloud:tracks:12345',
      providerUri: 'https://soundcloud.com/bakermat/baiana',
      title: 'Baianá',
      artist: 'Bakermat',
      albumArtUrl: null,
      durationMs: 180_000,
    });

    expect(result.created).toBe(false);
    expect(result.track.id).toBe(trackId);
    expect(result.track.providerIds).toHaveLength(1);
    expect(result.track.providerIds[0]).toMatchObject({
      id: providerId,
      providerTrackId: '12345',
    });

    const ownerTracks = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.ownerUserId, user.userId))
      .all();
    const soundCloudRefs = await db
      .select({ providerTrackId: trackProviderIds.providerTrackId })
      .from(trackProviderIds)
      .where(
        and(
          eq(trackProviderIds.ownerUserId, user.userId),
          eq(trackProviderIds.provider, 'soundcloud'),
        ),
      )
      .all();

    expect(ownerTracks).toEqual([{ id: trackId }]);
    expect(soundCloudRefs).toEqual([{ providerTrackId: '12345' }]);
  });
});
