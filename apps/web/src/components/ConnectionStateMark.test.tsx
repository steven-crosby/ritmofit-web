// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  CONNECTION_MARK_META,
  ConnectionStateMark,
  accountConnectionMark,
  musicConnectionMark,
  type ConnectionMarkKind,
} from './ConnectionStateMark.js';

const KINDS = Object.keys(CONNECTION_MARK_META) as ConnectionMarkKind[];

afterEach(cleanup);

describe('ConnectionStateMark state matrix', () => {
  it.each(KINDS)(
    'renders %s with the centralized tone, icon, and name',
    (kind: ConnectionMarkKind) => {
      const meta = CONNECTION_MARK_META[kind];
      render(<ConnectionStateMark kind={kind} />);

      const mark = document.querySelector(`[data-connection-state="${kind}"]`);
      expect(mark).toBeTruthy();
      expect(mark?.className).toContain(meta.tone);
      expect(mark?.querySelector('svg[aria-hidden]')).toBeTruthy();
      expect(mark?.querySelector('svg')?.classList.contains('h-3.5')).toBe(true);
      expect(mark?.querySelector('svg')?.classList.contains('w-3.5')).toBe(true);
      expect(screen.getByText(meta.label)).toBeTruthy();
    },
  );

  it('lets the caller override the visible name without changing tone', () => {
    render(<ConnectionStateMark kind="unverified" label="Last known · unverified" />);
    const mark = document.querySelector('[data-connection-state="unverified"]');
    expect(mark?.className).toContain('text-text-tertiary');
    expect(screen.getByText('Last known · unverified')).toBeTruthy();
  });

  it('uses the caution channel for Session expired, never tertiary', () => {
    render(<ConnectionStateMark kind="expired" />);
    const mark = document.querySelector('[data-connection-state="expired"]');
    expect(mark?.className).toContain('text-state-caution');
    expect(mark?.className).not.toContain('text-text-tertiary');
    expect(screen.getByText('Session expired')).toBeTruthy();
  });
});

describe('musicConnectionMark', () => {
  it('maps the Music header fetch × connection matrix', () => {
    expect(musicConnectionMark('loading', 'disconnected')).toEqual({
      kind: 'checking',
      label: 'Checking',
    });
    expect(musicConnectionMark('error', 'connected')).toEqual({
      kind: 'unverified',
      label: 'Unverified',
    });
    expect(musicConnectionMark('ready', 'connected')).toEqual({
      kind: 'connected',
      label: 'Connected',
    });
    expect(musicConnectionMark('ready', 'expired')).toEqual({
      kind: 'expired',
      label: 'Session expired',
    });
    expect(musicConnectionMark('ready', 'disconnected')).toEqual({
      kind: 'catalog-only',
      label: 'Catalog only',
    });
    expect(musicConnectionMark('ready', 'catalog-only')).toEqual({
      kind: 'catalog-only',
      label: 'Catalog only',
    });
  });
});

describe('accountConnectionMark', () => {
  it('maps the Account header fetch × connection matrix', () => {
    expect(accountConnectionMark('loading', 'disconnected', false)).toEqual({
      kind: 'checking',
      label: 'Checking status',
    });
    expect(accountConnectionMark('error', 'connected', true)).toEqual({
      kind: 'unverified',
      label: 'Last known · unverified',
    });
    expect(accountConnectionMark('error', 'disconnected', false)).toEqual({
      kind: 'unverified',
      label: 'Status unavailable',
    });
    expect(accountConnectionMark('ready', 'connected', true)).toEqual({
      kind: 'connected',
      label: 'Connected',
    });
    expect(accountConnectionMark('ready', 'expired', true)).toEqual({
      kind: 'expired',
      label: 'Session expired',
    });
    expect(accountConnectionMark('ready', 'disconnected', false)).toEqual({
      kind: 'disconnected',
      label: 'Not connected',
    });
  });
});
