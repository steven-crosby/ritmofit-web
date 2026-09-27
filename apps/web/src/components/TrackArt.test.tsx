// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ClassCoverArt, TrackArt } from './TrackArt.js';

afterEach(() => {
  cleanup();
});

describe('TrackArt', () => {
  it('renders real artwork as an empty-alt image, never the bare fallback', () => {
    const { container } = render(
      <TrackArt url="https://example.com/art.jpg" identity="Fiesta:Bad Bunny" size={44} />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/art.jpg');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('never falls back to a bare music-note character when artwork is missing', () => {
    const { container } = render(<TrackArt url={null} identity="Fiesta:Bad Bunny" size={44} />);
    expect(container.textContent).not.toContain('♪');
    expect(container.querySelector('img')).toBeNull();
    const tile = container.querySelector('[aria-hidden]');
    expect(tile).toBeTruthy();
    expect(tile?.getAttribute('style')).toContain('linear-gradient');
  });

  it('derives the same tile for the same identity every render (not random)', () => {
    const a = render(<TrackArt url={null} identity="Con Calma:Daddy Yankee" size={44} />);
    const b = render(<TrackArt url={null} identity="Con Calma:Daddy Yankee" size={44} />);
    const styleA = a.container.querySelector('[aria-hidden]')?.getAttribute('style');
    const styleB = b.container.querySelector('[aria-hidden]')?.getAttribute('style');
    expect(styleA).toBe(styleB);
    a.unmount();
    b.unmount();
  });

  it('keys the tile by BPM band, not by intensity/energy (never scored before class context)', () => {
    const slow = render(<TrackArt url={null} identity="track-a" bpm={70} size={44} />);
    const fast = render(<TrackArt url={null} identity="track-a" bpm={170} size={44} />);
    const slowStyle = slow.container.querySelector('[aria-hidden]')?.getAttribute('style');
    const fastStyle = fast.container.querySelector('[aria-hidden]')?.getAttribute('style');
    expect(slowStyle).not.toBe(fastStyle);
    slow.unmount();
    fast.unmount();
  });

  it('stays purely decorative — no accessible name is introduced', () => {
    const { container } = render(<TrackArt url={null} identity="Saltwater:where??" size={44} />);
    const tile = container.querySelector('[aria-hidden]');
    expect(tile?.hasAttribute('aria-label')).toBe(false);
    expect(tile?.getAttribute('role')).toBeNull();
  });
});

describe('ClassCoverArt', () => {
  it('sets the title on the art in ink and stays decorative', () => {
    const { container } = render(<ClassCoverArt classId="class-1" title="Monday Ride" />);
    const tile = container.firstElementChild;
    expect(tile?.getAttribute('aria-hidden')).not.toBeNull();
    expect(tile?.hasAttribute('aria-label')).toBe(false);
    const text = tile?.firstElementChild;
    expect(text?.textContent).toBe('Monday Ride');
    // White fails contrast on the light stops; ink is the text-on-copper rule.
    expect(text?.className).toContain('text-text-on-accent');
    expect(text?.className).toContain('line-clamp-2');
    // A flex tile stretches the clamped text to full height and a third line shows
    // (seen in the browser); the tile must stay a plain block.
    expect(tile?.className).toMatch(/\bblock\b/);
    expect(tile?.className).not.toMatch(/\bflex\b/);
  });

  it('uses the same gradient as the plain tile keyed by the same class id', () => {
    const cover = render(<ClassCoverArt classId="class-1" title="Anything" />);
    const tile = render(<TrackArt url={null} identity="class-1" size={44} />);
    const bg = (el: Element | null) => (el as HTMLElement | null)?.style.background;
    expect(bg(cover.container.firstElementChild)).toBe(bg(tile.container.firstElementChild));
    cover.unmount();
    tile.unmount();
  });
});
