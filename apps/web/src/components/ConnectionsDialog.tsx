/**
 * Provider connections (design system `09`: "clear connected/disconnected states,
 * never a dead end"). Per-user OAuth links to SoundCloud / Spotify / Apple Music,
 * used by "search my likes" (S3) and token-spending calls. Connect starts the flow
 * (the dev mock seam links immediately; the live flow opens the provider's
 * authorize URL); disconnect forgets the tokens now and triggers the 7-day
 * metadata purge server-side — so it's a deliberate, confirmed action.
 *
 * State is encoded with label + icon + text (never color alone): a connected
 * provider shows "✓ Connected", a disconnected one a "Connect" action.
 */
import { useCallback, useEffect, useState } from 'react';
import type { MusicConnectionView, Provider } from '@ritmofit/shared';
import { listConnections, connectProvider, disconnectProvider } from '../lib/api.js';
import { PROVIDER_ORDER, providerLabel } from '../lib/providers.js';

export function ConnectionsDialog({ onClose }: { onClose: () => void }) {
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [confirming, setConfirming] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setConnections(await listConnections());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Surface a real-OAuth redirect result if the callback bounced back with one
  // (?connected=… / ?error=…). Harmless in the mock flow, which never redirects.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) setError(`Connection failed: ${err.replace(/_/g, ' ')}.`);
  }, []);

  const connectedSet = new Set((connections ?? []).map((c) => c.provider));

  const connect = async (provider: Provider) => {
    setBusyProvider(provider);
    setError(null);
    try {
      const res = await connectProvider(provider);
      if (res.authorizeUrl) {
        // Live flow: hand off to the provider's consent screen.
        window.location.href = res.authorizeUrl;
        return;
      }
      await refresh(); // mock seam connected immediately
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyProvider(null);
    }
  };

  const disconnect = async (provider: Provider) => {
    setBusyProvider(provider);
    setError(null);
    try {
      await disconnectProvider(provider);
      setConfirming(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Music connections"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">Music connections</h2>
            <p className="font-ui text-xs text-text-tertiary">
              Link an account to search your own library.
            </p>
          </div>
          <button
            className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
            onClick={onClose}
            aria-label="Close connections dialog"
          >
            ✕
          </button>
        </header>

        {error && (
          <p className="font-ui text-sm text-intensity-all_out" role="alert">
            {error}
          </p>
        )}

        {connections === null ? (
          <p className="font-ui text-sm text-text-tertiary">Loading…</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {PROVIDER_ORDER.map((provider) => {
              const connected = connectedSet.has(provider);
              const busy = busyProvider === provider;
              return (
                <li
                  key={provider}
                  className="flex items-center gap-3 rounded-card bg-bg-base px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-ui text-sm font-semibold text-text-primary">
                      {providerLabel(provider)}
                    </p>
                    <p className={`font-ui text-xs ${connected ? 'text-interactive' : 'text-text-tertiary'}`}>
                      {connected ? '✓ Connected' : 'Not connected'}
                    </p>
                  </div>

                  {connected ? (
                    confirming === provider ? (
                      <span className="flex items-center gap-2">
                        <span className="font-ui text-xs text-text-tertiary">Disconnect?</span>
                        <button
                          type="button"
                          onClick={() => disconnect(provider)}
                          disabled={busy}
                          className="rounded-pill border border-intensity-all_out/50 px-3 py-1 font-ui text-xs text-intensity-all_out disabled:opacity-50"
                        >
                          {busy ? 'Removing…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="rounded-pill px-2 py-1 font-ui text-xs text-text-tertiary hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(provider)}
                        className="shrink-0 rounded-pill border border-interactive/40 px-3 py-1 font-ui text-xs text-text-secondary hover:text-text-primary"
                      >
                        Disconnect
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => connect(provider)}
                      disabled={busy}
                      className="shrink-0 rounded-pill bg-brand px-3 py-1 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50"
                    >
                      {busy ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="font-ui text-xs text-text-tertiary">
          Disconnecting forgets your tokens immediately and schedules removal of that provider's
          imported references within 7 days.
        </p>
      </div>
    </div>
  );
}
