/**
 * SoundCloud playback adapter — wraps the official SoundCloud Widget API
 * (`https://w.soundcloud.com/player/api.js`) behind the `PlaybackAdapter`
 * contract. The widget iframe IS the player: SoundCloud owns the stream,
 * authorization, and availability, and this adapter only remote-controls it
 * (load/ready, play, pause, seekTo, finish, error). SoundCloud's streaming
 * terms are strict (music-providers.md): no direct audio streaming, no other
 * playback surface — the embedded widget is the entire integration.
 *
 * The iframe is visually hidden but kept alive in the DOM (the plan's
 * autoplay-constraint note): it needs `allow="autoplay"` plus the user gesture
 * the host's Start button provides. It is never `display:none` — some browsers
 * throttle or refuse playback in undisplayed iframes.
 */
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import type {
  AdapterEvents,
  AdapterFactory,
  PlaybackAdapter,
  PlaybackReady,
  PlaybackWindow,
  RunPayloadProviderRef,
} from './types.js';

const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js';
const WIDGET_PLAYER_ORIGIN = 'https://w.soundcloud.com/player/';
const DEFAULT_PREPARE_TIMEOUT_MS = 20_000;

/** The slice of the widget the adapter drives (the official Widget API shape). */
export interface SoundCloudWidget {
  bind(eventName: string, listener: (data?: unknown) => void): void;
  unbind(eventName: string): void;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
}

/** `window.SC.Widget`: the widget constructor plus its event-name constants. */
export interface SoundCloudWidgetApi {
  (iframe: HTMLIFrameElement): SoundCloudWidget;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    ERROR: string;
  };
}

declare global {
  interface Window {
    SC?: { Widget: SoundCloudWidgetApi };
  }
}

let widgetApiPromise: Promise<SoundCloudWidgetApi> | null = null;

/**
 * Load the official Widget API script once per page. Failures reset the cached
 * promise so a flaky network can retry on the next prepare instead of wedging
 * every future SoundCloud track.
 */
export function loadSoundCloudWidgetApi(): Promise<SoundCloudWidgetApi> {
  if (window.SC?.Widget) return Promise.resolve(window.SC.Widget);
  widgetApiPromise ??= new Promise<SoundCloudWidgetApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WIDGET_API_SRC;
    script.async = true;
    script.onload = () => {
      if (window.SC?.Widget) {
        resolve(window.SC.Widget);
      } else {
        widgetApiPromise = null;
        reject(new Error('SoundCloud player script loaded without the Widget API.'));
      }
    };
    script.onerror = () => {
      widgetApiPromise = null;
      script.remove();
      reject(new Error('The SoundCloud player failed to load.'));
    };
    document.head.appendChild(script);
  });
  return widgetApiPromise;
}

/**
 * The track URL the widget loads. Prefer the stored permalink/API URI when it
 * is really SoundCloud's (provider refs can hold old/manual data — same
 * defensive posture as `providerHandoffHref`); otherwise build the documented
 * API-tracks URL from the provider track id.
 */
export function soundcloudTrackUrl(ref: RunPayloadProviderRef): string {
  const uri = ref.providerUri?.trim();
  if (uri) {
    try {
      const url = new URL(uri);
      const isSoundCloud =
        url.hostname === 'soundcloud.com' ||
        url.hostname === 'www.soundcloud.com' ||
        url.hostname === 'api.soundcloud.com';
      if (url.protocol === 'https:' && isSoundCloud) return url.href;
    } catch {
      // Not a URL at all — fall through to the id-based form.
    }
  }
  return `https://api.soundcloud.com/tracks/${encodeURIComponent(ref.providerTrackId)}`;
}

/** Test seams: widget-API loading, iframe parent, and the ready timeout. */
export interface SoundCloudAdapterHost {
  loadWidgetApi?: () => Promise<SoundCloudWidgetApi>;
  container?: HTMLElement;
  prepareTimeoutMs?: number;
}

export class SoundCloudAdapter implements PlaybackAdapter {
  readonly provider = 'soundcloud' as const;
  private iframe: HTMLIFrameElement | null = null;
  private widget: SoundCloudWidget | null = null;
  private eventNames: SoundCloudWidgetApi['Events'] | null = null;
  private windowStartMs = 0;
  private destroyed = false;

