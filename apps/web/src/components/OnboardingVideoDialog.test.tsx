// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { OnboardingVideoDialog } from './OnboardingVideoDialog.js';

afterEach(cleanup);

describe('OnboardingVideoDialog', () => {
  it('keeps the four creator starts inspectable and permanently skippable by its owner', () => {
    const onClose = vi.fn();
    render(<OnboardingVideoDialog onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'New instructor four-count tutorial' });
    for (const step of ['1 · Find', '2 · Shape', '3 · Score', '4 · Lead']) {
      expect(within(dialog).getByText(step)).toBeTruthy();
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Skip tutorial' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
