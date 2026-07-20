import { useRegisterSW } from 'virtual:pwa-register/react';
import { RecoveryState } from './SharedState.js';

// How often to re-check for a newer service worker while a tab stays open. An
// instructor may leave the app running for hours, so on-load registration alone
// would miss a deploy shipped mid-session; poll hourly and on tab focus.
const UPDATE_POLL_MS = 60 * 60 * 1000;

/**
 * Deploy-update surface. With `registerType: 'prompt'` the new service worker
 * installs but waits, so already-open clients keep serving the old precached
 * assets until the instructor opts in. This renders a non-intrusive toast when a
 * new version is ready; "Reload now" calls `updateServiceWorker()`, which activates
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
    <div className="fixed inset-x-0 bottom-0 z-[110] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <RecoveryState
        kind="update"
        title="A fresh build is ready."
        event="Reload now to update Ritmo Studio."
        safety="Reloading does not change saved classes or music-connection settings."
        statusLabel="Update available"
        role="status"
        compact
        className="w-full max-w-md shadow-lifted"
        primaryAction={
          <button
            type="button"
            onClick={() => void updateServiceWorker()}
            className="min-h-11 shrink-0 rounded-input rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent"
          >
            Reload now
          </button>
        }
        secondaryAction={
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="min-h-11 shrink-0 rounded-input px-3 font-ui text-sm font-semibold text-text-tertiary hover:bg-bg-overlay hover:text-text-secondary"
          >
            Later
          </button>
        }
      />
    </div>
  );
}
