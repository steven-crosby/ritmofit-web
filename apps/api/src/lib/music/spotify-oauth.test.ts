import { describe, it, expect } from 'vitest';
import {
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  refreshSpotifyToken,
  spotifyScopeHasPlayback,
  spotifyScopeHasSavedPlaylists,
  SPOTIFY_CONNECT_SCOPE,
  type FetchLike,
} from '@ritmofit/music';

function captureFetch(response: unknown, ok = true) {
  const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { ok, status: ok ? 200 : 401, json: async () => response, text: async () => '' };
  };
  return { fetchImpl, calls };
}

const TOKEN_RESP = {
  access_token: 'acc-1',
  refresh_token: 'ref-1',
  expires_in: 3600,
  scope: 'user-library-read',
};

describe('buildSpotifyAuthorizeUrl', () => {
  it('includes the confidential OAuth params and the library-read scope only', () => {
    const url = buildSpotifyAuthorizeUrl({
      clientId: 'cid',
      redirectUri: 'https://api.test/cb',
      state: 'st',
    });
    expect(url.startsWith('https://accounts.spotify.com/authorize?')).toBe(true);
    expect(url).toContain('client_id=cid');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapi.test%2Fcb');
    expect(url).toContain('response_type=code');
    expect(url).not.toContain('code_challenge=');
    expect(url).not.toContain('code_challenge_method=');
    expect(url).toContain('state=st');
    // We request the likes-read scope plus the Web Playback SDK playback scopes.
    expect(url).toContain(`scope=${encodeURIComponent(SPOTIFY_CONNECT_SCOPE)}`);
    expect(SPOTIFY_CONNECT_SCOPE.split(/\s+/)).toContain('streaming');
  });
});

describe('SPOTIFY_CONNECT_SCOPE composition', () => {
  const scopes = SPOTIFY_CONNECT_SCOPE.split(/\s+/);

  it('keeps likes-read and adds the Web Playback SDK scopes', () => {
    expect(scopes).toContain('user-library-read');
    expect(scopes).toContain('streaming');
    expect(scopes).toContain('user-read-email');
    expect(scopes).toContain('user-read-private');
    expect(scopes).toContain('user-modify-playback-state');
    expect(scopes).toContain('user-read-playback-state');
  });

  it('adds the read-only saved-playlist scopes', () => {
    expect(scopes).toContain('playlist-read-private');
    expect(scopes).toContain('playlist-read-collaborative');
  });

  it('never requests an audio-features / analysis scope (BPM from Spotify is forbidden)', () => {
    for (const scope of scopes) {
      expect(scope).not.toMatch(/audio|feature|analysis/i);
    }
  });
});

describe('spotifyScopeHasPlayback', () => {
  it('is true only when the stored scope granted `streaming`', () => {
    expect(spotifyScopeHasPlayback(SPOTIFY_CONNECT_SCOPE)).toBe(true);
    expect(spotifyScopeHasPlayback('user-library-read streaming')).toBe(true);
    expect(spotifyScopeHasPlayback('streaming')).toBe(true);
  });

  it('is false for a pre-expansion (library-only) connection', () => {
    expect(spotifyScopeHasPlayback('user-library-read')).toBe(false);
  });

  it('is false for a missing scope and does not match a `streaming` substring', () => {
    expect(spotifyScopeHasPlayback(null)).toBe(false);
    expect(spotifyScopeHasPlayback(undefined)).toBe(false);
    expect(spotifyScopeHasPlayback('')).toBe(false);
    // Guards against a naive `.includes('streaming')` false-positive.
    expect(spotifyScopeHasPlayback('user-streaming-analytics-read')).toBe(false);
  });
});

describe('spotifyScopeHasSavedPlaylists', () => {
  it('is true only when the stored scope granted `playlist-read-private`', () => {
    expect(spotifyScopeHasSavedPlaylists(SPOTIFY_CONNECT_SCOPE)).toBe(true);
    expect(spotifyScopeHasSavedPlaylists('user-library-read playlist-read-private')).toBe(true);
    expect(spotifyScopeHasSavedPlaylists('playlist-read-private')).toBe(true);
  });

  it('is false for a pre-expansion (playback-only) connection', () => {
    expect(spotifyScopeHasSavedPlaylists('user-library-read streaming')).toBe(false);
  });

  it('is false for a missing scope and does not match a substring', () => {
    expect(spotifyScopeHasSavedPlaylists(null)).toBe(false);
    expect(spotifyScopeHasSavedPlaylists(undefined)).toBe(false);
    expect(spotifyScopeHasSavedPlaylists('')).toBe(false);
    // Guards against a naive `.includes('playlist-read-private')` false-positive.
    expect(spotifyScopeHasSavedPlaylists('playlist-read-private-analytics')).toBe(false);
  });
});

