import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * A subscribable, non-React-state store for a fast-changing ms value
 * (`useSyncExternalStore`-compatible). Subscribing here — instead of via a
 * normal re-rendering prop — is what lets a leaf component track the clock at
 * animation-frame rate without forcing its ancestors to re-render every frame
 * (SPC-18).
 */
export interface ClockStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => number;
}

/** How much the clock must move before the throttled display tier re-renders. */
const DISPLAY_THROTTLE_MS = 200;

export interface VirtualClock {
  /** Raw, frame-rate position for a leaf subscriber (e.g. the timeline playhead). */
  store: ClockStore;
  /** Throttled position (~200ms cadence) for the broad Live subtree — cue
   * selection, countdown text, and any other consumer that only needs
   * cue-boundary accuracy, not per-frame precision. */
  elapsedMs: number;
  /** Advance the clock from the host's rAF loop; call once per raw frame while
   * playing. Returns the capped elapsed ms for the caller's own end check. */
  tick: () => number;
  /** Bookkeeping for the start of a play segment (host calls once when `playing`
   * becomes true). */
  startSegment: () => void;
  /** Bookkeeping for the end of a play segment (host calls in the rAF effect's
   * cleanup): banks elapsed time, and force-syncs the throttled display tier to
   * the exact freeze-frame position so pause/resume never drifts by up to a
   * throttle window. */
  endSegment: () => void;
  /** Discrete jump: rebases both tiers immediately (keyboard seek, reset, a
   * tap/row-target — anything that isn't a continuous drag). Returns the
   * clamped ms actually applied. */
  seek: (ms: number) => number;
  /** Continuous drag preview: rebases the raw tier and clock bookkeeping only,
   * without touching the throttled display tier — cheap enough to call on
   * every pointer move without re-rendering the broad Live subtree (SPC-16).
   * Returns the clamped ms actually applied. */
  previewSeek: (ms: number) => number;
}

/**
 * The Live Mode virtual clock: accumulates real time only while playing (a
 * host-driven rAF loop), and exposes two read tiers — see {@link VirtualClock}.
 */
export function useVirtualClock(totalMs: number): VirtualClock {
  const baseRef = useRef(0); // elapsed banked before the current play segment
  const startRef = useRef(0); // performance.now() when the segment began
  const rawRef = useRef(0); // last published raw position (the store's snapshot)
  const displayedRef = useRef(0); // last position flushed to the throttled tier
  const listenersRef = useRef(new Set<() => void>());
  const [elapsedMs, setElapsedMs] = useState(0);

  const notify = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const store = useMemo<ClockStore>(
    () => ({
      subscribe: (onChange) => {
        listenersRef.current.add(onChange);
        return () => listenersRef.current.delete(onChange);
      },
      getSnapshot: () => rawRef.current,
    }),
    [],
  );

  const publish = useCallback(
    (ms: number) => {
      rawRef.current = ms;
      notify();
      if (ms - displayedRef.current >= DISPLAY_THROTTLE_MS) {
        displayedRef.current = ms;
        setElapsedMs(ms);
      }
    },
    [notify],
  );

  const tick = useCallback(() => {
    const live = baseRef.current + (performance.now() - startRef.current);
    const capped = Math.min(live, totalMs);
    publish(capped);
    if (capped >= totalMs) baseRef.current = totalMs;
    return capped;
  }, [totalMs, publish]);

  const startSegment = useCallback(() => {
    startRef.current = performance.now();
  }, []);

  const endSegment = useCallback(() => {
    baseRef.current += performance.now() - startRef.current;
    const exact = Math.min(baseRef.current, totalMs);
    displayedRef.current = exact;
    setElapsedMs(exact);
  }, [totalMs]);

  const seek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(ms, totalMs));
      baseRef.current = clamped;
      startRef.current = performance.now();
      rawRef.current = clamped;
      displayedRef.current = clamped;
      notify();
      setElapsedMs(clamped);
      return clamped;
    },
    [totalMs, notify],
  );

  const previewSeek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(ms, totalMs));
      baseRef.current = clamped;
      startRef.current = performance.now();
      rawRef.current = clamped;
      notify();
      return clamped;
    },
    [totalMs, notify],
  );

  return { store, elapsedMs, tick, startSegment, endSegment, seek, previewSeek };
}
