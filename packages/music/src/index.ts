/**
 * @ritmofit/music — provider adapters (M2).
 *
 * Pure provider→contract adapters behind one `MusicProvider` interface. The app
 * (`apps/api`) selects an adapter per request and owns persistence; this package
 * never touches the DB or app auth. SoundCloud is first (music-providers.md).
 */
export type { MusicProvider, FetchLike } from './provider.js';
export { createSoundCloudProvider, type SoundCloudConfig } from './soundcloud.js';
