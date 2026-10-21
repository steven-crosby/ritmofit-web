// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunPayload } from '@ritmofit/shared';
import { listConnections } from '../lib/api.js';
import { LiveMode } from './LiveMode.js';

vi.mock('../lib/api.js', () => ({
  listConnections: vi.fn(),
  connectProvider: vi.fn(),
  disconnectProvider: vi.fn(),
  getAppleMusicConfig: vi.fn(),
  connectAppleMusic: vi.fn(),
}));
vi.mock('../lib/musickit.js', () => ({
  prepareAppleMusic: vi.fn(),
}));
vi.mock('../lib/spotify-playback.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/spotify-playback.js')>()),
  getSpotifyPlayback: vi.fn(),
}));
vi.mock('../lib/playback/soundcloud-adapter.js', () => ({
  soundcloudAdapterFactory: vi.fn(),
}));

afterEach(cleanup);

const unbreakableTitle = 'W'.repeat(200);

const payload = {
  schemaVersion: 1,
  class: {
    id: '00000000-0000-4000-8000-000000000003',
    title: unbreakableTitle,
    template: 'cycle',
    targetDurationMs: null,
    timelineMode: 'sequential',
    totalDurationMs: 180000,
  },
  tracks: [
    {
      classTrackId: '00000000-0000-4000-8000-000000000001',
      position: 0,
      displayBpm: 124,
      displayRpm: null,
      holdCount: null,
      intensity: 'hard',
      startOffsetMs: 0,
      clipStartMs: 0,
      beatAnchorMs: 0,
      notes: null,
      track: {
        id: '00000000-0000-4000-8000-000000000002',
        title: 'Active Track',
        artist: 'Instructor',
        durationMs: 180000,
        baseDurationMs: 180000,
        albumArtUrl: null,
      },
      providerRefs: [],
      cues: [],
      moves: [],
    },
  ],
  sections: [],
} satisfies RunPayload;

describe('LiveMode preflight header', () => {
  beforeEach(() => {
    vi.mocked(listConnections).mockReset().mockResolvedValue([]);
  });

  it('keeps the full unbreakable title on a heading that can wrap beside Exit', async () => {
    const onExit = vi.fn();
    render(<LiveMode payload={payload} onExit={onExit} />);

    const heading = await screen.findByRole('heading', { level: 1, name: unbreakableTitle });
    expect(heading.classList.contains('min-w-0')).toBe(true);
    expect(heading.classList.contains('break-words')).toBe(true);
    expect(heading.textContent).toBe(unbreakableTitle);

    const header = heading.closest('header');
    const shell = header?.parentElement?.parentElement;
    expect(shell?.classList.contains('overflow-y-auto')).toBe(true);
    expect(header?.classList.contains('shrink-0')).toBe(true);
    expect(header?.nextElementSibling?.classList.contains('min-h-0')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
