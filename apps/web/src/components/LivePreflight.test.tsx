// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Provider } from '@ritmofit/shared';
import type {
  PreflightResult,
  PreflightTrackResult,
  UnplayableReason,
} from '../lib/playback/types.js';
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
  const onManageConnections = vi.fn();
  render(
    <LivePreflight
      preflight={preflight}
      connectionsError={connectionsError}
      onRetryConnections={() => {}}
      onManageConnections={onManageConnections}
      onStart={onStart}
      onRunWithoutMusic={onRunWithoutMusic}
    />,
  );
  return { onStart, onRunWithoutMusic, onManageConnections };
}

function failingTrack(
  position: number,
  reason: UnplayableReason,
  providers?: Provider[],
): PreflightTrackResult {
  return {
    classTrackId: `failing-${position}`,
    position,
    title: `Failing track ${position + 1}`,
    selection: { status: 'unplayable', reason, ...(providers ? { providers } : {}) },
    window,
  };
}

function blockedBy(tracks: PreflightTrackResult[]): PreflightResult {
  return {
    ok: false,
    tracks,
    unplayable: tracks.filter((track) => track.selection.status === 'unplayable'),
  };
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

describe('grouped failures with the fix beside them (RF-136)', () => {
  it('shows tracks that fail for the same reason and provider as one group with a count', () => {
    renderPreflight(
      blockedBy([
        failingTrack(0, 'no_connected_provider', ['apple_music']),
        { ...ready.tracks[0]!, classTrackId: 'passing', position: 1 },
        failingTrack(2, 'no_connected_provider', ['apple_music']),
        failingTrack(3, 'no_connected_provider', ['apple_music']),
      ]),
    );

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(1);
    expect(headings[0]!.textContent).toContain('Apple Music is not connected');
    expect(headings[0]!.textContent).toContain('3 tracks');
    // The reason and its fix are said once, not once per track.
    expect(screen.getAllByText('Connect Apple Music to play these tracks.')).toHaveLength(1);
    const tracks = screen.getByRole('list', { name: /Apple Music is not connected/ });
    expect(within(tracks).getAllByRole('listitem')).toHaveLength(3);
    expect(tracks.textContent).toContain('#1');
    expect(tracks.textContent).toContain('Failing track 4');
    // The verdict and the class-level counts are unchanged by grouping.
    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: '3 tracks need a fix before starting with music.' }),
    ).toBeTruthy();
    expect(screen.getByText('4 tracks checked · 1 passed · 3 need attention')).toBeTruthy();
  });

  it('names the provider the tracks are linked to and puts Manage connections in that group', () => {
    const { onManageConnections } = renderPreflight(
      blockedBy([failingTrack(0, 'no_connected_provider', ['apple_music'])]),
    );

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toContain('Apple Music is not connected');
    expect(heading.textContent).toContain('1 track');
    expect(screen.getByText('Connect Apple Music to play this track.')).toBeTruthy();

    // One Manage connections, inside the group and described by it; none after the list.
    const manage = screen.getAllByRole('button', { name: 'Manage connections' });
    expect(manage).toHaveLength(1);
    expect(heading.closest('li')?.contains(manage[0]!)).toBe(true);
    expect(manage[0]!.getAttribute('aria-describedby')).toBe(heading.id);
    expect(manage[0]!.className).toContain('rf-focus-ring');
    expect(manage[0]!.className).toContain('min-h-11');
    fireEvent.click(manage[0]!);
    expect(onManageConnections).toHaveBeenCalledTimes(1);
  });

  it('gives each provider and reason its own group and its own fix', () => {
    const { onManageConnections } = renderPreflight(
      blockedBy([
        failingTrack(0, 'no_connected_provider', ['apple_music']),
        failingTrack(1, 'playback_reauth_required', ['spotify']),
        failingTrack(2, 'no_connected_provider', ['apple_music']),
        failingTrack(3, 'missing_duration'),
        failingTrack(4, 'playback_reauth_required', ['spotify']),
      ]),
    );

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      expect.stringMatching(/Apple Music is not connected.*2 tracks/),
      expect.stringMatching(/Spotify needs reconnecting.*2 tracks/),
      expect.stringMatching(/No duration set.*1 track$/),
    ]);
    // Connection fixes carry the action; a builder fix carries its instruction only.
    const manage = screen.getAllByRole('button', { name: 'Manage connections' });
    expect(manage).toHaveLength(2);
    expect(headings[0]!.closest('li')?.contains(manage[0]!)).toBe(true);
    expect(headings[1]!.closest('li')?.contains(manage[1]!)).toBe(true);
    expect(within(headings[2]!.closest('li')!).queryByRole('button')).toBeNull();
    expect(screen.getByText('Enter the track duration in the builder.')).toBeTruthy();
    fireEvent.click(manage[1]!);
    expect(onManageConnections).toHaveBeenCalledTimes(1);
  });

  it('keeps Manage connections after the list when no group is fixed by a connection', () => {
    renderPreflight(blockedBy([failingTrack(0, 'missing_duration')]));
    const manage = screen.getAllByRole('button', { name: 'Manage connections' });
    expect(manage).toHaveLength(1);
    expect(manage[0]!.closest('li')).toBeNull();
  });

  it('leaves Run without music and the Blocked verdict as they were', () => {
    const { onStart, onRunWithoutMusic } = renderPreflight(
      blockedBy([
        failingTrack(0, 'no_connected_provider', ['apple_music']),
        failingTrack(1, 'no_connected_provider', ['apple_music']),
      ]),
    );
    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(screen.getByText(/Run without music keeps your cues and timer/)).toBeTruthy();
    const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Run without music' }));
    expect(onRunWithoutMusic).toHaveBeenCalledTimes(1);
  });

  it('keeps Manage connections reachable while loading and when the check fails', () => {
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
    expect(screen.getAllByRole('button', { name: 'Manage connections' })).toHaveLength(1);
    unmount();
    renderPreflight(null, 'network down');
    expect(screen.getAllByRole('button', { name: 'Manage connections' })).toHaveLength(1);
  });
});
