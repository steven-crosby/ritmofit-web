import { describe, it, expect } from 'vitest';
import {
  normalizeForMatch,
  findSameSongMatch,
  DURATION_TOLERANCE_MS,
  type MatchableTrack,
} from './same-song.js';

describe('normalizeForMatch', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeForMatch('  Hello,  World!! ')).toBe('hello world');
  });
  it('strips diacritics', () => {
    expect(normalizeForMatch('Béyoncé')).toBe('beyonce');
  });
  it('drops parenthetical and bracket noise', () => {
    expect(normalizeForMatch('Song (feat. Drake) [Remastered]')).toBe('song');
  });
  it('drops a remaster/remix version tail', () => {
    expect(normalizeForMatch('Dreams - 2004 Remaster')).toBe('dreams');
    expect(normalizeForMatch('Title - Club Remix')).toBe('title');
  });
  it('equates feat. spellings', () => {
    expect(normalizeForMatch('A ft Drake')).toBe(normalizeForMatch('A featuring Drake'));
  });
});

const track = (over: Partial<MatchableTrack> = {}): MatchableTrack => ({
  id: 't1',
  title: 'Levels',
  artist: 'Avicii',
  durationMs: 200000,
  providers: ['spotify'],
  ...over,
});

const candidate = (over: Partial<Parameters<typeof findSameSongMatch>[0]> = {}) => ({
  provider: 'soundcloud' as const,
  title: 'Levels',
  artist: 'Avicii',
  durationMs: 200000,
  ...over,
});

describe('findSameSongMatch', () => {
  it('matches the same song from a different provider', () => {
    expect(findSameSongMatch(candidate(), [track()])).toBe('t1');
  });

  it('matches across cosmetic title/artist differences', () => {
    const t = track({ title: 'Levels (Radio Edit)', artist: 'AVICII' });
    expect(findSameSongMatch(candidate(), [t])).toBe('t1');
  });

  it('never merges into a track that already has the candidate provider', () => {
    const t = track({ providers: ['spotify', 'soundcloud'] });
    expect(findSameSongMatch(candidate(), [t])).toBeNull();
  });

  it('rejects a duration mismatch beyond tolerance', () => {
    const t = track({ durationMs: 200000 });
    const c = candidate({ durationMs: 200000 + DURATION_TOLERANCE_MS + 1 });
    expect(findSameSongMatch(c, [t])).toBeNull();
  });

  it('accepts a duration within tolerance', () => {
    const t = track({ durationMs: 200000 });
    const c = candidate({ durationMs: 200000 + DURATION_TOLERANCE_MS });
    expect(findSameSongMatch(c, [t])).toBe('t1');
  });

  it('treats an unknown duration on either side as no objection', () => {
    expect(findSameSongMatch(candidate({ durationMs: null }), [track({ durationMs: 200000 })])).toBe('t1');
    expect(findSameSongMatch(candidate({ durationMs: 200000 }), [track({ durationMs: null })])).toBe('t1');
  });

  it('does not match a different song', () => {
    const t = track({ title: 'Wake Me Up' });
    expect(findSameSongMatch(candidate(), [t])).toBeNull();
  });

  it('returns null when title or artist normalizes to empty', () => {
    expect(findSameSongMatch(candidate({ title: '(((' }), [track()])).toBeNull();
  });

  it('picks the first matching track', () => {
    const a = track({ id: 'a' });
    const b = track({ id: 'b' });
    expect(findSameSongMatch(candidate(), [a, b])).toBe('a');
  });
});
