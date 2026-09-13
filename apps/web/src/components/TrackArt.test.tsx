// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TrackArt } from './TrackArt.js';

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
