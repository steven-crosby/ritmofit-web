import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// One-shot guard so a genuine (non-stale) chunk failure can't loop the page.
const RELOAD_FLAG = 'ritmofit:chunk-reloaded';

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Run a dynamic-import factory, recovering from the post-deploy "stale shell"
 * crash. `registerType: 'autoUpdate'` keeps the service worker current but does
 * not reload already-open tabs, so a tab still running an older shell will
 * `import()` a chunk hash the new deploy has removed. That request 404s to the
 * SPA HTML fallback and throws `Failed to fetch dynamically imported module`.
 *
 * On the first such failure we reload once into the fresh shell the updated
 * service worker now serves, holding the <Suspense> fallback (via a
 * never-settling promise) until the navigation happens. A sessionStorage guard
 * stops a real, repeatable failure from looping — the second attempt rethrows
 * and falls through to the existing ErrorBoundary.
 *
 * `storage`/`reload` are injectable for unit tests; production uses the real
 * session storage and a full page reload.
 */
export async function loadChunkWithReload<T>(
  factory: () => Promise<T>,
  storage: ReloadStorage = window.sessionStorage,
  reload: () => void = () => window.location.reload(),
): Promise<T> {
  try {
    const mod = await factory();
    // A clean load means we're on a current shell; re-arm the guard so a future
    // deploy can reload again.
    storage.removeItem(RELOAD_FLAG);
    return mod;
  } catch (err) {
    if (storage.getItem(RELOAD_FLAG)) {
      // Already reloaded once and still failing — this isn't a stale chunk.
      throw err;
    }
    storage.setItem(RELOAD_FLAG, '1');
    reload();
    // Keep the Suspense fallback visible while the reload navigates away.
    return new Promise<T>(() => {});
  }
}

/**
 * Drop-in replacement for `React.lazy` that survives deploys: see
 * {@link loadChunkWithReload}. Same signature as `lazy`, so existing call sites
 * swap one-for-one.
 */
// Mirrors React.lazy's own signature (which is generic over `ComponentType<any>`)
// so each call site keeps its component's exact prop types through inference.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => loadChunkWithReload(factory));
}
