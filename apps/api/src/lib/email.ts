/**
 * Transactional email transport (B1/B2) — password reset + email verification.
 *
 * Sends via Resend's REST API (`POST /emails`) from the Worker with `fetch`; the
 * API key never reaches a browser. Network is injectable (`fetchImpl`) so the
 * request shape is unit-tested with no live calls.
 *
 * **Dev/mock seam (mirrors MOCK_PROVIDERS):** when `RESEND_API_KEY` is unset the
 * email is logged to the Worker console — including the action URL — instead of
 * sent, so local dev boots with zero secrets and reset/verify links are clickable
 * from `wrangler dev` logs. Never leave the key unset in prod.
 */
import { boundFetch } from './fetch.js';
import type { Env } from './types.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'RitmoFit <noreply@ritmofit.studio>';

/** Minimal `fetch` shape so tests can inject without a live network. */
export type FetchLike = typeof fetch;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** The JSON body Resend's `POST /emails` expects. Pure — easy to assert in tests. */
export function buildResendPayload(from: string, msg: EmailMessage) {
  return { from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text };
}

/** Raised when Resend returns a non-2xx so Better Auth surfaces the failure. */
export class EmailSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Resend send failed (${status})`);
    this.name = 'EmailSendError';
  }
}

/**
 * Send one transactional email. With no `RESEND_API_KEY`, logs and returns
 * (dev fallback). `fetchImpl` defaults to `boundFetch`, not the bare global
 * `fetch`: production callers (Better Auth's reset/verify hooks) invoke this
 * without an explicit impl, and a detached global `fetch` throws
 * `TypeError: Illegal invocation` in the Workers runtime. See `./fetch.ts`.
 */
export async function sendEmail(
  env: Env,
  msg: EmailMessage,
  fetchImpl: FetchLike = boundFetch,
): Promise<void> {
  const from = env.EMAIL_FROM ?? DEFAULT_FROM;

  if (!env.RESEND_API_KEY) {
    console.log(`[email:dev-fallback] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return;
  }

  const res = await fetchImpl(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildResendPayload(from, msg)),
  });

  if (!res.ok) {
    throw new EmailSendError(res.status, await res.text().catch(() => ''));
  }
}

/**
 * Branded HTML + plaintext for a single call-to-action email (reset / verify).
 * Kept deliberately plain (no remote assets) for deliverability.
 */
export function actionEmail(opts: {
  heading: string;
  intro: string;
  buttonLabel: string;
  url: string;
  footer: string;
}): { html: string; text: string } {
  const { heading, intro, buttonLabel, url, footer } = opts;
  const html = `<!doctype html><html><body style="margin:0;background:#0e0e11;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e8e8ea;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#17171c;border-radius:16px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
    <p style="font-size:15px;line-height:1.5;color:#b6b6bd;margin:0 0 24px">${intro}</p>
    <a href="${url}" style="display:inline-block;background:#5b8cff;color:#0e0e11;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px">${buttonLabel}</a>
    <p style="font-size:13px;line-height:1.5;color:#8a8a92;margin:24px 0 0">${footer}</p>
    <p style="font-size:12px;line-height:1.5;color:#6a6a72;margin:16px 0 0;word-break:break-all">Or paste this link:<br>${url}</p>
  </div>
</body></html>`;
  const text = `${heading}\n\n${intro}\n\n${buttonLabel}: ${url}\n\n${footer}`;
  return { html, text };
}
