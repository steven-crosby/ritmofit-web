import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  applyServiceWorkerUpdate,
  noteServiceWorkerRegistration,
  shouldSuppressResurrectedUpdatePrompt,
} from '../lib/applyServiceWorkerUpdate.js';
import { RecoveryState } from './SharedState.js';

// How often to re-check for a newer service worker while a tab stays open. An
// instructor may leave the app running for hours, so on-load registration alone
// would miss a deploy shipped mid-session; poll hourly and on tab focus.
const UPDATE_POLL_MS = 60 * 60 * 1000;

/**
 * Deploy-update surface. With `registerType: 'prompt'` the new service worker
 * installs but waits, so already-open clients keep the old precached assets
 * until the instructor opts in. Nothing reloads on its own — Live Mode and
 * in-progress edits are never interrupted.
 *
 * "Reload now" cannot trust `updateServiceWorker()` to navigate. Prompt mode
 * does not `clients.claim()`, and the plugin reloads only from a `controlling`
 * event with `isUpdate === true`, which that missing claim never produces. The
 * toast would stay up on the old shell, or return after a reload that still
 * saw the waiting worker. `applyServiceWorkerUpdate` activates the worker and
 * reloads after that, and drops one resurrected prompt on the next document.
 *
 * The card is pinned to the top, under dialogs and Live Mode (`z-50`), so it
 * does not cover the playlist paste panel's Import button.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      if (shouldSuppressResurrectedUpdatePrompt(window.sessionStorage, Date.now())) {
        setNeedRefresh(false);
      }
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      noteServiceWorkerRegistration(window.sessionStorage, registration);
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
      data-testid="update-prompt"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <RecoveryState
        kind="update"
        title="A fresh build is ready."
        event="Reload now to update Ritmo Studio."
        safety="Reloading does not change saved classes or music-connection settings."
        statusLabel="Update available"
        role="status"
        compact
        className="pointer-events-auto w-full max-w-md shadow-lifted"
        primaryAction={
          <button
            type="button"
            onClick={() => {
              // Hide immediately so the card cannot keep covering the paste
              // panel while the worker activates.
              setNeedRefresh(false);
              void applyServiceWorkerUpdate({
                skipWaiting: () => updateServiceWorker(),
                getRegistration: () =>
                  'serviceWorker' in navigator
                    ? navigator.serviceWorker.getRegistration()
                    : Promise.resolve(undefined),
                reload: () => window.location.reload(),
                session: window.sessionStorage,
              });
            }}
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
