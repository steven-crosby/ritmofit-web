// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeReturnTo,
  isDashboardRoute,
  navigate,
  parseRoute,
  redirectLegacyAuthIntent,
  rememberReturnTo,
  resetAppRouteForTests,
  routePath,
  settleAppRouteForTests,
  stepTo,
} from './app-route.js';

const ID = '3f2b8c1e-5d4a-4b7f-9a1c-0e2d3c4b5a69';

beforeEach(() => window.history.replaceState(null, '', '/'));
afterEach(() => {
  sessionStorage.clear();
  resetAppRouteForTests();
  vi.restoreAllMocks();
});

describe('parseRoute', () => {
  it('names each screen the app has a path for', () => {
    expect(parseRoute('/')).toEqual({ kind: 'root' });
    expect(parseRoute('/sign-in')).toEqual({ kind: 'sign-in' });
    expect(parseRoute('/sign-up')).toEqual({ kind: 'sign-up' });
    expect(parseRoute('/music')).toEqual({ kind: 'music' });
    expect(parseRoute('/live')).toEqual({ kind: 'live-home' });
    expect(parseRoute('/account')).toEqual({ kind: 'account' });
    expect(parseRoute('/privacy')).toEqual({ kind: 'privacy' });
    expect(parseRoute('/reset-password')).toEqual({ kind: 'reset-password' });
    expect(parseRoute(`/classes/${ID}`)).toEqual({ kind: 'class', classId: ID });
    expect(parseRoute(`/classes/${ID}/live`)).toEqual({ kind: 'class-live', classId: ID });
  });

  it('treats one trailing slash as the same page and lowercases class ids', () => {
    expect(parseRoute('/music/')).toEqual({ kind: 'music' });
    expect(parseRoute(`/classes/${ID.toUpperCase()}/`)).toEqual({ kind: 'class', classId: ID });
  });

  it('sends anything else to not-found, including a class path without a UUID', () => {
    for (const path of [
      '/nope',
      '/classes/abc',
      `/classes/${ID}/edit`,
      '/api/v1/classes',
      '/classes',
    ]) {
      expect(parseRoute(path)).toEqual({ kind: 'not-found' });
    }
  });

  it('round-trips every route through routePath', () => {
    for (const path of ['/', '/sign-in', '/sign-up', '/music', '/live', '/account']) {
      expect(routePath(parseRoute(path))).toBe(path);
    }
    expect(routePath({ kind: 'class-live', classId: ID })).toBe(`/classes/${ID}/live`);
  });

  it('marks only signed-in screens as dashboard routes', () => {
    expect(isDashboardRoute(parseRoute(`/classes/${ID}`))).toBe(true);
    expect(isDashboardRoute(parseRoute('/sign-in'))).toBe(false);
    expect(isDashboardRoute(parseRoute('/privacy'))).toBe(false);
  });
});

describe('navigate and stepTo', () => {
  it('records where a push came from and keeps only the timing flag', () => {
    window.history.replaceState(null, '', '/?playback-timing=1&connected=spotify');
    navigate('/music');
    expect(window.location.pathname).toBe('/music');
    expect(window.location.search).toBe('?playback-timing=1');
    expect(window.history.state).toEqual({ from: '/' });
  });

  it('replaces without a new entry and keeps the query', () => {
    window.history.replaceState(null, '', '/?x=1');
    const length = window.history.length;
    navigate('/sign-in', { replace: true });
    expect(window.history.length).toBe(length);
    expect(window.location.href).toMatch(/\/sign-in\?x=1$/);
  });

  it('goes Back when returning to the page this entry was pushed from', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    navigate(`/classes/${ID}`);
    stepTo('/');
    expect(back).toHaveBeenCalledTimes(1);
    // A second step before the popstate lands must not go back twice.
    stepTo('/');
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('settles a queued Back before the next test, so the next step is not swallowed (RF-195)', async () => {
    navigate(`/classes/${ID}`);
    stepTo('/');
    await settleAppRouteForTests();
    expect(window.location.pathname).toBe('/');
    // No Back is still pending: a new step pushes at once.
    stepTo('/music');
    expect(window.location.pathname).toBe('/music');
    // With nothing queued it resolves at once.
    await settleAppRouteForTests();
  });

  it('pushes when the target is not where this entry came from', () => {
    const back = vi.spyOn(window.history, 'back');
    navigate(`/classes/${ID}`);
    stepTo('/music');
    expect(back).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/music');
    expect(window.history.state).toEqual({ from: `/classes/${ID}` });
  });
});

describe('redirectLegacyAuthIntent', () => {
  it('sends old /?auth= links to their own paths, and leaves other paths alone', () => {
    window.history.replaceState(null, '', '/?auth=signup');
    redirectLegacyAuthIntent();
    expect(window.location.pathname).toBe('/sign-up');
    window.history.replaceState(null, '', '/music?auth=signin');
    redirectLegacyAuthIntent();
    expect(window.location.pathname).toBe('/music');
  });
});

describe('return-to after sign-in', () => {
  it('returns once, to a signed-in path only', () => {
    rememberReturnTo(`/classes/${ID}/live`);
    expect(consumeReturnTo()).toBe(`/classes/${ID}/live`);
    expect(consumeReturnTo()).toBeNull();
  });

  it('refuses anything that is not a signed-in screen', () => {
    for (const path of ['https://evil.example/', '//evil.example', '/sign-in', '/nope']) {
      rememberReturnTo(path);
      expect(consumeReturnTo()).toBeNull();
    }
  });
});
