/**
 * Better Auth browser client. The API mounts Better Auth at /api/auth/*.
 *
 * In **production** the SPA is served by the same Worker as the API (single
 * origin), so the base is empty → relative `/api/...` requests, first-party
 * session cookie, no CORS. Works unchanged on `*.workers.dev` or any custom domain.
 * In **dev** web (:5173) and API (:8787) are different ports (cross-origin but
 * same-site), so we point at the API explicitly; the API's CORS allows it with
 * credentials. `VITE_API_URL` overrides either when set (e.g. split deploys).
 */
import { createAuthClient } from 'better-auth/react';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '');

// Empty base ⇒ let Better Auth resolve against the current origin (same-origin prod).
export const authClient = createAuthClient(API_BASE_URL ? { baseURL: API_BASE_URL } : {});
