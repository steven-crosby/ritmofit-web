import { describe, it, expect } from 'vitest';
import {
  buildSoundCloudAuthorizeUrl,
  exchangeSoundCloudCode,
  refreshSoundCloudToken,
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
  scope: 'non-expiring',
};

describe('buildSoundCloudAuthorizeUrl', () => {
  it('includes the PKCE + OAuth params', () => {
    const url = buildSoundCloudAuthorizeUrl({
      clientId: 'cid',
      redirectUri: 'https://api.test/cb',
      codeChallenge: 'chal',
      state: 'st',
    });
    expect(url.startsWith('https://secure.soundcloud.com/authorize?')).toBe(true);
    expect(url).toContain('client_id=cid');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapi.test%2Fcb');
    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge=chal');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=st');
  });
});

describe('exchangeSoundCloudCode', () => {
  it('posts the auth-code grant with form credentials + PKCE verifier, maps the tokens', async () => {
    const { fetchImpl, calls } = captureFetch(TOKEN_RESP);
    const tokens = await exchangeSoundCloudCode({
      clientId: 'cid',
      clientSecret: 'sec',
      redirectUri: 'https://api.test/cb',
      code: 'the-code',
      codeVerifier: 'the-verifier',
      fetchImpl,
      tokenUrl: 'https://token.test/oauth/token',
    });

    expect(tokens).toEqual({
      accessToken: 'acc-1',
      refreshToken: 'ref-1',
      expiresInSec: 3600,
      scope: 'non-expiring',
    });
    const call = calls[0];
    expect(call?.url).toBe('https://token.test/oauth/token');
    expect(call?.init?.method).toBe('POST');
    expect(call?.init?.headers).not.toHaveProperty('Authorization');
    expect(call?.init?.body).toContain('grant_type=authorization_code');
    expect(call?.init?.body).toContain('client_id=cid');
    expect(call?.init?.body).toContain('client_secret=sec');
    expect(call?.init?.body).toContain('code_verifier=the-verifier');
    expect(call?.init?.body).toContain('code=the-code');
  });

  it('throws on a non-ok token response', async () => {
    const { fetchImpl } = captureFetch({}, false);
    await expect(
      exchangeSoundCloudCode({
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

describe('refreshSoundCloudToken', () => {
  it('posts the refresh grant', async () => {
    const { fetchImpl, calls } = captureFetch({ access_token: 'acc-2' });
    const tokens = await refreshSoundCloudToken({
      clientId: 'cid',
      clientSecret: 'sec',
      refreshToken: 'ref-1',
      fetchImpl,
      tokenUrl: 'https://token.test/oauth/token',
    });
    expect(tokens.accessToken).toBe('acc-2');
    expect(tokens.refreshToken).toBeNull();
    expect(calls[0]?.init?.body).toContain('grant_type=refresh_token');
    expect(calls[0]?.init?.body).toContain('client_id=cid');
    expect(calls[0]?.init?.body).toContain('client_secret=sec');
    expect(calls[0]?.init?.body).toContain('refresh_token=ref-1');
  });
});
