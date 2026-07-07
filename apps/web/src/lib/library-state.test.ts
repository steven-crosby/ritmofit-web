import { describe, it, expect } from 'vitest';
import type { ClassListItem } from '@ritmofit/shared';
import { libraryView, organizeClasses } from './library-state.js';

/** A fully-valid `ClassListItem` with sane defaults; override only what a test cares about. */
function makeClass(overrides: Partial<ClassListItem> = {}): ClassListItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    ownerUserId: 'user-1',
    title: 'Untitled',
    description: null,
    template: null,
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    lastOpenedAt: null,
    accessLevel: 'owner',
    trackCount: 0,
    totalDurationMs: 0,
    albumArtUrls: [],
    ...overrides,
  };
}

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

describe('organizeClasses', () => {
  const titles = (list: ClassListItem[]) => list.map((c) => c.title);

  it('passes every class through untouched when the query is blank', () => {
    const input = [makeClass({ title: 'A' }), makeClass({ title: 'B' })];
    const out = organizeClasses(input, { query: '   ', sort: 'recently_updated' });
    expect(titles(out)).toEqual(['A', 'B']);
  });

  it('does not mutate the input array', () => {
    const input = [
      makeClass({ title: 'B', updatedAt: 1 }),
      makeClass({ title: 'A', updatedAt: 2 }),
    ];
    const snapshot = titles(input);
    organizeClasses(input, { query: '', sort: 'title' });
    expect(titles(input)).toEqual(snapshot);
  });

  it('matches titles case- and diacritic-insensitively', () => {
    const input = [makeClass({ title: 'Sunrise Pilátes' }), makeClass({ title: 'Night Ride' })];
    const out = organizeClasses(input, { query: 'pilates', sort: 'recently_updated' });
    expect(titles(out)).toEqual(['Sunrise Pilátes']);
  });

  it('finds a class by its template — human label or stored enum value', () => {
    const input = [
      makeClass({ title: 'Core', template: 'sculpt' }),
      makeClass({ title: 'Climb', template: 'cycle' }),
    ];
    // "sculpt" is stored, "Pilates" is what the user sees — both should hit the same class.
    expect(titles(organizeClasses(input, { query: 'pilates', sort: 'recently_updated' }))).toEqual([
      'Core',
    ]);
    expect(titles(organizeClasses(input, { query: 'sculpt', sort: 'recently_updated' }))).toEqual([
      'Core',
    ]);
  });

  it('requires every whitespace token to match (AND semantics)', () => {
    const input = [
      makeClass({ title: 'Morning Cycle', template: 'cycle' }),
      makeClass({ title: 'Morning Pilates', template: 'sculpt' }),
    ];
    const out = organizeClasses(input, { query: 'morning cycle', sort: 'recently_updated' });
    expect(titles(out)).toEqual(['Morning Cycle']);
  });

  it('sorts by title A–Z ignoring case', () => {
    const input = [makeClass({ title: 'banana' }), makeClass({ title: 'Apple' })];
    expect(titles(organizeClasses(input, { query: '', sort: 'title' }))).toEqual([
      'Apple',
      'banana',
    ]);
  });

  it('sorts most-recently-opened first and sinks never-opened classes', () => {
    const input = [
      makeClass({ title: 'never', lastOpenedAt: null }),
      makeClass({ title: 'older', lastOpenedAt: 100 }),
      makeClass({ title: 'newer', lastOpenedAt: 200 }),
    ];
    expect(titles(organizeClasses(input, { query: '', sort: 'recently_opened' }))).toEqual([
      'newer',
      'older',
      'never',
    ]);
  });

  it('sorts by longest runtime and by most tracks', () => {
    const input = [
      makeClass({ title: 'short', totalDurationMs: 1000, trackCount: 8 }),
      makeClass({ title: 'long', totalDurationMs: 5000, trackCount: 2 }),
    ];
    expect(titles(organizeClasses(input, { query: '', sort: 'longest' }))).toEqual([
      'long',
      'short',
    ]);
    expect(titles(organizeClasses(input, { query: '', sort: 'most_tracks' }))).toEqual([
      'short',
      'long',
    ]);
  });

  it('keeps server order on ties (stable sort under recently_updated)', () => {
    const input = [
      makeClass({ title: 'first', updatedAt: 5 }),
      makeClass({ title: 'second', updatedAt: 5 }),
      makeClass({ title: 'third', updatedAt: 5 }),
    ];
    expect(titles(organizeClasses(input, { query: '', sort: 'recently_updated' }))).toEqual([
      'first',
      'second',
      'third',
    ]);
  });
});