  constructor(
    private readonly events: AdapterEvents = {},
    private readonly host: SoundCloudAdapterHost = {},
  ) {}

  /**
   * Build the hidden widget iframe for this track and resolve once the widget
   * reports READY, cued at the playback-window start. A widget that never
   * readies (network, dead track) rejects after a timeout so preflight/start
   * can surface it instead of hanging the class.
   */
  async prepare(entry: RunPayloadTrackEntry, window: PlaybackWindow): Promise<PlaybackReady> {
    const ref = entry.providerRefs.find((candidate) => candidate.provider === 'soundcloud');
    if (!ref) {
      throw new Error(`"${entry.track.title}" has no SoundCloud reference.`);
    }
    this.teardownWidget(); // re-prepare = a fresh widget, never a reused one
    this.destroyed = false;
    this.windowStartMs = window.startMs;

    const api = await (this.host.loadWidgetApi ?? loadSoundCloudWidgetApi)();
    if (this.destroyed) throw new Error('SoundCloud player was torn down while loading.');

    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      url: soundcloudTrackUrl(ref),
      auto_play: 'false',
      visual: 'false',
      show_artwork: 'false',
      show_comments: 'false',
      sharing: 'false',
      buying: 'false',
      download: 'false',
    });
    iframe.src = `${WIDGET_PLAYER_ORIGIN}?${params.toString()}`;
    iframe.setAttribute('allow', 'autoplay');
    iframe.title = `SoundCloud player: ${entry.track.title}`;
    // Visually hidden, alive, and out of the a11y/tab order — the Ritmo Studio
    // player rail is the UI; this iframe exists for the audio stream.
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '2px';
    iframe.style.height = '2px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    (this.host.container ?? document.body).appendChild(iframe);

    const widget = api(iframe);
    this.iframe = iframe;
    this.widget = widget;
    this.eventNames = api.Events;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`The SoundCloud player timed out loading "${entry.track.title}".`));
      }, this.host.prepareTimeoutMs ?? DEFAULT_PREPARE_TIMEOUT_MS);

      widget.bind(api.Events.READY, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve();
      });
      // One ERROR listener for the widget's whole life: a load-phase error
      // rejects prepare; a playback-phase error flows to the coordinator.
      widget.bind(api.Events.ERROR, () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`SoundCloud could not load "${entry.track.title}".`));
          return;
        }
        this.events.onError?.({
          message: `SoundCloud playback failed for "${entry.track.title}".`,
        });
      });
      widget.bind(api.Events.FINISH, () => this.events.onFinish?.());
    });

    if (this.destroyed) throw new Error('SoundCloud player was torn down while loading.');
    // Cue the playback window start; play() then starts inside the clip.
    if (window.startMs > 0) widget.seekTo(window.startMs);
    return { provider: 'soundcloud', classTrackId: entry.classTrackId };
  }

  async play(): Promise<void> {
    this.requireWidget().play();
  }

  async pause(): Promise<void> {
    this.requireWidget().pause();
  }

  async seek(providerMs: number): Promise<void> {
    this.requireWidget().seekTo(providerMs);
  }

  /** Halt audio and re-cue the window start (stop ≠ destroy: re-playable). */
  async stop(): Promise<void> {
    const widget = this.requireWidget();
    widget.pause();
    widget.seekTo(this.windowStartMs);
  }

  destroy(): void {
    this.destroyed = true;
    this.teardownWidget();
  }

  private requireWidget(): SoundCloudWidget {
    if (!this.widget || this.destroyed) {
      throw new Error('SoundCloud player is not prepared.');
    }
    return this.widget;
  }

  private teardownWidget(): void {
    if (this.widget && this.eventNames) {
      try {
        this.widget.unbind(this.eventNames.READY);
        this.widget.unbind(this.eventNames.ERROR);
        this.widget.unbind(this.eventNames.FINISH);
      } catch {
        // The iframe removal below tears the widget down regardless.
      }
    }
    this.iframe?.remove();
    this.iframe = null;
    this.widget = null;
    this.eventNames = null;
  }
}

/** Registry entry for the runtime coordinator. */
export const soundcloudAdapterFactory: AdapterFactory = (events) => new SoundCloudAdapter(events);
