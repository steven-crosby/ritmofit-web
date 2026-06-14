import { describe, it, expect } from 'vitest';
import { libraryView } from './library-state.js';

describe('libraryView', () => {
  it('shows loading before the first response, never a false empty', () => {
    expect(libraryView('loading', 0)).toBe('loading');
  });

  it('shows the empty prompt only once a load succeeds with no classes', () => {
    expect(libraryView('ready', 0)).toBe('empty');
  });

  it('shows an error placeholder when an empty load fails', () => {
    expect(libraryView('error', 0)).toBe('error');
  });

  it('always lists loaded classes regardless of status', () => {
    expect(libraryView('loading', 3)).toBe('list'); // mid background refresh
    expect(libraryView('ready', 3)).toBe('list');
    expect(libraryView('error', 3)).toBe('list'); // keep the list, banner shows error
  });
});
