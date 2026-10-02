import type { useSpotifyActivation } from '../lib/use-spotify-activation.js';

export function SpotifyActivationAction({
  flow,
  recovery = false,
}: {
  flow: ReturnType<typeof useSpotifyActivation>;
  recovery?: boolean;
}) {
  const pending = flow.stage === 'preparing' || flow.stage === 'activating';
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p role="status" className="font-ui text-sm text-text-secondary">
        {flow.isReady()
          ? 'Spotify enabled in this browser. Playback availability is still unverified.'
          : recovery
            ? 'Enable Spotify playback, then Retry. Enabling playback does not play music.'
            : 'Enable Spotify playback before Start. Preparing the device and enabling playback do not play music.'}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void flow.start()}
        className="min-h-11 rounded-control border border-interactive/50 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring disabled:opacity-50"
      >
        {pending
          ? 'Preparing Spotify…'
          : flow.stage === 'idle'
            ? 'Prepare Spotify playback'
            : 'Enable Spotify playback'}
      </button>
      {flow.error && (
        <p role="alert" className="font-ui text-sm text-state-danger">
          {flow.error}
        </p>
      )}
      {pending && (
        <button
          type="button"
          onClick={flow.cancel}
          className="min-h-11 self-start rounded-control px-3 font-ui text-sm text-interactive rf-focus-ring"
        >
          Cancel Spotify preparation
        </button>
      )}
    </div>
  );
}
