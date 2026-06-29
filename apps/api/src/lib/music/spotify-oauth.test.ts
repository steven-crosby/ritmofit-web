import { describe, it, expect } from 'vitest';
import {
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  refreshSpotifyToken,
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
  it('includes the PKCE + OAuth params and the library-read scope only', () => {
    const url = buildSpotifyAuthorizeUrl({
      clientId: 'cid',
      redirectUri: 'https://api.test/cb',
      codeChallenge: 'chal',
      state: 'st',
    });
    expect(url.startsWith('https://accounts.spotify.com/authorize?')).toBe(true);
    expect(url).toContain('client_id=cid');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapi.test%2Fcb');
    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge=chal');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=st');
    // The only scope we ever request: read the user's saved tracks. Never playback/BPM.
    expect(SPOTIFY_CONNECT_SCOPE).toBe('user-library-read');
    expect(url).toContain(`scope=${encodeURIComponent(SPOTIFY_CONNECT_SCOPE)}`);
  });
});

describe('exchangeSpotifyCode', () => {
  it('posts the auth-code grant with Basic auth + PKCE verifier, maps the tokens', async () => {
    const { fetchImpl, calls } = captureFetch(TOKEN_RESP);
    const tokens = await exchangeSpotifyCode({
      clientId: 'cid',
      clientSecret: 'sec',
      redirectUri: 'https://api.test/cb',
      code: 'the-code',
      codeVerifier: 'the-verifier',
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
    expect(call?.init?.body).toContain('code_verifier=the-verifier');
    expect(call?.init?.body).toContain('code=the-code');
  });

  it('throws on a non-ok token response', async () => {
    const { fetchImpl } = captureFetch({}, false);
    await expect(
      exchangeSpotifyCode({
        clientId: 'c',
        clientSecret: 's',
        redirectUri: 'r',
        code: 'x',
        codeVerifier: 'v',
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
