// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  RecoveryState,
  StatusLabel,
  WorkspaceLoadingState,
  type SharedStateKind,
} from './SharedState.js';

const STATUS_CASES: Array<[SharedStateKind, string, string]> = [
  ['loading', '◌', 'Loading'],
  ['empty', '−', 'Empty'],
  ['unavailable', '!', 'Unavailable'],
  ['error', '!', 'Interrupted'],
  ['update', '↻', 'Update ready'],
  ['disabled', '⊘', 'Unavailable'],
  ['retrying', '↻', 'Retrying'],
  ['recovered', '✓', 'Recovered'],
];

afterEach(cleanup);

describe('StatusLabel', () => {
  it.each(STATUS_CASES)(
    'renders %s with a visible glyph and label',
    (kind: SharedStateKind, glyph: string, label: string) => {
      render(<StatusLabel kind={kind} />);
      expect(screen.getByText(glyph)).toBeTruthy();
      expect(screen.getByText(label)).toBeTruthy();
    },
  );

  it('does not create a live region on its own', () => {
    render(<StatusLabel kind="retrying" label="Checking classes again" />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Checking classes again')).toBeTruthy();
  });
});

describe('RecoveryState', () => {
  it('keeps event, safety, primary action, and escape in reading order', () => {
    const onReload = vi.fn();
    render(
      <RecoveryState
        kind="error"
        title="The workspace lost the beat."
        event="An unexpected error interrupted this view."
        safety="Your saved class work remains on the server."
        primaryAction={<button onClick={onReload}>Reload safely</button>}
        secondaryAction={<button>Return to classes</button>}
        role="alert"
      />,
    );

    const alert = screen.getByRole('alert');
    const text = alert.textContent ?? '';
    expect(text.indexOf('interrupted this view')).toBeLessThan(
      text.indexOf('remains on the server'),
    );
    expect(text.indexOf('remains on the server')).toBeLessThan(text.indexOf('Reload safely'));
    expect(text.indexOf('Reload safely')).toBeLessThan(text.indexOf('Return to classes'));

    fireEvent.click(screen.getByRole('button', { name: 'Reload safely' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('uses a polite announcement only when the caller selects status semantics', () => {
    render(
      <RecoveryState
        kind="update"
        title="A fresh build is ready."
        event="Reload to update Ritmo Studio."
        safety="Saved classes stay unchanged."
        primaryAction={<button>Reload now</button>}
        role="status"
      />,
    );

    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  });
});

describe('WorkspaceLoadingState', () => {
  it('names the work being restored and keeps placeholder data hidden from assistive tech', () => {
    const { container } = render(<WorkspaceLoadingState />);
    const status = screen.getByRole('status');

    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Restoring your workspace…')).toBeTruthy();
    expect(screen.getByText(/Classes, music connections/)).toBeTruthy();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
