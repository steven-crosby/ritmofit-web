/**
 * Apple Music connect via MusicKit JS (v3).
 *
 * Apple Music has no redirect OAuth: the browser loads the MusicKit JS library,
 * configures it with our developer token, and the user authorizes in an Apple
 * consent surface. MusicKit returns a **Music-User-Token** which the caller posts
 * to `POST /providers/apple_music/connection` to store (encrypted) server-side.
 *
 * The library is loaded **on demand** (only when a user starts the Apple Music
 * connect flow) so the third-party script never runs for users who don't use it.
 * RUNTIME-UNVERIFIED in CI: the authorize handshake needs a real developer token
 * and an Apple Music subscriber consenting in a browser, so this path is exercised
 * by live verification, not the headless test suite.
 */
import type { AppleMusicClientConfig } from '@ritmofit/shared';

const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

/** The slice of the MusicKit v3 surface we use. */
interface MusicKitInstance {
  authorize(): Promise<string>;
}
interface MusicKitGlobal {
  configure(opts: {
    developerToken: string;
    app: { name: string; build: string };
    storefrontId?: string;
  }): Promise<MusicKitInstance>;
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

let loadPromise: Promise<MusicKitGlobal> | null = null;

/** Inject the MusicKit JS script once; resolve when its global is ready. */
function loadMusicKit(): Promise<MusicKitGlobal> {
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<MusicKitGlobal>((resolve, reject) => {
    const settle = () => {
      if (window.MusicKit) resolve(window.MusicKit);
      else reject(new Error('Apple MusicKit failed to initialize.'));
    };
    // MusicKit v3 fires `musickitloaded` on document once its global is ready.
    document.addEventListener('musickitloaded', settle, { once: true });

    const script = document.createElement('script');
    script.src = MUSICKIT_SRC;
    script.async = true;
    script.onerror = () => {
      loadPromise = null; // allow a retry after a transient load failure
      reject(new Error('Could not load Apple MusicKit.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Load + configure MusicKit and prompt the user to authorize, returning the
 * Music-User-Token. Rejects if the user cancels or the library can't load.
 */
export async function authorizeAppleMusic(config: AppleMusicClientConfig): Promise<string> {
  const MusicKit = await loadMusicKit();
  const instance = await MusicKit.configure({
    developerToken: config.developerToken,
    app: { name: 'Ritmo Studio', build: '1.0.0' },
    ...(config.storefront ? { storefrontId: config.storefront } : {}),
  });
  const token = await instance.authorize();
  if (!token) throw new Error('Apple Music authorization was cancelled.');
  return token;
}
