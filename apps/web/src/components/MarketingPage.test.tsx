// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MarketingPage } from './MarketingPage.js';

afterEach(cleanup);

describe('MarketingPage acquisition paths', () => {
  it('keeps sign-in separate from account-creation calls to action', () => {
    const onSignIn = vi.fn();
    const onStartBuilding = vi.fn();
    render(<MarketingPage onSignIn={onSignIn} onStartBuilding={onStartBuilding} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onStartBuilding).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Start building' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Enter the private beta' }));
    expect(onStartBuilding).toHaveBeenCalledTimes(2);
  });

  it('keeps the workflow tutorial recoverable and uses the Music destination name', () => {
    render(<MarketingPage onSignIn={() => {}} onStartBuilding={() => {}} />);

    expect(screen.getAllByRole('link', { name: 'Learn the workflow' })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'Learn the workflow' })) {
      expect(link.getAttribute('href')).toBe('#class-shape');
    }
    expect(screen.getByText(/saved tracks in Music/)).toBeTruthy();
    expect(screen.queryByText(/saved tracks in Library/)).toBeNull();
  });
});
