/**
 * Typed API client over the shared contract. Sends the Better Auth session cookie
 * (credentials: 'include') to the API Worker's /api/v1 surface.
 */
import type {
  ClassWithAccess,
  Class,
  CreateClass,
  ClassTrack,
  AddClassTrack,
} from '@ritmofit/shared';
import { API_BASE_URL } from './auth-client.js';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* non-JSON error */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const listClasses = () => api<ClassWithAccess[]>('/classes');
export const createClass = (body: CreateClass) =>
  api<Class>('/classes', { method: 'POST', body: JSON.stringify(body) });
export const listClassTracks = (classId: string) =>
  api<ClassTrack[]>(`/classes/${classId}/tracks`);
export const addTrack = (classId: string, body: AddClassTrack) =>
  api<ClassTrack>(`/classes/${classId}/tracks`, { method: 'POST', body: JSON.stringify(body) });
