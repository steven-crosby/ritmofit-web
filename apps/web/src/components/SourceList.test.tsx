// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TrackSearchResult } from '@ritmofit/shared';
import { SourceList, sourceCandidateKey } from './SourceList.js';

const track: TrackSearchResult = {
  provider: 'soundcloud',
  providerTrackId: 'source-1',
  providerUri: 'https://soundcloud.com/ritmo/source-1',
  title: 'Long multilingual climb · Subida mañana',
  artist: 'Marisol Vega',
  durationMs: 243000,
  albumArtUrl: 'https://art.example/source-1.jpg',
};

afterEach(cleanup);

describe('SourceList shared consumer grammar', () => {
  it('keeps source identity, artwork, duration, and provider handoff identical for Builder and Music', () => {
    const { rerender } = render(
      <SourceList
        tracks={[track]}
        action={{
          kind: 'import',
          addedKeys: new Set(),
          busyKey: null,
          bulkBusy: false,
          onAdd: vi.fn(),
        }}
      />,
    );

    const builderIdentity = {
      title: screen.getByText(track.title).textContent,
      artist: screen.getByText(track.artist).textContent,
      duration: screen.getByText('4:03').textContent,
      art: screen.getByRole('presentation').getAttribute('src'),
      href: screen.getByRole('link').getAttribute('href'),
    };

    rerender(
      <SourceList
        tracks={[track]}
        action={{
          kind: 'selection',
          selectedKeys: new Set(),
          selectedTracks: [],
          onToggle: vi.fn(),
          tray: {
            title: 'New music class',
            template: 'cycle',
            templateControl: <span>Cycle</span>,
            primaryLabel: 'Start class',
            primaryBusyLabel: 'Starting…',
            primaryBusy: false,
            onPrimary: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByText(track.title).textContent).toBe(builderIdentity.title);
    expect(screen.getByText(track.artist).textContent).toBe(builderIdentity.artist);
    expect(screen.getByText('4:03').textContent).toBe(builderIdentity.duration);
    expect(screen.getByRole('presentation').getAttribute('src')).toBe(builderIdentity.art);
    expect(screen.getByRole('link').getAttribute('href')).toBe(builderIdentity.href);
  });

  it('lets the checkbox and row control the same selection and announces the tray count', () => {
    const onToggle = vi.fn();
    render(
      <SourceList
        tracks={[track]}
        action={{
          kind: 'selection',
          selectedKeys: new Set([sourceCandidateKey(track)]),
          selectedTracks: [track],
          onToggle,
          tray: {
            title: 'Climb set',
            template: 'cycle',
            templateControl: <span>Cycle</span>,
            primaryLabel: 'Start class',
            primaryBusyLabel: 'Starting…',
            primaryBusy: false,
            onPrimary: vi.fn(),
          },
        }}
      />,
    );

    const removeName = `Remove ${track.title} by ${track.artist} from selection`;
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: `${track.title} by ${track.artist} selected; toggle selection`,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: removeName }));

    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toContain('1 selected');
    expect(screen.getByRole('status').textContent).toContain('4:03 total');
  });
});
