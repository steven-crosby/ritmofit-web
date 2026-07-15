// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  SoundCloudAdapter,
  soundcloudTrackUrl,
  type SoundCloudWidget,
  type SoundCloudWidgetApi,
} from './soundcloud-adapter.js';

function makeEntry(overrides?: {
  providerTrackId?: string;
  providerUri?: string | null;
}): RunPayloadTrackEntry {
  return {
    classTrackId: 'ct-1',
    position: 0,
    displayBpm: null,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
    startOffsetMs: 0,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: 'track-1',
      title: 'Baiana',
      artist: 'Bakermat',
      durationMs: 180_000,
      albumArtUrl: null,
    },
    providerRefs: [
      {
        provider: 'soundcloud',
        providerTrackId: overrides?.providerTrackId ?? '123456',
        providerUri: overrides?.providerUri === undefined ? null : overrides.providerUri,
      },
    ],
    cues: [],
    moves: [],
  };
}

/** A scriptable stand-in for the official widget. */
class FakeWidget implements SoundCloudWidget {
  calls: string[] = [];
  private listeners = new Map<string, Array<(data?: unknown) => void>>();

  bind(eventName: string, listener: (data?: unknown) => void): void {
    const bucket = this.listeners.get(eventName) ?? [];
    bucket.push(listener);
    this.listeners.set(eventName, bucket);
  }
  unbind(eventName: string): void {
    this.listeners.delete(eventName);
  }
  emit(eventName: string, data?: unknown): void {
    for (const listener of this.listeners.get(eventName) ?? []) listener(data);
  }
  play(): void {
    this.calls.push('play');
  }
  pause(): void {
    this.calls.push('pause');
  }
  seekTo(ms: number): void {
    this.calls.push(`seekTo:${ms}`);
  }
}

function makeFakeApi() {
  const widgets: FakeWidget[] = [];
  const construct = (iframe: HTMLIFrameElement) => {
    void iframe;
    const widget = new FakeWidget();
    widgets.push(widget);
    return widget;
  };
  const api: SoundCloudWidgetApi = Object.assign(construct, {
    Events: {
      READY: 'ready',
      PLAY: 'play',
      PAUSE: 'pause',
      FINISH: 'finish',
      ERROR: 'error',
    },
  });
  return { api, widgets };
}

