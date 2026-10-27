import { useSyncExternalStore } from 'react';

/**
 * The browser's online flag. `navigator.onLine` false is reliable (no network at
 * all); true only means a network exists, so callers still handle request failures.
 */
function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

const getOnline = () => navigator.onLine;
const getServerOnline = () => true;

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getOnline, getServerOnline);
}
