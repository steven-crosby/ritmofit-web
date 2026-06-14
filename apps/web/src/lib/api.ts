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
  UpdateClassTrack,
  Track,
  TrackSearchResult,
  Provider,
  MusicConnectionView,
  ConnectProviderResponse,
  Cue,
  CreateCue,
  UpdateCue,
  ClassTrackMove,
  PlaceClassTrackMove,
  UpdateClassTrackMove,
  Move,
  UserMove,
  CreateUserMove,
  UpdateUserMove,
  ClassSection,
  CreateClassSection,
  UpdateClassSection,
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
/** One page of the public Explore feed (newest-first). The server clamps `limit`
 * to 50; the caller pages with `offset` and stops when a short page comes back. */
export const listExplore = (limit = 30, offset = 0) =>
  api<ExploreClass[]>(`/explore?limit=${limit}&offset=${offset}`);
export const copyClass = (classId: string, title?: string) =>
  api<Class>(`/classes/${classId}/copy`, {
    method: 'POST',
    body: JSON.stringify(title ? { title } : {}),
  });
export const listClassTracks = (classId: string) =>
  api<ClassTrack[]>(`/classes/${classId}/tracks`);
export const addTrack = (classId: string, body: AddClassTrack) =>
  api<ClassTrack>(`/classes/${classId}/tracks`, { method: 'POST', body: JSON.stringify(body) });
export const updateClassTrack = (classTrackId: string, body: UpdateClassTrack) =>
  api<ClassTrack>(`/class-tracks/${classTrackId}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteClassTrack = (classTrackId: string) =>
  api<void>(`/class-tracks/${classTrackId}`, { method: 'DELETE' });
/** Set the complete new ordering of a class's class_tracks (a full permutation). */
export const reorderTracks = (classId: string, classTrackIds: string[]) =>
  api<ClassTrack[]>(`/classes/${classId}/tracks/reorder`, {
    method: 'POST',
    body: JSON.stringify({ classTrackIds }),
  });
export const getRunPayload = (classId: string) =>
  api<RunPayload>(`/classes/${classId}/run-payload`);

// ── Music providers: search a provider, import a candidate into the library ───
/** Provider search candidates (server serves the live adapter or the dev mock). */
export const searchProvider = (provider: Provider, q: string) =>
  api<TrackSearchResult[]>(`/providers/${provider}/search?q=${encodeURIComponent(q)}`);
/** The caller's liked tracks at a provider — spends their stored OAuth token. */
export const listLikes = (provider: Provider) =>
  api<TrackSearchResult[]>(`/providers/${provider}/likes`);
/** Import a candidate by provider reference → the owned track (created or matched). */
export const importTrack = (provider: Provider, providerTrackId: string) =>
  api<Track>('/providers/track-import', {
    method: 'POST',
    body: JSON.stringify({ provider, providerTrackId }),
  });

// ── Provider connections (per-user OAuth) ─────────────────────────────────────
/** The caller's provider connections (token blobs stripped server-side). */
export const listConnections = () => api<MusicConnectionView[]>('/providers/connections');
/** Start a connection. Mock seam connects immediately; live returns an authorizeUrl. */
export const connectProvider = (provider: Provider) =>
  api<ConnectProviderResponse>(`/providers/${provider}/connect`, { method: 'POST' });
/** Disconnect — forgets tokens now; enqueues the 7-day metadata purge server-side. */
export const disconnectProvider = (provider: Provider) =>
  api<void>(`/providers/${provider}/connection`, { method: 'DELETE' });

// ── BPM lookup (third-party tempo provider — never Spotify) ───────────────────
/** Owner-only: fill the track's display BPM from the tempo service (or mock). */
export const lookupBpm = (trackId: string) =>
  api<Track & { bpmApplied: boolean }>(`/tracks/${trackId}/bpm-lookup`, { method: 'POST' });

// ── Choreography: cues + placed moves anchored to a class_track ───────────────
export const listCues = (classTrackId: string) =>
  api<Cue[]>(`/class-tracks/${classTrackId}/cues`);
export const createCue = (classTrackId: string, body: CreateCue) =>
  api<Cue>(`/class-tracks/${classTrackId}/cues`, { method: 'POST', body: JSON.stringify(body) });
export const updateCue = (cueId: string, body: UpdateCue) =>
  api<Cue>(`/cues/${cueId}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteCue = (cueId: string) => api<void>(`/cues/${cueId}`, { method: 'DELETE' });

export const listPlacedMoves = (classTrackId: string) =>
  api<ClassTrackMove[]>(`/class-tracks/${classTrackId}/moves`);
export const placeMove = (classTrackId: string, body: PlaceClassTrackMove) =>
  api<ClassTrackMove>(`/class-tracks/${classTrackId}/moves`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
export const updatePlacedMove = (id: string, body: UpdateClassTrackMove) =>
  api<ClassTrackMove>(`/class-track-moves/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deletePlacedMove = (id: string) =>
  api<void>(`/class-track-moves/${id}`, { method: 'DELETE' });

/** The global moves library (read-only seed). */
export const listMoves = () => api<Move[]>('/moves');

/** The caller's custom moves (owner-scoped). */
export const listUserMoves = () => api<UserMove[]>('/user-moves');
export const createUserMove = (body: CreateUserMove) =>
  api<UserMove>('/user-moves', { method: 'POST', body: JSON.stringify(body) });
export const updateUserMove = (id: string, body: UpdateUserMove) =>
  api<UserMove>(`/user-moves/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteUserMove = (id: string) =>
  api<void>(`/user-moves/${id}`, { method: 'DELETE' });

/** Class sections — the energy-arc segment bands (class-scoped, edit access to write). */
export const listSections = (classId: string) =>
  api<ClassSection[]>(`/classes/${classId}/sections`);
export const createSection = (classId: string, body: CreateClassSection) =>
  api<ClassSection>(`/classes/${classId}/sections`, { method: 'POST', body: JSON.stringify(body) });
export const updateSection = (id: string, body: UpdateClassSection) =>
  api<ClassSection>(`/sections/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteSection = (id: string) =>
  api<void>(`/sections/${id}`, { method: 'DELETE' });

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
