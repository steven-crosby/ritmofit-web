import { useEffect, useRef, useState } from 'react';
import {
  activateSpotifyPlayback,
  getSpotifyPlayback,
  isSpotifyPlaybackActivated,
  type SpotifyPlayer,
} from './spotify-playback.js';

/** Prepare the device without audio, then activate synchronously from a fresh tap. */
export function useSpotifyActivation() {
  const player = useRef<SpotifyPlayer | null>(null);
  const epoch = useRef(0);
  const busy = useRef(false);
  const [stage, setStage] = useState<'idle' | 'preparing' | 'ready' | 'activating' | 'active'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const cancel = () => {
    epoch.current++;
    busy.current = false;
    clearTimeout(timer.current);
    setStage('idle');
    setError(null);
  };
  useEffect(
    () => () => {
      epoch.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  const start = async () => {
    if (busy.current) return;
    const id = ++epoch.current;
    busy.current = true;
    setError(null);
    const current = () => epoch.current === id;
    timer.current = setTimeout(() => {
      if (!current()) return;
      epoch.current++;
      busy.current = false;
      setStage('idle');
      setError(
        'Spotify did not finish preparing or activating. Retry, or reload if it remains stuck.',
      );
    }, 20_000);
    try {
      if (!player.current) {
        setStage('preparing');
        const playback = await getSpotifyPlayback();
        if (!current()) return;
        player.current = playback.player;
        setStage('ready');
      } else {
        setStage('activating');
        // No await before this call: it must inherit this tap's browser activation.
        await activateSpotifyPlayback(player.current);
        if (!current()) {
          return;
        }
        setStage('active');
      }
    } catch (cause) {
      if (current()) {
        setStage(player.current ? 'ready' : 'idle');
        setError(cause instanceof Error ? cause.message : 'Could not enable Spotify playback.');
      }
    } finally {
      if (current()) {
        busy.current = false;
        clearTimeout(timer.current);
      }
    }
  };
  const isReady = () =>
    stage === 'active' && !!player.current && isSpotifyPlaybackActivated(player.current);
  return { stage, error, start, cancel, isReady };
}
