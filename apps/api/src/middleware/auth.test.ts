import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';

const getSession = vi.fn();
vi.mock('../lib/auth.js', () => ({ createAuth: () => ({ api: { getSession } }) }));

const { refreshSession, requireSession } = await import('./auth.js');

const ROUTE_COOKIE = 'route_cookie=1; Path=/';
const user = {
  id: 'u1',
  email: 'u@example.com',
  name: 'U',
  image: null,
  emailVerified: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const bindings = {} as AppEnv['Bindings'];

/** Three routers mounted at '/', each with a blanket requireSession, like index.ts. */
function stackedApp() {
  const root = new Hono<AppEnv>();
  for (let i = 0; i < 3; i += 1) {
    const r = new Hono<AppEnv>();
    r.use('*', requireSession);
    if (i === 2) {
      r.get('/thing', (c) => {
        c.header('Set-Cookie', ROUTE_COOKIE, { append: true });
        return c.json({ userId: c.get('userId') });
      });
    }
    root.route('/', r);
  }
  return root;
}

function refreshApp() {
  const app = new Hono<AppEnv>();
  app.post('/session', refreshSession, (c) => c.json(c.get('user')));
  return app;
}

/** Workers types predate Headers.getSetCookie; the Node test runtime has it. */
function setCookiesOf(res: Response): string[] {
  return (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
}

describe('requireSession (RF-177, RF-178)', () => {
  beforeEach(() => getSession.mockReset());

  it('resolves once with refresh disabled across stacked routers and keeps the route cookie', async () => {
    getSession.mockResolvedValue({ user, session: {} });
    const res = await stackedApp().request('/thing', {}, bindings);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'u1' });
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getSession.mock.calls[0]![0]).toMatchObject({ query: { disableRefresh: true } });
    expect(setCookiesOf(res)).toEqual([ROUTE_COOKIE]);
  });

  it('a 401 carries no Set-Cookie', async () => {
    getSession.mockResolvedValue(null);
    const res = await stackedApp().request('/thing', {}, bindings);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(setCookiesOf(res)).toEqual([]);
  });
});

describe('refreshSession (RF-178, option C)', () => {
  beforeEach(() => getSession.mockReset());

  it("lets Better Auth refresh and never asks for (or forwards) Better Auth's cookies", async () => {
    getSession.mockResolvedValue({ user, session: {} });
    const res = await refreshApp().request('/session', { method: 'POST' }, bindings);
    expect(res.status).toBe(200);
    const args = getSession.mock.calls[0]![0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('query');
    expect(args).not.toHaveProperty('returnHeaders');
    expect(setCookiesOf(res)).toEqual([]);
  });

  it('a 401 carries no Set-Cookie', async () => {
    getSession.mockResolvedValue(null);
    const res = await refreshApp().request('/session', { method: 'POST' }, bindings);
    expect(res.status).toBe(401);
    expect(setCookiesOf(res)).toEqual([]);
  });
});
