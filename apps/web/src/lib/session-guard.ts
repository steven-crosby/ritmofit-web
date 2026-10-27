/**
 * Session-loss guard. A Better Auth session can turn null mid-use (cookie expiry,
 * a 401 from any API call, a refetch on tab focus). App reads these two flags to
 * decide what a lost session shows:
 * - Live is active → keep Live mounted so the class keeps running.
 * - The instructor pressed Sign out → the marketing page, as before.
 * - Otherwise → Sign in, with a "session ended" line.
 */
import { useSyncExternalStore } from 'react';
import { authClient } from './auth-client.js';

let liveActive = false;
let explicitSignOut = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLiveActive(active: boolean) {
  if (liveActive === active) return;
  liveActive = active;
  emit();
}

export function isLiveActive() {
  return liveActive;
}

export function useLiveActive() {
  return useSyncExternalStore(subscribe, isLiveActive, isLiveActive);
}

/** The instructor's own Sign out. Automatic sign-outs (a 401) never set this. */
export function signOutByUser() {
  explicitSignOut = true;
  return authClient.signOut();
}

export function wasExplicitSignOut() {
  return explicitSignOut;
}

/** A fresh session starts a new guard window. */
export function clearExplicitSignOut() {
  explicitSignOut = false;
}

export function resetSessionGuardForTests() {
  liveActive = false;
  explicitSignOut = false;
  listeners.clear();
}
