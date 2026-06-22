import { useEffect } from 'react';

/**
 * Hold a screen wake lock while `active` (Live mode is playing) so the device
 * doesn't dim/sleep mid-class during a quiet stretch. The lock is released on
 * pause/unmount.
 *
 * The platform auto-releases the lock whenever the page is hidden (tab switch,
 * lock screen), so we re-acquire on `visibilitychange` → visible. Unsupported
 * browsers (older Safari) and a rejected request are non-fatal — the prompter
 * still works, the screen just isn't kept awake.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    // `navigator.wakeLock` is undefined on browsers without the API despite the type.
    const wakeLock = navigator.wakeLock as Navigator['wakeLock'] | undefined;
    if (!wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const next = await wakeLock.request('screen');
        if (cancelled) {
          void next.release();
          return;
        }
        sentinel = next;
        // The platform drops the lock when the page hides; clear our handle so the
        // visibility handler knows to re-acquire on return.
        next.addEventListener('release', () => {
          sentinel = null;
        });
      } catch {
        // Permissions / not-visible / unsupported — leave the screen unmanaged.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && sentinel === null) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) {
        void sentinel.release();
        sentinel = null;
      }
    };
  }, [active]);
}
