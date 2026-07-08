/**
 * Provider connections (design system `09`: "clear connected/disconnected states,
 * never a dead end"). All three providers support a per-user account link: Connect
 * starts the flow — SoundCloud and Spotify hand off to the provider's authorize URL
 * (redirect OAuth); Apple Music authorizes in place via MusicKit JS — while the dev
 * mock seam links immediately. Disconnect forgets the tokens now and triggers the
 * 7-day metadata purge server-side — so it's a deliberate, confirmed action.
 *
 * State is encoded with glyph + label + text (never color alone, 05/11): each
 * provider shows an explicit status — ✓ Connected, ⧖ Session expired, ○ Not
 * connected, ◍ Catalog search only — paired with its recovery action (Connect /
 * Reconnect / Disconnect).
 *
 * Only the four states derivable from `MusicConnectionView` (provider +
 * `expiresAt`) are shown; the canonical model's `permission` and `provider-error`
 * states need backend signal we don't yet have — a documented TODO in
 * `providerConnectionState`, not invented from data we lack.
 */
import { useCallback, useEffect, useState } from 'react';
import { type MusicConnectionView, type Provider } from '@ritmofit/shared';
import {
  listConnections,
  connectProvider,
  disconnectProvider,
  getAppleMusicConfig,
  connectAppleMusic,
} from '../lib/api.js';
import { authorizeAppleMusic } from '../lib/musickit.js';
import {
  PROVIDER_ORDER,
  providerLabel,
  providerConnectionState,
  connectionHasSavedPlaylistScope,
  type ProviderConnectionState,
} from '../lib/providers.js';
import { Dialog } from './Dialog.js';
import { DialogState } from './DialogState.js';

/**
 * Presentation per state: a glyph and label carry the meaning; the tone maps to
 * the semantic channel (02) and only reinforces. `reconnecting` is the transient
 * in-flight state shown while a connect/reauth call is busy.
 */
const STATE_META: Record<
  ProviderConnectionState | 'reconnecting',
  { glyph: string; label: string; tone: string }
> = {
  connected: { glyph: '✓', label: 'Connected', tone: 'text-state-positive' },
  reconnecting: { glyph: '↻', label: 'Reconnecting…', tone: 'text-interactive' },
  expired: { glyph: '⧖', label: 'Session expired', tone: 'text-state-caution' },
  disconnected: { glyph: '○', label: 'Not connected', tone: 'text-text-tertiary' },
  'catalog-only': { glyph: '◍', label: 'Catalog search only', tone: 'text-text-tertiary' },
};

