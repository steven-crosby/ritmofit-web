/**
 * Music › Songs inline row player (RF-172; owner chose the inline row player on
 * 2026-11-04). Tapping a song's ▶ artwork mounts this under its row and starts
 * the whole song through the same official-SDK adapters as the builder preview
 * (`PreviewPlaybackController`), using `songPreviewEntry` so nothing is imported,
 * attached or cached. One row plays at a time: the parent mounts one player, and
 * unmounting it releases the provider SDK.
 *
 * Lazy-loaded by Dashboard (the playback stack stays out of the startup bundle).
 * `play()` runs in the mount effect, which React flushes inside the ▶ click, so
 * the provider still sees the tap as the user gesture.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MusicConnectionView, TrackSearchResult } from '@ritmofit/shared';
import { selectProvider } from '../lib/playback/coordinator.js';
import { PreviewPlaybackController, type PreviewStatus } from '../lib/playback/preview.js';
import type { UnplayableReason } from '../lib/playback/types.js';
import { PLAYBACK_ADAPTERS, PLAYBACK_ADAPTER_PROVIDERS } from '../lib/playback/registry.js';
import { providerLabel } from '../lib/providers.js';
import { errMessage } from '../lib/errors.js';
import { previewClock, songPreviewEntry } from '../lib/song-preview.js';

function unplayableText(reason: UnplayableReason, provider: string): string {
  switch (reason) {
    case 'no_connected_provider':
      return `Connect ${provider} to preview this song.`;
    case 'playback_reauth_required':
      return 'Reconnect Spotify for playback to preview this song.';
    case 'provider_not_playable':
      return `${provider} songs can’t play in Ritmo yet.`;
    default:
      return 'This song can’t be previewed.';
  }
}

export function SongRowPreview({
  track,
  connections,
  onStop,
}: {
  track: TrackSearchResult;
  connections: readonly MusicConnectionView[];
  onStop: () => void;
}) {
  const [status, setStatus] = useState<PreviewStatus>({ kind: 'idle' });
  const [elapsedMs, setElapsedMs] = useState(0);
  const controllerRef = useRef<PreviewPlaybackController | null>(null);
  const baseRef = useRef(0);
  const startRef = useRef(0);
  const shownRef = useRef(0);
  const [entry] = useState(() => songPreviewEntry(track));
  const [selection] = useState(() =>
    selectProvider(entry, [...connections], {
      now: Date.now(),
      availableProviders: PLAYBACK_ADAPTER_PROVIDERS,
    }),
  );
  const playable = selection.status === 'playable';
  const playing = status.kind === 'playing';

  const restartClock = () => {
    baseRef.current = 0;
    shownRef.current = 0;
    setElapsedMs(0);
  };

  useEffect(() => {
    if (!playable) return;
    const controller = new PreviewPlaybackController([...connections], {
      now: () => Date.now(),
      adapters: PLAYBACK_ADAPTERS,
      availableProviders: PLAYBACK_ADAPTER_PROVIDERS,
      onStatus: setStatus,
    });
    controllerRef.current = controller;
    void controller.play(entry);
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // One controller per mounted row: the parent remounts this for another song.
  }, []);

  // Host clock while playing, as in the builder preview: the controller stops at
  // the song's end from `tick`, and the elapsed time updates four times a second.
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    let raf = 0;
    const frame = () => {
      const elapsed = baseRef.current + (performance.now() - startRef.current);
      if (elapsed - shownRef.current >= 250) {
        shownRef.current = elapsed;
        setElapsedMs(elapsed);
      }
      void controllerRef.current?.tick(elapsed);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      baseRef.current += performance.now() - startRef.current;
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  const playAgain = useCallback(() => {
    restartClock();
    void controllerRef.current?.play(entry);
  }, [entry]);

  const label = providerLabel(track.provider);
  let line: string;
  if (selection.status !== 'playable') line = unplayableText(selection.reason, label);
  else if (status.kind === 'idle' || status.kind === 'preparing') line = `Starting on ${label}…`;
  else if (status.kind === 'awaiting_authorization')
    line = `Waiting for ${providerLabel(status.provider)} sign-in…`;
  else if (status.kind === 'playing' || status.kind === 'paused')
    line = `Playing on ${providerLabel(status.provider)} · ${previewClock(elapsedMs)}${
      track.durationMs ? ` / ${previewClock(track.durationMs)}` : ''
    }`;
  else if (status.kind === 'ended') line = 'Preview ended.';
  else line = errMessage(status.error.message);

  const failed = status.kind === 'error';
  const button =
    'min-h-11 rounded-control px-3 font-ui text-xs font-semibold rf-focus-ring sm:rounded-pill';

  return (
    <div
      role="group"
      aria-label={`Preview of ${track.title}`}
      className="ml-14 mt-1 flex min-w-0 flex-wrap items-center gap-2 pb-1"
    >
      <p
        role={failed ? 'alert' : 'status'}
        className={`min-w-0 flex-1 font-data text-xs ${
          failed || !playable ? 'text-state-caution' : 'text-text-secondary'
        }`}
      >
        {line}
      </p>
      {playable && (status.kind === 'ended' || failed) && (
        <button
          type="button"
          onClick={playAgain}
          className={`${button} border border-interactive text-interactive hover:bg-interactive/10`}
        >
          Play again
        </button>
      )}
      <button
        type="button"
        onClick={onStop}
        className={`${button} text-text-secondary hover:text-text-primary`}
      >
        {playable && status.kind !== 'ended' && !failed ? 'Stop' : 'Close'}
      </button>
    </div>
  );
}
