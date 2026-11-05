/**
 * The app's URL surface (RF-129). One small history layer, no router library:
 * App reads the route to pick a screen, and Dashboard writes it from its own
 * state in one place (see `useRouteSync` there). Back/Forward arrive as a
 * `popstate`, and the path store below re-renders whoever reads it.
 */
import { useSyncExternalStore } from 'react';

export type AppRoute =
  | { kind: 'root' }
  | { kind: 'sign-in' }
  | { kind: 'sign-up' }
  | { kind: 'privacy' }
  | { kind: 'reset-password' }
  | { kind: 'music' }
  | { kind: 'live-home' }
  | { kind: 'account' }
  | { kind: 'class'; classId: string }
  | { kind: 'class-live'; classId: string }
  | { kind: 'not-found' };

/** Signed-in screens. A signed-out visit to one goes to Sign in, then back here. */
export type DashboardRoute = Extract<
  AppRoute,
  { kind: 'root' | 'music' | 'live-home' | 'account' | 'class' | 'class-live' }
>;

// Class ids are TEXT UUIDs. Anything else under /classes/ is a wrong link.
const CLASS_ID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const CLASS_PATH = new RegExp(`^/classes/(${CLASS_ID})(/live)?$`);

const FIXED: Record<string, AppRoute> = {
  '/': { kind: 'root' },
  '/sign-in': { kind: 'sign-in' },
  '/sign-up': { kind: 'sign-up' },
  '/privacy': { kind: 'privacy' },
  '/reset-password': { kind: 'reset-password' },
  '/music': { kind: 'music' },
  '/live': { kind: 'live-home' },
  '/account': { kind: 'account' },
};

export function parseRoute(pathname: string): AppRoute {
  // One trailing slash is the same page ("/music/"), except the root itself.
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const fixed = FIXED[path];
  if (fixed) return fixed;
  const match = CLASS_PATH.exec(path);
  if (match) {
    const classId = match[1]!.toLowerCase();
    return match[2] ? { kind: 'class-live', classId } : { kind: 'class', classId };
  }
  return { kind: 'not-found' };
}

export function routePath(route: AppRoute): string {
  switch (route.kind) {
    case 'class':
      return `/classes/${route.classId}`;
    case 'class-live':
      return `/classes/${route.classId}/live`;
    case 'not-found':
      return '/';
    default:
      return Object.keys(FIXED).find((path) => FIXED[path]!.kind === route.kind) ?? '/';
  }
}

export function isDashboardRoute(route: AppRoute): route is DashboardRoute {
  return (
    route.kind === 'root' ||
    route.kind === 'music' ||
    route.kind === 'live-home' ||
    route.kind === 'account' ||
    route.kind === 'class' ||
    route.kind === 'class-live'
  );
}

// --- Path store -----------------------------------------------------------

const listeners = new Set<() => void>();
// Set while a `history.back()` from `stepTo` is in flight, so a second step in
// the same moment cannot go back twice.
let pendingBack = false;
// Whether the latest popstate was that `stepTo` Back landing, not the visitor's.
let selfPop = false;
let listening = false;

function emit() {
  for (const listener of listeners) listener();
}

function onPopState() {
  selfPop = pendingBack;
  pendingBack = false;
  emit();
}

/**
 * True once after a path change that was the app's own `stepTo` Back landing.
 * State may have moved on while it was in flight, so the reader should rewrite
 * the path from state instead of treating it as the visitor's Back.
 */
export function takeSelfPop(): boolean {
  const was = selfPop;
  selfPop = false;
  return was;
}

function subscribe(listener: () => void) {
  if (!listening) {
    window.addEventListener('popstate', onPopState);
    listening = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const currentPath = () => window.location.pathname;

/** The current pathname, re-rendering on Back/Forward and on `navigate`. */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, currentPath, currentPath);
}

/** History entry state this module writes, so a later step can tell where it came from. */
export interface RouteHistoryState {
  /** The path this entry was pushed from, when the app pushed it. */
  from?: string;
}

/**
 * Move to `path`. A push records the path it came from, so a step back to that
 * same path can use the real Back (`history.back()`) instead of stacking a
 * duplicate entry (see `stepTo`). The query string is kept on a same-screen
 * replace only; a push drops it, except the `playback-timing` diagnostics flag.
 */
export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  const from = window.location.pathname;
  const search = keptSearch(replace);
  const target = `${path}${search}`;
  if (replace) {
    window.history.replaceState(window.history.state, '', target);
  } else {
    if (path === from) return;
    const state: RouteHistoryState = { from };
    window.history.pushState(state, '', target);
  }
  emit();
}

/**
 * Go to `path` as the result of an in-app action (open, close, exit). When the
 * current entry was pushed from `path`, this is a return, so it goes back one
 * entry: the browser's Back and Forward then stay a true record of the visit.
 */
export function stepTo(path: string) {
  if (pendingBack || path === window.location.pathname) return;
  const state = window.history.state as RouteHistoryState | null;
  if (state?.from === path) {
    pendingBack = true;
    window.history.back();
    return;
  }
  navigate(path);
}

export function resetAppRouteForTests() {
  pendingBack = false;
  selfPop = false;
  listeners.clear();
}

function keptSearch(replace: boolean): string {
  if (replace) return window.location.search;
  const timing = new URLSearchParams(window.location.search).get('playback-timing');
  return timing === null ? '' : `?playback-timing=${encodeURIComponent(timing)}`;
}

// --- Return-to after sign-in -------------------------------------------------

const RETURN_KEY = 'ritmo:return-to';

/** Remember a signed-in path to return to once sign-in completes. */
export function rememberReturnTo(path: string) {
  try {
    window.sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* Storage blocked: sign-in lands on the Classes home instead. */
  }
}

/** Forget a remembered path (the visitor gave up on that sign-in). */
export function clearReturnTo() {
  try {
    window.sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* Storage blocked: nothing was remembered. */
  }
}

/** The remembered path (a valid signed-in route only), cleared once read. */
export function consumeReturnTo(): string | null {
  let path: string | null = null;
  try {
    path = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
  } catch {
    return null;
  }
  return path && isDashboardRoute(parseRoute(path)) ? path : null;
}