export function ConnectionsDialog({
  onClose,
  oauthResult,
}: {
  onClose: () => void;
  /** The provider OAuth round-trip result, parsed from the return URL by the dashboard. */
  oauthResult?: { connected?: string; error?: string } | null;
}) {
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [confirming, setConfirming] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setConnections(await listConnections());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Surface a real-OAuth redirect result handed down from the dashboard: the
  // callback returns the browser to "/?connected=…" or "/?error=…", which the
  // dashboard parses and passes here. The mock flow connects in place and passes
  // nothing.
  useEffect(() => {
    if (!oauthResult) return;
    if (oauthResult.error) {
      setError(`Connection failed: ${oauthResult.error.replace(/_/g, ' ')}.`);
    } else if (oauthResult.connected) {
      setNotice(`Connected to ${providerLabel(oauthResult.connected as Provider)}.`);
    }
  }, [oauthResult]);

  const connectionByProvider = new Map((connections ?? []).map((c) => [c.provider, c]));

  const connect = async (provider: Provider) => {
    setBusyProvider(provider);
    setError(null);
    try {
      // Apple Music has no redirect OAuth: MusicKit JS authorizes in the browser
      // and hands back a Music-User-Token we post to the server. It connects in
      // place (no full-page redirect), so refresh + show the same success notice.
      if (provider === 'apple_music') {
        const config = await getAppleMusicConfig();
        const token = await authorizeAppleMusic(config);
        await connectAppleMusic(token);
        await refresh();
        setNotice(`Connected to ${providerLabel(provider)}.`);
        return;
      }
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
    <Dialog
      onClose={onClose}
      label="Music connections"
      panelClassName="flex w-full max-w-md flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Music connections
          </h2>
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
        <p className="font-ui text-sm text-state-danger" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="font-ui text-sm text-state-positive" role="status">
          {notice}
        </p>
      )}

      {connections === null ? (
        <DialogState
          title={error ? 'Connections did not load' : 'Checking provider links'}
          description={
            error
              ? 'Provider rows are waiting for a clean refresh.'
              : 'Reading your Spotify, Apple Music, and SoundCloud connection states.'
          }
          placeholder="provider-rows"
          action={
            error ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive"
              >
                Try again
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {PROVIDER_ORDER.map((provider) => {
            const busy = busyProvider === provider;
            const connection = connectionByProvider.get(provider);
            const dataState = providerConnectionState(provider, connection, Date.now());
            // The only busy action from a disconnected/expired row is a (re)connect,
            // so surface that as the transient reconnecting state; a busy connected
            // row is mid-disconnect and keeps its Connected status (button says so).
            const showReconnecting =
              busy && (dataState === 'disconnected' || dataState === 'expired');
            const meta = STATE_META[showReconnecting ? 'reconnecting' : dataState];
            // Connections made before playlist browse launched only granted the
            // pre-expansion scope set — surface a reconnect prompt instead of a
            // dead "Browse playlists" button (Dashboard hides it entirely when the
            // browse read has never succeeded).
            const needsPlaylistReconnect =
              dataState === 'connected' && !connectionHasSavedPlaylistScope(provider, connection);
            return (
              <li
                key={provider}
                className="flex flex-col gap-2 rounded-card bg-bg-base px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-ui text-sm font-semibold text-text-primary">
                      {providerLabel(provider)}
                    </p>
                    <p className={`flex items-center gap-1.5 font-ui text-xs ${meta.tone}`}>
                      <span aria-hidden>{meta.glyph}</span>
                      <span>{meta.label}</span>
                    </p>
                  </div>

                  {dataState === 'catalog-only' ? (
                    <span className="shrink-0 font-ui text-xs text-text-tertiary">
                      Sign-in not yet supported
                    </span>
                  ) : dataState === 'connected' ? (
                    confirming === provider ? (
                      <span className="flex items-center gap-2">
                        <span className="font-ui text-xs text-text-tertiary">Disconnect?</span>
                        <button
                          type="button"
                          onClick={() => disconnect(provider)}
                          disabled={busy}
                          className="rounded-pill border border-state-danger/50 px-3 py-1 font-ui text-xs text-state-danger disabled:opacity-50"
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
                  ) : dataState === 'expired' ? (
                    // Recovery action for an expired link — re-auth via the connect flow.
                    <button
                      type="button"
                      onClick={() => connect(provider)}
                      disabled={busy}
                      className="shrink-0 rounded-pill border border-interactive px-3 py-1 font-ui text-xs font-semibold text-interactive disabled:opacity-50"
                    >
                      {busy ? 'Reconnecting…' : 'Reconnect'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connect(provider)}
                      disabled={busy}
                      className="shrink-0 rounded-pill rf-btn-primary px-3 py-1 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50"
                    >
                      {busy ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                </div>

                {needsPlaylistReconnect && (
                  <div className="flex flex-col gap-1.5 border-t border-interactive/10 pt-2">
                    <p className="flex items-start gap-1.5 font-ui text-xs text-state-caution">
                      <span aria-hidden>⊘</span>
                      <span>
                        Connected for library access. Reconnect to browse saved playlists.
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => connect(provider)}
                      disabled={busy}
                      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 self-start rounded-pill border border-interactive px-3 py-1 font-ui text-xs font-semibold text-interactive hover:bg-interactive/10 disabled:opacity-50"
                    >
                      <span aria-hidden>↻</span>
                      {busy ? 'Reconnecting…' : 'Reconnect to browse playlists'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="font-ui text-xs text-text-tertiary">
        Disconnecting forgets your tokens immediately and schedules removal of that provider’s
        imported references within 7 days.
      </p>
    </Dialog>
  );
}
