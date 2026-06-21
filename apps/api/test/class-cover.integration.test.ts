import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_CLASS_COVER_BYTES } from '@ritmofit/shared';
import { authed, call, signUpUser } from './helpers.js';

async function createClass(cookie: string): Promise<string> {
  const res = await authed(cookie)('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Cover test' }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function uploadCover(cookie: string, classId: string, file: File): Promise<Response> {
  const form = new FormData();
  form.set('file', file);
  return call(`/api/v1/classes/${classId}/cover`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
}

function objectKey(coverImageUrl: string): string {
  return new URL(coverImageUrl).pathname.replace('/api/v1/uploads/', '');
}

describe('class cover lifecycle', () => {
  beforeEach(async () => {
    const objects = await env.IMAGES_BUCKET.list();
    if (objects.objects.length > 0) {
      await env.IMAGES_BUCKET.delete(objects.objects.map((object) => object.key));
    }
  });

  it('serves nosniff images and removes replaced and deleted cover objects', async () => {
    const user = await signUpUser();
    const classId = await createClass(user.cookie);

    const firstUpload = await uploadCover(
      user.cookie,
      classId,
      new File(['first'], 'first.png', { type: 'image/png' }),
    );
    expect(firstUpload.status).toBe(200);
    const firstUrl = ((await firstUpload.json()) as { coverImageUrl: string }).coverImageUrl;
    const firstKey = objectKey(firstUrl);
    expect(await env.IMAGES_BUCKET.head(firstKey)).not.toBeNull();

    const served = await call(new URL(firstUrl).pathname, { headers: { cookie: user.cookie } });
    expect(served.status).toBe(200);
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');
    await served.arrayBuffer();

    const replacement = await uploadCover(
      user.cookie,
      classId,
      new File(['second'], 'second.webp', { type: 'image/webp' }),
    );
    expect(replacement.status).toBe(200);
    const replacementUrl = ((await replacement.json()) as { coverImageUrl: string }).coverImageUrl;
    const replacementKey = objectKey(replacementUrl);
    expect(await env.IMAGES_BUCKET.head(firstKey)).toBeNull();
    expect(await env.IMAGES_BUCKET.head(replacementKey)).not.toBeNull();

    const deleted = await authed(user.cookie)(`/api/v1/classes/${classId}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
    expect(await env.IMAGES_BUCKET.head(replacementKey)).toBeNull();
  });

  it('rejects an oversized image without writing an object', async () => {
    const user = await signUpUser();
    const classId = await createClass(user.cookie);
    const before = await env.IMAGES_BUCKET.list();

    const res = await uploadCover(
      user.cookie,
      classId,
      new File([new Uint8Array(MAX_CLASS_COVER_BYTES + 1)], 'large.jpg', {
        type: 'image/jpeg',
      }),
    );

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Cover image must be 5 MiB or smaller.' },
    });
    const after = await env.IMAGES_BUCKET.list();
    expect(after.objects).toHaveLength(before.objects.length);
  });
});
