import { SpotifyDevelopmentModeError } from '@ritmofit/music';
import { HttpError } from '../errors.js';

export const SPOTIFY_DEVELOPMENT_MODE_CODE = 'SPOTIFY_DEVELOPMENT_MODE';

/** Shown on the Music tab. Reconnect does not add the dashboard row. */
export const SPOTIFY_DEVELOPMENT_MODE_MESSAGE =
  'Spotify has not allowlisted this account. Add it under User Management in the Spotify developer dashboard, then retry.';

export function throwIfSpotifyDevelopmentMode(err: unknown): void {
  if (err instanceof SpotifyDevelopmentModeError) {
    throw new HttpError(403, SPOTIFY_DEVELOPMENT_MODE_CODE, SPOTIFY_DEVELOPMENT_MODE_MESSAGE);
  }
}
