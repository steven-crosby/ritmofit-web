/**
 * Apply a prompted service-worker update and reload onto the new shell.
 *
 * `vite-plugin-pwa` prompt mode (`registerType: 'prompt'`) installs the next
 * worker and leaves it waiting. Its `updateServiceWorker()` only posts
 * `SKIP_WAITING` — the `_reloadPage` argument is ignored — and the generated
 * worker does not call `clients.claim()`. The plugin then reloads only from
 * workbox's `controlling` event when `event.isUpdate` is true. Without
 * `clients.claim()`, `skipWaiting()` activates the worker but does not take
 * control of this document, so `controlling` never fires. The page stays on
 * the old shell, `needRefresh` stays true, and the toast remains. A reload
 * that races activation is served by the previous worker while the new one is
 * still waiting (`wasWaitingBeforeRegister`), so the toast comes straight back.
 *
 * This waits until that waiting worker reports `activated` (or a short
 * timeout) and only then reloads. A one-shot session flag drops the prompt if
 * the same update is still reported on the document we just navigated to.
 */

export const SW_UPDATE_RELOAD_KEY = 'ritmofit:sw-update-reload';

/** Long enough for the next document to register, short enough to not hide a later deploy. */
export const SW_UPDATE_RELOAD_WINDOW_MS = 15_000;

const ACTIVATION_TIMEOUT_MS = 4_000;

export interface WaitingServiceWorker {
  state: string;
  addEventListener(type: 'statechange', listener: () => void): void;
  removeEventListener(type: 'statechange', listener: () => void): void;
}

export interface ServiceWorkerRegistrationLike {
  waiting: WaitingServiceWorker | null;
}

export interface ApplyServiceWorkerUpdateDeps {
  /** Post `SKIP_WAITING` to the waiting worker (the plugin helper does this). */
  skipWaiting: () => Promise<void> | void;
  getRegistration: () => Promise<ServiceWorkerRegistrationLike | undefined>;
  reload: () => void;
  session: Pick<Storage, 'setItem'>;
  now?: () => number;
  activationTimeoutMs?: number;
  /** Schedule the activation timeout. Return a cancel function. */
  schedule?: (ms: number, fn: () => void) => () => void;
}

let applying = false;

function defaultSchedule(ms: number, fn: () => void): () => void {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
}

function waitForActivation(
  waiting: WaitingServiceWorker,
  timeoutMs: number,
  schedule: (ms: number, fn: () => void) => () => void,
): Promise<boolean> {
  if (waiting.state === 'activated') return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    let cancel = () => {};
    const finish = (activated: boolean) => {
      if (settled) return;
      settled = true;
      waiting.removeEventListener('statechange', onState);
      cancel();
      resolve(activated);
    };
    const onState = () => {
      if (waiting.state === 'activated') finish(true);
    };
    waiting.addEventListener('statechange', onState);
    cancel = schedule(timeoutMs, () => finish(false));
  });
}

/**
 * Activate the waiting worker, then reload. A second click while the first
 * handoff is in progress does nothing — one reload is enough.
 */
export async function applyServiceWorkerUpdate(deps: ApplyServiceWorkerUpdateDeps): Promise<void> {
  if (applying) return;
  applying = true;
  try {
    const now = deps.now ?? Date.now;
    const timeoutMs = deps.activationTimeoutMs ?? ACTIVATION_TIMEOUT_MS;
    const schedule = deps.schedule ?? defaultSchedule;

    let waiting: WaitingServiceWorker | null = null;
    try {
      waiting = (await deps.getRegistration())?.waiting ?? null;
    } catch {
      waiting = null;
    }

    // Listen before skip-waiting so a synchronous `statechange` is not missed.
    const activated = waiting
      ? waitForActivation(waiting, timeoutMs, schedule)
      : Promise.resolve(false);

    try {
      await deps.skipWaiting();
    } catch {
      // The worker may already be activating. Reload either way.
    }

    const didActivate = await activated;
    if (didActivate) deps.session.setItem(SW_UPDATE_RELOAD_KEY, String(now()));
    deps.reload();
  } finally {
    applying = false;
  }
}

/**
 * True when this document is the navigation Reload now just started and the
 * prompt is the update we already activated. Clears the flag either way so a
 * later deploy in the same tab can still surface.
 */
export function shouldSuppressResurrectedUpdatePrompt(
  session: Pick<Storage, 'getItem' | 'removeItem'>,
  now: number,
  windowMs = SW_UPDATE_RELOAD_WINDOW_MS,
): boolean {
  const raw = session.getItem(SW_UPDATE_RELOAD_KEY);
  if (!raw) return false;
  session.removeItem(SW_UPDATE_RELOAD_KEY);
  const started = Number(raw);
  if (!Number.isFinite(started)) return false;
  const age = now - started;
  return age >= 0 && age <= windowMs;
}

/** Drop the one-shot flag once a registration has no waiting worker. */
export function noteServiceWorkerRegistration(
  session: Pick<Storage, 'removeItem'>,
  registration: { waiting: unknown } | null | undefined,
): void {
  if (registration && !registration.waiting) session.removeItem(SW_UPDATE_RELOAD_KEY);
}
