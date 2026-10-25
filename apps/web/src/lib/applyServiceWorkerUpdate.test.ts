import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SW_UPDATE_RELOAD_KEY,
  SW_UPDATE_RELOAD_WINDOW_MS,
  applyServiceWorkerUpdate,
  noteServiceWorkerRegistration,
  shouldSuppressResurrectedUpdatePrompt,
  type WaitingServiceWorker,
} from './applyServiceWorkerUpdate.js';

function memorySession(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

function waitingWorker(state = 'installed') {
  let listener: (() => void) | undefined;
  const worker: WaitingServiceWorker & { fire: () => void } = {
    state,
    addEventListener(_type, next) {
      listener = next;
    },
    removeEventListener() {
      listener = undefined;
    },
    fire() {
      listener?.();
    },
  };
  return worker;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applyServiceWorkerUpdate', () => {
  it('reloads immediately when nothing is waiting', async () => {
    const reload = vi.fn();
    const skipWaiting = vi.fn();
    const session = memorySession();

    await applyServiceWorkerUpdate({
      skipWaiting,
      getRegistration: async () => ({ waiting: null }),
      reload,
      session,
    });

    expect(skipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(session.map.has(SW_UPDATE_RELOAD_KEY)).toBe(false);
  });

  it('reloads after the waiting worker activates and records the handoff', async () => {
    const reload = vi.fn();
    const session = memorySession();
    const waiting = waitingWorker('installed');
    const skipWaiting = vi.fn(() => {
      waiting.state = 'activated';
      waiting.fire();
    });

    await applyServiceWorkerUpdate({
      skipWaiting,
      getRegistration: async () => ({ waiting }),
      reload,
      session,
      now: () => 1_700_000_000_000,
    });

    expect(skipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(session.getItem(SW_UPDATE_RELOAD_KEY)).toBe('1700000000000');
  });

  it('still reloads when activation never arrives, without suppressing the next prompt', async () => {
    const reload = vi.fn();
    const session = memorySession();
    const waiting = waitingWorker('installed');
    let fireTimeout: (() => void) | undefined;
    let resolveRegistration: (value: { waiting: WaitingServiceWorker }) => void = () => {};

    const pending = applyServiceWorkerUpdate({
      skipWaiting: () => undefined,
      getRegistration: () =>
        new Promise((resolve) => {
          resolveRegistration = resolve;
        }),
      reload,
      session,
      schedule: (_ms, fn) => {
        fireTimeout = fn;
        return () => {};
      },
    });

    resolveRegistration({ waiting });
    await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();
    expect(fireTimeout).toBeTypeOf('function');
    fireTimeout?.();
    await pending;
    expect(reload).toHaveBeenCalledTimes(1);
    expect(session.map.has(SW_UPDATE_RELOAD_KEY)).toBe(false);
  });

  it('reloads when the registration lookup fails', async () => {
    const reload = vi.fn();
    await applyServiceWorkerUpdate({
      skipWaiting: () => undefined,
      getRegistration: async () => {
        throw new Error('service worker unavailable');
      },
      reload,
      session: memorySession(),
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ignores a second click while the first handoff is in progress', async () => {
    const reload = vi.fn();
    const waiting = waitingWorker('installed');
    let fireTimeout: (() => void) | undefined;
    let resolveRegistration: (value: { waiting: WaitingServiceWorker }) => void = () => {};
    const deps = {
      skipWaiting: () => undefined,
      getRegistration: () =>
        new Promise<{ waiting: WaitingServiceWorker }>((resolve) => {
          resolveRegistration = resolve;
        }),
      reload,
      session: memorySession(),
      schedule: (_ms: number, fn: () => void) => {
        fireTimeout = fn;
        return () => {};
      },
    };

    const first = applyServiceWorkerUpdate(deps);
    const second = applyServiceWorkerUpdate(deps);
    resolveRegistration({ waiting });
    await second;
    expect(reload).not.toHaveBeenCalled();
    fireTimeout?.();
    await first;
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('shouldSuppressResurrectedUpdatePrompt', () => {
  it('suppresses a prompt inside the handoff window and clears the flag', () => {
    const session = memorySession({ [SW_UPDATE_RELOAD_KEY]: '1000' });
    expect(shouldSuppressResurrectedUpdatePrompt(session, 1000 + SW_UPDATE_RELOAD_WINDOW_MS)).toBe(
      true,
    );
    expect(session.map.has(SW_UPDATE_RELOAD_KEY)).toBe(false);
  });

  it('does not suppress once the window has passed', () => {
    const session = memorySession({ [SW_UPDATE_RELOAD_KEY]: '1000' });
    expect(
      shouldSuppressResurrectedUpdatePrompt(session, 1000 + SW_UPDATE_RELOAD_WINDOW_MS + 1),
    ).toBe(false);
    expect(session.map.has(SW_UPDATE_RELOAD_KEY)).toBe(false);
  });

  it('does not suppress when no handoff was recorded', () => {
    expect(shouldSuppressResurrectedUpdatePrompt(memorySession(), 5_000)).toBe(false);
  });
});

describe('noteServiceWorkerRegistration', () => {
  it('clears the handoff flag when the new worker is already active', () => {
    const session = memorySession({ [SW_UPDATE_RELOAD_KEY]: '1000' });
    noteServiceWorkerRegistration(session, { waiting: null });
    expect(session.map.has(SW_UPDATE_RELOAD_KEY)).toBe(false);
  });

  it('keeps the flag while a worker is still waiting', () => {
    const session = memorySession({ [SW_UPDATE_RELOAD_KEY]: '1000' });
    noteServiceWorkerRegistration(session, { waiting: {} });
    expect(session.getItem(SW_UPDATE_RELOAD_KEY)).toBe('1000');
  });
});
