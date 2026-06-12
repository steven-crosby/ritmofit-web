/**
 * Better Auth browser client. Points at the API Worker origin (the API mounts
 * Better Auth at /api/auth/*). Cross-origin in dev (web :5173 → api :8787), so
 * the API's CORS allows this origin with credentials.
 */
import { createAuthClient } from 'better-auth/react';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const authClient = createAuthClient({ baseURL: API_BASE_URL });
