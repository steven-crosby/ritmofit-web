// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntensitySegmentedControl } from './IntensitySegmentedControl.js';

afterEach(() => {
  cleanup();
});

describe('IntensitySegmentedControl', () => {
  it('renders one radio per zone, each labeled with its zone number + word', () => {
    render(
      <IntensitySegmentedControl value="mod" onChange={() => {}} ariaLabel="Track intensity" />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Track intensity' });
    expect(group).toBeTruthy();
    // Five zones, with the human zone words (not the raw enum).
    for (const word of ['None', 'Build', 'Push', 'Attack', 'All Out']) {
      expect(screen.getByText(word)).toBeTruthy();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('marks the current value as checked', () => {
    render(<IntensitySegmentedControl value="all_out" onChange={() => {}} ariaLabel="i" />);
    // The radio inside the "All Out" (Z4) label is the checked one.
    const checked = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
    expect((checked[0] as HTMLInputElement).value).toBe('all_out');
  });

  it('emits the enum value (not the zone word) when a segment is picked', () => {
    const onChange = vi.fn();
    render(<IntensitySegmentedControl value="none" onChange={onChange} ariaLabel="i" />);
    // The Zn numeral is aria-hidden, so the radio's accessible name is the zone word.
    fireEvent.click(screen.getByRole('radio', { name: 'Attack' }));
    expect(onChange).toHaveBeenCalledWith('hard');
  });
});
