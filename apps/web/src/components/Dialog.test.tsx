// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Dialog } from './Dialog.js';

afterEach(cleanup);

/** A dialog with three buttons, mounted under a real `#root` so the inert
 *  background behavior (which targets `#root`) is exercised. */
function renderDialog(onClose = vi.fn()) {
  const root = document.createElement('div');
  root.id = 'root';
  const trigger = document.createElement('button');
  trigger.textContent = 'trigger';
  root.appendChild(trigger);
  document.body.appendChild(root);
  trigger.focus();

  const utils = render(
    <Dialog onClose={onClose} label="Test dialog" panelClassName="panel">
      <button>one</button>
      <button>two</button>
      <button>three</button>
    </Dialog>,
  );
  return { onClose, trigger, root, ...utils };
}

afterEach(() => {
  document.getElementById('root')?.remove();
});

describe('Dialog', () => {
  it('moves focus to the first focusable on open', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'one' }));
  });

  it('marks the app root inert and aria-hidden while open, and restores on close', () => {
    const { root, unmount } = renderDialog();
    expect(root.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    unmount();
    expect(root.hasAttribute('inert')).toBe(false);
    expect(root.hasAttribute('aria-hidden')).toBe(false);
  });

  it('traps Tab from the last element back to the first', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    screen.getByRole('button', { name: 'three' }).focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'one' }));
  });

  it('traps Shift+Tab from the first element back to the last', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    screen.getByRole('button', { name: 'one' }).focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'three' }));
  });

  it('closes on Escape', () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop mousedown but not on panel mousedown', () => {
    const { onClose } = renderDialog();
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(screen.getByRole('button', { name: 'one' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(dialog); // the overlay itself
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pulls focus back into the dialog when its focused control is removed', () => {
    vi.useFakeTimers();
    try {
      renderDialog();
      const one = screen.getByRole('button', { name: 'one' });
      one.focus();
      // Simulate the focused control being removed by an in-dialog action,
      // which drops focus to <body> (outside the dialog).
      one.remove();
      fireEvent.focusOut(screen.getByRole('dialog'));
      vi.runAllTimers();
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns focus to the triggering element on close', () => {
    const { trigger, unmount } = renderDialog();
    unmount();
    expect(document.activeElement).toBe(trigger);
  });
});
