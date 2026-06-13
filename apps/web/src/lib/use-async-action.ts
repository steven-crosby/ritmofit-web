import { useCallback, useRef, useState } from 'react';

/**
 * Wrap an async UI action with an in-flight flag, error capture, and a re-entry
 * guard (S1). The guard makes a second submit while one is running a no-op even
 * if the button isn't disabled, so a slow network + double-click can't create a
 * duplicate class/track; failures surface through `report` instead of vanishing
 * as unhandled promise rejections.
 *
 * `report(null)` is called at the start of each run to clear a stale error;
 * `report(message)` on failure. Pass a `useState` setter (string | null).
 */
export function useAsyncAction(report: (msg: string | null) => void) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      report(null);
      try {
        await action();
      } catch (e) {
        report(e instanceof Error ? e.message : String(e));
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [report],
  );

  return { busy, run };
}
