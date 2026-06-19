import { describe, it, expect, vi } from 'vitest';
import { sendEmail, buildResendPayload, actionEmail, EmailSendError } from './email.js';
import type { Env } from './types.js';

const MSG = { to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

function env(over: Partial<Env> = {}): Env {
  return { DB: {} as never, IMAGES_BUCKET: {} as never, BETTER_AUTH_SECRET: 's', BETTER_AUTH_URL: 'u', ...over };
}

describe('buildResendPayload', () => {
  it('wraps the recipient in an array and carries from/subject/bodies', () => {
    const p = buildResendPayload('RitmoFit <noreply@ritmofit.studio>', MSG);
    expect(p).toEqual({
      from: 'RitmoFit <noreply@ritmofit.studio>',
      to: ['user@example.com'],
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
  });
});

describe('sendEmail', () => {
  it('posts to Resend with the bearer key and configured from address', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    await sendEmail(
      env({ RESEND_API_KEY: 'key_123', EMAIL_FROM: 'A <a@ritmofit.studio>' }),
      MSG,
      fetchImpl as unknown as typeof fetch,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key_123');
    expect(JSON.parse(init.body as string).from).toBe('A <a@ritmofit.studio>');
  });

  it('falls back to logging (no fetch) when no API key is set', async () => {
    const fetchImpl = vi.fn();
    await sendEmail(env(), MSG, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws EmailSendError on a non-2xx response', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 422 }));
    await expect(
      sendEmail(env({ RESEND_API_KEY: 'k' }), MSG, fetchImpl as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(EmailSendError);
  });
});

describe('actionEmail', () => {
  it('embeds the action url in both html and text', () => {
    const { html, text } = actionEmail({
      heading: 'Reset',
      intro: 'go',
      buttonLabel: 'Reset password',
      url: 'https://ritmofit.studio/reset-password?token=abc',
      footer: 'ignore otherwise',
    });
    expect(html).toContain('https://ritmofit.studio/reset-password?token=abc');
    expect(text).toContain('https://ritmofit.studio/reset-password?token=abc');
    expect(text).toContain('ignore otherwise');
  });
});
