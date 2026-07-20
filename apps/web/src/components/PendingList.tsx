import { StatusLabel } from './SharedState.js';

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
        className="min-h-11 self-start rounded-input border border-interactive px-3 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10"
      >
        Try again
      </button>
    );
  }
  return <StatusLabel kind="loading" />;
}
