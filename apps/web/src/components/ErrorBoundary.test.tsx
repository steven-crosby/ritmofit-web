// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary.js';

function Boom(): never {
  throw new Error('kaboom');
}

beforeEach(() => {
  // React logs caught render errors to console.error; silence the expected noise.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeTruthy();
    expect(screen.queryByText('This view lost the beat.')).toBeNull();
  });

  it('catches a descendant render error and shows the fallback', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('This view lost the beat.')).toBeTruthy();
    expect(screen.getByText(/Unsaved changes in this view/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload safely' })).toBeTruthy();
  });

  it('uses the custom reset label and calls onReset instead of reloading', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary resetLabel="Exit live mode" onReset={onReset}>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Exit live mode' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
