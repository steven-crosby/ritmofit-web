import { describe, it, expect } from 'vitest';
import { MAX_DURATION_MS, offsetMsSchema } from '@ritmofit/shared';
import { authed, signUpUser } from './helpers.js';

describe('offsetMsSchema bounds (unit)', () => {
  it('accepts valid offsets', () => {
    expect(offsetMsSchema.parse(0)).toBe(0);
    expect(offsetMsSchema.parse(5000)).toBe(5000);
    expect(offsetMsSchema.parse(MAX_DURATION_MS)).toBe(MAX_DURATION_MS);
  });

  it('rejects negative offsets', () => {
    expect(() => offsetMsSchema.parse(-1)).toThrowError();
  });

  it('rejects offsets exceeding MAX_DURATION_MS', () => {
    expect(() => offsetMsSchema.parse(MAX_DURATION_MS + 1)).toThrowError();
  });
});

async function createClassWithTrack(
  cookie: string,
): Promise<{ classId: string; classTrackId: string }> {
  const api = authed(cookie);
  const classRes = await api('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Offset test' }),
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
  return { classId, classTrackId };
}

describe('offsetMsSchema integration limits', () => {
  it('rejects 422 for a section startOffsetMs exceeding MAX_DURATION_MS', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classId } = await createClassWithTrack(user.cookie);

    const res = await api(`/api/v1/classes/${classId}/sections`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'peak',
        startOffsetMs: MAX_DURATION_MS + 1,
      }),
    });
    expect(res.status).toBe(422);
  });

  it('rejects 422 for a cue anchorMs exceeding MAX_DURATION_MS', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classTrackId } = await createClassWithTrack(user.cookie);

    const res = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: MAX_DURATION_MS + 1,
        text: 'Jump',
      }),
    });
    expect(res.status).toBe(422);
  });

  it('rejects 422 for a placed-move anchorMs exceeding MAX_DURATION_MS', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classTrackId } = await createClassWithTrack(user.cookie);

    // Using a fake moveId, Zod shouldn't care about the UUID validity before failing on anchorMs
    const res = await api(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: MAX_DURATION_MS + 1,
        nameOverride: 'Custom Move',
      }),
    });
    expect(res.status).toBe(422);
  });
});
