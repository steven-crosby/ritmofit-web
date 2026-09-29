import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth-client.js', () => ({
  API_BASE_URL: 'http://api.test',
  authClient: { signOut: vi.fn() },
}));

import { deleteClass, getClass } from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api response handling', () => {
  it('drains an empty 204 body so the request is not reported as aborted', async () => {
    const res = new Response(null, { status: 204 });
    const text = vi.spyOn(res, 'text');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));

    await expect(deleteClass('class-1')).resolves.toBeUndefined();
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('still parses JSON bodies for other successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ id: 'class-1' }, { status: 200 })),
    );

    await expect(getClass('class-1')).resolves.toEqual({ id: 'class-1' });
  });
});
