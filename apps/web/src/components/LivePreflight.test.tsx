// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { PreflightResult } from '../lib/playback/types.js';
import { DISABLED_CONTROL_CLASS, LivePreflight } from './LivePreflight.js';

afterEach(cleanup);

const window = { startMs: 0, endMs: 180000 };

const blocked: PreflightResult = {
  ok: false,
  tracks: [
    {
      classTrackId: '00000000-0000-4000-8000-000000000001',
      position: 0,
      title: 'Blocked Track',
      selection: { status: 'unplayable', reason: 'no_connected_provider' },
      window,
    },
  ],
  unplayable: [
    {
      classTrackId: '00000000-0000-4000-8000-000000000001',
      position: 0,
      title: 'Blocked Track',
      selection: { status: 'unplayable', reason: 'no_connected_provider' },
      window,
    },
  ],
};

const ready: PreflightResult = {
  ok: true,
  tracks: [
    {
      classTrackId: '00000000-0000-4000-8000-000000000001',
      position: 0,
      title: 'Ready Track',
      selection: {
        status: 'playable',
        provider: 'soundcloud',
        ref: {
          provider: 'soundcloud',
          providerTrackId: 'soundcloud-id',
          providerUri: null,
        },
      },
      window,
    },
  ],
  unplayable: [],
};

function renderPreflight(
  preflight: PreflightResult | null,
  connectionsError: string | null = null,
) {
  const onStart = vi.fn();
  const onRunWithoutMusic = vi.fn();
  render(
    <LivePreflight
      preflight={preflight}
      connectionsError={connectionsError}
      onRetryConnections={() => {}}
      onManageConnections={() => {}}
      onStart={onStart}
      onRunWithoutMusic={onRunWithoutMusic}
    />,
  );
  return { onStart, onRunWithoutMusic };
}

