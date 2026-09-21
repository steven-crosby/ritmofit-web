// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Class } from '@ritmofit/shared';
import { CreateClassDialog } from './CreateClassDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

function renderDialog(onCreated = vi.fn(), onClose = vi.fn(), onError = vi.fn()) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  const utils = render(
    <CreateClassDialog onClose={onClose} onCreated={onCreated} onError={onError} />,
  );
  return { onCreated, onClose, onError, ...utils };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.getElementById('root')?.remove();
});

describe('CreateClassDialog', () => {
  it('preselects 45 minutes and focuses the title', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByLabelText('Class title'));
    expect(screen.getByRole('button', { name: '45 min' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    // The submit stays operable so a click always answers, and so it stays in
    // the keyboard tab order — a disabled button is skipped entirely.
    expect(screen.getByRole('button', { name: 'Create class' })).toHaveProperty('disabled', false);
  });

  it('names the missing title instead of dead-ending, and recovers on typing', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    expect(await screen.findByText(/Name the class so you can find it again\./)).toBeTruthy();
    const title = screen.getByLabelText('Class title');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(title);
    expect(api.createClass).not.toHaveBeenCalled();

    fireEvent.change(title, { target: { value: 'Saturday ride' } });
    expect(screen.queryByText(/Name the class so you can find it again\./)).toBeNull();
    expect(title.getAttribute('aria-invalid')).toBe('false');
  });

  it('names the missing discipline instead of dead-ending', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Class title'), { target: { value: 'Saturday ride' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    expect(
      await screen.findByText(
        /Pick a discipline — it names the movement language and the class clock\./,
      ),
    ).toBeTruthy();
    expect(api.createClass).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    expect(
      screen.queryByText(
        /Pick a discipline — it names the movement language and the class clock\./,
      ),
    ).toBeNull();
  });

  it('creates a scaffold from discipline and duration', async () => {
    const created = { id: 'class-1', title: 'Saturday ride' } as Class;
    vi.mocked(api.createClass).mockResolvedValue(created);
    const { onCreated, onClose } = renderDialog();

    fireEvent.change(screen.getByLabelText('Class title'), {
      target: { value: 'Saturday ride' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pilates' }));
    fireEvent.click(screen.getByRole('button', { name: '30 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    await waitFor(() =>
      expect(api.createClass).toHaveBeenCalledWith({
        mode: 'scaffold',
        title: 'Saturday ride',
        recipeId: 'pilates_30_v1',
      }),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the empty path quiet and explicit', async () => {
    vi.mocked(api.createClass).mockResolvedValue({ id: 'empty-1' } as Class);
    renderDialog();

    fireEvent.change(screen.getByLabelText('Class title'), { target: { value: 'Blank HIIT' } });
    fireEvent.click(screen.getByRole('button', { name: 'HIIT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start empty instead' }));

    await waitFor(() =>
      expect(api.createClass).toHaveBeenCalledWith({
        mode: 'empty',
        title: 'Blank HIIT',
        template: 'hiit',
        targetDurationMs: 45 * 60_000,
      }),
    );
  });

  it('closes on Escape without creating', () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.createClass).not.toHaveBeenCalled();
  });

  it('leads with the empty path when that is what was asked for', async () => {
    vi.mocked(api.createClass).mockResolvedValue({ id: 'empty-2' } as Class);
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    render(
      <CreateClassDialog mode="empty" onClose={vi.fn()} onCreated={vi.fn()} onError={vi.fn()} />,
    );

    // The panel answers the question the instructor actually asked.
    expect(screen.getByRole('heading', { name: 'Start with an empty class' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create empty class' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use a teaching plan instead' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Class title'), { target: { value: 'Blank Cycle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create empty class' }));

    await waitFor(() =>
      expect(api.createClass).toHaveBeenCalledWith({
        mode: 'empty',
        title: 'Blank Cycle',
        template: 'cycle',
        targetDurationMs: 45 * 60_000,
      }),
    );
  });

  it('still offers the scaffold from the empty panel', async () => {
    vi.mocked(api.createClass).mockResolvedValue({ id: 'scaffold-2' } as Class);
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    render(
      <CreateClassDialog mode="empty" onClose={vi.fn()} onCreated={vi.fn()} onError={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Class title'), { target: { value: 'Planned Cycle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use a teaching plan instead' }));

    await waitFor(() =>
      expect(api.createClass).toHaveBeenCalledWith({
        mode: 'scaffold',
        title: 'Planned Cycle',
        recipeId: 'cycle_45_v1',
      }),
    );
  });
});
