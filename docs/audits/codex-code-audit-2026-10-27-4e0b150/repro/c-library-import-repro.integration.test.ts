// Lane C audit repro (2026-10-27) — library import races and alias identity. Not product code.
import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { TrackSearchResult } from '@ritmofit/shared';
import { createDb } from '../src/lib/db.js';
import { attachProviderId, importTrackFromCandidate } from '../src/lib/track-import.js';
import { signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

const candidate = (over: Partial<TrackSearchResult>): TrackSearchResult => ({
  provider: 'spotify',
  providerTrackId: 'sp-1',
  providerUri: null,
  title: 'Song',
  artist: 'Artist',
  albumArtUrl: null,
  durationMs: 180_000,
  ...over,
});

describe('Lane C library import repro', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await signUpUser();
    await verifyUserEmail(user.userId);
  });

  it('C-26 concurrent imports of one new provider track: one wins, one 409s', async () => {
    const db = createDb(env);
    const c = candidate({ providerTrackId: 'sp-race', title: 'Race Song' });
    const settled = await Promise.allSettled([
      importTrackFromCandidate(db, user.userId, c),
      importTrackFromCandidate(db, user.userId, c),
    ]);
    const statuses = settled.map((s) =>
      s.status === 'fulfilled' ? 'ok' : `${(s.reason as { status?: number }).status}`,
    );
    expect(statuses.sort()).toEqual(['409', 'ok']);
    // The same call made sequentially is idempotent (exact-ref branch).
    const again = await importTrackFromCandidate(db, user.userId, c);
    expect(again.created).toBe(false);
  });

  it('C-23 resolve-style attach stores a SoundCloud URN already owned as a legacy numeric id', async () => {
    const db = createDb(env);
    const legacy = await importTrackFromCandidate(
      db,
      user.userId,
      candidate({ provider: 'soundcloud', providerTrackId: '4242', title: 'Alias Song A' }),
    );
    const other = await importTrackFromCandidate(
      db,
      user.userId,
      candidate({ providerTrackId: 'sp-alias', title: 'Alias Song B' }),
    );
    // importTrackFromCandidate would have found the legacy row via aliases; the
    // resolve-provider route calls attachProviderId directly.
    const attached = await attachProviderId(
      db,
      user.userId,
      other.track.id,
      candidate({ provider: 'soundcloud', providerTrackId: 'soundcloud:tracks:4242' }),
    );
    expect(attached).not.toBeNull();
    expect(legacy.track.id).not.toBe(other.track.id);
    const viaAlias = await importTrackFromCandidate(
      db,
      user.userId,
      candidate({ provider: 'soundcloud', providerTrackId: 'soundcloud:tracks:4242' }),
    );
    // Exact-ref lookup now prefers the literal URN row: a different track than the legacy one.
    expect(viaAlias.track.id).toBe(other.track.id);
  });
});
