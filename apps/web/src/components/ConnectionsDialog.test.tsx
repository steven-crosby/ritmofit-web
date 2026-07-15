// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MusicConnectionView, Provider } from '@ritmofit/shared';
import { ConnectionsDialog } from './ConnectionsDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

function connection(provider: Provider): MusicConnectionView {
  return {
    id: `00000000-0000-4000-8000-00000000000${provider === 'soundcloud' ? 1 : 2}`,
    userId: 'me',
    provider,
    providerUserId: 'pu1',
    scope: null,
    expiresAt: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ConnectionsDialog capability gating', () => {
  it('offers Connect for every provider (all three are connect-capable)', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([]);

    render(<ConnectionsDialog onClose={() => {}} />);

    // SoundCloud, Spotify, and Apple Music all support a per-user account link.
    expect(await screen.findAllByRole('button', { name: 'Connect' })).toHaveLength(3);
    // Each disconnected provider shows an explicit glyph+label status, not color alone.
    expect(screen.getAllByText('Not connected').length).toBe(3);
    // No provider is a catalog-only dead end anymore.
    expect(screen.queryByText('Catalog search only')).toBeNull();
  });

  it('confirms before disconnecting a connected provider and refreshes after', async () => {
    vi.mocked(api.listConnections)
      .mockResolvedValueOnce([connection('soundcloud')])
      .mockResolvedValue([]);
    vi.mocked(api.disconnectProvider).mockResolvedValue(undefined);
    const onConnectionsChanged = vi.fn();

    render(<ConnectionsDialog onClose={() => {}} onConnectionsChanged={onConnectionsChanged} />);

    expect(await screen.findByText('Connected')).toBeTruthy();

    // Disconnect is a two-step confirm so it can't be triggered by a stray click.
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(api.disconnectProvider).toHaveBeenCalledWith('soundcloud'));
    expect(onConnectionsChanged).toHaveBeenCalledTimes(1);
    // After the refresh returns no connections, all three providers offer Connect.
    expect(await screen.findAllByRole('button', { name: 'Connect' })).toHaveLength(3);
  });

  it('shows a success notice when an OAuth round-trip connected a provider', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([connection('soundcloud')]);

    render(<ConnectionsDialog onClose={() => {}} oauthResult={{ connected: 'soundcloud' }} />);

    expect(await screen.findByText('Connected to SoundCloud.')).toBeTruthy();
  });

  it('shows a readable failure notice when an OAuth round-trip errored', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([]);

    render(<ConnectionsDialog onClose={() => {}} oauthResult={{ error: 'state_expired' }} />);

    expect(await screen.findByText('Connection failed: state expired.')).toBeTruthy();
  });
});

describe('ConnectionsDialog saved-playlist reconnect affordance', () => {
  it('prompts a reconnect when Spotify is connected but lacks the playlist scope', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('spotify'), scope: 'user-library-read streaming' },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    expect(
      await screen.findByText('Connected for library access. Reconnect to browse saved playlists.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reconnect to browse playlists/i })).toBeTruthy();
  });

  it('hides the affordance once the connection carries the playlist scope', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('spotify'), scope: 'user-library-read streaming playlist-read-private' },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    await screen.findByText('Connected');
    expect(screen.queryByText(/Reconnect to browse saved playlists/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Reconnect to browse playlists/i })).toBeNull();
  });

  it('never gates SoundCloud or Apple Music on the Spotify playlist scope', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('soundcloud'), scope: null },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    await screen.findByText('Connected');
    expect(screen.queryByText(/Reconnect to browse saved playlists/i)).toBeNull();
  });
});

describe('ConnectionsDialog playback reconnect affordance', () => {
  it('prompts a playback reconnect when Spotify is connected but lacks the streaming scope', async () => {
    // A live token that never granted `streaming` — Live preflight reports
    // `playback_reauth_required` and points the instructor here.
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('spotify'), scope: 'user-library-read' },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    expect(
      await screen.findByText(
        'Connected for library access. Reconnect to enable in-app playback in Live mode.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reconnect for playback/i })).toBeTruthy();
  });

  it('hides the affordance once the connection carries the streaming scope', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('spotify'), scope: 'user-library-read streaming playlist-read-private' },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    await screen.findByText('Connected');
    expect(screen.queryByText(/Reconnect to enable in-app playback/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Reconnect for playback/i })).toBeNull();
  });

  it('never gates SoundCloud or Apple Music on the Spotify playback scope', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('soundcloud'), scope: null },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    await screen.findByText('Connected');
    expect(screen.queryByRole('button', { name: /Reconnect for playback/i })).toBeNull();
  });

  it('shows only the playback prompt when both playback and playlist scopes are missing', async () => {
    // One reconnect grants the full current scope set, so the playback block
    // subsumes the playlist prompt — never two stacked reconnect buttons.
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...connection('spotify'), scope: 'user-library-read' },
    ]);

    render(<ConnectionsDialog onClose={() => {}} />);

    expect(await screen.findByRole('button', { name: /Reconnect for playback/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reconnect to browse playlists/i })).toBeNull();
  });
});