describe('LivePreflight Start class (SPC-19)', () => {
  it('applies the documented 40% disabled treatment with native disabled semantics', () => {
    const { onStart } = renderPreflight(blocked);
    const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;

    expect(start.disabled).toBe(true);
    expect(start.className).toContain(DISABLED_CONTROL_CLASS);
    expect(start.className).toContain('disabled:opacity-40');
    expect(start.className).toContain('disabled:pointer-events-none');
    // Color is not the only signal: readable secondary text + opacity, not tertiary-only.
    expect(start.className).toContain('text-text-secondary');
    expect(start.className).not.toContain('text-text-tertiary');

    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('keeps the same disabled treatment while connections are still loading', () => {
    const { onStart } = renderPreflight(null);
    const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;

    expect(start.disabled).toBe(true);
    expect(start.className).toContain('disabled:opacity-40');
    expect(start.className).toContain('disabled:pointer-events-none');
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('keeps the same disabled treatment when the connection check fails', () => {
    const { onStart, onRunWithoutMusic } = renderPreflight(null, 'network down');
    const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;

    expect(start.disabled).toBe(true);
    expect(start.className).toContain('disabled:opacity-40');
    expect(start.className).toContain('disabled:pointer-events-none');
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();

    const prompter = screen.getByRole('button', { name: 'Run without music' });
    expect((prompter as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(prompter);
    expect(onRunWithoutMusic).toHaveBeenCalledTimes(1);
  });

  it('enables Start class as the primary action when preflight passes', () => {
    const { onStart } = renderPreflight(ready);
    const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;

    expect(start.disabled).toBe(false);
    expect(start.className).toContain('rf-btn-primary');

    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('truthful browser preflight', () => {
  it('holds music Start for browser consent even when every track passes static checks', () => {
    const onStart = vi.fn();
    const onRunWithoutMusic = vi.fn();
    render(
      <LivePreflight
        preflight={ready}
        connectionsError={null}
        onRetryConnections={() => {}}
        onManageConnections={() => {}}
        onStart={onStart}
        onRunWithoutMusic={onRunWithoutMusic}
        browserAuthorizationReady={false}
        browserAuthorization={<p>Consent required</p>}
      />,
    );
    expect(
      (screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Run without music' }));
    expect(onRunWithoutMusic).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: 'Check music authorization to start' }),
    ).toBeTruthy();
    expect(screen.getByText('1 track checked · 1 passed · 0 need attention')).toBeTruthy();
    const caveat = screen.getByText(/Playback availability and audible output are unverified/);
    expect(caveat.closest('details')?.open).toBe(false);
    expect(screen.getByRole('button', { name: 'Manage connections' })).toBeTruthy();
    expect(screen.queryByText(/hands-free/)).toBeNull();
  });
});

describe('actionable preflight results', () => {
  it('counts all 15 checked tracks and puts the one needing attention before 14 passing tracks', () => {
    const passing = Array.from({ length: 14 }, (_, position) => ({
      ...ready.tracks[0]!,
      classTrackId: `passing-${position}`,
      position,
      title: `Passing track ${position + 1}`,
    }));
    const needsAttention = { ...blocked.tracks[0]!, position: 14 };
    renderPreflight({
      ok: false,
      tracks: [...passing, needsAttention],
      unplayable: [needsAttention],
    });

    expect(
      screen.getByRole('heading', { name: '1 track needs a fix before starting with music.' }),
    ).toBeTruthy();
    expect(screen.getByText('15 tracks checked · 14 passed · 1 needs attention')).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Track playback check' });
    const rows = within(list).getAllByRole('listitem');
    // Query the track rows themselves rather than their containing groups.
    expect(rows.find((row) => row.tagName === 'LI')?.textContent).toContain('Blocked Track');
    expect(within(list).getByText('#15')).toBeTruthy();
    const passedSummary = screen.getByText('14 tracks passed checks');
    const disclosure = passedSummary.closest('details');
    expect(disclosure).not.toBeNull();
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.querySelectorAll('li')).toHaveLength(14);
    expect(screen.getByText(/Run without music keeps your cues and timer/)).toBeTruthy();
    expect(screen.queryByText(/prompter-only/i)).toBeNull();
  });

  it('states an all-pass class once: one status line, one Start class, no repeated passed', () => {
    const two: PreflightResult = {
      ok: true,
      tracks: [ready.tracks[0]!, { ...ready.tracks[0]!, classTrackId: 'second', position: 1 }],
      unplayable: [],
    };
    renderPreflight(two);
    expect(screen.getByRole('heading', { name: '2 of 2 tracks ready' })).toBeTruthy();
    expect(document.body.textContent?.match(/passed/gi) ?? []).toHaveLength(0);
    expect(screen.getAllByText('Start class')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Start class' }).className).toContain(
      'rf-btn-primary',
    );
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();
    const details = screen.getByText('Track details').closest('details');
    expect(details?.open).toBe(false);
    expect(details?.querySelectorAll('li')).toHaveLength(2);
  });

  it('keeps all-pass results inspectable without an empty needs-attention card', () => {
    renderPreflight(ready);
    expect(screen.getByRole('heading', { name: '1 of 1 track ready' })).toBeTruthy();
    expect(screen.queryByText(/tracks? checked/)).toBeNull();
    expect(screen.getByText('Track details').closest('details')).not.toBeNull();
    expect(screen.queryByText('Needs attention before music can start')).toBeNull();
    expect(screen.queryByText('No tracks in this group.')).toBeNull();
  });

  it('counts an all-blocked class as checked and omits an empty passed group', () => {
    renderPreflight(blocked);
    expect(
      screen.getByRole('heading', { name: '1 track needs a fix before starting with music.' }),
    ).toBeTruthy();
    expect(screen.getByText('1 track checked · 0 passed · 1 needs attention')).toBeTruthy();
    expect(screen.getByText('Needs attention before music can start')).toBeTruthy();
    expect(screen.queryByText(/tracks? passed checks/)).toBeNull();
    expect(screen.queryByText('No tracks in this group.')).toBeNull();
  });

  it('keeps connection loading and failure distinct from completed track checks', () => {
    const { unmount } = render(
      <LivePreflight
        preflight={null}
        connectionsError={null}
        onRetryConnections={() => {}}
        onManageConnections={() => {}}
        onStart={() => {}}
        onRunWithoutMusic={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Checking readiness' })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Track playback check' })).toBeNull();
    unmount();

    renderPreflight(null, 'network down');
    expect(screen.getByRole('heading', { name: 'Retry the connection check' })).toBeTruthy();
    expect(screen.getByText('Runnable with warnings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry check' })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Track playback check' })).toBeNull();
  });
});
