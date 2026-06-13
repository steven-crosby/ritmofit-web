/**
 * Typed API client over the shared contract. Sends the Better Auth session cookie
 * (credentials: 'include') to the API Worker's /api/v1 surface.
 */
import type {
  ClassWithAccess,
  Class,
  CreateClass,
  UpdateClass,
  ExploreClass,
  ClassTrack,
  AddClassTrack,
  RunPayload,
  Share,
  ShareView,
  CreateShare,
  SharePermission,
  TeamWithRole,
  Team,
  TeamMembership,
  TeamMemberView,
  TeamRole,
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
export const updateClass = (classId: string, body: UpdateClass) =>
  api<Class>(`/classes/${classId}`, { method: 'PATCH', body: JSON.stringify(body) });
export const listExplore = () => api<ExploreClass[]>('/explore');
export const copyClass = (classId: string, title?: string) =>
  api<Class>(`/classes/${classId}/copy`, {
    method: 'POST',
    body: JSON.stringify(title ? { title } : {}),
  });
export const listClassTracks = (classId: string) =>
  api<ClassTrack[]>(`/classes/${classId}/tracks`);
export const addTrack = (classId: string, body: AddClassTrack) =>
  api<ClassTrack>(`/classes/${classId}/tracks`, { method: 'POST', body: JSON.stringify(body) });
export const getRunPayload = (classId: string) =>
  api<RunPayload>(`/classes/${classId}/run-payload`);

// ── Sharing (M4) ────────────────────────────────────────────────────────────
export const listShares = (classId: string) =>
  api<ShareView[]>(`/classes/${classId}/shares`);
export const createShare = (body: CreateShare) =>
  api<Share>('/shares', { method: 'POST', body: JSON.stringify(body) });
export const updateShare = (shareId: string, permission: SharePermission) =>
  api<Share>(`/shares/${shareId}`, { method: 'PATCH', body: JSON.stringify({ permission }) });
export const deleteShare = (shareId: string) =>
  api<void>(`/shares/${shareId}`, { method: 'DELETE' });

// ── Teams (M4) ────────────────────────────────────────────────────────────--
export const listTeams = () => api<TeamWithRole[]>('/teams');
export const createTeam = (name: string) =>
  api<Team>('/teams', { method: 'POST', body: JSON.stringify({ name }) });
export const listMembers = (teamId: string) =>
  api<TeamMemberView[]>(`/teams/${teamId}/members`);
export const addMember = (teamId: string, email: string, role?: TeamRole) =>
  api<TeamMembership>(`/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, ...(role ? { role } : {}) }),
  });
export const removeMember = (teamId: string, userId: string) =>
  api<void>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
