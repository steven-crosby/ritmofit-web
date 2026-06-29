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
  it('only offers Connect for providers with per-user accounts', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([]);

    render(<ConnectionsDialog onClose={() => {}} />);

    // SoundCloud + Spotify support per-user accounts, so each offers Connect.
    expect(await screen.findAllByRole('button', { name: 'Connect' })).toHaveLength(2);
    // Each disconnected provider shows an explicit glyph+label status, not color alone.
    expect(screen.getAllByText('Not connected').length).toBe(2);
    // Apple Music stays catalog-only — a muted state, not a dead-end Connect.
    expect(screen.getAllByText('Catalog search only').length).toBe(1);
    expect(screen.getAllByText('Sign-in not yet supported').length).toBe(1);
  });

  it('confirms before disconnecting a connected provider and refreshes after', async () => {
    vi.mocked(api.listConnections)
      .mockResolvedValueOnce([connection('soundcloud')])
      .mockResolvedValue([]);
    vi.mocked(api.disconnectProvider).mockResolvedValue(undefined);

    render(<ConnectionsDialog onClose={() => {}} />);

    expect(await screen.findByText('Connected')).toBeTruthy();

    // Disconnect is a two-step confirm so it can't be triggered by a stray click.
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(api.disconnectProvider).toHaveBeenCalledWith('soundcloud'));
    // After the refresh returns no connections, SoundCloud rejoins Spotify in
    // offering Connect (both are connect-capable).
    expect(await screen.findAllByRole('button', { name: 'Connect' })).toHaveLength(2);
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
