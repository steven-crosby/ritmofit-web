// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntensitySegmentedControl } from './IntensitySegmentedControl.js';

afterEach(() => {
  cleanup();
});

describe('IntensitySegmentedControl', () => {
  it('renders one toggle per zone, each labeled with its zone word', () => {
    render(
      <IntensitySegmentedControl value="mod" onChange={() => {}} ariaLabel="Track intensity" />,
    );
    expect(screen.getByRole('group', { name: 'Track intensity' })).toBeTruthy();
    for (const word of ['None', 'Build', 'Push', 'Attack', 'All Out']) {
      expect(screen.getByRole('button', { name: word })).toBeTruthy();
    }
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('carries selection on aria-pressed, not colour alone', () => {
    render(<IntensitySegmentedControl value="all_out" onChange={() => {}} ariaLabel="i" />);
    const pressed = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.getAttribute('data-zone')).toBe('all_out');
  });

  it('states the selection in words as a textual summary', () => {
    // The visible zone word drops out of the segments in a narrow inspector, so
    // the summary is what keeps the selection readable — and it is wired to the
    // group via aria-describedby rather than just sitting nearby.
    const { container } = render(
      <IntensitySegmentedControl value="hard" onChange={() => {}} ariaLabel="i" />,
    );
    const summary = screen.getByText(/Zone 3 · Attack/);
    expect(summary).toBeTruthy();
    const group = container.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-describedby')).toBe(summary.getAttribute('id'));
  });

  it('keeps zone number, bars, and word all present as separate channels', () => {
    const { container } = render(
      <IntensitySegmentedControl value="none" onChange={() => {}} ariaLabel="i" />,
    );
    const attack = screen.getByRole('button', { name: 'Attack' });
    // The numeral and the word must be separate ELEMENTS, so they are spaced by
    // layout rather than run together as "Z1Build". Asserting on textContent
    // cannot see this — it concatenates children with no separator either way.
    const numeral = attack.querySelector('.font-data');
    const word = attack.querySelector('.rf-zone-word');
    expect(numeral?.textContent).toBe('Z3');
    expect(word?.textContent).toBe('Attack');
    expect(numeral).not.toBe(word);
    // Four bar glyphs per segment, filled to the zone count.
    expect(container.querySelectorAll('[data-zone="hard"] span[style*="height"]')).toHaveLength(4);
  });

  it('emits the enum value (not the zone word) when a segment is picked', () => {
    const onChange = vi.fn();
    render(<IntensitySegmentedControl value="none" onChange={onChange} ariaLabel="i" />);
    fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
    expect(onChange).toHaveBeenCalledWith('hard');
  });

  it('moves selection with the arrow keys and wraps', () => {
    // Regression guard for the radiogroup -> toggle-button change: radios gave
    // arrow-key navigation for free, so a roving tabindex has to replace it.
    const onChange = vi.fn();
    const { container } = render(
      <IntensitySegmentedControl value="mod" onChange={onChange} ariaLabel="i" />,
    );
    const group = container.querySelector('[role="group"]')!;
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('hard');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('easy');
  });

  it('is a single tab stop, with focus resting on the selected zone', () => {
    render(<IntensitySegmentedControl value="mod" onChange={() => {}} ariaLabel="i" />);
    const tabbable = screen.getAllByRole('button').filter((b) => b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]?.getAttribute('data-zone')).toBe('mod');
  });

  it('gives every segment the shared focus ring and a 44px target', () => {
    render(<IntensitySegmentedControl value="none" onChange={() => {}} ariaLabel="i" />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('rf-focus-ring');
      expect(button.className).toContain('min-h-11');
    }
  });

  it('never uses the copper primary as a selection fill', () => {
    // Copper is identity and the one primary action; spending it here made every
    // zone read as a call to action (P1-01).
    render(<IntensitySegmentedControl value="hard" onChange={() => {}} ariaLabel="i" />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).not.toContain('rf-btn-primary');
      expect(button.className).not.toContain('bg-brand');
    }
    const selected = screen.getByRole('button', { name: 'Attack' });
    expect(selected.className).toContain('border-b-interactive');
  });
});
