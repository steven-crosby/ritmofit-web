import type { Provider } from '@ritmofit/shared';
import type { ProviderConnectFlow } from '../lib/use-provider-connect.js';
import { providerLabel } from '../lib/providers.js';

/** Explicit connection actions; capability descriptions remain informational. */
export function ProviderConnectAction({
  provider,
  label,
  flow,
}: {
  provider: Provider;
  label: string;
  flow: ProviderConnectFlow;
}) {
  const operation = flow.operation;
  const own = operation?.provider === provider ? operation : null;
  const busy = operation && !operation.error && operation.stage !== 'ready';
  const ready = own?.stage === 'ready' && !own.error;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => void flow.start(provider)}
        disabled={!!busy}
        className="min-h-11 min-w-0 max-w-full whitespace-normal break-words rounded-control border border-interactive/50 px-3 font-ui text-xs font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring disabled:opacity-50"
      >
        {ready
          ? 'Authorize Apple Music'
          : own && busy
            ? `${providerLabel(provider)} · ${own.stage === 'authorizing' ? 'Waiting for authorization…' : own.stage === 'saving' ? 'Saving connection…' : own.stage === 'redirecting' ? 'Opening sign-in…' : 'Preparing connection…'}`
            : label}
      </button>
      {ready && (
        <p role="status" className="font-ui text-xs text-text-secondary">
          Ready. Tap Authorize Apple Music to open Apple’s sign-in screen.
        </p>
      )}
      {own?.slow && !own.error && (
        <p role="status" className="font-ui text-xs text-state-caution">
          Still waiting. You can cancel and try again.
        </p>
      )}
      {own?.error && (
        <p role="alert" className="font-ui text-xs text-state-danger">
          {own.error}
        </p>
      )}
      {own && !own.error && (
        <button
          type="button"
          onClick={flow.cancel}
          className="min-h-11 self-start rounded-control px-3 font-ui text-xs text-interactive rf-focus-ring"
        >
          Cancel {providerLabel(provider)} connection
        </button>
      )}
    </div>
  );
}
