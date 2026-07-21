// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { providerCapabilityTruth } from '../lib/providers.js';
import { ProviderCapabilityLedger } from './ProviderCapabilityLedger.js';

afterEach(cleanup);

describe('ProviderCapabilityLedger', () => {
  it('renders the canonical verified capability vocabulary', () => {
    const truth = providerCapabilityTruth(
      'spotify',
      { expiresAt: null, scope: 'user-library-read streaming playlist-read-private' },
      1,
    );
    render(<ProviderCapabilityLedger provider="spotify" truth={truth} />);

    const ledger = screen.getByLabelText('Spotify capabilities');
    expect(within(ledger).getByText('Browse catalog')).toBeTruthy();
    expect(within(ledger).getByText('Likes & playlists ready')).toBeTruthy();
    expect(within(ledger).getByText('Authorized')).toBeTruthy();
  });

  it('uses unverified labels rather than false disconnect language', () => {
    const truth = providerCapabilityTruth('apple_music', undefined, 1, 'unverified');
    render(<ProviderCapabilityLedger provider="apple_music" truth={truth} />);

    const ledger = screen.getByLabelText('Apple Music capabilities');
    expect(within(ledger).getAllByText('Status unavailable')).toHaveLength(2);
    expect(within(ledger).queryByText(/disconnected/i)).toBeNull();
  });
});
