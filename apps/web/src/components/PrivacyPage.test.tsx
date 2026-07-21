// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PrivacyPage } from './PrivacyPage.js';

afterEach(cleanup);

describe('PrivacyPage', () => {
  it('separates Ritmo data from provider-owned audio using existing policy substance', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { name: 'Privacy without mystery.' })).toBeTruthy();
    expect(screen.getByText('Ritmo keeps the class plan')).toBeTruthy();
    expect(screen.getByText('Providers own the audio')).toBeTruthy();
    expect(
      screen.getByText(/does not download, proxy, mix, analyze, or cache provider audio/),
    ).toBeTruthy();
    expect(screen.queryByText(/Sign in with Apple/i)).toBeNull();
  });
});
