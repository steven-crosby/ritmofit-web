/**
 * "Songs by move" reverse search through the mounted Worker. `GET /moves/:id/songs`
 * and `GET /user-moves/:id/songs` return the caller's songs choreographed with a
 * move, grouped by track and scoped to the caller's OWN classes. The owner-scope
 * is the authorization gate - a global move is shared across users, so the test
 * proves one user never sees another's placements, and that custom-move songs
 * are 404-hidden from a non-owner.
 */
import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, signUpUser, type TestUser } from './helpers.js';

/** Seed a global library move directly (the test D1 isn't seeded with the library). */
async function seedGlobalMove(name: string): Promise<{ id: string; name: string }> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO moves (id, name, description, template, created_at, updated_at) VALUES (?, ?, NULL, NULL, ?, ?)',
  )
    .bind(id, name, now, now)
    .run();
  return { id, name };
}

interface ClassTrack {
  id: string;
  trackId: string;
}
interface Move {
  id: string;
  name: string;
}
interface SongByMove {
  track: { id: string; title: string };
  placements: {
    classId: string;
    classTitle: string;
    classTrackId: string;
    anchorMs: number;
    intensity: string | null;
  }[];
}

async function createClass(user: TestUser, title: string): Promise<string> {
  const res = await authed(user.cookie)('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function listTracks(user: TestUser, classId: string): Promise<ClassTrack[]> {
  return (await (
    await authed(user.cookie)(`/api/v1/classes/${classId}/tracks`)
  ).json()) as ClassTrack[];
}

async function placeMove(
  user: TestUser,
  classTrackId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await authed(user.cookie)(`/api/v1/class-tracks/${classTrackId}/moves`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(201);
}

describe('songs by move (integration)', () => {
  let owner: TestUser;
  let other: TestUser;
  let globalMove: Move; // placed by the owner
  let unusedMove: Move; // never placed
  let ownerUserMoveId: string;
  let trackAId: string;
  let class1: string;
  let class2: string;

  beforeAll(async () => {
    owner = await signUpUser();
    other = await signUpUser();

    // Two global library moves: one we'll place, one we leave untouched.
    globalMove = await seedGlobalMove('Climb');
    unusedMove = await seedGlobalMove('Sprint');

    // class1 with a fresh track A; class2 reuses the SAME track A by id so the two
    // classes' placements group under one song.
    class1 = await createClass(owner, 'Monday Power');
    const addA = await authed(owner.cookie)(`/api/v1/classes/${class1}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Shared Anthem', artist: 'DJ Test', durationMs: 180000 },
        intensity: 'mod',
      }),
    });
    expect(addA.status).toBe(201);
    const class1Tracks = await listTracks(owner, class1);
    const classTrackA = class1Tracks[0]!;
    trackAId = classTrackA.trackId;

    class2 = await createClass(owner, 'Friday Ride');
    const addReuse = await authed(owner.cookie)(`/api/v1/classes/${class2}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId: trackAId, intensity: 'hard' }),
    });
    expect(addReuse.status).toBe(201);
    const class2Tracks = await listTracks(owner, class2);
    const classTrackAInClass2 = class2Tracks[0]!;

    // Place the global move three times across both classes (same track A).
    await placeMove(owner, classTrackA.id, {
      anchorMs: 1000,
      moveId: globalMove.id,
      intensity: 'hard',
    });
    await placeMove(owner, classTrackA.id, { anchorMs: 2000, moveId: globalMove.id });
    await placeMove(owner, classTrackAInClass2.id, { anchorMs: 500, moveId: globalMove.id });

    // A custom move owned by the owner, placed once.
    const um = await authed(owner.cookie)('/api/v1/user-moves', {
      method: 'POST',
      body: JSON.stringify({ name: 'Signature Tap' }),
    });
    expect(um.status).toBe(201);
    ownerUserMoveId = ((await um.json()) as { id: string }).id;
    await placeMove(owner, classTrackA.id, { anchorMs: 3000, userMoveId: ownerUserMoveId });

    // `other` places the SAME global move on their own class/track - must never
    // surface in the owner's results (owner-scope is the authz gate).
    const otherClass = await createClass(other, 'Stranger Class');
    const addOther = await authed(other.cookie)(`/api/v1/classes/${otherClass}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Not Yours', artist: 'Someone Else', durationMs: 120000 },
        intensity: 'easy',
      }),
    });
    expect(addOther.status).toBe(201);
    const otherTracks = await listTracks(other, otherClass);
    await placeMove(other, otherTracks[0]!.id, { anchorMs: 1000, moveId: globalMove.id });
  });

  it('groups owner placements of a global move by track, across classes', async () => {
    const res = await authed(owner.cookie)(`/api/v1/moves/${globalMove.id}/songs`);
    expect(res.status).toBe(200);
    const songs = (await res.json()) as SongByMove[];

    // Exactly one song (track A), even though placed in two classes / three times.
    expect(songs).toHaveLength(1);
    const song = songs[0]!;
    expect(song.track.id).toBe(trackAId);
    expect(song.track.title).toBe('Shared Anthem');
    expect(song.placements).toHaveLength(3);

    // Both classes are represented, and the intensity-bearing placement survives.
    const titles = song.placements.map((p) => p.classTitle).sort();
    expect(titles).toEqual(['Friday Ride', 'Monday Power', 'Monday Power']);
    expect(song.placements.some((p) => p.intensity === 'hard')).toBe(true);
    // No leakage of the other user's track.
    expect(songs.some((s) => s.track.title === 'Not Yours')).toBe(false);
  });

  it('scopes results to the caller - the other user sees only their own placement', async () => {
    const res = await authed(other.cookie)(`/api/v1/moves/${globalMove.id}/songs`);
    expect(res.status).toBe(200);
    const songs = (await res.json()) as SongByMove[];
    expect(songs).toHaveLength(1);
    expect(songs[0]!.track.title).toBe('Not Yours');
  });

  it('returns an empty array for a global move the caller has never placed', async () => {
    const res = await authed(owner.cookie)(`/api/v1/moves/${unusedMove.id}/songs`);
    expect(res.status).toBe(200);
    expect((await res.json()) as SongByMove[]).toHaveLength(0);
  });

  it('returns owner songs for their custom move', async () => {
    const res = await authed(owner.cookie)(`/api/v1/user-moves/${ownerUserMoveId}/songs`);
    expect(res.status).toBe(200);
    const songs = (await res.json()) as SongByMove[];
    expect(songs).toHaveLength(1);
    expect(songs[0]!.placements).toHaveLength(1);
    expect(songs[0]!.placements[0]!.anchorMs).toBe(3000);
  });

  it('404s custom-move songs for a non-owner (hides existence)', async () => {
    const res = await authed(other.cookie)(`/api/v1/user-moves/${ownerUserMoveId}/songs`);
    expect(res.status).toBe(404);
  });
});
