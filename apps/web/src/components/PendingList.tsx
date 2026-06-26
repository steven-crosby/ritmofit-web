/**
 * The not-yet-loaded state for a dialog's async list. Renders a plain "Loading…"
 * while a fetch is genuinely pending, but a "Try again" affordance once that fetch
 * has failed — so a failed load never masquerades as perpetual loading (the
 * systemic "lingering Loading… + red error" bug). The error *message* itself is
 * rendered by the caller's own alert; this only resolves loading-vs-retry.
 */
export function PendingList({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (error) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive"
      >
        Try again
      </button>
    );
  }
  return <p className="font-ui text-sm text-text-tertiary">Loading…</p>;
}