/** Drive a prepare to READY: wait for the widget to exist, then emit. */
async function readyUp(widgets: FakeWidget[], index = 0): Promise<void> {
  while (widgets.length <= index) await Promise.resolve();
  widgets[index]!.emit('ready');
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('soundcloudTrackUrl', () => {
  it('builds the API tracks URL from the provider track id', () => {
    expect(
      soundcloudTrackUrl({ provider: 'soundcloud', providerTrackId: '123', providerUri: null }),
    ).toBe('https://api.soundcloud.com/tracks/123');
  });

  it('prefers a stored SoundCloud https URI', () => {
    expect(
      soundcloudTrackUrl({
        provider: 'soundcloud',
        providerTrackId: '123',
        providerUri: 'https://soundcloud.com/bakermat/baiana',
      }),
    ).toBe('https://soundcloud.com/bakermat/baiana');
  });

  it('ignores non-SoundCloud or non-https URIs (old/manual ref data)', () => {
    expect(
      soundcloudTrackUrl({
        provider: 'soundcloud',
        providerTrackId: '123',
        providerUri: 'https://example.com/evil',
      }),
    ).toBe('https://api.soundcloud.com/tracks/123');
    expect(
      soundcloudTrackUrl({
        provider: 'soundcloud',
        providerTrackId: '123',
        providerUri: 'http://soundcloud.com/insecure',
      }),
    ).toBe('https://api.soundcloud.com/tracks/123');
    expect(
      soundcloudTrackUrl({
        provider: 'soundcloud',
        providerTrackId: '123',
        providerUri: 'not a url',
      }),
    ).toBe('https://api.soundcloud.com/tracks/123');
  });
});

describe('SoundCloudAdapter', () => {
  it('prepares a hidden widget iframe and resolves on READY', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await expect(prepare).resolves.toEqual({ provider: 'soundcloud', classTrackId: 'ct-1' });

    const iframe = document.querySelector('iframe')!;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain('https://w.soundcloud.com/player/');
    expect(iframe.src).toContain(encodeURIComponent('https://api.soundcloud.com/tracks/123456'));
    expect(iframe.src).toContain('auto_play=false');
    expect(iframe.getAttribute('allow')).toBe('autoplay');
    expect(iframe.getAttribute('aria-hidden')).toBe('true');
    // Hidden but alive: never display:none (browsers may refuse playback).
    expect(iframe.style.display).not.toBe('none');
    expect(iframe.style.opacity).toBe('0');
    // Cued at the window start 0 → no initial seek needed.
    expect(widgets[0]!.calls).toEqual([]);
  });

  it('cues a clipped track at its window start after READY', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 15_000, endMs: 195_000 });
    await readyUp(widgets);
    await prepare;
    expect(widgets[0]!.calls).toEqual(['seekTo:15000']);
  });

  it('waits for PLAY before resolving, then delegates pause/seek and re-cues on stop', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 15_000, endMs: 195_000 });
    await readyUp(widgets);
    await prepare;

    let started = false;
    const play = adapter.play().then(() => {
      started = true;
    });
    await Promise.resolve();
    expect(started).toBe(false);
    expect(widgets[0]!.calls).toEqual(['seekTo:15000', 'play']);
    widgets[0]!.emit('play');
    await play;
    expect(started).toBe(true);
    await adapter.seek(40_000);
    await adapter.pause();
    await adapter.stop();
    expect(widgets[0]!.calls).toEqual([
      'seekTo:15000',
      'play',
      'seekTo:40000',
      'pause',
      'pause',
      'seekTo:15000',
    ]);
  });

  it('does not miss a PLAY acknowledgement emitted synchronously by widget.play()', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;
    const widget = widgets[0]!;
    widget.play = () => {
      widget.calls.push('play');
      widget.emit('play');
    };

    await expect(adapter.play()).resolves.toBeUndefined();
    expect(widget.calls).toEqual(['play']);
  });

  it('requires a fresh PLAY acknowledgement for a resumed play attempt', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;
    const widget = widgets[0]!;

    const firstPlay = adapter.play();
    widget.emit('play');
    await firstPlay;
    await adapter.pause();

    let resumed = false;
    const resume = adapter.play().then(() => {
      resumed = true;
    });
    await Promise.resolve();
    expect(resumed).toBe(false);
    widget.emit('play');
    await resume;
    expect(resumed).toBe(true);
    expect(widget.calls).toEqual(['play', 'pause', 'play']);
  });

  it('rejects play when the widget errors before PLAY acknowledgement', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;

    const play = adapter.play();
    widgets[0]!.emit('error');
    await expect(play).rejects.toThrow(/could not start playback/i);
  });

  it('rejects play after the acknowledgement timeout', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter(
      {},
      { loadWidgetApi: () => Promise.resolve(api), playTimeoutMs: 5 },
    );
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;

    await expect(adapter.play()).rejects.toThrow(/timed out starting playback/i);
  });

  it('rejects pending play when the adapter is destroyed', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;

    const play = adapter.play();
    adapter.destroy();
    await expect(play).rejects.toThrow(/torn down while starting playback/i);
  });

  it('rejects prepare when the widget errors while loading', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    while (widgets.length === 0) await Promise.resolve();
    widgets[0]!.emit('error');
    await expect(prepare).rejects.toThrow(/could not load/i);
  });

  it('rejects prepare after the ready timeout', async () => {
    const { api } = makeFakeApi();
    const adapter = new SoundCloudAdapter(
      {},
      { loadWidgetApi: () => Promise.resolve(api), prepareTimeoutMs: 5 },
    );
    await expect(adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 })).rejects.toThrow(
      /timed out/i,
    );
  });

  it('routes post-ready widget errors and FINISH to the adapter events', async () => {
    const { api, widgets } = makeFakeApi();
    const errors: string[] = [];
    let finished = 0;
    const adapter = new SoundCloudAdapter(
      {
        onError: ({ message }) => errors.push(message),
        onFinish: () => finished++,
      },
      { loadWidgetApi: () => Promise.resolve(api) },
    );
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;

    widgets[0]!.emit('finish');
    widgets[0]!.emit('error');
    expect(finished).toBe(1);
    expect(errors).toEqual(['SoundCloud playback failed for "Baiana".']);
  });

  it('rejects prepare for a track without a SoundCloud ref', async () => {
    const { api } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const entry = { ...makeEntry(), providerRefs: [] };
    await expect(adapter.prepare(entry, { startMs: 0, endMs: 180_000 })).rejects.toThrow(
      /no SoundCloud reference/i,
    );
  });

  it('throws on control calls before prepare or after destroy', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    await expect(adapter.play()).rejects.toThrow(/not prepared/i);

    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;
    adapter.destroy();
    await expect(adapter.play()).rejects.toThrow(/not prepared/i);
  });

  it('destroy removes the iframe from the DOM', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const prepare = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets);
    await prepare;
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    adapter.destroy();
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('re-prepare tears down the previous widget iframe first', async () => {
    const { api, widgets } = makeFakeApi();
    const adapter = new SoundCloudAdapter({}, { loadWidgetApi: () => Promise.resolve(api) });
    const first = adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await readyUp(widgets, 0);
    await first;

    const second = adapter.prepare(makeEntry(), { startMs: 5_000, endMs: 185_000 });
    await readyUp(widgets, 1);
    await second;
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    expect(widgets).toHaveLength(2);
  });
});
