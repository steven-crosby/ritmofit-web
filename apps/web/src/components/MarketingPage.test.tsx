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

  it('proves the creator loop with the landed Class Pulse contract', () => {
    render(<MarketingPage onSignIn={() => {}} onStartBuilding={() => {}} />);

    expect(screen.getAllByRole('link', { name: 'Learn the workflow' })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'Learn the workflow' })) {
      expect(link.getAttribute('href')).toBe('#class-shape');
    }
    expect(screen.getByRole('region', { name: 'Class Pulse' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Example class' })).toBeTruthy();
    expect(screen.getByText('27:00')).toBeTruthy();
    expect(screen.queryByText(/Saturday Heat/)).toBeNull();
    expect(screen.queryByText('40:50')).toBeNull();
    expect(screen.queryByText(/Synthetic class/)).toBeNull();
    expect(screen.queryByText(/from track efforts/i)).toBeNull();
    expect(document.getElementById('class-shape')?.className).toContain('rf-anchor-offset');
    expect(document.getElementById('product')?.className).toContain('rf-anchor-offset');
    expect(document.getElementById('studios')?.className).toContain('rf-anchor-offset');
    for (const step of ['Find', 'Shape', 'Score', 'Lead']) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/playback uses your connected provider account/i)).toBeTruthy();
    expect(screen.queryByText(/Teams|Explore|collaborators/i)).toBeNull();
  });
});
