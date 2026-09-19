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
    expect(screen.getByRole('button', { name: 'Create class' })).toHaveProperty('disabled', true);
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
});
