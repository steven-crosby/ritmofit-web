// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NotFound } from './NotFound.js';

afterEach(cleanup);

describe('NotFound', () => {
  it('offers one safe product return without dormant destinations', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: 'This beat is off the map.' })).toBeTruthy();
    expect(screen.getByText(/did not change saved classes, account settings/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Ritmo Studio' }).getAttribute('href')).toBe(
      '/',
    );
    expect(screen.queryByText(/Explore|Teams|community/i)).toBeNull();
  });
});
