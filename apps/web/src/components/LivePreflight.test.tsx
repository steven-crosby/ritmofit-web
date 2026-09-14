// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect(start.className).not.toContain('disabled:opacity-40');
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
