import { useEffect, useState } from 'react';

/**
 * Whether the studio screen is being kept awake, for the Live transport to
 * surface (an unmanaged screen dimming mid-class is a real live-class failure):
 * - `idle` — not requested (class paused / not running);
 * - `awake` — the lock is held, the screen stays lit;
 * - `unavailable` — the browser has no wake-lock API *or* the request was
 *   denied. Both collapse to one state because the instructor-facing
 *   consequence is identical: the screen may dim, so keep the device from
 *   auto-locking.
 */
export type WakeLockStatus = 'idle' | 'awake' | 'unavailable';

/**
 * Hold a screen wake lock while `active` (Live mode is playing) so the device
 * doesn't dim/sleep mid-class during a quiet stretch, and report the resulting
 * {@link WakeLockStatus} so the transport can state it (never leave the screen
 * silently unmanaged). The lock is released on pause/unmount.
 *
 * The platform auto-releases the lock whenever the page is hidden (tab switch,
 * lock screen), so we re-acquire on `visibilitychange` → visible. Unsupported
 * browsers (older Safari) and a rejected request are non-fatal — the prompter
 * still works, the screen just isn't kept awake, and the status says so.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('idle');

  useEffect(() => {
    if (!active) {
      setStatus('idle');
      return;
    }
    // `navigator.wakeLock` is undefined on browsers without the API despite the type.
    const wakeLock = navigator.wakeLock as Navigator['wakeLock'] | undefined;
    if (!wakeLock) {
      setStatus('unavailable');
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let acquiring = false;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinel !== null || acquiring) return;
      acquiring = true;
      try {
        const next = await wakeLock.request('screen');
        if (cancelled) {
          void next.release();
          return;
        }
        sentinel = next;
        setStatus('awake');
        // The platform drops the lock when the page hides; clear our handle so the
        // visibility handler knows to re-acquire on return. We keep the status at
        // `awake` across a hide/return — the capability holds, and re-acquire is
        // automatic — so the chip doesn't flicker to caution behind a hidden tab.
        next.addEventListener('release', () => {
          // A late release from an older sentinel must not clear a newer lock.
          if (sentinel === next) sentinel = null;
        });
      } catch {
        // Permissions / not-visible / unsupported — leave the screen unmanaged
        // and say so, so the instructor can turn off the device's auto-lock.
        if (!cancelled) setStatus('unavailable');
      } finally {
        acquiring = false;
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

  return status;
}
