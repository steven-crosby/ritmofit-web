/**
 * Connection-state presentation (SPC-06 / SPC-08). Tone, name, and icon live
 * here so Dashboard Music/Account headers and ConnectionsDialog cannot drift.
 *
 * Icons are inline SVG — the same family as `SegmentIcon` — with a fixed 14px
 * box so marks align across compact headers and dialog rows. The visible label
 * is the accessible name; the icon is decorative. Color only reinforces.
 *
 * `permission` and `provider-error` stay out: the backend does not expose those
 * signals yet (SPC-09).
 */
import type { ProviderConnectionState } from '../lib/providers.js';

export type ConnectionMarkKind =
  | ProviderConnectionState
  | 'reconnecting'
  | 'checking'
  | 'unverified';

type MarkIcon = 'check' | 'warning' | 'idle' | 'catalog' | 'sync' | 'progress' | 'help';

export const CONNECTION_MARK_META: Record<
  ConnectionMarkKind,
  { label: string; tone: string; icon: MarkIcon }
> = {
  connected: { label: 'Connected', tone: 'text-state-positive', icon: 'check' },
  reconnecting: { label: 'Reconnecting…', tone: 'text-interactive', icon: 'sync' },
  expired: { label: 'Session expired', tone: 'text-state-caution', icon: 'warning' },
  disconnected: { label: 'Not connected', tone: 'text-text-tertiary', icon: 'idle' },
  'catalog-only': { label: 'Catalog search only', tone: 'text-text-tertiary', icon: 'catalog' },
  checking: { label: 'Checking', tone: 'text-text-tertiary', icon: 'progress' },
  unverified: { label: 'Unverified', tone: 'text-text-tertiary', icon: 'help' },
};

const ICON_CLASS = 'h-3.5 w-3.5 shrink-0';

function MarkIconSvg({ name }: { name: MarkIcon }) {
  switch (name) {
    case 'check':
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    case 'warning':
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      );
    case 'idle':
      return (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={ICON_CLASS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case 'catalog':
      return (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={ICON_CLASS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case 'sync':
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor">
          <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 .71-.15 1.39-.42 2.01l1.46 1.46C18.65 15.41 19 14.25 19 13c0-3.87-3.13-7-7-7zm0 12c-2.76 0-5-2.24-5-5 0-.71.15-1.39.42-2.01L6 9.53C5.35 10.59 5 11.75 5 13c0 3.87 3.13 7 7 7v3l4-4-4-4v3z" />
        </svg>
      );
    case 'progress':
      return (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={ICON_CLASS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 4a8 8 0 1 1-6.93 4" />
        </svg>
      );
    case 'help':
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={ICON_CLASS} fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
      );
  }
}

export function ConnectionStateMark({
  kind,
  label,
  className = '',
}: {
  kind: ConnectionMarkKind;
  label?: string;
  className?: string;
}) {
  const meta = CONNECTION_MARK_META[kind];
  const name = label ?? meta.label;

  return (
    <span
      data-connection-state={kind}
      className={`inline-flex items-center gap-1.5 ${meta.tone} ${className}`.trim()}
    >
      <MarkIconSvg name={meta.icon} />
      <span>{name}</span>
    </span>
  );
}

export type ConnectionFetchStatus = 'loading' | 'ready' | 'error';

/** Music Sources header: non-connected rows stay "Catalog only" (browse still works). */
export function musicConnectionMark(
  fetchStatus: ConnectionFetchStatus,
  connectionState: ProviderConnectionState,
): { kind: ConnectionMarkKind; label: string } {
  if (fetchStatus === 'loading') return { kind: 'checking', label: 'Checking' };
  if (fetchStatus === 'error') return { kind: 'unverified', label: 'Unverified' };
  if (connectionState === 'connected')
    return { kind: 'connected', label: CONNECTION_MARK_META.connected.label };
  if (connectionState === 'expired')
    return { kind: 'expired', label: CONNECTION_MARK_META.expired.label };
  return { kind: 'catalog-only', label: 'Catalog only' };
}

/** Account Music connections header: names the account link, not catalog browse. */
export function accountConnectionMark(
  fetchStatus: ConnectionFetchStatus,
  connectionState: ProviderConnectionState,
  hasConnection: boolean,
): { kind: ConnectionMarkKind; label: string } {
  if (fetchStatus === 'loading') return { kind: 'checking', label: 'Checking status' };
  if (fetchStatus === 'error') {
    return {
      kind: 'unverified',
      label: hasConnection ? 'Last known · unverified' : 'Status unavailable',
    };
  }
  if (connectionState === 'connected')
    return { kind: 'connected', label: CONNECTION_MARK_META.connected.label };
  if (connectionState === 'expired')
    return { kind: 'expired', label: CONNECTION_MARK_META.expired.label };
  return { kind: 'disconnected', label: CONNECTION_MARK_META.disconnected.label };
}
