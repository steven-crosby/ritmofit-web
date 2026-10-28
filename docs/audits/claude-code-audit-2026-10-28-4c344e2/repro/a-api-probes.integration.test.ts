/**
 * Lane a-api probes (audit 4c344e2). Copy into apps/api/test/ and run:
 *   pnpm --filter @ritmofit/api exec vitest run --config vitest.integration.config.ts \
 *     test/a-api-probes.integration.test.ts
 * Local Miniflare D1 only. Each `it` logs what it observed and asserts the CURRENT
 * (defective) behaviour, so a green run means the defect still reproduces.
 */
import { describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { shareSchema, trackSchema } from '@ritmofit/shared';
import openapi from '../openapi/openapi.json';
import { authed, call, signUpUser, verifyUserEmail } from './helpers.js';

async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

describe('a-api probes', () => {
  it('A-01: malformed JSON body is answered 500 INTERNAL_ERROR, not a 4xx', async () => {
    const u = await signUpUser();
    const errSpy = vi.spyOn(console, 'error');
    const res = await call('/api/v1/classes', {
      method: 'POST',
      headers: { cookie: u.cookie, 'content-type': 'application/json' },
      body: '{"title": "unterminated',
    });
    const body = await json(res);
    console.log('[A-01] malformed JSON POST /classes ->', res.status, JSON.stringify(body));
    console.log('[A-01] console.error calls =', errSpy.mock.calls.length);
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });

  it('A-02: a server-side contract parse failure on GET run-payload is reported as a client 422 and never logged', async () => {
    const u = await signUpUser();
    const api = authed(u.cookie);
    const cls = await json(
      await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Huge duration', template: 'cycle' }),
      }),
    );
    // Library duration is unbounded (createTrackSchema: z.int().positive(), no max),
    // unlike every class-track field (MAX_DURATION_MS). The owner's own PATCH accepts it.
    const add = async (durationMs: number) =>
      json(
        await api(`/api/v1/classes/${cls.id}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ track: { title: 'Song', artist: 'Artist', durationMs } }),
        }),
      );
    const ct1 = await add(200_000);
    await add(200_000);
    const patch = await api(`/api/v1/tracks/${ct1.trackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMs: Number.MAX_SAFE_INTEGER }),
    });
    console.log('[A-02] PATCH /tracks durationMs=MAX_SAFE_INTEGER ->', patch.status);
    expect(patch.status).toBe(200);

    const errSpy = vi.spyOn(console, 'error');
    const rp = await api(`/api/v1/classes/${cls.id}/run-payload`);
    const body = await json(rp);
    console.log(
      '[A-02] GET run-payload ->',
      rp.status,
      body?.error?.code,
      body?.error?.message,
      'issue paths =',
      JSON.stringify(body?.error?.details?.map((d: { path: unknown }) => d.path)),
    );
    console.log('[A-02] console.error calls during GET =', errSpy.mock.calls.length);
    expect(rp.status).toBe(422);
    expect(body.error.message).toBe('Request body failed validation.');
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('A-03: registered OpenAPI response schemas reject what the routes actually return', async () => {
    const owner = await signUpUser();
    const viewer = await signUpUser();
    await verifyUserEmail(viewer.userId);
    const api = authed(owner.cookie);
    const cls = await json(
      await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Contract', template: 'cycle' }),
      }),
    );
    await api('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ resourceId: cls.id, targetUserId: viewer.userId, permission: 'view' }),
    });
    const shares = (await json(await api(`/api/v1/classes/${cls.id}/shares`))) as unknown[];
    const shareStrict = shareSchema.strict().safeParse(shares[0]);
    console.log(
      '[A-03] GET /classes/:id/shares keys =',
      Object.keys(shares[0] as object).join(','),
      '| strict Share parse ok =',
      shareStrict.success,
    );
    expect(shareStrict.success).toBe(false);

    const ct = await json(
      await api(`/api/v1/classes/${cls.id}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ track: { title: 'Song', artist: 'Artist' } }),
      }),
    );
    const bpm = await json(await api(`/api/v1/tracks/${ct.trackId}/bpm-lookup`, { method: 'POST' }));
    const trackStrict = trackSchema.strict().safeParse(bpm);
    console.log(
      '[A-03] POST /tracks/:id/bpm-lookup has bpmApplied =',
      'bpmApplied' in bpm,
      '| strict Track parse ok =',
      trackStrict.success,
    );
    expect(trackStrict.success).toBe(false);

    const comp = (openapi as { components: { schemas: Record<string, { additionalProperties?: unknown }> } })
      .components.schemas;
    expect(comp.Share!.additionalProperties).toBe(false);
    expect(comp.Track!.additionalProperties).toBe(false);

    const paths = (openapi as { paths: Record<string, Record<string, { security?: unknown }>> }).paths;
    console.log(
      '[A-03] spec has /health =',
      '/health' in paths,
      '/auth/capabilities =',
      '/auth/capabilities' in paths,
      '| callback security =',
      JSON.stringify(paths['/providers/{provider}/callback']!.get!.security ?? 'inherits global'),
    );
    expect('/health' in paths).toBe(false);
    expect(paths['/providers/{provider}/callback']!.get!.security).toBeUndefined();
    // The route is public at runtime (no session -> 302, not 401).
    const cb = await call('/api/v1/providers/soundcloud/callback?code=x&state=y', {
      redirect: 'manual',
    });
    console.log('[A-03] anonymous callback ->', cb.status);
    expect(cb.status).toBe(302);
    void env;
  });

  it('A-04: one user profile value that fails the output schema breaks Explore for everyone / locks the user out', async () => {
    const reader = await signUpUser();
    const publisher = await signUpUser();
    // PATCH /auth/me accepts an empty display name (updateUserProfileSchema has no min).
    const me = await authed(publisher.cookie)('/api/v1/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: '' }),
    });
    console.log('[A-04] PATCH /auth/me displayName="" ->', me.status);
    const pub = await authed(publisher.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Public', template: 'cycle', visibility: 'public' }),
    });
    console.log('[A-04] create public class ->', pub.status);
    const feed = await authed(reader.cookie)('/api/v1/explore');
    const feedBody = await json(feed);
    console.log('[A-04] another user GET /explore ->', feed.status, feedBody?.error?.code);
    expect(feed.status).toBe(422);

    // Better Auth's own /update-user stores any string as `image`; userSchema wants a URL.
    const victim = await signUpUser();
    const upd = await call('/api/auth/update-user', {
      method: 'POST',
      headers: {
        cookie: victim.cookie,
        'content-type': 'application/json',
        origin: 'https://ritmofit.studio',
      },
      body: JSON.stringify({ image: 'not a url' }),
    });
    console.log('[A-04] POST /api/auth/update-user image="not a url" ->', upd.status);
    const after = await authed(victim.cookie)('/api/v1/auth/me');
    const classesAfter = await authed(victim.cookie)('/api/v1/classes');
    console.log('[A-04] then GET /auth/me ->', after.status, '| GET /classes ->', classesAfter.status);
    expect(after.status).toBe(422);
    expect(classesAfter.status).toBe(422);
  });

  it('A-05: the legacy unpaginated GET /classes 500s once a library has more than 100 classes (new D-1 site)', async () => {
    const u = await signUpUser();
    const api = authed(u.cookie);
    for (let i = 0; i < 101; i++) {
      // Direct D1 insert keeps the probe fast; the route path is identical.
      await env.DB.prepare(
        `INSERT INTO classes (id, owner_user_id, title, status, visibility, timeline_mode, created_at, updated_at)
         VALUES (?, ?, ?, 'draft', 'private', 'sequential', ?, ?)`,
      )
        .bind(crypto.randomUUID(), u.userId, `Class ${i}`, 1_700_000_000_000 + i, 1_700_000_000_000 + i)
        .run();
    }
    const legacy = await api('/api/v1/classes');
    const paged = await api('/api/v1/classes?limit=50');
    console.log('[A-05] 101 classes: GET /classes (legacy, no limit) ->', legacy.status, '| ?limit=50 ->', paged.status);
    expect(legacy.status).toBe(500);
    expect(paged.status).toBe(200);
  });
});
