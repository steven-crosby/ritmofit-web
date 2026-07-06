import { useRegisterSW } from 'virtual:pwa-register/react';

// How often to re-check for a newer service worker while a tab stays open. An
// instructor may leave the app running for hours, so on-load registration alone
// would miss a deploy shipped mid-session; poll hourly and on tab focus.
const UPDATE_POLL_MS = 60 * 60 * 1000;

/**
 * Deploy-update surface. With `registerType: 'prompt'` the new service worker
 * installs but waits, so already-open clients keep serving the old precached
 * assets until the instructor opts in. This renders a non-intrusive toast when a
 * new version is ready; "Refresh" calls `updateServiceWorker()`, which activates
 * the waiting worker (skip-waiting) and reloads to the fresh bundle. Nothing
 * reloads on its own — Live Mode and in-progress edits are never interrupted.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const poll = () => {
        // Skip while offline; `update()` would only fail the fetch.
        if (navigator.onLine) void registration.update();
      };
      setInterval(poll, UPDATE_POLL_MS);
      // A tab returning to the foreground is a cheap, natural moment to check.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') poll();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[110] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-card border border-interactive/20 bg-bg-raised p-3 shadow-card sm:p-4">
        <p className="flex-1 font-ui text-sm text-text-primary">
          A new version of Ritmo Studio is available.
        </p>
        <button
          type="button"
          onClick={() => void updateServiceWorker()}
          className="min-h-11 shrink-0 rounded-pill rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notice"
          className="min-h-11 shrink-0 rounded-pill px-2 font-ui text-sm text-text-tertiary hover:text-text-secondary"
        >
          Later
        </button>
      </div>
    </div>
  );
}