describe('exchangeSpotifyCode', () => {
  it('posts the auth-code grant with Basic auth and maps the tokens', async () => {
    const { fetchImpl, calls } = captureFetch(TOKEN_RESP);
    const tokens = await exchangeSpotifyCode({
      clientId: 'cid',
      clientSecret: 'sec',
      redirectUri: 'https://api.test/cb',
      code: 'the-code',
      fetchImpl,
      tokenUrl: 'https://token.test/api/token',
    });

    expect(tokens).toEqual({
      accessToken: 'acc-1',
      refreshToken: 'ref-1',
      expiresInSec: 3600,
      scope: 'user-library-read',
    });
    const call = calls[0];
    expect(call?.url).toBe('https://token.test/api/token');
    expect(call?.init?.method).toBe('POST');
    expect(call?.init?.headers?.Authorization).toBe(`Basic ${btoa('cid:sec')}`);
    expect(call?.init?.body).toContain('grant_type=authorization_code');
    expect(call?.init?.body).not.toContain('code_verifier=');
    expect(call?.init?.body).toContain('code=the-code');
  });

  // Confidential-client contract: Spotify authenticates with the client secret via
  // HTTP Basic auth, so PKCE is not part of its API shape. The exchange takes no
  // `codeVerifier` and neither the authorize URL nor the token body carry any PKCE
  // param. This pins the intent behind the dead-param removal so a future refactor
  // can't silently re-introduce a `code_verifier`/`code_challenge` on the wire.
  it('is a confidential client: no PKCE param on authorize or exchange', async () => {
    const url = buildSpotifyAuthorizeUrl({
      clientId: 'cid',
      redirectUri: 'https://api.test/cb',
      state: 'st',
    });
    expect(url).not.toContain('code_challenge=');
    expect(url).not.toContain('code_challenge_method=');
    expect(url).not.toContain('code_verifier=');

    const { fetchImpl, calls } = captureFetch(TOKEN_RESP);
    // No `codeVerifier` field is accepted — the confidential client proves identity
    // with Basic auth alone.
    await exchangeSpotifyCode({
      clientId: 'cid',
      clientSecret: 'sec',
      redirectUri: 'https://api.test/cb',
      code: 'the-code',
      fetchImpl,
      tokenUrl: 'https://token.test/api/token',
    });
    const body = calls[0]?.init?.body ?? '';
    expect(body).not.toContain('code_verifier=');
    expect(body).not.toContain('code_challenge=');
    expect(calls[0]?.init?.headers?.Authorization).toBe(`Basic ${btoa('cid:sec')}`);
  });

  it('throws on a non-ok token response', async () => {
    const { fetchImpl } = captureFetch({}, false);
    await expect(
      exchangeSpotifyCode({
        clientId: 'c',
        clientSecret: 's',
        redirectUri: 'r',
        code: 'x',
        fetchImpl,
      }),
    ).rejects.toThrow();
  });
});

describe('refreshSpotifyToken', () => {
  it('posts the refresh grant and tolerates an omitted rotated token', async () => {
    const { fetchImpl, calls } = captureFetch({ access_token: 'acc-2', expires_in: 3600 });
    const tokens = await refreshSpotifyToken({
      clientId: 'cid',
      clientSecret: 'sec',
      refreshToken: 'ref-1',
      fetchImpl,
      tokenUrl: 'https://token.test/api/token',
    });
    expect(tokens.accessToken).toBe('acc-2');
    // Spotify commonly omits a new refresh token on refresh — caller keeps the old.
    expect(tokens.refreshToken).toBeNull();
    expect(calls[0]?.init?.body).toContain('grant_type=refresh_token');
    expect(calls[0]?.init?.body).toContain('refresh_token=ref-1');
  });
});
